"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Button from "@/components/ui/Button";

export default function PuntajesConfig() {
  const [puntajes, setPuntajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/puntajes")
      .then((r) => r.json())
      .then((data) => setPuntajes(data.puntajes ?? []))
      .finally(() => setLoading(false));
  }, []);

  const cambiarPuntos = (posicion, puntos) => {
    setPuntajes((prev) =>
      prev.map((p) => (p.posicion === posicion ? { ...p, puntos: Number(puntos) || 0 } : p)),
    );
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const response = await fetch("/api/admin/puntajes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntajes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar");
      toast.success("Puntajes actualizados");
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
    <div className="border border-white/10 bg-white/[.03] p-5">
      <h2 className="m-0 mb-2 font-display text-xl tracking-[0.04em]">
        Configuración de puntajes (Tekken 8)
      </h2>
      <p className="m-0 mb-4 border-l-2 border-primary-500/60 pl-3 text-[13px] leading-[1.5] text-white/60">
        El puntaje otorgado por posición queda desnormalizado en cada resultado histórico: cambiar
        esta configuración <strong>no reescribe</strong> los torneos ya cargados, solo afecta a las
        próximas importaciones.
      </p>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        {puntajes.map((p) => (
          <div key={p.posicion} className="flex items-center gap-3">
            <span className="w-24 font-body text-sm text-white/70">Posición {p.posicion}</span>
            <input
              type="number"
              value={p.puntos}
              onChange={(e) => cambiarPuntos(p.posicion, e.target.value)}
              className="h-10 w-28 border border-white/15 bg-black px-3 font-body text-sm text-white outline-none focus:border-primary-500"
            />
          </div>
        ))}
      </div>

      <Button onClick={guardar} disabled={guardando} className="mt-4 px-6 py-2.5 text-base">
        {guardando ? "GUARDANDO..." : "GUARDAR PUNTAJES"}
      </Button>
    </div>
  );
}
