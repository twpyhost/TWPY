import Image from "next/image";
import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import { getTekkenCharacter } from "@/lib/tekkenCharacters";
import PlayerAvatar from "./PlayerAvatar";

export default function PlayerSummary({ profile }) {
  const main = getTekkenCharacter(profile.main);
  return (
    <HeroSection className="px-5 pb-10 pt-12 motion-reduce:animate-none motion-reduce:[&_*]:animate-none sm:px-8 lg:px-14 lg:pt-20">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        <RibbonTag>{`COMPETIDOR · TEMPORADA ${profile.season}`}</RibbonTag>
        <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[96px_minmax(0,1fr)_128px] sm:gap-5">
          <PlayerAvatar
            key={profile.avatarUrl}
            url={profile.avatarUrl}
            name={profile.displayName}
          />
          <div className="min-w-0">
            <h1 className="m-0 break-words font-display text-[clamp(42px,7vw,92px)] italic leading-[.95] [overflow-wrap:anywhere]">
              {profile.displayName}
            </h1>
            <p className="mb-0 mt-3 text-white/70">
              {main ? `Main declarado: ${main.name}` : "Main por confirmar"}
            </p>
          </div>
          {main && (
            <Image
              src={main.portrait}
              alt={main.name}
              width={128}
              height={128}
              className="col-start-2 h-24 w-24 object-cover sm:col-start-auto sm:h-32 sm:w-32"
            />
          )}
        </div>
        {profile.secondaries.length > 0 && (
          <p className="m-0 text-sm text-white/60">
            Secundarios:{" "}
            {profile.secondaries
              .map((key) => getTekkenCharacter(key)?.name ?? key)
              .join(" · ")}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            [
              "Posición anual",
              profile.position == null ? "S/R" : `#${profile.position}`,
            ],
            ["Puntos", profile.points ?? "—"],
            ["Torneos", profile.tournamentCount],
            ["Títulos", profile.titles],
            ["Podios", profile.podiums],
          ].map(([label, value]) => (
            <div key={label} className="border-l-[3px] border-primary-500 pl-4">
              <dt className="text-sm text-white/60">{label}</dt>
              <dd className="m-0 mt-1 font-display text-4xl text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {profile.publicTekkenIds.length > 0 && (
          <p className="m-0 break-words text-sm text-white/60">
            Tekken IDs públicos: {profile.publicTekkenIds.join(" · ")}
          </p>
        )}
      </div>
    </HeroSection>
  );
}
