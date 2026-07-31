"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const ETIQUETAS = {
  vincular: "Vinculación",
  crear_jugador: "Jugador creado",
  registrar_manual: "Registro manual",
  fusionar: "Fusión",
  deshacer: "Deshecho",
  editar_jugador: "Perfil editado",
  cambiar_cuenta_activa: "Cuenta activa cambiada",
  eliminar_cuenta_challonge: "Cuenta desvinculada",
};

export default function LogActividad({ log, onCambio }) {
  const [deshaciendoId, setDeshaciendoId] = useState(null);

  const deshacer = async (eventoId) => {
    setDeshaciendoId(eventoId);
    try {
      const response = await fetch("/api/admin/identidades/deshacer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventoId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al deshacer");
      }
      toast.success(data.message || "Acción deshecha");
      onCambio();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeshaciendoId(null);
    }
  };

  if (log.length === 0) {
    return (
      <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
        Todavía no hay actividad registrada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {log.map((evento) => (
        <div
          key={evento.id}
          className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/[.03] px-4 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-sm tracking-[0.04em] text-white">
              {ETIQUETAS[evento.tipo] || evento.tipo}
            </span>
            <span className="font-body text-xs text-white/45">
              {evento.actor_email || "admin"} ·{" "}
              {new Date(evento.created_at).toLocaleString("es-PY")}
            </span>
          </div>
          {evento.deshacer_disponible && (
            <button
              type="button"
              onClick={() => deshacer(evento.id)}
              disabled={deshaciendoId === evento.id}
              className="font-display text-xs tracking-[0.1em] text-white/60 hover:text-primary-500 disabled:opacity-40"
            >
              {deshaciendoId === evento.id ? "DESHACIENDO..." : "DESHACER"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
