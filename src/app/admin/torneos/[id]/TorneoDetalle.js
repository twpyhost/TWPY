"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import StatusChip from "@/components/ui/StatusChip";

const ESTADO_LABEL = {
  vinculado: { texto: "VINCULADO", tone: "success" },
  pendiente: { texto: "PENDIENTE", tone: "warning" },
  sin_cuenta: { texto: "SIN CUENTA", tone: "neutral" },
};

const PODIO_TONE = { 1: "primary", 2: "cyan", 3: "cyan", 4: "neutral" };

export default function TorneoDetalle({ torneoId }) {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/torneos/${torneoId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el torneo");
      setDatos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) {
    return (
      <div className="p-8 font-body text-sm text-white/50">Cargando...</div>
    );
  }

  if (error || !datos) {
    return (
      <div className="p-8 font-body text-sm text-white/50">
        {error ?? "Torneo no encontrado"}
      </div>
    );
  }

  const { torneo, participantes } = datos;

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
          <Link
            href="/admin/torneos"
            className="inline-flex w-fit items-center gap-2 font-display text-sm tracking-[0.14em] text-white/60 hover:text-primary-500"
          >
            <span>&larr;</span> VOLVER A TORNEOS
          </Link>
          <RibbonTag>ADMIN · DETALLE DE TORNEO</RibbonTag>
          <h1 className="-ml-1.5 m-0 font-display text-[clamp(38px,5.4vw,64px)] italic leading-[.95] tracking-[0.01em]">
            {torneo.nombre}
          </h1>
          <p className="m-0 font-body text-sm text-white/60">
            {torneo.fecha_inicio} · temporada {torneo.temporada} · cuenta de origen{" "}
            {torneo.challonge_source_account}
          </p>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
          {participantes.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="m-0 font-display text-xl tracking-[0.04em]">Top 4</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {participantes.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-1.5 border border-white/10 bg-white/[.03] p-4"
                  >
                    <StatusChip
                      tone={PODIO_TONE[p.posicion] ?? "neutral"}
                      className="w-fit"
                    >
                      #{p.posicion}
                    </StatusChip>
                    <span className="font-display text-xl italic leading-tight text-white">
                      {p.jugador?.nombre ?? p.nombre_participante}
                    </span>
                    <span className="font-body text-xs text-white/50">{p.puntaje} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 border border-dashed border-white/[.16] bg-white/[.02] p-8 text-center">
            <span className="font-display text-lg tracking-[0.06em] text-white/40">
              BRACKET EMBEBIDO · CHALLONGE IFRAME
            </span>
            {torneo.url_challonge && (
              <a
                href={torneo.url_challonge}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs text-tekken-blue-400 hover:text-tekken-blue-300"
              >
                Ver bracket en Challonge →
              </a>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-xl tracking-[0.04em]">Participantes</h2>
            <div className="flex flex-col gap-2">
              {participantes.map((p) => {
                const estado = ESTADO_LABEL[p.estado] ?? ESTADO_LABEL.sin_cuenta;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-4 border border-white/10 bg-white/[.03] p-4"
                  >
                    <span className="w-14 font-display text-2xl text-white/70">{p.posicion}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-lg italic text-white">
                        {p.jugador?.nombre ?? p.nombre_participante}
                      </span>
                      <span className="font-body text-xs text-white/50">{p.puntaje} pts</span>
                    </div>
                    <StatusChip tone={estado.tone}>{estado.texto}</StatusChip>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
