import { Suspense } from "react";

import Identidades from "./Identidades";

// Suspense porque la cola lee ?page= con useSearchParams.
export default function IdentidadesPage() {
  return (
    <Suspense>
      <Identidades />
    </Suspense>
  );
}
