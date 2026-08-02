// Helpers de paginacion server-side, compartidos por las routes de /api/admin.
// La paginacion vive en la URL (?page=), asi que el estado sobrevive a un F5
// y es compartible; el filtro viaja junto (?q=) porque si no el buscador
// filtraria solo la pagina visible en vez del total.

export const POR_PAGINA_TABLA = 20;
export const POR_PAGINA_LOG = 10;

// Tope defensivo: nadie deberia poder pedir ?pageSize=100000 y tumbar la API.
const POR_PAGINA_MAX = 100;

// `%` y `_` son comodines de LIKE en Postgres: sin escapar, buscar "100%"
// matchearia cualquier cosa que empiece con "100". `\` escapa en el patron.
export function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

// Normaliza ?page= y ?q= de una URL de request. Todo lo invalido (NaN,
// negativos, cero, basura) cae en la pagina 1 en vez de explotar.
export function leerPaginacion(searchParams, porPaginaDefault = POR_PAGINA_TABLA) {
  const paginaCruda = Number.parseInt(searchParams.get("page"), 10);
  const pagina = Number.isFinite(paginaCruda) && paginaCruda > 0 ? paginaCruda : 1;

  const porPaginaCrudo = Number.parseInt(searchParams.get("pageSize"), 10);
  const porPagina =
    Number.isFinite(porPaginaCrudo) && porPaginaCrudo > 0
      ? Math.min(porPaginaCrudo, POR_PAGINA_MAX)
      : porPaginaDefault;

  const q = (searchParams.get("q") ?? "").trim();

  return {
    pagina,
    porPagina,
    q,
    desde: (pagina - 1) * porPagina,
    hasta: pagina * porPagina - 1,
  };
}

// Para las listas que no se pueden paginar en la query (la cola de
// identidades se agrupa en memoria despues de traerla): mismo contrato de
// respuesta, pero cortando un array ya armado.
export function paginarArray(filas, { pagina, porPagina }) {
  const desde = (pagina - 1) * porPagina;
  return filas.slice(desde, desde + porPagina);
}

// PostgREST responde 416 "Requested range not satisfiable" cuando el offset se
// pasa del total de filas -- o sea, cualquier ?page= mas alla de la ultima.
const RANGO_FUERA_DE_LIMITES = "PGRST103";

// Ejecuta una consulta paginada tolerando ese caso: en vez de propagar un 500
// por pedir la pagina 999, devuelve una pagina vacia con el total real, que es
// lo que el cliente necesita para dibujar "Pagina 999 de 3" y dejarte volver.
//
// `construir` tiene que devolver una consulta NUEVA en cada llamada (supabase-js
// no permite reusar una ya ejecutada) y aceptar { head } para la variante que
// solo cuenta.
export async function consultarPagina(construir, { desde, hasta }) {
  const { data, count, error } = await construir({ head: false }).range(desde, hasta);

  if (!error) {
    return { filas: data ?? [], total: count ?? 0 };
  }
  if (error.code !== RANGO_FUERA_DE_LIMITES) {
    throw error;
  }

  const { count: total, error: errorTotal } = await construir({ head: true });
  if (errorTotal) throw errorTotal;

  return { filas: [], total: total ?? 0 };
}
