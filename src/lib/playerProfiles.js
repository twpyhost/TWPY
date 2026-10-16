import { getTekkenCharacter } from "./tekkenCharacters.js";

export function isPublicId(value) {
  return (
    typeof value === "string" &&
    /^[1-9]\d{0,18}$/.test(value) &&
    BigInt(value) <= 9223372036854775807n
  );
}

export async function resolvePublicPlayerTarget(playerId, lookup) {
  if (!isPublicId(playerId)) return null;
  const seen = new Set();
  let id = playerId;
  for (let hop = 0; hop < 10; hop++) {
    if (seen.has(id)) return null;
    seen.add(id);
    const row = await lookup(id);
    if (!row) return null;
    if (row.merged_into_player_id == null) return String(row.id);
    id = String(row.merged_into_player_id);
    if (!isPublicId(id)) return null;
  }
  return null;
}

export function validateProfileMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    throw new Error("Metadatos de perfil inválidos");
  const { main = null, secondaries = [], tekkenAccounts = [] } = metadata;
  if (main !== null && !getTekkenCharacter(main))
    throw new Error("Main inválido");
  if (
    !Array.isArray(secondaries) ||
    secondaries.some((key) => !getTekkenCharacter(key)) ||
    new Set(secondaries).size !== secondaries.length ||
    secondaries.includes(main)
  )
    throw new Error("Personajes secundarios inválidos o repetidos");
  if (!Array.isArray(tekkenAccounts) || tekkenAccounts.length > 20)
    throw new Error("Cuentas inválidas");
  const accounts = tekkenAccounts.map((account) => {
    if (!account || typeof account.tekkenId !== "string")
      throw new Error("Tekken ID inválido");
    const tekkenId = account.tekkenId.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,32}$/.test(tekkenId))
      throw new Error("Tekken ID inválido");
    if (account.active !== undefined && typeof account.active !== "boolean")
      throw new Error("Estado de cuenta inválido");
    if (account.isPublic !== undefined && typeof account.isPublic !== "boolean")
      throw new Error("Privacidad inválida");
    return {
      tekkenId,
      active: account.active ?? true,
      isPublic: account.isPublic ?? false,
    };
  });
  if (new Set(accounts.map((a) => a.tekkenId)).size !== accounts.length)
    throw new Error("Tekken ID repetido");
  return { main, secondaries, tekkenAccounts: accounts };
}

export function projectPlayerProfile({
  player,
  season,
  characters = [],
  ranking = null,
  results = [],
  accounts = [],
}) {
  return {
    id: String(player.id),
    displayName: player.display_name,
    // Only local avatars are rendered. Remote account URLs never become fetch targets.
    avatarUrl:
      typeof player.avatar_url === "string" &&
      /^\/images\/[\w /%.-]+\.(?:png|jpe?g|webp)$/i.test(player.avatar_url) &&
      !player.avatar_url.includes("..")
        ? player.avatar_url
        : null,
    main: characters.find((c) => c.is_main)?.character_key ?? null,
    secondaries: characters
      .filter((c) => !c.is_main)
      .map((c) => c.character_key),
    season: String(season),
    position: ranking?.posicion ?? null,
    points: ranking?.puntaje ?? null,
    tournamentCount: results.length,
    titles: results.filter((r) => r.placement === 1).length,
    podiums: results.filter((r) => r.placement >= 1 && r.placement <= 3).length,
    results: results.map((r) => ({
      tournamentId: String(r.tournamentId),
      title: r.title,
      date: r.date,
      placement: r.placement,
      points: r.points,
    })),
    publicTekkenIds: accounts
      .filter((a) => a.is_public)
      .map((a) => a.tekken_id),
  };
}
