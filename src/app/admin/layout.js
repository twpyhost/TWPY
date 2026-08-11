import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AdminShell from "@/components/admin/AdminShell";
import { obtenerLigaActual, contarPendientesVincularLiga } from "@/lib/ligaAdmin";

// Guard centralizado (antes duplicado en cada admin/*/page.js). Deja entrar a
// cualquiera con acceso al panel; lo que separa superusuario de rol 'liga' es
// requireSuperusuario() en las paginas que no son la liga. El limite de
// seguridad real sigue siendo requireAdmin()/requireLiga() en las rutas de
// API: esto es UX (evita el flash de contenido admin), no la defensa en si.
export default async function AdminLayout({ children }) {
  const { user, isAdmin, puedeEntrarAlPanel, error } = await getAdminUser();
  if (error) redirect("/error");
  if (!user) redirect("/auth/login?redirectTo=/admin");
  if (!puedeEntrarAlPanel) redirect("/no-autorizado");

  const supabase = getSupabaseAdmin();

  // La cola de identidades es de una seccion que el rol 'liga' no ve: sin
  // esto pagaria la query solo para alimentar un badge que no se renderiza.
  const { count } = isAdmin
    ? await supabase
        .from("tournament_participants_raw")
        .select("id", { count: "exact", head: true })
        .is("player_id", null)
    : { count: 0 };

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
      isAdmin={isAdmin}
      supabaseOk={ultimoHealth ? ultimoHealth.ok : null}
    >
      {children}
    </AdminShell>
  );
}
