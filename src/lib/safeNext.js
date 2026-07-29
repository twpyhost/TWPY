// Sanitiza `next` resolviendolo contra `origin` y verificando que el
// resultado siga siendo del mismo origen. Un prefix-check tipo
// startsWith("/") es insuficiente: payloads como "/\evil.example" pasan
// ese chequeo pero WHATWG URL normaliza la barra invertida a "/" antes de
// resolver, terminando en un origen distinto. Resolver primero y comparar
// origin cierra esa clase de bypass.
export function safeNext(rawNext, origin) {
  if (!rawNext) return "/";
  try {
    const resolved = new URL(rawNext, origin);
    return resolved.origin === origin
      ? `${resolved.pathname}${resolved.search}${resolved.hash}`
      : "/";
  } catch {
    return "/";
  }
}
