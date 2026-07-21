import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getTorneoResultados } from "@/app/utils/db";
import Table from "@/components/table";

export default async function Resultados({ params }) {
  const { slug } = await params;
  const resultados = await getTorneoResultados(slug);

  if (!resultados || resultados.length === 0) {
    notFound();
  }

  return (
    <div className="my-4 flex flex-col items-center">
      <div className="my-4 text-center text-6xl">Resultado del Torneo</div>
      <div className="mb-4 text-center text-3xl sm:text-4xl">
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
          <Fragment key={index}>
            <div className="text-center">{resultado.posicion}</div>
            <div className="text-center">
              {resultado.usuario.challonge_username}
            </div>
            <div className="text-center">{resultado.puntaje}</div>
          </Fragment>
        ))}
      </Table>
    </div>
  );
}
