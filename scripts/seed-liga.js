// Siembra (o actualiza) la Liga Invitacional a partir del fixture versionado
// scripts/data/liga-2026-fixture.json.
//
//   node --env-file=.env.local scripts/seed-liga.js
//
// Idempotente: upsert por slug / (liga_id, numero) / (grupo_id, nombre) /
// (grupo_id, participante_a_id, participante_b_id). NUNCA borra resultados
// ya cargados -- los upserts de liga_partidos no tocan ganador_id,
// cargado_at ni cargado_by; los de liga_grupos no tocan cerrado ni
// cupos_clasificados; los de liga_participantes no tocan player_id ni
// orden_desempate.

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import fixture from "./data/liga-2026-fixture.json" with { type: "json" };

function reventar(error, contexto) {
  if (error) {
    throw new Error(`${contexto}: ${error.message}`);
  }
}

function validarFixture(fixture) {
  if (fixture.fechas.length !== 12) {
    throw new Error(`Se esperaban 12 fechas, hay ${fixture.fechas.length}`);
  }
  if (fixture.grupos.length !== 5) {
    throw new Error(`Se esperaban 5 grupos, hay ${fixture.grupos.length}`);
  }
  let totalPartidos = 0;
  for (const grupo of fixture.grupos) {
    if (grupo.participantes.length !== 7) {
      throw new Error(
        `Grupo ${grupo.numero}: se esperaban 7 participantes, hay ${grupo.participantes.length}`,
      );
    }
    if (grupo.partidos.length !== 21) {
      throw new Error(
        `Grupo ${grupo.numero}: se esperaban 21 partidos, hay ${grupo.partidos.length}`,
      );
    }
    const partidosPorParticipante = new Map(
      grupo.participantes.map((nombre) => [nombre, 0]),
    );
    for (const partido of grupo.partidos) {
      partidosPorParticipante.set(
        partido.a,
        partidosPorParticipante.get(partido.a) + 1,
      );
      partidosPorParticipante.set(
        partido.b,
        partidosPorParticipante.get(partido.b) + 1,
      );
    }
    for (const [nombre, cantidad] of partidosPorParticipante) {
      if (cantidad !== 6) {
        throw new Error(
          `Grupo ${grupo.numero}: ${nombre} tiene ${cantidad} partidos, se esperaban 6`,
        );
      }
    }
    totalPartidos += grupo.partidos.length;
  }
  if (totalPartidos !== 105) {
    throw new Error(`Se esperaban 105 partidos totales, hay ${totalPartidos}`);
  }
}

async function main() {
  validarFixture(fixture);
  const supabase = getSupabaseAdmin();

  console.log("1/4 Liga...");
  const { data: liga, error: ligaError } = await supabase
    .from("ligas")
    .upsert(
      { slug: fixture.slug, nombre: fixture.nombre, temporada: fixture.temporada },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  reventar(ligaError, "upsert de ligas");

  console.log("2/4 Fechas y grupos...");
  const { data: fechas, error: fechasError } = await supabase
    .from("liga_fechas")
    .upsert(
      fixture.fechas.map((f) => ({
        liga_id: liga.id,
        numero: f.numero,
        fecha: f.fecha,
        hora: f.hora,
      })),
      { onConflict: "liga_id,numero" },
    )
    .select("id, numero");
  reventar(fechasError, "upsert de liga_fechas");
  const idPorFecha = new Map(fechas.map((f) => [f.numero, f.id]));

  const { data: grupos, error: gruposError } = await supabase
    .from("liga_grupos")
    .upsert(
      fixture.grupos.map((g) => ({
        liga_id: liga.id,
        numero: g.numero,
        nombre: `Grupo ${g.numero}`,
      })),
      { onConflict: "liga_id,numero" },
    )
    .select("id, numero");
  reventar(gruposError, "upsert de liga_grupos");
  const idPorGrupo = new Map(grupos.map((g) => [g.numero, g.id]));

  console.log("3/4 Participantes...");
  let totalParticipantes = 0;
  const idParticipantePorGrupo = new Map(); // numero grupo -> Map(nombre -> id)
  for (const grupo of fixture.grupos) {
    const grupoId = idPorGrupo.get(grupo.numero);
    const { data: participantes, error: participantesError } = await supabase
      .from("liga_participantes")
      .upsert(
        grupo.participantes.map((nombre) => ({ grupo_id: grupoId, nombre })),
        { onConflict: "grupo_id,nombre" },
      )
      .select("id, nombre");
    reventar(
      participantesError,
      `upsert de liga_participantes (grupo ${grupo.numero})`,
    );
    idParticipantePorGrupo.set(
      grupo.numero,
      new Map(participantes.map((p) => [p.nombre, p.id])),
    );
    totalParticipantes += participantes.length;
  }

  console.log("4/4 Partidos...");
  let totalPartidos = 0;
  for (const grupo of fixture.grupos) {
    const grupoId = idPorGrupo.get(grupo.numero);
    const idPorNombre = idParticipantePorGrupo.get(grupo.numero);
    const { data: partidos, error: partidosError } = await supabase
      .from("liga_partidos")
      .upsert(
        grupo.partidos.map((p) => ({
          grupo_id: grupoId,
          fecha_id: idPorFecha.get(p.fecha),
          participante_a_id: idPorNombre.get(p.a),
          participante_b_id: idPorNombre.get(p.b),
          orden: p.orden,
        })),
        { onConflict: "grupo_id,participante_a_id,participante_b_id" },
      )
      .select("id");
    reventar(partidosError, `upsert de liga_partidos (grupo ${grupo.numero})`);
    totalPartidos += partidos.length;
  }

  console.log(
    `\nListo: liga "${fixture.nombre}" (${fixture.fechas.length} fechas, ` +
      `${fixture.grupos.length} grupos, ${totalParticipantes} participantes, ` +
      `${totalPartidos} partidos).`,
  );
}

await main();
