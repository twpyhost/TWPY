import { createHash } from "node:crypto";
import { isPublicId } from "./playerProfiles.js";

function version(data) {
  return createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 16);
}

export function getCardDimensions(format) {
  return format === "landscape"
    ? { width: 1200, height: 630 }
    : format === "portrait"
      ? { width: 1080, height: 1350 }
      : null;
}

export function parseCardRequest(id, url, type) {
  if (!isPublicId(id)) return null;
  const allowed = new Set(
    type === "jugador" ? ["format", "year", "v"] : ["format", "v"],
  );
  for (const key of url.searchParams.keys())
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1)
      return null;
  const format = url.searchParams.get("format") ?? "landscape";
  if (!getCardDimensions(format)) return null;
  const hint = url.searchParams.get("v");
  if (hint !== null && !/^[a-f0-9]{16}$/.test(hint)) return null;
  const year = url.searchParams.get("year");
  if (type === "jugador" && !/^\d{4}$/.test(year ?? "")) return null;
  // v is a hint only, never an input to rendering or its cache key.
  return { id, format, ...(type === "jugador" ? { year } : {}) };
}

export function buildTournamentCardData({ tournament, results }) {
  const data = {
    title: tournament.nombre_torneo,
    date: tournament.fecha_torneo,
    season: String(tournament.temporada),
    podium: results
      .filter((r) => r.posicion >= 1 && r.posicion <= 3)
      .map((r) => ({
        playerId: String(r.jugador.id),
        name: r.jugador.nombre,
        placement: r.posicion,
        points: r.puntaje,
      }))
      .sort(
        (a, b) =>
          a.placement - b.placement ||
          (BigInt(a.playerId) < BigInt(b.playerId)
            ? -1
            : BigInt(a.playerId) > BigInt(b.playerId)
              ? 1
              : 0),
      ),
    participantCount: results.length,
  };
  return { ...data, sourceVersion: version(data) };
}

export function buildPlayerSeasonCardData(profile, history) {
  const data = {
    playerId: profile.id,
    name: profile.displayName,
    season: profile.season,
    position: profile.position,
    points: profile.points,
    titles: profile.titles,
    podiums: profile.podiums,
    tournamentCount: profile.tournamentCount,
  };
  return { ...data, sourceVersion: version({ ...data, history }) };
}

export function cardText(text, limit) {
  const chars = Array.from(String(text));
  return chars.length > limit
    ? `${chars.slice(0, limit - 1).join("")}…`
    : chars.join("");
}
