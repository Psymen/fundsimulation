/**
 * Charts Panel Component
 * Displays simulation results with histograms and summary statistics
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SimulationResult, SummaryStatistics } from "@/types/simulation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartsPanelProps {
  results: SimulationResult[] | null;
  summary: SummaryStatistics | null;
}

export default function ChartsPanel({ results, summary }: ChartsPanelProps) {
  if (!results || !summary) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950 text-slate-400">
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

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-950">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-100">
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

        {/* Probability Thresholds */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">
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
            <p className="text-xs text-slate-400 mt-3">
              Percentage of simulations achieving each return threshold
            </p>
          </CardContent>
        </Card>

        {/* MOIC Histogram */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">
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
                <Bar dataKey="count" fill="#10b981" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2">
              Distribution of gross MOIC across all simulations
            </p>
          </CardContent>
        </Card>

        {/* IRR Histogram */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">IRR Distribution</CardTitle>
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
                <Bar dataKey="count" fill="#f59e0b" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2">
              Distribution of gross IRR across all simulations
            </p>
          </CardContent>
        </Card>

        {/* Outliers Distribution */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">
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
                <Bar dataKey="count" fill="#8b5cf6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2">
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
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-300">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-emerald-400">{value}</div>
        <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
        <div className="text-xs text-slate-500 mt-2 italic">{helpText}</div>
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
    <div className="text-center p-3 bg-slate-800 rounded-lg border border-slate-700">
      <div className="text-2xl font-bold text-emerald-400">
        {probability.toFixed(1)}%
      </div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
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
    return {
      bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
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
