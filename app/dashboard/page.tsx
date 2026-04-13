import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LogoutButton from "./logout-button";

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " " + currency;
}

export default async function DashboardPage() {
  // 1. Verificare autentificare
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = createAdminClient();

  const { data: userData } = await admin
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .limit(1)
    .single();

  if (!userData) redirect("/api/auth/logout");

  const user = { ...userData, nativeCurrency: userData.native_currency };

  // 2. Calculare sume financiare
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const firstDayNextMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const monthNames = [
    "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
  ];
  const currentMonthName = monthNames[now.getMonth()];

  // Toate tranzacțiile (pentru sold total)
  const { data: allTransactions = [] } = await admin
    .from("transactions")
    .select("amount")
    .eq("user_id", authUser.id);

  // Tranzacțiile lunii curente
  const { data: monthTransactions = [] } = await admin
    .from("transactions")
    .select("amount")
    .eq("user_id", authUser.id)
    .gte("date", firstDayOfMonth)
    .lt("date", firstDayNextMonth);

  const totalBalance = (allTransactions ?? []).reduce((sum, t) => sum + (t.amount as number), 0);
  const monthIncome = (monthTransactions ?? [])
    .filter((t) => (t.amount as number) > 0)
    .reduce((sum, t) => sum + (t.amount as number), 0);
  const monthExpenses = (monthTransactions ?? [])
    .filter((t) => (t.amount as number) < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount as number), 0);

  const hasTransactions = (allTransactions ?? []).length > 0;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #F0FDFA 0%, #E0F2FE 50%, #FFF7ED 100%)" }}>

      {/* Header glassmorphism */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#0D9488" }}>
                Vibe Budget
              </h1>
              <p className="text-xs text-gray-500">Bun venit, {user.name}!</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Titlu secțiune */}
        <div className="mb-6 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-gray-800">Rezumat financiar</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)} {now.getFullYear()}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          {/* Sold total */}
          <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Sold total</span>
              <span className="text-2xl">💳</span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: totalBalance >= 0 ? "#0D9488" : "#DC2626" }}
            >
              {formatAmount(totalBalance, user.nativeCurrency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Toate tranzacțiile</p>
          </div>

          {/* Venituri luna asta */}
          <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Venituri</span>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#059669" }}>
              +{formatAmount(monthIncome, user.nativeCurrency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{currentMonthName}</p>
          </div>

          {/* Cheltuieli luna asta */}
          <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Cheltuieli</span>
              <span className="text-2xl">📉</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#F97316" }}>
              -{formatAmount(monthExpenses, user.nativeCurrency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{currentMonthName}</p>
          </div>
        </div>

        {/* Navigare rapidă — întotdeauna vizibilă */}
        <div className="mb-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Tranzacții</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link
              href="/dashboard/transactions"
              className="glass-card rounded-2xl p-4 text-center hover:no-underline hover:scale-105 transition-transform duration-200"
            >
              <span className="text-2xl block mb-1">📋</span>
              <span className="text-sm font-medium text-gray-700">Tranzacții</span>
            </Link>
            <Link
              href="/dashboard/upload"
              className="glass-card rounded-2xl p-4 text-center hover:no-underline hover:scale-105 transition-transform duration-200"
            >
              <span className="text-2xl block mb-1">📁</span>
              <span className="text-sm font-medium text-gray-700">Import CSV sau Excel</span>
            </Link>
          </div>

          <h2 className="text-lg font-semibold text-gray-700 mb-3">Analize</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Link
              href="/dashboard/reports"
              className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:no-underline hover:scale-[1.01] transition-transform duration-200"
            >
              <span className="text-3xl">📊</span>
              <div>
                <p className="font-semibold text-gray-800">Rapoarte</p>
                <p className="text-sm text-gray-500">Grafice cheltuieli și venituri</p>
              </div>
            </Link>
            <Link
              href="/dashboard/keywords"
              className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:no-underline hover:scale-[1.01] transition-transform duration-200"
            >
              <span className="text-3xl">🔑</span>
              <div>
                <p className="font-semibold text-gray-800">Reguli categorii</p>
                <p className="text-sm text-gray-500">Auto-categorizare la import</p>
              </div>
            </Link>
          </div>

          <h2 className="text-lg font-semibold text-gray-700 mb-3">Gestionare</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/dashboard/banks"
              className="glass-card rounded-2xl p-4 text-center hover:no-underline hover:scale-105 transition-transform duration-200"
            >
              <span className="text-2xl block mb-1">🏦</span>
              <span className="text-sm font-medium text-gray-700">Bănci</span>
            </Link>
            <Link
              href="/dashboard/categories"
              className="glass-card rounded-2xl p-4 text-center hover:no-underline hover:scale-105 transition-transform duration-200"
            >
              <span className="text-2xl block mb-1">🏷️</span>
              <span className="text-sm font-medium text-gray-700">Categorii</span>
            </Link>
            <Link
              href="/dashboard/currencies"
              className="glass-card rounded-2xl p-4 text-center hover:no-underline hover:scale-105 transition-transform duration-200"
            >
              <span className="text-2xl block mb-1">💱</span>
              <span className="text-sm font-medium text-gray-700">Valute</span>
            </Link>
          </div>
        </div>

        {/* Empty state / CTA */}
        {!hasTransactions && (
          <div className="glass-card rounded-2xl p-10 text-center animate-fade-in-up">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Nu ai tranzacții încă
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Importă extrasul bancar sau adaugă manual prima tranzacție pentru
              a-ți monitoriza bugetul.
            </p>
            <Link
              href="/dashboard/transactions"
              className="btn-primary inline-block px-6 py-2.5 rounded-xl font-semibold text-sm"
            >
              Adaugă prima tranzacție
            </Link>
          </div>
        )}

      </main>
    </div>
  );
}
