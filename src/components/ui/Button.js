import Link from "next/link";

const BASE =
  "inline-flex items-center justify-center gap-2 border-2 border-transparent font-display italic tracking-[0.06em] transition-[filter,border-color] duration-300";

const VARIANTS = {
  primary:
    "bg-primary-500 text-white shadow-glow-primary hover:border-black hover:brightness-[.8]",
  outline: "border-white/15 bg-white/[.04] text-white hover:bg-white/10",
};

export default function Button({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
