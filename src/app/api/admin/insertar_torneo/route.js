import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/adminAuth";
import { extractTournamentId, fetchChallongeApi } from "@/lib/challonge";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recalcularSnapshots } from "@/lib/rankings";

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
  const cuentasPorChallongeId = await obtenerCuentasChallonge(supabase);

  const filas = [];
  const challongeIdsUsados = new Set();
  const playerIdsUsados = new Set();
  let resueltos = 0;
  let sinResolver = 0;

  for (const participante of participantes) {
    const challongeId = participante.challonge_user_id || null;
    const username =
      participante.challonge_username || participante.username || null;
    const displayName =
      participante.display_name || participante.name || username || "Desconocido";
    const posicion = participante.final_rank;

    if (!posicion) {
      advertencias.push(
        `"${displayName}" no tiene posicion final en Challonge, se omite`,
      );
      continue;
    }

    if (challongeId) {
      if (challongeIdsUsados.has(challongeId)) {
        advertencias.push(
          `"${displayName}" ya tiene un resultado en este torneo, se omite el duplicado`,
        );
        continue;
      }
      challongeIdsUsados.add(challongeId);
    }

    let puntaje = puntosPorPosicion.get(posicion);
    if (puntaje === undefined) {
      puntaje = 0;
      advertencias.push(
        `Posicion ${posicion} ("${displayName}") sin puntaje configurado: se asignaron 0 puntos`,
      );
    }

    // Unico criterio de auto-resolucion: challonge_id exacto. Nunca por
    // nombre (ver README: dos personas distintas pueden compartir nombre).
    const cuenta = challongeId ? cuentasPorChallongeId.get(challongeId) : null;

    if (cuenta) {
      if (playerIdsUsados.has(cuenta.player_id)) {
        advertencias.push(
          `"${displayName}" ya tiene un resultado en este torneo bajo otra cuenta, se omite`,
        );
        continue;
      }
      playerIdsUsados.add(cuenta.player_id);
      resueltos += 1;

      filas.push({
        torneo_id: tournament.id,
        challonge_id: challongeId,
        challonge_username: username,
        nombre_participante: displayName,
        posicion,
        puntaje,
        player_id: cuenta.player_id,
        resolved_at: new Date().toISOString(),
      });
    } else {
      sinResolver += 1;
      advertencias.push(
        `"${displayName}" no coincide con ninguna cuenta de Challonge conocida: queda pendiente en la cola de identidades`,
      );

      filas.push({
        torneo_id: tournament.id,
        challonge_id: challongeId,
        challonge_username: username,
        nombre_participante: displayName,
        posicion,
        puntaje,
        player_id: null,
      });
    }
  }

  if (filas.length === 0) {
    throw new Error("El torneo no tiene participantes con posicion final");
  }

  const { error: participantesError } = await supabase
    .from("tournament_participants_raw")
    .insert(filas);

  if (participantesError) {
    throw participantesError;
  }

  await recalcularSnapshots(supabase, temporada);

  return {
    participantes: filas.length,
    resueltos,
    sin_resolver: sinResolver,
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

async function obtenerCuentasChallonge(supabase) {
  const { data, error } = await supabase
    .from("player_challonge_accounts")
    .select("challonge_id, player_id, challonge_username");

  if (error) {
    throw error;
  }

  return new Map(data.map((cuenta) => [cuenta.challonge_id, cuenta]));
}
