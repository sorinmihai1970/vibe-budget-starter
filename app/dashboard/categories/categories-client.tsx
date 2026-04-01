"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Category {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  description: string | null;
  is_system_category: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialCategories: Category[];
}

type TabType = "expense" | "income";

const EXPENSE_EMOJIS = [
  "🍔","🍕","🛒","🏠","🚗","💊","👗","📱","🎬","✈️",
  "🎓","💡","🔧","🏋️","🎮","📚","🐶","🎁","☕","🍺",
  "💈","🚌","⛽","🏥","🛠️","🧴","🎵","🍷","🧹","💳",
];

const INCOME_EMOJIS = [
  "💰","💵","💼","📈","🏆","🎯","💻","🔑","🤝","💎",
  "🎤","🌱","📦","🏗️","📊","🧾","🎪","🏪","🔖","💹",
  "🪙","💱","🏦","📥","🎰","🛍️","🎻","🏭","🌾","🚀",
];

const ALL_EMOJIS = ["📁","💸","⚡","🔄","❓","🎲","🌍","🧮","📌","🗂️"];

function CategoryTable({
  categories,
  isLoading,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  isLoading: boolean;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/30">
            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500">Icon</th>
            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500">Culoare</th>
            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500">Nume</th>
            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500">Descriere</th>
            <th className="text-right px-6 py-3 text-sm font-semibold text-gray-500">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr
              key={category.id}
              className="border-b border-white/20 last:border-0 hover:bg-white/20 transition-colors"
            >
              <td className="px-6 py-4">
                <span className="text-2xl">{category.icon || "📁"}</span>
              </td>
              <td className="px-6 py-4">
                <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: category.color }} />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{category.name}</span>
                  {category.is_system_category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium border border-teal-100">
                      sistem
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-500">{category.description || "—"}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(category)}
                    disabled={isLoading}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white/70 hover:bg-white text-gray-600 hover:text-gray-900 transition-all duration-200 disabled:opacity-50"
                  >
                    Editează
                  </button>
                  {!category.is_system_category && (
                    <button
                      onClick={() => onDelete(category)}
                      disabled={isLoading}
                      className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200 disabled:opacity-50"
                    >
                      Șterge
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<TabType>("expense");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formIcon, setFormIcon] = useState("📁");
  const [formDescription, setFormDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  const openAddModal = (defaultType: TabType = "expense") => {
    setEditingCategory(null);
    setFormName("");
    setFormType(defaultType);
    setFormColor("#6366f1");
    setFormIcon("📁");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormType(category.type);
    setFormColor(category.color);
    setFormIcon(category.icon || "📁");
    setFormDescription(category.description || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormName("");
    setFormColor("#6366f1");
    setFormIcon("📁");
    setFormDescription("");
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Numele categoriei este obligatoriu");
      return;
    }

    setIsLoading(true);
    try {
      if (editingCategory) {
        // Editare categorie existentă
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            color: formColor,
            icon: formIcon,
            description: formDescription.trim() || null,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error || "Eroare la actualizare");
          return;
        }

        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? json.data : c))
        );
        toast.success("Categorie actualizată cu succes");
      } else {
        // Adăugare categorie nouă
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            color: formColor,
            icon: formIcon,
            description: formDescription.trim() || null,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error || "Eroare la adăugare");
          return;
        }

        setCategories((prev) => [...prev, json.data]);
        toast.success("Categorie adăugată cu succes");
      }

      closeModal();
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.is_system_category) {
      toast.error("Categoriile de sistem nu pot fi șterse");
      return;
    }

    if (!window.confirm(`Ștergi categoria "${category.name}"? Tranzacțiile asociate nu vor fi șterse.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Eroare la ștergere");
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast.success("Categorie ștearsă");
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Titlu */}
      <div className="mb-8 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-gray-800">Categorii</h2>
        <p className="text-sm text-gray-500 mt-1">
          {expenseCategories.length} cheltuieli · {incomeCategories.length} venituri
        </p>
      </div>

      {/* Secțiunea Cheltuieli */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#F97316" }}>
            📉 Cheltuieli
            <span className="text-sm font-normal text-gray-400">({expenseCategories.length})</span>
          </h3>
          <button
            onClick={() => openAddModal("expense")}
            className="text-sm font-semibold px-4 py-2 rounded-xl border transition-all duration-200"
            style={{ borderColor: "#F97316", color: "#F97316", background: "#FFF7ED" }}
          >
            + Adaugă cheltuială
          </button>
        </div>

        {expenseCategories.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">Nu ai categorii de cheltuieli.</p>
          </div>
        ) : (
          <CategoryTable
            categories={expenseCategories}
            isLoading={isLoading}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Secțiunea Venituri */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#059669" }}>
            📈 Venituri
            <span className="text-sm font-normal text-gray-400">({incomeCategories.length})</span>
          </h3>
          <button
            onClick={() => openAddModal("income")}
            className="text-sm font-semibold px-4 py-2 rounded-xl border transition-all duration-200"
            style={{ borderColor: "#059669", color: "#059669", background: "#F0FDF4" }}
          >
            + Adaugă venit
          </button>
        </div>

        {incomeCategories.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">Nu ai categorii de venituri.</p>
          </div>
        ) : (
          <CategoryTable
            categories={incomeCategories}
            isLoading={isLoading}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingCategory ? "Editează categorie" : "Adaugă categorie nouă"}
            </h3>

            {/* Tip (doar la adăugare) */}
            {!editingCategory && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tip
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormType("expense")}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all duration-200"
                    style={
                      formType === "expense"
                        ? { background: "#FFF7ED", borderColor: "#F97316", color: "#F97316" }
                        : { borderColor: "#E5E7EB", color: "#6B7280" }
                    }
                  >
                    📉 Cheltuială
                  </button>
                  <button
                    onClick={() => setFormType("income")}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all duration-200"
                    style={
                      formType === "income"
                        ? { background: "#F0FDF4", borderColor: "#059669", color: "#059669" }
                        : { borderColor: "#E5E7EB", color: "#6B7280" }
                    }
                  >
                    📈 Venit
                  </button>
                </div>
              </div>
            )}

            {/* Nume */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nume categorie
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="ex: Mâncare, Salariu, Chirie..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                autoFocus
              />
            </div>

            {/* Icon picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Icon — selectat: <span className="text-xl">{formIcon}</span>
              </label>
              <div className="border border-gray-200 rounded-xl bg-white/80 p-2 grid grid-cols-10 gap-1">
                {[
                  ...(formType === "income" ? INCOME_EMOJIS : EXPENSE_EMOJIS),
                  ...ALL_EMOJIS,
                ].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormIcon(emoji)}
                    className="text-xl w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
                    style={
                      formIcon === emoji
                        ? { background: "#CCFBF1", outline: "2px solid #0D9488" }
                        : { background: "transparent" }
                    }
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Culoare */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Culoare
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <span className="text-sm text-gray-500 font-mono">{formColor}</span>
              </div>
            </div>

            {/* Descriere */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descriere <span className="text-gray-400 font-normal">(opțional)</span>
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="ex: Cheltuieli cu mâncarea și restaurante"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
              />
            </div>

            {/* Butoane */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 hover:bg-white text-gray-600 hover:text-gray-900 text-sm font-medium transition-all duration-200 disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {isLoading ? "Se salvează..." : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
