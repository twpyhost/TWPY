import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recalcularSnapshots } from "@/lib/rankings";

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    let temporadas;
    if (body.temporada) {
      temporadas = [Number(body.temporada)];
    } else {
      const { data, error } = await supabase.from("torneos").select("temporada");
      if (error) throw error;
      temporadas = [...new Set(data.map((t) => t.temporada))];
    }

    for (const temporada of temporadas) {
      await recalcularSnapshots(supabase, temporada);
    }

    revalidatePath("/ranking");
    revalidatePath("/competidores");

    return Response.json(
      { message: "Rankings recalculados", temporadas },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al recalcular los rankings" },
      { status: 500 },
    );
  }
}
