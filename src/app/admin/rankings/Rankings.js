"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PuntajesConfig from "./PuntajesConfig";

const TREND = {
  SUBE: { icon: "▲", className: "text-success" },
  BAJA: { icon: "▼", className: "text-error" },
  IGUAL: { icon: "=", className: "text-white/40" },
  NUEVO: { icon: "★", className: "text-tekken-blue-400" },
};

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  const cargar = useCallback(async (temporadaElegida) => {
    setLoading(true);
    try {
      const url = temporadaElegida
        ? `/api/admin/rankings?temporada=${temporadaElegida}`
        : "/api/admin/rankings";
      const response = await fetch(url);
      const data = await response.json();
      setRankings(data.rankings ?? []);
      setTemporadas(data.temporadas ?? []);
      setTemporada(data.temporada ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
      cargar(temporada);
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
          <Button onClick={() => setModalAbierto(true)} className="px-5 py-2.5 text-base">
            RECALCULAR RANKINGS
          </Button>
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
                  onClick={() => cargar(t)}
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
              <div className="flex flex-col gap-1.5">
                {rankings.map((r) => {
                  const trend = TREND[r.movimiento] ?? TREND.IGUAL;
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-[48px_minmax(0,1fr)_auto_40px] items-center gap-4 border border-white/10 bg-white/[.03] px-4 py-3"
                    >
                      <span className="font-display text-xl text-white/60">{r.posicion}</span>
                      <span className="font-display text-lg italic text-white">{r.nombre}</span>
                      <span className="font-display text-lg text-white">{r.puntaje} pts</span>
                      <span className={`text-center font-display text-lg ${trend.className}`}>
                        {trend.icon}
                      </span>
                    </div>
                  );
                })}
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
