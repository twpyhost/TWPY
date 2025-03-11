"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getTorneoResultados } from "@/app/utils/db";
import Table from "@/components/table";

export default function Resultados() {
  const [resultados, setResultados] = useState();
  const currentPath = usePathname();

  const torneoId = currentPath.split("/").pop();

  useEffect(() => {
    async function getResultados() {
      setResultados(await getTorneoResultados(torneoId));
    }
    getResultados();
  }, []);

  return resultados ? (
    <>
      <div className="my-4 flex flex-col items-center">
        <div className="my-4 text-center text-6xl">Resultado del Torneo</div>
        <div className="my-4 text-center text-6xl">
          {resultados[0].torneo.nombre_torneo}
        </div>

        <Table columns={"grid-cols-3"}>
          {/* Headers */}
          {["Posición", "Nombre", "Puntaje"].map((header, index) => (
            <div key={index + header + "columna"} className="text-center">
              {header}
            </div>
          ))}

          {/* Body */}
          {resultados.map((resultado, index) => (
            <>
              <div key={index + "pos"} className="text-center">
                {resultado.posicion}
              </div>
              <div key={index + "nombre"} className="text-center">
                {resultado.usuario.challonge_username}
              </div>
              <div key={index + "puntaje"} className="text-center">
                {resultado.puntaje}
              </div>
            </>
          ))}
        </Table>
      </div>
    </>
  ) : (
    <>
      <div className="my-4 flex flex-col items-center">
        <div className="my-4 text-center text-6xl">Loading...</div>
      </div>
    </>
  );
}
