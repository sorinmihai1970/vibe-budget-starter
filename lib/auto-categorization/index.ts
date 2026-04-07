/**
 * AUTO-CATEGORIZARE TRANZACȚII
 *
 * EXPLICAȚIE:
 * Primește o tranzacție și încearcă să-i ghicească categoria
 * folosind 3 pași în cascadă (primul match câștigă):
 *
 * PAS 1 — Keywords utilizator: reguli personalizate salvate de user
 *   Ex: user a setat "netflix" → "Abonamente"
 *
 * PAS 2 — Reguli implicite: pattern-uri predefinite pentru bănci românești
 *   Ex: descriere conține "KAUFLAND" → caută categoria "Alimente" a userului
 *
 * PAS 3 — Fallback credit: dacă e venit, prima categorie de venituri
 *
 * PAS 4 — null: user categorizează manual
 */

import { UserKeyword, IncomeCategory, UserCategory } from "./types";
import { DEFAULT_RULES } from "./default-rules";

/**
 * Încearcă să găsească categoria potrivită pentru o tranzacție.
 *
 * @param description - Descrierea tranzacției (ex: "MEGA IMAGE 123")
 * @param type - Tipul: "debit" (cheltuială) | "credit" (venit) | undefined
 * @param userKeywords - Keywords personalizate ale userului (pre-fetch)
 * @param incomeCategories - Categorii de venituri din sistem (pre-fetch)
 * @param userCategories - Toate categoriile userului (pre-fetch, pentru reguli implicite)
 * @returns ID-ul categoriei găsite sau null
 */
export function autoCategorize(
  description: string,
  type: "debit" | "credit" | undefined,
  userKeywords: UserKeyword[],
  incomeCategories: IncomeCategory[],
  userCategories: UserCategory[] = []
): string | null {
  const normalizedDesc = description.toLowerCase().trim();

  // PAS 1: Keywords personalizate ale utilizatorului
  for (const kw of userKeywords) {
    if (normalizedDesc.includes(kw.keyword.toLowerCase().trim())) {
      return kw.category_id;
    }
  }

  // PAS 2: Reguli implicite — potrivire pe pattern-uri predefinite
  for (const rule of DEFAULT_RULES) {
    const matched = rule.keywords.some((kw) =>
      normalizedDesc.includes(kw.toLowerCase())
    );

    if (!matched) continue;

    // Încearcă fiecare variantă de nume de categorie
    for (const variant of rule.categoryNames) {
      const category = userCategories.find((cat) =>
        cat.name.toLowerCase().includes(variant.toLowerCase()) ||
        variant.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (category) return category.id;
    }

    // Fallback: prima categorie de același tip (expense/income)
    const fallback = userCategories.find((cat) => cat.type === rule.type);
    if (fallback) return fallback.id;
  }

  // PAS 3: Fallback — dacă e venit (credit), prima categorie de venituri din sistem
  if (type === "credit" && incomeCategories.length > 0) {
    return incomeCategories[0].id;
  }

  // PAS 4: Nicio potrivire — user categorizează manual
  return null;
}
