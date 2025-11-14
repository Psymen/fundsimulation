/**
 * Parameters Panel Component
 * Allows users to configure fund parameters and exit distribution
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";
import type { ExitBucket, PortfolioParameters } from "@/types/simulation";
import { RotateCcw } from "lucide-react";

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

  const updateExitBucket = (index: number, field: keyof ExitBucket, value: number | string) => {
    const newBuckets = [...parameters.exitBuckets];
    newBuckets[index] = { ...newBuckets[index], [field]: value };
    updateParameter("exitBuckets", newBuckets);
  };

  const resetToDefaults = () => {
    onParametersChange(DEFAULT_PARAMETERS);
  };

  // Calculate total probability
  const totalProbability = parameters.exitBuckets.reduce(
    (sum, bucket) => sum + bucket.probability,
    0
  );
  const probabilityValid = Math.abs(totalProbability - 100) < 0.01;

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-900 border-r border-slate-700">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">Parameters</h2>
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

        {/* Fund Parameters */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Fund Setup</h3>

          <div className="space-y-2">
            <Label htmlFor="fundSize" className="text-slate-300">
              Fund Size ($M)
            </Label>
            <Input
              id="fundSize"
              type="number"
              value={parameters.fundSize}
              onChange={(e) => updateParameter("fundSize", Number(e.target.value))}
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numCompanies" className="text-slate-300">
              Number of Portfolio Companies
            </Label>
            <Input
              id="numCompanies"
              type="number"
              value={parameters.numCompanies}
              onChange={(e) =>
                updateParameter("numCompanies", Number(e.target.value))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avgCheckSize" className="text-slate-300">
              Average Initial Check Size ($M)
            </Label>
            <Input
              id="avgCheckSize"
              type="number"
              step="0.1"
              value={parameters.avgCheckSize}
              onChange={(e) =>
                updateParameter("avgCheckSize", Number(e.target.value))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followOnReserveRatio" className="text-slate-300">
              Follow-on Reserve Ratio (%)
            </Label>
            <Input
              id="followOnReserveRatio"
              type="number"
              value={parameters.followOnReserveRatio}
              onChange={(e) =>
                updateParameter("followOnReserveRatio", Number(e.target.value))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetOwnership" className="text-slate-300">
              Target Ownership (%) - Reference Only
            </Label>
            <Input
              id="targetOwnership"
              type="number"
              value={parameters.targetOwnership}
              onChange={(e) =>
                updateParameter("targetOwnership", Number(e.target.value))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investmentPeriod" className="text-slate-300">
              Investment Period (years)
            </Label>
            <Input
              id="investmentPeriod"
              type="number"
              value={parameters.investmentPeriod}
              onChange={(e) =>
                updateParameter("investmentPeriod", Number(e.target.value))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundLife" className="text-slate-300">
              Fund Life (years)
            </Label>
            <Input
              id="fundLife"
              type="number"
              value={parameters.fundLife}
              onChange={(e) => updateParameter("fundLife", Number(e.target.value))}
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exitWindowMin" className="text-slate-300">
                Exit Window Min (years)
              </Label>
              <Input
                id="exitWindowMin"
                type="number"
                value={parameters.exitWindowMin}
                onChange={(e) =>
                  updateParameter("exitWindowMin", Number(e.target.value))
                }
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitWindowMax" className="text-slate-300">
                Exit Window Max (years)
              </Label>
              <Input
                id="exitWindowMax"
                type="number"
                value={parameters.exitWindowMax}
                onChange={(e) =>
                  updateParameter("exitWindowMax", Number(e.target.value))
                }
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numSimulations" className="text-slate-300">
              Number of Simulations
            </Label>
            <Input
              id="numSimulations"
              type="number"
              value={parameters.numSimulations}
              onChange={(e) =>
                updateParameter("numSimulations", Number(e.target.value))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>
        </div>

        {/* Exit Distribution Editor */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">
            Exit Distribution
          </h3>

          <div className="space-y-3">
            {parameters.exitBuckets.map((bucket, index) => (
              <div
                key={index}
                className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2"
              >
                <div className="font-medium text-sm text-slate-200">
                  {bucket.label}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Prob (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={bucket.probability}
                      onChange={(e) =>
                        updateExitBucket(index, "probability", Number(e.target.value))
                      }
                      className="bg-slate-900 border-slate-600 text-slate-100 text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Min (x)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={bucket.minMultiple}
                      onChange={(e) =>
                        updateExitBucket(index, "minMultiple", Number(e.target.value))
                      }
                      className="bg-slate-900 border-slate-600 text-slate-100 text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Max (x)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={bucket.maxMultiple}
                      onChange={(e) =>
                        updateExitBucket(index, "maxMultiple", Number(e.target.value))
                      }
                      className="bg-slate-900 border-slate-600 text-slate-100 text-sm h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className={`text-sm p-2 rounded ${
              probabilityValid
                ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800"
                : "bg-red-900/20 text-red-400 border border-red-800"
            }`}
          >
            Total Probability: {totalProbability.toFixed(1)}%
            {!probabilityValid && " - Must equal 100%"}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {validationError && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 p-3 rounded">
              {validationError}
            </div>
          )}

          <Button
            onClick={onRunSimulation}
            disabled={isRunning || !probabilityValid || !!validationError}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
          >
            {isRunning ? "Running..." : "Run Simulations"}
          </Button>
        </div>
      </div>
    </div>
  );
}
