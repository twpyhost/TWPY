// Contra el stack local de Supabase. Verifica el fix del Hito 1: el cliente
// anon no puede leer tournament_participants_raw directamente, solo la vista
// torneo_resultados_publicos, y esta oculta a los jugadores fusionados.
import { test, expect } from "@playwright/test";

import { getAnonClient, getServiceClient } from "../testSupabase.js";

const TORNEO_ID = 910001;

test.describe("RLS de la cola de identidades", () => {
  let service;
  let juegoId;
  let playerVisible;
  let playerFusionado;

  test.beforeAll(async () => {
    service = getServiceClient();

    const { data: juego } = await service
      .from("juegos")
      .insert({ nombre: `RLS Test ${Date.now()}-${Math.random()}` })
      .select("id")
      .single();
    juegoId = juego.id;

    await service.from("torneos").insert({
      id: TORNEO_ID,
      nombre: "RLS Torneo",
      fecha_inicio: "2092-01-01",
      temporada: 9099,
      juego_id: juegoId,
    });

    const { data: players } = await service
      .from("players")
      .insert([{ display_name: "Visible" }, { display_name: "Fusionado" }])
      .select("id");
    [playerVisible, playerFusionado] = players;

    await service.from("tournament_participants_raw").insert([
      {
        torneo_id: TORNEO_ID,
        nombre_participante: "Visible",
        posicion: 1,
        puntaje: 100,
        player_id: playerVisible.id,
        resolved_at: new Date().toISOString(),
      },
      {
        torneo_id: TORNEO_ID,
        nombre_participante: "Fusionado",
        posicion: 2,
        puntaje: 50,
        player_id: playerFusionado.id,
        resolved_at: new Date().toISOString(),
      },
    ]);

    await service
      .from("players")
      .update({ merged_into_player_id: playerVisible.id })
      .eq("id", playerFusionado.id);
  });

  test.afterAll(async () => {
    await service.from("torneos").delete().eq("id", TORNEO_ID);
    await service.from("players").delete().in("id", [playerVisible.id, playerFusionado.id]);
    await service.from("juegos").delete().eq("id", juegoId);
  });

  test("anon no puede leer tournament_participants_raw", async () => {
    const anon = getAnonClient();
    const { data, error } = await anon
      .from("tournament_participants_raw")
      .select("*")
      .eq("torneo_id", TORNEO_ID);

    // Sin privilegio de tabla (revoke) -> error de permisos; en su defecto,
    // 0 filas por falta de policy de select. Cualquiera de los dos es valido.
    expect(error !== null || (data && data.length === 0)).toBe(true);
  });

  test("torneo_resultados_publicos expone solo participantes resueltos y no fusionados", async () => {
    const anon = getAnonClient();
    const { data, error } = await anon
      .from("torneo_resultados_publicos")
      .select("*")
      .eq("torneo_id", TORNEO_ID);

    expect(error).toBeNull();
    const nombres = data.map((r) => r.jugador_nombre);
    expect(nombres).toContain("Visible");
    expect(nombres).not.toContain("Fusionado");
  });

  test("un jugador fusionado no aparece en players para anon", async () => {
    const anon = getAnonClient();
    const { data } = await anon
      .from("players")
      .select("id")
      .eq("id", playerFusionado.id);

    expect(data.length).toBe(0);
  });
});
