"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import StatusChip from "@/components/ui/StatusChip";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ChallongeLinkButton from "@/components/ui/ChallongeLinkButton";
import Paginacion from "@/components/admin/Paginacion";
import { usePaginacionUrl, useBusquedaDebounced } from "@/components/admin/usePaginacionUrl";
import { POR_PAGINA_TABLA } from "@/lib/paginacion";

const CUENTA_TONE = { A: "cyan", B: "primary" };

const FILTROS_CUENTA = [
  { value: "todas", label: "Todas" },
  { value: "A", label: "Cuenta A" },
  { value: "B", label: "Cuenta B" },
];

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [reimportandoId, setReimportandoId] = useState(null);
  const [urlRapida, setUrlRapida] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [torneoAEliminar, setTorneoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const { pagina, q, extras, query, irAPagina, cambiarFiltro } = usePaginacionUrl({
    extras: ["cuenta"],
  });
  const filtroCuenta = extras.cuenta ?? "todas";
  const [texto, setTexto] = useBusquedaDebounced(q, (valor) => cambiarFiltro({ q: valor }));

  const cargarTorneos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/torneos?${query}`);
      const data = await response.json();
      setTorneos(data.torneos ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    cargarTorneos();
  }, [cargarTorneos]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_TABLA));

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const response = await fetch("/api/admin/torneos/sincronizar", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo sincronizar");

      if (data.importados.length === 0) {
        toast.success("No hay torneos nuevos para importar");
      } else {
        toast.success(`${data.importados.length} torneo(s) nuevo(s) importado(s)`);
      }
      if (data.errores?.length > 0) {
        toast.error(`${data.errores.length} torneo(s) fallaron al sincronizar`);
      }
      cargarTorneos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSincronizando(false);
    }
  };

  const reimportar = async (torneoId) => {
    setReimportandoId(torneoId);
    try {
      const response = await fetch(`/api/admin/torneos/${torneoId}/reimportar`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo reimportar");

      toast.success("Torneo reimportado");
      cargarTorneos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReimportandoId(null);
    }
  };

  const agregarTorneo = async () => {
    const url = urlRapida.trim();
    if (!url) {
      toast.error("Pegá la URL o el ID del torneo");
      return;
    }

    setAgregando(true);
    try {
      const response = await fetch("/api/admin/insertar_torneo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo agregar el torneo");

      toast.success("Torneo agregado");
      setUrlRapida("");
      cargarTorneos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAgregando(false);
    }
  };

  const eliminarTorneo = async () => {
    if (!torneoAEliminar) return;

    setEliminando(true);
    try {
      const response = await fetch(`/api/admin/torneos/${torneoAEliminar.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar el torneo");

      toast.success("Torneo eliminado");
      setTorneoAEliminar(null);
      cargarTorneos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>ADMIN · TORNEOS</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              TORNEOS
            </h1>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button onClick={sincronizar} disabled={sincronizando} className="px-5 py-2.5 text-base">
              {sincronizando ? "SINCRONIZANDO..." : "SINCRONIZAR TORNEOS TWPY"}
            </Button>
            <div className="flex max-w-[520px] flex-wrap gap-2">
              <input
                type="text"
                value={urlRapida}
                onChange={(e) => setUrlRapida(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") agregarTorneo();
                }}
                placeholder="URL o ID de Challonge · agregar rápido"
                className="h-10 min-w-0 flex-1 border border-white/[.18] bg-black px-3 font-body text-[13px] text-white outline-none placeholder:text-white/40 focus:border-tekken-blue-500"
              />
              <Button
                variant="outline"
                onClick={agregarTorneo}
                disabled={agregando}
                className="px-5 py-2.5 text-sm"
              >
                {agregando ? "AGREGANDO..." : "AGREGAR TORNEO"}
              </Button>
            </div>
            <p className="max-w-[520px] border-l-[3px] border-tekken-blue-500 bg-tekken-blue-500/[.08] px-3 py-2 text-[12px] leading-[1.5] text-white/70">
              Solo se pueden añadir torneos creados con la cuenta <strong>TWPY_Host</strong> de
              Challonge. Torneos de otras cuentas no van a encontrarse.
            </p>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTROS_CUENTA.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => cambiarFiltro({ cuenta: f.value === "todas" ? null : f.value })}
                  className={`border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
                    filtroCuenta === f.value
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar torneo..."
              className="h-11 w-full max-w-xs border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
            />
          </div>

          {loading ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : torneos.length === 0 ? (
            <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
              No hay torneos para mostrar.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {torneos.map((torneo) => (
                <div
                  key={torneo.id}
                  className="flex flex-wrap items-center gap-4 border border-white/10 bg-white/[.03] p-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/torneos/${torneo.id}`}
                        className="font-display text-lg italic text-white hover:text-primary-500"
                      >
                        {torneo.nombre}
                      </Link>
                      <StatusChip tone={CUENTA_TONE[torneo.cuenta] ?? "primary"}>
                        CUENTA {torneo.cuenta}
                      </StatusChip>
                      <StatusChip tone={torneo.pendientes > 0 ? "warning" : "success"}>
                        {torneo.pendientes > 0
                          ? `${torneo.pendientes} SIN VINCULAR`
                          : "RESUELTO"}
                      </StatusChip>
                    </div>
                    <span className="font-body text-xs text-white/50">
                      {torneo.fecha_inicio} · temporada {torneo.temporada}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ChallongeLinkButton
                      url={torneo.url_challonge}
                      className="px-4 py-2"
                      textoClassName="text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => reimportar(torneo.id)}
                      disabled={reimportandoId === torneo.id}
                      className="whitespace-nowrap border border-white/15 bg-white/[.04] px-4 py-2 font-display text-sm tracking-[0.08em] text-white hover:bg-white/10 disabled:opacity-40"
                    >
                      {reimportandoId === torneo.id ? "REIMPORTANDO..." : "REIMPORTAR"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTorneoAEliminar(torneo)}
                      aria-label="Eliminar torneo"
                      className="flex h-[34px] w-[34px] flex-none items-center justify-center border border-error/40 text-[rgb(255,120,120)] transition-colors duration-200 hover:bg-error hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                        <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <Paginacion
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={total}
                etiqueta="torneos"
                onCambio={irAPagina}
              />
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(torneoAEliminar)}
        title="Eliminar torneo"
        body={
          <>
            Se elimina <strong className="text-white">“{torneoAEliminar?.nombre}”</strong> de la
            lista y sus resultados dejan de contar para el ranking.
          </>
        }
        warningText="Se borran también sus participantes y snapshots. El ranking de la temporada se recalcula automáticamente."
        requireUnderstandCheckbox
        understandLabel="Entiendo que este torneo y sus resultados se borran y no se puede deshacer."
        confirmLabel="ELIMINAR"
        loading={eliminando}
        onConfirm={eliminarTorneo}
        onClose={() => setTorneoAEliminar(null)}
      />
    </>
  );
}
