// Project de teardown: corre cuando termino todo lo que depende del project
// de datos. Borra lo sembrado y el usuario admin de pruebas.
import { test as teardown } from "@playwright/test";

import { limpiar } from "./seed.js";
import { borrarAdmin } from "./adminAuth.js";

teardown("borrar los datos y el usuario admin de la suite", async () => {
  await limpiar();
  await borrarAdmin();
});
