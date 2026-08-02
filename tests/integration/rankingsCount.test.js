// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
//
// getRankings/getRankingsCount (supabaseDb.js) arman su propio cliente
// interno desde NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (a
// diferencia de puntajes.js, no reciben el cliente como parametro), asi
// que esas vars se fijan en beforeAll, antes de la primera llamada.
import { test, expect } from "@playwright/test";

import {
  getServiceClient,
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_ANON_KEY,
} from "../testSupabase.js";
import {
  getRankings,
  getRankingsCount,
} from "../../src/lib/data/supabaseDb.js";

const TORNEO_ID = 995002;
const TEMPORADA = 9095;

test.describe("getRankingsCount (supabaseDb)", () => {
  let playerIds = [];

  test.beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.SUPABASE_URL || LOCAL_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY;

    const supabase = getServiceClient();

    const { data: juego } = await supabase
      .from("juegos")
      .select("id")
      .ilike("nombre", "Tekken 8")
      .maybeSingle();

    await supabase.from("torneos").insert({
      id: TORNEO_ID,
      nombre: "Torneo Count E2E",
      fecha_inicio: "2095-01-01",
      temporada: TEMPORADA,
      juego_id: juego.id,
    });

    for (const nombre of ["Count E2E Uno", "Count E2E Dos"]) {
      const { data: player } = await supabase
        .from("players")
        .insert({ display_name: nombre })
        .select("id")
        .single();
      playerIds.push(player.id);
    }

    await supabase.from("ranking_snapshots").insert([
      {
        torneo_id: TORNEO_ID,
        player_id: playerIds[0],
        temporada: TEMPORADA,
        puntaje_acumulado: 100,
        posicion_global: 1,
      },
      {
        torneo_id: TORNEO_ID,
        player_id: playerIds[1],
        temporada: TEMPORADA,
        puntaje_acumulado: 50,
        posicion_global: 2,
      },
    ]);
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    await supabase.from("torneos").delete().eq("id", TORNEO_ID);
    for (const id of playerIds) {
      await supabase.from("players").delete().eq("id", id);
    }
  });

  test("cuenta los jugadores rankeados sembrados", async () => {
    const count = await getRankingsCount(String(TEMPORADA));
    expect(count).toBe(2);
  });

  test("coincide con getRankings(temporada).length", async () => {
    const rankings = await getRankings(String(TEMPORADA));
    const count = await getRankingsCount(String(TEMPORADA));
    expect(count).toBe(rankings.length);
  });

  test("devuelve 0 para una temporada sin torneos", async () => {
    const count = await getRankingsCount("8888");
    expect(count).toBe(0);
  });
});
