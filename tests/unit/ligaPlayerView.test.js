import { test, expect } from "@playwright/test";
import { getLigaPlayerView } from "../../src/lib/ligaPlayerView.js";

const bundle = {
  liga: { slug: "test" },
  fechas: [1, 2, 3, 4].map(numero => ({ numero, fecha: `2026-01-0${numero}`, hora: "15:00" })),
  grupos: [{ id: 1, nombre: "Grupo 1", participantes: [
    { id: 1, nombre: "Mismo nombre", playerId: null }, { id: 2, nombre: "Mismo nombre", playerId: 99 }, { id: 3, nombre: "Otro", playerId: null },
  ], tabla: [{ participanteId: 1, puntos: 0 }], partidos: [
    { id: 1, fechaNumero: 1, participanteAId: 2, participanteBId: 1, matchesA: 3, matchesB: 1, resultadoTipo: "jugado" },
    { id: 2, fechaNumero: 2, participanteAId: 1, participanteBId: 3, matchesA: 0, matchesB: 0, resultadoTipo: "sancionado" },
    { id: 3, fechaNumero: 3, participanteAId: 2, participanteBId: 3, resultadoTipo: "pendiente" },
    { id: 4, fechaNumero: 1, participanteAId: 1, participanteBId: 3, resultadoTipo: "pendiente" },
  ] }, { id: 2, participantes: [{ id: 4, nombre: "Otro grupo" }], partidos: [{ id: 5, fechaNumero: 4 }], tabla: [] }],
};

test("orienta el marcador y distingue pendiente de sancionado sin unir nombres", () => {
  const before = structuredClone(bundle);
  const view = getLigaPlayerView(bundle, "1");
  expect(view.participant).toMatchObject({ id: "1", playerId: null });
  expect(view.completed).toMatchObject([
    { id: "1", opponentId: "2", opponentName: "Mismo nombre", profileId: "99", scoreFor: 1, scoreAgainst: 3, status: "jugado", date: "2026-01-01", time: "15:00" },
    { id: "2", scoreFor: 0, scoreAgainst: 0, status: "sancionado" },
  ]);
  expect(view.upcoming).toMatchObject([{ id: "4", scoreFor: null, scoreAgainst: null, status: "pendiente" }]);
  expect(view.restDates).toEqual([{ numero: 3, fecha: "2026-01-03", hora: "15:00" }]);
  expect(view.standing).toEqual({ participanteId: 1, puntos: 0 });
  expect(bundle).toEqual(before);
  expect(getLigaPlayerView(bundle, "Mismo nombre")).toBeNull();
  expect(getLigaPlayerView(bundle, "999")).toBeNull();
});
