import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  getAnonClient,
  getServiceClient,
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_ANON_KEY,
  LOCAL_SUPABASE_SERVICE_ROLE_KEY,
} from "../testSupabase.js";
import { savePlayerProfileMetadata } from "../../src/lib/playerProfileAdmin.js";
import {
  getPlayerProfile,
  getPublicPlayerTarget,
} from "../../src/lib/data/supabaseDb.js";

test.describe("canonical profiles and atomic metadata transfers", () => {
  let service, players;
  test.beforeAll(async () => {
    Object.assign(process.env, {
      NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    });
    service = getServiceClient();
    const { data, error } = await service
      .from("players")
      .insert([
        { display_name: "Profile duplicate name" },
        { display_name: "Profile duplicate name" },
        { display_name: "Profile no results" },
      ])
      .select("id");
    if (error) throw error;
    players = data;
    const { data: game } = await service.from("juegos").select("id").eq("nombre", "Tekken 8").single().throwOnError();
    await service.from("torneos").insert([994801, 994802].map((id) => ({ id, nombre: `Profile merge ${id}`, fecha_inicio: "2093-01-01", temporada: 9093, juego_id: game.id }))).throwOnError();
    await service.from("tournament_participants_raw").insert([
      { torneo_id: 994801, player_id: players[0].id, nombre_participante: "base", posicion: 1, puntaje: 100 },
      { torneo_id: 994801, player_id: players[1].id, nombre_participante: "duplicate conflict", posicion: 2, puntaje: 50 },
      { torneo_id: 994802, player_id: players[1].id, nombre_participante: "duplicate transferable", posicion: 1, puntaje: 100 },
    ]).throwOnError();
    await service.from("player_challonge_accounts").insert([
      { player_id: players[0].id, challonge_id: 994811, challonge_username: "same-person-current", active: true },
      { player_id: players[0].id, challonge_id: 994812, challonge_username: "same-person-old", active: false },
      { player_id: players[1].id, challonge_id: 994813, challonge_username: "duplicate-account", active: true },
    ]).throwOnError();
  });
  test.afterAll(async () => {
    if (players) {
      await service.from("torneos").delete().in("id", [994801, 994802]).throwOnError();
      await service
        .from("identidad_eventos")
        .delete()
        .eq("detalle->>base_player_id", String(players[0].id));
      await service
        .from("players")
        .delete()
        .in(
          "id",
          players.map((p) => p.id),
        );
    }
  });
  test("private accounts stay private; duplicate names remain different people", async () => {
    await savePlayerProfileMetadata(service, String(players[0].id), {
      main: "jin",
      secondaries: ["king"],
      tekkenAccounts: [
        { tekkenId: "PROFILE-PRIVATE" },
        { tekkenId: "PROFILE-PUBLIC", active: true, isPublic: true },
      ],
    });
    const a = await getPlayerProfile(String(players[0].id), "2026");
    const b = await getPlayerProfile(String(players[1].id), "2026");
    expect(a).toMatchObject({
      main: "jin",
      secondaries: ["king"],
      publicTekkenIds: ["PROFILE-PUBLIC"],
      tournamentCount: 0,
    });
    expect(a.id).not.toBe(b.id);
    const competitive = await getPlayerProfile(String(players[0].id), "9093");
    expect(competitive).toMatchObject({ tournamentCount: 1, titles: 1, podiums: 1 });
    expect((await service.from("player_challonge_accounts").select("id").eq("player_id", players[0].id).throwOnError()).data).toHaveLength(2);
    const { data } = await getAnonClient()
      .from("player_tekken_accounts")
      .select("*")
      .eq("player_id", players[0].id);
    expect(data.map((row) => row.tekken_id)).toEqual(["PROFILE-PUBLIC"]);
    await expect(
      savePlayerProfileMetadata(service, String(players[1].id), {
        tekkenAccounts: [{ tekkenId: "PROFILE-PRIVATE" }],
      }),
    ).rejects.toThrow();
    expect(
      (await getPlayerProfile(String(players[2].id), "2026")).position,
    ).toBeNull();
  });
  test("merge fails atomically when audit FK fails, and keeps the survivor main on success", async () => {
    await savePlayerProfileMetadata(service, String(players[1].id), {
      main: "kazuya",
      secondaries: ["jin"],
      tekkenAccounts: [{ tekkenId: "PROFILE-MOVED", active: true }],
    });
    const args = {
      p_base_id: players[0].id,
      p_duplicate_id: players[1].id,
      p_actor_id: randomUUID(),
      p_actor_email: "test",
    };
    const failed = await service.rpc("merge_player_profiles", args);
    expect(failed.error).not.toBeNull();
    const { data: before } = await service
      .from("player_tekken_accounts")
      .select("player_id")
      .eq("tekken_id", "PROFILE-MOVED")
      .single();
    expect(before.player_id).toBe(players[1].id);
    expect((await service.from("tournament_participants_raw").select("player_id").eq("torneo_id", 994802).single().throwOnError()).data.player_id).toBe(players[1].id);
    expect(
      (
        await service
          .from("players")
          .select("merged_into_player_id")
          .eq("id", players[1].id)
          .single()
      ).data.merged_into_player_id,
    ).toBeNull();
    const denied = await getAnonClient().rpc("merge_player_profiles", {
      ...args,
      p_actor_id: null,
    });
    expect(denied.error?.code).toBe("42501");
    const merged = await service.rpc("merge_player_profiles", {
      ...args,
      p_actor_id: null,
    });
    expect(merged.error).toBeNull();
    expect(merged.data.conflictos).toEqual([994801]);
    expect(merged.data.participantes_reasignados).toBe(1);
    expect(merged.data.torneos_reasignados).toEqual([994802]);
    const profile = await getPlayerProfile(String(players[0].id), "2026");
    expect(profile.main).toBe("jin");
    expect(profile.secondaries.sort()).toEqual(["kazuya", "king"]);
    expect((await service.from("tournament_participants_raw").select("player_id").eq("torneo_id", 994802).single().throwOnError()).data.player_id).toBe(players[0].id);
    expect((await service.from("tournament_participants_raw").select("player_id").eq("torneo_id", 994801).eq("nombre_participante", "duplicate conflict").single().throwOnError()).data.player_id).toBe(players[1].id);
    const { data: movedChallonge } = await service.from("player_challonge_accounts").select("player_id,active").eq("challonge_id", 994813).single().throwOnError();
    expect(movedChallonge).toEqual({ player_id: players[0].id, active: false });
    expect(await getPublicPlayerTarget(String(players[1].id))).toBe(
      String(players[0].id),
    );
    expect(
      (
        await service
          .from("player_tekken_accounts")
          .select("player_id")
          .eq("tekken_id", "PROFILE-MOVED")
          .single()
      ).data.player_id,
    ).toBe(players[0].id);
  });
  test("public result IDs preserve bigint precision", async () => {
    const tournamentIds = ["9007199254740992", "9007199254740993"];
    const { data: game } = await service.from("juegos").select("id").eq("nombre", "Tekken 8").single().throwOnError();
    try {
      await service.from("torneos").insert(tournamentIds.map((id) => ({ id, nombre: `Bigint ${id}`, fecha_inicio: "2094-01-01", temporada: 9094, juego_id: game.id }))).throwOnError();
      await service.from("tournament_participants_raw").insert(tournamentIds.map((torneo_id) => ({ torneo_id, player_id: players[2].id, nombre_participante: "Bigint profile", posicion: 1, puntaje: 1 }))).throwOnError();
      const profile = await getPlayerProfile(String(players[2].id), "9094");
      expect(profile.results.map((r) => r.tournamentId)).toEqual(["9007199254740993", "9007199254740992"]);
    } finally {
      await service.from("torneos").delete().in("id", tournamentIds).throwOnError();
    }
  });

  test("DB rejects a second main and anonymous writes", async () => {
    const second = await service
      .from("player_characters")
      .insert({
        player_id: players[0].id,
        character_key: "paul",
        is_main: true,
      });
    expect(second.error?.code).toBe("23505");
    const denied = await getAnonClient()
      .from("player_characters")
      .insert({ player_id: players[0].id, character_key: "paul" });
    expect(denied.error?.code).toBe("42501");
  });
});
