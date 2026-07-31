import { createClient } from "@supabase/supabase-js";

let client = null;

// Cliente con service_role: ignora RLS, usarlo SOLO en rutas de API
// protegidas con getAdminUser(). Nunca importar desde codigo de cliente.
export function getSupabaseAdmin() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }

  return client;
}
