import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import SeasonTabs from "./SeasonTabs";

import { getFiltroAno, getRankings } from "../utils/db";
import { withMinDelay } from "@/lib/withMinDelay";
import { fadeDelay } from "@/lib/fadeDelay";
import { TREND } from "@/lib/data/movimiento";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export const metadata = {
  title: "Ranking",
  description: "Tabla de posiciones de la temporada actual del circuito ranked de Tekken Warriors Paraguay.",
};

function tierBorderClass(posicion) {
  return posicion <= 3 ? "border-l-tekken-blue-400" : "border-l-primary-500";
}

export default async function RankingPage({ searchParams }) {
  const params = await searchParams;

  const { rankings, anos, temporada } = await withMinDelay(
    (async () => {
      const anos = await getFiltroAno();
      const requestedYear = params?.year;
      const temporada =
        requestedYear && anos.includes(requestedYear)
          ? requestedYear
          : (anos[0] ?? String(new Date().getFullYear()));
      const rankings = await getRankings(temporada);

      return { rankings, anos, temporada };
    })(),
  );

  const seasons = anos.map((year) => ({
    year,
    status: year === anos[0] ? "EN CURSO" : "FINALIZADA",
    isDefault: year === anos[0],
  }));

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex flex-col gap-1.5">
              <RibbonTag>{`RANKING OFICIAL · TEMPORADA ${temporada}`}</RibbonTag>
              <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
                RANKING
              </h1>
              <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
                Tabla de posiciones acumuladas de la temporada actual del circuito ranked de Tekken Warriors Paraguay.
              </p>
            </div>
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
              <span className="font-display text-[56px] leading-[.9]">{rankings.length}</span>
              <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
                COMPETIDORES RANKEADOS
              </span>
            </div>
          </div>
          {seasons.length > 1 && (
            <SeasonTabs seasons={seasons} activeYear={temporada} />
          )}
        </div>
      </HeroSection>

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
                )} ${index % 2 === 1 ? "bg-white/[.055]" : "bg-white/[.03]"}`}
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
                <span className={`text-center font-display text-base sm:text-xl ${trend.className}`}>
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
    </>
  );
}
