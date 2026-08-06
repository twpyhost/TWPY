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
});
