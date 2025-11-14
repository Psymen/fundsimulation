import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GridAnalysisResult, GridScenario } from "@/types/simulation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, Award } from "lucide-react";
import { ScenarioDetailModal } from "@/components/ScenarioDetailModal";

interface GridResultsViewProps {
  analysis: GridAnalysisResult;
}

export default function GridResultsView({ analysis }: GridResultsViewProps) {
  // Removed IRR metric - MOIC only
  const [selectedScenario, setSelectedScenario] = useState<GridScenario | null>(null);
  
  // Get unique investment counts and seed percentages
  const investmentCounts = Array.from(new Set(analysis.scenarios.map(s => s.numCompanies))).sort((a, b) => a - b);
  const seedPercentages = Array.from(new Set(analysis.scenarios.map(s => s.seedPercentage))).sort((a, b) => a - b);
  
  // Find scenario by coordinates
  const getScenario = (numCompanies: number, seedPct: number): GridScenario | undefined => {
    return analysis.scenarios.find(s => s.numCompanies === numCompanies && s.seedPercentage === seedPct);
  };
  
  // Get color for heatmap cell
  const getColor = (scenario: GridScenario | undefined): string => {
    if (!scenario) return "bg-muted";
    
    const value = scenario.summary.medianMOIC;
    const allValues = analysis.scenarios.map(s => s.summary.medianMOIC);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const normalized = (value - min) / (max - min);
    
    // Color scale from red (low) to yellow (mid) to green (high)
    if (normalized < 0.33) return "bg-red-900/80";
    if (normalized < 0.5) return "bg-red-700/80";
    if (normalized < 0.67) return "bg-yellow-700/80";
    if (normalized < 0.83) return "bg-emerald-700/80";
    return "bg-emerald-500/90";
  };
  
  const formatValue = (scenario: GridScenario | undefined): string => {
    if (!scenario) return "-";
    const value = scenario.summary.medianMOIC;
    return `${value.toFixed(2)}x`;
  };
  
  return (
    <div className="space-y-6">
      {/* Best Strategies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Best Strategies
          </CardTitle>
          <CardDescription>Top performing portfolio configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.bestStrategies.map((strategy, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setSelectedScenario(strategy.scenario)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{strategy.criterion}</h4>
                  <Badge variant="outline" className="text-xs">
                    {strategy.scenario.numCompanies} cos
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{strategy.reasoning}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MOIC:</span>
                    <span className="font-semibold text-emerald-400">
                      {strategy.scenario.summary.medianMOIC.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P10-P90:</span>
                    <span className="font-mono">
                      {strategy.scenario.summary.moicP10.toFixed(2)}x - {strategy.scenario.summary.moicP90.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deploy:</span>
                    <span className="font-semibold">
                      {strategy.scenario.deploymentRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Worst Strategies */}
      {analysis.worstStrategies && analysis.worstStrategies.length > 0 && (
        <Card className="border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Strategies to Avoid
            </CardTitle>
            <CardDescription>Underperforming portfolio configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.worstStrategies.map((strategy, idx) => (
                <div
                  key={idx}
                  className="border border-red-900/50 rounded-lg p-4 hover:bg-red-950/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedScenario(strategy.scenario)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm text-red-400">{strategy.criterion}</h4>
                    <Badge variant="outline" className="text-xs border-red-800">
                      {strategy.scenario.numCompanies} cos
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{strategy.reasoning}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MOIC:</span>
                      <span className="font-semibold text-red-400">
                        {strategy.scenario.summary.medianMOIC.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P10-P90:</span>
                      <span className="font-mono">
                        {strategy.scenario.summary.moicP10.toFixed(2)}x - {strategy.scenario.summary.moicP90.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deploy:</span>
                      <span className="font-semibold">
                        {strategy.scenario.deploymentRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Performance Heatmap</CardTitle>
          <CardDescription>
            Median MOIC across configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-2 text-sm font-semibold bg-muted">
                    # Companies
                  </th>
                  {seedPercentages.map(pct => (
                    <th key={pct} className="border border-border p-2 text-sm font-semibold bg-muted">
                      {pct}% Seed
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investmentCounts.map(count => (
                  <tr key={count}>
                    <td className="border border-border p-2 text-sm font-semibold bg-muted text-center">
                      {count}
                    </td>
                    {seedPercentages.map(pct => {
                      const scenario = getScenario(count, pct);
                      return (
                        <td
                          key={`${count}-${pct}`}
                          className={`border border-border p-3 text-center cursor-pointer hover:opacity-80 transition-opacity ${getColor(scenario)}`}
                          onClick={() => scenario && setSelectedScenario(scenario)}
                        >
                          <div className="font-semibold text-white">
                            {formatValue(scenario)}
                          </div>
                          {scenario && (
                            <div className="text-xs text-white/80 mt-1">
                              {scenario.deploymentRate.toFixed(0)}% deploy
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className="text-muted-foreground">Performance:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-900/80 rounded"></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-700/80 rounded"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500/90 rounded"></div>
              <span>High</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Selected Scenario Details */}
      {selectedScenario && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedScenario.numCompanies} Companies, {selectedScenario.seedPercentage}% Seed
                </CardTitle>
                <CardDescription>
                  {selectedScenario.avgNumSeedCompanies.toFixed(1)} seed, {selectedScenario.avgNumSeriesACompanies.toFixed(1)} Series A on average
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedScenario(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Median MOIC</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {selectedScenario.summary.medianMOIC.toFixed(2)}x
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  P10: {selectedScenario.summary.moicP10.toFixed(2)}x | P90: {selectedScenario.summary.moicP90.toFixed(2)}x
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Median IRR</div>
                <div className="text-2xl font-bold text-amber-400">
                  {(selectedScenario.summary.medianIRR * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  P10: {(selectedScenario.summary.irrP10 * 100).toFixed(1)}% | P90: {(selectedScenario.summary.irrP90 * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Capital Deployed</div>
                <div className="text-2xl font-bold">
                  {selectedScenario.deploymentRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${selectedScenario.deployedCapital.toFixed(0)}M / ${analysis.parameters.fundSize}M
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Avg Outcomes</div>
                <div className="text-2xl font-bold">
                  {selectedScenario.summary.avgOutliers.toFixed(1)} outliers
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedScenario.summary.avgWriteOffs.toFixed(1)} write-offs
                </div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="border rounded-lg p-3">
                <div className="text-muted-foreground mb-1">MOIC ≥ 2x</div>
                <div className="text-lg font-semibold">
                  {selectedScenario.summary.probMOICAbove2x.toFixed(1)}%
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-muted-foreground mb-1">MOIC ≥ 3x</div>
                <div className="text-lg font-semibold">
                  {selectedScenario.summary.probMOICAbove3x.toFixed(1)}%
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-muted-foreground mb-1">MOIC ≥ 5x</div>
                <div className="text-lg font-semibold">
                  {selectedScenario.summary.probMOICAbove5x.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Commentary */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Commentary</CardTitle>
          <CardDescription>Key insights from the grid analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm leading-relaxed">
            {analysis.commentary.split('\n\n').map((section, idx) => {
              const lines = section.split('\n').filter(l => l.trim());
              if (lines.length === 0) return null;
              
              // Check if first line is a heading (starts with **)
              const firstLine = lines[0];
              const isHeading = firstLine.startsWith('**') && firstLine.endsWith('**');
              
              return (
                <div key={idx} className="space-y-2">
                  {isHeading && (
                    <h4 className="font-semibold text-base text-foreground">
                      {firstLine.replace(/\*\*/g, '')}
                    </h4>
                  )}
                  {lines.slice(isHeading ? 1 : 0).map((line, lineIdx) => (
                    <p key={lineIdx} className="text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Scenario Detail Modal */}
      <ScenarioDetailModal 
        scenario={selectedScenario}
        isOpen={selectedScenario !== null}
        onClose={() => setSelectedScenario(null)}
      />
    </div>
  );
}
