import { test, expect } from "@playwright/test";
import { ligaPreferenceKey, resolveLigaSelection } from "../../src/lib/ligaPreference.js";

test("URL gana; enlace invalido no cae en una preferencia guardada", () => {
  const base = { slug: "liga-a", storedParticipantId: "2", validIds: ["1", "2"] };
  expect(resolveLigaSelection({ ...base, urlParticipantId: "1" })).toEqual({ selectedId: "1", source: "url", invalidUrl: false, clearStored: false });
  expect(resolveLigaSelection({ ...base, urlParticipantId: "999" })).toMatchObject({ selectedId: null, invalidUrl: true });
  expect(resolveLigaSelection({ ...base, urlParticipantId: "" })).toMatchObject({ selectedId: null, invalidUrl: true });
  expect(resolveLigaSelection({ ...base, urlParticipantId: null })).toMatchObject({ selectedId: "2", source: "storage" });
});

test("limpia preferencia obsoleta y separa ligas", () => {
  expect(resolveLigaSelection({ storedParticipantId: "999", validIds: ["1"] })).toEqual({ selectedId: null, source: null, invalidUrl: false, clearStored: true });
  expect(ligaPreferenceKey("liga-a")).toBe("twpy:liga:liga-a:participante");
  expect(ligaPreferenceKey("liga-b")).not.toBe(ligaPreferenceKey("liga-a"));
});
