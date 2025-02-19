import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4">
      <h1 className="">
        <Link href="/">Tekken Warriors PY</Link>
      </h1>
      <ul className="flex gap-4 ">
        <li>
          <Link href="/ranking">RANKING</Link>
        </li>
        <li>
          <Link href="/torneos">TORNEOS</Link>
        </li>
        <li>
          <Link href="/competidores">COMPETIDORES</Link>
        </li>
      </ul>
    </nav>
  );
}
