"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Button from "@/components/ui/Button";

// Fiel al panel "Configuracion de puntajes" del diseno de Admin Dashboard
// (Claude Design), con dos desvios documentados en el plan: la posicion y
// el puntaje son editables por tarjeta (alta/baja incluidas), no solo el
// puntaje. Cambiar esta tabla NO reescribe los torneos ya cargados -- el
// puntaje queda desnormalizado en cada resultado historico -- solo afecta a
// las proximas importaciones (los dos avisos de abajo lo explican).
function nuevaFilaId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pt-${Date.now()}-${Math.random()}`;
}

export default function PuntajesConfig() {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/puntajes")
      .then((r) => r.json())
      .then((data) => {
        setFilas(
          (data.puntajes ?? []).map((p) => ({
            id: nuevaFilaId(),
            posicion: p.posicion,
            puntos: p.puntos,
          })),
        );
      })
      .catch(() => toast.error("No se pudieron cargar los puntajes"))
      .finally(() => setLoading(false));
  }, []);

  const cambiarCampo = (id, campo, valor) => {
    const n = Math.max(campo === "posicion" ? 1 : 0, parseInt(valor, 10) || 0);
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: n } : f)));
    setDirty(true);
  };

  const agregarFila = () => {
    setFilas((prev) => {
      const maxPos = prev.reduce((m, f) => Math.max(m, f.posicion), 0);
      return [...prev, { id: nuevaFilaId(), posicion: maxPos + 1, puntos: 0 }];
    });
    setDirty(true);
  };

  const quitarFila = (id) => {
    setFilas((prev) => prev.filter((f) => f.id !== id));
    setDirty(true);
  };

  const guardar = async () => {
    const payload = filas
      .map((f) => ({ posicion: f.posicion, puntos: f.puntos }))
      .sort((a, b) => a.posicion - b.posicion);

    const posiciones = new Set(payload.map((f) => f.posicion));
    if (posiciones.size !== payload.length) {
      toast.error("Hay posiciones repetidas");
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch("/api/admin/puntajes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntajes: payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar");

      setFilas(payload.map((f) => ({ id: nuevaFilaId(), ...f })));
      setDirty(false);
      toast.success("Puntajes guardados · aplican a las próximas importaciones");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <p className="font-body text-sm text-white/50">Cargando...</p>;
  }

  return (
    <div className="flex flex-col gap-4 border border-white/10 border-t-2 border-t-primary-500 bg-dark-gray-3-500 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-2xl tracking-[0.03em]">
            Configuración de puntajes · Tekken 8
          </h2>
          <span className="text-xs text-white/50">
            Elegí cuántas posiciones puntúan y cuánto vale cada una
          </span>
        </div>
        {dirty && (
          <span className="flex items-center gap-[7px] text-[11px] font-bold tracking-[0.06em] text-warning">
            <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-warning" />
            CAMBIOS SIN GUARDAR
          </span>
        )}
      </div>

      <div className="flex gap-2.5 border-l-[3px] border-tekken-blue-500 bg-tekken-blue-500/[.08] px-4 py-3.5">
        <span className="text-[13px] leading-[1.55] text-white/[.82]">
          El puntaje otorgado por posición queda desnormalizado en cada resultado histórico:
          cambiar esta configuración <strong>no reescribe</strong> los torneos ya cargados, solo
          afecta a las próximas importaciones.
        </span>
      </div>

      <div className="flex gap-2.5 border-l-[3px] border-primary-500 bg-primary-500/[.08] px-4 py-3.5">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="rgb(var(--color-primary-400))"
          strokeWidth="1.8"
          className="mt-0.5 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        <span className="text-[13px] leading-[1.55] text-white/[.82]">
          Esta tabla de puntos <strong>solo entra en vigencia al tocar “Guardar puntajes”</strong>:
          hasta ese momento, cualquier torneo que se importe sigue usando la última configuración
          guardada.
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
        {filas.map((fila, i) => (
          <div
            key={fila.id}
            style={{ animationDelay: `${i * 0.04}s` }}
            className="relative flex animate-card-in flex-col gap-2.5 border border-white/10 bg-black p-4 transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-primary-500"
          >
            {filas.length > 1 && (
              <button
                type="button"
                onClick={() => quitarFila(fila.id)}
                aria-label="Quitar posición"
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/[.08] text-sm leading-none text-white/50 transition-colors duration-200 hover:bg-error hover:text-white"
              >
                ×
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <span className="font-display text-[13px] tracking-[0.08em] text-white/45">
                POS.
              </span>
              <input
                type="number"
                min={1}
                value={fila.posicion}
                onChange={(e) => cambiarCampo(fila.id, "posicion", e.target.value)}
                className="h-8 w-14 border border-white/[.16] bg-white/[.05] text-center font-display text-lg text-white outline-none transition-colors duration-200 focus:border-tekken-blue-500"
              />
            </div>

            <label className="flex flex-col gap-[5px]">
              <span className="text-[10px] tracking-[0.1em] text-white/40">PUNTOS</span>
              <input
                type="number"
                min={0}
                value={fila.puntos}
                onChange={(e) => cambiarCampo(fila.id, "puntos", e.target.value)}
                className="h-10 border border-white/[.16] bg-white/[.05] px-3 text-[17px] font-bold text-white outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/[.18]"
              />
            </label>
          </div>
        ))}

        <button
          type="button"
          onClick={agregarFila}
          className="flex min-h-[114px] flex-col items-center justify-center gap-1.5 border border-dashed border-white/25 text-white/50 transition-colors duration-200 hover:border-primary-500 hover:bg-primary-500/[.06] hover:text-primary-300"
        >
          <span className="text-[26px] leading-none">+</span>
          <span className="text-[11px] font-bold tracking-[0.06em]">AGREGAR POSICIÓN</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3.5 pt-0.5">
        <Button onClick={guardar} disabled={guardando} className="px-6 py-2.5 text-base">
          {guardando ? "GUARDANDO..." : "GUARDAR PUNTAJES"}
        </Button>
      </div>
    </div>
  );
}
