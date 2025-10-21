
// import { useState } from "react";

import Navbar from "@/components/navbar";
import Table from "@/components/table";
import { getTorneos, getFiltroAno } from "../utils/db";
import { getFormattedTorneos } from "../utils/dateformat";
import YearFilterDropdown from "@/components/year";
import Link from "next/link";

export default async function Torneos({ searchParams }) {
  let torneos = await getTorneos();
  torneos = await getFormattedTorneos(torneos);

  const anos = await getFiltroAno();
  const selectedYear = searchParams.year || "all";

  const filteredTorneos =
    selectedYear === "all"
      ? torneos
      : torneos.filter((torneo) => torneo.temporada === selectedYear || "");

  return (
    <div className="mx-auto my-4 flex flex-col items-center lg:w-3/4">
      <div className="my-4 text-center text-6xl">Torneos</div>
      <YearFilterDropdown selectedYear={selectedYear} anos={anos} />

      {/* Headers */}
      <Table columns={"grid-cols-2"}>
        {["Nombre", "Fecha"].map((header, index) => (
          <div key={index + header + "columna"} className="p-2 text-center">
            {header}
          </div>
        ))}
        {/* Body */}
        {filteredTorneos.map((torneo, index) => (
          <>
            <Link href={`/torneo-resultado/${torneo.torneo_id}`}>
              <div
                key={index + "torneo" + torneo.torneo_id}
                className="p-2 text-center transition-colors duration-300 hover:text-tekken-pink"
              >
                {torneo.nombre_torneo}
              </div>
            </Link>
            <Link href={`/torneo-resultado/${torneo.torneo_id}`}>
              <div
                key={index + "torneo_fecha" + torneo.torneo_id}
                className="flex h-full items-center justify-center p-2 text-center transition-colors duration-300 hover:text-tekken-pink"
              >
                {torneo.fecha_torneo}
              </div>
            </Link>
          </>
        ))}
      </Table>
    </div>
  );
}
