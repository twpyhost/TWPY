import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import ChallongeLinkButton from "./ChallongeLinkButton";
import { getTorneoResultados, getTorneos } from "@/app/utils/db";
import { withMinDelay } from "@/lib/withMinDelay";
import { fadeDelay } from "@/lib/fadeDelay";
import twpyLogo from "../../../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

const SUFFIX = { 1: "ER", 2: "DO", 3: "ER", 4: "TO", 5: "TO", 6: "TO", 7: "MO", 8: "VO", 9: "NO", 10: "MO" };

const PODIUM_TAGS = [
  { variant: "primary", label: "CAMPEÓN", gradient: "from-primary-900/40 via-dark-gray-3-700 to-dark-gray-3-900", border: "border-white/[.24]", nameSize: "text-[46px]", ptsSize: "text-[58px]" },
  { variant: "cyan", label: "SUBCAMPEÓN", gradient: "from-tekken-blue-900/30 via-dark-gray-3-700 to-dark-gray-3-900", border: "border-white/[.16]", nameSize: "text-[38px]", ptsSize: "text-[46px]" },
  { variant: "white", label: "3ER PUESTO", gradient: "from-white/[.08] via-dark-gray-3-700 to-dark-gray-3-900", border: "border-white/[.14]", nameSize: "text-[38px]", ptsSize: "text-[46px]" },
];

function parseFecha(fechaISO) {
  const [year, month, day] = fechaISO.split("-");
  return { day, monthLabel: MESES[Number(month) - 1], year };
}

function tierBorderClass(posicion) {
  return posicion <= 3 ? "border-l-tekken-blue-400" : "border-l-primary-500";
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const resultados = await getTorneoResultados(slug);

  if (!resultados || resultados.length === 0) {
    return { title: "Resultados" };
  }

  const nombreTorneo = resultados[0].torneo.nombre_torneo;
  return {
    title: nombreTorneo,
    description: `Resultados y puntajes de ${nombreTorneo} — Tekken Warriors Paraguay.`,
  };
}

export default async function Resultados({ params }) {
  const { slug } = await params;
  const [resultados, torneos] = await withMinDelay(
    Promise.all([getTorneoResultados(slug), getTorneos()]),
  );

  if (!resultados || resultados.length === 0) {
    notFound();
  }

  const torneoInfo = torneos.find((t) => String(t.torneo_id) === String(slug));
  const fecha = torneoInfo ? parseFecha(torneoInfo.fecha_torneo) : null;
  const nombreTorneo = resultados[0].torneo.nombre_torneo;
  const totalPuntos = resultados.reduce((sum, r) => sum + r.puntaje, 0);
  const podio = resultados.length >= 3 ? resultados.slice(0, 3) : [];

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10 lg:px-14 lg:pb-12 lg:pt-[52px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <Link
            href="/torneos"
            className="inline-flex w-fit items-center gap-2.5 font-display text-base tracking-[0.2em] text-white/60 transition-colors duration-300 hover:text-primary-500"
          >
            <span>&larr;</span> VOLVER A TORNEOS
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex max-w-[820px] flex-col gap-2">
              <RibbonTag>
                {`TORNEO RANKED${fecha ? ` · ${fecha.day} DE ${fecha.monthLabel} DE ${torneoInfo.temporada}` : ""}`}
              </RibbonTag>
              <h1 className="-ml-1.5 m-0 font-display text-[clamp(52px,7.4vw,104px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
                RESULTADOS
              </h1>
              <div className="font-display text-[clamp(24px,2.6vw,36px)] leading-[1.05] tracking-[0.02em] text-white/90 [overflow-wrap:anywhere]">
                {nombreTorneo}
              </div>
            </div>
            <div className="flex items-end gap-7">
              <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
                <span className="font-display text-[56px] leading-[.9]">{resultados.length}</span>
                <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
                  JUGADORES
                </span>
              </div>
              <Image
                src={twpyLogo}
                alt="Tekken Warriors Paraguay"
                className="h-[118px] w-auto drop-shadow-[0_0_22px_rgba(255,255,255,.25)]"
              />
            </div>
          </div>
        </div>
      </HeroSection>

      {podio.length === 3 && (
        <section className="relative z-[3] bg-black px-5 sm:px-8 lg:px-14">
          <div className="-mt-7 mx-auto grid max-w-[1240px] grid-cols-1 gap-4 lg:-mt-9 lg:grid-cols-[1.3fr_1fr_1fr]">
            {podio.map((r, index) => {
              const tag = PODIUM_TAGS[index];
              return (
                <div
                  key={`${r.posicion}-${r.jugador.nombre}`}
                  style={fadeDelay(index)}
                  className={`relative flex min-h-[196px] animate-fade-up flex-col justify-between gap-3.5 overflow-hidden border bg-gradient-to-br p-6 pb-5 ${tag.border} ${tag.gradient}`}
                >
                  <RibbonTag variant={tag.variant} className="relative w-fit">
                    {tag.label}
                  </RibbonTag>
                  <div className="relative flex items-end justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className={`[overflow-wrap:anywhere] font-display leading-[.98] tracking-[0.02em] text-white ${tag.nameSize}`}>
                        {r.jugador.nombre}
                      </span>
                      <span className="text-[13px] uppercase tracking-[0.16em] text-white/50">
                        PUNTOS SUMADOS AL RANKING
                      </span>
                    </div>
                    <span className={`font-display leading-[.9] text-primary-500 [text-shadow:0_0_26px_rgba(245,10,100,.45)] ${tag.ptsSize}`}>
                      {r.puntaje}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-black px-5 pb-16 pt-9 sm:px-8 sm:pb-24 sm:pt-12 lg:px-14 lg:pb-[100px] lg:pt-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3.5">
            <span className="font-display text-[clamp(28px,3vw,40px)] italic leading-none">
              TABLA COMPLETA
            </span>
            <span className="font-body text-sm text-white/50">
              Puntaje otorgado según posición final
              {torneoInfo ? ` · válido para el ranking ${torneoInfo.temporada}` : ""}
            </span>
          </div>

          <div className="grid animate-fade-up grid-cols-[56px_minmax(0,1fr)_70px] items-center gap-4 bg-primary-500 px-5 py-2.5 [clip-path:polygon(8px_0,100%_0,calc(100%_-_8px)_100%,0_100%)] sm:grid-cols-[88px_minmax(0,1fr)_120px] sm:gap-5">
            <span className="font-display text-sm tracking-[0.18em] text-white sm:text-base sm:tracking-[0.22em]">
              POSICIÓN
            </span>
            <span className="font-display text-sm tracking-[0.18em] text-white sm:text-base sm:tracking-[0.22em]">
              JUGADOR
            </span>
            <span className="text-right font-display text-sm tracking-[0.18em] text-white sm:text-base sm:tracking-[0.22em]">
              PUNTAJE
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {resultados.map((r, index) => {
              const top = r.posicion <= 3;
              return (
                <div
                  key={`${r.posicion}-${r.jugador.nombre}`}
                  style={fadeDelay(index)}
                  className={`grid animate-fade-up grid-cols-[56px_minmax(0,1fr)_70px] items-center gap-4 border-l-[3px] px-5 py-3.5 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 sm:grid-cols-[88px_minmax(0,1fr)_120px] sm:gap-5 ${tierBorderClass(
                    r.posicion,
                  )} ${top ? "bg-primary-500/10" : "bg-white/[.03]"}`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-display text-3xl leading-[.9] sm:text-[38px] ${top ? "text-white" : "text-white/60"}`}>
                      {r.posicion}
                    </span>
                    <span className="font-display text-sm tracking-[0.14em] text-white/40">
                      {SUFFIX[r.posicion] || "TO"}
                    </span>
                  </div>
                  <span className={`[overflow-wrap:anywhere] font-display text-xl leading-[1.05] tracking-[0.03em] sm:text-[30px] ${top ? "text-white" : "text-white/90"}`}>
                    {r.jugador.nombre}
                  </span>
                  <span className="text-right font-display text-2xl leading-none text-primary-500 sm:text-[32px]">
                    {r.puntaje}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-5 border-t border-white/10 pt-4 font-display text-sm tracking-[0.18em] text-white/55 sm:gap-6 sm:text-[17px] sm:tracking-[0.2em]">
            <span>{resultados.length} JUGADORES</span>
            <span className="h-[18px] w-px bg-white/20" />
            <span>{totalPuntos} PUNTOS REPARTIDOS</span>
            <span className="hidden h-[18px] w-px bg-white/20 sm:block" />
            <span className="hidden text-white/40 sm:block">
              POSICIONES COMPARTIDAS INDICADAS CON EL MISMO NÚMERO
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3.5">
            <ChallongeLinkButton url={torneoInfo?.url_challonge} />
            <Button href="/ranking" className="px-7 py-3 text-lg">
              VER RANKING GENERAL <span>&rarr;</span>
            </Button>
            <Button href="/torneos" variant="outline" className="px-7 py-3 text-lg">
              OTROS TORNEOS
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
