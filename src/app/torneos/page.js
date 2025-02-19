import Navbar from "@/components/navbar";
import Table from "@/components/table";

// import torneos from "../../torneos.json";
import { getTorneos } from "../api/db";
import Link from "next/link";

export default async function Home() {
  const torneos = await getTorneos();

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
            {torneos.map((torneo, index) => (
              <tr key={index} className="text-center">
                <Link href={"/"}>
                  <td className="">{torneo.nombre_torneo}</td>
                </Link>
                <td className="">{torneo.fecha_torneo}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
