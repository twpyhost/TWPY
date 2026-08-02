"use client";

import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

// Selector de temporadas: mismo lenguaje visual (pill track + indicador
// deslizante) que el diseno de Claude Design para Ranking, navegando via
// ?year=. Kept as an <a> (not a <button>) so browser affordances (open in
// new tab, right-click, ctrl/cmd-click) keep working -- but intercepts a
// plain left-click to run the navigation inside useTransition, so
// RankingTableBoundary can show the scoped spinner immediately instead of
// waiting on the router's buffered same-route searchParams navigation
// (see SeasonTransitionProvider.js).
export default function SeasonTabs({ seasons }) {
  // La temporada mostrada es optimista: el indicador y el resaltado se mueven
  // en el frame del click, sin esperar los ~50-100ms del shell del servidor.
  const { navigate, valorMostrado: temporadaMostrada } = useSearchParamTransition();

  const n = seasons.length;
  const activeIndex = Math.max(
    seasons.findIndex((season) => season.year === temporadaMostrada),
    0,
  );

  return (
    <div className="relative flex w-full max-w-[340px] self-start border border-white/[.14] bg-white/[.05] p-[3px] sm:self-auto">
      <div
        className="absolute bottom-[3px] top-[3px] bg-primary-500 shadow-glow-primary transition-transform duration-500 ease-[cubic-bezier(.16,.84,.24,1)] [clip-path:polygon(5%_0,100%_0,95%_100%,0_100%)]"
        style={{
          left: "3px",
          width: `calc((100% - 6px) / ${n})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {seasons.map((season) => {
        const isActive = season.year === temporadaMostrada;
        const href = season.isDefault ? "/ranking" : `/ranking?year=${season.year}`;

        return (
          <a
            key={season.year}
            href={href}
            onClick={(event) => {
              // Let modified clicks (ctrl/cmd/shift/middle-click) fall
              // through to normal browser handling (open in new tab, etc.)
              // instead of hijacking them into a client transition.
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              navigate(href, season.year);
            }}
            className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-0.5 px-1.5 py-2"
          >
            <span
              className={`font-display text-lg italic leading-none tracking-[.04em] transition-colors duration-300 ${
                isActive
                  ? "text-white [text-shadow:0_0_16px_rgba(245,10,100,.6)]"
                  : "text-white/55"
              }`}
            >
              {season.year}
            </span>
            <span
              className={`font-display text-[9px] leading-none tracking-[.16em] transition-colors duration-300 ${
                isActive ? "text-white/85" : "text-white/30"
              }`}
            >
              {season.status === "EN CURSO" ? "EN CURSO" : "FINAL"}
            </span>
          </a>
        );
      })}
    </div>
  );
}
