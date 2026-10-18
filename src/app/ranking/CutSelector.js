"use client";

import { useSearchParams } from "next/navigation";
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

export default function CutSelector({ cuts, year, invalid }) {
  const params = useSearchParams();
  const { navigate, seleccionMostrada } = useSearchParamTransition();
  return (
    <label className="flex max-w-full flex-col gap-2 font-body text-sm text-white/70">
      Ranking después del torneo
      <select aria-label="Ranking después del torneo" value={seleccionMostrada}
        className="w-full min-w-0 max-w-xl border border-white/20 bg-black px-3 py-3 text-white focus:border-primary-500"
        onChange={event => {
          const id = event.target.value;
          if (id === seleccionMostrada) return;
          const next = new URLSearchParams(params.toString());
          next.set("year", year);
          if (id) next.set("torneo", id); else next.delete("torneo");
          navigate(`/ranking?${next}`, year, cuts.find(c => c.tournamentId === id)?.title ?? null, id);
        }}>
        <option value="">Último corte</option>
        {invalid && <option value="invalid" disabled>Corte no válido</option>}
        {cuts.map(cut => <option key={cut.tournamentId} value={cut.tournamentId}>
          {cut.date.slice(0, 10)} · {cut.title}{cut.available ? "" : " · Sin historial"}
        </option>)}
      </select>
    </label>
  );
}
