// Dataset pseudo-real para el Supabase de prueba. NO son datos reales de la
// liga: sirven para verificar el sitio publico y el panel admin end-to-end
// antes del backfill real desde Challonge (Hito 8 del plan de go-live).
//
// Los ids de torneo viven en la banda centinela 800001-800007 para que
// scripts/purgar-datos-prueba.js pueda borrarlos con exactitud.

export const BANDA_TORNEOS = { desde: 800001, hasta: 800099 };

export const TORNEOS = [
  {
    id: 800001,
    nombre: "TWPY Season Opener 2025",
    fecha_inicio: "2025-03-09",
    temporada: 2025,
    url_challonge: "https://challonge.com/es/twpy_opener_2025",
    challonge_source_account: "A",
    participantes: 24,
  },
  {
    id: 800002,
    nombre: "Asunción Dojo Series #1",
    fecha_inicio: "2025-05-18",
    temporada: 2025,
    url_challonge: "https://challonge.com/es/asu_dojo_1",
    challonge_source_account: "A",
    participantes: 18,
  },
  {
    id: 800003,
    nombre: "Iron Fist Friday Vol. 3",
    fecha_inicio: "2025-08-10",
    temporada: 2025,
    url_challonge: "https://challonge.com/es/iron_fist_friday_3",
    challonge_source_account: "A",
    participantes: 28,
  },
  {
    id: 800004,
    nombre: "Mokete Gaming Cup 2025",
    fecha_inicio: "2025-11-16",
    temporada: 2025,
    url_challonge: "https://challonge.com/es/mokete_cup_2025",
    challonge_source_account: "B",
    participantes: 22,
  },
  {
    id: 800005,
    nombre: "TWPY Opening Clash 2026",
    fecha_inicio: "2026-02-15",
    temporada: 2026,
    url_challonge: "https://challonge.com/es/twpy_opening_clash_2026",
    challonge_source_account: "B",
    participantes: 26,
  },
  {
    id: 800006,
    nombre: "Ronin Series #2",
    fecha_inicio: "2026-04-26",
    temporada: 2026,
    url_challonge: "https://challonge.com/es/ronin_series_2",
    challonge_source_account: "B",
    participantes: 20,
  },
  {
    id: 800007,
    nombre: "GG Gaming Fest 2026",
    fecha_inicio: "2026-06-28",
    temporada: 2026,
    url_challonge: "https://challonge.com/es/gg_gaming_fest_2026",
    challonge_source_account: "B",
    participantes: 32,
  },
];

// `nivel` solo sesga la asistencia y el resultado del bracket para que las
// posiciones se vean plausibles (los mismos nombres arriba del podio).
// `cuentas`: la primera es la activa; una segunda entrada modela el
// escenario 2 de CLAUDE.md (mismo jugador, cuenta vieja abandonada).
// `alias_previo`: renombre dentro de la MISMA cuenta de Challonge.
// `sin_cuenta`: escenario 4 (registrado a mano por un admin, sin Challonge).
export const JUGADORES = [
  {
    nick: "Wario",
    nivel: 98,
    cuentas: [
      { challonge_id: 8100001, username: "wario_py" },
      { challonge_id: 8100002, username: "wario_old", active: false },
    ],
  },
  {
    nick: "Fate_py",
    nivel: 96,
    cuentas: [{ challonge_id: 8100003, username: "fate_py" }],
  },
  {
    nick: "Rushador Cuidadoso",
    nivel: 95,
    cuentas: [{ challonge_id: 8100004, username: "rushador" }],
    alias_previo: "denis_twpy",
  },
  {
    nick: "TWPY Rox",
    nivel: 92,
    cuentas: [{ challonge_id: 8100005, username: "twpy_rox" }],
  },
  {
    nick: "Focus_Pocus",
    nivel: 90,
    cuentas: [{ challonge_id: 8100006, username: "focus_pocus" }],
  },
  {
    nick: "ElectricDeni",
    nivel: 89,
    cuentas: [{ challonge_id: 8100007, username: "electricdeni" }],
  },
  {
    nick: "MishimaPy",
    nivel: 87,
    cuentas: [{ challonge_id: 8100008, username: "mishimapy" }],
  },
  {
    nick: "Kazu Asu",
    nivel: 86,
    cuentas: [{ challonge_id: 8100009, username: "kazu_asu" }],
  },
  {
    nick: "JinPy",
    nivel: 85,
    cuentas: [{ challonge_id: 8100010, username: "jinpy" }],
  },
  {
    nick: "DevilRyu",
    nivel: 84,
    cuentas: [{ challonge_id: 8100011, username: "devilryu" }],
  },
  {
    nick: "Chipa Guasu",
    nivel: 82,
    cuentas: [{ challonge_id: 8100012, username: "chipa_guasu" }],
  },
  {
    nick: "Nanawa",
    nivel: 81,
    cuentas: [{ challonge_id: 8100013, username: "nanawa" }],
  },
  {
    nick: "Lambaré King",
    nivel: 80,
    cuentas: [{ challonge_id: 8100014, username: "lambare_king" }],
  },
  {
    nick: "Yvyra",
    nivel: 78,
    cuentas: [{ challonge_id: 8100015, username: "yvyra" }],
  },
  {
    nick: "Guaraní Fist",
    nivel: 77,
    cuentas: [{ challonge_id: 8100016, username: "guarani_fist" }],
  },
  {
    nick: "AsukaMain PY",
    nivel: 75,
    cuentas: [{ challonge_id: 8100017, username: "asukamain_py" }],
  },
  {
    nick: "Tereré",
    nivel: 74,
    cuentas: [{ challonge_id: 8100018, username: "terere" }],
  },
  {
    nick: "Panambi",
    nivel: 72,
    cuentas: [{ challonge_id: 8100019, username: "panambi" }],
  },
  {
    nick: "Encarnaceño",
    nivel: 71,
    cuentas: [{ challonge_id: 8100020, username: "encarnaceno" }],
  },
  {
    nick: "Mbarete",
    nivel: 70,
    cuentas: [{ challonge_id: 8100021, username: "mbarete" }],
  },
  {
    nick: "Luque Law",
    nivel: 68,
    cuentas: [{ challonge_id: 8100022, username: "luque_law" }],
  },
  {
    nick: "Bryan Hachi",
    nivel: 67,
    cuentas: [{ challonge_id: 8100023, username: "bryan_hachi" }],
  },
  {
    nick: "Kuma Fan PY",
    nivel: 65,
    cuentas: [{ challonge_id: 8100024, username: "kuma_fan_py" }],
  },
  {
    nick: "Lili Flow",
    nivel: 64,
    cuentas: [{ challonge_id: 8100025, username: "lili_flow" }],
  },
  {
    nick: "Paul Fénix",
    nivel: 62,
    cuentas: [{ challonge_id: 8100026, username: "paul_fenix" }],
  },
  {
    nick: "Steve CDE",
    nivel: 60,
    cuentas: [{ challonge_id: 8100027, username: "steve_cde" }],
  },
  {
    nick: "Xiaoyu Nena",
    nivel: 58,
    cuentas: [{ challonge_id: 8100028, username: "xiaoyu_nena" }],
  },
  {
    nick: "Dragunov Ka",
    nivel: 56,
    cuentas: [{ challonge_id: 8100029, username: "dragunov_ka" }],
  },
  {
    nick: "Reina Vzla",
    nivel: 54,
    cuentas: [{ challonge_id: 8100030, username: "reina_vzla" }],
  },
  {
    nick: "Yoshi Ykua",
    nivel: 52,
    cuentas: [{ challonge_id: 8100031, username: "yoshi_ykua" }],
  },
  {
    nick: "Leroy Sajonia",
    nivel: 50,
    cuentas: [{ challonge_id: 8100032, username: "leroy_sajonia" }],
  },
  {
    nick: "Víctor Trinidad",
    nivel: 48,
    cuentas: [{ challonge_id: 8100033, username: "victor_trinidad" }],
  },
  {
    nick: "Shaheen PY",
    nivel: 45,
    cuentas: [{ challonge_id: 8100034, username: "shaheen_py" }],
  },
  {
    nick: "Zafina Ovetense",
    nivel: 42,
    cuentas: [{ challonge_id: 8100035, username: "zafina_ovetense" }],
  },

  // Escenario 4: sin cuenta de Challonge, registrados a mano por un admin.
  { nick: "Rodri (registro manual)", nivel: 73, sin_cuenta: true },
  { nick: "Sole FGC (registro manual)", nivel: 55, sin_cuenta: true },
];

// Escenario 5: duplicado ya fusionado. No tiene filas en
// tournament_participants_raw porque la fusion se las reasigno al canonico;
// queda como registro historico + evento en identidad_eventos.
export const DUPLICADO_FUSIONADO = {
  nick: "electric_deni (duplicado)",
  fusionado_en: "ElectricDeni",
};

// Escenario 3: participantes de Challonge que el import no pudo resolver.
// Quedan con player_id null y alimentan la cola de /admin/identidades.
export const SIN_VINCULAR = [
  {
    torneo_id: 800006,
    challonge_id: 8109001,
    challonge_username: "fate_pyy",
    nombre_participante: "Fate_pyy",
    posicion: 9,
  },
  {
    torneo_id: 800006,
    challonge_id: 8109002,
    challonge_username: "elnegro_tkn",
    nombre_participante: "ElNegro TKN",
    posicion: 13,
  },
  {
    torneo_id: 800006,
    challonge_id: null,
    challonge_username: null,
    nombre_participante: "Invitado Ciudad del Este",
    posicion: 17,
  },
  {
    torneo_id: 800007,
    challonge_id: 8109003,
    challonge_username: "roxxx_py",
    nombre_participante: "Roxxx_py",
    posicion: 13,
  },
  {
    torneo_id: 800007,
    challonge_id: 8109004,
    challonge_username: "kingpy2026",
    nombre_participante: "KingPy2026",
    posicion: 17,
  },
  {
    torneo_id: 800007,
    challonge_id: null,
    challonge_username: null,
    nombre_participante: "Jugador anotado en mesa",
    posicion: 25,
  },
];

// Posiciones finales reales de un bracket de doble eliminacion: empatan en
// bloques (5-6, 7-8, 9-12, ...). Cada bloque coincide con una fila de
// puntajes_config, asi que ningun participante queda con puntaje 0.
const BLOQUES = [
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 2],
  [7, 2],
  [9, 4],
  [13, 4],
  [17, 8],
  [25, 8],
];

export const MAX_PARTICIPANTES = BLOQUES.reduce((total, [, n]) => total + n, 0);

export function posicionesBracket(cantidad) {
  const posiciones = [];
  for (const [posicion, repeticiones] of BLOQUES) {
    for (let i = 0; i < repeticiones && posiciones.length < cantidad; i += 1) {
      posiciones.push(posicion);
    }
  }
  return posiciones;
}

// PRNG determinista (mulberry32): el seed corre siempre igual, asi que dos
// ejecuciones del script producen exactamente los mismos resultados.
export function prng(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
