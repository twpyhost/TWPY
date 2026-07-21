// Helpers para la API v1 de Challonge (solo servidor: usa CHALLONGE_API_KEY).
// Ojo: el plan gratuito de Challonge limita a ~500 requests/mes, por eso
// todo se persiste en nuestra BD y las paginas publicas nunca la consultan.

const RESERVED_SUBDOMAINS = ["www", "api", "images", "es"];

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

export async function fetchChallongeApi(tournamentId) {
  const apiKey = process.env.CHALLONGE_API_KEY;
  const apiUrl = `https://api.challonge.com/v1/tournaments/${tournamentId}.json?api_key=${apiKey}&include_participants=1`;

  try {
    return await fetch(apiUrl);
  } catch (error) {
    console.error("Error fetching Challonge API:", error);
    return null;
  }
}
