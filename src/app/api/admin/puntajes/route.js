import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Un solo juego en el MVP (Tekken 8) -- sin tabla de seleccion de juego en
// la UI, la config de puntajes es siempre la de ese juego.
async function obtenerJuegoTekken8(supabase) {
  const { data, error } = await supabase
    .from("juegos")
    .select("id")
    .ilike("nombre", "Tekken 8")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    const juego = await obtenerJuegoTekken8(supabase);
    if (!juego) {
      return Response.json({ puntajes: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("puntajes_config")
      .select("posicion, puntos")
      .eq("juego_id", juego.id)
      .order("posicion", { ascending: true });

    if (error) throw error;

    return Response.json({ puntajes: data }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los puntajes" },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { puntajes } = await req.json();
    if (!Array.isArray(puntajes)) {
      return Response.json({ error: "Se requiere un arreglo de puntajes" }, { status: 400 });
    }

    for (const fila of puntajes) {
      if (!Number.isFinite(fila.posicion) || !Number.isFinite(fila.puntos)) {
        return Response.json(
          { error: "Cada fila necesita posicion y puntos numericos" },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseAdmin();
    const juego = await obtenerJuegoTekken8(supabase);
    if (!juego) {
      return Response.json({ error: "No se encontro el juego Tekken 8" }, { status: 404 });
    }

    const { error } = await supabase
      .from("puntajes_config")
      .upsert(
        puntajes.map((fila) => ({
          juego_id: juego.id,
          posicion: fila.posicion,
          puntos: fila.puntos,
        })),
        { onConflict: "juego_id,posicion" },
      );

    if (error) throw error;

    return Response.json({ message: "Puntajes actualizados" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al guardar los puntajes" },
      { status: 500 },
    );
  }
}
