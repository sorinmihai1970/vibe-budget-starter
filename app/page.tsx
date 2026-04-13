/**
 * 🏠 HOME PAGE - VIBE BUDGET STARTER
 *
 * Aceasta este pagina de start a aplicației Vibe Budget.
 * În timpul cursului vom construi împreună:
 * - Sistem de autentificare (login/register)
 * - Dashboard cu rezumat financiar
 * - Management bănci, categorii, valute
 * - Lista tranzacții + upload CSV/Excel
 * - Rapoarte și grafice
 * - AI insights (health score, recomandări)
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Dacă utilizatorul e logat, îl trimitem direct la dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            💰 Vibe Budget
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Aplicație de gestiune financiară personală
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
            <Link
              href="/register"
              className="px-6 py-3 rounded-full font-semibold text-white"
              style={{ background: "#14B8A6" }}
            >
              Înregistrează-te
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-full font-semibold text-white"
              style={{ background: "#F97316" }}
            >
              Login
            </Link>
          </div>


        </div>
      </div>
    </div>
  );
}
