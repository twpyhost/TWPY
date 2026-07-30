"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

const CUENTAS = [
  { value: "B", label: "B · Actual" },
  { value: "A", label: "A · Histórica" },
];

// Porta el flujo de 2 pasos que ya existia en admin/cargar_torneo (previsualizar
// + insertar) a un modal, agregando el selector de cuenta de origen.
export default function ImportarTorneoModal({ open, onClose, onImportado }) {
  const [cuenta, setCuenta] = useState("B");
  const [url, setUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingInsert, setLoadingInsert] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setPreview(null);
      setCuenta("B");
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleBuscar = async (e) => {
    e.preventDefault();
    setLoadingPreview(true);
    setPreview(null);

    try {
      const response = await fetch("/api/previsualizar_torneo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, cuenta }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo previsualizar el torneo");

      setPreview(data.data.tournament);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmar = async () => {
    setLoadingInsert(true);

    try {
      const response = await fetch("/api/admin/insertar_torneo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, cuenta }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo importar el torneo");

      toast.success(data.message || "Torneo importado");
      onImportado?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingInsert(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/[.78] p-4 backdrop-blur-sm sm:p-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-[560px] flex-col gap-4 border border-white/15 bg-[#0a0a0a] p-5 shadow-[0_24px_60px_rgba(0,0,0,.6)] sm:p-8"
      >
        <RibbonTag variant="cyan" className="w-fit">
          IMPORTAR TORNEO HISTÓRICO
        </RibbonTag>

        <form onSubmit={handleBuscar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm tracking-[0.06em] text-white/70">
              CUENTA DE ORIGEN
            </span>
            <div className="flex gap-2">
              {CUENTAS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCuenta(c.value)}
                  className={`flex-1 border px-3 py-2 font-display text-sm tracking-[0.04em] transition-colors duration-200 ${
                    cuenta === c.value
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm tracking-[0.06em] text-white/70">
              URL DEL TORNEO
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://challonge.com/abcdefgh"
              className="h-11 border border-white/15 bg-black px-3 font-body text-sm text-white outline-none focus:border-primary-500"
            />
          </label>

          <Button type="submit" variant="outline" disabled={loadingPreview} className="px-5 py-2.5 text-base">
            {loadingPreview ? "BUSCANDO..." : "BUSCAR"}
          </Button>
        </form>

        {preview && (
          <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3 text-sm text-white/80">
            <span className="font-display text-lg italic text-white">{preview.name}</span>
            <span>Juego: {preview.game_name}</span>
            <span>Participantes: {preview.participants_count}</span>
            <span>Estado: {preview.state}</span>
          </div>
        )}

        <div className="mt-1 flex flex-wrap gap-2.5">
          {preview && (
            <Button onClick={handleConfirmar} disabled={loadingInsert} className="px-6 py-3 text-base">
              {loadingInsert ? "IMPORTANDO..." : "CONFIRMAR IMPORTACIÓN"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="px-6 py-3 text-base">
            CANCELAR
          </Button>
        </div>
      </div>
    </div>
  );
}
