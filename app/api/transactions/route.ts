import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";
import { autoCategorize } from "@/lib/auto-categorization";
import { UserKeyword, IncomeCategory, UserCategory } from "@/lib/auto-categorization/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: transactions, error } = await admin
      .from("transactions")
      .select("*, banks(name, color), categories(name, icon, type)")
      .eq("user_id", authUser.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[TRANSACTIONS] Fetch error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error("[TRANSACTIONS] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Autentificare
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 2. BULK MODE — detectat prin prezența array-ului "transactions" în body
    if (Array.isArray(body.transactions)) {
      const { transactions, bank_id } = body as {
        transactions: {
          date: string;
          description: string;
          amount: number;
          currency?: string;
          type?: "debit" | "credit";
          bankId?: string;
        }[];
        bank_id?: string | null;
      };

      if (transactions.length === 0) {
        return NextResponse.json(
          { error: "Nu există tranzacții de importat" },
          { status: 400 }
        );
      }

      const admin = createAdminClient();

      // 3. Pre-fetch keywords utilizator (un singur query pentru toate tranzacțiile)
      const { data: userKeywords } = await admin
        .from("user_keywords")
        .select("id, keyword, category_id")
        .eq("user_id", authUser.id);

      // 4. Pre-fetch toate categoriile userului (pentru reguli implicite + fallback credit)
      const { data: allCategories } = await admin
        .from("categories")
        .select("id, name, type, is_system_category")
        .eq("user_id", authUser.id);

      const keywords: UserKeyword[] = userKeywords || [];
      const allCats: UserCategory[] = allCategories || [];
      const incomeCats: IncomeCategory[] = allCats.filter(
        (c) => c.type === "income" && c.is_system_category === true
      );

      // 5. Construim rândurile pentru insert cu auto-categorizare
      let categorizedCount = 0;

      const rows = transactions.map((t) => {
        const categoryId = autoCategorize(
          t.description,
          t.type,
          keywords,
          incomeCats,
          allCats
        );

        if (categoryId !== null) {
          categorizedCount++;
        }

        return {
          id: createId(),
          user_id: authUser.id,
          date: t.date,
          description: t.description.trim(),
          amount: Number(t.amount),
          currency: t.currency || "RON",
          bank_id: bank_id || t.bankId || null,
          category_id: categoryId,
        };
      });

      // 6. Bulk insert
      const { error } = await admin.from("transactions").insert(rows);

      if (error) {
        console.error("[TRANSACTIONS] Bulk insert error:", error);
        throw new Error(error.message);
      }

      return NextResponse.json(
        {
          message: "Import reușit",
          total: rows.length,
          categorized: categorizedCount,
        },
        { status: 201 }
      );
    }

    // SINGLE MODE — comportament original nemodificat
    const { date, description, amount, currency, bank_id, category_id } = body;

    if (!date || typeof date !== "string" || date.trim().length === 0) {
      return NextResponse.json({ error: "Data este obligatorie" }, { status: 400 });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json({ error: "Descrierea este obligatorie" }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Suma este obligatorie" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: transaction, error } = await admin
      .from("transactions")
      .insert({
        id: createId(),
        user_id: authUser.id,
        date: date.trim(),
        description: description.trim(),
        amount: Number(amount),
        currency: currency?.trim() || "RON",
        bank_id: bank_id || null,
        category_id: category_id || null,
      })
      .select("*, banks(name, color), categories(name, icon, type)")
      .single();

    if (error) {
      console.error("[TRANSACTIONS] Insert error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error("[TRANSACTIONS] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
