import Image from "next/image";
import SeeRankingButton from "@/components/seeRankingButton";

import jin from "@/assets/images/jin-home.webp";
import kazuya from "@/assets/images/kazuya-home.webp";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Mobile */}
      <div className="my-12 flex flex-col px-4 lg:hidden">
        <h1 className="text-center text-6xl italic md:text-7xl">
          Bienvenido al Ranking de Tekken Warriors Paraguay
        </h1>
        <p className="mt-8 text-3xl md:text-center md:text-4xl">
          Este espacio está diseñado para registrar y mostrar los resultados de
          torneos de Tekken Warriors Paraguay
        </p>

        <div className="mx-auto mt-12">
          <SeeRankingButton />
        </div>
      </div>

      {/* Desktop */}
      {/* Black Bar */}
      <div className="h-full overflow-hidden">
        <div className="hidden h-16 w-full bg-black lg:block" />

        <div className="relative -mt-20 hidden grid-cols-2 lg:grid">
          {/* Left */}
          <div className="">
            <Image
              src={jin}
              height={1000}
              className="absolute left-10 z-10"
              alt="Jin"
            />
            <Image
              src={kazuya}
              height={1600}
              className="absolute left-40 z-20 overflow-y-clip"
              alt="Kazuya"
            />
          </div>

          {/* Right */}
          <div className="z-40 flex flex-col py-40">
            <h1 className="text-center text-8xl italic">
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
    </div>
  );
}
