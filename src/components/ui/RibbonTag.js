const VARIANTS = {
  primary: "bg-primary-500 text-white",
  cyan: "bg-tekken-blue-400 text-[#04121a]",
  white: "bg-white text-[#0a0a0a]",
};

export default function RibbonTag({ children, variant = "primary", className = "", style }) {
  return (
    <span
      style={style}
      className={`inline-flex self-start whitespace-nowrap px-5 py-1 font-display text-sm tracking-[0.24em] [clip-path:var(--clip-banner-both)] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
