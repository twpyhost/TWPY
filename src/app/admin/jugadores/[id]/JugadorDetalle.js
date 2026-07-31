"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

export default function JugadorDetalle({ playerId }) {
  const [jugador, setJugador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoCuenta, setCambiandoCuenta] = useState(null);
  const [eliminandoCuenta, setEliminandoCuenta] = useState(null);
  const [form, setForm] = useState({ display_name: "", avatar_url: "", discord_id: "" });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/identidades/jugadores/${playerId}/detalle`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el jugador");
      setJugador(data.jugador);
      setForm({
        display_name: data.jugador.display_name ?? "",
        avatar_url: data.jugador.avatar_url ?? "",
        discord_id: data.jugador.discord_id ?? "",
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const response = await fetch(`/api/admin/jugadores/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar");
      toast.success("Perfil actualizado");
      cargar();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const marcarActiva = async (challongeId) => {
    setCambiandoCuenta(challongeId);
    try {
      const response = await fetch(`/api/admin/jugadores/${playerId}/cuenta_activa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challongeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cambiar la cuenta activa");
      toast.success("Cuenta activa actualizada");
      cargar();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCambiandoCuenta(null);
    }
  };

  const eliminarCuenta = async (challongeId) => {
    if (!window.confirm("¿Desvincular esta cuenta de Challonge del jugador?")) return;
    setEliminandoCuenta(challongeId);
    try {
      const response = await fetch(`/api/admin/jugadores/${playerId}/cuenta`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challongeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo desvincular la cuenta");
      toast.success("Cuenta desvinculada");
      cargar();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEliminandoCuenta(null);
    }
  };

  if (loading) {
    return <div className="p-8 font-body text-sm text-white/50">Cargando...</div>;
  }

  if (!jugador) {
    return <div className="p-8 font-body text-sm text-white/50">Jugador no encontrado</div>;
  }

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
          <Link
            href="/admin/jugadores"
            className="inline-flex w-fit items-center gap-2 font-display text-sm tracking-[0.14em] text-white/60 hover:text-primary-500"
          >
            <span>&larr;</span> VOLVER A JUGADORES
          </Link>
          <RibbonTag>ADMIN · PERFIL DE JUGADOR</RibbonTag>
          <h1 className="-ml-1.5 m-0 font-display text-[clamp(38px,5.4vw,64px)] italic leading-[.95] tracking-[0.01em]">
            {jugador.display_name}
          </h1>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
          <div className="border border-white/10 bg-white/[.03] p-5">
            <h2 className="m-0 mb-4 font-display text-xl tracking-[0.04em]">Perfil</h2>
            <form onSubmit={guardar} className="flex flex-col gap-3 sm:max-w-md">
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-xs uppercase tracking-[0.08em] text-white/50">
                  Nombre
                </span>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  required
                  className="h-10 border border-white/15 bg-black px-3 font-body text-sm text-white outline-none focus:border-primary-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-xs uppercase tracking-[0.08em] text-white/50">
                  Avatar (URL)
                </span>
                <input
                  type="text"
                  value={form.avatar_url}
                  onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                  className="h-10 border border-white/15 bg-black px-3 font-body text-sm text-white outline-none focus:border-primary-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-xs uppercase tracking-[0.08em] text-white/50">
                  Discord ID
                </span>
                <input
                  type="text"
                  value={form.discord_id}
                  onChange={(e) => setForm((f) => ({ ...f, discord_id: e.target.value }))}
                  className="h-10 border border-white/15 bg-black px-3 font-body text-sm text-white outline-none focus:border-primary-500"
                />
              </label>
              <Button type="submit" disabled={guardando} className="w-fit px-6 py-2.5 text-base">
                {guardando ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
              </Button>
            </form>
          </div>

          <div className="border border-white/10 bg-white/[.03] p-5">
            <h2 className="m-0 mb-4 font-display text-xl tracking-[0.04em]">
              Cuentas de Challonge vinculadas
            </h2>
            {jugador.cuentas.length === 0 ? (
              <p className="font-body text-sm text-white/50">Sin cuentas de Challonge vinculadas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {jugador.cuentas.map((cuenta) => (
                  <div
                    key={cuenta.challonge_id}
                    className="flex flex-wrap items-center gap-2 border border-white/10 bg-black/40 p-3"
                  >
                    <span className="flex-1 min-w-0 truncate font-mono text-sm text-white/80">
                      {cuenta.challonge_username}{" "}
                      <span className="text-white/40">({cuenta.challonge_id})</span>
                    </span>
                    {cuenta.active ? (
                      <span className="border border-success/40 bg-success/10 px-2.5 py-1 font-display text-[11px] tracking-[0.08em] text-success [clip-path:var(--clip-banner-right)]">
                        ACTIVA
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => marcarActiva(cuenta.challonge_id)}
                        disabled={cambiandoCuenta === cuenta.challonge_id}
                        className="border border-white/15 bg-white/[.04] px-3 py-1.5 font-display text-xs tracking-[0.08em] text-white hover:bg-white/10 disabled:opacity-40"
                      >
                        {cambiandoCuenta === cuenta.challonge_id ? "..." : "MARCAR ACTIVA"}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Desvincular ${cuenta.challonge_username}`}
                      onClick={() => eliminarCuenta(cuenta.challonge_id)}
                      disabled={eliminandoCuenta === cuenta.challonge_id}
                      className="flex h-7 w-7 flex-none items-center justify-center font-display text-lg text-white/40 hover:text-primary-500 disabled:opacity-40"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-white/10 bg-white/[.03] p-5">
            <h2 className="m-0 mb-4 font-display text-xl tracking-[0.04em]">
              Historial de torneos
            </h2>
            {jugador.historial.length === 0 ? (
              <p className="font-body text-sm text-white/50">Sin torneos jugados todavia.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse">
                  <thead>
                    <tr className="bg-black">
                      <th className="px-3 py-2.5 text-left font-display text-sm font-normal tracking-[0.08em] text-white/50">
                        Torneo
                      </th>
                      <th className="px-3 py-2.5 text-left font-display text-sm font-normal tracking-[0.08em] text-white/50">
                        Fecha
                      </th>
                      <th className="px-3 py-2.5 text-right font-display text-sm font-normal tracking-[0.08em] text-white/50">
                        Posición
                      </th>
                      <th className="px-3 py-2.5 text-right font-display text-sm font-normal tracking-[0.08em] text-white/50">
                        Puntos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugador.historial.map((h, index) => (
                      <tr
                        key={`${h.torneo_id}-${index}`}
                        className="border-b border-white/[.07] text-sm"
                      >
                        <td className="px-3 py-2.5 text-white/85">{h.torneo_nombre}</td>
                        <td className="px-3 py-2.5 text-white/50">{h.fecha}</td>
                        <td className="px-3 py-2.5 text-right text-white/70">#{h.posicion}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-white">
                          {h.puntaje} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
