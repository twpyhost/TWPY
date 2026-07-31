// Heuristica simple para sugerir un jugador existente a partir del handle
// de Challonge de un participante sin resolver. Es solo una sugerencia
// (el admin siempre confirma) -- nunca se usa para auto-resolver, eso
// sigue siendo estrictamente por challonge_id (ver importarTorneo.js).
function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Distancia de Levenshtein clasica (matriz completa; los nombres son
// cortos, no hace falta optimizar memoria).
function distanciaLevenshtein(a, b) {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz = Array.from({ length: filas }, (_, i) => [i, ...Array(columnas - 1).fill(0)]);
  for (let j = 0; j < columnas; j += 1) matriz[0][j] = j;

  for (let i = 1; i < filas; i += 1) {
    for (let j = 1; j < columnas; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo,
      );
    }
  }

  return matriz[filas - 1][columnas - 1];
}

// Puntaje 0-100: 100 = coincidencia exacta (normalizada), 0 = totalmente
// distintos. Basado en similitud de Levenshtein sobre el string mas largo.
function puntajeSimilitud(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  const maxLen = Math.max(na.length, nb.length);
  const distancia = distanciaLevenshtein(na, nb);
  return Math.round((1 - distancia / maxLen) * 100);
}

// Dado el handle/nombre de un participante y una lista de jugadores
// candidatos ({ id, display_name }), devuelve el mejor match por encima
// del umbral, o null si no hay ninguno suficientemente parecido.
export function sugerirJugador(nombreParticipante, candidatos, umbral = 55) {
  let mejor = null;

  for (const candidato of candidatos) {
    const score = puntajeSimilitud(nombreParticipante, candidato.display_name);
    if (score >= umbral && (!mejor || score > mejor.score)) {
      mejor = { playerId: candidato.id, name: candidato.display_name, score };
    }
  }

  return mejor;
}
