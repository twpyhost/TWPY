import { requireSuperusuario } from "@/lib/adminAuth";
import JugadorDetalle from "./JugadorDetalle";

export default async function JugadorDetallePage({ params }) {
  await requireSuperusuario();

  const { id } = await params;
  return <JugadorDetalle playerId={id}></JugadorDetalle>;
}
