"use client"; // 👈 Esto indica que es un componente del cliente
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "../../public/images/misc/tekken8-logo-sm.png";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "RANKING", href: "/ranking" },
    { name: "TORNEOS", href: "/torneos" },
    { name: "COMPETIDORES", href: "/competidores" },
  ];

  return (
    <nav className="bg-black text-white flex justify-between items-center p-4">
      <h1 className="">
        <Link href="/">
          <Image src={logo} width={200} height={51} alt="tekken" />
        </Link>
      </h1>
      <ul className="flex gap-x-8">
        {navItems.map((item, index) => (
          <li
            className={`${
              pathname === item.href
                ? "text-tekken-pink"
                : "hover:text-tekken-pink"
            }
      transition-colors duration-300`}
            key={index}
          >
            <Link href={item.href}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
