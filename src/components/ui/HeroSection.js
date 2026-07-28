export default function HeroSection({ children, className = "" }) {
  return (
    <section className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgb(20,44,56)_0%,rgb(6,16,22)_52%,#000_100%)]" />
      <div className="absolute -left-[14%] -top-[32%] h-[110%] w-[58%] animate-glow-pulse rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(245,10,100,.34)_0%,rgba(230,0,0,.1)_46%,transparent_72%)] blur-[10px]" />
      <div className="absolute -right-[16%] -top-[36%] h-[110%] w-[58%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(63,209,231,.3)_0%,rgba(30,120,220,.1)_46%,transparent_72%)] blur-[10px]" />
      <div className="relative z-[2]">{children}</div>
    </section>
  );
}
