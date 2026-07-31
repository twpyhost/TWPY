import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { data: torneos, error: torneosError } = await supabase
      .from("torneos")
      .select("id, nombre, fecha_inicio, temporada, challonge_source_account, url_challonge")
      .order("fecha_inicio", { ascending: false });

    if (torneosError) throw torneosError;

    const { data: participantes, error: participantesError } = await supabase
      .from("tournament_participants_raw")
      .select("torneo_id, player_id");

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

    return Response.json({ torneos: resultado }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los torneos" },
      { status: 500 },
    );
  }
}
