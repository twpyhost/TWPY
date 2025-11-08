import supabase from "@/app/utils/db";

const GetAllResultados = async () => {
  const { data, error } = await supabase
    .from("torneo_resultado")
    .select("*");

  if (error) {
    console.error("Error al retornar resultados: ", error);
    return null;
  }

  return data;
}

const GetResultadosTorneo = async (juego_id,torneo_id) => {
  const { data, error } = await supabase
    .from("torneo_resultado")
    .select("torneo (nombre_torneo), usuario (challonge_username), posicion, puntaje")
    .eq("juego_id",juego_id)
    .eq("torneo_id",torneo_id)
    .order("posicion");

  if (error) {
    console.error("Error al retornar resultados: ", error);
    return null;
  }

  return data;
}

const PostResultado = async (torneo) => {
  const { error } = await supabase.from("torneo_resultado").insert(resultado);
  if (error) {
    console.error("Error al insertar resultado ", error);
  }

  return new Response({
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}

const DeleteResultado = async (torneo) => {
  const { error } = await supabase
    .from("torneo_resultado")
    .delete()
    .eq("juego_id", torneo.juego_id)
    .eq("torneo_id", torneo.torneo_id);
  if (error) {
    console.error("No se pudo borrar el resultado ", error);
  }
  return new Response({
    headers: { "Content-Type": "application/json" },
    status: 204,
  });
}

export { GetAllResultados, GetResultadosTorneo, PostResultado, DeleteResultado };
