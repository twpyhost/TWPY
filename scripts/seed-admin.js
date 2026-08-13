// Crea los usuarios del panel para desarrollo local (uno por rol).
//
//   node --env-file=.env.local scripts/seed-admin.js
//   node --env-file=.env.local scripts/seed-admin.js --rol=liga
//   node --env-file=.env.local scripts/seed-admin.js --rol=admin --email=yo@twpy.local --password=otracosa
//
// Idempotente: si el usuario ya existe le resetea la password y le reasigna el
// rol. Deshacer con `npm run purgar:admin`.

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { exigirSupabaseLocal } from "./entorno.js";
import { crearUsuarioDePanel, seleccionarUsuarios } from "./usuarios-panel.js";

exigirSupabaseLocal({ accion: "seed-admin" });

const supabase = getSupabaseAdmin();
const elegidos = seleccionarUsuarios(process.argv);

for (const usuario of elegidos) {
  const { creado } = await crearUsuarioDePanel(supabase, usuario);
  console.log(
    `${creado ? "Creado " : "Ya existía"}  rol=${usuario.rol}  ${usuario.email}  ` +
      `password: ${usuario.password}`,
  );
}

console.log("\nEntrá por http://localhost:3000/auth/login (el panel vive en /admin).");
