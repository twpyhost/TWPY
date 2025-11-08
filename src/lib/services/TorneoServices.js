import supabase from "@/app/utils/db";

const GetTorneos = async () => {
  const { data, error } = await supabase
    .from("torneo")
    .select("torneo_id, nombre_torneo, fecha_torneo");

  if (error) {
    console.error("Error fetching torneos: ", error);
    return null;
  }

  const torneosWithTemporada = data.map((torneo) => {
    const temporada = torneo.fecha_torneo.split("-")[0];
    return { ...torneo, temporada }; // Create a new object with the additional property
  });

  return torneosWithTemporada;
}

const GetTorneo = async (juego_id,torneo_id) => {
  const { data, error } = await supabase
    .from("torneo")
    .select("*")
    .eq("juego_id",juego_id)
    .eq("torneo_id",torneo_id);

  if (error) {
    console.error("Error al retornar torneos: ", error);
    return null;
  }

  return data[0];
}

const PostTorneo = async (torneo) => {
  const { error } = await supabase.from("torneo").insert(torneo);
  if (error) {
    console.error("Error al insertar torneo ", error);
  }

  return new Response({
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}

const DeleteTorneo = async (torneo) => {
  const { error } = await supabase
    .from("torneo")
    .delete()
    .eq("juego_id", torneo.juego_id)
    .eq("torneo_id", torneo.torneo_id);
  if (error) {
    console.error("No se pudo borrar el torneo ", error);
  }
  return new Response({
    headers: { "Content-Type": "application/json" },
    status: 204,
  });
}

export { GetTorneos, GetTorneo, PostTorneo, DeleteTorneo };
