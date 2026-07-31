const TONES = {
  primary: "border-primary-500/50 bg-primary-500/10 text-primary-500",
  cyan: "border-tekken-blue-400/40 bg-tekken-blue-400/10 text-tekken-blue-400",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  error: "border-error/40 bg-error/10 text-error",
  neutral: "border-white/20 bg-white/[.04] text-white/60",
};

// Badge con el motivo de "cinta diagonal" del design system (clip-banner-right),
// usado para status pills / conteos / badges de cuenta en toda la seccion admin.
export default function StatusChip({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-3 py-1 font-display text-[11px] font-bold tracking-[0.07em] [clip-path:var(--clip-banner-right)] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
