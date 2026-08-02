"use client";

import { useState } from "react";

import ExternalLinkModal from "@/components/ui/ExternalLinkModal";

// Boton compartido entre la pagina publica de resultados y el admin. No
// navega directo: pasa por el interstitial de salida del sitio, igual que el
// resto de los links externos. Si el torneo no tiene url (historicos de la
// cuenta B, que se importaron sin ella) no renderiza nada.
export default function ChallongeLinkButton({
  url,
  className = "px-7 py-3",
  textoClassName = "text-lg",
}) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2.5 border border-tekken-blue-400/50 bg-tekken-blue-400/[.12] font-display italic tracking-[0.06em] text-tekken-blue-400 transition-[background,box-shadow] duration-300 hover:bg-tekken-blue-400/[.22] hover:shadow-glow-cyan ${className}`}
      >
        <span className={textoClassName}>VER BRACKET EN CHALLONGE</span>
        <span className="text-base">&#8599;</span>
      </button>
      <ExternalLinkModal open={open} url={url} onClose={() => setOpen(false)} />
    </>
  );
}
