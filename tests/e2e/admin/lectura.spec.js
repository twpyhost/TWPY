// Suite: recorrido de lectura del panel (TS-ADM)
// Nivel: sistema / e2e. Cobertura: las paginas del panel con sesion admin.
// Tecnica dominante: model-based testing -- el sidebar es una maquina de
// estados y cada item una transicion a una vista con contenido observable.
//
// SOLO LECTURA: esta suite navega y verifica; no fusiona, no importa, no
// recalcula ni borra. Los flujos que pegan a Challonge quedan fuera porque el
// webServer de los tests no inyecta CHALLONGE_API_KEY.
//
// Datos: sembrados por globalSetup. Sesion: project "setup".
import { test, expect } from "@playwright/test";

import { TORNEO_ACTUAL, TORNEO_PREVIO, nombreJugador } from "../fixtures/datos.js";

// Las listas del panel renderizan cada registro DOS veces: una tarjeta para
// mobile (lg:hidden) y una fila de tabla (hidden lg:block). Las dos estan en el
// DOM, asi que un getByText().first() puede caer en la tarjeta oculta. Se
// acota siempre a la tabla, que es lo visible en el viewport de escritorio.
function filaDeTabla(page, texto) {
  return page.locator("table").getByText(texto, { exact: true });
}

// Modelo del sidebar: cada estado con algo unico que probar que se llego.
const SECCIONES = [
  { item: "IDENTIDADES", url: "/admin/identidades", titulo: "IDENTIDADES" },
  { item: "JUGADORES", url: "/admin/jugadores", titulo: "JUGADORES" },
  { item: "TORNEOS", url: "/admin/torneos", titulo: "TORNEOS" },
  { item: "RANKINGS", url: "/admin/rankings", titulo: "RANKINGS" },
  { item: "SISTEMA", url: "/admin/sistema", titulo: "SISTEMA" },
];

test.describe("TS-ADM | Panel de administracion (lectura)", () => {
  for (const seccion of SECCIONES) {
    /**
     * TC-ADM-001 | Abrir <seccion> del panel
     * Descripcion: cada seccion del panel carga con sesion admin y muestra su
     *   titulo.
     * Precondiciones: sesion admin (project "setup").
     * Pasos:
     *   1. Ir a la URL de la seccion
     * Resultado esperado: no redirige al login y el h1 esta visible.
     * Tecnica: MBT (cobertura de estados) | Prioridad: alta
     */
    test(`TC-ADM-001 | ${seccion.url} carga con sesion admin`, async ({ page }) => {
      await page.goto(seccion.url);

      await expect(page).toHaveURL(new RegExp(`${seccion.url}$`));
      await expect(page.getByRole("heading", { level: 1, name: seccion.titulo })).toBeVisible();
    });
  }

  /**
   * TC-ADM-002 | /admin redirige a identidades
   * Descripcion: la raiz del panel no tiene vista propia, manda a la seccion
   *   de mayor prioridad.
   * Precondiciones: sesion admin.
   * Pasos:
   *   1. Ir a /admin
   * Resultado esperado: la URL final es /admin/identidades.
   * Tecnica: MBT (transicion por defecto) | Prioridad: baja
   */
  test("TC-ADM-002 | /admin redirige a identidades", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/identidades$/);
  });

  /**
   * TC-ADM-003 | La lista de jugadores muestra a los sembrados
   * Descripcion: /admin/jugadores lista jugadores con sus agregados
   *   (torneos jugados, posicion actual).
   * Precondiciones: 45 jugadores sembrados con participaciones.
   * Pasos:
   *   1. Ir a /admin/jugadores
   * Resultado esperado: el primer jugador sembrado esta en la tabla.
   * Tecnica: particion de equivalencia (caso feliz) | Prioridad: alta
   */
  test("TC-ADM-003 | la lista de jugadores muestra a los sembrados", async ({ page }) => {
    await page.goto("/admin/jugadores");

    await expect(filaDeTabla(page, nombreJugador(1))).toBeVisible();
  });

  /**
   * TC-ADM-004 | El detalle de torneo abre desde el listado
   * Descripcion: el nombre del torneo en la lista lleva a su detalle, con el
   *   podio y los participantes.
   * Precondiciones: torneo sembrado con 45 participantes.
   * Pasos:
   *   1. Ir a /admin/torneos
   *   2. Click en el nombre del torneo sembrado
   * Resultado esperado: se abre /admin/torneos/<id> con el Top 4.
   * Tecnica: MBT (transicion listado -> detalle) | Prioridad: alta
   */
  test("TC-ADM-004 | el detalle de torneo abre desde el listado", async ({ page }) => {
    await page.goto("/admin/torneos");
    await page.getByRole("link", { name: "Torneo E2E Actual" }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/torneos/${TORNEO_ACTUAL}`));
    await expect(page.getByRole("heading", { name: "Top 4" })).toBeVisible();
  });

  /**
   * TC-ADM-005 | El detalle ya no muestra el placeholder del bracket
   * Descripcion: la caja punteada "BRACKET EMBEBIDO · CHALLONGE IFRAME" se
   *   reemplazo por un boton de abrir el bracket entre las acciones de arriba.
   * Precondiciones: torneo sembrado con url_challonge.
   * Pasos:
   *   1. Ir al detalle del torneo sembrado
   * Resultado esperado: no existe el texto del placeholder y si existe el
   *   boton de bracket.
   * Tecnica: verificacion de estado | Prioridad: media
   * Ref: TODO.todo -- "Quitar el placeholder de embedding de challonge"
   */
  test("TC-ADM-005 | el detalle no tiene placeholder y si boton de bracket", async ({ page }) => {
    await page.goto(`/admin/torneos/${TORNEO_ACTUAL}`);

    await expect(page.getByText("BRACKET EMBEBIDO")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /VER BRACKET EN CHALLONGE/ })).toBeVisible();
  });

  /**
   * TC-ADM-006 | Sin url de Challonge no hay boton de bracket
   * Descripcion: en un torneo importado sin url (historicos de la cuenta B)
   *   el boton no se renderiza en vez de apuntar a una url vacia.
   * Precondiciones: torneo sembrado con url_challonge null.
   * Pasos:
   *   1. Ir al detalle de ese torneo
   * Resultado esperado: la pagina carga y el boton no existe.
   * Tecnica: particion de equivalencia (url presente / ausente) | Prioridad: media
   */
  test("TC-ADM-006 | sin url de Challonge no hay boton de bracket", async ({ page }) => {
    await page.goto(`/admin/torneos/${TORNEO_PREVIO}`);

    await expect(page.getByRole("heading", { name: "Participantes" })).toBeVisible();
    await expect(page.getByRole("button", { name: /VER BRACKET EN CHALLONGE/ })).toHaveCount(0);
  });

  /**
   * TC-ADM-007 | El boton de bracket avisa antes de salir del sitio
   * Descripcion: el boton no navega directo: abre el interstitial compartido
   *   de link externo.
   * Precondiciones: torneo sembrado con url_challonge.
   * Pasos:
   *   1. Ir al detalle del torneo
   *   2. Click en VER BRACKET EN CHALLONGE
   * Resultado esperado: aparece el aviso de salida y la URL no cambio.
   * Tecnica: MBT (transicion a modal) | Prioridad: media
   */
  test("TC-ADM-007 | el boton de bracket abre el aviso de salida", async ({ page }) => {
    await page.goto(`/admin/torneos/${TORNEO_ACTUAL}`);
    await page.getByRole("button", { name: /VER BRACKET EN CHALLONGE/ }).click();

    await expect(page.getByText(/EST[ÁA]S SALIENDO DEL SITIO/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/admin/torneos/${TORNEO_ACTUAL}`));
  });

  /**
   * TC-ADM-008 | Rankings muestra la temporada sembrada
   * Descripcion: /admin/rankings carga la tabla de la temporada mas reciente
   *   con posiciones y puntajes.
   * Precondiciones: snapshots sembrados.
   * Pasos:
   *   1. Ir a /admin/rankings
   * Resultado esperado: el primer jugador aparece en la tabla.
   * Tecnica: particion de equivalencia (caso feliz) | Prioridad: media
   */
  test("TC-ADM-008 | rankings muestra la temporada sembrada", async ({ page }) => {
    await page.goto("/admin/rankings");

    await expect(filaDeTabla(page, nombreJugador(1))).toBeVisible();
  });
});
