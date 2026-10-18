import { getTournamentCardSource } from "@/lib/data";
import { buildTournamentCardData, parseCardRequest } from "@/lib/shareCards";
import { renderShareCard } from "@/lib/renderShareCard";

export const runtime = "nodejs";
export async function GET(request, { params }) {
  const { id } = await params;
  const selection = parseCardRequest(id, new URL(request.url), "torneo");
  if (!selection)
    return Response.json({ error: "Parámetros no válidos" }, { status: 400 });
  try {
    const source = await getTournamentCardSource(id);
    if (!source)
      return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
    const data = buildTournamentCardData(source);
    return await renderShareCard({
      type: "torneo",
      id,
      data,
      format: selection.format,
      request,
    });
  } catch (error) {
    console.error("Error al generar tarjeta de torneo", error);
    return Response.json(
      { error: "No se pudo generar la imagen" },
      { status: 500 },
    );
  }
}
