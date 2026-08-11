import { Suspense } from "react";

import { requireSuperusuario } from "@/lib/adminAuth";
import Identidades from "./Identidades";

// Suspense porque la cola lee ?page= con useSearchParams.
export default async function IdentidadesPage() {
  await requireSuperusuario();

  return (
    <Suspense>
      <Identidades />
    </Suspense>
  );
}
