"use client";

import { useState, useRef, useEffect } from "react";
import { parseCSV, parseExcel, ParsedTransaction } from "@/lib/utils/file-parser";

type FileStatus = "idle" | "selected" | "parsing" | "preview" | "importing" | "done" | "error";

interface Bank {
  id: string;
  name: string;
  color: string;
}

export default function UploadPage() {
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [importedCount, setImportedCount] = useState(0);
  const [categorizedCount, setCategorizedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = [".csv", ".xls", ".xlsx"];

  useEffect(() => {
    fetch("/api/banks")
      .then((r) => r.json())
      .then((data) => setBanks(data.data || []));
  }, []);

  const isValidFile = (file: File) => {
    const name = file.name.toLowerCase();
    return ACCEPTED.some((ext) => name.endsWith(ext));
  };

  const handleFile = async (file: File) => {
    if (!isValidFile(file)) {
      setFileStatus("error");
      setErrorMsg("Format invalid. Sunt acceptate doar fișierele .csv, .xls, .xlsx");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setFileStatus("parsing");
    setErrorMsg(null);

    const name = file.name.toLowerCase();
    const result = name.endsWith(".csv")
      ? await parseCSV(file)
      : await parseExcel(file);

    if (!result.success || result.transactions.length === 0) {
      setFileStatus("error");
      setErrorMsg(result.error || "Nu s-au putut extrage tranzacții din fișier.");
      return;
    }

    setParsedTransactions(result.transactions);
    setFileStatus("preview");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const resetFile = () => {
    setSelectedFile(null);
    setFileStatus("idle");
    setErrorMsg(null);
    setParsedTransactions([]);
    setImportedCount(0);
    setCategorizedCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? "+" : "";
    return `${sign}${amount.toFixed(2)}`;
  };

  const handleConfirmImport = async () => {
    setFileStatus("importing");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: parsedTransactions,
          bank_id: selectedBankId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFileStatus("error");
        setErrorMsg(data.error || "Eroare la import.");
        return;
      }

      setImportedCount(data.total);
      setCategorizedCount(data.categorized);
      setFileStatus("done");
    } catch {
      setFileStatus("error");
      setErrorMsg("Eroare de rețea. Încearcă din nou.");
    }
  };

  const isDropZoneActive = fileStatus === "idle" || fileStatus === "error";

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #F0FDFA 0%, #E0F2FE 50%, #FFF7ED 100%)" }}
    >
      {/* Header glassmorphism */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📁</span>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#0D9488" }}>
                Vibe Budget
              </h1>
              <p className="text-xs text-gray-500">Import CSV / Excel</p>
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">

          {/* Titlu */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Import extras bancar</h2>
            <p className="text-sm text-gray-500 mt-1">
              Încarcă un fișier CSV sau Excel exportat din aplicația băncii tale.
            </p>
          </div>

          {/* Drop zone — vizibil doar în idle/error */}
          {isDropZoneActive && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              className="glass-card rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none"
              style={{
                border: isDragging
                  ? "2px solid #0D9488"
                  : fileStatus === "error"
                  ? "2px solid #DC2626"
                  : "2px dashed #CBD5E1",
                background: isDragging ? "rgba(13,148,136,0.04)" : undefined,
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleInputChange}
                className="hidden"
              />

              {fileStatus === "idle" && (
                <>
                  <div className="text-5xl mb-4">{isDragging ? "📂" : "📄"}</div>
                  <p className="text-gray-700 font-medium mb-1">
                    {isDragging ? "Eliberează pentru a încărca" : "Trage fișierul aici"}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">sau apasă pentru a selecta</p>
                  <span
                    className="inline-block px-4 py-2 rounded-xl text-sm font-medium text-white"
                    style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)" }}
                  >
                    Selectează fișier
                  </span>
                  <p className="text-xs text-gray-400 mt-4">
                    Formate acceptate: .csv, .xls, .xlsx
                  </p>
                </>
              )}

              {fileStatus === "error" && (
                <>
                  <div className="text-5xl mb-4">❌</div>
                  <p className="text-red-600 font-semibold mb-1">Eroare</p>
                  <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
                  <span className="inline-block px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                    Încearcă din nou
                  </span>
                </>
              )}
            </div>
          )}

          {/* Parsing state */}
          {fileStatus === "parsing" && (
            <div className="glass-card rounded-2xl p-10 text-center" style={{ border: "2px solid #99F6E4" }}>
              <div className="text-5xl mb-4 animate-pulse">⏳</div>
              <p className="text-gray-700 font-semibold mb-1">Se procesează fișierul...</p>
              <p className="text-sm text-gray-400">{selectedFile?.name}</p>
            </div>
          )}

          {/* Preview tranzacții */}
          {fileStatus === "preview" && (
            <>
              {/* Info fișier + selecție bancă */}
              <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">✅</div>
                  <div>
                    <p className="font-semibold text-gray-800">{selectedFile?.name}</p>
                    <p className="text-sm text-gray-400">
                      {selectedFile && formatSize(selectedFile.size)} ·{" "}
                      <span className="text-teal-600 font-medium">
                        {parsedTransactions.length} tranzacții găsite
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetFile}
                  className="text-sm text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
                >
                  Schimbă fișierul
                </button>
              </div>

              {/* Selecție bancă */}
              <div className="glass-card rounded-2xl p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏦 Atribuie unui cont bancar (opțional)
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">— Fără cont specific —</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tabel preview */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/40">
                  <h3 className="text-sm font-semibold text-gray-700">Preview tranzacții</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/30" style={{ background: "rgba(13,148,136,0.04)" }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dată</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descriere</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sumă</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valută</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTransactions.slice(0, 10).map((t, i) => (
                        <tr
                          key={i}
                          className="border-b border-white/20 hover:bg-white/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.date}</td>
                          <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{t.description}</td>
                          <td
                            className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap"
                            style={{ color: t.amount < 0 ? "#DC2626" : "#059669" }}
                          >
                            {formatAmount(t.amount)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 text-xs font-medium">
                            {t.currency || "RON"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-white/30 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Total:{" "}
                    <span className="font-semibold text-gray-700">
                      {parsedTransactions.length} tranzacții găsite în fișier
                    </span>
                  </p>
                  {parsedTransactions.length > 10 && (
                    <p className="text-xs text-gray-400">
                      ...și încă {parsedTransactions.length - 10} tranzacții
                    </p>
                  )}
                </div>
              </div>

              {/* Buton confirmare */}
              <div className="flex gap-3">
                <button
                  onClick={resetFile}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all"
                >
                  Anulează
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={!selectedBankId}
                  className="px-6 py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)", flex: 2 }}
                >
                  Importă {parsedTransactions.length} tranzacții →
                </button>
              </div>
            </>
          )}

          {/* Import în curs */}
          {fileStatus === "importing" && (
            <div className="glass-card rounded-2xl p-10 text-center" style={{ border: "2px solid #99F6E4" }}>
              <div className="text-5xl mb-4 animate-pulse">💾</div>
              <p className="text-gray-700 font-semibold mb-1">Se importă tranzacțiile...</p>
              <p className="text-sm text-gray-400">{parsedTransactions.length} înregistrări</p>
            </div>
          )}

          {/* Succes */}
          {fileStatus === "done" && (
            <div className="glass-card rounded-2xl p-10 text-center" style={{ border: "2px solid #6EE7B7" }}>
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-gray-800 font-bold text-lg mb-1">Import reușit!</p>
              <p className="text-sm text-gray-500 mb-2">
                <span className="text-teal-600 font-semibold">{importedCount} tranzacții</span> au fost adăugate în contul tău.
              </p>
              {categorizedCount > 0 && (
                <p className="text-sm text-gray-400 mb-6">
                  🏷️ <span className="text-orange-500 font-semibold">{categorizedCount}</span> categorizate automat
                </p>
              )}
              {categorizedCount === 0 && <div className="mb-6" />}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetFile}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all"
                >
                  Import nou
                </button>
                <a
                  href="/dashboard/transactions"
                  className="px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)" }}
                >
                  Vezi tranzacțiile →
                </a>
              </div>
            </div>
          )}

          {/* Info box — vizibil mereu */}
          {(fileStatus === "idle" || fileStatus === "error") && (
            <>
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📌 Instrucțiuni</h3>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">1.</span>
                    Exportă extrasul de cont din aplicația băncii (format CSV sau Excel)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">2.</span>
                    Selectează fișierul descărcat folosind zona de upload de mai sus
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">3.</span>
                    Verifică preview-ul și apasă "Importă" pentru a salva tranzacțiile
                  </li>
                </ul>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">🏦 Bănci suportate</h3>
                <div className="flex flex-wrap gap-2">
                  {["BT", "ING", "BCR", "Raiffeisen", "Revolut", "BRD", "UniCredit"].map((bank) => (
                    <span
                      key={bank}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ background: "#F0FDFA", color: "#0D9488", border: "1px solid #99F6E4" }}
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
