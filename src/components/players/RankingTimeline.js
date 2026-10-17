import Link from "next/link";

export default function RankingTimeline({ series, year }) {
  const positions = series.filter(s => s.position != null).map(s => s.position);
  const max = Math.max(2, ...positions);
  const x = index => 30 + index * 540 / Math.max(1, series.length - 1);
  const y = position => 25 + (position - 1) * 130 / (max - 1);
  return (
    <section className="min-w-0 border-t border-white/15 pt-6">
      <h2 className="mb-3 font-display text-3xl">Evolución del ranking</h2>
      <p className="mb-4 font-body text-sm text-white/60">Temporada {year}. El historial puede cambiar después de corregir resultados o identidades. Sin datos indica un registro no disponible.</p>
      {positions.length > 0 && <svg viewBox="0 0 600 180" role="img" aria-label="Posición del jugador después de cada torneo" className="mb-4 w-full max-w-3xl border border-white/10 bg-white/[.03]">
        <text x="5" y="22" fill="#ffffff" fontSize="12">1</text>
        <text x="5" y="160" fill="#ffffff" fontSize="12">{max}</text>
        {series.map((point, index) => point.position == null ? null : <g key={point.tournamentId}>
          {index > 0 && series[index - 1].position != null && <line x1={x(index - 1)} y1={y(series[index - 1].position)} x2={x(index)} y2={y(point.position)} stroke="#3FD1E7" strokeWidth="2" />}
          <circle cx={x(index)} cy={y(point.position)} r="4" fill="#F50A64"><title>{`${point.date.slice(0, 10)} · #${point.position} · ${point.points} pts`}</title></circle>
        </g>)}
      </svg>}
      <div className="overflow-x-auto">
        <table aria-label="Evolución del ranking" className="w-full text-left font-body text-sm">
          <thead><tr className="border-b border-white/15 text-white/60"><th className="p-3">Corte</th><th className="p-3">Posición</th><th className="p-3">Puntos</th></tr></thead>
          <tbody>{series.map(point => <tr key={point.tournamentId} className="border-b border-white/10">
            <td className="p-3"><Link className="text-tekken-blue-400 hover:underline" href={`/ranking?year=${year}&torneo=${point.tournamentId}`}>{point.date.slice(0, 10)} · {point.tournamentId}</Link></td>
            <td className="p-3">{point.position == null ? (point.available ? "Sin ranking" : "Sin datos") : `#${point.position}`}</td>
            <td className="p-3">{point.points ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {series.length === 0 && <p className="mt-3 font-body text-white/60">Sin cortes registrados en esta temporada.</p>}
    </section>
  );
}
