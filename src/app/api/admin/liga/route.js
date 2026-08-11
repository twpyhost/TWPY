import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { armarLiga } from "@/lib/ligaData";
import { obtenerLigaActual } from "@/lib/ligaAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    const liga = await obtenerLigaActual(supabase);
    if (!liga) {
      return Response.json({ error: "No hay ninguna liga cargada" }, { status: 404 });
    }

    const { data: fechas, error: fechasError } = await supabase
      .from("liga_fechas")
      .select("id, numero, fecha, hora")
      .eq("liga_id", liga.id);
    if (fechasError) throw fechasError;

    const { data: grupos, error: gruposError } = await supabase
      .from("liga_grupos")
      .select("id, numero, nombre, cupos_clasificados, cerrado")
      .eq("liga_id", liga.id);
    if (gruposError) throw gruposError;

    const grupoIds = grupos.map((g) => g.id);
    const { data: participantes, error: participantesError } = grupoIds.length
      ? await supabase
          .from("liga_participantes")
          .select("id, grupo_id, nombre, player_id, orden_desempate")
          .in("grupo_id", grupoIds)
      : { data: [], error: null };
    if (participantesError) throw participantesError;

    const { data: partidos, error: partidosError } = grupoIds.length
      ? await supabase
          .from("liga_partidos")
          .select(
            "id, grupo_id, fecha_id, participante_a_id, participante_b_id, orden, ganador_id",
          )
          .in("grupo_id", grupoIds)
      : { data: [], error: null };
    if (partidosError) throw partidosError;

    const armada = armarLiga({ liga, fechas, grupos, participantes, partidos });

    const resumenGrupos = armada.grupos.map((g) => ({
      numero: g.numero,
      nombre: g.nombre,
      cerrado: g.cerrado,
      progreso: {
        cargados: g.partidos.filter((p) => p.ganadorId != null).length,
        total: g.partidos.length,
      },
      liderNombre: g.tabla[0]?.nombre ?? null,
    }));

    const pendientesVincular = armada.grupos.reduce(
      (total, g) => total + g.participantes.filter((p) => p.playerId == null).length,
      0,
    );

    return Response.json(
      { liga: armada.liga, grupos: resumenGrupos, pendientesVincular },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener el resumen de la liga" },
      { status: 500 },
    );
  }
}
