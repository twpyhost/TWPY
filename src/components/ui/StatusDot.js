const TONES = {
  success: {
    border: "border-success/35",
    bg: "bg-success/[.12]",
    text: "text-success",
    dot: "bg-success",
  },
  warning: {
    border: "border-warning/35",
    bg: "bg-warning/[.12]",
    text: "text-warning",
    dot: "bg-warning",
  },
  error: {
    border: "border-error/35",
    bg: "bg-error/[.12]",
    text: "text-error",
    dot: "bg-error",
  },
  neutral: {
    border: "border-white/20",
    bg: "bg-white/[.04]",
    text: "text-white/50",
    dot: "bg-white/40",
  },
};

// Pill con punto de color + label, usado para estados de salud (header del
// panel admin, tarjetas de Sistema). Un solo lugar para el patron
// dot+pill en vez de reimplementarlo por componente.
export default function StatusDot({ tone = "neutral", children, className = "" }) {
  const t = TONES[tone];

  return (
    <span
      className={`flex items-center gap-1.5 whitespace-nowrap border ${t.border} ${t.bg} px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] ${t.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}
