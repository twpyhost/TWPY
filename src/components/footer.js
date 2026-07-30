"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import twpyLogo from "../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

const SOCIAL_LINKS = [
  {
    name: "Discord",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.457.881-.63 1.283a18.27 18.27 0 0 0-5.51 0A11.5 11.5 0 0 0 9.115 3 19.79 19.79 0 0 0 4.683 4.369C1.61 8.86.79 13.24 1.16 17.56a19.9 19.9 0 0 0 5.993 3.04c.483-.66.913-1.36 1.28-2.098a12.9 12.9 0 0 1-2.02-.98c.17-.125.336-.256.497-.39 3.797 1.75 7.898 1.75 11.652 0 .163.134.328.265.497.39-.643.383-1.32.71-2.02.98.367.737.797 1.437 1.28 2.098a19.86 19.86 0 0 0 5.993-3.04c.44-4.998-.738-9.337-2.995-13.19ZM8.68 14.81c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.827.926 1.8 2.046 0 1.13-.79 2.045-1.8 2.045Zm6.64 0c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.826.926 1.8 2.046 0 1.13-.78 2.045-1.8 2.045Z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "X",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M18.244 2H21.5l-7.51 8.59L22.5 22h-6.94l-5.43-7.11L3.8 22H.5l8.04-9.19L1 2h7.06l4.9 6.49L18.244 2Zm-2.44 18h1.92L8.31 4H6.28l9.524 16Z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M13.5 21v-7.6h2.55l.4-3h-2.95V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.24C16.24 4.17 15.24 4 14.08 4c-2.6 0-4.38 1.58-4.38 4.5v2.9H6.9v3h2.8V21h3.8Z" />
      </svg>
    ),
  },
];

const CREDITS = ['Denis "Rushador Cuidadoso"', 'Roxana "Rox"', 'Rodrigo "Fate"'];

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/auth/login") {
    return null;
  }

  return (
    <footer
      id="sobre-nosotros"
      className="flex flex-col gap-10 bg-black px-5 py-10 sm:px-8 lg:px-14"
    >
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
            Tekken Warriors Paraguay es una comunidad con más de 15 años de trayectoria a
            nivel nacional e internacional. Su objetivo es promover la competencia y el
            compañerismo entre players mediante torneos y encuentros.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-8 border-t border-white/[.08] pt-6">
        <div className="flex flex-col gap-3.5">
          <span className="font-display text-[17px] tracking-[0.06em] text-white/75">
            Síguenos:
          </span>
          <div className="flex gap-3.5">
            {SOCIAL_LINKS.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[.08] text-white transition-all duration-300 hover:-translate-y-[3px] hover:scale-[1.08] hover:bg-primary-500"
              >
                {social.icon}
              </Link>
            ))}
          </div>
        </div>

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
    </footer>
  );
}
