"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Paginacion from "@/components/admin/Paginacion";
import { usePaginacionUrl, useBusquedaDebounced } from "@/components/admin/usePaginacionUrl";
import { POR_PAGINA_TABLA } from "@/lib/paginacion";

export default function Jugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const { pagina, q, query, irAPagina, cambiarFiltro } = usePaginacionUrl();
  const [texto, setTexto] = useBusquedaDebounced(q, (valor) => cambiarFiltro({ q: valor }));

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/jugadores?${query}`);
      const data = await response.json();
      setJugadores(data.jugadores ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_TABLA));

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
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar nick..."
            className="h-11 w-full max-w-xs border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
          />
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          {loading ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : jugadores.length === 0 ? (
            <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
              No hay jugadores para mostrar.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {jugadores.map((jugador) => (
                  <TarjetaJugador key={jugador.id} jugador={jugador} />
                ))}
              </div>

              <div className="hidden overflow-x-auto border border-white/10 bg-dark-gray-3-700 lg:block">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="bg-black">
                      <Th align="left">Jugador</Th>
                      <Th align="left">Aliases</Th>
                      <Th align="right">Torneos</Th>
                      <Th align="right">Ranking</Th>
                      <Th align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {jugadores.map((jugador) => (
                      <tr
                        key={jugador.id}
                        className="border-b border-white/[.06] transition-colors duration-200 hover:bg-white/[.03]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-white/[.09] font-display text-[15px]">
                              {inicialesDe(jugador.display_name)}
                            </span>
                            <span className="font-body text-sm font-bold text-white">
                              {jugador.display_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-white/55">
                          {jugador.aliases.length > 0 ? jugador.aliases.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm text-white">
                          {jugador.torneos_jugados}
                        </td>
                        <td className="px-4 py-3 text-right font-display text-lg text-primary-400">
                          {jugador.posicion_actual ? `#${jugador.posicion_actual}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/jugadores/${jugador.id}`}
                            className="inline-block whitespace-nowrap border border-white/20 px-3.5 py-1.5 font-display text-xs tracking-[0.05em] text-white transition-colors duration-200 hover:border-primary-500 hover:text-primary-400"
                          >
                            VER PERFIL
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Paginacion
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={total}
                etiqueta="jugadores"
                onCambio={irAPagina}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Th({ children, align }) {
  return (
    <th
      className={`px-4 py-3 font-display text-[15px] font-normal tracking-[0.09em] text-white/50 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function inicialesDe(nombre) {
  return (nombre || "?").trim().slice(0, 2).toUpperCase();
}

function TarjetaJugador({ jugador }) {
  return (
    <Link
      href={`/admin/jugadores/${jugador.id}`}
      className="flex flex-col gap-2 border border-white/10 bg-white/[.03] p-4 transition-colors duration-200 hover:border-primary-500/60"
    >
      <span className="font-display text-xl italic text-white">{jugador.display_name}</span>
      <span className="font-body text-xs text-white/50">
        {jugador.torneos_jugados} torneo(s) jugado(s)
        {jugador.posicion_actual ? ` · #${jugador.posicion_actual} en ranking` : ""}
      </span>
      {jugador.aliases.length > 0 && (
        <span className="font-mono text-[11px] text-white/40">{jugador.aliases.join(", ")}</span>
      )}
    </Link>
  );
}
