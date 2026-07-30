import { redirect } from "next/navigation";

// El flujo de carga de torneos se absorbio en el modal "Importar torneo
// historico" de /admin/torneos (Hito 11 del plan de go-live).
export default function CargarTorneoPage() {
  redirect("/admin/torneos");
}
