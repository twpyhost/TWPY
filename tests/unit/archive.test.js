import { test, expect } from "@playwright/test";
import sharp from "sharp";
import {
  validateArchiveEntry,
  publicArchiveEntry,
} from "../../src/lib/archive.js";
import { validateArchiveAsset } from "../../src/lib/archiveMedia.js";

const entry = {
  slug: "final-2026",
  title: "Final",
  recap: "<script>texto</script>",
  season: 2026,
  date: "2026-10-17",
  status: "draft",
  tournament_id: "9007199254740993",
  vod_links: ["https://youtu.be/example"],
};
test("archive accepts plain text and exact IDs, rejects unsafe links and invalid dates", () => {
  expect(validateArchiveEntry(entry).valid).toBe(true);
  for (const change of [
    { slug: "../bad" },
    { date: "2026-02-30" },
    { vod_links: ["javascript:alert(1)"] },
    { vod_links: ["https://user:pass@example.com"] },
    { status: "other" },
    { title: "" },
  ]) {
    expect(validateArchiveEntry({ ...entry, ...change }).valid).toBe(false);
  }
  expect(
    publicArchiveEntry({
      ...entry,
      id: "id",
      internal: "secret",
      storage_path: "private",
      assets: [],
    }),
  ).not.toHaveProperty("internal");
});
test("images are decoded, signature checked, bounded and stripped of trailing payload", async () => {
  const png = await sharp({
    create: { width: 4, height: 3, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const result = await validateArchiveAsset({
    bytes: Buffer.concat([png, Buffer.from("<script>payload</script>")]),
    mime: "image/png",
    size: png.length,
  });
  // Actual length, not the caller's declared size, is authoritative.
  const valid = await validateArchiveAsset({
    bytes: png,
    mime: "image/png",
    size: png.length,
  });
  expect(valid).toMatchObject({
    valid: true,
    width: 4,
    height: 3,
    mime: "image/png",
  });
  expect(result.valid).toBe(false);
  for (const [bytes, mime] of [
    [png, "image/jpeg"],
    [Buffer.from("<svg/>"), "image/svg+xml"],
    [Buffer.from("<html/>"), "image/png"],
    [png.subarray(0, 20), "image/png"],
    [Buffer.alloc(2097153), "image/png"],
  ]) {
    expect(
      (await validateArchiveAsset({ bytes, mime, size: bytes.length })).valid,
    ).toBe(false);
  }
  const padded = Buffer.concat([png, Buffer.alloc(2097152 - png.length)]);
  const boundary = await validateArchiveAsset({
    bytes: padded,
    mime: "image/png",
    size: padded.length,
  });
  expect(boundary.valid).toBe(true);
  expect(boundary.size).toBeLessThan(2097152);
  expect(boundary.data.includes(Buffer.from("<script>"))).toBe(false);
});
