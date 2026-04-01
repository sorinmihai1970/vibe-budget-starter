import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validare
    const body: RegisterBody = await request.json();
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalid" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 6 caractere" },
        { status: 400 }
      );
    }

    // 2. Creare user Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (authError) {
      console.error("[REGISTER] Supabase auth error:", authError);
      if (authError.message.toLowerCase().includes("already registered")) {
        return NextResponse.json(
          { error: "Există deja un cont cu acest email" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Eroare la crearea contului" },
        { status: 500 }
      );
    }

    // 3. Insert in public.users via admin client (bypass RLS)
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("users").insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      native_currency: "RON",
    });

    if (insertError) {
      console.error("[REGISTER] Insert error:", insertError);
      throw new Error(insertError.message);
    }

    // 4. Raspuns
    const emailConfirmationRequired = !authData.session;
    return NextResponse.json({
      data: { emailConfirmationRequired },
    });
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "Există deja un cont cu acest email" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
