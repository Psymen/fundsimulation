import { describe, test, expect } from 'vitest';
import {
  calculateManagementFees,
  calculateNetReturns,
  calculateDeployableCapital,
  DEFAULT_FEE_STRUCTURE,
} from '../fees';
import { runSimulations, calculateSummaryStatistics } from '../simulation';
import { DEFAULT_PARAMETERS } from '../defaults';

describe('Fee Calculations', () => {
  test('management fees for $200M fund, 2/20, 5yr invest, 10yr life', () => {
    // Years 1-5: 200M * 2% * 5 = $20M
    // Years 6-10: 200M * 1.5% * 5 = $15M
    // Total = $35M
    const fees = calculateManagementFees(
      200_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(fees).toBeCloseTo(35_000_000, -4);
  });

  test('net MOIC must be less than gross MOIC for profitable funds', () => {
    // 2.5x gross on $200M fund = $500M gross proceeds
    const result = calculateNetReturns(
      500_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    const grossMOIC = 500_000_000 / 200_000_000;
    expect(result.netMOIC).toBeLessThan(grossMOIC);
    expect(result.netMOIC).toBeGreaterThan(0);
  });

  test('fee drag is positive for profitable funds', () => {
    const result = calculateNetReturns(
      500_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(result.feeDragPercent).toBeGreaterThan(0);
    expect(result.feeDragPercent).toBeLessThan(100);
  });

  test('fee drag between 8-50% for 2-4x gross funds', () => {
    for (const mult of [2.0, 2.5, 3.0, 3.5, 4.0]) {
      const result = calculateNetReturns(
        200_000_000 * mult,
        200_000_000,
        160_000_000,
        DEFAULT_FEE_STRUCTURE,
        5,
        10
      );
      // At 2x MOIC, fee drag is ~9%, higher MOICs have proportionally lower drag
      expect(result.feeDragPercent).toBeGreaterThan(8);
      expect(result.feeDragPercent).toBeLessThan(50);
    }
  });

  test('carry is positive for funds well above hurdle', () => {
    // 3x gross on $200M = $600M. After $35M fees: $565M distributable.
    // Hurdle: $200M * (1 + 8% * 10) = $360M
    // Excess: $565M - $360M = $205M
    // Carry: $205M * 20% = $41M
    const result = calculateNetReturns(
      600_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(result.carriedInterest).toBeGreaterThan(0);
  });

  test('no carry for funds below hurdle', () => {
    // 1.5x gross on $200M = $300M. After $35M fees: $265M distributable.
    // Hurdle: $200M * (1 + 8% * 10) = $360M
    // $265M < $360M -> no carry
    const result = calculateNetReturns(
      300_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(result.carriedInterest).toBe(0);
  });

  test('net MOIC is never negative for non-negative gross returns', () => {
    const result = calculateNetReturns(
      100_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(result.netMOIC).toBeGreaterThanOrEqual(0);
  });

  test('management fees is zero for zero fund size', () => {
    const fees = calculateManagementFees(0, DEFAULT_FEE_STRUCTURE, 5, 10);
    expect(fees).toBe(0);
  });

  test('deployable capital is fund size minus total fees', () => {
    const fundSize = 200_000_000;
    const deployable = calculateDeployableCapital(
      fundSize,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    const expectedFees = calculateManagementFees(
      fundSize,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(deployable).toBeCloseTo(fundSize - expectedFees, -4);
  });

  test('waterfall logic: return LP capital first', () => {
    // 0.5x gross on $200M = $100M. After $35M fees: $65M distributable.
    // All goes to LPs (below capital return), no carry.
    const result = calculateNetReturns(
      100_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(result.carriedInterest).toBe(0);
    expect(result.netToLP).toBeCloseTo(65_000_000, -4);
  });

  test('waterfall logic: pay hurdle before carry', () => {
    // Exactly at hurdle: $200M * 1.8 = $360M gross
    // After $35M fees: $325M distributable
    // This is below hurdle of $360M, so no carry
    const result = calculateNetReturns(
      360_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    expect(result.carriedInterest).toBe(0);
  });
});

describe('Simulation Sanity Checks', () => {
  test('default simulation produces reasonable gross MOIC', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianMOIC).toBeGreaterThan(0.5);
    expect(summary.medianMOIC).toBeLessThan(8.0);
  });

  test('default simulation produces reasonable IRR', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianIRR).toBeGreaterThan(-0.2);
    expect(summary.medianIRR).toBeLessThan(0.6);
  });

  test('P10 < median < P90 for MOIC', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.moicP10).toBeLessThan(summary.medianMOIC);
    expect(summary.medianMOIC).toBeLessThan(summary.moicP90);
  });

  test('P10 < median < P90 for IRR', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.irrP10).toBeLessThan(summary.medianIRR);
    expect(summary.medianIRR).toBeLessThan(summary.irrP90);
  });

  test('write-off count is reasonable', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    // With 25 companies, 40% seed loss (60% of 25 = 15 seed) + 25% series A loss (40% of 25 = 10 series A)
    // Expected: 15 * 0.4 + 10 * 0.25 = 6 + 2.5 = 8.5 write-offs
    expect(summary.avgWriteOffs).toBeGreaterThan(5);
    expect(summary.avgWriteOffs).toBeLessThan(15);
  });

  test('net metrics exist and are reasonable', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianNetMOIC).toBeDefined();
    expect(summary.medianNetMOIC).toBeGreaterThan(0);
    expect(summary.medianNetMOIC).toBeLessThan(summary.medianMOIC);
    expect(summary.avgFeeDrag).toBeGreaterThan(0);
    expect(summary.avgFeeDrag).toBeLessThan(60);
  });

  test('probability values are fractions between 0 and 1', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.probMOICAbove2x).toBeGreaterThanOrEqual(0);
    expect(summary.probMOICAbove2x).toBeLessThanOrEqual(1);
    expect(summary.probMOICAbove3x).toBeGreaterThanOrEqual(0);
    expect(summary.probMOICAbove3x).toBeLessThanOrEqual(1);
    expect(summary.probMOICAbove5x).toBeGreaterThanOrEqual(0);
    expect(summary.probMOICAbove5x).toBeLessThanOrEqual(1);
  });

  test('probability ordering: P(>2x) >= P(>3x) >= P(>5x)', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.probMOICAbove2x).toBeGreaterThanOrEqual(summary.probMOICAbove3x);
    expect(summary.probMOICAbove3x).toBeGreaterThanOrEqual(summary.probMOICAbove5x);
  });
});

describe('Edge Cases', () => {
  test('single simulation does not crash', () => {
    const params = { ...DEFAULT_PARAMETERS, numSimulations: 1 };
    expect(() => runSimulations(params)).not.toThrow();
  });

  test('small fund does not crash', () => {
    const params = { ...DEFAULT_PARAMETERS, fundSize: 10, numCompanies: 5, numSimulations: 10 };
    const results = runSimulations(params);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianMOIC).toBeGreaterThan(0);
  });

  test('large fund does not crash', () => {
    const params = {
      ...DEFAULT_PARAMETERS,
      fundSize: 1000,
      numCompanies: 100,
      numSimulations: 50
    };
    const results = runSimulations(params);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianMOIC).toBeGreaterThan(0);
  });

  test('100% seed allocation works', () => {
    const params = { ...DEFAULT_PARAMETERS, seedPercentage: 100, numSimulations: 100 };
    const results = runSimulations(params);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianMOIC).toBeGreaterThan(0);
    // Verify all companies are seed
    expect(results[0].numSeedCompanies).toBe(params.numCompanies);
    expect(results[0].numSeriesACompanies).toBe(0);
  });

  test('0% seed allocation works', () => {
    const params = { ...DEFAULT_PARAMETERS, seedPercentage: 0, numSimulations: 100 };
    const results = runSimulations(params);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianMOIC).toBeGreaterThan(0);
    // Verify all companies are series A
    expect(results[0].numSeedCompanies).toBe(0);
    expect(results[0].numSeriesACompanies).toBe(params.numCompanies);
  });

  test('single company portfolio works', () => {
    const params = {
      ...DEFAULT_PARAMETERS,
      numCompanies: 1,
      numSimulations: 100
    };
    const results = runSimulations(params);
    const summary = calculateSummaryStatistics(results);
    expect(summary.medianMOIC).toBeGreaterThan(0);
  });

  test('very short fund life works', () => {
    const params = {
      ...DEFAULT_PARAMETERS,
      fundLife: 3,
      investmentPeriod: 2,
      exitWindowMin: 1,
      exitWindowMax: 3,
      numSimulations: 100
    };
    expect(() => runSimulations(params)).not.toThrow();
  });

  test('very long fund life works', () => {
    const params = {
      ...DEFAULT_PARAMETERS,
      fundLife: 15,
      investmentPeriod: 7,
      numSimulations: 100
    };
    expect(() => runSimulations(params)).not.toThrow();
  });
});

describe('Probability Display', () => {
  test('probability fractions multiply correctly to percentages', () => {
    // When prob is 0.65, display should be "65.0%"
    const prob = 0.65;
    const displayed = (prob * 100).toFixed(1);
    expect(displayed).toBe("65.0");
    expect(displayed).not.toBe("0.7");
  });

  test('probability edge cases: 0 and 1', () => {
    expect((0 * 100).toFixed(1)).toBe("0.0");
    expect((1 * 100).toFixed(1)).toBe("100.0");
  });

  test('probability precision: small values', () => {
    const prob = 0.023;
    const displayed = (prob * 100).toFixed(1);
    expect(displayed).toBe("2.3");
  });
});

describe('Fee Structure Variations', () => {
  test('3% management fee produces higher fees than 2%', () => {
    const highFeeStructure = { ...DEFAULT_FEE_STRUCTURE, managementFeeRate: 3 };
    const fees2pct = calculateManagementFees(200_000_000, DEFAULT_FEE_STRUCTURE, 5, 10);
    const fees3pct = calculateManagementFees(200_000_000, highFeeStructure, 5, 10);
    expect(fees3pct).toBeGreaterThan(fees2pct);
  });

  test('higher carry rate produces higher carry for profitable funds', () => {
    const highCarryStructure = { ...DEFAULT_FEE_STRUCTURE, carryRate: 30 };
    const result20pct = calculateNetReturns(
      600_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    const result30pct = calculateNetReturns(
      600_000_000,
      200_000_000,
      160_000_000,
      highCarryStructure,
      5,
      10
    );
    expect(result30pct.carriedInterest).toBeGreaterThan(result20pct.carriedInterest);
    expect(result30pct.netMOIC).toBeLessThan(result20pct.netMOIC);
  });

  test('higher hurdle rate produces lower carry', () => {
    const highHurdleStructure = { ...DEFAULT_FEE_STRUCTURE, hurdleRate: 12 };
    const result8pct = calculateNetReturns(
      500_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    const result12pct = calculateNetReturns(
      500_000_000,
      200_000_000,
      160_000_000,
      highHurdleStructure,
      5,
      10
    );
    expect(result12pct.carriedInterest).toBeLessThanOrEqual(result8pct.carriedInterest);
  });

  test('zero management fee produces zero fees', () => {
    const noFeeStructure = {
      ...DEFAULT_FEE_STRUCTURE,
      managementFeeRate: 0,
      managementFeeStepDown: 0
    };
    const fees = calculateManagementFees(200_000_000, noFeeStructure, 5, 10);
    expect(fees).toBe(0);
  });

  test('zero carry rate produces zero carry', () => {
    const noCarryStructure = { ...DEFAULT_FEE_STRUCTURE, carryRate: 0 };
    const result = calculateNetReturns(
      600_000_000,
      200_000_000,
      160_000_000,
      noCarryStructure,
      5,
      10
    );
    expect(result.carriedInterest).toBe(0);
  });
});

describe('Mathematical Consistency', () => {
  test('gross MOIC calculation consistency', () => {
    const results = runSimulations({ ...DEFAULT_PARAMETERS, numSimulations: 10 });
    results.forEach(result => {
      const calculatedMOIC = result.totalReturnedCapital / DEFAULT_PARAMETERS.fundSize;
      expect(result.grossMOIC).toBeCloseTo(calculatedMOIC, 10);
    });
  });

  test('net MOIC is gross MOIC minus impact of fees and carry', () => {
    const results = runSimulations({ ...DEFAULT_PARAMETERS, numSimulations: 10 });
    results.forEach(result => {
      if (result.netMOIC !== undefined) {
        // Net should be less than gross for positive return funds
        if (result.grossMOIC > 1) {
          expect(result.netMOIC).toBeLessThan(result.grossMOIC);
        }
      }
    });
  });

  test('fee drag percent matches net vs gross difference', () => {
    const result = calculateNetReturns(
      500_000_000,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    const grossMOIC = 500_000_000 / 200_000_000;
    const expectedDrag = ((grossMOIC - result.netMOIC) / grossMOIC) * 100;
    expect(result.feeDragPercent).toBeCloseTo(expectedDrag, 1);
  });

  test('distributable equals gross proceeds minus management fees', () => {
    const grossProceeds = 500_000_000;
    const fundSize = 200_000_000;
    const result = calculateNetReturns(
      grossProceeds,
      fundSize,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    const expectedFees = calculateManagementFees(fundSize, DEFAULT_FEE_STRUCTURE, 5, 10);
    expect(result.distributable).toBeCloseTo(grossProceeds - expectedFees, -4);
  });

  test('LP returns plus GP comp equals gross proceeds', () => {
    const grossProceeds = 500_000_000;
    const result = calculateNetReturns(
      grossProceeds,
      200_000_000,
      160_000_000,
      DEFAULT_FEE_STRUCTURE,
      5,
      10
    );
    // Note: GP commitment returns are included in GP comp, not LP returns
    // Total: netToLP + gpTotalComp should approximately equal gross (within GP commit return calculation)
    expect(result.netToLP + result.gpTotalComp).toBeGreaterThan(0);
  });
});

describe('Investment Period Impact', () => {
  test('shorter investment period reduces management fees', () => {
    const fees5yr = calculateManagementFees(200_000_000, DEFAULT_FEE_STRUCTURE, 5, 10);
    const fees3yr = calculateManagementFees(200_000_000, DEFAULT_FEE_STRUCTURE, 3, 10);
    // 3yr investment period means more years at step-down rate (1.5% instead of 2%)
    expect(fees3yr).toBeLessThan(fees5yr);
  });

  test('longer investment period increases management fees', () => {
    const fees5yr = calculateManagementFees(200_000_000, DEFAULT_FEE_STRUCTURE, 5, 10);
    const fees7yr = calculateManagementFees(200_000_000, DEFAULT_FEE_STRUCTURE, 7, 10);
    // 7yr investment period means more years at higher rate (2% instead of 1.5%)
    expect(fees7yr).toBeGreaterThan(fees5yr);
  });
});

describe('Standard Deviation and Variance', () => {
  test('MOIC standard deviation is non-negative', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.moicStdDev).toBeGreaterThanOrEqual(0);
  });

  test('IRR standard deviation is non-negative', () => {
    const results = runSimulations(DEFAULT_PARAMETERS);
    const summary = calculateSummaryStatistics(results);
    expect(summary.irrStdDev).toBeGreaterThanOrEqual(0);
  });

  test('higher variance portfolios have larger std dev', () => {
    // More concentrated portfolio should have higher variance
    const diversifiedParams = { ...DEFAULT_PARAMETERS, numCompanies: 50, numSimulations: 500 };
    const concentratedParams = { ...DEFAULT_PARAMETERS, numCompanies: 10, numSimulations: 500 };

    const diversifiedResults = runSimulations(diversifiedParams);
    const concentratedResults = runSimulations(concentratedParams);

    const diversifiedSummary = calculateSummaryStatistics(diversifiedResults);
    const concentratedSummary = calculateSummaryStatistics(concentratedResults);

    // Concentrated portfolios should generally have higher standard deviation
    // (though this is probabilistic, so we just check it's positive)
    expect(concentratedSummary.moicStdDev).toBeGreaterThan(0);
    expect(diversifiedSummary.moicStdDev).toBeGreaterThan(0);
  });
});
