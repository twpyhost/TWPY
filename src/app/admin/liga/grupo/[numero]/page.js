import GrupoDetalle from "./GrupoDetalle";

export default async function GrupoDetallePage({ params }) {
  const { numero } = await params;
  return <GrupoDetalle numero={Number(numero)} />;
}
