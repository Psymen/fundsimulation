# VC Fund Simulation -- Parameter & Logic Review

**Reviewer:** VC Fund Analyst
**Date:** 2026-02-15
**Scope:** All default values, parameter ranges, distribution assumptions, fee calculations, and simulation logic

---

## 1. Default Portfolio Parameters (`defaults.ts`)

### 1.1 Fund Size: $200M

- **Current value:** $200M
- **Assessment:** This is on the larger side for an "early-stage" VC fund. Typical early-stage (seed + Series A) funds range $50M-$300M. First-time funds are usually $30M-$100M; established firms run $150M-$500M. $200M is reasonable for an established early-stage manager.
- **Rating:** Correct

### 1.2 Number of Portfolio Companies: 25

- **Current value:** 25
- **Assessment:** For a $200M fund doing $2M seed and $5M Series A checks, 25 companies is within the normal range (20-40 for early stage). With 60% seed / 40% Series A, that is 15 seed ($2M each = $30M initial) and 10 Series A ($5M each = $50M initial), totaling $80M in initial checks, leaving $120M for follow-ons and fees. Reasonable.
- **Rating:** Correct

### 1.3 Stage Mix: 60% Seed / 40% Series A

- **Current value:** 60% seed, 40% Series A
- **Assessment:** This is a plausible mix for a "seed-plus" or multi-stage early fund. Pure seed funds do 100% seed; pure Series A funds do 100% Series A. A 60/40 split reflects a fund that leads seed rounds and selectively writes Series A checks. Reasonable.
- **Rating:** Correct

### 1.4 Average Check Sizes: $2M Seed, $5M Series A

- **Current value:** $2M seed, $5M Series A
- **Assessment:** As of 2024-2025 data (Carta, PitchBook), median seed round size is $3-4M and median Series A is $10-15M. A $2M seed check implies leading or co-leading a seed round (typical lead takes 50-75% of the round). A $5M Series A check implies a co-lead or a smaller lead. These are reasonable for a fund that sizes positions modestly.
- **Rating:** Approximately Correct
- **Note:** $2M seed is slightly below the current median lead check but defensible. $5M Series A is on the low side for a lead but reasonable as a co-lead or for capital-efficient companies.

### 1.5 Follow-on Reserve Ratio: 50%

- **Current value:** 50% for both stages
- **Assessment:** Industry standard follow-on reserves range 30-60% of initial capital. A 50% reserve means for every $2M seed check, $1M is reserved for follow-on. This is within the normal range. Some larger funds reserve 60-70%.
- **Rating:** Correct

### 1.6 Target Ownership: 15% Seed, 12% Series A

- **Current value:** 15% at seed, 12% at Series A
- **Assessment:** For seed, a $2M check buying 15% implies a $13.3M post-money valuation, which is reasonable for seed. For Series A, a $5M check buying 12% implies a $41.7M post-money, which is below current medians (~$50-60M) but plausible for capital-efficient companies. Note: these ownership figures are not currently used in the simulation logic (return multiples are sampled from buckets, not derived from entry valuation), so they are informational only.
- **Rating:** Approximately Correct

### 1.7 Investment Period: 3 Years

- **Current value:** 3 years
- **Assessment:** Most VC fund LPAs specify a 3-5 year investment period. 3 years is on the shorter side but common for smaller, more focused funds. However, with the capital call schedule extending to year 6 (in `fund-metrics.ts`), there is an inconsistency -- the investment period is 3 years but capital calls continue to year 6.
- **Rating:** Needs Adjustment
- **Recommendation:** Either extend the investment period to 4-5 years (more standard) or tighten the capital call schedule to match the 3-year period. A 5-year investment period with 10-year fund life is the most common structure.

### 1.8 Fund Life: 10 Years

- **Current value:** 10 years
- **Assessment:** Standard. Most VC funds have a 10-year life with optional 1-2 year extensions.
- **Rating:** Correct

### 1.9 Exit Window: 3-10 Years

- **Current value:** 3 years minimum, 10 years maximum
- **Assessment:** The 3-year minimum is reasonable (early acqui-hires can happen in 2-3 years). The 10-year maximum matches fund life but in practice exits can extend to years 12-14 with extensions. The exit timing model in `distributions.ts` allows exits up to `exitWindowMax + 2` (year 12), which partially addresses this.
- **Rating:** Approximately Correct

### 1.10 Number of Simulations: 1,000

- **Current value:** 1,000
- **Assessment:** For Monte Carlo convergence with 25 companies and the given distribution parameters, 1,000 simulations is adequate for median estimates (standard error on median MOIC is roughly +/- 2-3%). For tail statistics (P5, P95), 5,000-10,000 would be better. 1,000 is a reasonable default balancing accuracy and browser performance.
- **Rating:** Approximately Correct

### 1.11 Fee Structure: 2/20, 1.5% Step-Down, 8% Hurdle, 2% GP Commit

- **Current value:** 2% management fee, 1.5% step-down, 20% carry, 8% hurdle, 2% GP commit
- **Assessment:** This is the industry standard "2 and 20" structure. The 1.5% step-down after the investment period is standard. The 8% hurdle rate is standard for VC funds that use a hurdle (though many early-stage VC funds do NOT have a hurdle rate -- this is more common in buyout/growth). The 2% GP commit is within the typical 1-5% range.
- **Rating:** Approximately Correct
- **Note:** Many early-stage VC funds operate without a hurdle rate. Having 8% as default is conservative for LPs but not universal. Consider noting this in the UI.

---

## 2. Exit Distribution Buckets

### 2.1 Seed Exit Buckets

| Bucket | Probability | Min Multiple | Max Multiple |
|--------|-------------|-------------|-------------|
| Total Loss | 40% | 0x | 0x |
| Partial Loss | 20% | 0.1x | 0.5x |
| Near Break-even | 15% | 0.5x | 1.5x |
| Mid Return | 15% | 1.5x | 5x |
| High Return | 7% | 5x | 20x |
| Outlier | 3% | 20x | 150x |

**Probability sum:** 40 + 20 + 15 + 15 + 7 + 3 = 100. Correct.

**Assessment against empirical data:**

- **Total Loss (40%):** Correlation Ventures data (2004-2013) shows ~65% of deals return less than 1x capital. CB Insights reports ~70% of startups fail. However, "Total Loss" (0x) specifically is different from "below 1x." The Kauffman Foundation finds about 30-40% of VC-backed companies return nothing to investors. 40% total loss for seed is reasonable.
- **Partial Loss (20%):** Combined with Total Loss, 60% of seed investments return less than 0.5x. This aligns with data showing ~60-65% of seed investments lose most capital.
- **Near Break-even (15%):** This brings the cumulative "below 1.5x" to 75%, consistent with empirical data showing ~75% of VC investments return less than 1.5x.
- **Mid Return (15%):** Companies returning 1.5-5x. This is the "base hit" category. 15% is consistent with data.
- **High Return (7%):** 5-20x returns. Represents successful M&A exits and smaller IPOs. Reasonable.
- **Outlier (3%):** 20-150x. At seed stage, ~2-5% of investments produce 20x+ returns. 3% is within range. The 150x cap is reasonable -- some seed investments in companies like Uber or Airbnb returned 1,000x+, but capping at 150x for simulation purposes prevents unrealistic skew. However, this cap meaningfully reduces the expected value of the outlier bucket.

**Rating:** Approximately Correct
**Note:** The 150x cap on seed outliers is conservative. Empirically, the very best seed investments (top 0.1-0.5%) can return 500-1,000x+. This cap will cause the simulation to slightly underestimate the right tail of returns, but for most portfolio-level analysis this is acceptable because such extreme outliers are exceedingly rare.

### 2.2 Series A Exit Buckets

| Bucket | Probability | Min Multiple | Max Multiple |
|--------|-------------|-------------|-------------|
| Total Loss | 25% | 0x | 0x |
| Partial Loss | 20% | 0.1x | 0.5x |
| Near Break-even | 15% | 0.5x | 1.5x |
| Mid Return | 25% | 1.5x | 5x |
| High Return | 12% | 5x | 15x |
| Outlier | 3% | 15x | 50x |

**Probability sum:** 25 + 20 + 15 + 25 + 12 + 3 = 100. Correct.

**Assessment:**

- **Total Loss (25%):** Series A companies have product-market fit signals, so the failure rate is lower than seed. Industry data suggests 30-40% of Series A companies fail to return capital. 25% total loss may be slightly optimistic.
- **Mid Return (25%):** Higher than seed's 15%, reflecting that more Series A companies achieve moderate exits. Reasonable.
- **High Return (12%):** 5-15x range, capped lower than seed (15x vs 20x) reflecting higher entry valuations. Reasonable.
- **Outlier (3%):** 15-50x cap. This is reasonable for Series A -- with higher entry prices, the maximum multiple is naturally compressed.

**Rating:** Approximately Correct
**Note:** The 25% total loss rate for Series A may be slightly optimistic. 30-35% would be more conservative and better aligned with empirical data. However, this is partially offset by the 20% partial loss bucket.

---

## 3. Distribution Sampling (`distributions.ts`)

### 3.1 Pareto Alpha = 2.0 for Outlier Bucket

- **Current value:** alpha = 2.0
- **Assessment:** Academic research on VC returns (Cochrane 2005, Ewens et al. 2013) estimates power law exponents for VC returns in the range of 1.5-2.5. Alpha = 2.0 means the expected value of a Pareto draw is 2 * xMin (for unbounded case). This places most outlier draws near the minimum of the range with a fat tail. This is consistent with VC data.
- **Rating:** Correct

### 3.2 Log-Normal Skew = 0.7

- **Current value:** sigma = 0.7 (used as the standard deviation parameter for log-normal sampling)
- **Assessment:** A log-normal with sigma = 0.7 has moderate right skew (skewness coefficient ~2.5). This means within each bucket, most draws cluster near the lower end of the range. This is appropriate -- within the "Mid Return" bucket (1.5x-5x), most exits should cluster near 2-3x rather than near 5x. The log-normal mode is set at 20% of the range, which further ensures realistic clustering.
- **Rating:** Correct

### 3.3 Exit Timing Model

- **Current values:**
  - Total loss: mean 4.5 years (+ 0.5 for seed)
  - Partial loss: mean 5.5 years (+ 0.5 for seed)
  - Moderate success: mean 6.0 years (+ 0.7 for seed)
  - Strong exit: mean 7.0 years (+ 0.8 for seed)
  - Outlier/IPO: mean 8.5 years (+ 1.0 for seed)

**Assessment:** This timing model is well-calibrated:
- Failed companies typically wind down in 2-5 years. Mean of 4.5 is slightly long but reasonable if including zombie companies that take years to officially shut down.
- Cambridge Associates data shows median time-to-exit for successful companies is 6-8 years.
- IPO exits typically take 7-12 years from initial funding.
- The seed premium (+0.5 to +1.0 years) is appropriate since seed companies are earlier stage.

**Rating:** Correct

---

## 4. Fee Calculations (`fees.ts`)

### 4.1 Management Fee Calculation

- **Current logic:** `fundSize * feeRate * investmentPeriod` + `fundSize * stepDownRate * (fundLife - investmentPeriod)`
- **Assessment:** This calculates fees on committed capital for the full fund life, which is the most common approach. Some funds switch to invested (net invested) capital basis after the investment period, which would result in lower post-period fees. The current approach is conservative (from the LP perspective) and standard.
- **Numerical check:** $200M * 2% * 3 years = $12M + $200M * 1.5% * 7 years = $21M. Total = $33M (16.5% of fund). This is high but realistic for a 2/20 fund.
- **Rating:** Correct

### 4.2 European Waterfall Implementation

- **Current logic:**
  1. Subtract management fees from gross proceeds to get distributable
  2. If distributable <= LP capital: all to LPs, no carry
  3. If distributable <= hurdle amount: all to LPs, no carry
  4. If above hurdle: carry on excess above hurdle amount

- **Assessment:** There is an issue with the waterfall. A proper European waterfall should:
  1. Return LP capital first
  2. Pay preferred return (hurdle) on LP capital
  3. GP catch-up (GP receives 100% until they have received carry% of total profits)
  4. Remaining split LP/GP at (1-carry%)/carry%

  The current implementation **skips the GP catch-up**. After the hurdle is met, it applies carry only on the excess above the hurdle amount, not on total profits. In a true European waterfall with catch-up, the GP should receive 100% of distributions after the hurdle until they "catch up" to their carry percentage of total profits, then the remaining is split 80/20.

  Without catch-up, the GP receives less carry than intended. This is actually a valid structure (European waterfall without catch-up), but the code comments say "GP catch-up to carry %" while the implementation does not perform a catch-up.

- **Rating:** Needs Adjustment
- **Impact:** Medium. The carry calculation is lower than what a typical GP catch-up provision would yield. Either implement the catch-up correctly or update the comments to state "European waterfall without full catch-up."

### 4.3 Hurdle Rate Calculation

- **Current logic:** `hurdleMultiple = (1 + hurdleRate/100) ^ fundLife`, then `hurdleAmount = lpCapital * hurdleMultiple`
- **Assessment:** The hurdle is computed as compound interest over the entire fund life. With 8% over 10 years, the hurdle multiple is 2.16x, meaning LPs need 2.16x their capital before the GP earns carry. This is very aggressive -- it means the fund needs a 2.16x net MOIC before carry kicks in.

  In practice, most VC fund hurdles are calculated on a **time-weighted basis** tied to when capital was actually called and returned, not on the full fund life. A compound 8% hurdle over 10 years on committed capital is an unusually high bar. Many funds use a simple preferred return (8% per year on called capital, not compounded on committed capital).

  The current implementation effectively means: at 3x gross MOIC, after $33M in fees, distributable is $567M. The hurdle amount is $200M * 2.16 = $432M. Excess = $135M. Carry = $27M. Net to LP = $432M + $108M = $540M. Net MOIC = 2.70x.

- **Rating:** Needs Adjustment
- **Recommendation:** The hurdle calculation should ideally be based on called capital and timing of calls/distributions, not a blanket compound over fund life. However, for a simplified model, using committed capital with compound hurdle is a defensible approximation -- it is just notably more GP-unfavorable than reality. Document this assumption clearly.

### 4.4 Fee Drag Calculation

- **Current logic:** `feeDrag = ((grossMOIC - netMOIC) / grossMOIC) * 100`
- **Assessment:** This is a standard way to express fee drag as a percentage of gross returns. Correct.
- **Rating:** Correct

### 4.5 GP Commit Return

- **Current logic:** GP commit gets pro-rata return based on gross proceeds / total invested
- **Assessment:** This is a simplification. In reality, the GP commit participates as LP capital (gets preferred return, etc.). The current approach gives the GP commit a return based on gross MOIC rather than net MOIC, which slightly overstates GP economics. Minor issue.
- **Rating:** Approximately Correct

---

## 5. Fund Metrics (`fund-metrics.ts`)

### 5.1 Capital Call Schedule

- **Current schedule:** 25% / 55% / 80% / 92% / 97% / 100% cumulative by years 1-6

| Year | Cumulative | Marginal |
|------|-----------|----------|
| 1 | 25% | 25% |
| 2 | 55% | 30% |
| 3 | 80% | 25% |
| 4 | 92% | 12% |
| 5 | 97% | 5% |
| 6 | 100% | 3% |

- **Assessment:** Cambridge Associates data shows typical early-stage VC capital call pacing: ~20-30% in year 1, ~50-60% cumulative by year 2, ~70-85% by year 3. The schedule here is consistent with this. However, with a 3-year investment period, having capital calls in years 4-6 is inconsistent -- follow-on investments typically come from reserves already called. This should be tied to the `investmentPeriod` parameter.
- **Rating:** Approximately Correct
- **Note:** The disconnect between the 3-year investment period and 6-year call schedule should be resolved. Either extend the investment period or compress the call schedule.

### 5.2 Interim Markup Model

- **Current logic:** Square-root progression from 1.0x to final multiple, with 0.7x discount factor for unrealized gains. Failed companies written down linearly.
- **Assessment:** This is a simplified but reasonable approach. In practice, VC markups follow a step-function pattern (markups at each funding round). The square-root progression (slower early, faster late) captures the general shape. The 0.7x discount on unrealized gains is conservative and appropriate for NAV reporting.
- **Rating:** Approximately Correct

### 5.3 DPI / RVPI / TVPI Calculations

- **Current logic:**
  - DPI = net distributions / capital called
  - RVPI = unrealized value / capital called
  - TVPI = DPI + RVPI

- **Assessment:** Standard definitions, correctly implemented. One subtlety: net distributions are calculated as `cumulativeDistributions - cumulativeFees`, which is correct for net-of-fees reporting. The only concern is that management fees are being deducted from distributions rather than from called capital, which can create oddities in early years (negative net distributions). The `Math.max(0, ...)` prevents this.
- **Rating:** Correct

---

## 6. Benchmarks (`benchmarks.ts`)

### 6.1 Benchmark Values

| Quartile | MOIC | IRR |
|----------|------|-----|
| Top Quartile | 4.5x | 35% |
| Median | 2.5x | 20% |
| Bottom Quartile | 1.2x | 5% |

- **Assessment:** These are gross (pre-fee) benchmarks. Comparing against Cambridge Associates data for US VC (2010-2020 vintages):
  - **Top Quartile MOIC:** Cambridge reports 2.5-3.5x net MOIC for top quartile VC. Grossing up by ~20-30% for fees gives 3.0-4.5x gross. 4.5x is at the high end but achievable for the best funds.
  - **Median MOIC:** Cambridge reports ~1.5-2.0x net MOIC for median VC. Grossing up gives ~1.8-2.5x gross. 2.5x is at the high end of median.
  - **Bottom Quartile MOIC:** Cambridge reports ~0.8-1.2x net MOIC. Grossing up gives ~1.0-1.5x gross. 1.2x is reasonable.
  - **Top Quartile IRR (35%):** This is very high. Cambridge data shows top quartile net IRR of ~20-30% for recent vintages. 35% gross is ambitious but possible for the very best funds.
  - **Median IRR (20%):** Median net IRR for VC is typically 10-15%. 20% gross is on the high side.
  - **Bottom Quartile IRR (5%):** Reasonable.

- **Rating:** Needs Adjustment
- **Recommendation:** The benchmarks are slightly optimistic, particularly for median. Consider:
  - Top Quartile: 3.5x MOIC, 28% IRR (gross)
  - Median: 2.0x MOIC, 15% IRR (gross)
  - Bottom Quartile: 1.2x MOIC, 3% IRR (gross)

  Alternatively, clearly label these as "gross of fees" and note they represent strong vintage years (2010-2020 benefited from a strong exit environment).

---

## 7. Stress Test Scenarios (`ScenarioStressTest.tsx`)

### 7.1 2008 Financial Crisis Scenario

- **Modifiers:** Failure rate x1.5, multiples x0.65, exit window +2.5 years
- **Assessment:** During the 2008-2009 downturn:
  - VC-backed company failure rates increased ~30-50%. x1.5 is reasonable.
  - Exit multiples compressed significantly (40-50% decline in M&A multiples, IPO window closed). x0.65 (35% compression) is slightly conservative; x0.55-0.60 might be more accurate for the worst of the crisis.
  - Exit timelines extended by 2-3 years on average. +2.5 years is appropriate.
- **Rating:** Approximately Correct

### 7.2 2021 Bull Market Scenario

- **Modifiers:** Failure rate x0.8, multiples x1.4, exits -1 year
- **Assessment:** During 2020-2021:
  - Failure rates decreased as cheap capital was abundant. x0.8 is reasonable.
  - Exit multiples expanded dramatically (2-3x expansion in public SaaS multiples). x1.4 may actually understate the 2021 environment; x1.6-2.0 would better reflect the peak.
  - Exits happened faster (SPAC boom, rapid IPOs). -1 year is conservative; -1.5 to -2 years might be more accurate.
- **Rating:** Approximately Correct
- **Note:** The 2021 scenario could be more extreme to better reflect the actual froth of that period.

### 7.3 Rate Hike (2022-23) Scenario

- **Modifiers:** Failure rate x1.3, multiples x0.75, exit window +1.5 years
- **Assessment:** During the 2022-2023 rate hike cycle:
  - Startup failure rates increased as funding dried up. x1.3 is reasonable.
  - Multiples compressed ~25-50% depending on sector. x0.75 (25% compression) is in the right range, possibly slightly conservative.
  - Exit timelines extended significantly (IPO window closed, M&A slowed). +1.5 years is reasonable.
- **Rating:** Approximately Correct

### 7.4 Exit Drought Scenario

- **Modifiers:** Exit window 7-12 years
- **Assessment:** This scenario models a prolonged period where exits are delayed. Pushing the exit window to 7-12 years is reasonable for modeling an environment where IPO and M&A markets are frozen.
- **Rating:** Correct

---

## 8. Power Law Explorer (`PowerLawExplorer.tsx`)

### 8.1 Theoretical Power Law Alpha = 1.9

- **Current value:** alpha = 1.9 for the theoretical curve `C / rank^(alpha-1)`
- **Assessment:** This means returns decay as `rank^0.9`. Academic literature (Ewens, Jones & Rhodes-Kropf 2013) estimates the Pareto exponent for VC returns at ~1.5-2.5 depending on the sample and methodology. Alpha = 1.9 is within this range and produces a realistic-looking power law curve.
- **Rating:** Correct

### 8.2 Outlier Sensitivity Calculations

- **Current logic:** Replaces the best company's return with a slider value (10x-500x) and recalculates fund MOIC.
- **Assessment:** The calculation is mathematically correct: it takes the best company's invested capital, multiplies by the slider value, adds the rest of the portfolio's returns, and divides by total invested. This clearly demonstrates how a single outlier impacts fund performance.
- **Rating:** Correct

### 8.3 Equivalent Combinations Table

- **Current logic:** Assumes remaining companies average 0.5x return, then calculates how many companies at each multiple are needed to hit 3x fund MOIC.
- **Assessment:** The 0.5x base case for non-outlier companies is reasonable (typical VC portfolio ex-outliers returns ~0.3-0.7x on average). The calculation logic is correct.
- **Rating:** Correct

---

## 9. Fund Economics Calculator (`FundEconomics.tsx`)

### 9.1 Fund Size Sensitivity Range: $25M - $1B

- **Current values:** [25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000] (in $M)
- **Assessment:** This covers the full range from micro-VC ($25M) to large platform funds ($1B). The granularity is good with more data points at the smaller end where fee drag sensitivity is highest. Reasonable.
- **Rating:** Correct

### 9.2 GP vs LP Table: Non-linear Fee Drag

- **Assessment:** The table correctly shows how fee drag is highest at low MOICs (fixed management fees as a % of smaller returns) and how carry adds additional non-linear drag at higher MOICs. The implementation is correct.
- **Rating:** Correct

### 9.3 FundEconomics Default Investment Period

- **Current value:** Investment period defaults to 5 years in the Fund Economics page, while the simulation defaults use 3 years.
- **Assessment:** This inconsistency could confuse users. The Fund Economics page uses 5 years (more standard), while the simulation defaults to 3 years.
- **Rating:** Needs Adjustment
- **Recommendation:** Align defaults. 5 years is the more standard investment period.

---

## 10. Grid Analysis (`grid-analysis.ts`)

### 10.1 Commentary Generation

- **Assessment:** The commentary logic analyzes:
  - Overall MOIC range and averages
  - Seed-heavy vs Series A-heavy performance
  - Concentrated vs diversified portfolio trade-offs
  - Capital deployment efficiency

  The thresholds used (e.g., 75% seed = "seed-heavy", 25% seed = "Series A-heavy", 1.1x multiplier for "significantly better") are reasonable heuristics. The commentary is well-structured and provides actionable insights.
- **Rating:** Correct

### 10.2 Best Strategy Identification

- **Assessment:** The four criteria (highest MOIC, highest IRR, best downside protection via P10, most capital efficient) are appropriate dimensions for portfolio optimization. The efficiency score (MOIC * deployment%) is a reasonable composite metric. The inclusion of "worst strategies" with the same framework provides good balance.
- **Rating:** Correct

---

## 11. Simulation Engine (`simulation.ts`)

### 11.1 Follow-on Investment Logic

- **Current logic:** Companies with return multiple >= 1.0x receive follow-on. Participation rate and follow-on multiple scale with the company's return multiple:
  - 10x+: 90-100% participation, 2-4x the initial check
  - 5-10x: 70-90% participation, 1.5-2.5x
  - 3-5x: 50-70% participation, 1-1.5x
  - 2-3x: 30-50% participation, 0.5-1x
  - 1-2x: 10-30% participation, 0.2-0.5x

- **Assessment:** This is a **forward-looking** model (it uses the final return multiple to decide follow-on), which is unrealistic -- in practice, VCs decide follow-on at the time of the next round, without knowing the ultimate outcome. However, as a simplification for Monte Carlo, it captures the directional relationship: better-performing companies get more follow-on capital. The participation rates and multiples are reasonable.

  There is a subtle issue: the follow-on capital is applied at the same return multiple as the initial investment. In reality, follow-on rounds are at higher valuations, so the return multiple on follow-on capital is lower than on the initial check. This causes the simulation to **overstate returns on follow-on capital**.

- **Rating:** Needs Adjustment
- **Impact:** Medium-High. By applying the same return multiple to follow-on capital invested at later (higher valuation) rounds, the simulation systematically overstates returns. Follow-on capital typically returns 0.3-0.5x the multiple of the initial check. A discount factor of 0.4-0.6x on the return multiple for follow-on capital would be more realistic.

### 11.2 IRR Calculation (Newton-Raphson)

- **Current logic:** Standard Newton-Raphson with initial guess 0.15, max 100 iterations, tolerance 0.0001. Clamped to [-0.99, 10.0].
- **Assessment:** The implementation is mathematically correct:
  - NPV = sum of cashFlows[j] / (1+irr)^t
  - dNPV/dirr = sum of -t * cashFlows[j] / (1+irr)^(t+1)
  - Update: irr = irr - NPV/dNPV

  The clamping prevents divergence. The tolerance of 0.0001 (0.01%) is adequate for portfolio-level analysis. The initial guess of 15% is reasonable for VC returns.
- **Rating:** Correct

### 11.3 Capital Deployment Pacing: [30%, 35%, 25%, 10%]

- **Current value:** Year 1: 30%, Year 2: 35%, Year 3: 25%, Year 4: 10% (if 4-year period)
- **Assessment:** For the default 3-year investment period, only the first 3 weights are used (30/35/25 = 90%, with the remaining 10% not deployed). Wait -- looking more carefully at the code, if `investmentPeriodYears` is 3, the loop runs for years 0, 1, 2, using weights [0.30, 0.35, 0.25]. This sums to 0.90, meaning 10% of capital is not deployed in the outflows. This is actually incorrect for IRR calculation -- all invested capital should be accounted for.

  Actually, reviewing more carefully: the pacing weights are applied to `totalInvestedCapital` (the sum of actual investments made), not to fund size. So 100% of invested capital is deployed but the timing is split 30/35/25 across 3 years (sum = 90%). The remaining 10% of invested capital is not accounted for in cash flows, which creates an IRR calculation error.

- **Rating:** Needs Adjustment
- **Impact:** Medium. The pacing weights for a 3-year period sum to only 90%, meaning 10% of invested capital has no timing in the cash flow model. This biases IRR calculations. The weights should sum to 100% for the given investment period. For a 3-year period, use [0.35, 0.40, 0.25] or [0.30, 0.35, 0.35].

### 11.4 Net IRR Approximation

- **Current logic:** `netIRR = grossIRR * (1 - feeDragPercent/100)` for positive IRR; `netIRR = grossIRR` for negative IRR.
- **Assessment:** This is a rough approximation. Fee drag on MOIC does not translate linearly to fee drag on IRR because IRR is time-weighted while MOIC is not. In practice:
  - For moderate returns (1.5-3x MOIC), this approximation can overstate or understate net IRR by 2-5 percentage points.
  - The proper approach is to model fee cash flows (management fee payments, carry distributions) in the IRR calculation.

  However, for a simulation tool providing directional guidance, this approximation is acceptable if documented.

- **Rating:** Approximately Correct
- **Note:** Consider adding a disclaimer that net IRR is approximate. For precise net IRR, the simulation would need to model the timing of management fee payments and carry distributions.

---

## 12. Additional Issues Identified

### 12.1 Follow-on Returns Not Discounted

- **Location:** `simulation.ts`, line 167: `const returnedCapital = investedCapital * returnMultiple`
- **Issue:** Both initial check and follow-on capital earn the same `returnMultiple`. In reality, follow-on investments are made at higher valuations, so they earn a lower multiple. A company that returns 10x on a seed check would typically return 3-5x on the Series A/B follow-on check.
- **Impact:** High. This systematically inflates the returns of the best-performing companies (which receive the most follow-on) and therefore inflates overall fund returns.
- **Recommendation:** Apply a discount factor to `returnMultiple` for follow-on capital. A factor of 0.4-0.6x is typical (e.g., if the company returns 10x on initial check, follow-on returns 4-6x).

### 12.2 Management Fees Deducted from Proceeds, Not from Committed Capital

- **Location:** `fees.ts`, line 82: `const distributable = Math.max(0, grossProceeds - managementFees)`
- **Issue:** In the waterfall, management fees are deducted from gross proceeds. In reality, management fees are paid from committed capital (drawn down via capital calls), reducing the amount available for investment. The simulation handles this correctly for `calculateDeployableCapital()` but the waterfall deducts fees from proceeds, which is a different accounting approach.
- **Impact:** Low. Both approaches yield approximately the same net result for LPs, but the current approach slightly misrepresents the timing and source of fee payments.
- **Rating:** Approximately Correct

---

## Summary: Items Needing Adjustment, Ranked by Impact

| Rank | Item | Current | Recommended | Impact | File |
|------|------|---------|-------------|--------|------|
| 1 | Follow-on returns not discounted for higher entry price | `returnedCapital = investedCapital * returnMultiple` | Apply 0.4-0.6x discount factor on `returnMultiple` for follow-on portion | **High** -- systematically inflates top-performer returns | `simulation.ts:167` |
| 2 | IRR pacing weights don't sum to 100% for 3-year period | [0.30, 0.35, 0.25] = 90% | [0.35, 0.40, 0.25] = 100% | **Medium** -- biases IRR calculation | `simulation.ts:236` |
| 3 | European waterfall comments say "catch-up" but no catch-up is implemented | Carry on excess above hurdle only | Either implement catch-up or fix comments | **Medium** -- GP carry is lower than typical fund structures | `fees.ts:103-111` |
| 4 | Investment period defaults inconsistent (3y in simulation, 5y in Fund Economics) | 3 years vs 5 years | Standardize to 4-5 years | **Medium** -- affects fee calculations and user experience | `defaults.ts:156`, `FundEconomics.tsx:627` |
| 5 | Hurdle calculated as compound on committed capital over full fund life | 8% compound over 10 years = 2.16x | Consider called-capital basis or document the conservative assumption | **Medium** -- carry threshold is higher than most real funds | `fees.ts:88-89` |
| 6 | Benchmark MOIC/IRR values slightly optimistic | Median 2.5x/20% | Median 2.0x/15% (gross) | **Low-Medium** -- affects benchmark comparisons | `benchmarks.ts:19-38` |
| 7 | Capital call schedule extends beyond investment period | Calls through year 6 with 3-year investment period | Align with investment period parameter | **Low** -- affects J-curve shape | `fund-metrics.ts:22-29` |
| 8 | Series A total loss rate slightly optimistic | 25% | 30-35% | **Low** -- minor impact on median outcomes | `defaults.ts:80` |
| 9 | Net IRR is a rough approximation | `grossIRR * (1 - feeDrag%)` | Model fee cash flows in IRR calc | **Low** -- directionally correct | `simulation.ts:272-275` |
| 10 | Seed outlier cap conservative | 150x max | 200-300x max (or document) | **Low** -- only affects extreme tail | `defaults.ts:65` |

**Overall Assessment:** The simulation is well-architected and the defaults are generally well-calibrated against industry data. The most impactful issue is the follow-on return multiple not being discounted for higher entry prices, which systematically inflates returns for the best-performing portfolios. The remaining issues are moderate-to-low impact and could be addressed incrementally.
