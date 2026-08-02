import { getRankings } from "../utils/db";
import { withMinDelay } from "@/lib/withMinDelay";
import { fadeDelay } from "@/lib/fadeDelay";
import { TREND } from "@/lib/data/movimiento";

function tierBorderClass(posicion) {
  return posicion <= 3 ? "border-l-tekken-blue-400" : "border-l-primary-500";
}

function tierBackgroundClass(posicion, index) {
  if (posicion <= 3) return "bg-primary-500/[.16]";
  return index % 2 === 1 ? "bg-white/[.055]" : "bg-white/[.03]";
}

export default async function RankingTable({ temporada }) {
  const rankings = await withMinDelay(getRankings(temporada));

  return (
    <section className="bg-black px-4 pb-16 pt-8 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1240px] lg:columns-2 lg:gap-x-8">
        {rankings.map((ranking, index) => {
          const trend = TREND[ranking.movimiento] ?? TREND.IGUAL;

          return (
            <div
              key={ranking.posicion}
              style={fadeDelay(index)}
              className={`mb-2 grid w-full animate-fade-up grid-cols-[28px_minmax(0,1fr)_auto_22px] items-center gap-2 break-inside-avoid border-l-[3px] px-3 py-2.5 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 sm:grid-cols-[56px_minmax(0,1fr)_auto_56px] sm:gap-4 sm:px-5 sm:py-3.5 ${tierBorderClass(
                ranking.posicion,
              )} ${tierBackgroundClass(ranking.posicion, index)}`}
            >
              <span className="font-display text-base text-white/50 sm:text-2xl">
                {ranking.posicion}
              </span>
              <span className="[overflow-wrap:anywhere] font-body text-sm font-semibold sm:text-lg">
                {ranking.nombre}
              </span>
              <span className="whitespace-nowrap font-display text-base sm:text-2xl">
                {ranking.puntaje} pts
              </span>
              <span
                className={`text-center font-display text-base sm:text-xl ${trend.className}`}
              >
                {trend.icon}
              </span>
            </div>
          );
        })}
        {rankings.length === 0 && (
          <p className="py-10 text-center font-body text-white/50">
            No hay rankings todavía para esta temporada.
          </p>
        )}
      </div>
    </section>
  );
}
