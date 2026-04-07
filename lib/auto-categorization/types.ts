/**
 * TIPURI PENTRU AUTO-CATEGORIZARE
 *
 * Interfețe locale, independente de Drizzle ORM.
 * Reflect structura returnată de Supabase REST API (snake_case).
 */

export interface UserKeyword {
  id: string;
  keyword: string;
  category_id: string; // snake_case — direct din Supabase REST
}

export interface IncomeCategory {
  id: string;
}

export interface UserCategory {
  id: string;
  name: string;
  type: string; // "income" | "expense"
  is_system_category?: boolean;
}
