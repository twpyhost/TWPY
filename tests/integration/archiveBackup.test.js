import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { getServiceClient } from "../testSupabase.js";
import {
  backupArchive,
  verifyArchiveBackup,
} from "../../scripts/backup-archive-media.js";
import {
  uploadArchiveMedia,
  cleanupArchiveMedia,
} from "../../src/lib/archiveMedia.js";
const db = getServiceClient();
function docker(args, input) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || "Docker failed");
  return result.stdout;
}
test("paired snapshot reconstructs migrations, metadata, ACLs and photo bytes outside original bucket", async () => {
  test.setTimeout(120000);
  const temp = await mkdtemp(join(tmpdir(), "twpy-archive-restore-")),
    root = join(temp, "backup");
  const name = `archive_restore_${Date.now()}`,
    bucket = `archive-restore-${Date.now()}`;
  const entry = (
    await db
      .from("archive_entries")
      .insert({
        slug: `restore-${Date.now()}`,
        title: "Restore proof",
        recap: "Private recap",
        date: "2026-10-17",
        season: 9000,
      })
      .select()
      .single()
  ).data;
  const oldEnv = {
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
    ARCHIVE_PG_CONTAINER: process.env.ARCHIVE_PG_CONTAINER,
  };
  let created = false;
  try {
    const bytes = await sharp({
      create: { width: 12, height: 9, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    await uploadArchiveMedia(
      db,
      entry.id,
      new File([bytes], "restore.png", { type: "image/png" }),
      { caption: "Restored caption", credit: "Restored credit" },
    );
    process.env.SUPABASE_DB_URL =
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
    process.env.ARCHIVE_PG_CONTAINER = "supabase_db_TWPY";
    const manifest = await backupArchive(root, { runId: name, client: db });
    expect(manifest.objects.length).toBeGreaterThan(0);
    await verifyArchiveBackup(root);
    const dump = gunzipSync(
      await readFile(join(root, "database.sql.gz")),
    ).toString();
    docker(["exec", "supabase_db_TWPY", "createdb", "-U", "postgres", name]);
    created = true;
    const query = (sql) =>
      docker(
        [
          "exec",
          "-i",
          "supabase_db_TWPY",
          "psql",
          "-X",
          "-q",
          "-t",
          "-A",
          "-U",
          "postgres",
          "-d",
          name,
          "-v",
          "ON_ERROR_STOP=1",
        ],
        sql,
      );
    // Minimal platform schemas only; all public objects come from committed migrations.
    query(
      "create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as 'select null::uuid'; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(bucket_id text,name text,metadata jsonb); alter default privileges in schema public grant all on tables to anon,authenticated; alter default privileges in schema public grant execute on functions to public;",
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      query(await readFile(join("supabase/migrations", file), "utf8"));
    expect(
      query(
        "select has_table_privilege('anon','public.archive_media_state','select'),has_function_privilege('anon','public.begin_archive_backup(text)','execute'),has_table_privilege('authenticated','public.archive_assets','insert');",
      ).trim(),
    ).toBe("f|f|f");
    const ids = [
      ...new Set(
        dump.match(
          /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
        ),
      ),
    ];
    query(
      ids
        .map(
          (id) =>
            `insert into auth.users values('${id}') on conflict do nothing;`,
        )
        .join("\n"),
    );
    // The managed role's DEFAULT ACLs cannot be changed by the project postgres
    // user. Keep every object GRANT/REVOKE in the paired dump intact.
    const restore = dump
      .split("\n")
      .filter(
        (line) =>
          !/^ALTER DEFAULT PRIVILEGES FOR ROLE "?supabase_admin"? /.test(line),
      )
      .join("\n");
    query(restore);
    const rows = JSON.parse(
      query(
        `select json_agg(a) from public.archive_assets a where entry_id='${entry.id}';`,
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      caption: "Restored caption",
      credit: "Restored credit",
      entry_id: entry.id,
      state: "ready",
    });
    expect(
      query(
        "select has_function_privilege('anon','public.reserve_archive_asset(uuid,text,integer,integer,integer,text,text)','execute');",
      ).trim(),
    ).toBe("f");
    expect(
      (await db.storage.createBucket(bucket, { public: false })).error,
    ).toBeNull();
    for (const object of manifest.objects) {
      const content = await readFile(join(root, object.path));
      expect(
        (
          await db.storage
            .from(bucket)
            .upload(object.storagePath, content, { contentType: "image/png" })
        ).error,
      ).toBeNull();
      const restored = await db.storage
        .from(bucket)
        .download(object.storagePath);
      expect(
        createHash("sha256")
          .update(Buffer.from(await restored.data.arrayBuffer()))
          .digest("hex"),
      ).toBe(object.sha256);
    }
    await writeFile(join(root, manifest.objects[0].path), "corrupt");
    await expect(verifyArchiveBackup(root)).rejects.toThrow();
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await db.storage.emptyBucket(bucket);
    await db.storage.deleteBucket(bucket);
    if (created)
      docker([
        "exec",
        "supabase_db_TWPY",
        "dropdb",
        "-U",
        "postgres",
        "--force",
        name,
      ]);
    const assets = await db
      .from("archive_assets")
      .select("id")
      .eq("entry_id", entry.id);
    for (const asset of assets.data ?? [])
      await db.rpc("retire_archive_asset", {
        p_entry_id: entry.id,
        p_id: asset.id,
      });
    await cleanupArchiveMedia(db);
    await db.from("archive_entries").delete().eq("id", entry.id);
    await rm(temp, { recursive: true, force: true });
  }
});
