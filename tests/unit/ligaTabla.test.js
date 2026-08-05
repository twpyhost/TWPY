import { test, expect } from "@playwright/test";

import { calcularTabla } from "../../src/lib/ligaTabla.js";

function participante(id, nombre, ordenDesempate = null, playerId = null) {
  return { id, nombre, player_id: playerId, orden_desempate: ordenDesempate };
}

function partido(a, b, ganador = null) {
  return { participante_a_id: a, participante_b_id: b, ganador_id: ganador };
}

test.describe("calcularTabla", () => {
  test("1 punto por victoria, 0 por derrota", () => {
    const participantes = [participante(1, "A"), participante(2, "B")];
    const partidos = [partido(1, 2, 1)];

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.participanteId === 1);
    const b = tabla.find((f) => f.participanteId === 2);

    expect(a.puntos).toBe(1);
    expect(a.g).toBe(1);
    expect(a.p).toBe(0);
    expect(b.puntos).toBe(0);
    expect(b.g).toBe(0);
    expect(b.p).toBe(1);
  });

  test("pj cuenta solo partidos con ganador_id no nulo (ignora pendientes)", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    const partidos = [partido(1, 2, 1), partido(1, 3, null)];

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.participanteId === 1);
    const c = tabla.find((f) => f.participanteId === 3);

    expect(a.pj).toBe(1);
    expect(c.pj).toBe(0);
  });

  test("ordena por puntos descendente", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    const partidos = [partido(1, 2, 1), partido(1, 3, 1), partido(2, 3, 2)];

    const tabla = calcularTabla(participantes, partidos);

    expect(tabla.map((f) => f.nombre)).toEqual(["A", "B", "C"]);
    expect(tabla[0].puntos).toBe(2);
    expect(tabla[1].puntos).toBe(1);
    expect(tabla[2].puntos).toBe(0);
  });

  test("orden_desempate rompe el empate (asc, los null van al final)", () => {
    const participantes = [
      participante(1, "A", 2),
      participante(2, "B", 1),
      participante(3, "C", null),
    ];
    // Los 3 quedan en 0 puntos -- sin resultados cargados.
    const tabla = calcularTabla(participantes, []);

    expect(tabla.map((f) => f.nombre)).toEqual(["B", "A", "C"]);
  });

  test("sin orden_desempate, el empate se resuelve por nombre (determinista)", () => {
    const participantes = [participante(1, "Zeta"), participante(2, "Alfa")];
    const tabla = calcularTabla(participantes, []);

    expect(tabla.map((f) => f.nombre)).toEqual(["Alfa", "Zeta"]);
  });

  test("empatado se marca cuando el bloque comparte puntos y falta desempate", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    // A gana, B y C quedan en 0 puntos, empatados entre si.
    const partidos = [partido(1, 2, 1)];

    const tabla = calcularTabla(participantes, partidos);

    expect(tabla.find((f) => f.nombre === "A").empatado).toBe(false);
    expect(tabla.find((f) => f.nombre === "B").empatado).toBe(true);
    expect(tabla.find((f) => f.nombre === "C").empatado).toBe(true);
  });

  test("empatado se apaga en todo el bloque una vez que todos tienen orden_desempate", () => {
    const participantes = [
      participante(1, "A", null),
      participante(2, "B", 1),
      participante(3, "C", 2),
    ];
    const tabla = calcularTabla(participantes, []);

    // A todavia no tiene orden_desempate -> el bloque completo sigue sin resolver.
    expect(tabla.every((f) => f.empatado)).toBe(true);

    const participantesResueltos = [
      participante(1, "A", 3),
      participante(2, "B", 1),
      participante(3, "C", 2),
    ];
    const tablaResuelta = calcularTabla(participantesResueltos, []);
    expect(tablaResuelta.every((f) => !f.empatado)).toBe(true);
  });

  test("top 5 clasificado y ultimos 2 eliminado en un grupo de 7", () => {
    const participantes = Array.from({ length: 7 }, (_, i) =>
      participante(i + 1, `P${i + 1}`),
    );
    const tabla = calcularTabla(participantes, [], { cuposClasificados: 5 });

    expect(tabla.slice(0, 5).every((f) => f.estado === "clasificado")).toBe(true);
    expect(tabla.slice(5).every((f) => f.estado === "eliminado")).toBe(true);
  });

  test("orden estable con tabla vacia", () => {
    expect(calcularTabla([], [])).toEqual([]);
  });
});
