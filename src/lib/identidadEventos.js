// Registra un evento de auditoria para la pantalla de admin "Resolucion de
// identidades" (vincular/crear_jugador/registrar_manual/fusionar/deshacer).
export async function registrarEvento(supabase, { tipo, actorUserId, detalle }) {
  const { error } = await supabase
    .from("identidad_eventos")
    .insert({ tipo, actor_user_id: actorUserId ?? null, detalle: detalle ?? {} });

  if (error) {
    throw error;
  }
}
