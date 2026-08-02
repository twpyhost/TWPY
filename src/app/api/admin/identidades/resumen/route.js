import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { puedeDeshacer } from "@/lib/identidadDeshacer";
import { sugerirJugador } from "@/lib/nameSimilarity";
import { describirEvento } from "@/lib/identidadDescripcion";
import { leerPaginacion, paginarArray, POR_PAGINA_LOG } from "@/lib/paginacion";

export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const { pagina, porPagina } = leerPaginacion(searchParams, POR_PAGINA_LOG);

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

    // La cola se pagina DESPUES de agrupar: agruparCola dedupe por cuenta de
    // Challonge, asi que cortar las filas crudas con .range() partiria grupos
    // y dejaria mal el contador de ocurrencias. Las filas pendientes estan
    // acotadas por lo que haya sin resolver, no por el historico completo.
    const colaCompleta = agruparCola(filas);
    const cola = paginarArray(colaCompleta, { pagina, porPagina }).map((item) => ({
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

    // El log necesita mostrar nombres de jugador y cuentas de Challonge que,
    // para eventos guardados antes de este cambio, no viajan en `detalle`.
    // Se resuelven en batch (mismo patron que el join de `torneo` en cola)
    // en vez de N+1 queries por fila.
    const jugadoresPorId = await resolverJugadores(supabase, eventos);
    const cuentasPorChallongeId = await resolverCuentasChallonge(supabase, eventos);

    const log = eventos.map((evento) => {
      const detalleEnriquecido = enriquecerDetalle(
        evento.detalle,
        jugadoresPorId,
        cuentasPorChallongeId,
      );
      const { descripcion, cuentas } = describirEvento({
        tipo: evento.tipo,
        detalle: detalleEnriquecido,
      });

      return {
        id: evento.id,
        tipo: evento.tipo,
        detalle: evento.detalle,
        actor_email: evento.detalle?.actor_email ?? null,
        created_at: evento.created_at,
        deshacer_disponible: puedeDeshacer(evento, eventos),
        descripcion,
        cuentas,
      };
    });

    const { count: fusiones, error: fusionesError } = await supabase
      .from("identidad_eventos")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "fusionar");

    if (fusionesError) throw fusionesError;

    // Los stats del hero cuentan la cola COMPLETA, no la pagina visible.
    const hoy = new Date().toISOString().slice(0, 10);
    const stats = {
      pendientes: colaCompleta.length,
      hoy: colaCompleta.filter((item) => item.created_at.slice(0, 10) === hoy).length,
      fusiones: fusiones ?? 0,
    };

    return Response.json(
      { cola, colaTotal: colaCompleta.length, log, stats, pagina, porPagina },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener la cola de identidades" },
      { status: 500 },
    );
  }
}

async function resolverJugadores(supabase, eventos) {
  const playerIds = new Set();
  for (const evento of eventos) {
    const d = evento.detalle ?? {};
    if (d.player_id) playerIds.add(d.player_id);
    if (d.base_player_id) playerIds.add(d.base_player_id);
    if (d.duplicate_player_id) playerIds.add(d.duplicate_player_id);
  }

  if (playerIds.size === 0) return new Map();

  const { data, error } = await supabase
    .from("players")
    .select("id, display_name")
    .in("id", [...playerIds]);

  if (error) throw error;

  return new Map(data.map((jugador) => [jugador.id, jugador.display_name]));
}

async function resolverCuentasChallonge(supabase, eventos) {
  const challongeIds = new Set();
  for (const evento of eventos) {
    const challongeId = evento.detalle?.challonge_id;
    if (challongeId) challongeIds.add(challongeId);
  }

  if (challongeIds.size === 0) return new Map();

  const { data, error } = await supabase
    .from("player_challonge_accounts")
    .select("challonge_id, challonge_username")
    .in("challonge_id", [...challongeIds]);

  if (error) throw error;

  return new Map(data.map((cuenta) => [cuenta.challonge_id, cuenta.challonge_username]));
}

// No pisa lo que ya venga en detalle (eventos nuevos ya lo denormalizan al
// escribirse) -- solo rellena lo que falte para eventos historicos.
function enriquecerDetalle(detalle, jugadoresPorId, cuentasPorChallongeId) {
  const enriquecido = { ...detalle };

  if (!enriquecido.display_name && enriquecido.player_id) {
    enriquecido.display_name = jugadoresPorId.get(enriquecido.player_id) ?? null;
  }
  if (!enriquecido.base_display_name && enriquecido.base_player_id) {
    enriquecido.base_display_name = jugadoresPorId.get(enriquecido.base_player_id) ?? null;
  }
  if (!enriquecido.duplicate_display_name && enriquecido.duplicate_player_id) {
    enriquecido.duplicate_display_name = jugadoresPorId.get(enriquecido.duplicate_player_id) ?? null;
  }
  if (!enriquecido.challonge_username && enriquecido.challonge_id) {
    enriquecido.challonge_username = cuentasPorChallongeId.get(enriquecido.challonge_id) ?? null;
  }

  return enriquecido;
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
