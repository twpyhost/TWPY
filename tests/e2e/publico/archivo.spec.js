import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { getServiceClient } from "../../testSupabase.js";
import {
  uploadArchiveMedia,
  cleanupArchiveMedia,
} from "../../../src/lib/archiveMedia.js";
const db = getServiceClient();
const slug = `public-archive-${Date.now()}`;
let entry;
test.beforeAll(async () => {
  const result = await db
    .from("archive_entries")
    .insert({
      slug,
      title: "Crónica de prueba",
      recap: "<script>alert('unsafe')</script>\nCrónica pública",
      season: 8999,
      date: "2026-10-17",
      vod_links: ["https://youtu.be/unavailable"],
    })
    .select()
    .single();
  expect(result.error).toBeNull();
  entry = result.data;
  const bytes = await sharp({
    create: { width: 60, height: 40, channels: 3, background: "#aa0044" },
  })
    .png()
    .toBuffer();
  await uploadArchiveMedia(
    db,
    entry.id,
    new File([bytes], "photo.png", { type: "image/png" }),
    { caption: "Final comunitaria", credit: "Foto: Comunidad" },
  );
  await db
    .from("archive_entries")
    .update({ status: "published" })
    .eq("id", entry.id);
});
test.afterAll(async () => {
  const assets = await db
    .from("archive_assets")
    .select("id")
    .eq("entry_id", entry.id);
  for (const a of assets.data)
    await db.rpc("retire_archive_asset", { p_entry_id: entry.id, p_id: a.id });
  await cleanupArchiveMedia(db);
  await db.from("archive_entries").delete().eq("id", entry.id);
});
test("season, plain text, credit, responsive gallery, fallback and retraction", async ({
  page,
}, testInfo) => {
  await page.goto("/archivo?season=8999");
  await page.getByRole("link", { name: "Crónica de prueba" }).click();
  await expect(
    page.getByRole("heading", { name: "Crónica de prueba" }),
  ).toBeVisible();
  await expect(
    page.getByText("<script>alert('unsafe')</script>", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Foto: Comunidad")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Final comunitaria" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver VOD 1" })).toHaveAttribute(
    "href",
    "https://youtu.be/unavailable",
  );
    for (const width of [390, 990, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
      await page.screenshot({
      path: testInfo.outputPath(`archive-${width}.png`),
      fullPage: true,
        animations: "disabled",
    });
  }
  await page.route("**/storage/v1/object/sign/**", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("Imagen no disponible")).toBeVisible();
  await db
    .from("archive_entries")
    .update({ status: "draft" })
    .eq("id", entry.id);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Crónica de prueba" }),
  ).toHaveCount(0);
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain(`/archivo/${slug}`);
  await page.goto("/archivo?season=8999");
  await expect(
    page.getByRole("link", { name: "Crónica de prueba" }),
  ).toHaveCount(0);
});
