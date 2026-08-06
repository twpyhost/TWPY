"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import StatusChip from "@/components/ui/StatusChip";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { bloquesPorPuntos, estadoParaPosicion } from "@/lib/ligaTabla";

// Identifica un bloque de forma estable entre renders, por el conjunto de
// participantes que lo componen -- no por su posicion en la tabla -- para
// que un borrador de reordenamiento (ordenDraft) siga siendo valido aunque
// otro bloque cambie de tamano en un refresco de datos.
function claveBloque(tabla, bloque) {
  return tabla
    .slice(bloque.inicio, bloque.fin)
    .map((f) => f.participanteId)
    .sort((a, b) => a - b)
    .join("-");
}

function ordenServidorBloque(tabla, bloque) {
  return tabla.slice(bloque.inicio, bloque.fin).map((f) => f.participanteId);
}

export default function GrupoDetalle({ numero }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardandoPartidoId, setGuardandoPartidoId] = useState(null);
  const [ordenDraft, setOrdenDraft] = useState({});
  const [bloquesGuardando, setBloquesGuardando] = useState(new Set());
  const [modalCerrarAbierto, setModalCerrarAbierto] = useState(false);
  const [cambiandoCerrado, setCambiandoCerrado] = useState(false);

  const cargar = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const response = await fetch(`/api/admin/liga/grupos/${numero}`);
        const body = await response.json();
        setData(response.ok ? body : null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [numero],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupo = data?.grupo;
  const fechas = data?.fechas ?? [];

  const partidosPorFecha = useMemo(() => {
    if (!grupo) return new Map();
    const mapa = new Map();
    for (const partido of grupo.partidos) {
      const lista = mapa.get(partido.fechaNumero) ?? [];
      lista.push(partido);
      mapa.set(partido.fechaNumero, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.orden - b.orden);
    return mapa;
  }, [grupo]);

  const bloques = useMemo(() => (grupo ? bloquesPorPuntos(grupo.tabla) : []), [grupo]);

  const filasVisibles = useMemo(() => {
    if (!grupo) return [];
    const filaPorId = new Map(grupo.tabla.map((f) => [f.participanteId, f]));
    const filas = [...grupo.tabla];
    for (const bloque of bloques) {
      const clave = claveBloque(grupo.tabla, bloque);
      const orden = ordenDraft[clave] ?? ordenServidorBloque(grupo.tabla, bloque);
      for (let k = 0; k < orden.length; k += 1) {
        filas[bloque.inicio + k] = filaPorId.get(orden[k]);
      }
    }
    return filas;
  }, [grupo, bloques, ordenDraft]);

  const hayEmpatesPendientes = grupo?.tabla.some((f) => f.empatado) ?? false;

  const cargarGanador = async (partidoId, ganadorId) => {
    setGuardandoPartidoId(partidoId);
    try {
      const response = await fetch(`/api/admin/liga/partidos/${partidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ganadorId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo actualizar el partido");
      await cargar({ silent: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardandoPartidoId(null);
    }
  };

  const moverEnDraft = (bloque, indiceEnBloque, direccion) => {
    const clave = claveBloque(grupo.tabla, bloque);
    const actual = ordenDraft[clave] ?? ordenServidorBloque(grupo.tabla, bloque);
    const posLocal = indiceEnBloque - bloque.inicio;
    const otroLocal = posLocal + direccion;
    if (otroLocal < 0 || otroLocal >= actual.length) return;

    const nuevo = [...actual];
    [nuevo[posLocal], nuevo[otroLocal]] = [nuevo[otroLocal], nuevo[posLocal]];
    setOrdenDraft((prev) => ({ ...prev, [clave]: nuevo }));
  };

  const hayCambiosPendientes = (bloque) => {
    const clave = claveBloque(grupo.tabla, bloque);
    const draft = ordenDraft[clave];
    if (!draft) return false;
    const servidor = ordenServidorBloque(grupo.tabla, bloque);
    return draft.some((id, i) => id !== servidor[i]);
  };

  const confirmarBloque = async (bloque) => {
    const clave = claveBloque(grupo.tabla, bloque);
    const orden = ordenDraft[clave];
    if (!orden) return;

    setBloquesGuardando((prev) => new Set(prev).add(clave));
    try {
      const response = await fetch(`/api/admin/liga/grupos/${numero}/desempate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el desempate");

      setOrdenDraft((prev) => {
        const siguiente = { ...prev };
        delete siguiente[clave];
        return siguiente;
      });
      toast.success("Desempate guardado");
      await cargar({ silent: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBloquesGuardando((prev) => {
        const siguiente = new Set(prev);
        siguiente.delete(clave);
        return siguiente;
      });
    }
  };

  const descartarBloque = (bloque) => {
    const clave = claveBloque(grupo.tabla, bloque);
    setOrdenDraft((prev) => {
      const siguiente = { ...prev };
      delete siguiente[clave];
      return siguiente;
    });
  };

  const cambiarCerrado = async (cerrado) => {
    setCambiandoCerrado(true);
    try {
      const response = await fetch(`/api/admin/liga/grupos/${numero}/cerrar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cerrado }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo cambiar el estado del grupo");
      toast.success(body.message);
      setModalCerrarAbierto(false);
      await cargar({ silent: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCambiandoCerrado(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-black px-5 py-24 sm:px-8 lg:px-14">
        <p className="font-body text-sm text-white/50">Cargando...</p>
      </section>
    );
  }

  if (!grupo) {
    return (
      <section className="bg-black px-5 py-24 sm:px-8 lg:px-14">
        <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
          No se encontró el grupo.
        </p>
      </section>
    );
  }

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/admin/liga"
              className="font-body text-xs tracking-[0.1em] text-white/50 hover:text-white"
            >
              ← LIGA
            </Link>
            <RibbonTag>ADMIN · GRUPO</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(46px,6.4vw,80px)] italic leading-[.9] tracking-[0.01em]">
              {grupo.nombre.toUpperCase()}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone={grupo.cerrado ? "neutral" : "success"}>
              {grupo.cerrado ? "CERRADO" : "ABIERTO"}
            </StatusChip>
            <Button
              variant="outline"
              onClick={() => setModalCerrarAbierto(true)}
              disabled={!grupo.cerrado && hayEmpatesPendientes}
              title={
                !grupo.cerrado && hayEmpatesPendientes
                  ? "Resolvé los empates pendientes antes de cerrar el grupo"
                  : undefined
              }
              className="px-5 py-2.5 text-base disabled:opacity-40"
            >
              {grupo.cerrado ? "REABRIR GRUPO" : "CERRAR GRUPO"}
            </Button>
            {!grupo.cerrado && hayEmpatesPendientes && (
              <p className="w-full text-right font-body text-xs text-warning">
                Resolvé los empates pendientes antes de cerrar el grupo.
              </p>
            )}
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-3">
            <RibbonTag className="w-fit">TABLA EN VIVO</RibbonTag>
            <div className="overflow-x-auto border border-white/10 bg-dark-gray-3-700">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr className="bg-black">
                    <Th>#</Th>
                    <Th>Jugador</Th>
                    <Th align="right">PJ</Th>
                    <Th align="right">G</Th>
                    <Th align="right">P</Th>
                    <Th align="right">PTS</Th>
                    <Th align="right">Desempate</Th>
                  </tr>
                </thead>
                <tbody>
                  {filasVisibles.map((fila, indice) => {
                    const bloque = bloques.find(
                      (b) => indice >= b.inicio && indice < b.fin,
                    );
                    const posicion = indice + 1;
                    const estado = estadoParaPosicion(
                      posicion,
                      filasVisibles.length,
                      grupo.cuposClasificados,
                    );

                    return (
                      <tr
                        key={fila.participanteId}
                        className={`border-b border-white/[.06] ${
                          fila.empatado ? "bg-warning/[.06]" : ""
                        } ${estado === "clasificado" ? "border-l-2 border-l-success" : ""} ${
                          estado === "eliminado" ? "border-l-2 border-l-error" : ""
                        }`}
                      >
                        <td className="px-3 py-2.5 font-display text-lg text-white/70">
                          {posicion}
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
                        <td className="px-3 py-2.5 text-right">
                          {bloque && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                disabled={
                                  indice === bloque.inicio ||
                                  grupo.cerrado ||
                                  bloquesGuardando.has(claveBloque(grupo.tabla, bloque))
                                }
                                onClick={() => moverEnDraft(bloque, indice, -1)}
                                className="flex h-6 w-6 items-center justify-center border border-white/20 bg-white/[.04] text-xs text-white disabled:opacity-30"
                                aria-label="Subir"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={
                                  indice === bloque.fin - 1 ||
                                  grupo.cerrado ||
                                  bloquesGuardando.has(claveBloque(grupo.tabla, bloque))
                                }
                                onClick={() => moverEnDraft(bloque, indice, 1)}
                                className="flex h-6 w-6 items-center justify-center border border-white/20 bg-white/[.04] text-xs text-white disabled:opacity-30"
                                aria-label="Bajar"
                              >
                                ↓
                              </button>
                            </div>
                          )}
                          {bloque && indice === bloque.fin - 1 && hayCambiosPendientes(bloque) && (
                            <div className="mt-1 inline-flex gap-1">
                              <button
                                type="button"
                                disabled={bloquesGuardando.has(claveBloque(grupo.tabla, bloque))}
                                onClick={() => confirmarBloque(bloque)}
                                className="border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-bold text-success disabled:opacity-40"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                disabled={bloquesGuardando.has(claveBloque(grupo.tabla, bloque))}
                                onClick={() => descartarBloque(bloque)}
                                className="border border-white/20 bg-white/[.04] px-2 py-1 text-[11px] text-white/70 disabled:opacity-40"
                              >
                                Descartar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="font-body text-xs text-white/50">
              Clasifican los primeros {grupo.cuposClasificados} · quedan eliminados los últimos 2.
              Las filas resaltadas tienen un empate sin desempatar.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <RibbonTag className="w-fit">FECHAS</RibbonTag>
            <div className="flex flex-col gap-3">
              {fechas.map((fecha) => {
                const partidos = partidosPorFecha.get(fecha.numero) ?? [];
                if (partidos.length === 0) return null;
                return (
                  <div key={fecha.id} className="border border-white/10 bg-white/[.03] p-4">
                    <div className="mb-2.5 font-display text-sm tracking-[0.08em] text-white/60">
                      FECHA {fecha.numero} · {fecha.fecha} · {fecha.hora}
                    </div>
                    <div className="flex flex-col gap-2">
                      {partidos.map((partido) => (
                        <div key={partido.id} className="flex items-center gap-2">
                          <BotonGanador
                            partido={partido}
                            lado="a"
                            loading={guardandoPartidoId === partido.id}
                            disabled={grupo.cerrado}
                            onClick={cargarGanador}
                          />
                          <span className="font-display text-xs text-white/40">VS</span>
                          <BotonGanador
                            partido={partido}
                            lado="b"
                            loading={guardandoPartidoId === partido.id}
                            disabled={grupo.cerrado}
                            onClick={cargarGanador}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={modalCerrarAbierto}
        title={grupo.cerrado ? "Reabrir grupo" : "Cerrar grupo"}
        body={
          <p className="m-0">
            {grupo.cerrado
              ? "Vuelve a permitir cargar y modificar resultados de este grupo."
              : "Congela la tabla del grupo: no se van a poder cargar ni modificar resultados hasta reabrirlo."}
          </p>
        }
        confirmLabel={grupo.cerrado ? "REABRIR" : "CERRAR"}
        loading={cambiandoCerrado}
        onConfirm={() => cambiarCerrado(!grupo.cerrado)}
        onClose={() => setModalCerrarAbierto(false)}
      />
    </>
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

function BotonGanador({ partido, lado, loading, disabled, onClick }) {
  const esGanador =
    (lado === "a" && partido.ganadorId === partido.participanteAId) ||
    (lado === "b" && partido.ganadorId === partido.participanteBId);
  const hayGanador = partido.ganadorId != null;
  const participanteId = lado === "a" ? partido.participanteAId : partido.participanteBId;
  const nombre = lado === "a" ? partido.nombreA : partido.nombreB;

  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={() => onClick(partido.id, esGanador ? null : participanteId)}
      className={`h-10 flex-1 border px-3 font-body text-sm font-bold transition-colors duration-200 disabled:opacity-40 ${
        esGanador
          ? "border-success/50 bg-success/15 text-success"
          : hayGanador
            ? "border-white/10 bg-white/[.02] text-white/35"
            : "border-white/15 bg-white/[.04] text-white hover:border-primary-500/50 hover:bg-primary-500/10"
      }`}
    >
      {nombre}
    </button>
  );
}
