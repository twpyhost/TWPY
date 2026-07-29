"use client";

import { useMemo, useState } from "react";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "rankeados", label: "Rankeados" },
  { key: "sin-puntos", label: "Sin puntos" },
];

export default function CompetidoresBoard({ roster, temporada }) {
  const [filter, setFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [sortByPoints, setSortByPoints] = useState(true);

  const rankedCount = roster.filter((p) => p.posicion !== null).length;

  const podium = useMemo(
    () =>
      roster
        .filter((p) => p.posicion !== null && p.posicion <= 3)
        .sort((a, b) => a.posicion - b.posicion),
    [roster],
  );

  const filtered = useMemo(() => {
    let list = roster;

    if (filter === "rankeados") list = list.filter((p) => p.posicion !== null);
    if (filter === "sin-puntos") list = list.filter((p) => p.posicion === null);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.username.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (sortByPoints) {
        return (b.puntaje ?? -1) - (a.puntaje ?? -1);
      }
      return a.username.localeCompare(b.username);
    });
  }, [roster, filter, query, sortByPoints]);

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>{`ROSTER OFICIAL · TEMPORADA ${temporada}`}</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              COMPETIDORES
            </h1>
          </div>
          <div className="flex items-end gap-7">
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
              <span className="font-display text-[42px] leading-[.9]">{roster.length}</span>
              <span className="font-display text-[13px] tracking-[0.2em] text-white/60">
                TOTAL
              </span>
            </div>
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-tekken-blue-400 pl-4">
              <span className="font-display text-[42px] leading-[.9]">{rankedCount}</span>
              <span className="font-display text-[13px] tracking-[0.2em] text-white/60">
                RANKEADOS
              </span>
            </div>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-16 pt-10 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          {podium.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {podium.map((player) => (
                <div
                  key={player.id}
                  className="relative overflow-hidden border border-white/10 bg-dark-gray-3-500 p-6"
                >
                  <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[120px] leading-none text-white/[.06]">
                    {player.posicion}
                  </span>
                  <RibbonTag
                    variant={player.posicion === 1 ? "primary" : "cyan"}
                    className="relative mb-3"
                  >
                    {player.posicion === 1 ? "CAMPEÓN VIGENTE" : "N° DEL RANKING"}
                  </RibbonTag>
                  <p className="relative m-0 font-display text-3xl italic">{player.username}</p>
                  <p className="relative m-0 font-body text-sm text-white/60">
                    {player.puntaje} pts
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
                    filter === f.key
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nick..."
                className="h-10 border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => setSortByPoints((v) => !v)}
                className="flex h-10 items-center gap-2 border border-white/15 bg-white/[.04] px-3 font-display text-sm tracking-[0.08em] text-white/80 hover:border-white/30"
              >
                {sortByPoints ? "MÁS PUNTOS" : "A-Z"} <span>⇅</span>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center font-body text-white/50">
              No encontramos competidores con ese criterio.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((player) => (
                <div
                  key={player.id}
                  className={`flex flex-col gap-2 border border-white/10 bg-white/[.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/60 hover:shadow-glow-primary ${
                    player.posicion !== null && player.posicion <= 3
                      ? "border-tekken-blue-400/40"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        player.posicion === null
                          ? "bg-white/25"
                          : player.posicion <= 3
                            ? "bg-tekken-blue-400"
                            : "bg-primary-500"
                      }`}
                    />
                    <span className="font-display text-sm tracking-[0.08em] text-white/50">
                      {player.posicion !== null ? `#${player.posicion}` : "S/R"}
                    </span>
                  </div>
                  <p className="m-0 [overflow-wrap:anywhere] font-display text-xl italic">{player.username}</p>
                  <p className="m-0 font-body text-xs text-white/50">
                    {player.puntaje !== null ? `${player.puntaje} pts` : "SIN PUNTOS"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
