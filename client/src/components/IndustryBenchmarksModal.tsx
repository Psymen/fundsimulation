import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { VC_BENCHMARKS, getBenchmarkCategory, getBenchmarkColor } from "@/lib/benchmarks";
import { Badge } from "@/components/ui/badge";

interface IndustryBenchmarksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bestStrategyMOIC?: number;
}

export function IndustryBenchmarksModal({ open, onOpenChange, bestStrategyMOIC }: IndustryBenchmarksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Industry Benchmarks
          </DialogTitle>
          <DialogDescription>
            Compare your simulations against VC industry performance data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Benchmark Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VC_BENCHMARKS.map((benchmark) => (
              <Card key={benchmark.category} className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">{benchmark.category}</div>
                  <div className="text-2xl font-bold mb-1">{benchmark.moic}x MOIC</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {(benchmark.irr * 100).toFixed(0)}% IRR
                  </div>
                  <div className="text-xs text-muted-foreground">{benchmark.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Best Strategy Performance */}
          {bestStrategyMOIC !== undefined && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Your Best Strategy Performance</div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-2xl font-bold">
                    {bestStrategyMOIC.toFixed(2)}x
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">Median MOIC</span>
                </div>
                <div className="flex-1">
                  <Badge className={getBenchmarkColor(getBenchmarkCategory(bestStrategyMOIC))}>
                    {getBenchmarkCategory(bestStrategyMOIC)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
