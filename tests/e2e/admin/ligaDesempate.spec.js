// Suite: rediseno del desempate manual (admin) -- ver
// docs/superpowers/specs/2026-08-06-liga-desempate-admin-design.md.
// Corre en "e2e-admin" (sesion de admin autenticada). Siembra su propia
// liga bajo un slug exclusivo, igual que tests/e2e/admin/liga.spec.js, asi
// no interfiere con esa suite ni con la liga real.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../../testSupabase.js";
import { sembrarLiga } from "../../../src/lib/ligaSeed.js";
import fixtureReal from "../../../scripts/data/liga-2026-fixture.json" with { type: "json" };

test.describe("TS-LIGA-DESEMPATE | Desempate manual en la fase de grupos", () => {
  let supabase;
  let ligaId;

  test.beforeAll(async () => {
    supabase = getServiceClient();
    const fixture = { ...fixtureReal, slug: `liga-e2e-desempate-${Date.now()}` };
    const resumen = await sembrarLiga(supabase, fixture);
    ligaId = resumen.ligaId;
  });

  test.afterAll(async () => {
    await supabase.from("ligas").delete().eq("id", ligaId);
  });

  /**
   * TC-LIGA-DESEMPATE-001 | El grupo no se puede cerrar con empates sin resolver
   * Descripcion: un grupo recien sembrado tiene a todos los participantes en
   *   0 puntos (ningun resultado cargado todavia), asi que esta totalmente
   *   empatado. Pedirle a la API que lo cierre debe fallar.
   * Pasos: PUT /api/admin/liga/grupos/1/cerrar con { cerrado: true }.
   * Resultado esperado: 409 y un mensaje de error explicando el motivo.
   * Tecnica: caso negativo sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-001 | no se puede cerrar un grupo con empates sin resolver", async ({
    page,
  }) => {
    const response = await page.request.put("/api/admin/liga/grupos/1/cerrar", {
      data: { cerrado: true },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/empate/i);
  });

  /**
   * TC-LIGA-DESEMPATE-002 | Las flechas de desempate siguen visibles despues de resolverlo
   * Descripcion: hoy, en cuanto se asigna orden_desempate a todo un bloque
   *   empatado, ese bloque deja de estar "empatado" y las flechas
   *   desaparecen -- sin forma de corregir el orden despues. Se simula un
   *   bloque ya resuelto escribiendo orden_desempate directo en la base (sin
   *   pasar por la UI) y se verifica que las flechas sigan ahi.
   * Pasos:
   *   1. Asignar orden_desempate 1..7 a los 7 participantes del grupo 2.
   *   2. Ir a /admin/liga/grupo/2.
   * Resultado esperado: la primera fila de la tabla muestra el boton "Bajar".
   * Tecnica: regresion sobre el bug reportado | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-002 | las flechas siguen visibles despues de resolver el bloque", async ({
    page,
  }) => {
    const { data: grupo2 } = await supabase
      .from("liga_grupos")
      .select("id")
      .eq("liga_id", ligaId)
      .eq("numero", 2)
      .single();
    const { data: participantes } = await supabase
      .from("liga_participantes")
      .select("id")
      .eq("grupo_id", grupo2.id)
      .order("id", { ascending: true });

    for (let i = 0; i < participantes.length; i += 1) {
      await supabase
        .from("liga_participantes")
        .update({ orden_desempate: i + 1 })
        .eq("id", participantes[i].id);
    }

    await page.goto("/admin/liga/grupo/2");

    const primeraFila = page.getByRole("row").nth(1); // fila 0 es el encabezado
    await expect(primeraFila.getByRole("button", { name: "Bajar" })).toBeVisible();
  });

  /**
   * TC-LIGA-DESEMPATE-003 | Confirmar un desempate lo guarda de verdad
   * Descripcion: mover una fila con las flechas no debe guardar nada hasta
   *   que se confirme; al confirmar debe aparecer un toast y el nuevo orden
   *   debe sobrevivir un F5 real (prueba de que quedo en la base, no solo en
   *   el estado local del componente).
   * Pasos:
   *   1. Ir a /admin/liga/grupo/3 (recien sembrado: los 7 participantes
   *      estan en 0 puntos, un solo bloque empatado con todo el grupo).
   *   2. Click en "Bajar" en la primera fila -- el nombre que estaba primero
   *      pasa a la segunda fila.
   *   3. Click en "Confirmar".
   *   4. Recargar la pagina.
   * Resultado esperado: el toast "Desempate guardado" aparece tras el paso
   *   3, y despues de recargar la fila que se movio sigue en la posicion 2.
   * Tecnica: caso feliz de punta a punta | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-003 | confirmar un desempate lo persiste", async ({ page }) => {
    await page.goto("/admin/liga/grupo/3");

    const primeraFilaAntes = page.getByRole("row").nth(1);
    const nombreMovido = await primeraFilaAntes.getByRole("cell").nth(1).innerText();

    await primeraFilaAntes.getByRole("button", { name: "Bajar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Desempate guardado")).toBeVisible();

    await page.reload();

    const segundaFilaDespues = page.getByRole("row").nth(2);
    await expect(segundaFilaDespues.getByRole("cell").nth(1)).toHaveText(nombreMovido);
  });

  /**
   * TC-LIGA-DESEMPATE-004 | CERRAR GRUPO se deshabilita con empates pendientes
   * Descripcion: un grupo recien sembrado esta totalmente empatado (0
   *   puntos para todos) -- el boton CERRAR GRUPO debe estar deshabilitado.
   *   Resolviendo el unico bloque empatado (mover + confirmar) el boton se
   *   habilita y el cierre funciona.
   * Pasos:
   *   1. Ir a /admin/liga/grupo/4 -- verificar CERRAR GRUPO deshabilitado.
   *   2. Mover y confirmar el bloque empatado (resuelve todo el grupo, que
   *      es un solo bloque de 7).
   *   3. Verificar CERRAR GRUPO habilitado, hacer click y confirmar en el modal.
   * Resultado esperado: el badge pasa a "CERRADO".
   * Tecnica: caso feliz sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-004 | CERRAR GRUPO se deshabilita y habilita segun haya empates", async ({
    page,
  }) => {
    await page.goto("/admin/liga/grupo/4");

    const botonCerrar = page.getByRole("button", { name: "CERRAR GRUPO" });
    await expect(botonCerrar).toBeDisabled();

    await page.getByRole("row").nth(1).getByRole("button", { name: "Bajar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Desempate guardado")).toBeVisible();

    await expect(botonCerrar).toBeEnabled();
    await botonCerrar.click();
    await page.getByRole("button", { name: "CERRAR", exact: true }).click();

    await expect(page.getByText("CERRADO", { exact: true })).toBeVisible();
  });

  /**
   * TC-LIGA-DESEMPATE-005 | Confirmar un bloque empatado sin mover ninguna fila
   * Descripcion: si el admin esta de acuerdo con el orden que ya se muestra
   *   en pantalla para un bloque empatado, debe poder confirmarlo tal cual
   *   -- sin verse forzado a mover una fila y volver a moverla para generar
   *   un draft. Un grupo recien sembrado (grupo 5) esta totalmente empatado
   *   (0 puntos para todos), asi que el primer bloque cubre todo el grupo.
   * Pasos:
   *   1. Ir a /admin/liga/grupo/5.
   *   2. Click en "Confirmar" en el primer bloque SIN tocar ninguna flecha
   *      ↑/↓ primero.
   * Resultado esperado: aparece el toast "Desempate guardado".
   * Tecnica: caso feliz sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-005 | confirmar un bloque empatado sin mover ninguna fila", async ({
    page,
  }) => {
    await page.goto("/admin/liga/grupo/5");

    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Desempate guardado")).toBeVisible();
  });
});
