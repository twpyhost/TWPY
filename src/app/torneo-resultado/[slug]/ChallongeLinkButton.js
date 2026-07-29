"use client";

import { useState } from "react";

import ExternalLinkModal from "@/components/ui/ExternalLinkModal";

export default function ChallongeLinkButton({ url }) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2.5 border border-tekken-blue-400/50 bg-tekken-blue-400/[.12] px-7 py-3 font-display italic tracking-[0.06em] text-tekken-blue-400 transition-[background,box-shadow] duration-300 hover:bg-tekken-blue-400/[.22] hover:shadow-glow-cyan"
      >
        <span className="text-lg">VER BRACKET EN CHALLONGE</span>
        <span className="text-base">&#8599;</span>
      </button>
      <ExternalLinkModal open={open} url={url} onClose={() => setOpen(false)} />
    </>
  );
}
