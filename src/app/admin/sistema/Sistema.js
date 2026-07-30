"use client";

import { useEffect, useState } from "react";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

function formatoFecha(iso) {
  if (!iso) return "Sin datos";
  return new Date(iso).toLocaleString("es-PY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function IndicadorCard({ titulo, estado, detalle }) {
  const estilos = {
    ok: "border-l-success",
    atencion: "border-l-warning",
    sin_datos: "border-l-white/25",
  };
  const etiquetas = {
    ok: { texto: "OK", clase: "text-success" },
    atencion: { texto: "ATENCIÓN", clase: "text-warning" },
    sin_datos: { texto: "SIN DATOS", clase: "text-white/50" },
  };
  const etiqueta = etiquetas[estado];

  return (
    <div className={`flex flex-col gap-1.5 border border-white/10 border-l-[3px] bg-white/[.03] p-4 ${estilos[estado]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-lg tracking-[0.03em]">{titulo}</span>
        <span className={`font-display text-sm tracking-[0.08em] ${etiqueta.clase}`}>
          {etiqueta.texto}
        </span>
      </div>
      <span className="font-body text-xs text-white/50">{detalle}</span>
    </div>
  );
}

export default function Sistema() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sistema")
      .then((r) => r.json())
      .then(setDatos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-1.5">
          <RibbonTag>ADMIN · SISTEMA</RibbonTag>
          <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
            SISTEMA
          </h1>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          {loading || !datos ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <IndicadorCard
                titulo="HEALTH CHECK"
                estado={!datos.health ? "sin_datos" : datos.health.ok ? "ok" : "atencion"}
                detalle={
                  datos.health
                    ? `Ultimo ping: ${formatoFecha(datos.health.created_at)}`
                    : "Todavia no se registro ningun ping"
                }
              />
              <IndicadorCard
                titulo="IMPORT · CUENTA A"
                estado={datos.importaciones.A ? "ok" : "sin_datos"}
                detalle={
                  datos.importaciones.A
                    ? `Ultimo torneo cargado: ${formatoFecha(datos.importaciones.A)}`
                    : "Sin torneos importados de la cuenta A"
                }
              />
              <IndicadorCard
                titulo="IMPORT · CUENTA B"
                estado={datos.importaciones.B ? "ok" : "sin_datos"}
                detalle={
                  datos.importaciones.B
                    ? `Ultimo torneo cargado: ${formatoFecha(datos.importaciones.B)}`
                    : "Sin torneos importados de la cuenta B"
                }
              />
              <IndicadorCard
                titulo="BACKUP"
                estado={!datos.backup ? "sin_datos" : datos.backup.ok ? "ok" : "atencion"}
                detalle={
                  datos.backup
                    ? `Ultimo backup: ${formatoFecha(datos.backup.created_at)}`
                    : "El workflow de backup no registra eventos todavia"
                }
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
