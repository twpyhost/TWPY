import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getPlayerProfile,
  getPublicPlayerTarget,
  getFiltroAno,
  getPlayerRankingHistory,
  getRankingCuts,
} from "@/lib/data";
import PlayerSummary from "@/components/players/PlayerSummary";
import PlayerResults from "@/components/players/PlayerResults";
import RankingTimeline from "@/components/players/RankingTimeline";
import ShareResults from "@/components/share/ShareResults";

export const revalidate = 60;

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const { year } = await searchParams;
  const profile = await getPlayerProfile(id, year);
  return profile
    ? {
        title: profile.displayName,
        description: `Perfil y resultados de ${profile.displayName} en Tekken Warriors Paraguay.`,
        alternates: { canonical: `/competidores/${profile.id}` },
        openGraph: { images: [{ url: `/api/cards/jugadores/${profile.id}?year=${profile.season}&format=landscape`, width: 1200, height: 630 }] },
      }
    : { title: "Competidor" };
}

export default async function PlayerProfilePage({ params, searchParams }) {
  const { id } = await params;
  const { year } = await searchParams;
  const canonical = await getPublicPlayerTarget(id);
  if (!canonical) notFound();
  if (canonical !== id)
    permanentRedirect(
      `/competidores/${canonical}${typeof year === "string" && /^\d{4}$/.test(year) ? `?year=${year}` : ""}`,
    );
  const [profile, years] = await Promise.all([
    getPlayerProfile(id, year),
    getFiltroAno(),
  ]);
  if (!profile) notFound();
  const [series, cuts] = await Promise.all([
    getPlayerRankingHistory(id, profile.season), getRankingCuts(profile.season),
  ]);
  return (
    <>
      <PlayerSummary profile={profile} />
      <div className="bg-black px-5 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
          <nav
            aria-label="Temporadas del jugador"
            className="flex flex-wrap gap-2"
          >
            {years.map((season) => (
              <Link
                key={season}
                href={`/competidores/${id}?year=${season}`}
                aria-current={season === profile.season ? "page" : undefined}
                className={`border px-4 py-2 font-display ${season === profile.season ? "border-primary-500 bg-primary-500" : "border-white/20 text-white/70 hover:border-primary-500"}`}
              >
                {season}
              </Link>
            ))}
          </nav>
          <PlayerResults results={profile.results} />
          <RankingTimeline series={series} year={profile.season} cuts={cuts} />
          <ShareResults resourceType="jugador" resourceId={profile.id} year={profile.season} />
          <Link
            href="/competidores"
            className="w-fit font-display text-lg text-tekken-blue-400"
          >
            ← VOLVER A COMPETIDORES
          </Link>
        </div>
      </div>
    </>
  );
}
