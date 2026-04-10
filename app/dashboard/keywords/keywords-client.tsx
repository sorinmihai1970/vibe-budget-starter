"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface Keyword {
  id: string;
  keyword: string;
  category_id: string;
  created_at: string;
  categories: {
    name: string;
    icon: string;
    color: string;
    type: string;
  } | null;
}

interface Props {
  initialKeywords: Keyword[];
  categories: Category[];
}

export default function KeywordsClient({ initialKeywords, categories }: Props) {
  const [keywords, setKeywords] = useState<Keyword[]>(initialKeywords);
  const [formKeyword, setFormKeyword] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const filteredKeywords = keywords.filter((kw) => {
    if (filter === "all") return true;
    return kw.categories?.type === filter;
  });

  const handleAdd = async () => {
    if (!formKeyword.trim()) {
      toast.error("Introdu un keyword");
      return;
    }
    if (!formCategoryId) {
      toast.error("Selectează o categorie");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: formKeyword.trim(),
          category_id: formCategoryId,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Eroare la adăugare");
        return;
      }

      setKeywords((prev) => [json.data as Keyword, ...prev]);
      setFormKeyword("");
      setFormCategoryId("");
      toast.success("Keyword adăugat");
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStart = (kw: Keyword) => {
    setEditingId(kw.id);
    setEditKeyword(kw.keyword);
    setEditCategoryId(kw.category_id);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditKeyword("");
    setEditCategoryId("");
  };

  const handleEditSave = async (kw: Keyword) => {
    if (!editKeyword.trim()) { toast.error("Introdu un keyword"); return; }
    if (!editCategoryId) { toast.error("Selectează o categorie"); return; }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/keywords/${kw.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: editKeyword.trim(), category_id: editCategoryId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Eroare la salvare"); return; }

      setKeywords((prev) => prev.map((k) => k.id === kw.id ? json.data as Keyword : k));
      setEditingId(null);
      toast.success("Keyword actualizat");
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (kw: Keyword) => {
    if (!window.confirm(`Ștergi keyword-ul "${kw.keyword}"?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/keywords/${kw.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Eroare la ștergere");
        return;
      }

      setKeywords((prev) => prev.filter((k) => k.id !== kw.id));
      toast.success("Keyword șters");
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Titlu + descriere */}
      <div className="mb-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-gray-800">Reguli auto-categorizare</h2>
        <p className="text-sm text-gray-500 mt-1">
          Când descrierea unei tranzacții conține keyword-ul, se atribuie automat categoria asociată.
        </p>
      </div>

      {/* Formular adăugare */}
      <div className="glass-card rounded-2xl p-6 mb-6 animate-fade-in-up">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Adaugă regulă nouă</h3>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={formKeyword}
            onChange={(e) => setFormKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder='ex: "lidl", "netflix", "salariu"...'
            className="input-field w-full"
          />
          <div className="flex gap-3">
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Selectează categoria...</option>
              {expenseCategories.length > 0 && (
                <optgroup label="Cheltuieli">
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {incomeCategories.length > 0 && (
                <optgroup label="Venituri">
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              onClick={handleAdd}
              disabled={isLoading}
              className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap disabled:opacity-50"
            >
              + Adaugă
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Keyword-ul se compară cu descrierea tranzacției (case-insensitive, potrivire parțială).
        </p>
      </div>

      {/* Filtre tip */}
      <div className="flex gap-2 mb-4 animate-fade-in-up">
        {(["all", "expense", "income"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "btn-primary px-4 py-1.5 rounded-lg text-sm font-semibold"
                : "px-4 py-1.5 rounded-lg border border-gray-200 bg-white/70 hover:bg-white text-gray-600 text-sm font-medium transition-all duration-200"
            }
          >
            {f === "all" ? "Toate" : f === "expense" ? "Cheltuieli" : "Venituri"}
            <span className="ml-1.5 text-xs opacity-70">
              ({f === "all" ? keywords.length : keywords.filter((k) => k.categories?.type === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Lista keywords */}
      {filteredKeywords.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center animate-fade-in-up">
          <div className="text-5xl mb-3">🔑</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {keywords.length === 0 ? "Nu ai reguli definite" : "Nicio regulă în această categorie"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Adaugă keywords pentru ca tranzacțiile viitoare să fie categorizate automat la import.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Keyword</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Categorie</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500 hidden sm:table-cell">Tip</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-500">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeywords.map((kw) =>
                editingId === kw.id ? (
                  // Rând în modul editare
                  <tr key={kw.id} className="border-b border-white/20 last:border-0 bg-teal-50/30">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editKeyword}
                        onChange={(e) => setEditKeyword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(kw); if (e.key === "Escape") handleEditCancel(); }}
                        className="input-field w-full text-sm font-mono"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-3" colSpan={2}>
                      <select
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        className="input-field w-full text-sm"
                      >
                        <option value="">Selectează categoria...</option>
                        {expenseCategories.length > 0 && (
                          <optgroup label="Cheltuieli">
                            {expenseCategories.map((c) => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {incomeCategories.length > 0 && (
                          <optgroup label="Venituri">
                            {incomeCategories.map((c) => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditSave(kw)}
                          disabled={isLoading}
                          className="text-sm font-medium px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-700 transition-all duration-200 disabled:opacity-50"
                        >
                          Salvează
                        </button>
                        <button
                          onClick={handleEditCancel}
                          disabled={isLoading}
                          className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white/70 hover:bg-white text-gray-600 transition-all duration-200 disabled:opacity-50"
                        >
                          Anulează
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Rând normal
                  <tr
                    key={kw.id}
                    className="border-b border-white/20 last:border-0 hover:bg-white/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded-lg text-gray-700">
                        {kw.keyword}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: kw.categories?.color ?? "#94A3B8" }}
                        />
                        <span className="text-sm text-gray-700">
                          {kw.categories?.icon} {kw.categories?.name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          background: kw.categories?.type === "income"
                            ? "rgba(5,150,105,0.1)"
                            : "rgba(249,115,22,0.1)",
                          color: kw.categories?.type === "income" ? "#059669" : "#F97316",
                        }}
                      >
                        {kw.categories?.type === "income" ? "Venit" : "Cheltuială"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditStart(kw)}
                          disabled={isLoading}
                          className="text-sm font-medium px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-50 text-teal-700 transition-all duration-200 disabled:opacity-50"
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => handleDelete(kw)}
                          disabled={isLoading}
                          className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200 disabled:opacity-50"
                        >
                          Șterge
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Info reguli implicite */}
      <div className="mt-6 p-4 rounded-2xl border border-teal-100 animate-fade-in-up"
        style={{ background: "rgba(20,184,166,0.05)" }}>
        <p className="text-sm font-semibold text-teal-700 mb-1">ℹ️ Reguli implicite active</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Pe lângă regulile tale, aplicația recunoaște automat comercianți comuni:
          supermarketuri (Lidl, Kaufland, Penny...), utilități (Electrica, Engie...),
          transport (Uber, Bolt...), restaurante, abonamente (Netflix, Orange...) și altele.
          Regulile tale au prioritate față de cele implicite.
        </p>
      </div>
    </>
  );
}
