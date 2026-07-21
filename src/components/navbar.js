"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

import { useUserSession } from "@/components/userSession";
import logo from "../../public/images/misc/tekken8-logo-sm.png";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [menuAdminOpen, setMenuAdminOpen] = useState(false);
  const { user, isAdmin } = useUserSession();

  const navItems = [
    { name: "RANKING", href: "/ranking" },
    { name: "TORNEOS", href: "/torneos" },
    { name: "COMPETIDORES", href: "/competidores" },
    { name: "REGLAMENTO", href: "/reglamento" },
  ];

  const sessionItems = [{ name: "LOGIN", href: "/auth/login" }];

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
    <nav className="z-50 mx-auto flex w-full max-w-screen-2xl select-none items-center justify-between bg-black p-4 text-5xl italic text-white">
      <Link href="/">
        <Image src={logo} width={300} alt="tekken" />
      </Link>

      <div className="relative">
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

        <div
          className={`absolute right-0 top-16 flex flex-1 transform flex-col space-y-2 bg-black p-4 text-white shadow-lg transition-transform md:hidden ${
            isOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-5 opacity-0"
          } duration-300 ease-in-out`}
        >
          <ul className="gap-x-8">
            {navItems.map((item) => (
              <li
                className={`${
                  pathname === item.href
                    ? "text-tekken-pink"
                    : "hover:text-tekken-pink"
                } transition-colors duration-300`}
                key={item.href}
                onClick={() => setIsOpen(false)}
              >
                <Link href={item.href}>{item.name}</Link>
              </li>
            ))}
            {!user &&
              sessionItems.map((item) => (
                <li
                  className={`${
                    pathname === item.href
                      ? "text-tekken-pink"
                      : "hover:text-tekken-pink"
                  } transition-colors duration-300`}
                  key={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  <Link href={item.href}>{item.name}</Link>
                </li>
              ))}
          </ul>
        </div>
      </div>

      <ul className="hidden gap-x-5 md:flex">
        {navItems.map((item) => (
          <li
            className={`${
              pathname === item.href
                ? "text-tekken-pink"
                : "hover:text-tekken-pink"
            } transition-colors duration-300`}
            key={item.href}
          >
            <Link href={item.href}>{item.name}</Link>
          </li>
        ))}
        {!user &&
          sessionItems.map((item) => (
            <li
              className={`${
                pathname === item.href
                  ? "text-tekken-pink"
                  : "hover:text-tekken-pink"
              } transition-colors duration-300`}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              <Link href={item.href}>{item.name}</Link>
            </li>
          ))}
        <li>
          {user && (
            <div className="relative ml-8">
              <button
                onClick={() => setMenuAdminOpen(!menuAdminOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500"
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
        </li>
      </ul>
    </nav>
  );
}
