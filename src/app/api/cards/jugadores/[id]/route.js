import {
  getPlayerProfile,
  getPlayerRankingHistory,
  getFiltroAno,
} from "@/lib/data";
import { buildPlayerSeasonCardData, parseCardRequest } from "@/lib/shareCards";
import { renderShareCard } from "@/lib/renderShareCard";

export const runtime = "nodejs";
export async function GET(request, { params }) {
  const { id } = await params;
  const selection = parseCardRequest(id, new URL(request.url), "jugador");
  if (!selection)
    return Response.json({ error: "Parámetros no válidos" }, { status: 400 });
  try {
    if (!(await getFiltroAno()).includes(selection.year))
      return Response.json(
        { error: "Temporada no encontrada" },
        { status: 404 },
      );
    const profile = await getPlayerProfile(id, selection.year);
    if (!profile)
      return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    const history = await getPlayerRankingHistory(id, selection.year);
    const data = buildPlayerSeasonCardData(profile, history);
    return await renderShareCard({
      type: "jugador",
      id,
      data,
      format: selection.format,
      request,
    });
  } catch (error) {
    console.error("Error al generar tarjeta de jugador", error);
    return Response.json(
      { error: "No se pudo generar la imagen" },
      { status: 500 },
    );
  }
}
