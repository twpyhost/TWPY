import Table from "@/components/table";

// import torneos from "../../torneos.json";
import { getRankings } from "../utils/db";

export default async function Ranking() {
  const rankings = await getRankings();

  return (
    <>
      <div>
        <h1>Ranking</h1>
        <Table columns={6}>
          {/* Headers */}
          {[
            "Posición",
            "Nombre",
            "Puntaje",
            "Posición Anterior",
            "Puntaje Anterior",
            "Movimiento",
          ].map((header, index) => (
            <div key={index} className="text-center p-2">
              {header}
            </div>
          ))}

          {/* Body */}
          {rankings.map((ranking, index) => (
            <>
              <div key={index + "pos"} className="text-center p-2">
                {ranking.posicion}
              </div>
              <div key={index + "nombre"} className="text-center p-2">
                {ranking.challonge_username} Steve
              </div>
              <div key={index + "puntaje"} className="text-center p-2">
                {ranking.puntaje}
              </div>
              <div key={index + "posAnt"} className="text-center p-2">
                {ranking.pos_anterior}
              </div>
              <div key={index + "puntAnt"} className="text-center p-2">
                {ranking.puntaje_anterior}
              </div>
              <div key={index + "mov"} className="text-center p-2 text-xl">
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
