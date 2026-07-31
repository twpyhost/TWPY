// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";
import { recalcularSnapshots } from "../../src/lib/rankings.js";

const TEMPORADA = 9001;
const OTRA_TEMPORADA = 9002;

test.describe("recalcularSnapshots", () => {
  let supabase;
  let juegoId;
  let playerA;
  let playerB;

  test.beforeEach(async () => {
    supabase = getServiceClient();

    const { data: juego, error: juegoError } = await supabase
      .from("juegos")
      .insert({ nombre: `Test Game ${Date.now()}-${Math.random()}` })
      .select("id")
      .single();
    expect(juegoError).toBeNull();
    juegoId = juego.id;

    const { data: players, error: playersError } = await supabase
      .from("players")
      .insert([{ display_name: "Jugador A" }, { display_name: "Jugador B" }])
      .select("id");
    expect(playersError).toBeNull();
    [playerA, playerB] = players;
  });

  test.afterEach(async () => {
    await supabase.from("ranking_snapshots").delete().in("temporada", [TEMPORADA, OTRA_TEMPORADA]);
    await supabase.from("torneos").delete().in("temporada", [TEMPORADA, OTRA_TEMPORADA]);
    await supabase.from("players").delete().in("id", [playerA.id, playerB.id]);
    await supabase.from("juegos").delete().eq("id", juegoId);
  });

  test("acumula puntaje en orden cronologico y ordena por posicion_global", async () => {
    await supabase.from("torneos").insert([
      {
        id: 900001,
        nombre: "T1",
        fecha_inicio: "2090-01-01",
        temporada: TEMPORADA,
        juego_id: juegoId,
      },
      {
        id: 900002,
        nombre: "T2",
        fecha_inicio: "2090-02-01",
        temporada: TEMPORADA,
        juego_id: juegoId,
      },
    ]);

    await supabase.from("tournament_participants_raw").insert([
      { torneo_id: 900001, nombre_participante: "A", posicion: 1, puntaje: 100, player_id: playerA.id },
      { torneo_id: 900001, nombre_participante: "B", posicion: 2, puntaje: 60, player_id: playerB.id },
      { torneo_id: 900002, nombre_participante: "B", posicion: 1, puntaje: 80, player_id: playerB.id },
      { torneo_id: 900002, nombre_participante: "A", posicion: 2, puntaje: 20, player_id: playerA.id },
    ]);

    await recalcularSnapshots(supabase, TEMPORADA);

    const { data: snapshots } = await supabase
      .from("ranking_snapshots")
      .select("torneo_id, player_id, puntaje_acumulado, posicion_global")
      .eq("temporada", TEMPORADA);

    const t1 = snapshots.filter((s) => s.torneo_id === 900001);
    const t2 = snapshots.filter((s) => s.torneo_id === 900002);

    expect(t1.find((s) => s.player_id === playerA.id)).toMatchObject({
      puntaje_acumulado: 100,
      posicion_global: 1,
    });
    expect(t1.find((s) => s.player_id === playerB.id)).toMatchObject({
      puntaje_acumulado: 60,
      posicion_global: 2,
    });

    // Tras T2: B acumula 60+80=140 (#1), A acumula 100+20=120 (#2).
    expect(t2.find((s) => s.player_id === playerB.id)).toMatchObject({
      puntaje_acumulado: 140,
      posicion_global: 1,
    });
    expect(t2.find((s) => s.player_id === playerA.id)).toMatchObject({
      puntaje_acumulado: 120,
      posicion_global: 2,
    });
  });

  test("recalcular una temporada no pisa snapshots de otra temporada", async () => {
    await supabase.from("torneos").insert([
      {
        id: 900010,
        nombre: "OtraTemp",
        fecha_inicio: "2091-01-01",
        temporada: OTRA_TEMPORADA,
        juego_id: juegoId,
      },
      {
        id: 900003,
        nombre: "T3",
        fecha_inicio: "2090-03-01",
        temporada: TEMPORADA,
        juego_id: juegoId,
      },
    ]);

    await supabase.from("ranking_snapshots").insert({
      torneo_id: 900010,
      player_id: playerA.id,
      temporada: OTRA_TEMPORADA,
      puntaje_acumulado: 999,
      posicion_global: 1,
    });

    await supabase.from("tournament_participants_raw").insert({
      torneo_id: 900003,
      nombre_participante: "A",
      posicion: 1,
      puntaje: 10,
      player_id: playerA.id,
    });

    await recalcularSnapshots(supabase, TEMPORADA);

    const { data: otra } = await supabase
      .from("ranking_snapshots")
      .select("puntaje_acumulado, posicion_global")
      .eq("temporada", OTRA_TEMPORADA)
      .eq("torneo_id", 900010)
      .single();

    expect(otra).toMatchObject({ puntaje_acumulado: 999, posicion_global: 1 });
  });
});
