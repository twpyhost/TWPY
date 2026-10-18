import { test, expect } from "@playwright/test";
import { getServiceClient } from "../../testSupabase.js";
import sharp from "sharp";
import { cleanupArchiveMedia } from "../../../src/lib/archiveMedia.js";
const slug = `editor-${Date.now()}`;
test.afterAll(async () => {
  const db = getServiceClient(),
    row = (
      await db
        .from("archive_entries")
        .select("id")
        .eq("slug", slug)
        .maybeSingle()
    ).data;
  if (!row) return;
  const assets = await db
    .from("archive_assets")
    .select("id")
    .eq("entry_id", row.id);
  for (const asset of assets.data)
    await db.rpc("retire_archive_asset", {
      p_entry_id: row.id,
      p_id: asset.id,
    });
  await cleanupArchiveMedia(db);
  await db.from("archive_entries").delete().eq("id", row.id);
});
test("editor saves a private draft, reloads, publishes and retracts with stable URL", async ({
  page,
}) => {
  await page.goto("/admin/archivo");
  await page.getByRole("button", { name: "Nueva crónica" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Crónica editorial");
  await page.getByLabel("URL", { exact: true }).fill(slug);
  await page.getByLabel("Temporada", { exact: true }).fill("8998");
  await page.getByLabel("Fecha", { exact: true }).fill("2026-10-17");
  await page.getByLabel("Crónica", { exact: true }).fill("Texto editorial");
  const vods = page.getByRole("textbox", {
    name: "VODs (un enlace HTTPS por línea)",
    exact: true,
  });
  await vods.fill("https://youtu.be/one");
  await vods.press("End");
  await vods.press("Enter");
  await vods.pressSequentially("https://youtu.be/two");
  await expect(vods).toHaveValue("https://youtu.be/one\nhttps://youtu.be/two");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("status")).toContainText("Guardado");
  await page.reload();
  await page.getByRole("button", { name: "Crónica editorial" }).click();
  await expect(
    page.getByRole("textbox", { name: "Crónica", exact: true }),
  ).toHaveValue("Texto editorial");
  const bytes = await sharp({
    create: { width: 100, height: 70, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Imagen", { exact: true })
    .setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: bytes,
    });
  await page
    .getByLabel("Leyenda de nueva foto", { exact: true })
    .fill("Leyenda editorial");
  await page
    .getByLabel("Crédito de nueva foto", { exact: true })
    .fill("Crédito editorial");
  await page.getByRole("button", { name: "Subir foto", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Foto guardada");
  let response = await page.request.get(`/archivo/${slug}`);
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("Texto editorial");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Publicado");
  await expect(page.getByLabel("URL", { exact: true })).toBeDisabled();
  response = await page.request.get(`/archivo/${slug}`);
  expect(response.status()).toBe(200);
  await page.getByRole("button", { name: "Retirar publicación" }).click();
  await expect(page.getByRole("status")).toContainText("Retirado");
  response = await page.request.get(`/archivo/${slug}`);
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("Texto editorial");
});
