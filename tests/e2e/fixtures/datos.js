// Constantes de los datos sembrados para la suite e2e.
//
// Banda de ids reservada: 996xxx para torneos, temporadas 9084-9086. Se eligio
// una banda propia porque 995xxx ya lo usan tests/integration/* y hoy no chocan
// solo gracias a `fullyParallel: false`. Las fechas van al futuro lejano para
// que ningun dato real de la comunidad se mezcle ni cambie el orden.
//
// Ver docs/qa/plan-de-pruebas.md para el registro de bandas.

export const TORNEO_ACTUAL = 996001; // temporada 9086, el mas reciente
export const TORNEO_PREVIO = 996002; // temporada 9086, anterior (da tendencias)
export const TORNEO_VIEJO = 996003; // temporada 9085, una sola temporada mas

export const TEMPORADA_ACTUAL = 9086;
export const TEMPORADA_ANTERIOR = 9085;
// Temporada que NO existe: para el caso de ?year= fuera de rango.
export const TEMPORADA_INEXISTENTE = 9084;

export const FECHA_ACTUAL = "2086-06-01";
export const FECHA_PREVIA = "2086-03-01";
export const FECHA_VIEJA = "2085-03-01";

// 45 jugadores: con 20 por pagina da 3 paginas y la ultima parcial (5), que es
// justo el valor limite que interesa probar.
export const CANTIDAD_JUGADORES = 45;
export const PREFIJO_JUGADOR = "E2E Jugador";

// Los tres primeros de la temporada anterior, para distinguir "cambie de
// temporada de verdad" de "sigo viendo la vieja".
export const JUGADORES_TEMPORADA_ANTERIOR = 3;

export const ADMIN_EMAIL = "e2e-admin@twpy.test";
export const ADMIN_PASSWORD = "e2e-admin-password-1234";

export function nombreJugador(indice) {
  return `${PREFIJO_JUGADOR} ${String(indice).padStart(2, "0")}`;
}
