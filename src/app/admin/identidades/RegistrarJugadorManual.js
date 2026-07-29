"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function RegistrarJugadorManual({ onRegistrado }) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const registrar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/identidades/registrar_manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nombre }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al registrar el jugador");
      }
      toast.success(data.message || "Jugador registrado");
      setNombre("");
      onRegistrado();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={registrar} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <label className="mb-1 block font-display text-xs tracking-[0.14em] text-white/50">
          Nombre del jugador (sin cuenta de Challonge)
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo o nick"
          className="h-10 w-full border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
        />
      </div>
      <button
        type="submit"
        disabled={!nombre.trim() || loading}
        className="h-10 whitespace-nowrap bg-primary-500 px-4 font-display text-sm tracking-[0.08em] text-white hover:brightness-90 disabled:opacity-40"
      >
        {loading ? "REGISTRANDO..." : "REGISTRAR JUGADOR"}
      </button>
    </form>
  );
}
