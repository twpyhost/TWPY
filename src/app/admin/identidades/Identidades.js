"use client";

import { useCallback, useEffect, useState } from "react";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import ColaParticipantes from "./ColaParticipantes";
import RegistrarJugadorManual from "./RegistrarJugadorManual";
import FusionarJugadores from "./FusionarJugadores";
import LogActividad from "./LogActividad";

export default function Identidades() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarResumen = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/identidades/resumen");
      const data = await response.json();
      setResumen(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  const stats = resumen?.stats ?? { pendientes: 0, hoy: 0, fusiones: 0 };

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>ADMIN · RESOLUCIÓN DE IDENTIDADES</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              IDENTIDADES
            </h1>
          </div>
          <div className="flex flex-wrap items-end gap-7">
            <Stat label="PENDIENTES" value={stats.pendientes} />
            <Stat label="HOY" value={stats.hoy} />
            <Stat label="FUSIONES" value={stats.fusiones} />
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <Bloque titulo="Participantes sin vincular">
            {loading ? (
              <p className="font-body text-sm text-white/50">Cargando...</p>
            ) : (
              <ColaParticipantes cola={resumen?.cola ?? []} onResuelto={cargarResumen} />
            )}
          </Bloque>

          <Bloque titulo="Registrar jugador manualmente">
            <RegistrarJugadorManual onRegistrado={cargarResumen} />
          </Bloque>

          <Bloque titulo="Fusionar jugadores duplicados">
            <FusionarJugadores onFusionado={cargarResumen} />
          </Bloque>

          <Bloque titulo="Actividad reciente">
            {loading ? (
              <p className="font-body text-sm text-white/50">Cargando...</p>
            ) : (
              <LogActividad log={resumen?.log ?? []} onCambio={cargarResumen} />
            )}
          </Bloque>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
      <span className="font-display text-[36px] leading-[.9]">{value}</span>
      <span className="font-display text-[12px] tracking-[0.2em] text-white/60">{label}</span>
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div className="flex flex-col gap-3">
      <RibbonTag className="w-fit">{titulo.toUpperCase()}</RibbonTag>
      {children}
    </div>
  );
}
