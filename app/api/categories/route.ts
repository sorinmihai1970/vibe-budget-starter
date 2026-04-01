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

    // 2. Fetch categorii (ale userului + categorii de sistem)
    const admin = createAdminClient();
    const { data: categories, error } = await admin
      .from("categories")
      .select("*")
      .eq("user_id", authUser.id)
      .order("is_system_category", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("[CATEGORIES] Fetch error:", error);
      throw new Error(error.message);
    }

    // 3. Răspuns
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("[CATEGORIES] GET Error:", error);
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
    const { name, type, color, icon, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Numele categoriei este obligatoriu" }, { status: 400 });
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json({ error: "Tipul trebuie să fie income sau expense" }, { status: 400 });
    }

    const categoryColor =
      color && typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)
        ? color
        : "#6366f1";

    const categoryIcon =
      icon && typeof icon === "string" && icon.trim().length > 0
        ? icon.trim()
        : "📁";

    // 3. Insert categorie nouă
    const admin = createAdminClient();
    const { data: category, error } = await admin
      .from("categories")
      .insert({
        id: createId(),
        user_id: authUser.id,
        name: name.trim(),
        type,
        color: categoryColor,
        icon: categoryIcon,
        description: description?.trim() || null,
        is_system_category: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[CATEGORIES] Insert error:", error);
      throw new Error(error.message);
    }

    // 4. Răspuns
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("[CATEGORIES] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
