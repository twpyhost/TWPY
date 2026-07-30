import { test, expect } from "@playwright/test";

import { extractTournamentId } from "../../src/lib/challonge.js";

test.describe("extractTournamentId", () => {
  test("challonge.com/slug", () => {
    expect(extractTournamentId("https://challonge.com/abc123")).toBe("abc123");
  });

  test("challonge.com/es/slug (prefijo de idioma)", () => {
    expect(extractTournamentId("https://challonge.com/es/abc123")).toBe(
      "abc123",
    );
  });

  test("subdominio de organizacion", () => {
    expect(extractTournamentId("https://twpy.challonge.com/abc123")).toBe(
      "twpy-abc123",
    );
  });

  test("subdominios reservados no se tratan como organizacion", () => {
    expect(extractTournamentId("https://www.challonge.com/abc123")).toBe(
      "abc123",
    );
    expect(extractTournamentId("https://api.challonge.com/abc123")).toBe(
      "abc123",
    );
    expect(extractTournamentId("https://images.challonge.com/abc123")).toBe(
      "abc123",
    );
  });

  test("URL invalida devuelve null", () => {
    expect(extractTournamentId("https://example.com/abc123")).toBeNull();
    expect(extractTournamentId("esto no es una url")).toBeNull();
  });
});
