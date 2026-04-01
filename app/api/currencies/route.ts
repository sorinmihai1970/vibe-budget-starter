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

    // 2. Fetch valute
    const admin = createAdminClient();
    const { data: currencies, error } = await admin
      .from("currencies")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[CURRENCIES] Fetch error:", error);
      throw new Error(error.message);
    }

    // 3. Răspuns
    return NextResponse.json({ data: currencies });
  } catch (error) {
    console.error("[CURRENCIES] GET Error:", error);
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
    const { code, name, symbol } = body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "Codul valutei este obligatoriu" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Numele valutei este obligatoriu" }, { status: 400 });
    }
    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return NextResponse.json({ error: "Simbolul valutei este obligatoriu" }, { status: 400 });
    }

    // 3. Verificare duplicat
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("currencies")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("code", code.trim().toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: "Valuta există deja" }, { status: 409 });
    }

    // 4. Insert valută nouă
    const { data: currency, error } = await admin
      .from("currencies")
      .insert({
        id: createId(),
        user_id: authUser.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        symbol: symbol.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("[CURRENCIES] Insert error:", error);
      throw new Error(error.message);
    }

    // 5. Răspuns
    return NextResponse.json({ data: currency }, { status: 201 });
  } catch (error) {
    console.error("[CURRENCIES] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
