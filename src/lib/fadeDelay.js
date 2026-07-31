// Staggered fade-in delay for list/row/card animations, capped so long lists
// (e.g. the full ranking table) don't push the last item's entrance out too far.
export function fadeDelay(index, { step = 35, max = 350 } = {}) {
  return { animationDelay: `${Math.min(index * step, max)}ms` };
}
