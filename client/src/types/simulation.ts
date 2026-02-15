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
 * Fee structure for fund economics (2/20 standard)
 */
export interface FeeStructure {
  managementFeeRate: number; // Annual % on committed capital (default 2%)
  managementFeeStepDown: number; // Annual % after investment period (default 1.5%)
  carryRate: number; // % of profits above hurdle (default 20%)
  hurdleRate: number; // Preferred return % (default 8%)
  gpCommitPercent: number; // GP commitment as % of fund (default 2%)
}

/**
 * Net returns calculation result
 */
export interface NetReturnsResult {
  grossProceeds: number;
  managementFees: number;
  carriedInterest: number;
  netToLP: number;
  netMOIC: number;
  feeDragPercent: number;
  gpTotalComp: number;
  distributable: number;
}

/**
 * Yearly fund metrics for J-curve / DPI tracking
 */
export interface YearlyFundMetrics {
  year: number;
  capitalCalled: number;
  cumulativeDistributions: number;
  unrealizedValue: number;
  managementFees: number;
  dpi: number; // Distributions to Paid-In
  rvpi: number; // Residual Value to Paid-In
  tvpi: number; // Total Value to Paid-In (DPI + RVPI)
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

  // Fee structure (optional - defaults to 2/20)
  feeStructure?: FeeStructure;
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

  // Net returns (after fees and carry)
  netMOIC?: number;
  netIRR?: number;
  managementFees?: number;
  carriedInterest?: number;
  feeDragPercent?: number;

  // Yearly metrics (J-curve data)
  yearlyMetrics?: YearlyFundMetrics[];
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

  // Net metrics (after fees)
  medianNetMOIC?: number;
  netMoicP10?: number;
  netMoicP90?: number;
  medianNetIRR?: number;
  avgFeeDrag?: number;
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
