import { test, expect } from "@playwright/test";

import { validarPuntajes } from "../../src/lib/puntajes.js";

test.describe("validarPuntajes", () => {
  test("rechaza un array vacio", () => {
    expect(validarPuntajes([])).toEqual({
      ok: false,
      error: "Se requiere al menos una posicion",
    });
  });

  test("rechaza algo que no sea un array", () => {
    expect(validarPuntajes(null).ok).toBe(false);
    expect(validarPuntajes(undefined).ok).toBe(false);
    expect(validarPuntajes({}).ok).toBe(false);
  });

  test("rechaza posicion no entera o menor a 1", () => {
    expect(validarPuntajes([{ posicion: 0, puntos: 10 }]).ok).toBe(false);
    expect(validarPuntajes([{ posicion: -1, puntos: 10 }]).ok).toBe(false);
    expect(validarPuntajes([{ posicion: 1.5, puntos: 10 }]).ok).toBe(false);
    expect(validarPuntajes([{ posicion: "1", puntos: 10 }]).ok).toBe(false);
  });

  test("rechaza puntos negativos o no enteros", () => {
    expect(validarPuntajes([{ posicion: 1, puntos: -5 }]).ok).toBe(false);
    expect(validarPuntajes([{ posicion: 1, puntos: 1.5 }]).ok).toBe(false);
  });

  test("rechaza posiciones duplicadas", () => {
    const resultado = validarPuntajes([
      { posicion: 1, puntos: 100 },
      { posicion: 1, puntos: 50 },
    ]);
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain("1");
  });

  test("acepta el caso feliz, incluido puntos en 0", () => {
    expect(
      validarPuntajes([
        { posicion: 1, puntos: 100 },
        { posicion: 2, puntos: 0 },
      ]),
    ).toEqual({ ok: true });
  });
});
