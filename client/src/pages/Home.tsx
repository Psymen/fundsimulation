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
import {
  deleteAllRuns,
  loadSavedRuns,
  migrateFromLocalStorage,
  saveRun,
} from "@/lib/indexeddb-storage";
import type {
  PortfolioParameters,
  SavedRun,
  SimulationResult,
  SummaryStatistics,
} from "@/types/simulation";
import { Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";

export default function Home() {
  const [parameters, setParameters] =
    useState<PortfolioParameters>(DEFAULT_PARAMETERS);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [summary, setSummary] = useState<SummaryStatistics | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load saved runs on mount and migrate from localStorage
  useEffect(() => {
    const initStorage = async () => {
      // Migrate old localStorage data to IndexedDB
      await migrateFromLocalStorage();
      // Load runs from IndexedDB
      const runs = await loadSavedRuns();
      setSavedRuns(runs);
    };
    initStorage();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+Enter to run simulation (works globally, even in input fields)
  useHotkeys('mod+enter', (e) => {
    e.preventDefault();
    if (!isRunning && !validationError) {
      handleRunSimulation();
    }
  }, {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
  }, [isRunning, validationError]);

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
    setTimeout(async () => {
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
        await saveRun(savedRun);
        const runs = await loadSavedRuns();
        setSavedRuns(runs);

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
    // IndexedDB stores full results, so we can load them
    setResults(run.results);
    setSummary(run.summary);
    toast.success("Parameters and results loaded from saved run");
  };

  const handleDeleteAll = async () => {
    if (confirm("Are you sure you want to delete all saved runs?")) {
      await deleteAllRuns();
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
    <div className="min-h-screen bg-background">
      {/* Top Action Bar - Pinned */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-lg">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Run Simulation Button - Pinned */}
            <Button
              onClick={handleRunSimulation}
              disabled={isRunning || !!validationError}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 shadow-sm"
              size="lg"
            >
              {isRunning ? "Running..." : "Run Simulations"}
            </Button>
            
            {/* Export buttons */}
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
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel - Parameters Card */}
        <div className="w-80 flex-shrink-0">
          <ParametersPanel
            parameters={parameters}
            onParametersChange={setParameters}
            onRunSimulation={handleRunSimulation}
            isRunning={isRunning}
            validationError={validationError}
          />
        </div>

        {/* Center Panel - Charts */}
        <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <ChartsPanel results={results} summary={summary} />
        </div>

        {/* Right Panel - Historical Runs */}
        <div className="w-80 flex-shrink-0">
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
