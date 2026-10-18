import { test, expect } from "@playwright/test";
import { getAnonClient, getServiceClient } from "../testSupabase.js";
const db = getServiceClient(),
  anon = getAnonClient();
let id;
test.afterEach(async () => {
  if (id) {
    await db.from("archive_assets").delete().eq("entry_id", id);
    await db.from("archive_entries").delete().eq("id", id);
    id = null;
  }
});
test("drafts are private, published slugs stay stable after retraction, deleted tournament leaves recap", async () => {
  const { data, error } = await db
    .from("archive_entries")
    .insert({
      slug: `test-${Date.now()}`,
      title: "Archive test",
      recap: "Private draft",
      season: 9000,
      date: "2026-10-17",
    })
    .select()
    .single();
  expect(error).toBeNull();
  id = data.id;
  expect(
    (await anon.from("archive_entries").select().eq("id", id)).data,
  ).toEqual([]);
  expect(
    (
      await db
        .from("archive_entries")
        .update({ status: "published" })
        .eq("id", id)
    ).error,
  ).toBeNull();
  expect(
    (await anon.from("archive_entries").select().eq("id", id)).data,
  ).toHaveLength(1);
  await db.from("archive_entries").update({ status: "draft" }).eq("id", id);
  expect(
    (await db.from("archive_entries").update({ slug: "changed" }).eq("id", id))
      .error,
  ).toBeTruthy();
  const game = await db.from("juegos").select("id").limit(1).single();
  const tournament = await db
    .from("torneos")
    .insert({
      id: "990000000000001",
      nombre: "Archive relation",
      temporada: 9000,
      fecha_inicio: "2026-10-17",
      juego_id: game.data.id,
    })
    .select()
    .single();
  expect(tournament.error).toBeNull();
  try {
    expect(
      (
        await db
          .from("archive_entries")
          .update({ tournament_id: tournament.data.id })
          .eq("id", id)
      ).error,
    ).toBeNull();
    await db.from("torneos").delete().eq("id", tournament.data.id);
    expect(
      (
        await db
          .from("archive_entries")
          .select("tournament_id")
          .eq("id", id)
          .single()
      ).data.tournament_id,
    ).toBeNull();
  } finally {
    await db.from("torneos").delete().eq("id", tournament.data.id);
  }
});
test("anonymous callers cannot reserve media or invoke internal backup functions", async () => {
  for (const [name, args] of [
    [
      "reserve_archive_asset",
      {
        p_entry_id: crypto.randomUUID(),
        p_mime: "image/png",
        p_bytes: 1,
        p_width: 1,
        p_height: 1,
      },
    ],
    ["begin_archive_backup", { p_run_id: "attack" }],
  ]) {
    expect((await anon.rpc(name, args)).error).toBeTruthy();
  }
});
