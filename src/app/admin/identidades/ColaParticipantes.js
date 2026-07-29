"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import BuscadorJugador from "./BuscadorJugador";

export default function ColaParticipantes({ cola, onResuelto }) {
  const [expandidoId, setExpandidoId] = useState(null);

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
        <FilaParticipante
          key={item.id}
          item={item}
          expandido={expandidoId === item.id}
          onToggle={() => setExpandidoId(expandidoId === item.id ? null : item.id)}
          onResuelto={onResuelto}
        />
      ))}
    </div>
  );
}

function FilaParticipante({ item, expandido, onToggle, onResuelto }) {
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [loadingVincular, setLoadingVincular] = useState(false);
  const [loadingCrear, setLoadingCrear] = useState(false);

  const vincular = async () => {
    if (!jugadorSeleccionado) return;
    setLoadingVincular(true);
    try {
      const response = await fetch("/api/admin/identidades/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participanteId: item.id,
          playerId: jugadorSeleccionado.id,
        }),
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
    <div className="border border-white/10 bg-white/[.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg italic text-white">
              {item.nombre_participante}
            </span>
            {item.ocurrencias_pendientes > 1 && (
              <span className="border border-primary-500/50 bg-primary-500/10 px-2 py-0.5 font-display text-[11px] tracking-[0.08em] text-primary-500">
                x{item.ocurrencias_pendientes} PENDIENTES
              </span>
            )}
          </div>
          <span className="font-body text-xs text-white/50">
            {item.torneo_nombre} · {item.torneo_fecha} · posición {item.posicion} ·{" "}
            {item.puntaje} pts
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="font-display text-xs tracking-[0.1em] text-white/60 hover:text-primary-500"
        >
          {expandido ? "CERRAR" : "RESOLVER"}
        </button>
      </div>

      {expandido && (
        <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <BuscadorJugador
              label="Vincular a jugador existente"
              selected={jugadorSeleccionado}
              onSelect={setJugadorSeleccionado}
              onClear={() => setJugadorSeleccionado(null)}
            />
          </div>
          <button
            type="button"
            onClick={vincular}
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
            {loadingCrear ? "CREANDO..." : "CREAR JUGADOR NUEVO"}
          </button>
        </div>
      )}
    </div>
  );
}
