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
