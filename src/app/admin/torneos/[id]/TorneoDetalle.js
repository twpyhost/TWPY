"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

const ESTADO_LABEL = {
  vinculado: { texto: "VINCULADO", clase: "border-success/40 bg-success/10 text-success" },
  pendiente: {
    texto: "PENDIENTE",
    clase: "border-warning/40 bg-warning/10 text-warning",
  },
  sin_cuenta: {
    texto: "SIN CUENTA",
    clase: "border-white/20 bg-white/[.04] text-white/60",
  },
};

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
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2">
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
                <span className={`border px-2.5 py-1 font-display text-[11px] tracking-[0.08em] ${estado.clase}`}>
                  {estado.texto}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
