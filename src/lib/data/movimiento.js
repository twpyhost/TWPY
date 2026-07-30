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
