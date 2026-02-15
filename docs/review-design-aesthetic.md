# Design & Aesthetic Review: VC Portfolio Monte Carlo Simulation App

**Date:** 2026-02-15
**Reviewer:** Claude (UI Design Expert)
**Stack:** React + Tailwind 4 + shadcn/ui + Recharts, Dark Theme

---

## Table of Contents

1. [Global / Cross-View Issues](#1-global--cross-view-issues)
2. [View 1: Simulation (Home)](#2-view-1-simulation-home)
3. [View 2: Portfolio Construction](#3-view-2-portfolio-construction)
4. [View 3: Power Law Explorer](#4-view-3-power-law-explorer)
5. [View 4: Fund Economics](#5-view-4-fund-economics)
6. [View 5: Stress Test](#6-view-5-stress-test)
7. [Component-Level Issues](#7-component-level-issues)
8. [Design System Gaps](#8-design-system-gaps)
9. [Top 10 Visual Priorities](#9-top-10-visual-priorities)
10. [Quick Wins](#10-quick-wins)

---

## 1. Global / Cross-View Issues

### 1.1 Inconsistent Page Layout Structure -- Critical

Each view uses a different layout approach, creating a disjointed experience:

- **Home** (`Home.tsx`, line 200): Three-column flex layout with `p-4 gap-4`, no container
- **Portfolio** (`PortfolioConstruction.tsx`, line 146): `container mx-auto py-8` with grid
- **Power Law** (`PowerLawExplorer.tsx`, line 304): `p-4 md:p-6 lg:p-8 space-y-6`, no container
- **Economics** (`FundEconomics.tsx`, line 651): `container mx-auto px-4 py-6 max-w-7xl`
- **Stress Test** (`ScenarioStressTest.tsx`, line 376): `p-6 space-y-8`, no container

**Should be:** All views should use a consistent wrapper, e.g., `container mx-auto px-4 py-6` or a shared `<PageWrapper>` component with standardized padding and max-width.

### 1.2 Inconsistent Heading Hierarchy -- Major

Page headings vary across views:

- Home: No page heading (the page title is in the nav bar only)
- Portfolio (`PortfolioConstruction.tsx`, line 148): `text-3xl font-bold mb-2`
- Power Law (`PowerLawExplorer.tsx`, line 308): `text-2xl font-bold tracking-tight`
- Economics (`FundEconomics.tsx`, line 654): `text-2xl font-bold`
- Stress Test (`ScenarioStressTest.tsx`, line 379): `text-2xl font-bold text-white`

**Should be:** All pages should use the same heading size (`text-2xl` or `text-3xl`), weight, and color class (`text-foreground`, never hardcoded `text-white`).

### 1.3 Hardcoded Colors vs. Theme Variables -- Critical

Multiple files use hardcoded color values instead of CSS variables/theme tokens:

- `ScenarioStressTest.tsx` uses `text-white` (lines 379, 397, 450, 493, 519, 601, 617, 662, 676, 752, 799) and inline `style={{ color: "#94a3b8" }}` (lines 382, 421, 454, 484, 510, 535, 561, 605, 802, 864) instead of `text-foreground` and `text-muted-foreground`
- `ScenarioDetailModal.tsx` uses `stroke="#374151"` and `stroke="#9ca3af"` (lines 206-207, 226-227) which are Tailwind gray values, not the design system palette (`#334155` and `#94a3b8`)
- `ScenarioDetailModal.tsx` uses `fill="#10b981"` and `fill="#f59e0b"` (lines 212-214, 233-235) which are Tailwind emerald/amber, not the design system green (`#3fb950`) or gold (`#d29922`)

**Should be:** Use only theme CSS variables (`text-foreground`, `text-muted-foreground`, `bg-card`, etc.) and the declared palette constants (`PURPLE`, `GOLD`, `GREEN`, `RED`, `GRID_COLOR`, `TEXT_COLOR`).

### 1.4 Dual Sticky Header Problem -- Major

The Home view has two sticky elements stacked:
- `MainLayout.tsx` (line 25): `sticky top-0 z-50` nav bar
- `Home.tsx` (line 159): `sticky top-0 z-40` action bar

The Portfolio view also has this:
- `MainLayout.tsx` nav bar at z-50
- `PortfolioConstruction.tsx` (line 117): `sticky top-0 z-40` action bar

These stack vertically but the second sticky bar uses `top-0`, which means it slides under the nav bar rather than sitting below it. It should be `top-14` (the height of the nav header).

**Should be:** The action bars in Home and Portfolio should use `top-14` (matching the nav bar height of `h-14`) instead of `top-0`.

### 1.5 No Consistent Card Shadow Strategy -- Minor

Cards use varying shadow approaches:
- Some use `shadow-sm` (ChartsPanel MetricCard, HistoricalRunsPanel)
- Some use no shadow (GridResultsView cards)
- Action bars use `shadow-lg`

**Should be:** Cards should consistently use `shadow-sm` or no shadow at all. In dark themes, shadows are less visible anyway, so dropping them entirely or using a single level is preferred.

### 1.6 Navigation Bar Issues -- Minor

`MainLayout.tsx` (line 27): The nav uses `h-14` but the app title and navigation buttons are not balanced. The title (`text-lg font-semibold`) is on the left, and all 5 nav tabs are on the right. On narrower screens, this will overflow.

**Should be:** Consider centering the tabs or using a responsive approach that collapses into a dropdown on smaller screens. Add `overflow-x-auto` or a hamburger menu for mobile.

---

## 2. View 1: Simulation (Home)

### 2.1 Three-Column Layout Has No Max Width -- Major

`Home.tsx` (line 200): The layout uses `flex-1 flex overflow-hidden p-4 gap-4` which stretches to full viewport width. On ultra-wide monitors (2560px+), the charts panel becomes excessively wide and the sidebar panels look proportionally small.

**Should be:** Add a max-width constraint like `max-w-[1920px] mx-auto` or wrap in a container.

### 2.2 Action Bar Inconsistency -- Minor

`Home.tsx` (lines 159-197): The action bar uses `py-4 px-6` with a `container mx-auto`, while the main content below uses `p-4` without a container. This creates a visual misalignment between the action bar content and the main content.

**Should be:** Both should use the same horizontal padding/container strategy.

### 2.3 Parameters Panel Missing Page-Level Heading -- Minor

The Home view is the only view without a visible page heading. The `ParametersPanel` shows "Parameters" as its header, but there is no "Monte Carlo Simulator" or equivalent heading for the page content.

**Should be:** Add a heading above the charts panel or integrate it into the action bar for consistency with other views.

### 2.4 Duplicate Run Button -- Minor

`Home.tsx` (line 163): There is a "Run Simulations" button in the sticky action bar, and the ParametersPanel also receives `onRunSimulation` prop (though the button may be hidden). This creates potential UX confusion.

### 2.5 Empty State Centered in Fixed-Width Panel -- Minor

`ChartsPanel.tsx` (lines 64-75): The empty state message is vertically/horizontally centered in the panel, which is good, but uses `text-lg` for "No simulation results yet" -- this feels slightly undersized for such a large empty area.

**Should be:** Use `text-xl` or `text-2xl` for the primary empty state text with a visual icon.

---

## 3. View 2: Portfolio Construction

### 3.1 Heatmap Legend Colors Don't Match Actual Cells -- Critical

`GridResultsView.tsx` (lines 238-252): The legend shows:
- `bg-red-200` for "Low"
- `bg-yellow-700/80` for "Medium"
- `bg-green-200` for "High"

But the actual cell colors (lines 42-44) use:
- `bg-destructive/20` for bottom 10%
- `bg-green-500/20` for top 10%
- `bg-muted` for middle 80%

The legend references colors (`bg-red-200`, `bg-green-200`) that are light-mode Tailwind colors -- they appear as bright, washed-out squares against the dark background and don't match the actual heatmap cell colors at all. Also, the legend shows three tiers (Low/Medium/High) but the actual logic only has two extremes (bottom 10% / top 10%) with everything else neutral.

**Should be:** The legend should show only two extremes plus "Neutral", using the exact same color classes as the cells: `bg-destructive/20`, `bg-muted`, and `bg-green-500/20`. Or better yet, use a gradient legend.

### 3.2 Run Button Color Inconsistency -- Major

`PortfolioConstruction.tsx` (line 124): The "Run Grid Analysis" button uses `bg-emerald-600 hover:bg-emerald-700 text-white font-semibold` while the Home view's "Run Simulations" uses `bg-primary hover:bg-primary/90 text-primary-foreground font-medium`.

**Should be:** All primary action buttons should use `bg-primary` for consistency, or a shared CTA variant.

### 3.3 Action Bar Padding Inconsistency -- Minor

`PortfolioConstruction.tsx` (line 118): Uses `py-3 px-4` in the action bar, while Home uses `py-4 px-6`. Different padding creates visually different bar heights.

**Should be:** Standardize to the same padding for all top action bars.

### 3.4 Heatmap Table Header Styling -- Minor

`GridResultsView.tsx` (line 183): Table headers use `bg-muted` which blends into the card background. The column/row headers need more visual distinction.

**Should be:** Use `bg-muted/60` or add a slightly different treatment to make headers clearly distinguishable from data cells.

---

## 4. View 3: Power Law Explorer

### 4.1 Controls in Header Area -- Major

`PowerLawExplorer.tsx` (lines 317-362): The fund size, company count inputs, and the "Analyze" button are placed in the page header area using `flex-row md:items-end`. This is inconsistent with other views that put controls in a sticky bar (Home, Portfolio) or in a dedicated card (Economics, Stress Test).

**Should be:** Either use a sticky action bar matching Home/Portfolio, or place controls in a dedicated parameters card on the left side.

### 4.2 Summary Cards Lack Visual Weight -- Minor

`PowerLawExplorer.tsx` (lines 388-416): The four `SummaryCard` components use `text-xl font-bold` for the value. In other views, comparable metrics use `text-2xl font-bold` or `text-3xl font-bold` (ChartsPanel MetricCard). The inconsistency makes the Power Law stats feel less prominent.

**Should be:** Match the metric value sizing to ChartsPanel's `text-3xl` or at minimum `text-2xl`.

### 4.3 Sensitivity Slider Range Labels Not Aligned -- Minor

`PowerLawExplorer.tsx` (lines 580-585): The four range labels (10x, 100x, 250x, 500x) use `flex justify-between` which works, but the labels are arbitrary -- they don't correspond to slider tick marks. The 100x and 250x are not evenly spaced on the slider range (10-500).

**Should be:** Either use proper tick marks that align with the labels, or label only the endpoints (10x and 500x).

### 4.4 Table Has No Hover State on Rows -- Minor

`PowerLawExplorer.tsx` (lines 699-731): The "equivalent combinations" table rows use `border-b border-border/50` but no hover effect. The Stress Test comparison table has `hover:bg-muted/30` and the Economics GP vs LP table has `hover:bg-muted/20`.

**Should be:** Add `hover:bg-muted/20 transition-colors` to table rows for consistency.

---

## 5. View 4: Fund Economics

### 5.1 Input Styling Inconsistency -- Major

`FundEconomics.tsx` (lines 674-798): All inputs use the verbose class `bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`. The spinner-hiding CSS is already handled globally in `index.css` (lines 180-187), making the inline `[appearance:textfield]` and vendor prefix classes redundant.

**Should be:** Remove the inline appearance overrides since they are already in the global CSS. Use consistent input styling: `bg-muted/30 border-border font-mono`.

### 5.2 Waterfall Chart Tooltip Shows "base" Entry -- Major

`FundEconomics.tsx` (lines 283-291): The tooltip uses `DarkTooltip` with a formatter that returns empty string for "base", but the tooltip still renders the entry (just with empty text). This creates a blank line in the tooltip.

**Should be:** Filter out the "base" entry entirely in the payload before rendering, or use a custom tooltip that skips entries where the name is "base".

### 5.3 Statistics Grid Too Dense -- Minor

`FundEconomics.tsx` (lines 225-256): Two rows of 4 stat boxes each (8 total) with `gap-4`. On smaller screens, these collapse into a 2-column grid which is fine, but the density of information is high with no visual grouping.

**Should be:** Consider grouping related metrics (Gross vs Net in one row, Fee components in another) with subtle dividers or different background tints.

### 5.4 Page Uses h2 Instead of h1 for Title -- Minor

`FundEconomics.tsx` (line 654): Uses `<h2>` for the page title while other pages use `<h1>`. This is a semantic inconsistency.

**Should be:** Use `<h1>` for the page title, matching Power Law and Stress Test.

---

## 6. View 5: Stress Test

### 6.1 Pervasive Hardcoded text-white and Inline Styles -- Critical

`ScenarioStressTest.tsx`: This file is the worst offender for bypassing the design system. Nearly every text element uses `text-white` or inline `style={{ color: "#94a3b8" }}` instead of semantic tokens:

- Line 379: `text-white` instead of `text-foreground`
- Line 382: `style={{ color: "#94a3b8" }}` instead of `text-muted-foreground`
- Line 397: `style={{ color: "#a371f7" }}` -- OK for accent, but could use `text-primary`
- Lines 421, 454, 484, 510, 535, 561: `style={{ color: "#94a3b8" }}` repeated 6+ times
- Lines 450, 493, 519, 601, 617: `text-white` repeated 5+ times

This makes the component fragile -- if the theme changes or a light mode is added, all these hardcoded values would need manual updates.

**Should be:** Replace all `text-white` with `text-foreground` and all `style={{ color: "#94a3b8" }}` with `className="text-muted-foreground"`.

### 6.2 Scenario Cards Lack Visual Consistency When Selected -- Minor

`ScenarioStressTest.tsx` (lines 431-468): Selected scenario cards use `border-2 bg-card` and unselected use `border-border bg-card/50 opacity-60`. The `opacity-60` on unselected cards makes the entire card faded, including text, making it hard to read the scenario descriptions before selecting.

**Should be:** Instead of opacity, use a subtler distinction like `bg-card/80` for unselected and keep text fully opaque. Or use a left-border accent for selected state.

### 6.3 Custom Scenario Builder Button Styling -- Minor

`ScenarioStressTest.tsx` (line 573): The "Apply Custom" button uses inline styles `style={{ borderColor: "#f0883e", color: "#f0883e" }}`. This bypasses the theming system.

**Should be:** Define an orange variant or use Tailwind classes: `border-orange-400 text-orange-400 hover:bg-orange-400/10`.

### 6.4 Histogram Tooltip Hardcoded Colors -- Minor

`ScenarioStressTest.tsx` (lines 236-255): The `CustomTooltip` uses hardcoded hex colors for background, border, and text. This is inconsistent with how other views handle tooltips (Power Law and Economics use named constants).

**Should be:** Use the shared tooltip color constants (`TOOLTIP_BG`, `TOOLTIP_BORDER`, `TEXT_COLOR`).

---

## 7. Component-Level Issues

### 7.1 ScenarioDetailModal Uses Wrong Color Palette -- Major

`ScenarioDetailModal.tsx`: Chart colors are from Tailwind defaults, not the app's design system:
- Line 206: `stroke="#374151"` should be `#334155` (GRID_COLOR)
- Line 207: `stroke="#9ca3af"` should be `#94a3b8` (TEXT_COLOR)
- Line 209: `backgroundColor: '#1f2937'` should be `#1e293b` (TOOLTIP_BG)
- Line 212: `fill="#10b981"` should be `#3fb950` (GREEN)
- Line 233: `fill="#f59e0b"` should be `#d29922` (GOLD)

These are close but subtly different, creating visual inconsistency.

**Should be:** Import and use the exact color constants from the design system palette.

### 7.2 ChartsPanel MetricCard Help Text is Too Long -- Minor

`ChartsPanel.tsx` (lines 432-446): Each MetricCard shows a title, value, subtitle, AND help text (italic). The help text adds visual clutter and is always visible rather than being gated behind a tooltip or hover.

**Should be:** Move help text into a tooltip triggered by an info icon, matching the pattern used in ParametersPanel.

### 7.3 ChartsPanel Benchmark Text Inline at Bottom of Chart -- Minor

`ChartsPanel.tsx` (lines 332-339): Benchmark reference values are shown as inline text below the MOIC histogram (`Benchmarks: Top Q >= 4.5x | Median >= 2.5x | Bottom Q >= 1.2x`). These would be more impactful as reference lines drawn on the chart itself.

**Should be:** Add `ReferenceLine` components to the MOIC histogram at the benchmark MOIC values (4.5x, 2.5x, 1.2x) with labeled dashed lines.

### 7.4 HistoricalRunsPanel Run Card Metric Boxes -- Minor

`HistoricalRunsPanel.tsx` (lines 109-122): Metric boxes use `bg-muted p-2 rounded border border-border` with `text-lg font-semibold text-primary` for values. The `text-primary` (blue) for MOIC/IRR values is semantically odd -- metrics should use `text-foreground` or a contextual color (green for good, red for bad).

**Should be:** Use `text-foreground` for neutral display, or conditionally color based on value thresholds.

### 7.5 IndustryBenchmarksModal Cards Lack Visual Distinction -- Minor

`IndustryBenchmarksModal.tsx` (lines 29-42): The three benchmark cards all use `bg-card/50` with no visual differentiation between Top Quartile, Median, and Bottom Quartile. They should use the benchmark color system.

**Should be:** Add a colored left border or top accent bar using the benchmark category colors (emerald for Top, green for Above Median, yellow for Below, red for Bottom).

### 7.6 ProbabilityBadge Inconsistency Between Views -- Minor

In `ChartsPanel.tsx` (lines 454-462), `ProbabilityBadge` uses `bg-muted rounded-lg border border-border` with `text-2xl font-bold text-primary`.

In `GridResultsView.tsx` (lines 317-335), the same probability thresholds use `border rounded-lg p-3` with `text-lg font-semibold` and no accent color.

In `ScenarioDetailModal.tsx` (lines 179-198), the same metrics use `border rounded-lg p-3` with `text-xl font-semibold` and no accent color.

**Should be:** Extract a shared `ProbabilityBadge` or `StatBox` component used consistently across all views.

---

## 8. Design System Gaps

### Gap 1: No Shared Color Constants File

The app defines chart colors in three different ways:
1. **Named constants** in `PowerLawExplorer.tsx` and `FundEconomics.tsx` (`const PURPLE = "#a371f7"`, etc.)
2. **Inline hex values** in `ScenarioStressTest.tsx` and `ScenarioDetailModal.tsx`
3. **CSS custom properties** in `index.css` (`--chart-1` through `--chart-5`)

There should be a single `colors.ts` or `chart-theme.ts` file exporting all palette constants.

### Gap 2: No Shared Tooltip Component

Four different tooltip implementations exist:
1. `PowerLawExplorer.tsx` has `ChartTooltip` (line 133)
2. `FundEconomics.tsx` has `DarkTooltip` (line 55)
3. `ScenarioStressTest.tsx` has `CustomTooltip` (line 236)
4. `ChartsPanel.tsx` uses inline `contentStyle` objects

These all do roughly the same thing with slightly different markup. Should be one shared `<ChartTooltip>` component.

### Gap 3: No Shared MetricCard / StatBox Component

Stat display cards appear in 5+ files with different prop shapes and styling:
- `ChartsPanel.tsx` `MetricCard` (value + subtitle + helpText)
- `PowerLawExplorer.tsx` `SummaryCard` (icon + label + value + subtext + color)
- `GridResultsView.tsx` inline stat blocks
- `FundEconomics.tsx` inline stat boxes
- `ScenarioDetailModal.tsx` inline stat blocks

### Gap 4: No Page Layout Wrapper

Each page manually applies its own padding, container, and spacing. A `<PageLayout>` component with standard props would eliminate inconsistencies.

### Gap 5: No Defined Typography Scale

Text sizes are ad-hoc:
- Page titles: `text-2xl` (most) or `text-3xl` (Portfolio)
- Section titles: `text-lg` or `text-base` (varies)
- Card titles: Via shadcn CardTitle (varies)
- Body text: `text-sm` (most places)
- Captions: `text-xs`

No documented scale or component system for typography.

### Gap 6: Action Bar Pattern Not Abstracted

Home and Portfolio both implement their own sticky action bars with different padding, z-index, and content layout. This should be a shared `<ActionBar>` component.

### Gap 7: Chart Axis Configuration Not Standardized

Each chart view manually configures XAxis, YAxis, CartesianGrid with the same props repeated. A chart theme configuration object would reduce duplication and ensure consistency.

---

## 9. Top 10 Visual Priorities

### Priority 1: Unify Hardcoded Colors (Critical)
Replace all `text-white`, `style={{ color: "#94a3b8" }}`, and hardcoded hex values with semantic theme tokens. Primarily affects `ScenarioStressTest.tsx` and `ScenarioDetailModal.tsx`.

### Priority 2: Fix Heatmap Legend Mismatch (Critical)
The `GridResultsView.tsx` legend shows light-mode Tailwind colors (`bg-red-200`, `bg-green-200`) that don't match the actual dark-theme cell colors. This is visually broken and misleading.

### Priority 3: Standardize Page Layout Wrappers (Critical)
Create a shared layout approach so all 5 views use consistent max-width, padding, and spacing. The current mix of container/no-container/custom-padding creates a disjointed feel when navigating between views.

### Priority 4: Fix Dual Sticky Bar Positioning (Major)
The action bars in Home and Portfolio use `top-0` which conflicts with the nav bar at `top-0 z-50`. Change to `top-14` and ensure proper stacking.

### Priority 5: Create Shared Chart Color Constants (Major)
Extract a single `chart-colors.ts` file that exports `PURPLE`, `GOLD`, `GREEN`, `RED`, `GRID_COLOR`, `TEXT_COLOR`, `TOOLTIP_BG`, `TOOLTIP_BORDER`. Import everywhere instead of redeclaring.

### Priority 6: Standardize Run Button Styling (Major)
The primary CTA button varies: `bg-primary` (Home), `bg-emerald-600` (Portfolio), default variant (Power Law, Stress Test). All primary run/analyze actions should use the same button treatment.

### Priority 7: Create Shared Chart Tooltip Component (Major)
Consolidate 4 tooltip implementations into one reusable `<ChartTooltip>` with consistent styling using the design system colors.

### Priority 8: Fix ScenarioDetailModal Chart Colors (Major)
Replace Tailwind gray/emerald/amber hex values with the design system palette to match all other chart views.

### Priority 9: Standardize Heading Hierarchy (Major)
Use `<h1>` for page titles everywhere, with consistent `text-2xl font-bold text-foreground`. Use `<h2>` for section titles within cards.

### Priority 10: Unify MetricCard / StatBox Components (Minor)
Create a single `<StatCard>` component with props for label, value, subtitle, icon, and color that can be reused across all 5 views.

---

## 10. Quick Wins

These are small, low-risk changes that would immediately improve visual consistency:

### Quick Win 1: Replace `text-white` with `text-foreground`
**Files:** `ScenarioStressTest.tsx` (11 occurrences)
**Change:** Find/replace `text-white` with `text-foreground`
**Impact:** Proper theme compliance, future light-mode compatibility

### Quick Win 2: Replace inline color styles with Tailwind classes
**Files:** `ScenarioStressTest.tsx` (8+ occurrences of `style={{ color: "#94a3b8" }}`)
**Change:** Replace with `className="text-muted-foreground"`
**Impact:** Cleaner code, theme compliance

### Quick Win 3: Fix heatmap legend colors
**File:** `GridResultsView.tsx` (lines 241-252)
**Change:** Replace `bg-red-200` with `bg-destructive/20`, `bg-yellow-700/80` with `bg-muted`, `bg-green-200` with `bg-green-500/20`. Update labels to "Bottom 10%", "Middle", "Top 10%".
**Impact:** Legend actually matches the heatmap cells

### Quick Win 4: Remove redundant spinner-hiding CSS from inputs
**File:** `FundEconomics.tsx` (7 input elements)
**Change:** Remove `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none` from all inputs (already handled globally)
**Impact:** Cleaner markup, no visual change

### Quick Win 5: Standardize page title element
**Files:** `FundEconomics.tsx` line 654
**Change:** Change `<h2>` to `<h1>` for page title
**Impact:** Semantic HTML consistency

### Quick Win 6: Fix sticky action bar top offset
**Files:** `Home.tsx` line 159, `PortfolioConstruction.tsx` line 117
**Change:** Replace `top-0` with `top-14` (or `top-[3.5rem]`)
**Impact:** Action bar sits below nav instead of overlapping

### Quick Win 7: Add hover state to Power Law table rows
**File:** `PowerLawExplorer.tsx` line 715
**Change:** Add `hover:bg-muted/20 transition-colors` to `<tr>` elements
**Impact:** Consistent interactive feedback

### Quick Win 8: Fix ScenarioDetailModal chart grid color
**File:** `ScenarioDetailModal.tsx` lines 206, 226
**Change:** Replace `stroke="#374151"` with `stroke="#334155"` and `stroke="#9ca3af"` with `stroke="#94a3b8"`
**Impact:** Chart grids match the rest of the app

### Quick Win 9: Standardize action bar padding
**Files:** `Home.tsx` line 160, `PortfolioConstruction.tsx` line 118
**Change:** Use consistent `py-3 px-4` (or `py-4 px-6`) in both
**Impact:** Action bars have the same visual weight

### Quick Win 10: Fix scenario card opacity for readability
**File:** `ScenarioStressTest.tsx` line 438
**Change:** Replace `opacity-60` with `opacity-80` for unselected scenario cards
**Impact:** Unselected scenario descriptions remain readable
