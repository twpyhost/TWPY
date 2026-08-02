"use client";

import RibbonTag from "@/components/ui/RibbonTag";
import { useSeasonTransition } from "./SeasonTransitionProvider";

// El eyebrow del hero tiene que anunciar la temporada elegida desde el frame
// del click, no la que todavia esta en el render del servidor. Es lo unico
// que necesita ser cliente en ese bloque del hero.
export default function SeasonRibbon() {
  const { temporadaMostrada } = useSeasonTransition();

  return <RibbonTag>{`RANKING OFICIAL · TEMPORADA ${temporadaMostrada}`}</RibbonTag>;
}
