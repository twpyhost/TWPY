// Helpers para la API v1 de Challonge (solo servidor: usa las API keys de
// cuenta). Ojo: el plan gratuito de Challonge limita a ~500 requests/mes,
// por eso todo se persiste en nuestra BD y las paginas publicas nunca la
// consultan. listarTorneos() pide la lista una vez por cuenta (no un
// request por torneo), para no volar ese limite al sincronizar.

const RESERVED_SUBDOMAINS = ["www", "api", "images", "es"];

// Dos cuentas organizadoras: A es la historica (torneos previos a este
// proyecto, backfill unico), B es la actual/default para todo lo nuevo.
function apiKeyPara(cuenta = "B") {
  if (cuenta === "A") {
    return process.env.CHALLONGE_API_KEY_A;
  }

  // Fallback a la variable vieja para no romper entornos ya configurados
  // que todavia no migraron a las claves separadas por cuenta.
  return process.env.CHALLONGE_API_KEY_B || process.env.CHALLONGE_API_KEY;
}

// Acepta challonge.com/slug, challonge.com/es/slug y org.challonge.com/slug
// (los torneos de organizaciones se consultan como "org-slug" en la API).
export function extractTournamentId(url) {
  const match = url.match(
    /(?:https?:\/\/)?(?:([\w-]+)\.)?challonge\.com\/(?:[a-z]{2}\/)?([A-Za-z0-9_]+)/i,
  );

  if (!match) {
    return null;
  }

  const [, subdomain, slug] = match;
  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return `${subdomain}-${slug}`;
  }

  return slug;
}

export async function fetchChallongeApi(tournamentId, cuenta = "B") {
  const apiKey = apiKeyPara(cuenta);
  const apiUrl = `https://api.challonge.com/v1/tournaments/${tournamentId}.json?api_key=${apiKey}&include_participants=1`;

  try {
    return await fetch(apiUrl);
  } catch (error) {
    console.error("Error fetching Challonge API:", error);
    return null;
  }
}

// Lista los torneos de una cuenta (un solo request), usada por el boton
// "Sincronizar" (ver Hito 11 del plan de go-live) para detectar torneos
// nuevos sin pedir uno por uno.
export async function listarTorneos(cuenta = "B") {
  const apiKey = apiKeyPara(cuenta);
  const apiUrl = `https://api.challonge.com/v1/tournaments.json?api_key=${apiKey}`;

  try {
    return await fetch(apiUrl);
  } catch (error) {
    console.error("Error listing Challonge tournaments:", error);
    return null;
  }
}
