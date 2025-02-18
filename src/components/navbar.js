import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4">
      <h1 className="text-2xl font-bold">
        <Link href="/">Tekken Warriors PY</Link>
      </h1>
      <ul className="flex gap-4">
        <li>
          <Link href="/ranking">Ranking</Link>
        </li>
        <li>
          <Link href="/torneos">Torneos</Link>
        </li>
        <li>
          <Link href="/competidores">Competidores</Link>
        </li>
      </ul>
    </nav>
  );
}
