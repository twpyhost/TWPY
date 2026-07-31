import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { puedeDeshacer } from "@/lib/identidadDeshacer";
import { sugerirJugador } from "@/lib/nameSimilarity";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { data: filas, error: filasError } = await supabase
      .from("tournament_participants_raw")
      .select(
        "id, torneo_id, challonge_id, challonge_username, nombre_participante, posicion, puntaje, created_at, torneo:torneos ( nombre, fecha_inicio )",
      )
      .is("player_id", null)
      .order("created_at", { ascending: false });

    if (filasError) throw filasError;

    const { data: candidatos, error: candidatosError } = await supabase
      .from("players")
      .select("id, display_name")
      .is("merged_into_player_id", null);

    if (candidatosError) throw candidatosError;

    const cola = agruparCola(filas).map((item) => ({
      ...item,
      sugerencia: sugerirJugador(
        item.challonge_username || item.nombre_participante,
        candidatos,
      ),
    }));

    const { data: eventos, error: eventosError } = await supabase
      .from("identidad_eventos")
      .select("id, tipo, detalle, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (eventosError) throw eventosError;

    const log = eventos.map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      detalle: evento.detalle,
      actor_email: evento.detalle?.actor_email ?? null,
      created_at: evento.created_at,
      deshacer_disponible: puedeDeshacer(evento, eventos),
    }));

    const { count: fusiones, error: fusionesError } = await supabase
      .from("identidad_eventos")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "fusionar");

    if (fusionesError) throw fusionesError;

    const hoy = new Date().toISOString().slice(0, 10);
    const stats = {
      pendientes: cola.length,
      hoy: cola.filter((item) => item.created_at.slice(0, 10) === hoy).length,
      fusiones: fusiones ?? 0,
    };

    return Response.json({ cola, log, stats }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener la cola de identidades" },
      { status: 500 },
    );
  }
}

// Agrupa filas pendientes por cuenta de Challonge (misma cuenta puede
// aparecer sin resolver en varios torneos): se muestra una sola fila
// representativa (la mas reciente) con un contador de ocurrencias.
// Participantes sin challonge_id nunca se agrupan entre si -- agruparlos
// por nombre reintroduciria el mismo riesgo de auto-fusion por nombre que
// este sistema esta disenado para evitar.
function agruparCola(filas) {
  const grupos = new Map();

  for (const fila of filas) {
    const clave = fila.challonge_id ? `c:${fila.challonge_id}` : `p:${fila.id}`;
    const existente = grupos.get(clave);

    if (!existente) {
      grupos.set(clave, {
        id: fila.id,
        challonge_id: fila.challonge_id,
        challonge_username: fila.challonge_username,
        nombre_participante: fila.nombre_participante,
        posicion: fila.posicion,
        puntaje: fila.puntaje,
        torneo_id: fila.torneo_id,
        torneo_nombre: fila.torneo?.nombre ?? null,
        torneo_fecha: fila.torneo?.fecha_inicio ?? null,
        created_at: fila.created_at,
        ocurrencias_pendientes: 1,
      });
    } else {
      existente.ocurrencias_pendientes += 1;
    }
  }

  return [...grupos.values()];
}
