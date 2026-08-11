// Project de setup del rol 'liga': crea el usuario, hace login de verdad
// contra /api/auth/login (mismo endpoint que el formulario, con su gate por
// roles_panel) y guarda las cookies para los tests de tests/e2e/rol-liga.
import { test as setup, expect } from "@playwright/test";

import { crearUsuarioLiga } from "./adminAuth.js";
import { LIGA_EMAIL, LIGA_PASSWORD } from "./datos.js";

export const ARCHIVO_SESION_LIGA = "tests/e2e/.auth/liga.json";

setup("crear y autenticar al usuario con rol liga", async ({ page }) => {
  await crearUsuarioLiga();

  const respuesta = await page.request.post("/api/auth/login", {
    data: { email: LIGA_EMAIL, password: LIGA_PASSWORD },
  });

  expect(
    respuesta.ok(),
    `El login del usuario liga fallo (${respuesta.status()}): ${await respuesta.text()}`,
  ).toBeTruthy();

  // Se comprueba que la sesion sirva de verdad antes de guardarla: /admin
  // tiene que rutearlo a su seccion, no rebotarlo a /no-autorizado.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/liga/);

  await page.context().storageState({ path: ARCHIVO_SESION_LIGA });
});
