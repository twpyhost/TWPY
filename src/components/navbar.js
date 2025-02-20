"use client"; // 👈 Esto indica que es un componente del cliente
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="main_navbar flex justify-between items-center p-4">
      <h1 className="">
        <Link href="/">Tekken Warriors PY</Link>
      </h1>
      <ul className="flex gap-x-8">
      <li className={`${pathname === '/ranking' ? "text-tekken-pink" : "hover:text-tekken-pink"}
        transition-colors duration-300`}>
          <Link href="/ranking">RANKING</Link>
        </li>
        <li className={`${pathname === '/torneos' ? "text-tekken-pink" : "hover:text-tekken-pink"}
        transition-colors duration-300`}>
          <Link href="/torneos">TORNEOS</Link>
        </li>
        <li className={`${pathname === '/competidores' ? "text-tekken-pink" : "hover:text-tekken-pink"}
        transition-colors duration-300`}>
          <Link href="/competidores">COMPETIDORES</Link>
        </li>
      </ul>
    </nav>
  );
}
