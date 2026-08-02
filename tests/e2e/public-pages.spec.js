// Corre contra `next dev` (levantado por Playwright via webServer, con
// DATA_SOURCE=supabase apuntando al stack local) + datos sembrados aca.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";

const TORNEO_ID = 995001;
const TEMPORADA = 9094;

// Segunda temporada, sembrada solo para que `getFiltroAno()` devuelva 2
// anos y `SeasonTabs` efectivamente se monte en /ranking (con una sola
// temporada, `seasons.length > 1` es false y el tab-switch queda sin
// cobertura). Ver hallazgo de review de fix-round 2.
const TORNEO_ID_ANTERIOR = 995002;
const TEMPORADA_ANTERIOR = 9093;

test.describe("Paginas publicas contra DATA_SOURCE=supabase", () => {
  let playerId;
  let playerIdAnterior;

  test.beforeAll(async () => {
    const supabase = getServiceClient();

    // Defensivo: limpia jugadores huerfanos de una corrida previa que no
    // haya llegado al afterAll (display_name no es unico en `players`).
    await supabase.from("players").delete().eq("display_name", "Jugador E2E");
    await supabase
      .from("players")
      .delete()
      .eq("display_name", "Jugador E2E Temporada Anterior");

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

    // Segundo torneo, en una temporada anterior distinta, con su propio
    // jugador -- para poder distinguir "sigo viendo la temporada vieja" de
    // "cambie de verdad a la nueva" al hacer click en el SeasonTabs.
    await supabase.from("torneos").insert({
      id: TORNEO_ID_ANTERIOR,
      // Nombre deliberadamente distinto (no un prefijo/superstring de
      // "Torneo E2E Seed") para no romper el matching por substring de
      // getByRole("heading", { name: "Torneo E2E Seed" }) en el otro test.
      nombre: "Torneo E2E Otra Temporada",
      fecha_inicio: "2093-01-01",
      temporada: TEMPORADA_ANTERIOR,
      juego_id: juego.id,
    });

    const { data: playerAnterior } = await supabase
      .from("players")
      .insert({ display_name: "Jugador E2E Temporada Anterior" })
      .select("id")
      .single();
    playerIdAnterior = playerAnterior.id;

    await supabase.from("tournament_participants_raw").insert({
      torneo_id: TORNEO_ID_ANTERIOR,
      nombre_participante: "Jugador E2E Temporada Anterior",
      posicion: 1,
      puntaje: 50,
      player_id: playerAnterior.id,
      resolved_at: new Date().toISOString(),
    });

    await supabase.from("ranking_snapshots").insert({
      torneo_id: TORNEO_ID_ANTERIOR,
      player_id: playerAnterior.id,
      temporada: TEMPORADA_ANTERIOR,
      puntaje_acumulado: 50,
      posicion_global: 1,
    });
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    await supabase.from("torneos").delete().eq("id", TORNEO_ID);
    await supabase.from("players").delete().eq("id", playerId);
    await supabase.from("torneos").delete().eq("id", TORNEO_ID_ANTERIOR);
    await supabase.from("players").delete().eq("id", playerIdAnterior);
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

    // Posicion 1 (top-3) debe tener el fondo magenta del diseno, no el
    // zebra-stripe generico.
    const row = page.getByText("Jugador E2E").locator("xpath=..");
    await expect(row).toHaveCSS("background-color", "rgba(245, 10, 100, 0.16)");

    // El contador del hero refleja el conteo rapido (getRankingsCount),
    // no el largo de la tabla con join.
    const counter = page
      .getByText("COMPETIDORES RANKEADOS")
      .locator("xpath=preceding-sibling::span[1]");
    await expect(counter).toHaveText("1");
  });

  test("/ranking cambia de temporada al hacer click en un tab de SeasonTabs", async ({
    page,
  }) => {
    await page.goto("/ranking");

    // Con 2 temporadas sembradas, SeasonTabs se monta y arranca en la mas
    // reciente (TEMPORADA / 9094).
    await expect(page.getByText("Jugador E2E", { exact: true })).toBeVisible();

    // Click en el tab de la temporada anterior -- ejercita el
    // onClick/preventDefault + startTransition/navigate de SeasonTabs y
    // SeasonTransitionProvider, no una navegacion de <a href> normal.
    await page
      .locator(`a[href="/ranking?year=${TEMPORADA_ANTERIOR}"]`)
      .click();

    // La URL se actualiza via router.push dentro de la transicion...
    await expect(page).toHaveURL(new RegExp(`year=${TEMPORADA_ANTERIOR}`));

    // ...y RankingTableBoundary termina mostrando la tabla de la temporada
    // nueva (con el jugador sembrado ahi) en vez de la vieja.
    await expect(
      page.getByText("Jugador E2E Temporada Anterior"),
    ).toBeVisible();
    await expect(
      page.getByText("Jugador E2E", { exact: true }),
    ).not.toBeVisible();
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
