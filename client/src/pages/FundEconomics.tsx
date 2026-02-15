/**
 * Fund Economics Calculator
 * Waterfall analysis, fund size sensitivity, and GP vs LP economics
 */

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  calculateNetReturns,
  calculateManagementFees,
  generateFeeDragTable,
  DEFAULT_FEE_STRUCTURE,
} from "@/lib/fees";
import type { FeeStructure } from "@/types/simulation";

// ── Theme constants ───────────────────────────────────────────────────
const PURPLE = "#a371f7";
const GOLD = "#d29922";
const GREEN = "#3fb950";
const RED = "#f85149";
const GRID_COLOR = "#334155";
const TEXT_COLOR = "#94a3b8";
const TOOLTIP_BG = "#1e293b";
const TOOLTIP_BORDER = "#334155";

// ── Helpers ───────────────────────────────────────────────────────────
function fmt$(v: number): string {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number, decimals = 1): string {
  return `${v.toFixed(decimals)}%`;
}

// ── Custom tooltip ────────────────────────────────────────────────────
function DarkTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-sm shadow-lg"
      style={{
        background: TOOLTIP_BG,
        border: `1px solid ${TOOLTIP_BORDER}`,
        color: TEXT_COLOR,
      }}
    >
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}:{" "}
          {formatter ? formatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Section 1: Waterfall Calculator ───────────────────────────────────
function WaterfallSection({
  feeStructure,
  fundSize,
  investmentPeriod,
  fundLife,
}: {
  feeStructure: FeeStructure;
  fundSize: number;
  investmentPeriod: number;
  fundLife: number;
}) {
  const [grossMOIC, setGrossMOIC] = useState(3);

  const result = useMemo(() => {
    const grossProceeds = fundSize * 1e6 * grossMOIC;
    const totalInvested = fundSize * 1e6 * 0.8;
    return calculateNetReturns(
      grossProceeds,
      fundSize * 1e6,
      totalInvested,
      feeStructure,
      investmentPeriod,
      fundLife
    );
  }, [grossMOIC, fundSize, feeStructure, investmentPeriod, fundLife]);

  const waterfallData = useMemo(() => {
    const gross = result.grossProceeds;
    const mgmtFees = result.managementFees;
    const expenses = 0; // modeled as zero; placeholder for future
    const distributable = result.distributable;
    const hurdle =
      distributable > fundSize * 1e6
        ? Math.min(
            distributable - fundSize * 1e6,
            fundSize *
              1e6 *
              (Math.pow(1 + feeStructure.hurdleRate / 100, fundLife) - 1)
          )
        : 0;
    const carry = result.carriedInterest;
    const netLP = result.netToLP;

    return [
      { name: "Gross Returns", value: gross, color: GREEN, type: "positive" },
      {
        name: "Mgmt Fees",
        value: -mgmtFees,
        color: RED,
        type: "negative",
      },
      {
        name: "Expenses",
        value: -expenses,
        color: RED,
        type: "negative",
      },
      {
        name: "Distributable",
        value: distributable,
        color: PURPLE,
        type: "subtotal",
      },
      {
        name: "LP Hurdle",
        value: hurdle,
        color: GOLD,
        type: "positive",
      },
      { name: "Carry (GP)", value: -carry, color: RED, type: "negative" },
      { name: "Net to LP", value: netLP, color: GREEN, type: "total" },
    ];
  }, [result, fundSize, feeStructure, fundLife]);

  // Build stacked waterfall bars: each bar has a "base" (invisible) + "delta"
  const stackedData = useMemo(() => {
    let running = 0;
    return waterfallData.map((d) => {
      const absVal = Math.abs(d.value);
      let base: number;
      if (d.type === "positive" || d.type === "subtotal" || d.type === "total") {
        base = running;
        running = d.value; // reset for subtotals/totals, or add
        if (d.type === "positive" && d.name !== "Gross Returns") {
          // LP Hurdle is informational, don't shift running
          base = 0;
          running = running; // no-op
        }
        if (d.name === "Gross Returns") {
          running = d.value;
        }
        if (d.type === "subtotal" || d.type === "total") {
          base = 0;
        }
      } else {
        // negative
        base = running + d.value; // d.value is negative
        running = running + d.value;
      }
      return {
        name: d.name,
        base: Math.max(0, base),
        delta: absVal,
        color: d.color,
        rawValue: d.value,
      };
    });
  }, [waterfallData]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Waterfall Calculator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Step-by-step fund distribution waterfall
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gross MOIC slider */}
        <div className="flex items-center gap-4">
          <Label className="text-muted-foreground whitespace-nowrap w-32">
            Gross MOIC
          </Label>
          <Slider
            min={0.5}
            max={10}
            step={0.1}
            value={[grossMOIC]}
            onValueChange={([v]) => setGrossMOIC(v)}
            className="flex-1"
          />
          <span className="text-foreground font-mono w-14 text-right">
            {grossMOIC.toFixed(1)}x
          </span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Gross Proceeds", value: fmt$(result.grossProceeds) },
            { label: "Mgmt Fees", value: fmt$(result.managementFees) },
            { label: "Carry", value: fmt$(result.carriedInterest) },
            { label: "Net to LP", value: fmt$(result.netToLP) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg bg-muted/30 px-3 py-2 text-center"
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Net MOIC", value: `${result.netMOIC.toFixed(2)}x` },
            { label: "Fee Drag", value: fmtPct(result.feeDragPercent) },
            { label: "GP Total Comp", value: fmt$(result.gpTotalComp) },
            { label: "Distributable", value: fmt$(result.distributable) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg bg-muted/30 px-3 py-2 text-center"
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Waterfall chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedData}
              margin={{ top: 20, right: 20, bottom: 5, left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: TEXT_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => fmt$(v)}
                tick={{ fill: TEXT_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
              />
              <RechartsTooltip
                content={
                  <DarkTooltip
                    formatter={(v: number, name: string) => {
                      if (name === "base") return "";
                      return fmt$(v);
                    }}
                  />
                }
              />
              {/* Invisible base bar */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />
              {/* Visible delta bar */}
              <Bar dataKey="delta" stackId="waterfall" radius={[4, 4, 0, 0]}>
                {stackedData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section 2: Fund Size Sensitivity ──────────────────────────────────
function FundSizeSensitivitySection({
  feeStructure,
  investmentPeriod,
  fundLife,
}: {
  feeStructure: FeeStructure;
  investmentPeriod: number;
  fundLife: number;
}) {
  const [assumedMOIC, setAssumedMOIC] = useState(3);

  const fundSizes = [25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000];

  const data = useMemo(
    () =>
      fundSizes.map((size) => {
        const sizeInDollars = size * 1e6;
        const grossProceeds = sizeInDollars * assumedMOIC;
        const totalInvested = sizeInDollars * 0.8;
        const result = calculateNetReturns(
          grossProceeds,
          sizeInDollars,
          totalInvested,
          feeStructure,
          investmentPeriod,
          fundLife
        );
        return {
          fundSize: `$${size}M`,
          fundSizeNum: size,
          gpCarry: result.carriedInterest / 1e6,
          lpNetMOIC: result.netMOIC,
          feeDrag: result.feeDragPercent,
        };
      }),
    [assumedMOIC, feeStructure, investmentPeriod, fundLife]
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Fund Size Sensitivity</CardTitle>
        <p className="text-sm text-muted-foreground">
          How fund size affects GP carry, LP net MOIC, and fee drag
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MOIC slider */}
        <div className="flex items-center gap-4">
          <Label className="text-muted-foreground whitespace-nowrap w-40">
            Assumed Gross MOIC
          </Label>
          <Slider
            min={1}
            max={10}
            step={0.1}
            value={[assumedMOIC]}
            onValueChange={([v]) => setAssumedMOIC(v)}
            className="flex-1"
          />
          <span className="text-foreground font-mono w-14 text-right">
            {assumedMOIC.toFixed(1)}x
          </span>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, bottom: 5, left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="fundSize"
                tick={{ fill: TEXT_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: TEXT_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}M`}
                label={{
                  value: "GP Carry ($M)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: TEXT_COLOR, fontSize: 11 },
                  offset: -5,
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: TEXT_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                label={{
                  value: "MOIC / Fee Drag %",
                  angle: 90,
                  position: "insideRight",
                  style: { fill: TEXT_COLOR, fontSize: 11 },
                  offset: -5,
                }}
              />
              <RechartsTooltip
                content={
                  <DarkTooltip
                    formatter={(v: number, name: string) => {
                      if (name === "GP Carry") return `$${v.toFixed(1)}M`;
                      if (name === "LP Net MOIC") return `${v.toFixed(2)}x`;
                      if (name === "Fee Drag") return fmtPct(v);
                      return String(v);
                    }}
                  />
                }
              />
              <Legend
                wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gpCarry"
                name="GP Carry"
                stroke={GOLD}
                strokeWidth={2}
                dot={{ fill: GOLD, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="lpNetMOIC"
                name="LP Net MOIC"
                stroke={PURPLE}
                strokeWidth={2}
                dot={{ fill: PURPLE, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="feeDrag"
                name="Fee Drag"
                stroke={RED}
                strokeWidth={2}
                dot={{ fill: RED, r: 3 }}
                activeDot={{ r: 5 }}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section 3: GP vs LP Economics Table ────────────────────────────────
function GPvsLPTable({
  feeStructure,
  fundSize,
  investmentPeriod,
  fundLife,
}: {
  feeStructure: FeeStructure;
  fundSize: number;
  investmentPeriod: number;
  fundLife: number;
}) {
  const scenarios = [0.5, 1, 1.5, 2, 3, 5, 7, 10];

  const rows = useMemo(
    () =>
      scenarios.map((grossMOIC) => {
        const sizeInDollars = fundSize * 1e6;
        const grossProceeds = sizeInDollars * grossMOIC;
        const totalInvested = sizeInDollars * 0.8;
        const result = calculateNetReturns(
          grossProceeds,
          sizeInDollars,
          totalInvested,
          feeStructure,
          investmentPeriod,
          fundLife
        );
        const carryKicksIn = result.carriedInterest > 0;
        return {
          grossMOIC,
          managementFees: result.managementFees,
          carry: result.carriedInterest,
          netLPMOIC: result.netMOIC,
          feeDrag: result.feeDragPercent,
          carryKicksIn,
        };
      }),
    [fundSize, feeStructure, investmentPeriod, fundLife]
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">
          GP vs LP Economics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          How fees and carry impact LP returns across MOIC scenarios.
          Rows where carry kicks in are highlighted.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Gross MOIC",
                  "Mgmt Fees",
                  "Carry (GP)",
                  "Net LP MOIC",
                  "Fee Drag %",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.grossMOIC}
                  className={`border-b border-border/50 transition-colors ${
                    row.carryKicksIn
                      ? "bg-[#d29922]/5"
                      : "hover:bg-muted/20"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.grossMOIC.toFixed(1)}x
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmt$(row.managementFees)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      style={{
                        color: row.carryKicksIn ? GOLD : TEXT_COLOR,
                      }}
                    >
                      {fmt$(row.carry)}
                      {row.carryKicksIn && (
                        <span className="ml-1 text-xs opacity-60">*</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      style={{
                        color:
                          row.netLPMOIC >= 1
                            ? GREEN
                            : RED,
                      }}
                    >
                      {row.netLPMOIC.toFixed(2)}x
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      style={{
                        color:
                          row.feeDrag > 30
                            ? RED
                            : row.feeDrag > 15
                              ? GOLD
                              : GREEN,
                      }}
                    >
                      {fmtPct(row.feeDrag)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          * Carry kicks in above the {feeStructure.hurdleRate}% hurdle rate.
          Note how fee drag is highest at lower MOICs (management fees are fixed)
          and carry adds non-linear drag at higher MOICs.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function FundEconomics() {
  // Configurable fee structure inputs
  const [feeRate, setFeeRate] = useState(DEFAULT_FEE_STRUCTURE.managementFeeRate);
  const [carryRate, setCarryRate] = useState(DEFAULT_FEE_STRUCTURE.carryRate);
  const [hurdleRate, setHurdleRate] = useState(DEFAULT_FEE_STRUCTURE.hurdleRate);
  const [gpCommit, setGpCommit] = useState(DEFAULT_FEE_STRUCTURE.gpCommitPercent);
  const [fundSize, setFundSize] = useState(100); // in $M
  const [fundLife, setFundLife] = useState(10);
  const [investmentPeriod, setInvestmentPeriod] = useState(5);

  const feeStructure: FeeStructure = useMemo(
    () => ({
      managementFeeRate: feeRate,
      managementFeeStepDown: Math.max(feeRate - 0.5, 0.5),
      carryRate,
      hurdleRate,
      gpCommitPercent: gpCommit,
    }),
    [feeRate, carryRate, hurdleRate, gpCommit]
  );

  const totalMgmtFees = useMemo(
    () =>
      calculateManagementFees(
        fundSize * 1e6,
        feeStructure,
        investmentPeriod,
        fundLife
      ),
    [fundSize, feeStructure, investmentPeriod, fundLife]
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Fund Economics Calculator
        </h2>
        <p className="text-muted-foreground mt-1">
          Model waterfall distributions, fee drag, and GP/LP economics
        </p>
      </div>

      {/* Global inputs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Fund Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            {/* Fund Size */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Fund Size ($M)
              </Label>
              <Input
                type="number"
                min={1}
                value={fundSize}
                onChange={(e) =>
                  setFundSize(Math.max(1, Number(e.target.value)))
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Fund Life */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Fund Life (yrs)
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={fundLife}
                onChange={(e) =>
                  setFundLife(Math.max(1, Math.min(20, Number(e.target.value))))
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Investment Period */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Investment Period (yrs)
              </Label>
              <Input
                type="number"
                min={1}
                max={fundLife}
                value={investmentPeriod}
                onChange={(e) =>
                  setInvestmentPeriod(
                    Math.max(1, Math.min(fundLife, Number(e.target.value)))
                  )
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Mgmt Fee % */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Mgmt Fee (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={feeRate}
                onChange={(e) =>
                  setFeeRate(
                    Math.max(0, Math.min(5, Number(e.target.value)))
                  )
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Carry % */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Carry (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={50}
                step={1}
                value={carryRate}
                onChange={(e) =>
                  setCarryRate(
                    Math.max(0, Math.min(50, Number(e.target.value)))
                  )
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Hurdle % */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Hurdle (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={hurdleRate}
                onChange={(e) =>
                  setHurdleRate(
                    Math.max(0, Math.min(20, Number(e.target.value)))
                  )
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* GP Commit % */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                GP Commit (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={gpCommit}
                onChange={(e) =>
                  setGpCommit(
                    Math.max(0, Math.min(10, Number(e.target.value)))
                  )
                }
                className="bg-muted/30 border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Total Mgmt Fees (read-only) */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Total Mgmt Fees
              </Label>
              <div className="flex items-center h-9 rounded-md bg-muted/30 border border-border px-3 font-mono text-sm text-foreground">
                {fmt$(totalMgmtFees)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Waterfall */}
      <WaterfallSection
        feeStructure={feeStructure}
        fundSize={fundSize}
        investmentPeriod={investmentPeriod}
        fundLife={fundLife}
      />

      {/* Section 2: Fund Size Sensitivity */}
      <FundSizeSensitivitySection
        feeStructure={feeStructure}
        investmentPeriod={investmentPeriod}
        fundLife={fundLife}
      />

      {/* Section 3: GP vs LP Table */}
      <GPvsLPTable
        feeStructure={feeStructure}
        fundSize={fundSize}
        investmentPeriod={investmentPeriod}
        fundLife={fundLife}
      />
    </div>
  );
}
