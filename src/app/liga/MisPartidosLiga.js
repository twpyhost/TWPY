"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getLigaPlayerView } from "@/lib/ligaPlayerView";
import { ligaPreferenceKey, resolveLigaSelection } from "@/lib/ligaPreference";

export default function MisPartidosLiga({ liga }) {
  const params = useSearchParams();
  const key = ligaPreferenceKey(liga.liga.slug);
  const [stored, setStored] = useState(null);
  const [ready, setReady] = useState(false);
  const validIds = liga.grupos.flatMap(g => g.participantes.map(p => String(p.id)));
  const selection = resolveLigaSelection({ urlParticipantId: params.get("participante"), storedParticipantId: stored, validIds });
  const view = selection.selectedId ? getLigaPlayerView(liga, selection.selectedId) : null;

  useEffect(() => {
    let value = null;
    try { value = localStorage.getItem(key); } catch { /* Storage is optional. */ }
    setStored(value);
    setReady(true);
  }, [key]);

  const explicit = params.get("participante");
  useEffect(() => {
    // Remember copied links too; invalid links never replace a valid preference.
    if (selection.clearStored || (explicit !== null && selection.selectedId)) {
      const next = selection.clearStored ? null : selection.selectedId;
      try { if (next) localStorage.setItem(key, next); else localStorage.removeItem(key); } catch { /* Optional preference. */ }
      setStored(next);
    }
  }, [key, explicit, selection.clearStored, selection.selectedId]);

  function choose(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("participante", id); else url.searchParams.delete("participante");
    setStored(id || null);
    try { if (id) localStorage.setItem(key, id); else localStorage.removeItem(key); } catch { /* Optional preference. */ }
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return <section aria-label="Mis partidos de Liga" className="bg-black px-5 py-8 sm:px-8 lg:px-14">
    <div className="mx-auto flex max-w-[1240px] flex-col gap-4 border border-white/15 bg-white/[.03] p-4 sm:p-6">
      <h2 className="font-display text-3xl italic">MIS PARTIDOS</h2>
      <label className="flex max-w-xl flex-col gap-2 font-body text-sm text-white/70">Elegí tu participante
        <select aria-label="Elegí tu participante" disabled={!ready} value={selection.invalidUrl ? "invalid" : selection.selectedId ?? ""}
          onChange={event => choose(event.target.value)} className="min-w-0 border border-white/20 bg-black p-3 text-white focus:border-primary-500">
          <option value="">Todos los participantes</option>
          {selection.invalidUrl && <option value="invalid" disabled>Participante no disponible</option>}
          {liga.grupos.map(group => <optgroup key={group.id} label={group.nombre}>
            {group.participantes.map(p => <option key={p.id} value={String(p.id)}>{p.nombre} · {group.nombre}</option>)}
          </optgroup>)}
        </select>
      </label>
      {selection.invalidUrl && <p role="alert" className="font-body text-warning">El participante del enlace ya no está en esta liga. Elegí otro.</p>}
      {view && <div className="flex min-w-0 flex-col gap-5 font-body">
        <p className="text-white/70"><strong className="text-white [overflow-wrap:anywhere]">{view.participant.nombre}</strong> · {view.group.nombre}
          {view.standing && ` · Posición ${view.standing.posicion} · ${view.standing.puntos} PTS`}
          {view.participant.playerId && <> · <Link className="text-tekken-blue-400" href={`/competidores/${view.participant.playerId}`}>Ver perfil</Link></>}
        </p>
        <MatchList title="Pendientes" matches={view.upcoming} />
        <MatchList title="Resultados" matches={view.completed} />
        {view.restDates.length > 0 && <p className="text-sm text-white/60">Descansa: {view.restDates.map(f => `fecha ${f.numero} (${f.fecha ?? "por confirmar"})`).join(", ")}</p>}
      </div>}
      <p className="font-body text-xs text-white/50">La selección se recuerda en este dispositivo. Copiá la URL para compartirla.</p>
    </div>
  </section>;
}

function MatchList({ title, matches }) {
  return <div>
    <h3 className="mb-2 font-display text-xl text-tekken-blue-400">{title}</h3>
    {matches.length === 0 ? <p className="text-sm text-white/50">Sin partidos en esta sección.</p> : <ul className="grid gap-2 md:grid-cols-2">
      {matches.map(match => <li key={match.id} className="min-w-0 border-l-2 border-primary-500 bg-white/[.04] p-3 text-sm">
        <span className="text-white/60">Fecha {match.fechaNumero} · {match.date ?? "Por confirmar"} · {match.time ?? "Horario por confirmar"}</span>
        <p className="mt-1 [overflow-wrap:anywhere]">vs. {match.profileId ? <Link className="text-tekken-blue-400" href={`/competidores/${match.profileId}`}>{match.opponentName}</Link> : match.opponentName}</p>
        <p className="mt-1 font-semibold">{match.status === "pendiente" ? "Pendiente" : match.status === "sancionado" ? "Sancionado · 0–0" : `${match.scoreFor}–${match.scoreAgainst}`}</p>
      </li>)}
    </ul>}
  </div>;
}
