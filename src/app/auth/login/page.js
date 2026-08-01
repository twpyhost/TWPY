"use client";

import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
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
  const nextPath =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/admin/identidades";

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

  const handleDiscordLogin = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      toast.error("No se pudo iniciar sesion con Discord");
    }
  };

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
              Accedé a tu cuenta para inscribirte a los torneos, seguir tu ranking y ver tus
              próximos combates del fixture.
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

              <div className="flex items-center gap-3 text-[11px] tracking-[0.14em] text-white/30">
                <span className="h-px flex-1 bg-white/[.12]" />O
                <span className="h-px flex-1 bg-white/[.12]" />
              </div>

              <button
                type="button"
                onClick={handleDiscordLogin}
                className="flex h-[50px] items-center justify-center gap-2.5 border border-white/[.16] bg-white/[.04] font-display text-lg tracking-[0.06em] text-white transition-colors duration-300 hover:border-[#5865F2] hover:bg-[#5865F2]/[.16]"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="#5865F2">
                  <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.457.881-.63 1.283a18.27 18.27 0 0 0-5.51 0A11.5 11.5 0 0 0 9.115 3 19.79 19.79 0 0 0 4.683 4.369C1.61 8.86.79 13.24 1.16 17.56a19.9 19.9 0 0 0 5.993 3.04c.483-.66.913-1.36 1.28-2.098a12.9 12.9 0 0 1-2.02-.98c.17-.125.336-.256.497-.39 3.797 1.75 7.898 1.75 11.652 0 .163.134.328.265.497.39-.643.383-1.32.71-2.02.98.367.737.797 1.437 1.28 2.098a19.86 19.86 0 0 0 5.993-3.04c.44-4.998-.738-9.337-2.995-13.19ZM8.68 14.81c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.827.926 1.8 2.046 0 1.13-.79 2.045-1.8 2.045Zm6.64 0c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.826.926 1.8 2.046 0 1.13-.78 2.045-1.8 2.045Z" />
                </svg>
                CONTINUAR CON DISCORD
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
