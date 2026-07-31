"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import BuscadorJugador from "./BuscadorJugador";
import StatusChip from "@/components/ui/StatusChip";

export default function ColaParticipantes({ cola, onResuelto }) {
  if (cola.length === 0) {
    return (
      <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
        No hay participantes pendientes de vincular.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {cola.map((item) => (
        <FilaParticipante key={item.id} item={item} onResuelto={onResuelto} />
      ))}
    </div>
  );
}

function FilaParticipante({ item, onResuelto }) {
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [loadingVincular, setLoadingVincular] = useState(false);
  const [loadingCrear, setLoadingCrear] = useState(false);

  const vincularA = async (playerId) => {
    setLoadingVincular(true);
    try {
      const response = await fetch("/api/admin/identidades/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId: item.id, playerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al vincular");
      toast.success(data.message || "Participante vinculado");
      onResuelto();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingVincular(false);
    }
  };

  const crearJugador = async () => {
    setLoadingCrear(true);
    try {
      const response = await fetch("/api/admin/identidades/crear_jugador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId: item.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al crear el jugador");
      toast.success(data.message || "Jugador creado");
      onResuelto();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingCrear(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3.5 border border-white/10 bg-white/[.03] p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 basis-[210px]">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg italic text-white [overflow-wrap:anywhere]">
            {item.nombre_participante}
          </span>
          {item.ocurrencias_pendientes > 1 && (
            <StatusChip tone="primary">x{item.ocurrencias_pendientes} PENDIENTES</StatusChip>
          )}
        </div>
        <span className="font-body text-xs text-white/50">
          {item.torneo_nombre} · {item.torneo_fecha} · posición {item.posicion} · {item.puntaje}{" "}
          pts
        </span>
      </div>

      <div className="flex-none">
        {item.sugerencia ? (
          <button
            type="button"
            onClick={() => vincularA(item.sugerencia.playerId)}
            disabled={loadingVincular}
            className="flex items-center gap-2 whitespace-nowrap border border-tekken-blue-400/40 bg-tekken-blue-400/10 px-4 py-1.5 font-body text-xs font-bold text-tekken-blue-400 transition-colors duration-200 hover:bg-tekken-blue-400/20 disabled:opacity-40 [clip-path:var(--clip-banner-right)]"
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
