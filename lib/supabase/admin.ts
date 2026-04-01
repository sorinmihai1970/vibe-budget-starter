/**
 * SUPABASE ADMIN CLIENT - Server-Side Only
 *
 * Folosește service_role key — bypass RLS complet.
 * NICIODATĂ nu expune acest client în browser (client components).
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
