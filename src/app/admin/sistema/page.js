import { Suspense } from "react";

import { requireSuperusuario } from "@/lib/adminAuth";
import Sistema from "./Sistema";

// Suspense porque el log lee ?page= con useSearchParams.
export default async function SistemaPage() {
  await requireSuperusuario();

  return (
    <Suspense>
      <Sistema />
    </Suspense>
  );
}
