import torneos from "@/torneos.json";
import resultado from "@/resultado.json";

const getTorneos = async () => {
  return torneos.map((torneo) => {
    const fecha_torneo = torneo.fecha;

    return {
      torneo_id: torneo.id,
      nombre_torneo: torneo.nombre,
      fecha_torneo,
      temporada: fecha_torneo.split("-")[0],
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
    usuario: {
      challonge_username: competidor.name,
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
        challonge_username: competidor.name,
      });
    });
  });

  return [...competidores.values()].sort((a, b) =>
    a.challonge_username.localeCompare(b.challonge_username),
  );
};

const getRankings = async () => {
  const totals = new Map();
  const previousTotals = new Map();
  const latestTournamentId = [...torneos].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  )[0]?.id;

  resultado.torneos.forEach((torneo) => {
    torneo.competidores.forEach((competidor) => {
      const current = totals.get(competidor.id) || {
        challonge_username: competidor.name,
        puntaje: 0,
      };

      current.puntaje += competidor.score;
      totals.set(competidor.id, current);

      if (torneo.id !== latestTournamentId) {
        const previous = previousTotals.get(competidor.id) || {
          challonge_username: competidor.name,
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
    const previous = previousRankings.find(
      (item) => item.challonge_username === ranking.challonge_username,
    );

    return {
      ...ranking,
      movimiento: getMovimiento(ranking.posicion, previous?.posicion),
    };
  });
};

const getFiltroAno = async () => {
  const years = torneos.map((torneo) => torneo.fecha.split("-")[0]);
  return [...new Set(years)].sort((a, b) => b.localeCompare(a));
};

export {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
};

function buildRanking(totals) {
  return [...totals.values()]
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((competidor, index) => ({
      posicion: index + 1,
      challonge_username: competidor.challonge_username,
      puntaje: competidor.puntaje,
    }));
}

function getMovimiento(currentPosition, previousPosition) {
  if (!previousPosition) {
    return "NUEVO";
  }

  if (currentPosition < previousPosition) {
    return "SUBE";
  }

  if (currentPosition > previousPosition) {
    return "BAJA";
  }

  return "IGUAL";
}
