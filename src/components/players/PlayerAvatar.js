"use client";

import Image from "next/image";
import { useState } from "react";

export default function PlayerAvatar({ url, name }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-dark-gray-3-500 font-display text-3xl text-white/50 sm:h-24 sm:w-24 sm:text-5xl">
      {url && !failed ? (
        <Image
          src={url}
          alt=""
          width={96}
          height={96}
          className="h-16 w-16 object-cover sm:h-24 sm:w-24"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={`Avatar de ${name}`}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
