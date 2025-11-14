import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GridScenario } from "@/types/simulation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

interface ScenarioDetailModalProps {
  scenario: GridScenario | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ScenarioDetailModal({ scenario, isOpen, onClose }: ScenarioDetailModalProps) {
  if (!scenario) return null;

  // Prepare MOIC distribution data for histogram
  const moicBuckets = [
    { range: "0-0.5x", min: 0, max: 0.5, count: 0 },
    { range: "0.5-1x", min: 0.5, max: 1, count: 0 },
    { range: "1-1.5x", min: 1, max: 1.5, count: 0 },
    { range: "1.5-2x", min: 1.5, max: 2, count: 0 },
    { range: "2-3x", min: 2, max: 3, count: 0 },
    { range: "3-4x", min: 3, max: 4, count: 0 },
    { range: "4-5x", min: 4, max: 5, count: 0 },
    { range: "5-10x", min: 5, max: 10, count: 0 },
    { range: "10x+", min: 10, max: Infinity, count: 0 },
  ];

  scenario.results.forEach((result) => {
    const moic = result.grossMOIC;
    const bucket = moicBuckets.find((b) => moic >= b.min && moic < b.max);
    if (bucket) bucket.count++;
  });

  // Prepare IRR distribution data
  const irrBuckets = [
    { range: "<-20%", min: -Infinity, max: -20, count: 0 },
    { range: "-20-0%", min: -20, max: 0, count: 0 },
    { range: "0-10%", min: 0, max: 10, count: 0 },
    { range: "10-20%", min: 10, max: 20, count: 0 },
    { range: "20-30%", min: 20, max: 30, count: 0 },
    { range: "30-40%", min: 30, max: 40, count: 0 },
    { range: "40-50%", min: 40, max: 50, count: 0 },
    { range: "50%+", min: 50, max: Infinity, count: 0 },
  ];

  scenario.results.forEach((result) => {
    const irr = result.grossIRR;
    const bucket = irrBuckets.find((b) => irr >= b.min && irr < b.max);
    if (bucket) bucket.count++;
  });

  // Calculate additional percentiles
  const moics = scenario.results.map((r) => r.grossMOIC).sort((a, b) => a - b);
  const irrs = scenario.results.map((r) => r.grossIRR).sort((a, b) => a - b);
  
  const getPercentile = (arr: number[], p: number) => {
    const index = Math.floor(arr.length * p);
    return arr[Math.min(index, arr.length - 1)];
  };

  const moicP25 = getPercentile(moics, 0.25);
  const moicP75 = getPercentile(moics, 0.75);
  const irrP25 = getPercentile(irrs, 0.25);
  const irrP75 = getPercentile(irrs, 0.75);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Scenario Details: {scenario.numCompanies} Companies, {scenario.seedPercentage}% Seed
          </DialogTitle>
          <DialogDescription>
            {scenario.avgNumSeedCompanies.toFixed(1)} seed, {scenario.avgNumSeriesACompanies.toFixed(1)} Series A on average
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Median MOIC</div>
              <div className="text-2xl font-bold text-emerald-400">
                {scenario.summary.medianMOIC.toFixed(2)}x
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                σ = {scenario.summary.moicStdDev.toFixed(2)}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Median IRR</div>
              <div className="text-2xl font-bold text-amber-400">
                {(scenario.summary.medianIRR * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                σ = {(scenario.summary.irrStdDev * 100).toFixed(1)}%
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Capital Deployed</div>
              <div className="text-2xl font-bold text-blue-400">
                {scenario.deploymentRate.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                of fund size
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Avg Outliers</div>
              <div className="text-2xl font-bold text-purple-400">
                {scenario.summary.avgOutliers.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {scenario.summary.avgWriteOffs.toFixed(1)} write-offs
              </div>
            </div>
          </div>

          {/* Percentile Breakdown */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Percentile Breakdown</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">MOIC Distribution</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P10:</span>
                    <span className="font-mono">{scenario.summary.moicP10.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P25:</span>
                    <span className="font-mono">{moicP25.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P50 (Median):</span>
                    <span className="font-mono font-semibold">{scenario.summary.medianMOIC.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P75:</span>
                    <span className="font-mono">{moicP75.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P90:</span>
                    <span className="font-mono">{scenario.summary.moicP90.toFixed(2)}x</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">IRR Distribution</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P10:</span>
                    <span className="font-mono">{(scenario.summary.irrP10 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P25:</span>
                    <span className="font-mono">{(irrP25 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P50 (Median):</span>
                    <span className="font-mono font-semibold">{(scenario.summary.medianIRR * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P75:</span>
                    <span className="font-mono">{(irrP75 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P90:</span>
                    <span className="font-mono">{(scenario.summary.irrP90 * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Probability Thresholds */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">MOIC ≥ 2x</div>
              <div className="text-xl font-semibold">
                {(scenario.summary.probMOICAbove2x * 100).toFixed(1)}%
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">MOIC ≥ 3x</div>
              <div className="text-xl font-semibold">
                {(scenario.summary.probMOICAbove3x * 100).toFixed(1)}%
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">MOIC ≥ 5x</div>
              <div className="text-xl font-semibold">
                {(scenario.summary.probMOICAbove5x * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* MOIC Distribution Histogram */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">MOIC Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={moicBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="range" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="count" fill="#10b981">
                  {moicBuckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#10b981' : '#374151'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* IRR Distribution Histogram */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">IRR Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={irrBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="range" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="count" fill="#f59e0b">
                  {irrBuckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#f59e0b' : '#374151'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
