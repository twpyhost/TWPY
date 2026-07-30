import { test, expect } from "@playwright/test";

import { safeNext } from "../../src/lib/safeNext.js";

const ORIGIN = "https://twpy.example.com";

test.describe("safeNext", () => {
  test("sin next, devuelve la raiz", () => {
    expect(safeNext(null, ORIGIN)).toBe("/");
    expect(safeNext(undefined, ORIGIN)).toBe("/");
    expect(safeNext("", ORIGIN)).toBe("/");
  });

  test("path relativo del mismo origen se preserva", () => {
    expect(safeNext("/admin/identidades", ORIGIN)).toBe("/admin/identidades");
    expect(safeNext("/ranking?year=2026", ORIGIN)).toBe("/ranking?year=2026");
  });

  test("URL externa se ignora (devuelve raiz)", () => {
    expect(safeNext("https://evil.example.com", ORIGIN)).toBe("/");
    expect(safeNext("https://evil.example.com/admin", ORIGIN)).toBe("/");
  });

  test("bypass con barra invertida se ignora", () => {
    // "/\evil.example.com" pasa un chequeo ingenuo de startsWith("/"), pero
    // WHATWG URL lo normaliza a otro origen -- por eso safeNext resuelve
    // primero y compara origin, no hace un chequeo de prefijo.
    expect(safeNext("/\\evil.example.com", ORIGIN)).toBe("/");
  });

  test("protocol-relative URL (//host) se ignora", () => {
    expect(safeNext("//evil.example.com", ORIGIN)).toBe("/");
  });
});
