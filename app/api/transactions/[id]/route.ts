import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
    const { data: existing } = await admin
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Tranzacția nu a fost găsită" }, { status: 404 });
    }

    const { data: transaction, error } = await admin
      .from("transactions")
      .update({
        date: date.trim(),
        description: description.trim(),
        amount: Number(amount),
        currency: currency?.trim() || "RON",
        bank_id: bank_id || null,
        category_id: category_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", authUser.id)
      .select("*, banks(name, color), categories(name, icon, type)")
      .single();

    if (error) {
      console.error("[TRANSACTIONS] Update error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: transaction });
  } catch (error) {
    console.error("[TRANSACTIONS] PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Tranzacția nu a fost găsită" }, { status: 404 });
    }

    const { error } = await admin
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", authUser.id);

    if (error) {
      console.error("[TRANSACTIONS] Delete error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[TRANSACTIONS] DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
