"use client";

import { useState, useEffect } from "react";
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

type PeriodFilter = "current_month" | "last_3_months" | "last_6_months" | "all";

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
    <div className="flex flex-col items-center">
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
      <p className="text-3xl font-bold -mt-16" style={{ color }}>{score}</p>
      <p className="text-xs text-gray-400 mt-8">/ 100</p>
    </div>
  );
}

export default function ReportsClient({ currency }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>("current_month");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    setCoachResult(null);
    setCoachError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare necunoscută");
      setData(json.data);
    } catch {
      setError("Eroare la încărcarea rapoartelor");
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      {/* Titlu secțiune */}
      <div className="mb-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-gray-800">Rapoarte financiare</h2>
        <p className="text-sm text-gray-500 mt-1">
          Vizualizează cheltuielile și veniturile tale
        </p>
      </div>

      {/* A. Filtre perioadă */}
      <div className="flex gap-2 flex-wrap mb-6 animate-fade-in-up">
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
            onClick={fetchReports}
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
                    data={data.categoryExpenses}
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
    </>
  );
}
