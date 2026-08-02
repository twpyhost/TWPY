import { test, expect } from "@playwright/test";

import { getRankings, getRankingsCount } from "../../src/lib/data/mockDb.js";

test.describe("getRankingsCount (mockDb)", () => {
  test("cuenta los jugadores rankeados de la temporada 2026", async () => {
    const count = await getRankingsCount("2026");
    expect(count).toBe(11);
  });

  test("cuenta los jugadores rankeados de la temporada 2025", async () => {
    const count = await getRankingsCount("2025");
    expect(count).toBe(7);
  });

  test("coincide siempre con getRankings(temporada).length", async () => {
    const rankings = await getRankings("2026");
    const count = await getRankingsCount("2026");
    expect(count).toBe(rankings.length);
  });

  test("devuelve 0 para una temporada sin torneos", async () => {
    const count = await getRankingsCount("1999");
    expect(count).toBe(0);
  });
});
