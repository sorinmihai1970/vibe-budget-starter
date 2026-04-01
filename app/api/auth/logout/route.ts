import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Logout Supabase
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[LOGOUT] Supabase signOut error:", error);
      return NextResponse.json({ error: "Eroare la delogare" }, { status: 500 });
    }

    // 2. Raspuns
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[LOGOUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
