import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Verifică că keyword-ul aparține userului curent
    const { data: existing } = await admin
      .from("user_keywords")
      .select("id")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Keyword negăsit" }, { status: 404 });
    }

    const { error } = await admin
      .from("user_keywords")
      .delete()
      .eq("id", id)
      .eq("user_id", authUser.id);

    if (error) {
      console.error("[KEYWORDS] Delete error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ message: "Keyword șters" });
  } catch (error) {
    console.error("[KEYWORDS] DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
