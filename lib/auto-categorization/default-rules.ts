/**
 * REGULI IMPLICITE DE AUTO-CATEGORIZARE
 *
 * Fiecare regulă conține:
 * - keywords: cuvinte căutate în descrierea tranzacției (substring, case-insensitive)
 * - categoryNames: variante de nume de categorie de căutat la user
 * - type: tipul categoriei ("expense" | "income") — folosit ca fallback
 *         dacă niciun nume nu se potrivește, se ia prima categorie de acel tip
 */

export interface DefaultRule {
  keywords: string[];
  categoryNames: string[]; // Variante de nume — primul match câștigă
  type: "expense" | "income";
}

export const DEFAULT_RULES: DefaultRule[] = [
  // Supermarketuri & Alimente
  {
    keywords: [
      "mega image", "kaufland", "lidl", "penny", "carrefour", "auchan",
      "profi", "selgros", "metro", "cora", "hypermarket", "supermarket",
      "minimarket", "alimentar",
    ],
    categoryNames: [
      "cuparaturi", "cumpărături", "cumparaturi", "alimente", "mâncare",
      "mancare", "grocery", "food", "shopping",
    ],
    type: "expense",
  },
  // Energie electrică & Utilități
  // ATENȚIE: evităm "canal" (BT folosește "canal electronic" = online banking)
  // și "energie" (prea generic). Folosim doar nume de companii specifice.
  {
    keywords: [
      "electrica furnizare", "electrica distributie",
      "enel", "e.on", "engie", "eon energie",
      "apa nova", "canal apa", "salubritate",
      "termoenergetica", "radet", "distrigaz",
      "plata clienti speciali - canal electronic - electri",
    ],
    categoryNames: [
      "energie", "electrica", "utilități", "utilitati", "facturi", "bills",
    ],
    type: "expense",
  },
  // Gaz & Apă (separat pentru a nu confunda cu energie electrică)
  {
    keywords: [
      "distributie gaz", "gaz natural", "gazprom", "engie gaz",
      "apa canal", "compania de apa", "aquatim", "apavital", "apele romane",
    ],
    categoryNames: [
      "utilitati", "utilități", "facturi", "bills", "energie",
    ],
    type: "expense",
  },
  // Combustibil
  {
    keywords: [
      "rompetrol", "petrom", "mol", "omv", "lukoil", "benzina",
      "motorina", "combustibil", "carburant", "fuel",
    ],
    categoryNames: [
      "combustibil", "carburant", "benzina", "transport", "fuel",
    ],
    type: "expense",
  },
  // Transport
  {
    keywords: [
      "uber", "bolt", "taxi", "ratb", "stb", "metrorex", "metrou",
      "cfr", "tren", "autobus", "ryanair", "wizz", "tarom",
      "parking", "parcare", "autostrada", "rovinieta",
    ],
    categoryNames: [
      "transport", "deplasari", "călătorii", "calatorii", "taxi",
      "cuparaturi", "cumpărături",
    ],
    type: "expense",
  },
  // Restaurante & Food delivery
  {
    keywords: [
      "mcdonald", "kfc", "burger king", "subway", "pizza", "shaorma",
      "restaurant", "bistro", "cafenea", "starbucks",
      "glovo", "tazz", "bolt food",
    ],
    categoryNames: [
      "restaurante", "mancare", "mâncare", "food", "masa", "dining",
      "cuparaturi", "cumpărături",
    ],
    type: "expense",
  },
  // Abonamente & Telecom
  {
    keywords: [
      "orange", "vodafone", "digi", "telekom", "rcs", "rds",
      "netflix", "spotify", "hbo", "disney", "apple", "google play",
      "youtube premium", "amazon",
      "openai", "claude.ai", "anthropic", "chatgpt",
      "adobe", "microsoft", "dropbox", "canva",
    ],
    categoryNames: [
      "abonamente", "telecom", "subscriptii", "subscripții", "media",
      "utilități", "utilitati", "facturi",
    ],
    type: "expense",
  },
  // Farmacie (Help Net, Catena, Sensiblu sunt farmacii, NU asigurări)
  // categoryNames caută EXACT "farmacie" — nu va confunda cu "Asigurare sanatate"
  {
    keywords: [
      "farmacie", "farmacia", "catena", "help net", "sensiblu", "dr. max", "dr max",
    ],
    categoryNames: [
      "farmacie", "pharmacy", "cuparaturi", "cumpărături", "cumparaturi",
    ],
    type: "expense",
  },
  // Sănătate (clinici, spitale, stomatologie)
  {
    keywords: [
      "clinica", "spital", "medicala", "stomatolog", "dentist", "medlife",
      "regina maria", "sanador", "medicover",
    ],
    categoryNames: [
      "sanatate", "sănătate", "medical", "health",
    ],
    type: "expense",
  },
  // Rate credite & Împrumuturi
  // BT format: "Plata OP inter - canal electronic - Rata X ..."
  {
    keywords: [
      "rata credit", "rata imprumut", "rata 1 ", "rata 2 ", "rata 3 ",
      "rata 4 ", "rata 5 ", "rata 6 ", "rata 7 ", "rata 8 ", "rata 9 ",
      "rambursare credit", "dobanda credit", "comision credit",
    ],
    categoryNames: [
      "rate", "credit", "imprumut", "împrumut", "datorii", "facturi",
    ],
    type: "expense",
  },
  // Venituri (incasări, salarii)
  // BT format: "Incasare OP - canal electronic - ..."
  // ATENȚIE: "incasare" trebuie să fie înaintea regulilor de cheltuieli
  {
    keywords: [
      "incasare op", "incasare", "salariu", "salary", "venit", "bonus", "prima",
      "transfer primit", "virament primit", "credit primit",
    ],
    categoryNames: [
      "incasare", "încasare", "venituri", "salariu", "income",
    ],
    type: "income",
  },
];
