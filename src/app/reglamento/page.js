import Image from "next/image";
import SeeRankingButton from "@/components/seeRankingButton";

import jin from "@/assets/images/jin-home.webp";
import kazuya from "@/assets/images/kazuya-home.webp";

export default function Home() {
  return (
    <div className="my-4 flex max-w-screen-2xl flex-col justify-self-center">
      <div className="my-4 text-center text-6xl">Reglamento</div>

      <div className="mb-4 text-3xl sm:text-4xl">
        1 - Tipo de torneo: Eliminación Doble a FT2 - Winners finals, Losers
        finals y Grand Finals a FT3.
      </div>

      <div className="mb-4 text-3xl sm:text-4xl">
        2 - El torneo inicia puntualmente a las 15:00 hrs (salvo disponga lo
        contrario los organizadores por problemas logísticos u otros
        inconvenientes y situaciones)
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        3 - Los organizadores y ayudantes determinarán en qué setup estarán
        jugando cada player
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        4 - Llevar controles propios compatibles con las PS5 o PCs con sus
        respectivos cables USB y adaptadores o arcades propios. En el caso que
        no tenga control propio o arcade, ver con los demás participantes en la
        brevedad posible antes de iniciar el torneo.
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        5 - Al llegar el player al setup, al contrincante se le dará 5 minutos
        para llegar al setup y comenzar el FT. Si no llega a los 5 minutos o en
        el caso que no consiga control o arcade para jugar, será descalificado.
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        6 - Para la elección de lado izquierdo o lado derecho (Player 1 o Player
        2), ambos players deben ponerse de acuerdo. En caso contrario, se jugará
        FT3 de "Piedra, papel o tijera" (hakembó).
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        7 - Se elegirán stages al azar y el que pierda el match, podrá cambiar
        personaje en el caso que lo vea necesario pero deberá poner nuevamente
        stage al azar. Caso contrario, los organizadores podrán intervenir y
        amonestar al player por incumplimiento de la regla.
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        8 - Solo se permitirán costumes que vengan por defecto en el juego.
        Prohibido la utilización de costumes personalizados.
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        9 - Buen comportamiento durante la realización de los torneos.
      </div>
      <div className="mb-4 text-3xl sm:text-4xl">
        10 - Los brackets serán organizados vía Challonge y barajados en el día
        del torneo con las personas que abonaron la inscripción. 11- Al terminar
        cada FT, acercarse a los encargados del Challonge para decir los
        resultados de las partidas.
      </div>
    </div>
  );
}
