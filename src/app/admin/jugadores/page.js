import { Suspense } from "react";

import Jugadores from "./Jugadores";

// Suspense porque la lista lee ?page=/?q= con useSearchParams.
export default function JugadoresPage() {
  return (
    <Suspense>
      <Jugadores />
    </Suspense>
  );
}
