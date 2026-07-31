// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";
import { eliminarTorneo } from "../../src/lib/torneos.js";
import { recalcularSnapshots } from "../../src/lib/rankings.js";

const TEMPORADA = 9050;
const TORNEO_1 = 920001;
const TORNEO_2 = 920002;

test.describe("eliminarTorneo", () => {
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

    await supabase.from("torneos").insert([
      {
        id: TORNEO_1,
        nombre: "T1",
        fecha_inicio: "2090-01-01",
        temporada: TEMPORADA,
        juego_id: juegoId,
      },
      {
        id: TORNEO_2,
        nombre: "T2",
        fecha_inicio: "2090-02-01",
        temporada: TEMPORADA,
        juego_id: juegoId,
      },
    ]);

    await supabase.from("tournament_participants_raw").insert([
      { torneo_id: TORNEO_1, nombre_participante: "A", posicion: 1, puntaje: 100, player_id: playerA.id },
      { torneo_id: TORNEO_1, nombre_participante: "B", posicion: 2, puntaje: 60, player_id: playerB.id },
      { torneo_id: TORNEO_2, nombre_participante: "B", posicion: 1, puntaje: 80, player_id: playerB.id },
      { torneo_id: TORNEO_2, nombre_participante: "A", posicion: 2, puntaje: 20, player_id: playerA.id },
    ]);

    // Snapshots "ya calculados" como si T1 y T2 hubieran sido importados
    // normalmente -- lo que eliminarTorneo tiene que corregir al borrar T1.
    await recalcularSnapshots(supabase, TEMPORADA);
  });

  test.afterEach(async () => {
    await supabase.from("ranking_snapshots").delete().eq("temporada", TEMPORADA);
    await supabase.from("torneos").delete().in("id", [TORNEO_1, TORNEO_2]);
    await supabase.from("players").delete().in("id", [playerA.id, playerB.id]);
    await supabase.from("juegos").delete().eq("id", juegoId);
  });

  test("borra el torneo y cascadea participantes + snapshots propios", async () => {
    const resultado = await eliminarTorneo(supabase, TORNEO_1);
    expect(resultado).toMatchObject({ nombre: "T1", temporada: TEMPORADA });

    const { data: torneo } = await supabase
      .from("torneos")
      .select("id")
      .eq("id", TORNEO_1)
      .maybeSingle();
    expect(torneo).toBeNull();

    const { data: participantes } = await supabase
      .from("tournament_participants_raw")
      .select("id")
      .eq("torneo_id", TORNEO_1);
    expect(participantes).toEqual([]);

    const { data: snapshotsT1 } = await supabase
      .from("ranking_snapshots")
      .select("player_id")
      .eq("torneo_id", TORNEO_1);
    expect(snapshotsT1).toEqual([]);
  });

  test("recalcula los snapshots del torneo restante de la misma temporada", async () => {
    // Antes del delete, tras T2: B acumula 60+80=140 (#1), A 100+20=120 (#2).
    const { data: antes } = await supabase
      .from("ranking_snapshots")
      .select("player_id, puntaje_acumulado, posicion_global")
      .eq("torneo_id", TORNEO_2);
    expect(antes.find((s) => s.player_id === playerB.id)).toMatchObject({
      puntaje_acumulado: 140,
      posicion_global: 1,
    });

    await eliminarTorneo(supabase, TORNEO_1);

    // Sin T1, T2 pasa a ser el unico torneo de la temporada: B acumula 80
    // (#1), A acumula 20 (#2) -- si eliminarTorneo no recalculara, estos
    // valores quedarian stale en 140/120.
    const { data: despues } = await supabase
      .from("ranking_snapshots")
      .select("player_id, puntaje_acumulado, posicion_global")
      .eq("torneo_id", TORNEO_2);

    expect(despues.find((s) => s.player_id === playerB.id)).toMatchObject({
      puntaje_acumulado: 80,
      posicion_global: 1,
    });
    expect(despues.find((s) => s.player_id === playerA.id)).toMatchObject({
      puntaje_acumulado: 20,
      posicion_global: 2,
    });
  });

  test("torneo inexistente devuelve null sin lanzar", async () => {
    const resultado = await eliminarTorneo(supabase, 999999999);
    expect(resultado).toBeNull();
  });
});
