import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { consultarPagina, leerPaginacion, POR_PAGINA_LOG } from "@/lib/paginacion";

const TIPO_LABEL = {
  health: "HEALTH",
  backup: "BACKUP",
  torneo_eliminado: "TORNEO",
};

// Historial real de sistema_eventos (a diferencia de /api/admin/sistema,
// que solo trae el ultimo evento por tipo para las tarjetas de estado).
// No hay columna "level" en la tabla -- se deriva de tipo + ok en el
// momento de mostrarlo, no es un dato guardado.
export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const { pagina, porPagina, desde, hasta } = leerPaginacion(searchParams, POR_PAGINA_LOG);

    const supabase = getSupabaseAdmin();

    const { filas: eventos, total } = await consultarPagina(
      ({ head }) =>
        supabase
          .from("sistema_eventos")
          .select("id, tipo, ok, detalle, created_at", { count: "exact", head })
          .order("created_at", { ascending: false }),
      { desde, hasta },
    );

    const resultado = eventos.map((evento) => ({
      id: evento.id,
      time: evento.created_at,
      level: evento.ok ? "OK" : "ERROR",
      tone: evento.ok ? "success" : "error",
      msg: `${TIPO_LABEL[evento.tipo] ?? evento.tipo.toUpperCase()} ${
        evento.ok ? "correcto" : "fallido"
      }${evento.detalle?.nombre ? `: ${evento.detalle.nombre}` : ""}${
        evento.detalle?.error ? `: ${evento.detalle.error}` : ""
      }`,
    }));

    return Response.json(
      { eventos: resultado, total, pagina, porPagina },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener el log de eventos" },
      { status: 500 },
    );
  }
}
