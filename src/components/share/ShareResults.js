"use client";

import { useEffect, useState } from "react";

export default function ShareResults({ resourceType, resourceId, year }) {
  const [format, setFormat] = useState("landscape");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [native, setNative] = useState(false);
  const [prepared, setPrepared] = useState(null);
  const player = resourceType === "jugador";
  const params = new URLSearchParams({
    format,
    ...(player ? { year: String(year) } : {}),
  });
  const imageUrl = `/api/cards/${player ? "jugadores" : "torneos"}/${resourceId}?${params}`;
  const readyFile = prepared?.url === imageUrl ? prepared.file : null;
  const pagePath = player
    ? `/competidores/${resourceId}?year=${year}`
    : `/torneo-resultado/${resourceId}`;

  useEffect(() => {
    try {
      setNative(
        typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({
            files: [new File([], "twpy.png", { type: "image/png" })],
          }),
      );
    } catch {
      setNative(false);
    }
  }, []);

  async function act(action) {
    setBusy(true);
    setStatus("");
    setError("");
    try {
      if (action === "share") {
        if (!readyFile || !navigator.canShare?.({ files: [readyFile] }))
          throw new Error("No se admiten archivos");
        // Open the platform share sheet in a fresh click, before awaiting any
        // network operation that could expire user activation.
        await navigator.share({
          files: [readyFile],
          title: "Resultados TWPY",
          url: new URL(pagePath, window.location.origin).href,
        });
        setStatus("Imagen compartida");
      } else if (action === "copy") {
        await navigator.clipboard.writeText(
          new URL(pagePath, window.location.origin).href,
        );
        setStatus("Enlace copiado");
      } else {
        const response = await fetch(imageUrl);
        if (
          !response.ok ||
          !response.headers.get("content-type")?.startsWith("image/png")
        )
          throw new Error("Imagen no disponible");
        const blob = await response.blob();
        const filename = `twpy-${resourceType}-${resourceId}-${format}.png`;
        if (action === "prepare") {
          const file = new File([blob], filename, { type: "image/png" });
          if (!navigator.canShare?.({ files: [file] }))
            throw new Error("No se admiten archivos");
          setPrepared({ url: imageUrl, file });
          setStatus("Imagen lista. Pulsá Compartir imagen.");
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setStatus("Imagen descargada");
        }
      }
    } catch (failure) {
      if (failure.name === "AbortError") setStatus("Compartir cancelado");
      else
        setError(
          "No se pudo completar la acción. Intentá de nuevo o usá las otras opciones.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Compartir resultados"
      className="min-w-0 border border-white/15 bg-white/[.03] p-4 font-body"
    >
      <h2 className="mb-3 font-display text-2xl">COMPARTIR RESULTADOS</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-white/70">
          Formato de imagen
          <select
            disabled={busy}
            value={format}
            onChange={(event) => {
              setFormat(event.target.value);
              setPrepared(null);
              setStatus("");
              setError("");
            }}
            className="border border-white/20 bg-black p-2 text-white"
          >
            <option value="landscape">Horizontal · 1200 × 630</option>
            <option value="portrait">Vertical · 1080 × 1350</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("download")}
          className="border border-primary-500 bg-primary-500 px-4 py-2 disabled:opacity-50"
        >
          Descargar PNG
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("copy")}
          className="border border-white/25 px-4 py-2 disabled:opacity-50"
        >
          Copiar enlace
        </button>
        {native && (
          <button
            type="button"
            disabled={busy}
            onClick={() => act(readyFile ? "share" : "prepare")}
            className="border border-tekken-blue-400 px-4 py-2 text-tekken-blue-400 disabled:opacity-50"
          >
            {readyFile ? "Compartir imagen" : "Preparar para compartir"}
          </button>
        )}
      </div>
      <p role="status" className="mt-2 text-sm text-white/70">
        {busy ? "Preparando…" : status}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warning">
          {error}
        </p>
      )}
    </section>
  );
}
