import { getTorneos, getCompetidores } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Excluye /admin/*, /auth/*, /error y /no-autorizado -- ninguna de esas
// paginas debe indexarse (ver robots.js).
export default async function sitemap() {
  const [torneos, competidores] = await Promise.all([getTorneos(), getCompetidores()]);

  const estaticas = ["", "/torneos", "/ranking", "/liga", "/competidores", "/reglamento"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const resultados = torneos.map((torneo) => ({
    url: `${SITE_URL}/torneo-resultado/${torneo.torneo_id}`,
    lastModified: torneo.fecha_torneo ? new Date(torneo.fecha_torneo) : new Date(),
  }));

  return [...estaticas, ...resultados, ...competidores.map((player) => ({ url: `${SITE_URL}/competidores/${player.id}` }))];
}
