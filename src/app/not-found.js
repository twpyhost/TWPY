import Image from "next/image";

import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

import jin from "../../public/images/personajes/Full Body/jin-kazama-character-wall-art-sm.webp";
import kazuya from "../../public/images/personajes/Full Body/kazuya-mishima-character-wall-art-sm.webp";

export const metadata = {
  title: "404",
  description: "La página que buscás no existe o fue movida.",
};

export default function NotFound() {
  return (
    <section className="relative flex min-h-[calc(100vh-76px)] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0C232C] via-[#071A23] to-[#030F14] px-5 pb-14 pt-10 text-center sm:px-8 lg:px-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_46%,rgba(245,10,100,.14)_0%,transparent_68%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-0 h-[200%] w-[22%] animate-hero-sweep bg-gradient-to-r from-transparent via-tekken-blue-400/[.18] to-transparent blur-[6px]" />
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden animate-hero-in-left items-end lg:flex">
        <div className="absolute bottom-0 left-[6%] h-[clamp(140px,28vw,420px)] w-[clamp(140px,28vw,420px)] animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgba(245,10,100,.2)_0%,transparent_70%)] blur-[30px]" />
        <Image
          src={jin}
          alt=""
          className="relative block h-[88%] w-auto animate-hero-float opacity-55 [filter:grayscale(.25)_contrast(1.05)]"
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden animate-hero-in-right items-end [animation-delay:.12s] lg:flex">
        <div className="absolute bottom-0 right-[6%] h-[clamp(140px,28vw,420px)] w-[clamp(140px,28vw,420px)] animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgba(63,209,231,.18)_0%,transparent_70%)] blur-[30px] [animation-delay:2s]" />
        <Image
          src={kazuya}
          alt=""
          className="relative block h-[88%] w-auto animate-hero-float opacity-55 [animation-delay:1.6s] [filter:grayscale(.25)_contrast(1.05)]"
        />
      </div>

      <div className="relative z-[3] flex max-w-[760px] flex-col items-center gap-4">
        <RibbonTag className="animate-ko-stamp">RONDA PERDIDA</RibbonTag>

        <h1 className="m-0 animate-glitch-404 font-display text-[clamp(96px,22vw,260px)] italic leading-[.85] tracking-[.01em] text-white [text-shadow:0_4px_30px_rgba(0,0,0,.85)]">
          404
        </h1>

        <div className="h-0.5 w-[min(320px,60%)] animate-line-grow bg-[linear-gradient(90deg,transparent,rgb(var(--color-primary-500)),rgba(63,209,231,.9),transparent)] [animation-delay:.3s]" />

        <h2 className="m-0 animate-fade-up font-display text-[clamp(24px,5vw,38px)] italic leading-none tracking-[.02em] text-primary-500 [animation-delay:.38s] [text-shadow:0_0_30px_rgba(245,10,100,.5)]">
          ESTA PÁGINA FUE ELIMINADA DEL BRACKET
        </h2>

        <p className="m-0 max-w-[560px] animate-fade-up text-pretty font-body text-[clamp(15px,3.6vw,18px)] leading-[1.6] text-white/80 [animation-delay:.48s]">
          El enlace que buscás no existe o fue movido. Volvé al ring principal
          y seguí siguiendo el torneo.
        </p>

        <div className="mt-1.5 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:.58s]">
          <Button
            href="/"
            className="px-[clamp(20px,5vw,34px)] py-[clamp(11px,2.8vw,14px)] text-[clamp(15px,4vw,19px)] tracking-[.16em] hover:-translate-y-0.5"
          >
            VOLVER AL INICIO <span>&rarr;</span>
          </Button>
          <Button
            href="/ranking"
            variant="outline"
            className="px-[clamp(20px,5vw,34px)] py-[clamp(11px,2.8vw,14px)] text-[clamp(15px,4vw,19px)] tracking-[.16em] hover:-translate-y-0.5 hover:border-tekken-blue-400 hover:text-tekken-blue-400"
          >
            VER RANKING
          </Button>
        </div>
      </div>
    </section>
  );
}
