"use client";

import { useEffect, useRef, useState } from "react";

function inicialesDe(nombre) {
  return (nombre || "?").trim().slice(0, 2).toUpperCase();
}

// Autocompletado de jugadores, reusado tanto en la cola (vincular) como en
// el selector de fusion (base/duplicado).
export default function BuscadorJugador({
  label,
  placeholder = "Buscar jugador...",
  selected,
  onSelect,
  onClear,
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResultados([]);
      return;
    }

    setCargando(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/identidades/jugadores/buscar?q=${encodeURIComponent(query)}`,
        );
        const data = await response.json();
        setResultados(data.jugadores || []);
      } catch {
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  if (selected) {
    return (
      <div>
        {label && (
          <label className="mb-1 block font-display text-xs tracking-[0.14em] text-white/50">
            {label}
          </label>
        )}
        <div className="flex h-10 items-center justify-between gap-2 border border-white/15 bg-white/[.04] px-3">
          <span className="font-body text-sm text-white">{selected.display_name}</span>
          <button
            type="button"
            onClick={onClear}
            className="font-display text-xs tracking-[0.1em] text-white/50 hover:text-primary-500"
          >
            CAMBIAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block font-display text-xs tracking-[0.14em] text-white/50">
          {label}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder}
        className="h-10 w-full border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
      />
      {abierto && query.trim() && (
        <div className="absolute z-10 mt-1 w-full border border-white/15 bg-dark-gray-3-700">
          {cargando && <p className="px-3 py-2 font-body text-sm text-white/50">Buscando...</p>}
          {!cargando && resultados.length === 0 && (
            <p className="px-3 py-2 font-body text-sm text-white/50">Sin resultados</p>
          )}
          {resultados.map((jugador) => (
            <button
              key={jugador.id}
              type="button"
              onClick={() => {
                onSelect(jugador);
                setQuery("");
                setAbierto(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-primary-500/10"
            >
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-white/10 font-display text-[11px] font-bold">
                {inicialesDe(jugador.display_name)}
              </span>
              <span className="flex-1 truncate font-body text-sm font-bold text-white">
                {jugador.display_name}
              </span>
              <span className="whitespace-nowrap font-display text-[11px] tracking-[0.08em] text-white/45">
                {jugador.posicion_actual ? `#${jugador.posicion_actual} · ` : ""}
                {jugador.torneos_jugados} trn
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
