"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { useUserSession } from "@/components/userSession";
import logo from "../../public/images/misc/tekken8-logo-sm.png";

const NAV_ITEMS = [
  { name: "RANKING", href: "/ranking" },
  { name: "TORNEOS", href: "/torneos" },
  { name: "COMPETIDORES", href: "/competidores" },
  { name: "REGLAMENTO", href: "/reglamento" },
];

// El diseno usa un unico boton que alterna BLACKHAND/ADMIN segun haya sesion
// (`authLabel`/`authHref` en Home Liga Tekken Paraguay.dc.html). Toda sesion
// es admin -- lo garantizan /auth/callback y /api/auth/login --, asi que
// alcanza con mirar `user`. El logoff vive solo dentro del panel admin.
const AUTH_INVITADO = { name: "BLACKHAND", href: "/auth/login" };
const AUTH_ADMIN = { name: "ADMIN", href: "/admin/identidades" };

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUserSession();

  if (pathname === "/auth/login") {
    return null;
  }

  const auth = user ? AUTH_ADMIN : AUTH_INVITADO;

  return (
    <nav className="sticky top-0 z-50 flex h-[76px] items-center border-b border-white/[.06] bg-black px-5 sm:px-8 lg:px-14">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="TEKKEN 8" height={32} className="h-8 w-auto" />
        </Link>

        <div
          className={`${
            isOpen
              ? "flex translate-y-0 opacity-100"
              : "pointer-events-none flex -translate-y-2 opacity-0 min-[880px]:pointer-events-auto min-[880px]:translate-y-0 min-[880px]:opacity-100"
          } absolute left-0 right-0 top-[76px] flex-col gap-1 border-b border-white/10 bg-black px-5 py-4 shadow-lg transition-all duration-300 ease-in-out min-[880px]:static min-[880px]:flex-row min-[880px]:items-center min-[880px]:gap-8 min-[880px]:border-0 min-[880px]:bg-transparent min-[880px]:p-0 min-[880px]:shadow-none`}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`border-b-2 py-2 font-display text-[19px] italic tracking-[0.05em] transition-colors duration-300 min-[880px]:py-0 ${
                pathname === item.href
                  ? "border-primary-500 text-primary-500 [text-shadow:0_0_14px_rgba(245,10,100,.65)]"
                  : "border-transparent text-white hover:border-primary-500 hover:text-primary-500"
              }`}
            >
              {item.name}
            </Link>
          ))}
          <Link
            href={auth.href}
            onClick={() => setIsOpen(false)}
            className={`border-b-2 py-2 font-display text-[19px] italic tracking-[0.05em] transition-colors duration-300 min-[880px]:py-0 ${
              pathname === auth.href
                ? "border-tekken-blue-400 text-tekken-blue-400 [text-shadow:0_0_14px_rgba(63,209,231,.65)]"
                : "border-transparent text-white/75 hover:border-tekken-blue-400 hover:text-tekken-blue-400"
            }`}
          >
            {auth.name}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menú"
          className="relative flex h-11 w-11 items-center justify-center border border-white/[.14] bg-white/[.06] text-white min-[880px]:hidden"
        >
          <span
            className={`absolute left-1/2 h-0.5 w-5 -translate-x-1/2 rounded bg-white transition-all duration-300 ${
              isOpen ? "top-1/2 rotate-45" : "top-[calc(50%-6px)] rotate-0"
            }`}
          />
          <span
            className={`absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded bg-white transition-opacity duration-300 ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-1/2 h-0.5 w-5 -translate-x-1/2 rounded bg-white transition-all duration-300 ${
              isOpen ? "top-1/2 -rotate-45" : "top-[calc(50%+6px)] rotate-0"
            }`}
          />
        </button>
      </div>
    </nav>
  );
}
