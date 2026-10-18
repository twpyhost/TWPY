import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, open, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
const magic = Buffer.from("TWBACKUP1\n");
function parseKey(value) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value ?? ""))
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("Invalid backup encryption key");
  return key;
}
export async function encryptBackup(input, output, secret) {
  const key = parseKey(secret),
    nonce = randomBytes(12);
  const handle = await open(output, "wx", 0o600);
  try {
    await handle.write(Buffer.concat([magic, nonce]));
    await handle.close();
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(magic);
    await pipeline(
      createReadStream(input),
      cipher,
      createWriteStream(output, { flags: "a", mode: 0o600 }),
    );
    await appendFile(output, cipher.getAuthTag());
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(output, { force: true });
    throw error;
  }
}
export async function decryptBackup(input, output, secret) {
  const key = parseKey(secret),
    source = await open(input, "r");
  let target;
  try {
    const { size } = await source.stat();
    if (size < magic.length + 12 + 16)
      throw new Error("Truncated encrypted backup");
    const header = Buffer.alloc(magic.length + 12),
      tag = Buffer.alloc(16);
    await source.read(header, 0, header.length, 0);
    await source.read(tag, 0, 16, size - 16);
    if (!header.subarray(0, magic.length).equals(magic))
      throw new Error("Unknown backup format");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      header.subarray(magic.length),
    );
    decipher.setAAD(magic);
    decipher.setAuthTag(tag);
    target = await open(output, "wx", 0o600);
    await target.close();
    await pipeline(
      createReadStream(input, { start: header.length, end: size - 17 }),
      decipher,
      createWriteStream(output, { flags: "a", mode: 0o600 }),
    );
  } catch (error) {
    if (target) await rm(output, { force: true });
    throw error;
  } finally {
    await source.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, input, output] = process.argv.slice(2);
  if (!["encrypt", "decrypt"].includes(mode) || !input || !output)
    throw new Error(
      "Usage: node scripts/backupCrypto.js encrypt|decrypt INPUT OUTPUT",
    );
  await (mode === "encrypt" ? encryptBackup : decryptBackup)(
    input,
    output,
    process.env.BACKUP_ENCRYPTION_KEY,
  );
}
