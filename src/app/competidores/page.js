import Navbar from "@/components/navbar";
import Table from "@/components/table";

// import torneos from "../../torneos.json";
import { getCompetidores } from "../api/db";

export default async function Home() {
  const competidores = await getCompetidores();

  return (
    <>
      <Navbar />

      <div>
        <h1>Competidores</h1>
        <Table>
          <thead>
            <tr>
              <th>Nombre</th>
            </tr>
          </thead>

          <tbody className="">
            {competidores.map((competidor, index) => (
              <tr key={index} className="text-center">
                <td className="">{competidor.challonge_username}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
