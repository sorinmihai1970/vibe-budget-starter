import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
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

    // 2. Verificare ownership
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("currencies")
      .select("id")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Valuta nu a fost găsită" }, { status: 404 });
    }

    // 3. Delete
    const { error } = await admin
      .from("currencies")
      .delete()
      .eq("id", id)
      .eq("user_id", authUser.id);

    if (error) {
      console.error("[CURRENCIES] Delete error:", error);
      throw new Error(error.message);
    }

    // 4. Răspuns
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[CURRENCIES] DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
