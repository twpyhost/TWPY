import { createClient } from "@supabase/supabase-js";
// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_ANON_KEY || ""
);

const getTorneos = async () => {
  const { data, error } = await supabase
    .from("torneo")
    .select("torneo_id, nombre_torneo, fecha_torneo"); // Fix syntax here

  if (error) {
    console.error("Error fetching torneos: ", error);
    return null;
  }

  return data;
};

const getCompetidores = async () => {
  const { data, error } = await supabase
    .from("usuario")
    .select("challonge_username")
    .order("challonge_username");

  if (error) {
    console.error("Error fetching torneos: ", error);
    return null;
  }

  return data;
};
const getRankings = async () => {
  const { data, error } = await supabase.rpc("player_ranking");

  if (error) {
    console.error("Error fetching torneos: ", error);
    return null;
  }

  return data;
};

const getFiltroAno = async () => {
  const { data, error } = await supabase.rpc("get_filtro_ano");
  if (error) {
    console.error(error);
    return null;
  }

  return data;
};

export { getTorneos, getRankings, getCompetidores, getFiltroAno };
