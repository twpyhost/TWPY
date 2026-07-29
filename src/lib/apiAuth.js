import { getAdminUser } from "@/lib/adminAuth";

// Chequeo de auth compartido por las rutas de /api/admin/identidades/*
// (mismo orden 500/401/403 que ya usa insertar_torneo/route.js). Devuelve
// { user } si el llamador es admin, o { error: Response } listo para
// devolver tal cual desde el handler.
export async function requireAdmin() {
  const { user, isAdmin, error } = await getAdminUser();

  if (error) {
    return {
      error: Response.json(
        { error: "Ha ocurrido un error al validar la sesion" },
        { status: 500 },
      ),
    };
  }

  if (!user) {
    return {
      error: Response.json(
        { error: "Debes iniciar sesion para realizar esta accion" },
        { status: 401 },
      ),
    };
  }

  if (!isAdmin) {
    return {
      error: Response.json(
        { error: "No tenes permisos para realizar esta accion" },
        { status: 403 },
      ),
    };
  }

  return { user };
}
