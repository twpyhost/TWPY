// Read the bundled, trusted TrueType font's Unicode cmap. This prevents the
// image renderer from downloading fonts or emoji when a public name uses a
// glyph absent from our local font. Full names remain unchanged on the page.
export function createCardTextFallback(font) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  let cmap;
  for (let i = 0; i < view.getUint16(4); i++) {
    const entry = 12 + i * 16;
    if (view.getUint32(entry) === 0x636d6170) cmap = view.getUint32(entry + 8);
  }
  if (cmap === undefined) throw new Error("La fuente no tiene mapa Unicode");
  const maps = [];
  for (let i = 0; i < view.getUint16(cmap + 2); i++) {
    const entry = cmap + 4 + i * 8;
    const platform = view.getUint16(entry);
    const encoding = view.getUint16(entry + 2);
    if (platform !== 0 && !(platform === 3 && [1, 10].includes(encoding)))
      continue;
    const offset = cmap + view.getUint32(entry + 4);
    const format = view.getUint16(offset);
    if (format === 12) {
      const groups = Array.from(
        { length: view.getUint32(offset + 12) },
        (_, index) => {
          const group = offset + 16 + index * 12;
          return [
            view.getUint32(group),
            view.getUint32(group + 4),
            view.getUint32(group + 8),
          ];
        },
      );
      maps.push((code) =>
        groups.some(
          ([start, end, glyph]) =>
            code >= start && code <= end && glyph + code - start !== 0,
        ),
      );
    } else if (format === 4) {
      const count = view.getUint16(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + count * 2 + 2;
      const deltas = starts + count * 2;
      const ranges = deltas + count * 2;
      maps.push((code) => {
        if (code > 0xffff) return false;
        for (let segment = 0; segment < count; segment++) {
          const start = view.getUint16(starts + segment * 2);
          if (code < start || code > view.getUint16(ends + segment * 2))
            continue;
          const delta = view.getInt16(deltas + segment * 2);
          const rangePosition = ranges + segment * 2;
          const range = view.getUint16(rangePosition);
          const glyph = range
            ? view.getUint16(rangePosition + range + (code - start) * 2)
            : code;
          return (range && glyph === 0 ? 0 : (glyph + delta) & 0xffff) !== 0;
        }
        return false;
      });
    }
  }
  if (!maps.length)
    throw new Error("La fuente no tiene un mapa Unicode compatible");
  const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" });
  const emoji = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;
  return (text) =>
    Array.from(
      segmenter.segment(String(text).replace(/[\r\n\t]/g, " ")),
      ({ segment }) =>
        !emoji.test(segment) &&
        Array.from(segment).every((char) =>
          maps.some((has) => has(char.codePointAt(0))),
        )
          ? segment
          : "?",
    ).join("");
}
