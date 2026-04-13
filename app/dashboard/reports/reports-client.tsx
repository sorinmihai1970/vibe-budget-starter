"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type PeriodFilter = "current_month" | "last_3_months" | "last_6_months" | "all" | "custom";

interface CategoryExpense {
  category_id: string | null;
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
  percentage: number;
}

interface MonthlyBar {
  month: string;
  month_key: string;
  income: number;
  expenses: number;
}

interface ReportsData {
  categoryExpenses: CategoryExpense[];
  monthlyBars: MonthlyBar[];
  totalExpenses: number;
  totalIncome: number;
  currency: string;
}

// Tranzacție pentru pivot (fetch din /api/transactions)
interface TxForPivot {
  id: string;
  date: string;
  amount: number;
  category_id: string | null;
  categories: { name: string; icon: string } | null;
}

interface PivotCell {
  amount: number;
  count: number;
  change?: number; // % față de luna anterioară
}

interface PivotRow {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  months: Record<string, PivotCell>;
  total: number;
  average: number;
  maxIncrease: { month: string; change: number };
  maxDecrease: { month: string; change: number };
}

interface CoachResult {
  healthScore: number;
  healthExplanation: string;
  tips: string[];
  positiveObservation: string;
}

interface Props {
  currency: string;
}

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "current_month", label: "Luna curentă" },
  { value: "last_3_months", label: "Ultimele 3 luni" },
  { value: "last_6_months", label: "Ultimele 6 luni" },
  { value: "all", label: "Tot" },
  { value: "custom", label: "Perioadă personalizată" },
];

function formatAmount(amount: number, currency: string): string {
  return (
    new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) +
    " " +
    currency
  );
}

function HealthScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#F97316" : "#DC2626";
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold leading-none" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-400 leading-none mt-1">/ 100</p>
      </div>
    </div>
  );
}

export default function ReportsClient({ currency }: Props) {
  const [activeView, setActiveView] = useState<"charts" | "pivot">("charts");
  const [period, setPeriod] = useState<PeriodFilter>("current_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Pivot state
  const [allTransactions, setAllTransactions] = useState<TxForPivot[] | null>(null);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [pivotError, setPivotError] = useState<string | null>(null);
  const [showPercentages, setShowPercentages] = useState(false);

  useEffect(() => {
    if (period !== "custom") {
      fetchReports();
      setCoachResult(null);
      setCoachError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Fetch tranzacții pentru pivot (o singură dată)
  useEffect(() => {
    if (activeView === "pivot" && !allTransactions) {
      fetchAllTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const fetchAllTransactions = async () => {
    setPivotLoading(true);
    setPivotError(null);
    try {
      const res = await fetch("/api/transactions");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare necunoscută");
      setAllTransactions(json.data as TxForPivot[]);
    } catch {
      setPivotError("Eroare la încărcarea tranzacțiilor");
    } finally {
      setPivotLoading(false);
    }
  };

  const fetchReports = async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/reports?period=${period}`;
      if (dateFrom && dateTo) {
        url = `/api/reports?period=custom&date_from=${dateFrom}&date_to=${dateTo}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare necunoscută");
      setData(json.data);
    } catch {
      setError("Eroare la încărcarea rapoartelor");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) return;
    setCoachResult(null);
    setCoachError(null);
    // Adăugăm o zi la dateTo ca să includem ziua selectată
    const to = new Date(customTo);
    to.setDate(to.getDate() + 1);
    const toStr = to.toISOString().split("T")[0];
    fetchReports(customFrom, toStr);
  };

  const analyzeWithAI = async () => {
    if (!data) return;
    setCoachLoading(true);
    setCoachError(null);
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryExpenses: data.categoryExpenses,
          monthlyBars: data.monthlyBars,
          totalExpenses: data.totalExpenses,
          totalIncome: data.totalIncome,
          currency,
          period,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare necunoscută");
      setCoachResult(json.data as CoachResult);
    } catch {
      setCoachError("Analiza AI a eșuat. Încearcă din nou.");
    } finally {
      setCoachLoading(false);
    }
  };

  const tooltipStyle = {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(255,255,255,0.5)",
    borderRadius: "12px",
    backdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
  };

  // Filtrăm tranzacțiile pivot după aceeași perioadă ca și graficele
  const pivotFiltered = useMemo((): TxForPivot[] => {
    if (!allTransactions) return [];
    if (period === "all") return allTransactions;
    if (period === "custom" && customFrom && customTo) {
      return allTransactions.filter((t) => t.date >= customFrom && t.date <= customTo);
    }
    const now = new Date();
    const monthsBack = period === "current_month" ? 0 : period === "last_3_months" ? 3 : 6;
    const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const startStr = start.toISOString().split("T")[0];
    return allTransactions.filter((t) => t.date >= startStr);
  }, [allTransactions, period, customFrom, customTo]);

  // Lunile disponibile în pivot
  const pivotMonths = useMemo(() => {
    const s = new Set<string>();
    for (const t of pivotFiltered) {
      if (Number(t.amount) < 0) s.add(t.date.substring(0, 7));
    }
    return Array.from(s).sort();
  }, [pivotFiltered]);

  // Rândurile pivot: categorii × luni
  const pivotRows = useMemo((): PivotRow[] => {
    const expenses = pivotFiltered.filter((t) => Number(t.amount) < 0);
    const catMap = new Map<string, { name: string; icon: string; months: Map<string, { amount: number; count: number }> }>();

    for (const t of expenses) {
      const catId = t.category_id ?? "__uncategorized";
      const catName = t.categories?.name ?? "Necategorizat";
      const catIcon = t.categories?.icon ?? "❓";
      const monthKey = t.date.substring(0, 7);
      const absAmt = Math.abs(Number(t.amount));

      if (!catMap.has(catId)) catMap.set(catId, { name: catName, icon: catIcon, months: new Map() });
      const cat = catMap.get(catId)!;
      const existing = cat.months.get(monthKey) ?? { amount: 0, count: 0 };
      existing.amount += absAmt;
      existing.count++;
      cat.months.set(monthKey, existing);
    }

    const rows: PivotRow[] = [];
    catMap.forEach((catData, catId) => {
      const months: Record<string, PivotCell> = {};
      let total = 0;
      for (const m of pivotMonths) {
        const cell = catData.months.get(m) ?? { amount: 0, count: 0 };
        months[m] = { amount: cell.amount, count: cell.count };
        total += cell.amount;
      }
      const average = pivotMonths.length > 0 ? total / pivotMonths.length : 0;

      // Calculăm % schimbare față de luna anterioară
      let prevAmt: number | null = null;
      let maxIncrease = { month: "", change: 0 };
      let maxDecrease = { month: "", change: 0 };
      for (const m of pivotMonths) {
        const cur = months[m].amount;
        if (prevAmt !== null && prevAmt > 0) {
          const change = ((cur - prevAmt) / prevAmt) * 100;
          months[m].change = change;
          if (change > maxIncrease.change) maxIncrease = { month: m, change };
          if (change < maxDecrease.change) maxDecrease = { month: m, change };
        }
        prevAmt = cur;
      }

      rows.push({ categoryId: catId, categoryName: catData.name, categoryIcon: catData.icon, months, total, average, maxIncrease, maxDecrease });
    });

    return rows.sort((a, b) => b.total - a.total);
  }, [pivotFiltered, pivotMonths]);

  const formatPivotMonth = (key: string): string => {
    const [, m] = key.split("-");
    const names = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];
    return `${names[parseInt(m) - 1]} ${key.split("-")[0]}`;
  };

  const getCellColor = (amount: number, average: number): string => {
    if (amount === 0) return "bg-gray-50 text-gray-400";
    const ratio = amount / average;
    if (ratio >= 1.5) return "bg-red-100 text-red-900 font-bold";
    if (ratio >= 1.2) return "bg-orange-100 text-orange-900 font-semibold";
    if (ratio >= 0.8) return "bg-yellow-50 text-yellow-900";
    return "bg-green-100 text-green-900";
  };

  const getChangeColor = (change: number): string => {
    if (change >= 50) return "text-red-700 font-bold";
    if (change >= 20) return "text-orange-700 font-semibold";
    if (change >= 0) return "text-yellow-700";
    if (change >= -20) return "text-green-700";
    return "text-green-900 font-bold";
  };

  return (
    <>
      {/* Titlu secțiune */}
      <div className="mb-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-gray-800">Rapoarte financiare</h2>
        <p className="text-sm text-gray-500 mt-1">
          Vizualizează cheltuielile și veniturile tale
        </p>
      </div>

      {/* View toggle: Grafice | Tabel Pivot */}
      <div className="flex gap-2 mb-6 animate-fade-in-up">
        <button
          onClick={() => setActiveView("charts")}
          className={activeView === "charts"
            ? "btn-primary px-5 py-2 rounded-xl text-sm font-semibold"
            : "px-5 py-2 rounded-xl border border-gray-200 bg-white/70 hover:bg-white text-gray-600 text-sm font-medium transition-all"}
        >
          📊 Grafice
        </button>
        <button
          onClick={() => setActiveView("pivot")}
          className={activeView === "pivot"
            ? "btn-primary px-5 py-2 rounded-xl text-sm font-semibold"
            : "px-5 py-2 rounded-xl border border-gray-200 bg-white/70 hover:bg-white text-gray-600 text-sm font-medium transition-all"}
        >
          📋 Tabel Pivot
        </button>
      </div>

      {/* === TABEL PIVOT: Categorii × Luni === */}
      {activeView === "pivot" && (
        <div className="animate-fade-in-up space-y-6">
          {pivotLoading && <div className="glass-card rounded-2xl h-64 animate-pulse" />}
          {pivotError && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-red-500">{pivotError}</p>
              <button onClick={fetchAllTransactions} className="mt-3 btn-primary px-5 py-2 rounded-xl text-sm">Reîncearcă</button>
            </div>
          )}
          {allTransactions && !pivotLoading && (
            <>
              {/* Tabel pivot principal */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Raport Pivot — Categorii × Luni</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPercentages}
                      onChange={(e) => setShowPercentages(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-teal-500"
                    />
                    <span className="text-sm text-gray-600">Arată % față de luna anterioară</span>
                  </label>
                </div>

                {/* Legendă culori */}
                <div className="flex flex-wrap gap-3 mb-4 text-xs">
                  {[
                    { cls: "bg-red-100 border-red-300", label: "Critic (>150% din medie)" },
                    { cls: "bg-orange-100 border-orange-300", label: "Ridicat (120–150%)" },
                    { cls: "bg-yellow-50 border-yellow-300", label: "Normal (80–120%)" },
                    { cls: "bg-green-100 border-green-300", label: "Sub medie (<80%)" },
                    { cls: "bg-gray-50 border-gray-300", label: "Fără cheltuieli" },
                  ].map(({ cls, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-6 h-3 ${cls} border rounded`} />
                      <span className="text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>

                {pivotRows.length === 0 || pivotMonths.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="text-sm">Nicio cheltuială categorizată în această perioadă</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="sticky left-0 bg-gray-100 px-4 py-3 text-left font-bold border-r-2 border-gray-300 z-10 min-w-[160px]">
                            Categorie
                          </th>
                          {pivotMonths.map((m) => (
                            <th key={m} className="px-3 py-3 text-center font-semibold border-r border-gray-200 min-w-[100px]">
                              {formatPivotMonth(m)}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center font-bold border-l-2 border-gray-300 bg-indigo-50 min-w-[100px]">Total</th>
                          <th className="px-4 py-3 text-center font-bold bg-indigo-50 min-w-[100px]">Medie/lună</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pivotRows.map((row) => (
                          <tr key={row.categoryId} className="border-b hover:bg-gray-50/50">
                            <td className="sticky left-0 bg-white px-4 py-3 font-semibold border-r-2 border-gray-300 z-10">
                              <div className="flex items-center gap-2">
                                <span>{row.categoryIcon}</span>
                                <span className="truncate">{row.categoryName}</span>
                              </div>
                            </td>
                            {pivotMonths.map((m) => {
                              const cell = row.months[m];
                              return (
                                <td key={m} className={`px-3 py-3 text-center border-r border-gray-200 ${getCellColor(cell.amount, row.average)}`}>
                                  <div className="font-semibold">
                                    {cell.amount > 0
                                      ? cell.amount.toLocaleString("ro-RO", { maximumFractionDigits: 0 })
                                      : "—"}
                                  </div>
                                  {showPercentages && cell.change !== undefined && (
                                    <div className={`text-xs mt-0.5 ${getChangeColor(cell.change)}`}>
                                      {cell.change > 0 ? "+" : ""}{cell.change.toFixed(0)}%
                                    </div>
                                  )}
                                  {cell.count > 0 && (
                                    <div className="text-xs text-gray-400 mt-0.5">{cell.count} tx</div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center font-bold border-l-2 border-gray-300 bg-indigo-50">
                              {row.total.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} {currency}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold bg-indigo-50">
                              {row.average.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} {currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Top Creșteri & Scăderi */}
              {pivotRows.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top Creșteri */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-bold text-gray-800 mb-3">📈 Top Creșteri Lunare</h3>
                    <div className="space-y-2">
                      {pivotRows
                        .filter((r) => r.maxIncrease.change > 0)
                        .sort((a, b) => b.maxIncrease.change - a.maxIncrease.change)
                        .slice(0, 5)
                        .map((row) => (
                          <div key={row.categoryId} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{row.categoryIcon}</span>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{row.categoryName}</div>
                                <div className="text-xs text-gray-500">{formatPivotMonth(row.maxIncrease.month)}</div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-red-700">+{row.maxIncrease.change.toFixed(0)}%</div>
                          </div>
                        ))}
                      {pivotRows.filter((r) => r.maxIncrease.change > 0).length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-2">Nicio creștere semnificativă</p>
                      )}
                    </div>
                  </div>

                  {/* Top Scăderi */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-bold text-gray-800 mb-3">📉 Top Scăderi Lunare</h3>
                    <div className="space-y-2">
                      {pivotRows
                        .filter((r) => r.maxDecrease.change < 0)
                        .sort((a, b) => a.maxDecrease.change - b.maxDecrease.change)
                        .slice(0, 5)
                        .map((row) => (
                          <div key={row.categoryId} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{row.categoryIcon}</span>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{row.categoryName}</div>
                                <div className="text-xs text-gray-500">{formatPivotMonth(row.maxDecrease.month)}</div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-green-700">{row.maxDecrease.change.toFixed(0)}%</div>
                          </div>
                        ))}
                      {pivotRows.filter((r) => r.maxDecrease.change < 0).length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-2">Nicio scădere semnificativă</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* A. Filtre perioadă — vizibile pe ambele tab-uri */}
      <div className="flex gap-2 flex-wrap mb-4 animate-fade-in-up">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={
              period === value
                ? "btn-primary px-4 py-2 rounded-xl text-sm font-semibold"
                : "px-4 py-2 rounded-xl border border-gray-200 bg-white/70 hover:bg-white text-gray-600 hover:text-gray-900 text-sm font-medium transition-all duration-200"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date picker pentru perioadă personalizată */}
      {period === "custom" && (
        <div className="glass-card rounded-2xl p-4 mb-6 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">De la</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Până la</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom}
                className="input-field w-full"
              />
            </div>
            <button
              onClick={handleApplyCustom}
              disabled={!customFrom || !customTo || loading}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap disabled:opacity-40"
            >
              Aplică
            </button>
          </div>
        </div>
      )}

      {/* === GRAFICE === */}
      {activeView === "charts" && <>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl h-24" />
            <div className="glass-card rounded-2xl h-24" />
          </div>
          <div className="glass-card rounded-2xl h-80" />
          <div className="glass-card rounded-2xl h-80" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-card rounded-2xl p-8 text-center animate-fade-in-up">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={() => fetchReports()}
            className="mt-4 btn-primary px-5 py-2 rounded-xl text-sm font-semibold"
          >
            Reîncearcă
          </button>
        </div>
      )}

      {/* Date încărcate */}
      {data && !loading && (
        <>
          {/* B. Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in-up">
            <div className="glass-card rounded-2xl p-5">
              <p className="text-sm text-gray-500 mb-1">Total cheltuieli</p>
              <p className="text-2xl font-bold" style={{ color: "#DC2626" }}>
                -{formatAmount(data.totalExpenses, currency)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-sm text-gray-500 mb-1">Total venituri</p>
              <p className="text-2xl font-bold" style={{ color: "#059669" }}>
                +{formatAmount(data.totalIncome, currency)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-sm text-gray-500 mb-1">Balanță</p>
              <p
                className="text-2xl font-bold"
                style={{ color: data.totalIncome - data.totalExpenses >= 0 ? "#059669" : "#DC2626" }}
              >
                {data.totalIncome - data.totalExpenses >= 0 ? "+" : ""}
                {formatAmount(data.totalIncome - data.totalExpenses, currency)}
              </p>
            </div>
          </div>

          {/* C. Pie Chart — Cheltuieli pe categorii */}
          <div className="glass-card rounded-2xl p-6 mb-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Cheltuieli pe categorii
            </h3>
            {data.categoryExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-4xl mb-3">🥧</span>
                <p className="text-sm">Nu sunt cheltuieli în această perioadă</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={data.categoryExpenses as any[]}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={55}
                    paddingAngle={2}
                  >
                    {data.categoryExpenses.map((entry) => (
                      <Cell
                        key={entry.category_id ?? "__null__"}
                        fill={entry.category_color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown, name: unknown) => {
                      const numVal = typeof value === "number" ? value : Number(value);
                      const strName = String(name);
                      const item = data.categoryExpenses.find(
                        (e) => e.category_name === strName
                      );
                      return [
                        `${formatAmount(numVal, currency)} (${item?.percentage ?? 0}%)`,
                        strName,
                      ];
                    }}
                  />
                  <Legend
                    formatter={(value: unknown) => {
                      const strValue = String(value);
                      const item = data.categoryExpenses.find(
                        (e) => e.category_name === strValue
                      );
                      return `${item?.category_icon ?? "📁"} ${strValue} (${item?.percentage ?? 0}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* D. Bar Chart — Evoluție lunară */}
          <div className="glass-card rounded-2xl p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Evoluție lunară
            </h3>
            {data.monthlyBars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-4xl mb-3">📈</span>
                <p className="text-sm">Nu sunt tranzacții în această perioadă</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={data.monthlyBars}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.06)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(v)
                    }
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown, name: unknown) => {
                      const numVal = typeof value === "number" ? value : Number(value);
                      const label = name === "income" ? "Venituri" : "Cheltuieli";
                      return [formatAmount(numVal, currency), label];
                    }}
                  />
                  <Legend
                    formatter={(value: unknown) =>
                      value === "income" ? "Venituri" : "Cheltuieli"
                    }
                  />
                  <Bar
                    dataKey="income"
                    name="income"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="expenses"
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* E. Buton AI Coach */}
          <div className="mt-6 text-center animate-fade-in-up">
            <button
              onClick={analyzeWithAI}
              disabled={coachLoading}
              className="btn-secondary px-8 py-3 rounded-2xl font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {coachLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analizez...
                </span>
              ) : (
                "🤖 Analizează cheltuielile"
              )}
            </button>
            {coachError && (
              <p className="text-red-500 text-sm mt-2">{coachError}</p>
            )}
          </div>

          {/* F. Card rezultat AI Coach */}
          {coachResult && (
            <div className="mt-6 glass-card rounded-2xl p-6 animate-fade-in-up border border-teal-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                🤖 Analiză AI Financial Coach
              </h3>

              {/* Health Score + Explicație */}
              <div className="flex flex-col md:flex-row items-center gap-6 mb-6 p-5 rounded-2xl"
                style={{ background: "rgba(20,184,166,0.06)" }}>
                <HealthScoreRing score={coachResult.healthScore} />
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Scor financiar</p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {coachResult.healthExplanation}
                  </p>
                </div>
              </div>

              {/* Observație pozitivă */}
              <div className="mb-5 p-4 rounded-xl flex items-start gap-3"
                style={{ background: "rgba(5,150,105,0.08)" }}>
                <span className="text-xl mt-0.5">✅</span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {coachResult.positiveObservation}
                </p>
              </div>

              {/* Sfaturi */}
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-3">Sfaturi personalizate</p>
                <ul className="space-y-3">
                  {coachResult.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/50">
                      <span className="text-sm font-bold text-teal-600 mt-0.5 shrink-0">
                        {i + 1}.
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
      </> /* end activeView === "charts" */}
    </>
  );
}
