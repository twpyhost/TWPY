import HeroSection from "@/components/ui/HeroSection";
import AnimatedCount from "@/components/ui/AnimatedCount";
import SeasonTabs from "./SeasonTabs";
import SeasonRibbon from "./SeasonRibbon";
import RankingTable from "./RankingTable";
import SeasonTransitionProvider from "./SeasonTransitionProvider";
import RankingTableBoundary from "./RankingTableBoundary";

import { getFiltroAno, getRankingsCount } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export const metadata = {
  title: "Ranking",
  description: "Tabla de posiciones de la temporada actual del circuito ranked de Tekken Warriors Paraguay.",
};

export default async function RankingPage({ searchParams }) {
  const params = await searchParams;

  const anos = await getFiltroAno();
  const requestedYear = params?.year;
  const temporada =
    requestedYear && anos.includes(requestedYear)
      ? requestedYear
      : (anos[0] ?? String(new Date().getFullYear()));
  const count = await getRankingsCount(temporada);

  const seasons = anos.map((year) => ({
    year,
    status: year === anos[0] ? "EN CURSO" : "FINALIZADA",
    isDefault: year === anos[0],
  }));

  return (
    <SeasonTransitionProvider temporada={temporada}>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex flex-col gap-1.5">
              <SeasonRibbon />
              <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
                RANKING
              </h1>
              <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
                Tabla de posiciones acumuladas de la temporada actual del circuito ranked de Tekken Warriors Paraguay.
              </p>
            </div>
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
              <span className="font-display text-[56px] leading-[.9]">
                <AnimatedCount value={count} />
              </span>
              <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
                COMPETIDORES RANKEADOS
              </span>
            </div>
          </div>
          {seasons.length > 1 && (
            <SeasonTabs seasons={seasons} />
          )}
        </div>
      </HeroSection>

      <RankingTableBoundary>
        <RankingTable temporada={temporada} />
      </RankingTableBoundary>
    </SeasonTransitionProvider>
  );
}
