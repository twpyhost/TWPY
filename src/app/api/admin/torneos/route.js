import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { consultarPagina, escaparLike, leerPaginacion } from "@/lib/paginacion";

export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const { pagina, porPagina, q, desde, hasta } = leerPaginacion(searchParams);
    const cuenta = searchParams.get("cuenta");

    // Nombre y cuenta de origen filtran en la query: con paginacion
    // server-side, filtrar en el cliente solo miraria la pagina visible.
    const construir = ({ head }) => {
      let consulta = supabase
        .from("torneos")
        .select("id, nombre, fecha_inicio, temporada, challonge_source_account, url_challonge", {
          count: "exact",
          head,
        });

      if (q) {
        consulta = consulta.ilike("nombre", `%${escaparLike(q)}%`);
      }
      if (cuenta === "A" || cuenta === "B") {
        consulta = consulta.eq("challonge_source_account", cuenta);
      }

      return consulta.order("fecha_inicio", { ascending: false });
    };

    const { filas: torneos, total } = await consultarPagina(construir, { desde, hasta });

    // El contador de pendientes se acota a los torneos de la pagina.
    const idsPagina = torneos.map((torneo) => torneo.id);

    const { data: participantes, error: participantesError } = await supabase
      .from("tournament_participants_raw")
      .select("torneo_id, player_id")
      .in("torneo_id", idsPagina.length > 0 ? idsPagina : [-1]);

    if (participantesError) throw participantesError;

    const pendientesPorTorneo = new Map();
    for (const participante of participantes) {
      if (participante.player_id === null) {
        pendientesPorTorneo.set(
          participante.torneo_id,
          (pendientesPorTorneo.get(participante.torneo_id) ?? 0) + 1,
        );
      }
    }

    const resultado = torneos.map((torneo) => ({
      id: torneo.id,
      nombre: torneo.nombre,
      fecha_inicio: torneo.fecha_inicio,
      temporada: torneo.temporada,
      cuenta: torneo.challonge_source_account,
      url_challonge: torneo.url_challonge,
      pendientes: pendientesPorTorneo.get(torneo.id) ?? 0,
    }));

    return Response.json(
      { torneos: resultado, total, pagina, porPagina },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los torneos" },
      { status: 500 },
    );
  }
}
