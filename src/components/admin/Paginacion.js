"use client";

// Control de paginacion compartido por todas las listas del admin. El markup
// y el copy salen de los controles que ya tenia el log de actividad de
// identidades, que era la unica lista paginada del panel.
export default function Paginacion({ pagina, totalPaginas, total, etiqueta = "resultados", onCambio }) {
  if (totalPaginas <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-body text-xs text-white/45">
        Página {pagina} de {totalPaginas} · {total} {etiqueta}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onCambio(Math.max(1, pagina - 1))}
          disabled={pagina <= 1}
          className="border border-white/15 bg-white/[.04] px-3 py-1.5 font-display text-xs tracking-[0.08em] text-white hover:bg-white/10 disabled:opacity-40"
        >
          ‹ ANTERIOR
        </button>
        <button
          type="button"
          onClick={() => onCambio(Math.min(totalPaginas, pagina + 1))}
          disabled={pagina >= totalPaginas}
          className="border border-white/15 bg-white/[.04] px-3 py-1.5 font-display text-xs tracking-[0.08em] text-white hover:bg-white/10 disabled:opacity-40"
        >
          SIGUIENTE ›
        </button>
      </div>
    </div>
  );
}
