/**
 * UTILITĂȚI PARSARE FIȘIERE
 *
 * EXPLICAȚIE:
 * Funcții pentru parsarea fișierelor CSV, Excel și PDF în tranzacții.
 *
 * CONCEPTE:
 * - CSV = Comma-Separated Values (valori separate prin virgulă)
 * - Excel = Format binar (.xlsx) al Microsoft
 * - PDF = Portable Document Format (extrase bancare)
 * - Parser = Funcție care transformă text/binary în obiecte JavaScript
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Tipul pentru o tranzacție parsată
 */
export interface ParsedTransaction {
  date: string; // Format: YYYY-MM-DD
  description: string;
  amount: number;
  currency?: string;
  type?: "debit" | "credit";
  originalData?: any; // Datele originale din fișier
}

/**
 * Rezultatul parsării
 */
export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  error?: string;
  rowCount?: number;
}

/**
 * FUNCȚIA 1: Parse CSV
 *
 * Parsează un fișier CSV și extrage tranzacțiile.
 * SUPORT MULTI-FORMAT: Funcționează automat cu diverse formate bancare:
 * - Bănci românești (ING, BCR, BT, Revolut RO): date, descriere, suma, moneda
 * - Bănci rusești/internaționale: Дата, Описание, Сумма, Валюта
 * - Format cu dată timestamp: YYYY-MM-DD HH:MM:SS
 * - Encoding: UTF-8 (suport complet pentru diacritice și Cyrillic)
 *
 * PARAMETRI:
 * @param file - Fișierul CSV (File object din input)
 * @returns Promise cu rezultatul parsării
 *
 * EXEMPLU CSV ROMÂNESC:
 * date,description,amount,currency
 * 01.12.2025,MEGA IMAGE,-45.50,RON
 * 02.12.2025,Salariu,5000.00,RON
 *
 * EXEMPLU CSV RUSESC:
 * Тип,Продукт,Дата начала,Дата выполнения,Описание,Сумма,Комиссия,Валюта
 * Переводы,Сбережения,2025-12-02 08:57:52,2025-12-02 08:57:52,В кошелек,0.10,0.00,EUR
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  // Citim textul brut pentru a detecta formatul înainte de parsare
  const rawText = await file.text();
  const firstLines = rawText.split(/\r?\n/).slice(0, 6).join(" ").toLowerCase();

  // Detecție format ING (primele rânduri conțin "titular cont" sau "cnp:")
  const isING = firstLines.includes("titular cont") || firstLines.includes("cnp:");

  if (isING) {
    console.log('[parseCSV] Format ING detectat → parser specializat');
    return new Promise((resolve) => {
      Papa.parse(rawText, {
        header: false,
        skipEmptyLines: false, // păstrăm rândurile goale (separator între tranzacții)
        complete: (results) => {
          const rows = results.data as string[][];
          const transactions = parseINGRows(rows);
          if (transactions.length > 0) {
            resolve({ success: true, transactions, rowCount: rows.length });
          } else {
            resolve({
              success: false,
              transactions: [],
              error: "Nu s-au putut extrage tranzacții din fișierul ING",
            });
          }
        },
        error: (err: Error) => {
          resolve({ success: false, transactions: [], error: err.message });
        },
      });
    });
  }

  // Parser generic standard (CSV cu header pe primul rând)
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true, // Prima linie = header-e (nume coloane)
      skipEmptyLines: true, // Ignoră liniile goale
      encoding: 'UTF-8', // Suport pentru caractere speciale (română, rusă, etc)
      complete: (results) => {
        try {
          // Verificăm dacă avem date
          if (!results.data || results.data.length === 0) {
            resolve({
              success: false,
              transactions: [],
              error: "Fișierul CSV este gol",
            });
            return;
          }

          // Transformăm fiecare rând în tranzacție
          const transactions: ParsedTransaction[] = [];

          results.data.forEach((row: any, index: number) => {
            try {
              // Detectăm automat coloanele (flexibil pentru diverse formate)
              const date = detectDate(row);
              const description = detectDescription(row);
              const amount = detectAmount(row);
              const currency = detectCurrency(row);

              if (date && description && amount !== null) {
                transactions.push({
                  date: formatDate(date),
                  description: description.trim(),
                  amount: parseFloat(amount),
                  currency: currency || "RON",
                  type: parseFloat(amount) < 0 ? "debit" : "credit",
                  originalData: row, // Păstrăm datele originale
                });
              }
            } catch (err) {
              console.warn(`Eroare la parsarea rândului ${index + 1}:`, err);
            }
          });

          resolve({
            success: true,
            transactions,
            rowCount: results.data.length,
          });
        } catch (error: any) {
          resolve({
            success: false,
            transactions: [],
            error: error.message,
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          transactions: [],
          error: error.message,
        });
      },
    });
  });
}

/**
 * Parser specializat pentru ING România Excel
 *
 * Formatul ING are:
 * - 3 rânduri de metadata (Titular cont, CNP, Adresă)
 * - Un rând de header cu: "Data", "Detalii tranzactie", "Debit", "Credit"
 * - Fiecare tranzacție ocupă MAI MULTE rânduri (data + suma sunt pe primul rând,
 *   detaliile suplimentare continuă pe rândurile următoare)
 * - Data în format text românesc: "02 martie 2026"
 */
function parseINGRows(rows: any[][]): ParsedTransaction[] {
  const ROMANIAN_MONTHS: Record<string, string> = {
    "ianuarie": "01", "februarie": "02", "martie": "03", "aprilie": "04",
    "mai": "05", "iunie": "06", "iulie": "07", "august": "08",
    "septembrie": "09", "octombrie": "10", "noiembrie": "11", "decembrie": "12",
  };

  const parseRomanianDate = (str: string): string | null => {
    const parts = str.trim().split(/\s+/);
    if (parts.length === 3) {
      const month = ROMANIAN_MONTHS[parts[1]?.toLowerCase()];
      if (month) return `${parts[2]}-${month}-${parts[0].padStart(2, "0")}`;
    }
    return null;
  };

  // FIX: Elimină separatorul de mii (.) înainte de a converti
  // Ex: "1.000,00" → elimină "." → "1000,00" → înlocuiește "," → "1000.00" → 1000
  const toNum = (val: any): number => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const cleaned = String(val)
      .replace(/\s/g, "")        // elimină spații
      .replace(/\./g, "")        // elimină separatorul de mii (.)
      .replace(",", ".");         // înlocuiește separatorul zecimal (, → .)
    return parseFloat(cleaned) || 0;
  };

  // Găsim TOATE rândurile header din fișier (fișierul ING are mai multe pagini)
  // Fiecare pagină are propriul header cu "Data", "Detalii tranzactie", "Debit", "Credit"
  interface SectionHeader {
    idx: number;
    detailsCol: number;
    debitCol: number;
    creditCol: number;
  }
  const sections: SectionHeader[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let dataCol = -1, detailsCol = -1, debitCol = -1, creditCol = -1;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).toLowerCase().trim();
      if (cell === "data") dataCol = j;
      if (cell.includes("detalii")) detailsCol = j;
      if (cell === "debit") debitCol = j;
      if (cell === "credit") creditCol = j;
    }
    if (dataCol !== -1 && debitCol !== -1) {
      sections.push({ idx: i, detailsCol, debitCol, creditCol });
    }
  }

  if (sections.length === 0) {
    console.warn("[parseING] Nu s-a găsit niciun rând header");
    return [];
  }

  console.log(`[parseING] ${sections.length} secțiuni găsite la rândurile:`, sections.map(s => s.idx));

  const transactions: ParsedTransaction[] = [];

  for (let s = 0; s < sections.length; s++) {
    const { idx: headerIdx, detailsCol, debitCol, creditCol } = sections[s];
    const sectionEnd = s + 1 < sections.length ? sections[s + 1].idx : rows.length;

    let i = headerIdx + 1;
    while (i < sectionEnd) {
      const row = rows[i];

      // Căutăm data în orice celulă (celulele unite pot decala coloanele cu 1)
      let parsedDate: string | null = null;
      for (let j = 0; j < row.length; j++) {
        const d = parseRomanianDate(String(row[j] || "").trim());
        if (d) { parsedDate = d; break; }
      }

      if (!parsedDate) { i++; continue; }

      // Descriere principală (tipul tranzacției): "Cumparare POS", "Incasare", "Transfer" etc.
      let mainDesc = "";
      if (detailsCol >= 0) {
        mainDesc = String(row[detailsCol] || "").trim() ||
                   String(row[detailsCol - 1] || "").trim();
      }
      if (!mainDesc) {
        mainDesc = row.map(String).find((v) => {
          const s = v.trim();
          return s && !parseRomanianDate(s);
        }) || "";
      }

      // Sumă: la debitCol/creditCol sau coloanele adiacente (offset -1 pentru celule unite)
      const debit = debitCol >= 0
        ? toNum(row[debitCol]) || toNum(row[debitCol - 1])
        : 0;
      const credit = creditCol >= 0
        ? toNum(row[creditCol]) || toNum(row[creditCol - 1])
        : 0;
      let amount = credit > 0 ? credit : -debit;

      // Colectăm rândurile de continuare (detalii suplimentare ale tranzacției)
      // până la următorul rând cu dată sau sfârșitul secțiunii
      const continuationLines: string[] = [];
      let j = i + 1;
      while (j < sectionEnd) {
        const nextRow = rows[j];
        const hasDate = nextRow.some(c => parseRomanianDate(String(c || "").trim()) !== null);
        if (hasDate) break;
        // Colectăm prima celulă non-goală din rând
        const detail = nextRow.map(String).find(v => v.trim() !== "");
        if (detail) continuationLines.push(detail.trim());
        j++;
      }

      // Construim descrierea finală din rândurile de continuare
      let description = mainDesc;
      const descLower = mainDesc.toLowerCase();

      if (descLower === "cumparare pos" || descLower === "cumparare online") {
        // Extragem numele comerciantului din "Terminal:LIDL RO 0455 RO Targoviste"
        const terminalLine = continuationLines.find(d => d.startsWith("Terminal:"));
        if (terminalLine) {
          const raw = terminalLine.replace("Terminal:", "").trim();
          // Curățăm: eliminăm sufixul " RO CityName" de la final
          const cleaned = raw.replace(/\s+RO\s+\S+\s*$/, "").trim();
          description = cleaned || mainDesc;
        }
      } else if (descLower.includes("incasare")) {
        // Adăugăm ordonatorul și scopul plății
        const ordonator = continuationLines.find(d => d.startsWith("Ordonator:"));
        const detalii = continuationLines.find(d => d.startsWith("Detalii:"));
        if (ordonator) description += " - " + ordonator.replace("Ordonator:", "").trim();
        if (detalii) description += " (" + detalii.replace("Detalii:", "").trim() + ")";
      } else if (descLower.includes("transfer")) {
        // Adăugăm scopul transferului
        const detalii = continuationLines.find(d => d.startsWith("Detalii:"));
        if (detalii) description += " - " + detalii.replace("Detalii:", "").trim();
      }

      if (!description && amount === 0) { i = j; continue; }

      transactions.push({
        date: parsedDate,
        description: description.trim() || "Tranzacție ING",
        amount,
        currency: "RON",
        type: amount >= 0 ? "credit" : "debit",
      });

      i = j; // Sărim direct la următoarea tranzacție
    }
  }

  console.log(`[parseING] ${transactions.length} tranzacții extrase`);
  return transactions;
}

/**
 * FUNCȚIA 2: Parse Excel
 *
 * Parsează un fișier Excel (.xlsx) și extrage tranzacțiile.
 * Suportă formatul ING România (multi-rând, dată în română) și formatul generic.
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({
            success: false,
            transactions: [],
            error: "Nu s-a putut citi fișierul",
          });
          return;
        }

        // Parsăm Excel-ul
        const workbook = XLSX.read(data, { type: "binary" });

        // Luăm prima foaie (sheet)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Citim rândurile brute pentru detecție format
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        console.log('[parseExcel] Sheet:', sheetName, '| Total rânduri brute:', rawRows.length);
        console.log('[parseExcel] Primele 3 rânduri:', rawRows.slice(0, 3));

        // Detecție format ING (primele rânduri conțin "titular cont" sau "cnp:")
        const isING = rawRows.slice(0, 6).some((row) =>
          row.some((cell) => {
            const s = String(cell).toLowerCase();
            return s.includes("titular cont") || s.startsWith("cnp:");
          })
        );

        if (isING) {
          console.log('[parseExcel] Format ING detectat → parser specializat');
          const transactions = parseINGRows(rawRows);
          if (transactions.length > 0) {
            resolve({ success: true, transactions, rowCount: rawRows.length });
            return;
          }
          // Dacă ING parser nu a găsit nimic, continuăm cu parser-ul generic
          console.warn('[parseExcel] ING parser n-a găsit tranzacții, încearcă parser generic');
        }

        // Parser generic (format tabelar standard)
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log('[parseExcel] Total rânduri JSON:', jsonData.length);
        console.log('[parseExcel] Primul rând:', jsonData[0]);

        if (jsonData.length === 0) {
          resolve({
            success: false,
            transactions: [],
            error: "Fișierul Excel este gol",
          });
          return;
        }

        // Transformăm în tranzacții (similar cu CSV)
        const transactions: ParsedTransaction[] = [];

        jsonData.forEach((row: any, index: number) => {
          try {
            const date = detectDate(row);
            const description = detectDescription(row);
            const amount = detectAmount(row);
            const currency = detectCurrency(row);

            if (index < 3) {
              console.log(`[parseExcel] Row ${index}:`, { date, description, amount, currency, rawRow: row });
            }

            if (date && description && amount !== null) {
              transactions.push({
                date: formatDate(date),
                description: description.trim(),
                amount: parseFloat(amount),
                currency: currency || "RON",
                type: parseFloat(amount) < 0 ? "debit" : "credit",
                originalData: row,
              });
            } else {
              if (index < 5) {
                console.warn(`[parseExcel] Skipping row ${index}:`, {
                  hasDate: !!date, hasDescription: !!description, hasAmount: amount !== null, row
                });
              }
            }
          } catch (err) {
            console.warn(`[parseExcel] Eroare rând ${index}:`, err);
          }
        });

        resolve({
          success: true,
          transactions,
          rowCount: jsonData.length,
        });
      } catch (error: any) {
        resolve({
          success: false,
          transactions: [],
          error: error.message,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        transactions: [],
        error: "Eroare la citirea fișierului",
      });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * FUNCȚIA 3: Parse PDF - TEMPORAR DEZACTIVATĂ
 *
 * PDF parsing este complex în environment serverless.
 *
 * ALTERNATIVE PENTRU UTILIZATORI:
 * 1. Convertiți PDF → CSV folosind https://www.ilovepdf.com/pdf_to_excel
 * 2. Majoritatea băncilor oferă export CSV direct din aplicație
 * 3. Folosiți Google Sheets pentru a deschide PDF și exporta ca CSV
 */
export async function parsePDF(file: File): Promise<ParseResult> {
  return {
    success: false,
    transactions: [],
    error: 'PDF support este temporar indisponibil. Vă rugăm să convertești PDF-ul în CSV folosind https://www.ilovepdf.com/pdf_to_excel sau să descărcați extractul direct în format CSV de la bancă.',
  };
}

/**
 * FUNCȚII HELPER - Detectare automată coloane
 *
 * Aceste funcții încearcă să ghicească care coloană conține ce informație.
 * Funcționează cu diverse formate de extrase bancare.
 */

function detectDate(row: any): string | null {
  // Căutăm o coloană care arată ca o dată
  // Adăugăm "completed" pentru Revolut (Completed Date)
  // Adăugăm "început" pentru Revolut România (Data de început)
  // NOTĂ: Excel exportă "Ä" în loc de "Ă" pentru caracterele românești
  // RUSSIAN: "Дата начала", "Дата выполнения" (Start Date, Completion Date)
  const dateKeys = [
    "completed", "data", "date", "început", "inceput", "änceput", "start",
    "data operatiunii", "data tranzactiei",
    "дата", "дата начала", "дата выполнения", // Russian: date, start date, completion date
  ];

  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().trim();
    if (dateKeys.some((k) => normalizedKey.includes(k))) {
      const dateValue = row[key];
      console.log('[detectDate] Found date column:', key, '→', JSON.stringify(dateValue));
      return dateValue;
    }
  }

  // Dacă nu găsim, luăm prima coloană care arată ca o dată
  for (const value of Object.values(row)) {
    if (typeof value === "string" && isDate(value)) {
      console.log('[detectDate] Found date by pattern:', JSON.stringify(value));
      return value;
    }
  }

  console.warn('[detectDate] No date found in row:', row);
  return null;
}

function detectDescription(row: any): string | null {
  // Adăugăm variante cu diacritice pentru Revolut România
  // RUSSIAN: "Описание" (Description)
  const descKeys = [
    "descriere", "description", "detalii", "details", "beneficiar",
    "описание", // Russian: description
  ];

  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().trim();
    if (descKeys.some((k) => normalizedKey.includes(k))) {
      console.log('[detectDescription] Found description column:', key, '→', row[key]);
      return row[key];
    }
  }

  console.warn('[detectDescription] No description found in row:', Object.keys(row));
  return null;
}

function detectAmount(row: any): string | null {
  // Adăugăm "sumă" cu diacritice pentru Revolut România
  // NOTĂ: Excel exportă "SumÄ" (Ä = A-umlaut) în loc de "Sumă" (Ă = A-breve)
  // RUSSIAN: "Сумма" (Amount)
  const amountKeys = [
    "sumă", "sumä", "suma", "amount", "valoare", "value", "total",
    "сумма", // Russian: amount
  ];

  // Căutăm o coloană cu suma
  for (const key of Object.keys(row)) {
    // Normalizăm: lowercase + trim spații invizibile
    const normalizedKey = key.toLowerCase().trim();

    // DEBUG: Verificăm fiecare cheie
    const matches = amountKeys.filter(k => normalizedKey.includes(k));
    if (matches.length > 0) {
      console.log('[detectAmount] ✅ MATCH! Key:', `"${key}"`, '→ normalized:', `"${normalizedKey}"`, '→ matched:', matches);
      return row[key];
    }
  }

  // Dacă nu găsim, verificăm dacă există coloane separate Debit/Credit (format ING)
  const debitKeys = ["debit"];
  const creditKeys = ["credit"];

  let debitValue: string | null = null;
  let creditValue: string | null = null;

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    if (debitKeys.some((k) => lowerKey.includes(k))) {
      debitValue = row[key];
    }
    if (creditKeys.some((k) => lowerKey.includes(k))) {
      creditValue = row[key];
    }
  }

  // Dacă avem Debit/Credit, returnăm valoarea care nu e goală
  // Debit = negativ (cheltuială), Credit = pozitiv (venit)
  if (debitValue && debitValue.trim() !== "") {
    console.log('[detectAmount] Found debit value:', debitValue);
    return `-${debitValue}`;
  }
  if (creditValue && creditValue.trim() !== "") {
    console.log('[detectAmount] Found credit value:', creditValue);
    return creditValue;
  }

  console.warn('[detectAmount] No amount found in row:', Object.keys(row));
  return null;
}

function detectCurrency(row: any): string | null {
  // RUSSIAN: "Валюта" (Currency)
  const currencyKeys = [
    "moneda", "currency", "valuta",
    "валюта", // Russian: currency
  ];

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase().trim();
    if (currencyKeys.some((k) => lowerKey.includes(k))) {
      return row[key];
    }
  }

  return null;
}

/**
 * Verifică dacă un string arată ca o dată
 */
function isDate(str: string): boolean {
  // Formate acceptate:
  // - DD.MM.YYYY, DD/MM/YYYY (Romanian)
  // - YYYY-MM-DD HH:MM:SS (Russian)
  // - YYYY-MM-DD HH:MM (ISO with timestamp)
  // - YYYY-MM-DD (ISO)
  const dateRegex = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}(:\d{2})?)?$/;
  return dateRegex.test(str);
}

/**
 * Convertește Excel serial number în dată
 * Excel stochează datele ca număr de zile de la 1 ianuarie 1900
 */
function excelSerialToDate(serial: number): string {
  // Excel epoch: 1 ianuarie 1900 (cu bug: consideră 1900 an bisect)
  const excelEpoch = new Date(1900, 0, 1);
  const days = Math.floor(serial) - 2; // -2 pentru bug-ul Excel 1900
  const milliseconds = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + milliseconds);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formatează data în format ISO (YYYY-MM-DD)
 */
function formatDate(dateStr: string | number): string {
  // DEBUG: Log intrare
  console.log('[formatDate] Input:', JSON.stringify(dateStr), 'Type:', typeof dateStr);

  // Verificăm dacă e Excel serial number (number sau string ce pare număr > 40000)
  const asNumber = typeof dateStr === 'number' ? dateStr : parseFloat(String(dateStr));
  if (!isNaN(asNumber) && asNumber > 40000 && asNumber < 60000) {
    console.log('[formatDate] Excel serial number detected:', asNumber);
    const result = excelSerialToDate(asNumber);
    console.log('[formatDate] Converted to date:', result);
    return result;
  }

  // Dacă e number dar nu e Excel serial, e invalid
  if (typeof dateStr === 'number') {
    console.warn('[formatDate] Invalid number (not Excel serial):', dateStr);
    return new Date().toISOString().split("T")[0];
  }

  // Validare: dacă nu primim string valid, returnăm data curentă
  if (!dateStr || typeof dateStr !== 'string') {
    console.warn('[formatDate] Invalid date string:', dateStr);
    return new Date().toISOString().split("T")[0];
  }

  // Curățăm string-ul (trim whitespace)
  const cleanStr = dateStr.trim();
  console.log('[formatDate] After trim:', JSON.stringify(cleanStr));

  // Dacă e deja ISO format (cu sau fără timestamp)
  // Ex: "2025-12-02 08:57:52" (Russian) sau "2025-12-02" (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    // Extragem doar partea de dată (fără timestamp: " 08:57:52" sau "T08:57:52")
    const result = cleanStr.split(" ")[0].split("T")[0];
    console.log('[formatDate] ISO format detected. Result:', result);
    return result;
  }

  // Format Revolut: DD MMM YYYY (ex: "01 Dec 2024")
  const revolutPattern = /^(\d{2})\s+(\w{3})\s+(\d{4})$/;
  const revolutMatch = cleanStr.match(revolutPattern);

  if (revolutMatch) {
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const day = revolutMatch[1];
    const monthName = revolutMatch[2];
    const year = revolutMatch[3];
    const month = monthMap[monthName];

    if (month) {
      const result = `${year}-${month}-${day}`;
      console.log('[formatDate] Revolut format detected. Result:', result);
      return result;
    }
  }

  // Parsăm formate românești: DD.MM.YYYY sau DD/MM/YYYY (cu sau fără timestamp)
  const parts = cleanStr.split(/[./-]/);
  console.log('[formatDate] Parsed parts:', parts);

  if (parts.length >= 3) {
    let [day, month, yearRaw] = parts;
    // Eliminăm partea de timp dacă există (ex: "2026 10:41" → "2026")
    const year = yearRaw.split(/[\sT]/)[0];
    // Dacă "month" > 12 e imposibil → formatul e MM/DD/YYYY → swap ziua cu luna
    if (parseInt(month, 10) > 12) {
      [day, month] = [month, day];
    }
    const fullYear = year.length === 2 ? `20${year}` : year;
    const result = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    console.log('[formatDate] Romanian format detected. Result:', result);
    return result;
  }

  // Fallback: returnăm data curentă (cu warning)
  console.warn('[formatDate] Could not parse date, using current date:', dateStr);
  return new Date().toISOString().split("T")[0];
}
