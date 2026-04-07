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
  {
    keywords: [
      "electrica", "enel", "e.on", "engie", "gaz", "apa nova", "canal",
      "termoenergetica", "radet", "salubritate", "energie",
    ],
    categoryNames: [
      "energie", "electrica", "utilități", "utilitati", "facturi",
      "bills", "cuparaturi", "cumpărături",
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
    ],
    categoryNames: [
      "abonamente", "telecom", "subscriptii", "subscripții", "media",
      "utilități", "utilitati", "facturi",
    ],
    type: "expense",
  },
  // Sănătate
  {
    keywords: [
      "farmacie", "farmacia", "catena", "help net", "sensiblu",
      "clinica", "spital", "medicala", "stomatolog", "dentist",
    ],
    categoryNames: [
      "sanatate", "sănătate", "medical", "farmacie", "health",
    ],
    type: "expense",
  },
  // Venituri (incasări, salarii)
  {
    keywords: [
      "incasare", "salariu", "salary", "venit", "bonus", "prima",
      "transfer primit", "virament primit",
    ],
    categoryNames: [
      "incasare", "încasare", "venituri", "salariu", "income",
    ],
    type: "income",
  },
];
