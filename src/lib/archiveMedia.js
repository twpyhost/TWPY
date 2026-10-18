import sharp from "sharp";
import { isArchiveId } from "./archive.js";
export const ARCHIVE_BUCKET = "archive-media";
export const ARCHIVE_TTL = 900;
export const ARCHIVE_FILE_LIMIT = 2 * 1024 * 1024;
export async function validateArchiveAsset({ bytes, mime, size }) {
  const fail = (reason) => ({ valid: false, reason });
  if (
    !Buffer.isBuffer(bytes) ||
    !bytes.length ||
    bytes.length > ARCHIVE_FILE_LIMIT ||
    size !== bytes.length
  )
    return fail("Archivo vacío, tamaño incorrecto o mayor a 2 MiB");
  const formats = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!formats[mime]) return fail("Solo JPEG, PNG o WebP");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (metadata.format !== formats[mime] || (metadata.pages ?? 1) > 1)
      return fail("El contenido no coincide con el tipo de imagen");
    const { data, info } = await image
      .rotate()
      .toFormat(formats[mime])
      .toBuffer({ resolveWithObject: true });
    if (data.length > ARCHIVE_FILE_LIMIT)
      return fail("La imagen procesada supera 2 MiB");
    return {
      valid: true,
      data,
      mime,
      size: data.length,
      width: info.width,
      height: info.height,
    };
  } catch {
    return fail("Imagen dañada o dimensiones excesivas");
  }
}
function check(result) {
  if (result.error) throw result.error;
  return result.data;
}
export async function cleanupArchiveMedia(client) {
  const rows = check(await client.rpc("claim_archive_cleanup"));
  if (!rows?.length) return;
  check(
    await client.storage
      .from(ARCHIVE_BUCKET)
      .remove(rows.map((r) => r.storage_path)),
  );
  check(
    await client.rpc("finish_archive_cleanup", {
      p_ids: rows.map((r) => r.id),
    }),
  );
}
export async function uploadArchiveMedia(
  client,
  entryId,
  file,
  { caption = "", credit = "" } = {},
) {
  const decoded = await validateArchiveAsset({
    bytes: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
    size: file.size,
  });
  if (!decoded.valid) throw new Error(decoded.reason);
  if (caption.length > 500 || credit.length > 200)
    throw new Error("Leyenda o crédito demasiado largo");
  const row = check(
    await client.rpc("reserve_archive_asset", {
      p_entry_id: entryId,
      p_mime: decoded.mime,
      p_bytes: decoded.size,
      p_width: decoded.width,
      p_height: decoded.height,
      p_caption: caption,
      p_credit: credit,
    }),
  )[0];
  try {
    check(
      await client.storage
        .from(ARCHIVE_BUCKET)
        .upload(row.storage_path, decoded.data, {
          contentType: decoded.mime,
          upsert: false,
        }),
    );
    check(await client.rpc("finalize_archive_asset", { p_id: row.id }));
    return row.id;
  } catch (error) {
    await client.rpc("retire_archive_asset", {
      p_entry_id: entryId,
      p_id: row.id,
    });
    await cleanupArchiveMedia(client).catch(() => {});
    throw error;
  }
}
export function createArchiveReader(publicClient, serviceClient) {
  async function published(id) {
    return check(
      await publicClient
        .from("archive_entries")
        .select("id")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle(),
    );
  }
  async function getPublishedArchiveMedia(entryId, assetId) {
    if (!isArchiveId(entryId) || !isArchiveId(assetId)) return null;
    if (!(await published(entryId))) return null;
    const asset = check(
      await publicClient
        .from("archive_assets")
        .select("storage_path")
        .eq("id", assetId)
        .eq("entry_id", entryId)
        .eq("state", "ready")
        .maybeSingle(),
    );
    if (!asset) return null;
    const signed = check(
      await serviceClient.storage
        .from(ARCHIVE_BUCKET)
        .createSignedUrl(asset.storage_path, ARCHIVE_TTL),
    );
    if (!(await published(entryId))) return null;
    return {
      url: signed.signedUrl,
      expiresAt: new Date(Date.now() + ARCHIVE_TTL * 1000).toISOString(),
    };
  }
  return { getPublishedArchiveMedia };
}
