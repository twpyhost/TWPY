import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import AnimatedCount from "@/components/ui/AnimatedCount";
import TablasGrupos from "./TablasGrupos";
import CalendarioLiga from "./CalendarioLiga";

import { getLiga } from "../utils/db";

// Revalida cada 60s -- mismo patron que /ranking (refleja resultados
// cargados por el admin sin necesitar redeploy).
export const revalidate = 60;

const SLUG = "liga-invitacional-2026";

export const metadata = {
  title: "Liga",
  description:
    "Tabla de posiciones y calendario de la Liga Invitacional Tekken Warriors Paraguay.",
};

export default async function LigaPage() {
  const liga = await getLiga(SLUG);

  if (!liga) {
    return (
      <HeroSection className="px-5 py-16 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          <p className="font-body text-white/60">No hay ninguna liga cargada todavía.</p>
        </div>
      </HeroSection>
    );
  }

  const totalPartidos = liga.grupos.reduce((total, g) => total + g.partidos.length, 0);
  const partidosJugados = liga.grupos.reduce(
    (total, g) => total + g.partidos.filter((p) => p.ganadorId != null).length,
    0,
  );

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>LIGA INVITACIONAL · TEKKEN 8</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              LIGA
            </h1>
            <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
              {liga.liga.nombre}: 5 grupos, fase de todos contra todos. Clasifican los primeros 5
              de cada grupo, quedan eliminados los últimos 2.
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[56px] leading-[.9]">
              <AnimatedCount value={partidosJugados} />
              <span className="text-white/40">/{totalPartidos}</span>
            </span>
            <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
              PELEAS JUGADAS
            </span>
          </div>
        </div>
      </HeroSection>

      <TablasGrupos grupos={liga.grupos} />
      <CalendarioLiga fechas={liga.fechas} grupos={liga.grupos} />
    </>
  );
}
