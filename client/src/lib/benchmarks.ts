/**
 * Industry benchmark data for VC fund performance
 * Based on Cambridge Associates, Preqin, and Carta data
 * Data represents pooled returns across vintage years 2010-2020
 */

export interface BenchmarkData {
  category: string;
  moic: number;
  irr: number;
  description: string;
}

/**
 * VC fund performance benchmarks by quartile
 * MOIC = Multiple on Invested Capital (gross, before fees)
 * IRR = Internal Rate of Return (gross, before fees)
 */
export const VC_BENCHMARKS: BenchmarkData[] = [
  {
    category: "Top Quartile",
    moic: 3.5,
    irr: 0.28, // 28%
    description: "Top 25% of VC funds - exceptional performance with multiple unicorn exits",
  },
  {
    category: "Median",
    moic: 2.0,
    irr: 0.15, // 15%
    description: "Median VC fund performance - solid returns with 1-2 strong exits",
  },
  {
    category: "Bottom Quartile",
    moic: 1.2,
    irr: 0.03, // 3%
    description: "Bottom 25% of VC funds - struggling to return capital",
  },
];

/**
 * Get benchmark category for a given MOIC
 */
export function getBenchmarkCategory(moic: number): string {
  if (moic >= VC_BENCHMARKS[0].moic) {
    return "Top Quartile";
  } else if (moic >= VC_BENCHMARKS[1].moic) {
    return "Above Median";
  } else if (moic >= VC_BENCHMARKS[2].moic) {
    return "Below Median";
  } else {
    return "Bottom Quartile";
  }
}

/**
 * Get color for benchmark category
 * Returns badge styling with background and text colors for proper contrast
 */
export function getBenchmarkColor(category: string): string {
  switch (category) {
    case "Top Quartile":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "Above Median":
      return "bg-green-500/20 text-green-300 border-green-500/30";
    case "Below Median":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "Bottom Quartile":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }
}
