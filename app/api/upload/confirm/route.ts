import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";

interface ImportTransaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
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

    const rows = transactions.map((t) => ({
      id: createId(),
      user_id: authUser.id,
      date: t.date,
      description: t.description.trim(),
      amount: Number(t.amount),
      currency: t.currency || "RON",
      bank_id: bank_id || t.bank_id || null,
      category_id: t.category_id || null,
    }));

    const admin = createAdminClient();
    const { error } = await admin.from("transactions").insert(rows);

    if (error) {
      console.error("[UPLOAD CONFIRM] Insert error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ imported: rows.length }, { status: 201 });
  } catch (error) {
    console.error("[UPLOAD CONFIRM] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
