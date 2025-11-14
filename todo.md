# VC Monte Carlo Simulator TODO

## Stage-Specific Investment Support (Major Redesign)
- [x] Update TypeScript types to support stage-specific parameters
- [x] Add StageParameters type with check size, ownership, and exit distribution
- [x] Update PortfolioParameters to include seed and Series A stage configs
- [x] Add portfolio composition field (% seed vs % Series A)
- [x] Update simulation logic to sample from stage-specific distributions
- [x] Redesign ParametersPanel UI with tabbed or accordion stage sections
- [x] Add "Seed Stage" parameter section with tooltips
- [x] Add "Series A Stage" parameter section with tooltips
- [x] Add portfolio composition slider/input
- [x] Update defaults with realistic seed assumptions (higher risk, higher upside)
- [x] Update defaults with realistic Series A assumptions (lower risk, moderate returns)
- [x] Update export functions to include stage-specific data
- [x] Update historical runs display to show stage composition
- [x] Test simulation with different stage mixes
- [x] Update README with stage-specific documentation

## Completed Features
- [x] Core simulation engine with Monte Carlo iterations
- [x] Interactive parameter panel with validation
- [x] Three visualization charts (MOIC, IRR, Outliers)
- [x] Summary statistics and probability metrics
- [x] Historical runs panel with localStorage
- [x] CSV and JSON export functionality
- [x] Tooltips on exit distribution buckets
- [x] Dark theme professional design
- [x] Mobile-responsive layout

## Bug Fix: localStorage Quota Exceeded
- [x] Modify storage.ts to NOT save full simulation results (too large)
- [x] Only save summary statistics and parameters
- [x] Limit maximum number of saved runs (e.g., 20 most recent)
- [x] Add automatic cleanup of oldest runs when limit reached
- [x] Update SavedRun type to remove results field
- [x] Update HistoricalRunsPanel to work without full results
- [ ] Test that storage works within quota limits

## IndexedDB Migration (Unlimited Storage)
- [x] Create IndexedDB wrapper utilities with async API
- [x] Implement database initialization with proper schema
- [x] Implement saveRun function using IndexedDB
- [x] Implement loadSavedRuns function using IndexedDB
- [x] Implement deleteAllRuns function using IndexedDB
- [x] Update SavedRun type to include full results again
- [x] Update Home.tsx to use async storage functions
- [x] Update HistoricalRunsPanel to use async storage functions
- [x] Add migration utility to transfer localStorage data to IndexedDB
- [x] Fix NaN display issue for old runs without seedPercentage
- [x] Test IndexedDB storage with multiple simulation runs
- [x] Verify no quota exceeded errors with large datasets

## Portfolio Construction Analyzer

### Types and Simulation Logic
- [x] Create GridAnalysisParameters type (fund size, investment count range, seed percentages)
- [x] Create GridScenario type (investment count, seed %, results, deployment metrics)
- [x] Create GridAnalysisResult type (scenarios array, best strategies, commentary)
- [x] Implement grid parameter generation (calculate buckets ≤10 for investment counts)
- [x] Implement runGridAnalysis function to simulate all scenario combinations)
- [x] Add capital deployment calculation logic (actual deployed vs fund size)
- [x] Add reserve ratio auto-adjustment based on stage mix

### UI - Parameter Panel
- [x] Create PortfolioConstructionPage component
- [x] Add fund size input (default $200M)
- [x] Add investment count range inputs (min/max)
- [x] Add seed percentage multi-select (0%, 25%, 50%, 75%, 100%)
- [x] Add number of simulations input
- [x] Add "Run Grid Analysis" button with validation
- [x] Add loading state during grid simulation

### UI - Results Visualization
- [x] Create heatmap grid component (rows = investment counts, columns = seed %)
- [x] Add color coding by MOIC or IRR (user toggle)
- [x] Add cell click handler to show detailed scenario metrics
- [x] Create "Best Strategies" section showing top scenarios
- [x] Add deployment % metric display
- [x] Add P10/P90 percentile displays
- [ ] Add export functionality for grid results

### AI Commentary
- [x] Implement commentary generation analyzing grid patterns
- [x] Identify optimal strategies by different criteria (highest MOIC, best risk-adjusted, etc.)
- [x] Generate insights about seed vs Series A trade-offs
- [x] Add deployment efficiency analysis
- [x] Display commentary in results section

### Storage and Navigation
- [x] Update IndexedDB schema to support grid analyses
- [x] Implement saveGridAnalysis function
- [x] Implement loadGridAnalyses function
- [x] Add tab navigation (Simulation vs Portfolio Construction)
- [x] Update App.tsx with routing for new tab
- [x] Add historical grid analyses panel

### Testing
- [x] Test grid analysis with various parameter combinations
- [x] Verify deployment calculations are accurate
- [x] Test heatmap visualization and interactions
- [x] Verify commentary generation
- [x] Test IndexedDB storage for grid analyses
- [x] Test tab navigation

## Portfolio Construction Improvements

### UI Simplification
- [x] Remove IRR toggle from heatmap (MOIC only)
- [x] Remove IRR column from best strategies cards
- [x] Simplify simulations per scenario input (remove increment/decrement buttons)

### Stage-Specific Parameters
- [x] Add Seed Stage parameter editor to Portfolio Construction page
- [x] Add Series A Stage parameter editor to Portfolio Construction page
- [x] Include check size inputs for both stages
- [x] Include reserve ratio inputs for both stages
- [x] Include exit distribution editors for both stages
- [x] Update grid analysis to use user-configured stage parameters instead of defaults
- [x] Add accordion/collapsible sections for stage parameters

## Add Worst Strategies Section

- [x] Add identifyWorstStrategies function to grid-analysis.ts
- [x] Identify lowest median MOIC strategy
- [x] Identify worst risk-adjusted return (low MOIC with high volatility)
- [x] Identify poorest capital efficiency (low MOIC with high deployment)
- [x] Update GridResultsView to display "Worst Strategies" section
- [x] Style worst strategies cards with warning colors (red/orange)
- [x] Test worst strategies identification

## Formatting Fixes

- [x] Fix analyst commentary to use HTML/CSS formatting instead of markdown
- [x] Remove leading zeros from number input fields
- [x] Test commentary rendering
- [x] Test number input behavior

## Add Variance Metrics

- [x] Add standard deviation calculation to summary statistics
- [x] Display MOIC standard deviation in simulation results
- [x] Show P10-P90 range more prominently in results cards
- [x] Add variance metrics to best/worst strategies cards in grid analysis
- [x] Update heatmap cells to show variance indicator (optional tooltip)
- [x] Ensure UI remains clean and uncluttered
- [x] Test variance display in both simulation and grid analysis views

## Grid Cell Detail Modal

- [x] Create ScenarioDetailModal component
- [x] Add MOIC distribution histogram in modal
- [x] Add IRR distribution histogram in modal
- [x] Display full percentile breakdown (P10, P25, P50, P75, P90)
- [x] Show standard deviation and variance metrics
- [x] Display probability thresholds (2x, 3x, 5x MOIC)
- [x] Show deployment metrics and company counts
- [x] Add modal trigger on grid cell click
- [x] Test modal with different scenarios

## Fix IRR Calculation Bug

- [x] Investigate IRR calculation in simulation.ts
- [x] Identify why IRR is showing 0.3% instead of ~30%
- [x] Fix IRR display formatting (multiply by 100 before displaying)
- [x] Test IRR calculations with known scenarios
- [x] Verify IRR displays correctly in all views (simulation, grid analysis, modal)

## Grid Visualization Improvements

- [x] Add variance statistics (σ, P10-P90) to grid heatmap cells
- [x] Add visual strikethrough/cross-out for cells with <60% deployment
- [x] Soften color gradient to only highlight top 10% and bottom 10% performers
- [x] Update color scale calculation to use percentile-based thresholds
- [x] Test grid visualization with new styling

## Add Over-Deployment Strikethrough

- [x] Add visual strikethrough for scenarios with >200% deployment
- [x] Update grid cell rendering logic to handle both under and over deployment
- [x] Test grid with over-deployment strikethrough

## Realistic Follow-on Investment Logic

- [x] Research Carta/PitchBook data on valuation step-ups by stage
- [x] Research follow-on participation rates and pro-rata behavior
- [x] Redesign follow-on logic to model pro-rata based on company success
- [x] Add valuation step-up parameters (e.g., Seed→A: 3-5x, A→B: 2-3x)
- [x] Model selective deployment (only winners get follow-on)
- [x] Calculate follow-on size based on maintaining ownership percentage
- [x] Update types to support new follow-on parameters
- [x] Update defaults with realistic market assumptions
- [x] Test new follow-on logic with various scenarios

## UX Improvements

- [x] Fix IRR distribution x-axis formatting (weird labels)
- [x] Pin Run Simulation button to top of page in Simulation view
- [x] Pin Run Grid Analysis button to top of page in Portfolio Construction view
- [x] Install react-hotkeys-hook library
- [x] Add keyboard shortcut (Cmd/Ctrl+Enter) to run simulation
- [x] Add keyboard shortcut (Cmd/Ctrl+Enter) to run grid analysis
- [x] Update default fund size from $100M to $200M
- [x] Add benchmark data visualization to Portfolio Construction view
- [x] Show industry benchmarks (top quartile, median, bottom quartile)
- [x] Add visual comparison of simulation results vs benchmarks
- [x] Test all keyboard shortcuts
- [x] Test pinned buttons on mobile

## Aesthetic Redesign (Light Analytics Dashboard Theme)

- [x] Switch from dark theme to light theme (white/light gray backgrounds)
- [x] Update color palette with vibrant analytics colors (blue, green, purple, cyan)
- [x] Add subtle shadows and borders to cards instead of heavy borders
- [x] Increase white space and padding for breathing room
- [x] Update chart colors to match Amplitude-style vibrant palette
- [x] Refine typography hierarchy (font sizes, weights, spacing)
- [x] Update button styling to minimal flat design
- [x] Redesign data tables with subtle row separators
- [x] Update parameter panel styling with clean white cards
- [x] Test light theme across all views

## UI Refinement & Dark Theme Revert

- [x] Revert from light theme back to dark theme
- [x] Update all color variables in index.css to dark theme
- [x] Convert parameters sidebar to scrollable card with fixed height
- [x] Ensure results are always visible without scrolling
- [x] Review spacing and hierarchy with critical design eye
- [x] Test scrolling behavior on parameters panel
- [x] Test dark theme across all views

## Color Palette Refinement (Reduce Eye Strain)

- [x] Replace pure black with dark gray (#0d1117 or #121212)
- [x] Replace 100% white text with 87% opacity for high-emphasis text
- [x] Update secondary text to 60% opacity
- [x] Update muted text to 45% opacity (using 60%)
- [x] Update card backgrounds to elevated surface color (#161b22)
- [x] Update borders to subtle rgba(255, 255, 255, 0.1)
- [x] Replace harsh accent colors with desaturated versions
- [x] Update chart colors to softer, less saturated versions
- [x] Test color contrast ratios meet WCAG AA standards
- [x] Test refined palette across all views

## Comprehensive UI Audit (Fix Remaining Light Elements)

- [x] Fix top bar - remove white background, ensure button visibility
- [x] Fix historical runs cards - apply dark theme styling
- [x] Fix grid results/sensitivities in Portfolio Construction view
- [x] Audit all Card components for white backgrounds
- [x] Audit all button styles for visibility on dark backgrounds
- [x] Check metric cards, probability badges, and stat displays
- [x] Test both Simulation and Portfolio Construction views
- [x] Verify 100% dark theme consistency across all elements

## UI Refinements (Polish)

- [x] Remove number input spinners (up/down arrows) with CSS
- [x] Pin top bar to viewport top (stays visible when scrolling)
- [x] Add background shade to stage parameters sections for visual distinction
- [x] Create keyboard shortcuts modal component
- [x] Add "?" key listener to show shortcuts modal
- [x] List all keyboard shortcuts in modal (Cmd/Ctrl+Enter to run)
- [x] Test all refinements across both views

## Bug Fix - Dialog Ref Warning

- [x] Fix DialogOverlay component ref warning by wrapping with React.forwardRef
- [x] Test Dialog component to verify warning is resolved

## Bug Fix - Badge Text Contrast

- [x] Fix "Top Quartile" badge text contrast for better readability
- [x] Test badge visibility across all quartile levels
