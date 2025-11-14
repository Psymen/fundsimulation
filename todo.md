# VC Monte Carlo Simulator TODO

## Core Simulation Logic
- [x] Define TypeScript types for portfolio parameters, exit buckets, simulation results, and summary statistics
- [x] Implement single simulation function with company-level outcome sampling
- [x] Implement batch simulation function to run multiple Monte Carlo iterations
- [x] Add IRR calculation logic based on exit timing and capital deployment
- [x] Add MOIC and other fund-level metrics calculation

## Parameter Panel
- [x] Create ParametersPanel component with all fund parameter inputs
- [x] Add exit distribution editor table with validation
- [x] Implement probability sum validation (must equal 100%)
- [x] Add "Run simulations" button with validation
- [x] Add "Reset to default assumptions" button
- [x] Set sensible defaults for seed/Series A fund

## Visualization Area
- [x] Install and configure charting library (Recharts)
- [x] Create ChartsPanel component
- [x] Implement MOIC histogram
- [x] Implement IRR histogram
- [x] Implement outliers distribution chart
- [x] Add summary metric cards (median, 10th/90th percentile)
- [x] Add probability threshold cards (2x, 3x, 5x MOIC)
- [x] Add help text for each metric

## Historical Runs Panel
- [x] Create HistoricalRunsPanel component
- [x] Implement localStorage persistence for runs
- [x] Display list of previous runs with timestamp and key metrics
- [x] Add click handler to view run details
- [x] Add "Load parameters" functionality
- [x] Add "Delete all saved runs" action

## Export and Data Management
- [x] Add CSV export button for simulation results
- [x] Add JSON export for current parameters (copy to clipboard)
- [x] Implement proper error handling for exports

## UI/UX Polish
- [x] Design clean, responsive layout (works on laptop and tablet)
- [x] Add input validation with clear error messages
- [x] Disable Run button when inputs are invalid
- [x] Add loading states during simulation runs
- [x] Ensure mobile-responsive design

## Documentation
- [x] Create README with installation instructions
- [x] Document modeling assumptions and limitations
- [x] Add notes on customizing defaults

## Testing and Quality
- [x] Test simulation logic correctness
- [x] Verify all calculations (MOIC, IRR, probabilities)
- [x] Test localStorage persistence
- [x] Test CSV and JSON export
- [x] Cross-browser testing
