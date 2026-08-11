"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import StatusChip from "@/components/ui/StatusChip";

export default function Liga() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/liga");
      const data = await response.json();
      setResumen(response.ok ? data : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>ADMIN · LIGA</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              LIGA
            </h1>
            {resumen?.liga?.nombre && (
              <p className="m-0 font-body text-sm text-white/60">{resumen.liga.nombre}</p>
            )}
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          {!loading && resumen && resumen.pendientesVincular > 0 && (
            <Link
              href="/admin/liga/vinculacion"
              className="flex flex-wrap items-center gap-3 border border-tekken-blue-400/40 bg-tekken-blue-400/10 px-5 py-4 transition-colors duration-200 hover:bg-tekken-blue-400/20"
            >
              <span className="font-display text-lg italic text-tekken-blue-400">
                {resumen.pendientesVincular} participante(s) sin vincular
              </span>
              <span className="font-body text-sm text-white/70">
                → Ir a la cola de vinculación
              </span>
            </Link>
          )}

          {loading ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : !resumen ? (
            <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
              No hay ninguna liga cargada todavía.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumen.grupos.map((grupo) => (
                <TarjetaGrupo key={grupo.numero} grupo={grupo} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function TarjetaGrupo({ grupo }) {
  return (
    <Link
      href={`/admin/liga/grupo/${grupo.numero}`}
      className="group flex flex-col gap-3 border border-white/10 bg-white/[.03] p-5 transition-colors duration-200 hover:border-primary-500/50 hover:bg-white/[.06]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-2xl italic text-white">{grupo.nombre}</span>
        <StatusChip tone={grupo.cerrado ? "neutral" : "success"}>
          {grupo.cerrado ? "CERRADO" : "ABIERTO"}
        </StatusChip>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-body text-xs tracking-[0.1em] text-white/50">PROGRESO</span>
        <span className="font-display text-lg text-white">
          {grupo.progreso.cargados}/{grupo.progreso.total}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-body text-xs tracking-[0.1em] text-white/50">LÍDER ACTUAL</span>
        <span className="font-display text-lg italic text-primary-500">
          {grupo.liderNombre ?? "—"}
        </span>
      </div>
      <span className="mt-1 font-display text-xs tracking-[0.1em] text-white/50 group-hover:text-white">
        VER DETALLE →
      </span>
    </Link>
  );
}
