// Suite: admin de liga (TS-LIGA-ADMIN)
// Nivel: sistema / e2e. Cobertura: cargar un resultado (ganador + marcador
// first-to-3) desde el detalle del grupo y el bloqueo de escritura cuando el
// grupo esta cerrado.
// Datos: siembra su propia liga (fixture real) bajo un slug exclusivo del
// test -- las rutas admin operan sobre la liga mas reciente
// (obtenerLigaActual), asi que esta se vuelve automaticamente "la" liga del
// panel mientras corre el test, sin pisar "liga-invitacional-2026".
// Corre en el project "e2e-admin" (sesion de admin ya autenticada).
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../../testSupabase.js";
import { sembrarLiga } from "../../../src/lib/ligaSeed.js";
import fixtureReal from "../../../scripts/data/liga-2026-fixture.json" with { type: "json" };

test.describe("TS-LIGA-ADMIN | Admin de liga", () => {
  let supabase;
  let ligaId;
  let fixture;

  test.beforeAll(async () => {
    supabase = getServiceClient();
    fixture = { ...fixtureReal, slug: `liga-e2e-admin-${Date.now()}` };
    const resumen = await sembrarLiga(supabase, fixture);
    ligaId = resumen.ligaId;
  });

  test.afterAll(async () => {
    await supabase.from("ligas").delete().eq("id", ligaId);
  });

  /**
   * TC-LIGA-ADMIN-001 | Cargar un resultado actualiza la tabla en vivo
   * Descripcion: elegir el ganador de una pelea de la fecha 1 y despues su
   *   marcador (3-1) carga el resultado, y la tabla en vivo lo refleja de
   *   inmediato con 1 punto por FT ganado.
   * Pasos:
   *   1. Ir a /admin/liga/grupo/1
   *   2. Click en "Wario" en la primera pelea de la Fecha 1
   *   3. Click en "3-1" en esa misma pelea
   * Resultado esperado: la fila de "Wario" queda en la posicion 1 con
   *   MATCHES 3-1, DIF +2 y PTS 1.
   * Tecnica: caso feliz | Prioridad: alta
   */
  test("TC-LIGA-ADMIN-001 | cargar un resultado actualiza la tabla", async ({
    page,
  }) => {
    await page.goto("/admin/liga/grupo/1");

    // La Fecha 1 es siempre el primer bloque de fechas del grupo (orden
    // ascendente) -- su primera pelea es "Wario vs Rox" (ver el fixture),
    // asi que el primer boton "Wario" en el DOM es el de esa pelea.
    await page
      .getByRole("button", { name: "Wario", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "3-1", exact: true })
      .first()
      .click();

    const filaWario = page.getByRole("row", { name: /^1 Wario/ });
    await expect(filaWario).toBeVisible();
    await expect(
      filaWario.getByRole("cell", { name: "3-1", exact: true }),
    ).toBeVisible();
    await expect(
      filaWario.getByRole("cell", { name: "+2", exact: true }),
    ).toBeVisible();
  });

  /**
   * TC-LIGA-ADMIN-003 | Los botones de marcador no se habilitan sin ganador
   * Descripcion: mientras no se eligio quien gano la pelea, los tres botones
   *   de marcador (3-0 / 3-1 / 3-2) estan deshabilitados -- no se puede
   *   guardar un marcador sin ganador.
   * Pasos:
   *   1. Ir a /admin/liga/grupo/3 (grupo sin resultados cargados)
   * Resultado esperado: el primer boton "3-0" esta deshabilitado; despues de
   *   elegir un ganador, se habilita.
   * Tecnica: particion de equivalencia / estado invalido | Prioridad: media
   */
  test("TC-LIGA-ADMIN-003 | el marcador requiere elegir ganador primero", async ({
    page,
  }) => {
    await page.goto("/admin/liga/grupo/3");

    const primerMarcador = page
      .getByRole("button", { name: "3-0", exact: true })
      .first();
    await expect(primerMarcador).toBeDisabled();

    // La primera pelea de la Fecha 1 del grupo 3 es "Hosco vs Danns".
    await page
      .getByRole("button", { name: "Hosco", exact: true })
      .first()
      .click();
    await expect(primerMarcador).toBeEnabled();
  });

  /**
   * TC-LIGA-ADMIN-004 | Transiciones del resultado
   * Precondicion: Grupo 4 sin resultados, abierto, en una liga de prueba.
   * Pasos: cargar victoria de A 3-2, sancionar, recargar, quitar la sancion,
   *   recargar y cargar victoria de B 3-0.
   * Resultado esperado: cada estado persiste y reemplaza los datos anteriores;
   *   la sancion cuenta en progreso y PJ, sin G/P/matches/puntos; quitarla
   *   limpia marcador y auditoria. El resultado final tiene ganador B.
   * Tecnica: modelo de estados | Prioridad: alta
   */
  test("TC-LIGA-ADMIN-004 | un resultado jugado puede sancionarse, limpiarse y volver a cargarse", async ({
    page,
  }) => {
    const { data: grupo4 } = await supabase
      .from("liga_grupos")
      .select("id")
      .eq("liga_id", ligaId)
      .eq("numero", 4)
      .single()
      .throwOnError();
    const { data: partido } = await supabase
      .from("liga_partidos")
      .select("id, participante_a_id, participante_b_id")
      .eq("grupo_id", grupo4.id)
      .order("id")
      .limit(1)
      .single()
      .throwOnError();
    const columnasResultado =
      "resultado_tipo, ganador_id, matches_a, matches_b";

    await page.goto("/admin/liga/grupo/4");
    await page
      .getByRole("button", { name: "Rushador Cuidadoso", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "3-2", exact: true })
      .first()
      .click();
    await expect(
      page
        .getByRole("row", { name: /Rushador Cuidadoso/ })
        .getByRole("cell")
        .nth(5),
    ).toHaveText("3-2");

    // La sancion debe borrar el ganador y el marcador previo, persistir
    // despues de recargar y sumar solo PJ para los dos participantes.
    await page
      .getByRole("button", { name: "SANCIONAR 0-0", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "QUITAR SANCIÓN", exact: true }),
    ).toBeEnabled();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "QUITAR SANCIÓN", exact: true }),
    ).toBeVisible();
    const { data: sancionado } = await supabase
      .from("liga_partidos")
      .select(columnasResultado)
      .eq("id", partido.id)
      .single()
      .throwOnError();
    expect(sancionado).toEqual({
      resultado_tipo: "sancionado",
      ganador_id: null,
      matches_a: 0,
      matches_b: 0,
    });
    const resumen = await page.request.get("/api/admin/liga");
    expect(resumen.status()).toBe(200);
    const grupoEnResumen = (await resumen.json()).grupos.find(
      (g) => g.numero === 4,
    );
    expect(grupoEnResumen.progreso).toEqual({ cargados: 1, total: 21 });
    for (const nombre of ["Rushador Cuidadoso", "Lightgear"]) {
      const celdas = page
        .getByRole("row", { name: new RegExp(nombre) })
        .getByRole("cell");
      await expect(celdas).toHaveText([
        /^\d+$/,
        nombre,
        "1",
        "0",
        "0",
        "0-0",
        "0",
        "0",
        /.*/,
      ]);
    }

    await page
      .getByRole("button", { name: "QUITAR SANCIÓN", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "QUITAR SANCIÓN", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    const { data: pendiente } = await supabase
      .from("liga_partidos")
      .select(`${columnasResultado}, cargado_at, cargado_by`)
      .eq("id", partido.id)
      .single()
      .throwOnError();
    expect(pendiente).toEqual({
      resultado_tipo: "pendiente",
      ganador_id: null,
      matches_a: null,
      matches_b: null,
      cargado_at: null,
      cargado_by: null,
    });
    for (const nombre of ["Rushador Cuidadoso", "Lightgear"]) {
      await expect(
        page
          .getByRole("row", { name: new RegExp(nombre) })
          .getByRole("cell")
          .nth(2),
      ).toHaveText("0");
    }

    // Ahora gana B: no puede quedar el ganador A ni la sancion anterior.
    await page
      .getByRole("button", { name: "Lightgear", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "3-0", exact: true })
      .first()
      .click();
    await expect(
      page
        .getByRole("row", { name: /Lightgear/ })
        .getByRole("cell")
        .nth(5),
    ).toHaveText("3-0");
    const { data: jugado } = await supabase
      .from("liga_partidos")
      .select(columnasResultado)
      .eq("id", partido.id)
      .single()
      .throwOnError();
    expect(jugado).toEqual({
      resultado_tipo: "jugado",
      ganador_id: partido.participante_b_id,
      matches_a: 0,
      matches_b: 3,
    });
  });

  /**
   * TC-LIGA-ADMIN-002 | Un grupo cerrado no acepta cambios
   * Descripcion: despues de cerrar el grupo desde el boton + modal de
   *   confirmacion, las peleas dejan de ser clickeables.
   * Pasos:
   *   0. (setup) Asignar orden_desempate a todos los participantes del
   *      grupo 2 por DB, para que el guard de empates sin resolver no
   *      bloquee el cierre -- no es lo que este test verifica.
   *   1. Ir a /admin/liga/grupo/2
   *   2. Click en "CERRAR GRUPO" y confirmar en el modal
   * Resultado esperado: el badge pasa a "CERRADO" y los botones de las
   *   peleas quedan deshabilitados.
   * Tecnica: caso feliz sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-ADMIN-002 | un grupo cerrado no acepta cambios", async ({
    page,
  }) => {
    // El grupo recien sembrado esta totalmente empatado en 0 puntos (sin
    // resultados cargados), asi que el guard de "empates sin resolver"
    // rechazaria el cierre. Ese guard no es lo que este test verifica --
    // resolvemos el empate por DB (orden_desempate) antes de cerrar, sin
    // tocar resultados ni depender del flujo de UI de desempate.
    const { data: grupo2 } = await supabase
      .from("liga_grupos")
      .select("id")
      .eq("liga_id", ligaId)
      .eq("numero", 2)
      .single();
    const { data: participantesGrupo2 } = await supabase
      .from("liga_participantes")
      .select("id")
      .eq("grupo_id", grupo2.id);
    await Promise.all(
      participantesGrupo2.map((participante, indice) =>
        supabase
          .from("liga_participantes")
          .update({ orden_desempate: indice + 1 })
          .eq("id", participante.id),
      ),
    );

    await page.goto("/admin/liga/grupo/2");

    await page.getByRole("button", { name: "CERRAR GRUPO" }).click();
    await page.getByRole("button", { name: "CERRAR", exact: true }).click();

    await expect(page.getByText("CERRADO", { exact: true })).toBeVisible();

    const primerBotonDePelea = page
      .getByRole("button", { name: "Damian", exact: true })
      .first();
    await expect(primerBotonDePelea).toBeDisabled();
    const primerBotonDeMarcador = page
      .getByRole("button", { name: "3-0", exact: true })
      .first();
    await expect(primerBotonDeMarcador).toBeDisabled();
  });
});
