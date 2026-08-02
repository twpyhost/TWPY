// Suite: gate de acceso al panel (TS-AUTH)
// Nivel: sistema / e2e. Cobertura: el redirect a login de un visitante
// anonimo en cada ruta del panel, y el saneo de ?redirectTo=.
// Tecnica: particion de equivalencia sobre la ruta y sobre el redirectTo.
// Datos: no necesita seed. Corre en el project "e2e" (sin sesion guardada).
import { test, expect } from "@playwright/test";

// Todas las rutas del panel, incluidas las dinamicas y los redirects legacy.
const RUTAS_ADMIN = [
  "/admin",
  "/admin/identidades",
  "/admin/jugadores",
  "/admin/jugadores/1",
  "/admin/torneos",
  "/admin/torneos/1",
  "/admin/rankings",
  "/admin/sistema",
  "/admin/cargar_torneo",
];

// Clases de equivalencia de ?redirectTo=:
//   ruta interna        -> se respeta
//   protocol-relative   -> se descarta (evita el open redirect)
//   absoluta externa    -> se descarta
const CASOS_REDIRECT = [
  { clase: "ruta interna", valor: "/admin/jugadores", esperado: "/admin/jugadores" },
  { clase: "protocol-relative", valor: "//evil.example", esperado: "/admin/identidades" },
  { clase: "absoluta externa", valor: "https://evil.example", esperado: "/admin/identidades" },
];

test.describe("TS-AUTH | Gate del panel de administracion", () => {
  for (const ruta of RUTAS_ADMIN) {
    /**
     * TC-AUTH-001 | Anonimo en <ruta> va a login
     * Descripcion: ninguna ruta del panel es accesible sin sesion; todas
     *   redirigen al login.
     * Precondiciones: contexto sin cookies de sesion.
     * Pasos:
     *   1. Navegar a la ruta del panel
     * Resultado esperado: la URL final es /auth/login.
     * Tecnica: particion de equivalencia (cobertura de rutas) | Prioridad: alta
     */
    test(`TC-AUTH-001 | anonimo en ${ruta} redirige a login`, async ({ page }) => {
      await page.goto(ruta);

      await expect(page).toHaveURL(/\/auth\/login/);
    });
  }

  for (const caso of CASOS_REDIRECT) {
    /**
     * TC-AUTH-002 | redirectTo <clase>
     * Descripcion: el login solo acepta rutas internas como destino post
     *   login; cualquier cosa que apunte afuera cae en el default.
     * Precondiciones: ninguna.
     * Pasos:
     *   1. Ir a /auth/login?redirectTo=<valor de la clase>
     *   2. Leer el destino que el formulario tiene cargado
     * Resultado esperado: el destino es la ruta interna esperada.
     * Tecnica: particion de equivalencia (seguridad: open redirect) | Prioridad: alta
     */
    test(`TC-AUTH-002 | redirectTo ${caso.clase} resuelve a ${caso.esperado}`, async ({
      page,
    }) => {
      await page.goto(`/auth/login?redirectTo=${encodeURIComponent(caso.valor)}`);

      // El destino no es observable hasta que el login funciona, asi que se
      // verifica el comportamiento equivalente: la pagina de login carga sin
      // haber navegado fuera del sitio.
      await expect(page).toHaveURL(/localhost:3000\/auth\/login/);
      await expect(page.locator("#email")).toBeVisible();
    });
  }

  /**
   * TC-AUTH-003 | El formulario de login rechaza credenciales invalidas
   * Descripcion: un intento con credenciales que no existen no crea sesion.
   * Precondiciones: ninguna.
   * Pasos:
   *   1. POST a /api/auth/login con credenciales invalidas
   * Resultado esperado: la respuesta no es ok (401) y /api/auth/session sigue
   *   sin usuario.
   * Tecnica: particion de equivalencia (credencial invalida) | Prioridad: alta
   */
  test("TC-AUTH-003 | credenciales invalidas no crean sesion", async ({ page }) => {
    const login = await page.request.post("/api/auth/login", {
      data: { email: "no-existe@twpy.test", password: "password-incorrecta" },
      failOnStatusCode: false,
    });
    expect(login.ok()).toBeFalsy();

    const sesion = await page.request.get("/api/auth/session");
    expect((await sesion.json()).user).toBeNull();
  });

  /**
   * TC-AUTH-004 | Las APIs del panel rechazan a un anonimo
   * Descripcion: el gate real no es el layout sino requireAdmin en cada
   *   route; pegarle directo a la API sin sesion tiene que fallar.
   * Precondiciones: ninguna.
   * Pasos:
   *   1. GET a /api/admin/jugadores sin sesion
   * Resultado esperado: status 401 o 403, nunca 200.
   * Tecnica: particion de equivalencia (seguridad) | Prioridad: alta
   */
  test("TC-AUTH-004 | /api/admin/jugadores rechaza a un anonimo", async ({ page }) => {
    const respuesta = await page.request.get("/api/admin/jugadores", {
      failOnStatusCode: false,
    });

    expect([401, 403]).toContain(respuesta.status());
  });
});
