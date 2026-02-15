# UX Flow Review: VC Portfolio Monte Carlo Simulation App

**Reviewer focus:** Logical flow, information architecture, usability
**Date:** 2026-02-15
**Scope:** All 5 views (Simulation, Portfolio, Power Law, Economics, Stress Test)

---

## Global / Cross-View Issues

### G1. App title defaults to "App" -- no branding or context
- **What's wrong:** The `APP_TITLE` in `/Users/simon/Documents/fundsimulation/client/src/const.ts` falls back to the string `"App"` when `VITE_APP_TITLE` is not set. Users see a generic header with no indication of what this tool does.
- **Impact:** A first-time visitor has zero context from the header alone. The nav labels ("Simulation", "Portfolio", etc.) help, but a strong title anchors the experience.
- **Fix:** Set a meaningful default such as `"VC Fund Simulator"` or `"Fund Return Modeler"`.
- **Severity:** Major

### G2. No onboarding or guided tour for first-time users
- **What's wrong:** All five views drop users into empty states with minimal instruction. There is no "getting started" flow, no tooltip tour, and no suggested sequence across views.
- **Impact:** A fund manager lands on the Simulation tab and must figure out the relationship between the five views on their own. Many will never discover Power Law or Stress Test.
- **Fix:** Add a brief onboarding overlay on first visit (dismissable) that explains the five views and suggests a workflow: "Start with Simulation to model your fund, then use Portfolio to optimize, Economics to model fees, and Stress Test to pressure-test." Alternatively, add a short description paragraph under each nav icon.
- **Severity:** Major

### G3. Parameters are not shared across views
- **What's wrong:** Each view maintains its own independent state for Fund Size, # Companies, stage parameters, and fee structure. The Simulation view lets you configure everything in the ParametersPanel, but when you switch to Portfolio Construction or Stress Test, those values are not carried over -- they use `DEFAULT_PARAMETERS`.
- **Impact:** Users who carefully configure parameters on the Simulation tab expect those same parameters to apply in Portfolio Construction and Stress Test. Having to re-enter them is tedious and error-prone. Worse, users may not realize the parameters differ and draw wrong conclusions from cross-view comparisons.
- **Fix:** Lift shared parameters (fund size, stage distributions, fee structure) into a global context or store. Each view can then override only view-specific settings.
- **Severity:** Critical

### G4. Two sticky headers stack on the Simulation view
- **What's wrong:** `MainLayout` renders a sticky header at `z-50` with the nav tabs. The Simulation view (`Home.tsx`) adds its own sticky action bar at `z-40`. On scroll, the user sees two persistent bars eating into vertical space. Portfolio Construction does the same. Other views do not have a secondary sticky bar, creating inconsistency.
- **Impact:** On smaller screens, the double header can consume 100+ pixels of vertical space. It also creates visual confusion: which bar is the "main" one?
- **Fix:** Merge the "Run Simulation" button and export buttons into the MainLayout header (or into a sub-header row within it) so there is only one sticky bar. Alternatively, make the per-view action bar non-sticky and rely on scrolling.
- **Severity:** Minor

### G5. No cross-view navigation hints
- **What's wrong:** After running a simulation, there is no prompt like "Want to stress test these results? Go to Stress Test" or "See how fees affect these returns in Economics." Each view is a dead-end island.
- **Impact:** Users may not discover the full analytical workflow the app provides. They run one simulation and leave.
- **Fix:** Add contextual links in each view's results section. For example, after the Simulation results cards, add a row of small link-buttons: "Optimize Portfolio", "Model Fees", "Stress Test".
- **Severity:** Major

### G6. Inconsistent error handling patterns
- **What's wrong:** The Simulation view uses `toast` notifications for errors. Portfolio Construction uses `alert()`. Stress Test also uses `alert()`. Power Law and Economics silently fail.
- **Impact:** Inconsistent feedback breaks user trust. Native `alert()` dialogs feel outdated and block the UI thread.
- **Fix:** Standardize on `toast` notifications across all views. Use `toast.error()` for validation failures and `toast.success()` for completions.
- **Severity:** Minor

---

## View 1: Simulation (`/`)

### S1. Empty state gives no preview of what results will look like
- **What's wrong:** The center panel shows "No simulation results yet / Configure parameters and click 'Run Simulations' to see results" -- a text-only empty state with no visual preview.
- **Impact:** Users cannot anticipate what they will get. A skeleton or sample chart preview would set expectations and motivate action.
- **Fix:** Show a blurred or greyed-out sample chart set with a prominent "Run Simulations" call-to-action overlay.
- **Severity:** Minor

### S2. Three-column layout does not adapt to narrow screens
- **What's wrong:** The layout uses `flex` with fixed-width sidebars (`w-80`). There is no responsive breakpoint. On tablets or narrow browser windows, the center panel gets squeezed to near-zero width.
- **Impact:** Charts become unreadable or invisible on screens under ~1200px.
- **Fix:** Add responsive classes: stack panels vertically on `lg:` breakpoint and below. Use `@media` or Tailwind breakpoints to switch from three-column to single-column layout.
- **Severity:** Major

### S3. Too many parameters visible at once in the ParametersPanel
- **What's wrong:** The ParametersPanel shows 7+ top-level inputs (Fund Size, # Companies, Seed %, Investment Period, Fund Life, Exit Window Min/Max, # Simulations) plus two open accordion sections for Seed and Series A stage parameters, each with 3 inputs and 6 exit buckets (each bucket has 3 fields). That is approximately 50 visible input fields.
- **Impact:** Overwhelming for a first-time user. Cognitive overload. Most users should start with 3-4 key inputs and leave the rest at defaults.
- **Fix:** Organize parameters into tiers: (1) "Core" section always visible: Fund Size, # Companies, Seed %, # Simulations. (2) "Advanced" section collapsed by default: Investment Period, Fund Life, Exit Windows. (3) Stage parameters collapsed by default. Add a "Quick Start" preset that makes sense for a typical $200M fund.
- **Severity:** Major

### S4. No input validation on most fields -- users can enter zero or negative values
- **What's wrong:** While `Home.tsx` has some validation (fund size > 0, numCompanies > 0, check sizes > 0), many fields have no `min`/`max` attributes on the HTML `<input>` elements and no validation logic. For example, `seedPercentage` can be set to 200 or -50 without error. `numSimulations` can be set to 999999, which would freeze the browser.
- **Impact:** Users can crash the app or get nonsensical results.
- **Fix:** Add `min`/`max` constraints to all numeric inputs. Add upper bound validation for `numSimulations` (e.g., max 10000). Clamp `seedPercentage` to 0-100. Show inline validation messages.
- **Severity:** Major

### S5. Historical Runs panel lacks search, sort, or comparison
- **What's wrong:** The right panel lists all saved runs chronologically with no ability to search, filter, sort, or compare two runs side-by-side.
- **Impact:** After 10+ runs, finding a specific past configuration becomes tedious. Users cannot easily see how changing parameters affects results.
- **Fix:** Add a search/filter bar. Add a "Compare" toggle that lets users select two runs and see their metrics side-by-side. Add the ability to label/name runs.
- **Severity:** Minor

### S6. "Copy Parameters" button label is misleading
- **What's wrong:** The button says "Copy Parameters" but actually calls `exportParametersToJSON()` which copies to clipboard. The label does not say "to clipboard."
- **Impact:** Users may expect it to copy parameters to another view or download them.
- **Fix:** Rename to "Copy to Clipboard" or "Copy JSON" and briefly show "Copied!" feedback.
- **Severity:** Minor

### S7. Results scroll is buried -- key metrics are not visible without scrolling
- **What's wrong:** The ChartsPanel shows summary metric cards, then probability thresholds, then J-curve, then MOIC histogram, then IRR histogram, then outliers. There are 7 sections requiring significant scrolling. The most actionable metric (probability of achieving 2x/3x/5x) is the third section down.
- **Impact:** Users may only look at the top metrics and miss the distribution charts and probability thresholds.
- **Fix:** Move "Probability of Returns" badges into the top metrics row. Reduce vertical space between sections. Add anchor links or a mini table-of-contents at the top of the results panel.
- **Severity:** Minor

### S8. Validation error display is at the bottom of a long scrollable panel
- **What's wrong:** The validation error message in `ParametersPanel` is rendered at the very bottom of the parameters list, after all accordion sections.
- **Impact:** If the user is at the top of the panel and enters an invalid value, they will not see the error message without scrolling down. Meanwhile, the "Run Simulation" button is disabled with no explanation visible.
- **Fix:** Move the validation error to the top of the panel, directly below the header, or display it inline next to the offending field. Also, consider showing a tooltip or disabled-state message on the "Run Simulations" button itself.
- **Severity:** Major

---

## View 2: Portfolio Construction (`/portfolio-construction`)

### P1. Grid analysis can take minutes with no cancel option
- **What's wrong:** The progress indicator shows "Running X/Y" but there is no way to cancel a running analysis. The button is disabled during execution.
- **Impact:** If a user accidentally starts a large grid (many seed percentages x wide investment range x high sim count), they must wait or refresh the page, losing any unsaved state.
- **Fix:** Add a "Cancel" button that sets a cancellation flag checked by the analysis loop. Consider using Web Workers so the UI remains responsive.
- **Severity:** Major

### P2. Seed percentage options are hardcoded to 0/25/50/75/100
- **What's wrong:** Users can only select from five fixed seed percentage values. Real fund strategies often use values like 40% or 70%.
- **Impact:** The grid analysis cannot capture the user's actual strategy if it falls between the fixed percentages.
- **Fix:** Allow custom percentage entry in addition to the preset checkboxes. Or let users specify a range with step size (e.g., 0-100 in steps of 10).
- **Severity:** Minor

### P3. Heatmap legend colors do not match the actual heatmap cells
- **What's wrong:** The legend at the bottom of the heatmap shows `bg-red-200` for "Low", `bg-yellow-700/80` for "Medium", and `bg-green-200` for "High". But the actual heatmap cells use `bg-destructive/20` for bottom 10% and `bg-green-500/20` for top 10%, with `bg-muted` for the middle 80%. There is no yellow in the actual cells at all.
- **Impact:** The legend misleads users into thinking there are three tiers of coloring when there are only two (extreme top and bottom). The middle 80% is uniformly grey.
- **Fix:** Either implement a true three-tier (or gradient) coloring system that matches the legend, or update the legend to accurately show "Top 10%", "Middle 80%", "Bottom 10%" with matching colors.
- **Severity:** Major

### P4. No explanation of what "deployment rate" means or why cells are struck through
- **What's wrong:** Cells with deployment rates below 60% or above 200% get a diagonal strike-through line and appear faded, but there is no legend or tooltip explaining this convention.
- **Impact:** Users see struck-through numbers with no understanding of why. They may think the data is invalid.
- **Fix:** Add a note below the heatmap: "Configurations where capital deployment is unrealistic (<60% or >200% of fund size) are marked as infeasible." Also add a tooltip on hover for each struck-through cell.
- **Severity:** Major

### P5. Selected scenario details appear below the heatmap AND in a modal
- **What's wrong:** Clicking a heatmap cell both renders an inline "Selected Scenario Details" card below the heatmap and opens a `ScenarioDetailModal`. This is redundant and confusing.
- **Impact:** Users see the same data twice in two different places. The inline card adds page length, pushing the commentary section further down.
- **Fix:** Choose one presentation: either the modal (better for focus) or the inline card (better for context). Remove the duplicate.
- **Severity:** Minor

### P6. Commentary section uses raw markdown-like formatting
- **What's wrong:** The commentary text contains `**bold**` syntax that is parsed with string replacement (`replace(/\*\*/g, '')`). This is fragile and does not handle other markdown constructs.
- **Impact:** If the commentary generator produces other formatting (lists, links), it will appear as raw text.
- **Fix:** Use a lightweight markdown renderer (e.g., `react-markdown`) or ensure the commentary generator outputs plain text only.
- **Severity:** Minor

---

## View 3: Power Law Explorer (`/power-law`)

### PL1. Single simulation is not representative -- no multi-run option
- **What's wrong:** The Power Law Explorer runs exactly one simulation (`numSimulations: 1`). A single random draw is highly variable and may not demonstrate power law dynamics at all.
- **Impact:** Users may see a misleading result (e.g., no outliers in one lucky/unlucky draw) and draw wrong conclusions about power law behavior. Refreshing gives completely different results each time.
- **Fix:** Either run multiple simulations and show aggregate concentration metrics, or add a "Re-roll" button with clear messaging: "This is a single random draw. Click Analyze again to see a different outcome." Better yet, add an option to run N simulations and show average concentration curves.
- **Severity:** Major

### PL2. Controls are in the header, not in a sidebar -- easy to miss on mobile
- **What's wrong:** Fund Size and # Companies inputs are placed inline in the header, next to the Analyze button. On narrow screens, this row may wrap awkwardly.
- **Impact:** Users may not realize they can change these parameters.
- **Fix:** Move controls into a visible card above the results, or use the same sidebar pattern as the Simulation view for consistency.
- **Severity:** Minor

### PL3. Outlier sensitivity slider range may be inappropriate
- **What's wrong:** The "Best company return" slider goes from 10x to 500x, but 500x returns are essentially impossible in VC (even the best outcomes are ~100-200x for individual investments). The sensitivity chart therefore shows unrealistic Fund MOIC values at the right end.
- **Impact:** Users may misinterpret the scale and think 500x returns are common enough to plan for.
- **Fix:** Cap the slider at 200x and add a note explaining that 100x+ returns are extremely rare. Alternatively, let the user set the range.
- **Severity:** Minor

### PL4. "Equivalent combinations" table hardcodes a 3x target MOIC
- **What's wrong:** The table shows how many companies at various multiples are needed to hit a 3x Fund MOIC. This target is hardcoded and cannot be changed by the user.
- **Impact:** Users targeting 2x or 5x cannot use this table for their actual goals.
- **Fix:** Add a target MOIC input above the table, or show multiple target columns (2x, 3x, 5x).
- **Severity:** Minor

### PL5. No connection to the main simulation
- **What's wrong:** Power Law Explorer is completely disconnected from the Simulation view. It runs its own independent simulation with no ability to analyze a previously run simulation's results.
- **Impact:** Users who ran a detailed simulation on the main tab cannot see its power law characteristics here.
- **Fix:** Allow importing results from the Simulation view (e.g., "Analyze last simulation") or share state via context.
- **Severity:** Major

---

## View 4: Fund Economics (`/fund-economics`)

### E1. No "Run" button -- everything is live-calculated
- **What's wrong:** Unlike other views, Fund Economics has no "Run" button. All three sections (Waterfall, Fund Size Sensitivity, GP vs LP Table) update instantly when parameters change. This is actually a strength for this view, but it is inconsistent with the rest of the app.
- **Impact:** Users may look for a "Run" button and be confused when things just update. Alternatively, users coming from Economics may be confused why Simulation requires a button press.
- **Fix:** This is a design choice that works well here due to the deterministic (non-stochastic) calculations. Consider adding a brief note: "Results update live as you change parameters." For Simulation/Portfolio/Stress Test, add a similar note explaining why those require explicit runs (stochastic computation is expensive).
- **Severity:** Minor

### E2. Fund Size in Economics defaults to $100M but Simulation defaults to $200M
- **What's wrong:** The Economics view initializes `fundSize` to 100 while the Simulation view and defaults use 200. This creates a disconnect when users move between views.
- **Impact:** Users comparing simulation results ($200M fund) with fee calculations ($100M fund) will get mismatched numbers.
- **Fix:** Use `DEFAULT_PARAMETERS.fundSize` consistently across all views.
- **Severity:** Major

### E3. Waterfall chart tooltip shows both "base" and "delta" entries
- **What's wrong:** The waterfall chart stacks an invisible "base" bar with a visible "delta" bar. The tooltip renders both, and while it formats "base" as empty string, there is still a phantom entry in the tooltip.
- **Impact:** Tooltip shows an empty line, which looks broken.
- **Fix:** Filter out entries where `name === "base"` in the tooltip component rather than just returning empty string.
- **Severity:** Minor

### E4. Management fee step-down is auto-calculated but looks editable
- **What's wrong:** In the FundEconomics page, `managementFeeStepDown` is computed as `Math.max(feeRate - 0.5, 0.5)`, overriding any user input. However, in the ParametersPanel (Simulation view), it is exposed as an editable field. This inconsistency means the step-down in Economics does not reflect what the user set in Simulation.
- **Impact:** Users who customize the step-down rate in Simulation will get different fee calculations in Economics.
- **Fix:** Either make the step-down consistently editable across views, or clearly label it as auto-calculated in both places.
- **Severity:** Minor

### E5. GP vs LP table does not include "Prob < 1x" or loss scenario context
- **What's wrong:** The table shows gross MOIC scenarios of 0.5x and 1.0x but does not contextualize how often these occur. The Simulation view gives probability distributions, but Economics treats these as standalone what-if scenarios.
- **Impact:** Users may not realize that a 0.5x outcome has (say) a 15% probability based on their simulation.
- **Fix:** Add a column or footnote showing the probability of each MOIC scenario based on the most recent simulation run (if available).
- **Severity:** Minor

---

## View 5: Stress Test (`/stress-test`)

### ST1. All scenarios use DEFAULT_PARAMETERS, ignoring user's Simulation configuration
- **What's wrong:** In `handleRun`, scenarios modify `DEFAULT_PARAMETERS` rather than the user's custom parameters from the Simulation view. There is no way to import or reference the user's configured fund.
- **Impact:** If a user has carefully set up a $500M fund with custom exit distributions in Simulation, the Stress Test will model a $200M fund with default distributions. Results are meaningless for their actual portfolio.
- **Fix:** Allow the user to choose the base parameters: either DEFAULT_PARAMETERS or their last simulation configuration. Ideally, connect to the shared parameter context (see G3).
- **Severity:** Critical

### ST2. "Apply Custom" button re-runs ALL scenarios, not just the custom one
- **What's wrong:** Clicking "Apply Custom" triggers a full re-run of all selected pre-built scenarios plus the custom one. This wastes computation and confuses users who may have deselected some scenarios since the last run.
- **Impact:** Slow, redundant computation. Users who only want to add their custom scenario must wait for everything to re-run.
- **Fix:** Only run the custom scenario and merge it into existing results, or clearly communicate that clicking "Apply Custom" is equivalent to "Run All Selected + Custom."
- **Severity:** Minor

### ST3. Custom scenario builder has no presets or reset
- **What's wrong:** The three sliders (Failure Rate Modifier, Multiple Compression, Exit Delay) start at neutral (1.0x, 1.0x, +0.0y) but there are no preset buttons to quickly set up common scenarios like "mild recession" or "severe downturn."
- **Impact:** Users must guess appropriate values for custom stress scenarios. Most fund managers are not accustomed to thinking in terms of "failure rate modifier = 1.3x."
- **Fix:** Add preset buttons above the sliders: "Mild Stress" (1.2x, 0.85x, +1y), "Severe Stress" (1.6x, 0.6x, +3y), "Reset to Neutral." Also add descriptive labels showing what the modified values translate to (e.g., "Failure rate: 40% -> 52%").
- **Severity:** Minor

### ST4. Probability < 1x calculation is incorrect
- **What's wrong:** Line 643-644 in `ScenarioStressTest.tsx` calculates `probBelow1x = 100 - (s.probMOICAbove2x > 0 ? 100 : 0)`, which is a binary 0% or 100% -- completely wrong. This variable is declared but then overridden by `actualProbBelow1x` on line 647 which is the correct calculation. The dead code is confusing but harmless since `probBelow1x` is never used in the render.
- **Impact:** No user-facing impact currently (dead code), but it signals a potential maintenance issue. If someone references `probBelow1x` in future, it will be wrong.
- **Fix:** Remove the incorrect `probBelow1x` calculation entirely since `actualProbBelow1x` is the one used.
- **Severity:** Minor

### ST5. Scenario Comparison table is only visible after running -- no preview
- **What's wrong:** Before clicking "Run Comparison", users see the scenario cards, the custom builder, and an empty state card. They have no idea what metrics will be compared or what the output will look like.
- **Impact:** Users may not understand what clicking "Run Comparison" will produce.
- **Fix:** Show a skeleton table with column headers (Median MOIC, P10, P90, Prob <1x, Median IRR, Net MOIC) and placeholder rows. This sets expectations.
- **Severity:** Minor

### ST6. No ability to save or export stress test results
- **What's wrong:** Unlike the Simulation view which saves runs to IndexedDB, the Stress Test view provides no way to save or export comparison results.
- **Impact:** Users who want to share stress test results with LPs or colleagues cannot do so without screenshots.
- **Fix:** Add "Export to CSV" and "Copy to Clipboard" buttons for the comparison table.
- **Severity:** Minor

---

## Top 10 UX Priorities

Ranked by impact on user experience and frequency of encounter:

### 1. Parameters are not shared across views (G3 + ST1)
**Impact: Critical.** This is the single biggest usability problem. Users configure parameters in Simulation, then get completely different (default) parameters in Portfolio Construction, Power Law, and Stress Test. Every cross-view comparison is silently wrong. Fix this first with a global parameter context.

### 2. Heatmap legend does not match actual colors (P3)
**Impact: Major.** The Portfolio Construction heatmap shows a three-color legend (red/yellow/green) but the cells only use two colors (red for bottom 10%, green for top 10%). The middle 80% is grey. This directly misleads users reading the most important analytical output in that view.

### 3. Validation error hidden at bottom of parameter panel (S8)
**Impact: Major.** When a user enters an invalid value, the "Run Simulations" button silently disables. The error message is rendered at the bottom of a long scrollable panel, possibly off-screen. Users will click the button, nothing happens, and they have no idea why.

### 4. No onboarding or cross-view navigation hints (G2 + G5)
**Impact: Major.** Five analytical views with no guidance on how they relate or in what order to use them. Most users will only use the Simulation tab and never discover the deeper analysis tools. A small investment in onboarding would dramatically increase engagement with the full toolset.

### 5. Three-column layout breaks on smaller screens (S2)
**Impact: Major.** The Simulation view uses fixed 320px sidebars with no responsive breakpoints. On any screen under ~1200px wide, the center charts panel becomes unusably narrow or invisible.

### 6. Too many parameters visible at once (S3)
**Impact: Major.** Approximately 50 input fields are exposed in the ParametersPanel. First-time users face cognitive overload. Collapse advanced parameters by default and lead with the 3-4 most impactful inputs.

### 7. No cancel button for long-running grid analysis (P1)
**Impact: Major.** Grid analysis with many scenarios can take minutes. If a user accidentally triggers it, they must wait or lose state by refreshing. A cancel mechanism is essential for any long-running computation.

### 8. Power Law Explorer uses a single random simulation (PL1)
**Impact: Major.** A single random draw is unreliable for demonstrating power law dynamics. Results change dramatically on each run with no indication of variance. Either aggregate multiple runs or clearly message the single-draw nature.

### 9. Fund Size defaults differ between views (E2)
**Impact: Major.** Economics defaults to $100M while Simulation defaults to $200M. Users moving between views will get inconsistent fee calculations. All views should reference a single default.

### 10. Deployment rate strike-through is unexplained (P4)
**Impact: Major.** Heatmap cells with infeasible deployment rates show a visual strike-through with no legend or tooltip explaining why. Users see data that appears broken or censored without understanding the reason.
