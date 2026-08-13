// Guard de `npm run dev`: frena el arranque si el Supabase configurado no es
// el stack local.
//
// Por que existe: hasta 2026-08-12 `.env.local` apuntaba al proyecto REMOTO
// (produccion) y Next lo carga en desarrollo, asi que un `npm run dev`
// distraido hablaba con produccion sin avisar. La suite de Playwright ya
// estaba blindada (NODE_ENV=test hace que Next ignore `.env.local`, mas
// reuseExistingServer: false), pero el desarrollo manual no.
//
// Reparto de archivos (ver README):
//   .env.local        -> stack local de `npx supabase start`  (default)
//   .env.prod.local   -> proyecto remoto, no se carga solo
//
// Uso:
//   npm run dev        -> valida y sale; el `&&` del script arranca `next dev`.
//   npm run dev:prod   -> carga .env.prod.local y arranca `next dev` el mismo,
//                         con una advertencia bien visible.
//
// El modo prod tiene que lanzar el server como hijo porque es la unica forma
// de meterle las variables del archivo remoto: si solo las cargara en este
// proceso, morirían al salir. El modo normal NO envuelve a `next dev` a
// proposito -- una capa de proceso de mas en Windows complica el Ctrl+C, y no
// hace falta para validar.
//
// La lectura de archivos replica el orden de precedencia de Next
// (env del proceso > .env.development.local > .env.local > .env) para mirar
// exactamente la URL que va a terminar usando el servidor.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { esSupabaseLocal } from "./entorno.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";
const ARCHIVO_PROD = ".env.prod.local";

function parsearArchivo(archivo) {
  const ruta = join(RAIZ, archivo);
  if (!existsSync(ruta)) return null;

  const valores = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const separador = limpia.indexOf("=");
    if (separador === -1) continue;
    const clave = limpia.slice(0, separador).trim();
    valores[clave] = limpia
      .slice(separador + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return valores;
}

function urlConfigurada() {
  if (process.env[VARIABLE]) return process.env[VARIABLE];
  for (const archivo of [".env.development.local", ".env.local", ".env"]) {
    const valores = parsearArchivo(archivo);
    if (valores?.[VARIABLE]) return valores[VARIABLE];
  }
  return null;
}

// Se invoca el bin de Next con el propio node en vez de `npx`: en Windows,
// spawnear npx.cmd exige shell: true (Node bloquea los .cmd sin shell desde
// la CVE-2024-27980) y eso arrastra un DeprecationWarning por cada arranque.
function arrancarNext(env) {
  const binNext = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const hijo = spawn(process.execPath, [binNext, "dev", "--turbopack"], {
    cwd: RAIZ,
    env,
    stdio: "inherit",
  });
  hijo.on("exit", (codigo, senal) => process.exit(senal ? 1 : (codigo ?? 0)));
}

if (process.argv.includes("--permitir-prod")) {
  const valores = parsearArchivo(ARCHIVO_PROD);
  if (!valores?.[VARIABLE]) {
    console.error(
      `\n  ✖ Falta ${ARCHIVO_PROD} (o no define ${VARIABLE}).` +
        `\n     Ahí van las credenciales del proyecto remoto; ver README.\n`,
    );
    process.exit(1);
  }

  console.warn(
    [
      "",
      "  ⚠  ATENCIÓN: este `next dev` habla con Supabase REMOTO (producción).",
      `     ${valores[VARIABLE]}`,
      "     Todo lo que cargues o borres desde el panel es data real.",
      "",
    ].join("\n"),
  );

  // Las variables ya presentes en process.env le ganan a los archivos .env
  // que carga Next (@next/env solo completa las que faltan), asi que esto
  // pisa lo que diga .env.local en el hijo.
  arrancarNext({ ...process.env, ...valores });
} else {
  const url = urlConfigurada();

  if (!url) {
    console.error(
      `\n  ✖ Falta ${VARIABLE}: copiá .env.example a .env.local antes de levantar el server.\n`,
    );
    process.exit(1);
  }

  if (!esSupabaseLocal(url)) {
    console.error(
      [
        "",
        `  ✖ ${VARIABLE} no apunta a un Supabase local:`,
        `     ${url}`,
        "",
        "  `npm run dev` no arranca contra producción por accidente.",
        "",
        "  Opciones:",
        "    • Levantá el stack local (`npx supabase start`) y apuntá .env.local ahí.",
        "    • Si de verdad querés desarrollar contra producción: npm run dev:prod",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
}
