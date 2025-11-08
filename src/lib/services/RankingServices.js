import supabase from "@/app/utils/db";

const GetRanking = async (ano,mes) => {
  
  const proceso= {ano,mes};
  const {data,error} = await supabase.rpc("player_ranking",proceso);
  if (error) {
    console.error("Error fetching ranking: ", error);
    return null;
  }

  return data;
};

export { GetRanking};
