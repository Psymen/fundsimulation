/**
 * Scenario Stress Testing Page
 * Compare pre-built and custom market scenarios via Monte Carlo simulation
 */

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { runSimulations, calculateSummaryStatistics } from "@/lib/simulation";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";
import type {
  PortfolioParameters,
  SimulationResult,
  SummaryStatistics,
  ExitBucket,
  StageParameters,
} from "@/types/simulation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Play, Loader2, BarChart3, Sliders, Zap } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers for parameter modification
// ---------------------------------------------------------------------------

function deepCloneParams(params: PortfolioParameters): PortfolioParameters {
  return JSON.parse(JSON.stringify(params));
}

function modifyStageFailureRate(
  stage: StageParameters,
  factor: number
): StageParameters {
  const buckets = stage.exitBuckets.map((b) => ({ ...b }));
  const totalLossIdx = buckets.findIndex((b) => b.label === "Total Loss");
  if (totalLossIdx === -1) return { ...stage, exitBuckets: buckets };

  const oldProb = buckets[totalLossIdx].probability;
  const newProb = Math.min(Math.max(oldProb * factor, 0), 95);
  const diff = newProb - oldProb;

  // Redistribute difference proportionally across non-Total-Loss buckets
  const otherBuckets = buckets.filter((_, i) => i !== totalLossIdx);
  const otherTotal = otherBuckets.reduce((s, b) => s + b.probability, 0);

  if (otherTotal > 0) {
    for (const b of otherBuckets) {
      b.probability = Math.max(b.probability - (diff * b.probability) / otherTotal, 0);
    }
  }

  buckets[totalLossIdx].probability = newProb;

  // Normalize to 100
  const sum = buckets.reduce((s, b) => s + b.probability, 0);
  if (sum > 0) {
    for (const b of buckets) {
      b.probability = (b.probability / sum) * 100;
    }
  }

  return { ...stage, exitBuckets: buckets };
}

function modifyStageMultiples(
  stage: StageParameters,
  factor: number
): StageParameters {
  const buckets = stage.exitBuckets.map((b) => ({
    ...b,
    minMultiple:
      b.label === "Total Loss" ? b.minMultiple : b.minMultiple * factor,
    maxMultiple:
      b.label === "Total Loss" ? b.maxMultiple : b.maxMultiple * factor,
  }));
  return { ...stage, exitBuckets: buckets };
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

interface ScenarioModifier {
  name: string;
  description: string;
  color: string;
  modifyParams: (params: PortfolioParameters) => PortfolioParameters;
}

const SCENARIOS: ScenarioModifier[] = [
  {
    name: "Base Case",
    description: "Default parameters with no modifications (control scenario)",
    color: "#a371f7",
    modifyParams: (params) => deepCloneParams(params),
  },
  {
    name: "2008 Financial Crisis",
    description:
      "Failure rate +50%, multiples x0.65, exit windows +2.5 years",
    color: "#f85149",
    modifyParams: (params) => {
      const p = deepCloneParams(params);
      p.seedStage = modifyStageFailureRate(p.seedStage, 1.5);
      p.seriesAStage = modifyStageFailureRate(p.seriesAStage, 1.5);
      p.seedStage = modifyStageMultiples(p.seedStage, 0.65);
      p.seriesAStage = modifyStageMultiples(p.seriesAStage, 0.65);
      p.exitWindowMin += 2.5;
      p.exitWindowMax += 2.5;
      return p;
    },
  },
  {
    name: "2021 Bull Market",
    description: "Failure rate -20%, multiples x1.4, exits -1 year",
    color: "#3fb950",
    modifyParams: (params) => {
      const p = deepCloneParams(params);
      p.seedStage = modifyStageFailureRate(p.seedStage, 0.8);
      p.seriesAStage = modifyStageFailureRate(p.seriesAStage, 0.8);
      p.seedStage = modifyStageMultiples(p.seedStage, 1.4);
      p.seriesAStage = modifyStageMultiples(p.seriesAStage, 1.4);
      p.exitWindowMin = Math.max(1, p.exitWindowMin - 1);
      p.exitWindowMax = Math.max(p.exitWindowMin + 1, p.exitWindowMax - 1);
      return p;
    },
  },
  {
    name: "Rate Hike (2022-23)",
    description: "Failure rate +30%, multiples x0.75, exits +1.5 years",
    color: "#d29922",
    modifyParams: (params) => {
      const p = deepCloneParams(params);
      p.seedStage = modifyStageFailureRate(p.seedStage, 1.3);
      p.seriesAStage = modifyStageFailureRate(p.seriesAStage, 1.3);
      p.seedStage = modifyStageMultiples(p.seedStage, 0.75);
      p.seriesAStage = modifyStageMultiples(p.seriesAStage, 0.75);
      p.exitWindowMin += 1.5;
      p.exitWindowMax += 1.5;
      return p;
    },
  },
  {
    name: "Exit Drought",
    description: "No early exits: exit window pushed to 7-12 years",
    color: "#58a6ff",
    modifyParams: (params) => {
      const p = deepCloneParams(params);
      p.exitWindowMin = 7;
      p.exitWindowMax = 12;
      return p;
    },
  },
];

// ---------------------------------------------------------------------------
// Types for results
// ---------------------------------------------------------------------------

interface ScenarioResult {
  scenario: ScenarioModifier;
  results: SimulationResult[];
  summary: SummaryStatistics;
}

// ---------------------------------------------------------------------------
// Distribution histogram helper
// ---------------------------------------------------------------------------

function buildMOICHistogram(
  scenarioResults: ScenarioResult[],
  binCount: number = 30
): Array<Record<string, number | string>> {
  // Find global min/max MOIC
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (const sr of scenarioResults) {
    for (const r of sr.results) {
      if (r.grossMOIC < globalMin) globalMin = r.grossMOIC;
      if (r.grossMOIC > globalMax) globalMax = r.grossMOIC;
    }
  }

  // Clamp for display
  globalMin = Math.max(0, Math.floor(globalMin * 10) / 10);
  globalMax = Math.min(globalMax, 8);
  const binWidth = (globalMax - globalMin) / binCount;

  const data: Array<Record<string, number | string>> = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = globalMin + i * binWidth;
    const binEnd = binStart + binWidth;
    const row: Record<string, number | string> = {
      bin: `${binStart.toFixed(1)}x`,
      binStart,
      binEnd,
    };

    for (const sr of scenarioResults) {
      const count = sr.results.filter(
        (r) => r.grossMOIC >= binStart && r.grossMOIC < binEnd
      ).length;
      // Normalize to percentage
      row[sr.scenario.name] =
        Math.round((count / sr.results.length) * 1000) / 10;
    }

    data.push(row);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Custom tooltip for charts
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        color: "#94a3b8",
      }}
    >
      <p className="mb-1 font-medium text-white">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NUM_SIMS_PER_SCENARIO = 500;

export default function ScenarioStressTest() {
  // Scenario selection
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(
    () => new Set(SCENARIOS.map((s) => s.name))
  );

  // Results
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Custom scenario builder
  const [failureRateMod, setFailureRateMod] = useState(1.0);
  const [multipleMod, setMultipleMod] = useState(1.0);
  const [exitDelayMod, setExitDelayMod] = useState(0);
  const [customIncluded, setCustomIncluded] = useState(false);

  const toggleScenario = useCallback((name: string) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Build the custom scenario modifier
  const customScenario: ScenarioModifier = useMemo(
    () => ({
      name: "Custom",
      description: `Failure x${failureRateMod.toFixed(1)}, Multiples x${multipleMod.toFixed(1)}, Exit ${exitDelayMod >= 0 ? "+" : ""}${exitDelayMod.toFixed(1)}y`,
      color: "#f0883e",
      modifyParams: (params: PortfolioParameters) => {
        const p = deepCloneParams(params);
        p.seedStage = modifyStageFailureRate(p.seedStage, failureRateMod);
        p.seriesAStage = modifyStageFailureRate(p.seriesAStage, failureRateMod);
        p.seedStage = modifyStageMultiples(p.seedStage, multipleMod);
        p.seriesAStage = modifyStageMultiples(p.seriesAStage, multipleMod);
        p.exitWindowMin = Math.max(1, p.exitWindowMin + exitDelayMod);
        p.exitWindowMax = Math.max(
          p.exitWindowMin + 1,
          p.exitWindowMax + exitDelayMod
        );
        return p;
      },
    }),
    [failureRateMod, multipleMod, exitDelayMod]
  );

  // Run all selected scenarios
  const handleRun = useCallback(() => {
    setIsRunning(true);

    // Use setTimeout to let the UI update before heavy computation
    setTimeout(() => {
      const scenariosToRun: ScenarioModifier[] = SCENARIOS.filter((s) =>
        selectedScenarios.has(s.name)
      );
      if (customIncluded) {
        scenariosToRun.push(customScenario);
      }

      const results: ScenarioResult[] = scenariosToRun.map((scenario) => {
        const modifiedParams = scenario.modifyParams(DEFAULT_PARAMETERS);
        modifiedParams.numSimulations = NUM_SIMS_PER_SCENARIO;
        const simResults = runSimulations(modifiedParams);
        const summary = calculateSummaryStatistics(simResults);
        return { scenario, results: simResults, summary };
      });

      setScenarioResults(results);
      setIsRunning(false);
    }, 50);
  }, [selectedScenarios, customIncluded, customScenario]);

  // Apply custom scenario
  const handleApplyCustom = useCallback(() => {
    setCustomIncluded(true);
    // If results already exist, re-run with custom included
    setIsRunning(true);
    setTimeout(() => {
      const scenariosToRun: ScenarioModifier[] = SCENARIOS.filter((s) =>
        selectedScenarios.has(s.name)
      );
      scenariosToRun.push(customScenario);

      const results: ScenarioResult[] = scenariosToRun.map((scenario) => {
        const modifiedParams = scenario.modifyParams(DEFAULT_PARAMETERS);
        modifiedParams.numSimulations = NUM_SIMS_PER_SCENARIO;
        const simResults = runSimulations(modifiedParams);
        const summary = calculateSummaryStatistics(simResults);
        return { scenario, results: simResults, summary };
      });

      setScenarioResults(results);
      setIsRunning(false);
    }, 50);
  }, [selectedScenarios, customScenario]);

  // Histogram data
  const histogramData = useMemo(() => {
    if (scenarioResults.length === 0) return [];
    return buildMOICHistogram(scenarioResults);
  }, [scenarioResults]);

  // Base case for deltas
  const baseResult = scenarioResults.find(
    (r) => r.scenario.name === "Base Case"
  );

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Scenario Stress Testing
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
          Compare fund performance under different market conditions using Monte
          Carlo simulation
        </p>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Section 1: Scenario Selector */}
      {/* --------------------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: "#a371f7" }} />
              <CardTitle className="text-lg text-white">
                Pre-Built Scenarios
              </CardTitle>
            </div>
            <Button
              onClick={handleRun}
              disabled={
                isRunning ||
                (selectedScenarios.size === 0 && !customIncluded)
              }
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Comparison
                </>
              )}
            </Button>
          </div>
          <CardDescription style={{ color: "#94a3b8" }}>
            Select scenarios to compare. Toggle cards on/off, then click Run
            Comparison.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SCENARIOS.map((scenario) => {
              const isSelected = selectedScenarios.has(scenario.name);
              return (
                <button
                  key={scenario.name}
                  type="button"
                  onClick={() => toggleScenario(scenario.name)}
                  className={`relative cursor-pointer rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-2 bg-card"
                      : "border-border bg-card/50 opacity-60"
                  }`}
                  style={{
                    borderColor: isSelected ? scenario.color : undefined,
                  }}
                >
                  {/* Color indicator */}
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: scenario.color }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {scenario.name}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>
                    {scenario.description}
                  </p>
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div
                      className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: scenario.color }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------------- */}
      {/* Section 3: Custom Scenario Builder (placed before results) */}
      {/* --------------------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5" style={{ color: "#f0883e" }} />
            <CardTitle className="text-lg text-white">
              Custom Scenario Builder
            </CardTitle>
          </div>
          <CardDescription style={{ color: "#94a3b8" }}>
            Create a custom stress scenario by adjusting parameters below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Failure Rate Modifier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white">
                  Failure Rate Modifier
                </Label>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: "#f0883e" }}
                >
                  {failureRateMod.toFixed(2)}x
                </span>
              </div>
              <Slider
                min={50}
                max={200}
                step={5}
                value={[failureRateMod * 100]}
                onValueChange={(v) => setFailureRateMod(v[0] / 100)}
              />
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                1.0 = default, 1.5 = 50% more failures, 0.5 = 50% fewer
              </p>
            </div>

            {/* Multiple Compression */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white">
                  Multiple Compression
                </Label>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: "#f0883e" }}
                >
                  {multipleMod.toFixed(2)}x
                </span>
              </div>
              <Slider
                min={50}
                max={200}
                step={5}
                value={[multipleMod * 100]}
                onValueChange={(v) => setMultipleMod(v[0] / 100)}
              />
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                1.0 = default, 0.65 = 35% compressed, 1.4 = 40% higher
              </p>
            </div>

            {/* Exit Delay */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white">
                  Exit Delay (years)
                </Label>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: "#f0883e" }}
                >
                  {exitDelayMod >= 0 ? "+" : ""}
                  {exitDelayMod.toFixed(1)}y
                </span>
              </div>
              <Slider
                min={-20}
                max={30}
                step={5}
                value={[exitDelayMod * 10]}
                onValueChange={(v) => setExitDelayMod(v[0] / 10)}
              />
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                0 = default, +2.5 = exits delayed 2.5 years, -1 = earlier exits
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button
              onClick={handleApplyCustom}
              disabled={isRunning}
              variant="outline"
              className="gap-2"
              style={{ borderColor: "#f0883e", color: "#f0883e" }}
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Apply Custom
            </Button>
            {customIncluded && (
              <span className="text-xs" style={{ color: "#3fb950" }}>
                Custom scenario included in results
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------------- */}
      {/* Section 2: Scenario Comparison Dashboard */}
      {/* --------------------------------------------------------------- */}
      {scenarioResults.length > 0 && (
        <>
          {/* Comparison Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" style={{ color: "#58a6ff" }} />
                <CardTitle className="text-lg text-white">
                  Scenario Comparison
                </CardTitle>
              </div>
              <CardDescription style={{ color: "#94a3b8" }}>
                Key metrics across selected scenarios
                {baseResult && " (deltas relative to Base Case)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{ borderColor: "#334155" }}
                  >
                    <th className="px-3 py-2 font-medium text-white">
                      Scenario
                    </th>
                    <th className="px-3 py-2 font-medium text-white text-right">
                      Median MOIC
                    </th>
                    <th className="px-3 py-2 font-medium text-white text-right">
                      P10 MOIC
                    </th>
                    <th className="px-3 py-2 font-medium text-white text-right">
                      P90 MOIC
                    </th>
                    <th className="px-3 py-2 font-medium text-white text-right">
                      Prob &lt;1x
                    </th>
                    <th className="px-3 py-2 font-medium text-white text-right">
                      Median IRR
                    </th>
                    <th className="px-3 py-2 font-medium text-white text-right">
                      Net MOIC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioResults.map((sr) => {
                    const s = sr.summary;
                    const probBelow1x =
                      100 - (s.probMOICAbove2x > 0 ? 100 : 0);
                    // Calculate Prob < 1x from results
                    const actualProbBelow1x =
                      (sr.results.filter((r) => r.grossMOIC < 1).length /
                        sr.results.length) *
                      100;

                    // Deltas from base case
                    const baseSummary = baseResult?.summary;
                    const isBase = sr.scenario.name === "Base Case";

                    const deltaCell = (
                      val: number,
                      baseVal: number | undefined,
                      suffix: string = "x",
                      higherIsGood: boolean = true
                    ) => {
                      if (isBase || baseVal === undefined)
                        return (
                          <span className="text-white font-mono">
                            {val.toFixed(2)}
                            {suffix}
                          </span>
                        );

                      const delta = val - baseVal;
                      const isPositive = delta > 0;
                      const isGood = higherIsGood ? isPositive : !isPositive;

                      return (
                        <span className="flex items-center justify-end gap-1">
                          <span className="text-white font-mono">
                            {val.toFixed(2)}
                            {suffix}
                          </span>
                          {Math.abs(delta) > 0.005 && (
                            <span
                              className="text-xs font-mono"
                              style={{
                                color: isGood ? "#3fb950" : "#f85149",
                              }}
                            >
                              ({isPositive ? "+" : ""}
                              {delta.toFixed(2)})
                            </span>
                          )}
                        </span>
                      );
                    };

                    const deltaPctCell = (
                      val: number,
                      baseVal: number | undefined,
                      higherIsGood: boolean = true
                    ) => {
                      if (isBase || baseVal === undefined)
                        return (
                          <span className="text-white font-mono">
                            {val.toFixed(1)}%
                          </span>
                        );

                      const delta = val - baseVal;
                      const isPositive = delta > 0;
                      const isGood = higherIsGood ? isPositive : !isPositive;

                      return (
                        <span className="flex items-center justify-end gap-1">
                          <span className="text-white font-mono">
                            {val.toFixed(1)}%
                          </span>
                          {Math.abs(delta) > 0.05 && (
                            <span
                              className="text-xs font-mono"
                              style={{
                                color: isGood ? "#3fb950" : "#f85149",
                              }}
                            >
                              ({isPositive ? "+" : ""}
                              {delta.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      );
                    };

                    // Calculate base Prob < 1x
                    const baseProbBelow1x = baseResult
                      ? (baseResult.results.filter((r) => r.grossMOIC < 1)
                          .length /
                          baseResult.results.length) *
                        100
                      : undefined;

                    return (
                      <tr
                        key={sr.scenario.name}
                        className="border-b transition-colors hover:bg-muted/30"
                        style={{ borderColor: "#334155" }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: sr.scenario.color,
                              }}
                            />
                            <span className="font-medium text-white">
                              {sr.scenario.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {deltaCell(s.medianMOIC, baseSummary?.medianMOIC)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {deltaCell(s.moicP10, baseSummary?.moicP10)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {deltaCell(s.moicP90, baseSummary?.moicP90)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {deltaPctCell(
                            actualProbBelow1x,
                            baseProbBelow1x,
                            false
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {deltaPctCell(
                            s.medianIRR * 100,
                            baseSummary
                              ? baseSummary.medianIRR * 100
                              : undefined
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {deltaCell(
                            s.medianNetMOIC ?? s.medianMOIC,
                            baseSummary?.medianNetMOIC ??
                              baseSummary?.medianMOIC
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* MOIC Distribution Histogram */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                MOIC Distribution Overlay
              </CardTitle>
              <CardDescription style={{ color: "#94a3b8" }}>
                Overlaid gross MOIC distributions across scenarios (% of
                simulations per bin)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={histogramData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="bin"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={{ stroke: "#334155" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={{ stroke: "#334155" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
                    />
                    {scenarioResults.map((sr) => (
                      <Area
                        key={sr.scenario.name}
                        type="monotone"
                        dataKey={sr.scenario.name}
                        stroke={sr.scenario.color}
                        fill={sr.scenario.color}
                        fillOpacity={0.12}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {scenarioResults.length === 0 && !isRunning && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3
              className="mb-4 h-12 w-12"
              style={{ color: "#334155" }}
            />
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Select scenarios above and click{" "}
              <span className="font-semibold text-white">Run Comparison</span>{" "}
              to see results
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
