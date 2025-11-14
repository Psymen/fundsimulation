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
