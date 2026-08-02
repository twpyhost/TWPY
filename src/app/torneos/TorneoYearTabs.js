"use client";

import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

// Mismos pills que antes (Todos + un pill por temporada, mismas clases), pero
// ahora interceptan el click para navegar dentro de una transicion: el pill
// activo se mueve en el frame del click en vez de esperar la navegacion
// bufereada del router (mismo patron que SeasonTabs en /ranking). Se
// mantienen como <a> (no <button>) para que las afordancias del navegador
// (abrir en pestana nueva, click derecho, ctrl/cmd-click) sigan funcionando.
export default function TorneoYearTabs({ anos }) {
  const { navigate, valorMostrado: selectedYear } = useSearchParamTransition();

  function manejarClick(event, href, year) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(href, year);
  }

  const pillClass = (isActive) =>
    `border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
      isActive
        ? "border-primary-500 bg-primary-500 text-white"
        : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
    }`;

  return (
    <div className="flex flex-wrap animate-fade-up gap-2 [animation-delay:.08s]">
      <a
        href="/torneos"
        onClick={(event) => manejarClick(event, "/torneos", "all")}
        className={pillClass(selectedYear === "all")}
      >
        Todos
      </a>
      {anos.map((year) => {
        const href = `/torneos?year=${year}`;
        return (
          <a
            key={year}
            href={href}
            onClick={(event) => manejarClick(event, href, year)}
            className={pillClass(selectedYear === year)}
          >
            {year}
          </a>
        );
      })}
    </div>
  );
}
