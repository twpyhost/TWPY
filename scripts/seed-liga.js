// Siembra (o actualiza) la Liga Invitacional a partir del fixture versionado
// scripts/data/liga-2026-fixture.json.
//
//   node --env-file=.env.local scripts/seed-liga.js
//
// Idempotente, nunca borra resultados ya cargados -- ver src/lib/ligaSeed.js
// (logica real, testeada en tests/integration/ligaSeed.test.js).

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { sembrarLiga } from "../src/lib/ligaSeed.js";
import fixture from "./data/liga-2026-fixture.json" with { type: "json" };

const resumen = await sembrarLiga(getSupabaseAdmin(), fixture);

console.log(
  `Listo: liga "${fixture.nombre}" (${resumen.totalFechas} fechas, ` +
    `${resumen.totalGrupos} grupos, ${resumen.totalParticipantes} participantes, ` +
    `${resumen.totalPartidos} partidos).`,
);
