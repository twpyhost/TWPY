"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import twpyLogo from "../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

// Los 4 iconos de redes (Discord/Instagram/X/Facebook) vivian aca con
// href="#": se quitaron hasta tener las URLs reales, ver TODO.todo. El QR de
// WhatsApp de mas abajo se queda porque si es un acceso real a la comunidad.

const CREDITS = [
  'Denis "Rushador Cuidadoso"',
  'Roxana "Rox"',
  'Rodrigo "Fate"',
];

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/auth/login") {
    return null;
  }

  return (
    <footer
      id="sobre-nosotros"
      className="bg-black px-5 py-10 sm:px-8 lg:px-14"
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10">
        <div className="flex flex-wrap items-start gap-9">
          <Image
            src={twpyLogo}
            alt="Tekken Warriors Paraguay"
            width={110}
            className="h-auto w-[110px] flex-shrink-0"
          />
          <div className="flex max-w-[900px] flex-col gap-2.5">
            <h2 className="m-0 font-display text-[22px] tracking-[0.04em] text-primary-500">
              Sobre nosotros:
            </h2>
            <p className="m-0 font-body text-base leading-[1.6] text-white/85">
              Tekken Warriors Paraguay es una comunidad con más de 15 años de
              trayectoria a nivel nacional e internacional. Su objetivo es
              promover la competencia y el compañerismo entre players mediante
              torneos y encuentros.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-8 border-t border-white/[.08] pt-6">
          <div className="flex items-center gap-[18px] border border-white/10 bg-white/[.04] px-[18px] py-3.5">
            <Image
              src="/images/misc/QR Whatsapp.png"
              alt="Código QR del grupo de WhatsApp"
              width={104}
              height={104}
              className="h-[104px] w-[104px] flex-shrink-0 object-contain"
            />
            <div className="flex max-w-[210px] flex-col gap-1.5">
              <span className="font-display text-xl tracking-[0.06em] text-primary-500">
                Sumate al grupo
              </span>
              <span className="font-body text-[13px] leading-[1.5] text-white/60">
                Escaneá el código para entrar al WhatsApp de la liga.
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <span className="font-display text-base tracking-[0.04em] text-white/75">
              Creado con 💔 por:
            </span>
            <div className="flex flex-wrap justify-end gap-4 font-body text-sm font-bold text-tekken-blue-400">
              {CREDITS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
