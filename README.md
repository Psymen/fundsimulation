# VC Portfolio Monte Carlo Simulator

A professional Monte Carlo simulation tool for venture capital portfolio modeling with **stage-specific investment parameters**. Model seed and Series A investments separately with different risk/return profiles to generate realistic fund-level projections.

## Features

### 🎯 Stage-Specific Modeling
- **Separate parameters for Seed and Series A** investments
- Different check sizes, reserve ratios, and exit distributions per stage
- Portfolio composition control (% seed vs % Series A)
- Realistic defaults based on industry benchmarks

### 📊 Comprehensive Analytics
- **MOIC Distribution**: Histogram of Multiple on Invested Capital across simulations
- **IRR Distribution**: Internal Rate of Return distribution with timing effects
- **Outliers Analysis**: Track frequency of 20x+ returns
- **Summary Statistics**: Median, P10, P90 percentiles for all metrics
- **Probability Thresholds**: Chance of achieving 2x, 3x, 5x MOIC

### 💾 Data Management
- **Historical Runs**: Automatic saving of all simulation runs to localStorage
- **Parameter Loading**: Reload parameters from any previous run
- **CSV Export**: Download full simulation results for external analysis
- **JSON Export**: Copy parameters to clipboard for sharing

### 🎨 User Experience
- Clean, professional dark theme optimized for extended use
- Responsive design works on desktop, laptop, and tablet
- Real-time validation with clear error messages
- Informative tooltips explaining each parameter
- Accordion UI for easy navigation between stages

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## How It Works

### Investment Stages

The simulator models two distinct investment stages:

**Seed Stage**
- Typical check size: $2M
- Higher risk profile: 50% total loss rate
- Higher upside potential: 3% chance of 20x+ outliers
- Follow-on reserve: 50% of initial check

**Series A Stage**
- Typical check size: $5M
- Lower risk profile: 30% total loss rate
- Moderate upside: 1% chance of 20x+ outliers
- Follow-on reserve: 50% of initial check

### Portfolio Composition

Use the **Seed Percentage** slider to control the mix:
- 60% seed = 15 seed investments + 10 Series A (for 25 company portfolio)
- 40% seed = 10 seed investments + 15 Series A
- Adjust based on your fund strategy

### Exit Distribution Buckets

Each stage has five outcome categories:

1. **Total Loss (0x)**: Complete write-off
2. **Low Return (0.1x - 1x)**: Partial loss or breakeven
3. **Mid Return (1x - 5x)**: Solid returns
4. **High Return (5x - 20x)**: Strong performers
5. **Outlier (20x - 150x)**: Fund-returning winners

The probability and return range for each bucket can be customized per stage.

### Simulation Process

For each of 1000 simulations:

1. **Portfolio Construction**
   - Allocate companies to seed vs Series A based on composition %
   - Assign initial check size per stage

2. **Company Outcomes**
   - Sample from stage-specific exit distribution
   - Apply random multiplier within bucket range
   - Calculate follow-on investment (reserve ratio × initial check)

3. **Timing**
   - Random exit year within exit window (default: years 3-10)
   - Deploy capital evenly over investment period (default: 3 years)

4. **Fund Metrics**
   - Sum all returns across portfolio
   - Calculate MOIC = Total Returns / Total Invested
   - Calculate IRR using cash flow timing

5. **Aggregation**
   - Collect MOIC, IRR, outlier count across all simulations
   - Compute percentiles and probability thresholds

## Key Modeling Assumptions

### What's Included
- ✅ Stage-specific risk/return profiles
- ✅ Follow-on reserve deployment
- ✅ Exit timing variability
- ✅ Capital deployment schedule
- ✅ Portfolio construction effects

### Simplifications
- ❌ No management fees or carry
- ❌ No recycling of proceeds
- ❌ No partial exits or secondary sales
- ❌ No correlation between company outcomes
- ❌ No fund-level diversification across vintages

### Important Notes

**Returns are GROSS, not net**
The simulator shows gross MOIC and IRR before fees. Typical VC funds charge 2% annual management fees and 20% carry, which significantly reduce net returns to LPs.

**Stage labels are flexible**
While defaults are set for seed/Series A, you can model any two stages:
- Pre-seed / Seed
- Series A / Series B
- Growth / Late-stage

Simply adjust the parameters to match your target stages.

**Distributions are independent**
Each company outcome is sampled independently. In reality, macro factors create correlation (e.g., market crashes affect multiple companies). This model assumes diversification across time and sector.

## Customizing Defaults

Edit `client/src/lib/defaults.ts` to change:
- Fund size and portfolio company count
- Stage-specific check sizes and reserve ratios
- Exit distribution probabilities and ranges
- Investment period and exit windows
- Number of Monte Carlo iterations

## Technical Stack

- **React 19** with TypeScript for type safety
- **Tailwind CSS 4** for styling
- **Recharts** for data visualization
- **shadcn/ui** for component primitives
- **Wouter** for client-side routing
- **localStorage** for persistence

## Use Cases

### Fund Strategy Analysis
- Compare seed-heavy vs Series A-heavy portfolio construction
- Model impact of reserve ratio changes
- Evaluate different exit distribution assumptions

### LP Communication
- Generate realistic return distributions for fundraising
- Illustrate portfolio construction effects
- Demonstrate risk/return tradeoffs

### Internal Planning
- Stress test fund models with different assumptions
- Calibrate expectations based on historical data
- Scenario plan for different market environments

## Limitations

This is a **simplified model** for educational and planning purposes. Real VC portfolios involve:
- Complex capital structures (preferred stock, liquidation preferences)
- Dynamic follow-on decisions based on company performance
- Market timing and vintage year effects
- Sector-specific risk profiles
- Fund-to-fund variation in selection skill

**Always consult with financial professionals** for investment decisions.

## License

MIT License - feel free to modify and use for your own analysis.

## Contributing

Suggestions for improvements:
1. Add more investment stages (pre-seed, Series B, growth)
2. Model correlation between company outcomes
3. Add management fee and carry calculations
4. Include fund recycling mechanics
5. Support custom distribution shapes (lognormal, power law)

---

Built with ❤️ for the VC community
