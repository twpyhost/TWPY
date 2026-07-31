// Pipeline completo de importacion contra el stack local de Supabase.
// insertarTorneo() recibe el objeto `tournament` ya parseado (sin HTTP),
// igual que lo llama la ruta de admin tras el fetch a la API de Challonge.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";

import { getServiceClient } from "../testSupabase.js";
import { insertarTorneo } from "../../src/lib/importarTorneo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre) {
  const contenido = fs.readFileSync(
    path.join(__dirname, "..", "fixtures", nombre),
    "utf-8",
  );
  return JSON.parse(contenido);
}

async function limpiarTorneo(supabase, torneoId) {
  await supabase.from("torneos").delete().eq("id", torneoId);
}

test.describe("insertarTorneo (pipeline de import)", () => {
  let supabase;

  test.beforeAll(() => {
    supabase = getServiceClient();
  });

  test.afterEach(async () => {
    // Defensivo: por si algun test no llego a limpiar por un fallo previo.
    await Promise.all(
      [990001, 990002, 990003, 990004, 990005, 990006].map((id) =>
        limpiarTorneo(supabase, id),
      ),
    );
  });

  test("omite participantes sin final_rank, sin puntaje configurado da 0 pts, y omite challonge_id duplicado", async () => {
    const fixture = cargarFixture("torneo-basico.json");

    const { data: player } = await supabase
      .from("players")
      .insert({ display_name: "Fixture Jugador Resuelto" })
      .select("id")
      .single();

    await supabase.from("player_challonge_accounts").insert({
      challonge_id: 700001,
      player_id: player.id,
      challonge_username: "resuelto",
    });

    try {
      const resumen = await insertarTorneo(supabase, fixture);

      // 5 participantes: 1 sin final_rank omitido, 1 duplicado de
      // challonge_id omitido -> quedan 3 filas (resuelto, sin_puntaje,
      // desconocido/pendiente).
      expect(resumen.participantes).toBe(3);
      expect(resumen.resueltos).toBe(1);
      // "Posicion Sin Puntaje" (700003) tampoco tiene cuenta seedeada, asi
      // que queda sin resolver ademas de sin puntaje configurado.
      expect(resumen.sin_resolver).toBe(2);

      expect(
        resumen.advertencias.some((a) => a.includes("Sin Posicion")),
      ).toBe(true);
      expect(
        resumen.advertencias.some((a) => a.includes("Duplicado De Resuelto")),
      ).toBe(true);
      expect(
        resumen.advertencias.some((a) =>
          a.includes("sin puntaje configurado"),
        ),
      ).toBe(true);

      const { data: filas } = await supabase
        .from("tournament_participants_raw")
        .select("nombre_participante, posicion, puntaje, player_id")
        .eq("torneo_id", fixture.id);

      const sinPuntaje = filas.find(
        (f) => f.nombre_participante === "Posicion Sin Puntaje",
      );
      expect(sinPuntaje.puntaje).toBe(0);

      const resuelto = filas.find(
        (f) => f.nombre_participante === "Jugador Resuelto",
      );
      expect(resuelto.player_id).toBe(player.id);

      const pendiente = filas.find(
        (f) => f.nombre_participante === "Sin Cuenta Conocida",
      );
      expect(pendiente.player_id).toBeNull();
    } finally {
      await limpiarTorneo(supabase, fixture.id);
      await supabase.from("player_challonge_accounts").delete().eq("player_id", player.id);
      await supabase.from("players").delete().eq("id", player.id);
    }
  });

  test("dos cuentas de Challonge distintas del mismo player_id en un torneo: la segunda se omite", async () => {
    const fixture = cargarFixture("torneo-dos-cuentas-mismo-jugador.json");

    const { data: player } = await supabase
      .from("players")
      .insert({ display_name: "Jugador Con Dos Cuentas" })
      .select("id")
      .single();

    await supabase.from("player_challonge_accounts").insert([
      { challonge_id: 700010, player_id: player.id, challonge_username: "cuenta_vieja", active: false },
      { challonge_id: 700011, player_id: player.id, challonge_username: "cuenta_nueva", active: true },
    ]);

    try {
      const resumen = await insertarTorneo(supabase, fixture);

      expect(resumen.participantes).toBe(1);
      expect(resumen.resueltos).toBe(1);

      const { data: filas } = await supabase
        .from("tournament_participants_raw")
        .select("challonge_id, player_id")
        .eq("torneo_id", fixture.id);

      expect(filas.length).toBe(1);
      expect(filas[0].player_id).toBe(player.id);
    } finally {
      await limpiarTorneo(supabase, fixture.id);
      await supabase.from("player_challonge_accounts").delete().eq("player_id", player.id);
      await supabase.from("players").delete().eq("id", player.id);
    }
  });

  test("auto-resolucion solo por challonge_id: dos jugadores con el mismo nombre no se fusionan", async () => {
    const fixture = cargarFixture("torneo-nombres-duplicados.json");

    const { data: players } = await supabase
      .from("players")
      .insert([{ display_name: "Rival A Real" }, { display_name: "Rival B Real" }])
      .select("id");
    const [playerA, playerB] = players;

    await supabase.from("player_challonge_accounts").insert([
      { challonge_id: 700020, player_id: playerA.id, challonge_username: "rival_a" },
      { challonge_id: 700021, player_id: playerB.id, challonge_username: "rival_b" },
    ]);

    try {
      const resumen = await insertarTorneo(supabase, fixture);
      expect(resumen.resueltos).toBe(2);

      const { data: filas } = await supabase
        .from("tournament_participants_raw")
        .select("challonge_id, player_id")
        .eq("torneo_id", fixture.id);

      expect(filas.find((f) => f.challonge_id === 700020).player_id).toBe(playerA.id);
      expect(filas.find((f) => f.challonge_id === 700021).player_id).toBe(playerB.id);
      expect(playerA.id).not.toBe(playerB.id);
    } finally {
      await limpiarTorneo(supabase, fixture.id);
      await supabase
        .from("player_challonge_accounts")
        .delete()
        .in("player_id", [playerA.id, playerB.id]);
      await supabase.from("players").delete().in("id", [playerA.id, playerB.id]);
    }
  });

  test("rollback: si ningun participante tiene posicion final, el torneo se borra", async () => {
    const fixture = cargarFixture("torneo-todos-sin-rank.json");

    await expect(insertarTorneo(supabase, fixture)).rejects.toThrow();

    const { data: torneo } = await supabase
      .from("torneos")
      .select("id")
      .eq("id", fixture.id)
      .maybeSingle();

    expect(torneo).toBeNull();
  });

  test("torneo ya cargado: el insert de torneos falla por id duplicado", async () => {
    const fixture = cargarFixture("torneo-basico.json");
    const torneoIdDuplicado = 990005;

    const { data: juego } = await supabase
      .from("juegos")
      .select("id")
      .ilike("nombre", "Tekken 8")
      .maybeSingle();

    const { error: setupError } = await supabase.from("torneos").insert({
      id: torneoIdDuplicado,
      nombre: "Ya Cargado",
      fecha_inicio: "2093-01-01",
      temporada: 9093,
      juego_id: juego.id,
    });
    expect(setupError).toBeNull();

    // La ruta de admin precheckea esto y responde 409 antes de llamar a
    // insertarTorneo; a este nivel (sin ese precheck) la constraint de PK
    // de torneos es la que actua como red de seguridad. El error que tira
    // es el objeto plano de PostgREST (no una instancia de Error), por eso
    // se verifica el codigo en vez de usar rejects.toThrow().
    let capturedError;
    try {
      await insertarTorneo(supabase, { ...fixture, id: torneoIdDuplicado });
    } catch (e) {
      capturedError = e;
    }
    expect(capturedError).toMatchObject({ code: "23505" });
  });

  test("persiste challonge_source_account segun la cuenta pasada, default 'B'", async () => {
    const fixture = cargarFixture("torneo-cuenta.json");

    await insertarTorneo(supabase, fixture, "A");

    const { data: torneoA } = await supabase
      .from("torneos")
      .select("challonge_source_account")
      .eq("id", fixture.id)
      .single();
    expect(torneoA.challonge_source_account).toBe("A");

    await limpiarTorneo(supabase, fixture.id);

    // Sin pasar cuenta explicita, el default es 'B'.
    await insertarTorneo(supabase, fixture);

    const { data: torneoB } = await supabase
      .from("torneos")
      .select("challonge_source_account")
      .eq("id", fixture.id)
      .single();
    expect(torneoB.challonge_source_account).toBe("B");
  });
});
