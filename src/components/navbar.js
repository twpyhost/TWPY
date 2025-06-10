"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import logo from "../../public/images/misc/tekken8-logo-sm.png";
import Image from "next/image";

import { useUserSession } from "@/components/userSession";
import toast, { Toaster } from "react-hot-toast";

import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [menuAdminOpen, setMenuAdminOpen] = useState(false);
  const {user, loadingUser} = useUserSession();

  const navItems = [
    { name: "RANKING", href: "/ranking" },
    { name: "TORNEOS", href: "/torneos" },
    { name: "COMPETIDORES", href: "/competidores" },
  ];

  const sessionItems = [
    { name: "LOGIN", href: "/auth/login" }
  ];

  const router = useRouter();

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(`Ha ocurrido un error al cerrar sesión: ${result.message}`);
    } else {
      toast.success('Has cerrado sesión correctamente.')
      router.push("/");
    }
  };

  return (
    <div>
      <nav className="flex items-center justify-between bg-black p-4 text-5xl italic text-white">
        <div className="relative">
          {/* Menu Icon */}
          <div
            className={`cursor-pointer rounded-lg p-2 transition-colors md:hidden ${
              isOpen ? "bg-gray-300" : "bg-transparent"
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
            className={`absolute left-0 top-16 flex flex-1 transform flex-col space-y-2 bg-black p-4 text-white shadow-lg transition-transform md:hidden ${
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
                >
                  <Link href={item.href}>{item.name}</Link>
                </li>
              ))}
              {!user && (
                sessionItems.map((item, index) => (
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
                ))
              )}
            </ul>
          </div>
        </div>

        <Link href="/">
          <Image src={logo} width={200} height={51} alt="tekken" />
        </Link>
        
        <div className="hidden md:flex items-center gap-x-4">
          
        </div>
        <ul className="hidden md:flex gap-x-8">
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
          {!user && (
            sessionItems.map((item, index) => (
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
            ))
          )}
          <li>
            {user && (
              <div className="relative ml-8">
                <button onClick={() => setMenuAdminOpen(!menuAdminOpen)} className="rounded-full w-8 h-8 bg-blue-500 flex items-center justify-center">
                  {user.email[0].toUpperCase()}
                </button>
                {menuAdminOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow-lg z-50 text-sm text-right">
                    <Link href="/admin/cargar_torneo" className="block px-4 py-2 hover:bg-gray-200 rounded">Cargar torneo</Link>
                    <button onClick={() => logout()} className="w-full text-right px-4 py-2 hover:bg-gray-200 rounded">Cerrar sesión</button>
                  </div>
                )}
              </div>
            )}
          </li>
        </ul>
        
      </nav>
    </div>
  );
}
