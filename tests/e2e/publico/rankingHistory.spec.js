import { test, expect } from "@playwright/test";
import { getServiceClient } from "../../testSupabase.js";
import { TEMPORADA_ACTUAL, TEMPORADA_ANTERIOR, TORNEO_PREVIO, TORNEO_ACTUAL, nombreJugador } from "../fixtures/datos.js";

test("el selector conserva la seleccion solicitada y permite cambiar de idea durante la carga", async ({ page }) => {
  await page.goto(`/ranking?year=${TEMPORADA_ACTUAL}&torneo=${TORNEO_PREVIO}`);
  const selector = page.getByLabel("Ranking después del torneo");
  await expect(selector).toHaveValue(String(TORNEO_PREVIO));
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route("**/ranking?**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("torneo") === String(TORNEO_ACTUAL) && url.searchParams.has("_rsc")) await held;
    await route.continue();
  });
  try {
    const requested = page.waitForRequest(request => request.url().includes(`torneo=${TORNEO_ACTUAL}`) && request.url().includes("_rsc="));
    await selector.selectOption(String(TORNEO_ACTUAL));
    await requested;
    expect(await selector.inputValue()).toBe(String(TORNEO_ACTUAL));
    await selector.selectOption(String(TORNEO_PREVIO));
    release();
    await expect(page).toHaveURL(new RegExp(`torneo=${TORNEO_PREVIO}`));
    await expect(selector).toHaveValue(String(TORNEO_PREVIO));
  } finally { release(); await page.unrouteAll({ behavior: "wait" }); }
});

test("corte copiado, cambio sin navegacion redundante y atras/adelante", async ({ page }) => {
  await page.goto(`/ranking?year=${TEMPORADA_ACTUAL}&torneo=${TORNEO_PREVIO}`);
  const selector = page.getByLabel("Ranking después del torneo");
  await expect(selector).toHaveValue(String(TORNEO_PREVIO));
  await expect(page.getByText("Torneo E2E Previo", { exact: true }).last()).toBeVisible();
  await selector.selectOption(String(TORNEO_ACTUAL));
  await expect(page).toHaveURL(new RegExp(`torneo=${TORNEO_ACTUAL}`));
  let navigations = 0;
  page.on("request", request => { if (request.url().includes("_rsc=")) navigations++; });
  await selector.selectOption(String(TORNEO_ACTUAL));
  expect(navigations).toBe(0);
  await page.goBack();
  await expect(selector).toHaveValue(String(TORNEO_PREVIO));
  await page.goForward();
  await expect(selector).toHaveValue(String(TORNEO_ACTUAL));
  await page.getByRole("link", { name: new RegExp(String(TEMPORADA_ANTERIOR)) }).click();
  await expect(page).not.toHaveURL(/torneo=/);
});

test("corte de otra temporada o inexistente no muestra el ranking actual", async ({ page }) => {
  for (const id of [String(TORNEO_PREVIO), "not-an-id"]) {
    await page.goto(`/ranking?year=${TEMPORADA_ANTERIOR}&torneo=${id}`);
    await expect(page.getByRole("status").filter({ hasText: "Corte no válido" })).toBeVisible();
    await expect(page.getByRole("link", { name: nombreJugador(1), exact: true })).toHaveCount(0);
  }
});

test("un torneo sin snapshots muestra datos no disponibles", async ({ page }) => {
  const service = getServiceClient();
  const game = await service.from("juegos").select("id").ilike("nombre", "Tekken 8").single().throwOnError();
  try {
    await service.from("torneos").insert({ id: 994100, temporada: TEMPORADA_ACTUAL, nombre: "Sin snapshot",
      fecha_inicio: "2086-01-01", juego_id: game.data.id }).throwOnError();
    await page.goto(`/ranking?year=${TEMPORADA_ACTUAL}&torneo=994100`);
    await expect(page.getByRole("status").filter({ hasText: "Historial no disponible" })).toBeVisible();
    await expect(page.getByText("0 pts", { exact: true })).toHaveCount(0);
  } finally { await service.from("torneos").delete().eq("id", 994100).throwOnError(); }
});

test("perfil muestra tabla y grafico de historial accesibles en movil", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const player = await getServiceClient().from("players").select("id").eq("display_name", nombreJugador(1)).single().throwOnError();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/competidores/${player.data.id}?year=${TEMPORADA_ACTUAL}`);
  await expect(page.getByRole("table", { name: "Evolución del ranking" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Posición del jugador después de cada torneo" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: ".superpowers/ranking-history-mobile.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".superpowers/ranking-history-desktop.png", fullPage: true, animations: "disabled" });
});
