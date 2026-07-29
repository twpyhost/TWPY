"use client";

import { useEffect, useState } from "react";

import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

// Generaliza la mecanica de ExternalLinkModal (open/onClose, Escape,
// backdrop-click, role="dialog") para acciones destructivas de admin
// (fusionar jugadores, recalcular rankings): el boton de confirmar queda
// deshabilitado hasta marcar el checkbox de "entiendo" cuando se pide.
export default function ConfirmModal({
  open,
  title,
  body,
  warningText,
  requireUnderstandCheckbox = false,
  confirmLabel = "CONFIRMAR",
  loading = false,
  onConfirm,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);
  const [entendido, setEntendido] = useState(false);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      setEntendido(false);
      return;
    }
    setMounted(true);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const puedeConfirmar = !requireUnderstandCheckbox || entendido;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/[.78] p-4 backdrop-blur-sm transition-opacity duration-200 ease-out sm:p-10"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-[560px] flex-col gap-4 border border-primary-500/35 bg-gradient-to-br from-[#2a0a12]/[.98] via-[#0a0a0a]/[.98] to-[#040404]/[.99] p-5 shadow-[0_24px_60px_rgba(0,0,0,.6)] sm:p-8"
      >
        <RibbonTag className="w-fit">ACCIÓN IRREVERSIBLE</RibbonTag>
        <h2 className="m-0 font-display text-[clamp(26px,6vw,38px)] italic leading-[.95] tracking-[0.01em]">
          {title}
        </h2>
        {body && (
          <div className="text-[clamp(14px,3.6vw,15.5px)] leading-[1.6] text-white/80">
            {body}
          </div>
        )}
        {warningText && (
          <p className="m-0 border-l-2 border-primary-500/60 pl-3 text-[13px] leading-[1.5] text-white/70">
            {warningText}
          </p>
        )}
        {requireUnderstandCheckbox && (
          <label className="flex items-start gap-2.5 text-sm text-white/80">
            <input
              type="checkbox"
              checked={entendido}
              onChange={(e) => setEntendido(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            Entiendo que esto reasigna el historial completo y no se puede deshacer.
          </label>
        )}
        <div className="mt-1 flex flex-wrap gap-2.5">
          <Button
            onClick={onConfirm}
            disabled={!puedeConfirmar || loading}
            className={`px-6 py-3 text-base ${
              !puedeConfirmar || loading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {loading ? "PROCESANDO..." : confirmLabel}
          </Button>
          <Button variant="outline" onClick={onClose} className="px-6 py-3 text-base">
            CANCELAR
          </Button>
        </div>
      </div>
    </div>
  );
}
