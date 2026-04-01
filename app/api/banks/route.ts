import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";

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

    // 2. Fetch bănci
    const admin = createAdminClient();
    const { data: banks, error } = await admin
      .from("banks")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[BANKS] Fetch error:", error);
      throw new Error(error.message);
    }

    // 3. Răspuns
    return NextResponse.json({ data: banks });
  } catch (error) {
    console.error("[BANKS] GET Error:", error);
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

    // 2. Validare
    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Numele băncii este obligatoriu" }, { status: 400 });
    }

    const bankColor = color && typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)
      ? color
      : "#6366f1";

    // 3. Insert bancă nouă
    const admin = createAdminClient();
    const { data: bank, error } = await admin
      .from("banks")
      .insert({
        id: createId(),
        user_id: authUser.id,
        name: name.trim(),
        color: bankColor,
      })
      .select()
      .single();

    if (error) {
      console.error("[BANKS] Insert error:", error);
      throw new Error(error.message);
    }

    // 4. Răspuns
    return NextResponse.json({ data: bank }, { status: 201 });
  } catch (error) {
    console.error("[BANKS] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
