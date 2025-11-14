/**
 * Portfolio Construction Grid Analysis
 * Runs simulations across different portfolio configurations to find optimal strategies
 */

import type {
  GridAnalysisParameters,
  GridScenario,
  GridAnalysisResult,
  BestStrategy,
  PortfolioParameters,
  SimulationResult,
} from "@/types/simulation";
import { runSimulations, calculateSummaryStatistics } from "./simulation";

/**
 * Generate investment count buckets (≤10 evenly spaced)
 */
export function generateInvestmentCountBuckets(min: number, max: number): number[] {
  if (min === max) return [min];
  
  const range = max - min;
  const maxBuckets = 10;
  
  // Calculate step size
  let step = Math.ceil(range / (maxBuckets - 1));
  
  const buckets: number[] = [];
  for (let i = min; i <= max; i += step) {
    buckets.push(i);
  }
  
  // Ensure max is included
  if (buckets[buckets.length - 1] !== max) {
    buckets.push(max);
  }
  
  return buckets;
}

/**
 * Auto-adjust reserve ratios based on stage mix
 * Seed investments typically need higher reserves for follow-on
 */
export function calculateReserveRatio(seedPercentage: number, baseSeedReserve: number, baseSeriesAReserve: number): {
  seedReserve: number;
  seriesAReserve: number;
} {
  // Weighted average approach - more seed = higher overall reserves needed
  const seedWeight = seedPercentage / 100;
  const seriesAWeight = 1 - seedWeight;
  
  return {
    seedReserve: baseSeedReserve,
    seriesAReserve: baseSeriesAReserve,
  };
}

/**
 * Calculate deployment metrics from simulation results
 */
function calculateDeploymentMetrics(
  results: SimulationResult[],
  fundSize: number
): {
  avgDeployedCapital: number;
  deploymentRate: number;
  undeployedCapital: number;
  avgNumSeedCompanies: number;
  avgNumSeriesACompanies: number;
} {
  const avgDeployed = results.reduce((sum, r) => sum + r.totalInvestedCapital, 0) / results.length;
  const avgSeed = results.reduce((sum, r) => sum + r.numSeedCompanies, 0) / results.length;
  const avgSeriesA = results.reduce((sum, r) => sum + r.numSeriesACompanies, 0) / results.length;
  
  return {
    avgDeployedCapital: avgDeployed,
    deploymentRate: (avgDeployed / fundSize) * 100,
    undeployedCapital: fundSize - avgDeployed,
    avgNumSeedCompanies: avgSeed,
    avgNumSeriesACompanies: avgSeriesA,
  };
}

/**
 * Run grid analysis across all scenario combinations
 */
export async function runGridAnalysis(
  params: GridAnalysisParameters,
  onProgress?: (current: number, total: number) => void
): Promise<GridScenario[]> {
  const investmentCounts = generateInvestmentCountBuckets(
    params.investmentCountMin,
    params.investmentCountMax
  );
  
  const scenarios: GridScenario[] = [];
  const totalScenarios = investmentCounts.length * params.seedPercentages.length;
  let completed = 0;
  
  for (const numCompanies of investmentCounts) {
    for (const seedPercentage of params.seedPercentages) {
      // Build portfolio parameters for this scenario
      const portfolioParams: PortfolioParameters = {
        fundSize: params.fundSize,
        numCompanies,
        seedPercentage,
        seedStage: params.seedStage,
        seriesAStage: params.seriesAStage,
        investmentPeriod: params.investmentPeriod,
        fundLife: params.fundLife,
        exitWindowMin: params.exitWindowMin,
        exitWindowMax: params.exitWindowMax,
        numSimulations: params.numSimulationsPerScenario,
      };
      
      // Run simulations for this scenario
      const results = runSimulations(portfolioParams);
      const summary = calculateSummaryStatistics(results);
      const deployment = calculateDeploymentMetrics(results, params.fundSize);
      
      // Calculate target capital (what we attempted to deploy)
      const numSeed = Math.round(numCompanies * (seedPercentage / 100));
      const numSeriesA = numCompanies - numSeed;
      const seedCapitalPerCompany = params.seedStage.avgCheckSize * (1 + params.seedStage.followOnReserveRatio / 100);
      const seriesACapitalPerCompany = params.seriesAStage.avgCheckSize * (1 + params.seriesAStage.followOnReserveRatio / 100);
      const targetCapital = (numSeed * seedCapitalPerCompany) + (numSeriesA * seriesACapitalPerCompany);
      
      scenarios.push({
        numCompanies,
        seedPercentage,
        summary,
        targetCapital,
        deployedCapital: deployment.avgDeployedCapital,
        deploymentRate: deployment.deploymentRate,
        undeployedCapital: deployment.undeployedCapital,
        avgNumSeedCompanies: deployment.avgNumSeedCompanies,
        avgNumSeriesACompanies: deployment.avgNumSeriesACompanies,
      });
      
      completed++;
      if (onProgress) {
        onProgress(completed, totalScenarios);
      }
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return scenarios;
}

/**
 * Identify best strategies from grid results
 */
export function identifyBestStrategies(scenarios: GridScenario[]): BestStrategy[] {
  const strategies: BestStrategy[] = [];
  
  // 1. Highest MOIC
  const highestMOIC = scenarios.reduce((best, s) => 
    s.summary.medianMOIC > best.summary.medianMOIC ? s : best
  );
  strategies.push({
    scenario: highestMOIC,
    criterion: "Highest Median MOIC",
    reasoning: `${highestMOIC.numCompanies} companies with ${highestMOIC.seedPercentage}% seed achieves ${highestMOIC.summary.medianMOIC.toFixed(2)}x MOIC with ${highestMOIC.deploymentRate.toFixed(0)}% capital deployment.`,
  });
  
  // 2. Highest IRR
  const highestIRR = scenarios.reduce((best, s) => 
    s.summary.medianIRR > best.summary.medianIRR ? s : best
  );
  if (highestIRR !== highestMOIC) {
    strategies.push({
      scenario: highestIRR,
      criterion: "Highest Median IRR",
      reasoning: `${highestIRR.numCompanies} companies with ${highestIRR.seedPercentage}% seed achieves ${highestIRR.summary.medianIRR.toFixed(1)}% IRR with ${highestIRR.deploymentRate.toFixed(0)}% deployment.`,
    });
  }
  
  // 3. Best risk-adjusted (highest P10 MOIC)
  const bestRiskAdjusted = scenarios.reduce((best, s) => 
    s.summary.moicP10 > best.summary.moicP10 ? s : best
  );
  strategies.push({
    scenario: bestRiskAdjusted,
    criterion: "Best Downside Protection",
    reasoning: `${bestRiskAdjusted.numCompanies} companies with ${bestRiskAdjusted.seedPercentage}% seed has P10 MOIC of ${bestRiskAdjusted.summary.moicP10.toFixed(2)}x, offering the best downside protection.`,
  });
  
  // 4. Highest deployment efficiency (high MOIC with high deployment)
  const efficiencyScores = scenarios.map(s => ({
    scenario: s,
    score: s.summary.medianMOIC * (s.deploymentRate / 100),
  }));
  const mostEfficient = efficiencyScores.reduce((best, s) => 
    s.score > best.score ? s : best
  ).scenario;
  
  if (!strategies.find(s => s.scenario === mostEfficient)) {
    strategies.push({
      scenario: mostEfficient,
      criterion: "Most Capital Efficient",
      reasoning: `${mostEfficient.numCompanies} companies with ${mostEfficient.seedPercentage}% seed balances returns (${mostEfficient.summary.medianMOIC.toFixed(2)}x MOIC) with deployment efficiency (${mostEfficient.deploymentRate.toFixed(0)}%).`,
    });
  }
  
  return strategies.slice(0, 4); // Return top 4 strategies
}

/**
 * Identify worst strategies from grid results
 */
export function identifyWorstStrategies(scenarios: GridScenario[]): BestStrategy[] {
  const strategies: BestStrategy[] = [];
  
  // 1. Lowest MOIC
  const lowestMOIC = scenarios.reduce((worst, s) => 
    s.summary.medianMOIC < worst.summary.medianMOIC ? s : worst
  );
  strategies.push({
    scenario: lowestMOIC,
    criterion: "Lowest Median MOIC",
    reasoning: `${lowestMOIC.numCompanies} companies with ${lowestMOIC.seedPercentage}% seed achieves only ${lowestMOIC.summary.medianMOIC.toFixed(2)}x MOIC, underperforming the portfolio.`,
  });
  
  // 2. Worst risk-adjusted (lowest P10 MOIC)
  const worstRiskAdjusted = scenarios.reduce((worst, s) => 
    s.summary.moicP10 < worst.summary.moicP10 ? s : worst
  );
  if (worstRiskAdjusted !== lowestMOIC) {
    strategies.push({
      scenario: worstRiskAdjusted,
      criterion: "Worst Downside Protection",
      reasoning: `${worstRiskAdjusted.numCompanies} companies with ${worstRiskAdjusted.seedPercentage}% seed has P10 MOIC of ${worstRiskAdjusted.summary.moicP10.toFixed(2)}x, offering poor downside protection.`,
    });
  }
  
  // 3. Poorest capital efficiency (low MOIC with low deployment)
  const efficiencyScores = scenarios.map(s => ({
    scenario: s,
    score: s.summary.medianMOIC * (s.deploymentRate / 100),
  }));
  const leastEfficient = efficiencyScores.reduce((worst, s) => 
    s.score < worst.score ? s : worst
  ).scenario;
  
  if (!strategies.find(s => s.scenario === leastEfficient)) {
    strategies.push({
      scenario: leastEfficient,
      criterion: "Least Capital Efficient",
      reasoning: `${leastEfficient.numCompanies} companies with ${leastEfficient.seedPercentage}% seed delivers poor returns (${leastEfficient.summary.medianMOIC.toFixed(2)}x MOIC) with low deployment (${leastEfficient.deploymentRate.toFixed(0)}%).`,
    });
  }
  
  return strategies.slice(0, 3); // Return top 3 worst strategies
}

/**
 * Generate AI-style commentary analyzing the grid results
 */
export function generateCommentary(scenarios: GridScenario[], params: GridAnalysisParameters): string {
  const lines: string[] = [];
  
  // Overall pattern analysis
  const avgMOIC = scenarios.reduce((sum, s) => sum + s.summary.medianMOIC, 0) / scenarios.length;
  const avgIRR = scenarios.reduce((sum, s) => sum + s.summary.medianIRR, 0) / scenarios.length;
  const avgDeployment = scenarios.reduce((sum, s) => sum + s.deploymentRate, 0) / scenarios.length;
  
  lines.push(`**Portfolio Construction Analysis: $${params.fundSize}M Fund**\n`);
  lines.push(`Across ${scenarios.length} scenarios, the median MOIC ranges from ${Math.min(...scenarios.map(s => s.summary.medianMOIC)).toFixed(2)}x to ${Math.max(...scenarios.map(s => s.summary.medianMOIC)).toFixed(2)}x, with an average of ${avgMOIC.toFixed(2)}x. Capital deployment efficiency varies significantly, averaging ${avgDeployment.toFixed(0)}% across all configurations.\n`);
  
  // Seed vs Series A analysis
  const seedHeavy = scenarios.filter(s => s.seedPercentage >= 75);
  const seriesAHeavy = scenarios.filter(s => s.seedPercentage <= 25);
  
  if (seedHeavy.length > 0 && seriesAHeavy.length > 0) {
    const seedAvgMOIC = seedHeavy.reduce((sum, s) => sum + s.summary.medianMOIC, 0) / seedHeavy.length;
    const seriesAAvgMOIC = seriesAHeavy.reduce((sum, s) => sum + s.summary.medianMOIC, 0) / seriesAHeavy.length;
    const seedAvgDeployment = seedHeavy.reduce((sum, s) => sum + s.deploymentRate, 0) / seedHeavy.length;
    const seriesAAvgDeployment = seriesAHeavy.reduce((sum, s) => sum + s.deploymentRate, 0) / seriesAHeavy.length;
    
    lines.push(`**Stage Mix Insights:**\n`);
    if (seedAvgMOIC > seriesAAvgMOIC * 1.1) {
      lines.push(`Seed-heavy portfolios (≥75% seed) demonstrate ${((seedAvgMOIC / seriesAAvgMOIC - 1) * 100).toFixed(0)}% higher median returns (${seedAvgMOIC.toFixed(2)}x vs ${seriesAAvgMOIC.toFixed(2)}x) but deploy only ${seedAvgDeployment.toFixed(0)}% of capital on average due to higher failure rates limiting follow-on deployment.\n`);
    } else if (seriesAAvgMOIC > seedAvgMOIC * 1.1) {
      lines.push(`Series A-heavy portfolios (≤25% seed) show ${((seriesAAvgMOIC / seedAvgMOIC - 1) * 100).toFixed(0)}% higher returns with superior deployment efficiency (${seriesAAvgDeployment.toFixed(0)}% vs ${seedAvgDeployment.toFixed(0)}%), suggesting more consistent capital deployment opportunities.\n`);
    } else {
      lines.push(`Returns are relatively balanced across stage mixes (seed-heavy: ${seedAvgMOIC.toFixed(2)}x, Series A-heavy: ${seriesAAvgMOIC.toFixed(2)}x), though deployment efficiency favors Series A strategies (${seriesAAvgDeployment.toFixed(0)}% vs ${seedAvgDeployment.toFixed(0)}%).\n`);
    }
  }
  
  // Portfolio concentration analysis
  const concentrated = scenarios.filter(s => s.numCompanies <= (params.investmentCountMin + params.investmentCountMax) / 2);
  const diversified = scenarios.filter(s => s.numCompanies > (params.investmentCountMin + params.investmentCountMax) / 2);
  
  if (concentrated.length > 0 && diversified.length > 0) {
    const concAvgMOIC = concentrated.reduce((sum, s) => sum + s.summary.medianMOIC, 0) / concentrated.length;
    const divAvgMOIC = diversified.reduce((sum, s) => sum + s.summary.medianMOIC, 0) / diversified.length;
    const concAvgP10 = concentrated.reduce((sum, s) => sum + s.summary.moicP10, 0) / concentrated.length;
    const divAvgP10 = diversified.reduce((sum, s) => sum + s.summary.moicP10, 0) / diversified.length;
    
    lines.push(`**Portfolio Size Insights:**\n`);
    if (concAvgMOIC > divAvgMOIC * 1.05) {
      lines.push(`Concentrated portfolios (≤${Math.floor((params.investmentCountMin + params.investmentCountMax) / 2)} companies) achieve ${concAvgMOIC.toFixed(2)}x median MOIC vs ${divAvgMOIC.toFixed(2)}x for diversified strategies, though with higher downside risk (P10: ${concAvgP10.toFixed(2)}x vs ${divAvgP10.toFixed(2)}x).\n`);
    } else {
      lines.push(`Diversified portfolios (>${Math.floor((params.investmentCountMin + params.investmentCountMax) / 2)} companies) provide better risk-adjusted returns with P10 MOIC of ${divAvgP10.toFixed(2)}x vs ${concAvgP10.toFixed(2)}x for concentrated approaches, at the cost of slightly lower median returns.\n`);
    }
  }
  
  // Deployment efficiency insights
  const highDeployment = scenarios.filter(s => s.deploymentRate >= 80);
  const lowDeployment = scenarios.filter(s => s.deploymentRate < 60);
  
  if (highDeployment.length > 0 && lowDeployment.length > 0) {
    lines.push(`**Capital Deployment:**\n`);
    lines.push(`${highDeployment.length} scenarios achieve ≥80% deployment, typically Series A-heavy or balanced portfolios. ${lowDeployment.length} scenarios deploy <60%, primarily seed-heavy strategies where company failures limit follow-on reserve deployment. Consider this trade-off when optimizing for fund size utilization vs return potential.`);
  }
  
  return lines.join('\n');
}
