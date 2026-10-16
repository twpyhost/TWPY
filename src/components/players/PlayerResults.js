import Link from "next/link";

export default function PlayerResults({ results }) {
  return (
    <section aria-labelledby="player-results-title" className="min-w-0">
      <h2
        id="player-results-title"
        className="mb-5 font-display text-3xl italic"
      >
        Historial de torneos
      </h2>
      {results.length === 0 ? (
        <p className="text-white/60">
          Sin participaciones registradas en esta temporada.
        </p>
      ) : (
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[460px] text-left text-sm">
            <caption className="sr-only">
              Posiciones finales y puntos de los torneos de la temporada
            </caption>
            <thead className="bg-primary-500 font-display text-base">
              <tr>
                {["Torneo", "Fecha", "Posición", "Puntos"].map((label) => (
                  <th scope="col" key={label} className="p-3 font-normal">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.tournamentId}
                  className="border-b border-white/10 bg-white/[.03]"
                >
                  <td className="p-3">
                    <Link
                      href={`/torneo-resultado/${result.tournamentId}`}
                      className="text-tekken-blue-400 underline-offset-4 hover:underline"
                    >
                      {result.title}
                    </Link>
                  </td>
                  <td className="p-3 text-white/60">{result.date}</td>
                  <td className="p-3">#{result.placement}</td>
                  <td className="p-3">{result.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-white/50">
        Los títulos y podios se basan en posiciones finales. No representan
        estadísticas de sets.
      </p>
    </section>
  );
}
