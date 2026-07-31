// Icono + color por tipo de movimiento, compartido entre el ranking
// publico y el admin (antes duplicado en ambos archivos).
export const TREND = {
  SUBE: { icon: "▲", className: "text-success" },
  BAJA: { icon: "▼", className: "text-error" },
  IGUAL: { icon: "=", className: "text-white/40" },
  NUEVO: { icon: "★", className: "text-tekken-blue-400" },
};

export function getMovimiento(currentPosition, previousPosition) {
  if (!previousPosition) {
    return "NUEVO";
  }

  if (currentPosition < previousPosition) {
    return "SUBE";
  }

  if (currentPosition > previousPosition) {
    return "BAJA";
  }

  return "IGUAL";
}
