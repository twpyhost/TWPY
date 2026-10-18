import CardFrame from "./CardFrame";
import { cardText } from "@/lib/shareCards";

export default function TournamentCard({ data, format }) {
  const portrait = format === "portrait";
  const columns = Math.min(
    portrait ? 2 : 3,
    Math.max(1, Math.ceil(data.podium.length / (portrait ? 7 : 4))),
  );
  const perColumn = Math.max(1, Math.ceil(data.podium.length / columns));
  const dense = perColumn > (portrait ? 7 : 4);
  const fontSize = dense
    ? Math.max(
        8,
        Math.min(22, Math.floor((portrait ? 800 : 260) / perColumn) - 8),
      )
    : portrait
      ? 36
      : 24;
  const columnWidth = Math.floor(
    ((portrait ? 952 : 1112) - 18 * (columns - 1)) / columns,
  );
  const groups = Array.from({ length: columns }, (_, index) =>
    data.podium.slice(index * perColumn, (index + 1) * perColumn),
  );
  return (
    <CardFrame season={data.season} label="PODIO DEL TORNEO" format={format}>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          height: portrait ? 150 : 72,
          fontSize: portrait ? 48 : 32,
          lineHeight: 1.1,
          marginBottom: 10,
          overflowWrap: "break-word",
          lineClamp: 2,
          overflow: "hidden",
        }}
      >
        {cardText(data.title, portrait ? 95 : 65)}
      </div>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          fontSize: 20,
          color: "#ffffff99",
          marginBottom: 14,
        }}
      >
        {data.date?.slice(0, 10)} · {data.participantCount} participantes
      </div>
      <div style={{ display: "flex", flexGrow: 1, gap: 18, paddingBottom: 8 }}>
        {data.podium.length === 0 ? (
          <div style={{ display: "flex", fontSize: 30, color: "#ffffff99" }}>
            Sin posiciones registradas
          </div>
        ) : (
          groups.map((group, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                width: columnWidth,
                gap: dense ? 2 : portrait ? 18 : 8,
              }}
            >
              {group.map((player) => (
                <div
                  key={player.playerId}
                  style={{
                    display: "flex",
                    flexShrink: 0,
                    alignItems: "center",
                    gap: dense ? 6 : 16,
                    borderLeft: "5px solid #F50A64",
                    padding: dense
                      ? "2px 6px"
                      : portrait
                        ? "16px 20px"
                        : "6px 14px",
                    background: "#ffffff0b",
                  }}
                >
                  <span
                    style={{
                      fontSize: dense ? fontSize : portrait ? 42 : 30,
                      color: "#3FD1E7",
                    }}
                  >
                    #{player.placement}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      minWidth: 0,
                      fontSize,
                      overflowWrap: "break-word",
                    }}
                  >
                    <span
                      style={{
                        lineClamp: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {cardText(
                        player.name,
                        columns > 1 ? (dense ? 20 : 30) : 55,
                      )}
                    </span>
                    {!dense && (
                      <span
                        style={{
                          fontSize: 16,
                          color: "#ffffff99",
                          marginTop: 2,
                        }}
                      >
                        {player.points} pts
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </CardFrame>
  );
}
