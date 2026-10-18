import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { ImageResponse } from "next/og.js";
import { createCardTextFallback } from "../../src/lib/cardFont.js";

test("preserva acentos y sustituye grafemas no disponibles sin pedir assets remotos", async () => {
  const font = await readFile("public/fonts/share/Geist-Regular.ttf");
  const safeText = createCardTextFallback(font);
  expect(safeText("Álex Ñandú · 🐉 漢字")).toBe("Álex Ñandú · ? ??");
  expect(safeText("1️⃣ 🇵🇾")).toBe("? ?");
  const originalFetch = globalThis.fetch;
  const remoteRequests = [];
  globalThis.fetch = async (url, options) => {
    if (/^https?:/.test(String(url))) {
      remoteRequests.push(String(url));
      throw new Error("Remote request forbidden");
    }
    return originalFetch(url, options);
  };
  try {
    const response = new ImageResponse(
      createElement(
        "div",
        { style: { display: "flex", fontFamily: "Geist" } },
        safeText("Álex 🐉 漢字"),
      ),
      {
        width: 600,
        height: 200,
        fonts: [{ name: "Geist", data: font, weight: 400 }],
      },
    );
    expect(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 8)
        .toString("hex"),
    ).toBe("89504e470d0a1a0a");
    expect(remoteRequests).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
