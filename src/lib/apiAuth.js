import { getAdminUser } from "@/lib/adminAuth";

// Chequeo de auth compartido por las rutas de /api/admin/* (mismo orden
// 500/401/403 que ya usa insertar_torneo/route.js). Devuelve { user } si el
// llamador tiene el permiso pedido, o { error: Response } listo para devolver
// tal cual desde el handler.
async function requirePermiso(permitido) {
  const { user, isAdmin, isLiga, error } = await getAdminUser();

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

  if (!permitido({ isAdmin, isLiga })) {
    return {
      error: Response.json(
        { error: "No tenes permisos para realizar esta accion" },
        { status: 403 },
      ),
    };
  }

  return { user };
}

// Solo superusuario (rol 'admin'): identidades, jugadores, torneos, rankings
// y sistema.
export async function requireAdmin() {
  return requirePermiso(({ isAdmin }) => isAdmin);
}

// Superusuario o rol 'liga': todo lo que cuelga de /api/admin/liga.
export async function requireLiga() {
  return requirePermiso(({ isLiga }) => isLiga);
}
