-- La ficha de jugador (Jugadores) ahora permite desvincular una cuenta de
-- Challonge directamente (boton "x" en el chip de alias, admin dashboard
-- fidelity pass). Se audita igual que el resto de acciones de identidad.
alter table identidad_eventos drop constraint identidad_eventos_tipo_check;

alter table identidad_eventos add constraint identidad_eventos_tipo_check
  check (tipo in (
    'vincular',
    'crear_jugador',
    'registrar_manual',
    'fusionar',
    'deshacer',
    'editar_jugador',
    'cambiar_cuenta_activa',
    'eliminar_cuenta_challonge'
  ));
