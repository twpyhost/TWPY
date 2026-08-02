import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getMovimiento } from "@/lib/data/movimiento";
import { consultarPagina, escaparLike, leerPaginacion } from "@/lib/paginacion";

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
    const { pagina, porPagina, q, desde, hasta } = leerPaginacion(searchParams);
    const temporadaParam = searchParams.get("temporada");
    const temporada = temporadaParam ? Number(temporadaParam) : temporadas[0];

    if (!temporada) {
      return Response.json(
        { rankings: [], temporadas: [], total: 0, pagina, porPagina },
        { status: 200 },
      );
    }

    const { data: torneosTemporada, error: torneosError } = await supabase
      .from("torneos")
      .select("id")
      .eq("temporada", temporada)
      .order("fecha_inicio", { ascending: false })
      .limit(2);

    if (torneosError) throw torneosError;

    if (torneosTemporada.length === 0) {
      return Response.json(
        { rankings: [], temporadas, total: 0, pagina, porPagina },
        { status: 200 },
      );
    }

    const [ultimo, anterior] = torneosTemporada;

    // El filtro por nombre viaja al servidor (sobre el join a players) para
    // que busque en toda la temporada y no solo en la pagina visible.
    const construir = ({ head }) => {
      let consulta = supabase
        .from("ranking_snapshots")
        .select(
          "player_id, posicion_global, puntaje_acumulado, jugador:players!inner ( id, display_name )",
          { count: "exact", head },
        )
        .eq("torneo_id", ultimo.id);

      if (q) {
        consulta = consulta.ilike("players.display_name", `%${escaparLike(q)}%`);
      }

      return consulta.order("posicion_global", { ascending: true });
    };

    const { filas: snapshots, total } = await consultarPagina(construir, { desde, hasta });

    // Los agregados (movimiento y torneos jugados) se acotan a los jugadores
    // de la pagina en vez de traer toda la temporada.
    const idsPagina = snapshots.map((s) => s.player_id);
    const idsFiltro = idsPagina.length > 0 ? idsPagina : [-1];

    const posicionesAnteriores = new Map();
    if (anterior) {
      const { data: previos, error: previosError } = await supabase
        .from("ranking_snapshots")
        .select("player_id, posicion_global")
        .eq("torneo_id", anterior.id)
        .in("player_id", idsFiltro);

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
      .in("player_id", idsFiltro);
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

    return Response.json(
      { rankings, temporadas, temporada, total, pagina, porPagina },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los rankings" },
      { status: 500 },
    );
  }
}
