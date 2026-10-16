import { isPublicId, validateProfileMetadata } from "./playerProfiles.js";

export async function savePlayerProfileMetadata(supabase, playerId, metadata) {
  if (!isPublicId(playerId)) throw new Error("Jugador inválido");
  const value = validateProfileMetadata(metadata);
  const { error } = await supabase.rpc("save_player_profile_metadata", {
    p_player_id: playerId,
    p_main: value.main,
    p_secondaries: value.secondaries,
    p_accounts: value.tekkenAccounts,
  });
  if (error) throw new Error(error.message);
}

export async function getPlayerProfileMetadata(supabase, playerId) {
  const [characters, accounts] = await Promise.all([
    supabase
      .from("player_characters")
      .select("character_key,is_main")
      .eq("player_id", playerId),
    supabase
      .from("player_tekken_accounts")
      .select("id,tekken_id,active,is_public")
      .eq("player_id", playerId)
      .order("id"),
  ]);
  if (characters.error) throw characters.error;
  if (accounts.error) throw accounts.error;
  return {
    main: characters.data.find((c) => c.is_main)?.character_key ?? null,
    secondaries: characters.data
      .filter((c) => !c.is_main)
      .map((c) => c.character_key),
    tekkenAccounts: accounts.data.map((a) => ({
      tekkenId: a.tekken_id,
      active: a.active,
      isPublic: a.is_public,
    })),
  };
}
