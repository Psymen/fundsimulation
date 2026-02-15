/**
 * Fund economics: management fees, carried interest, and LP net returns
 *
 * Industry standard: "2 and 20" structure
 * - 2% annual management fee on committed capital
 * - 20% carried interest on profits above hurdle rate
 * - 8% preferred return (hurdle) to LPs before carry
 * - European waterfall (whole-fund) for early-stage VC
 */

import type { FeeStructure, NetReturnsResult } from "@/types/simulation";

/**
 * Default fee structure (industry standard 2/20 with 8% hurdle)
 */
export const DEFAULT_FEE_STRUCTURE: FeeStructure = {
  managementFeeRate: 2, // 2% per year
  managementFeeStepDown: 1.5, // 1.5% after investment period
  carryRate: 20, // 20% carried interest
  hurdleRate: 8, // 8% preferred return
  gpCommitPercent: 2, // 2% GP commitment
};

/**
 * Calculate total management fees over fund life
 *
 * Standard structure:
 * - Years 1 through investment period: fee% on committed capital
 * - Years after investment period: stepDown% on committed capital
 *   (some funds switch to invested capital basis, we use committed for simplicity)
 */
export function calculateManagementFees(
  fundSize: number,
  feeStructure: FeeStructure,
  investmentPeriod: number,
  fundLife: number
): number {
  const feesInvestmentPeriod =
    fundSize * (feeStructure.managementFeeRate / 100) * investmentPeriod;

  const remainingYears = Math.max(0, fundLife - investmentPeriod);
  const feesPostInvestment =
    fundSize * (feeStructure.managementFeeStepDown / 100) * remainingYears;

  return feesInvestmentPeriod + feesPostInvestment;
}

/**
 * Calculate net returns to LPs after fees and carry
 *
 * European waterfall (whole-fund):
 * 1. Return LP capital first
 * 2. Pay LP preferred return (hurdle)
 * 3. Carry on excess above hurdle (no GP catch-up)
 *
 * @param grossProceeds - Total money returned from portfolio
 * @param fundSize - Total committed capital
 * @param totalInvested - Actual capital deployed to companies
 * @param feeStructure - Fee terms
 * @param investmentPeriod - Years of active investing
 * @param fundLife - Total fund life in years
 */
export function calculateNetReturns(
  grossProceeds: number,
  fundSize: number,
  totalInvested: number,
  feeStructure: FeeStructure,
  investmentPeriod: number,
  fundLife: number
): NetReturnsResult {
  // Step 1: Calculate management fees
  const managementFees = calculateManagementFees(
    fundSize,
    feeStructure,
    investmentPeriod,
    fundLife
  );

  // Step 2: Calculate distributable proceeds (after fees)
  const distributable = Math.max(0, grossProceeds - managementFees);

  // Step 3: LP capital return
  const lpCapital = fundSize;

  // Step 4: Preferred return (hurdle)
  // Simple hurdle over fund life
  const hurdleMultiple = 1 + (feeStructure.hurdleRate / 100) * fundLife;
  const hurdleAmount = lpCapital * hurdleMultiple;

  // Step 5: Waterfall distribution
  let carriedInterest = 0;
  let netToLP = 0;

  if (distributable <= lpCapital) {
    // Fund didn't return capital - no carry, all to LPs
    netToLP = distributable;
    carriedInterest = 0;
  } else if (distributable <= hurdleAmount) {
    // Returned capital but below hurdle - no carry
    netToLP = distributable;
    carriedInterest = 0;
  } else {
    // Above hurdle: split excess between LP (80%) and GP (20%)
    const lpPreferred = hurdleAmount;
    const excess = distributable - hurdleAmount;

    // Carry on excess above hurdle (no GP catch-up)
    carriedInterest = excess * (feeStructure.carryRate / 100);
    netToLP = lpPreferred + (excess - carriedInterest);
  }

  // GP economics
  const gpCommitAmount = fundSize * (feeStructure.gpCommitPercent / 100);
  const gpCommitReturn =
    gpCommitAmount * (grossProceeds / Math.max(totalInvested, 1));
  const gpTotalComp = managementFees + carriedInterest + gpCommitReturn;

  // Net metrics
  const netMOIC = netToLP / lpCapital;
  const grossMOIC = grossProceeds / fundSize;
  const feeDrag =
    grossMOIC > 0 ? ((grossMOIC - netMOIC) / grossMOIC) * 100 : 0;

  return {
    grossProceeds,
    managementFees,
    carriedInterest,
    netToLP,
    netMOIC,
    feeDragPercent: feeDrag,
    gpTotalComp,
    distributable,
  };
}

/**
 * Calculate deployable capital (fund size minus lifetime management fees)
 * This is the actual amount available for investing
 */
export function calculateDeployableCapital(
  fundSize: number,
  feeStructure: FeeStructure,
  investmentPeriod: number,
  fundLife: number
): number {
  const totalFees = calculateManagementFees(
    fundSize,
    feeStructure,
    investmentPeriod,
    fundLife
  );
  return fundSize - totalFees;
}

/**
 * Generate fee drag table across multiple MOIC scenarios
 * Useful for showing non-linear impact of fees
 */
export function generateFeeDragTable(
  fundSize: number,
  feeStructure: FeeStructure,
  investmentPeriod: number,
  fundLife: number
): { grossMOIC: number; netMOIC: number; feeDrag: number; carry: number }[] {
  const scenarios = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0];

  return scenarios.map((grossMOIC) => {
    const grossProceeds = fundSize * grossMOIC;
    const result = calculateNetReturns(
      grossProceeds,
      fundSize,
      fundSize * 0.8, // Assume 80% deployment
      feeStructure,
      investmentPeriod,
      fundLife
    );

    return {
      grossMOIC,
      netMOIC: result.netMOIC,
      feeDrag: result.feeDragPercent,
      carry: result.carriedInterest,
    };
  });
}
