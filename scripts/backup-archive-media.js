import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";

function safePath(root, name) {
  if (
    typeof name !== "string" ||
    !name ||
    name.includes("\\") ||
    name.split("/").some((p) => p === ".." || p === "")
  )
    throw new Error("Unsafe backup path");
  const path = resolve(root, name);
  if (!path.startsWith(resolve(root) + sep))
    throw new Error("Unsafe backup path");
  return path;
}
async function digest(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return { size: (await stat(path)).size, sha256: hash.digest("hex") };
}
export async function verifyArchiveBackup(root) {
  const manifest = JSON.parse(
    await readFile(resolve(root, "manifest.json"), "utf8"),
  );
  if (
    manifest.version !== 1 ||
    !manifest.backupRunId ||
    !Array.isArray(manifest.objects)
  )
    throw new Error("Invalid manifest");
  for (const file of [
    manifest.database,
    manifest.metadata,
    ...manifest.objects,
  ]) {
    const actual = await digest(safePath(root, file.path));
    if (actual.size !== file.size || actual.sha256 !== file.sha256)
      throw new Error(`Checksum mismatch: ${file.path}`);
  }
  const metadata = JSON.parse(
    await readFile(safePath(root, manifest.metadata.path), "utf8"),
  );
  if (
    metadata.backupRunId !== manifest.backupRunId ||
    metadata.assets.length !== manifest.objects.length ||
    new Set(manifest.objects.map((o) => o.path)).size !==
      manifest.objects.length
  )
    throw new Error("Snapshot/manifest mismatch");
  for (const asset of metadata.assets) {
    const object = manifest.objects.find((o) => o.assetId === asset.id);
    if (
      !object ||
      object.entryId !== asset.entry_id ||
      (object.storagePath !== undefined &&
        object.storagePath !== asset.storage_path) ||
      (object.path !== `objects/${asset.storage_path}` &&
        object.path !== asset.storage_path) ||
      object.size !== asset.bytes ||
      !metadata.entries.some((e) => e.id === asset.entry_id)
    )
      throw new Error("Asset association mismatch");
  }
  return manifest;
}
function pgProcess(command, args = []) {
  const container = process.env.ARCHIVE_PG_CONTAINER;
  const options = container
    ? ["exec", "-i", container]
    : [
        "run",
        "--rm",
        "-i",
        process.env.ARCHIVE_PG_DOCKER_IMAGE || "postgres:17-alpine",
      ];
  // Feed libpq parameters over stdin, never password-bearing process arguments.
  const url = new URL(process.env.SUPABASE_DB_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Invalid database connection");
  const values = [
    url.hostname.replace(/^\[|\]$/g, ""),
    url.port || "5432",
    decodeURIComponent(url.username),
    decodeURIComponent(url.password),
    decodeURIComponent(url.pathname.slice(1)),
    url.searchParams.get("sslmode") || "prefer",
    url.searchParams.get("options") || "",
  ];
  if (values.some((value) => /[\r\n]/.test(value)))
    throw new Error("Invalid database connection");
  const names = [
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
    "PGSSLMODE",
    "PGOPTIONS",
  ];
  const setup = names
    .map((name) => `IFS= read -r ${name}; export ${name};`)
    .join(" ");
  const child = spawn(
    "docker",
    [...options, "sh", "-c", `${setup} exec "$@"`, "sh", command, ...args],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  child.stdin.on("error", () => {});
  child.stdin.write(values.join("\n") + "\n");
  let errorText = "";
  child.stderr.on("data", (chunk) => {
    errorText += chunk;
  });
  child.done = new Promise((ok, fail) => {
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0
        ? ok()
        : fail(
            new Error(
              `${command} failed (${code}): ${errorText.replaceAll(process.env.SUPABASE_DB_URL || "[unset]", "[database]")}`,
            ),
          ),
    );
  });
  // Callers attach immediately; keep an early process exit from becoming unhandled.
  child.done.catch(() => {});
  return child;
}
export async function backupArchive(
  root,
  { runId = `archive-${Date.now()}`, client } = {},
) {
  if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL required");
  const db =
    client ??
    createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  const check = (result) => {
    if (result.error) throw result.error;
    return result.data;
  };
  await mkdir(root, { recursive: false, mode: 0o700 });
  check(await db.rpc("begin_archive_backup", { p_run_id: runId }));
  let holder;
  const timeout = setTimeout(() => holder?.kill(), 14 * 60 * 1000);
  try {
    holder = pgProcess("psql", [
      "-X",
      "-q",
      "-t",
      "-A",
      "-v",
      "ON_ERROR_STOP=1",
    ]);
    const lines = createInterface({ input: holder.stdout });
    const snapshotPromise = new Promise((ok, fail) => {
      lines.on("line", (line) => {
        if (line.trim().startsWith("{")) {
          try {
            ok(JSON.parse(line));
          } catch (error) {
            fail(error);
          }
        }
      });
      holder.done.then(
        () => fail(new Error("Snapshot holder closed early")),
        fail,
      );
    });
    holder.stdin.write(
      "BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT json_build_object('snapshot',pg_export_snapshot(),'entries',(select coalesce(json_agg(e),'[]') from public.archive_entries e),'assets',(select coalesce(json_agg(a),'[]') from public.archive_assets a where state='ready'));\n",
    );
    const snapshot = await snapshotPromise;
    const metadata = {
      backupRunId: runId,
      entries: snapshot.entries,
      assets: snapshot.assets,
    };
    await writeFile(resolve(root, "metadata.json"), JSON.stringify(metadata), {
      mode: 0o600,
    });
    const dump = pgProcess("pg_dump", [
      "--snapshot",
      snapshot.snapshot,
      "--schema=public",
      "--no-owner",
      "--clean",
      "--if-exists",
    ]);
    dump.stdin.end();
    await Promise.all([
      pipeline(
        dump.stdout,
        createGzip(),
        createWriteStream(resolve(root, "database.sql.gz"), {
          flags: "wx",
          mode: 0o600,
        }),
      ),
      dump.done,
    ]);
    const objects = [];
    for (const asset of snapshot.assets) {
      if (
        !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(
          asset.storage_path,
        )
      )
        throw new Error("Invalid immutable object path");
      const path = `objects/${asset.storage_path}`,
        target = safePath(root, path);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      const blob = check(
        await db.storage.from("archive-media").download(asset.storage_path),
      );
      await writeFile(target, Buffer.from(await blob.arrayBuffer()), {
        flag: "wx",
        mode: 0o600,
      });
      objects.push({
        path,
        storagePath: asset.storage_path,
        ...(await digest(target)),
        entryId: asset.entry_id,
        assetId: asset.id,
      });
    }
    const manifest = {
      version: 1,
      backupRunId: runId,
      createdAt: new Date().toISOString(),
      database: {
        path: "database.sql.gz",
        ...(await digest(resolve(root, "database.sql.gz"))),
      },
      metadata: {
        path: "metadata.json",
        ...(await digest(resolve(root, "metadata.json"))),
      },
      objects,
    };
    await writeFile(
      resolve(root, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      { mode: 0o600 },
    );
    await verifyArchiveBackup(root);
    holder.stdin.end("COMMIT;\n\\q\n");
    await holder.done;
    return manifest;
  } finally {
    clearTimeout(timeout);
    if (holder && holder.exitCode === null) holder.kill();
    check(await db.rpc("end_archive_backup", { p_run_id: runId }));
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, directory] = process.argv.slice(2);
  if (!directory || !["backup", "verify"].includes(mode))
    throw new Error(
      "Usage: node scripts/backup-archive-media.js backup|verify DIRECTORY",
    );
  const manifest = await (mode === "verify"
    ? verifyArchiveBackup(directory)
    : backupArchive(directory, {
        runId: process.env.GITHUB_RUN_ID
          ? `actions-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`
          : undefined,
      }));
  console.log(
    `Verified ${manifest.objects.length} objects; paired run ${manifest.backupRunId}`,
  );
}
