import { Suspense } from "react";

import { requireSuperusuario } from "@/lib/adminAuth";
import TorneoDetalle from "./TorneoDetalle";

// Suspense porque la lista de participantes lee ?page= con useSearchParams.
export default async function TorneoDetallePage({ params }) {
  await requireSuperusuario();

  const { id } = await params;
  return (
    <Suspense>
      <TorneoDetalle torneoId={id} />
    </Suspense>
  );
}
