export default function RankingTableLoading({ temporada }) {
  return (
    <section className="bg-black px-4 pb-16 pt-8 sm:px-8 lg:px-14">
      <div className="mx-auto flex min-h-[420px] max-w-[1240px] flex-col items-center justify-center gap-4 border border-white/[.08] bg-[rgba(3,10,14,.82)] backdrop-blur-[3px]">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-ring-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
          <div className="absolute inset-1.5 animate-ring-spin-rev rounded-full border border-dashed border-tekken-blue-400/30" />
        </div>
        <span className="font-display text-sm tracking-[0.22em] text-white/85">
          CARGANDO TEMPORADA {temporada}&hellip;
        </span>
      </div>
    </section>
  );
}
