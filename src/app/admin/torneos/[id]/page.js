import { Suspense } from "react";

import TorneoDetalle from "./TorneoDetalle";

// Suspense porque la lista de participantes lee ?page= con useSearchParams.
export default async function TorneoDetallePage({ params }) {
  const { id } = await params;
  return (
    <Suspense>
      <TorneoDetalle torneoId={id} />
    </Suspense>
  );
}
