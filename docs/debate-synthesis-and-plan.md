# Debate Synthesis: Building a USEFUL VC Portfolio Simulator
## The Devil's Advocate and Practical Synthesizer

---

## 1. Challenging the Monte Carlo Purist

### The Over-Engineering Trap

**Claim**: "We need log-normal distributions with power law tails, fat-tailed distributions, and sophisticated correlation modeling."

**Reality Check**: This is academic masturbation without calibration data.

#### The False Precision Problem

The current implementation uses uniform sampling from bucketed probabilities (lines 19-39 in simulation.ts). The Monte Carlo purist wants to replace this with:
- Log-normal distributions with power law tails
- Correlated return modeling across companies
- Time-varying success probabilities
- Dynamic portfolio construction based on interim signals

**But here's the brutal truth**: You don't have the data to parameterize these models.

Let's be specific:
- **Power Law vs Log-Normal**: The debate over whether VC returns follow a power law (α ≈ 1.5-2.0) or log-normal distribution is moot when you're using industry-aggregated data from Preqin/PitchBook. These datasets suffer from:
  - Survivorship bias (failed funds don't report)
  - Selection bias (top-quartile funds over-report)
  - Vintage year effects (2021 vs 2009 funds have different distributions)
  - Stage mixing (seed vs late-stage funds are different animals)

- **Correlation Modeling**: To model correlation between company outcomes, you'd need:
  - Portfolio-level company data (proprietary, not public)
  - Sector exposure data
  - Macro regime data
  - Network effects data (syndicate overlaps)

  You have NONE of this. Any correlation matrix you construct is a guess dressed up as math.

- **Dynamic Portfolio Construction**: The idea that you'd know mid-fund whether to "double down" on winners requires:
  - Mark-to-market valuations (notoriously unreliable for private companies)
  - Signal quality assessment (how predictive are Series A metrics for exit outcomes?)
  - Path-dependent decision modeling

  This adds 10x complexity for maybe 5% better accuracy.

#### What Actually Matters for a Planning Tool

The current bucketed approach (Total Loss: 50%, Low Return: 25%, Mid Return: 15%, High Return: 7%, Outlier: 3%) has a HUGE advantage: **it's transparent and adjustable**.

A GP can say: "I think my seed failure rate is 40%, not 50%" and adjust the bucket. With a complex statistical distribution, they'd need to understand shape parameters, scale parameters, and tail indices. Good luck with that conversation.

**Counter-argument to the purist**: Simple models with clear assumptions are MORE useful than complex models with hidden assumptions because:
1. Users can actually understand and adjust them
2. Sensitivity analysis is interpretable ("what if outlier probability goes from 3% to 5%?")
3. The false precision of a sophisticated model creates false confidence

### The Correlation Red Herring

**Claim**: "We need to model correlation between companies because sector crashes affect multiple portfolio companies."

**Reality**: This is important for RISK MANAGEMENT, not for PORTFOLIO CONSTRUCTION PLANNING.

If you're a GP deciding "should I do 20 companies or 40 companies?", the correlation structure matters less than the marginal diversification benefit. And the current Monte Carlo already captures this through independent sampling.

Yes, in reality, if your 5 fintech companies all get hit by a banking crisis, your returns are correlated. But:
- You don't know your sector exposure ex-ante (you deploy over 3 years)
- You don't know which sectors will correlate in the future
- The correlation structure changes by vintage year

Modeling this requires scenario analysis (covered in View 5 below), not baking it into the base Monte Carlo.

### The Data You Actually Have vs. The Data You Need

**Current state** (from defaults.ts):
- Bucketed probability distributions (interpretable, adjustable)
- Stage-differentiated parameters (seed vs Series A)
- Realistic follow-on modeling with performance-based participation (lines 98-171)

**What the purist wants to add**:
- Log-normal with power law tail (requires: alpha parameter, crossover point)
- Correlation matrix (requires: sector exposures, macro sensitivities)
- Time-varying probabilities (requires: interim signal quality data)

**What you actually have access to**:
- Industry benchmark distributions (Preqin quartiles by vintage)
- Stage-specific failure rates (Carta/PitchBook)
- Follow-on participation rates (market data)

**Verdict**: The current implementation is 80% of the way there with 20% of the complexity. Diminishing returns on sophistication.

---

## 2. Challenging the Alternative Methods Advocate

### The Historical Backtesting Illusion

**Claim**: "We should use historical fund data to backtest portfolio strategies."

**Reality Check**: Survivorship bias makes this nearly useless.

#### Why Historical Backtesting is Misleading

The alternative methods advocate wants to:
1. Pull historical fund DPI/TVPI data from Preqin
2. Backtest different portfolio strategies (concentration, stage mix, etc.)
3. Identify "what would have worked" in 2010-2020

**The problems**:
- **Survivorship bias**: Only successful funds report full portfolio data. The Cambridge Associates index overweights successful funds by construction.
- **Regime changes**: 2010-2020 was a zero-rate environment with massive multiple expansion. Those patterns won't repeat in a 5% rate environment.
- **Selection bias**: Funds that report to Preqin are not representative (smaller funds under-report).
- **Company-level data scarcity**: You can get fund-level DPI, but not company-level outcome distributions for most funds.

**Example**: Backtesting on 2010-2020 data would tell you "100% seed, high concentration" was optimal because outliers like Uber, Airbnb dominated. But that's hindsight bias. The CURRENT environment (2024-2026) has:
- Higher cost of capital (exits are harder)
- Longer time to exit (IPO market frozen)
- Valuation compression (2021 marks are down 40-60%)

Historical patterns don't predict future returns.

### The Scenario Analysis Subjectivity Problem

**Claim**: "We should let users build custom scenarios (e.g., 'what if there's a market crash in year 5?')."

**Reality**: This is useful but can be misleading if not done carefully.

#### When Scenario Analysis is Valuable

Scenario analysis IS valuable for:
- Stress testing ("what if my top 3 companies all fail?")
- Regime change modeling ("what if exit multiples compress 30%?")
- Timing sensitivity ("what if exits are delayed 2 years?")

But the alternative methods advocate often proposes:
- **Pre-built "historical" scenarios** ("2008 Financial Crisis", "2021 Bull Market")
  - Problem: These are backward-looking and cherry-picked
- **User-defined scenarios** ("AI boom", "Climate crash")
  - Problem: Users have terrible intuitions about tail probabilities

**Better approach**: Constrained scenario analysis with sensitivity ranges, not free-form speculation.

### The Factor Model Data Problem

**Claim**: "We should build a factor model (momentum, quality, sector exposure) like institutional investors use."

**Reality**: This requires data you don't have and won't get.

#### Why Factor Models Don't Work for VC

Factor models work for public equities because:
- You have 50+ years of daily pricing data
- You have fundamental data (earnings, book value, etc.)
- You have sector classifications (GICS codes)
- You have liquidity and tradability

VC is the opposite:
- No pricing data (valuations are stale and manipulated)
- No standardized fundamentals (early-stage companies have no revenue)
- Sector classifications are messy (is Uber transportation or software?)
- No liquidity (you can't rebalance)

**The institutional investors who use factor models** (e.g., CalPERS, Harvard Endowment) have access to:
- Proprietary GP-provided data (full portfolio company metrics)
- Network data (syndicate co-investment patterns)
- Private benchmarking consortiums

You don't have this and never will as a planning tool.

### The Cash Flow Pacing Red Herring

**Claim**: "We need to model detailed cash flow pacing with capital calls, distributions, and management fees."

**Reality**: This is important but it's a DIFFERENT TOOL, not portfolio construction.

Cash flow modeling matters for:
- **LP cash management** (when do I need to have capital available?)
- **Portfolio pacing** (how many funds should I commit to per year?)
- **Tax planning** (when do distributions arrive?)

But it's NOT the same question as: "Should I invest in 20 companies or 40 companies?"

The current simulation (lines 270-287) already models capital deployment over an investment period and exits over time. Adding quarterly capital call modeling is feature creep.

**Better approach**: Build cash flow pacing as a SEPARATE VIEW (View 4: Fund Economics Calculator) focused on LP/GP cash flows, not mixed into portfolio construction.

---

## 3. What ACTUALLY Matters for Portfolio Construction Decisions

Let's get practical. A VC fund manager makes these key decisions:

### Decision 1: How Many Companies? (Concentration vs Diversification)

**The Question**: "Should I do 15 companies or 50 companies?"

**What Analysis Helps**:
- **Monte Carlo simulation**: Shows how diversification reduces variance
- **Grid analysis** (existing): Tests 15, 20, 25, 30... companies systematically
- **Power law explorer**: Shows "what % of returns come from top N companies?"

**Current implementation**: Grid analysis (grid-analysis.ts) already does this well. The commentary (lines 264-323) provides insight.

**What to improve**:
- Add explicit variance reduction curves ("expected variance drops 40% going from 15 to 25 companies")
- Add benchmark comparisons ("top quartile funds average 28 companies")

### Decision 2: Stage Focus (Seed vs Series A)

**The Question**: "Should I be 80% seed or 50/50?"

**What Analysis Helps**:
- **Monte Carlo with stage-differentiated distributions** (already implemented)
- **Grid analysis varying seed percentage** (already implemented)
- **Benchmarking**: "What % seed are top-quartile funds in my vintage?"

**Current implementation**: The stage mix analysis (lines 276-293) is solid.

**What to improve**:
- Add capital efficiency metrics (seed uses less capital per company, so you can do more companies)
- Add risk-adjusted comparisons (Sharpe ratio by stage mix)

### Decision 3: Check Size and Reserve Strategy

**The Question**: "Should I write $2M checks with 50% reserves or $1.5M checks with 100% reserves?"

**What Analysis Helps**:
- **Follow-on reserve simulation** (already implemented well in lines 98-171)
- **Deployment efficiency analysis** (lines 60-83)
- **Winner concentration**: "How much capital goes to top quartile companies?"

**Current implementation**: The realistic pro-rata follow-on modeling is the BEST part of the current code. It models:
- Performance-based participation rates (line 114-131)
- Valuation step-up effects (line 136-157)
- Reserve constraints (line 162-168)

**What to improve**:
- Add sensitivity analysis: "What if I increase reserves from 50% to 75%?"
- Add waterfall visualization: "Where does my capital actually go?"

### Decision 4: Sector Concentration

**The Question**: "Should I be sector-agnostic or focus on 2-3 sectors?"

**What Analysis Helps**:
- **Scenario analysis**: "What if fintech gets hit with regulation?"
- **Correlation modeling**: "How correlated are different sectors?"
- **Historical pattern analysis**: "Do generalist or specialist funds perform better?"

**Current implementation**: NOT MODELED AT ALL.

**What to add**: This is hard without user-provided sector data. Best approach:
- Let users tag companies with sectors in the simulation
- Run correlation analysis across sectors
- Provide sensitivity analysis ("what if one sector drops 50%?")

**Priority**: MEDIUM. Most GPs have implicit sector theses; modeling this is nice-to-have.

### Decision 5: Follow-on Decision Framework

**The Question**: "What signals should trigger pro-rata participation?"

**What Analysis Helps**:
- **Sensitivity analysis**: "What if I only follow-on into top 25% performers?"
- **Return decomposition**: "How much of my return comes from follow-ons?"
- **Reserve deployment analysis**: "What % of my reserves actually get deployed?"

**Current implementation**: The follow-on logic (lines 114-131) is heuristic-based. It assumes you follow-on more into higher performers.

**What to improve**:
- Make the participation thresholds user-adjustable
- Add "what if" scenarios ("what if I only follow-on into 10x+ companies?")
- Add explicit reserve deployment tracking

---

## 4. Proposed Multi-View Architecture

Here's the practical plan. Build FIVE distinct views that serve different decisions:

### View 1: Enhanced Monte Carlo Simulation (IMPROVE EXISTING)

**Purpose**: Core portfolio construction modeling with realistic distributions.

**What it includes**:
- Current Monte Carlo with buckets (keep this, it works)
- Add net-of-fees returns (2% management fee, 20% carry, 8% hurdle)
- Add DPI/TVPI tracking over fund life (not just terminal)
- Add J-curve modeling (show negative DPI in early years)
- Add sensitivity analysis widget ("drag to adjust outlier probability")

**Key improvements over current**:
1. **Fee modeling**: Add a toggle for "Gross vs Net" returns
   - Management fee: 2% on committed capital years 1-5, 1.5% years 6-10
   - Carry: 20% on profits above 8% hurdle rate
   - This is TABLE STAKES for a real tool

2. **DPI/TVPI over time**: Show cumulative DPI by year, not just final
   - Year 1-3: DPI < 0.1 (J-curve)
   - Year 4-6: DPI climbs to 0.5-1.0
   - Year 7-10: DPI reaches 2-3x
   - This helps GPs explain to LPs why early performance looks bad

3. **Sensitivity analysis**: Interactive sliders
   - "What if outlier probability is 5% instead of 3%?"
   - "What if seed failure rate is 60% instead of 50%?"
   - Show tornado chart of parameter sensitivities

**Data requirements**:
- User inputs: Same as current + fee structure
- Hardcoded defaults: Standard 2/20 with 8% hurdle
- Public data: None needed

**Implementation complexity**: MEDIUM (build on existing simulation.ts)

**Impact**: HIGH (fees make a 30-40% difference in net returns)

**Priority**: **PHASE 1 (MVP improvement)**

---

### View 2: Power Law Explorer

**Purpose**: Make the power law dynamics VISCERAL and interactive.

**What it includes**:
- Interactive visualization: "What % of fund returns come from top N companies?"
- Concentration risk dial: Show median outcome with 1, 3, 5 outliers
- Outlier sensitivity: "What if your best company is 50x vs 100x vs 500x?"
- Benchmark comparison: "In top quartile funds, top 3 companies = 60% of returns"

**Key features**:
1. **Return concentration chart**:
   - X-axis: Top N companies
   - Y-axis: % of total fund returns
   - Show: "Top 1 company = 35% of returns, Top 3 = 65%, Top 5 = 80%"
   - Compare to uniform distribution (flat line)

2. **Outlier Monte Carlo**:
   - Run 1000 simulations
   - For each, track return contribution from top 1, 3, 5 companies
   - Show distribution: "50% of the time, top company is >40% of returns"

3. **"What if" scenarios**:
   - Slider: "Your best company returns [10x, 50x, 100x, 500x]"
   - Show: "If best = 100x, median fund MOIC = 3.5x. If best = 10x, median = 1.8x"
   - Make it OBVIOUS how much you depend on outliers

4. **Benchmark integration**:
   - Pull Correlation Ventures power law data (public): "65% of returns from 6% of companies"
   - Compare user's portfolio: "Your portfolio: 70% from top 10% (more concentrated)"

**Data requirements**:
- User inputs: Portfolio parameters (same as View 1)
- Hardcoded defaults: Correlation Ventures power law benchmarks
- Public data: Published power law parameters (α ≈ 1.8 for VC)

**Implementation complexity**: MEDIUM (mostly visualization, use existing simulation)

**Impact**: HIGH (makes power law tangible, changes GP behavior)

**Priority**: **PHASE 2 (high-value addition)**

---

### View 3: Portfolio Construction Optimizer (IMPROVE EXISTING GRID)

**Purpose**: Systematically explore portfolio configurations to find optimal strategies.

**What it includes** (builds on existing grid-analysis.ts):
- Keep current grid: # companies × seed %
- Add efficient frontier: Risk-return plot (P10 MOIC vs Median MOIC)
- Add constraint optimization: "Maximize MOIC subject to P10 > 1.5x"
- Add industry benchmarks: Overlay quartile boundaries

**Key improvements**:
1. **Efficient frontier visualization**:
   - X-axis: Risk (measured as P10 MOIC or StdDev)
   - Y-axis: Return (median MOIC or IRR)
   - Plot all grid scenarios as points
   - Draw efficient frontier curve
   - Highlight dominated strategies (inside frontier)

2. **More grid dimensions**:
   - Current: # companies × seed %
   - Add: Reserve ratio (25%, 50%, 75%, 100%)
   - Add: Check size (for given fund size)
   - Make it 3D: # companies × seed % × reserve ratio
   - Show slices or let user navigate

3. **Constrained optimization**:
   - Let user set constraints:
     - "I want P10 MOIC > 1.5x" (downside protection)
     - "I want deployment > 80%" (use my fund size)
     - "I want <30 companies" (capacity constraint)
   - Highlight feasible strategies that meet constraints

4. **Industry benchmark overlays**:
   - Preqin quartile boundaries (hardcoded or user-uploaded)
   - "Top quartile: MOIC > 3.2x, IRR > 22%"
   - Show where user's scenarios land vs benchmarks
   - Add badge: "This strategy would be TOP QUARTILE"

**Data requirements**:
- User inputs: Grid parameters (existing), constraints (new)
- Hardcoded defaults: Preqin quartile benchmarks by vintage/stage
- Public data: Preqin quartile data (can hardcode latest)

**Implementation complexity**: MEDIUM-HIGH (build on grid-analysis.ts, add optimization)

**Impact**: HIGH (this is the core value prop for GPs)

**Priority**: **PHASE 1 (MVP improvement)**

---

### View 4: Fund Economics Calculator

**Purpose**: Detailed GP/LP economics with waterfall, fees, carry, and DPI trajectory.

**What it includes**:
- Full waterfall calculation (management fees, expenses, hurdle, carry, clawback)
- GP vs LP economics: "LP gets $X (Yx net MOIC), GP gets $Z in carry"
- Fund size impact: "How does fund size change GP carry?"
- DPI trajectory: Year-by-year DPI/TVPI with J-curve

**Key features**:
1. **Waterfall calculator**:
   - Inputs: Fund size, gross MOIC (from simulation), fee structure
   - Calculate step-by-step:
     - Total returns = Fund size × gross MOIC
     - Less: Management fees (2% × 10 years = 20% of committed capital)
     - Less: Fund expenses (assume 0.5%/year)
     - = Net proceeds before carry
     - LP hurdle: 8% IRR on net invested capital
     - Carry split: 80/20 above hurdle
   - Show: LP net MOIC, GP carry as % of fund, GP carry as $ amount

2. **GP economics analysis**:
   - "For a $200M fund with 3x gross MOIC:"
     - LP gets: $480M (2.4x net MOIC after fees)
     - GP gets: $24M in carry (12% of fund size)
     - GP total comp: $40M management fees + $24M carry = $64M over 10 years
   - This helps GPs understand fund size vs economics trade-off

3. **Fund size sensitivity**:
   - Slider: Fund size from $50M to $500M
   - Show: GP carry, GP total comp, LP net MOIC
   - Insight: "Bigger fund = more management fees, but need higher gross MOIC to clear hurdle"

4. **DPI trajectory modeling**:
   - Use exit timing from simulation (exitYear in companies array)
   - Calculate cumulative DPI by year
   - Show J-curve: DPI negative in years 1-3 (management fees exceed distributions)
   - Show typical curve: DPI 0.3 at year 5, 1.2 at year 7, 2.5 at year 10
   - Compare to industry benchmarks

**Data requirements**:
- User inputs: Fund size, fee structure, simulation results
- Hardcoded defaults: Standard 2/20/8 structure, typical DPI curves
- Public data: Cambridge Associates DPI curves by vintage (can hardcode)

**Implementation complexity**: MEDIUM (separate from simulation, mostly calculations)

**Impact**: MEDIUM-HIGH (critical for fund formation, less for portfolio construction)

**Priority**: **PHASE 2 (valuable but not MVP)**

---

### View 5: Scenario Stress Testing

**Purpose**: Stress test portfolios against adverse scenarios, not predict the future.

**What it includes**:
- Pre-built stress scenarios (market crash, exit drought, sector collapse)
- Custom scenario builder (user adjusts parameters)
- Portfolio stress test: "Your portfolio under 2008-style crisis"
- Historical scenario replay (with caveats)

**Key features**:
1. **Pre-built stress scenarios** (NOT "what will happen", but "what COULD happen"):
   - **Market Crash (2008-style)**:
     - Exit multiples compress 40%
     - Exits delayed 2 years
     - Follow-on reserves blocked (no dry powder for pro-rata)
     - Failure rate increases 20 percentage points
   - **Exit Drought (2023-2024)**:
     - No exits years 5-7
     - All returns concentrated in years 8-10
     - IRR compression (MOIC stays same, IRR drops)
   - **Sector Collapse**:
     - User picks sector (e.g., "fintech")
     - All fintech companies drop to 0.5x or worse
     - Test concentration risk
   - **Outlier Failure**:
     - Force top 3 companies to fail
     - "What if your Uber fails?"

2. **Custom scenario builder**:
   - Let user adjust:
     - Exit multiple compression: -50% to +50%
     - Failure rate change: -20pp to +30pp
     - Exit timing delay: 0 to +5 years
     - Follow-on participation: 0% to 150% of base case
   - Re-run simulation with these adjustments
   - Compare to base case

3. **Portfolio stress dashboard**:
   - Show base case: "Median MOIC = 3.2x, P10 = 1.8x"
   - Show stressed case: "Median MOIC = 1.9x (-40%), P10 = 0.8x (-56%)"
   - Show: "Probability of losing money increases from 5% to 28%"
   - Make it VISCERAL

4. **Historical scenario replay** (WITH BIG CAVEATS):
   - Let user load historical vintage data
   - "2008 vintage had 30% higher failure rates, 40% lower exit multiples"
   - Apply to current portfolio
   - BIG WARNING: "Past regime may not repeat. Use for intuition only."

**Data requirements**:
- User inputs: Scenario parameters, sector classifications
- Hardcoded defaults: Historical regime data (2008 crash, 2021 boom)
- Public data: Vintage-level performance data (Preqin/Cambridge)

**Implementation complexity**: MEDIUM (reuse simulation engine, different parameters)

**Impact**: MEDIUM (useful for risk management, less for construction)

**Priority**: **PHASE 3 (nice-to-have, not core)**

---

## 5. Implementation Priority

### Ranking by Impact × Feasibility

| View | Impact on Insight | Implementation Complexity | Data Requirements | Priority |
|------|------------------|---------------------------|-------------------|----------|
| **View 1: Enhanced Monte Carlo** | **HIGH** - Fees change net returns 30-40% | **MEDIUM** - Build on existing | **LOW** - Hardcode standard fees | **PHASE 1** |
| **View 3: Portfolio Optimizer** | **HIGH** - Core value prop for GPs | **MEDIUM-HIGH** - Extend grid | **LOW** - Hardcode benchmarks | **PHASE 1** |
| **View 2: Power Law Explorer** | **HIGH** - Makes power law tangible | **MEDIUM** - Visualization heavy | **LOW** - Public power law data | **PHASE 2** |
| **View 4: Fund Economics** | **MEDIUM-HIGH** - Critical for fund formation | **MEDIUM** - Separate calculator | **LOW** - Standard fee structures | **PHASE 2** |
| **View 5: Scenario Stress Testing** | **MEDIUM** - Risk management | **MEDIUM** - Reuse simulation | **MEDIUM** - Historical data | **PHASE 3** |

### Phased Implementation Plan

#### **PHASE 1: MVP Improvements (Weeks 1-4)**

**Goal**: Make the existing simulation production-ready with net returns and better grid analysis.

**Deliverables**:
1. **Net-of-fees returns in View 1**:
   - Add fee structure parameters to PortfolioParameters type
   - Implement waterfall calculation in simulation.ts
   - Add toggle: "Show Gross vs Net returns"
   - Display: "Gross MOIC: 3.2x → Net MOIC: 2.4x (after 2/20/8 fees)"

2. **Enhanced grid analysis in View 3**:
   - Add efficient frontier chart (risk vs return)
   - Add industry benchmark overlays (hardcode Preqin quartiles)
   - Improve commentary with benchmark comparisons
   - Add badge: "TOP QUARTILE" for scenarios exceeding benchmarks

3. **DPI/TVPI tracking**:
   - Calculate year-by-year DPI using exit timing data
   - Add chart showing DPI progression (J-curve)
   - Compare to typical curves (hardcoded benchmarks)

**Why Phase 1**:
- High impact (fees are critical, benchmarks are essential)
- Medium complexity (build on existing code)
- No external data needed (can hardcode benchmarks)

**Success metric**: GPs say "this feels like a real fund model now"

---

#### **PHASE 2: Power Law & Economics (Weeks 5-8)**

**Goal**: Add power law visualization and full GP/LP economics.

**Deliverables**:
1. **Power Law Explorer (View 2)**:
   - Return concentration chart (% from top N companies)
   - Outlier sensitivity slider ("what if best = 100x vs 50x?")
   - Benchmark comparison (Correlation Ventures data)

2. **Fund Economics Calculator (View 4)**:
   - Full waterfall with GP/LP split
   - Fund size sensitivity analysis
   - GP compensation breakdown (management fees + carry)
   - DPI trajectory modeling

**Why Phase 2**:
- High value-add (power law is the key insight in VC)
- Medium complexity (mostly visualization and calculations)
- Low data needs (public power law parameters exist)

**Success metric**: GPs have "aha moments" about power law dynamics

---

#### **PHASE 3: Advanced Features (Weeks 9-12)**

**Goal**: Add stress testing and advanced optimization.

**Deliverables**:
1. **Scenario Stress Testing (View 5)**:
   - Pre-built stress scenarios (2008 crash, exit drought)
   - Custom scenario builder
   - Portfolio stress dashboard

2. **Advanced grid features**:
   - 3D grid (# companies × seed % × reserve ratio)
   - Constrained optimization ("maximize MOIC subject to P10 > 1.5x")
   - Sensitivity tornado charts

**Why Phase 3**:
- Medium impact (useful but not essential)
- Medium complexity (reuse existing simulation)
- Can launch without these

**Success metric**: Power users can stress test portfolios

---

## 6. Data Requirements and Sources

### What Data Do You Actually Need?

Let's be brutally honest about what's available vs. what you're fantasizing about:

#### **User Inputs** (Required from GP)

| Input | Type | Default | Notes |
|-------|------|---------|-------|
| Fund size | Number | $200M | |
| # Companies | Range | 15-40 | Grid search over this |
| Seed % | Range | 0-100% | Grid search over this |
| Check sizes | Number | $2M seed, $5M Series A | |
| Reserve ratios | Percentage | 50% | Could be varied in grid |
| Exit distributions | Bucketed probabilities | Current defaults | User can adjust buckets |
| Fee structure | 2/20/8 | Standard | Can customize |
| Fund life | Years | 10 | Standard |
| Investment period | Years | 3 | Standard |

**Current state**: Already collecting most of this. Need to add fee structure.

#### **Hardcoded Defaults** (Reasonable Industry Standards)

| Data | Source | Value | Update Frequency |
|------|--------|-------|------------------|
| Seed exit distribution | Industry consensus | 50% failure, 3% outlier | Yearly |
| Series A exit distribution | Industry consensus | 30% failure, 1% outlier | Yearly |
| Power law alpha | Published research | α ≈ 1.8 | Static (well-established) |
| Return concentration | Correlation Ventures | Top 6% → 65% returns | Static (famous stat) |
| Fee structures | Market standard | 2/20/8 | Yearly (changes slowly) |
| Preqin quartiles | Preqin reports | Q1: >3.2x MOIC, >22% IRR | Yearly (by vintage) |
| DPI curves | Cambridge Associates | Year 5: 0.3, Year 10: 2.5 | By vintage |
| Follow-on step-ups | Carta/PitchBook | Seed→A: 2.5x, A→B: 2.5x | Yearly |

**Current state**: Have exit distributions and follow-on step-ups. Need to add benchmarks.

**Action**: Hardcode 2023-2024 benchmarks from Preqin/Cambridge public reports. Update yearly.

#### **Publicly Available Data** (Nice-to-have, Optional)

| Data | Source | Use Case | Availability |
|------|--------|----------|--------------|
| Preqin quartile data | Preqin reports (paid) | Benchmark overlay | $$$ subscription |
| Cambridge Associates indices | Cambridge reports (public summary) | DPI curves | Free (aggregated) |
| Correlation Ventures power law | Published research | Power law parameters | Free (published) |
| PitchBook valuations | PitchBook (paid) | Step-up multiples | $$$ subscription |
| Carta funding data | Carta reports (public) | Follow-on rates | Free (summary stats) |

**Strategy**:
1. Use FREE public summary data where possible (Cambridge aggregate stats)
2. Hardcode key benchmarks from Preqin/PitchBook reports (updated yearly)
3. DON'T require users to have Preqin subscription
4. Optionally let users upload their own benchmark data

#### **Data You WON'T Get** (Stop Fantasizing)

| Data | Why You Won't Get It | Workaround |
|------|---------------------|------------|
| Company-level outcomes by fund | Proprietary, confidential | Use synthetic data from distributions |
| Real correlation matrices | Proprietary, portfolio-specific | Don't model correlation, use scenarios instead |
| GP selection skill | Unmeasurable, self-serving bias | Assume market returns, let user adjust |
| Interim signals (Series A→Exit) | Noisy, proprietary | Don't model dynamic construction |
| Sector exposure data | Fund-specific | Let user tag sectors manually |

**Verdict**: You have enough public data to build a useful tool. Stop waiting for perfect data.

---

## 7. The Brutal Truth: What This Tool Should Be

### It's a PLANNING tool, not a PREDICTION tool

The Monte Carlo purist wants to build a model that "predicts" fund returns. **This is impossible.**

The alternative methods advocate wants to backtest "what would have worked." **This is misleading.**

**What you CAN build**: A tool that helps GPs:
1. Understand trade-offs (concentration vs diversification)
2. Stress test assumptions ("what if I'm wrong about failure rates?")
3. Communicate strategy to LPs ("here's why we do 25 companies, not 50")
4. Set realistic expectations ("top quartile requires 3x+ MOIC")

### The Power of Transparency Over Sophistication

The current bucketed approach is BETTER than a complex statistical model because:
- GPs can adjust the buckets ("I think my outlier rate is 5%, not 3%")
- It's transparent (no hidden assumptions in distribution parameters)
- It's fast (1000 simulations in milliseconds)
- It's interpretable (sensitivity analysis is obvious)

**Don't replace this with a log-normal distribution.** If you add more sophisticated distributions, make them OPTIONAL and keep the bucketed approach as default.

### What Separates Good Tools from Academic Exercises

**Good tools**:
- Make key trade-offs VISCERAL (power law explorer does this)
- Use simple defaults that are easy to adjust
- Provide benchmarks for context ("is this good?")
- Focus on decisions GPs actually make

**Academic exercises**:
- Optimize mathematical elegance over interpretability
- Require parameters users can't estimate
- Produce false precision (5 decimal places of nonsense)
- Answer questions no one is asking

**This tool should be in the first category.**

---

## 8. Final Recommendations

### For the Monte Carlo Purist

You're right that the current uniform sampling from buckets is simplistic. But you're wrong that the solution is more complex distributions.

**Better path forward**:
1. Keep the bucketed approach as default (it works and is transparent)
2. Add an OPTIONAL "advanced mode" with log-normal + power law tail
   - Let sophisticated users play with alpha parameters
   - Show side-by-side comparison with bucketed approach
   - Require them to acknowledge: "This adds complexity without necessarily improving accuracy"
3. Focus your energy on sensitivity analysis and parameter exploration, not on picking the "right" distribution

**Your valuable contribution**: Rigorous sensitivity analysis and parameter robustness testing.

### For the Alternative Methods Advocate

You're right that scenario analysis and stress testing are valuable. But you're wrong that historical backtesting is the answer.

**Better path forward**:
1. Build scenario stress testing (View 5), but frame it as "what COULD happen" not "what WILL happen"
2. Use historical scenarios as STRESS TESTS, not predictions
   - "2008-style crash" is a scenario, not a forecast
3. Don't build factor models (you don't have the data)
4. Separate cash flow modeling (LP tool) from portfolio construction (GP tool)

**Your valuable contribution**: Stress testing, scenario analysis, and making risk tangible.

### For the Development Team

**Build this in order**:

1. **Phase 1 (MVP, 4 weeks)**:
   - Net-of-fees returns (View 1 enhancement)
   - Benchmark overlays on grid (View 3 enhancement)
   - DPI/TVPI trajectory (View 1 enhancement)

2. **Phase 2 (High-value additions, 4 weeks)**:
   - Power Law Explorer (View 2)
   - Fund Economics Calculator (View 4)

3. **Phase 3 (Advanced features, 4 weeks)**:
   - Scenario Stress Testing (View 5)
   - 3D grid and constrained optimization (View 3 extensions)

**Don't**:
- Build complex correlation models (no data)
- Build historical backtesting (survivorship bias)
- Build factor models (no data)
- Optimize for academic elegance over practical utility

### The North Star

Every feature should answer: **"Does this help a GP make a better portfolio construction decision?"**

If the answer is "it's mathematically sophisticated" but not "yes, it helps decide X", cut it.

**Build a tool GPs will actually use, not one that wins academic awards.**

---

## Appendix: Quick Reference Decision Matrix

| GP Decision | Best View | Key Metric | Current State | Improvement Needed |
|-------------|-----------|------------|---------------|-------------------|
| # of companies | View 3: Grid | Median MOIC vs P10 MOIC | GOOD (existing grid) | Add efficient frontier |
| Seed vs Series A mix | View 3: Grid | Median MOIC by stage mix | GOOD (existing grid) | Add benchmark comparison |
| Check size / reserves | View 1: Monte Carlo | Deployment efficiency | GOOD (follow-on model) | Add sensitivity sliders |
| Sector concentration | View 5: Stress Test | Correlation impact | NOT MODELED | Add sector tagging + scenarios |
| Follow-on strategy | View 2: Power Law | Return concentration | MODELED (implicit) | Make explicit in power law view |
| LP expectations | View 4: Economics | Net MOIC, DPI trajectory | NOT MODELED | Build View 4 |
| Risk management | View 5: Stress Test | P10 under stress | NOT MODELED | Build View 5 |
| Benchmark comparison | View 3: Grid | Quartile ranking | WEAK (no benchmarks) | Add Preqin overlays |

**Priority order**: Grid improvements → Power Law → Economics → Stress Testing
