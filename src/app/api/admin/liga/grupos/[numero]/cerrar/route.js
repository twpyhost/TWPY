import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obtenerLigaActual, obtenerGrupoPorNumero } from "@/lib/ligaAdmin";

export async function PUT(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const numero = Number((await params).numero);
    if (!Number.isInteger(numero)) {
      return Response.json({ error: "Numero de grupo invalido" }, { status: 400 });
    }

    const { cerrado } = await req.json();
    if (typeof cerrado !== "boolean") {
      return Response.json({ error: "Se requiere cerrado (boolean)" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const liga = await obtenerLigaActual(supabase);
    if (!liga) {
      return Response.json({ error: "No hay ninguna liga cargada" }, { status: 404 });
    }

    const grupo = await obtenerGrupoPorNumero(supabase, liga.id, numero);
    if (!grupo) {
      return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("liga_grupos")
      .update({ cerrado })
      .eq("id", grupo.id);
    if (updateError) throw updateError;

    revalidatePath("/liga");

    return Response.json(
      { message: cerrado ? "Grupo cerrado" : "Grupo reabierto" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al cambiar el estado del grupo" },
      { status: 500 },
    );
  }
}
