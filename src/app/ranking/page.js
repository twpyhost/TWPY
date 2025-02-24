import Table from "@/components/table";

// import torneos from "../../torneos.json";
import { getRankings } from "../utils/db";

export default async function Ranking() {
  const rankings = await getRankings();

  return (
    <>
      <div>
        <h1>Ranking</h1>
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
            <div key={index} className="p-2 text-center">
              {header}
            </div>
          ))}

          {/* Body */}
          {rankings.map((ranking, index) => (
            <>
              <div key={index + "pos"} className="px-6 py-2">
                {ranking.posicion}
              </div>
              <div key={index + "nombre"} className="py-2 text-center">
                {ranking.challonge_username}
              </div>
              <div key={index + "puntaje"} className="py-2 text-center">
                {ranking.puntaje}00
              </div>
              {/* <div key={index + "posAnt"} className="p-2 text-center">
                {ranking.pos_anterior}
              </div>
              <div key={index + "puntAnt"} className="p-2 text-center">
                {ranking.puntaje_anterior}
              </div> */}
              <div key={index + "mov"} className="p-2 text-center text-xl">
                {ranking.movimiento === "SUBE" && "⬆"}
                {ranking.movimiento === "BAJA" && "⬇"}
                {ranking.movimiento === "IGUAL" && "🟰"}
                {ranking.movimiento === "NUEVO" && "🌟"}
              </div>
            </>
          ))}
        </Table>
      </div>
    </>
  );
}
