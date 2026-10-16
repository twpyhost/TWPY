import { test, expect } from "@playwright/test";
import {
  projectPlayerProfile,
  resolvePublicPlayerTarget,
  validateProfileMetadata,
} from "../../src/lib/playerProfiles.js";
import * as mockDb from "../../src/lib/data/mockDb.js";

test("profile counts finishes, preserves null rank and whitelists public data", () => {
  const profile = projectPlayerProfile({
    player: {
      id: 7,
      display_name: "Dos personas pueden llamarse igual",
      discord_id: "private",
      auth_user_id: "private",
    },
    season: "2026",
    characters: [],
    ranking: null,
    accounts: [
      { tekken_id: "PRIVATE-ID", is_public: false },
      { tekken_id: "PUBLIC-ID", is_public: true },
    ],
    results: [1, 2, 3, 4].map((placement, i) => ({
      tournamentId: String(i + 1),
      title: "Torneo",
      date: "2026-01-01",
      placement,
      points: 10,
    })),
  });
  expect(profile).toMatchObject({
    id: "7",
    main: null,
    position: null,
    points: null,
    tournamentCount: 4,
    titles: 1,
    podiums: 3,
    publicTekkenIds: ["PUBLIC-ID"],
  });
  expect(Object.keys(profile).sort()).toEqual(
    [
      "id",
      "displayName",
      "avatarUrl",
      "main",
      "secondaries",
      "season",
      "position",
      "points",
      "tournamentCount",
      "titles",
      "podiums",
      "results",
      "publicTekkenIds",
    ].sort(),
  );
  expect(JSON.stringify(profile)).not.toMatch(
    /PRIVATE-ID|discord_id|auth_user_id|winRate/,
  );
});

test("main and secondaries validate catalog keys and never duplicate a character", () => {
  expect(
    validateProfileMetadata({
      main: "jin",
      secondaries: ["king"],
      tekkenAccounts: [{ tekkenId: "abc-123", active: true }],
    }),
  ).toEqual({
    main: "jin",
    secondaries: ["king"],
    tekkenAccounts: [{ tekkenId: "ABC-123", active: true, isPublic: false }],
  });
  for (const metadata of [
    { main: ["jin", "king"] },
    { main: "unknown" },
    { main: "jin", secondaries: ["jin"] },
    { secondaries: ["king", "king"] },
    { tekkenAccounts: [{ tekkenId: "same" }, { tekkenId: "SAME" }] },
  ]) {
    expect(() => validateProfileMetadata(metadata)).toThrow();
  }
});

test("malformed metadata cannot silently erase a profile", () => {
  for (const input of [null, "jin", 1, true, []]) {
    expect(() => validateProfileMetadata(input)).toThrow();
  }
});

test("mock facade supports the same public identity and season contracts", async () => {
  const player = (await mockDb.getCompetidores())[0];
  const id = String(player.id);
  expect(await mockDb.getPublicPlayerTarget(id)).toBe(id);
  expect(await mockDb.getPublicPlayerTarget("not-an-id")).toBeNull();
  expect(await mockDb.getPlayerProfile("9223372036854775807")).toBeNull();
  const profile = await mockDb.getPlayerProfile(id, "2026");
  expect(profile).toMatchObject({ id, displayName: player.nombre, season: "2026", main: null, secondaries: [], publicTekkenIds: [] });
  expect(profile.results.every((r) => typeof r.tournamentId === "string")).toBe(true);
});

test("canonical redirect is bounded, cycle safe, and rejects invalid IDs before lookup", async () => {
  const rows = {
    1: { id: 1, merged_into_player_id: 2 },
    2: { id: 2, merged_into_player_id: null },
    3: { id: 3, merged_into_player_id: 4 },
    4: { id: 4, merged_into_player_id: 3 },
  };
  const lookup = async (id) => rows[id] ?? null;
  expect(await resolvePublicPlayerTarget("1", lookup)).toBe("2");
  expect(await resolvePublicPlayerTarget("3", lookup)).toBeNull();
  expect(
    await resolvePublicPlayerTarget("unknown", () => {
      throw new Error("must not query");
    }),
  ).toBeNull();
  expect(await resolvePublicPlayerTarget("9", lookup)).toBeNull();
  expect(
    await resolvePublicPlayerTarget("1", async (id) => ({
      id,
      merged_into_player_id: String(BigInt(id) + 1n),
    })),
  ).toBeNull();
});
