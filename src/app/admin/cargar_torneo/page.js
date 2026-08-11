import { redirect } from "next/navigation";

import { requireSuperusuario } from "@/lib/adminAuth";

// El flujo de carga de torneos se absorbio en el modal "Importar torneo
// historico" de /admin/torneos (Hito 11 del plan de go-live).
export default async function CargarTorneoPage() {
  await requireSuperusuario();

  redirect("/admin/torneos");
}
