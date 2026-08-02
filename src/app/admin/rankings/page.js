import { Suspense } from "react";

import Rankings from "./Rankings";

// Suspense porque la tabla lee ?page=/?q=/?temporada= con useSearchParams.
export default function RankingsPage() {
  return (
    <Suspense>
      <Rankings />
    </Suspense>
  );
}
