import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BanksClient from "./banks-client";

export default async function BanksPage() {
  // 1. Verificare autentificare
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // 2. Fetch bănci inițiale
  const admin = createAdminClient();
  const { data: banksData } = await admin
    .from("banks")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });
  const banks = banksData ?? [];

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #F0FDFA 0%, #E0F2FE 50%, #FFF7ED 100%)" }}
    >
      {/* Header glassmorphism */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏦</span>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#0D9488" }}>
                Vibe Budget
              </h1>
              <p className="text-xs text-gray-500">Gestionare bănci</p>
            </div>
          </div>
          <a
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-white/70 hover:bg-white transition-all duration-200"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <BanksClient initialBanks={banks} />
      </main>
    </div>
  );
}
