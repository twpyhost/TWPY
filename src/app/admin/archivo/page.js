import { requireSuperusuario } from "@/lib/adminAuth";
import Archivo from "./Archivo";
export default async function ArchiveAdminPage() {
  await requireSuperusuario();
  return <Archivo />;
}
