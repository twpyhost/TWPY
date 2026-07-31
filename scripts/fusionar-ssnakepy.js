// Fusiona SsnakePy86 (player 19, challonge_id 7302762) en ssnakepy (player
// 27, challonge_id 7097104) -- misma persona con dos cuentas de Challonge,
// confirmado por el usuario. Replica exactamente la logica de
// /api/admin/identidades/fusionar (mismo orden de pasos, mismo manejo de
// conflictos y misma auditoria en identidad_eventos) para no divergir del
// flujo del panel admin.
//
//   node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/fusionar-ssnakepy.js

import { recalcularSnapshotsPorTorneos } from "../src/lib/rankings.js";
import { registrarEvento } from "../src/lib/identidadEventos.js";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";

const BASE_PLAYER_ID = 27; // ssnakepy -- el correcto, segun el usuario
const DUPLICATE_PLAYER_ID = 19; // SsnakePy86
const ACTOR_EMAIL = "script:fusionar-ssnakepy (confirmado por el usuario en chat)";

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: filasBase, error: filasBaseError } = await supabase
    .from("tournament_participants_raw")
    .select("torneo_id")
    .eq("player_id", BASE_PLAYER_ID);
  if (filasBaseError) throw filasBaseError;

  const { data: filasDuplicado, error: filasDuplicadoError } = await supabase
    .from("tournament_participants_raw")
    .select("id, torneo_id")
    .eq("player_id", DUPLICATE_PLAYER_ID);
  if (filasDuplicadoError) throw filasDuplicadoError;

  const torneosBase = new Set(filasBase.map((f) => f.torneo_id));
  const conflictos = [
    ...new Set(
      filasDuplicado.filter((f) => torneosBase.has(f.torneo_id)).map((f) => f.torneo_id),
    ),
  ];
  const filasAReasignar = filasDuplicado.filter((f) => !torneosBase.has(f.torneo_id));

  if (conflictos.length) {
    console.log(`Conflictos (ambos tienen fila en el mismo torneo): ${conflictos.join(", ")}`);
  }

  const { data: cuentasReasignadas, error: cuentasError } = await supabase
    .from("player_challonge_accounts")
    .update({ player_id: BASE_PLAYER_ID, active: false })
    .eq("player_id", DUPLICATE_PLAYER_ID)
    .select("id");
  if (cuentasError) throw cuentasError;

  if (filasAReasignar.length > 0) {
    const { error: reasignarError } = await supabase
      .from("tournament_participants_raw")
      .update({ player_id: BASE_PLAYER_ID })
      .in("id", filasAReasignar.map((f) => f.id));
    if (reasignarError) throw reasignarError;
  }

  const { error: mergeError } = await supabase
    .from("players")
    .update({ merged_into_player_id: BASE_PLAYER_ID })
    .eq("id", DUPLICATE_PLAYER_ID);
  if (mergeError) throw mergeError;

  const temporadasRecalculadas = await recalcularSnapshotsPorTorneos(
    supabase,
    filasAReasignar.map((f) => f.torneo_id),
  );

  await registrarEvento(supabase, {
    tipo: "fusionar",
    actorUserId: null,
    detalle: {
      base_player_id: BASE_PLAYER_ID,
      duplicate_player_id: DUPLICATE_PLAYER_ID,
      cuentas_reasignadas: cuentasReasignadas.length,
      participantes_reasignados: filasAReasignar.length,
      conflictos,
      temporadas_recalculadas: temporadasRecalculadas,
      actor_email: ACTOR_EMAIL,
    },
  });

  console.log(
    `OK: ${cuentasReasignadas.length} cuenta(s) reasignada(s), ${filasAReasignar.length} participaciones reasignadas, ` +
      `temporadas recalculadas: ${temporadasRecalculadas.join(", ")}.`,
  );
}

await main();
