import { test, expect } from "@playwright/test";

import {
  calcularTabla,
  bloquesEmpatados,
  estadoParaPosicion,
  formatearDif,
} from "../../src/lib/ligaTabla.js";

function participante(id, nombre, ordenDesempate = null, playerId = null) {
  return { id, nombre, player_id: playerId, orden_desempate: ordenDesempate };
}

// Partido first-to-3 cargado: `ganador` es el id del que llego a 3 y
// `matchesPerdedor` lo que le saco el otro (0, 1 o 2).
function partido(a, b, ganador = null, matchesPerdedor = 0) {
  if (ganador == null) {
    return {
      participante_a_id: a,
      participante_b_id: b,
      ganador_id: null,
      matches_a: null,
      matches_b: null,
    };
  }
  const ganadorEsA = ganador === a;
  return {
    participante_a_id: a,
    participante_b_id: b,
    ganador_id: ganador,
    matches_a: ganadorEsA ? 3 : matchesPerdedor,
    matches_b: ganadorEsA ? matchesPerdedor : 3,
  };
}

test.describe("calcularTabla", () => {
  test("los puntos son los matches ganados, no las victorias", () => {
    const participantes = [participante(1, "A"), participante(2, "B")];
    const partidos = [partido(1, 2, 1, 1)]; // A gana 3-1

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.participanteId === 1);
    const b = tabla.find((f) => f.participanteId === 2);

    expect(a.g).toBe(1);
    expect(a.p).toBe(0);
    expect(a.mg).toBe(3);
    expect(a.mp).toBe(1);
    expect(a.dif).toBe(2);
    expect(a.puntos).toBe(3);

    expect(b.g).toBe(0);
    expect(b.p).toBe(1);
    expect(b.mg).toBe(1);
    expect(b.mp).toBe(3);
    expect(b.dif).toBe(-2);
    expect(b.puntos).toBe(1);
  });

  test("acumula los matches de varios partidos", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    // A gana 3-0 y 3-2 -> 6 matches ganados, 2 perdidos.
    const partidos = [partido(1, 2, 1, 0), partido(3, 1, 1, 2)];

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.participanteId === 1);

    expect(a.g).toBe(2);
    expect(a.mg).toBe(6);
    expect(a.mp).toBe(2);
    expect(a.dif).toBe(4);
    expect(a.puntos).toBe(6);
  });

  test("pj cuenta solo partidos con ganador_id no nulo (ignora pendientes)", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    const partidos = [partido(1, 2, 1, 0), partido(1, 3, null)];

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.participanteId === 1);
    const c = tabla.find((f) => f.participanteId === 3);

    expect(a.pj).toBe(1);
    expect(c.pj).toBe(0);
  });

  test("un partido viejo con ganador y sin marcador cuenta en pj/g/p pero no suma matches", () => {
    // Datos previos a la migracion 0013 -- no deberian existir, pero el
    // calculo no tiene que romperse si aparece uno.
    const participantes = [participante(1, "A"), participante(2, "B")];
    const partidos = [
      { participante_a_id: 1, participante_b_id: 2, ganador_id: 1 },
    ];

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.participanteId === 1);

    expect(a.pj).toBe(1);
    expect(a.g).toBe(1);
    expect(a.mg).toBe(0);
    expect(a.puntos).toBe(0);
  });

  test("ordena por puntos descendente", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    // A gana 2 (6 pts), B gana 1 y pierde 1 (3 + 1 = 4 pts), C pierde 2 (1 + 0 = 1 pt).
    const partidos = [partido(1, 2, 1, 1), partido(1, 3, 1, 0), partido(2, 3, 2, 0)];

    const tabla = calcularTabla(participantes, partidos);

    expect(tabla.map((f) => f.nombre)).toEqual(["A", "B", "C"]);
    expect(tabla.map((f) => f.puntos)).toEqual([6, 4, 0]);
  });

  test("la diferencia de matches rompe el empate de puntos, sin desempate manual", () => {
    const participantes = [
      participante(1, "A"),
      participante(2, "B"),
      participante(3, "C"),
      participante(4, "D"),
    ];
    // A gana 3-2 y pierde 1-3 -> 4 pts, dif -1.
    // B gana 3-1 y pierde 1-3 -> 4 pts, dif  0.
    const partidos = [
      partido(1, 3, 1, 2),
      partido(1, 4, 4, 1),
      partido(2, 3, 2, 1),
      partido(2, 4, 4, 1),
    ];

    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.nombre === "A");
    const b = tabla.find((f) => f.nombre === "B");

    expect(a.puntos).toBe(4);
    expect(b.puntos).toBe(4);
    expect(b.dif).toBeGreaterThan(a.dif);
    expect(b.posicion).toBeLessThan(a.posicion);
    expect(a.empatado).toBe(false);
    expect(b.empatado).toBe(false);
  });

  test("los sets ganados rompen el empate cuando puntos y diferencia coinciden", () => {
    // Zeta y Alfa terminan con los mismos matches (6-7, dif -1) pero Zeta
    // gano 2 sets y Alfa 1 -> Zeta va primera aunque el alfabetico la pondria
    // segunda.
    const participantes = [
      participante(1, "Zeta"),
      participante(2, "Alfa"),
      participante(3, "C"),
      participante(4, "D"),
      participante(5, "E"),
      participante(6, "F"),
      participante(7, "G"),
    ];
    const partidos = [
      partido(1, 3, 1, 2), // Zeta gana 3-2
      partido(1, 4, 1, 2), // Zeta gana 3-2
      partido(1, 5, 5, 0), // Zeta pierde 0-3
      partido(2, 6, 2, 1), // Alfa gana 3-1
      partido(2, 7, 7, 1), // Alfa pierde 1-3
      partido(2, 3, 3, 2), // Alfa pierde 2-3
    ];

    const tabla = calcularTabla(participantes, partidos);
    const zeta = tabla.find((f) => f.nombre === "Zeta");
    const alfa = tabla.find((f) => f.nombre === "Alfa");

    expect([zeta.puntos, zeta.mp, zeta.dif, zeta.g]).toEqual([6, 7, -1, 2]);
    expect([alfa.puntos, alfa.mp, alfa.dif, alfa.g]).toEqual([6, 7, -1, 1]);
    expect(zeta.posicion).toBeLessThan(alfa.posicion);
    expect(zeta.empatado).toBe(false);
    expect(alfa.empatado).toBe(false);
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

  test("empatado se marca cuando el bloque comparte puntos/dif/sets y falta desempate", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    // A les gana 3-0 a ambas: B y C quedan identicas (0 pts, dif -3, 0 sets).
    const partidos = [partido(1, 2, 1, 0), partido(1, 3, 1, 0)];

    const tabla = calcularTabla(participantes, partidos);

    expect(tabla.find((f) => f.nombre === "A").empatado).toBe(false);
    expect(tabla.find((f) => f.nombre === "B").empatado).toBe(true);
    expect(tabla.find((f) => f.nombre === "C").empatado).toBe(true);
  });

  test("una derrota 0-3 y un partido no jugado no empatan (los separa la diferencia)", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    // B perdio 0-3 (0 pts, dif -3); C todavia no jugo (0 pts, dif 0).
    const partidos = [partido(1, 2, 1, 0)];

    const tabla = calcularTabla(participantes, partidos);

    expect(tabla.map((f) => f.nombre)).toEqual(["A", "C", "B"]);
    expect(tabla.every((f) => !f.empatado)).toBe(true);
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

  test("empatado sigue true si dos sub-bloques resueltos por separado colisionan al fusionarse", () => {
    // Simula dos empates de a 2 resueltos independientemente (cada uno con
    // orden_desempate 1 y 2), que luego -- por nuevos resultados -- terminan
    // en el mismo bloque. Todos tienen orden_desempate no nulo, pero los
    // valores se repiten: el bloque fusionado NO esta realmente resuelto y el
    // sort caeria a alfabetico sin que nadie lo haya elegido.
    const participantes = [
      participante(1, "A", 1),
      participante(2, "B", 2),
      participante(3, "C", 1),
      participante(4, "D", 2),
    ];
    // Los 4 quedan en 0 puntos -- un unico bloque de tamano 4.
    const tabla = calcularTabla(participantes, []);

    expect(tabla.every((f) => f.empatado)).toBe(true);
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

test.describe("formatearDif", () => {
  test("muestra el signo solo cuando la diferencia es positiva", () => {
    expect(formatearDif(9)).toBe("+9");
    expect(formatearDif(0)).toBe("0");
    expect(formatearDif(-3)).toBe("-3");
  });
});

test.describe("estadoParaPosicion", () => {
  test("clasificado dentro de los cupos", () => {
    expect(estadoParaPosicion(1, 10, 5)).toBe("clasificado");
    expect(estadoParaPosicion(5, 10, 5)).toBe("clasificado");
  });

  test("eliminado en los ultimos 2 puestos", () => {
    expect(estadoParaPosicion(9, 10, 5)).toBe("eliminado");
    expect(estadoParaPosicion(10, 10, 5)).toBe("eliminado");
  });

  test("neutral entre los cupos clasificados y los ultimos 2", () => {
    expect(estadoParaPosicion(6, 10, 5)).toBe("neutral");
    expect(estadoParaPosicion(8, 10, 5)).toBe("neutral");
  });

  test("clasificado tiene prioridad si los cupos se superponen con el corte de eliminado", () => {
    // Grupo chico: total 2, cuposClasificados 5 -- todos entrarian por cupos
    // y por corte de eliminado a la vez; clasificado gana.
    expect(estadoParaPosicion(1, 2, 5)).toBe("clasificado");
  });
});

test.describe("bloquesEmpatados", () => {
  test("agrupa un bloque de 2 aunque ya tenga orden_desempate asignado", () => {
    const participantes = [participante(1, "A", 1), participante(2, "B", 2)];
    const tabla = calcularTabla(participantes, []); // ambos en 0, ya resuelto

    expect(bloquesEmpatados(tabla)).toEqual([{ inicio: 0, fin: 2 }]);
  });

  test("no agrupa filas que comparten puntos pero difieren en la diferencia de matches", () => {
    const participantes = [
      participante(1, "A"),
      participante(2, "B"),
      participante(3, "C"),
      participante(4, "D"),
    ];
    // A y B quedan en 4 puntos con distinta diferencia (ver caso de arriba).
    const partidos = [
      partido(1, 3, 1, 2),
      partido(1, 4, 4, 1),
      partido(2, 3, 2, 1),
      partido(2, 4, 4, 1),
    ];
    const tabla = calcularTabla(participantes, partidos);
    const a = tabla.find((f) => f.nombre === "A");
    const b = tabla.find((f) => f.nombre === "B");

    expect(a.puntos).toBe(b.puntos);
    expect(a.dif).not.toBe(b.dif);
    expect(bloquesEmpatados(tabla)).toEqual([]);
  });

  test("detecta un bloque cuando puntos, diferencia y sets coinciden", () => {
    const participantes = [
      participante(1, "A"),
      participante(2, "B"),
      participante(3, "C"),
      participante(4, "D"),
    ];
    // A y B: cada una gana 3-0 y pierde 0-3 -> mismos puntos, dif y sets.
    const partidos = [
      partido(1, 3, 1, 0),
      partido(1, 4, 4, 0),
      partido(2, 3, 2, 0),
      partido(2, 4, 4, 0),
    ];
    const tabla = calcularTabla(participantes, partidos);
    const bloques = bloquesEmpatados(tabla);

    const bloqueDeAB = bloques.find((bloque) => {
      const nombres = tabla.slice(bloque.inicio, bloque.fin).map((f) => f.nombre);
      return nombres.includes("A") && nombres.includes("B");
    });
    expect(bloqueDeAB).toBeTruthy();
  });

  test("no devuelve bloques si nadie comparte el mismo nivel", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    const partidos = [partido(1, 2, 1, 1), partido(1, 3, 1, 0), partido(2, 3, 2, 0)];
    const tabla = calcularTabla(participantes, partidos);

    expect(bloquesEmpatados(tabla)).toEqual([]);
  });
});
