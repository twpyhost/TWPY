import { publicArchiveEntry } from "./archive.js";
import {
  ARCHIVE_BUCKET,
  ARCHIVE_TTL,
  createArchiveReader,
} from "./archiveMedia.js";
const fields = "id,slug,title,recap,season,date,tournament_id::text,vod_links";
function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}
export function createArchiveData(publicClient, serviceClient) {
  const reader = createArchiveReader(publicClient, serviceClient);
  async function getPublicArchiveTarget(slug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? "") || slug.length > 100)
      return null;
    const row = checked(
      await publicClient
        .from("archive_entries")
        .select("slug")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle(),
    );
    return row?.slug ?? null;
  }
  async function getArchiveEntries({ season, eventId, tournamentId } = {}) {
    if (eventId != null)
      throw new Error("Los eventos están pendientes de la fase 2");
    let query = publicClient
      .from("archive_entries")
      .select(fields)
      .eq("status", "published")
      .order("date", { ascending: false })
      .order("id");
    if (season) query = query.eq("season", season);
    if (tournamentId) query = query.eq("tournament_id", tournamentId);
    return checked(await query).map(publicArchiveEntry);
  }
  async function getArchiveEntry(slug) {
    const row = checked(
      await publicClient
        .from("archive_entries")
        .select(fields)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle(),
    );
    if (!row) return null;
    const assets = checked(
      await publicClient
        .from("archive_assets")
        .select("id,caption,credit,width,height,storage_path")
        .eq("entry_id", row.id)
        .eq("state", "ready")
        .order("sort_order")
        .order("id"),
    );
    if (assets.length) {
      let signed = [];
      try {
        const result = await serviceClient.storage
          .from(ARCHIVE_BUCKET)
          .createSignedUrls(
            assets.map((a) => a.storage_path),
            ARCHIVE_TTL,
          );
        if (!result.error) signed = result.data ?? [];
      } catch {
        // A Storage outage must not hide the published recap or photo credits.
      }
      const expiresAt = new Date(Date.now() + ARCHIVE_TTL * 1000).toISOString();
      row.assets = assets.map((a, i) => {
        const url = signed[i]?.error ? null : (signed[i]?.signedUrl ?? null);
        return { ...a, url, expiresAt: url ? expiresAt : null };
      });
    }
    // A retraction during signing must not return fresh URLs/content.
    const stillPublished = checked(
      await publicClient
        .from("archive_entries")
        .select("id")
        .eq("id", row.id)
        .eq("status", "published")
        .maybeSingle(),
    );
    return stillPublished ? publicArchiveEntry(row) : null;
  }
  return {
    getArchiveEntries,
    getArchiveEntry,
    getPublicArchiveTarget,
    ...reader,
  };
}
