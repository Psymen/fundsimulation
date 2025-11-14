import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StageParameters, ExitBucket } from "@/types/simulation";
import { BUCKET_DESCRIPTIONS } from "@/lib/bucket-descriptions";

interface StageParametersEditorProps {
  stage: "seed" | "seriesA";
  parameters: StageParameters;
  onChange: (parameters: StageParameters) => void;
  color: string; // Tailwind color class for styling
}

export default function StageParametersEditor({ stage, parameters, onChange, color }: StageParametersEditorProps) {
  const stageName = stage === "seed" ? "Seed" : "Series A";
  
  const handleBucketChange = (index: number, field: keyof ExitBucket, value: number) => {
    const newBuckets = [...parameters.exitBuckets];
    newBuckets[index] = { ...newBuckets[index], [field]: value };
    onChange({ ...parameters, exitBuckets: newBuckets });
  };
  
  const totalProbability = parameters.exitBuckets.reduce((sum, b) => sum + b.probability, 0);
  const isValid = Math.abs(totalProbability - 100) < 0.01;
  
  return (
    <div className="space-y-4">
      {/* Check Size */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor={`${stage}-checkSize`}>Average Initial Check Size ($M)</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Average initial investment per company at this stage</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id={`${stage}-checkSize`}
          type="number"
          value={parameters.avgCheckSize}
          onChange={(e) => onChange({ ...parameters, avgCheckSize: Number(e.target.value) })}
          min={0.1}
          step={0.1}
        />
      </div>
      
      {/* Reserve Ratio */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor={`${stage}-reserves`}>Follow-on Reserve Ratio (%)</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Capital reserved for follow-on investments as % of initial check.
                Deployed only when companies succeed.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id={`${stage}-reserves`}
          type="number"
          value={parameters.followOnReserveRatio}
          onChange={(e) => onChange({ ...parameters, followOnReserveRatio: Number(e.target.value) })}
          min={0}
          max={200}
        />
      </div>
      
      {/* Target Ownership (reference only) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor={`${stage}-ownership`}>Target Ownership (%) - Reference Only</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">For reference only. Not used in calculations.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id={`${stage}-ownership`}
          type="number"
          value={parameters.targetOwnership}
          onChange={(e) => onChange({ ...parameters, targetOwnership: Number(e.target.value) })}
          min={1}
          max={100}
        />
      </div>
      
      {/* Exit Distribution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Label>{stageName} Exit Distribution</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Probability distribution of return multiples on invested capital.
                  Total probability must equal 100%.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={`text-sm ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
            Total Probability: {totalProbability.toFixed(1)}%
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground">
            <div>Exit Outcome</div>
            <div>Prob (%)</div>
            <div>Min (x)</div>
            <div>Max (x)</div>
          </div>
          
          {parameters.exitBuckets.map((bucket, idx) => {
            const description = BUCKET_DESCRIPTIONS[bucket.label];
            return (
              <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{bucket.label}</span>
                  {description && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">{description}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Input
                  type="number"
                  value={bucket.probability}
                  onChange={(e) => handleBucketChange(idx, 'probability', Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-8"
                />
                <Input
                  type="number"
                  value={bucket.minMultiple}
                  onChange={(e) => handleBucketChange(idx, 'minMultiple', Number(e.target.value))}
                  min={0}
                  step={0.1}
                  className="h-8"
                />
                <Input
                  type="number"
                  value={bucket.maxMultiple}
                  onChange={(e) => handleBucketChange(idx, 'maxMultiple', Number(e.target.value))}
                  min={0}
                  step={0.1}
                  className="h-8"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
