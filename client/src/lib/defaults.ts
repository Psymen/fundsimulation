/**
 * Default parameters for VC portfolio simulation
 * Configured for a typical seed/Series A fund
 */

import type { ExitBucket, PortfolioParameters, StageParameters } from "@/types/simulation";

/**
 * Default exit distribution for SEED stage investments
 * Higher risk, higher potential upside
 * Reflects that seed companies have ~50% failure rate but can produce massive outliers
 */
export const DEFAULT_SEED_EXIT_BUCKETS: ExitBucket[] = [
  {
    label: "Total Loss",
    probability: 50, // Higher failure rate at seed
    minMultiple: 0,
    maxMultiple: 0,
  },
  {
    label: "Low Return",
    probability: 25,
    minMultiple: 0.1,
    maxMultiple: 1,
  },
  {
    label: "Mid Return",
    probability: 15,
    minMultiple: 1,
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
    probability: 3, // Slightly higher outlier probability at seed
    minMultiple: 20,
    maxMultiple: 150, // Higher max multiple for seed
  },
];

/**
 * Default exit distribution for SERIES A stage investments
 * Lower risk, more moderate returns
 * Companies have proven some traction, lower failure rate but less upside
 */
export const DEFAULT_SERIES_A_EXIT_BUCKETS: ExitBucket[] = [
  {
    label: "Total Loss",
    probability: 30, // Lower failure rate than seed
    minMultiple: 0,
    maxMultiple: 0,
  },
  {
    label: "Low Return",
    probability: 35,
    minMultiple: 0.1,
    maxMultiple: 1,
  },
  {
    label: "Mid Return",
    probability: 25,
    minMultiple: 1,
    maxMultiple: 5,
  },
  {
    label: "High Return",
    probability: 9,
    minMultiple: 5,
    maxMultiple: 15, // Lower max than seed
  },
  {
    label: "Outlier",
    probability: 1, // Lower outlier probability than seed
    minMultiple: 15,
    maxMultiple: 50, // Lower max multiple than seed
  },
];

/**
 * Default seed stage parameters
 */
export const DEFAULT_SEED_STAGE: StageParameters = {
  avgCheckSize: 2, // $2M average seed check
  followOnReserveRatio: 50, // 50% reserve for follow-ons
  targetOwnership: 15, // 15% target ownership
  exitBuckets: DEFAULT_SEED_EXIT_BUCKETS,
};

/**
 * Default Series A stage parameters
 */
export const DEFAULT_SERIES_A_STAGE: StageParameters = {
  avgCheckSize: 5, // $5M average Series A check
  followOnReserveRatio: 50, // 50% reserve for follow-ons
  targetOwnership: 12, // 12% target ownership (more competitive)
  exitBuckets: DEFAULT_SERIES_A_EXIT_BUCKETS,
};

/**
 * Default portfolio parameters
 */
export const DEFAULT_PARAMETERS: PortfolioParameters = {
  fundSize: 100, // $100M fund
  numCompanies: 25,
  
  // 60% seed, 40% Series A
  seedPercentage: 60,
  
  // Stage-specific parameters
  seedStage: DEFAULT_SEED_STAGE,
  seriesAStage: DEFAULT_SERIES_A_STAGE,
  
  // Timing parameters
  investmentPeriod: 3, // 3 years to deploy
  fundLife: 10, // 10 year fund
  exitWindowMin: 3, // Earliest exit at year 3
  exitWindowMax: 10, // Latest exit at year 10
  
  numSimulations: 1000,
};
