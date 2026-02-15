/**
 * Charts Panel Component
 * Displays simulation results with histograms and summary statistics
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateYearlyMetrics } from "@/lib/fund-metrics";
import { VC_BENCHMARKS } from "@/lib/benchmarks";
import type { SimulationResult, SummaryStatistics, YearlyFundMetrics } from "@/types/simulation";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";

interface ChartsPanelProps {
  results: SimulationResult[] | null;
  summary: SummaryStatistics | null;
}

export default function ChartsPanel({ results, summary }: ChartsPanelProps) {
  // Aggregate yearly metrics for J-curve chart
  const jCurveData = useMemo(() => {
    if (!results) return [];
    const allYearly = results
      .map((r) => r.yearlyMetrics)
      .filter(Boolean) as YearlyFundMetrics[][];
    if (allYearly.length === 0) return [];
    return aggregateYearlyMetrics(allYearly);
  }, [results]);

  // J-curve insights
  const jCurveInsights = useMemo(() => {
    if (jCurveData.length === 0) return null;
    // Find trough: year with lowest TVPI P50
    let troughYear = jCurveData[0].year;
    let troughValue = jCurveData[0].tvpiP50;
    for (const d of jCurveData) {
      if (d.tvpiP50 < troughValue) {
        troughValue = d.tvpiP50;
        troughYear = d.year;
      }
    }
    // Find breakeven: first year where DPI P50 >= 1.0
    let breakevenYear: number | null = null;
    for (const d of jCurveData) {
      if (d.dpiP50 >= 1.0) {
        breakevenYear = d.year;
        break;
      }
    }
    return { troughYear, troughValue, breakevenYear };
  }, [jCurveData]);

  if (!results || !summary) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg">No simulation results yet</p>
          <p className="text-sm">
            Configure parameters and click "Run Simulations" to see results
          </p>
        </div>
      </div>
    );
  }

  // Prepare histogram data for MOIC
  const moicHistogram = createHistogram(
    results.map((r) => r.grossMOIC),
    20
  );

  // Prepare histogram data for IRR
  const irrHistogram = createHistogram(
    results.map((r) => r.grossIRR * 100), // Convert to percentage
    20
  );

  // Prepare outliers distribution
  const outliersData = createOutliersDistribution(results);

  // Net returns values with fallbacks
  const medianNetMOIC = summary.medianNetMOIC ?? 0;
  const netMoicP10 = summary.netMoicP10 ?? 0;
  const netMoicP90 = summary.netMoicP90 ?? 0;
  const medianNetIRR = summary.medianNetIRR ?? 0;
  const avgFeeDrag = summary.avgFeeDrag ?? 0;
  const feeDragDiff = summary.medianMOIC - medianNetMOIC;
  const feeDragPercent = summary.medianMOIC > 0
    ? (feeDragDiff / summary.medianMOIC) * 100
    : 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">
          Simulation Results
        </h2>

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Median MOIC"
            value={summary.medianMOIC.toFixed(2) + "x"}
            subtitle={`P10: ${summary.moicP10.toFixed(2)}x | P90: ${summary.moicP90.toFixed(2)}x | σ: ${summary.moicStdDev.toFixed(2)}`}
            helpText="Multiple on Invested Capital - how many times the fund returns its invested capital"
          />
          <MetricCard
            title="Median IRR"
            value={(summary.medianIRR * 100).toFixed(1) + "%"}
            subtitle={`P10: ${(summary.irrP10 * 100).toFixed(1)}% | P90: ${(summary.irrP90 * 100).toFixed(1)}% | σ: ${(summary.irrStdDev * 100).toFixed(1)}%`}
            helpText="Internal Rate of Return - annualized return accounting for timing of cash flows"
          />
          <MetricCard
            title="Avg Outcomes"
            value={`${summary.avgOutliers.toFixed(1)} outliers`}
            subtitle={`${summary.avgWriteOffs.toFixed(1)} write-offs`}
            helpText="Average number of 20x+ returns and total losses per simulation"
          />
        </div>

        {/* Net Returns Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Net MOIC (LP)"
            value={medianNetMOIC.toFixed(2) + "x"}
            subtitle={`P10: ${netMoicP10.toFixed(2)}x | P90: ${netMoicP90.toFixed(2)}x`}
            helpText="Net-of-fees MOIC returned to limited partners after management fees and carry"
          />
          <MetricCard
            title="Median Net IRR"
            value={(medianNetIRR * 100).toFixed(1) + "%"}
            subtitle="After fees and carry"
            helpText="Annualized net return to LPs after all fund expenses"
          />
          <MetricCard
            title="Avg Fee Drag"
            value={avgFeeDrag.toFixed(1) + "%"}
            subtitle=""
            helpText="Average reduction in returns due to management fees and carried interest"
          />
          <MetricCard
            title="Gross vs Net"
            value={`${summary.medianMOIC.toFixed(2)}x → ${medianNetMOIC.toFixed(2)}x`}
            subtitle={`Fee drag: ${feeDragPercent.toFixed(1)}%`}
            helpText="Comparison of gross fund returns to net LP returns showing fee impact"
          />
        </div>

        {/* Probability Thresholds */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Probability of Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <ProbabilityBadge
                label="MOIC ≥ 2x"
                probability={summary.probMOICAbove2x}
              />
              <ProbabilityBadge
                label="MOIC ≥ 3x"
                probability={summary.probMOICAbove3x}
              />
              <ProbabilityBadge
                label="MOIC ≥ 5x"
                probability={summary.probMOICAbove5x}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Percentage of simulations achieving each return threshold
            </p>
          </CardContent>
        </Card>

        {/* DPI/TVPI J-Curve Chart */}
        {jCurveData.length > 0 && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">
                DPI / TVPI J-Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={jCurveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="year"
                    stroke="#94a3b8"
                    label={{ value: "Year", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: "Multiple (x)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number, name: string) => [
                      value.toFixed(2) + "x",
                      name,
                    ]}
                  />
                  <Legend />
                  <ReferenceLine
                    y={1.0}
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    label={{ value: "1.0x", position: "right", fill: "#94a3b8" }}
                  />
                  {/* TVPI P10-P90 band */}
                  <Area
                    type="monotone"
                    dataKey="tvpiP90"
                    stroke="none"
                    fill="#a371f7"
                    fillOpacity={0.15}
                    name="TVPI P90"
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="tvpiP10"
                    stroke="none"
                    fill="#0d1117"
                    fillOpacity={1}
                    name="TVPI P10"
                    legendType="none"
                  />
                  {/* DPI P10-P90 band */}
                  <Area
                    type="monotone"
                    dataKey="dpiP90"
                    stroke="none"
                    fill="#3fb950"
                    fillOpacity={0.15}
                    name="DPI P90"
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="dpiP10"
                    stroke="none"
                    fill="#0d1117"
                    fillOpacity={1}
                    name="DPI P10"
                    legendType="none"
                  />
                  {/* TVPI P50 line */}
                  <Area
                    type="monotone"
                    dataKey="tvpiP50"
                    stroke="#a371f7"
                    strokeWidth={2}
                    fill="none"
                    name="TVPI P50"
                  />
                  {/* DPI P50 line */}
                  <Area
                    type="monotone"
                    dataKey="dpiP50"
                    stroke="#3fb950"
                    strokeWidth={2}
                    fill="none"
                    name="DPI P50"
                  />
                </ComposedChart>
              </ResponsiveContainer>
              {jCurveInsights && (
                <p className="text-xs text-muted-foreground mt-2">
                  J-curve trough: Year {jCurveInsights.troughYear} at{" "}
                  {jCurveInsights.troughValue.toFixed(2)}x TVPI
                  {jCurveInsights.breakevenYear != null
                    ? `, breakeven: Year ${jCurveInsights.breakevenYear}`
                    : ", breakeven: not reached"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* MOIC Histogram */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Fund MOIC Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moicHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="bin"
                  stroke="#94a3b8"
                  label={{ value: "MOIC (x)", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#a371f7" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Distribution of gross MOIC across all simulations
            </p>
            <p className="text-xs mt-2">
              Benchmarks:{" "}
              <span style={{ color: "#3fb950" }}>Top Q {"\u2265"}{VC_BENCHMARKS[0].moic}x</span>
              {" | "}
              <span style={{ color: "#d29922" }}>Median {"\u2265"}{VC_BENCHMARKS[1].moic}x</span>
              {" | "}
              <span style={{ color: "#f85149" }}>Bottom Q {"\u2265"}{VC_BENCHMARKS[2].moic}x</span>
            </p>
          </CardContent>
        </Card>

        {/* IRR Histogram */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">IRR Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={irrHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="bin"
                  stroke="#94a3b8"
                  label={{ value: "IRR (%)", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#d29922" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Distribution of gross IRR across all simulations
            </p>
          </CardContent>
        </Card>

        {/* Outliers Distribution */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Outliers per Simulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={outliersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="outliers"
                  stroke="#94a3b8"
                  label={{
                    value: "Number of Outliers (≥20x)",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#3fb950" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Distribution of 20x+ returns across simulations
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  helpText: string;
}

function MetricCard({ title, value, subtitle, helpText }: MetricCardProps) {
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        <div className="text-xs text-muted-foreground mt-2 italic">{helpText}</div>
      </CardContent>
    </Card>
  );
}

interface ProbabilityBadgeProps {
  label: string;
  probability: number;
}

function ProbabilityBadge({ label, probability }: ProbabilityBadgeProps) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg border border-border">
      <div className="text-2xl font-bold text-primary">
        {probability.toFixed(1)}%
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// Helper Functions

function createHistogram(
  values: number[],
  numBins: number
): { bin: string; count: number }[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / numBins;

  const bins: number[] = new Array(numBins).fill(0);

  for (const value of values) {
    let binIndex = Math.floor((value - min) / binWidth);
    if (binIndex >= numBins) binIndex = numBins - 1;
    bins[binIndex]++;
  }

  return bins.map((count, index) => {
    const binStart = min + index * binWidth;
    const binEnd = binStart + binWidth;
    // Format bin labels more cleanly - use integers for whole numbers
    const formatValue = (val: number) => {
      return Number.isInteger(val) ? val.toString() : val.toFixed(1);
    };
    return {
      bin: `${formatValue(binStart)}-${formatValue(binEnd)}`,
      count,
    };
  });
}

function createOutliersDistribution(
  results: SimulationResult[]
): { outliers: number; count: number }[] {
  const outliersCount: Record<number, number> = {};

  for (const result of results) {
    const num = result.numOutliers;
    outliersCount[num] = (outliersCount[num] || 0) + 1;
  }

  const maxOutliers = Math.max(...Object.keys(outliersCount).map(Number));

  const data: { outliers: number; count: number }[] = [];
  for (let i = 0; i <= maxOutliers; i++) {
    data.push({
      outliers: i,
      count: outliersCount[i] || 0,
    });
  }

  return data;
}
