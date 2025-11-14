/**
 * TypeScript types for VC Portfolio Monte Carlo Simulation
 */

/**
 * Exit outcome bucket definition
 */
export interface ExitBucket {
  label: string;
  probability: number; // 0-100 (percentage)
  minMultiple: number;
  maxMultiple: number;
}

/**
 * Portfolio parameters for simulation
 */
export interface PortfolioParameters {
  fundSize: number; // in millions
  numCompanies: number;
  avgCheckSize: number; // in millions
  followOnReserveRatio: number; // 0-100 (percentage)
  targetOwnership: number; // 0-100 (percentage, for reference only)
  investmentPeriod: number; // in years
  fundLife: number; // in years
  exitWindowMin: number; // min exit year
  exitWindowMax: number; // max exit year
  exitBuckets: ExitBucket[];
  numSimulations: number;
}

/**
 * Result of a single company within a simulation
 */
export interface CompanyResult {
  investedCapital: number;
  returnedCapital: number;
  returnMultiple: number;
  exitYear: number;
  bucketLabel: string;
}

/**
 * Result of a single simulation run
 */
export interface SimulationResult {
  companies: CompanyResult[];
  totalInvestedCapital: number;
  totalReturnedCapital: number;
  grossMOIC: number;
  multipleOnCommittedCapital: number;
  grossIRR: number;
  numWriteOffs: number;
  numOutliers: number;
}

/**
 * Aggregated summary statistics across all simulations
 */
export interface SummaryStatistics {
  medianMOIC: number;
  moicP10: number;
  moicP90: number;
  medianIRR: number;
  irrP10: number;
  irrP90: number;
  probMOICAbove2x: number;
  probMOICAbove3x: number;
  probMOICAbove5x: number;
  avgWriteOffs: number;
  avgOutliers: number;
}

/**
 * Saved run for historical comparison
 */
export interface SavedRun {
  id: string;
  timestamp: number;
  parameters: PortfolioParameters;
  summary: SummaryStatistics;
  results: SimulationResult[];
}
