"use client";

import { useCallback, useEffect, useState } from "react";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Paginacion from "@/components/admin/Paginacion";
import { usePaginacionUrl } from "@/components/admin/usePaginacionUrl";
import { POR_PAGINA_LOG } from "@/lib/paginacion";

function formatoFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const BORDE_TOPE = {
  ok: "border-t-success",
  atencion: "border-t-warning",
  error: "border-t-error",
  sin_datos: "border-t-white/25",
};

const ETIQUETAS = {
  ok: "OK",
  atencion: "ATENCIÓN",
  error: "ERROR",
  sin_datos: "SIN DATOS",
};

const DOT_COLOR = {
  ok: "bg-success",
  atencion: "bg-warning",
  error: "bg-error",
  sin_datos: "bg-white/30",
};

const TEXTO_ESTADO = {
  ok: "text-success",
  atencion: "text-warning",
  error: "text-error",
  sin_datos: "text-white/50",
};

function IndicadorCard({ titulo, estado, detalle, metricLabel, metric }) {
  return (
    <div
      className={`flex flex-col gap-2.5 border border-white/10 border-t-2 bg-white/[.03] p-4 ${BORDE_TOPE[estado]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-lg tracking-[0.03em]">{titulo}</span>
        <span className={`h-2.5 w-2.5 flex-none rounded-full ${DOT_COLOR[estado]}`} />
      </div>
      <span className={`font-display text-sm font-bold tracking-[0.06em] ${TEXTO_ESTADO[estado]}`}>
        {ETIQUETAS[estado]}
      </span>
      <span className="font-body text-xs leading-relaxed text-white/55">{detalle}</span>
      <div className="flex items-center justify-between gap-2 border-t border-white/[.07] pt-2.5">
        <span className="font-body text-[11px] text-white/40">{metricLabel}</span>
        <span className="font-mono text-xs text-white/80">{metric}</span>
      </div>
    </div>
  );
}

function LogEventos({ eventos }) {
  if (eventos.length === 0) {
    return (
      <p className="p-5 font-body text-sm text-white/50">Todavía no hay eventos registrados.</p>
    );
  }

  return (
    <div className="flex flex-col">
      {eventos.map((evento) => (
        <div
          key={evento.id}
          className="flex flex-wrap items-baseline gap-3 border-b border-white/[.05] px-[18px] py-2.5"
        >
          <span className="w-[108px] flex-none font-mono text-[11px] text-white/40">
            {formatoFecha(evento.time)}
          </span>
          <span
            className={`w-[52px] flex-none font-body text-[11px] font-bold tracking-[0.06em] ${
              evento.tone === "error" ? "text-error" : "text-success"
            }`}
          >
            {evento.level}
          </span>
          <span className="min-w-0 flex-1 font-body text-[13px] text-white/80">{evento.msg}</span>
        </div>
      ))}
    </div>
  );
}

export default function Sistema() {
  const [datos, setDatos] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const { pagina, query, irAPagina } = usePaginacionUrl();

  const cargar = useCallback(() => {
    setLoading(true);
    return Promise.all([
      fetch("/api/admin/sistema").then((r) => r.json()),
      fetch(`/api/admin/sistema/eventos?${query}`).then((r) => r.json()),
    ])
      .then(([sistema, log]) => {
        setDatos(sistema);
        setEventos(log.eventos ?? []);
        setTotal(log.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_LOG));

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
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
          {loading || !datos ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <IndicadorCard
                  titulo="HEALTH CHECK"
                  estado={!datos.health ? "sin_datos" : datos.health.ok ? "ok" : "error"}
                  detalle="Chequeo automático diario contra Supabase (GitHub Actions)."
                  metricLabel="Último ping"
                  metric={formatoFecha(datos.health?.created_at)}
                />
                <IndicadorCard
                  titulo="IMPORT · CUENTA A"
                  estado={datos.importaciones.A ? "ok" : "sin_datos"}
                  detalle="Última importación de torneos desde la cuenta histórica de Challonge."
                  metricLabel="Último torneo"
                  metric={formatoFecha(datos.importaciones.A)}
                />
                <IndicadorCard
                  titulo="IMPORT · CUENTA B"
                  estado={datos.importaciones.B ? "ok" : "sin_datos"}
                  detalle="Última importación de torneos desde la cuenta actual de Challonge."
                  metricLabel="Último torneo"
                  metric={formatoFecha(datos.importaciones.B)}
                />
                <IndicadorCard
                  titulo="BACKUP"
                  estado={!datos.backup ? "sin_datos" : datos.backup.ok ? "ok" : "error"}
                  detalle="pg_dump semanal del esquema public (GitHub Actions)."
                  metricLabel="Último backup"
                  metric={formatoFecha(datos.backup?.created_at)}
                />
              </div>

              <div className="border border-white/10 bg-white/[.03]">
                <div className="border-b border-white/[.09] px-[18px] py-3.5">
                  <h2 className="m-0 font-display text-xl tracking-[0.04em]">Log de eventos</h2>
                </div>
                <LogEventos eventos={eventos} />
                {totalPaginas > 1 && (
                  <div className="border-t border-white/[.07] px-[18px] py-3">
                    <Paginacion
                      pagina={pagina}
                      totalPaginas={totalPaginas}
                      total={total}
                      etiqueta="eventos"
                      onCambio={irAPagina}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
