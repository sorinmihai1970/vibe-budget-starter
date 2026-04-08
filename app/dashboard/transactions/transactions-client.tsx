"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Bank {
  id: string;
  name: string;
  color: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface Transaction {
  id: string;
  user_id: string;
  bank_id: string | null;
  category_id: string | null;
  date: string;
  description: string;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  banks: { name: string; color: string } | null;
  categories: { name: string; icon: string; type: string } | null;
}

interface FormState {
  date: string;
  description: string;
  amount: string;
  currency: string;
  bank_id: string;
  category_id: string;
}

interface Props {
  initialTransactions: Transaction[];
  banks: Bank[];
  categories: Category[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function formatAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount >= 0 ? "+" : "-"}${formatted} ${currency}`;
}

const emptyForm: FormState = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  amount: "",
  currency: "RON",
  bank_id: "",
  category_id: "",
};

export default function TransactionsClient({ initialTransactions, banks, categories }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);

  // Selecție
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filtre
  const [search, setSearch] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Bănci unice din tranzacțiile existente (pentru filtru)
  const banksForFilter = [...new Map(
    transactions
      .filter((t) => t.bank_id && t.banks)
      .map((t) => [t.bank_id, { id: t.bank_id!, name: t.banks!.name, color: t.banks!.color }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  // Filtrare client-side
  const filtered = transactions.filter((t) => {
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterBank && t.bank_id !== filterBank) return false;
    if (filterCategory && t.category_id !== filterCategory) return false;
    if (filterDateFrom && t.date < filterDateFrom) return false;
    if (filterDateTo && t.date > filterDateTo) return false;
    return true;
  });

  const hasFilters = search || filterBank || filterCategory || filterDateFrom || filterDateTo;

  const resetFilters = () => {
    setSearch("");
    setFilterBank("");
    setFilterCategory("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  // Selecție
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (!window.confirm(`Ștergi ${count} tranzacție${count !== 1 ? "ții" : ""}? Acțiunea este ireversibilă.`)) return;

    setIsLoading(true);
    try {
      const results = await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/transactions/${id}`, { method: "DELETE" })
        )
      );

      const failed = results.filter((r) => !r.ok).length;
      const deleted = count - failed;

      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());

      if (failed > 0) {
        toast.error(`${deleted} șterse, ${failed} erori`);
      } else {
        toast.success(`${deleted} tranzacție${deleted !== 1 ? "ții" : ""} ștearsă${deleted !== 1 ? "" : ""}`);
      }
    } catch {
      toast.error("Eroare de rețea");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setForm({
      date: t.date,
      description: t.description,
      amount: String(t.amount),
      currency: t.currency,
      bank_id: t.bank_id ?? "",
      category_id: t.category_id ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.date || !form.description.trim() || !form.amount) {
      toast.error("Completează câmpurile obligatorii");
      return;
    }
    if (isNaN(Number(form.amount))) {
      toast.error("Suma trebuie să fie un număr");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        date: form.date,
        description: form.description.trim(),
        amount: Number(form.amount),
        currency: form.currency || "RON",
        bank_id: form.bank_id || null,
        category_id: form.category_id || null,
      };

      const isEdit = !!editingTransaction;
      const url = isEdit ? `/api/transactions/${editingTransaction!.id}` : "/api/transactions";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Eroare la salvare");
        return;
      }

      if (isEdit) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingTransaction!.id ? json.data : t))
        );
        toast.success("Tranzacție actualizată");
      } else {
        setTransactions((prev) => [json.data, ...prev]);
        toast.success("Tranzacție adăugată");
      }

      closeModal();
    } catch {
      toast.error("Eroare de rețea");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (!window.confirm(`Ștergi tranzacția "${t.description}"?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Eroare la ștergere");
        return;
      }

      setTransactions((prev) => prev.filter((tx) => tx.id !== t.id));
      toast.success("Tranzacție ștearsă");
    } catch {
      toast.error("Eroare de rețea");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bara de filtre */}
      <div className="glass-card rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Căutare */}
          <input
            type="text"
            placeholder="🔍 Caută după descriere..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          {/* Filtru bancă */}
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">Toate băncile</option>
            {banksForFilter.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Filtru categorie */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">Toate categoriile</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 px-1">De la</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 px-1">Până la</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Reset filtre */}
          {hasFilters && (
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-all"
              >
                ✕ Resetează filtre
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabel */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header tabel */}
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Tranzacții{" "}
            <span className="text-sm font-normal text-gray-500">
              ({filtered.length}{hasFilters ? ` din ${transactions.length}` : ""})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {someSelected && (
              <button
                onClick={handleDeleteSelected}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}
              >
                🗑 Șterge selecția ({selectedIds.size})
              </button>
            )}
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all"
              style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)" }}
            >
              + Adaugă tranzacție
            </button>
          </div>
        </div>

        {/* Conținut */}
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">
              {hasFilters ? "Nicio tranzacție nu corespunde filtrelor" : "Nu ai tranzacții încă"}
            </p>
            {!hasFilters && (
              <p className="text-sm mt-1">Apasă "+ Adaugă tranzacție" pentru a începe</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-white/20">
                  <th className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
                      title="Selectează toate"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Dată</th>
                  <th className="px-4 py-3 text-left">Descriere</th>
                  <th className="px-4 py-3 text-right">Sumă</th>
                  <th className="px-4 py-3 text-left">Bancă</th>
                  <th className="px-4 py-3 text-left">Categorie</th>
                  <th className="px-4 py-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, index) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/10 hover:bg-white/20 transition-colors"
                    style={{
                      ...(index === filtered.length - 1 ? { borderBottom: "none" } : {}),
                      ...(selectedIds.has(t.id) ? { background: "rgba(13,148,136,0.06)" } : {}),
                    }}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
                      />
                    </td>

                    {/* Dată */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>

                    {/* Descriere */}
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-xs">
                      <span className="block truncate" title={t.description}>
                        {t.description}
                      </span>
                    </td>

                    {/* Sumă */}
                    <td className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap">
                      <span style={{ color: t.amount >= 0 ? "#059669" : "#DC2626" }}>
                        {formatAmount(t.amount, t.currency)}
                      </span>
                    </td>

                    {/* Bancă */}
                    <td className="px-4 py-3 text-sm">
                      {t.banks ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: t.banks.color }}
                          />
                          <span className="text-gray-700 truncate max-w-24">{t.banks.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Categorie */}
                    <td className="px-4 py-3 text-sm">
                      {t.categories ? (
                        <span className="text-gray-700">
                          {t.categories.icon} {t.categories.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Acțiuni */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(t)}
                        disabled={isLoading}
                        className="text-sm text-teal-600 hover:text-teal-800 font-medium px-2 py-1 rounded-lg hover:bg-teal-50 transition-all mr-1 disabled:opacity-50"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={isLoading}
                        className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal add/edit */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-5">
              {editingTransaction ? "Editează tranzacție" : "Adaugă tranzacție"}
            </h3>

            <div className="space-y-4">
              {/* Dată */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dată <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Descriere */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descriere <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="ex: Salariu, Cumpărături Lidl..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Sumă + valută */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sumă <span className="text-red-400">*</span>
                    <span className="text-gray-400 font-normal ml-1">(negativ = cheltuială)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="-150.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valută</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    maxLength={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Bancă */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bancă</label>
                <select
                  value={form.bank_id}
                  onChange={(e) => setForm((f) => ({ ...f, bank_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">— Fără bancă —</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">— Fără categorie —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all"
              >
                Anulează
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)" }}
              >
                {isLoading ? "Se salvează..." : editingTransaction ? "Salvează" : "Adaugă"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
