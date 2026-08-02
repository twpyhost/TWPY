import Link from "next/link";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import SearchParamTransitionProvider from "@/components/ui/SearchParamTransitionProvider";
import TorneoYearTabs from "./TorneoYearTabs";
import TorneoListBoundary from "./TorneoListBoundary";

import { getTorneos, getFiltroAno } from "../utils/db";
import { withMinDelay } from "@/lib/withMinDelay";
import { fadeDelay } from "@/lib/fadeDelay";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export const metadata = {
  title: "Torneos",
  description: "Historial completo de torneos ranked del circuito Tekken Warriors Paraguay.",
};

const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

function parseFecha(fechaISO) {
  const [year, month, day] = fechaISO.split("-");
  return { day, monthLabel: MESES[Number(month) - 1], year };
}

export default async function TorneosPage({ searchParams }) {
  const [torneos, anos] = await withMinDelay(Promise.all([getTorneos(), getFiltroAno()]));
  const params = await searchParams;
  const selectedYear = params?.year || "all";

  const sorted = [...torneos].sort((a, b) => b.fecha_torneo.localeCompare(a.fecha_torneo));
  const featured = sorted[0];

  const filtered =
    selectedYear === "all"
      ? sorted
      : sorted.filter((torneo) => torneo.temporada === selectedYear);

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>CIRCUITO NACIONAL &middot; TEKKEN 8</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(64px,9vw,120px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              TORNEOS
            </h1>
            <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
              Historial completo de torneos ranked del circuito Tekken Warriors Paraguay.
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[56px] leading-[.9]">{torneos.length}</span>
            <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
              TORNEOS DISPUTADOS
            </span>
          </div>
        </div>
      </HeroSection>

      <SearchParamTransitionProvider value={selectedYear}>
        <section className="bg-black px-5 pb-16 pt-8 sm:px-8 lg:px-14">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
            {featured && (
              <div className="relative animate-fade-up overflow-hidden border border-white/10 bg-gradient-to-br from-primary-900/40 via-dark-gray-3-700 to-tekken-blue-900/20 p-7">
                <span className="font-display text-sm tracking-[0.24em] text-tekken-blue-400">
                  ÚLTIMO TORNEO
                </span>
                <h2 className="m-0 mt-1.5 font-display text-3xl italic sm:text-4xl">
                  {featured.nombre_torneo}
                </h2>
                <p className="m-0 mt-1 font-body text-sm text-white/60">
                  {parseFecha(featured.fecha_torneo).day} de{" "}
                  {parseFecha(featured.fecha_torneo).monthLabel} de {featured.temporada}
                </p>
                <Button
                  href={`/torneo-resultado/${featured.torneo_id}`}
                  className="mt-5 px-6 py-2.5 text-lg"
                >
                  VER RESULTADOS <span>&rarr;</span>
                </Button>
              </div>
            )}

            <TorneoYearTabs anos={anos} />

            <TorneoListBoundary>
              <div className="flex flex-col gap-2">
                {filtered.map((torneo, index) => {
                  const { day, monthLabel, year } = parseFecha(torneo.fecha_torneo);
                  const isFeatured = featured && torneo.torneo_id === featured.torneo_id;

                  return (
                    <Link
                      key={torneo.torneo_id}
                      href={`/torneo-resultado/${torneo.torneo_id}`}
                      style={fadeDelay(index)}
                      className={`grid animate-fade-up grid-cols-[64px_1fr_24px] items-center gap-4 border-l-[3px] px-5 py-4 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 ${
                        isFeatured ? "border-l-tekken-blue-400" : "border-l-primary-500"
                      } ${index % 2 === 1 ? "bg-white/[.055]" : "bg-white/[.03]"}`}
                    >
                      <div className="flex flex-col items-center leading-none">
                        <span className="font-display text-3xl">{day}</span>
                        <span className="font-display text-xs tracking-[0.1em] text-white/50">
                          {monthLabel} {year}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-display text-xl italic">{torneo.nombre_torneo}</span>
                        <span className="font-body text-xs uppercase tracking-[0.08em] text-white/45">
                          Torneo ranked
                        </span>
                      </div>
                      <span className="justify-self-end text-white/40">&rarr;</span>
                    </Link>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-10 text-center font-body text-white/50">
                    No hay torneos para este año.
                  </p>
                )}
              </div>
            </TorneoListBoundary>
          </div>
        </section>
      </SearchParamTransitionProvider>
    </>
  );
}
