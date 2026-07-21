import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/adminAuth";
import { extractTournamentId, fetchChallongeApi } from "@/lib/challonge";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { user, isAdmin, error } = await getAdminUser();
    if (error) {
      return Response.json(
        { error: "Ha ocurrido un error al validar la sesion" },
        { status: 500 },
      );
    }

    if (!user) {
      return Response.json(
        { error: "Debes iniciar sesion para cargar torneos" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return Response.json(
        { error: "No tenes permisos para cargar torneos" },
        { status: 403 },
      );
    }

    const { url } = await req.json();
    if (!url) {
      return Response.json({ error: "Se requiere la URL" }, { status: 400 });
    }

    const tournamentId = extractTournamentId(url);
    if (!tournamentId) {
      return Response.json({ error: "URL no valida" }, { status: 400 });
    }

    const apiResponse = await fetchChallongeApi(tournamentId);
    if (!apiResponse) {
      return Response.json(
        { error: "No se pudo conectar con Challonge" },
        { status: 502 },
      );
    }

    if (!apiResponse.ok) {
      const errorMessage = await apiResponse.text();
      return Response.json(
        { error: errorMessage },
        { status: apiResponse.status },
      );
    }

    const { tournament } = await apiResponse.json();

    if (tournament.state !== "complete") {
      return Response.json(
        { error: "El torneo todavia no esta finalizado en Challonge" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existente, error: existenteError } = await supabase
      .from("torneos")
      .select("id")
      .eq("id", tournament.id)
      .maybeSingle();

    if (existenteError) {
      throw existenteError;
    }

    if (existente) {
      return Response.json(
        { error: "Este torneo ya fue cargado anteriormente" },
        { status: 409 },
      );
    }

    const resumen = await insertarTorneo(supabase, tournament);

    // Refresca las paginas publicas cacheadas de inmediato.
    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");

    return Response.json(
      { message: "Torneo insertado exitosamente", resumen },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al insertar el torneo" },
      { status: 500 },
    );
  }
}

async function insertarTorneo(supabase, tournament) {
  const juegoId = await obtenerJuegoId(supabase, tournament.game_name);

  const fechaInicio = (
    tournament.started_at ||
    tournament.completed_at ||
    tournament.created_at
  ).slice(0, 10);
  const temporada = Number(fechaInicio.slice(0, 4));

  const { error: torneoError } = await supabase.from("torneos").insert({
    id: tournament.id,
    nombre: tournament.name,
    fecha_inicio: fechaInicio,
    temporada,
    juego_id: juegoId,
    url_challonge: tournament.full_challonge_url || tournament.url,
  });

  if (torneoError) {
    throw torneoError;
  }

  try {
    const resumen = await insertarResultados(
      supabase,
      tournament,
      juegoId,
      temporada,
    );

    return {
      torneo: tournament.name,
      fecha: fechaInicio,
      temporada,
      ...resumen,
    };
  } catch (error) {
    // Revierte el torneo (cascade borra resultados/snapshots parciales)
    // para que se pueda reintentar desde cero.
    await supabase.from("torneos").delete().eq("id", tournament.id);
    throw error;
  }
}

async function obtenerJuegoId(supabase, gameName) {
  const nombre = gameName || "Desconocido";

  const { data: juego, error } = await supabase
    .from("juegos")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (juego) {
    return juego.id;
  }

  const { data: nuevo, error: insertError } = await supabase
    .from("juegos")
    .insert({ nombre })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return nuevo.id;
}

async function insertarResultados(supabase, tournament, juegoId, temporada) {
  const advertencias = [];
  const participantes = (tournament.participants || []).map(
    (item) => item.participant || item,
  );

  const puntosPorPosicion = await obtenerPuntajes(supabase, juegoId);
  const { porChallongeId, porNombre } = await obtenerUsuariosExistentes(
    supabase,
  );

  const filas = [];
  const usuariosUsados = new Set();
  let usuariosCreados = 0;
  let usuariosTemporales = 0;

  for (const participante of participantes) {
    const challongeId = participante.challonge_user_id || null;
    const username =
      participante.challonge_username || participante.username || null;
    const displayName =
      participante.display_name || participante.name || username;
    const posicion = participante.final_rank;

    if (!posicion) {
      advertencias.push(
        `"${displayName}" no tiene posicion final en Challonge, se omite`,
      );
      continue;
    }

    let usuario =
      (challongeId && porChallongeId.get(challongeId)) ||
      (displayName && porNombre.get(displayName.toLowerCase())) ||
      (username && porNombre.get(username.toLowerCase())) ||
      null;

    if (!usuario) {
      usuario = await crearUsuario(supabase, {
        challongeId,
        username,
        displayName,
      });

      usuariosCreados += 1;
      if (usuario.es_temporal) {
        usuariosTemporales += 1;
        advertencias.push(
          `"${displayName}" no tiene cuenta de Challonge: se creo como usuario temporal`,
        );
      }

      if (challongeId) {
        porChallongeId.set(challongeId, usuario);
      }
      porNombre.set(displayName.toLowerCase(), usuario);
    }

    if (usuariosUsados.has(usuario.id)) {
      advertencias.push(
        `"${displayName}" ya tiene un resultado en este torneo, se omite el duplicado`,
      );
      continue;
    }
    usuariosUsados.add(usuario.id);

    let puntaje = puntosPorPosicion.get(posicion);
    if (puntaje === undefined) {
      puntaje = 0;
      advertencias.push(
        `Posicion ${posicion} ("${displayName}") sin puntaje configurado: se asignaron 0 puntos`,
      );
    }

    filas.push({
      torneo_id: tournament.id,
      usuario_id: usuario.id,
      posicion,
      puntaje,
    });
  }

  if (filas.length === 0) {
    throw new Error("El torneo no tiene participantes con posicion final");
  }

  const { error: resultadosError } = await supabase
    .from("resultados")
    .insert(filas);

  if (resultadosError) {
    throw resultadosError;
  }

  await recalcularSnapshots(supabase, temporada);

  return {
    resultados: filas.length,
    usuarios_creados: usuariosCreados,
    usuarios_temporales: usuariosTemporales,
    advertencias,
  };
}

async function obtenerPuntajes(supabase, juegoId) {
  const { data, error } = await supabase
    .from("puntajes_config")
    .select("posicion, puntos")
    .eq("juego_id", juegoId);

  if (error) {
    throw error;
  }

  return new Map(data.map((fila) => [fila.posicion, fila.puntos]));
}

async function obtenerUsuariosExistentes(supabase) {
  const { data, error } = await supabase
    .from("usuarios")
    .select(
      "id, challonge_id, challonge_username, es_temporal, nombres_alternativos ( nombre, activo )",
    );

  if (error) {
    throw error;
  }

  const porChallongeId = new Map();
  const porNombre = new Map();

  for (const usuario of data) {
    if (usuario.challonge_id) {
      porChallongeId.set(usuario.challonge_id, usuario);
    }

    porNombre.set(usuario.challonge_username.toLowerCase(), usuario);
    for (const alternativo of usuario.nombres_alternativos || []) {
      if (alternativo.activo) {
        porNombre.set(alternativo.nombre.toLowerCase(), usuario);
      }
    }
  }

  return { porChallongeId, porNombre };
}

async function crearUsuario(supabase, { challongeId, username, displayName }) {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .insert({
      challonge_id: challongeId,
      challonge_username: username || displayName,
      es_temporal: !challongeId,
    })
    .select("id, challonge_id, challonge_username, es_temporal")
    .single();

  if (error) {
    throw error;
  }

  // Registra el nombre visto en el torneo como nombre alternativo activo
  // (README: se respeta hasta conocer su cuenta real de Challonge).
  const { error: nombreError } = await supabase
    .from("nombres_alternativos")
    .insert({ usuario_id: usuario.id, nombre: displayName, activo: true });

  if (nombreError) {
    throw nombreError;
  }

  return usuario;
}

// Recalcula los cortes de ranking de toda la temporada en orden
// cronologico, para que insertar un torneo viejo tambien deje la
// historia consistente.
async function recalcularSnapshots(supabase, temporada) {
  const { data: torneos, error: torneosError } = await supabase
    .from("torneos")
    .select("id")
    .eq("temporada", temporada)
    .order("fecha_inicio", { ascending: true })
    .order("id", { ascending: true });

  if (torneosError) {
    throw torneosError;
  }

  const torneoIds = torneos.map((torneo) => torneo.id);

  const { data: resultados, error: resultadosError } = await supabase
    .from("resultados")
    .select("torneo_id, usuario_id, puntaje")
    .in("torneo_id", torneoIds);

  if (resultadosError) {
    throw resultadosError;
  }

  const resultadosPorTorneo = new Map(torneoIds.map((id) => [id, []]));
  for (const resultado of resultados) {
    resultadosPorTorneo.get(resultado.torneo_id)?.push(resultado);
  }

  const acumulados = new Map();
  const snapshots = [];

  for (const torneoId of torneoIds) {
    for (const resultado of resultadosPorTorneo.get(torneoId)) {
      acumulados.set(
        resultado.usuario_id,
        (acumulados.get(resultado.usuario_id) || 0) + resultado.puntaje,
      );
    }

    [...acumulados.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([usuarioId, puntajeAcumulado], index) => {
        snapshots.push({
          torneo_id: torneoId,
          usuario_id: usuarioId,
          temporada,
          puntaje_acumulado: puntajeAcumulado,
          posicion_global: index + 1,
        });
      });
  }

  const { error: deleteError } = await supabase
    .from("ranking_snapshots")
    .delete()
    .eq("temporada", temporada);

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await supabase
    .from("ranking_snapshots")
    .insert(snapshots);

  if (insertError) {
    throw insertError;
  }
}
