import JugadorDetalle from "./JugadorDetalle";

export default async function JugadorDetallePage({ params }) {
  const { id } = await params;
  return <JugadorDetalle playerId={id}></JugadorDetalle>;
}
