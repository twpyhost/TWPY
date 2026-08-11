"use client";

import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import twpyLogo from "../../../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  // Sin redirectTo se entra por /admin, que manda a cada rol a su seccion
  // (identidades para el superusuario, liga para el rol 'liga').
  const nextPath =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/admin";

  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 780);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar sesion");
      }

      toast.success("Has iniciado sesion correctamente.");
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // El login con Discord queda fuera hasta que el proveedor OAuth este
  // configurado; el flujo de /auth/callback sigue en su lugar para cuando
  // se reactive el boton.

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-clip font-body text-white"
      style={{
        background: "radial-gradient(120% 90% at 15% 0%, #2b0f27 0%, #0c232c 45%, #030f14 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 animate-glow-pulse bg-[radial-gradient(45%_45%_at_82%_78%,rgba(63,209,231,.16)_0%,transparent_70%),radial-gradient(40%_40%_at_12%_20%,rgba(245,10,100,.18)_0%,transparent_70%)]" />

      <nav className="relative z-[2] flex h-[76px] items-center justify-between border-b border-white/[.07] px-5 sm:px-8 lg:px-14">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image src={twpyLogo} alt="Tekken Warriors Paraguay" height={40} className="h-10 w-auto" />
        </Link>
        <Link
          href="/"
          className="font-display text-lg italic tracking-[0.06em] text-white/70 hover:text-primary-500"
        >
          ← VOLVER AL INICIO
        </Link>
      </nav>

      <main className="relative z-[2] flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div
          className={`grid w-full max-w-[1020px] items-center gap-8 ${
            mobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(340px,440px)] gap-16"
          }`}
        >
          <div className={`flex flex-col gap-5 ${mobile ? "order-1" : ""}`}>
            <RibbonTag>LIGA TEKKEN PARAGUAY</RibbonTag>
            <h1 className="m-0 font-display text-[clamp(52px,7vw,86px)] italic leading-[.92] tracking-[0.01em]">
              ENTRÁ A LA
              <br />
              <span className="text-primary-500">ARENA</span>
            </h1>
            <p className="m-0 max-w-[420px] font-body text-base leading-[1.65] text-white/70">
              Accedé a tu cuenta para administrar los torneos de TWPY.
            </p>
            <div className="flex gap-9 border-t border-white/10 pt-3">
              <div className="flex flex-col">
                <span className="font-display text-[34px] leading-none text-tekken-blue-400">
                  15+
                </span>
                <span className="text-xs uppercase tracking-[0.1em] text-white/55">
                  Años de liga
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[34px] leading-none text-tekken-blue-400">
                  32
                </span>
                <span className="text-xs uppercase tracking-[0.1em] text-white/55">
                  Competidores
                </span>
              </div>
            </div>
          </div>

          <div className={`relative ${mobile ? "order-0" : ""}`}>
            <div className="absolute -top-1.5 left-0 right-[14%] h-1.5 bg-primary-500 shadow-glow-primary" />
            <div className="absolute -bottom-1.5 left-[26%] right-0 h-1.5 bg-tekken-blue-400 shadow-glow-cyan" />

            <form
              onSubmit={handleLogin}
              className="flex flex-col gap-5 border border-white/[.07] bg-black p-8 sm:p-10"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-display text-2xl italic tracking-[0.1em] text-primary-500">
                  TWPY
                </span>
                <h2 className="m-0 font-display text-[54px] italic leading-none">LOGIN</h2>
              </div>

              <label className="flex flex-col gap-2">
                <span className="font-display text-lg italic tracking-[0.05em]">CORREO</span>
                <input
                  id="email"
                  type="email"
                  placeholder="correo@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[50px] w-full border-2 border-transparent bg-[#f1f2f3] px-4 font-body text-[15px] text-[#0a1016] outline-none transition-[border-color,box-shadow] duration-300 focus:border-primary-500 focus:shadow-[0_0_0_4px_rgba(245,10,100,.18)]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-display text-lg italic tracking-[0.05em]">PASSWORD</span>
                <input
                  id="password"
                  type="password"
                  placeholder="Ingresar password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[50px] w-full border-2 border-transparent bg-[#f1f2f3] px-4 font-body text-[15px] text-[#0a1016] outline-none transition-[border-color,box-shadow] duration-300 focus:border-primary-500 focus:shadow-[0_0_0_4px_rgba(245,10,100,.18)]"
                />
              </label>

              <div className="-mt-1.5 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white/65">
                  <input type="checkbox" className="h-4 w-4 accent-primary-500" />
                  Recordarme
                </label>
                <Link href="#" className="text-[13px] font-bold text-tekken-blue-400">
                  ¿Olvidaste tu password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full text-2xl disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "INGRESAR"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
