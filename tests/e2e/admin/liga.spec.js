// Suite: admin de liga (TS-LIGA-ADMIN)
// Nivel: sistema / e2e. Cobertura: cargar un ganador desde el detalle del
// grupo y el bloqueo de escritura cuando el grupo esta cerrado.
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
   * TC-LIGA-ADMIN-001 | Cargar un ganador actualiza la tabla en vivo
   * Descripcion: click en el nombre de un participante en una pelea de la
   *   fecha 1 lo carga como ganador y la tabla en vivo del grupo lo refleja
   *   de inmediato (1 punto, primera posicion).
   * Pasos:
   *   1. Ir a /admin/liga/grupo/1
   *   2. Click en "Wario" en la primera pelea de la Fecha 1
   * Resultado esperado: la fila de "Wario" en la tabla en vivo muestra
   *   PTS=1 y queda en la posicion 1.
   * Tecnica: caso feliz | Prioridad: alta
   */
  test("TC-LIGA-ADMIN-001 | cargar un ganador actualiza la tabla", async ({ page }) => {
    await page.goto("/admin/liga/grupo/1");

    // La Fecha 1 es siempre el primer bloque de fechas del grupo (orden
    // ascendente) -- su primera pelea es "Wario vs Rox" (ver el fixture),
    // asi que el primer boton "Wario" en el DOM es el de esa pelea.
    await page.getByRole("button", { name: "Wario", exact: true }).first().click();

    const filaWario = page.getByRole("row", { name: /^1 Wario/ });
    await expect(filaWario).toBeVisible();
    await expect(filaWario.getByRole("cell", { name: "1" }).first()).toBeVisible();
  });

  /**
   * TC-LIGA-ADMIN-002 | Un grupo cerrado no acepta cambios
   * Descripcion: despues de cerrar el grupo desde el boton + modal de
   *   confirmacion, las peleas dejan de ser clickeables.
   * Pasos:
   *   1. Ir a /admin/liga/grupo/2
   *   2. Click en "CERRAR GRUPO" y confirmar en el modal
   * Resultado esperado: el badge pasa a "CERRADO" y los botones de las
   *   peleas quedan deshabilitados.
   * Tecnica: caso feliz sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-ADMIN-002 | un grupo cerrado no acepta cambios", async ({ page }) => {
    await page.goto("/admin/liga/grupo/2");

    await page.getByRole("button", { name: "CERRAR GRUPO" }).click();
    await page.getByRole("button", { name: "CERRAR", exact: true }).click();

    await expect(page.getByText("CERRADO", { exact: true })).toBeVisible();

    const primerBotonDePelea = page.getByRole("button", { name: "Damian", exact: true }).first();
    await expect(primerBotonDePelea).toBeDisabled();
  });
});
