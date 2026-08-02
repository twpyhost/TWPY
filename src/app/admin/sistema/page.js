import { Suspense } from "react";

import Sistema from "./Sistema";

// Suspense porque el log lee ?page= con useSearchParams.
export default function SistemaPage() {
  return (
    <Suspense>
      <Sistema />
    </Suspense>
  );
}
