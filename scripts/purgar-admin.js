// Borra los usuarios del panel creados por scripts/seed-admin.js.
//
//   node --env-file=.env.local scripts/purgar-admin.js
//   node --env-file=.env.local scripts/purgar-admin.js --rol=liga
//   node --env-file=.env.local scripts/purgar-admin.js --rol=admin --email=yo@twpy.local
//
// Solo toca los mails de desarrollo (`@twpy.local` por defecto): no barre
// usuarios del panel que hayas creado a mano ni los `@twpy.test` de la suite.

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { exigirSupabaseLocal } from "./entorno.js";
import { borrarUsuarioDePanel, seleccionarUsuarios } from "./usuarios-panel.js";

exigirSupabaseLocal({ accion: "purgar-admin" });

const supabase = getSupabaseAdmin();
const elegidos = seleccionarUsuarios(process.argv);

for (const usuario of elegidos) {
  const borrado = await borrarUsuarioDePanel(supabase, usuario.email);
  console.log(`${borrado ? "Borrado" : "No existía"}  ${usuario.email}`);
}
