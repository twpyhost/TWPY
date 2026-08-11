// Project de teardown: corre cuando termino todo lo que depende del project
// de datos. Borra lo sembrado y los usuarios de prueba del panel.
import { test as teardown } from "@playwright/test";

import { limpiar } from "./seed.js";
import { borrarUsuariosDelPanel } from "./adminAuth.js";

teardown("borrar los datos y los usuarios del panel de la suite", async () => {
  await limpiar();
  await borrarUsuariosDelPanel();
});
