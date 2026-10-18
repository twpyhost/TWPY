import { revalidatePath } from "next/cache";
import { requireAdmin } from "./apiAuth";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { isArchiveId, validateArchiveEntry } from "./archive.js";
import { ARCHIVE_BUCKET, ARCHIVE_TTL } from "./archiveMedia.js";
export function archiveCheck(result) {
  if (result.error) throw result.error;
  return result.data;
}
export async function archiveAdmin(id) {
  const auth = await requireAdmin();
  if (auth.error) return auth;
  if (id !== undefined && !isArchiveId(id))
    return { error: Response.json({ error: "ID inválido" }, { status: 400 }) };
  return { db: getSupabaseAdmin() };
}
export function archiveInvalidate(slugs = []) {
  for (const path of [
    "/archivo",
    "/sitemap.xml",
    "/torneo-resultado/[slug]",
    ...slugs.filter(Boolean).map((s) => `/archivo/${s}`),
  ])
    revalidatePath(path, path.includes("[slug]") ? "page" : undefined);
}
export async function archiveBody(request, max = 100000) {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new Error("Solicitud demasiado grande");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Faltan datos");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > max) throw new Error("Solicitud demasiado grande");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}
export async function saveArchive(db, input, id) {
  const existing = id
    ? archiveCheck(
        await db.from("archive_entries").select("*").eq("id", id).maybeSingle(),
      )
    : null;
  if (id && !existing)
    return {
      error: Response.json({ error: "Crónica no encontrada" }, { status: 404 }),
    };
  const validation = validateArchiveEntry({
    ...(existing ?? {
      recap: "",
      status: "draft",
      tournament_id: null,
      vod_links: [],
    }),
    ...input,
  });
  if (!validation.valid)
    return {
      error: Response.json({ error: validation.reason }, { status: 400 }),
    };
  const result = id
    ? db.from("archive_entries").update(validation.data).eq("id", id)
    : db.from("archive_entries").insert(validation.data);
  const row = archiveCheck(await result.select("*").single());
  archiveInvalidate([existing?.slug, row.slug]);
  return { row };
}
export async function adminArchiveEntry(db, id) {
  const row = archiveCheck(
    await db
      .from("archive_entries")
      .select("*,tournament_id::text")
      .eq("id", id)
      .maybeSingle(),
  );
  if (!row) return null;
  row.assets = archiveCheck(
    await db
      .from("archive_assets")
      .select("id,caption,credit,sort_order,width,height,storage_path")
      .eq("entry_id", id)
      .eq("state", "ready")
      .order("sort_order")
      .order("id"),
  );
  if (row.assets.length) {
    const signed = archiveCheck(
      await db.storage.from(ARCHIVE_BUCKET).createSignedUrls(
        row.assets.map((a) => a.storage_path),
        ARCHIVE_TTL,
      ),
    );
    row.assets = row.assets.map((a, i) => ({
      ...a,
      url: signed[i]?.signedUrl ?? null,
    }));
  }
  return row;
}
export function archiveError(error) {
  // Avoid returning database details, object paths or credentials.
  const messages = [
    "Presupuesto de medios agotado",
    "La URL publicada es permanente",
    "Completar leyendas y créditos antes de publicar",
    "Lista de imágenes inválida",
  ];
  const message = messages.find((s) => error?.message?.includes(s));
  return Response.json(
    {
      error:
        message ?? "No se pudo guardar. Revisá los datos e intentá de nuevo.",
    },
    { status: 400 },
  );
}
