import { Fragment } from "react";

import RibbonTag from "@/components/ui/RibbonTag";

// Arma, por fecha, los grupos que juegan ese dia con sus peleas y quien
// descansa (el participante del grupo que no aparece en ninguna pelea de
// esa fecha -- no hay tabla de descansos, se deriva, ver plan/spec).
function armarCalendario(fechas, grupos) {
  return fechas.map((fecha) => {
    const bloques = grupos
      .map((grupo) => {
        const partidos = grupo.partidos
          .filter((p) => p.fechaNumero === fecha.numero)
          .sort((a, b) => a.orden - b.orden);
        if (partidos.length === 0) return null;

        const jugaron = new Set(partidos.flatMap((p) => [p.participanteAId, p.participanteBId]));
        const descansa = grupo.participantes.find((p) => !jugaron.has(p.id));

        return {
          grupoNumero: grupo.numero,
          grupoNombre: grupo.nombre,
          partidos,
          descansaNombre: descansa?.nombre ?? null,
        };
      })
      .filter(Boolean);

    return { ...fecha, bloques };
  });
}

export default function CalendarioLiga({ fechas, grupos }) {
  const calendario = armarCalendario(fechas, grupos);

  return (
    <section className="bg-black px-5 pb-24 pt-2 sm:px-8 lg:px-14">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        <RibbonTag className="w-fit">CALENDARIO</RibbonTag>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {calendario.map((fecha) => (
            <div key={fecha.id} className="flex flex-col gap-3 border border-white/10 bg-white/[.03] p-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-xl italic text-white">
                  FECHA {fecha.numero}
                </span>
                <span className="font-body text-xs text-white/50">
                  {fecha.fecha} · {fecha.hora}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {fecha.bloques.map((bloque) => (
                  <div key={bloque.grupoNumero} className="flex flex-col gap-1.5">
                    <span className="font-display text-xs tracking-[0.1em] text-primary-500">
                      {bloque.grupoNombre.toUpperCase()}
                    </span>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1 font-body text-sm">
                      {bloque.partidos.map((partido) => (
                        <Fragment key={partido.id}>
                          <span
                            className={`truncate text-right ${
                              partido.ganadorId === partido.participanteAId
                                ? "font-bold text-success"
                                : "text-white/70"
                            }`}
                          >
                            {partido.nombreA}
                          </span>
                          <span className="flex items-center justify-center whitespace-nowrap font-display text-[10px] tracking-[0.08em] text-white/30">
                            {partido.ganadorId == null ? "PENDIENTE" : "VS"}
                          </span>
                          <span
                            className={`truncate text-left ${
                              partido.ganadorId === partido.participanteBId
                                ? "font-bold text-success"
                                : "text-white/70"
                            }`}
                          >
                            {partido.nombreB}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                    {bloque.descansaNombre && (
                      <span className="font-body text-xs italic text-white/40">
                        Descansa: {bloque.descansaNombre}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
