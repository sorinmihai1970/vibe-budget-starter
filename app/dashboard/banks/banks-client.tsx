"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Bank {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialBanks: Bank[];
}

export default function BanksClient({ initialBanks }: Props) {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [isLoading, setIsLoading] = useState(false);

  const openAddModal = () => {
    setEditingBank(null);
    setFormName("");
    setFormColor("#6366f1");
    setIsModalOpen(true);
  };

  const openEditModal = (bank: Bank) => {
    setEditingBank(bank);
    setFormName(bank.name);
    setFormColor(bank.color);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBank(null);
    setFormName("");
    setFormColor("#6366f1");
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Numele băncii este obligatoriu");
      return;
    }

    setIsLoading(true);
    try {
      if (editingBank) {
        // Editare bancă existentă
        const res = await fetch(`/api/banks/${editingBank.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), color: formColor }),
        });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error || "Eroare la actualizare");
          return;
        }

        setBanks((prev) =>
          prev.map((b) => (b.id === editingBank.id ? json.data : b))
        );
        toast.success("Bancă actualizată cu succes");
      } else {
        // Adăugare bancă nouă
        const res = await fetch("/api/banks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), color: formColor }),
        });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error || "Eroare la adăugare");
          return;
        }

        setBanks((prev) => [...prev, json.data]);
        toast.success("Bancă adăugată cu succes");
      }

      closeModal();
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (bank: Bank) => {
    if (!window.confirm(`Ștergi banca "${bank.name}"? Tranzacțiile asociate nu vor fi șterse.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/banks/${bank.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Eroare la ștergere");
        return;
      }

      setBanks((prev) => prev.filter((b) => b.id !== bank.id));
      toast.success("Bancă ștearsă");
    } catch {
      toast.error("Eroare de conexiune");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Titlu + buton Adaugă */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bănci</h2>
          <p className="text-sm text-gray-500 mt-1">
            {banks.length === 0
              ? "Nu ai bănci adăugate"
              : `${banks.length} ${banks.length === 1 ? "bancă" : "bănci"}`}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm"
        >
          + Adaugă bancă
        </button>
      </div>

      {/* Empty state */}
      {banks.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center animate-fade-in-up">
          <div className="text-6xl mb-4">🏦</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Nu ai bănci adăugate
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Adaugă băncile tale pentru a putea asocia tranzacțiile cu contul
            bancar corespunzător.
          </p>
          <button
            onClick={openAddModal}
            className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm"
          >
            Adaugă prima bancă
          </button>
        </div>
      )}

      {/* Tabel bănci */}
      {banks.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">
                  Culoare
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">
                  Nume bancă
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-500">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody>
              {banks.map((bank, index) => (
                <tr
                  key={bank.id}
                  className="border-b border-white/20 last:border-0 hover:bg-white/20 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div
                      className="w-8 h-8 rounded-lg shadow-sm"
                      style={{ backgroundColor: bank.color }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{bank.name}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(bank)}
                        disabled={isLoading}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white/70 hover:bg-white text-gray-600 hover:text-gray-900 transition-all duration-200 disabled:opacity-50"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => handleDelete(bank)}
                        disabled={isLoading}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200 disabled:opacity-50"
                      >
                        Șterge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              {editingBank ? "Editează bancă" : "Adaugă bancă nouă"}
            </h3>

            {/* Nume bancă */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nume bancă
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="ex: ING Bank, Revolut, BCR..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                style={{ "--tw-ring-color": "#0D9488" } as React.CSSProperties}
                autoFocus
              />
            </div>

            {/* Color picker */}
            <div className="mb-6">
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
