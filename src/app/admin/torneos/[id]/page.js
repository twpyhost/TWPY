import TorneoDetalle from "./TorneoDetalle";

export default async function TorneoDetallePage({ params }) {
  const { id } = await params;
  return <TorneoDetalle torneoId={id}></TorneoDetalle>;
}
