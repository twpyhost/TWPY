// Forces `promise` to take at least `ms` before resolving, so a Suspense
// fallback (e.g. the page loading ring) stays visible long enough to see
// instead of flashing by on fast/cached data.
export function withMinDelay(promise, ms = 1000) {
  return Promise.all([promise, new Promise((resolve) => setTimeout(resolve, ms))]).then(
    ([result]) => result,
  );
}
