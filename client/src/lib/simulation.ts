/**
 * Monte Carlo simulation logic for VC portfolio analysis
 */

import type {
  CompanyResult,
  ExitBucket,
  PortfolioParameters,
  SimulationResult,
  SummaryStatistics,
} from "@/types/simulation";

/**
 * Sample a random value uniformly between min and max
 */
function uniformRandom(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Sample an outcome bucket based on probabilities
 */
function sampleBucket(buckets: ExitBucket[]): ExitBucket {
  const rand = Math.random() * 100; // 0-100
  let cumulative = 0;

  for (const bucket of buckets) {
    cumulative += bucket.probability;
    if (rand <= cumulative) {
      return bucket;
    }
  }

  // Fallback to last bucket if rounding issues
  return buckets[buckets.length - 1];
}

/**
 * Calculate IRR given cash flows and timing
 * Uses Newton-Raphson method for IRR approximation
 */
function calculateIRR(cashFlows: number[], years: number[]): number {
  // Newton-Raphson method to find IRR
  let irr = 0.15; // Initial guess: 15%
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const t = years[j];
      npv += cashFlows[j] / Math.pow(1 + irr, t);
      dnpv -= (t * cashFlows[j]) / Math.pow(1 + irr, t + 1);
    }

    const newIRR = irr - npv / dnpv;

    if (Math.abs(newIRR - irr) < tolerance) {
      return newIRR;
    }

    irr = newIRR;

    // Prevent divergence
    if (irr < -0.99) irr = -0.99;
    if (irr > 10) irr = 10;
  }

  return irr;
}

/**
 * Run a single Monte Carlo simulation
 */
export function runSingleSimulation(
  params: PortfolioParameters
): SimulationResult {
  const companies: CompanyResult[] = [];
  const investmentPeriodYears = params.investmentPeriod;

  for (let i = 0; i < params.numCompanies; i++) {
    // Calculate invested capital (initial + follow-on)
    const initialCheck = params.avgCheckSize;
    const followOn = initialCheck * (params.followOnReserveRatio / 100);
    const investedCapital = initialCheck + followOn;

    // Sample outcome bucket
    const bucket = sampleBucket(params.exitBuckets);

    // Sample return multiple within bucket range
    const returnMultiple = uniformRandom(bucket.minMultiple, bucket.maxMultiple);

    // Sample exit year
    const exitYear = uniformRandom(params.exitWindowMin, params.exitWindowMax);

    // Calculate returned capital
    const returnedCapital = investedCapital * returnMultiple;

    companies.push({
      investedCapital,
      returnedCapital,
      returnMultiple,
      exitYear,
      bucketLabel: bucket.label,
    });
  }

  // Aggregate metrics
  const totalInvestedCapital = companies.reduce(
    (sum, c) => sum + c.investedCapital,
    0
  );
  const totalReturnedCapital = companies.reduce(
    (sum, c) => sum + c.returnedCapital,
    0
  );

  const grossMOIC = totalReturnedCapital / totalInvestedCapital;
  const multipleOnCommittedCapital = totalReturnedCapital / params.fundSize;

  // Count write-offs and outliers
  const numWriteOffs = companies.filter((c) => c.returnMultiple < 0.1).length;
  const numOutliers = companies.filter((c) => c.returnMultiple >= 20).length;

  // Calculate IRR
  // Model: capital drawn evenly over investment period, exits at sampled years
  const cashFlows: number[] = [];
  const years: number[] = [];

  // Capital deployment (negative cash flows)
  const deploymentPerYear = totalInvestedCapital / investmentPeriodYears;
  for (let year = 0; year < investmentPeriodYears; year++) {
    cashFlows.push(-deploymentPerYear);
    years.push(year + 0.5); // Mid-year convention
  }

  // Exits (positive cash flows)
  for (const company of companies) {
    cashFlows.push(company.returnedCapital);
    years.push(company.exitYear);
  }

  const grossIRR = calculateIRR(cashFlows, years);

  return {
    companies,
    totalInvestedCapital,
    totalReturnedCapital,
    grossMOIC,
    multipleOnCommittedCapital,
    grossIRR,
    numWriteOffs,
    numOutliers,
  };
}

/**
 * Run multiple Monte Carlo simulations
 */
export function runSimulations(
  params: PortfolioParameters
): SimulationResult[] {
  const results: SimulationResult[] = [];

  for (let i = 0; i < params.numSimulations; i++) {
    results.push(runSingleSimulation(params));
  }

  return results;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Calculate summary statistics from simulation results
 */
export function calculateSummaryStatistics(
  results: SimulationResult[]
): SummaryStatistics {
  if (results.length === 0) {
    return {
      medianMOIC: 0,
      moicP10: 0,
      moicP90: 0,
      medianIRR: 0,
      irrP10: 0,
      irrP90: 0,
      probMOICAbove2x: 0,
      probMOICAbove3x: 0,
      probMOICAbove5x: 0,
      avgWriteOffs: 0,
      avgOutliers: 0,
    };
  }

  // Extract and sort metrics
  const moics = results.map((r) => r.grossMOIC).sort((a, b) => a - b);
  const irrs = results.map((r) => r.grossIRR).sort((a, b) => a - b);

  // Calculate percentiles
  const medianMOIC = percentile(moics, 50);
  const moicP10 = percentile(moics, 10);
  const moicP90 = percentile(moics, 90);

  const medianIRR = percentile(irrs, 50);
  const irrP10 = percentile(irrs, 10);
  const irrP90 = percentile(irrs, 90);

  // Calculate probabilities
  const probMOICAbove2x =
    (results.filter((r) => r.grossMOIC >= 2).length / results.length) * 100;
  const probMOICAbove3x =
    (results.filter((r) => r.grossMOIC >= 3).length / results.length) * 100;
  const probMOICAbove5x =
    (results.filter((r) => r.grossMOIC >= 5).length / results.length) * 100;

  // Calculate averages
  const avgWriteOffs =
    results.reduce((sum, r) => sum + r.numWriteOffs, 0) / results.length;
  const avgOutliers =
    results.reduce((sum, r) => sum + r.numOutliers, 0) / results.length;

  return {
    medianMOIC,
    moicP10,
    moicP90,
    medianIRR,
    irrP10,
    irrP90,
    probMOICAbove2x,
    probMOICAbove3x,
    probMOICAbove5x,
    avgWriteOffs,
    avgOutliers,
  };
}
