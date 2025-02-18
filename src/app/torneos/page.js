import Navbar from "@/components/navbar";
import Table from "@/components/table";

import torneos from "../../torneos.json";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Navbar />

      <div>
        <h1>Torneos</h1>
        <Table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fecha</th>
            </tr>
          </thead>

          <tbody className="">
            {torneos.map((torneo) => (
              <tr className="text-center">
                <Link href={"/"}>
                  <td className="">{torneo.nombre}</td>
                </Link>
                <td className="">{torneo.fecha}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
