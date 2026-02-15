/**
 * Fund-level metrics tracking over time: DPI, RVPI, TVPI
 *
 * DPI = Distributions to Paid-In (cash returned / cash called)
 * RVPI = Residual Value to Paid-In (unrealized value / cash called)
 * TVPI = Total Value to Paid-In (DPI + RVPI)
 *
 * These metrics are critical for LP reporting and J-curve analysis.
 */

import type {
  CompanyResult,
  FeeStructure,
  YearlyFundMetrics,
} from "@/types/simulation";

/**
 * Capital deployment pacing (% of fund called each year)
 * Based on Cambridge Associates data for early-stage VC funds
 * Front-loaded: most capital deployed in years 1-3
 */
const DEFAULT_CALL_SCHEDULE = [
  { year: 1, cumulativePercent: 25 },
  { year: 2, cumulativePercent: 55 },
  { year: 3, cumulativePercent: 80 },
  { year: 4, cumulativePercent: 92 },
  { year: 5, cumulativePercent: 97 },
  { year: 6, cumulativePercent: 100 },
];

/**
 * Get cumulative capital called by a given year
 */
function getCumulativeCallPercent(year: number): number {
  for (const entry of DEFAULT_CALL_SCHEDULE) {
    if (year <= entry.year) {
      return entry.cumulativePercent / 100;
    }
  }
  return 1.0; // 100% after schedule ends
}

/**
 * Estimate markup for unrealized companies at a given year
 * Simple model: linear interpolation from 1.0x to final multiple
 * with a discount for uncertainty
 */
function estimateInterimMarkup(
  company: CompanyResult,
  currentYear: number,
  investmentYear: number
): number {
  if (currentYear >= company.exitYear) {
    return 0; // Already exited, no residual
  }

  const holdingPeriod = company.exitYear - investmentYear;
  const yearsSinceInvestment = currentYear - investmentYear;

  if (holdingPeriod <= 0 || yearsSinceInvestment <= 0) {
    return 1.0; // At cost
  }

  const progress = Math.min(1, yearsSinceInvestment / holdingPeriod);

  // Apply a conservative markup path:
  // - Early years: minimal markup (uncertainty discount)
  // - Later years: closer to final value
  // - Use square root progression (slower early, faster late)
  const adjustedProgress = Math.sqrt(progress);

  // Failed companies: write down over time
  if (company.returnMultiple < 0.5) {
    return Math.max(0, 1.0 - adjustedProgress * (1.0 - company.returnMultiple));
  }

  // Successful companies: mark up gradually
  return 1.0 + (company.returnMultiple - 1.0) * adjustedProgress * 0.7;
}

/**
 * Calculate yearly fund metrics (DPI, RVPI, TVPI) over fund life
 *
 * @param companies - Array of company results from simulation
 * @param fundSize - Total committed capital
 * @param fundLife - Fund life in years
 * @param investmentPeriod - Investment period in years
 * @param feeStructure - Fee structure (for management fee deductions)
 */
export function calculateYearlyMetrics(
  companies: CompanyResult[],
  fundSize: number,
  fundLife: number,
  investmentPeriod: number,
  feeStructure?: FeeStructure
): YearlyFundMetrics[] {
  const metrics: YearlyFundMetrics[] = [];
  let cumulativeDistributions = 0;
  let cumulativeFees = 0;

  const annualFeeRate = feeStructure
    ? feeStructure.managementFeeRate / 100
    : 0.02;
  const stepDownRate = feeStructure
    ? feeStructure.managementFeeStepDown / 100
    : 0.015;

  // Estimate when each company was invested (spread over investment period)
  const investmentYears = companies.map((_, i) => {
    return (i / companies.length) * investmentPeriod;
  });

  for (let year = 1; year <= fundLife + 2; year++) {
    // Capital called to date
    const capitalCalled = fundSize * getCumulativeCallPercent(year);

    // Management fees this year
    const feeRate = year <= investmentPeriod ? annualFeeRate : stepDownRate;
    cumulativeFees += fundSize * feeRate;

    // Distributions from exits this year (after fees)
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const exitYearFloor = Math.floor(company.exitYear);
      if (exitYearFloor === year) {
        cumulativeDistributions += company.returnedCapital;
      }
    }

    // Net distributions (after management fees deducted from proceeds)
    const netDistributions = Math.max(0, cumulativeDistributions - cumulativeFees);

    // Unrealized value (companies not yet exited)
    let unrealizedValue = 0;
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      if (company.exitYear > year) {
        const markup = estimateInterimMarkup(
          company,
          year,
          investmentYears[i]
        );
        unrealizedValue += company.investedCapital * markup;
      }
    }

    // Calculate metrics
    const dpi = capitalCalled > 0 ? netDistributions / capitalCalled : 0;
    const rvpi = capitalCalled > 0 ? unrealizedValue / capitalCalled : 0;
    const tvpi = dpi + rvpi;

    metrics.push({
      year,
      capitalCalled,
      cumulativeDistributions: netDistributions,
      unrealizedValue,
      managementFees: cumulativeFees,
      dpi,
      rvpi,
      tvpi,
    });
  }

  return metrics;
}

/**
 * Aggregate yearly metrics across multiple simulations
 * Produces P10/P50/P90 bands for each year
 */
export function aggregateYearlyMetrics(
  allMetrics: YearlyFundMetrics[][]
): {
  year: number;
  dpiP10: number;
  dpiP50: number;
  dpiP90: number;
  tvpiP10: number;
  tvpiP50: number;
  tvpiP90: number;
  rvpiP50: number;
}[] {
  if (allMetrics.length === 0) return [];

  const numYears = allMetrics[0].length;
  const result = [];

  for (let yearIdx = 0; yearIdx < numYears; yearIdx++) {
    const dpis = allMetrics
      .map((m) => m[yearIdx]?.dpi ?? 0)
      .sort((a, b) => a - b);
    const tvpis = allMetrics
      .map((m) => m[yearIdx]?.tvpi ?? 0)
      .sort((a, b) => a - b);
    const rvpis = allMetrics
      .map((m) => m[yearIdx]?.rvpi ?? 0)
      .sort((a, b) => a - b);

    const p10 = (arr: number[]) => arr[Math.floor(arr.length * 0.1)] ?? 0;
    const p50 = (arr: number[]) => arr[Math.floor(arr.length * 0.5)] ?? 0;
    const p90 = (arr: number[]) => arr[Math.floor(arr.length * 0.9)] ?? 0;

    result.push({
      year: allMetrics[0][yearIdx].year,
      dpiP10: p10(dpis),
      dpiP50: p50(dpis),
      dpiP90: p90(dpis),
      tvpiP10: p10(tvpis),
      tvpiP50: p50(tvpis),
      tvpiP90: p90(tvpis),
      rvpiP50: p50(rvpis),
    });
  }

  return result;
}
