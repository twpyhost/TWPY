import { getTorneos } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Excluye /admin/*, /auth/*, /error y /no-autorizado -- ninguna de esas
// paginas debe indexarse (ver robots.js).
export default async function sitemap() {
  const torneos = await getTorneos();

  const estaticas = ["", "/torneos", "/ranking", "/competidores", "/reglamento"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const resultados = torneos.map((torneo) => ({
    url: `${SITE_URL}/torneo-resultado/${torneo.torneo_id}`,
    lastModified: torneo.fecha_torneo ? new Date(torneo.fecha_torneo) : new Date(),
  }));

  return [...estaticas, ...resultados];
}
