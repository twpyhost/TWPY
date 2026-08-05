import torneos from "@/torneos.json" with { type: "json" };
import resultado from "@/resultado.json" with { type: "json" };
import liga from "@/liga.json" with { type: "json" };

import { getMovimiento } from "./movimiento";
import { armarLiga } from "@/lib/ligaData";

const getTorneos = async () => {
  return torneos.map((torneo) => {
    const fecha_torneo = torneo.fecha;

    return {
      torneo_id: torneo.id,
      nombre_torneo: torneo.nombre,
      fecha_torneo,
      temporada: fecha_torneo.split("-")[0],
      url_challonge: torneo.url_challonge ?? null,
    };
  });
};

const getTorneoResultados = async (torneoId) => {
  const torneo = resultado.torneos.find((item) => item.id === String(torneoId));

  if (!torneo) {
    return null;
  }

  return torneo.competidores.map((competidor) => ({
    torneo: {
      nombre_torneo: torneo.nombre,
    },
    jugador: {
      id: competidor.id,
      nombre: competidor.name,
    },
    posicion: competidor.position,
    puntaje: competidor.score,
  }));
};

const getCompetidores = async () => {
  const competidores = new Map();

  resultado.torneos.forEach((torneo) => {
    torneo.competidores.forEach((competidor) => {
      competidores.set(competidor.id, {
        id: competidor.id,
        nombre: competidor.name,
      });
    });
  });

  return [...competidores.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );
};

const getRankings = async (temporada) => {
  const torneosTemporada = temporada
    ? torneos.filter((torneo) => torneo.fecha.split("-")[0] === temporada)
    : torneos;
  const idsTemporada = new Set(torneosTemporada.map((torneo) => torneo.id));

  const totals = new Map();
  const previousTotals = new Map();
  const latestTournamentId = [...torneosTemporada].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  )[0]?.id;

  resultado.torneos
    .filter((torneo) => idsTemporada.has(torneo.id))
    .forEach((torneo) => {
      torneo.competidores.forEach((competidor) => {
        const current = totals.get(competidor.id) || {
          id: competidor.id,
          nombre: competidor.name,
          puntaje: 0,
        };

        current.puntaje += competidor.score;
        totals.set(competidor.id, current);

        if (torneo.id !== latestTournamentId) {
          const previous = previousTotals.get(competidor.id) || {
            id: competidor.id,
            nombre: competidor.name,
            puntaje: 0,
          };

          previous.puntaje += competidor.score;
          previousTotals.set(competidor.id, previous);
        }
      });
    });

  const rankings = buildRanking(totals);
  const previousRankings = buildRanking(previousTotals);

  return rankings.map((ranking) => {
    const previous = previousRankings.find((item) => item.id === ranking.id);

    return {
      ...ranking,
      movimiento: getMovimiento(ranking.posicion, previous?.posicion),
    };
  });
};

const getRankingsCount = async (temporada) => {
  const rankings = await getRankings(temporada);
  return rankings.length;
};

const getFiltroAno = async () => {
  const years = torneos.map((torneo) => torneo.fecha.split("-")[0]);
  return [...new Set(years)].sort((a, b) => b.localeCompare(a));
};

const getLiga = async (slug) => {
  if (liga.liga.slug !== slug) {
    return null;
  }

  return armarLiga(liga);
};

export {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
  getRankingsCount,
  getLiga,
};

function buildRanking(totals) {
  return [...totals.values()]
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((competidor, index) => ({
      id: competidor.id,
      posicion: index + 1,
      nombre: competidor.nombre,
      puntaje: competidor.puntaje,
    }));
}
