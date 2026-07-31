import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getMovimiento } from "@/lib/data/movimiento";

export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { data: temporadasData, error: temporadasError } = await supabase
      .from("torneos")
      .select("temporada")
      .order("temporada", { ascending: false });

    if (temporadasError) throw temporadasError;

    const temporadas = [...new Set(temporadasData.map((t) => t.temporada))];

    const { searchParams } = new URL(req.url);
    const temporadaParam = searchParams.get("temporada");
    const temporada = temporadaParam ? Number(temporadaParam) : temporadas[0];

    if (!temporada) {
      return Response.json({ rankings: [], temporadas: [] }, { status: 200 });
    }

    const { data: torneosTemporada, error: torneosError } = await supabase
      .from("torneos")
      .select("id")
      .eq("temporada", temporada)
      .order("fecha_inicio", { ascending: false })
      .limit(2);

    if (torneosError) throw torneosError;

    if (torneosTemporada.length === 0) {
      return Response.json({ rankings: [], temporadas }, { status: 200 });
    }

    const [ultimo, anterior] = torneosTemporada;

    const { data: snapshots, error: snapshotsError } = await supabase
      .from("ranking_snapshots")
      .select("player_id, posicion_global, puntaje_acumulado, jugador:players ( id, display_name )")
      .eq("torneo_id", ultimo.id)
      .order("posicion_global", { ascending: true });

    if (snapshotsError) throw snapshotsError;

    const posicionesAnteriores = new Map();
    if (anterior) {
      const { data: previos, error: previosError } = await supabase
        .from("ranking_snapshots")
        .select("player_id, posicion_global")
        .eq("torneo_id", anterior.id);

      if (previosError) throw previosError;
      previos.forEach((s) => posicionesAnteriores.set(s.player_id, s.posicion_global));
    }

    // Torneos jugados EN ESTA TEMPORADA (no career-total): cuenta filas de
    // tournament_participants_raw ya resueltas, dentro de los torneos de
    // esta temporada -- distinto de ranking_snapshots, que tiene una fila
    // por jugador y torneo desde su primera aparicion (running total, no
    // participacion real).
    const { data: torneosDeLaTemporada, error: torneosDeLaTemporadaError } = await supabase
      .from("torneos")
      .select("id")
      .eq("temporada", temporada);
    if (torneosDeLaTemporadaError) throw torneosDeLaTemporadaError;

    const { data: participaciones, error: participacionesError } = await supabase
      .from("tournament_participants_raw")
      .select("player_id")
      .in("torneo_id", torneosDeLaTemporada.map((t) => t.id))
      .not("player_id", "is", null);
    if (participacionesError) throw participacionesError;

    const torneosPorJugador = new Map();
    for (const p of participaciones) {
      torneosPorJugador.set(p.player_id, (torneosPorJugador.get(p.player_id) ?? 0) + 1);
    }

    const rankings = snapshots.map((s) => ({
      id: s.jugador.id,
      nombre: s.jugador.display_name,
      posicion: s.posicion_global,
      puntaje: s.puntaje_acumulado,
      torneos: torneosPorJugador.get(s.player_id) ?? 0,
      movimiento: getMovimiento(s.posicion_global, posicionesAnteriores.get(s.player_id)),
    }));

    return Response.json({ rankings, temporadas, temporada }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los rankings" },
      { status: 500 },
    );
  }
}
