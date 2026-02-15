# Metrics & Outputs Review -- VC Monte Carlo Simulation Tool

**Reviewer**: Quantitative Analyst, Fund-of-Funds
**Date**: 2026-02-15
**Files Reviewed**: simulation.ts, fees.ts, fund-metrics.ts, distributions.ts, defaults.ts, ChartsPanel.tsx, GridResultsView.tsx, grid-analysis.ts, PowerLawExplorer.tsx, FundEconomics.tsx, ScenarioStressTest.tsx

---

## 1. Simulation Results (SimulationResult)

### 1.1 grossMOIC
**File**: `/client/src/lib/simulation.ts`, line 224
**Formula**: `totalReturnedCapital / totalInvestedCapital`
**Rating**: Correct

This is correctly computed as gross MOIC on invested (deployed) capital. The naming is accurate -- it measures returns relative to the capital actually put to work, not committed capital. This is the standard GP-reported gross metric.

### 1.2 multipleOnCommittedCapital
**File**: `/client/src/lib/simulation.ts`, line 225
**Formula**: `totalReturnedCapital / params.fundSize`
**Rating**: Correct

This correctly measures returns against the total committed fund size, which is the metric LPs care about most. It is computed but does not appear prominently in the UI (not shown in ChartsPanel summary cards). This is a missed opportunity -- LPs benchmark on committed capital, not invested.

### 1.3 grossIRR (Newton-Raphson)
**File**: `/client/src/lib/simulation.ts`, lines 45-75
**Rating**: Minor Issue

The Newton-Raphson implementation is mathematically correct. The NPV and derivative formulas are right:
- `NPV = sum(CF_j / (1+r)^t_j)`
- `dNPV/dr = sum(-t_j * CF_j / (1+r)^(t_j+1))`

Convergence guards are reasonable (clamp to [-0.99, 10], max 100 iterations, tolerance 0.0001).

**Issue**: The cash flow construction (lines 231-248) uses a fixed pacing schedule `[0.30, 0.35, 0.25, 0.10]` applied to `totalInvestedCapital`, but the actual invested capital per company varies due to follow-on logic. The IRR calculation treats all investment as if it were deployed at the portfolio level with these weights, when in reality individual companies have different investment amounts and timing. This is an approximation that will bias IRR somewhat (typically upward, since it concentrates deployment early rather than tracking actual company-level timing). For a Monte Carlo tool this is acceptable but should be documented.

**Second issue**: The exit cash flows use each company's `exitYear` directly (which is a float, e.g. 6.7), but the deployment cash flows use `year + 0.5` (midpoint convention). The mixing of continuous and discrete timing is internally consistent enough, though slightly unusual.

### 1.4 netMOIC
**File**: `/client/src/lib/fees.ts`, line 120
**Formula**: `netToLP / lpCapital` where `lpCapital = fundSize`
**Rating**: Correct

This is the true LP net MOIC after management fees and carried interest, calculated on committed capital (fundSize). This is the correct LP metric.

### 1.5 netIRR
**File**: `/client/src/lib/simulation.ts`, lines 272-275
**Formula**: `grossIRR * (1 - feeDragPercent / 100)` when grossIRR > 0; otherwise `grossIRR`
**Rating**: Bug

This is a rough linear approximation and is **mathematically incorrect** as a general formula. Fee drag on MOIC does not translate linearly to fee drag on IRR. The relationship between gross and net IRR depends on the timing of fees and distributions, not just their magnitude.

**Example of error**: A fund with 3x gross MOIC over 5 years has ~24.6% gross IRR. With 30% fee drag, the net MOIC is 2.1x, giving ~16.0% net IRR. The formula here would compute `24.6% * (1 - 30/100) = 17.2%` -- an overstatement of 120bps.

The error grows worse with higher fee drags and longer fund lives. For a fund with 50% fee drag, the error can exceed 300bps.

**Fix**: Calculate net IRR properly using separate cash flows:
- Outflows: capital calls (same as gross, since LPs pay these)
- Inflows: actual LP distributions (grossProceeds - fees - carry, timed at exit years)

Alternatively, apply a non-linear correction factor. The current approach should at minimum be labeled "estimated" in the UI.

### 1.6 managementFees, carriedInterest, feeDragPercent
**File**: `/client/src/lib/fees.ts`
**Rating**: Correct (passed through from fee waterfall)

These are computed in `calculateNetReturns` and correctly passed to the SimulationResult.

### 1.7 yearlyMetrics (DPI/TVPI)
Reviewed separately in Section 5 below.

---

## 2. Summary Statistics

### 2.1 Percentile Calculation
**File**: `/client/src/lib/simulation.ts`, lines 321-324
**Formula**: `arr[Math.floor(arr.length * p)]`
**Rating**: Minor Issue

This uses the "floor" method which is the simplest percentile calculation (the "nearest rank" method). For P10/P50/P90 with 1000 simulations, this gives index 100/500/900, which is reasonable. However:

- With small sample sizes (e.g., 10 simulations), `Math.floor(10 * 0.9) = 9` returns the last element, which is technically the maximum, not P90.
- The standard linear interpolation method (used by Excel's PERCENTILE.INC, NumPy's default) would be more accurate, especially for smaller simulation counts.

For the default 1000 simulations this is fine. For the grid analysis which uses fewer simulations per scenario, the error is more meaningful.

### 2.2 Standard Deviation
**File**: `/client/src/lib/simulation.ts`, lines 342-344
**Formula**: Population standard deviation (divides by N, not N-1)
**Rating**: Correct

Population stddev is appropriate here because the simulation results represent the full population of outcomes for the given parameters, not a sample from a larger population. Each simulation run is a complete draw from the model.

### 2.3 probMOICAbove2x/3x/5x
**File**: `/client/src/lib/simulation.ts`, lines 334-339
**Rating**: Bug (Display)

The values are computed as **fractions** (0-1), e.g., `results.filter(...).length / results.length` produces values like 0.65 (meaning 65%).

In `ChartsPanel.tsx` line 458, they are displayed as:
```tsx
{probability.toFixed(1)}%
```

This means a value of 0.65 would display as **"0.7%"** instead of **"65.0%"**. This is a critical display bug.

**However**, looking at GridResultsView.tsx lines 321-335, the same values are displayed identically:
```tsx
{selectedScenario.summary.probMOICAbove2x.toFixed(1)}%
```

This confirms the bug is present in both views.

**Fix**: Either multiply by 100 before display (`(probability * 100).toFixed(1) + "%"`) or compute the values as percentages (0-100) in `calculateSummaryStatistics`.

---

## 3. ChartsPanel Display

### 3.1 IRR Formatting
**File**: `/client/src/components/ChartsPanel.tsx`, lines 120-121
**Rating**: Correct

IRR values stored as decimals (e.g., 0.24 for 24%) are correctly multiplied by 100 for display: `(summary.medianIRR * 100).toFixed(1) + "%"`.

### 3.2 Fee Drag Display
**File**: `/client/src/components/ChartsPanel.tsx`, line 150
**Rating**: Correct

`avgFeeDrag` is already in percentage units (from `feeDragPercent` in fees.ts), and is displayed with `.toFixed(1) + "%"`. No double-multiplication issue.

### 3.3 Gross vs Net Card
**File**: `/client/src/components/ChartsPanel.tsx`, lines 98-101
**Rating**: Correct

The card recalculates fee drag from the median values: `(medianMOIC - medianNetMOIC) / medianMOIC * 100`. This is correct and provides a per-median comparison rather than using the average fee drag across simulations.

### 3.4 J-Curve Chart P10/P50/P90 Bands
**File**: `/client/src/components/ChartsPanel.tsx`, lines 228-283
**Rating**: Minor Issue

The P10/P90 bands are implemented using overlapping Area components where the P10 area is filled with the background color to "cut out" the band. This is a visual hack that works when the background is `#0d1117` but will break if the card background changes. It also means the "band" between P10 and P90 is not a true confidence interval fill -- it is two separate filled areas. Functionally, the data is correct; the visual could be misleading because the P90 area starts from 0, not from P10.

### 3.5 probMOICAbove Display (ProbabilityBadge)
**File**: `/client/src/components/ChartsPanel.tsx`, lines 454-463
**Rating**: Critical Bug (see 2.3 above)

The probability values are fractions (0-1) but displayed as if they were percentages (0-100). A fund with 65% chance of exceeding 2x would show "0.7%" instead of "65.0%".

---

## 4. Fee Waterfall

### 4.1 European Waterfall Implementation
**File**: `/client/src/lib/fees.ts`, lines 64-135
**Rating**: Minor Issue

The implementation follows the broad structure of a European (whole-fund) waterfall correctly:
1. Calculate management fees
2. Deduct fees from gross proceeds to get distributable
3. Return LP capital first
4. Pay preferred return (hurdle)
5. Split excess between LP and GP

**Issue 1: Missing GP catch-up**. The code comments mention "GP catch-up to carry %" (line 103) but the implementation does not actually model a catch-up provision. In a standard European waterfall with catch-up, after the LP receives the hurdle, the GP receives 100% of the next tranche until the GP has received their carry percentage of total profits. The current code simply splits the excess above hurdle at 80/20. This means the GP receives less carry than they would in a true catch-up waterfall, and the net MOIC to LPs is slightly overstated for scenarios near the hurdle.

For a simulation tool, this simplified approach is reasonable but the comment is misleading.

**Issue 2: Hurdle on committed vs. invested**. The hurdle is calculated on committed capital (fundSize): `lpCapital * hurdleMultiple` where `lpCapital = fundSize`. This is standard for European waterfalls and is correct.

### 4.2 Hurdle Calculation
**File**: `/client/src/lib/fees.ts`, line 88
**Formula**: `Math.pow(1 + hurdleRate/100, fundLife)` -- compound 8% over 10 years = 2.159x
**Rating**: Correct

This correctly compounds the hurdle rate over the full fund life. The hurdle amount (line 89) is `lpCapital * hurdleMultiple`, which represents the total amount LPs must receive before carry kicks in. For an 8% hurdle over 10 years on committed capital, the LP must receive 2.16x before the GP earns carry.

### 4.3 feeDragPercent Formula
**File**: `/client/src/lib/fees.ts`, lines 122-123
**Formula**: `((grossMOIC - netMOIC) / grossMOIC) * 100`
**Rating**: Minor Issue

This formula computes fee drag as the percentage reduction from gross to net, which is one valid definition. However, there is a subtle inconsistency: `grossMOIC` here is computed as `grossProceeds / totalInvested` (line 121), which is MOIC on invested capital. Meanwhile `netMOIC` is `netToLP / fundSize` (line 120), which is on committed capital. These are different denominators.

When totalInvested < fundSize (which is always the case due to management fees and reserves), the grossMOIC on invested capital will be higher than gross MOIC on committed capital, making the fee drag appear artificially larger.

**Example**: $100M fund, $80M invested, $240M returned.
- grossMOIC (invested) = 240/80 = 3.0x
- grossMOIC (committed) = 240/100 = 2.4x
- If netMOIC (committed) = 1.8x
- Fee drag using invested basis: (3.0 - 1.8) / 3.0 = 40%
- Fee drag using committed basis: (2.4 - 1.8) / 2.4 = 25%

The 40% figure is misleading because it compares numbers on different bases. The committed-to-committed comparison (25%) is more meaningful for LPs.

### 4.4 Edge Case: grossMOIC < 1x
**File**: `/client/src/lib/fees.ts`, lines 95-98
**Rating**: Correct

When distributable is less than or equal to LP capital, all proceeds go to LPs and carry is zero. This is correct -- the GP earns no carry when the fund has not returned capital.

### 4.5 Edge Case: grossMOIC = 0
**Rating**: Correct

When grossProceeds = 0: distributable = max(0, 0 - fees) = 0, netToLP = 0, carriedInterest = 0, netMOIC = 0/fundSize = 0, feeDrag = 0 (guarded by `grossMOIC > 0` check). All correct.

---

## 5. Fund Metrics (DPI/TVPI)

### 5.1 DPI Calculation
**File**: `/client/src/lib/fund-metrics.ts`, lines 148
**Formula**: `netDistributions / capitalCalled`
**Rating**: Correct

DPI is cumulative distributions net of management fees divided by cumulative capital called. The code correctly deducts cumulative fees from cumulative distributions (line 131): `netDistributions = max(0, cumulativeDistributions - cumulativeFees)`.

### 5.2 RVPI Calculation
**File**: `/client/src/lib/fund-metrics.ts`, line 149
**Formula**: `unrealizedValue / capitalCalled`
**Rating**: Correct

RVPI is the residual (unrealized) portfolio value divided by capital called. The markup model (lines 48-79) uses a conservative square-root progression with a 0.7 discount factor for successful companies and a linear write-down for failures. This produces sensible interim marks.

### 5.3 TVPI = DPI + RVPI
**File**: `/client/src/lib/fund-metrics.ts`, line 150
**Rating**: Correct

`tvpi = dpi + rvpi` is the standard definition.

### 5.4 Management Fee Deduction from DPI
**Rating**: Correct

Management fees are deducted from distributions before computing DPI (line 131). This is the correct LP perspective -- LPs receive distributions net of fees.

### 5.5 Naming Inconsistency in YearlyFundMetrics
**File**: `/client/src/lib/fund-metrics.ts`, line 155
**Rating**: Minor Issue

The field `cumulativeDistributions` is set to `netDistributions` (after fee deduction), not gross distributions. The name is misleading -- it should be `netCumulativeDistributions` or the comment should clarify.

### 5.6 Capital Call Schedule vs. IRR Capital Deployment
**Rating**: Minor Issue

The yearly metrics use a detailed capital call schedule (25/55/80/92/97/100% over 6 years), while the IRR calculation uses a different 4-year pacing (30/35/25/10%). These two schedules are inconsistent, meaning the J-curve chart and the IRR are modeling different deployment timings. This does not cause incorrect individual calculations but means the J-curve and IRR are not perfectly reconciled.

---

## 6. Grid Analysis

### 6.1 Deployment Metrics
**File**: `/client/src/lib/grid-analysis.ts`, lines 62-83
**Rating**: Correct

`deploymentRate = (avgDeployedCapital / fundSize) * 100` is correctly calculated as the percentage of fund size actually deployed. Note that deployment rate can exceed 100% if check sizes and follow-on reserves exceed the fund size for a given number of companies -- this is handled in the UI with a strikethrough style for deployment > 200%.

### 6.2 Target Capital Calculation
**File**: `/client/src/lib/grid-analysis.ts`, lines 123-127
**Rating**: Minor Issue

The target capital assumes every company uses the full follow-on reserve: `avgCheckSize * (1 + followOnReserveRatio / 100)`. In practice, follow-on investment depends on the company's outcome (the `calculateFollowOn` function only invests in companies with returnMultiple >= 1.0). This means `targetCapital` overstates what would actually be deployed, making it a theoretical maximum rather than a realistic target.

### 6.3 Best Strategy Identification
**File**: `/client/src/lib/grid-analysis.ts`, lines 158-211
**Rating**: Correct

The four criteria (Highest MOIC, Highest IRR, Best Downside Protection via P10, Most Capital Efficient) are reasonable and well-implemented. The efficiency score (medianMOIC * deploymentRate/100) is a simple but sensible composite metric.

---

## 7. Power Law Metrics

### 7.1 Gini Coefficient
**File**: `/client/src/pages/PowerLawExplorer.tsx`, lines 286-301
**Formula**: `sum|x_i - x_j| / (2 * n^2 * mean)`
**Rating**: Correct

This is the standard relative mean absolute difference formula for the Gini coefficient. The implementation correctly:
- Sorts returns ascending
- Handles the zero-mean edge case (returns 0)
- Uses the O(n^2) pairwise difference formula

For a portfolio of 25-200 companies, O(n^2) performance is fine.

### 7.2 Concentration Chart (Top N)
**File**: `/client/src/pages/PowerLawExplorer.tsx`, lines 60-81
**Rating**: Correct

Companies are sorted descending by returned capital, cumulative percentages are correctly computed as `cumulative / totalValue * 100`. The uniform distribution comparison line (`(i+1)/n * 100`) provides a clear Lorenz-curve-style visualization.

### 7.3 Outlier Sensitivity Analysis
**File**: `/client/src/pages/PowerLawExplorer.tsx`, lines 234-254
**Rating**: Correct

The sensitivity analysis correctly replaces the best company's return multiple while keeping all other companies fixed: `adjustedTotal = bestInvested * mult + restReturned`. This cleanly shows the marginal impact of the top performer. The MOIC is correctly recalculated as `adjustedTotal / totalInvested`.

### 7.4 Equivalent Combinations Table
**File**: `/client/src/pages/PowerLawExplorer.tsx`, lines 111-129
**Rating**: Minor Issue

The `baseReturn` assumes remaining companies average 0.5x, which is stated in the UI. However, `numCompanies - 1` is used instead of `numCompanies - numNeeded`, meaning the base return includes the outlier companies' positions. For numNeeded > 1, the base return should be `(numCompanies - numNeeded) * avgCheckSize * 0.5`. This makes the "# Companies Needed" slightly too high for the higher multiples.

---

## 8. Fund Economics

### 8.1 Waterfall Chart Values
**File**: `/client/src/pages/FundEconomics.tsx`, lines 114-159
**Rating**: Minor Issue

The waterfall data construction has an awkward "LP Hurdle" bar that is informational but not part of the actual waterfall flow. The stacked waterfall logic (lines 163-195) has a special case for LP Hurdle that prevents it from shifting the running total, which is correct behavior but could confuse users since the bar appears as a separate positive step. The hurdle is already embedded in the carry calculation -- showing it as a separate bar implies it is an additional distribution.

### 8.2 Fund Size Sensitivity
**File**: `/client/src/pages/FundEconomics.tsx`, lines 309-472
**Rating**: Correct

The sensitivity analysis correctly recalculates net returns for each fund size using the same fee structure. The key insight (fee drag is constant across fund sizes when expressed as a percentage, since both fees and returns scale linearly with fund size) is correctly demonstrated. GP carry scales linearly with fund size, which is shown correctly.

### 8.3 GP vs LP Table
**File**: `/client/src/pages/FundEconomics.tsx`, lines 476-615
**Rating**: Correct

The table correctly shows the non-linear relationship between gross MOIC and fee drag. The carry kick-in highlight (when `carriedInterest > 0`) correctly identifies the hurdle threshold. All values use the same `calculateNetReturns` function for consistency.

---

## 9. Stress Test Outputs

### 9.1 Probability Redistribution
**File**: `/client/src/pages/ScenarioStressTest.tsx`, lines 48-81
**Rating**: Correct

The `modifyStageFailureRate` function:
1. Scales the Total Loss probability by the factor
2. Redistributes the difference proportionally across other buckets
3. Normalizes all probabilities to sum to exactly 100

The normalization step (lines 73-78) ensures probabilities always sum to 100%, which is correct.

### 9.2 Delta Calculations
**File**: `/client/src/pages/ScenarioStressTest.tsx`, lines 655-692
**Rating**: Correct

Deltas are computed as simple differences from the base case (`val - baseVal`) with proper sign handling. The `higherIsGood` parameter correctly colors the deltas green/red based on whether the direction is favorable. For "Prob <1x", `higherIsGood = false` is correctly passed.

### 9.3 Prob <1x Calculation
**File**: `/client/src/pages/ScenarioStressTest.tsx`, lines 646-649
**Rating**: Minor Issue (dead code)

There are two calculations for Prob <1x:
- Line 643-644: `probBelow1x = 100 - (s.probMOICAbove2x > 0 ? 100 : 0)` -- This is incorrect and unused (would give 0% or 100% only)
- Line 646-649: `actualProbBelow1x = (sr.results.filter(r => r.grossMOIC < 1).length / sr.results.length) * 100` -- This is correct and is the value actually displayed

The `probBelow1x` variable on line 643 is dead code and should be removed for clarity, but it does not affect output.

---

## 10. Edge Cases

### 10.1 Zero Companies
If `numCompanies = 0`: `numSeedCompanies = 0`, `numSeriesACompanies = 0`, the companies array is empty. `totalInvestedCapital = 0`, `totalReturnedCapital = 0`, `grossMOIC = 0/0 = NaN`. The IRR calculation would have no exit cash flows but still have deployment cash flows of `$0 * weight = 0`. **Rating**: Bug -- division by zero produces NaN MOIC.

### 10.2 One Company
Works correctly. The single company result drives the entire fund MOIC. IRR is computed with deployment and one exit.

### 10.3 100 Companies
Works correctly. No performance issues for simulation; may be slow for grid analysis with many scenarios.

### 10.4 Fund Size $1M and $10B
The simulation logic is scale-independent (all calculations use ratios). The only concern is with the fee calculation at extreme sizes -- at $1M, management fees of $20K/year may dominate, making the simulation less realistic. At $10B, the fixed check sizes ($2M seed, $5M Series A) would be unrealistic. These are input validation issues, not calculation bugs.

### 10.5 0% Seed or 100% Seed
Both work correctly. At 0% seed, `numSeedCompanies = 0` and all companies are Series A. At 100% seed, all are seed. No edge case issues.

### 10.6 Zero Simulations
If `numSimulations = 0`, the results array is empty. `calculateSummaryStatistics` would divide by zero when computing averages and access undefined array indices for percentiles. **Rating**: Bug -- no guard against empty results array.

### 10.7 Single Exit Bucket at 100%
Works correctly. All companies use the same bucket, providing a degenerate but valid distribution.

---

## Summary

### Confirmed Correct
1. **grossMOIC** -- correctly computed as totalReturned / totalInvested
2. **multipleOnCommittedCapital** -- correctly computed as totalReturned / fundSize
3. **Newton-Raphson IRR** -- mathematically correct implementation
4. **netMOIC** -- correctly computed from waterfall as netToLP / fundSize
5. **Management fees** -- correct annual calculation with step-down
6. **Hurdle calculation** -- correct compound 8% over fund life
7. **Carry = 0 when grossMOIC < 1x** -- correct waterfall behavior
8. **grossMOIC = 0 edge case** -- handled correctly
9. **DPI/RVPI/TVPI definitions** -- all correct
10. **Gini coefficient** -- correct formula
11. **Concentration chart** -- correct cumulative percentages
12. **Outlier sensitivity** -- mathematically sound
13. **Stress test probability normalization** -- correctly sums to 100%
14. **Delta calculations** -- correct sign and direction handling
15. **Standard deviation** -- correct use of population stddev
16. **IRR display formatting** -- correctly multiplied by 100
17. **Fee drag display** -- no double-multiplication

### Bugs to Fix
1. **Critical: probMOICAbove2x/3x/5x display** -- Values are fractions (0-1) but displayed with `%` suffix as if they were percentages (0-100). A 65% probability shows as "0.7%". Fix: multiply by 100 before display, or compute as percentages.
2. **Bug: netIRR approximation** -- `grossIRR * (1 - feeDrag%)` is not a valid formula. The error can be 100-300+ bps. Fix: compute net IRR from actual net cash flows using the same Newton-Raphson method.
3. **Bug: Zero companies produces NaN** -- Division by zero when totalInvestedCapital = 0. Fix: guard with `totalInvestedCapital > 0 ? ... : 0`.
4. **Bug: Zero simulations crashes** -- No guard against empty results in calculateSummaryStatistics. Fix: return default values for empty arrays.

### Display Issues
1. **Heatmap legend mismatch** -- GridResultsView shows a 3-level legend (red/yellow/green for Low/Medium/High) but the actual coloring logic only uses 2 levels (top 10% green, bottom 10% red, everything else neutral). The yellow "Medium" in the legend does not correspond to any actual cell color.
2. **J-curve band rendering** -- The P10/P90 bands use a background-color-fill hack that breaks if the theme background changes. Not a calculation error but a fragile visualization.
3. **Waterfall "LP Hurdle" bar** -- Displayed as a separate step in the waterfall but is already embedded in the carry calculation. May confuse users unfamiliar with waterfall mechanics.
4. **Dead code in stress test** -- The `probBelow1x` variable (line 643) computes an incorrect value but is never used. Should be removed.

### Improvement Opportunities
1. **feeDragPercent uses mixed bases** -- grossMOIC is on invested capital, netMOIC is on committed capital. A consistent basis (both on committed) would be more meaningful for LP reporting.
2. **multipleOnCommittedCapital not surfaced** -- This is arguably the more important metric for LPs but is not prominently displayed in the ChartsPanel or grid analysis.
3. **Inconsistent capital deployment schedules** -- The IRR calculation uses a 4-year 30/35/25/10 pacing, while the J-curve uses a 6-year Cambridge Associates-based schedule. These should be reconciled.
4. **Missing GP catch-up in waterfall** -- The code comments reference catch-up but the simplified 80/20 split does not implement it. Either remove the comment or add a proper catch-up tranche.
5. **Percentile calculation** -- The floor-based nearest-rank method could be upgraded to linear interpolation for more accuracy at small sample sizes (relevant for grid analysis with fewer simulations per scenario).
6. **Equivalent combinations table** -- Uses `numCompanies - 1` for base return instead of `numCompanies - numNeeded`, slightly overstating the number of outliers required.
7. **Target capital in grid analysis** -- Assumes 100% follow-on utilization, overstating theoretical deployment. Consider using empirical average follow-on rates instead.
8. **Net IRR should be computed properly** -- Even if the current approximation is kept, it should be clearly labeled as "estimated" in the UI. The proper fix is to build net cash flows and run Newton-Raphson on those.
9. **cumulativeDistributions field naming** -- In YearlyFundMetrics, this field stores net distributions (after fee deduction), not gross. The name should reflect this.
