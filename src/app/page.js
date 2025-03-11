import Image from "next/image";
import SeeRankingButton from "@/components/seeRankingButton";

import jin from "@/assets/images/jin-home.webp";
import kazuya from "@/assets/images/kazuya-home.webp";

export default function Home() {
  return (
    <>
      {/* Mobile */}
      <div className="overflow-hidden lg:hidden">
        {/* Black Bar */}
        <div className="hidden h-16 bg-black sm:block sm:h-16 md:h-20" />
        {/* Text */}
        <div className="relative flex h-[600px] flex-col justify-center px-4 sm:h-[700px] md:h-[800px]">
          <h1 className="z-10 text-center text-6xl italic md:text-7xl">
            Bienvenido al Ranking de <br /> Tekken Warriors Paraguay
          </h1>
          <p className="z-10 mt-8 text-3xl md:text-center md:text-4xl">
            Este espacio está diseñado para registrar y mostrar los resultados
            de torneos de Tekken Warriors Paraguay
          </p>

          <div className="z-50 mx-auto mt-8 py-4">
            <SeeRankingButton />
          </div>

          <div className="hidden sm:block">
            <Image
              src={jin}
              height={1000}
              className="absolute -left-36 -top-20 z-0 brightness-75"
              alt="Jin"
            />
            <Image
              src={kazuya}
              height={1500}
              className="absolute -right-40 -top-20 z-0 brightness-75 sm:-right-56 md:-right-64"
              alt="Kazuya"
            />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-hidden lg:block">
        {/* Black Bar */}

        <div className="h-16 w-full bg-black" />
        {/* Grid */}
        <div className="relative mx-auto -mt-20 grid w-full max-w-screen-2xl grid-cols-2">
          {/* Left */}
          <div className="">
            <Image
              src={jin}
              height={1100}
              className="absolute left-10 z-10"
              alt="Jin"
            />
            <Image
              src={kazuya}
              height={1800}
              className="absolute left-40 z-20 overflow-y-clip"
              alt="Kazuya"
            />
          </div>

          {/* Right */}
          <div className="z-50 flex flex-col px-6 py-40">
            <h1 className="text-center text-8xl italic">
              {/* <br /> */}
              Bienvenido al Ranking de Tekken Warriors Paraguay
            </h1>
            <p className="mt-12 text-6xl">
              Este espacio está diseñado para registrar y mostrar los resultados
              de torneos de Tekken Warriors Paraguay
            </p>

            <SeeRankingButton />
          </div>
        </div>
      </div>
    </>
  );
}
