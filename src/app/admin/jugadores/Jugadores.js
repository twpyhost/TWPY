"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

export default function Jugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/jugadores");
      const data = await response.json();
      setJugadores(data.jugadores ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jugadores;
    return jugadores.filter((j) => j.display_name.toLowerCase().includes(q));
  }, [jugadores, query]);

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>ADMIN · JUGADORES</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              JUGADORES
            </h1>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nick..."
            className="h-11 w-full max-w-xs border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
          />
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          {loading ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
              No hay jugadores para mostrar.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((jugador) => (
                <Link
                  key={jugador.id}
                  href={`/admin/jugadores/${jugador.id}`}
                  className="flex flex-col gap-2 border border-white/10 bg-white/[.03] p-4 transition-colors duration-200 hover:border-primary-500/60"
                >
                  <span className="font-display text-xl italic text-white">
                    {jugador.display_name}
                  </span>
                  <span className="font-body text-xs text-white/50">
                    {jugador.torneos_jugados} torneo(s) jugado(s)
                    {jugador.posicion_actual ? ` · #${jugador.posicion_actual} en ranking` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
