import { test, expect } from "@playwright/test";
import { getServiceClient } from "../../testSupabase.js";
import { nombreJugador } from "../fixtures/datos.js";

test("admin saves declared characters and private Tekken accounts, then reloads", async ({
  page,
}) => {
  const service = getServiceClient();
  const { data: player, error } = await service
    .from("players")
    .select("id")
    .eq("display_name", nombreJugador(4))
    .single();
  if (error) throw error;
  await page.goto(`/admin/jugadores/${player.id}`);
  await page.getByLabel("Main declarado").selectOption("jin");
  await page.getByRole("checkbox", { name: "King", exact: true }).check();
  await page.getByRole("button", { name: "AGREGAR TEKKEN ID" }).click();
  await page
    .getByLabel("Tekken ID 1", { exact: true })
    .fill("E2E-PROFILE-PRIVATE");
  await page
    .getByRole("button", { name: "GUARDAR PERSONAJES Y CUENTAS" })
    .click();
  await expect(
    page.getByText("Personajes y cuentas actualizados"),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Main declarado")).toHaveValue("jin");
  await expect(
    page.getByRole("checkbox", { name: "King", exact: true }),
  ).toBeChecked();
  await page.goto(`/competidores/${player.id}`);
  await expect(page.getByText("Main declarado: Jin")).toBeVisible();
  await expect(page.getByText("E2E-PROFILE-PRIVATE")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".superpowers/sdd/2026-10-16-community-growth-roadmap/profile-main-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  const heading = page.getByRole("heading", { level: 1 });
  const lines = await heading.evaluate((element) => element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight));
  expect(lines).toBeLessThanOrEqual(2.1);
  await page.screenshot({ path: ".superpowers/sdd/2026-10-16-community-growth-roadmap/profile-main-mobile.png", fullPage: true, animations: "disabled" });
});
