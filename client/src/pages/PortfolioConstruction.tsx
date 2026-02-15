import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Info } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GridAnalysisParameters, GridAnalysisResult, GridScenario, StageParameters } from "@/types/simulation";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";
import { runGridAnalysis, identifyBestStrategies, identifyWorstStrategies, generateCommentary } from "@/lib/grid-analysis";
import GridResultsView from "@/components/GridResultsView";
import StageParametersEditor from "@/components/StageParametersEditor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useParameters } from "@/contexts/ParametersContext";
import { toast } from "sonner";

export default function PortfolioConstruction() {
  const { parameters } = useParameters();

  // Grid parameters (local state for grid-specific settings)
  const [investmentCountMin, setInvestmentCountMin] = useState(15);
  const [investmentCountMax, setInvestmentCountMax] = useState(40);
  const [selectedSeedPercentages, setSelectedSeedPercentages] = useState<number[]>([0, 25, 50, 75, 100]);
  const [numSimulations, setNumSimulations] = useState(500);

  // Stage-specific parameters from shared context
  const fundSize = parameters.fundSize;
  const seedStage = parameters.seedStage;
  const seriesAStage = parameters.seriesAStage;
  
  // Results
  const [gridResults, setGridResults] = useState<GridScenario[] | null>(null);
  const [analysis, setAnalysis] = useState<GridAnalysisResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const seedPercentageOptions = [0, 25, 50, 75, 100];
  
  const handleToggleSeedPercentage = (value: number) => {
    setSelectedSeedPercentages(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value].sort((a, b) => a - b)
    );
  };
  
  const handleRunAnalysis = async () => {
    if (selectedSeedPercentages.length === 0) {
      toast.error("Please select at least one seed percentage to analyze");
      return;
    }

    if (investmentCountMin > investmentCountMax) {
      toast.error("Minimum investment count must be less than or equal to maximum");
      return;
    }
    
    setIsRunning(true);
    setProgress({ current: 0, total: 0 });
    
    try {
      const params: GridAnalysisParameters = {
        fundSize,
        investmentCountMin,
        investmentCountMax,
        seedPercentages: selectedSeedPercentages,
        numSimulationsPerScenario: numSimulations,
        seedStage,
        seriesAStage,
        investmentPeriod: parameters.investmentPeriod,
        fundLife: parameters.fundLife,
        exitWindowMin: parameters.exitWindowMin,
        exitWindowMax: parameters.exitWindowMax,
      };
      
      const scenarios = await runGridAnalysis(params, (current, total) => {
        setProgress({ current, total });
      });
      
      const bestStrategies = identifyBestStrategies(scenarios);
      const worstStrategies = identifyWorstStrategies(scenarios);
      const commentary = generateCommentary(scenarios, params);
      
      const result: GridAnalysisResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        parameters: params,
        scenarios,
        bestStrategies,
        worstStrategies,
        commentary,
      };
      
      setGridResults(scenarios);
      setAnalysis(result);
    } catch (error) {
      console.error("Error running grid analysis:", error);
      toast.error("Error running analysis. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };
  
  const isValid = selectedSeedPercentages.length > 0 && investmentCountMin <= investmentCountMax;
  
  // Keyboard shortcut: Cmd/Ctrl+Enter to run grid analysis (works globally, even in input fields)
  useHotkeys('mod+enter', (e) => {
    e.preventDefault();
    if (isValid && !isRunning) {
      handleRunAnalysis();
    }
  }, {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
  }, [isValid, isRunning, handleRunAnalysis]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Top Action Bar - Pinned */}
      <div className="sticky top-14 z-40 bg-background border-b border-border shadow-lg">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center justify-between gap-4">
            {/* Run Grid Analysis Button - Pinned */}
            <Button
              onClick={handleRunAnalysis}
              disabled={!isValid || isRunning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running {progress.current}/{progress.total}
                </>
              ) : (
                "Run Grid Analysis"
              )}
            </Button>
            
            {isRunning && (
              <div className="text-sm text-muted-foreground">
                This may take a few minutes...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Portfolio Construction Analyzer</h1>
          <p className="text-muted-foreground">
            Run grid analysis across different portfolio configurations to identify optimal strategies
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parameters Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Parameters</CardTitle>
                <CardDescription>Configure the grid search parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="fundSize">Fund Size ($M)</Label>
                  <Input
                    id="fundSize"
                    type="number"
                    value={fundSize}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    From shared parameters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Investment Count Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="countMin" className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        id="countMin"
                        type="number"
                        value={investmentCountMin}
                        onChange={(e) => setInvestmentCountMin(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        min={5}
                        max={100}
                      />
                    </div>
                    <div>
                      <Label htmlFor="countMax" className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        id="countMax"
                        type="number"
                        value={investmentCountMax}
                        onChange={(e) => setInvestmentCountMax(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        min={5}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label>Seed Percentage Mix</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Select which seed/Series A mixes to analyze</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    {seedPercentageOptions.map((pct) => (
                      <div key={pct} className="flex items-center space-x-2">
                        <Checkbox
                          id={`seed-${pct}`}
                          checked={selectedSeedPercentages.includes(pct)}
                          onCheckedChange={() => handleToggleSeedPercentage(pct)}
                        />
                        <label
                          htmlFor={`seed-${pct}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {pct}% Seed {pct === 100 ? "" : `/ ${100 - pct}% Series A`}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="numSims">Simulations per Scenario</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Lower values run faster but less accurate. 500-1000 recommended.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="numSims"
                    type="number"
                    value={numSimulations}
                    onChange={(e) => setNumSimulations(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    min={100}
                    max={2000}
                    step={100}
                  />
                </div>
                
                {/* Stage-Specific Parameters - Read-only from shared context */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Stage-Specific Parameters</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Using parameters from Simulation tab
                  </p>
                  <div className="bg-muted/30 p-3 rounded space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Seed Check Size:</span>
                      <span className="text-foreground">${seedStage.avgCheckSize}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">Series A Check Size:</span>
                      <span className="text-foreground">${seriesAStage.avgCheckSize}M</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results Panel */}
          <div className="lg:col-span-2">
            {analysis ? (
              <GridResultsView analysis={analysis} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-muted-foreground mb-4">
                    <svg
                      className="h-16 w-16 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Configure your parameters and click "Run Grid Analysis" to explore optimal portfolio construction strategies
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
