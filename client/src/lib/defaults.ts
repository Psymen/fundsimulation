/**
 * Default parameters for VC portfolio simulation
 * Calibrated from empirical research data (Cambridge Associates, Carta, PitchBook)
 *
 * Key changes from v1:
 * - Split "Low Return" into "Partial Loss" (0.1-0.5x) and "Near Break-even" (0.5-1x)
 * - Adjusted probabilities based on empirical VC outcome data
 * - Added fee structure defaults (industry standard 2/20)
 */

import type {
  ExitBucket,
  FeeStructure,
  PortfolioParameters,
  StageParameters,
} from "@/types/simulation";

/**
 * Default exit distribution for SEED stage investments
 *
 * Empirical data (Correlation Ventures, CB Insights, Carta):
 * - ~40% total losses (wind-down, acqui-hire for nothing)
 * - ~20% partial losses (return some capital but below 1x)
 * - ~15% break-even to modest return
 * - ~15% solid returns (M&A at 1-5x)
 * - ~7% strong returns (later-stage M&A or small IPO)
 * - ~3% outliers (unicorn exits, IPOs)
 */
export const DEFAULT_SEED_EXIT_BUCKETS: ExitBucket[] = [
  {
    label: "Total Loss",
    probability: 40,
    minMultiple: 0,
    maxMultiple: 0,
  },
  {
    label: "Partial Loss",
    probability: 20,
    minMultiple: 0.1,
    maxMultiple: 0.5,
  },
  {
    label: "Near Break-even",
    probability: 15,
    minMultiple: 0.5,
    maxMultiple: 1.5,
  },
  {
    label: "Mid Return",
    probability: 15,
    minMultiple: 1.5,
    maxMultiple: 5,
  },
  {
    label: "High Return",
    probability: 7,
    minMultiple: 5,
    maxMultiple: 20,
  },
  {
    label: "Outlier",
    probability: 3,
    minMultiple: 20,
    maxMultiple: 150,
  },
];

/**
 * Default exit distribution for SERIES A stage investments
 *
 * Series A companies have proven traction:
 * - Lower total loss rate (~25%)
 * - More companies in the "return some capital" range
 * - Higher probability of moderate returns
 * - Lower outlier probability (less upside from higher entry price)
 */
export const DEFAULT_SERIES_A_EXIT_BUCKETS: ExitBucket[] = [
  {
    label: "Total Loss",
    probability: 25,
    minMultiple: 0,
    maxMultiple: 0,
  },
  {
    label: "Partial Loss",
    probability: 20,
    minMultiple: 0.1,
    maxMultiple: 0.5,
  },
  {
    label: "Near Break-even",
    probability: 15,
    minMultiple: 0.5,
    maxMultiple: 1.5,
  },
  {
    label: "Mid Return",
    probability: 25,
    minMultiple: 1.5,
    maxMultiple: 5,
  },
  {
    label: "High Return",
    probability: 12,
    minMultiple: 5,
    maxMultiple: 15,
  },
  {
    label: "Outlier",
    probability: 3,
    minMultiple: 15,
    maxMultiple: 50,
  },
];

/**
 * Default seed stage parameters
 */
export const DEFAULT_SEED_STAGE: StageParameters = {
  avgCheckSize: 2,
  followOnReserveRatio: 50,
  targetOwnership: 15,
  exitBuckets: DEFAULT_SEED_EXIT_BUCKETS,
};

/**
 * Default Series A stage parameters
 */
export const DEFAULT_SERIES_A_STAGE: StageParameters = {
  avgCheckSize: 5,
  followOnReserveRatio: 50,
  targetOwnership: 12,
  exitBuckets: DEFAULT_SERIES_A_EXIT_BUCKETS,
};

/**
 * Default fee structure (industry standard 2/20)
 */
export const DEFAULT_FEE_STRUCTURE: FeeStructure = {
  managementFeeRate: 2,
  managementFeeStepDown: 1.5,
  carryRate: 20,
  hurdleRate: 8,
  gpCommitPercent: 2,
};

/**
 * Default portfolio parameters
 */
export const DEFAULT_PARAMETERS: PortfolioParameters = {
  fundSize: 200,
  numCompanies: 25,
  seedPercentage: 60,
  seedStage: DEFAULT_SEED_STAGE,
  seriesAStage: DEFAULT_SERIES_A_STAGE,
  investmentPeriod: 5,
  fundLife: 10,
  exitWindowMin: 3,
  exitWindowMax: 10,
  numSimulations: 1000,
  feeStructure: DEFAULT_FEE_STRUCTURE,
};
