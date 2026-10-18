import CardFrame from "./CardFrame";
import { cardText } from "@/lib/shareCards";

export default function PlayerSeasonCard({ data, format }) {
  const portrait = format === "portrait";
  return (
    <CardFrame
      season={data.season}
      label="RESUMEN DE TEMPORADA"
      format={format}
    >
      <div
        style={{
          display: "flex",
          fontSize: portrait ? 68 : 46,
          lineHeight: 1.12,
          marginBottom: portrait ? 42 : 24,
          overflowWrap: "break-word",
        }}
      >
        {cardText(data.name, portrait ? 110 : 90)}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: portrait ? "column" : "row",
          gap: portrait ? 36 : 70,
          marginBottom: 32,
        }}
      >
        <Stat
          label="POSICIÓN ANUAL"
          value={data.position == null ? "Sin ranking" : `#${data.position}`}
          large={portrait}
        />
        <Stat
          label="PUNTOS"
          value={data.points ?? "Sin datos"}
          large={portrait}
        />
      </div>
      <div style={{ display: "flex", gap: 45, paddingBottom: 30 }}>
        <Stat label="TORNEOS" value={data.tournamentCount} />
        <Stat label="TÍTULOS" value={data.titles} />
        <Stat label="PODIOS" value={data.podiums} />
      </div>
    </CardFrame>
  );
}

function Stat({ label, value, large }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderLeft: "4px solid #F50A64",
        paddingLeft: 18,
      }}
    >
      <span style={{ fontSize: large ? 72 : 42, color: "#3FD1E7" }}>
        {value}
      </span>
      <span style={{ fontSize: 17, color: "#ffffff99", marginTop: 8 }}>
        {label}
      </span>
    </div>
  );
}
