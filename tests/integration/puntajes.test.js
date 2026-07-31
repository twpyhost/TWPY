// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";
import { reemplazarPuntajes } from "../../src/lib/puntajes.js";

test.describe("reemplazarPuntajes", () => {
  let supabase;
  let juegoId;

  test.beforeEach(async () => {
    supabase = getServiceClient();

    const { data: juego, error } = await supabase
      .from("juegos")
      .insert({ nombre: `Test Game ${Date.now()}-${Math.random()}` })
      .select("id")
      .single();
    expect(error).toBeNull();
    juegoId = juego.id;

    await supabase.from("puntajes_config").insert([
      { juego_id: juegoId, posicion: 1, puntos: 100 },
      { juego_id: juegoId, posicion: 2, puntos: 80 },
      { juego_id: juegoId, posicion: 3, puntos: 65 },
    ]);
  });

  test.afterEach(async () => {
    await supabase.from("puntajes_config").delete().eq("juego_id", juegoId);
    await supabase.from("juegos").delete().eq("id", juegoId);
  });

  test("reemplazo total: borra posiciones que ya no vienen en el payload", async () => {
    // Una fila menos (se quita la 3) y la 2 renumerada a la 5 -- el upsert
    // solo no alcanza para que la vieja posicion 2 y la 3 desaparezcan.
    await reemplazarPuntajes(supabase, juegoId, [
      { posicion: 1, puntos: 120 },
      { posicion: 5, puntos: 30 },
    ]);

    const { data } = await supabase
      .from("puntajes_config")
      .select("posicion, puntos")
      .eq("juego_id", juegoId)
      .order("posicion", { ascending: true });

    expect(data).toEqual([
      { posicion: 1, puntos: 120 },
      { posicion: 5, puntos: 30 },
    ]);
  });
});
