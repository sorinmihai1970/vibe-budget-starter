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
    const { data: keywords, error } = await admin
      .from("user_keywords")
      .select("*, categories(name, icon, color, type)")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[KEYWORDS] Fetch error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: keywords });
  } catch (error) {
    console.error("[KEYWORDS] GET Error:", error);
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
    const { keyword, category_id } = body;

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return NextResponse.json({ error: "Keyword-ul este obligatoriu" }, { status: 400 });
    }
    if (!category_id || typeof category_id !== "string") {
      return NextResponse.json({ error: "Categoria este obligatorie" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verifică dacă keyword-ul există deja pentru acest user
    const { data: existing } = await admin
      .from("user_keywords")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("keyword", keyword.trim().toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Acest keyword există deja" },
        { status: 409 }
      );
    }

    const { data: newKeyword, error } = await admin
      .from("user_keywords")
      .insert({
        id: createId(),
        user_id: authUser.id,
        keyword: keyword.trim().toLowerCase(),
        category_id,
      })
      .select("*, categories(name, icon, color, type)")
      .single();

    if (error) {
      console.error("[KEYWORDS] Insert error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: newKeyword }, { status: 201 });
  } catch (error) {
    console.error("[KEYWORDS] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
