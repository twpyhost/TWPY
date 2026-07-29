"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import BuscadorJugador from "./BuscadorJugador";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Fusion asimetrica (design/README.md): el jugador "base" se mantiene, el
// "duplicado" se absorbe y desaparece de las paginas publicas.
export default function FusionarJugadores({ onFusionado }) {
  const [base, setBase] = useState(null);
  const [duplicado, setDuplicado] = useState(null);
  const [detalleBase, setDetalleBase] = useState(null);
  const [detalleDuplicado, setDetalleDuplicado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!base) {
      setDetalleBase(null);
      return;
    }
    fetch(`/api/admin/identidades/jugadores/${base.id}/detalle`)
      .then((r) => r.json())
      .then((data) => setDetalleBase(data.jugador ?? null))
      .catch(() => setDetalleBase(null));
  }, [base]);

  useEffect(() => {
    if (!duplicado) {
      setDetalleDuplicado(null);
      return;
    }
    fetch(`/api/admin/identidades/jugadores/${duplicado.id}/detalle`)
      .then((r) => r.json())
      .then((data) => setDetalleDuplicado(data.jugador ?? null))
      .catch(() => setDetalleDuplicado(null));
  }, [duplicado]);

  const confirmarFusion = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/identidades/fusionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePlayerId: base.id, duplicatePlayerId: duplicado.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al fusionar");
      }

      toast.success(data.message || "Jugadores fusionados");
      if (data.advertencia) {
        toast.error(data.advertencia);
      }
      if (data.conflictos?.length > 0) {
        toast.error(
          `${data.conflictos.length} torneo(s) no se pudieron reasignar porque ambos jugadores ya tenian resultado propio: revisalos a mano.`,
        );
      }

      setModalAbierto(false);
      setBase(null);
      setDuplicado(null);
      onFusionado();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const puedeFusionar = base && duplicado && base.id !== duplicado.id;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BuscadorJugador
          label="Jugador base (se mantiene)"
          selected={base}
          onSelect={setBase}
          onClear={() => setBase(null)}
        />
        <BuscadorJugador
          label="Jugador duplicado (se fusiona)"
          selected={duplicado}
          onSelect={setDuplicado}
          onClear={() => setDuplicado(null)}
        />
      </div>

      {(detalleBase || detalleDuplicado) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TarjetaJugador titulo="BASE" detalle={detalleBase} />
          <TarjetaJugador titulo="DUPLICADO" detalle={detalleDuplicado} />
        </div>
      )}

      <button
        type="button"
        disabled={!puedeFusionar}
        onClick={() => setModalAbierto(true)}
        className="w-fit bg-primary-500 px-5 py-2.5 font-display text-sm tracking-[0.1em] text-white hover:brightness-90 disabled:opacity-40"
      >
        CONFIRMAR FUSIÓN
      </button>

      <ConfirmModal
        open={modalAbierto}
        title="¿Fusionar estos jugadores?"
        body={
          <>
            Todo el historial de{" "}
            <strong className="text-white">{duplicado?.display_name}</strong> pasa a{" "}
            <strong className="text-white">{base?.display_name}</strong>. Esta acción no se
            puede deshacer.
          </>
        }
        warningText="Se reasignan cuentas de Challonge y resultados historicos. Los torneos donde ambos jugadores ya tengan resultado propio quedan como conflicto para revisar a mano."
        requireUnderstandCheckbox
        confirmLabel="FUSIONAR"
        loading={loading}
        onConfirm={confirmarFusion}
        onClose={() => setModalAbierto(false)}
      />
    </div>
  );
}

function TarjetaJugador({ titulo, detalle }) {
  if (!detalle) {
    return (
      <div className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/40">
        {titulo}: seleccioná un jugador
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-white/[.03] p-4">
      <span className="font-display text-xs tracking-[0.14em] text-white/40">{titulo}</span>
      <p className="m-0 mt-1 font-display text-xl italic text-white">{detalle.display_name}</p>
      <div className="mt-2 flex flex-wrap gap-3 font-body text-xs text-white/60">
        <span>{detalle.torneos_jugados} torneos</span>
        <span>{detalle.puntaje_total} pts</span>
        {detalle.posicion_actual && <span>#{detalle.posicion_actual} ranking</span>}
      </div>
      {detalle.cuentas?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detalle.cuentas.map((cuenta) => (
            <span
              key={cuenta.challonge_id}
              className={`border px-2 py-0.5 font-display text-[11px] tracking-[0.06em] ${
                cuenta.active
                  ? "border-primary-500/60 bg-primary-500/10 text-primary-500"
                  : "border-white/15 text-white/50"
              }`}
            >
              {cuenta.challonge_username}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
