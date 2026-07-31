import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";

import {
  extractTournamentId,
  fetchChallongeApi,
  listarTorneos,
} from "../../src/lib/challonge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre) {
  const contenido = fs.readFileSync(
    path.join(__dirname, "..", "fixtures", nombre),
    "utf-8",
  );
  return JSON.parse(contenido);
}

test.describe("extractTournamentId", () => {
  test("challonge.com/slug", () => {
    expect(extractTournamentId("https://challonge.com/abc123")).toBe("abc123");
  });

  test("challonge.com/es/slug (prefijo de idioma)", () => {
    expect(extractTournamentId("https://challonge.com/es/abc123")).toBe(
      "abc123",
    );
  });

  test("subdominio de organizacion", () => {
    expect(extractTournamentId("https://twpy.challonge.com/abc123")).toBe(
      "twpy-abc123",
    );
  });

  test("subdominios reservados no se tratan como organizacion", () => {
    expect(extractTournamentId("https://www.challonge.com/abc123")).toBe(
      "abc123",
    );
    expect(extractTournamentId("https://api.challonge.com/abc123")).toBe(
      "abc123",
    );
    expect(extractTournamentId("https://images.challonge.com/abc123")).toBe(
      "abc123",
    );
  });

  test("URL invalida devuelve null", () => {
    expect(extractTournamentId("https://example.com/abc123")).toBeNull();
    expect(extractTournamentId("esto no es una url")).toBeNull();
  });
});

// Mockea global.fetch por URL para probar la normalizacion de las
// respuestas JSON:API de v2.1 sin pegarle a la API real. Los fixtures son
// respuestas reales capturadas contra un torneo TWPY real (18177414),
// recortadas a los campos relevantes.
test.describe("fetchChallongeApi / listarTorneos (normalizacion v2.1)", () => {
  let fetchOriginal;

  test.beforeEach(() => {
    fetchOriginal = global.fetch;
  });

  test.afterEach(() => {
    global.fetch = fetchOriginal;
  });

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status });
  }

  test("normaliza torneo + participantes paginados a la forma plana de v1", async () => {
    const tournament = cargarFixture("challonge-v2-tournament.json");
    const page1 = cargarFixture("challonge-v2-participants-page1.json");
    const page2 = cargarFixture("challonge-v2-participants-page2.json");

    global.fetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/participants.json")) {
        return jsonResponse(urlStr.includes("page=2") ? page2 : page1);
      }
      if (urlStr.includes("/tournaments/18177414.json")) {
        return jsonResponse(tournament);
      }
      throw new Error(`URL inesperada en el test: ${urlStr}`);
    };

    const res = await fetchChallongeApi(18177414, "B");
    expect(res.ok).toBe(true);

    const { tournament: torneo } = await res.json();

    // El id numerico y el estado de v2.1 deben mapear igual que v1.
    expect(torneo.id).toBe(18177414);
    expect(typeof torneo.id).toBe("number");
    expect(torneo.state).toBe("complete");
    expect(torneo.full_challonge_url).toBe("https://challonge.com/es/aaj751rp");
    expect(torneo.started_at).toBe("2026-07-12T18:32:46.077Z");

    // Se juntaron las 3 paginas de participantes (2 + 1).
    expect(torneo.participants).toHaveLength(3);

    const conCuenta = torneo.participants.find(
      (p) => p.participant.challonge_username === "COLORADOGAMARRA",
    );
    expect(conCuenta.participant.challonge_user_id).toBe(7097109);
    expect(typeof conCuenta.participant.challonge_user_id).toBe("number");

    // Participante sin cuenta de Challonge vinculada: relationships.user
    // ausente -> challonge_user_id null (no romper la resolucion de
    // identidad tratandolo como un id valido).
    const sinCuenta = torneo.participants.find(
      (p) => p.participant.display_name === "Ippo",
    );
    expect(sinCuenta.participant.challonge_user_id).toBeNull();
    expect(sinCuenta.participant.challonge_username).toBeNull();
  });

  test("propaga errores no-2xx del detalle de torneo sin tocar participants", async () => {
    global.fetch = async (url) => {
      if (String(url).includes("/tournaments/999.json")) {
        return new Response("Tournament with ID or URL 999 does not exist", {
          status: 404,
        });
      }
      throw new Error("no deberia pedir participants si el torneo no existe");
    };

    const res = await fetchChallongeApi(999, "B");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  test("listarTorneos normaliza la lista y se detiene sin depender de links.next", async () => {
    const listado = cargarFixture("challonge-v2-tournaments-list.json");
    let llamadas = 0;

    global.fetch = async (url) => {
      llamadas += 1;
      // Sin meta.count, la condicion de corte es data.length === 0 en la
      // pagina siguiente -- Challonge siempre manda links.next aunque no
      // haya mas datos, asi que confiar en ese link causaria un loop
      // infinito (ver bug real encontrado al verificar esto en vivo).
      if (String(url).includes("page=2")) {
        return jsonResponse({ data: [] });
      }
      return jsonResponse(listado);
    };

    const res = await listarTorneos("B");
    expect(res.ok).toBe(true);

    const torneos = await res.json();
    expect(torneos).toHaveLength(2);
    expect(torneos[0].tournament.id).toBe(18177414);
    expect(typeof torneos[0].tournament.id).toBe("number");
    expect(torneos[1].tournament.state).toBe("pending");
    expect(llamadas).toBe(2);
  });
});
