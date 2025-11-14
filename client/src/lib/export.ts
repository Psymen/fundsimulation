/**
 * Export utilities for simulation results
 */

import type { PortfolioParameters, SimulationResult } from "@/types/simulation";

/**
 * Export simulation results to CSV
 */
export function exportResultsToCSV(results: SimulationResult[]): void {
  if (results.length === 0) return;

  // CSV header
  const headers = [
    "Simulation",
    "Gross MOIC",
    "Multiple on Committed Capital",
    "Gross IRR (%)",
    "Total Invested ($M)",
    "Total Returned ($M)",
    "Write-offs",
    "Outliers",
  ];

  // CSV rows
  const rows = results.map((result, index) => [
    index + 1,
    result.grossMOIC.toFixed(4),
    result.multipleOnCommittedCapital.toFixed(4),
    (result.grossIRR * 100).toFixed(2),
    result.totalInvestedCapital.toFixed(2),
    result.totalReturnedCapital.toFixed(2),
    result.numWriteOffs,
    result.numOutliers,
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Download file
  downloadFile(csvContent, "vc-monte-carlo-results.csv", "text/csv");
}

/**
 * Export parameters to JSON (copy to clipboard)
 */
export function exportParametersToJSON(
  parameters: PortfolioParameters
): Promise<void> {
  const json = JSON.stringify(parameters, null, 2);

  return navigator.clipboard
    .writeText(json)
    .then(() => {
      console.log("Parameters copied to clipboard");
    })
    .catch((error) => {
      console.error("Error copying to clipboard:", error);
      // Fallback: show in alert
      alert("Parameters JSON:\n\n" + json);
    });
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
