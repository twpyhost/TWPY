import { Suspense } from "react";

import { requireSuperusuario } from "@/lib/adminAuth";
import Jugadores from "./Jugadores";

// Suspense porque la lista lee ?page=/?q= con useSearchParams.
export default async function JugadoresPage() {
  await requireSuperusuario();

  return (
    <Suspense>
      <Jugadores />
    </Suspense>
  );
}
