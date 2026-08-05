import RibbonTag from "@/components/ui/RibbonTag";

// Nota: el diseno del handoff linkea el nombre del jugador a su perfil
// (/competidores/[id]) cuando hay player_id, pero esa pagina de detalle
// todavia no existe en el sitio (competidores/ es solo un board, sin
// rutas dinamicas) -- se muestra el nombre en texto plano para no armar
// un link roto; conectarlo cuando exista /competidores/[id].
export default function TablasGrupos({ grupos }) {
  return (
    <section className="bg-black px-5 pb-16 pt-10 sm:px-8 lg:px-14">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <RibbonTag className="w-fit">TABLAS DE POSICIONES</RibbonTag>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {grupos.map((grupo) => (
            <TablaGrupo key={grupo.id} grupo={grupo} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TablaGrupo({ grupo }) {
  const total = grupo.tabla.length;
  const hayDesempateManual = grupo.participantes.some((p) => p.ordenDesempate != null);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl italic text-white">{grupo.nombre}</span>
        {grupo.cerrado && (
          <span className="font-body text-xs tracking-[0.08em] text-white/40">CERRADO</span>
        )}
      </div>
      <div className="overflow-x-auto border border-white/10 bg-dark-gray-3-700">
        <table className="w-full min-w-[380px] border-collapse">
          <thead>
            <tr className="bg-black">
              <Th>#</Th>
              <Th>Jugador</Th>
              <Th align="right">PJ</Th>
              <Th align="right">G</Th>
              <Th align="right">P</Th>
              <Th align="right">PTS</Th>
            </tr>
          </thead>
          <tbody>
            {grupo.tabla.map((fila) => (
              <tr
                key={fila.participanteId}
                className={`border-b border-white/[.06] ${
                  fila.posicion === grupo.cuposClasificados ? "border-b-2 border-b-success/60" : ""
                } ${fila.estado === "eliminado" ? "bg-error/[.05]" : ""}`}
              >
                <td className="px-3 py-2.5 font-display text-lg text-white/70">
                  {fila.posicion}
                </td>
                <td className="px-3 py-2.5 font-body text-sm font-bold text-white">
                  {fila.nombre}
                </td>
                <td className="px-3 py-2.5 text-right font-body text-sm text-white/70">
                  {fila.pj}
                </td>
                <td className="px-3 py-2.5 text-right font-body text-sm text-white/70">
                  {fila.g}
                </td>
                <td className="px-3 py-2.5 text-right font-body text-sm text-white/70">
                  {fila.p}
                </td>
                <td className="px-3 py-2.5 text-right font-display text-base text-white">
                  {fila.puntos}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 font-body text-xs text-white/45">
        Clasifican los primeros {grupo.cuposClasificados} de {total} · eliminados los últimos 2.
        {hayDesempateManual && " Un empate de este grupo fue resuelto por el admin."}
      </p>
    </div>
  );
}

function Th({ children, align }) {
  return (
    <th
      className={`px-3 py-2.5 font-display text-[13px] font-normal tracking-[0.08em] text-white/50 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
