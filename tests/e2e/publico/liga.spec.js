// Suite: liga publica (TS-LIGA)
// Nivel: sistema / e2e. Cobertura: /liga sin login -- 5 tablas de grupo,
// zona de eliminacion, calendario y el cambio entre ambas pestanas.
// Datos: siembra su propia liga (fixture real, ver scripts/data/) bajo el
// slug "liga-invitacional-2026" -- el mismo que src/app/liga/page.js lee de
// forma fija (sin selector de liga en la UI, ver el plan). Corre en el
// project "e2e" (sin sesion guardada).
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../../testSupabase.js";
import { sembrarLiga } from "../../../src/lib/ligaSeed.js";
import fixture from "../../../scripts/data/liga-2026-fixture.json" with { type: "json" };

// /liga abre en la pestana GRUPOS: el calendario esta en el DOM pero oculto
// (atributo `hidden`), asi que hay que cambiar de pestana antes de aseverar
// sobre el.
async function irAlCalendario(page) {
  await page.getByRole("tab", { name: "CALENDARIO" }).click();
}

test.describe("TS-LIGA | Liga publica", () => {
  let supabase;
  let ligaId;

  test.beforeAll(async () => {
    supabase = getServiceClient();
    const resumen = await sembrarLiga(supabase, fixture);
    ligaId = resumen.ligaId;

    // Dos resultados jugados (ganan A y B) y uno sancionado en el Grupo 2.
    // Se escriben ANTES de la
    // primera visita a /liga porque la pagina cachea con revalidate=60. El
    // Grupo 1 queda intacto: TC-LIGA-002 y TC-LIGA-003 dependen de que siga
    // sin resultados.
    const { data: grupo2 } = await supabase
      .from("liga_grupos")
      .select("id")
      .eq("liga_id", ligaId)
      .eq("numero", 2)
      .single()
      .throwOnError();
    const { data: partidos } = await supabase
      .from("liga_partidos")
      .select("id, participante_a_id, participante_b_id")
      .eq("grupo_id", grupo2.id)
      .order("id", { ascending: true })
      .limit(3)
      .throwOnError();
    expect(partidos).toHaveLength(3);

    const resultados = [
      {
        resultado_tipo: "jugado",
        ganador_id: partidos[0].participante_a_id,
        matches_a: 3,
        matches_b: 1,
      },
      {
        resultado_tipo: "jugado",
        ganador_id: partidos[1].participante_b_id,
        matches_a: 2,
        matches_b: 3,
      },
      {
        resultado_tipo: "sancionado",
        ganador_id: null,
        matches_a: 0,
        matches_b: 0,
      },
    ];
    for (const [indice, resultado] of resultados.entries()) {
      // single() tambien detecta un update que no encontro ninguna fila.
      await supabase
        .from("liga_partidos")
        .update(resultado)
        .eq("id", partidos[indice].id)
        .select("id")
        .single()
        .throwOnError();
    }
  });

  test.afterAll(async () => {
    // fechas/grupos/participantes/partidos caen por cascade.
    await supabase.from("ligas").delete().eq("id", ligaId).throwOnError();
  });

  /**
   * TC-LIGA-001 | Muestra los 5 grupos y el calendario sin login
   * Descripcion: un visitante anonimo ve las 5 tablas de posiciones en la
   *   pestana inicial y, al cambiar a CALENDARIO, las 12 fechas.
   * Pasos:
   *   1. Ir a /liga
   *   2. Verificar los 5 encabezados de grupo (pestana GRUPOS, la inicial)
   *   3. Cambiar a la pestana CALENDARIO
   * Resultado esperado: los 5 encabezados de grupo estan visibles al entrar y
   *   las 12 fechas lo estan tras cambiar de pestana.
   * Tecnica: caso feliz | Prioridad: alta
   */
  test("TC-LIGA-001 | muestra los 5 grupos y las 12 fechas sin login", async ({
    page,
  }) => {
    await page.goto("/liga");

    await expect(
      page.getByRole("heading", { name: "LIGA", exact: true }),
    ).toBeVisible();

    for (let numero = 1; numero <= 5; numero += 1) {
      await expect(
        page.getByText(`Grupo ${numero}`, { exact: true }),
      ).toBeVisible();
    }

    await irAlCalendario(page);

    for (let numero = 1; numero <= 12; numero += 1) {
      await expect(
        page.getByText(`FECHA ${numero}`, { exact: true }),
      ).toBeVisible();
    }
  });

  /**
   * TC-LIGA-002 | La zona de eliminacion resalta las ultimas 2 posiciones
   * Descripcion: sin resultados cargados, los 7 participantes del Grupo 1
   *   quedan empatados en 0 puntos y se ordenan por nombre -- las ultimas 2
   *   filas (Slammers, Wario) llevan el tinte de eliminado.
   * Pasos:
   *   1. Ir a /liga
   *   2. Ubicar la fila de "Wario" en la tabla del Grupo 1
   * Resultado esperado: su background-color es el tinte de eliminado
   *   (rgba(230, 0, 0, 0.05)).
   * Tecnica: valor limite (ultima posicion del grupo) | Prioridad: alta
   */
  test("TC-LIGA-002 | la zona de eliminacion resalta las ultimas 2 posiciones", async ({
    page,
  }) => {
    await page.goto("/liga");

    const fila = page.getByRole("row", { name: /Wario/ });
    await expect(fila).toHaveCSS("background-color", "rgba(230, 0, 0, 0.05)");
  });

  /**
   * TC-LIGA-003 | El calendario deriva quien descansa por fecha
   * Descripcion: no hay tabla de descansos -- se deriva del participante
   *   del grupo que no aparece en ninguna pelea de esa fecha.
   * Pasos:
   *   1. Ir a /liga
   *   2. Cambiar a la pestana CALENDARIO
   * Resultado esperado: la Fecha 1 muestra "Descansa: Joaqwer" (el unico
   *   participante del Grupo 1 que no juega esa fecha, ver el fixture).
   * Tecnica: caso feliz sobre un dato derivado | Prioridad: media
   */
  test("TC-LIGA-003 | el calendario muestra quien descansa", async ({
    page,
  }) => {
    await page.goto("/liga");
    await irAlCalendario(page);

    await expect(
      page.getByText("Descansa: Joaqwer", { exact: true }),
    ).toBeVisible();
  });

  /**
   * TC-LIGA-004 | El calendario muestra el marcador del set
   * Descripcion: una pelea con resultado cargado muestra el marcador
   *   first-to-3 orientado A-B en vez de "VS"; las pendientes siguen
   *   mostrando "PENDIENTE".
   * Pasos:
   *   1. Ir a /liga (el setup dejo dos peleas del Grupo 2 en 3-1 y 2-3)
   *   2. Cambiar a la pestana CALENDARIO
   * Resultado esperado: se ven "3 – 1" y "2 – 3" orientados A-B, y sigue habiendo
   *   peleas "PENDIENTE".
   * Tecnica: caso feliz | Prioridad: alta
   */
  test("TC-LIGA-004 | el calendario muestra el marcador del set", async ({
    page,
  }) => {
    await page.goto("/liga");
    await irAlCalendario(page);

    await expect(
      page.getByText("3 – 1", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("2 – 3", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("PENDIENTE", { exact: true }).first(),
    ).toBeVisible();
  });

  /**
   * TC-LIGA-006 | Sancion publica sin puntos
   * Descripcion: el setup sanciona Overlord vs Gotenks sin ganador.
   * Pasos: abrir Calendario, comprobar la sancion y volver a Grupos.
   * Resultado esperado: 0-0; ambos suman solo PJ. Pavel sigue pendiente.
   * Tecnica: estados de resultado | Prioridad: alta
   */
  test("TC-LIGA-006 | una sancion muestra 0-0 y suma PJ sin otorgar victorias ni puntos", async ({
    page,
  }) => {
    await page.goto("/liga");
    await irAlCalendario(page);

    await expect(
      page.getByText("SANCIONADO · 0-0", { exact: true }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "GRUPOS" }).click();
    // La tercera pelea del Grupo 2 es Overlord vs Gotenks. Ambos jugaron,
    // pero ninguno gana, pierde ni suma matches o puntos por la sancion.
    for (const nombre of ["Overlord", "Gotenks"]) {
      const fila = page.getByRole("row", { name: new RegExp(nombre) });
      await expect(fila.getByRole("cell")).toHaveText([
        /^\d+$/,
        nombre,
        "1",
        "0",
        "0",
        "0-0",
        "0",
        "0",
      ]);
    }
    const pendiente = page.getByRole("row", { name: /Pavel/ });
    await expect(pendiente.getByRole("cell").nth(2)).toHaveText("0");
  });

  /**
   * TC-LIGA-007 | El contador incluye las sanciones
   * Pasos: abrir /liga con dos FT jugados y una sancion del setup.
   * Resultado esperado: PELEAS JUGADAS indica 3/105, no 2/105.
   * Tecnica: regresion | Prioridad: alta
   */
  test("TC-LIGA-007 | el total de peleas jugadas incluye las sancionadas", async ({
    page,
  }) => {
    await page.goto("/liga");

    const contador = page
      .getByText("PELEAS JUGADAS", { exact: true })
      .locator("..");
    // Dos FT con ganador + una sancion 0-0; los otros 102 estan pendientes.
    await expect(contador).toHaveText(/^3\s*\/105\s*PELEAS JUGADAS$/);
  });

  /**
   * TC-LIGA-005 | Las pestanas alternan Grupos y Calendario
   * Descripcion: /liga abre en GRUPOS y las dos vistas son mutuamente
   *   excluyentes -- al elegir una, la otra deja de estar visible. Cubre
   *   tambien la vuelta a GRUPOS, no solo la ida.
   * Pasos:
   *   1. Ir a /liga
   *   2. Cambiar a CALENDARIO
   *   3. Volver a GRUPOS
   * Resultado esperado: al entrar, GRUPOS esta seleccionada y no se ve
   *   "FECHA 1"; en CALENDARIO se ve "FECHA 1" y no "Grupo 1"; al volver se
   *   invierte de nuevo.
   * Tecnica: transicion de estados | Prioridad: alta
   */
  test("TC-LIGA-005 | las pestanas alternan entre grupos y calendario", async ({
    page,
  }) => {
    await page.goto("/liga");

    const tabGrupos = page.getByRole("tab", { name: "GRUPOS" });
    const tabCalendario = page.getByRole("tab", { name: "CALENDARIO" });

    // Estado inicial: GRUPOS seleccionada, el calendario oculto.
    await expect(tabGrupos).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Grupo 1", { exact: true })).toBeVisible();
    await expect(page.getByText("FECHA 1", { exact: true })).toBeHidden();

    await tabCalendario.click();
    await expect(tabCalendario).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("FECHA 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Grupo 1", { exact: true })).toBeHidden();

    await tabGrupos.click();
    await expect(tabGrupos).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Grupo 1", { exact: true })).toBeVisible();
    await expect(page.getByText("FECHA 1", { exact: true })).toBeHidden();
  });
});
