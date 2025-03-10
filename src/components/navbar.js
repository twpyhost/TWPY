"use client"; // 👈 Esto indica que es un componente del cliente
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "../../public/images/misc/tekken8-logo-sm.png";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "RANKING", href: "/ranking" },
    { name: "TORNEOS", href: "/torneos" },
    { name: "COMPETIDORES", href: "/competidores" },
  ];

  return (
    // <div className="flex justify-center">
    <nav className="z-50 mx-auto flex w-full max-w-screen-2xl select-none items-center justify-between bg-black p-4 text-5xl italic text-white">
      <Link href="/">
        <Image src={logo} width={200} height={51} alt="tekken" />
      </Link>

      {/* Mobile */}
      <div className="relative">
        {/* Menu Icon */}
        <div
          className={`cursor-pointer p-2 transition-colors md:hidden ${
            isOpen ? "bg-tekken-pink" : "bg-transparent"
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </div>

        {/* Dropdown Menu */}

        <div
          className={`absolute right-0 top-16 flex flex-1 transform flex-col space-y-2 bg-black p-4 text-white shadow-lg transition-transform md:hidden ${
            isOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-5 opacity-0"
          } duration-300 ease-in-out`}
        >
          <ul className="gap-x-8">
            {navItems.map((item, index) => (
              <li
                className={`${
                  pathname === item.href
                    ? "text-tekken-pink"
                    : "hover:text-tekken-pink"
                } transition-colors duration-300`}
                key={index}
                onClick={() => setIsOpen(false)}
              >
                <Link href={item.href}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desktop */}
      <ul className="hidden gap-x-8 px-4 md:flex">
        {navItems.map((item, index) => (
          <li
            className={`${
              pathname === item.href
                ? "text-tekken-pink"
                : "hover:text-tekken-pink"
            } transition-colors duration-300`}
            key={index}
          >
            <Link href={item.href}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </nav>
    // </div>
  );
}
