import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { listarTorneos, fetchChallongeApi } from "@/lib/challonge";
import { insertarTorneo } from "@/lib/importarTorneo";

// Un click, siempre cuenta A (TWPY_Host, la actual/activa). La cuenta B
// (Wario, historica) no recibe torneos nuevos -- el backfill unico que ya se
// hizo desde ahi fue manual.
export async function POST() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const listResponse = await listarTorneos("A");
    if (!listResponse) {
      return Response.json(
        { error: "No se pudo conectar con Challonge" },
        { status: 502 },
      );
    }
    if (!listResponse.ok) {
      const errorMessage = await listResponse.text();
      return Response.json({ error: errorMessage }, { status: listResponse.status });
    }

    const listado = await listResponse.json();
    const torneosApi = (listado || []).map((item) => item.tournament || item);

    const { data: existentes, error: existentesError } = await supabase
      .from("torneos")
      .select("id");
    if (existentesError) throw existentesError;

    const idsExistentes = new Set(existentes.map((torneo) => torneo.id));
    const nuevos = torneosApi.filter(
      (torneo) => torneo.state === "complete" && !idsExistentes.has(torneo.id),
    );

    const importados = [];
    const errores = [];

    for (const resumenTorneo of nuevos) {
      try {
        const detalleResponse = await fetchChallongeApi(resumenTorneo.id, "A");
        if (!detalleResponse || !detalleResponse.ok) {
          errores.push({ id: resumenTorneo.id, nombre: resumenTorneo.name, error: "No se pudo obtener el detalle" });
          continue;
        }

        const { tournament } = await detalleResponse.json();
        const resumen = await insertarTorneo(supabase, tournament, "A");
        importados.push({ id: tournament.id, nombre: tournament.name, resumen });
      } catch (error) {
        console.error(error);
        errores.push({ id: resumenTorneo.id, nombre: resumenTorneo.name, error: "Fallo la importacion" });
      }
    }

    if (importados.length > 0) {
      revalidatePath("/ranking");
      revalidatePath("/competidores");
      revalidatePath("/torneos");
    }

    return Response.json({ importados, errores }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al sincronizar torneos" },
      { status: 500 },
    );
  }
}
