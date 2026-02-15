# VC Portfolio Monte Carlo Simulator - Architecture & UX Analysis

**Document Version:** 1.0
**Date:** February 15, 2026
**Prepared by:** Documentation Agent 2

---

## Executive Summary

This document provides a comprehensive analysis of the current VC Portfolio Monte Carlo Simulator, covering architecture patterns, data visualization approaches, UX gaps, and recommendations for future improvements. The application currently consists of two main views (Simulation and Portfolio Construction) with IndexedDB-based storage and synchronous computation that blocks the UI thread during execution.

**Key Findings:**
- Solid foundation with modular React components and TypeScript
- Performance bottleneck: simulations run synchronously on main thread
- Limited data visualization (only histograms, no fan charts, waterfalls, or sensitivity analysis)
- No scenario comparison capabilities
- Missing educational features for novice users
- Export capabilities limited to CSV and JSON clipboard copy
- No URL-based state sharing

---

## 1. Current Architecture Assessment

### 1.1 Component Hierarchy & Data Flow

#### Application Structure
```
App.tsx (root)
├── ThemeProvider (dark theme)
├── TooltipProvider
├── MainLayout
│   ├── Header with navigation tabs
│   ├── KeyboardShortcutsModal
│   └── Route-based content:
│       ├── Home.tsx (Simulation view)
│       └── PortfolioConstruction.tsx (Grid analysis view)
```

#### Home.tsx (Simulation View)
**Component Tree:**
```
Home
├── Top Action Bar (sticky)
│   ├── Run Simulation button
│   ├── Copy Parameters button
│   └── Export CSV button
├── Three-column layout
│   ├── ParametersPanel (left, 320px fixed)
│   │   ├── Fund Setup inputs
│   │   ├── Seed Stage accordion
│   │   │   └── StageParametersEditor
│   │   └── Series A Stage accordion
│   │       └── StageParametersEditor
│   ├── ChartsPanel (center, flexible)
│   │   ├── Summary metrics cards (3 cards)
│   │   ├── Probability thresholds card
│   │   ├── MOIC distribution histogram
│   │   ├── IRR distribution histogram
│   │   └── Outliers distribution histogram
│   └── HistoricalRunsPanel (right, 320px fixed)
│       └── List of SavedRun cards
```

#### PortfolioConstruction.tsx (Grid Analysis View)
**Component Tree:**
```
PortfolioConstruction
├── Top Action Bar (sticky)
│   └── Run Grid Analysis button (with progress)
├── Two-column layout
│   ├── Parameters panel (left, 1/3 width)
│   │   ├── Fund size input
│   │   ├── Investment count range
│   │   ├── Seed percentage checkboxes
│   │   ├── Simulations per scenario
│   │   └── Stage parameters (accordions)
│   │       ├── Seed stage (StageParametersEditor)
│   │       └── Series A stage (StageParametersEditor)
│   └── Results panel (right, 2/3 width)
│       └── GridResultsView
│           ├── Best Strategies card
│           ├── Worst Strategies card
│           ├── Heatmap table (MOIC by config)
│           ├── Selected scenario details (conditional)
│           ├── Commentary card
│           ├── ScenarioDetailModal
│           └── IndustryBenchmarksModal
```

### 1.2 State Management Approach

**State Management Pattern:** Local Component State (React useState)

#### Home.tsx State
```typescript
const [parameters, setParameters] = useState<PortfolioParameters>(DEFAULT_PARAMETERS);
const [results, setResults] = useState<SimulationResult[] | null>(null);
const [summary, setSummary] = useState<SummaryStatistics | null>(null);
const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
const [isRunning, setIsRunning] = useState(false);
const [validationError, setValidationError] = useState<string | null>(null);
```

#### PortfolioConstruction.tsx State
```typescript
const [fundSize, setFundSize] = useState(200);
const [investmentCountMin, setInvestmentCountMin] = useState(15);
const [investmentCountMax, setInvestmentCountMax] = useState(40);
const [selectedSeedPercentages, setSelectedSeedPercentages] = useState<number[]>([0,25,50,75,100]);
const [numSimulations, setNumSimulations] = useState(500);
const [seedStage, setSeedStage] = useState<StageParameters>(DEFAULT_PARAMETERS.seedStage);
const [seriesAStage, setSeriesAStage] = useState<StageParameters>(DEFAULT_PARAMETERS.seriesAStage);
const [gridResults, setGridResults] = useState<GridScenario[] | null>(null);
const [analysis, setAnalysis] = useState<GridAnalysisResult | null>(null);
const [isRunning, setIsRunning] = useState(false);
const [progress, setProgress] = useState({ current: 0, total: 0 });
```

**Observations:**
- No global state management (Redux, Zustand, Context API)
- Props drilling for parameter changes (parent → child)
- Each page manages its own state independently
- No shared state between Simulation and Portfolio Construction views
- Parameters must be re-entered when switching views

**Strengths:**
- Simple, easy to understand
- No additional dependencies
- Fast initial development

**Weaknesses:**
- State not preserved when navigating between views
- Cannot compare results from Simulation vs Portfolio Construction
- Difficult to implement cross-view features (e.g., "use these parameters in grid analysis")
- No state persistence beyond IndexedDB manual saves

### 1.3 Performance Characteristics

#### Critical Performance Issue: Synchronous Computation Blocks UI

**Current Implementation (Home.tsx:90-122):**
```typescript
const handleRunSimulation = () => {
  setIsRunning(true);
  toast.info("Running simulations...");

  // Use setTimeout to allow UI to update
  setTimeout(async () => {
    try {
      const simulationResults = runSimulations(parameters); // BLOCKING
      const summaryStats = calculateSummaryStatistics(simulationResults);
      setResults(simulationResults);
      setSummary(summaryStats);
      // ... save to IndexedDB
    } finally {
      setIsRunning(false);
    }
  }, 100);
};
```

**Problems:**
1. **Main Thread Blocking:** The `runSimulations()` function runs synchronously on the main thread
2. **UI Freezing:** During computation, the UI becomes unresponsive
3. **Poor User Experience:** No real-time progress updates during computation
4. **Single setTimeout Hack:** Using a 100ms setTimeout is insufficient for responsive UI

**Grid Analysis Performance (PortfolioConstruction.tsx:45-99):**
```typescript
const scenarios = await runGridAnalysis(params, (current, total) => {
  setProgress({ current, total }); // Progress callback
});
```

The grid analysis has slightly better UX with progress updates, but still blocks the main thread. The `await new Promise(resolve => setTimeout(resolve, 0))` in grid-analysis.ts (line 148) attempts to yield to the event loop but is insufficient for large grids.

**Performance Metrics (Estimated):**
- 1,000 simulations with 30 companies: ~500-1000ms (UI frozen)
- Grid analysis with 50 scenarios × 500 sims: ~25-50 seconds (UI frozen, but shows progress)
- Users cannot cancel running simulations
- No throttling or debouncing on rapid re-runs

### 1.4 Storage Strategy (IndexedDB)

**Implementation:** `/client/src/lib/indexeddb-storage.ts`

**Database Schema:**
```typescript
Database: "vc-monte-carlo" (version 2)
├── Store: "simulation-runs"
│   ├── keyPath: "id"
│   └── Index: "timestamp" (descending)
└── Store: "grid-analyses"
    ├── keyPath: "id"
    └── Index: "timestamp" (descending)
```

**Stored Data Structures:**
- **SavedRun:** Full simulation results including individual company outcomes
- **GridAnalysisResult:** All scenarios with full simulation results for each grid cell

**Storage Operations:**
- `loadSavedRuns()`: Load all historical simulation runs
- `saveRun(run)`: Save new simulation
- `deleteRun(id)`: Delete specific run
- `deleteAllRuns()`: Clear all runs
- `migrateFromLocalStorage()`: One-time migration from old localStorage approach

**Strengths:**
- No storage quota issues (unlike localStorage's 5-10MB limit)
- Stores full simulation results for replay/analysis
- Fast indexed queries by timestamp
- Automatic migration from localStorage

**Weaknesses:**
- No compression (large datasets stored verbatim)
- No data versioning for schema changes
- No export/import for backup
- No sync across devices
- No data pruning strategy (could grow unbounded)

**Current Usage:**
- Simulation results saved automatically after each run
- Grid analysis results NOT currently saved to IndexedDB (only in-memory)
- Historical runs displayed in right panel (Home.tsx)
- Click to reload previous parameters and results

---

## 2. Current Visualization Assessment

### 2.1 Existing Visualizations

#### Simulation View (ChartsPanel.tsx)

**1. Summary Metrics Cards (3 cards)**
- **Median MOIC** with P10/P90 and standard deviation
- **Median IRR** with P10/P90 and standard deviation
- **Average Outcomes** (outliers and write-offs)

**2. Probability Thresholds Card**
- Percentage achieving MOIC ≥ 2x, 3x, 5x
- Simple badge display with percentages

**3. MOIC Distribution Histogram**
- Bar chart showing frequency distribution across 20 bins
- X-axis: MOIC ranges (e.g., "0.5-1.0", "1.0-1.5")
- Y-axis: Frequency count
- Color: Purple (#a371f7)

**4. IRR Distribution Histogram**
- Bar chart showing IRR distribution across 20 bins
- X-axis: IRR percentages
- Y-axis: Frequency count
- Color: Orange/Gold (#d29922)

**5. Outliers Distribution**
- Bar chart showing frequency of 20x+ returns
- X-axis: Number of outliers per simulation
- Y-axis: Frequency count
- Color: Green (#3fb950)

**Visualization Technology:** Recharts library

#### Portfolio Construction View (GridResultsView.tsx)

**1. Best Strategies Cards**
- 2-4 cards showing top performing configurations
- Displays: MOIC, P10-P90 range, deployment rate
- Criterion labels: "Highest Median MOIC", "Best Downside Protection", etc.

**2. Worst Strategies Cards**
- 3 cards showing underperforming configurations
- Red-themed styling to indicate poor performance

**3. Portfolio Performance Heatmap**
- **Table Structure:**
  - Rows: Investment count (15-40 companies)
  - Columns: Seed percentage (0%, 25%, 50%, 75%, 100%)
- **Cell Data:**
  - Median MOIC (bold)
  - Standard deviation
  - P10-P90 range
  - Deployment rate
- **Color Coding:**
  - Top 10%: Green background (`bg-green-500/20`)
  - Bottom 10%: Red background (`bg-destructive/20`)
  - Middle 80%: Neutral (`bg-muted`)
- **Visual Indicators:**
  - Red diagonal line for problematic deployment (<60% or >200%)
  - Clickable cells to view details

**4. Selected Scenario Details Card**
- Appears when heatmap cell clicked
- Shows comprehensive metrics for one configuration

**5. Commentary Section**
- AI-generated text analysis of grid results
- Markdown-formatted insights about stage mix, concentration, deployment

**Modals:**
- **ScenarioDetailModal:** Full distributions (MOIC/IRR histograms), percentile breakdowns
- **IndustryBenchmarksModal:** Comparison to VC industry benchmarks (Top Quartile, Above Median, etc.)

### 2.2 Missing Visualizations

#### High Priority (Critical for Professional Analysis)

**1. Fan Charts / Confidence Intervals**
- **What:** Visualize uncertainty over time with shaded percentile bands (P10-P90, P25-P75, median)
- **Why:** Standard in financial modeling; shows distribution evolution over fund life
- **Use Case:** "Show me the range of possible fund values at year 5, 7, 10"
- **Technical:** Time-series line chart with filled areas for percentile bands

**2. Cash Flow Waterfall**
- **What:** Stacked bar chart showing capital deployment and returns over time
- **Why:** LPs care deeply about cash flow timing (J-curve effect)
- **Components:**
  - Capital calls (negative bars)
  - Distributions (positive bars)
  - Net cash flow by year
  - Cumulative net cash flow line
- **Use Case:** "When does the fund turn cash-flow positive?"

**3. Sensitivity Analysis / Tornado Chart**
- **What:** Horizontal bar chart showing impact of parameter changes on key metrics
- **Why:** Identify which assumptions drive outcomes most
- **Variables to Test:**
  - Seed failure rate ± 10%
  - Outlier probability ± 5%
  - Follow-on reserve ratio ± 20%
  - Exit multiple ranges ± 20%
- **Use Case:** "Which assumption has biggest impact on MOIC?"

**4. Scenario Comparison View**
- **What:** Side-by-side comparison of 2-4 saved scenarios
- **Why:** No current way to compare different strategies
- **Features:**
  - Overlay distributions on same chart
  - Diff highlighting for parameter changes
  - Relative performance metrics
- **Use Case:** "Compare 50% seed vs 100% seed strategy"

**5. Power Law Distribution Analysis**
- **What:** Log-scale plot showing company return distribution
- **Why:** VC returns follow power law; critical to understand outlier impact
- **Components:**
  - Sorted company returns (log scale)
  - Cumulative value contribution
  - "Top 10% contribute X% of returns" annotation
- **Use Case:** "Visualize that 3 companies drive 80% of fund returns"

#### Medium Priority (Enhanced Analysis)

**6. LP Returns Calculator (Net of Fees)**
- **What:** Waterfall showing gross → net returns
- **Components:**
  - Management fees (2% annually)
  - Carried interest (20% above hurdle)
  - LP distributions
- **Why:** LPs care about net returns, not gross
- **Use Case:** "What's LP IRR with 2/20 fee structure?"

**7. Fund Lifecycle Timeline**
- **What:** Gantt-style chart showing investment period, active management, harvest period
- **Components:**
  - Investment timing (years 0-3)
  - Company lifecycle stages
  - Exit events timeline
  - Capital deployment curve
- **Use Case:** "Visualize typical fund lifecycle"

**8. Historical Vintage Comparison**
- **What:** Compare simulation to historical VC vintage year data
- **Data Sources:** Cambridge Associates, Pitchbook Benchmarks
- **Components:**
  - Overlay actual vintage year returns
  - Percentile positioning
- **Use Case:** "Is my 3.2x MOIC realistic for a 2024 vintage?"

**9. Portfolio Company Survival Curves**
- **What:** Kaplan-Meier style survival analysis
- **Shows:** Probability of company surviving to year N
- **Segments:** By stage, by outcome bucket
- **Use Case:** "What % of seed companies exit by year 7?"

**10. Correlation Matrix Heatmap**
- **What:** Show correlations between parameters and outcomes
- **Variables:** Fund size, company count, seed%, follow-on ratio → MOIC, IRR
- **Use Case:** "Are more companies always better?"

#### Lower Priority (Nice-to-Have)

**11. Interactive Parameter Sliders with Live Preview**
- **What:** Adjust parameters with sliders, see results update in real-time
- **Challenge:** Requires web workers for non-blocking computation
- **Use Case:** "Explore parameter space interactively"

**12. Risk Quadrant Plot**
- **What:** Scatter plot of scenarios: X-axis = expected return, Y-axis = volatility
- **Quadrants:** High return/low risk (ideal), low return/high risk (avoid), etc.
- **Use Case:** "Which strategies are in the efficient frontier?"

**13. Monte Carlo Convergence Plot**
- **What:** Show how statistics stabilize as simulation count increases
- **Why:** Validate that 1000 simulations is sufficient
- **Use Case:** "Do I need more than 1000 simulations?"

### 2.3 Grid Analysis Results Display

**Current Approach:** Heatmap table with color coding

**Strengths:**
- Compact overview of all configurations
- Color coding highlights extremes (top/bottom 10%)
- Deployment warnings (red diagonal line)
- Interactive (click to drill down)

**Weaknesses:**
- No multi-metric view (MOIC only in main heatmap)
- Cannot toggle between MOIC, IRR, P10, deployment views
- No sorting or filtering capabilities
- Limited to 2D view (investment count × seed %)
- Cannot visualize 3D relationships (e.g., add fund size as dimension)

**Improvement Ideas:**
- **Tabbed Heatmaps:** Switch between MOIC, IRR, P10, Deployment Rate
- **3D Surface Plot:** For advanced users, show fund size as 3rd dimension
- **Filtering:** Hide configurations with <60% or >200% deployment
- **Export:** Download heatmap as image or data table

### 2.4 Data Presentation Quality

**Typography & Readability:** Excellent
- Clear metric labels
- Consistent number formatting (2 decimals for MOIC, 1 decimal for IRR%)
- Helper text explains what metrics mean

**Color Scheme:** Dark theme optimized
- High contrast for readability
- Semantic colors (green = good, red = bad, yellow = warning)
- Recent fix for badge contrast (commit a82219f)

**Information Density:** Good balance
- Not overwhelming on first view
- Details available on demand (modals, accordions)
- Progressive disclosure pattern

**Accessibility:** Basic
- No ARIA labels detected
- Keyboard navigation limited (some support via react-hotkeys-hook)
- No screen reader optimizations
- Color-only indicators (should add patterns/icons)

---

## 3. UX Gaps

### 3.1 Scenario Comparison

**Current State:** No comparison capabilities

**Problems:**
1. Cannot view multiple saved runs side-by-side
2. No diff highlighting when parameters change
3. Cannot overlay distributions from different runs
4. Grid analysis shows best/worst but no interactive comparison

**User Stories:**
- "I want to compare 50% seed vs 100% seed strategy"
- "Show me how MOIC distribution changes if I increase follow-on reserves by 20%"
- "Which parameter change had the biggest impact on my results?"

**Proposed Solution:**
- Add "Compare" checkbox to HistoricalRunsPanel
- Select 2-4 runs to compare
- Open ComparisonView showing:
  - Parameter diff table (highlighted changes)
  - Overlaid distribution charts
  - Relative performance table
  - Side-by-side summary cards

### 3.2 Sensitivity Analysis Visualization

**Current State:** None

**Problems:**
- Users don't know which parameters matter most
- No systematic way to test robustness
- Manual parameter tweaking is tedious

**User Stories:**
- "What if seed failure rate is 10% higher than I estimated?"
- "How sensitive is my MOIC to outlier probability?"
- "Show me the impact of each parameter on fund returns"

**Proposed Solution:**
- New "Sensitivity Analysis" page/modal
- User selects base case (current parameters or saved run)
- Define ranges for key parameters (±10%, ±20%, ±50%)
- Run automated sensitivity sweep
- Display tornado chart showing impact magnitude
- Export sensitivity analysis results

### 3.3 Interactive Parameter Exploration

**Current State:** Static forms with manual "Run" button

**Problems:**
- Disconnect between parameter input and result preview
- No visual feedback during parameter adjustment
- Cannot explore parameter space efficiently

**User Stories:**
- "As I move the 'number of companies' slider, show me approximate MOIC range"
- "Highlight which parameter changes are outside normal ranges"
- "Show me parameter recommendations based on industry data"

**Proposed Solution:**
- Add "Instant Preview" mode (requires web workers)
- Slider-based parameter inputs with live mini-charts
- Parameter validation with visual warnings
- "Suggested ranges" based on benchmarks
- Debounced auto-run (500ms after last change)

### 3.4 Limited Export Capabilities

**Current State:**
- CSV export: simulation results only (flat table)
- JSON export: parameters copied to clipboard

**Problems:**
- No chart/visualization export
- Cannot export grid analysis heatmap
- No PDF report generation
- Cannot export to Excel with formatting
- No shareable links

**User Stories:**
- "Export this heatmap as PNG for my board deck"
- "Generate PDF report with all charts and commentary"
- "Share this scenario with my partner via link"
- "Export to Excel with conditional formatting preserved"

**Proposed Solution:**
1. **Chart Export:** Add download button to each chart (PNG/SVG)
2. **Report Generation:** "Export Full Report" → PDF with:
   - Parameters table
   - All visualizations
   - Commentary
   - Timestamp and attribution
3. **Excel Export:** Use SheetJS to export with formatting
4. **Shareable Links:** Encode parameters in URL query string
5. **Presentation Mode:** Full-screen chart viewer for screen sharing

### 3.5 No Preset Strategies/Templates

**Current State:** DEFAULT_PARAMETERS only

**Problems:**
- New users don't know realistic parameter ranges
- No industry benchmarks for comparison
- Cannot quickly test common strategies

**User Stories:**
- "Load a typical seed fund strategy (100% seed, 25 companies, $50M)"
- "Show me Series A fund typical parameters"
- "Compare my parameters to top quartile funds"

**Proposed Solution:**
- **Preset Library:**
  - Seed Fund (100% seed, 25-30 companies, $50-100M)
  - Series A Fund (100% Series A, 20-25 companies, $150-250M)
  - Multi-Stage Fund (50/50 mix, 30-40 companies, $200M)
  - Concentrated Fund (15 companies, high reserves)
  - Spray & Pray (50+ companies, low reserves)
- **Template Selector:** Dropdown or modal on first load
- **Benchmark Comparison:** Show user's parameters vs template
- **Custom Templates:** Save user's own presets

### 3.6 No Onboarding or Educational Content

**Current State:** Minimal tooltips, no guided tour

**Problems:**
- New users don't understand VC-specific terms (MOIC, IRR, outliers, J-curve)
- Parameter meanings unclear (why does follow-on reserve ratio matter?)
- No explanation of simulation methodology
- Exit bucket probabilities confusing for novices

**User Stories:**
- "What does 'follow-on reserve ratio' mean?"
- "Why do I need to model seed vs Series A separately?"
- "What's a realistic MOIC for a seed fund?"
- "How do I interpret the heatmap colors?"

**Proposed Solution:**
1. **Onboarding Wizard (First Load):**
   - Step 1: "What is Monte Carlo simulation?"
   - Step 2: "Understanding VC metrics (MOIC, IRR)"
   - Step 3: "Choosing your parameters"
   - Step 4: "Interpreting results"
   - Optional "Skip" for experts

2. **Contextual Help:**
   - Expand tooltip descriptions
   - Add "Learn more" links to docs
   - Inline examples ("e.g., typical seed fund: 1.5M check")
   - Video tutorials (short 1-2 min clips)

3. **Interactive Tutorial:**
   - Guided walkthrough with sample data
   - Highlight UI elements with spotlight effect
   - "Try it yourself" exercises

4. **Glossary Modal:**
   - Searchable term definitions
   - Linked from all tooltips
   - Examples and formulas

5. **Methodology Docs:**
   - "How we calculate IRR"
   - "Follow-on reserve modeling explained"
   - "Exit bucket probability distributions"
   - Reference to academic papers (VentureXpert, Kaplan-Schoar)

---

## 4. Proposed New Views/Pages

### 4.1 Sensitivity Analysis Dashboard

**Purpose:** Systematically test parameter robustness and identify key drivers

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Sensitivity Analysis                            │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Base Case    │  │ Variable Selection       │ │
│  │ - Load saved │  │ ☑ Seed failure rate      │ │
│  │ - Use current│  │ ☑ Outlier probability    │ │
│  │              │  │ ☑ Follow-on reserve %    │ │
│  │              │  │ ☑ Exit multiples         │ │
│  │              │  │ Range: ±10% ±20% ±50%    │ │
│  └──────────────┘  └──────────────────────────┘ │
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │ Tornado Chart: Impact on Median MOIC        ││
│  │                                              ││
│  │  Seed failure rate    ████████████ -0.8x    ││
│  │  Outlier probability  ██████ +0.5x          ││
│  │  Follow-on reserves   ████ +0.3x            ││
│  │  Exit multiples       ██ +0.1x              ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │ Scenario Comparison Table                   ││
│  │ Parameter       │ Low    │ Base   │ High    ││
│  │ Seed fail rate  │ 2.8x   │ 3.2x   │ 1.9x   ││
│  │ Outlier prob    │ 2.5x   │ 3.2x   │ 4.1x   ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Features:**
- Select base case (current or saved)
- Choose variables to test
- Define test ranges (±10%, ±20%, custom)
- Automated simulation runs (web worker)
- Tornado chart for visual impact ranking
- Downloadable sensitivity report

**Technical Requirements:**
- Web worker for parallel simulation
- Efficient result caching
- Progress indicator for long runs

### 4.2 Cash Flow Waterfall View

**Purpose:** Visualize J-curve and cash flow timing (critical for LP reporting)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Fund Cash Flows - Scenario: Baseline           │
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │        Cash Flow Waterfall by Year          ││
│  │   $M                                         ││
│  │   50 │                   ████████████       ││
│  │   25 │             ██████                   ││
│  │    0 │────────────────────────────────────  ││
│  │  -25 │ ███                                  ││
│  │  -50 │ ████████                             ││
│  │      └─────────────────────────────────────  ││
│  │        Y1  Y2  Y3  Y4  Y5  Y6  Y7  Y8  Y9    ││
│  │        ↓ Capital Calls  ↑ Distributions      ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │  Cumulative Net Cash Flow (with percentiles)││
│  │   $M                                         ││
│  │  200 │           ╱─────  P90                ││
│  │  100 │         ╱──────   Median             ││
│  │    0 │──────╱───────────  P10               ││
│  │ -100 │   ╱                                  ││
│  │      └─────────────────────────────────────  ││
│  │        Y1  Y2  Y3  Y4  Y5  Y6  Y7  Y8  Y9    ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Key Metrics:                                     │
│  - Cash-flow positive: Year 5 (median)           │
│  - Peak negative cash: -$82M (Year 2)            │
│  - Total distributions: $420M (median)           │
└─────────────────────────────────────────────────┘
```

**Features:**
- Stacked waterfall chart (capital calls vs distributions)
- Cumulative cash flow with P10/P50/P90 bands
- Year-by-year breakdown table
- Key metrics: J-curve depth, breakeven year
- Export to LP report format

**Data Requirements:**
- Simulation engine must track investment timing
- Exit timing already modeled (exitYear field)
- Aggregate by year buckets

### 4.3 Fund Lifecycle Timeline

**Purpose:** Visual representation of fund lifecycle phases and company journeys

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Fund Lifecycle Timeline                         │
│                                                   │
│  Year  0        3              7           10    │
│        │────────│──────────────│────────────│    │
│        Investment  Active Mgmt    Harvest        │
│                                                   │
│  Portfolio Companies (sample path):              │
│  Co 1  [SEED]───→[A]──→[B]───────→ EXIT (25x)   │
│  Co 2  [SEED]───────────────────────────X (0x)   │
│  Co 3  ────[A]────→[B]─→[C]──────→ EXIT (8x)    │
│  Co 4  [SEED]──→[A]──────────────→ EXIT (3x)    │
│  ...                                              │
│                                                   │
│  Legend:                                          │
│  [SEED/A] = Initial investment                   │
│  → = Follow-on rounds                            │
│  EXIT = Successful exit                          │
│  X = Write-off                                   │
└─────────────────────────────────────────────────┘
```

**Features:**
- Timeline swimlanes for each company
- Investment stage markers
- Follow-on round indicators
- Exit events with return multiples
- Filterable by outcome (outliers, failures, etc.)
- Animated playback option

**Use Cases:**
- Educational tool for understanding fund dynamics
- Identify clustering of exits
- Visualize deployment pace

### 4.4 Scenario Comparison View

**Purpose:** Side-by-side comparison of 2-4 scenarios

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Scenario Comparison                             │
│  ┌──────────┬──────────┬──────────┬──────────┐ │
│  │Scenario 1│Scenario 2│Scenario 3│Scenario 4│ │
│  │50% Seed  │100% Seed │25 cos    │40 cos    │ │
│  └──────────┴──────────┴──────────┴──────────┘ │
│                                                   │
│  Parameters Diff:                                 │
│  ┌──────────────────┬────┬────┬────┬────┐        │
│  │ Parameter        │ S1 │ S2 │ S3 │ S4 │        │
│  ├──────────────────┼────┼────┼────┼────┤        │
│  │ Seed %           │ 50 │100*│ 50 │ 50 │        │
│  │ # Companies      │ 30 │ 30 │ 25*│ 40*│        │
│  │ Follow-on (seed) │ 80 │ 80 │ 80 │ 80 │        │
│  └──────────────────┴────┴────┴────┴────┘        │
│  * = differs from Scenario 1                      │
│                                                   │
│  Overlaid Distributions:                          │
│  ┌──────────────────────────────────────────────┐│
│  │  MOIC Distribution                           ││
│  │  Freq                                        ││
│  │    │  ▄▄                                     ││
│  │    │ ▐██▌ ▄▄▄                                ││
│  │    │▐████▌███▌                               ││
│  │    │██████████                               ││
│  │    └─────────────────────────────────        ││
│  │      1x   2x   3x   4x   5x                  ││
│  │    ── S1  ── S2  ── S3  ── S4                ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Performance Summary:                             │
│  ┌──────────────┬────┬────┬────┬────┐            │
│  │ Metric       │ S1 │ S2 │ S3 │ S4 │            │
│  ├──────────────┼────┼────┼────┼────┤            │
│  │ Median MOIC  │3.2x│3.8x│2.9x│3.1x│            │
│  │ Median IRR   │ 22%│ 25%│ 19%│ 21%│            │
│  │ Deploy Rate  │ 85%│ 72%│ 78%│ 91%│            │
│  └──────────────┴────┴────┴────┴────┘            │
└─────────────────────────────────────────────────┘
```

**Features:**
- Select 2-4 scenarios from saved runs or current
- Diff highlighting for changed parameters
- Overlaid distribution charts (different colors)
- Summary metrics table
- Ranking indicators (🥇🥈🥉)
- Export comparison as PDF

**Technical:**
- Extend savedRuns state to include comparison mode
- Render multiple datasets on same chart (Recharts supports this)
- Add comparison hash to URL for sharing

### 4.5 LP Returns Calculator (Net of Fees)

**Purpose:** Show LP perspective (net returns after fees and carry)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  LP Returns Calculator                           │
│                                                   │
│  Fee Structure:                                   │
│  ┌─────────────────────────────┐                 │
│  │ Management Fee: [2.0]%      │                 │
│  │ Carried Interest: [20]%     │                 │
│  │ Hurdle Rate: [8]%           │                 │
│  │ Fee Basis: ☑ Committed      │                 │
│  │            ☐ Invested        │                 │
│  └─────────────────────────────┘                 │
│                                                   │
│  Waterfall Calculation:                           │
│  ┌──────────────────────────────────────────────┐│
│  │ Gross Fund Returns      $640M    (3.2x MOIC)││
│  │ - Management Fees       -$40M    (10 yrs)   ││
│  │ - Hurdle to LPs         $320M    (8% on $200M)││
│  │ - Carry on Excess       -$56M    (20% of $280M)││
│  │ ────────────────────────────────────────────  ││
│  │ Net LP Distributions    $524M    (2.6x MOIC)││
│  │ Net LP IRR              18.5%                ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Distribution Waterfall Chart:                    │
│  ┌──────────────────────────────────────────────┐│
│  │  $640M ├─────────────────────────────────┤  ││
│  │        │ LP Return  │Carry│  Mgmt Fees   │  ││
│  │        │  $524M     │$56M │    $40M      │  ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Gross vs Net Comparison:                         │
│  - Gross MOIC: 3.2x → Net LP MOIC: 2.6x (19% fee drag)│
│  - Gross IRR: 22% → Net LP IRR: 18.5% (3.5pp drag)   │
└─────────────────────────────────────────────────┘
```

**Features:**
- Configurable fee structure (2/20, 2.5/25, etc.)
- Hurdle rate options (none, 8%, preferred return)
- Management fee basis (committed vs invested capital)
- Visual waterfall showing fee allocations
- Gross vs net comparison
- Export LP-ready report

**Data Requirements:**
- Integrate fee calculations into simulation engine
- Track timing for management fee accrual
- Calculate hurdle based on cash flow timing

### 4.6 Power Law Analysis View

**Purpose:** Visualize that VC returns follow power law (few winners drive all returns)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Power Law Analysis                              │
│                                                   │
│  Company Returns Distribution (Log Scale):        │
│  ┌──────────────────────────────────────────────┐│
│  │ Return                                       ││
│  │ 100x │ ●                                     ││
│  │  10x │ ●●●                                   ││
│  │   1x │ ●●●●●●●                               ││
│  │ 0.1x │ ●●●●●●●●●●●●                          ││
│  │      └─────────────────────────────────────  ││
│  │        Company Rank (sorted by return)       ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Cumulative Value Contribution:                   │
│  ┌──────────────────────────────────────────────┐│
│  │ 100%│                              ╱────────  ││
│  │  80%│                      ╱──────            ││
│  │  60%│              ╱──────                    ││
│  │  40%│      ╱──────                            ││
│  │  20%│ ╱────                                   ││
│  │   0%└─────────────────────────────────────    ││
│  │       Top 1  Top 3  Top 5  Top 10  All       ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Key Statistics:                                  │
│  - Top 1 company contributes: 42% of fund value  │
│  - Top 3 companies contribute: 78% of fund value │
│  - Top 10% companies contribute: 94% of value    │
│  - Bottom 50% contribute: -2% (net negative)     │
│                                                   │
│  This demonstrates the power law nature of VC    │
│  returns: a few outliers drive all performance.  │
└─────────────────────────────────────────────────┘
```

**Features:**
- Log-scale scatter plot of company returns
- Cumulative contribution curve
- Automated statistics (top 1/3/5/10 contribution)
- Filter by stage (seed vs Series A)
- Educational annotations

**Use Cases:**
- Explain why portfolio size matters (more shots on goal)
- Justify high failure tolerance
- Educational tool for LPs

### 4.7 Historical Vintage Comparison

**Purpose:** Benchmark simulation against real VC vintage year data

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Historical Vintage Comparison                   │
│                                                   │
│  Your Simulation Results:                         │
│  - Median MOIC: 3.2x                             │
│  - Median IRR: 22%                               │
│                                                   │
│  Historical VC Benchmarks (Cambridge Associates):│
│  ┌──────────────────────────────────────────────┐│
│  │ MOIC by Vintage Year (Seed Funds)           ││
│  │  5x │                                        ││
│  │  4x │           ●           ●                ││
│  │  3x │      ● ● ● ● ● ● ●     ● ← Your Result││
│  │  2x │  ● ●               ●                  ││
│  │  1x │                                        ││
│  │     └─────────────────────────────────────   ││
│  │      2010 2012 2014 2016 2018 2020 2022      ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Percentile Ranking:                              │
│  Your 3.2x MOIC ranks at:                         │
│  ┌──────────────────────────────────────────────┐│
│  │ Quartile Distribution                        ││
│  │ │       │       │       │       │            ││
│  │ └───────┴───────┴───────┴───────┘            ││
│  │   Q1      Q2      Q3      Q4                 ││
│  │ Bottom  Below  Above    Top                  ││
│  │         Median Median Quartile               ││
│  │                   ↑                           ││
│  │                You (63rd percentile)         ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  Historical Context:                              │
│  - Your 3.2x MOIC is above median (2.8x) but     │
│    below top quartile (4.2x) for seed funds      │
│  - Vintage 2020-2022 funds showing higher returns│
│    due to recent tech bull market                │
└─────────────────────────────────────────────────┘
```

**Features:**
- Load historical benchmark data (JSON file or API)
- Plot simulation results against benchmarks
- Percentile ranking
- Filter by fund type (seed, Series A, multi-stage)
- Time-series view of vintage year performance

**Data Sources:**
- Cambridge Associates VC Index
- Pitchbook Benchmarks
- Preqin Quarterly Reports
- Hardcoded representative data if APIs unavailable

---

## 5. Architecture Improvements Needed

### 5.1 Web Workers for Simulation (Critical Priority)

**Problem:** Simulations block UI thread, freezing interface

**Solution:** Offload computation to Web Workers

**Implementation Plan:**

1. **Create Worker File:** `/client/src/workers/simulation.worker.ts`
```typescript
// simulation.worker.ts
import { runSimulations, calculateSummaryStatistics } from '@/lib/simulation';

self.onmessage = (event) => {
  const { type, parameters } = event.data;

  if (type === 'RUN_SIMULATION') {
    const results = runSimulations(parameters);
    const summary = calculateSummaryStatistics(results);

    self.postMessage({
      type: 'SIMULATION_COMPLETE',
      results,
      summary,
    });
  }

  if (type === 'RUN_GRID_ANALYSIS') {
    // Grid analysis with progress updates
    const { params } = event.data;
    // ... run grid analysis
    // Post progress updates: self.postMessage({ type: 'PROGRESS', current, total })
  }
};
```

2. **Worker Hook:** `/client/src/hooks/useSimulationWorker.ts`
```typescript
import { useEffect, useRef, useState } from 'react';

export function useSimulationWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Cleanup on unmount
    return () => workerRef.current?.terminate();
  }, []);

  const runSimulation = (parameters) => {
    return new Promise((resolve, reject) => {
      setIsRunning(true);

      workerRef.current.onmessage = (event) => {
        const { type, results, summary } = event.data;

        if (type === 'SIMULATION_COMPLETE') {
          setIsRunning(false);
          resolve({ results, summary });
        }

        if (type === 'PROGRESS') {
          setProgress(event.data.percent);
        }
      };

      workerRef.current.onerror = (error) => {
        setIsRunning(false);
        reject(error);
      };

      workerRef.current.postMessage({
        type: 'RUN_SIMULATION',
        parameters,
      });
    });
  };

  return { runSimulation, isRunning, progress };
}
```

3. **Update Home.tsx:**
```typescript
const { runSimulation, isRunning, progress } = useSimulationWorker();

const handleRunSimulation = async () => {
  try {
    toast.info("Running simulations...");
    const { results, summary } = await runSimulation(parameters);
    setResults(results);
    setSummary(summary);
    toast.success("Simulations completed!");
  } catch (error) {
    toast.error("Simulation failed");
  }
};
```

**Benefits:**
- UI remains responsive during long-running simulations
- Can show real-time progress bar
- Enable cancellation (worker.terminate())
- Better multi-core CPU utilization

**Challenges:**
- Web Workers can't access DOM
- Must serialize data via postMessage
- Vite/Webpack worker configuration
- Testing worker code more complex

### 5.2 Better State Management for Complex Multi-View App

**Problem:** Local useState causes:
- Lost state when navigating between views
- No cross-view data sharing
- Difficult to implement undo/redo
- No state persistence

**Solution:** Adopt Zustand (lightweight state management)

**Rationale:**
- Zustand: Simple, no boilerplate, TypeScript-first
- Alternative: Redux Toolkit (overkill for this app)
- Alternative: Jotai/Recoil (atomic state, more complex)

**Implementation:**

1. **Install:** `pnpm add zustand`

2. **Create Stores:** `/client/src/stores/simulationStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SimulationStore {
  // State
  parameters: PortfolioParameters;
  results: SimulationResult[] | null;
  summary: SummaryStatistics | null;
  savedRuns: SavedRun[];

  // Actions
  setParameters: (params: PortfolioParameters) => void;
  setResults: (results: SimulationResult[], summary: SummaryStatistics) => void;
  loadRun: (run: SavedRun) => void;
  clearResults: () => void;
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      parameters: DEFAULT_PARAMETERS,
      results: null,
      summary: null,
      savedRuns: [],

      setParameters: (params) => set({ parameters: params }),

      setResults: (results, summary) => set({ results, summary }),

      loadRun: (run) => set({
        parameters: run.parameters,
        results: run.results,
        summary: run.summary,
      }),

      clearResults: () => set({ results: null, summary: null }),
    }),
    {
      name: 'simulation-storage', // localStorage key
      partialize: (state) => ({
        // Don't persist large results, only parameters
        parameters: state.parameters,
      }),
    }
  )
);
```

3. **Use in Components:**
```typescript
// Home.tsx
const { parameters, results, summary, setParameters, setResults } = useSimulationStore();

// PortfolioConstruction.tsx can now access simulation parameters:
const { parameters: simParams } = useSimulationStore();
const [showCopyFromSimulation, setShowCopyFromSimulation] = useState(false);

// Button: "Copy parameters from Simulation view"
```

**Benefits:**
- State persists across route changes
- Easy cross-view communication
- Simple undo/redo (via middleware)
- DevTools support
- Automatic localStorage sync

**Migration Strategy:**
1. Create stores alongside existing useState
2. Migrate one component at a time
3. Remove local state once stores working
4. Add persist middleware incrementally

### 5.3 Shared Parameter Presets

**Problem:** No way to save/load common configurations

**Solution:** Preset management system

**Implementation:**

1. **Preset Type:**
```typescript
interface Preset {
  id: string;
  name: string;
  description: string;
  category: 'seed' | 'seriesA' | 'multiStage' | 'custom';
  parameters: PortfolioParameters;
  isBuiltIn: boolean;
  createdAt: number;
}
```

2. **Built-in Presets:** `/client/src/lib/presets.ts`
```typescript
export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'seed-typical',
    name: 'Typical Seed Fund',
    description: '100% seed, 25 companies, $50M fund',
    category: 'seed',
    parameters: {
      fundSize: 50,
      numCompanies: 25,
      seedPercentage: 100,
      // ... full parameters
    },
    isBuiltIn: true,
    createdAt: Date.now(),
  },
  // ... more presets
];
```

3. **Preset Selector Component:**
```typescript
<PresetSelector
  onSelectPreset={(preset) => setParameters(preset.parameters)}
  currentPreset={currentPreset}
  customPresets={customPresets}
/>
```

4. **Save Custom Preset:**
```typescript
const saveAsPreset = () => {
  const preset: Preset = {
    id: nanoid(),
    name: presetName,
    description: presetDescription,
    category: 'custom',
    parameters: { ...parameters },
    isBuiltIn: false,
    createdAt: Date.now(),
  };

  await savePresetToIndexedDB(preset);
  toast.success("Preset saved!");
};
```

**Features:**
- Dropdown or modal selector
- Category filtering (seed/A/multi-stage)
- Preview preset parameters
- "Save current as preset"
- Edit/delete custom presets
- Export/import presets (JSON)

### 5.4 URL-Based State for Shareable Scenarios

**Problem:** Cannot share specific scenarios via link

**Solution:** Encode parameters in URL query string

**Implementation:**

1. **URL Serialization:** Use LZ-string for compression
```bash
pnpm add lz-string
```

2. **Encode/Decode Helpers:** `/client/src/lib/url-state.ts`
```typescript
import { compress, decompress } from 'lz-string';

export function encodeParametersToURL(params: PortfolioParameters): string {
  const json = JSON.stringify(params);
  const compressed = compress(json);
  const encoded = encodeURIComponent(compressed);
  return encoded;
}

export function decodeParametersFromURL(encoded: string): PortfolioParameters | null {
  try {
    const decoded = decodeURIComponent(encoded);
    const decompressed = decompress(decoded);
    const params = JSON.parse(decompressed);
    return params;
  } catch {
    return null;
  }
}
```

3. **Use in Components:**
```typescript
// Home.tsx
import { useLocation, useSearch } from 'wouter';

const [location, setLocation] = useLocation();
const search = new URLSearchParams(useSearch());

// On load, check for ?scenario= parameter
useEffect(() => {
  const scenarioParam = search.get('scenario');
  if (scenarioParam) {
    const params = decodeParametersFromURL(scenarioParam);
    if (params) {
      setParameters(params);
      toast.info("Loaded scenario from URL");
    }
  }
}, []);

// Share button
const handleShare = () => {
  const encoded = encodeParametersToURL(parameters);
  const url = `${window.location.origin}/?scenario=${encoded}`;
  navigator.clipboard.writeText(url);
  toast.success("Shareable link copied to clipboard!");
};
```

**Benefits:**
- Share exact scenarios via link
- Bookmark specific configurations
- Embed in documentation/presentations
- Version control parameter sets (Git commit URLs)

**Challenges:**
- URL length limits (2048 chars for IE, 64KB for modern browsers)
- Compression helps but may not be enough for very complex scenarios
- Alternative: Short-link service (store params in DB, return short ID)

### 5.5 Additional Architecture Improvements

#### 5.5.1 Simulation Result Compression

**Problem:** IndexedDB stores large uncompressed result arrays

**Solution:** Compress results before storage
```typescript
import pako from 'pako';

function compressResults(results: SimulationResult[]): Uint8Array {
  const json = JSON.stringify(results);
  return pako.deflate(json);
}

function decompressResults(compressed: Uint8Array): SimulationResult[] {
  const json = pako.inflate(compressed, { to: 'string' });
  return JSON.parse(json);
}
```

**Expected Savings:** 60-80% size reduction

#### 5.5.2 Incremental Simulation Results

**Problem:** Re-running entire simulation wastes computation

**Solution:** Cache intermediate results, only recompute what changed
```typescript
// Hash parameters to detect changes
const paramHash = hashParameters(parameters);

if (cachedHash === paramHash) {
  // Parameters unchanged, use cached results
  return cachedResults;
}

// Only re-run if specific parameters changed
if (onlyStageParamsChanged) {
  // Can reuse company assignments, just resample outcomes
}
```

#### 5.5.3 Server-Side Simulation (Future)

**Current:** All computation client-side
**Future:** Offload heavy computation to server

**Benefits:**
- Faster for large grids (server has more CPU cores)
- Can run overnight batch jobs
- Store results centrally
- Multi-user collaboration

**API Design:**
```
POST /api/simulations
{
  "parameters": { ... },
  "numSimulations": 10000
}

Response:
{
  "jobId": "abc123",
  "status": "running",
  "estimatedCompletion": "2024-03-15T10:30:00Z"
}

GET /api/simulations/abc123
{
  "status": "complete",
  "results": { ... }
}
```

#### 5.5.4 Undo/Redo System

**Use Case:** "Oops, I accidentally changed a parameter"

**Implementation:** Use Zustand's `temporal` middleware
```typescript
import { temporal } from 'zundo';

export const useSimulationStore = create<SimulationStore>()(
  temporal(
    (set) => ({ /* state */ }),
    { limit: 50 } // Keep 50 history states
  )
);

// In component:
const { undo, redo, pastStates, futureStates } = useTemporalStore();

<Button onClick={undo} disabled={pastStates.length === 0}>
  Undo
</Button>
```

#### 5.5.5 Real-Time Collaboration (Advanced)

**Future:** Multiple users editing same scenario

**Tech Stack:**
- WebSockets (Socket.io)
- CRDT (Conflict-free Replicated Data Types) for merge
- Presence indicators ("User X is editing")

**Out of scope for MVP but worth considering for v2.0**

---

## 6. Summary & Prioritization

### 6.1 Critical Improvements (Do First)

1. **Web Workers for Simulations**
   - Impact: High (unblocks UI)
   - Effort: Medium (1-2 weeks)
   - Dependencies: None

2. **Fan Charts / Confidence Intervals**
   - Impact: High (expected by professionals)
   - Effort: Low (1-3 days with Recharts)
   - Dependencies: None

3. **Cash Flow Waterfall**
   - Impact: High (LP reporting essential)
   - Effort: Medium (need to model cash flow timing)
   - Dependencies: Simulation engine changes

4. **Scenario Comparison View**
   - Impact: High (requested feature)
   - Effort: Medium (1 week)
   - Dependencies: State management improvements

### 6.2 High Priority (Do Next)

5. **Better State Management (Zustand)**
   - Impact: Medium-High (enables many features)
   - Effort: Medium (refactor existing code)
   - Dependencies: None

6. **Sensitivity Analysis Dashboard**
   - Impact: High (professional feature)
   - Effort: High (2-3 weeks)
   - Dependencies: Web workers

7. **Preset Library**
   - Impact: Medium (UX improvement)
   - Effort: Low (1 week)
   - Dependencies: None

8. **URL-Based Sharing**
   - Impact: Medium (collaboration)
   - Effort: Low (2-3 days)
   - Dependencies: None

### 6.3 Medium Priority (Nice-to-Have)

9. **LP Returns Calculator**
   - Impact: Medium (LP-facing feature)
   - Effort: Medium
   - Dependencies: None

10. **Power Law Analysis View**
    - Impact: Medium (educational)
    - Effort: Low
    - Dependencies: None

11. **Onboarding Wizard**
    - Impact: Medium (new user experience)
    - Effort: Medium
    - Dependencies: None

12. **Export Enhancements (PDF, Excel, charts)**
    - Impact: Medium (professional polish)
    - Effort: Medium-High
    - Dependencies: None

### 6.4 Lower Priority (Future)

13. **Fund Lifecycle Timeline**
    - Impact: Low (nice visualization)
    - Effort: Medium
    - Dependencies: None

14. **Historical Vintage Comparison**
    - Impact: Low (requires data acquisition)
    - Effort: Medium
    - Dependencies: Benchmark data

15. **Interactive Parameter Sliders**
    - Impact: Low (UX polish)
    - Effort: High
    - Dependencies: Web workers

16. **Server-Side Simulation**
    - Impact: Low (not needed until >10K sims)
    - Effort: Very High
    - Dependencies: Backend infrastructure

---

## 7. Recommended Roadmap

### Phase 1: Performance & Core Visualizations (4-6 weeks)

**Goals:**
- Eliminate UI blocking
- Add essential professional visualizations
- Improve state management

**Deliverables:**
1. Web workers for simulations
2. Fan charts with confidence intervals
3. Cash flow waterfall view
4. Zustand state management migration
5. Basic scenario comparison (2 scenarios side-by-side)

**Success Metrics:**
- UI remains responsive during all operations
- Users can compare scenarios
- Professional visualizations match industry standards

### Phase 2: UX & Collaboration (4-6 weeks)

**Goals:**
- Improve new user experience
- Enable sharing and collaboration
- Add advanced analysis tools

**Deliverables:**
1. Sensitivity analysis dashboard
2. Preset library with built-in templates
3. URL-based state sharing
4. Onboarding wizard
5. Enhanced export (PDF reports, chart downloads)
6. Keyboard shortcuts documentation

**Success Metrics:**
- New users complete first simulation within 5 minutes
- Scenarios shared via URL work 100% of time
- Sensitivity analysis identifies key drivers

### Phase 3: Advanced Features (6-8 weeks)

**Goals:**
- LP-facing features
- Educational content
- Professional polish

**Deliverables:**
1. LP returns calculator (net of fees)
2. Power law analysis view
3. Fund lifecycle timeline
4. Historical vintage comparison (with curated benchmark data)
5. Glossary and methodology documentation
6. Interactive tutorials
7. Excel export with formatting

**Success Metrics:**
- LPs can generate investor-ready reports
- Educational content reduces support questions
- Export formats accepted by institutional investors

---

## 8. Conclusion

The VC Portfolio Monte Carlo Simulator has a solid architectural foundation with React, TypeScript, and IndexedDB storage. However, several critical improvements are needed to elevate it to a professional-grade tool:

**Strengths:**
- Clean component architecture
- TypeScript type safety
- Dark theme optimized for extended use
- IndexedDB for unlimited storage
- Grid analysis for portfolio construction

**Critical Gaps:**
- UI blocking during computation (needs web workers)
- Limited visualizations (missing fan charts, waterfalls, sensitivity)
- No scenario comparison capabilities
- Local-only state (doesn't persist across navigation)
- Minimal onboarding for new users

**Recommended Next Steps:**
1. Implement web workers (highest impact/effort ratio)
2. Add fan charts and cash flow waterfall (expected by professionals)
3. Migrate to Zustand for better state management
4. Build scenario comparison view
5. Create preset library and URL sharing

By addressing these architectural and UX improvements, the simulator will transition from a functional prototype to a professional tool suitable for institutional LPs, fund managers, and VC analysts.

---

**Document End**
