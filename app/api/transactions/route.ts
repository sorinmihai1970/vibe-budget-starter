import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";

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
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
