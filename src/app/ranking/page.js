import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

import { getFiltroAno, getRankings } from "../utils/db";
import { withMinDelay } from "@/lib/withMinDelay";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

const TREND = {
  SUBE: { icon: "▲", className: "text-success" },
  BAJA: { icon: "▼", className: "text-error" },
  IGUAL: { icon: "=", className: "text-white/40" },
  NUEVO: { icon: "★", className: "text-tekken-blue-400" },
};

function tierBorderClass(posicion) {
  return posicion <= 3 ? "border-l-tekken-blue-400" : "border-l-primary-500";
}

export default async function RankingPage() {
  const [rankings, anos] = await withMinDelay(Promise.all([getRankings(), getFiltroAno()]));
  const temporada = anos[0] ?? String(new Date().getFullYear());

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>{`RANKING OFICIAL · TEMPORADA ${temporada}`}</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              RANKING
            </h1>
            <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
              Tabla de posiciones acumuladas del circuito ranked de Tekken Warriors Paraguay.
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[56px] leading-[.9]">{rankings.length}</span>
            <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
              COMPETIDORES RANKEADOS
            </span>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-16 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2">
          {rankings.map((ranking, index) => {
            const trend = TREND[ranking.movimiento] ?? TREND.IGUAL;

            return (
              <div
                key={ranking.posicion}
                className={`grid grid-cols-[56px_minmax(0,1fr)_auto_56px] items-center gap-4 border-l-[3px] px-5 py-3.5 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 ${tierBorderClass(
                  ranking.posicion,
                )} ${index % 2 === 1 ? "bg-white/[.055]" : "bg-white/[.03]"}`}
              >
                <span className="font-display text-2xl text-white/50">{ranking.posicion}</span>
                <span className="[overflow-wrap:anywhere] font-body text-lg font-semibold">
                  {ranking.nombre}
                </span>
                <span className="font-display text-2xl">{ranking.puntaje} pts</span>
                <span className={`text-center font-display text-xl ${trend.className}`}>
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
