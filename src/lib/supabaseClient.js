import { createBrowserClient } from "@supabase/ssr";

let client = null;

// Lazy: solo se crea al usarse, para que el modo mock funcione sin
// variables de entorno de Supabase configuradas.
export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }

  return client;
}
