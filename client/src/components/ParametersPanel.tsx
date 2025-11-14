/**
 * Parameters Panel Component
 * Allows users to configure fund parameters and stage-specific exit distributions
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BUCKET_DESCRIPTIONS } from "@/lib/bucket-descriptions";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";
import type { ExitBucket, PortfolioParameters, StageParameters } from "@/types/simulation";
import { Info, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ParametersPanelProps {
  parameters: PortfolioParameters;
  onParametersChange: (params: PortfolioParameters) => void;
  onRunSimulation: () => void;
  isRunning: boolean;
  validationError: string | null;
}

export default function ParametersPanel({
  parameters,
  onParametersChange,
  onRunSimulation,
  isRunning,
  validationError,
}: ParametersPanelProps) {
  const updateParameter = <K extends keyof PortfolioParameters>(
    key: K,
    value: PortfolioParameters[K]
  ) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  const updateStageParameter = (
    stage: "seedStage" | "seriesAStage",
    field: keyof StageParameters,
    value: number
  ) => {
    const newStageParams = { ...parameters[stage], [field]: value };
    updateParameter(stage, newStageParams);
  };

  const updateExitBucket = (
    stage: "seedStage" | "seriesAStage",
    index: number,
    field: keyof ExitBucket,
    value: number | string
  ) => {
    const newBuckets = [...parameters[stage].exitBuckets];
    newBuckets[index] = { ...newBuckets[index], [field]: value };
    const newStageParams = { ...parameters[stage], exitBuckets: newBuckets };
    updateParameter(stage, newStageParams);
  };

  const resetToDefaults = () => {
    onParametersChange(DEFAULT_PARAMETERS);
  };

  // Calculate total probability for each stage
  const seedTotalProbability = parameters.seedStage.exitBuckets.reduce(
    (sum, bucket) => sum + bucket.probability,
    0
  );
  const seriesATotalProbability = parameters.seriesAStage.exitBuckets.reduce(
    (sum, bucket) => sum + bucket.probability,
    0
  );
  
  const seedProbabilityValid = Math.abs(seedTotalProbability - 100) < 0.01;
  const seriesAProbabilityValid = Math.abs(seriesATotalProbability - 100) < 0.01;
  const probabilityValid = seedProbabilityValid && seriesAProbabilityValid;

  // Render exit distribution editor for a stage
  const renderExitDistribution = (
    stage: "seedStage" | "seriesAStage",
    stageName: string,
    totalProbability: number,
    isValid: boolean
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          {stageName} Exit Distribution
        </h4>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">
              Returns are multiples on YOUR invested capital (initial + follow-on),
              not company valuation multiples.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {parameters[stage].exitBuckets.map((bucket, index) => (
        <div
          key={index}
          className="p-3 bg-card rounded-lg border border-border shadow-sm space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="font-medium text-xs text-foreground">
              {bucket.label}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm">{BUCKET_DESCRIPTIONS[bucket.label]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prob (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={bucket.probability}
                onChange={(e) =>
                  updateExitBucket(stage, index, "probability", Number(e.target.value))
                }
                onFocus={(e) => e.target.select()}
                className="bg-card border-input text-foreground text-xs h-7"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min (x)</Label>
              <Input
                type="number"
                step="0.1"
                value={bucket.minMultiple}
                onChange={(e) =>
                  updateExitBucket(stage, index, "minMultiple", Number(e.target.value))
                }
                onFocus={(e) => e.target.select()}
                className="bg-card border-input text-foreground text-xs h-7"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Max (x)</Label>
              <Input
                type="number"
                step="0.1"
                value={bucket.maxMultiple}
                onChange={(e) =>
                  updateExitBucket(stage, index, "maxMultiple", Number(e.target.value))
                }
                onFocus={(e) => e.target.select()}
                className="bg-card border-input text-foreground text-xs h-7"
              />
            </div>
          </div>
        </div>
      ))}

      <div
        className={`text-xs p-2 rounded ${
          isValid
            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700"
            : "bg-red-900/30 text-red-400 border border-red-700"
        }`}
      >
        Total Probability: {totalProbability.toFixed(1)}%
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Parameters</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Fund Setup */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Fund Setup</h3>

          <div className="space-y-2">
            <Label htmlFor="fundSize" className="text-foreground">
              Fund Size ($M)
            </Label>
            <Input
              id="fundSize"
              type="number"
              value={parameters.fundSize}
              onChange={(e) => updateParameter("fundSize", Number(e.target.value))}
              className="bg-card border-input text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numCompanies" className="text-foreground">
              Number of Portfolio Companies
            </Label>
            <Input
              id="numCompanies"
              type="number"
              value={parameters.numCompanies}
              onChange={(e) =>
                updateParameter("numCompanies", Number(e.target.value))
              }
              className="bg-card border-input text-foreground"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="seedPercentage" className="text-foreground">
                Seed Percentage (%)
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Percentage of portfolio companies that are seed-stage investments.
                    The remainder will be Series A investments.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="seedPercentage"
              type="number"
              min="0"
              max="100"
              value={parameters.seedPercentage}
              onChange={(e) =>
                updateParameter("seedPercentage", Number(e.target.value))
              }
              className="bg-card border-input text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {Math.round(parameters.numCompanies * (parameters.seedPercentage / 100))} seed,{" "}
              {parameters.numCompanies - Math.round(parameters.numCompanies * (parameters.seedPercentage / 100))} Series A
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="investmentPeriod" className="text-foreground">
              Investment Period (years)
            </Label>
            <Input
              id="investmentPeriod"
              type="number"
              value={parameters.investmentPeriod}
              onChange={(e) =>
                updateParameter("investmentPeriod", Number(e.target.value))
              }
              className="bg-card border-input text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundLife" className="text-foreground">
              Fund Life (years)
            </Label>
            <Input
              id="fundLife"
              type="number"
              value={parameters.fundLife}
              onChange={(e) => updateParameter("fundLife", Number(e.target.value))}
              className="bg-card border-input text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="exitWindowMin" className="text-foreground">
                Exit Window Min (years)
              </Label>
              <Input
                id="exitWindowMin"
                type="number"
                value={parameters.exitWindowMin}
                onChange={(e) =>
                  updateParameter("exitWindowMin", Number(e.target.value))
                }
                className="bg-card border-input text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitWindowMax" className="text-foreground">
                Exit Window Max (years)
              </Label>
              <Input
                id="exitWindowMax"
                type="number"
                value={parameters.exitWindowMax}
                onChange={(e) =>
                  updateParameter("exitWindowMax", Number(e.target.value))
                }
                className="bg-card border-input text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numSimulations" className="text-foreground">
              Number of Simulations
            </Label>
            <Input
              id="numSimulations"
              type="number"
              value={parameters.numSimulations}
              onChange={(e) =>
                updateParameter("numSimulations", Number(e.target.value))
              }
              className="bg-card border-input text-foreground"
            />
          </div>
        </div>

        {/* Stage-Specific Parameters */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Stage-Specific Parameters</h3>
          
          <Accordion type="multiple" defaultValue={["seed", "seriesA"]} className="space-y-2">
            {/* Seed Stage */}
            <AccordionItem value="seed" className="border border-border rounded-lg bg-card shadow-sm">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-sm font-medium text-emerald-400">Seed Stage</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-foreground text-xs">
                    Average Initial Check Size ($M)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parameters.seedStage.avgCheckSize}
                    onChange={(e) =>
                      updateStageParameter("seedStage", "avgCheckSize", Number(e.target.value))
                    }
                    className="bg-card border-input text-foreground h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground text-xs">
                    Follow-on Reserve Ratio (%)
                  </Label>
                  <Input
                    type="number"
                    value={parameters.seedStage.followOnReserveRatio}
                    onChange={(e) =>
                      updateStageParameter("seedStage", "followOnReserveRatio", Number(e.target.value))
                    }
                    className="bg-card border-input text-foreground h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground text-xs">
                    Target Ownership (%) - Reference Only
                  </Label>
                  <Input
                    type="number"
                    value={parameters.seedStage.targetOwnership}
                    onChange={(e) =>
                      updateStageParameter("seedStage", "targetOwnership", Number(e.target.value))
                    }
                    className="bg-card border-input text-foreground h-8"
                  />
                </div>

                {renderExitDistribution("seedStage", "Seed", seedTotalProbability, seedProbabilityValid)}
              </AccordionContent>
            </AccordionItem>

            {/* Series A Stage */}
            <AccordionItem value="seriesA" className="border border-border rounded-lg bg-card shadow-sm">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-sm font-medium text-blue-400">Series A Stage</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-foreground text-xs">
                    Average Initial Check Size ($M)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parameters.seriesAStage.avgCheckSize}
                    onChange={(e) =>
                      updateStageParameter("seriesAStage", "avgCheckSize", Number(e.target.value))
                    }
                    className="bg-card border-input text-foreground h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground text-xs">
                    Follow-on Reserve Ratio (%)
                  </Label>
                  <Input
                    type="number"
                    value={parameters.seriesAStage.followOnReserveRatio}
                    onChange={(e) =>
                      updateStageParameter("seriesAStage", "followOnReserveRatio", Number(e.target.value))
                    }
                    className="bg-card border-input text-foreground h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground text-xs">
                    Target Ownership (%) - Reference Only
                  </Label>
                  <Input
                    type="number"
                    value={parameters.seriesAStage.targetOwnership}
                    onChange={(e) =>
                      updateStageParameter("seriesAStage", "targetOwnership", Number(e.target.value))
                    }
                    className="bg-card border-input text-foreground h-8"
                  />
                </div>

                {renderExitDistribution("seriesAStage", "Series A", seriesATotalProbability, seriesAProbabilityValid)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-400">
            {validationError}
          </div>
        )}
      </div>
    </div>
  );
}
