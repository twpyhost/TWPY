import { createClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return Response.json(
      { error: "No se pudo cerrar sesion" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
