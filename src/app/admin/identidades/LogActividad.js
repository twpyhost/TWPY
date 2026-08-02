"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import StatusChip from "@/components/ui/StatusChip";
import Paginacion from "@/components/admin/Paginacion";
import { ETIQUETAS_EVENTO } from "@/lib/identidadDescripcion";
import { POR_PAGINA_LOG as POR_PAGINA } from "@/lib/paginacion";

export default function LogActividad({ log, onCambio }) {
  const [deshaciendoId, setDeshaciendoId] = useState(null);
  const [pagina, setPagina] = useState(1);

  // La API ya trae hasta 30 eventos: la paginacion es puramente de
  // presentacion (10 por vez), no pide mas datos al servidor. Vuelve a la
  // pagina 1 cada vez que llega un log nuevo (post accion o al montar), asi
  // el evento mas reciente siempre queda a la vista.
  useEffect(() => {
    setPagina(1);
  }, [log]);

  const totalPaginas = Math.max(1, Math.ceil(log.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const visibles = log.slice(inicio, inicio + POR_PAGINA);

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {visibles.map((evento) => (
          <div
            key={evento.id}
            className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/[.03] px-4 py-2.5"
          >
            <div className="flex flex-col gap-1">
              <span className="font-display text-sm tracking-[0.04em] text-white">
                {ETIQUETAS_EVENTO[evento.tipo] || evento.tipo}
              </span>
              {evento.descripcion && (
                <span className="font-body text-[13px] text-white/70">{evento.descripcion}</span>
              )}
              {evento.cuentas?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {evento.cuentas.map((cuenta) => (
                    <StatusChip key={cuenta.challonge_id} tone="cyan">
                      {cuenta.challonge_username || "sin username"} · #{cuenta.challonge_id}
                    </StatusChip>
                  ))}
                </div>
              )}
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

      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={log.length}
        etiqueta="eventos"
        onCambio={setPagina}
      />
    </div>
  );
}
