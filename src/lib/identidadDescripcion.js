// Traduce un evento de identidad_eventos a una descripcion legible + la
// lista de cuentas de Challonge involucradas, para el log de "Actividad
// reciente" del panel admin. Funcion pura: toda la info sale de
// `evento.detalle`, que la ruta /api/admin/identidades/resumen enriquece de
// antemano con nombres/usernames resueltos via lookup (ver esa ruta) para
// que los eventos guardados antes de este cambio tambien se vean bien.
export const ETIQUETAS_EVENTO = {
  vincular: "Vinculación",
  crear_jugador: "Jugador creado",
  registrar_manual: "Registro manual",
  fusionar: "Fusión",
  deshacer: "Deshecho",
  editar_jugador: "Perfil editado",
  cambiar_cuenta_activa: "Cuenta activa cambiada",
  eliminar_cuenta_challonge: "Cuenta desvinculada",
};

function nombreJugador(detalle, campoId, campoNombre) {
  if (detalle?.[campoNombre]) return detalle[campoNombre];
  if (detalle?.[campoId]) return `#${detalle[campoId]}`;
  return "jugador desconocido";
}

function nombreOrigen(detalle) {
  return detalle?.challonge_username || detalle?.nombre_participante || "participante sin nombre";
}

function cuentaDe(detalle) {
  if (!detalle?.challonge_id) return [];
  return [
    {
      challonge_id: detalle.challonge_id,
      challonge_username: detalle.challonge_username ?? null,
    },
  ];
}

export function describirEvento(evento) {
  const tipo = evento?.tipo;
  const detalle = evento?.detalle ?? {};

  switch (tipo) {
    case "vincular": {
      const n = detalle.participante_ids?.length ?? 1;
      const sufijo = n > 1 ? ` (${n} participaciones)` : "";
      return {
        descripcion: `${nombreOrigen(detalle)} → ${nombreJugador(detalle, "player_id", "display_name")}${sufijo}`,
        cuentas: cuentaDe(detalle),
      };
    }
    case "crear_jugador":
      return {
        descripcion: `${nombreOrigen(detalle)} → nuevo jugador ${nombreJugador(detalle, "player_id", "display_name")}`,
        cuentas: cuentaDe(detalle),
      };
    case "registrar_manual":
      return {
        descripcion: `${nombreJugador(detalle, "player_id", "display_name")} registrado sin cuenta de Challonge`,
        cuentas: [],
      };
    case "fusionar": {
      const base = nombreJugador(detalle, "base_player_id", "base_display_name");
      const duplicado = nombreJugador(detalle, "duplicate_player_id", "duplicate_display_name");
      const cuentas = detalle.cuentas_reasignadas ?? 0;
      const resultados = detalle.participantes_reasignados ?? 0;
      const conflictos = detalle.conflictos?.length ?? 0;
      let descripcion = `${base} absorbió a ${duplicado} · ${cuentas} cuentas y ${resultados} resultados reasignados`;
      if (conflictos > 0) descripcion += ` · ${conflictos} conflictos`;
      return { descripcion, cuentas: [] };
    }
    case "deshacer":
      return {
        descripcion: `Revertido: ${ETIQUETAS_EVENTO[detalle.tipo_original] ?? detalle.tipo_original ?? "evento"}`,
        cuentas: [],
      };
    case "editar_jugador": {
      const campos = detalle.cambios ? Object.keys(detalle.cambios) : [];
      return {
        descripcion: `${nombreJugador(detalle, "player_id", "display_name")} · campos: ${
          campos.length ? campos.join(", ") : "sin cambios"
        }`,
        cuentas: [],
      };
    }
    case "cambiar_cuenta_activa":
      return {
        descripcion: `Cuenta activa de ${nombreJugador(detalle, "player_id", "display_name")} cambiada`,
        cuentas: cuentaDe(detalle),
      };
    case "eliminar_cuenta_challonge":
      return {
        descripcion: `Cuenta desvinculada de ${nombreJugador(detalle, "player_id", "display_name")}`,
        cuentas: cuentaDe(detalle),
      };
    default:
      return { descripcion: "", cuentas: [] };
  }
}
