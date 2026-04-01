"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });

      if (signInError) {
        if (
          signInError.message === "Invalid login credentials" ||
          signInError.message.includes("Invalid")
        ) {
          setError("Email sau parolă incorecte");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Confirmă email-ul înainte de a te autentifica");
        } else {
          setError(signInError.message);
        }
        return;
      }

      toast.success("Autentificare reușită!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("A apărut o eroare. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 40%, #F97316 100%)",
      }}
    >
      {/* Card glassmorphism */}
      <div className="glass-card rounded-2xl p-8 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0D9488" }}>
            Vibe Budget
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Autentifică-te în contul tău</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ion@exemplu.ro"
              required
              className="input-field"
            />
          </div>

          {/* Parolă */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parolă
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Parola ta"
              required
              className="input-field"
            />
          </div>

          {/* Eroare */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Se autentifică..." : "Autentifică-te"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">sau</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Link register */}
        <p className="text-center text-sm text-gray-500">
          Nu ai cont?{" "}
          <Link
            href="/register"
            className="font-semibold"
            style={{ color: "#F97316" }}
          >
            Înregistrează-te gratuit
          </Link>
        </p>
      </div>
    </div>
  );
}
