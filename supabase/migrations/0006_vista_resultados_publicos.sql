-- Los resultados publicos se exponen via vista: tournament_participants_raw
-- es la cola interna de resolucion y no debe leerse desde paginas publicas
-- (ver comentario en 0005). La vista corre con privilegios del owner
-- (security_invoker = false, default) y por eso puede leer la tabla base sin
-- una policy que expondria challonge_id/username/resolved_by al rol anon.
create view torneo_resultados_publicos as
  select tpr.torneo_id,
         t.nombre       as torneo_nombre,
         tpr.player_id,
         p.display_name as jugador_nombre,
         tpr.posicion,
         tpr.puntaje
  from tournament_participants_raw tpr
  join torneos t on t.id = tpr.torneo_id
  join players p on p.id = tpr.player_id
  where tpr.player_id is not null
    and p.merged_into_player_id is null;

grant select on torneo_resultados_publicos to anon, authenticated;
-- Defensa en profundidad: ademas de RLS, sin privilegio de tabla para anon.
revoke all on tournament_participants_raw from anon, authenticated;
