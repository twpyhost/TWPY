// Suite: separacion de roles del panel (TS-ROL)
// Nivel: sistema / e2e. Cobertura: que puede y que no puede un usuario con el
// rol 'liga' (migracion 0014), en las tres capas donde se aplica: el ruteo de
// /admin, el nav del panel y las rutas de API.
// Tecnica dominante: particion de equivalencia sobre la seccion del panel
// (liga / resto) cruzada con la capa que la protege.
// Datos: no necesita seed propio. Sesion: project "setup-liga".
import { test, expect } from "@playwright/test";

// Todas las secciones del panel que son exclusivas del superusuario,
// incluidas las dinamicas y el redirect legacy de cargar_torneo.
const RUTAS_SOLO_ADMIN = [
  "/admin/identidades",
  "/admin/jugadores",
  "/admin/jugadores/1",
  "/admin/torneos",
  "/admin/torneos/1",
  "/admin/rankings",
  "/admin/sistema",
  "/admin/cargar_torneo",
];

// Una ruta representativa de cada grupo de APIs solo-superusuario.
const APIS_SOLO_ADMIN = [
  "/api/admin/jugadores",
  "/api/admin/torneos",
  "/api/admin/rankings",
  "/api/admin/sistema",
  "/api/admin/identidades/resumen",
];

test.describe("TS-ROL | Rol liga dentro del panel", () => {
  /**
   * TC-ROL-001 | /admin manda al rol liga a su seccion
   * Descripcion: la raiz del panel rutea por rol; el organizador de liga no
   *   cae en identidades (que no puede ver) sino en la liga.
   * Precondiciones: sesion con rol 'liga' (project "setup-liga").
   * Pasos:
   *   1. Ir a /admin
   * Resultado esperado: la URL final es /admin/liga.
   * Tecnica: MBT (transicion por defecto segun rol) | Prioridad: alta
   */
  test("TC-ROL-001 | /admin redirige a /admin/liga", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/liga$/);
  });

  /**
   * TC-ROL-002 | La seccion Liga sigue siendo operable
   * Descripcion: la separacion no puede romper lo unico que el rol si puede
   *   hacer.
   * Precondiciones: sesion con rol 'liga'.
   * Pasos:
   *   1. Ir a /admin/liga
   * Resultado esperado: la pagina carga (no rebota) y el nav muestra Liga.
   * Tecnica: particion de equivalencia (clase permitida) | Prioridad: alta
   */
  test("TC-ROL-002 | /admin/liga carga con sesion de rol liga", async ({ page }) => {
    await page.goto("/admin/liga");

    await expect(page).toHaveURL(/\/admin\/liga$/);
    await expect(page.locator('aside a[href="/admin/liga"]')).toBeVisible();
  });

  for (const ruta of RUTAS_SOLO_ADMIN) {
    /**
     * TC-ROL-003 | <ruta> rechaza al rol liga
     * Descripcion: ninguna seccion de superusuario es alcanzable escribiendo
     *   la URL a mano.
     * Precondiciones: sesion con rol 'liga'.
     * Pasos:
     *   1. Navegar a la ruta del panel
     * Resultado esperado: la URL final es /no-autorizado.
     * Tecnica: particion de equivalencia (cobertura de rutas) | Prioridad: alta
     */
    test(`TC-ROL-003 | ${ruta} redirige a /no-autorizado`, async ({ page }) => {
      await page.goto(ruta);

      await expect(page).toHaveURL(/\/no-autorizado/);
    });
  }

  /**
   * TC-ROL-004 | El nav solo ofrece la seccion Liga
   * Descripcion: el sidebar no muestra links a secciones que el rol no puede
   *   abrir (no alcanza con que rebote: no tiene que estar el link).
   * Precondiciones: sesion con rol 'liga'.
   * Pasos:
   *   1. Ir a /admin/liga
   *   2. Contar los links del sidebar por href
   * Resultado esperado: esta el de liga y ninguno de los solo-superusuario.
   * Tecnica: MBT (estados alcanzables desde el nav) | Prioridad: media
   */
  test("TC-ROL-004 | el sidebar no muestra las secciones de superusuario", async ({
    page,
  }) => {
    await page.goto("/admin/liga");

    await expect(page.locator('aside a[href="/admin/liga"]')).toBeVisible();

    for (const ruta of ["/admin/identidades", "/admin/jugadores", "/admin/torneos", "/admin/rankings", "/admin/sistema"]) {
      await expect(page.locator(`aside a[href="${ruta}"]`)).toHaveCount(0);
    }
  });

  for (const api of APIS_SOLO_ADMIN) {
    /**
     * TC-ROL-005 | <api> rechaza al rol liga
     * Descripcion: el gate real no es el ruteo de las paginas sino
     *   requireAdmin() en cada route; con sesion valida pero rol insuficiente
     *   tiene que dar 403.
     * Precondiciones: sesion con rol 'liga'.
     * Pasos:
     *   1. GET a la ruta de API
     * Resultado esperado: status 403, nunca 200.
     * Tecnica: particion de equivalencia (seguridad) | Prioridad: alta
     */
    test(`TC-ROL-005 | ${api} responde 403 al rol liga`, async ({ page }) => {
      const respuesta = await page.request.get(api, { failOnStatusCode: false });

      expect(respuesta.status()).toBe(403);
    });
  }

  /**
   * TC-ROL-006 | La API de liga si deja pasar al rol liga
   * Descripcion: contraparte positiva de TC-ROL-005: requireLiga() deja pasar
   *   al rol, sino la separacion habria roto la seccion.
   * Precondiciones: sesion con rol 'liga'.
   * Pasos:
   *   1. GET a /api/admin/liga
   * Resultado esperado: no es 401 ni 403. Se afirma sobre el gate y no sobre
   *   un 200 porque el seed de la suite no siembra liga (cada spec de liga
   *   arma la suya), asi que el resumen contesta 404 "no hay liga cargada".
   * Tecnica: particion de equivalencia (clase permitida) | Prioridad: alta
   */
  test("TC-ROL-006 | /api/admin/liga no rechaza al rol liga", async ({ page }) => {
    const respuesta = await page.request.get("/api/admin/liga", {
      failOnStatusCode: false,
    });

    expect([401, 403]).not.toContain(respuesta.status());
  });
});
