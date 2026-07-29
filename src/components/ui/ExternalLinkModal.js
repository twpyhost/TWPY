"use client";

import { useEffect, useState } from "react";

import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ExternalLinkModal({ open, url, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) {
      setMounted(false);
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
        className="relative flex w-full max-w-[520px] flex-col gap-4 border border-tekken-blue-400/35 bg-gradient-to-br from-[#142c38]/[.98] via-[#0a1418]/[.98] to-[#040c12]/[.99] p-5 shadow-[0_24px_60px_rgba(0,0,0,.6)] sm:p-8"
      >
        <RibbonTag className="w-fit">AVISO</RibbonTag>
        <h2 className="m-0 font-display text-[clamp(28px,7vw,42px)] italic leading-[.95] tracking-[0.01em]">
          ESTÁS SALIENDO DEL SITIO
        </h2>
        <p className="m-0 text-[clamp(14px,3.6vw,15.5px)] leading-[1.6] text-white/80">
          Vas a ser redirigido a{" "}
          <strong className="text-tekken-blue-400">{getHostname(url)}</strong>, un sitio web
          externo sin vínculo ni administración de Tekken Warriors Paraguay. No controlamos su
          contenido, sus datos ni su disponibilidad.
        </p>
        <div className="[overflow-wrap:anywhere] border-l-2 border-white/[.16] pl-3 text-[clamp(11px,3vw,12.5px)] tracking-[0.06em] text-white/45">
          {url}
        </div>
        <div className="mt-1 flex flex-wrap gap-2.5">
          <Button
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="px-6 py-3 text-base"
          >
            CONTINUAR <span>&#8599;</span>
          </Button>
          <Button variant="outline" onClick={onClose} className="px-6 py-3 text-base">
            CANCELAR
          </Button>
        </div>
      </div>
    </div>
  );
}
