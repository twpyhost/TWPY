import Link from "next/link";

// Selector de temporadas: mismo lenguaje visual (pill track + indicador
// deslizante) que el diseño de Claude Design para Ranking, pero navegando
// via ?year= + <Link> (server-rendered) en vez del cross-fade client-side
// del prototipo — mismo patron ya usado por el filtro de anos de Torneos.
export default function SeasonTabs({ seasons, activeYear }) {
  const n = seasons.length;
  const activeIndex = Math.max(
    seasons.findIndex((season) => season.year === activeYear),
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
        const isActive = season.year === activeYear;

        return (
          <Link
            key={season.year}
            href={season.isDefault ? "/ranking" : `/ranking?year=${season.year}`}
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
          </Link>
        );
      })}
    </div>
  );
}
