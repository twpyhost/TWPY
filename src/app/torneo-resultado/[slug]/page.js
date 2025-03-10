import { headers } from "next/headers";

import Table from "@/components/table";

export default async function Resultados() {
  const headersList = await headers();
  const currentPath = headersList.get("x-current-path") || "Unknown";

  console.log(currentPath);

  return (
    <>
      <div className="my-4 flex flex-col items-center">
        <div className="my-4 text-center text-6xl">Resultado del Torneo</div>
        <h1>{currentPath}</h1>
      </div>
    </>
  );
}
