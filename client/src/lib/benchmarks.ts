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
    moic: 4.5,
    irr: 0.35, // 35%
    description: "Top 25% of VC funds - exceptional performance with multiple unicorn exits",
  },
  {
    category: "Median",
    moic: 2.5,
    irr: 0.20, // 20%
    description: "Median VC fund performance - solid returns with 1-2 strong exits",
  },
  {
    category: "Bottom Quartile",
    moic: 1.2,
    irr: 0.05, // 5%
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
 */
export function getBenchmarkColor(category: string): string {
  switch (category) {
    case "Top Quartile":
      return "text-emerald-500";
    case "Above Median":
      return "text-green-500";
    case "Below Median":
      return "text-yellow-500";
    case "Bottom Quartile":
      return "text-red-500";
    default:
      return "text-slate-400";
  }
}
