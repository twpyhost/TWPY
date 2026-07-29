import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import Identidades from "./Identidades";

export default async function PrivatePage() {
  const { user, isAdmin, error } = await getAdminUser();
  if (error) redirect("/error");
  if (!user) redirect("/auth/login?redirectTo=/admin/identidades");
  if (!isAdmin) redirect("/no-autorizado");

  return <Identidades></Identidades>;
}
