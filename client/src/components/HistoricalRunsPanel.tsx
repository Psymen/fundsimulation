/**
 * Historical Runs Panel Component
 * Displays saved simulation runs from localStorage
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SavedRun } from "@/types/simulation";
import { Clock, Download, Trash2 } from "lucide-react";

interface HistoricalRunsPanelProps {
  savedRuns: SavedRun[];
  onLoadRun: (run: SavedRun) => void;
  onDeleteAll: () => void;
}

export default function HistoricalRunsPanel({
  savedRuns,
  onLoadRun,
  onDeleteAll,
}: HistoricalRunsPanelProps) {
  if (savedRuns.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-slate-900 border-l border-slate-700">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">
            Historical Runs
          </h2>
          <div className="text-center py-12 text-slate-400">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved runs yet</p>
            <p className="text-sm mt-1">
              Run simulations to build your history
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-900 border-l border-slate-700">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">
            Historical Runs
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            className="gap-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        <div className="space-y-3">
          {savedRuns.map((run) => (
            <RunCard key={run.id} run={run} onLoadRun={onLoadRun} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface RunCardProps {
  run: SavedRun;
  onLoadRun: (run: SavedRun) => void;
}

function RunCard({ run, onLoadRun }: RunCardProps) {
  const date = new Date(run.timestamp);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {formattedDate}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key Parameters */}
        <div className="text-xs text-slate-400 space-y-1">
          <div>
            Fund: ${run.parameters.fundSize}M | Companies:{" "}
            {run.parameters.numCompanies}
          </div>
          <div>
            {Math.round((run.parameters.seedPercentage / 100) * run.parameters.numCompanies)} seed,{" "}
            {run.parameters.numCompanies - Math.round((run.parameters.seedPercentage / 100) * run.parameters.numCompanies)} Series A
          </div>
          <div>Simulations: {run.parameters.numSimulations}</div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900 p-2 rounded border border-slate-700">
            <div className="text-xs text-slate-400">Median MOIC</div>
            <div className="text-lg font-semibold text-emerald-400">
              {run.summary.medianMOIC.toFixed(2)}x
            </div>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-700">
            <div className="text-xs text-slate-400">Median IRR</div>
            <div className="text-lg font-semibold text-amber-400">
              {(run.summary.medianIRR * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLoadRun(run)}
          className="w-full gap-2"
        >
          <Download className="h-4 w-4" />
          Load Parameters
        </Button>
      </CardContent>
    </Card>
  );
}
