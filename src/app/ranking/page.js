import Table from "@/components/table";

import { getRankings } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export default async function Ranking() {
  const rankings = await getRankings();

  return (
    <div className="my-4 flex flex-col items-center">
      <div className="my-4 text-center text-6xl">Ranking</div>
      <Table columns={"grid-cols-4"}>
        {/* Headers */}
        {[
          "Posición",
          "Nombre",
          "Puntaje",
          // "Posición Anterior",
          // "Puntaje Anterior",
          "Movimiento",
        ].map((header, index) => (
          <div key={index} className="text-center">
            {header}
          </div>
        ))}

        {/* Body */}
        {rankings.map((ranking, index) => (
          <>
            <div key={index + "pos"} className="text-center">
              {ranking.posicion}
            </div>
            <div key={index + "nombre"} className="">
              {ranking.challonge_username}
            </div>
            <div key={index + "puntaje"} className="text-center">
              {ranking.puntaje}
            </div>
            {/* <div key={index + "posAnt"} className="p-2 text-center">
                {ranking.pos_anterior}
              </div>
              <div key={index + "puntAnt"} className="p-2 text-center">
                {ranking.puntaje_anterior}
              </div> */}
            <div key={index + "mov"} className="text-center text-xl">
              {ranking.movimiento === "SUBE" && "⬆"}
              {ranking.movimiento === "BAJA" && "⬇"}
              {ranking.movimiento === "IGUAL" && "🟰"}
              {ranking.movimiento === "NUEVO" && "🌟"}
            </div>
          </>
        ))}
      </Table>
    </div>
  );
}
