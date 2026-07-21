"use client";

import toast from "react-hot-toast";
import Link from "next/link";
import { useState } from "react";
import LoadingButton from "@/components/loadingButton";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Los passwords no coinciden");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la cuenta");
      }

      setRegistered(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[620px] w-full max-w-screen-2xl items-center justify-center px-4 py-16 sm:px-8">
      <section className="relative w-full max-w-xl overflow-hidden border border-white/20 bg-black/80 px-5 py-8 shadow-2xl shadow-black/40 sm:px-10 sm:py-12">
        <div className="absolute left-0 top-0 h-2 w-2/3 bg-tekken-pink" />
        <div className="absolute bottom-0 right-0 h-2 w-2/3 bg-[#277687]" />

        <div className="mb-8 text-center italic">
          <p className="text-3xl text-tekken-pink sm:text-4xl">TWPY</p>
          <h2 className="mt-2 text-6xl leading-none sm:text-7xl">Registro</h2>
        </div>

        {registered ? (
          <div className="text-center">
            <p className="text-2xl italic">
              Cuenta creada. Te enviamos un correo a{" "}
              <span className="text-tekken-pink">{email}</span> para confirmar
              tu cuenta.
            </p>
            <p className="mt-6 text-xl italic text-white/70">
              Despues de confirmar vas a poder{" "}
              <Link
                href="/auth/login"
                className="text-tekken-pink hover:brightness-125"
              >
                iniciar sesion
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleRegister}
              className="[&_button]:clip-path-cta space-y-5 [&_button:hover]:brightness-75 [&_button]:mt-4 [&_button]:bg-tekken-pink [&_button]:py-3 [&_button]:text-4xl [&_button]:italic [&_button]:transition-all [&_button]:duration-300"
            >
              <div>
                <label htmlFor="email" className="mb-2 block text-3xl italic">
                  Correo
                </label>
                <input
                  id="email"
                  className="block w-full border border-white/20 bg-white/95 px-4 py-3 text-lg text-black outline-none transition-colors placeholder:text-gray-500 focus:border-tekken-pink focus:ring-2 focus:ring-tekken-pink/60"
                  type="email"
                  placeholder="correo@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-3xl italic"
                >
                  Password
                </label>
                <input
                  id="password"
                  className="block w-full border border-white/20 bg-white/95 px-4 py-3 text-lg text-black outline-none transition-colors placeholder:text-gray-500 focus:border-tekken-pink focus:ring-2 focus:ring-tekken-pink/60"
                  type="password"
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-3xl italic"
                >
                  Repetir password
                </label>
                <input
                  id="confirm-password"
                  className="block w-full border border-white/20 bg-white/95 px-4 py-3 text-lg text-black outline-none transition-colors placeholder:text-gray-500 focus:border-tekken-pink focus:ring-2 focus:ring-tekken-pink/60"
                  type="password"
                  placeholder="Repetir password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <LoadingButton
                loading={loading}
                text="Crear cuenta"
                loadingText="Creando..."
              />
            </form>

            <p className="mt-6 text-center text-xl italic text-white/70">
              ¿Ya tenes cuenta?{" "}
              <Link
                href="/auth/login"
                className="text-tekken-pink hover:brightness-125"
              >
                Inicia sesion
              </Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
