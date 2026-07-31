import { test, expect } from "@playwright/test";

import { describirEvento } from "../../src/lib/identidadDescripcion.js";

test.describe("describirEvento", () => {
  test("vincular muestra quien fue vinculado con quien", () => {
    const { descripcion, cuentas } = describirEvento({
      tipo: "vincular",
      detalle: {
        participante_ids: [1, 2],
        player_id: 5,
        display_name: "Fate_py",
        challonge_id: 123,
        challonge_username: "fate",
      },
    });
    expect(descripcion).toBe("fate → Fate_py (2 participaciones)");
    expect(cuentas).toEqual([{ challonge_id: 123, challonge_username: "fate" }]);
  });

  test("vincular sin username cae al nombre_participante", () => {
    const { descripcion } = describirEvento({
      tipo: "vincular",
      detalle: {
        participante_ids: [1],
        player_id: 5,
        display_name: "Fate_py",
        nombre_participante: "Fate (invitado)",
      },
    });
    expect(descripcion).toBe("Fate (invitado) → Fate_py");
  });

  test("vincular cae a los fallbacks genericos cuando falta todo (evento historico)", () => {
    const { descripcion } = describirEvento({
      tipo: "vincular",
      detalle: { participante_ids: [1], player_id: 5 },
    });
    expect(descripcion).toBe("participante sin nombre → #5");
  });

  test("crear_jugador", () => {
    const { descripcion } = describirEvento({
      tipo: "crear_jugador",
      detalle: { player_id: 5, display_name: "Fate_py", challonge_username: "fate" },
    });
    expect(descripcion).toBe("fate → nuevo jugador Fate_py");
  });

  test("registrar_manual", () => {
    const { descripcion } = describirEvento({
      tipo: "registrar_manual",
      detalle: { player_id: 5, display_name: "Sin Cuenta" },
    });
    expect(descripcion).toBe("Sin Cuenta registrado sin cuenta de Challonge");
  });

  test("fusionar, con y sin conflictos", () => {
    const sinConflictos = describirEvento({
      tipo: "fusionar",
      detalle: {
        base_player_id: 1,
        base_display_name: "Base",
        duplicate_player_id: 2,
        duplicate_display_name: "Duplicado",
        cuentas_reasignadas: 2,
        participantes_reasignados: 3,
        conflictos: [],
      },
    });
    expect(sinConflictos.descripcion).toBe(
      "Base absorbió a Duplicado · 2 cuentas y 3 resultados reasignados",
    );

    const conConflictos = describirEvento({
      tipo: "fusionar",
      detalle: {
        base_player_id: 1,
        base_display_name: "Base",
        duplicate_player_id: 2,
        duplicate_display_name: "Duplicado",
        cuentas_reasignadas: 2,
        participantes_reasignados: 3,
        conflictos: [900001],
      },
    });
    expect(conConflictos.descripcion).toContain("· 1 conflictos");
  });

  test("deshacer usa la etiqueta del tipo original", () => {
    const { descripcion } = describirEvento({
      tipo: "deshacer",
      detalle: { tipo_original: "vincular" },
    });
    expect(descripcion).toBe("Revertido: Vinculación");
  });

  test("editar_jugador lista las claves de cambios", () => {
    const { descripcion } = describirEvento({
      tipo: "editar_jugador",
      detalle: {
        player_id: 5,
        display_name: "Fate_py",
        cambios: { display_name: "Fate_py", avatar_url: "x" },
      },
    });
    expect(descripcion).toBe("Fate_py · campos: display_name, avatar_url");
  });

  test("cambiar_cuenta_activa y eliminar_cuenta_challonge exponen la cuenta involucrada", () => {
    const cambiar = describirEvento({
      tipo: "cambiar_cuenta_activa",
      detalle: { player_id: 5, display_name: "Fate_py", challonge_id: 123, challonge_username: "fate" },
    });
    expect(cambiar.descripcion).toBe("Cuenta activa de Fate_py cambiada");
    expect(cambiar.cuentas).toEqual([{ challonge_id: 123, challonge_username: "fate" }]);

    const eliminar = describirEvento({
      tipo: "eliminar_cuenta_challonge",
      detalle: { player_id: 5, display_name: "Fate_py", challonge_id: 123, challonge_username: "fate" },
    });
    expect(eliminar.descripcion).toBe("Cuenta desvinculada de Fate_py");
  });

  test("tipo desconocido no revienta", () => {
    expect(describirEvento({ tipo: "algo_nuevo", detalle: {} })).toEqual({
      descripcion: "",
      cuentas: [],
    });
  });
});
