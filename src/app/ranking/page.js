import Navbar from "@/components/navbar";
import Table from "@/components/table";

// import torneos from "../../torneos.json";
import { getRankings } from "../api/db";

export default async function Home() {
  const rankings = await getRankings();

  return (
    <>
      <div>
        <h1>Ranking</h1>
        <Table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Puntaje</th>
              <th>Posición</th>
            </tr>
          </thead>

          <tbody className="">
            {rankings.map((ranking, index) => (
              <tr key={index} className="text-center">
                <td className="">{ranking.challonge_username}</td>
                <td className="">{ranking.puntaje}</td>
                <td className="">{ranking.posicion}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
