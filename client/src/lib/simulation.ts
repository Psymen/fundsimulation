/**
 * Monte Carlo simulation logic for VC portfolio analysis
 * Updated with realistic distributions, exit timing, and fee modeling
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
import {
  sampleReturnMultiple,
  sampleExitYear,
  uniformRandom,
} from "@/lib/distributions";
import { calculateNetReturns } from "@/lib/fees";
import { DEFAULT_FEE_STRUCTURE } from "@/lib/fees";
import { calculateYearlyMetrics } from "@/lib/fund-metrics";

/**
 * Sample an outcome bucket based on probabilities
 */
function sampleBucket(buckets: ExitBucket[]): ExitBucket {
  const rand = Math.random() * 100;
  let cumulative = 0;

  for (const bucket of buckets) {
    cumulative += bucket.probability;
    if (rand <= cumulative) {
      return bucket;
    }
  }

  return buckets[buckets.length - 1];
}

/**
 * Calculate IRR given cash flows and timing
 * Uses Newton-Raphson method for IRR approximation
 */
function calculateIRR(cashFlows: number[], years: number[]): number {
  let irr = 0.15;
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

    if (Math.abs(dnpv) < 1e-10) break;

    const newIRR = irr - npv / dnpv;

    if (Math.abs(newIRR - irr) < tolerance) {
      return newIRR;
    }

    irr = newIRR;

    if (irr < -0.99) irr = -0.99;
    if (irr > 10) irr = 10;
  }

  return irr;
}

/**
 * Calculate follow-on investment using realistic pro-rata participation logic
 */
function calculateFollowOn(
  initialCheck: number,
  returnMultiple: number,
  reserveRatio: number,
  _stage: InvestmentStage
): number {
  if (returnMultiple < 1.0) {
    return 0;
  }

  const maxReserve = initialCheck * (reserveRatio / 100);

  let participationRate: number;
  if (returnMultiple >= 10) {
    participationRate = uniformRandom(0.9, 1.0);
  } else if (returnMultiple >= 5) {
    participationRate = uniformRandom(0.7, 0.9);
  } else if (returnMultiple >= 3) {
    participationRate = uniformRandom(0.5, 0.7);
  } else if (returnMultiple >= 2) {
    participationRate = uniformRandom(0.3, 0.5);
  } else {
    participationRate = uniformRandom(0.1, 0.3);
  }

  let followOnMultiple: number;
  if (returnMultiple >= 10) {
    followOnMultiple = uniformRandom(2.0, 4.0);
  } else if (returnMultiple >= 5) {
    followOnMultiple = uniformRandom(1.5, 2.5);
  } else if (returnMultiple >= 3) {
    followOnMultiple = uniformRandom(1.0, 1.5);
  } else if (returnMultiple >= 2) {
    followOnMultiple = uniformRandom(0.5, 1.0);
  } else {
    followOnMultiple = uniformRandom(0.2, 0.5);
  }

  const theoreticalFollowOn = initialCheck * followOnMultiple;
  const actualFollowOn = Math.min(
    maxReserve,
    theoreticalFollowOn * participationRate
  );

  return actualFollowOn;
}

/**
 * Simulate a single company investment
 * Uses log-normal/Pareto distributions and outcome-dependent exit timing
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

  // Sample return multiple using realistic distributions
  const isOutlier = bucket.label === "Outlier";
  const returnMultiple = sampleReturnMultiple(
    bucket.minMultiple,
    bucket.maxMultiple,
    isOutlier
  );

  // Sample exit year based on outcome and stage (realistic timing)
  const exitYear = sampleExitYear(
    returnMultiple,
    stage,
    exitWindowMin,
    exitWindowMax
  );

  // Calculate follow-on investment
  const followOn = calculateFollowOn(
    initialCheck,
    returnMultiple,
    stageParams.followOnReserveRatio,
    stage
  );

  const investedCapital = initialCheck + followOn;

  // Follow-on capital earns lower multiple due to higher valuations
  const followOnReturnMultiple = returnMultiple * 0.5;
  const initialReturn = initialCheck * returnMultiple;
  const followOnReturn = followOn * followOnReturnMultiple;
  const returnedCapital = initialReturn + followOnReturn;

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

  const numSeedCompanies = Math.round(
    params.numCompanies * (params.seedPercentage / 100)
  );
  const numSeriesACompanies = params.numCompanies - numSeedCompanies;

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

  const grossMOIC = totalReturnedCapital / params.fundSize;
  const multipleOnCommittedCapital = totalReturnedCapital / params.fundSize;

  const numWriteOffs = companies.filter((c) => c.returnMultiple < 0.1).length;
  const numOutliers = companies.filter((c) => c.returnMultiple >= 20).length;

  // Calculate gross IRR
  const cashFlows: number[] = [];
  const years: number[] = [];

  // Capital deployment using realistic pacing (front-loaded)
  const investmentPeriodYears = params.investmentPeriod;
  const rawWeights = [0.30, 0.35, 0.25, 0.10]; // Front-loaded deployment
  const usedWeights = rawWeights.slice(0, investmentPeriodYears);
  const weightSum = usedWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = usedWeights.map(w => w / weightSum);

  for (let year = 0; year < investmentPeriodYears; year++) {
    const weight = normalizedWeights[year] ?? 1 / investmentPeriodYears;
    cashFlows.push(-totalInvestedCapital * weight);
    years.push(year + 0.5);
  }

  // Exits
  for (const company of companies) {
    cashFlows.push(company.returnedCapital);
    years.push(company.exitYear);
  }

  const grossIRR = calculateIRR(cashFlows, years);

  // Calculate net returns (after fees and carry)
  const feeStructure = params.feeStructure ?? DEFAULT_FEE_STRUCTURE;
  const netResult = calculateNetReturns(
    totalReturnedCapital,
    params.fundSize,
    totalInvestedCapital,
    feeStructure,
    params.investmentPeriod,
    params.fundLife
  );

  // Calculate yearly metrics (J-curve data)
  const yearlyMetrics = calculateYearlyMetrics(
    companies,
    params.fundSize,
    params.fundLife,
    params.investmentPeriod,
    feeStructure
  );

  // Calculate net IRR (approximate by scaling gross IRR by fee drag)
  const netIRR =
    grossIRR > 0
      ? grossIRR * (1 - netResult.feeDragPercent / 100)
      : grossIRR;

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
    netMOIC: netResult.netMOIC,
    netIRR,
    managementFees: netResult.managementFees,
    carriedInterest: netResult.carriedInterest,
    feeDragPercent: netResult.feeDragPercent,
    yearlyMetrics,
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
  const moics = results.map((r) => r.grossMOIC).sort((a, b) => a - b);
  const irrs = results.map((r) => r.grossIRR).sort((a, b) => a - b);

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

  const probMOICAbove2x =
    results.filter((r) => r.grossMOIC >= 2).length / results.length;
  const probMOICAbove3x =
    results.filter((r) => r.grossMOIC >= 3).length / results.length;
  const probMOICAbove5x =
    results.filter((r) => r.grossMOIC >= 5).length / results.length;

  const meanMOIC = moics.reduce((sum, v) => sum + v, 0) / moics.length;
  const moicStdDev = Math.sqrt(
    moics.reduce((sum, v) => sum + Math.pow(v - meanMOIC, 2), 0) / moics.length
  );

  const meanIRR = irrs.reduce((sum, v) => sum + v, 0) / irrs.length;
  const irrStdDev = Math.sqrt(
    irrs.reduce((sum, v) => sum + Math.pow(v - meanIRR, 2), 0) / irrs.length
  );

  const avgWriteOffs =
    results.reduce((sum, r) => sum + r.numWriteOffs, 0) / results.length;
  const avgOutliers =
    results.reduce((sum, r) => sum + r.numOutliers, 0) / results.length;

  // Net metrics
  const netMoics = results
    .map((r) => r.netMOIC ?? r.grossMOIC)
    .sort((a, b) => a - b);
  const netIrrs = results
    .map((r) => r.netIRR ?? r.grossIRR)
    .sort((a, b) => a - b);
  const feeDrags = results.map((r) => r.feeDragPercent ?? 0);

  const medianNetMOIC = getPercentile(netMoics, 0.5);
  const netMoicP10 = getPercentile(netMoics, 0.1);
  const netMoicP90 = getPercentile(netMoics, 0.9);
  const medianNetIRR = getPercentile(netIrrs, 0.5);
  const avgFeeDrag =
    feeDrags.reduce((sum, v) => sum + v, 0) / feeDrags.length;

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
    medianNetMOIC,
    netMoicP10,
    netMoicP90,
    medianNetIRR,
    avgFeeDrag,
  };
}
