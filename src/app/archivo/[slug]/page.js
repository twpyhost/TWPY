import Link from "next/link";
import { notFound } from "next/navigation";
import { getArchiveEntry } from "@/lib/data";
import ArchiveGallery from "@/components/archive/ArchiveGallery";
export const dynamic = "force-dynamic";
export default async function ArchiveDetail({ params }) {
  const { slug } = await params;
  const entry = await getArchiveEntry(slug);
  if (!entry) notFound();
  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8">
      <Link href="/archivo" className="text-primary-500">
        ← Volver al archivo
      </Link>
      <header className="my-10 border-l-4 border-primary-500 pl-5">
        <p className="text-tekken-blue-400">
          {entry.date} · Temporada {entry.season}
        </p>
        <h1 className="mt-3 break-words font-display text-[clamp(40px,6vw,80px)] italic leading-none">
          {entry.title}
        </h1>
      </header>
      <p className="mb-10 max-w-3xl whitespace-pre-wrap break-words leading-relaxed text-white/85">
        {entry.recap}
      </p>
      {entry.tournamentId && (
        <Link
          href={`/torneo-resultado/${entry.tournamentId}`}
          className="mb-8 inline-block text-tekken-blue-400 underline"
        >
          Ver resultados del torneo
        </Link>
      )}
      {!!entry.assets.length && (
        <section aria-label="Galería de fotos">
          <ArchiveGallery assets={entry.assets} />
        </section>
      )}
      {!!entry.vodLinks.length && (
        <section className="mt-12">
          <h2 className="font-display text-3xl">VODs</h2>
          <p className="my-3 text-sm text-white/60">
            Videos alojados por terceros. Si un video no está disponible, su
            proveedor puede haberlo retirado.
          </p>
          <ul className="flex flex-wrap gap-4">
            {entry.vodLinks.map((url, i) => (
              <li key={`${i}-${url}`}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tekken-blue-400 underline"
                >
                  Ver VOD {i + 1}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
