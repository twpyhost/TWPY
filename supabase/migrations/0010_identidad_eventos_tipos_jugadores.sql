-- La seccion admin Jugadores (Hito 12) tambien audita en identidad_eventos:
-- editar el perfil de un jugador y cambiar cual cuenta de Challonge esta
-- activa. Ninguno de los tipos existentes (pensados para la cola de
-- resolucion) encaja, asi que se extiende el check constraint.
alter table identidad_eventos drop constraint identidad_eventos_tipo_check;

alter table identidad_eventos add constraint identidad_eventos_tipo_check
  check (tipo in (
    'vincular',
    'crear_jugador',
    'registrar_manual',
    'fusionar',
    'deshacer',
    'editar_jugador',
    'cambiar_cuenta_activa'
  ));
