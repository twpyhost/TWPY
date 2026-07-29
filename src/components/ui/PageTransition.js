"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Timings/easings mirror the "Crossfade" variant of the Transicion de Carga
// design: old content eases out fast, new content eases in slower on a
// decelerating curve.
const OUT_MS = 300;
const IN_MS = 460;
const EASE_IN = "cubic-bezier(.5,0,.9,.4)";
const EASE_OUT = "cubic-bezier(.16,.84,.24,1)";

// phase: "idle" | "out" | "in"
function phaseStyle(phase) {
  if (phase === "out") {
    return { opacity: 0, transition: `opacity ${OUT_MS}ms ${EASE_IN}` };
  }
  if (phase === "in") {
    return { opacity: 1, transition: `opacity ${IN_MS}ms ${EASE_OUT}` };
  }
  return { opacity: 1 };
}

// Fades the outgoing page out before navigating, then fades the incoming one
// in. The exit half has to intercept the click and delay router.push: the
// layout's `children` is a live element that re-renders to whatever the router
// currently shows, so it cannot be snapshotted and held on screen. Without the
// delay there is nothing left to fade out — the loading fallback has already
// replaced the old page by the time any effect runs.
export default function PageTransition({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState("idle");
  const firstRender = useRef(true);
  const timers = useRef([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const onClick = (e) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const anchor = e.target.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;

      let url;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      // External links, in-page anchors and same-route links keep the
      // browser's default behaviour.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      // Home is entered with no animation.
      if (url.pathname === "/") return;

      e.preventDefault();
      clear();
      setPhase("out");
      timers.current.push(
        setTimeout(() => router.push(url.pathname + url.search), OUT_MS),
      );
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clear();
    };
  }, [router]);

  // Navigation committed: fade whatever the router now shows back in.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (pathname === "/") {
      setPhase("idle");
      return;
    }

    setPhase("in");
    const timer = setTimeout(() => setPhase("idle"), IN_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="flex flex-1 flex-col" style={phaseStyle(phase)}>
      {children}
    </div>
  );
}
