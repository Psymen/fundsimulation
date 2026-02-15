# VC Portfolio Monte Carlo Simulator

A rigorous Monte Carlo simulation tool for modeling venture capital fund returns. Features research-calibrated parameters, five specialized analysis views, and a full 2/20 fee waterfall — all sharing a common set of configurable fund parameters.

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other commands:

```bash
pnpm check      # TypeScript type checking
pnpm test       # Run math correctness tests (45 tests)
pnpm format     # Prettier formatting
pnpm build      # Production build
pnpm start      # Production server
```

## The Five Views

### 1. Monte Carlo Simulation (`/`)

The main simulation view. Run 1,000 Monte Carlo iterations to understand the distribution of possible fund outcomes.

**What you get:**
- MOIC and IRR distribution histograms
- J-curve chart tracking DPI, TVPI, and RVPI year-by-year (with P10/P50/P90 bands)
- Summary cards: Median MOIC, IRR, outlier count, write-off rate
- Net returns after 2/20 fees: Net MOIC, Net IRR, fee drag %
- Probability thresholds: chance of hitting 1x, 2x, 3x, 5x MOIC
- Industry benchmark badges (Top Quartile, Above Median, etc.)

**Layout:** Parameters panel (left) | Charts (center) | Historical runs (right)

All simulation runs are automatically saved to IndexedDB. You can reload parameters from any previous run or delete old runs.

### 2. Portfolio Construction (`/portfolio-construction`)

Grid analysis to find the optimal number of companies and seed/Series A mix for your fund.

**How it works:**
- Set a range of portfolio sizes (e.g., 15-40 companies)
- Select seed percentage options (0%, 25%, 50%, 75%, 100%)
- The engine runs 500+ simulations per scenario, testing every combination

**What you get:**
- Color-coded heatmap of median MOIC across all configurations
- Best strategies identified for: Highest MOIC, Highest IRR, Best Downside Protection, Best Capital Efficiency
- Worst strategies to avoid
- Commentary on diversification vs concentration trade-offs

### 3. Power Law Explorer (`/power-law`)

Visualize how VC returns follow power law distributions, where a handful of outliers drive most of the fund's value.

**What you get:**
- Return concentration chart showing what % of fund value comes from the top 1, 3, 5, and 10 companies
- Outlier sensitivity curve: how fund MOIC changes as your best company's return varies
- Equivalency table: "To hit 3x fund MOIC, you need 1 company at 100x OR 2 at 50x..."
- Power law fit scatter plot (log scale) with theoretical Pareto curve (alpha ~1.9)
- Gini coefficient measuring return concentration

### 4. Fund Economics (`/fund-economics`)

Model the full GP/LP fee waterfall and understand how fund size, fees, and carry affect net returns.

**Configurable fee structure:**
- Management fee % (with step-down after investment period)
- Carried interest %
- Hurdle rate (preferred return)
- GP commit %

**What you get:**
- Waterfall chart: Gross Returns -> Management Fees -> Carry -> Net to LP
- Fund size sensitivity analysis ($25M to $1B): how GP carry, LP net MOIC, and fee drag scale
- GP vs LP economics table across MOIC scenarios (0.5x to 10x)
- Carry kickoff threshold identification

### 5. Scenario Stress Test (`/stress-test`)

Compare fund performance under different market conditions to understand portfolio resilience.

**Pre-built scenarios:**
- Base Case (your current parameters)
- 2008 Financial Crisis (high failure, multiple compression)
- 2021 Bull Market (low failure, multiple expansion)
- Rate Hike 2022-23 (moderate stress, exit delays)
- Exit Drought (extended hold periods)

You can also build custom scenarios with sliders for failure rate modifier, multiple compression, and exit delay.

**What you get:**
- Side-by-side comparison table with deltas vs Base Case
- Overlapping MOIC distribution chart for all selected scenarios
- Key metrics: Median MOIC, P10/P90, probability of loss, IRR

## Configurable Parameters

All five views share the same underlying parameters. Changes propagate automatically.

### Fund Setup
| Parameter | Default | Description |
|-----------|---------|-------------|
| Fund Size | $200M | Total committed capital |
| Portfolio Companies | 25 | Number of investments |
| Seed Percentage | 60% | Portion allocated to seed (rest is Series A) |
| Investment Period | 5 years | Capital deployment window |
| Fund Life | 10 years | Total fund duration |
| Exit Window | 3-10 years | When companies exit |
| Simulations | 1,000 | Monte Carlo iterations |

### Stage Parameters (Seed / Series A)

Each stage has its own:
- **Check size**: $2M seed / $5M Series A
- **Follow-on reserve ratio**: 50% for both
- **Target ownership**: 15% seed / 12% Series A
- **Exit distribution** with 6 buckets:

| Bucket | Seed Default | Series A Default | Return Range |
|--------|-------------|-----------------|--------------|
| Total Loss | 40% | 25% | 0x |
| Partial Loss | 20% | 20% | 0.1x - 0.5x |
| Near Break-even | 15% | 15% | 0.5x - 1.5x |
| Mid Return | 15% | 25% | 1.5x - 5x |
| High Return | 7% | 12% | 5x - 20x |
| Outlier | 3% | 3% | 20x - 150x |

Probabilities must sum to 100%.

### Fee Structure (2/20 Standard)
| Parameter | Default | Description |
|-----------|---------|-------------|
| Management Fee | 2% | Annual fee on committed capital |
| Fee Step-down | 1.5% | Reduced rate after investment period |
| Carry | 20% | GP profit share above hurdle |
| Hurdle Rate | 8% | Preferred return before carry kicks in |
| GP Commit | 2% | GP co-investment |

## Navigation & UI

**Top bar** (sticky): Five view tabs + dark/light mode toggle

**Parameters Summary Bar** (shown on all views except Home): Quick glance at active fund parameters — fund size, portfolio composition, timeline, and fees — with an "Edit" link back to the main parameters panel.

**Historical Runs** (Home view): All simulation runs are persisted in IndexedDB. Load any previous run to restore its parameters and results.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Run simulation / grid analysis |
| `T` | Toggle dark/light mode |
| `?` | Show keyboard shortcuts help |
| `Esc` | Close modal/dialog |

All shortcuts work even when focused on input fields.

## Export

- **Copy Parameters** (JSON to clipboard) — share your exact configuration
- **Export CSV** — download company-level results from all simulation iterations (invested capital, returned capital, stage, exit bucket, exit year, return multiple)

## Modeling Details

### Research-Calibrated Defaults

All defaults are calibrated from empirical VC data (Cambridge Associates, Carta, PitchBook, Correlation Ventures):
- Seed failure rate: 40% (industry avg 35-45%)
- Series A failure rate: 25%
- Outlier probability: 3% (consistent with ~1-3% unicorn rate)
- Follow-on reserves: 50% (industry standard)

### How the Simulation Works

For each of 1,000 iterations:

1. **Build portfolio** — allocate companies to seed vs Series A based on mix percentage
2. **Sample outcomes** — each company draws from its stage's 6-bucket exit distribution using log-normal (mid-range) and Pareto (tail) sampling
3. **Model follow-ons** — winners (10x+) get 90-100% pro-rata participation with 2-4x larger checks due to valuation step-ups; failures get zero follow-on capital
4. **Apply timing** — deploy capital over the investment period; exits occur at randomly sampled years within the exit window
5. **Calculate metrics** — MOIC, IRR (Newton-Raphson), DPI/TVPI/RVPI year-by-year
6. **Apply fees** — 2/20 waterfall with management fee step-down and hurdle rate
7. **Aggregate** — compute percentiles, probabilities, and summary statistics across all iterations

### Industry Benchmarks

Results are compared to VC industry data (Preqin/Cambridge Associates):

| Quartile | MOIC | IRR |
|----------|------|-----|
| Top Quartile | 3.5x+ | 25%+ |
| Above Median | 2.5x+ | 15%+ |
| Below Median | 1.5x+ | 10%+ |
| Bottom Quartile | <1.5x | <10% |

### Key Assumptions & Simplifications

**Included:**
- Stage-specific risk/return profiles
- Realistic follow-on reserve deployment
- Exit timing variability and J-curve effects
- Full 2/20 fee waterfall with hurdle
- Power law return distributions

**Simplified:**
- No recycling of proceeds
- No partial exits or secondary sales
- No correlation between company outcomes
- No vintage year diversification effects
- Simple preferred return (not compound hurdle)

## Technical Stack

- React 18 + TypeScript + Vite 7
- Tailwind CSS 4 + shadcn/ui
- Recharts for data visualization
- Wouter for client-side routing
- IndexedDB for simulation history
- Vitest for math correctness tests

## Development

```bash
pnpm dev          # Dev server on localhost:3000
pnpm check        # Type check (tsc --noEmit)
pnpm test         # Run 45 math correctness tests
pnpm format       # Format with Prettier
npx vite build    # Production build
```

Path aliases: `@/*` maps to `client/src/*`, `@shared/*` to `shared/*`

## License

MIT
