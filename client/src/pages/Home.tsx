/**
 * Home Page - VC Monte Carlo Simulator
 * Main application page integrating all components
 */

import ChartsPanel from "@/components/ChartsPanel";
import HistoricalRunsPanel from "@/components/HistoricalRunsPanel";
import ParametersPanel from "@/components/ParametersPanel";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";
import { exportParametersToJSON, exportResultsToCSV } from "@/lib/export";
import {
  calculateSummaryStatistics,
  runSimulations,
} from "@/lib/simulation";
import { deleteAllRuns, loadSavedRuns, saveRun } from "@/lib/storage";
import type {
  PortfolioParameters,
  SavedRun,
  SimulationResult,
  SummaryStatistics,
} from "@/types/simulation";
import { Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const [parameters, setParameters] =
    useState<PortfolioParameters>(DEFAULT_PARAMETERS);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [summary, setSummary] = useState<SummaryStatistics | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load saved runs on mount
  useEffect(() => {
    setSavedRuns(loadSavedRuns());
  }, []);

  // Validate parameters
  useEffect(() => {
    if (parameters.fundSize <= 0) {
      setValidationError("Fund size must be positive");
      return;
    }
    if (parameters.numCompanies <= 0) {
      setValidationError("Number of companies must be positive");
      return;
    }
    if (parameters.seedStage.avgCheckSize <= 0 || parameters.seriesAStage.avgCheckSize <= 0) {
      setValidationError("Average check sizes must be positive");
      return;
    }
    if (parameters.numSimulations <= 0) {
      setValidationError("Number of simulations must be positive");
      return;
    }
    if (parameters.exitWindowMin >= parameters.exitWindowMax) {
      setValidationError("Exit window min must be less than max");
      return;
    }
    setValidationError(null);
  }, [parameters]);

  const handleRunSimulation = () => {
    setIsRunning(true);
    toast.info("Running simulations...");

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const simulationResults = runSimulations(parameters);
        const summaryStats = calculateSummaryStatistics(simulationResults);

        setResults(simulationResults);
        setSummary(summaryStats);

        // Save to history
        const savedRun: SavedRun = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          parameters: { ...parameters },
          summary: summaryStats,
          results: simulationResults,
        };
        saveRun(savedRun);
        setSavedRuns(loadSavedRuns());

        toast.success("Simulations completed!");
      } catch (error) {
        console.error("Simulation error:", error);
        toast.error("Error running simulations");
      } finally {
        setIsRunning(false);
      }
    }, 100);
  };

  const handleLoadRun = (run: SavedRun) => {
    setParameters(run.parameters);
    setResults(run.results);
    setSummary(run.summary);
    toast.success("Parameters loaded from saved run");
  };

  const handleDeleteAll = () => {
    if (confirm("Are you sure you want to delete all saved runs?")) {
      deleteAllRuns();
      setSavedRuns([]);
      toast.success("All saved runs deleted");
    }
  };

  const handleExportCSV = () => {
    if (!results) {
      toast.error("No results to export");
      return;
    }
    exportResultsToCSV(results);
    toast.success("Results exported to CSV");
  };

  const handleExportJSON = () => {
    exportParametersToJSON(parameters).then(() => {
      toast.success("Parameters copied to clipboard");
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">{APP_TITLE}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="gap-2"
              disabled={!parameters}
            >
              <Copy className="h-4 w-4" />
              Copy Parameters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
              disabled={!results}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Parameters */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <ParametersPanel
            parameters={parameters}
            onParametersChange={setParameters}
            onRunSimulation={handleRunSimulation}
            isRunning={isRunning}
            validationError={validationError}
          />
        </div>

        {/* Center Panel - Charts */}
        <div className="flex-1 overflow-hidden">
          <ChartsPanel results={results} summary={summary} />
        </div>

        {/* Right Panel - Historical Runs */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <HistoricalRunsPanel
            savedRuns={savedRuns}
            onLoadRun={handleLoadRun}
            onDeleteAll={handleDeleteAll}
          />
        </div>
      </div>
    </div>
  );
}
