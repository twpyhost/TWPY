"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
const empty = () => ({
  title: "",
  slug: "",
  recap: "",
  season: new Date().getFullYear(),
  date: new Date().toISOString().slice(0, 10),
  status: "draft",
  tournament_id: "",
  vod_links: [],
  assets: [],
});
const field =
  "mt-1 w-full rounded border border-white/20 bg-black p-2 text-white disabled:text-white/40";
const button =
  "rounded border border-white/25 px-4 py-2 hover:border-primary-500 disabled:opacity-40";
async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? "No se pudo completar la acción");
  return body;
}
export default function Archivo() {
  const [list, setList] = useState([]),
    [entry, setEntry] = useState(null),
    [usage, setUsage] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState(""),
    [credit, setCredit] = useState(""),
    [file, setFile] = useState(null);
  async function load() {
    const data = await api("/api/admin/archivo");
    setList(data.entries);
    setUsage(data.usedBytes);
  }
  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);
  const update = (name, value) =>
    setEntry((current) => ({ ...current, [name]: value }));
  async function action(work, success) {
    setBusy(true);
    setMessage("");
    try {
      await work();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id) {
    setEntry(await api(`/api/admin/archivo/${id}`));
  }
  async function save(status, success) {
    await action(async () => {
      const body = {
        ...entry,
        status,
        tournament_id: entry.tournament_id || null,
        vod_links: entry.vod_links.map((url) => url.trim()).filter(Boolean),
      };
      const row = await api(
        `/api/admin/archivo${entry.id ? `/${entry.id}` : ""}`,
        {
          method: entry.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      await open(row.id);
    }, success);
  }
  async function media(method, body) {
    await api(`/api/admin/archivo/${entry.id}/media`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await open(entry.id);
  }
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="font-display text-4xl">Archivo comunitario</h1>
      <p className="my-3 text-sm text-white/65">
        Medios: {(usage / 1048576).toFixed(2)} / 100 MiB · JPEG, PNG y WebP,
        hasta 2 MiB por foto.
      </p>
      <p
        role="status"
        aria-live="polite"
        className="my-4 min-h-6 text-tekken-blue-400"
      >
        {message}
      </p>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <button
            className={`${button} mb-4 w-full`}
            disabled={busy}
            onClick={() => {
              setEntry(empty());
              setMessage("");
            }}
          >
            Nueva crónica
          </button>
          <ul className="space-y-2">
            {list.map((row) => (
              <li key={row.id}>
                <button
                  disabled={busy}
                  className="w-full break-words border-b border-white/15 py-3 text-left hover:text-primary-500"
                  onClick={() => action(() => open(row.id), "")}
                >
                  {row.title}
                  <span className="block text-xs text-white/50">
                    {row.status === "published" ? "Publicado" : "Borrador"} ·{" "}
                    {row.season}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        {entry && (
          <div className="min-w-0">
            <fieldset disabled={busy} className="space-y-4">
              <label className="block">
                Título
                <input
                  className={field}
                  value={entry.title}
                  maxLength={160}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label className="block">
                URL
                <input
                  className={field}
                  value={entry.slug}
                  maxLength={100}
                  disabled={entry.ever_published}
                  onChange={(e) => update("slug", e.target.value)}
                />
              </label>
              <p className="text-xs text-white/60">
                La URL queda fija después de la primera publicación.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  Temporada
                  <input
                    className={field}
                    type="number"
                    min="1000"
                    max="9999"
                    value={entry.season}
                    onChange={(e) => update("season", e.target.value)}
                  />
                </label>
                <label>
                  Fecha
                  <input
                    className={field}
                    type="date"
                    value={entry.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                </label>
              </div>
              <label className="block">
                Crónica
                <textarea
                  className={field}
                  rows={9}
                  maxLength={20000}
                  value={entry.recap}
                  onChange={(e) => update("recap", e.target.value)}
                />
              </label>
              <label className="block">
                ID de torneo (opcional)
                <input
                  className={field}
                  inputMode="numeric"
                  value={entry.tournament_id ?? ""}
                  onChange={(e) => update("tournament_id", e.target.value)}
                />
              </label>
              <label className="block">
                VODs (un enlace HTTPS por línea)
                <textarea
                  className={field}
                  rows={3}
                  value={entry.vod_links.join("\n")}
                  onChange={(e) =>
                    update("vod_links", e.target.value.split("\n"))
                  }
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className={button}
                  onClick={() => save(entry.status, "Guardado")}
                >
                  {entry.status === "published"
                    ? "Guardar cambios"
                    : "Guardar borrador"}
                </button>
                {entry.status === "published" ? (
                  <button
                    className={button}
                    onClick={() => save("draft", "Retirado")}
                  >
                    Retirar publicación
                  </button>
                ) : (
                  <button
                    className={`${button} border-primary-500`}
                    onClick={() => save("published", "Publicado")}
                  >
                    Publicar
                  </button>
                )}
                {entry.id && (
                  <Link
                    className={`${button} text-tekken-blue-400`}
                    href={`/archivo/${entry.slug}`}
                  >
                    Ver página pública
                  </Link>
                )}
              </div>
            </fieldset>
            <p className="my-5 text-sm text-white/60">
              Al retirar una publicación se bloquean nuevas visitas y firmas.
              Las URLs de fotos ya emitidas pueden seguir vigentes hasta 15
              minutos.
            </p>
            {entry.id ? (
              <section className="mt-8 border-t border-white/20 pt-6">
                <h2 className="font-display text-2xl">Fotos y créditos</h2>
                <p className="mb-4 text-sm text-white/60">
                  Cada foto publicada necesita leyenda y crédito. Usá fotos con
                  permiso de sus autores.
                </p>
                <div className="space-y-6">
                  {entry.assets.map((a, index) => (
                    <div key={a.id} className="border border-white/15 p-4">
                      {a.url && (
                        // Signed draft URLs must bypass the persistent image cache.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.url}
                          alt={a.caption || "Vista previa"}
                          className="mb-3 h-32 max-w-full object-contain"
                        />
                      )}
                      <label className="block">
                        Leyenda
                        <input
                          className={field}
                          maxLength={500}
                          value={a.caption}
                          onChange={(e) =>
                            update(
                              "assets",
                              entry.assets.map((row) =>
                                row.id === a.id
                                  ? { ...row, caption: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="my-3 block">
                        Crédito
                        <input
                          className={field}
                          maxLength={200}
                          value={a.credit}
                          onChange={(e) =>
                            update(
                              "assets",
                              entry.assets.map((row) =>
                                row.id === a.id
                                  ? { ...row, credit: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() =>
                            action(
                              () =>
                                media("PATCH", {
                                  id: a.id,
                                  caption: a.caption,
                                  credit: a.credit,
                                }),
                              "Crédito guardado",
                            )
                          }
                        >
                          Guardar leyenda y crédito
                        </button>
                        <button
                          disabled={busy || index === 0}
                          className={button}
                          onClick={() =>
                            action(async () => {
                              const ids = entry.assets.map((row) => row.id);
                              [ids[index - 1], ids[index]] = [
                                ids[index],
                                ids[index - 1],
                              ];
                              await media("PATCH", { order: ids });
                            }, "Orden guardado")
                          }
                        >
                          Subir posición
                        </button>
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() =>
                            action(
                              () => media("DELETE", { id: a.id }),
                              "Foto retirada",
                            )
                          }
                        >
                          Retirar foto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <fieldset disabled={busy} className="mt-6 space-y-3">
                  <label className="block">
                    Imagen
                    <input
                      className={field}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label className="block">
                    Leyenda de nueva foto
                    <input
                      className={field}
                      maxLength={500}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    Crédito de nueva foto
                    <input
                      className={field}
                      maxLength={200}
                      value={credit}
                      onChange={(e) => setCredit(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={!file || busy}
                    className={button}
                    onClick={() =>
                      action(async () => {
                        const data = new FormData();
                        data.set("file", file);
                        data.set("caption", caption);
                        data.set("credit", credit);
                        await api(`/api/admin/archivo/${entry.id}/media`, {
                          method: "POST",
                          body: data,
                        });
                        setCaption("");
                        setCredit("");
                        await open(entry.id);
                      }, "Foto guardada")
                    }
                  >
                    Subir foto
                  </button>
                </fieldset>
              </section>
            ) : (
              <p className="text-white/60">
                Guardá el borrador para agregar fotos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
