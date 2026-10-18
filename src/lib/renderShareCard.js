import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { ImageResponse } from "next/og";
import TournamentCard from "@/components/share/TournamentCard";
import PlayerSeasonCard from "@/components/share/PlayerSeasonCard";
import { getCardDimensions } from "./shareCards";
import { createCardTextFallback } from "./cardFont";

let fontPromise;
const TEMPLATE_VERSION = "3";
const render = unstable_cache(
  async (type, data, format) => {
    fontPromise ??= readFile(
      join(process.cwd(), "public/fonts/share/Geist-Regular.ttf"),
    ).then((font) => ({ font, safeText: createCardTextFallback(font) }));
    const { font, safeText } = await fontPromise;
    const renderData =
      type === "torneo"
        ? {
            ...data,
            title: safeText(data.title),
            podium: data.podium.map((player) => ({
              ...player,
              name: safeText(player.name),
            })),
          }
        : { ...data, name: safeText(data.name) };
    const element =
      type === "torneo" ? (
        <TournamentCard data={renderData} format={format} />
      ) : (
        <PlayerSeasonCard data={renderData} format={format} />
      );
    const png = new ImageResponse(element, {
      ...getCardDimensions(format),
      fonts: [
        {
          name: "Geist",
          data: font.buffer.slice(
            font.byteOffset,
            font.byteOffset + font.byteLength,
          ),
          weight: 400,
          style: "normal",
        },
      ],
    });
    return Buffer.from(await png.arrayBuffer()).toString("base64");
  },
  ["twpy-share-card", TEMPLATE_VERSION],
  { revalidate: 3600 },
);

export async function renderShareCard({ type, id, data, format, request }) {
  const etag = `"${data.sourceVersion}-${format}-${TEMPLATE_VERSION}"`;
  const headers = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=0, must-revalidate",
    ETag: etag,
    "Content-Disposition": `inline; filename="twpy-${type}-${id}-${format}.png"`,
    "X-Content-Type-Options": "nosniff",
  };
  // Check current public source before either 304 or cache lookup. Corrections cannot reuse stale bytes.
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  const png = await render(type, data, format);
  return new Response(Buffer.from(png, "base64"), { headers });
}
