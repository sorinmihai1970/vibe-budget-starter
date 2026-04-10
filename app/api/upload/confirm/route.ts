import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";
import { autoCategorize } from "@/lib/auto-categorization";
import { UserKeyword, IncomeCategory, UserCategory } from "@/lib/auto-categorization/types";

interface ImportTransaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
  type?: "debit" | "credit";
  bank_id?: string | null;
  category_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { transactions, bank_id } = body as {
      transactions: ImportTransaction[];
      bank_id?: string | null;
    };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Nu există tranzacții de importat" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Pre-fetch keywords și categorii pentru auto-categorizare
    const [{ data: userKeywords }, { data: allCategories }] = await Promise.all([
      admin.from("user_keywords").select("id, keyword, category_id").eq("user_id", authUser.id),
      admin.from("categories").select("id, name, type, is_system_category").eq("user_id", authUser.id),
    ]);

    const keywords: UserKeyword[] = userKeywords || [];
    const allCats: UserCategory[] = allCategories || [];
    const incomeCats: IncomeCategory[] = allCats.filter(
      (c) => c.type === "income" && c.is_system_category === true
    );

    let categorizedCount = 0;

    const rows = transactions.map((t) => {
      // Dacă tranzacția are deja o categorie (setată manual în preview), o păstrăm
      // Altfel aplicăm auto-categorizarea
      const categoryId = t.category_id || autoCategorize(
        t.description,
        t.type ?? (Number(t.amount) >= 0 ? "credit" : "debit"),
        keywords,
        incomeCats,
        allCats
      );

      if (categoryId) categorizedCount++;

      return {
        id: createId(),
        user_id: authUser.id,
        date: t.date,
        description: t.description.trim(),
        amount: Number(t.amount),
        currency: t.currency || "RON",
        bank_id: bank_id || t.bank_id || null,
        category_id: categoryId || null,
      };
    });

    const { error } = await admin.from("transactions").insert(rows);

    if (error) {
      console.error("[UPLOAD CONFIRM] Insert error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ imported: rows.length, categorized: categorizedCount }, { status: 201 });
  } catch (error) {
    console.error("[UPLOAD CONFIRM] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
