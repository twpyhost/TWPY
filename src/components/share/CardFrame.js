export default function CardFrame({ children, season, label, format }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: format === "portrait" ? 64 : 44,
        background: "linear-gradient(135deg, #071a23, #000000 70%)",
        color: "white",
        fontFamily: "Geist",
        borderTop: "14px solid #F50A64",
      }}
    >
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          fontSize: 24,
          color: "#3FD1E7",
        }}
      >
        <span>TWPY · TEKKEN 8</span>
        <span>{season}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          fontSize: 20,
          letterSpacing: 3,
          color: "#F50A64",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          justifyContent: "space-between",
          borderTop: "1px solid #ffffff40",
          paddingTop: 16,
          marginTop: "auto",
          fontSize: 18,
          color: "#ffffff99",
        }}
      >
        <span>Tekken Warriors Paraguay</span>
        <span>Resultados oficiales · TWPY</span>
      </div>
    </div>
  );
}
