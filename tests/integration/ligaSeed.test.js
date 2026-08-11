// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";
import { sembrarLiga } from "../../src/lib/ligaSeed.js";
import fixtureReal from "../../scripts/data/liga-2026-fixture.json" with { type: "json" };

test.describe("sembrarLiga", () => {
  let supabase;
  let fixture;
  let ligaId;

  test.beforeEach(async () => {
    supabase = getServiceClient();
    // Mismo fixture real (5 grupos de 7, round-robin completo) pero con un
    // slug propio del test para no pisar la liga real si ya esta sembrada.
    fixture = { ...fixtureReal, slug: `liga-test-${Date.now()}-${Math.random()}` };
  });

  test.afterEach(async () => {
    if (ligaId) {
      // fechas/grupos/participantes/partidos caen por cascade.
      await supabase.from("ligas").delete().eq("id", ligaId);
      ligaId = null;
    }
  });

  test("produce 5 grupos, 35 participantes, 105 partidos, 12 fechas y 6 partidos por participante", async () => {
    const resumen = await sembrarLiga(supabase, fixture);
    ligaId = resumen.ligaId;

    expect(resumen.totalFechas).toBe(12);
    expect(resumen.totalGrupos).toBe(5);
    expect(resumen.totalParticipantes).toBe(35);
    expect(resumen.totalPartidos).toBe(105);

    const { data: grupos } = await supabase
      .from("liga_grupos")
      .select("id")
      .eq("liga_id", ligaId);
    expect(grupos).toHaveLength(5);

    const { data: partidos } = await supabase
      .from("liga_partidos")
      .select("id, participante_a_id, participante_b_id")
      .in(
        "grupo_id",
        grupos.map((g) => g.id),
      );
    expect(partidos).toHaveLength(105);

    const partidosPorParticipante = new Map();
    for (const p of partidos) {
      partidosPorParticipante.set(
        p.participante_a_id,
        (partidosPorParticipante.get(p.participante_a_id) ?? 0) + 1,
      );
      partidosPorParticipante.set(
        p.participante_b_id,
        (partidosPorParticipante.get(p.participante_b_id) ?? 0) + 1,
      );
    }
    expect(partidosPorParticipante.size).toBe(35);
    for (const cantidad of partidosPorParticipante.values()) {
      expect(cantidad).toBe(6);
    }
  });

  test("re-correrlo no borra un resultado ya cargado (ganador ni marcador)", async () => {
    const primeraCorrida = await sembrarLiga(supabase, fixture);
    ligaId = primeraCorrida.ligaId;

    const { data: unPartido } = await supabase
      .from("liga_partidos")
      .select("id, participante_a_id, participante_b_id")
      .eq(
        "grupo_id",
        (
          await supabase
            .from("liga_grupos")
            .select("id")
            .eq("liga_id", ligaId)
            .eq("numero", 1)
            .single()
        ).data.id,
      )
      .limit(1)
      .single();

    // A gana 3-1: el marcador tiene que sobrevivir al re-seed igual que el
    // ganador (los upserts de liga_partidos no tocan ninguna de las tres).
    await supabase
      .from("liga_partidos")
      .update({ ganador_id: unPartido.participante_a_id, matches_a: 3, matches_b: 1 })
      .eq("id", unPartido.id);

    const segundaCorrida = await sembrarLiga(supabase, fixture);
    expect(segundaCorrida.totalPartidos).toBe(105);
    expect(segundaCorrida.totalParticipantes).toBe(35);

    const { data: partidoTrasReseed } = await supabase
      .from("liga_partidos")
      .select("ganador_id, matches_a, matches_b")
      .eq("id", unPartido.id)
      .single();
    expect(partidoTrasReseed.ganador_id).toBe(unPartido.participante_a_id);
    expect(partidoTrasReseed.matches_a).toBe(3);
    expect(partidoTrasReseed.matches_b).toBe(1);
  });

  test("la constraint rechaza un marcador que no es first-to-3", async () => {
    const primeraCorrida = await sembrarLiga(supabase, fixture);
    ligaId = primeraCorrida.ligaId;

    const { data: unPartido } = await supabase
      .from("liga_partidos")
      .select("id, participante_a_id")
      .eq(
        "grupo_id",
        (
          await supabase
            .from("liga_grupos")
            .select("id")
            .eq("liga_id", ligaId)
            .eq("numero", 1)
            .single()
        ).data.id,
      )
      .limit(1)
      .single();

    // 3-3 no es un resultado valido de un first-to-3.
    const { error: errorMarcador } = await supabase
      .from("liga_partidos")
      .update({ ganador_id: unPartido.participante_a_id, matches_a: 3, matches_b: 3 })
      .eq("id", unPartido.id);
    expect(errorMarcador).not.toBeNull();

    // Ganador sin marcador tampoco: las tres columnas van juntas.
    const { error: errorSinMarcador } = await supabase
      .from("liga_partidos")
      .update({ ganador_id: unPartido.participante_a_id, matches_a: null, matches_b: null })
      .eq("id", unPartido.id);
    expect(errorSinMarcador).not.toBeNull();
  });
});
