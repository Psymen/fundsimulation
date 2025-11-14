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
 * Investment stage (Seed or Series A)
 */
export type InvestmentStage = "seed" | "seriesA";

/**
 * Stage-specific parameters
 */
export interface StageParameters {
  avgCheckSize: number; // in millions
  followOnReserveRatio: number; // 0-100 (percentage)
  targetOwnership: number; // 0-100 (percentage, for reference only)
  exitBuckets: ExitBucket[];
}

/**
 * Portfolio parameters for simulation
 */
export interface PortfolioParameters {
  fundSize: number; // in millions
  numCompanies: number;
  
  // Portfolio composition
  seedPercentage: number; // 0-100 (percentage of companies that are seed)
  
  // Stage-specific parameters
  seedStage: StageParameters;
  seriesAStage: StageParameters;
  
  // Timing parameters
  investmentPeriod: number; // in years
  fundLife: number; // in years
  exitWindowMin: number; // min exit year
  exitWindowMax: number; // max exit year
  
  numSimulations: number;
}

/**
 * Result of a single company within a simulation
 */
export interface CompanyResult {
  stage: InvestmentStage;
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
  numSeedCompanies: number;
  numSeriesACompanies: number;
}

/**
 * Aggregated summary statistics across all simulations
 */
export interface SummaryStatistics {
  medianMOIC: number;
  moicP10: number;
  moicP90: number;
  moicStdDev: number;
  medianIRR: number;
  irrP10: number;
  irrP90: number;
  irrStdDev: number;
  probMOICAbove2x: number;
  probMOICAbove3x: number;
  probMOICAbove5x: number;
  avgWriteOffs: number;
  avgOutliers: number;
}

/**
 * Saved run for historical comparison
 * Stored in IndexedDB with full results for unlimited storage
 */
export interface SavedRun {
  id: string;
  timestamp: number;
  parameters: PortfolioParameters;
  summary: SummaryStatistics;
  results: SimulationResult[];
}

/**
 * Portfolio Construction Grid Analysis Types
 */

/**
 * Parameters for grid analysis
 */
export interface GridAnalysisParameters {
  fundSize: number; // in millions
  investmentCountMin: number;
  investmentCountMax: number;
  seedPercentages: number[]; // array of percentages to test (e.g., [0, 25, 50, 75, 100])
  numSimulationsPerScenario: number;
  
  // Stage parameters (same for all scenarios)
  seedStage: StageParameters;
  seriesAStage: StageParameters;
  
  // Timing parameters
  investmentPeriod: number;
  fundLife: number;
  exitWindowMin: number;
  exitWindowMax: number;
}

/**
 * Single scenario in the grid
 */
export interface GridScenario {
  numCompanies: number;
  seedPercentage: number;
  
  // Results
  summary: SummaryStatistics;
  results: SimulationResult[]; // Full simulation results for detailed analysis
  
  // Deployment metrics
  targetCapital: number; // Total capital we attempted to deploy
  deployedCapital: number; // Actual capital deployed
  deploymentRate: number; // deployedCapital / fundSize (percentage)
  undeployedCapital: number; // fundSize - deployedCapital
  
  // Average across simulations
  avgNumSeedCompanies: number;
  avgNumSeriesACompanies: number;
}

/**
 * Best strategy recommendation
 */
export interface BestStrategy {
  scenario: GridScenario;
  criterion: string; // e.g., "Highest MOIC", "Best Risk-Adjusted Returns"
  reasoning: string;
}

/**
 * Complete grid analysis result
 */
export interface GridAnalysisResult {
  id: string;
  timestamp: number;
  parameters: GridAnalysisParameters;
  scenarios: GridScenario[];
  bestStrategies: BestStrategy[];
  worstStrategies?: BestStrategy[]; // Optional: strategies to avoid
  commentary: string; // AI-generated qualitative analysis
}
