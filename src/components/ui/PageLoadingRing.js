"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import twpyLogo from "../../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

const ASSETS = [
  "ranking.json",
  "fixture.json",
  "competidores.json",
  "torneos.json",
  "media.cdn",
];

const TIPS = [
  "Doble eliminación: una derrota en Winners no te saca del torneo.",
  "Sets de grupos al mejor de 3; finales al mejor de 5.",
  "Confirmá tu asistencia antes del cierre de inscripciones.",
  "Revisá tu seed en el fixture antes de que arranque la ronda.",
  "Los rankings se recalculan apenas se cierra cada torneo.",
];

const PROGRESS_CEILING = 92;
const TICK_MS = 70;
const TARGET_MS = 2200;
const STEP = 100 / (TARGET_MS / TICK_MS);

const FADE_OUT_START = 80;
const FADE_OUT_FLOOR = 0.4;

function statusFor(p) {
  if (p < 20) return "CONECTANDO";
  if (p < 52) return "DESCARGANDO";
  if (p < 84) return "SINCRONIZANDO";
  return "CASI LISTO";
}

function fadeOpacity(p, mounted) {
  if (!mounted) return 0;
  if (p <= FADE_OUT_START) return 1;
  const t = Math.min(
    1,
    (p - FADE_OUT_START) / (PROGRESS_CEILING - FADE_OUT_START),
  );
  return 1 - t * (1 - FADE_OUT_FLOOR);
}

export default function PageLoadingRing() {
  const [p, setP] = useState(8);
  const [assetIndex, setAssetIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setP((prev) => {
        if (prev >= PROGRESS_CEILING) return prev;
        const slow = prev > 84 ? 0.35 : prev > 58 ? 0.75 : 1.35;
        const jitter = 0.4 + Math.random() * 1.4;
        const next = Math.min(PROGRESS_CEILING, prev + STEP * slow * jitter);
        if (next >= PROGRESS_CEILING) clearInterval(progressTimer);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(progressTimer);
  }, []);

  useEffect(() => {
    const assetTimer = setInterval(() => {
      setAssetIndex((i) => (i + 1) % ASSETS.length);
    }, 620);
    return () => clearInterval(assetTimer);
  }, []);

  const pct = Math.floor(p);

  return (
    <div
      className="flex min-h-[70dvh] flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_45%,rgba(12,35,44,.94)_0%,rgba(3,9,13,.97)_70%)] transition-opacity duration-300 ease-out"
      style={{ opacity: fadeOpacity(p, mounted) }}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative flex h-[clamp(120px,15vw,168px)] w-[clamp(120px,15vw,168px)] items-center justify-center">
          <div className="absolute -inset-3.5 animate-ring-pulse rounded-full bg-[radial-gradient(circle,rgba(245,10,100,.35)_0%,transparent_68%)] blur-[12px]" />
          <div className="absolute inset-0 animate-ring-spin rounded-full border border-primary-500/30 border-t-primary-500" />
          <div className="absolute inset-3 animate-ring-spin-rev rounded-full border border-dashed border-tekken-blue-400/30" />
          <Image
            src={twpyLogo}
            alt=""
            sizes="168px"
            className="relative h-auto w-[62%] drop-shadow-[0_0_18px_rgba(245,10,100,.65)]"
          />
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="h-[7px] w-[7px] animate-dot-blink bg-primary-500" />
            <span className="animate-text-glitch font-display text-[clamp(20px,2.6vw,30px)] tracking-[0.26em] text-white">
              {statusFor(p)}
            </span>
            <span className="h-[7px] w-[7px] animate-dot-blink bg-tekken-blue-400 [animation-delay:.5s]" />
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">
            GET /{ASSETS[assetIndex]}
          </span>
        </div>

        <div className="flex w-[min(460px,72vw)] flex-col gap-2.5">
          <div className="relative h-3 overflow-hidden border border-white/[.14] bg-white/[.07] [clip-path:polygon(10px_0,100%_0,calc(100%_-_10px)_100%,0_100%)]">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 via-primary-500 to-tekken-blue-400"
              style={{ width: `${p}%` }}
            />
            <div className="pointer-events-none absolute inset-0 w-[26%] animate-bar-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </div>
          <div className="flex items-center justify-between font-display text-sm tracking-[0.16em] text-white/55">
            <span>Cargando…</span>
            <span className="text-xl tabular-nums text-primary-500">
              {pct}%
            </span>
          </div>
        </div>

        <div className="flex max-w-[min(600px,84vw)] items-stretch">
          {/* Not RibbonTag: needs --clip-banner-right + items-stretch, RibbonTag hardcodes --clip-banner-both + self-start. */}
          <span className="flex flex-shrink-0 items-center bg-primary-500 px-5 py-1.5 font-display text-sm tracking-[0.24em] text-white [clip-path:var(--clip-banner-right)]">
            TIP
          </span>
          <span className="border border-l-0 border-white/10 bg-white/[.05] px-4 py-1.5 text-left text-[13.5px] leading-[1.45] text-white/80">
            {tip}
          </span>
        </div>
      </div>
    </div>
  );
}
