import { test, expect } from "@playwright/test";
import {
  buildTournamentCardData,
  buildPlayerSeasonCardData,
  getCardDimensions,
  parseCardRequest,
} from "../../src/lib/shareCards.js";

const tournament = {
  torneo_id: 10,
  nombre_torneo: "Final Ñandutí",
  fecha_torneo: "2026-10-01",
  temporada: "2026",
};
const result = (id, posicion) => ({
  jugador: {
    id,
    nombre: `Álex ${id}`,
    avatar_url: "https://invalid.example/private",
  },
  posicion,
  puntaje: 50,
});

test("podios escasos y empates conservan todas las posiciones reales", () => {
  expect(buildTournamentCardData({ tournament, results: [] }).podium).toEqual(
    [],
  );
  expect(
    buildTournamentCardData({ tournament, results: [result(1, 1)] }).podium,
  ).toMatchObject([{ placement: 1, name: "Álex 1" }]);
  const rows = [
    result(1, 1),
    result(2, 2),
    result(3, 3),
    result(4, 3),
    result(5, 5),
  ];
  const card = buildTournamentCardData({ tournament, results: rows });
  expect(card.podium.map((p) => p.placement)).toEqual([1, 2, 3, 3]);
  expect(card.participantCount).toBe(5);
  expect(card.season).toBe("2026");
  expect(JSON.stringify(card)).not.toContain("invalid.example");
  expect(
    buildTournamentCardData({
      tournament,
      results: [result(1, 1), result(2, 2)],
    }).podium,
  ).toHaveLength(2);
});

test("jugador sin ranking no inventa cero y una correccion cambia la version", () => {
  const profile = {
    id: "1",
    displayName: "Ñandú · ".repeat(30),
    season: "2026",
    position: null,
    points: null,
    titles: 0,
    podiums: 0,
    tournamentCount: 0,
  };
  const card = buildPlayerSeasonCardData(profile, []);
  expect(card).toMatchObject({
    name: profile.displayName,
    position: null,
    points: null,
    season: "2026",
  });
  expect(
    buildPlayerSeasonCardData({ ...profile, points: 0 }, []).sourceVersion,
  ).not.toBe(card.sourceVersion);
});

test("formatos e IDs son acotados y no aceptan parametros de contenido", () => {
  expect(getCardDimensions("landscape")).toEqual({ width: 1200, height: 630 });
  expect(getCardDimensions("portrait")).toEqual({ width: 1080, height: 1350 });
  expect(getCardDimensions("otro")).toBeNull();
  expect(
    parseCardRequest(
      "10",
      new URL("http://localhost/api/cards/torneos/10?text=mal"),
      "torneo",
    ),
  ).toBeNull();
  expect(
    parseCardRequest("bad", new URL("http://localhost/"), "torneo"),
  ).toBeNull();
  expect(
    parseCardRequest(
      "10",
      new URL("http://localhost/?format=portrait&year=2026"),
      "jugador",
    ),
  ).toEqual({ id: "10", format: "portrait", year: "2026" });
});
