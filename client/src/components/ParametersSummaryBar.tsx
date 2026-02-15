/**
 * ParametersSummaryBar - Shows active parameters on non-Simulation views
 * Provides quick visibility into current configuration
 */

import { useParameters } from "@/contexts/ParametersContext";
import { Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ParametersSummaryBar() {
  const { parameters } = useParameters();

  const feeStructure = parameters.feeStructure;
  const numSeedCompanies = Math.round(
    parameters.numCompanies * (parameters.seedPercentage / 100)
  );
  const numSeriesA = parameters.numCompanies - numSeedCompanies;

  return (
    <div className="border-b border-border bg-muted/30 shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Active Parameters:
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Fund:</span>
              <span className="font-medium text-foreground">
                ${parameters.fundSize}M
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Portfolio:</span>
              <span className="font-medium text-foreground">
                {parameters.numCompanies} cos
              </span>
              <span className="text-muted-foreground">
                ({numSeedCompanies} seed / {numSeriesA} A)
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Timeline:</span>
              <span className="font-medium text-foreground">
                {parameters.investmentPeriod}yr invest
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground">
                {parameters.fundLife}yr life
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Fees:</span>
              <span className="font-medium text-foreground">
                {feeStructure?.managementFeeRate ?? 2}%/
                {feeStructure?.carryRate ?? 20}%
              </span>
            </div>
          </div>

          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7">
              <Settings className="h-3 w-3" />
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
