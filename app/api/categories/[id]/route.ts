import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Autentificare
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 2. Validare
    const body = await request.json();
    const { name, color, icon, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Numele categoriei este obligatoriu" }, { status: 400 });
    }

    const categoryColor =
      color && typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)
        ? color
        : "#6366f1";

    const categoryIcon =
      icon && typeof icon === "string" && icon.trim().length > 0
        ? icon.trim()
        : "📁";

    // 3. Verificare ownership
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("categories")
      .select("id, is_system_category")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Categoria nu a fost găsită" }, { status: 404 });
    }

    // 4. Update (type nu se poate schimba după creare)
    const { data: category, error } = await admin
      .from("categories")
      .update({
        name: name.trim(),
        color: categoryColor,
        icon: categoryIcon,
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", authUser.id)
      .select()
      .single();

    if (error) {
      console.error("[CATEGORIES] Update error:", error);
      throw new Error(error.message);
    }

    // 5. Răspuns
    return NextResponse.json({ data: category });
  } catch (error) {
    console.error("[CATEGORIES] PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Autentificare
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 2. Verificare ownership + nu permite ștergerea categoriilor de sistem
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("categories")
      .select("id, is_system_category")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Categoria nu a fost găsită" }, { status: 404 });
    }

    if (existing.is_system_category) {
      return NextResponse.json(
        { error: "Categoriile de sistem nu pot fi șterse" },
        { status: 403 }
      );
    }

    // 3. Delete
    const { error } = await admin
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", authUser.id);

    if (error) {
      console.error("[CATEGORIES] Delete error:", error);
      throw new Error(error.message);
    }

    // 4. Răspuns
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[CATEGORIES] DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
