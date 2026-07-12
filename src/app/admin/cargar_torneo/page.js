import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import CargarTorneo from "./cargarTorneo";

export default async function PrivatePage() {
  const { user, isAdmin, error } = await getAdminUser();
  if (error) redirect("/error");
  if (!user) redirect("/auth/login?redirectTo=/admin/cargar_torneo");
  if (!isAdmin) redirect("/no-autorizado");

  return <CargarTorneo></CargarTorneo>;
}
