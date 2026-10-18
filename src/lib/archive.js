const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isArchiveId = (id) => typeof id === "string" && uuid.test(id);
export function safeArchiveLink(value) {
  try {
    const url = new URL(value);
    return (
      typeof value === "string" &&
      value.length <= 2048 &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function validateArchiveEntry(value) {
  const fail = (reason) => ({ valid: false, reason });
  if (!value || typeof value !== "object") return fail("Datos inválidos");
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug ?? "") ||
    value.slug.length > 100
  )
    return fail("URL inválida (letras minúsculas, números y guiones)");
  if (
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 160
  )
    return fail("Título requerido, hasta 160 caracteres");
  if (typeof value.recap !== "string" || value.recap.length > 20000)
    return fail("Crónica: hasta 20.000 caracteres");
  if (
    !Number.isInteger(Number(value.season)) ||
    Number(value.season) < 1000 ||
    Number(value.season) > 9999
  )
    return fail("Temporada inválida");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date ?? "") ||
    !Number.isFinite(Date.parse(value.date)) ||
    new Date(value.date).toISOString().slice(0, 10) !== value.date
  )
    return fail("Fecha inválida");
  if (!["draft", "published"].includes(value.status))
    return fail("Estado inválido");
  if (
    value.tournament_id != null &&
    !/^[1-9]\d{0,18}$/.test(String(value.tournament_id))
  )
    return fail("Torneo inválido");
  if (
    !Array.isArray(value.vod_links) ||
    value.vod_links.length > 10 ||
    !value.vod_links.every(safeArchiveLink)
  )
    return fail("Hasta 10 enlaces HTTPS, sin credenciales");
  return {
    valid: true,
    data: {
      slug: value.slug,
      title: value.title.trim(),
      recap: value.recap,
      season: Number(value.season),
      date: value.date,
      status: value.status,
      tournament_id:
        value.tournament_id == null || value.tournament_id === ""
          ? null
          : String(value.tournament_id),
      vod_links: value.vod_links,
    },
  };
}
export function publicArchiveEntry(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    recap: row.recap,
    season: String(row.season),
    date: row.date,
    tournamentId: row.tournament_id == null ? null : String(row.tournament_id),
    vodLinks: (row.vod_links ?? []).filter(safeArchiveLink),
    assets: (row.assets ?? []).map((a) => ({
      id: a.id,
      caption: a.caption,
      credit: a.credit,
      width: a.width,
      height: a.height,
      url: a.url ?? null,
      expiresAt: a.expiresAt ?? null,
    })),
  };
}
