import { test, expect } from "@playwright/test";
import { getAnonClient } from "../../testSupabase.js";
import { LIGA_EMAIL, LIGA_PASSWORD } from "../fixtures/datos.js";

test("liga cannot edit profile metadata, merge identities or invoke internal RPCs", async ({
  page,
}) => {
  const edit = await page.request.patch("/api/admin/jugadores/1", {
    data: { profileMetadata: { main: "jin" } },
  });
  expect(edit.status()).toBe(403);
  const merge = await page.request.post("/api/admin/identidades/fusionar", {
    data: { basePlayerId: 1, duplicatePlayerId: 2 },
  });
  expect(merge.status()).toBe(403);
  const client = getAnonClient();
  const { error: loginError } = await client.auth.signInWithPassword({
    email: LIGA_EMAIL,
    password: LIGA_PASSWORD,
  });
  expect(loginError).toBeNull();
  const denied = await client.rpc("merge_player_profiles", {
    p_base_id: 1,
    p_duplicate_id: 2,
    p_actor_id: null,
    p_actor_email: null,
  });
  expect(denied.error?.code).toBe("42501");
  const saveDenied = await client.rpc("save_player_profile_metadata", {
    p_player_id: 1,
    p_main: "jin",
    p_secondaries: [],
    p_accounts: [],
  });
  expect(saveDenied.error?.code).toBe("42501");
  // Do not revoke the separate browser session created by setup-liga.
  await client.auth.signOut({ scope: "local" });
  expect((await page.request.get("/api/admin/jugadores")).status()).toBe(403);
});
