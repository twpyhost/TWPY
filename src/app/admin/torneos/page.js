import { Suspense } from "react";

import { requireSuperusuario } from "@/lib/adminAuth";
import Torneos from "./Torneos";

// Suspense porque la lista lee ?page=/?q=/?cuenta= con useSearchParams.
export default async function TorneosPage() {
  await requireSuperusuario();

  return (
    <Suspense>
      <Torneos />
    </Suspense>
  );
}
