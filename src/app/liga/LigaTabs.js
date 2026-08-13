"use client";

import { useState } from "react";

// Alterna entre las dos vistas de la liga. El estado es local a proposito: a
// diferencia de SeasonTabs/TorneoYearTabs -- que navegan por ?year= porque el
// servidor tiene que traer otra temporada -- aca getLiga() ya devolvio grupos y
// fechas en la misma llamada, asi que meter la vista en la URL solo agregaria
// un round-trip y volveria dinamica una pagina que hoy se cachea con
// revalidate=60.
//
// `grupos` y `calendario` llegan como elementos ya renderizados: asi
// TablasGrupos y CalendarioLiga siguen siendo server components: un padre
// servidor puede pasarle elementos a un hijo cliente sin arrastrar todo el
// arbol al bundle.
const TABS = [
  { id: "grupos", label: "GRUPOS" },
  { id: "calendario", label: "CALENDARIO" },
];

export default function LigaTabs({ grupos, calendario }) {
  const [activa, setActiva] = useState("grupos");
  const activeIndex = Math.max(
    TABS.findIndex((tab) => tab.id === activa),
    0,
  );

  return (
    <section className="bg-black px-5 pb-24 pt-10 sm:px-8 lg:px-14">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        {/* Mismo lenguaje visual que el selector de temporadas de /ranking:
            pill track con indicador deslizante recortado en diagonal. */}
        {/* El mismo delay que usa TorneoYearTabs, para que el track entre
            escalonado detras del hero en vez de aparecer de golpe. */}
        <div
          role="tablist"
          aria-label="Vistas de la liga"
          className="relative flex w-full max-w-[340px] animate-fade-up self-start border border-white/[.14] bg-white/[.05] p-[3px] [animation-delay:.08s]"
        >
          <div
            aria-hidden="true"
            className="absolute bottom-[3px] top-[3px] bg-primary-500 shadow-glow-primary transition-transform duration-500 ease-[cubic-bezier(.16,.84,.24,1)] [clip-path:polygon(5%_0,100%_0,95%_100%,0_100%)]"
            style={{
              left: "3px",
              width: `calc((100% - 6px) / ${TABS.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
          {TABS.map((tab) => {
            const isActive = tab.id === activa;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiva(tab.id)}
                className="relative z-[2] flex flex-1 items-center justify-center px-1.5 py-2.5"
              >
                <span
                  className={`font-display text-lg italic leading-none tracking-[.06em] transition-colors duration-300 ${
                    isActive
                      ? "text-white [text-shadow:0_0_16px_rgba(245,10,100,.6)]"
                      : "text-white/55"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Los dos paneles quedan siempre en el DOM (el oculto con `hidden`)
            para no perderlos del HTML servido. `animate-fade-up` es
            permanente: al pasar de display:none a visible el navegador
            reinicia la animacion CSS, asi que la entrada se re-dispara sola en
            cada cambio de pestana.
            OJO: no agregar utilidades de display (flex/grid) a estos divs --
            le ganarian al display:none del atributo `hidden` y el panel
            inactivo quedaria visible. El grid va adentro de cada hijo. */}
        <div
          role="tabpanel"
          id="panel-grupos"
          aria-labelledby="tab-grupos"
          hidden={activa !== "grupos"}
          className="animate-fade-up"
        >
          {grupos}
        </div>
        <div
          role="tabpanel"
          id="panel-calendario"
          aria-labelledby="tab-calendario"
          hidden={activa !== "calendario"}
          className="animate-fade-up"
        >
          {calendario}
        </div>
      </div>
    </section>
  );
}
