import { revalidatePath } from "next/cache";
import { requireLiga } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Carga (o borra) el resultado de un partido de la fase de grupos.
//
// Body: { ganadorId: number | null, matchesPerdedor: 0 | 1 | 2 }
//
// El partido es un first-to-3: el cliente manda quien gano y cuantos matches
// le saco el perdedor; el servidor deriva matches_a/matches_b poniendo 3 del
// lado del ganador. ganadorId: null borra el resultado completo (marcador y
// auditoria incluidos) e ignora matchesPerdedor.
export async function PUT(req, { params }) {
  try {
    const auth = await requireLiga();
    if (auth.error) return auth.error;
    const { user } = auth;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) {
      return Response.json({ error: "Id de partido invalido" }, { status: 400 });
    }

    const { ganadorId, matchesPerdedor } = await req.json();

    if (
      ganadorId != null &&
      !(Number.isInteger(matchesPerdedor) && matchesPerdedor >= 0 && matchesPerdedor <= 2)
    ) {
      return Response.json(
        { error: "Los matches del perdedor deben ser 0, 1 o 2" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: partido, error: partidoError } = await supabase
      .from("liga_partidos")
      .select("id, grupo_id, participante_a_id, participante_b_id")
      .eq("id", id)
      .maybeSingle();
    if (partidoError) throw partidoError;
    if (!partido) {
      return Response.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    if (
      ganadorId != null &&
      ganadorId !== partido.participante_a_id &&
      ganadorId !== partido.participante_b_id
    ) {
      return Response.json(
        { error: "El ganador debe ser uno de los dos participantes del partido" },
        { status: 400 },
      );
    }

    const { data: grupo, error: grupoError } = await supabase
      .from("liga_grupos")
      .select("cerrado")
      .eq("id", partido.grupo_id)
      .maybeSingle();
    if (grupoError) throw grupoError;
    if (grupo?.cerrado) {
      return Response.json({ error: "El grupo esta cerrado" }, { status: 409 });
    }

    const ganadorEsA = ganadorId === partido.participante_a_id;

    const { error: updateError } = await supabase
      .from("liga_partidos")
      .update({
        ganador_id: ganadorId ?? null,
        matches_a: ganadorId == null ? null : ganadorEsA ? 3 : matchesPerdedor,
        matches_b: ganadorId == null ? null : ganadorEsA ? matchesPerdedor : 3,
        cargado_at: ganadorId ? new Date().toISOString() : null,
        cargado_by: ganadorId ? user.id : null,
      })
      .eq("id", id);
    if (updateError) throw updateError;

    revalidatePath("/liga");

    return Response.json({ message: "Resultado actualizado" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al actualizar el partido" },
      { status: 500 },
    );
  }
}
