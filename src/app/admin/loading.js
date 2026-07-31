// Boundary propio para /admin: sin este archivo, la suspension del layout
// admin (que hace getAdminUser() + 2 queries sin cache en cada request) cae
// en el <Suspense> de app/loading.js, que esta por ENCIMA de admin/layout.js
// y por lo tanto reemplaza AdminShell entero -- sidebar incluido -- por el
// PageLoadingRing de pantalla completa. Este boundary vive DENTRO de
// AdminShell (envuelve solo `children`), asi que el sidebar y el header
// quedan fijos y unicamente la columna derecha muestra el fallback.
export default function AdminLoading() {
  return (
    <section className="bg-black px-5 pb-24 pt-8 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1240px]">
        <p className="border border-white/10 bg-white/[.03] p-4 font-body text-sm text-white/50">
          Cargando...
        </p>
      </div>
    </section>
  );
}
