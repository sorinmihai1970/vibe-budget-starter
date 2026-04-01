"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Parolele nu se potrivesc");
      return;
    }
    if (form.password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Eroare la înregistrare");
        return;
      }

      if (result.data.emailConfirmationRequired) {
        setEmailSent(true);
        toast.success("Verifică email-ul pentru a confirma contul!");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        toast.error("Cont creat, dar login automat a eșuat. Încearcă manual.");
        router.push("/login");
        return;
      }

      toast.success("Cont creat cu succes! Bun venit!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Register error:", err);
      setError("A apărut o eroare. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 40%, #F97316 100%)",
        }}
      >
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center animate-fade-in-up">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifică email-ul</h2>
          <p className="text-gray-500 text-sm mb-6">
            Am trimis un link de confirmare la{" "}
            <strong className="text-gray-700">{form.email}</strong>.
            Accesează link-ul din email pentru a activa contul.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-block px-6 py-2.5 rounded-xl font-semibold text-sm"
          >
            Mergi la Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 40%, #F97316 100%)",
      }}
    >
      {/* Card glassmorphism */}
      <div className="glass-card rounded-2xl p-8 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-7">
          <span className="text-4xl">💰</span>
          <h1 className="text-3xl font-bold mt-2" style={{ color: "#0D9488" }}>
            Vibe Budget
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Creează un cont gratuit</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume complet
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ion Popescu"
              required
              className="input-field"
            />
          </div>

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
              placeholder="Minim 6 caractere"
              required
              className="input-field"
            />
          </div>

          {/* Confirmare parolă */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmă parola
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repetă parola"
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
            {loading ? "Se creează contul..." : "Creează cont gratuit"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">sau</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Link login */}
        <p className="text-center text-sm text-gray-500">
          Ai deja un cont?{" "}
          <Link
            href="/login"
            className="font-semibold"
            style={{ color: "#F97316" }}
          >
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  );
}
