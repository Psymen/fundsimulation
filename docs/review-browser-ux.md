# VC Portfolio Simulator - Browser UX Review

**Date:** 2026-02-15
**Testing method:** Automated Playwright tests at 1920x1080, 768x1024 (tablet), and 375x812 (mobile) viewports
**Browser:** Chromium (headless)
**App URL:** http://localhost:3000/

---

## Executive Summary

The app is a well-built dark-themed VC fund simulation tool with five distinct views. The desktop experience is polished with clear navigation, fast performance, and rich data visualizations. The main areas for improvement are: (1) mobile responsiveness -- navigation overflows on small screens, (2) a misconfigured analytics endpoint producing 404 errors on every page, and (3) the Simulation view's left panel is extremely long and could benefit from better information density. Overall the app is functional and visually cohesive.

---

## 1. Simulation View (`/`)

### What Works Well
- **Clear empty state**: Before running, the center area shows "No simulation results yet" with instructions to click "Run Simulations." The empty state messaging is helpful.
- **Rich results**: After running, results include median MOIC (2.62x), median IRR (20.8%), outlier count, and additional P10/P50/P90 metrics. The color-coded metric cards (blue, purple, orange, green) are visually distinct and readable.
- **Four charts render correctly**: TPI/TVPI J-Curve, Fund MOIC Distribution, IRR Distribution, and Outliers per Simulation all display with proper axis labels and legends.
- **Probability of failure bar** (0.7% total loss, 0.4% partial, 0.1% near break-even) is a useful visual summary with color gradients (red to green).
- **Historical Runs panel** on the right preserves previous runs with timestamps and key metrics, with a "Load Parameters" button to restore past configurations.
- **Performance**: Simulation completes in approximately 85ms -- essentially instant. No perceptible lag.
- **Export CSV button** is properly disabled before running (grayed out), then enabled after results appear.
- **"Copy Parameters" and "Reset" buttons** provide useful utility actions in the top bar.
- **Sticky navigation**: The top nav bar remains pinned when scrolling, confirmed by testing.

### Issues

#### HIGH: Left parameter panel is excessively long
The parameters sidebar contains 50 number inputs across Fund Setup, Seed Stage, Seed Exit Distribution, Series A Stage, Series A Exit Distribution, and Fee Structure sections. This makes the page extremely tall when scrolled. The collapsible accordion sections (Seed Stage, Series A Stage, Fee Structure) help, but the exit distribution tables with Prob/Min/Max columns for 6 outcome categories each are verbose.

**Recommendation:** Consider a more compact layout for exit distribution tables, or collapse them by default with a "show advanced" toggle.

#### MEDIUM: Input labels not programmatically associated
The test detected that all 50 inputs have empty label associations (`label: ""`). While the visual labels are present above the inputs, the `<label>` elements are not using `for` attributes or wrapping the inputs. This is an accessibility concern for screen readers.

#### LOW: No loading indicator during simulation
The simulation runs in ~85ms so this is rarely noticeable, but there is no spinner or progress indicator while the computation runs. For larger simulation counts, this could leave users uncertain about status.

---

## 2. Portfolio Construction View (`/portfolio-construction`)

### What Works Well
- **Excellent empty state**: Shows "No Analysis Yet" with clear instructions to "Configure your parameters and click 'Run Grid Analysis' to explore optimal portfolio construction strategies."
- **Clean parameter layout**: Fund Size, Investment Count Range (Min/Max), Seed Percentage Mix checkboxes, and Simulations per Scenario are well-organized.
- **Rich post-analysis results**: After running (~895ms), displays:
  - "Best Strategies" section with Highest Median MOIC, Highest Median IRR, Best Downside Protection, and a "Strategies to Avoid" card.
  - A "Portfolio Performance Heatmap" grid showing median MOIC across company counts (rows) vs. seed percentages (columns), with color-coded cells (green for high, red for low).
  - "Analysis Commentary" with detailed text insights about stage mix, portfolio size, and capital deployment.
- **Heatmap is readable**: The grid cells show MOIC values with IRR and probability metrics in smaller text. The color coding (dark red for low performers, green for high) is visually clear against the dark background.
- **"View Benchmarks" button** appears after results, offering industry context.
- **Collapsible stage parameters**: Seed Stage Parameters and Series A Stage Parameters are in collapsible accordions, keeping the form compact.

### Issues

#### MEDIUM: Heatmap small text readability
The heatmap cells contain 4 lines of data (MOIC, IRR, Prob <1x, performance label). At 1920px width this is fine, but the sub-metrics (IRR, probability) are quite small. On the tablet viewport, this grid would need horizontal scrolling.

#### LOW: Blank buttons in DOM
The test detected several buttons with empty text content (`""`) in the button list. These appear to be icon-only buttons (likely the checkbox toggles for seed percentage mix). They should have `aria-label` attributes for accessibility.

---

## 3. Power Law Explorer (`/power-law`)

### What Works Well
- **Clean, focused layout**: Just two inputs (Fund Size and # Companies) and an "Analyze" button on a single line. Very intuitive.
- **Excellent empty state**: "Ready to Explore" with a chart icon and clear instructions.
- **Four metric cards at top**: Gross MOIC (2.0x), Gini Coefficient (0.84), Top 3 Company contribution (38.6% of total fund value), and Outlier count (0/25). These immediately communicate the power law dynamics.
- **Return Concentration curve**: Shows cumulative value contribution by company rank. The curve with colored bands (Top 1, Top 3, Top 5, Top 10) at different percentile thresholds is an effective visualization.
- **Outlier Sensitivity Analysis**: A slider for "best company return multiple" shows how changing the top performer's return affects fund MOIC. The chart with labeled difficulty zones (Achievable, Very Rare, Extremely Rare) is educational and well-designed.
- **To achieve a 3x MOIC table**: Lists required company returns and number of companies needed, with color-coded difficulty labels. Very practical reference.
- **Power Law Fit Visualization**: Log-scale scatter plot showing actual returns vs. theoretical Pareto distribution with regression line. Includes a Gini coefficient interpretation in the "Key Insight" section.

### Issues

#### LOW: No range sliders detected
The initial test found 0 sliders, but the Outlier Sensitivity section has a custom slider component (role="slider"). This works fine visually -- just noting the implementation uses a custom component rather than native `<input type="range">`.

#### LOW: Single simulation only
The Power Law Explorer runs a single portfolio simulation (not Monte Carlo). This is clearly stated in the empty state text, but some users might expect averaged results. The data changes on each "Analyze" click, which could be confusing.

---

## 4. Fund Economics (`/fund-economics`)

### What Works Well
- **No "run" button needed**: This is a live calculator that updates in real-time. The waterfall chart and all metrics respond immediately to parameter changes. This is the correct design choice for this type of tool.
- **Waterfall Calculator section**: The Gross MOIC slider (custom component, range 0.5x-10x) dynamically updates:
  - Gross Proceeds, Mgmt Fees, Carry, Net to LP, Net MOIC, Fee Drag, GP Total Comp, and Distributable amounts.
  - A colorful waterfall bar chart showing the flow from Gross Returns through fees to Net LP distribution.
- **Fund Size Sensitivity chart**: Shows how GP carry, LP net MOIC, and fee drag change across fund sizes. Two y-axes (MOIC and money amount) are properly labeled.
- **GP vs LP Economics table**: Clear breakdown across MOIC scenarios (1x through 10x) showing Mgmt Fees, Carry Split, Net LP MOIC, and Fee Drag %. The row where carry kicks in above the hurdle rate is highlighted in green.
- **Comprehensive Fund Parameters**: Fund Size, Fund Life, Investment Period, Mgmt Fee, Carry, Hurdle Rate, GP Commit -- all editable with sensible defaults.
- **Total Mgmt Fees calculated**: Shows $17.5M as a derived figure, updating live.

### Issues

#### MEDIUM: Assumed Gross MOIC slider has no visible label on sensitivity chart
The "Fund Size Sensitivity" section has a second slider labeled "Assumed Gross MOIC" but it is only visible as a small track with a dot. The slider's purpose and current value could be more prominently displayed.

#### LOW: Chart legends overlap at smaller sizes
The waterfall chart legend labels (Gross Returns, Mgmt Fees, Expenses, Distributable, LP Hurdle, Carry, Net) are listed below the chart and could wrap awkwardly on narrower viewports.

---

## 5. Stress Test (`/stress-test`)

### What Works Well
- **Intuitive scenario selection**: Five pre-built scenario cards (Base Case, 2008 Financial Crisis, 2021 Bull Market, Rate Hike 2022-23, Exit Drought) displayed as colorful bordered cards with checkmark toggles. Each card has a clear title, colored dot indicator, and a brief description of the parameter modifications.
- **Custom Scenario Builder**: Three sliders (Failure Rate Modifier, Multiple Compression, Exit Delay) with clear labels, current values (1.00x, 1.00x, +0.0y), and explanatory text (e.g., "1.0 = default, 0.65 = 35% compressed, 1.4 = 40% higher").
- **Scenario Comparison table**: After running, shows all selected scenarios with Median MOIC, P10 MOIC, P90 MOIC, Prob <1x, Median IRR, and Net MOIC. Delta values shown in parentheses (e.g., "-1.24", "+1.31") with color coding (red for worse, green for better).
- **MOIC Distribution Overlay chart**: Multi-line density curves overlaid with a legend, allowing visual comparison of distribution shapes across scenarios.
- **Clear empty state**: "Select scenarios above and click Run Comparison to see results."
- **All scenarios pre-selected by default**: Base Case and all four stress scenarios start checked, so users get useful results immediately on first click.

### Issues

#### MEDIUM: Stress test table delta formatting density
The table cells contain both absolute values and deltas (e.g., "1.28x(-1.24)"). While informative, this is dense. The delta values use color but the parenthetical format makes cells quite wide. Consider showing deltas as a separate row or in a tooltip.

#### MEDIUM: Net MOIC values seem unusually low
In the stress test results, the Base Case shows Net MOIC of 0.99x while Median MOIC is 2.53x. This seems like a very large gap. If the Net MOIC accounts for fees, this should be labeled more clearly (e.g., "Net LP MOIC after fees") to avoid confusion. Alternatively, verify the fee calculation is correct -- a 2.53x gross to 0.99x net implies fees consuming more than 60% of returns, which seems extreme even for a 2/20 structure.

**Update:** Looking more carefully, the Net MOIC column may be using a different calculation method (possibly applying to invested capital differently). This should have a tooltip or footnote explaining the methodology.

#### LOW: MOIC distribution chart y-axis label cut off
The MOIC Distribution Overlay chart shows percentage distributions but the y-axis labels are small and the "%" unit is not clearly visible.

---

## 6. Navigation & Cross-View Testing

### What Works Well
- **Five nav tabs work correctly**: Simulation, Portfolio, Power Law, Economics, Stress Test all navigate to correct routes.
- **Active tab highlighting**: The current tab has a distinct visual style (pill/badge with background color), making it clear which view is active.
- **Consistent layout**: All pages share the same top navigation bar with "App" branding on the left and nav links on the right.
- **Sticky header**: Navigation stays pinned when scrolling on all pages.
- **Keyboard shortcuts modal**: Pressing "?" opens a well-designed modal listing all shortcuts (Cmd/Ctrl+Enter for run, Esc to close). The modal is cleanly formatted with keyboard key styling.
- **Keyboard shortcuts work**: Cmd+Enter triggers simulation runs from any view.

### Issues

#### HIGH: Mobile navigation overflow
At 375px width, the navigation bar overflows horizontally. The test detected `navOverflow: True` and 17 overflow elements on the page. All five nav links remain in a single horizontal row and extend beyond the viewport edge. There is no hamburger menu or mobile-adapted navigation.

**Specific observations at mobile:**
- Navigation text is readable but "Stress Test" is partially cut off on the right edge.
- The simulation view's parameter panel takes the full width, but the many input fields still render legibly.
- Portfolio Construction, Power Law, and Stress Test mobile layouts are reasonable in terms of content stacking.
- Fund Economics on mobile is cramped -- the fund parameter inputs are very small and the waterfall chart labels overlap.

**Recommendation:** Implement a hamburger menu or horizontal scroll indicator for mobile viewports. Alternatively, use shorter tab labels or icons-only below a breakpoint.

#### MEDIUM: "App" branding is generic
The top-left shows "App" as the application name. This should be replaced with a proper name (e.g., "VC Fund Simulator" or the project's actual name).

---

## 7. Cross-Cutting Issues

### 404 Errors on Every Page Load
Every page navigation triggers a 404 request to `http://localhost:3000/%VITE_ANALYTICS_ENDPOINT%/umami`. The `VITE_ANALYTICS_ENDPOINT` environment variable is not being resolved -- it is being sent as a literal string in the URL. This means:
1. The analytics integration (Umami) is misconfigured.
2. Every page load generates a failed network request.

**Fix:** Either set the `VITE_ANALYTICS_ENDPOINT` environment variable in `.env` or conditionally load the analytics script only when the variable is defined.

### Dark Theme Consistency
The dark theme is well-implemented with consistent colors:
- Background: Dark gray (#0d1117 or similar)
- Card backgrounds: Slightly lighter dark gray
- Text: White with good opacity (no low-opacity text elements detected)
- Accent colors: Blue (primary actions), green (positive metrics), red (negative metrics), purple (IRR), orange (outliers)

No contrast issues were detected in automated testing.

### Performance Summary
| View | Action | Time |
|------|--------|------|
| Simulation | Run 1000 simulations | ~85ms |
| Portfolio Construction | Grid analysis (5 mixes x multiple sizes x 500 sims) | ~895ms |
| Power Law | Single analysis | <100ms (instant) |
| Fund Economics | Slider interaction | Real-time (no computation delay) |
| Stress Test | 5-scenario comparison | ~6s (estimated from wait time) |

All views load within 2 seconds. No jank or freezing observed during any interaction.

---

## Priority Summary

### High Priority
1. **Mobile navigation overflow** -- Nav bar extends beyond viewport at 375px, no hamburger menu
2. **Simulation panel length** -- 50 inputs make the left panel extremely tall

### Medium Priority
3. **Analytics 404 errors** -- Umami endpoint misconfigured, 404 on every page load
4. **Stress test Net MOIC clarity** -- 2.53x gross to 0.99x net needs explanation
5. **Input accessibility** -- Labels not programmatically associated with inputs
6. **Heatmap small text** -- Portfolio construction grid sub-metrics hard to read at smaller sizes
7. **"App" branding** -- Generic name should be replaced

### Low Priority
8. **Empty buttons need aria-labels** -- Checkbox toggle buttons have no text
9. **No loading spinner** -- Fast enough that it rarely matters, but good practice
10. **Power Law single-sim variability** -- Results change each click, could confuse users
11. **Fund Economics slider labels** -- Second slider's purpose could be clearer

---

## Screenshots Reference

All screenshots saved to `/Users/simon/Documents/fundsimulation/docs/screenshots/`:
- `01-simulation-initial.png` -- Simulation view before running
- `02-simulation-results.png` -- Simulation view after running
- `03-portfolio-initial.png` -- Portfolio Construction empty state
- `04-portfolio-results.png` -- Portfolio Construction with results
- `04b-portfolio-scrolled.png` -- Portfolio Construction scrolled to heatmap
- `05-powerlaw-initial.png` -- Power Law Explorer empty state
- `06-powerlaw-results.png` -- Power Law Explorer with analysis
- `08-fund-economics-initial.png` -- Fund Economics calculator
- `10-stress-initial.png` -- Stress Test with scenarios
- `11-stress-results.png` -- Stress Test comparison results
- `12-tablet-view.png` -- Tablet viewport (768px)
- `13-mobile-view.png` -- Mobile viewport (375px)
- `13-mobile-*.png` -- Mobile views for each page
- `14-keyboard-modal.png` -- Keyboard shortcuts modal
- `16-stress-table-detail.png` -- Stress test table detail
- `17-scrolled-nav-check.png` -- Sticky nav verification
