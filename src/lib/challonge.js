// Helpers para la API v2.1 de Challonge (solo servidor: usa las API keys de
// cuenta, en modo "legacy v1 key" -- mismas keys de siempre, headers nuevos).
// Ojo: el plan gratuito de Challonge limita a ~500 requests/mes, por eso todo
// se persiste en nuestra BD y las paginas publicas nunca la consultan.
// listarTorneos() pide la lista una vez por cuenta (no un request por
// torneo), para no volar ese limite al sincronizar. v2.1 no tiene un
// equivalente a include_participants=1 de v1, asi que fetchChallongeApi hace
// un segundo request paginado a /participants.json por torneo.
//
// Las respuestas de v2.1 vienen en formato JSON:API (data.attributes,
// relationships con ids en string). Para no tocar importarTorneo.js ni las
// rutas de admin, se normalizan aca mismo de vuelta a la forma plana que
// usaba v1 ({ tournament: { ...,  participants: [{ participant: {...} }] } }).
// El id numerico de Challonge de un participante vive en
// relationships.user.data.id (string) -- hay que convertirlo a Number, ya
// que torneos.id y player_challonge_accounts.challonge_id son bigint y la
// resolucion de identidad matchea por igualdad estricta en un Map.

const BASE_URL = "https://api.challonge.com/v2.1";
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

function headersPara(cuenta) {
  return {
    "Content-Type": "application/vnd.api+json",
    Accept: "application/json",
    "Authorization-Type": "v1",
    Authorization: apiKeyPara(cuenta),
  };
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

function normalizarTorneo(data) {
  const attrs = data.attributes;
  return {
    id: Number(data.id),
    name: attrs.name,
    game_name: attrs.game_name,
    state: attrs.state,
    full_challonge_url: attrs.full_challonge_url,
    url: attrs.url,
    started_at: attrs.timestamps?.started_at,
    completed_at: attrs.timestamps?.completed_at,
    created_at: attrs.timestamps?.created_at,
  };
}

function normalizarParticipante(data) {
  const attrs = data.attributes;
  const challongeUserId = data.relationships?.user?.data?.id;

  return {
    participant: {
      challonge_user_id: challongeUserId ? Number(challongeUserId) : null,
      challonge_username: attrs.username,
      display_name: attrs.name,
      final_rank: attrs.final_rank,
    },
  };
}

// Pagina una respuesta JSON:API. Ojo: la API de Challonge siempre devuelve
// links.next (incluso pasada la ultima pagina), asi que NO sirve como
// condicion de corte -- se para cuando una pagina vuelve sin items, o al
// llegar a meta.count si esta presente.
async function obtenerTodasLasPaginas(urlBase, headers) {
  const items = [];
  let page = 1;

  for (;;) {
    const url = `${urlBase}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Challonge API respondio ${res.status} en ${url}`);
    }

    const body = await res.json();
    const data = body.data || [];
    items.push(...data);

    const total = body.meta?.count;
    if (data.length === 0 || (typeof total === "number" && items.length >= total)) {
      break;
    }

    page += 1;
  }

  return items;
}

export async function fetchChallongeApi(tournamentId, cuenta = "B") {
  const headers = headersPara(cuenta);

  try {
    const res = await fetch(
      `${BASE_URL}/tournaments/${tournamentId}.json`,
      { headers },
    );

    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }

    const { data } = await res.json();

    const participantes = await obtenerTodasLasPaginas(
      `${BASE_URL}/tournaments/${tournamentId}/participants.json?per_page=100`,
      headers,
    );

    const tournament = {
      ...normalizarTorneo(data),
      participants: participantes.map(normalizarParticipante),
    };

    return Response.json({ tournament });
  } catch (error) {
    console.error("Error fetching Challonge API:", error);
    return null;
  }
}

// Lista los torneos de una cuenta (paginado, tipicamente un solo request),
// usada por el boton "Sincronizar" (ver Hito 11 del plan de go-live) para
// detectar torneos nuevos sin pedir uno por uno.
export async function listarTorneos(cuenta = "B") {
  const headers = headersPara(cuenta);

  try {
    const torneos = await obtenerTodasLasPaginas(
      `${BASE_URL}/tournaments.json?per_page=100`,
      headers,
    );

    return Response.json(
      torneos.map((data) => ({ tournament: normalizarTorneo(data) })),
    );
  } catch (error) {
    console.error("Error listing Challonge tournaments:", error);
    return null;
  }
}
