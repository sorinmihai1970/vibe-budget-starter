"use client";

import { useState, useRef } from "react";

type FileStatus = "idle" | "selected" | "error";

export default function UploadPage() {
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = [".csv", ".xls", ".xlsx"];

  const isValidFile = (file: File) => {
    const name = file.name.toLowerCase();
    return ACCEPTED.some((ext) => name.endsWith(ext));
  };

  const handleFile = (file: File) => {
    if (!isValidFile(file)) {
      setFileStatus("error");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setFileStatus("selected");
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
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">

          {/* Titlu */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Import extras bancar</h2>
            <p className="text-sm text-gray-500 mt-1">
              Încarcă un fișier CSV sau Excel exportat din aplicația băncii tale.
            </p>
          </div>

          {/* Drop zone */}
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
                : fileStatus === "selected"
                ? "2px solid #059669"
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

            {fileStatus === "selected" && selectedFile && (
              <>
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-800 font-semibold mb-1">{selectedFile.name}</p>
                <p className="text-sm text-gray-400 mb-4">{formatSize(selectedFile.size)}</p>
                <p className="text-sm text-green-600 font-medium">Fișier selectat cu succes</p>
              </>
            )}

            {fileStatus === "error" && (
              <>
                <div className="text-5xl mb-4">❌</div>
                <p className="text-red-600 font-semibold mb-1">Format invalid</p>
                <p className="text-sm text-gray-400 mb-4">
                  Sunt acceptate doar fișierele .csv, .xls, .xlsx
                </p>
                <span
                  className="inline-block px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600"
                >
                  Încearcă din nou
                </span>
              </>
            )}
          </div>

          {/* Acțiuni */}
          {fileStatus === "selected" && (
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); resetFile(); setShowComingSoon(false); }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all"
              >
                Schimbă fișierul
              </button>
              <button
                onClick={() => setShowComingSoon(true)}
                className="px-6 py-3 rounded-xl text-white font-medium text-sm transition-all"
                style={{ background: "linear-gradient(135deg, #0D9488, #0EA5E9)", flex: 2 }}
              >
                Procesează fișierul
              </button>
            </div>
          )}

          {/* Coming soon message */}
          {showComingSoon && (
            <div
              className="glass-card rounded-2xl p-5 text-center"
              style={{ border: "1px solid #99F6E4" }}
            >
              <div className="text-3xl mb-2">🚧</div>
              <p className="font-semibold text-gray-800">
                Upload va fi funcțional în Săptămâna 5, Lecția 5.1
              </p>
            </div>
          )}

          {/* Info box */}
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
                Apasă "Procesează fișierul" pentru a importa tranzacțiile automat
              </li>
            </ul>
          </div>

          {/* Bănci suportate (placeholder) */}
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
            <p className="text-xs text-gray-400 mt-3">
              * Procesarea automată va fi disponibilă în curând
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
