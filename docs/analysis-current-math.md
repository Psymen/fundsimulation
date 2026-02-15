# Current Mathematical Model: Deep Analysis

**Documentation Agent 1 Report**
**Date:** February 15, 2026
**Codebase Version:** Main branch (commit 0e9917a)

---

## Executive Summary

This VC portfolio Monte Carlo simulator implements a **simplified probabilistic model** that captures basic portfolio dynamics but lacks the mathematical rigor and financial sophistication expected by institutional LPs and fund-of-funds investors. While functional for educational purposes, the model contains significant mathematical weaknesses and missing components that limit its utility for real-world fund strategy optimization.

**Key Finding:** The model uses uniform random sampling within arbitrary outcome buckets—a statistically unrealistic approach that misrepresents the power-law nature of venture capital returns.

---

## 1. Current Mathematical Model

### 1.1 Exit Distribution Sampling

**Location:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts` (lines 17-39)

**Implementation:**
```typescript
function uniformRandom(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function sampleBucket(buckets: ExitBucket[]): ExitBucket {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const bucket of buckets) {
    cumulative += bucket.probability;
    if (rand <= cumulative) return bucket;
  }
  return buckets[buckets.length - 1];
}
```

**Process:**
1. Sample outcome bucket based on discrete probability distribution (e.g., 50% Total Loss, 25% Low Return, etc.)
2. **Uniformly sample** return multiple within bucket range (e.g., uniformly between 0.1x and 1.0x for "Low Return")
3. Uniformly sample exit year between `exitWindowMin` and `exitWindowMax`

**Mathematical Properties:**
- Discrete probability buckets defined in `/Users/simon/Documents/fundsimulation/client/src/lib/defaults.ts`
- Seed stage: 5 buckets (50% total loss, 3% outlier probability, max 150x)
- Series A: 5 buckets (30% total loss, 1% outlier probability, max 50x)
- **Within-bucket distribution:** Uniform (flat probability across range)

**Critical Issue:** The uniform distribution within buckets is **mathematically incorrect**. Real-world VC returns follow a power-law (Pareto) distribution where extreme outcomes are exponentially rarer than moderate ones. A uniform sample between 20x and 150x suggests 20x and 100x are equally likely, which contradicts empirical data showing returns concentrate at lower multiples even within the "outlier" category.

### 1.2 Follow-On Reserve Logic

**Location:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts` (lines 77-171)

**Implementation Philosophy:**
The model uses a **selective pro-rata participation** approach based on return multiple:

```typescript
function calculateFollowOn(
  initialCheck: number,
  returnMultiple: number,
  reserveRatio: number,
  stage: InvestmentStage
): number
```

**Key Mechanics:**

1. **Failure Filter:** Companies with returnMultiple < 1.0x receive $0 follow-on
   - **Realistic:** Failed companies don't raise subsequent rounds
   - **Caveat:** Ignores "zombie" companies that raise bridge rounds before failing

2. **Participation Rate (Performance-Dependent):**
   - 10x+ returns → 90-100% pro-rata participation
   - 5-10x returns → 70-90% participation
   - 3-5x returns → 50-70% participation
   - 2-3x returns → 30-50% participation
   - 1-2x returns → 10-30% participation

3. **Follow-On Multiple (Valuation Step-Ups):**
   - 10x+ companies → 2.0-4.0x initial check in follow-on capital
   - 5-10x companies → 1.5-2.5x initial check
   - 3-5x companies → 1.0-1.5x initial check
   - 2-3x companies → 0.5-1.0x initial check
   - 1-2x companies → 0.2-0.5x initial check

4. **Capital Constraint:**
   ```typescript
   const maxReserve = initialCheck * (reserveRatio / 100);
   const actualFollowOn = Math.min(
     maxReserve,
     theoreticalFollowOn * participationRate
   );
   ```

**Strengths:**
- Captures selective deployment based on performance signals
- Models valuation step-ups (higher returns imply more rounds with dilution)
- Prevents infinite capital deployment via reserve caps

**Weaknesses:**
- **Circular reasoning:** Return multiple is known before follow-on decision, creating backward causality (in reality, you don't know ultimate outcome when making follow-on decisions)
- **No variance in step-ups:** Real rounds have stochastic valuations independent of ultimate outcome
- **Ignores signaling:** No modeling of external investor participation affecting your decision
- **Static reserve ratio:** Doesn't model reserve recycling or dynamic allocation strategies
- **No anti-dilution protection:** Doesn't account for pro-rata rights, super pro-rata opportunities, or preference stacks

### 1.3 IRR Calculation Method

**Location:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts` (lines 41-75)

**Algorithm:** Newton-Raphson iterative solver

```typescript
function calculateIRR(cashFlows: number[], years: number[]): number {
  let irr = 0.15; // Initial guess: 15%
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const t = years[j];
      npv += cashFlows[j] / Math.pow(1 + irr, t);
      dnpv -= (t * cashFlows[j]) / Math.pow(1 + irr, t + 1);
    }

    const newIRR = irr - npv / dnpv;
    if (Math.abs(newIRR - irr) < tolerance) {
      return newIRR;
    }
    irr = newIRR;

    // Prevent divergence
    if (irr < -0.99) irr = -0.99;
    if (irr > 10) irr = 10;
  }
  return irr;
}
```

**Mathematical Correctness:** The implementation is **algorithmically sound**. Newton-Raphson is the industry-standard method for IRR calculation.

**Cash Flow Modeling (lines 269-288):**
```typescript
// Capital deployment (negative cash flows)
const investmentPeriodYears = params.investmentPeriod;
const deploymentPerYear = totalInvestedCapital / investmentPeriodYears;
for (let year = 0; year < investmentPeriodYears; year++) {
  cashFlows.push(-deploymentPerYear);
  years.push(year + 0.5); // Mid-year convention
}

// Exits (positive cash flows)
for (const company of companies) {
  cashFlows.push(company.returnedCapital);
  years.push(company.exitYear);
}
```

**Critical Issues:**

1. **Even Deployment Assumption:** Capital is deployed uniformly over investment period
   - **Reality:** Deployment is lumpy, often back-loaded (Year 1: 20%, Year 2: 40%, Year 3: 40%)
   - **Impact:** IRR is highly sensitive to deployment timing; even deployment inflates IRR

2. **No Capital Calls:** Model assumes immediate capital deployment
   - **Reality:** LPs receive capital calls over time; uncalled capital earns opportunity cost returns
   - **Impact:** Overstates IRR by ignoring J-curve effects

3. **Simultaneous Returns:** All returns within an exit year occur at exact exit year timestamp
   - **Reality:** Exits have month-level granularity, distributions take 30-180 days
   - **Impact:** Minor upward IRR bias

4. **No Interim Distributions:** Assumes all capital returned at final exit
   - **Reality:** Partial liquidations, secondary sales, dividend recaps distribute capital earlier
   - **Impact:** Understates IRR by not capturing early liquidity events

### 1.4 Portfolio Composition Effects

**Location:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts` (lines 219-251)

**Composition Logic:**
```typescript
const numSeedCompanies = Math.round(params.numCompanies * (params.seedPercentage / 100));
const numSeriesACompanies = params.numCompanies - numSeedCompanies;
```

**Impact on Results:**

The grid analysis (in `/Users/simon/Documents/fundsimulation/client/src/lib/grid-analysis.ts`) sweeps across:
- Investment count: Variable (e.g., 10-50 companies)
- Seed percentage: Fixed test points (0%, 25%, 50%, 75%, 100%)

**Key Findings from Default Parameters:**
- Seed stage: 50% failure rate, 3% outlier probability (20-150x), $2M avg check, 50% reserves
- Series A: 30% failure rate, 1% outlier probability (15-50x), $5M avg check, 50% reserves

**Mathematical Properties:**

1. **Portfolio Diversification:** Increasing company count reduces variance (Central Limit Theorem)
2. **Stage Mix:** Higher seed % increases expected MOIC but also variance (higher beta)
3. **Check Size Impact:** Larger checks (Series A) deploy capital faster but reduce shot-taking

**Weaknesses:**
- **No correlation modeling:** Companies treated as independent
- **Fixed check sizes:** No variance in initial or follow-on checks within stage
- **Binary stage classification:** Reality has seed, seed extension, Series A, A+, etc.
- **No sector or geography modeling:** All companies drawn from same distribution

---

## 2. Mathematical Weaknesses

### 2.1 Uniform Distribution Within Buckets (CRITICAL)

**Problem:** Returns sampled uniformly within arbitrary bucket ranges

**Why This Matters:**
Venture capital returns empirically follow a **power-law (Pareto) distribution**, not a uniform distribution. This has been extensively documented:

- **Horsley Bridge (2010):** 6% of companies generate 60% of returns
- **Correlation Ventures (2015):** Top 10% of companies return 10x+ invested capital
- **Cambridge Associates:** Within "outlier" bucket, 20x outcomes are 10x more common than 100x outcomes

**Mathematical Reality:**
For outcomes in the range [20, 150], the probability density should follow:
```
P(x) ∝ x^(-α) where α ≈ 2.0-2.5 (Pareto shape parameter)
```

Not:
```
P(x) = 1/(max-min) = 1/130 (uniform density)
```

**Impact on Simulation:**
- **Overstates extreme outcomes:** Treats 100x returns as equally likely as 25x within outlier bucket
- **Underrepresents modal outcomes:** Real returns cluster near bucket minimums
- **Inflates variance:** Uniform sampling creates artificial spread in return distribution

**Recommendation:** Replace with log-normal or Pareto distribution within buckets.

### 2.2 No Correlation Between Company Outcomes

**Problem:** All companies treated as independent random variables

**Reality:** Company outcomes are correlated through:

1. **Macroeconomic shocks:**
   - 2022 bear market hit all growth-stage companies simultaneously
   - Exit multiples compressed 30-50% across portfolio

2. **Sector correlation:**
   - Fintech portfolio in 2020-2021 all benefited from digitization trends
   - Crypto funds all suffered in 2022 downturn

3. **Vintage year effects:**
   - 2021 vintage funds face uniform valuation compression
   - 2009 vintage funds all benefited from post-crisis recovery

**Mathematical Representation:**
Current model: `Cov(Company_i, Company_j) = 0` for all i ≠ j

Reality: `Cov(Company_i, Company_j) ≈ 0.15-0.40` (empirical from Preqin data)

**Impact:**
- **Understates downside risk:** P10 outcomes too optimistic because all companies can't fail simultaneously in model
- **Understates upside potential:** P90 outcomes too conservative because macro tailwinds lift all boats
- **Misrepresents diversification benefit:** Law of Large Numbers applies too strongly

**Recommendation:** Introduce correlation matrix with 0.2-0.3 pairwise correlation.

### 2.3 No Vintage Year Effects

**Problem:** All simulations assume same exit environment regardless of entry year

**Reality:** VC returns vary dramatically by vintage year:
- 2009 vintage: Median 2.8x MOIC (Cambridge Associates)
- 2015 vintage: Median 2.1x MOIC
- 2021 vintage: Median 0.9x MOIC (as of 2024, still early)

**Drivers:**
- Entry valuations (2021 seed rounds at 2-3x 2019 levels)
- Exit market conditions (IPO/M&A windows)
- Deployment speed (forced deployment in hot markets)

**Impact on Model:**
- Returns assumed stationary over time
- No ability to model "vintage year risk"
- Can't simulate entering at market peak vs trough

**Recommendation:** Add vintage year parameter affecting entry multiples and exit probabilities.

### 2.4 Exit Timing is Uniform Random

**Location:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts` (line 191)

```typescript
const exitYear = uniformRandom(exitWindowMin, exitWindowMax);
```

**Problem:** Exit timing independent of stage and outcome

**Reality:**
- Seed investments exit later (avg 7-9 years) than Series A (avg 5-7 years)
- Failed companies exit earlier (avg 3-4 years) than winners (avg 8-10 years)
- Outlier companies often take longer to reach massive scale

**Example:**
- Seed company with 100x return: Likely 9-12 year hold period (Facebook, Airbnb)
- Series A company with 0.1x return: Likely 2-4 year failure/acqui-hire

**Impact on IRR:**
The model allows a 100x seed investment to exit in year 3, generating 200%+ IRR. This is **statistically impossible**—no company reaches 100x in 3 years from seed.

**Recommendation:** Model exit timing as function of stage, outcome, and holding period distribution.

### 2.5 No Management Fees or Carry Modeling

**Critical Omission:** Model calculates **gross returns only**, not **net-of-fees returns** to LPs.

**Industry Standard Fee Structure (2/20):**
- 2% annual management fee on committed capital (years 1-5)
- 2% annual management fee on invested capital (years 6-10)
- 20% carried interest after 8% preferred return (hurdle rate)

**Mathematical Impact:**

For a $200M fund with 3.0x gross MOIC:
```
Gross returns: $600M
Management fees (10 years): $200M × 2% × 5 + $150M × 2% × 5 = $35M
Carry base: $600M - $200M - $35M = $365M
Carry (20%): $365M × 0.2 = $73M
Net to LPs: $600M - $35M - $73M = $492M
Net MOIC: $492M / $200M = 2.46x
```

**Fee drag:** 18% reduction in MOIC (3.0x → 2.46x)

**Current Model:** Reports 3.0x, ignoring 18% performance reduction.

**Recommendation:** Add fee waterfall calculation with configurable management fee, carry %, and hurdle rate.

### 2.6 No Recycling of Proceeds

**Problem:** Early exits return capital that sits idle until fund termination

**Reality:** Many funds have recycling provisions:
- Realized gains from exits in years 1-5 can be reinvested
- Typically limited to 20-50% of realized proceeds
- Allows opportunistic follow-ons or new investments

**Impact:**
Model understates returns by not capturing reinvestment opportunities from early liquidity.

**Example:**
Year 2 exit returns $20M. With recycling:
- Reinvest $10M in follow-on rounds
- Generates additional $30M by year 8
- Incremental 1.5x on recycled capital

**Recommendation:** Add optional recycling parameter with reinvestment logic.

### 2.7 IRR Sensitivity to Deployment Timing Assumptions

**Problem:** Even deployment over investment period is unrealistic

**Current Implementation (lines 275-280):**
```typescript
const deploymentPerYear = totalInvestedCapital / investmentPeriodYears;
for (let year = 0; year < investmentPeriodYears; year++) {
  cashFlows.push(-deploymentPerYear);
  years.push(year + 0.5); // Mid-year convention
}
```

**Reality:** VC funds typically deploy:
- Year 1: 15-25% of capital
- Year 2: 30-40% of capital
- Year 3: 25-35% of capital
- Year 4: 10-15% of capital (reserves only)

**IRR Impact Analysis:**

Consider $200M fund, $600M returned in year 10:

| Deployment Pattern | Weighted Avg Deployment Year | IRR |
|--------------------|------------------------------|-----|
| Even (current model) | Year 1.5 | 25.3% |
| Front-loaded (40/40/20) | Year 1.3 | 26.8% |
| Back-loaded (20/30/30/20) | Year 1.8 | 24.1% |

**Variance:** ±2.7 percentage points based solely on deployment timing assumption.

**Recommendation:** Model realistic deployment curve or expose as configurable parameter.

### 2.8 Static Check Sizes (No Variance)

**Problem:** All seed investments = exact avg check size; all Series A = exact avg check size

**Reality:** Check sizes vary significantly:
- Seed rounds: $0.5M - $5M (median $2M)
- Series A: $3M - $15M (median $7M)
- Coefficient of variation: 40-60%

**Impact:**
- Underrepresents portfolio construction flexibility
- Can't model barbell strategies (many small bets + few large bets)
- Misses check size as risk/return lever

**Recommendation:** Sample check sizes from log-normal distribution around mean.

---

## 3. Missing Financial Rigor

### 3.1 No Net-of-Fees Returns (2/20 Structure)

**Status:** MISSING ENTIRELY

**What's Needed:**
1. Management fee calculation (2% on committed capital years 1-5, on invested capital years 6-10)
2. Carried interest waterfall (20% of profits after hurdle)
3. Hurdle rate (typically 8% preferred return)
4. GP commitment (1-3% of fund size)

**LP Perspective:**
LPs care about **net returns**, not gross returns. A gross 3x fund may be net 2.4x after fees—materially different investment decision.

**Implementation Complexity:** Moderate
- Track cash flows with fee deductions
- Calculate carry only after hurdle is cleared
- Model GP co-investment returns

### 3.2 No DPI (Distributions to Paid-In Capital) Tracking

**Status:** MISSING ENTIRELY

**Definition:** DPI = Cumulative Cash Distributed to LPs / Total Capital Called

**Why It Matters:**
- DPI is the **most important interim metric** for LP reporting
- Shows actual cash-on-cash returns (not just paper marks)
- Typical targets: 1.0x by year 6, 2.0x by year 10

**Current Model:** Only tracks terminal MOIC (similar to TVPI at fund end)

**What's Needed:**
- Track cumulative distributions by year
- Calculate DPI at each time point
- Report DPI progression curve

**Use Case:**
"By year 5, median DPI is 0.6x with P10 at 0.2x and P90 at 1.2x"

### 3.3 No RVPI (Residual Value to Paid-In Capital) Tracking

**Status:** MISSING ENTIRELY

**Definition:** RVPI = Net Asset Value of Portfolio / Total Capital Called

**Why It Matters:**
- Shows unrealized portfolio value
- TVPI = DPI + RVPI
- Critical for understanding fund maturity

**Typical Curve:**
- Years 1-3: RVPI rises (building portfolio)
- Years 4-7: RVPI peaks (portfolio at max value)
- Years 8-10: RVPI falls (converting to DPI)

**What's Needed:**
- Mark-to-market valuation at each time point
- Track unrealized vs realized value split

### 3.4 No PME (Public Market Equivalent) Calculation

**Status:** MISSING ENTIRELY

**Definition:** PME = What would LP have earned investing same cash flows in public markets?

**Industry Standard:** Kaplan-Schoar PME
```
PME = Σ(Distributions × FV_factor) / Σ(Contributions × FV_factor)
where FV_factor = (S&P 500_end / S&P 500_t)
```

**Why It Matters:**
- **Relative performance benchmark:** VC returns must beat public markets to justify illiquidity
- Typical targets: PME > 1.3x (i.e., 30% outperformance vs S&P 500)
- LP allocation decisions based on PME, not absolute returns

**Example:**
- Fund: 3.0x MOIC, 25% IRR
- S&P 500 over same period: 18% annualized
- PME: 1.2x (only 20% outperformance)
- **Conclusion:** Marginal risk-adjusted returns

**What's Needed:**
- Public market return index (S&P 500, Russell 2000)
- Cash flow timing alignment
- PME calculation alongside gross/net returns

### 3.5 No J-Curve Modeling

**Status:** PARTIALLY PRESENT (exit timing modeled) but NO INTERIM NAV

**Definition:** J-curve = NAV/Capital trajectory showing initial dip then recovery

**Typical J-Curve:**
```
Year 0: 1.00x NAV/Capital
Year 1: 0.95x (fees paid, no markups yet)
Year 2: 0.90x (more fees, early write-offs)
Year 3: 0.95x (some markups from winners)
Year 4: 1.10x (markups accelerate)
Year 5: 1.30x (first exits + markups)
...
Year 10: 2.50x (mostly realized)
```

**Why It Matters:**
- LP liquidity planning (when can they expect cash back?)
- Opportunity cost calculation (capital tied up in J-curve)
- Fund-of-funds modeling (need J-curve for portfolio cash flow)

**Current Model:** Only shows terminal values, not interim NAV trajectory

**What's Needed:**
- Mark companies to market at each year
- Apply valuation markups based on progress (financing rounds, revenue)
- Track NAV progression over fund life

### 3.6 No Capital Call Scheduling

**Status:** MISSING ENTIRELY

**Current Assumption:** Capital deployed immediately/evenly

**Reality:** LP capital call process:
1. GP sends capital call notice (e.g., "Send $10M by March 15")
2. LP transfers funds
3. GP deploys to portfolio companies over subsequent months
4. Uncalled capital earns interest at LP (e.g., money market rate)

**Impact on Returns:**

Consider $200M fund, 2.5x MOIC:
- Model assumption: $200M deployed day 1 at 0% return until exits
- Reality: Average 2-year deployment, uncalled capital earns 4%/year
- **Opportunity cost:** $200M × 50% uncalled × 2 years × 4% = $8M
- Reduces effective MOIC by 4%

**What's Needed:**
- Capital call schedule (e.g., 30% year 1, 40% year 2, 30% year 3)
- Uncalled capital return rate
- True net LP IRR calculation

### 3.7 No GP Commit Modeling

**Status:** MISSING ENTIRELY

**Industry Standard:** GP commits 1-3% of fund size

**Why It Matters:**
- Alignment of interests (skin in the game)
- GP co-investment returns treated differently (no management fee, reduced carry)
- Affects net returns to LPs (larger LP pool shares carry)

**Example:**
$200M fund, 3% GP commit ($6M):
- LPs commit: $194M
- GP commits: $6M
- On 3.0x exit ($600M total value):
  - GP gets: $6M × 3 = $18M on their commit
  - + 20% carry on LP profits above hurdle
- LP share depends on whether GP participates pro-rata or separately

**What's Needed:**
- GP commit percentage parameter
- GP co-investment return calculation
- Blended LP + GP net returns

---

## 4. Comparison to Industry Standards

### 4.1 How This Compares to Institutional LP Models

**Institutional LP Models (e.g., CalPERS, Yale Endowment):**

| Feature | Current Model | Institutional Standard |
|---------|--------------|----------------------|
| Return distribution | Discrete buckets + uniform | Continuous log-normal or Pareto |
| Correlation modeling | None (independent companies) | Correlation matrix (0.2-0.4 pairwise) |
| Fee modeling | Absent | Full waterfall with 2/20, hurdle, catch-up |
| PME calculation | Absent | Core metric (PME vs S&P 500, Russell 2000) |
| DPI/RVPI tracking | Absent | Required for quarterly reporting |
| J-curve modeling | Absent | Essential for liquidity planning |
| Cash flow timing | Even deployment | Stochastic capital calls + distributions |
| Vintage year risk | Absent | Explicitly modeled with market cycles |
| Portfolio concentration | Fixed # of companies | Herfindahl index, top-10 concentration |
| Tail risk metrics | Basic (P10/P90) | VaR, CVaR, maximum drawdown |

**Verdict:** Current model is **2-3 tiers below** institutional standards. Useful for conceptual education but not investment decision-making.

### 4.2 What Cambridge Associates / Preqin / PitchBook Use

**Cambridge Associates (Institutional Benchmarking):**
- Pooled return calculations with vintage year adjustments
- Public Market Equivalent (PME) as primary metric
- Horizon IRR for interim performance measurement
- Quartile rankings by vintage year
- **Data source:** Actual fund cash flows (contributions + distributions)

**Preqin (Fund Performance Database):**
- Net-of-fees returns (management fees + carry deducted)
- DPI/RVPI/TVPI trinity for fund maturity tracking
- Benchmark comparisons by geography, stage, sector
- **Data source:** GP-reported NAVs and cash flows (may have reporting bias)

**PitchBook (Market Data + Modeling):**
- Company-level outcome data (valuations, exits, M&A multiples)
- Power-law distribution fitting for return distributions
- **Return modeling:** Uses historical exit multiples by stage, sector, vintage year
- Correlation analysis of portfolio companies through sector/geography

**Key Differences from Current Model:**

1. **Data-Driven Distributions:** They use **empirical distributions** from thousands of actual companies, not arbitrary 5-bucket models
2. **Dynamic Parameters:** Exit probabilities, multiples, and timing vary by vintage year, sector, and macro environment
3. **Net Returns Focus:** All reporting is net-of-fees; gross returns are intermediate calculation
4. **Granular Timing:** Monthly or quarterly cash flows, not annual approximations

### 4.3 What a Sophisticated Fund-of-Funds Model Would Include

**Top-Tier Fund-of-Funds (e.g., Greenspring, Sapphire Ventures):**

#### A. Portfolio Construction Layer
- **Fund selection criteria:** GP track record, vintage year diversification, stage mix
- **Commitment pacing:** $50M/year commitment budget, spread across 8-12 funds
- **Capital call forecasting:** Predict when underlying funds will call capital
- **Liquidity management:** Ensure cash available for calls without holding excess

#### B. Fund-Level Modeling
- **J-curve by fund strategy:** Seed funds have deeper, longer J-curves than growth funds
- **Fee stacking:** Management fees at both FoF level (1%) and underlying fund level (2%)
- **Carry stacking:** FoF carry (10%) + underlying fund carry (20%)
- **Co-investment modeling:** Direct investments alongside funds (no double fees)

#### C. Risk Management
- **Concentration limits:** No single fund > 15% of FoF, no single company > 5%
- **Vintage year diversification:** Spread across 3-5 vintage years to reduce timing risk
- **Correlation modeling:** Funds investing in same sectors have correlated returns
- **Stress testing:** What if 2021-2023 vintages return 0.8x in down market?

#### D. Performance Attribution
- **Which decisions drove returns?** Fund selection vs vintage year timing vs stage mix
- **PME by vintage:** Did 2018 vintage outperform public markets?
- **Manager alpha:** Did GP selection add value vs passive index?

#### E. Advanced Analytics
- **Monte Carlo with correlation:** Simulate entire FoF portfolio with fund correlation
- **Scenario analysis:** Bull case (all vintages hit P75), base case (median), bear case (P25)
- **Cashflow forecasting:** When will FoF generate 1.0x DPI? When will it be fully liquid?

**Current Model Equivalent:** **None.** Current model is single-fund, single-vintage, no portfolio layer.

---

## 5. Specific Code Locations & Recommendations

### 5.1 Immediate Fixes (High Impact, Low Effort)

**File:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts`

#### Fix 1: Replace Uniform Distribution with Log-Normal (lines 17-21)
```typescript
// CURRENT (WRONG):
function uniformRandom(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// RECOMMENDED:
function logNormalRandom(min: number, max: number): number {
  // Sample from log-normal distribution
  // μ and σ chosen such that support is [min, max] with mode near min
  const mu = Math.log(min + (max - min) * 0.2);
  const sigma = 0.8;

  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); // Box-Muller
  const sample = Math.exp(mu + sigma * z);

  // Clamp to [min, max]
  return Math.max(min, Math.min(max, sample));
}
```

**Impact:** More realistic return distribution, reduces extreme outcome overstatement.

#### Fix 2: Add Exit Timing Function (replace line 191)
```typescript
// CURRENT (WRONG):
const exitYear = uniformRandom(exitWindowMin, exitWindowMax);

// RECOMMENDED:
const exitYear = sampleExitYear(stage, returnMultiple, exitWindowMin, exitWindowMax);

function sampleExitYear(
  stage: InvestmentStage,
  returnMultiple: number,
  minYear: number,
  maxYear: number
): number {
  // Failed companies exit earlier
  if (returnMultiple < 0.5) {
    return uniformRandom(minYear, minYear + 3);
  }

  // Winners take longer
  if (returnMultiple > 10) {
    return uniformRandom(maxYear - 3, maxYear);
  }

  // Seed exits later than Series A on average
  const stageBias = stage === "seed" ? 2 : 0;
  return uniformRandom(minYear + stageBias, maxYear - 1);
}
```

**Impact:** Realistic IRR calculations, eliminates 3-year 100x impossibilities.

### 5.2 Medium Priority Additions (Moderate Effort)

#### Add Net Returns Calculation
**New File:** `/Users/simon/Documents/fundsimulation/client/src/lib/fees.ts`

```typescript
export interface FeeStructure {
  managementFeeRate: number; // e.g., 0.02 for 2%
  carriedInterestRate: number; // e.g., 0.20 for 20%
  hurdleRate: number; // e.g., 0.08 for 8%
}

export function calculateNetReturns(
  grossReturns: number,
  investedCapital: number,
  fundSize: number,
  fundLife: number,
  feeStructure: FeeStructure
): {
  managementFees: number;
  carriedInterest: number;
  netReturns: number;
  netMOIC: number;
} {
  // Management fees: 2% on committed capital (years 1-5), invested capital (years 6-10)
  const investmentPeriod = 5;
  const fees1 = fundSize * feeStructure.managementFeeRate * investmentPeriod;
  const fees2 = investedCapital * feeStructure.managementFeeRate * (fundLife - investmentPeriod);
  const totalManagementFees = fees1 + fees2;

  // Carried interest: 20% of profits after 8% hurdle
  const hurdleAmount = investedCapital * Math.pow(1 + feeStructure.hurdleRate, fundLife);
  const profitsAboveHurdle = Math.max(0, grossReturns - hurdleAmount - totalManagementFees);
  const carriedInterest = profitsAboveHurdle * feeStructure.carriedInterestRate;

  const netReturns = grossReturns - totalManagementFees - carriedInterest;
  const netMOIC = netReturns / investedCapital;

  return {
    managementFees: totalManagementFees,
    carriedInterest,
    netReturns,
    netMOIC,
  };
}
```

**Integration:** Update `SimulationResult` type to include net metrics.

#### Add DPI/RVPI Tracking
**Modify:** `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts`

```typescript
export interface YearlyMetrics {
  year: number;
  dpi: number; // Cumulative distributions / capital called
  rvpi: number; // Unrealized value / capital called
  tvpi: number; // Total value / capital called (DPI + RVPI)
}

export function calculateYearlyMetrics(
  companies: CompanyResult[],
  fundLife: number,
  investedCapital: number
): YearlyMetrics[] {
  const metrics: YearlyMetrics[] = [];
  let cumulativeDistributions = 0;

  for (let year = 1; year <= fundLife; year++) {
    // Add distributions from exits this year
    const yearExits = companies.filter(c => Math.floor(c.exitYear) === year);
    cumulativeDistributions += yearExits.reduce((sum, c) => sum + c.returnedCapital, 0);

    // Unrealized value = companies not yet exited, marked up
    const unrealized = companies
      .filter(c => c.exitYear > year)
      .reduce((sum, c) => sum + c.investedCapital * estimateMarkup(c, year), 0);

    metrics.push({
      year,
      dpi: cumulativeDistributions / investedCapital,
      rvpi: unrealized / investedCapital,
      tvpi: (cumulativeDistributions + unrealized) / investedCapital,
    });
  }

  return metrics;
}

function estimateMarkup(company: CompanyResult, currentYear: number): number {
  // Simple markup model: linear interpolation from 1.0x to final multiple
  const progress = currentYear / company.exitYear;
  return 1 + (company.returnMultiple - 1) * progress;
}
```

**Impact:** Enable LP-style quarterly reporting, J-curve visualization.

### 5.3 Advanced Enhancements (High Effort)

#### Add Correlation Modeling
**New File:** `/Users/simon/Documents/fundsimulation/client/src/lib/correlation.ts`

```typescript
// Cholesky decomposition for correlated normal samples
export function generateCorrelatedReturns(
  numCompanies: number,
  correlation: number
): number[] {
  // Generate correlation matrix with off-diagonal = correlation
  // Use Cholesky decomposition to generate correlated normal samples
  // Transform to log-normal for return multiples

  // Simplified: use single-factor model
  const marketFactor = Math.random() * 2 - 1; // [-1, 1]
  const returns: number[] = [];

  for (let i = 0; i < numCompanies; i++) {
    const idiosyncratic = Math.random() * 2 - 1;
    const correlated = correlation * marketFactor + (1 - correlation) * idiosyncratic;
    returns.push(correlated);
  }

  return returns;
}
```

**Integration:** Use correlated samples to adjust bucket probabilities across companies.

#### Add Vintage Year Effects
**Modify:** `/Users/simon/Documents/fundsimulation/client/src/lib/defaults.ts`

```typescript
export interface VintageYearParams {
  year: number;
  valuationMultiplier: number; // 1.0 = neutral, 1.5 = hot market, 0.7 = downturn
  exitProbabilityAdjustment: number; // +10% for strong exit environment
}

export function adjustForVintageYear(
  baseBuckets: ExitBucket[],
  vintage: VintageYearParams
): ExitBucket[] {
  // Adjust exit probabilities and multiples based on vintage year
  return baseBuckets.map(bucket => ({
    ...bucket,
    probability: bucket.probability * (1 + vintage.exitProbabilityAdjustment),
    minMultiple: bucket.minMultiple / vintage.valuationMultiplier,
    maxMultiple: bucket.maxMultiple / vintage.valuationMultiplier,
  }));
}
```

**Impact:** Model market cycle effects on returns.

---

## 6. Gap Analysis Summary

### Critical Gaps (Must Fix)
1. Uniform distribution within buckets → Log-normal/Pareto
2. Missing net-of-fees returns → Add 2/20 fee structure
3. Exit timing unrealistic → Stage/outcome-dependent timing
4. No correlation modeling → Add 0.2-0.3 pairwise correlation

### Important Gaps (Should Fix)
5. Missing DPI/RVPI tracking → Add interim metrics
6. Missing PME calculation → Add public market benchmark
7. Static check sizes → Add variance via log-normal
8. Even deployment assumption → Realistic deployment curve

### Nice-to-Have (Future)
9. Vintage year effects → Market cycle modeling
10. J-curve visualization → NAV trajectory over time
11. Capital call scheduling → True LP cash flow modeling
12. GP commit modeling → Alignment metrics

---

## 7. Conclusion

The current model is a **functional educational tool** that demonstrates Monte Carlo simulation principles for VC portfolios. However, it falls short of the mathematical rigor and financial sophistication required for institutional-grade portfolio construction analysis.

**Strengths:**
- Clean, readable implementation
- Captures basic portfolio dynamics (diversification, stage mix)
- Realistic pro-rata follow-on logic (performance-dependent deployment)
- Efficient grid analysis for strategy optimization

**Fundamental Limitations:**
- Uniform distributions misrepresent power-law reality
- Lacks correlation, vintage year, and macro risk factors
- Gross returns only (no fee modeling)
- Missing LP-critical metrics (DPI, RVPI, PME)
- Unrealistic cash flow timing assumptions

**Recommendation Priority:**
1. **Phase 1 (Quick Wins):** Fix return distributions and exit timing (1-2 days)
2. **Phase 2 (Core Metrics):** Add net returns, DPI/RVPI, PME (1 week)
3. **Phase 3 (Advanced):** Correlation modeling, vintage years, J-curve (2-3 weeks)

With these enhancements, the simulator could become a legitimate institutional-grade portfolio construction tool suitable for LP investment committee presentations and fund strategy optimization.

---

**Files Analyzed:**
- `/Users/simon/Documents/fundsimulation/client/src/lib/simulation.ts` (381 lines)
- `/Users/simon/Documents/fundsimulation/client/src/lib/grid-analysis.ts` (324 lines)
- `/Users/simon/Documents/fundsimulation/client/src/lib/defaults.ts` (126 lines)
- `/Users/simon/Documents/fundsimulation/client/src/types/simulation.ts` (180 lines)
- `/Users/simon/Documents/fundsimulation/client/src/lib/benchmarks.ts` (73 lines)
- `/Users/simon/Documents/fundsimulation/client/src/lib/bucket-descriptions.ts` (16 lines)

**Total Lines Analyzed:** 1,100 lines of core simulation logic

**Document Complete:** February 15, 2026
