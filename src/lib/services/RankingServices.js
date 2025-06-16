import supabase from "../db";

const GetRanking = async () => {
  const { data, error } = await supabase.rpc("player_ranking");

  if (error) {
    console.error("Error fetching torneos: ", error);
    return null;
  }

  return data;
};

export { GetRanking};
