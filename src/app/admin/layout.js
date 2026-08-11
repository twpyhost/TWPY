import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AdminShell from "@/components/admin/AdminShell";
import { obtenerLigaActual, contarPendientesVincularLiga } from "@/lib/ligaAdmin";

// Guard centralizado (antes duplicado en cada admin/*/page.js). El limite
// de seguridad real sigue siendo requireAdmin() en las rutas de API: esto
// es UX (evita el flash de contenido admin), no la defensa en si.
export default async function AdminLayout({ children }) {
  const { user, isAdmin, error } = await getAdminUser();
  if (error) redirect("/error");
  if (!user) redirect("/auth/login?redirectTo=/admin");
  if (!isAdmin) redirect("/no-autorizado");

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("tournament_participants_raw")
    .select("id", { count: "exact", head: true })
    .is("player_id", null);

  const { data: ultimoHealth } = await supabase
    .from("sistema_eventos")
    .select("ok")
    .eq("tipo", "health")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ligaActual = await obtenerLigaActual(supabase);
  const ligaPendingCount = await contarPendientesVincularLiga(supabase, ligaActual?.id);

  return (
    <AdminShell
      pendingCount={count ?? 0}
      ligaPendingCount={ligaPendingCount}
      userEmail={user.email}
      supabaseOk={ultimoHealth ? ultimoHealth.ok : null}
    >
      {children}
    </AdminShell>
  );
}
