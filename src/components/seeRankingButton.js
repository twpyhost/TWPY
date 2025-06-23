import Link from "next/link";

export default function SeeRankingButton() {
  return (
    <Link
      href={"/ranking"}
      className="clip-path-cta mt-8 w-[200px] bg-tekken-pink px-5 py-2 text-5xl transition-all duration-1000 ease-out hover:brightness-75"
    >
      Ver Ranking
    </Link>
  );
}
