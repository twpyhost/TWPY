import Table from "@/components/table";

import { getCompetidores } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export default async function Competidores() {
  const competidores = await getCompetidores();

  return (
    <div className="my-4 flex flex-col items-center">
      <div className="my-4 text-center text-6xl">Competidores</div>
      <Table columns={"grid-cols-1 md:grid-cols-2"}>
        {competidores.map((competidor, index) => (
          <div key={index + "competidor"} className="p-2 text-center">
            {competidor.challonge_username}
          </div>
        ))}
      </Table>
    </div>
  );
}
