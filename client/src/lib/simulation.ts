/**
 * Monte Carlo simulation logic for VC portfolio analysis
 */

import type {
  CompanyResult,
  ExitBucket,
  InvestmentStage,
  PortfolioParameters,
  SimulationResult,
  StageParameters,
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
 * Simulate a single company investment
 */
function simulateCompany(
  stage: InvestmentStage,
  stageParams: StageParameters,
  exitWindowMin: number,
  exitWindowMax: number
): CompanyResult {
  // Calculate invested capital (initial + follow-on)
  const initialCheck = stageParams.avgCheckSize;
  const followOn = initialCheck * (stageParams.followOnReserveRatio / 100);
  const investedCapital = initialCheck + followOn;

  // Sample outcome bucket from stage-specific distribution
  const bucket = sampleBucket(stageParams.exitBuckets);

  // Sample return multiple within bucket range
  const returnMultiple = uniformRandom(bucket.minMultiple, bucket.maxMultiple);

  // Sample exit year
  const exitYear = uniformRandom(exitWindowMin, exitWindowMax);

  // Calculate returned capital
  const returnedCapital = investedCapital * returnMultiple;

  return {
    stage,
    investedCapital,
    returnedCapital,
    returnMultiple,
    exitYear,
    bucketLabel: bucket.label,
  };
}

/**
 * Run a single Monte Carlo simulation
 */
export function runSingleSimulation(
  params: PortfolioParameters
): SimulationResult {
  const companies: CompanyResult[] = [];
  
  // Calculate number of seed vs Series A companies
  const numSeedCompanies = Math.round(params.numCompanies * (params.seedPercentage / 100));
  const numSeriesACompanies = params.numCompanies - numSeedCompanies;

  // Simulate seed stage companies
  for (let i = 0; i < numSeedCompanies; i++) {
    companies.push(
      simulateCompany(
        "seed",
        params.seedStage,
        params.exitWindowMin,
        params.exitWindowMax
      )
    );
  }

  // Simulate Series A companies
  for (let i = 0; i < numSeriesACompanies; i++) {
    companies.push(
      simulateCompany(
        "seriesA",
        params.seriesAStage,
        params.exitWindowMin,
        params.exitWindowMax
      )
    );
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
  const investmentPeriodYears = params.investmentPeriod;
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
    numSeedCompanies,
    numSeriesACompanies,
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
 * Calculate summary statistics from simulation results
 */
export function calculateSummaryStatistics(
  results: SimulationResult[]
): SummaryStatistics {
  // Extract metrics
  const moics = results.map((r) => r.grossMOIC).sort((a, b) => a - b);
  const irrs = results.map((r) => r.grossIRR).sort((a, b) => a - b);

  // Calculate percentiles
  const getPercentile = (arr: number[], p: number) => {
    const index = Math.floor(arr.length * p);
    return arr[index];
  };

  const medianMOIC = getPercentile(moics, 0.5);
  const moicP10 = getPercentile(moics, 0.1);
  const moicP90 = getPercentile(moics, 0.9);

  const medianIRR = getPercentile(irrs, 0.5);
  const irrP10 = getPercentile(irrs, 0.1);
  const irrP90 = getPercentile(irrs, 0.9);

  // Calculate probabilities
  const probMOICAbove2x = results.filter((r) => r.grossMOIC >= 2).length / results.length;
  const probMOICAbove3x = results.filter((r) => r.grossMOIC >= 3).length / results.length;
  const probMOICAbove5x = results.filter((r) => r.grossMOIC >= 5).length / results.length;

  // Calculate standard deviations
  const meanMOIC = moics.reduce((sum, v) => sum + v, 0) / moics.length;
  const moicStdDev = Math.sqrt(
    moics.reduce((sum, v) => sum + Math.pow(v - meanMOIC, 2), 0) / moics.length
  );
  
  const meanIRR = irrs.reduce((sum, v) => sum + v, 0) / irrs.length;
  const irrStdDev = Math.sqrt(
    irrs.reduce((sum, v) => sum + Math.pow(v - meanIRR, 2), 0) / irrs.length
  );

  // Average counts
  const avgWriteOffs =
    results.reduce((sum, r) => sum + r.numWriteOffs, 0) / results.length;
  const avgOutliers =
    results.reduce((sum, r) => sum + r.numOutliers, 0) / results.length;

  return {
    medianMOIC,
    moicP10,
    moicP90,
    moicStdDev,
    medianIRR,
    irrP10,
    irrP90,
    irrStdDev,
    probMOICAbove2x,
    probMOICAbove3x,
    probMOICAbove5x,
    avgWriteOffs,
    avgOutliers,
  };
}
