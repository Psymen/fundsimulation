/**
 * Power Law Explorer Page
 * Interactive visualization of venture capital power law dynamics.
 * Runs a single simulation and analyzes return concentration,
 * outlier sensitivity, and power law fit.
 */

import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { runSingleSimulation } from "@/lib/simulation";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";
import type {
  PortfolioParameters,
  CompanyResult,
  SimulationResult,
} from "@/types/simulation";
import { Play, RefreshCw, TrendingUp, BarChart3, Zap } from "lucide-react";

// -- Chart theme constants --------------------------------------------------

const PURPLE = "#a371f7";
const GOLD = "#d29922";
const GREEN = "#3fb950";
const RED = "#f85149";
const GRID_COLOR = "#334155";
const TEXT_COLOR = "#94a3b8";
const TOOLTIP_BG = "#1e293b";
const TOOLTIP_BORDER = "#334155";

// -- Helpers ----------------------------------------------------------------

function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

function formatMultiple(v: number): string {
  return `${v.toFixed(1)}x`;
}

/** Sort companies descending by returned capital and compute cumulative % */
function buildConcentrationData(companies: CompanyResult[]) {
  const sorted = [...companies].sort(
    (a, b) => b.returnedCapital - a.returnedCapital
  );
  const totalValue = sorted.reduce((s, c) => s + c.returnedCapital, 0);
  if (totalValue === 0) return [];

  let cumulative = 0;
  return sorted.map((c, i) => {
    cumulative += c.returnedCapital;
    const uniformCumulative = ((i + 1) / sorted.length) * 100;
    return {
      rank: i + 1,
      cumulativePercent: (cumulative / totalValue) * 100,
      uniformPercent: uniformCumulative,
      company: `Company ${i + 1}`,
      returnMultiple: c.returnMultiple,
      returnedCapital: c.returnedCapital,
      stage: c.stage === "seed" ? "Seed" : "Series A",
    };
  });
}

/** Sort companies descending by return multiple for the scatter plot */
function buildPowerLawScatterData(companies: CompanyResult[]) {
  const sorted = [...companies].sort(
    (a, b) => b.returnMultiple - a.returnMultiple
  );
  return sorted.map((c, i) => ({
    rank: i + 1,
    returnMultiple: Math.max(c.returnMultiple, 0.01), // floor for log scale
    stage: c.stage === "seed" ? "Seed" : "Series A",
    bucket: c.bucketLabel,
  }));
}

/** Generate theoretical power law values: C / rank^(alpha-1) */
function buildTheoreticalPowerLaw(
  n: number,
  maxReturn: number,
  alpha: number
) {
  const points: { rank: number; theoretical: number }[] = [];
  for (let rank = 1; rank <= n; rank++) {
    const value = maxReturn / Math.pow(rank, alpha - 1);
    points.push({ rank, theoretical: Math.max(value, 0.01) });
  }
  return points;
}

/** Compute how many companies at a given multiple are needed to hit a target fund MOIC */
function computeEquivalentCombinations(
  fundSize: number,
  numCompanies: number,
  avgCheckSize: number,
  targetMOIC: number
) {
  const totalInvested = numCompanies * avgCheckSize;
  const targetReturn = fundSize * targetMOIC;
  // Assume remaining companies return 0.5x on average (base case)
  const baseReturn = (numCompanies - 1) * avgCheckSize * 0.5;

  const multiples = [100, 50, 40, 30, 20, 10];
  return multiples.map((mult) => {
    const returnNeededFromOutliers = targetReturn - baseReturn;
    const perOutlierReturn = avgCheckSize * mult;
    const numNeeded = Math.max(1, Math.ceil(returnNeededFromOutliers / perOutlierReturn));
    return { multiple: mult, numNeeded };
  });
}

// -- Custom Tooltip ---------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-sm shadow-lg"
      style={{
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
        color: TEXT_COLOR,
      }}
    >
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>
            {entry.name}:{" "}
            <span className="font-semibold text-foreground">
              {typeof entry.value === "number"
                ? entry.value.toFixed(1)
                : entry.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Main Component ---------------------------------------------------------

export default function PowerLawExplorer() {
  // Parameters
  const [numCompanies, setNumCompanies] = useState(
    DEFAULT_PARAMETERS.numCompanies
  );
  const [fundSize, setFundSize] = useState(DEFAULT_PARAMETERS.fundSize);

  // Simulation result
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Outlier sensitivity slider
  const [bestCompanyReturn, setBestCompanyReturn] = useState(100);

  // Run simulation
  const handleAnalyze = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to allow the UI to update before the sync computation
    setTimeout(() => {
      const params: PortfolioParameters = {
        ...DEFAULT_PARAMETERS,
        numCompanies,
        fundSize,
        numSimulations: 1,
      };
      const sim = runSingleSimulation(params);
      setResult(sim);
      setIsRunning(false);
    }, 50);
  }, [numCompanies, fundSize]);

  // Derived data
  const concentrationData = useMemo(
    () => (result ? buildConcentrationData(result.companies) : []),
    [result]
  );

  const scatterData = useMemo(
    () => (result ? buildPowerLawScatterData(result.companies) : []),
    [result]
  );

  const theoreticalCurve = useMemo(() => {
    if (!scatterData.length) return [];
    const maxRet = scatterData[0]?.returnMultiple ?? 1;
    return buildTheoreticalPowerLaw(scatterData.length, maxRet, 1.9);
  }, [scatterData]);

  // Concentration headline stats
  const top1Pct = concentrationData[0]?.cumulativePercent ?? 0;
  const top3Pct =
    concentrationData.length >= 3
      ? concentrationData[2]?.cumulativePercent ?? 0
      : 0;
  const top5Pct =
    concentrationData.length >= 5
      ? concentrationData[4]?.cumulativePercent ?? 0
      : 0;

  // Outlier sensitivity chart data
  const sensitivityData = useMemo(() => {
    if (!result) return [];
    const companies = [...result.companies].sort(
      (a, b) => b.returnMultiple - a.returnMultiple
    );
    const totalInvested = result.totalInvestedCapital;
    if (totalInvested === 0) return [];

    const points: { bestReturn: number; fundMOIC: number }[] = [];
    for (let mult = 10; mult <= 500; mult += 5) {
      // Replace the best company's return multiple with the slider value
      const bestInvested = companies[0]?.investedCapital ?? 0;
      const restReturned = companies
        .slice(1)
        .reduce((s, c) => s + c.returnedCapital, 0);
      const adjustedTotal = bestInvested * mult + restReturned;
      const moic = adjustedTotal / totalInvested;
      points.push({ bestReturn: mult, fundMOIC: moic });
    }
    return points;
  }, [result]);

  // Current MOIC at slider position
  const currentSensitivityMOIC = useMemo(() => {
    if (!result) return 0;
    const companies = [...result.companies].sort(
      (a, b) => b.returnMultiple - a.returnMultiple
    );
    const totalInvested = result.totalInvestedCapital;
    if (totalInvested === 0) return 0;
    const bestInvested = companies[0]?.investedCapital ?? 0;
    const restReturned = companies
      .slice(1)
      .reduce((s, c) => s + c.returnedCapital, 0);
    return (bestInvested * bestCompanyReturn + restReturned) / totalInvested;
  }, [result, bestCompanyReturn]);

  // Equivalent combinations table
  const equivalentCombinations = useMemo(() => {
    if (!result) return [];
    const avgCheck =
      result.totalInvestedCapital / (result.companies.length || 1);
    const targetMOIC = 3;
    return computeEquivalentCombinations(
      fundSize,
      numCompanies,
      avgCheck,
      targetMOIC
    );
  }, [result, fundSize, numCompanies]);

  // Gini coefficient for concentration
  const giniCoefficient = useMemo(() => {
    if (!result || result.companies.length === 0) return 0;
    const returns = result.companies
      .map((c) => c.returnedCapital)
      .sort((a, b) => a - b);
    const n = returns.length;
    const mean = returns.reduce((s, v) => s + v, 0) / n;
    if (mean === 0) return 0;
    let sumDiff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumDiff += Math.abs(returns[i] - returns[j]);
      }
    }
    return sumDiff / (2 * n * n * mean);
  }, [result]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Power Law Explorer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize how venture capital returns follow power law distributions
            -- a small number of outliers drive the majority of fund value.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="fundSize" className="text-xs text-muted-foreground">
              Fund Size ($M)
            </Label>
            <Input
              id="fundSize"
              type="number"
              min={10}
              max={5000}
              value={fundSize}
              onChange={(e) =>
                setFundSize(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-28 h-9"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="numCompanies"
              className="text-xs text-muted-foreground"
            >
              # Companies
            </Label>
            <Input
              id="numCompanies"
              type="number"
              min={5}
              max={200}
              value={numCompanies}
              onChange={(e) =>
                setNumCompanies(Math.max(2, parseInt(e.target.value) || 2))
              }
              className="w-28 h-9"
            />
          </div>
          <Button onClick={handleAnalyze} disabled={isRunning} className="h-9">
            {isRunning ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Running..." : "Analyze"}
          </Button>
        </div>
      </div>

      {/* No results prompt */}
      {!result && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp
              className="h-12 w-12 mb-4"
              style={{ color: PURPLE }}
            />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Ready to Explore
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Click <strong>Analyze</strong> to run a single portfolio
              simulation and visualize how power law dynamics shape your fund
              returns.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Gross MOIC"
              value={formatMultiple(result.grossMOIC)}
              icon={<TrendingUp className="h-4 w-4" />}
              color={PURPLE}
            />
            <SummaryCard
              label="Gini Coefficient"
              value={giniCoefficient.toFixed(2)}
              subtext="1.0 = max concentration"
              icon={<BarChart3 className="h-4 w-4" />}
              color={GOLD}
            />
            <SummaryCard
              label="Top 1 Company"
              value={formatPercent(top1Pct)}
              subtext="of total fund value"
              icon={<Zap className="h-4 w-4" />}
              color={GREEN}
            />
            <SummaryCard
              label="Outliers (20x+)"
              value={`${result.numOutliers} / ${result.companies.length}`}
              subtext={`${((result.numOutliers / result.companies.length) * 100).toFixed(0)}% of portfolio`}
              icon={<Zap className="h-4 w-4" />}
              color={RED}
            />
          </div>

          {/* Section 1: Return Concentration */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: PURPLE }} />
                Return Concentration
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Cumulative value contribution by company rank. The further the
                curve bows above the uniform line, the more concentrated returns
                are.
              </p>
            </CardHeader>
            <CardContent>
              {/* Headline stats */}
              <div className="flex flex-wrap gap-4 mb-4">
                <ConcentrationBadge label="Top 1" value={top1Pct} color={PURPLE} />
                <ConcentrationBadge label="Top 3" value={top3Pct} color={GOLD} />
                <ConcentrationBadge label="Top 5" value={top5Pct} color={GREEN} />
                <ConcentrationBadge
                  label="Top 10"
                  value={
                    concentrationData.length >= 10
                      ? concentrationData[9]?.cumulativePercent ?? 0
                      : top5Pct
                  }
                  color={TEXT_COLOR}
                />
              </div>

              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={concentrationData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID_COLOR}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="rank"
                      tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={{ stroke: GRID_COLOR }}
                      label={{
                        value: "Top N Companies",
                        position: "insideBottom",
                        offset: -5,
                        fill: TEXT_COLOR,
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={{ stroke: GRID_COLOR }}
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: "% of Total Fund Value",
                        angle: -90,
                        position: "insideLeft",
                        offset: 5,
                        fill: TEXT_COLOR,
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            className="rounded-md border px-3 py-2 text-sm shadow-lg space-y-1"
                            style={{
                              backgroundColor: TOOLTIP_BG,
                              borderColor: TOOLTIP_BORDER,
                            }}
                          >
                            <div className="text-foreground font-semibold">
                              Top {d.rank} compan{d.rank === 1 ? "y" : "ies"}
                            </div>
                            <div style={{ color: PURPLE }}>
                              Actual: {formatPercent(d.cumulativePercent)} of
                              value
                            </div>
                            <div style={{ color: GOLD }}>
                              Uniform: {formatPercent(d.uniformPercent)}
                            </div>
                            <div className="text-muted-foreground text-xs pt-1 border-t" style={{ borderColor: TOOLTIP_BORDER }}>
                              #{d.rank}: {d.stage} --{" "}
                              {formatMultiple(d.returnMultiple)} return
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativePercent"
                      name="Actual"
                      stroke={PURPLE}
                      fill={PURPLE}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: PURPLE }}
                    />
                    <Line
                      type="monotone"
                      dataKey="uniformPercent"
                      name="Uniform Distribution"
                      stroke={GOLD}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      dot={false}
                    />
                    <Legend
                      wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Outlier Sensitivity */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: GOLD }} />
                Outlier Sensitivity Analysis
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                How does the return of your best company impact overall fund
                performance? Drag the slider to see.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    Best company return multiple
                  </Label>
                  <span
                    className="text-sm font-bold"
                    style={{ color: GOLD }}
                  >
                    {bestCompanyReturn}x
                  </span>
                </div>
                <Slider
                  value={[bestCompanyReturn]}
                  onValueChange={([v]) => setBestCompanyReturn(v)}
                  min={10}
                  max={500}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10x</span>
                  <span>100x</span>
                  <span>250x</span>
                  <span>500x</span>
                </div>

                {/* Impact display */}
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    At {bestCompanyReturn}x best company return:
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: GOLD }}
                  >
                    {formatMultiple(currentSensitivityMOIC)} Fund MOIC
                  </span>
                </div>
              </div>

              {/* Sensitivity chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sensitivityData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID_COLOR}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="bestReturn"
                      tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={{ stroke: GRID_COLOR }}
                      tickFormatter={(v) => `${v}x`}
                      label={{
                        value: "Best Company Return",
                        position: "insideBottom",
                        offset: -5,
                        fill: TEXT_COLOR,
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={{ stroke: GRID_COLOR }}
                      tickFormatter={(v) => `${v.toFixed(1)}x`}
                      label={{
                        value: "Fund MOIC",
                        angle: -90,
                        position: "insideLeft",
                        offset: 5,
                        fill: TEXT_COLOR,
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            className="rounded-md border px-3 py-2 text-sm shadow-lg"
                            style={{
                              backgroundColor: TOOLTIP_BG,
                              borderColor: TOOLTIP_BORDER,
                            }}
                          >
                            <div style={{ color: TEXT_COLOR }}>
                              Best company: <span className="font-semibold text-foreground">{d.bestReturn}x</span>
                            </div>
                            <div style={{ color: GOLD }}>
                              Fund MOIC: <span className="font-semibold">{formatMultiple(d.fundMOIC)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      x={bestCompanyReturn}
                      stroke={RED}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <ReferenceLine
                      y={1}
                      stroke={GRID_COLOR}
                      strokeDasharray="3 3"
                      label={{
                        value: "1x (break-even)",
                        position: "right",
                        fill: TEXT_COLOR,
                        fontSize: 10,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="fundMOIC"
                      name="Fund MOIC"
                      stroke={GOLD}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: GOLD }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Equivalent combinations table */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  To achieve a 3x Fund MOIC, you need:
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-muted-foreground font-medium">
                          Company Return
                        </th>
                        <th className="py-2 px-3 text-left text-muted-foreground font-medium">
                          # Companies Needed
                        </th>
                        <th className="py-2 px-3 text-left text-muted-foreground font-medium">
                          Difficulty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {equivalentCombinations.map((row) => (
                        <tr
                          key={row.multiple}
                          className="border-b border-border/50"
                        >
                          <td className="py-2 px-3 font-mono font-semibold text-foreground">
                            {row.multiple}x
                          </td>
                          <td className="py-2 px-3 font-mono" style={{ color: GOLD }}>
                            {row.numNeeded}
                          </td>
                          <td className="py-2 px-3">
                            <DifficultyBadge multiple={row.multiple} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Assumes remaining companies average 0.5x return. Actual
                  results depend on portfolio composition and exit distribution.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Power Law Fit */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: GREEN }} />
                Power Law Fit Visualization
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Company returns sorted descending on a log scale. The
                theoretical power law curve (alpha ~1.9) shows the expected
                Pareto distribution for VC outcomes.
              </p>
            </CardHeader>
            <CardContent>
              {/* Scatter + theoretical overlay */}
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID_COLOR}
                    />
                    <XAxis
                      dataKey="rank"
                      type="number"
                      name="Rank"
                      tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={{ stroke: GRID_COLOR }}
                      label={{
                        value: "Company Rank (by return)",
                        position: "insideBottom",
                        offset: -5,
                        fill: TEXT_COLOR,
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      dataKey="returnMultiple"
                      type="number"
                      name="Return"
                      scale="log"
                      domain={["auto", "auto"]}
                      tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={{ stroke: GRID_COLOR }}
                      tickFormatter={(v) =>
                        v >= 1 ? `${v.toFixed(0)}x` : `${v.toFixed(2)}x`
                      }
                      label={{
                        value: "Return Multiple (log scale)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 5,
                        fill: TEXT_COLOR,
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            className="rounded-md border px-3 py-2 text-sm shadow-lg space-y-0.5"
                            style={{
                              backgroundColor: TOOLTIP_BG,
                              borderColor: TOOLTIP_BORDER,
                            }}
                          >
                            <div className="text-foreground font-semibold">
                              Rank #{d.rank}
                            </div>
                            <div style={{ color: GREEN }}>
                              Return: {formatMultiple(d.returnMultiple)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {d.stage} -- {d.bucket}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Actual Returns"
                      data={scatterData}
                      fill={GREEN}
                      fillOpacity={0.8}
                      r={5}
                    />
                    <Scatter
                      name="Theoretical (alpha=1.9)"
                      data={theoreticalCurve}
                      dataKey="theoretical"
                      fill="none"
                      stroke={PURPLE}
                      strokeWidth={2}
                      line={{ stroke: PURPLE, strokeWidth: 2, strokeDasharray: "6 3" }}
                      shape={() => <></>}
                      legendType="line"
                    />
                    <Legend
                      wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Insight box */}
              <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-3 space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Key Insight
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  In a power law distribution with alpha ~2, the top ~20% of
                  companies generate ~80% of returns (Pareto principle). Your
                  simulation shows the top{" "}
                  {Math.min(5, numCompanies)} companies contribute{" "}
                  <span className="font-semibold text-foreground">
                    {formatPercent(top5Pct)}
                  </span>{" "}
                  of total fund value. The Gini coefficient of{" "}
                  <span className="font-semibold text-foreground">
                    {giniCoefficient.toFixed(2)}
                  </span>{" "}
                  {giniCoefficient > 0.7
                    ? "indicates highly concentrated returns -- typical of strong VC portfolios where a few outliers drive the fund."
                    : giniCoefficient > 0.4
                      ? "indicates moderately concentrated returns -- a balanced portfolio with some standout performers."
                      : "indicates relatively even returns -- unusual for VC, suggesting limited outlier performance."}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// -- Sub-components ---------------------------------------------------------

function SummaryCard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color }}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        {subtext && (
          <div className="text-xs text-muted-foreground mt-0.5">{subtext}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ConcentrationBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">
        {formatPercent(value)}
      </span>
    </div>
  );
}

function DifficultyBadge({ multiple }: { multiple: number }) {
  let label: string;
  let bgColor: string;
  let textColor: string;

  if (multiple >= 100) {
    label = "Extremely Rare";
    bgColor = "rgba(248, 81, 73, 0.15)";
    textColor = RED;
  } else if (multiple >= 50) {
    label = "Very Rare";
    bgColor = "rgba(210, 153, 34, 0.15)";
    textColor = GOLD;
  } else if (multiple >= 30) {
    label = "Rare";
    bgColor = "rgba(210, 153, 34, 0.1)";
    textColor = GOLD;
  } else if (multiple >= 20) {
    label = "Uncommon";
    bgColor = "rgba(63, 185, 80, 0.15)";
    textColor = GREEN;
  } else {
    label = "Achievable";
    bgColor = "rgba(63, 185, 80, 0.1)";
    textColor = GREEN;
  }

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {label}
    </span>
  );
}
