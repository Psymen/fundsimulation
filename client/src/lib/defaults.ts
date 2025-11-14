/**
 * Default parameters for VC portfolio simulation
 * Configured for a typical seed/Series A fund
 */

import type { ExitBucket, PortfolioParameters } from "@/types/simulation";

/**
 * Default exit distribution buckets
 * Reflects typical early-stage VC outcomes with many zeros and rare outliers
 */
export const DEFAULT_EXIT_BUCKETS: ExitBucket[] = [
  {
    label: "Total Loss",
    probability: 40,
    minMultiple: 0,
    maxMultiple: 0,
  },
  {
    label: "Low Return",
    probability: 30,
    minMultiple: 0.1,
    maxMultiple: 1,
  },
  {
    label: "Mid Return",
    probability: 20,
    minMultiple: 1,
    maxMultiple: 5,
  },
  {
    label: "High Return",
    probability: 8,
    minMultiple: 5,
    maxMultiple: 20,
  },
  {
    label: "Outlier",
    probability: 2,
    minMultiple: 20,
    maxMultiple: 100,
  },
];

/**
 * Default portfolio parameters
 */
export const DEFAULT_PARAMETERS: PortfolioParameters = {
  fundSize: 100, // $100M fund
  numCompanies: 25,
  avgCheckSize: 3, // $3M average initial check
  followOnReserveRatio: 50, // 50% reserve for follow-ons
  targetOwnership: 15, // 15% target ownership (for reference)
  investmentPeriod: 3, // 3 years to deploy
  fundLife: 10, // 10 year fund
  exitWindowMin: 3, // Earliest exit at year 3
  exitWindowMax: 10, // Latest exit at year 10
  exitBuckets: DEFAULT_EXIT_BUCKETS,
  numSimulations: 1000,
};
