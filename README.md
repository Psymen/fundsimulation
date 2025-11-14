# VC Portfolio Monte Carlo Simulator

A professional web application for running Monte Carlo simulations on early-stage venture capital portfolios. Visualize fund outcomes including MOIC (Multiple on Invested Capital) and IRR (Internal Rate of Return) distributions under different assumptions.

## Features

- **Monte Carlo Simulation Engine**: Run thousands of simulations to model portfolio outcomes
- **Interactive Parameter Configuration**: Customize fund size, portfolio composition, exit distributions, and timing
- **Rich Visualizations**: View histograms of MOIC, IRR, and outlier distributions
- **Summary Statistics**: Analyze median, P10, P90 percentiles and probability thresholds
- **Historical Tracking**: Save and compare multiple simulation runs in browser localStorage
- **Data Export**: Export results to CSV and copy parameters as JSON
- **Responsive Design**: Works seamlessly on desktop and tablet devices

## Installation

### Prerequisites

- Node.js 22.x or higher
- pnpm package manager

### Setup

1. Clone or download the project
2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open your browser to the URL shown in the terminal (typically `http://localhost:3000`)

## Usage

### Basic Workflow

1. **Configure Parameters** (left panel):
   - Set fund size, number of portfolio companies, check sizes
   - Define investment period and fund life
   - Customize exit window timing

2. **Edit Exit Distribution** (left panel):
   - Adjust probabilities for each outcome bucket (must sum to 100%)
   - Set min/max return multiples for each bucket
   - Default distribution reflects typical early-stage VC outcomes

3. **Run Simulations**:
   - Click "Run Simulations" button
   - Wait for results to compute (typically instant for 1,000 simulations)

4. **Analyze Results** (center panel):
   - Review MOIC and IRR histograms
   - Examine summary statistics and percentiles
   - Check probability of achieving return thresholds

5. **Compare Historical Runs** (right panel):
   - View previously saved simulations
   - Load parameters from past runs
   - Track how assumptions affect outcomes

### Export Options

- **Export CSV**: Download detailed results for all simulations
- **Copy Parameters**: Copy current parameter configuration as JSON to clipboard

## Modeling Assumptions

### Portfolio Model

The simulator models a single VC fund making N initial investments with the following characteristics:

- **Capital Deployment**: Initial check size plus follow-on reserves (specified as % of initial)
- **Investment Timing**: Capital drawn evenly over the investment period
- **Exit Timing**: Each company exits at a randomly sampled year within the exit window
- **Ownership**: Target ownership is for reference only and doesn't affect calculations

### Exit Distribution

The simulator uses a discrete outcome model where each portfolio company falls into one of five buckets:

1. **Total Loss** (0x): Complete write-off
2. **Low Return** (0.1x - 1x): Partial loss to breakeven
3. **Mid Return** (1x - 5x): Modest positive returns
4. **High Return** (5x - 20x): Strong performers
5. **Outlier** (20x+): Home runs that drive fund returns

For each simulation:
- An outcome bucket is sampled based on configured probabilities
- A return multiple is sampled uniformly within that bucket's range
- An exit year is sampled uniformly within the exit window

### Metrics Calculated

- **Gross MOIC**: Total returned capital ÷ Total invested capital
- **Multiple on Committed Capital**: Total returned capital ÷ Fund size
- **Gross IRR**: Internal rate of return using Newton-Raphson approximation
- **Write-offs**: Companies with returns < 0.1x
- **Outliers**: Companies with returns ≥ 20x

### Limitations

This is a simplified model for educational and planning purposes. Real-world considerations not captured:

- **Management Fees & Carry**: Calculations are gross, not net to LPs
- **Dilution**: Ownership changes over funding rounds not modeled
- **Follow-on Strategy**: Follow-ons are fixed % of initial, not selective
- **Correlation**: Company outcomes are independent (no market correlation)
- **Partial Exits**: Assumes single exit event per company
- **Recycling**: Does not model capital recycling
- **Fund Expenses**: Operating expenses not included
- **Timing Precision**: Uses simplified mid-year convention for deployments

## Customization

### Changing Default Assumptions

To modify default parameters for your specific fund:

1. Edit `client/src/lib/defaults.ts`
2. Update `DEFAULT_PARAMETERS` object with your values
3. Modify `DEFAULT_EXIT_BUCKETS` to reflect your expected outcome distribution

### Exit Distribution Guidelines

Typical early-stage VC distributions:

- **Seed/Pre-Seed**: Higher write-off rate (50-60%), lower outlier probability (1-2%)
- **Series A**: Moderate write-offs (40-50%), moderate outliers (2-3%)
- **Series B+**: Lower write-offs (30-40%), higher outliers (3-5%)

Adjust based on your:
- Investment stage
- Sector focus (e.g., biotech vs. SaaS)
- Geographic market
- Historical portfolio data

## Technical Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Charts**: Recharts
- **State Management**: React hooks (useState, useEffect)
- **Data Persistence**: Browser localStorage

## Project Structure

```
client/src/
├── components/          # UI components
│   ├── ParametersPanel.tsx
│   ├── ChartsPanel.tsx
│   └── HistoricalRunsPanel.tsx
├── lib/                # Utilities and logic
│   ├── simulation.ts   # Monte Carlo engine
│   ├── defaults.ts     # Default parameters
│   ├── storage.ts      # localStorage utilities
│   └── export.ts       # CSV/JSON export
├── types/              # TypeScript definitions
│   └── simulation.ts
└── pages/              # Page components
    └── Home.tsx        # Main application page
```

## Development

### Running Tests

The simulation logic can be tested by running simulations with known parameters and verifying:

- Probability distributions match input buckets
- MOIC calculations are correct
- IRR approximations are reasonable
- Summary statistics (percentiles) are accurate

### Code Quality

- All core logic uses pure functions for testability
- TypeScript types ensure type safety throughout
- Input validation prevents invalid configurations
- Error handling for edge cases (e.g., negative values)

## License

This project is provided as-is for educational and internal use.

## Support

For questions or issues, please refer to the code comments and this documentation.
