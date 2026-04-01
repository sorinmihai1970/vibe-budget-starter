"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Currency {
  id: string;
  user_id: string;
  code: string;
  name: string;
  symbol: string;
  created_at: string;
}

interface PresetCurrency {
  code: string;
  name: string;
  symbol: string;
}

interface Props {
  initialCurrencies: Currency[];
}

const PRESET_CURRENCIES: PresetCurrency[] = [
  { code: "RON", name: "Leu românesc", symbol: "lei" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "Dolar american", symbol: "$" },
  { code: "GBP", name: "Liră sterlină", symbol: "£" },
];

export default function CurrenciesClient({ initialCurrencies }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formSymbol, setFormSymbol] = useState("");

  const isPresetAdded = (code: string) =>
    currencies.some((c) => c.code === code);

  const handleAddPreset = async (preset: PresetCurrency) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Eroare la adăugare");
        return;
      }

      setCurrencies((prev) => [...prev, json.data]);
      toast.success(`${preset.code} adăugat cu succes`);
    } catch {
      toast.error("Eroare de rețea");
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = () => {
    setFormCode("");
    setFormName("");
    setFormSymbol("");
    setIsModalOpen(true);
  };

  const handleAddCustom = async () => {
    if (!formCode.trim() || !formName.trim() || !formSymbol.trim()) {
      toast.error("Completează toate câmpurile");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          symbol: formSymbol.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Eroare la adăugare");
        return;
      }

      setCurrencies((prev) => [...prev, json.data]);
      toast.success(`${formCode.toUpperCase()} adăugat cu succes`);
      setIsModalOpen(false);
    } catch {
      toast.error("Eroare de rețea");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (currency: Currency) => {
    if (!window.confirm(`Ștergi valuta ${currency.code}?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/currencies/${currency.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Eroare la ștergere");
        return;
      }

      setCurrencies((prev) => prev.filter((c) => c.id !== currency.id));
      toast.success(`${currency.code} șters`);
    } catch {
      toast.error("Eroare de rețea");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Titlu + preset buttons */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Adaugă valute
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Selectează valutele pe care le folosești. Valutele deja adăugate sunt dezactivate.
        </p>
        <div className="flex flex-wrap gap-3">
          {PRESET_CURRENCIES.map((preset) => {
            const added = isPresetAdded(preset.code);
            return (
              <button
                key={preset.code}
                onClick={() => handleAddPreset(preset)}
                disabled={added || isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                style={
                  added
                    ? {
                        background: "#F3F4F6",
                        color: "#9CA3AF",
                        cursor: "not-allowed",
                        border: "1px solid #E5E7EB",
                      }
                    : {
                        background: "linear-gradient(135deg, #0D9488, #0EA5E9)",
                        color: "#fff",
                        border: "none",
                        boxShadow: "0 2px 8px rgba(13,148,136,0.25)",
                      }
                }
              >
                <span className="font-bold">{preset.code}</span>
                <span className="opacity-75">{preset.symbol}</span>
                {added && <span className="text-xs">✓</span>}
              </button>
            );
          })}

          {/* Buton valută personalizată */}
          <button
            onClick={openModal}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
            style={{
              border: "1.5px dashed #0D9488",
              color: "#0D9488",
              background: "transparent",
            }}
          >
            <span>+</span>
            <span>Altă valută</span>
          </button>
        </div>
      </div>

      {/* Tabel valute */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/30">
          <h2 className="text-lg font-semibold text-gray-800">
            Valutele tale{" "}
            <span className="text-sm font-normal text-gray-500">
              ({currencies.length})
            </span>
          </h2>
        </div>

        {currencies.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">💱</div>
            <p className="font-medium">Nu ai valute adăugate</p>
            <p className="text-sm mt-1">Folosește butoanele de mai sus pentru a adăuga</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-white/20">
                <th className="px-6 py-3 text-left">Cod</th>
                <th className="px-6 py-3 text-left">Simbol</th>
                <th className="px-6 py-3 text-left">Nume</th>
                <th className="px-6 py-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency, index) => (
                <tr
                  key={currency.id}
                  className="border-b border-white/10 hover:bg-white/20 transition-colors"
                  style={index === currencies.length - 1 ? { borderBottom: "none" } : {}}
                >
                  <td className="px-6 py-4">
                    <span
                      className="inline-block px-2.5 py-1 rounded-lg text-sm font-bold"
                      style={{ background: "#CCFBF1", color: "#0D9488" }}
                    >
                      {currency.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">
                    {currency.symbol}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{currency.name}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(currency)}
                      disabled={isLoading}
                      className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200 disabled:opacity-50"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal valută personalizată */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-5">
              Adaugă valută personalizată
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cod valută <span className="text-gray-400">(ex: CHF, JPY)</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="CHF"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simbol <span className="text-gray-400">(ex: Fr, ¥)</span>
                </label>
                <input
                  type="text"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  maxLength={10}
                  placeholder="Fr"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume complet
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Franc elvețian"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all"
              >
                Anulează
              </button>
              <button
                onClick={handleAddCustom}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)" }}
              >
                {isLoading ? "Se salvează..." : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
