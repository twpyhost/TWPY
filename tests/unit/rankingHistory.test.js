import { test, expect } from "@playwright/test";
import { orderRankingCuts, projectRankingHistory, projectRankingAtCut } from "../../src/lib/rankingHistory.js";

const cuts = [
  { tournamentId: "12", title: "T12", date: "2026-02-01", season: "2026", available: false },
  { tournamentId: "11", title: "T11", date: "2026-01-01", season: "2026", available: true },
  { tournamentId: "10", title: "T10", date: "2026-01-01", season: "2026", available: true },
];
const snapshots = [
  { tournamentId: "10", playerId: "1", name: "A", position: 2, points: 50 },
  { tournamentId: "10", playerId: "2", name: "B", position: 1, points: 80 },
  { tournamentId: "11", playerId: "1", name: "A", position: 1, points: 100 },
  { tournamentId: "11", playerId: "2", name: "B", position: 2, points: 80 },
];

test("ordena cortes por fecha e ID bigint sin perder precision", () => {
  expect(orderRankingCuts(cuts).map(c => c.tournamentId)).toEqual(["10", "11", "12"]);
  expect(orderRankingCuts([
    { date: "2026-01-01", tournamentId: "9007199254740993" },
    { date: "2026-01-01", tournamentId: "9007199254740992" },
  ])[0].tournamentId).toBe("9007199254740992");
});

test("preserva puntos y posiciones almacenados, incluidos los arrastrados sin participar", () => {
  const original = structuredClone({ cuts, snapshots });
  expect(projectRankingHistory({ cuts, snapshots, playerId: "2" })).toEqual([
    { tournamentId: "10", date: "2026-01-01", position: 1, points: 80, available: true },
    { tournamentId: "11", date: "2026-01-01", position: 2, points: 80, available: true },
    { tournamentId: "12", date: "2026-02-01", position: null, points: null, available: false },
  ]);
  expect({ cuts, snapshots }).toEqual(original);
});

test("no inventa puntos ni posicion para alguien todavia sin ranking", () => {
  expect(projectRankingHistory({ cuts, snapshots, playerId: "3" })[0]).toMatchObject({
    position: null, points: null, available: true,
  });
});

test("compara con el corte anterior real y no con otro ano", () => {
  expect(projectRankingAtCut({ cuts, snapshots, year: "2026", tournamentId: "11" }).rows[0]).toMatchObject({
    playerId: "1", position: 1, points: 100, movement: "SUBE",
  });
  expect(projectRankingAtCut({ cuts, snapshots, year: "2026", tournamentId: "10" })).toMatchObject({
    previousCut: null, rows: [{ movement: "NUEVO" }, { movement: "NUEVO" }],
  });
  expect(projectRankingAtCut({ cuts, snapshots, year: "2025", tournamentId: "10" })).toBeNull();
  expect(projectRankingAtCut({ cuts, snapshots, year: "2026", tournamentId: "bad" })).toBeNull();
});

test("un corte faltante interrumpe el movimiento sin saltar al ultimo disponible", () => {
  const later = { tournamentId: "13", title: "T13", date: "2026-03-01", season: "2026", available: true };
  const result = projectRankingAtCut({ cuts: [...cuts, later], snapshots: [...snapshots,
    { tournamentId: "13", playerId: "1", name: "A", position: 1, points: 150 }],
    year: "2026", tournamentId: "13" });
  expect(result.rows[0].movement).toBeNull();
  expect(result.previousCut.tournamentId).toBe("12");
  expect(projectRankingAtCut({ cuts, snapshots, year: "2026", tournamentId: "12" })).toMatchObject({
    cut: { available: false }, rows: [],
  });
});
