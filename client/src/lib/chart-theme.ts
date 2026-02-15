/**
 * Theme-aware chart colors for Recharts.
 * Call useChartTheme() in components to get colors that match the current theme.
 */

export interface ChartThemeColors {
  grid: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  // Accent colors (work on both backgrounds)
  purple: string;
  gold: string;
  green: string;
  red: string;
  blue: string;
}

const DARK: ChartThemeColors = {
  grid: "#334155",
  text: "#94a3b8",
  tooltipBg: "#1e293b",
  tooltipBorder: "#334155",
  purple: "#a371f7",
  gold: "#d29922",
  green: "#3fb950",
  red: "#f85149",
  blue: "#58a6ff",
};

const LIGHT: ChartThemeColors = {
  grid: "#e2e8f0",
  text: "#64748b",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e2e8f0",
  purple: "#7c3aed",
  gold: "#b45309",
  green: "#16a34a",
  red: "#dc2626",
  blue: "#2563eb",
};

export function getChartTheme(theme: "light" | "dark"): ChartThemeColors {
  return theme === "dark" ? DARK : LIGHT;
}
