import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const MONTH_ABBR = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getDateRange(period: string): { startDate: string | null; endDate: string | null } {
  if (period === "all") return { startDate: null, endDate: null };

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthsBack = period === "current_month" ? 0 : period === "last_3_months" ? 3 : 6;
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-01`,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. Autentificare
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parametru perioadă
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "current_month") as PeriodFilter;
    const { startDate, endDate } = getDateRange(period);

    const admin = createAdminClient();

    // 3. Cele 3 query-uri în paralel
    const [expensesResult, allTxResult, userResult] = await Promise.all([
      // Q1 — cheltuieli cu categorie (pentru Pie Chart)
      (() => {
        let q = admin
          .from("transactions")
          .select("amount, category_id, categories(name, color, icon)")
          .eq("user_id", authUser.id)
          .lt("amount", "0");
        if (startDate) q = q.gte("date", startDate);
        if (endDate) q = q.lt("date", endDate);
        return q;
      })(),

      // Q2 — toate tranzacțiile pentru luni (Bar Chart)
      (() => {
        let q = admin
          .from("transactions")
          .select("amount, date")
          .eq("user_id", authUser.id)
          .order("date", { ascending: true });
        if (startDate) q = q.gte("date", startDate);
        if (endDate) q = q.lt("date", endDate);
        return q;
      })(),

      // Q3 — valuta nativă user
      admin
        .from("users")
        .select("native_currency")
        .eq("id", authUser.id)
        .single(),
    ]);

    if (expensesResult.error) throw new Error(expensesResult.error.message);
    if (allTxResult.error) throw new Error(allTxResult.error.message);

    const currency = (userResult.data as { native_currency: string } | null)?.native_currency || "RON";

    // 4. Procesare Pie Chart — grupare cheltuieli pe categorii
    type ExpenseRow = {
      amount: string | number;
      category_id: string | null;
      categories: { name: string; color: string; icon: string } | null;
    };

    const expenseMap = new Map<
      string,
      { name: string; color: string; icon: string; total: number }
    >();

    for (const row of (expensesResult.data as ExpenseRow[])) {
      const key = row.category_id ?? "__null__";
      const amt = Math.abs(Number(row.amount));
      if (expenseMap.has(key)) {
        expenseMap.get(key)!.total += amt;
      } else {
        expenseMap.set(key, {
          name: row.categories?.name ?? "Necategorizat",
          color: row.categories?.color ?? "#94A3B8",
          icon: row.categories?.icon ?? "📁",
          total: amt,
        });
      }
    }

    const totalExpenses = Array.from(expenseMap.values()).reduce((s, v) => s + v.total, 0);

    const categoryExpenses: CategoryExpense[] = Array.from(expenseMap.entries())
      .map(([key, v]) => ({
        category_id: key === "__null__" ? null : key,
        category_name: v.name,
        category_color: v.color,
        category_icon: v.icon,
        total: Math.round(v.total * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((v.total / totalExpenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 5. Procesare Bar Chart — grupare pe luni
    type TxRow = { amount: string | number; date: string };

    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (const row of (allTxResult.data as TxRow[])) {
      const monthKey = row.date.slice(0, 7); // "2026-03"
      const amt = Number(row.amount);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { income: 0, expenses: 0 });
      }
      const entry = monthMap.get(monthKey)!;
      if (amt > 0) {
        entry.income += amt;
      } else {
        entry.expenses += Math.abs(amt);
      }
    }

    const monthlyBars: MonthlyBar[] = Array.from(monthMap.entries())
      .map(([key, v]) => {
        const monthIndex = parseInt(key.split("-")[1]) - 1;
        return {
          month_key: key,
          month: MONTH_ABBR[monthIndex],
          income: Math.round(v.income * 100) / 100,
          expenses: Math.round(v.expenses * 100) / 100,
        };
      })
      .sort((a, b) => a.month_key.localeCompare(b.month_key));

    const totalIncome = monthlyBars.reduce((s, v) => s + v.income, 0);

    // 6. Răspuns
    const data: ReportsData = {
      categoryExpenses,
      monthlyBars,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      currency,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[REPORTS] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
