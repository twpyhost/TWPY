export const ligaPreferenceKey = slug => `twpy:liga:${slug}:participante`;

export function resolveLigaSelection({ urlParticipantId, storedParticipantId, validIds }) {
  const valid = new Set(validIds.map(String));
  const explicit = urlParticipantId !== null && urlParticipantId !== undefined;
  const validStored = typeof storedParticipantId === "string" && valid.has(storedParticipantId);
  const clearStored = storedParticipantId != null && !validStored;
  if (explicit) {
    const validUrl = typeof urlParticipantId === "string" && valid.has(urlParticipantId);
    return { selectedId: validUrl ? urlParticipantId : null, source: validUrl ? "url" : null, invalidUrl: !validUrl, clearStored };
  }
  return { selectedId: validStored ? storedParticipantId : null, source: validStored ? "storage" : null, invalidUrl: false, clearStored };
}
