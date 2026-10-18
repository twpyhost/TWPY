"use client";
import { useEffect, useRef, useState } from "react";
function Photo({ asset }) {
  const [failed, setFailed] = useState(false);
  const image = useRef(null);
  useEffect(() => {
    // A failed SSR image can finish before React attaches onError.
    if (image.current?.complete && image.current.naturalWidth === 0)
      setFailed(true);
  }, []);
  return (
    <figure className="min-w-0 overflow-hidden border border-white/15 bg-white/[.03]">
      {!failed && asset.url ? (
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir imagen: ${asset.caption}`}
        >
          {/* Short-lived private URLs must bypass the persistent Next image cache. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={image}
            src={asset.url}
            alt={asset.caption}
            width={asset.width}
            height={asset.height}
            onError={() => setFailed(true)}
            className="aspect-[4/3] w-full object-cover"
          />
        </a>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center p-6 text-white/60">
          Imagen no disponible. Recargá la página para intentar de nuevo.
        </div>
      )}
      <figcaption className="break-words p-4">
        <p>{asset.caption}</p>
        <p className="mt-2 text-sm text-white/60">{asset.credit}</p>
      </figcaption>
    </figure>
  );
}
export default function ArchiveGallery({ assets }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((a) => (
        <Photo key={`${a.id}-${a.url}`} asset={a} />
      ))}
    </div>
  );
}
