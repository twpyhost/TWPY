// Project de setup: crea el admin, hace login de verdad contra /api/auth/login
// (el mismo endpoint que usa el formulario, con su gate por is_admin) y guarda
// las cookies para que los tests del panel arranquen ya autenticados.
import { test as setup, expect } from "@playwright/test";

import { crearAdmin } from "./adminAuth.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./datos.js";

export const ARCHIVO_SESION = "tests/e2e/.auth/admin.json";

setup("crear y autenticar al usuario admin de la suite", async ({ page }) => {
  await crearAdmin();

  const respuesta = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  expect(
    respuesta.ok(),
    `El login del admin de pruebas fallo (${respuesta.status()}): ${await respuesta.text()}`,
  ).toBeTruthy();

  // Se comprueba que la sesion sirva de verdad antes de guardarla: si el gate
  // rebota, es mejor fallar aca que en cada test del panel.
  await page.goto("/admin/identidades");
  await expect(page).toHaveURL(/\/admin\/identidades/);

  await page.context().storageState({ path: ARCHIVO_SESION });
});
