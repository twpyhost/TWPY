import { test, expect } from "@playwright/test";
import { getServiceClient } from "../../testSupabase.js";
import {
  nombreJugador,
  TEMPORADA_ACTUAL,
  TORNEO_ACTUAL,
} from "../fixtures/datos.js";

test.describe("public canonical player profiles", () => {
  let player, oldId, ligaId, emptyId;
  const longName = "TWPY | Ñandutí y el campeonato de los puños de hierro · " .repeat(4).trim();
  test.beforeAll(async () => {
    const service = getServiceClient();
    const result = await service
      .from("players")
      .select("id")
      .eq("display_name", nombreJugador(1))
      .single();
    if (result.error) throw result.error;
    player = result.data;
    const old = await service
      .from("players")
      .insert({
        display_name: "Profile E2E old identity",
        merged_into_player_id: player.id,
      })
      .select("id")
      .single();
    if (old.error) throw old.error;
    oldId = old.data.id;
    const empty = await service.from("players").insert({ display_name: longName, avatar_url: "/images/missing-profile.webp" }).select("id").single().throwOnError();
    emptyId = empty.data.id;
    const league = await service
      .from("ligas")
      .insert({
        slug: "liga-invitacional-2026",
        nombre: "Liga profile navigation",
        temporada: 2026,
      })
      .select("id")
      .single()
      .throwOnError();
    ligaId = league.data.id;
    const group = await service
      .from("liga_grupos")
      .insert({ liga_id: ligaId, numero: 1, nombre: "Grupo perfil" })
      .select("id")
      .single()
      .throwOnError();
    await service
      .from("liga_participantes")
      .insert([
        {
          grupo_id: group.data.id,
          nombre: "Linked league participant",
          player_id: player.id,
        },
        { grupo_id: group.data.id, nombre: "Unlinked league participant" },
      ])
      .throwOnError();
  });
  test.afterAll(async () => {
    if (ligaId)
      await getServiceClient()
        .from("ligas")
        .delete()
        .eq("id", ligaId)
        .throwOnError();
    if (oldId)
      await getServiceClient()
        .from("players")
        .delete()
        .eq("id", oldId)
        .throwOnError();
    if (emptyId) await getServiceClient().from("players").delete().eq("id", emptyId).throwOnError();
  });

  for (const path of [
    "/competidores",
    `/ranking?year=${TEMPORADA_ACTUAL}`,
    `/torneo-resultado/${TORNEO_ACTUAL}`,
  ]) {
    test(`anonymous navigation from ${path}`, async ({ page }) => {
      await page.goto(path);
      await page
        .getByRole("link", { name: nombreJugador(1), exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/competidores/${player.id}`));
      await expect(
        page.getByRole("heading", { level: 1, name: nombreJugador(1) }),
      ).toBeVisible();
      await expect(page.getByText("Main por confirmar")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Historial de torneos" }),
      ).toBeVisible();
    });
  }
  test("Liga links only participants with a canonical player", async ({
    page,
  }) => {
    await page.goto("/liga");
    await expect(
      page.getByRole("link", {
        name: "Unlinked league participant",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Unlinked league participant", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Linked league participant", exact: true })
      .click();
    await expect(page).toHaveURL(`/competidores/${player.id}`);
  });
  test("old IDs redirect, unknown IDs and malformed IDs return 404", async ({
    page,
  }) => {
    await page.goto(`/competidores/${oldId}`);
    await expect(page).toHaveURL(`/competidores/${player.id}`);
    expect(
      (await page.goto("/competidores/9223372036854775807")).status(),
    ).toBe(404);
    expect((await page.goto("/competidores/not-an-id")).status()).toBe(404);
  });
  test("profile has no horizontal page overflow at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/competidores/${player.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: ".superpowers/sdd/2026-10-16-community-growth-roadmap/profile-mobile.png", fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: ".superpowers/sdd/2026-10-16-community-growth-roadmap/profile-desktop.png", fullPage: true, animations: "disabled" });
  });
  test("anonymous visitors cannot update metadata", async ({ request }) => {
    const response = await request.patch(`/api/admin/jugadores/${player.id}`, {
      data: { profileMetadata: { main: "jin" } },
    });
    expect(response.status()).toBe(401);
  });
  test("long names, missing avatars and empty seasons stay usable with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/competidores/${emptyId}`);
    await expect(page.getByRole("heading", { level: 1, name: longName })).toBeVisible();
    await expect(page.getByText("Sin participaciones registradas en esta temporada.")).toBeVisible();
    await expect(page.getByLabel(`Avatar de ${longName}`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator("section").first()).toHaveCSS("animation-name", "none");
    const back = page.getByRole("link", { name: "VOLVER A COMPETIDORES" });
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/competidores");
  });
});
