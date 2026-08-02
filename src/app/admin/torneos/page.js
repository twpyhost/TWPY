import { Suspense } from "react";

import Torneos from "./Torneos";

// Suspense porque la lista lee ?page=/?q=/?cuenta= con useSearchParams.
export default function TorneosPage() {
  return (
    <Suspense>
      <Torneos />
    </Suspense>
  );
}
