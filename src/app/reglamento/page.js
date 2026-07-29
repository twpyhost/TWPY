import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

const QUICK_FACTS = [
  { label: "FORMATO", value: "ELIMINACIÓN DOBLE", detail: "FT2 en toda la llave" },
  { label: "FINALES", value: "FT3", detail: "Winners, Losers y Grand Finals" },
  { label: "INICIO", value: "15:00 HS", detail: "Puntual, salvo aviso de los organizadores" },
  { label: "BRACKET", value: "CHALLONGE", detail: "Barajado el día del torneo" },
];

const ACCENT_BORDER = {
  primary: "border-primary-500",
  cyan: "border-tekken-blue-400",
};

const SECTIONS = [
  {
    id: "r-formato",
    index: "01",
    title: "FORMATO DE TORNEO",
    accent: "primary",
    rules: [
      {
        n: "01",
        content: (
          <>
            <strong className="text-white">Eliminación doble a FT2.</strong> Winners Finals,
            Losers Finals y Grand Finals se juegan a FT3.
          </>
        ),
      },
    ],
  },
  {
    id: "r-horarios",
    index: "02",
    title: "HORARIOS Y SETUPS",
    accent: "primary",
    rules: [
      {
        n: "02",
        content: (
          <>
            El torneo inicia puntualmente a las <strong className="text-white">15:00 hs</strong>,
            salvo que los organizadores dispongan lo contrario por problemas logísticos u otros
            inconvenientes.
          </>
        ),
      },
      {
        n: "03",
        content: "Los organizadores y ayudantes determinan en qué setup juega cada player.",
      },
    ],
  },
  {
    id: "r-equipamiento",
    index: "03",
    title: "EQUIPAMIENTO",
    accent: "primary",
    rules: [
      {
        n: "04",
        content: (
          <>
            Llevá tu propio control compatible con <strong className="text-white">PS5 o PC</strong>,
            con sus cables USB y adaptadores, o tu propio arcade. Si no tenés control ni arcade,
            coordiná con los demás participantes lo antes posible antes de que inicie el torneo.
          </>
        ),
      },
      {
        n: "05",
        critical: true,
        content: (
          <>
            Cuando un player llega al setup, su contrincante tiene <strong>5 minutos</strong> para
            presentarse y comenzar el FT. Si no llega en ese plazo, o no consigue control o arcade
            para jugar, queda descalificado.
          </>
        ),
      },
    ],
  },
  {
    id: "r-juego",
    index: "04",
    title: "EN LA PARTIDA",
    accent: "cyan",
    rules: [
      {
        n: "06",
        content: (
          <>
            La elección de lado (<strong className="text-white">Player 1 o Player 2</strong>) se
            define de común acuerdo. Si no hay acuerdo, se juega un FT3 de piedra, papel o tijera
            (hakembó).
          </>
        ),
      },
      {
        n: "07",
        content: (
          <>
            Los stages se eligen <strong className="text-white">al azar</strong>. Quien pierde el
            match puede cambiar de personaje si lo considera necesario, pero debe volver a poner
            stage al azar. De lo contrario, los organizadores pueden intervenir y amonestar al
            player por incumplimiento.
          </>
        ),
      },
      {
        n: "08",
        content: (
          <>
            Solo se permiten los <strong className="text-white">costumes por defecto</strong> del
            juego. Está prohibido el uso de costumes personalizados.
          </>
        ),
      },
    ],
  },
  {
    id: "r-conducta",
    index: "05",
    title: "CONDUCTA",
    accent: "primary",
    rules: [
      {
        n: "09",
        content: (
          <>
            Se exige <strong className="text-white">buen comportamiento</strong> durante toda la
            realización de los torneos.
          </>
        ),
      },
    ],
  },
  {
    id: "r-resultados",
    index: "06",
    title: "BRACKET Y RESULTADOS",
    accent: "primary",
    rules: [
      {
        n: "10",
        content: (
          <>
            Los brackets se organizan vía <strong className="text-white">Challonge</strong> y se
            barajan el día del torneo con las personas que abonaron la inscripción.
          </>
        ),
      },
      {
        n: "11",
        content:
          "Al terminar cada FT, acercate a los encargados del Challonge para reportar los resultados de las partidas.",
      },
    ],
  },
];

export default function ReglamentoPage() {
  const totalRules = SECTIONS.reduce((sum, s) => sum + s.rules.length, 0);

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>NORMATIVA OFICIAL &middot; TEKKEN 8</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              REGLAMENTO
            </h1>
            <p className="m-0 mt-2 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
              Reglas vigentes para todos los torneos ranked del circuito Tekken Warriors
              Paraguay. Inscribirse implica aceptar cada punto de este reglamento.
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[56px] leading-[.9]">{totalRules}</span>
            <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
              REGLAS
            </span>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          <div className="-mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <div key={fact.label} className="border border-white/10 bg-dark-gray-3-700 p-5">
                <span className="block font-display text-sm tracking-[0.24em] text-white/60">
                  {fact.label}
                </span>
                <span className="mt-1 block font-display text-[34px] leading-none">
                  {fact.value}
                </span>
                <span className="mt-1.5 block font-body text-[13.5px] text-white/60">
                  {fact.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-start gap-10 lg:flex-nowrap">
            <aside className="sticky top-[100px] hidden flex-none flex-col gap-3.5 lg:flex lg:w-[216px]">
              <span className="font-display text-[15px] tracking-[0.22em] text-white/45">
                ÍNDICE
              </span>
              <div className="flex flex-col gap-0.5">
                {SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-baseline gap-2.5 border-l-2 border-white/[.14] px-3 py-2 font-display text-lg tracking-[0.1em] text-white/80 transition-colors duration-300 hover:border-primary-500 hover:bg-primary-500/10 hover:text-white"
                  >
                    <span className="text-xs tracking-[0.14em] text-primary-500">
                      {section.index}
                    </span>
                    {section.title}
                  </a>
                ))}
              </div>
              <Button href="#" className="mt-2.5 self-start px-6 py-2.5 text-[17px] tracking-[0.18em]">
                DISCORD <span>&rarr;</span>
              </Button>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-10">
              {SECTIONS.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-[100px]">
                  <RibbonTag
                    variant={section.accent === "cyan" ? "cyan" : "primary"}
                    className="mb-3.5"
                  >
                    {section.title}
                  </RibbonTag>
                  <div className="flex flex-col gap-0.5">
                    {section.rules.map((rule) => (
                      <div
                        key={rule.n}
                        className={`grid grid-cols-[56px_1fr] items-start gap-4 border-l-[3px] px-5 py-4 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 ${ACCENT_BORDER[section.accent]} ${
                          rule.critical ? "bg-primary-500/10" : "bg-white/[.04]"
                        }`}
                      >
                        <span className="font-display text-4xl leading-[.8] text-white/25">
                          {rule.n}
                        </span>
                        <div className="flex flex-col gap-2.5">
                          {rule.critical && <RibbonTag variant="white">DESCALIFICACIÓN</RibbonTag>}
                          <p className="m-0 font-body text-base leading-[1.62] text-white/90">
                            {rule.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
