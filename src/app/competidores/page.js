import CompetidoresBoard from "./CompetidoresBoard";
import { getCompetidores, getRankings } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export default async function CompetidoresPage() {
  const [competidores, rankings] = await Promise.all([getCompetidores(), getRankings()]);
  const rankByName = new Map(rankings.map((r) => [r.challonge_username, r]));

  const roster = competidores.map((competidor) => {
    const rank = rankByName.get(competidor.challonge_username);
    return {
      username: competidor.challonge_username,
      posicion: rank?.posicion ?? null,
      puntaje: rank?.puntaje ?? null,
    };
  });

  return <CompetidoresBoard roster={roster} />;
}
