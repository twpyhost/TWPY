import Table from "@/components/table";
import YearFilter from "@/components/year";

import { getTorneos, getRankings } from "../utils/db";
import Link from "next/link";

export default async function Torneos() {
  const torneos = await getTorneos();

  return (
    <>
      <div>
        <h1>Torneos</h1>
        <YearFilter />

        <Table columns={"grid-cols-2"}>
          {/* Headers */}
          {["Nombre", "Fecha"].map((header, index) => (
            <div key={index} className="text-center p-2">
              {header}
            </div>
          ))}

          {/* Body */}
          {torneos.map((torneo, index) => (
            <>
              <Link href={`/${torneo.torneo_id}`}>
                <div key={index + "torneo"} className="text-center p-2">
                  {torneo.nombre_torneo}
                </div>
              </Link>
              <Link href={`/${torneo.torneo_id}`}>
                <div key={index + "torneo_fecha"} className="text-center p-2">
                  {torneo.fecha_torneo}
                </div>
              </Link>
            </>
          ))}
        </Table>
      </div>
    </>
  );
}
