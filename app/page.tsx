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

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50  ">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900  mb-6">
            💰 Vibe Budget
          </h1>
          <p className="text-xl text-gray-600  mb-8">
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

          <div className="bg-white/80  backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <div className="p-4 bg-teal-50  rounded-lg">
              <p className="text-sm text-gray-700 ">
                <strong>📚 Starter Kit Include:</strong> Next.js setup complet, Drizzle ORM schema,
                Supabase config, Tailwind styling, și structura folderelor pregătită.
              </p>
            </div>
          </div>

          <p className="mt-8 text-gray-500 ">
            Începe cu <span className="font-mono bg-gray-100  px-2 py-1 rounded">npm install</span> apoi
            <span className="font-mono bg-gray-100  px-2 py-1 rounded ml-2">npm run dev</span>
          </p>
        </div>
      </div>
    </div>
  );
}
