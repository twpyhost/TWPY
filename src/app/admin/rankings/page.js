import { Suspense } from "react";

import { requireSuperusuario } from "@/lib/adminAuth";
import Rankings from "./Rankings";

// Suspense porque la tabla lee ?page=/?q=/?temporada= con useSearchParams.
export default async function RankingsPage() {
  await requireSuperusuario();

  return (
    <Suspense>
      <Rankings />
    </Suspense>
  );
}
