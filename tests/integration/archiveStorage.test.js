import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { getAnonClient, getServiceClient } from "../testSupabase.js";
import {
  uploadArchiveMedia,
  cleanupArchiveMedia,
  createArchiveReader,
} from "../../src/lib/archiveMedia.js";
const db = getServiceClient(),
  anon = getAnonClient();
let entry, asset;
test.beforeEach(async () => {
  const result = await db
    .from("archive_entries")
    .insert({
      slug: `storage-${crypto.randomUUID()}`,
      title: "Storage",
      season: 9000,
      date: "2026-10-17",
    })
    .select()
    .single();
  expect(result.error).toBeNull();
  entry = result.data;
});
test.afterEach(async () => {
  await db.rpc("end_archive_backup", { p_run_id: "test-backup" });
  const rows = await db
    .from("archive_assets")
    .select("id,storage_path")
    .eq("entry_id", entry.id);
  for (const row of rows.data ?? [])
    await db.rpc("retire_archive_asset", {
      p_entry_id: entry.id,
      p_id: row.id,
    });
  await cleanupArchiveMedia(db);
  await db.from("archive_entries").delete().eq("id", entry.id);
  await db
    .from("archive_media_state")
    .update({ limit_bytes: 104857600 })
    .eq("id", 1);
});
test("private objects, publication-aware 900s signatures, membership and backup deletion lease", async () => {
  const bytes = await sharp({
    create: { width: 8, height: 6, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  asset = await uploadArchiveMedia(
    db,
    entry.id,
    new File([bytes], "spoof.html", { type: "image/png" }),
    { caption: "Final", credit: "Photo credit" },
  );
  const row = (
    await db.from("archive_assets").select().eq("id", asset).single()
  ).data;
  const reader = createArchiveReader(anon, db);
  expect(await reader.getPublishedArchiveMedia(entry.id, asset)).toBeNull();
  expect(
    (await anon.storage.from("archive-media").download(row.storage_path)).error,
  ).toBeTruthy();
  expect(
    (
      await anon.storage
        .from("archive-media")
        .createSignedUrl(row.storage_path, 86400)
    ).error,
  ).toBeTruthy();
  await db
    .from("archive_entries")
    .update({ status: "published" })
    .eq("id", entry.id);
  expect(
    (
      await db.rpc("edit_archive_asset", {
        p_entry_id: entry.id,
        p_id: asset,
        p_caption: "Final",
        p_credit: "Photo credit",
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await db.rpc("edit_archive_asset", {
        p_entry_id: entry.id,
        p_id: asset,
        p_caption: "",
        p_credit: "Credit",
      })
    ).error,
  ).toBeTruthy();
  const signed = await reader.getPublishedArchiveMedia(entry.id, asset);
  const payload = JSON.parse(
    Buffer.from(
      new URL(signed.url).searchParams.get("token").split(".")[1],
      "base64url",
    ),
  );
  expect(payload.exp - payload.iat).toBe(900);
  expect((await fetch(signed.url)).status).toBe(200);
  expect(
    await reader.getPublishedArchiveMedia(entry.id, crypto.randomUUID()),
  ).toBeNull();
  await db
    .from("archive_entries")
    .update({ status: "draft" })
    .eq("id", entry.id);
  expect(await reader.getPublishedArchiveMedia(entry.id, asset)).toBeNull();
  await db.rpc("begin_archive_backup", { p_run_id: "test-backup" });
  await db.rpc("retire_archive_asset", { p_entry_id: entry.id, p_id: asset });
  await cleanupArchiveMedia(db);
  expect(
    (await db.storage.from("archive-media").download(row.storage_path)).error,
  ).toBeNull();
  await db.rpc("end_archive_backup", { p_run_id: "test-backup" });
  await cleanupArchiveMedia(db);
  expect(
    (await db.storage.from("archive-media").download(row.storage_path)).error,
  ).toBeTruthy();
});
test("concurrent reservations count pending bytes and cannot finalize a missing object", async () => {
  const current = await db.from("archive_assets").select("bytes");
  const used = current.data.reduce((sum, r) => sum + r.bytes, 0);
  await db
    .from("archive_media_state")
    .update({ limit_bytes: used + 100 })
    .eq("id", 1);
  const reserve = () =>
    db.rpc("reserve_archive_asset", {
      p_entry_id: entry.id,
      p_mime: "image/png",
      p_bytes: 75,
      p_width: 1,
      p_height: 1,
    });
  const results = await Promise.all([reserve(), reserve()]);
  expect(results.filter((r) => !r.error)).toHaveLength(1);
  const row = results.find((r) => !r.error).data[0];
  expect(
    (await db.rpc("finalize_archive_asset", { p_id: row.id })).error,
  ).toBeTruthy();
  expect(
    (await db.from("archive_entries").delete().eq("id", entry.id)).error,
  ).toBeTruthy();
});
