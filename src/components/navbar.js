"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

import { useUserSession } from "@/components/userSession";
import logo from "../../public/images/misc/tekken8-logo-sm.png";

const NAV_ITEMS = [
  { name: "RANKING", href: "/ranking" },
  { name: "TORNEOS", href: "/torneos" },
  { name: "COMPETIDORES", href: "/competidores" },
  { name: "REGLAMENTO", href: "/reglamento" },
];

const LOGIN_ITEM = { name: "LOGIN", href: "/auth/login" };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [menuAdminOpen, setMenuAdminOpen] = useState(false);
  const { user, isAdmin } = useUserSession();

  if (pathname === "/auth/login") {
    return null;
  }

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("No se pudo cerrar sesion");
      }

      toast.success("Has cerrado sesion correctamente.");
      setMenuAdminOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <nav className="sticky top-0 z-50 flex h-[76px] items-center justify-between border-b border-white/[.06] bg-black px-5 sm:px-8 lg:px-14">
      <Link href="/" className="flex items-center">
        <Image src={logo} alt="TEKKEN 8" height={32} className="h-8 w-auto" />
      </Link>

      <div
        className={`${
          isOpen
            ? "flex translate-y-0 opacity-100"
            : "pointer-events-none flex -translate-y-2 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100"
        } absolute left-0 right-0 top-[76px] flex-col gap-1 border-b border-white/10 bg-black px-5 py-4 shadow-lg transition-all duration-300 ease-in-out md:static md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`border-b-2 py-2 font-display text-[19px] italic tracking-[0.05em] transition-colors duration-300 md:py-0 ${
              pathname === item.href
                ? "border-primary-500 text-primary-500 [text-shadow:0_0_14px_rgba(245,10,100,.65)]"
                : "border-transparent text-white hover:border-primary-500 hover:text-primary-500"
            }`}
          >
            {item.name}
          </Link>
        ))}
        {!user && (
          <Link
            href={LOGIN_ITEM.href}
            onClick={() => setIsOpen(false)}
            className={`border-b-2 py-2 font-display text-[19px] italic tracking-[0.05em] transition-colors duration-300 md:py-0 ${
              pathname === LOGIN_ITEM.href
                ? "border-tekken-blue-400 text-tekken-blue-400 [text-shadow:0_0_14px_rgba(63,209,231,.65)]"
                : "border-transparent text-white/75 hover:border-tekken-blue-400 hover:text-tekken-blue-400"
            }`}
          >
            {LOGIN_ITEM.name}
          </Link>
        )}
        {user && (
          <div className="relative md:ml-4">
            <button
              onClick={() => setMenuAdminOpen(!menuAdminOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-tekken-blue-500 font-body text-sm font-bold text-black"
            >
              {user.email[0].toUpperCase()}
            </button>
            {menuAdminOpen && (
              <div className="absolute right-0 z-50 mt-2 w-40 rounded bg-white text-right text-sm text-black shadow-lg">
                {isAdmin && (
                  <Link
                    href="/admin/cargar_torneo"
                    className="block rounded px-4 py-2 hover:bg-gray-200"
                  >
                    Cargar torneo
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="w-full rounded px-4 py-2 text-right hover:bg-gray-200"
                >
                  Cerrar sesion
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menú"
        className="relative flex h-11 w-11 items-center justify-center border border-white/[.14] bg-white/[.06] text-white md:hidden"
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
    </nav>
  );
}
