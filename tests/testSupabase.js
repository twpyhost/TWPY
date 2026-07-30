// Clientes de supabase-js para tests de integracion/e2e. Apunta siempre al
// stack local (`supabase start`) -- nunca al proyecto remoto. Las claves de
// fallback son las demo keys fijas que `supabase start` imprime en CUALQUIER
// maquina (no son secretas, son las mismas para todo ambiente local).
import { createClient } from "@supabase/supabase-js";

export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
export const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const LOCAL_SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function getAnonClient() {
  return createClient(
    process.env.SUPABASE_URL || LOCAL_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}

export function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL || LOCAL_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}
