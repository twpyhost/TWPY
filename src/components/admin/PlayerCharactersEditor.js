"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { TEKKEN_CHARACTERS } from "@/lib/tekkenCharacters";

const FIELD =
  "min-w-0 border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none focus:border-primary-500";

export default function PlayerCharactersEditor({
  playerId,
  metadata,
  onSaved,
}) {
  const [form, setForm] = useState(metadata);
  const [saving, setSaving] = useState(false);
  const updateAccount = (index, change) =>
    setForm((f) => ({
      ...f,
      tekkenAccounts: f.tekkenAccounts.map((a, i) =>
        i === index ? { ...a, ...change } : a,
      ),
    }));
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/jugadores/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileMetadata: form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Personajes y cuentas actualizados");
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-5 border border-white/10 bg-white/[.03] p-5"
    >
      <h2 className="m-0 font-display text-xl">
        Personajes y cuentas de Tekken 8
      </h2>
      <p className="m-0 text-sm text-white/60">
        Información declarada por el jugador, mantenida por el admin. Confirmá
        la identidad antes de vincular una cuenta.
      </p>
      <label className="flex max-w-sm flex-col gap-2 text-sm">
        Main declarado
        <select
          className={FIELD}
          value={form.main ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              main: e.target.value || null,
              secondaries: f.secondaries.filter((k) => k !== e.target.value),
            }))
          }
        >
          <option value="">Por confirmar</option>
          {TEKKEN_CHARACTERS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="mb-3 text-sm text-white/60">Secundarios</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TEKKEN_CHARACTERS.filter((c) => c.key !== form.main).map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary-500"
                checked={form.secondaries.includes(c.key)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    secondaries: e.target.checked
                      ? [...f.secondaries, c.key]
                      : f.secondaries.filter((k) => k !== c.key),
                  }))
                }
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm text-white/60">
          Tekken IDs · privados por defecto
        </legend>
        {form.tekkenAccounts.map((a, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-3 border border-white/10 p-3"
          >
            <label className="flex min-w-0 flex-col gap-1 text-sm">
              Tekken ID {i + 1}
              <input
                required
                className={FIELD}
                value={a.tekkenId}
                onChange={(e) => updateAccount(i, { tekkenId: e.target.value })}
                maxLength={32}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={a.active}
                onChange={(e) => updateAccount(i, { active: e.target.checked })}
              />
              Activa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={a.isPublic}
                onChange={(e) =>
                  updateAccount(i, { isPublic: e.target.checked })
                }
              />
              Mostrar públicamente
            </label>
            <button
              type="button"
              className="text-sm text-primary-500"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  tekkenAccounts: f.tekkenAccounts.filter(
                    (_, index) => index !== i,
                  ),
                }))
              }
              aria-label={`Quitar Tekken ID ${i + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-fit px-4 py-2 text-sm"
          onClick={() =>
            setForm((f) => ({
              ...f,
              tekkenAccounts: [
                ...f.tekkenAccounts,
                { tekkenId: "", active: true, isPublic: false },
              ],
            }))
          }
        >
          AGREGAR TEKKEN ID
        </Button>
      </fieldset>
      <Button
        type="submit"
        disabled={saving}
        className="w-fit px-5 py-3 text-base"
      >
        {saving ? "GUARDANDO..." : "GUARDAR PERSONAJES Y CUENTAS"}
      </Button>
    </form>
  );
}
