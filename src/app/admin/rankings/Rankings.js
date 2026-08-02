"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Paginacion from "@/components/admin/Paginacion";
import { usePaginacionUrl, useBusquedaDebounced } from "@/components/admin/usePaginacionUrl";
import { POR_PAGINA_TABLA } from "@/lib/paginacion";
import { TREND } from "@/lib/data/movimiento";
import PuntajesConfig from "./PuntajesConfig";

function inicialesDe(nombre) {
  return (nombre || "?").trim().slice(0, 2).toUpperCase();
}

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  const { pagina, q, query, irAPagina, cambiarFiltro } = usePaginacionUrl({
    extras: ["temporada"],
  });
  const [texto, setTexto] = useBusquedaDebounced(q, (valor) => cambiarFiltro({ q: valor }));

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/rankings?${query}`);
      const data = await response.json();
      setRankings(data.rankings ?? []);
      setTemporadas(data.temporadas ?? []);
      setTemporada(data.temporada ?? null);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_TABLA));

  const recalcular = async () => {
    setRecalculando(true);
    try {
      const response = await fetch("/api/admin/rankings/recalcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(temporada ? { temporada } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo recalcular");

      toast.success("Rankings recalculados");
      setModalAbierto(false);
      cargar();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRecalculando(false);
    }
  };

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>ADMIN · RANKINGS</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              RANKINGS
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar jugador..."
              className="h-11 w-full max-w-xs border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
            />
            <Button onClick={() => setModalAbierto(true)} className="px-5 py-2.5 text-base">
              RECALCULAR RANKINGS
            </Button>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {temporadas.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => cambiarFiltro({ temporada: t })}
                  className={`border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
                    temporada === t
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="font-body text-sm text-white/50">Cargando...</p>
            ) : rankings.length === 0 ? (
              <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
                No hay rankings para esta temporada.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                  {rankings.map((r) => (
                    <TarjetaRanking key={r.id} r={r} />
                  ))}
                </div>

                <div className="hidden overflow-x-auto border border-white/10 bg-dark-gray-3-700 lg:block">
                  <table className="w-full min-w-[620px] border-collapse">
                    <thead>
                      <tr className="bg-black">
                        <Th>Pos</Th>
                        <Th>Jugador</Th>
                        <Th align="right">Torneos</Th>
                        <Th align="right">Puntos</Th>
                        <Th align="right">Tendencia</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((r) => {
                        const trend = TREND[r.movimiento] ?? TREND.IGUAL;
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-white/[.06] transition-colors duration-200 hover:bg-white/[.03]"
                          >
                            <td className="px-4 py-3 font-display text-2xl text-white/70">
                              {r.posicion}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[.09] font-display text-sm">
                                  {inicialesDe(r.nombre)}
                                </span>
                                <span className="font-body text-sm font-bold text-white">
                                  {r.nombre}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-body text-sm text-white/70">
                              {r.torneos}
                            </td>
                            <td className="px-4 py-3 text-right font-display text-lg text-white">
                              {r.puntaje} pts
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-display text-lg ${trend.className}`}
                            >
                              {trend.icon}
                            </td>
                          </tr>
                        );
                      })}
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

          <PuntajesConfig />
        </div>
      </section>

      <ConfirmModal
        open={modalAbierto}
        title="Recalcular rankings"
        body={
          <p className="m-0">
            Esto vuelve a calcular los cortes de ranking de{" "}
            {temporada ? `la temporada ${temporada}` : "todas las temporadas"} a partir de los
            resultados ya cargados.
          </p>
        }
        warningText="Usalo despues de fusionar jugadores o corregir resultados: no borra datos, pero reemplaza los snapshots existentes."
        requireUnderstandCheckbox
        confirmLabel="RECALCULAR"
        loading={recalculando}
        onConfirm={recalcular}
        onClose={() => setModalAbierto(false)}
      />
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

function TarjetaRanking({ r }) {
  const trend = TREND[r.movimiento] ?? TREND.IGUAL;
  return (
    <div className="flex flex-col gap-2 border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl text-white/60">#{r.posicion}</span>
        <span className="flex-1 truncate font-display text-xl italic text-white">{r.nombre}</span>
        <span className={`font-display text-xl ${trend.className}`}>{trend.icon}</span>
      </div>
      <span className="font-body text-xs text-white/50">
        {r.torneos} torneo(s) · {r.puntaje} pts
      </span>
    </div>
  );
}
