import { getAdminUser } from "@/lib/adminAuth";
import { extractTournamentId, fetchChallongeApi } from "@/lib/challonge";

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

    const { url, cuenta: cuentaBody } = await req.json();
    if (!url) {
      return Response.json({ error: "Se requiere la URL" }, { status: 400 });
    }

    const cuenta = ["A", "B"].includes(cuentaBody) ? cuentaBody : "B";

    const tournamentId = extractTournamentId(url);
    if (!tournamentId) {
      return Response.json({ error: "URL no valida" }, { status: 400 });
    }

    const apiResponse = await fetchChallongeApi(tournamentId, cuenta);
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
