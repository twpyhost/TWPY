// Resolve hook minimo para que los scripts de node (fuera de Next.js) puedan
// importar modulos de src/ usando el mismo alias "@/" que usa el resto del
// codigo (definido en jsconfig.json). Sin esto, importarTorneo.js -- que
// importa "@/lib/rankings" -- no se puede requerir desde un script plano.
const root = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    const withExt = rest.endsWith(".js") ? rest : `${rest}.js`;
    return nextResolve(new URL(withExt, root).href, context);
  }
  return nextResolve(specifier, context);
}
