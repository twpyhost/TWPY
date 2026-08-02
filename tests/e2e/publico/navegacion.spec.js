// Suite: navegacion publica (TS-NAV)
// Nivel: sistema / e2e. Cobertura: el grafo de navegacion del sitio publico.
// Tecnica dominante: model-based testing -- el navbar es una maquina de
// estados donde cada item es una transicion a un estado observable.
// Datos: sembrados por globalSetup (ver tests/e2e/fixtures/seed.js).
import { test, expect } from "@playwright/test";

// Modelo de navegacion: cada fila es una transicion desde cualquier pagina.
// Se recorren todas para cubrir cada arista del grafo al menos una vez.
const DESTINOS = [
  { item: "RANKING", url: "/ranking", titulo: "RANKING" },
  { item: "TORNEOS", url: "/torneos", titulo: "TORNEOS" },
  { item: "COMPETIDORES", url: "/competidores", titulo: "COMPETIDORES" },
  { item: "REGLAMENTO", url: "/reglamento", titulo: "REGLAMENTO" },
];

test.describe("TS-NAV | Navegacion publica", () => {
  for (const destino of DESTINOS) {
    /**
     * TC-NAV-001 | Ir a <seccion> desde el navbar
     * Descripcion: cada item del navbar lleva a su seccion y la pagina
     *   destino se renderiza con su titulo principal.
     * Precondiciones: ninguna (paginas publicas, sin login).
     * Pasos:
     *   1. Ir a la home
     *   2. Hacer click en el item del navbar
     * Resultado esperado: la URL es la de la seccion y el h1 correspondiente
     *   esta visible.
     * Tecnica: MBT (transicion del grafo de navegacion) | Prioridad: alta
     */
    test(`TC-NAV-001 | el navbar lleva a ${destino.url}`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: destino.item, exact: true }).first().click();

      await expect(page).toHaveURL(new RegExp(`${destino.url}$`));
      await expect(page.getByRole("heading", { level: 1, name: destino.titulo })).toBeVisible();
    });
  }

  /**
   * TC-NAV-002 | El navbar de un visitante anonimo ofrece BLACKHAND
   * Descripcion: sin sesion, el boton de cuenta del navbar es el de login
   *   (BLACKHAND) y no el atajo al panel (ADMIN).
   * Precondiciones: contexto sin cookies de sesion (project "e2e").
   * Pasos:
   *   1. Ir a la home
   * Resultado esperado: se ve BLACKHAND apuntando a /auth/login y NO se ve
   *   el item ADMIN.
   * Tecnica: particion de equivalencia (anonimo vs autenticado) | Prioridad: media
   */
  test("TC-NAV-002 | un visitante anonimo ve BLACKHAND y no ADMIN", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "BLACKHAND" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    await expect(page.getByRole("link", { name: "ADMIN", exact: true })).toHaveCount(0);
  });

  /**
   * TC-NAV-003 | Una ruta inexistente devuelve el 404 propio
   * Descripcion: una URL que no corresponde a ninguna ruta muestra la pagina
   *   404 del sitio (no-found.js), no un error crudo del framework.
   * Precondiciones: ninguna.
   * Pasos:
   *   1. Navegar a /ruta-que-no-existe-e2e
   * Resultado esperado: status 404 y la pagina propia con enlace de vuelta.
   * Tecnica: particion de equivalencia (ruta valida vs invalida) | Prioridad: media
   */
  test("TC-NAV-003 | una ruta inexistente devuelve el 404 propio", async ({ page }) => {
    const respuesta = await page.goto("/ruta-que-no-existe-e2e");

    expect(respuesta.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
  });

  /**
   * TC-NAV-004 | sitemap.xml y robots.txt responden
   * Descripcion: los dos endpoints de SEO se sirven y listan el sitio.
   * Precondiciones: ninguna.
   * Pasos:
   *   1. Pedir /sitemap.xml
   *   2. Pedir /robots.txt
   * Resultado esperado: ambos responden 200; el sitemap incluye /ranking y
   *   robots.txt referencia el sitemap.
   * Tecnica: cobertura de endpoints | Prioridad: baja
   */
  test("TC-NAV-004 | sitemap.xml y robots.txt responden", async ({ page }) => {
    const sitemap = await page.request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain("/ranking");

    const robots = await page.request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect((await robots.text()).toLowerCase()).toContain("sitemap");
  });
});
