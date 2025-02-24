import Table from "@/components/table";

// import torneos from "../../torneos.json";
import { getCompetidores } from "../utils/db";

export default async function Competidores() {
  const competidores = await getCompetidores();

  return (
    <>
      <div>
        <h1>Competidores</h1>
        <Table columns={"grid-cols-1"}>
          <div className="text-center p-2">Nombre</div>

          {competidores.map((competidor, index) => (
            <div key={index + "competidor"} className="text-center p-2">
              {competidor.challonge_username}
            </div>
          ))}
        </Table>
      </div>
    </>
  );
}
