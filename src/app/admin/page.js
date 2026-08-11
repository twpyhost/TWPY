import { redirect } from "next/navigation";

import { getAdminUser, homeDelPanel } from "@/lib/adminAuth";

// /admin no tiene contenido propio: es la puerta de entrada al panel (la usan
// la navbar y el login) y manda a cada rol a su seccion.
export default async function AdminIndexPage() {
  const { isAdmin, isLiga } = await getAdminUser();
  redirect(homeDelPanel({ isAdmin, isLiga }));
}
