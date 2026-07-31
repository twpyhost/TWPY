// Corre contra `next dev` (levantado por Playwright via webServer, con
// DATA_SOURCE=supabase apuntando al stack local) + datos sembrados aca.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";

const TORNEO_ID = 995001;
const TEMPORADA = 9094;

test.describe("Paginas publicas contra DATA_SOURCE=supabase", () => {
  let playerId;

  test.beforeAll(async () => {
    const supabase = getServiceClient();

    // Defensivo: limpia jugadores huerfanos de una corrida previa que no
    // haya llegado al afterAll (display_name no es unico en `players`).
    await supabase.from("players").delete().eq("display_name", "Jugador E2E");

    const { data: juego } = await supabase
      .from("juegos")
      .select("id")
      .ilike("nombre", "Tekken 8")
      .maybeSingle();

    await supabase.from("torneos").insert({
      id: TORNEO_ID,
      nombre: "Torneo E2E Seed",
      fecha_inicio: "2094-01-01",
      temporada: TEMPORADA,
      juego_id: juego.id,
    });

    const { data: player } = await supabase
      .from("players")
      .insert({ display_name: "Jugador E2E" })
      .select("id")
      .single();
    playerId = player.id;

    await supabase.from("tournament_participants_raw").insert({
      torneo_id: TORNEO_ID,
      nombre_participante: "Jugador E2E",
      posicion: 1,
      puntaje: 100,
      player_id: player.id,
      resolved_at: new Date().toISOString(),
    });

    await supabase.from("ranking_snapshots").insert({
      torneo_id: TORNEO_ID,
      player_id: player.id,
      temporada: TEMPORADA,
      puntaje_acumulado: 100,
      posicion_global: 1,
    });
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    await supabase.from("torneos").delete().eq("id", TORNEO_ID);
    await supabase.from("players").delete().eq("id", playerId);
  });

  test("/torneos carga y lista el torneo sembrado", async ({ page }) => {
    await page.goto("/torneos");
    await expect(
      page.getByRole("heading", { name: "Torneo E2E Seed" }),
    ).toBeVisible();
  });

  test("/ranking carga y muestra el jugador sembrado", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByText("Jugador E2E")).toBeVisible();
  });

  test("/competidores carga y muestra el jugador sembrado", async ({ page }) => {
    await page.goto("/competidores");
    await expect(page.getByText("Jugador E2E").first()).toBeVisible();
  });

  test("/torneo-resultado/[id] ya no da 404 (regresion del bloqueo de RLS)", async ({ page }) => {
    const response = await page.goto(`/torneo-resultado/${TORNEO_ID}`);
    expect(response.status()).toBeLessThan(400);
    await expect(page.getByText("Jugador E2E")).toBeVisible();
  });
});

test.describe("Gate de admin", () => {
  test("un usuario anonimo en /admin/identidades redirige a login", async ({ page }) => {
    await page.goto("/admin/identidades");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
