# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VC Portfolio Monte Carlo Simulator - a React/TypeScript application for modeling venture capital fund returns using stage-specific investment parameters. The simulator supports two investment stages (seed and Series A) with distinct risk/return profiles and enables portfolio construction optimization through grid analysis.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev

# Type checking (no emit)
pnpm check

# Format code with Prettier
pnpm format

# Production build
pnpm build

# Run production server
pnpm start
```

## Architecture

### Core Simulation Engine

The Monte Carlo simulation logic lives in `client/src/lib/simulation.ts`:

- **`runSingleSimulation()`**: Executes one simulation iteration, creating a portfolio of companies with randomly sampled outcomes
- **`runSimulations()`**: Runs multiple iterations (default: 1000)
- **`calculateSummaryStatistics()`**: Aggregates results into percentiles, probabilities, and summary metrics
- **`calculateFollowOn()`**: Models realistic pro-rata follow-on investment behavior based on company performance
  - Winners (10x+) get 90-100% pro-rata participation
  - Failed companies (<1x) get zero follow-on capital
  - Follow-on amounts scale with valuation step-ups (2-4x initial check for breakout companies)

### Grid Analysis Engine

The portfolio construction analyzer lives in `client/src/lib/grid-analysis.ts`:

- **`runGridAnalysis()`**: Tests multiple scenarios across investment count ranges and seed/Series A mixes
- **`identifyBestStrategies()`**: Finds optimal configurations based on MOIC, IRR, downside protection, and capital efficiency
- **`generateCommentary()`**: Creates qualitative analysis of trends and insights

Grid analysis runs asynchronously with progress callbacks, yielding control to allow UI updates between scenarios.

### Type System

All simulation types are defined in `client/src/types/simulation.ts`:

- **`PortfolioParameters`**: Input parameters for a single simulation (fund size, company count, stage mix, exit distributions)
- **`StageParameters`**: Stage-specific config (check size, reserve ratio, target ownership, exit buckets)
- **`ExitBucket`**: Outcome category with probability and return range (e.g., "Total Loss", "Outlier")
- **`SimulationResult`**: Output from one simulation iteration
- **`SummaryStatistics`**: Aggregated metrics across all iterations
- **`GridScenario`**: One scenario in grid analysis with deployment metrics and results
- **`GridAnalysisResult`**: Complete grid analysis with best/worst strategies and commentary

### Default Parameters

`client/src/lib/defaults.ts` contains industry-calibrated defaults:

- **Seed stage**: $2M checks, 50% failure rate, 50% reserve ratio, 3% outlier probability (20-150x range)
- **Series A stage**: $5M checks, 30% failure rate, 50% reserve ratio, 1% outlier probability (15-50x range)
- **Portfolio**: $200M fund, 25 companies, 60% seed / 40% Series A mix

To change default assumptions for the entire application, edit these values.

### Data Persistence

`client/src/lib/indexeddb-storage.ts` handles historical run storage:

- **`saveRun()`**: Persists full simulation results (all iterations) to IndexedDB
- **`loadSavedRuns()`**: Retrieves all historical runs sorted by timestamp
- **`migrateFromLocalStorage()`**: One-time migration from old localStorage format

IndexedDB is used instead of localStorage to store unlimited simulation results (1000 iterations × all company details = large payload).

### Routing & Pages

The app uses Wouter for client-side routing with two main pages:

- **`/`** (`client/src/pages/Home.tsx`): Main simulation interface
  - Three-panel layout: parameters (left), charts (center), historical runs (right)
  - Keyboard shortcut: Cmd/Ctrl+Enter to run simulation
  - Export to CSV and JSON

- **`/portfolio-construction`** (`client/src/pages/PortfolioConstruction.tsx`): Grid analysis interface
  - Tests scenarios across investment count ranges (e.g., 15-40 companies)
  - Seed percentage options: 0%, 25%, 50%, 75%, 100%
  - Identifies best strategies for MOIC, IRR, downside protection, and capital efficiency
  - Displays heatmap grid with color-coded performance

### UI Components

The project uses shadcn/ui components (`client/src/components/ui/`) based on Radix UI primitives. Custom application components live in `client/src/components/`:

- **`ParametersPanel.tsx`**: Input form with accordions for seed/Series A stage parameters
- **`ChartsPanel.tsx`**: MOIC/IRR histograms and summary statistics using Recharts
- **`HistoricalRunsPanel.tsx`**: List of saved runs with load/delete actions
- **`GridResultsView.tsx`**: Heatmap visualization of grid analysis results
- **`StageParametersEditor.tsx`**: Reusable editor for stage-specific parameters (check size, reserve ratio, exit buckets)
- **`IndustryBenchmarksModal.tsx`**: Modal showing industry benchmark data with quartile comparisons
- **`KeyboardShortcutsModal.tsx`**: Help modal triggered by "?" key

### Path Aliases

TypeScript and Vite are configured with these path aliases:

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

Use these in imports: `import { DEFAULT_PARAMETERS } from "@/lib/defaults"`

### Server

`server/index.ts` is a simple Express server that:
- Serves static files from `dist/public` in production
- Handles client-side routing by serving `index.html` for all routes
- Runs on port 3000 by default (configurable via `PORT` env var)

## Key Modeling Concepts

### Exit Distribution Buckets

Each stage defines 5 outcome categories with probabilities that sum to 100%:

1. **Total Loss (0x)**: Complete write-off
2. **Low Return (0.1x - 1x)**: Partial loss or breakeven
3. **Mid Return (1x - 5x)**: Solid returns
4. **High Return (5x - 20x)**: Strong performers
5. **Outlier (20x - 150x)**: Fund-returning winners

When editing exit buckets, ensure probabilities sum to 100% or the simulation will produce invalid results.

### Follow-On Reserve Logic

The `calculateFollowOn()` function models realistic pro-rata deployment:

- Only successful companies (return multiple > 1.0x) raise follow-on rounds
- Follow-on amounts scale with company performance due to valuation step-ups
- Higher performers require larger pro-rata checks (2-4x initial check for 10x+ outcomes)
- VCs selectively participate based on performance signals (10-100% participation rate)
- Failed companies consume zero reserves (no throwing good money after bad)

This creates realistic deployment rates (typically 70-90% of fund size) rather than deploying 100% uniformly.

### IRR Calculation

IRR is calculated using the Newton-Raphson method with:
- **Outflows**: Capital deployed evenly over investment period (default: 3 years, mid-year convention)
- **Inflows**: Exit proceeds at randomly sampled exit years (default: years 3-10)
- **Initial guess**: 15% IRR, iterates until convergence within 0.01% tolerance

IRR captures timing effects that MOIC does not (earlier exits = higher IRR for same MOIC).

## Common Workflows

### Adding a New Investment Stage

To add a third stage (e.g., Series B):

1. Add stage type to `InvestmentStage` union in `types/simulation.ts`
2. Add stage parameters to `PortfolioParameters` interface
3. Add stage defaults to `lib/defaults.ts`
4. Update `runSingleSimulation()` to sample from the new stage
5. Add UI controls in `ParametersPanel.tsx` and `PortfolioConstruction.tsx`
6. Update grid analysis to handle the new dimension

### Modifying Exit Distributions

Exit distributions can be customized per stage. To change seed stage defaults:

1. Edit `DEFAULT_SEED_EXIT_BUCKETS` in `lib/defaults.ts`
2. Adjust probabilities (must sum to 100)
3. Adjust min/max multiples for each bucket
4. Consider impact on follow-on logic (higher failure rate → lower deployment)

### Changing Keyboard Shortcuts

The app uses `react-hotkeys-hook` for keyboard shortcuts. Global shortcuts are defined in:

- `Home.tsx`: Cmd/Ctrl+Enter runs simulation
- `PortfolioConstruction.tsx`: Cmd/Ctrl+Enter runs grid analysis
- `MainLayout.tsx`: "?" opens keyboard shortcuts modal

All shortcuts have `enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT']` to work even when typing in input fields.

### Exporting Results

- **CSV Export**: `lib/export.ts` - `exportResultsToCSV()` creates downloadable CSV with all company-level results
- **JSON Export**: `lib/export.ts` - `exportParametersToJSON()` copies parameters to clipboard for sharing

## Dark Theme

The application uses a refined dark theme by default (`bg-background` = `#0d1117`, soft dark gray). All components are dark-theme optimized with:

- 87% white text opacity for reduced eye strain
- Muted accent colors (emerald, blue, yellow, red at `/20` opacity for backgrounds)
- Consistent card backgrounds (`bg-card`) and borders (`border-border`)

When adding new UI, use theme-aware CSS variables (`bg-background`, `text-foreground`, etc.) rather than hard-coded colors.

## Testing & Validation

The simulation includes input validation in `Home.tsx` and `PortfolioConstruction.tsx`:

- Fund size > 0
- Number of companies > 0
- Check sizes > 0
- Exit window min < max
- Exit bucket probabilities sum to 100% (not enforced in UI, but should be)

The "Run Simulations" button is disabled when validation fails, with error messages displayed.

## Performance Considerations

- Grid analysis can test 50+ scenarios × 500-1000 simulations = 25,000-50,000 individual simulations
- Use `setTimeout(..., 0)` between scenarios to yield control and allow UI updates
- Progress callbacks update the UI during long-running grid analysis
- Consider lowering `numSimulationsPerScenario` (e.g., 200-500) for faster grid analysis during development
- Full simulation results are stored in IndexedDB (can be 5-10MB per grid analysis)

## Industry Benchmarks

Industry benchmark data is in `client/src/lib/benchmarks.ts`. The modal compares simulation results to:

- **Preqin/Cambridge Associates data**: Median VC fund MOIC ~2.5x, IRR ~15%
- **Quartile thresholds**: Top quartile (3.5x+ MOIC, 25%+ IRR), median, bottom quartile
- **Badge styling**: Color-coded badges indicate performance vs industry (emerald = top quartile, green = above median, yellow = below median, red = bottom quartile)

When updating benchmarks, ensure `getBenchmarkColor()` returns proper badge variants with good contrast on dark backgrounds.
