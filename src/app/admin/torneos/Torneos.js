"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import ImportarTorneoModal from "./ImportarTorneoModal";

const CUENTA_BADGE = {
  A: "border-tekken-blue-400/50 bg-tekken-blue-400/10 text-tekken-blue-400",
  B: "border-primary-500/50 bg-primary-500/10 text-primary-500",
};

const FILTROS_CUENTA = [
  { value: "todas", label: "Todas" },
  { value: "A", label: "Cuenta A" },
  { value: "B", label: "Cuenta B" },
];

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCuenta, setFiltroCuenta] = useState("todas");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [reimportandoId, setReimportandoId] = useState(null);

  const cargarTorneos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/torneos");
      const data = await response.json();
      setTorneos(data.torneos ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTorneos();
  }, [cargarTorneos]);

  const filtrados = useMemo(
    () =>
      filtroCuenta === "todas"
        ? torneos
        : torneos.filter((torneo) => torneo.cuenta === filtroCuenta),
    [torneos, filtroCuenta],
  );

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
          <div className="flex flex-wrap gap-3">
            <Button onClick={sincronizar} disabled={sincronizando} className="px-5 py-2.5 text-base">
              {sincronizando ? "SINCRONIZANDO..." : "SINCRONIZAR NUEVOS TORNEOS"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalAbierto(true)}
              className="px-5 py-2.5 text-base"
            >
              IMPORTAR TORNEO HISTÓRICO
            </Button>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {FILTROS_CUENTA.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltroCuenta(f.value)}
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

          {loading ? (
            <p className="font-body text-sm text-white/50">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
              No hay torneos para mostrar.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtrados.map((torneo) => (
                <div
                  key={torneo.id}
                  className="flex flex-wrap items-center gap-4 border border-white/10 bg-white/[.03] p-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/torneos/${torneo.id}`}
                        className="font-display text-lg italic text-white hover:text-primary-500"
                      >
                        {torneo.nombre}
                      </Link>
                      <span
                        className={`border px-2 py-0.5 font-display text-[11px] tracking-[0.08em] ${CUENTA_BADGE[torneo.cuenta] ?? CUENTA_BADGE.B}`}
                      >
                        CUENTA {torneo.cuenta}
                      </span>
                    </div>
                    <span className="font-body text-xs text-white/50">
                      {torneo.fecha_inicio} · temporada {torneo.temporada}
                      {torneo.pendientes > 0
                        ? ` · ${torneo.pendientes} pendiente(s) de vincular`
                        : " · resuelto"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => reimportar(torneo.id)}
                    disabled={reimportandoId === torneo.id}
                    className="whitespace-nowrap border border-white/15 bg-white/[.04] px-4 py-2 font-display text-sm tracking-[0.08em] text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    {reimportandoId === torneo.id ? "REIMPORTANDO..." : "REIMPORTAR"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ImportarTorneoModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onImportado={cargarTorneos}
      />
    </>
  );
}
