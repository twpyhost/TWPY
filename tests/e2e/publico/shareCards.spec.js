import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { getServiceClient } from "../../testSupabase.js";
import {
  TEMPORADA_ACTUAL,
  TORNEO_ACTUAL,
  nombreJugador,
} from "../fixtures/datos.js";

test("PNG de torneo y jugador en ambos formatos con cabeceras y limites", async ({
  request,
}) => {
  const db = getServiceClient();
  const player = (
    await db
      .from("players")
      .select("id")
      .eq("display_name", nombreJugador(1))
      .single()
      .throwOnError()
  ).data;
  const old = (
    await db
      .from("players")
      .select("avatar_url")
      .eq("id", player.id)
      .single()
      .throwOnError()
  ).data;
  try {
    await db
      .from("players")
      .update({ avatar_url: "https://127.0.0.1:1/never-fetch" })
      .eq("id", player.id)
      .throwOnError();
    for (const [type, id, year] of [
      ["torneos", TORNEO_ACTUAL, ""],
      ["jugadores", player.id, `&year=${TEMPORADA_ACTUAL}`],
    ]) {
      for (const [format, width, height] of [
        ["landscape", 1200, 630],
        ["portrait", 1080, 1350],
      ]) {
        const response = await request.get(
          `/api/cards/${type}/${id}?format=${format}${year}`,
        );
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toBe("image/png");
        expect(response.headers()["content-disposition"]).toContain(".png");
        const bytes = await response.body();
        expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        expect(bytes.readUInt32BE(16)).toBe(width);
        expect(bytes.readUInt32BE(20)).toBe(height);
        await writeFile(`.superpowers/card-${type}-${format}.png`, bytes);
      }
    }
    expect(
      (
        await request.get(
          `/api/cards/torneos/${TORNEO_ACTUAL}?format=unbounded`,
        )
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.get(
          `/api/cards/torneos/${TORNEO_ACTUAL}?avatar=https://example.com`,
        )
      ).status(),
    ).toBe(400);
    expect((await request.get("/api/cards/torneos/bad")).status()).toBe(400);
    expect(
      (await request.get("/api/cards/torneos/9223372036854775807")).status(),
    ).toBe(404);
    expect(
      (
        await request.get(`/api/cards/jugadores/${player.id}?year=1900`)
      ).status(),
    ).toBe(404);
  } finally {
    await db
      .from("players")
      .update({ avatar_url: old.avatar_url })
      .eq("id", player.id)
      .throwOnError();
  }
});

test("descarga y copia funcionan sin compartir nativo; errores permiten reintentar", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto(`/torneo-resultado/${TORNEO_ACTUAL}`);
  await page.getByRole("button", { name: "Copiar enlace" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Enlace copiado" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    `/torneo-resultado/${TORNEO_ACTUAL}`,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^twpy-torneo-.*landscape\.png$/,
  );
  await expect(
    page.getByRole("button", { name: "Compartir imagen", exact: true }),
  ).toHaveCount(0);
  await page.route("**/api/cards/**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.getByRole("button", { name: "Descargar PNG" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "No se pudo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar PNG" }),
  ).toBeEnabled();
  await page.unrouteAll({ behavior: "wait" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("region", { name: "Compartir resultados" }).screenshot({
    path: ".superpowers/share-controls-mobile.png",
    animations: "disabled",
  });
});

test("correcciones invalidan la version; nombres largos y podios empatados conservan PNG valido", async ({
  request,
}) => {
  const db = getServiceClient();
  const player = (
    await db
      .from("players")
      .select("id,display_name")
      .eq("display_name", nombreJugador(1))
      .single()
      .throwOnError()
  ).data;
  const fourth = (
    await db
      .from("players")
      .select("id")
      .eq("display_name", nombreJugador(4))
      .single()
      .throwOnError()
  ).data;
  const tournament = (
    await db
      .from("torneos")
      .select("nombre")
      .eq("id", TORNEO_ACTUAL)
      .single()
      .throwOnError()
  ).data;
  const raw = (
    await db
      .from("tournament_participants_raw")
      .select("id,posicion")
      .eq("torneo_id", TORNEO_ACTUAL)
      .eq("player_id", fourth.id)
      .single()
      .throwOnError()
  ).data;
  const path = `/api/cards/torneos/${TORNEO_ACTUAL}?format=landscape`;
  const before = await request.get(path);
  const etag = before.headers().etag;
  expect(
    (await request.get(path, { headers: { "if-none-match": etag } })).status(),
  ).toBe(304);
  try {
    await db
      .from("players")
      .update({ display_name: "Álex Ñandú 🐉 漢字 · ".repeat(18) })
      .eq("id", player.id)
      .throwOnError();
    await db
      .from("torneos")
      .update({ nombre: "Gran final Ñandutí · ".repeat(8) })
      .eq("id", TORNEO_ACTUAL)
      .throwOnError();
    await db
      .from("tournament_participants_raw")
      .update({ posicion: 3 })
      .eq("id", raw.id)
      .throwOnError();
    const changed = await request.get(path, {
      headers: { "if-none-match": etag },
    });
    expect(changed.status()).toBe(200);
    expect(changed.headers().etag).not.toBe(etag);
    for (const format of ["landscape", "portrait"]) {
      const tied = await request.get(
        `/api/cards/torneos/${TORNEO_ACTUAL}?format=${format}`,
      );
      const long = await request.get(
        `/api/cards/jugadores/${player.id}?format=${format}&year=${TEMPORADA_ACTUAL}`,
      );
      expect(tied.status()).toBe(200);
      expect(long.status()).toBe(200);
      await writeFile(
        `.superpowers/card-tied-${format}.png`,
        await tied.body(),
      );
      await writeFile(
        `.superpowers/card-long-player-${format}.png`,
        await long.body(),
      );
    }
  } finally {
    await db
      .from("players")
      .update({ display_name: player.display_name })
      .eq("id", player.id)
      .throwOnError();
    await db
      .from("torneos")
      .update({ nombre: tournament.nombre })
      .eq("id", TORNEO_ACTUAL)
      .throwOnError();
    await db
      .from("tournament_participants_raw")
      .update({ posicion: raw.posicion })
      .eq("id", raw.id)
      .throwOnError();
  }
});

test("cancelar compartir nativo no anuncia exito", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new DOMException("Cancelado", "AbortError");
      },
      configurable: true,
    });
  });
  await page.goto(`/torneo-resultado/${TORNEO_ACTUAL}`);
  await page.getByRole("button", { name: "Preparar para compartir" }).click();
  await page
    .getByRole("button", { name: "Compartir imagen", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Compartir cancelado" }),
  ).toBeVisible();
  await expect(
    page.getByText("Imagen compartida", { exact: true }),
  ).toHaveCount(0);
});

test("prepara el archivo antes de pedir un nuevo clic para compartir", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let gesture = false;
    document.addEventListener(
      "click",
      () => {
        gesture = true;
      },
      true,
    );
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      gesture = false;
      return response;
    };
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async () => {
        if (!gesture)
          throw new DOMException("Gesto vencido", "NotAllowedError");
        window.sharedWithGesture = true;
      },
      configurable: true,
    });
  });
  await page.goto(`/torneo-resultado/${TORNEO_ACTUAL}`);
  await page
    .getByRole("button", { name: /Preparar para compartir|Compartir imagen/ })
    .click();
  await expect(page.getByRole("status")).toContainText("Imagen lista");
  await page
    .getByRole("button", { name: "Compartir imagen", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Imagen compartida");
  expect(await page.evaluate(() => window.sharedWithGesture)).toBe(true);
});

test("rechazo nativo conserva descarga y enlace como alternativas", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new DOMException("Denegado", "NotAllowedError");
      },
      configurable: true,
    });
  });
  await page.goto(`/torneo-resultado/${TORNEO_ACTUAL}`);
  await page.getByRole("button", { name: "Preparar para compartir" }).click();
  await page
    .getByRole("button", { name: "Compartir imagen", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Compartir resultados" })
      .getByRole("alert"),
  ).toContainText("No se pudo");
  await expect(
    page.getByRole("button", { name: "Descargar PNG" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Copiar enlace" }),
  ).toBeEnabled();
});

test("IDs bigint, torneo vacio y jugador sin ranking producen tarjetas sin inventar podios", async ({
  request,
}) => {
  const db = getServiceClient();
  const id = "9223372036854775806";
  const game = (
    await db
      .from("juegos")
      .select("id")
      .ilike("nombre", "Tekken 8")
      .single()
      .throwOnError()
  ).data;
  let player;
  try {
    player = (
      await db
        .from("players")
        .insert({ display_name: "Jugador sin ranking Ñ" })
        .select("id")
        .single()
        .throwOnError()
    ).data;
    await db
      .from("torneos")
      .insert({
        id,
        nombre: "Torneo sin resultados",
        fecha_inicio: "2086-01-01",
        temporada: TEMPORADA_ACTUAL,
        juego_id: game.id,
      })
      .throwOnError();
    for (const format of ["landscape", "portrait"]) {
      const empty = await request.get(
        `/api/cards/torneos/${id}?format=${format}`,
      );
      expect(empty.status()).toBe(200);
      await writeFile(
        `.superpowers/card-empty-${format}.png`,
        await empty.body(),
      );
      const unranked = await request.get(
        `/api/cards/jugadores/${player.id}?year=${TEMPORADA_ACTUAL}&format=${format}`,
      );
      expect(unranked.status()).toBe(200);
      await writeFile(
        `.superpowers/card-unranked-${format}.png`,
        await unranked.body(),
      );
    }
  } finally {
    await db.from("torneos").delete().eq("id", id).throwOnError();
    if (player)
      await db.from("players").delete().eq("id", player.id).throwOnError();
  }
});
