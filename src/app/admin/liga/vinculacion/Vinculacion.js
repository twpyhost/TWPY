"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import BuscadorJugador from "@/app/admin/identidades/BuscadorJugador";

export default function Vinculacion() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/liga/vinculacion");
      const data = await response.json();
      setPendientes(response.ok ? (data.pendientes ?? []) : []);
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
            <Link
              href="/admin/liga"
              className="font-body text-xs tracking-[0.1em] text-white/50 hover:text-white"
            >
              ← LIGA
            </Link>
            <RibbonTag>ADMIN · LIGA</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              VINCULACIÓN
            </h1>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[36px] leading-[.9]">{pendientes.length}</span>
            <span className="font-display text-[12px] tracking-[0.2em] text-white/60">
              PENDIENTES
            </span>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
          {loading ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : pendientes.length === 0 ? (
            <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
              No hay participantes pendientes de vincular.
            </p>
          ) : (
            pendientes.map((item) => (
              <FilaPendiente key={item.participanteId} item={item} onResuelto={cargar} />
            ))
          )}
        </div>
      </section>
    </>
  );
}

function FilaPendiente({ item, onResuelto }) {
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [loadingVincular, setLoadingVincular] = useState(false);
  const [loadingCrear, setLoadingCrear] = useState(false);

  const vincular = async (body) => {
    try {
      const response = await fetch("/api/admin/liga/vinculacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId: item.participanteId, ...body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al vincular");
      toast.success(data.message || "Participante vinculado");
      onResuelto();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const vincularA = async (playerId) => {
    setLoadingVincular(true);
    try {
      await vincular({ playerId });
    } finally {
      setLoadingVincular(false);
    }
  };

  const crearJugador = async () => {
    setLoadingCrear(true);
    try {
      await vincular({ crearComo: item.nombre });
    } finally {
      setLoadingCrear(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3.5 border border-white/10 bg-white/[.03] p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 basis-[210px]">
        <span className="font-display text-lg italic text-white [overflow-wrap:anywhere]">
          {item.nombre}
        </span>
        <span className="font-body text-xs text-white/50">Grupo {item.grupoNumero}</span>
      </div>

      <div className="flex-none">
        {item.sugerencia ? (
          <button
            type="button"
            onClick={() => vincularA(item.sugerencia.playerId)}
            disabled={loadingVincular}
            className="flex items-center gap-2 whitespace-nowrap border border-tekken-blue-400/40 bg-tekken-blue-400/10 px-4 py-1.5 font-body text-xs font-bold text-tekken-blue-400 transition-colors duration-200 hover:bg-tekken-blue-400/20 disabled:opacity-40"
          >
            {item.sugerencia.score}% {item.sugerencia.name}{" "}
            <span className="opacity-70">· ACEPTAR</span>
          </button>
        ) : (
          <span className="inline-flex whitespace-nowrap border border-dashed border-white/[.18] px-3.5 py-1.5 font-body text-xs text-white/40">
            SIN COINCIDENCIA
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 basis-[330px]">
        <div className="min-w-[150px] flex-1">
          <BuscadorJugador
            selected={jugadorSeleccionado}
            onSelect={setJugadorSeleccionado}
            onClear={() => setJugadorSeleccionado(null)}
          />
        </div>
        <button
          type="button"
          onClick={() => vincularA(jugadorSeleccionado.id)}
          disabled={!jugadorSeleccionado || loadingVincular}
          className="h-10 whitespace-nowrap bg-primary-500 px-4 font-display text-sm tracking-[0.08em] text-white hover:brightness-90 disabled:opacity-40"
        >
          {loadingVincular ? "VINCULANDO..." : "VINCULAR"}
        </button>
        <button
          type="button"
          onClick={crearJugador}
          disabled={loadingCrear}
          className="h-10 whitespace-nowrap border border-white/15 bg-white/[.04] px-4 font-display text-sm tracking-[0.08em] text-white hover:bg-white/10 disabled:opacity-40"
        >
          {loadingCrear ? "CREANDO..." : "CREAR NUEVO"}
        </button>
      </div>
    </div>
  );
}
