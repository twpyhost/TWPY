import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { encryptBackup, decryptBackup } from "../../scripts/backupCrypto.js";
import { verifyArchiveBackup } from "../../scripts/backup-archive-media.js";
let dir;
test.beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "archive-backup-"));
});
test.afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
test("backup encryption round trip, tampering and absent key fail closed", async () => {
  const input = join(dir, "input"),
    encrypted = join(dir, "encrypted"),
    restored = join(dir, "restored");
  await writeFile(input, "PRIVATE draft content");
  const key = randomBytes(32).toString("base64");
  await expect(encryptBackup(input, encrypted, "")).rejects.toThrow();
  await encryptBackup(input, encrypted, key);
  expect((await readFile(encrypted)).includes(Buffer.from("PRIVATE"))).toBe(
    false,
  );
  await decryptBackup(encrypted, restored, key);
  expect(await readFile(restored, "utf8")).toBe("PRIVATE draft content");
  const bad = await readFile(encrypted);
  bad[bad.length - 1] ^= 1;
  await writeFile(encrypted, bad);
  await expect(
    decryptBackup(encrypted, join(dir, "bad"), key),
  ).rejects.toThrow();
  await expect(readFile(join(dir, "bad"))).rejects.toThrow();
});
test("paired manifest detects missing, corrupt and mismatched objects or metadata", async () => {
  const hash = (s) => createHash("sha256").update(s).digest("hex");
  const metadata = JSON.stringify({
    backupRunId: "run",
    entries: [{ id: "entry" }],
    assets: [
      { id: "asset", entry_id: "entry", storage_path: "object.png", bytes: 3 },
    ],
  });
  await writeFile(join(dir, "metadata.json"), metadata);
  await writeFile(join(dir, "database.sql.gz"), "db");
  await writeFile(join(dir, "object.png"), "png");
  const manifest = {
    version: 1,
    backupRunId: "run",
    metadata: {
      path: "metadata.json",
      size: Buffer.byteLength(metadata),
      sha256: hash(metadata),
    },
    database: { path: "database.sql.gz", size: 2, sha256: hash("db") },
    objects: [
      {
        path: "object.png",
        size: 3,
        sha256: hash("png"),
        entryId: "entry",
        assetId: "asset",
      },
    ],
  };
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
  expect((await verifyArchiveBackup(dir)).objects).toHaveLength(1);
  await writeFile(join(dir, "object.png"), "bad");
  await expect(verifyArchiveBackup(dir)).rejects.toThrow();
  await rm(join(dir, "object.png"));
  await expect(verifyArchiveBackup(dir)).rejects.toThrow();
  await writeFile(join(dir, "object.png"), "png");
  manifest.objects[0].entryId = "wrong";
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
  await expect(verifyArchiveBackup(dir)).rejects.toThrow();
});
