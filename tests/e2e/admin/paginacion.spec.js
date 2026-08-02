// Suite: paginacion del panel (TS-PAG)
// Nivel: sistema / e2e. Cobertura: la paginacion server-side de las listas
// del panel y su interaccion con los filtros.
//
// Tecnicas:
//   - Valores limite sobre ?page= (0, 1, ultima, ultima+1, no numerica).
//   - Pairwise sobre (lista x pagina x filtro): en vez del producto completo
//     se cubren todos los pares al menos una vez, ver la matriz en
//     docs/qa/casos-de-prueba.md.
//
// Datos: 45 jugadores sembrados con el prefijo "E2E Jugador" y 20 por pagina,
// o sea 3 paginas con la ultima parcial (5 filas). Ojo: la BD local puede
// tener datos ademas de los sembrados, asi que las cuentas exactas se
// verifican SIEMPRE con el buscador puesto en el prefijo.
import { test, expect } from "@playwright/test";

import {
  CANTIDAD_JUGADORES,
  PREFIJO_JUGADOR,
  TORNEO_ACTUAL,
  nombreJugador,
} from "../fixtures/datos.js";

const POR_PAGINA = 20;
const ULTIMA_PAGINA = Math.ceil(CANTIDAD_JUGADORES / POR_PAGINA); // 3
const RESTO_ULTIMA_PAGINA = CANTIDAD_JUGADORES % POR_PAGINA; // 5

// Valores limite de ?page= sobre la lista filtrada por el prefijo sembrado.
//   0 y basura   -> se normalizan a la pagina 1
//   1            -> limite inferior valido
//   ultima       -> limite superior valido, parcial
//   ultima + 1   -> fuera de rango, no rompe
const CASOS_PAGE = [
  { clase: "cero (invalida)", page: "0", filasEsperadas: POR_PAGINA },
  { clase: "uno (limite inferior)", page: "1", filasEsperadas: POR_PAGINA },
  { clase: "intermedia", page: "2", filasEsperadas: POR_PAGINA },
  { clase: "ultima (limite superior)", page: String(ULTIMA_PAGINA), filasEsperadas: RESTO_ULTIMA_PAGINA },
  { clase: "ultima + 1 (fuera de rango)", page: String(ULTIMA_PAGINA + 1), filasEsperadas: 0 },
  { clase: "no numerica", page: "abc", filasEsperadas: POR_PAGINA },
  { clase: "negativa", page: "-3", filasEsperadas: POR_PAGINA },
];

// Pares (lista, filtro) del pairwise: cada lista se visita al menos una vez y
// cada tipo de filtro tambien.
const LISTAS = [
  { nombre: "jugadores", url: "/admin/jugadores", etiqueta: "jugadores" },
  { nombre: "torneos", url: "/admin/torneos", etiqueta: "torneos" },
  { nombre: "rankings", url: "/admin/rankings", etiqueta: "jugadores" },
  { nombre: "sistema", url: "/admin/sistema", etiqueta: "eventos" },
  { nombre: "identidades", url: "/admin/identidades", etiqueta: "pendientes" },
  {
    nombre: "participantes del torneo",
    url: `/admin/torneos/${TORNEO_ACTUAL}`,
    etiqueta: "participantes",
  },
];

// Las listas del panel renderizan cada registro DOS veces: una tarjeta para
// mobile (lg:hidden) y una fila de tabla (hidden lg:block). Las dos estan en el
// DOM, asi que un getByText().first() puede caer en la tarjeta oculta. Se
// acota siempre a la tabla, que es lo visible en el viewport de escritorio.
function filaDeTabla(page, texto) {
  return page.locator("table").getByText(texto, { exact: true });
}

// Cuenta las filas de la tabla de escritorio. Se usa la tabla y no getByText
// porque el board renderiza ademas un grid de tarjetas para mobile: los dos
// estan en el DOM y contar por texto daria el doble.
function filasDeLaTabla(page) {
  return page.locator("table tbody tr");
}

test.describe("TS-PAG | Paginacion del panel", () => {
  for (const caso of CASOS_PAGE) {
    /**
     * TC-PAG-001 | ?page= <clase> en /admin/jugadores
     * Descripcion: el parametro de pagina se normaliza en el servidor: los
     *   valores invalidos caen en la pagina 1 y los que se pasan de rango
     *   devuelven una lista vacia en vez de romper.
     * Precondiciones: 45 jugadores sembrados; buscador puesto en el prefijo
     *   para aislar el conteo de otros datos de la BD local.
     * Pasos:
     *   1. Ir a /admin/jugadores?q=<prefijo>&page=<valor de la clase>
     * Resultado esperado: la cantidad de filas sembradas visibles es la
     *   esperada para esa clase.
     * Tecnica: valores limite | Prioridad: alta
     */
    test(`TC-PAG-001 | ?page= ${caso.clase} devuelve ${caso.filasEsperadas} filas`, async ({
      page,
    }) => {
      await page.goto(
        `/admin/jugadores?q=${encodeURIComponent(PREFIJO_JUGADOR)}&page=${caso.page}`,
      );

      if (caso.filasEsperadas === 0) {
        // Fuera de rango la lista queda vacia: se muestra el mensaje, no la
        // tabla.
        await expect(page.getByText("No hay jugadores para mostrar.")).toBeVisible();
      } else {
        await expect(filasDeLaTabla(page)).toHaveCount(caso.filasEsperadas);
      }
    });
  }

  /**
   * TC-PAG-002 | El buscador filtra sobre el total, no sobre la pagina
   * Descripcion: con paginacion server-side el filtro tiene que viajar a la
   *   API; si filtrara en memoria, buscar a un jugador de la pagina 3 desde
   *   la pagina 1 no lo encontraria.
   * Precondiciones: 45 jugadores sembrados (el 45 cae en la ultima pagina).
   * Pasos:
   *   1. Ir a /admin/jugadores
   *   2. Buscar el nombre exacto del ultimo jugador sembrado
   * Resultado esperado: aparece, aunque no estuviera en la pagina 1.
   * Tecnica: particion de equivalencia (filtro server-side) | Prioridad: alta
   */
  test("TC-PAG-002 | el buscador encuentra a un jugador de la ultima pagina", async ({ page }) => {
    await page.goto("/admin/jugadores");
    await expect(filaDeTabla(page, nombreJugador(1))).toBeVisible();

    const ultimo = nombreJugador(CANTIDAD_JUGADORES);
    await expect(filaDeTabla(page, ultimo)).toHaveCount(0);

    await page.getByPlaceholder("Buscar nick...").fill(ultimo);

    await expect(filaDeTabla(page, ultimo)).toBeVisible();
  });

  /**
   * TC-PAG-003 | Cambiar el filtro vuelve a la pagina 1
   * Descripcion: quedarse en la pagina 3 despues de filtrar mostraria una
   *   lista vacia; el hook resetea la pagina en cada cambio de filtro.
   * Precondiciones: 45 jugadores sembrados.
   * Pasos:
   *   1. Ir a /admin/jugadores?q=<prefijo>&page=3
   *   2. Cambiar la busqueda a un nombre concreto
   * Resultado esperado: la URL ya no lleva page= y el resultado se ve.
   * Tecnica: MBT (transicion de estado del filtro) | Prioridad: alta
   */
  test("TC-PAG-003 | cambiar el filtro vuelve a la pagina 1", async ({ page }) => {
    await page.goto(`/admin/jugadores?q=${encodeURIComponent(PREFIJO_JUGADOR)}&page=3`);
    await expect(filaDeTabla(page, nombreJugador(41))).toBeVisible();

    await page.getByPlaceholder("Buscar nick...").fill(nombreJugador(2));

    await expect(page).not.toHaveURL(/page=/);
    await expect(filaDeTabla(page, nombreJugador(2))).toBeVisible();
  });

  /**
   * TC-PAG-004 | La pagina sobrevive a una recarga
   * Descripcion: la paginacion vive en la URL, asi que un F5 (o compartir el
   *   link) cae en la misma pagina.
   * Precondiciones: 45 jugadores sembrados.
   * Pasos:
   *   1. Ir a /admin/jugadores?q=<prefijo>&page=2
   *   2. Recargar
   * Resultado esperado: sigue viendose el primer jugador de la pagina 2.
   * Tecnica: MBT (persistencia de estado) | Prioridad: media
   */
  test("TC-PAG-004 | la pagina sobrevive a una recarga", async ({ page }) => {
    await page.goto(`/admin/jugadores?q=${encodeURIComponent(PREFIJO_JUGADOR)}&page=2`);
    await expect(filaDeTabla(page, nombreJugador(21))).toBeVisible();

    await page.reload();

    await expect(filaDeTabla(page, nombreJugador(21))).toBeVisible();
  });

  /**
   * TC-PAG-005 | Los botones ANTERIOR/SIGUIENTE recorren las paginas
   * Descripcion: el control compartido navega hacia adelante y hacia atras, y
   *   se deshabilita en los bordes.
   * Precondiciones: 45 jugadores sembrados filtrados por prefijo (3 paginas).
   * Pasos:
   *   1. Ir a /admin/jugadores?q=<prefijo>
   *   2. Verificar que ANTERIOR esta deshabilitado
   *   3. Avanzar a la pagina 2 y volver
   * Resultado esperado: el contenido cambia en cada salto y ANTERIOR esta
   *   deshabilitado en la pagina 1.
   * Tecnica: valores limite (bordes de la paginacion) | Prioridad: alta
   */
  test("TC-PAG-005 | los botones recorren las paginas y se cortan en los bordes", async ({
    page,
  }) => {
    await page.goto(`/admin/jugadores?q=${encodeURIComponent(PREFIJO_JUGADOR)}`);

    const anterior = page.getByRole("button", { name: /ANTERIOR/ });
    const siguiente = page.getByRole("button", { name: /SIGUIENTE/ });

    await expect(anterior).toBeDisabled();
    await expect(filaDeTabla(page, nombreJugador(1))).toBeVisible();

    await siguiente.click();
    await expect(filaDeTabla(page, nombreJugador(21))).toBeVisible();
    await expect(filaDeTabla(page, nombreJugador(1))).toHaveCount(0);
    await expect(anterior).toBeEnabled();

    await anterior.click();
    await expect(filaDeTabla(page, nombreJugador(1))).toBeVisible();
  });

  /**
   * TC-PAG-006 | La ultima pagina deshabilita SIGUIENTE
   * Descripcion: en el limite superior no se puede avanzar mas.
   * Precondiciones: 45 jugadores sembrados (3 paginas con el prefijo).
   * Pasos:
   *   1. Ir a la ultima pagina filtrada por prefijo
   * Resultado esperado: SIGUIENTE deshabilitado y ANTERIOR habilitado.
   * Tecnica: valores limite | Prioridad: media
   */
  test("TC-PAG-006 | la ultima pagina deshabilita SIGUIENTE", async ({ page }) => {
    await page.goto(
      `/admin/jugadores?q=${encodeURIComponent(PREFIJO_JUGADOR)}&page=${ULTIMA_PAGINA}`,
    );

    await expect(page.getByRole("button", { name: /SIGUIENTE/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /ANTERIOR/ })).toBeEnabled();
  });

  /**
   * TC-PAG-007 | El podio del detalle no cambia al pasar de pagina
   * Descripcion: el Top 4 del torneo se pide aparte de la pagina de
   *   participantes, asi que sigue siendo el top del torneo en la pagina 2.
   * Precondiciones: torneo sembrado con 45 participantes.
   * Pasos:
   *   1. Ir al detalle del torneo
   *   2. Ir a la pagina 2 de participantes
   * Resultado esperado: el Top 4 sigue mostrando al jugador en posicion 1.
   * Tecnica: MBT (invariante al cambiar de pagina) | Prioridad: media
   */
  test("TC-PAG-007 | el podio no cambia al pasar de pagina", async ({ page }) => {
    await page.goto(`/admin/torneos/${TORNEO_ACTUAL}?page=2`);

    await expect(page.getByRole("heading", { name: "Top 4" })).toBeVisible();
    await expect(page.getByText(nombreJugador(1)).first()).toBeVisible();
  });

  for (const lista of LISTAS) {
    /**
     * TC-PAG-008 | <lista> acepta ?page= sin romperse
     * Descripcion: toda lista paginada del panel tolera un ?page= fuera de
     *   rango: responde la pagina sin error de servidor ni pantalla rota.
     * Precondiciones: sesion admin.
     * Pasos:
     *   1. Ir a la lista con ?page=999
     * Resultado esperado: la respuesta es < 400 y la pagina sigue siendo la
     *   del panel (no redirige ni muestra error).
     * Tecnica: pairwise (lista x pagina fuera de rango) | Prioridad: media
     */
    test(`TC-PAG-008 | ${lista.nombre} tolera ?page= fuera de rango`, async ({ page }) => {
      const respuesta = await page.goto(`${lista.url}?page=999`);

      expect(respuesta.status()).toBeLessThan(400);
      await expect(page).not.toHaveURL(/\/auth\/login/);
      await expect(page.locator("h1")).toBeVisible();
    });
  }

  /**
   * TC-PAG-009 | El filtro por cuenta y la pagina conviven en la URL
   * Descripcion: los filtros propios de cada lista se combinan con ?page= sin
   *   pisarse.
   * Precondiciones: torneos sembrados (todos con cuenta por defecto).
   * Pasos:
   *   1. Ir a /admin/torneos
   *   2. Elegir el filtro de Cuenta A
   * Resultado esperado: la URL lleva cuenta=A y la lista sigue mostrando el
   *   encabezado de la seccion.
   * Tecnica: pairwise (filtro x paginacion) | Prioridad: media
   */
  test("TC-PAG-009 | el filtro por cuenta se refleja en la URL", async ({ page }) => {
    await page.goto("/admin/torneos");
    await page.getByRole("button", { name: "Cuenta A" }).click();

    await expect(page).toHaveURL(/cuenta=A/);
    await expect(page.getByRole("heading", { level: 1, name: "TORNEOS" })).toBeVisible();
  });

  /**
   * TC-PAG-010 | Los stats de identidades cuentan la cola completa
   * Descripcion: paginar la cola no puede cambiar el contador de PENDIENTES
   *   del hero, que refleja el total sin resolver.
   * Precondiciones: sesion admin (la cola puede estar vacia, el invariante
   *   igual aplica).
   * Pasos:
   *   1. Leer el contador de PENDIENTES en la pagina 1
   *   2. Leerlo de nuevo en ?page=2
   * Resultado esperado: el numero es el mismo en las dos paginas.
   * Tecnica: MBT (invariante al cambiar de pagina) | Prioridad: media
   */
  test("TC-PAG-010 | los stats de identidades no dependen de la pagina", async ({ page }) => {
    const leerPendientes = async () => {
      const valor = page
        .getByText("PENDIENTES", { exact: true })
        .locator("xpath=preceding-sibling::span[1]");
      await expect(valor).toBeVisible();
      return valor.innerText();
    };

    await page.goto("/admin/identidades");
    const enPagina1 = await leerPendientes();

    await page.goto("/admin/identidades?page=2");
    const enPagina2 = await leerPendientes();

    expect(enPagina2).toBe(enPagina1);
  });
});
