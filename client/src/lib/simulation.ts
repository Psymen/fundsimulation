/**
 * Monte Carlo simulation logic for VC portfolio analysis
 * Updated with realistic pro-rata follow-on investment modeling
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
 * Calculate follow-on investment using realistic pro-rata participation logic
 * 
 * Key principles based on Carta/PitchBook market data:
 * 1. Only successful companies (returnMultiple > 1.0) raise follow-on rounds
 * 2. Higher-performing companies require larger pro-rata checks due to valuation step-ups
 * 3. VCs selectively participate based on performance signals
 * 4. Failed companies don't consume reserves
 * 
 * Market data:
 * - Seed → Series A: 2.5-2.8x valuation step-up
 * - Series A → Series B: 2.0-3.0x valuation step-up
 * - VCs exercise pro-rata selectively (not uniformly)
 * - Typical fund deployment: 70-90%
 * 
 * @param initialCheck - Initial investment amount
 * @param returnMultiple - Company's ultimate return multiple
 * @param reserveRatio - Percentage of initial check reserved for follow-on (0-100)
 * @param stage - Investment stage (seed or seriesA)
 * @returns Follow-on investment amount
 */
function calculateFollowOn(
  initialCheck: number,
  returnMultiple: number,
  reserveRatio: number,
  stage: InvestmentStage
): number {
  // Failed companies (< 1x) don't raise follow-on rounds
  if (returnMultiple < 1.0) {
    return 0;
  }

  // Calculate available reserve capital
  const maxReserve = initialCheck * (reserveRatio / 100);

  // Determine participation rate based on company performance
  // High performers get more pro-rata participation
  let participationRate: number;
  
  if (returnMultiple >= 10) {
    // Breakout winners: 90-100% pro-rata participation
    participationRate = uniformRandom(0.9, 1.0);
  } else if (returnMultiple >= 5) {
    // Strong performers: 70-90% pro-rata participation
    participationRate = uniformRandom(0.7, 0.9);
  } else if (returnMultiple >= 3) {
    // Good performers: 50-70% pro-rata participation
    participationRate = uniformRandom(0.5, 0.7);
  } else if (returnMultiple >= 2) {
    // Moderate performers: 30-50% pro-rata participation
    participationRate = uniformRandom(0.3, 0.5);
  } else {
    // Marginal performers (1-2x): 10-30% pro-rata participation
    participationRate = uniformRandom(0.1, 0.3);
  }

  // Model valuation step-ups and number of follow-on rounds
  // Higher return multiples imply more rounds and larger step-ups
  let followOnMultiple: number;
  
  if (returnMultiple >= 10) {
    // Breakout companies: 2-3 follow-on rounds with 2.5-3x step-ups each
    // Total follow-on: ~2-4x initial check
    followOnMultiple = uniformRandom(2.0, 4.0);
  } else if (returnMultiple >= 5) {
    // Strong companies: 1-2 follow-on rounds with 2-3x step-ups
    // Total follow-on: ~1.5-2.5x initial check
    followOnMultiple = uniformRandom(1.5, 2.5);
  } else if (returnMultiple >= 3) {
    // Good companies: 1 follow-on round with 2-2.5x step-up
    // Total follow-on: ~1-1.5x initial check
    followOnMultiple = uniformRandom(1.0, 1.5);
  } else if (returnMultiple >= 2) {
    // Moderate companies: 1 follow-on round with smaller step-up
    // Total follow-on: ~0.5-1x initial check
    followOnMultiple = uniformRandom(0.5, 1.0);
  } else {
    // Marginal companies: Small bridge rounds
    // Total follow-on: ~0.2-0.5x initial check
    followOnMultiple = uniformRandom(0.2, 0.5);
  }

  // Calculate theoretical pro-rata need based on valuation step-ups
  const theoreticalFollowOn = initialCheck * followOnMultiple;

  // Actual follow-on is limited by:
  // 1. Available reserves
  // 2. Participation rate (selective deployment)
  const actualFollowOn = Math.min(
    maxReserve,
    theoreticalFollowOn * participationRate
  );

  return actualFollowOn;
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
  const initialCheck = stageParams.avgCheckSize;
  
  // Sample outcome bucket from stage-specific distribution
  const bucket = sampleBucket(stageParams.exitBuckets);
  
  // Sample return multiple within bucket range
  const returnMultiple = uniformRandom(bucket.minMultiple, bucket.maxMultiple);
  
  // Sample exit year
  const exitYear = uniformRandom(exitWindowMin, exitWindowMax);

  // Calculate follow-on investment based on realistic pro-rata logic
  const followOn = calculateFollowOn(
    initialCheck,
    returnMultiple,
    stageParams.followOnReserveRatio,
    stage
  );

  const investedCapital = initialCheck + followOn;
  
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
