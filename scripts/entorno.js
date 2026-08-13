// Salvaguarda compartida por los scripts de seed/purga: ninguno de ellos debe
// tocar el proyecto REMOTO por accidente. Todos se invocan con
// `node --env-file=.env.local ...`, que apunta al stack de `npx supabase start`
// (ver README); si alguien los apunta a produccion, se frenan.
//
// Escape hatch explicito: pasar `--permitir-prod` en la linea de comandos.
// Ejemplo legitimo:
//   node --env-file=.env.prod.local scripts/seed-datos-prueba.js --permitir-prod

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

export function esSupabaseLocal(url) {
  try {
    return HOSTS_LOCALES.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function exigirSupabaseLocal({ accion = "este script" } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    console.error(
      "\n  ✖ Falta NEXT_PUBLIC_SUPABASE_URL." +
        "\n     Invocá con: node --env-file=.env.local scripts/...\n",
    );
    process.exit(1);
  }

  if (esSupabaseLocal(url)) return url;

  if (process.argv.includes("--permitir-prod")) {
    console.warn(`\n  ⚠  ${accion} va a correr contra ${url} (REMOTO). Data real.\n`);
    return url;
  }

  console.error(
    [
      "",
      `  ✖ ${accion} apunta a un Supabase que no es local:`,
      `     ${url}`,
      "",
      "  Los scripts de seed/purga trabajan sobre el stack local (`npx supabase start`).",
      "  Si de verdad querés correrlo contra producción, agregá --permitir-prod.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
