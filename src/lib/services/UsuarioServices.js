import supabase from "@/app/utils/db";

const GetUsuarios = async () => {
  const { data, error } = await supabase
    .from("usuario")
    .select("challonge_username")
    .order("challonge_username");

  if (error) {
    console.error("Error al retornar usuarios: ", error);
    return null;
  }

  return data;
}

const GetUsuario = async (challonge_id) => {
  const { data, error } = await supabase
    .from("usuario")
    .select("challonge_username")
    .eq("challonge_id",challonge_id);

  if (error) {
    console.error("Error al retornar usuario: ", error);
    return null;
  }

  return data[0];
}

const PostUsuario = async (usuario) => {
  const { error } = await supabase.from("usuario").insert(usuario);
  if (error) {
    console.error("Error al insertar usuario ", error);
  }

  return new Response({
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}

const DeleteUsuario = async (usuario) => {
  const { error } = await supabase
    .from("usuario")
    .delete()
    .eq("challonge_id", usuario.challonge_id);
  if (error) {
    console.error("No se pudo borrar el usuario ", error);
  }
  return new Response({
    headers: { "Content-Type": "application/json" },
    status: 204,
  });
}

export { GetUsuarios, GetUsuario, PostUsuario, DeleteUsuario };
