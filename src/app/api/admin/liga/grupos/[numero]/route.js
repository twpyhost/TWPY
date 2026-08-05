import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { armarGrupo } from "@/lib/ligaData";
import { obtenerLigaActual, obtenerGrupoPorNumero } from "@/lib/ligaAdmin";

export async function GET(_req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const numero = Number((await params).numero);
    if (!Number.isInteger(numero)) {
      return Response.json({ error: "Numero de grupo invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const liga = await obtenerLigaActual(supabase);
    if (!liga) {
      return Response.json({ error: "No hay ninguna liga cargada" }, { status: 404 });
    }

    const grupoRow = await obtenerGrupoPorNumero(supabase, liga.id, numero);
    if (!grupoRow) {
      return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const { data: fechas, error: fechasError } = await supabase
      .from("liga_fechas")
      .select("id, numero, fecha, hora")
      .eq("liga_id", liga.id)
      .order("numero", { ascending: true });
    if (fechasError) throw fechasError;

    const { data: participantes, error: participantesError } = await supabase
      .from("liga_participantes")
      .select("id, grupo_id, nombre, player_id, orden_desempate")
      .eq("grupo_id", grupoRow.id);
    if (participantesError) throw participantesError;

    const { data: partidos, error: partidosError } = await supabase
      .from("liga_partidos")
      .select(
        "id, grupo_id, fecha_id, participante_a_id, participante_b_id, orden, ganador_id",
      )
      .eq("grupo_id", grupoRow.id);
    if (partidosError) throw partidosError;

    const fechaPorId = new Map(fechas.map((f) => [f.id, f]));
    const grupo = armarGrupo({ grupo: grupoRow, participantes, partidos, fechaPorId });

    return Response.json({ grupo, fechas }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener el grupo" },
      { status: 500 },
    );
  }
}
