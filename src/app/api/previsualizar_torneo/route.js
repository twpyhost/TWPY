import { getAdminUser } from "@/lib/adminAuth";

export async function POST(req) {
  try {
    const { user, isAdmin, error } = await getAdminUser();
    if (error) {
      return Response.json(
        { error: "Ha ocurrido un error al validar la sesion" },
        { status: 500 },
      );
    }

    if (!user) {
      return Response.json(
        { error: "Debes iniciar sesion para cargar torneos" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return Response.json(
        { error: "No tenes permisos para cargar torneos" },
        { status: 403 },
      );
    }

    const { url } = await req.json();
    if (!url) {
      return Response.json({ error: "Se requiere la URL" }, { status: 400 });
    }

    const tournamentId = extractTournamentId(url);
    if (!tournamentId) {
      return Response.json({ error: "URL no valida" }, { status: 400 });
    }

    const apiResponse = await fetchChallongeApi(tournamentId);
    if (!apiResponse) {
      return Response.json(
        { error: "No se pudo conectar con Challonge" },
        { status: 502 },
      );
    }

    if (!apiResponse.ok) {
      const errorMessage = await apiResponse.text();
      return Response.json(
        { error: errorMessage },
        { status: apiResponse.status },
      );
    }

    const data = await apiResponse.json();
    return Response.json(
      { message: "Torneo encontrado exitosamente", data },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al procesar la URL" },
      { status: 500 },
    );
  }
}

function extractTournamentId(url) {
  const regex = /challonge\.com\/(?:es\/)?([a-z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function fetchChallongeApi(tournamentId) {
  const apiKey = process.env.NEXT_PUBLIC_CHALLONGE_API_KEY;
  const apiUrl = `https://api.challonge.com/v1/tournaments/${tournamentId}.json?api_key=${apiKey}&include_participants=1`;

  try {
    return await fetch(apiUrl);
  } catch (error) {
    console.error("Error fetching Challonge API:", error);
    return null;
  }
}
