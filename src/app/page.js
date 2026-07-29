import Image from "next/image";

import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

import jin from "../../public/images/personajes/Full Body/jin-kazama-character-wall-art-sm.webp";
import kazuya from "../../public/images/personajes/Full Body/kazuya-mishima-character-wall-art-sm.webp";

export default function Home() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0C232C] via-[#071A23] to-[#030F14] px-5 pb-20 pt-11 sm:px-8 sm:pb-24 sm:pt-16 lg:min-h-[clamp(430px,62vh,720px)] lg:px-14 lg:pb-24 lg:pt-11">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_58%,rgba(63,209,231,.12)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-0 h-[200%] w-[22%] animate-hero-sweep bg-gradient-to-r from-transparent via-primary-500/[.22] to-transparent blur-[6px]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-transparent to-black/85" />

      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden animate-hero-in-left items-end lg:flex">
        <div className="absolute bottom-[6%] left-[8%] h-[clamp(120px,26vw,400px)] w-[clamp(120px,26vw,400px)] animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgba(245,10,100,.2)_0%,transparent_70%)] blur-[26px]" />
        <Image
          src={jin}
          alt="Jin Kazama"
          priority
          className="relative block h-[92%] w-auto animate-hero-float [animation-delay:1.2s] [filter:contrast(1.06)_saturate(.92)_drop-shadow(0_0_44px_rgba(0,0,0,.7))] [mask-image:linear-gradient(180deg,#000_68%,rgba(0,0,0,.25)_92%,transparent_100%)]"
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden animate-hero-in-right items-end lg:flex [animation-delay:.12s]">
        <div className="absolute bottom-[6%] right-[8%] h-[clamp(120px,26vw,400px)] w-[clamp(120px,26vw,400px)] animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgba(63,209,231,.18)_0%,transparent_70%)] blur-[26px] [animation-delay:2s]" />
        <Image
          src={kazuya}
          alt="Kazuya Mishima"
          priority
          className="relative block h-[92%] w-auto animate-hero-float [animation-delay:1.6s] [filter:contrast(1.06)_saturate(.92)_drop-shadow(0_0_44px_rgba(0,0,0,.7))] [mask-image:linear-gradient(180deg,#000_68%,rgba(0,0,0,.25)_92%,transparent_100%)]"
        />
      </div>

      <div className="relative z-[3] flex max-w-[760px] flex-col items-center gap-3 py-1.5 text-center">
        <div className="pointer-events-none absolute -inset-x-[22%] -inset-y-[14%] -z-10 bg-[radial-gradient(ellipse_62%_62%_at_50%_50%,rgba(3,15,20,.94)_0%,rgba(3,15,20,.74)_58%,transparent_100%)]" />

        <RibbonTag className="animate-fade-up">LIGA OFICIAL 2026</RibbonTag>

        <h1 className="m-0 text-balance font-display text-[clamp(33px,8.4vw,104px)] italic leading-[.9] tracking-[.005em]">
          <span className="block animate-fade-up text-white [animation-delay:.1s] [text-shadow:0_4px_30px_rgba(0,0,0,.85)]">
            BIENVENIDO AL RANKING
          </span>
          <span className="block animate-fade-up text-primary-500 [animation-delay:.22s] [text-shadow:0_0_34px_rgba(245,10,100,.55)]">
            DE TEKKEN WARRIORS PARAGUAY
          </span>
        </h1>

        <div className="h-0.5 w-[min(320px,60%)] animate-line-grow bg-[linear-gradient(90deg,transparent,rgb(var(--color-primary-500)),rgba(63,209,231,.9),transparent)] [animation-delay:.38s]" />

        <p className="m-0 max-w-[620px] animate-fade-up text-pretty font-body text-[clamp(15px,3.8vw,19px)] leading-[1.6] text-white/[.82] [animation-delay:.46s]">
          Este espacio está diseñado para registrar y mostrar los resultados de torneos de
          Tekken Warriors Paraguay
        </p>

        <div className="mt-1.5 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:.58s]">
          <Button
            href="/ranking"
            className="px-[clamp(20px,5vw,34px)] py-[clamp(11px,2.8vw,14px)] text-[clamp(15px,4vw,19px)] tracking-[.16em] hover:-translate-y-0.5"
          >
            VER RANKING <span>&rarr;</span>
          </Button>
          <Button
            href="/torneos"
            variant="outline"
            className="px-[clamp(20px,5vw,34px)] py-[clamp(11px,2.8vw,14px)] text-[clamp(15px,4vw,19px)] tracking-[.16em] hover:-translate-y-0.5 hover:border-tekken-blue-400 hover:text-tekken-blue-400"
          >
            PRÓXIMOS TORNEOS
          </Button>
        </div>
      </div>

      <a
        href="#sobre-nosotros"
        className="absolute bottom-5 left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-1.5 text-white/55 transition-colors duration-300 hover:text-tekken-blue-400 sm:bottom-[34px]"
      >
        <span className="font-display text-xs tracking-[.24em]">SOBRE NOSOTROS</span>
        <span className="block animate-cue-bounce text-[15px] leading-none">▾</span>
      </a>
    </section>
  );
}
