import { createClient } from "@supabase/supabase-js";

let client = null;

function getClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }

  return client;
}

// El nombre a mostrar es el nombre alternativo activo si existe,
// si no el username de challonge.
function getDisplayName(usuario) {
  const activo = usuario?.nombres_alternativos?.find((n) => n.activo);
  return activo?.nombre || usuario?.challonge_username || "Desconocido";
}

const USUARIO_SELECT =
  "id, challonge_username, nombres_alternativos ( nombre, activo )";

const getTorneos = async () => {
  const { data, error } = await getClient()
    .from("torneos")
    .select("id, nombre, fecha_inicio, temporada")
    .order("fecha_inicio", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener torneos: ${error.message}`);
  }

  return data.map((torneo) => ({
    torneo_id: torneo.id,
    nombre_torneo: torneo.nombre,
    fecha_torneo: torneo.fecha_inicio,
    temporada: String(torneo.temporada),
  }));
};

const getTorneoResultados = async (torneoId) => {
  const id = Number(torneoId);
  if (!Number.isFinite(id)) {
    return null;
  }

  const { data, error } = await getClient()
    .from("resultados")
    .select(
      `posicion, puntaje, torneo:torneos ( nombre ), usuario:usuarios ( ${USUARIO_SELECT} )`,
    )
    .eq("torneo_id", id)
    .order("posicion", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener resultados: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data.map((resultado) => ({
    torneo: {
      nombre_torneo: resultado.torneo.nombre,
    },
    usuario: {
      challonge_username: getDisplayName(resultado.usuario),
    },
    posicion: resultado.posicion,
    puntaje: resultado.puntaje,
  }));
};

const getCompetidores = async () => {
  const { data, error } = await getClient()
    .from("usuarios")
    .select(USUARIO_SELECT);

  if (error) {
    throw new Error(`Error al obtener competidores: ${error.message}`);
  }

  return data
    .map((usuario) => ({ id: usuario.id, challonge_username: getDisplayName(usuario) }))
    .sort((a, b) => a.challonge_username.localeCompare(b.challonge_username));
};

const getRankings = async () => {
  const supabase = getClient();

  // Ultimos dos torneos de la temporada mas reciente: el ultimo define el
  // ranking actual y el anterior sirve para calcular el movimiento.
  const { data: ultimosTorneos, error: torneosError } = await supabase
    .from("torneos")
    .select("id, temporada")
    .order("temporada", { ascending: false })
    .order("fecha_inicio", { ascending: false })
    .limit(2);

  if (torneosError) {
    throw new Error(`Error al obtener torneos: ${torneosError.message}`);
  }

  if (!ultimosTorneos || ultimosTorneos.length === 0) {
    return [];
  }

  const [ultimo, anterior] = ultimosTorneos;

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("ranking_snapshots")
    .select(
      `usuario_id, posicion_global, puntaje_acumulado, usuario:usuarios ( ${USUARIO_SELECT} )`,
    )
    .eq("torneo_id", ultimo.id)
    .order("posicion_global", { ascending: true });

  if (snapshotsError) {
    throw new Error(`Error al obtener ranking: ${snapshotsError.message}`);
  }

  const posicionesAnteriores = new Map();
  if (anterior && anterior.temporada === ultimo.temporada) {
    const { data: previos, error: previosError } = await supabase
      .from("ranking_snapshots")
      .select("usuario_id, posicion_global")
      .eq("torneo_id", anterior.id);

    if (previosError) {
      throw new Error(
        `Error al obtener ranking anterior: ${previosError.message}`,
      );
    }

    previos.forEach((snapshot) => {
      posicionesAnteriores.set(snapshot.usuario_id, snapshot.posicion_global);
    });
  }

  return snapshots.map((snapshot) => ({
    posicion: snapshot.posicion_global,
    challonge_username: getDisplayName(snapshot.usuario),
    puntaje: snapshot.puntaje_acumulado,
    movimiento: getMovimiento(
      snapshot.posicion_global,
      posicionesAnteriores.get(snapshot.usuario_id),
    ),
  }));
};

const getFiltroAno = async () => {
  const { data, error } = await getClient()
    .from("torneos")
    .select("temporada")
    .order("temporada", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener temporadas: ${error.message}`);
  }

  return [...new Set(data.map((torneo) => String(torneo.temporada)))];
};

export {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
};

function getMovimiento(currentPosition, previousPosition) {
  if (!previousPosition) {
    return "NUEVO";
  }

  if (currentPosition < previousPosition) {
    return "SUBE";
  }

  if (currentPosition > previousPosition) {
    return "BAJA";
  }

  return "IGUAL";
}
