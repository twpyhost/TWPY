import CompetidoresBoard from "./CompetidoresBoard";
import { getCompetidores, getFiltroAno, getRankings } from "../utils/db";
import { withMinDelay } from "@/lib/withMinDelay";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export default async function CompetidoresPage() {
  const [competidores, rankings, anos] = await withMinDelay(
    Promise.all([getCompetidores(), getRankings(), getFiltroAno()]),
  );
  const temporada = anos[0] ?? String(new Date().getFullYear());
  const rankByPlayerId = new Map(rankings.map((r) => [r.id, r]));

  const roster = competidores.map((competidor) => {
    const rank = rankByPlayerId.get(competidor.id);
    return {
      id: competidor.id,
      username: competidor.nombre,
      posicion: rank?.posicion ?? null,
      puntaje: rank?.puntaje ?? null,
    };
  });

  return <CompetidoresBoard roster={roster} temporada={temporada} />;
}
