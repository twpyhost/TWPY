import Link from "next/link";
import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import { getArchiveEntries } from "@/lib/data";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Archivo comunitario",
  description: "Crónicas, fotos y VODs de la comunidad Tekken Paraguay.",
};
export default async function ArchivePage({ searchParams }) {
  const params = await searchParams;
  const all = await getArchiveEntries();
  const seasons = [...new Set(all.map((e) => e.season))].sort((a, b) =>
    b.localeCompare(a),
  );
  const season = /^\d{4}$/.test(params?.season ?? "") ? params.season : null;
  const entries = season ? all.filter((e) => e.season === season) : all;
  return (
    <>
      <HeroSection className="px-5 py-12 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          <RibbonTag>MEMORIA DE LA COMUNIDAD</RibbonTag>
          <h1 className="mt-4 font-display text-[clamp(56px,8vw,104px)] italic leading-none">
            ARCHIVO
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Las jornadas, las personas y las historias de Tekken Paraguay.
          </p>
        </div>
      </HeroSection>
      <main className="mx-auto w-full max-w-[1240px] px-5 py-10 sm:px-8">
        <nav
          aria-label="Temporadas del archivo"
          className="mb-8 flex flex-wrap gap-3"
        >
          <Link
            href="/archivo"
            aria-current={!season ? "page" : undefined}
            className={!season ? "text-primary-500" : "text-white/70"}
          >
            Todas
          </Link>
          {seasons.map((s) => (
            <Link
              key={s}
              href={`/archivo?season=${s}`}
              aria-current={season === s ? "page" : undefined}
              className={season === s ? "text-primary-500" : "text-white/70"}
            >
              {s}
            </Link>
          ))}
        </nav>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="border border-white/15 bg-white/[.03] p-6"
            >
              <p className="text-sm text-tekken-blue-400">
                {entry.date} · {entry.season}
              </p>
              <h2 className="my-3 break-words font-display text-3xl">
                <Link
                  href={`/archivo/${entry.slug}`}
                  className="hover:text-primary-500"
                >
                  {entry.title}
                </Link>
              </h2>
              <p className="whitespace-pre-wrap break-words text-white/70">
                {entry.recap.slice(0, 180)}
                {entry.recap.length > 180 ? "…" : ""}
              </p>
            </article>
          ))}
        </div>
        {!entries.length && (
          <p className="border border-white/10 p-8 text-white/60">
            Todavía no hay crónicas publicadas para esta selección.
          </p>
        )}
      </main>
    </>
  );
}
