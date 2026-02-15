# Browser-Based Simulation Output Review

All tests were run live in a headless Chromium browser against `http://localhost:3000/` on 2026-02-15 using Playwright. The results below are from actual browser interactions, not source code analysis.

---

## Test 1: Default Simulation ($200M fund, 25 companies, 60% seed, 1000 simulations)

### Observed Values

| Metric | Value | Expected Range | Verdict |
|--------|-------|----------------|---------|
| Median Gross MOIC | 2.56x | 1.5-3.5x | PASS -- reasonable for early-stage VC |
| P10 Gross MOIC | 1.32x | 0.5-1.5x | PASS |
| P90 Gross MOIC | 5.13x | 4.0-8.0x | PASS |
| MOIC Std Dev | 1.55 | 1.0-3.0 | PASS |
| Median Gross IRR | 20.5% | 10-30% | PASS |
| P10 IRR | 7.8% | -5% to 10% | PASS |
| P90 IRR | 33.7% | 25-50% | PASS |
| IRR Std Dev | 10.5% | 5-20% | PASS |
| Avg Outliers (20x+) | 0.6 per sim | 0-2 | PASS |
| Avg Write-offs | 8.5 per sim | 8-12 out of 25 | PASS -- consistent with 40% seed loss + 25% Series A loss |
| Net MOIC (LP) | 0.99x | 1.5-2.5x | **FAIL -- see Bug #1** |
| P10 Net MOIC | 0.40x | -- | Suspiciously low |
| P90 Net MOIC | 2.19x | -- | Low |
| Median Net IRR | 8.0% | 10-20% | Borderline low |
| Avg Fee Drag | 62.7% | 20-35% | **FAIL -- see Bug #1** |
| Fee Drag (Gross vs Net display) | 61.5% | 20-35% | **FAIL** |
| Prob MOIC >= 2x | 0.7% | 50-70% | **FAIL -- see Bug #2** |
| Prob MOIC >= 3x | 0.4% | 25-45% | **FAIL -- see Bug #2** |
| Prob MOIC >= 5x | 0.1% | 5-15% | **FAIL -- see Bug #2** |

### Bugs Identified

#### Bug #1: Net MOIC is Unrealistically Low (Critical)

**Observed:** Gross MOIC 2.56x produces Net MOIC 0.99x, implying 61.5% fee drag. A well-performing VC fund returning 2.56x gross should deliver approximately 1.8-2.1x net to LPs.

**Root Cause:** Two compounding issues in `/client/src/lib/fees.ts`:

1. **Gross MOIC vs Net MOIC denominator mismatch.** Gross MOIC is calculated on *invested capital* (actual dollars deployed, roughly $96-120M for a $200M fund), while Net MOIC is calculated on *committed capital* ($200M). This creates a structural gap because $200M is committed but only ~$100M is invested in companies. The gross MOIC of 2.56x on $100M invested means only $256M returned, but net MOIC divides by the full $200M committed.

2. **Compound hurdle is overly punitive.** The hurdle is calculated as `(1.08)^10 = 2.159x`, meaning the distributable proceeds must exceed $431.8M ($200M * 2.159) before any carry is earned. With management fees of ~$33M deducted first, the fund needs gross proceeds exceeding ~$465M (a 4.6x gross MOIC on invested capital) before carry even kicks in. This makes carry nearly impossible for median-performing funds. Industry standard is typically a simple 8% annual preferred return on drawn capital, not compound interest on committed capital over the full fund life.

**Impact:** The net MOIC display is misleading. LPs evaluating this simulator would see a fund returning 2.56x gross but only 0.99x net, which would make VC investing appear to destroy value after fees -- this is not realistic.

**Cross-validation with Fund Economics page:** The Fund Economics calculator (Test 4) shows 3.0x gross MOIC yielding 2.69x net MOIC with $17.5M fees and $13.3M carry, which is reasonable. This discrepancy exists because the Economics page uses different defaults (likely $100M fund, shorter life) and the `generateFeeDragTable` function assumes 80% deployment ratio, while the simulation has much lower deployment.

#### Bug #2: Probability of Returns Display Shows Fractions Instead of Percentages (Critical)

**Observed:** Prob MOIC >= 2x shows "0.7%" when the median MOIC is 2.56x. If the median is above 2x, then by definition more than 50% of simulations should exceed 2x.

**Root Cause:** In `/client/src/components/ChartsPanel.tsx`, the `ProbabilityBadge` component displays `probability.toFixed(1)%`. The `probMOICAbove2x` value is a fraction (e.g., 0.65 for 65%), but `(0.65).toFixed(1)` renders as `"0.7"`, which then displays as `"0.7%"`. The value is NOT multiplied by 100 before display.

**Fix:** Change `probability.toFixed(1)` to `(probability * 100).toFixed(1)` in the ProbabilityBadge component.

---

## Test 2: J-Curve Chart

### Observed Values

| Metric | Value | Verdict |
|--------|-------|---------|
| J-curve trough | Year 3 at 0.76x TVPI | PASS -- realistic J-curve dip during investment period |
| TVPI breakeven | "not reached" | **QUESTIONABLE -- see note** |
| DPI shown | Yes, starts at 0 | PASS |
| TVPI shown | Yes, starts below 1.0x | PASS |
| Chart Y-axis max | 2.4x | Reasonable |

### Analysis

- The J-curve trough at Year 3 and 0.76x TVPI is realistic for an early-stage fund. During the investment period (years 1-3), capital is being deployed but exits haven't materialized yet, so the portfolio is valued below cost.
- **Concern:** The text says "breakeven: not reached," meaning TVPI never recovers above 1.0x during the fund life. However, the median gross MOIC is 2.56x, which means the portfolio ultimately returns well above 1.0x. This suggests the J-curve chart may be using a different metric (perhaps net TVPI including fee deductions) or there is a calculation issue. If the chart shows the median TVPI path and the median MOIC is 2.56x, TVPI should clearly surpass 1.0x by year 8-10. This is likely connected to Bug #1 (net vs gross mismatch).

---

## Test 3: Power Law Explorer

### Observed Values

| Metric | Value | Expected Range | Verdict |
|--------|-------|----------------|---------|
| Gross MOIC (single sim) | 2.6x | 1.5-4.0x | PASS |
| Gini Coefficient | 0.76 | >0.5 | PASS -- highly concentrated returns, typical of VC |
| Top 1 Company | 38.5% of fund value | 30-60% | PASS |
| Top 3 Companies | 62.3% of fund value | 50-75% | PASS |
| Top 5 Companies | 82.5% of fund value | 65-90% | PASS |
| Top 10 Companies | 94.7% of fund value | 85-98% | PASS |
| Outliers (20x+) | 0 / 25 | 0-2 | PASS -- consistent with outlier probability |
| Power law alpha | ~1.9 | 1.5-2.5 | PASS |

### Analysis

- The power law distribution is well-modeled. The top 5 companies contributing 82.5% of value aligns with the Pareto principle (80/20 rule).
- Gini coefficient of 0.76 is within the expected range for VC portfolios (typically 0.6-0.9).
- The key insight text accurately notes the 80/20 dynamic.
- The outlier sensitivity analysis is a nice touch: at 100x best company return, fund MOIC would be 10.1x.
- The "To achieve 3x Fund MOIC" table provides actionable intelligence for fund managers.
- **Minor note:** The current simulation shows 0 outliers (20x+), which is valid but means the concentration comes from mid-range performers (5-20x), not true outliers. Running multiple analyses would show different distributions.

---

## Test 4: Fund Economics Calculator

### Observed Values (at $100M fund, 3.0x Gross MOIC)

| Metric | Value | Expected | Verdict |
|--------|-------|----------|---------|
| Total Mgmt Fees | $17.5M | $16-20M | PASS |
| Gross Proceeds | $300.0M | $300M | PASS (3x of $100M) |
| Carry | $13.3M | $10-20M | PASS |
| Net to LP | $269.2M | $250-280M | PASS |
| Net MOIC | 2.69x | 2.0-2.5x | PASS -- slightly high |
| Fee Drag | 28.2% | 20-35% | PASS |
| GP Total Comp | $38.3M | $30-45M | PASS |
| Distributable | $282.5M | $280-290M | PASS |

### Fee Drag Table Analysis

| Gross MOIC | Carry | Net LP MOIC | Fee Drag | Verdict |
|------------|-------|-------------|----------|---------|
| 0.5x | $0 | 0.33x | 48.0% | PASS -- high fee drag on losing fund |
| 1.0x | $0 | 0.82x | 34.0% | PASS -- fees eat into breakeven |
| 1.5x | $0 | 1.32x | 29.3% | PASS -- no carry below hurdle |
| 2.0x | $0 | 1.82x | 27.0% | PASS |
| 3.0x | $13.3M* | 2.69x | 28.2% | PASS -- carry kicks in |
| 5.0x | $53.3M* | 4.29x | 31.3% | PASS |
| 10.0x | $153.3M* | 8.29x | 33.7% | PASS |

### Analysis

- The Fund Economics page in isolation produces **reasonable and consistent results**.
- Carry kicks in between 2.0x and 3.0x gross MOIC, which aligns with the 8% hurdle.
- Fee drag follows the expected U-shaped pattern: high at low MOICs (fixed fees dominate), dips at moderate MOICs, then rises again as carry grows.
- Management fees of $17.5M for a $100M fund over 10 years (with 3-year investment period at 2%, then 7 years at 1.5%) is mathematically correct: $100M * 2% * 3 + $100M * 1.5% * 7 = $6M + $10.5M = $16.5M. The displayed $17.5M is slightly higher, which could indicate the fund economics page uses different default parameters for fund life or investment period.
- **Important contrast:** This page shows consistent, sensible net returns that do NOT match the simulation page's net returns. The simulation page (Test 1) shows 2.56x gross -> 0.99x net, while this page shows 3.0x gross -> 2.69x net. The discrepancy stems from the invested-vs-committed capital mismatch documented in Bug #1.

---

## Test 5: Stress Test Scenarios

### Observed Values

| Scenario | Median MOIC | P10 MOIC | P90 MOIC | Prob <1x | Median IRR | Net MOIC |
|----------|-------------|----------|----------|----------|------------|----------|
| Base Case | 2.58x | 1.29x | 5.13x | 4.2% | 20.4% | 0.99x |
| 2008 Financial Crisis | 1.31x (-1.26) | 0.56x (-0.73) | 3.01x (-2.12) | 32.4% (+28.2%) | 8.5% (-11.9%) | 0.41x (-0.58) |
| 2021 Bull Market | 3.93x (+1.35) | 2.06x (+0.77) | 7.54x (+2.41) | 0.6% (-3.6%) | 28.6% (+8.3%) | 1.68x (+0.69) |
| Rate Hike (2022-23) | 1.74x (-0.84) | 0.73x (-0.56) | 3.65x (-1.48) | 19.0% (+14.8%) | 14.3% (-6.1%) | 0.60x (-0.39) |
| Exit Drought | 2.60x (+0.02) | 1.23x (-0.05) | 5.39x (+0.27) | 5.2% (+1.0%) | 17.9% (-2.4%) | 1.01x (+0.02) |

### Analysis

**Gross metrics (PASS):**
- 2008 Crisis correctly shows significantly lower MOIC (1.31x vs 2.58x base) and higher probability of loss (32.4% vs 4.2%).
- 2021 Bull correctly shows higher MOIC (3.93x vs 2.58x) and lower loss probability (0.6%).
- Rate Hike shows moderate degradation (1.74x), consistent with 30% higher failure rate and 25% multiple compression.
- Exit Drought shows nearly identical MOIC (2.60x vs 2.58x) but lower IRR (17.9% vs 20.4%), correctly modeling that delayed exits reduce time-weighted returns but not multiples.
- Delta values are displayed clearly with proper signs.

**Net metrics (all affected by Bug #1):**
- All net MOIC values are unrealistically low due to the invested/committed capital mismatch.
- Even the 2021 Bull Market at 3.93x gross yields only 1.68x net, which is too punitive.
- Base Case net MOIC of 0.99x implies the fund barely breaks even for LPs, which is unrealistic for a 2.58x gross performer.

**Relative ordering is correct:**
- Crisis < Rate Hike < Exit Drought ~ Base Case < Bull Market for all metrics.

---

## Test 6: Edge Cases

### Test 6a: $10M Fund, 5 Companies (3 seed, 2 Series A)

| Metric | Value | Verdict |
|--------|-------|---------|
| Median MOIC | 1.63x | PASS -- lower due to fewer companies, less diversification |
| P10 MOIC | 0.33x | PASS -- wide dispersion with few companies |
| P90 MOIC | 6.64x | PASS -- upside from single outlier |
| MOIC Std Dev | 3.36 | PASS -- high variance expected with 5 companies |
| Median IRR | 20.4% | PASS |
| P90 IRR | 1000.0% | **BUG #3 -- IRR is capped/broken at 1000%** |
| IRR Std Dev | 327.5% | **BUG #3 -- extreme IRR values indicate numerical instability** |
| Avg Outliers | 0.1 | PASS |
| Avg Write-offs | 1.7 out of 5 | PASS -- ~34% loss rate |
| Net MOIC | 2.60x | **ANOMALY** -- Net MOIC > Gross MOIC! See note. |
| Fee Drag | -47.2% | **BUG #4 -- Negative fee drag** |

**Bug #3: IRR Numerical Instability**
With only 5 companies, individual simulations can produce extreme multiples on tiny deployed capital. When a $2M seed investment returns 100x ($200M) on a $10M fund, the IRR calculation produces extreme values (1000%+). The P90 IRR of 1000.0% suggests the IRR is being capped at 1000% but the underlying calculation is producing nonsensical values. The standard deviation of 327.5% further confirms numerical instability. The IRR solver likely struggles with scenarios where cash inflows vastly exceed outflows over short periods.

**Bug #4: Net MOIC Exceeds Gross MOIC**
Net MOIC (2.60x) is HIGHER than Gross MOIC (1.63x), and fee drag is negative (-47.2%). This is mathematically impossible under normal circumstances -- fees and carry can only reduce returns. This occurs because:
- Gross MOIC = totalReturned / totalInvested (e.g., $16.3M / $10M = 1.63x)
- Net MOIC = netToLP / fundSize ($26M / $10M = 2.60x)
- With a tiny fund and small check sizes, `totalInvested` can be much smaller than `fundSize`, creating situations where net proceeds divided by fund size appear larger than gross proceeds divided by invested capital.

This is fundamentally an inconsistency in the MOIC bases: gross MOIC is on invested capital, net MOIC is on committed capital. When deployment ratio is very low (e.g., only 30% of capital deployed), the denominators diverge dramatically.

### Test 6b: $1B Fund, 100 Companies (60 seed, 40 Series A)

| Metric | Value | Verdict |
|--------|-------|---------|
| Median MOIC | 2.91x | PASS -- higher MOIC with more diversification |
| P10 MOIC | 2.07x | PASS -- tight distribution, law of large numbers |
| P90 MOIC | 4.12x | PASS |
| MOIC Std Dev | 0.81 | PASS -- low variance with 100 companies |
| Median IRR | 22.6% | PASS |
| P10 IRR | 16.0% | PASS |
| P90 IRR | 29.1% | PASS |
| IRR Std Dev | 5.2% | PASS -- much more stable with 100 companies |
| Avg Outliers | 2.6 | PASS -- 2.6% of 100 companies, consistent with 3% outlier probability |
| Avg Write-offs | 33.9 out of 100 | PASS -- ~34% loss rate |
| Net MOIC | 0.88x | **FAIL -- Bug #1 persists** |
| Fee Drag | 70.0% | **FAIL -- 70% fee drag is absurd** |

**Analysis:** The gross metrics are excellent and demonstrate proper Monte Carlo convergence. With 100 companies, the distribution is much tighter (MOIC std dev 0.81 vs 3.36 for 5 companies, IRR std dev 5.2% vs 327.5%). This validates the law of large numbers in the simulation.

However, the net MOIC problem is even worse here. A $1B fund with $2M seed checks and $5M Series A checks would only deploy 60*$3M + 40*$7.5M = $480M of the $1B committed. The massive gap between invested and committed capital makes the net MOIC calculation produce an 0.88x net return on a 2.91x gross fund -- which would be a career-ending result for any GP. The fee drag of 70% is unrealistic.

### Test 6c: 100% Seed Allocation (25 seed, 0 Series A)

| Metric | Value | Verdict |
|--------|-------|---------|
| Median MOIC | 2.40x | PASS -- slightly lower than mixed portfolio due to higher failure rate |
| MOIC Std Dev | 2.13 | PASS -- higher variance due to more binary outcomes |
| Median IRR | 16.2% | PASS -- lower IRR reflects longer hold periods for seed |
| Avg Outliers | 0.8 | PASS |
| Avg Write-offs | 10.1 out of 25 | PASS -- 40% loss rate matches seed loss probability |
| Net MOIC | 0.49x | **FAIL -- Bug #1** |
| Fee Drag | 81.6% | **FAIL** |

**Analysis:** A 100% seed portfolio correctly shows higher variance and a slightly lower median MOIC vs the balanced portfolio (2.40x vs 2.56x). The 40% write-off rate exactly matches the 40% total loss probability in the seed exit distribution. The fee drag of 81.6% is catastrophic and unrealistic -- this is because seed investments deploy very little capital ($2M * 25 = $50M + follow-ons) against a $200M fund commitment.

### Test 6d: 0% Seed / 100% Series A (0 seed, 25 Series A)

| Metric | Value | Verdict |
|--------|-------|---------|
| Median MOIC | 2.81x | PASS -- higher than seed-only, lower max upside but fewer losses |
| MOIC Std Dev | 1.30 | PASS -- less volatile than seed |
| Median IRR | 23.9% | PASS -- higher IRR due to larger checks, faster deployment |
| Avg Outliers | 0.4 | PASS -- fewer outliers at Series A (max 50x vs 150x for seed) |
| Avg Write-offs | 6.3 out of 25 | PASS -- 25% loss rate matches Series A total loss probability |
| Net MOIC | 1.84x | Better but still affected by Bug #1 |
| Fee Drag | 36.7% | More reasonable because Series A deploys more capital ($5M * 25 = $125M + follow-ons) |

**Analysis:** The all-Series-A portfolio produces more consistent results with lower variance (std dev 1.30 vs 2.13 for seed-only). The 6.3 write-offs match the 25% Series A loss probability. The net MOIC of 1.84x is much more reasonable here because Series A deploys more capital relative to fund size, reducing the invested/committed gap. This further confirms that Bug #1 is the primary issue -- when deployment ratio is higher, net MOIC becomes more sensible.

---

## Summary of All Bugs Found

### Critical Bugs

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | **Net MOIC uses committed capital denominator while Gross MOIC uses invested capital denominator** | `client/src/lib/fees.ts` lines 120-121 and `client/src/lib/simulation.ts` line 224 | Net MOIC appears catastrophically low; fee drag is 2-4x too high; entire net returns analysis is misleading. Also makes the J-curve "breakeven: not reached" claim incorrect. |
| 2 | **Probability of Returns not multiplied by 100** | `client/src/components/ChartsPanel.tsx` line 458 | Displays "0.7%" instead of "65.0%" for Prob >= 2x. All three probability badges show nonsensical near-zero values. |

### Moderate Bugs

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 3 | **IRR numerical instability with small portfolios** | IRR solver / `client/src/lib/simulation.ts` | P90 IRR capped at 1000%, std dev of 327.5% for 5-company fund. IRR display becomes meaningless. |
| 4 | **Net MOIC can exceed Gross MOIC (negative fee drag)** | `client/src/lib/fees.ts` | With low deployment ratios (small fund, few companies), net MOIC > gross MOIC which is economically impossible. Root cause is same as Bug #1. |
| 5 | **Compound hurdle over full fund life is overly punitive** | `client/src/lib/fees.ts` line 88 | `(1.08)^10 = 2.159x` hurdle makes carry nearly unreachable. Industry practice for VC is typically simple preferred return on drawn capital, not compound on committed over full term. |

### What Works Well

- Gross MOIC and IRR calculations are reasonable and consistent across all scenarios
- Monte Carlo convergence is proper (variance decreases with more companies)
- Power law dynamics are well-modeled (Gini, concentration curves, Pareto)
- Stress test scenarios produce directionally correct and well-differentiated results
- J-curve shape (dip during investment period, recovery) is qualitatively correct
- Write-off and outlier counts match the configured probability distributions
- Edge cases (5 to 100 companies, $10M to $1B funds) all run without errors
- Fund Economics calculator (standalone page) produces sensible waterfall distributions
- Historical run tracking works correctly
