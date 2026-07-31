-- Migra los datos del esquema viejo (tablas en singular: juego, usuario,
-- nombre_alternativo, torneo, torneo_resultado, puntuaciones) al esquema
-- nuevo de 0001_init.sql.
--
-- Solo corre si las tablas viejas existen, asi un ambiente nuevo (local o
-- staging sin datos legacy) puede aplicar esta migracion sin error.

do $mig$
begin
  if to_regclass('public.torneo_resultado') is null then
    return;
  end if;

  -- ---------------------------------------------------------------------
  -- Juegos: mapear por nombre (case-insensitive), crear los que falten.
  -- El viejo "TEKKEN 8" (juego_id 236261) se mapea al "Tekken 8" del seed.
  -- ---------------------------------------------------------------------
  insert into juegos (nombre)
  select v.nombre
  from juego v
  where not exists (
    select 1 from juegos n where lower(n.nombre) = lower(v.nombre)
  );

  create temp table mapa_juego on commit drop as
  select v.juego_id as viejo_id, n.id as nuevo_id
  from juego v
  join juegos n on lower(n.nombre) = lower(v.nombre);

  -- ---------------------------------------------------------------------
  -- Puntajes: "puntuaciones" es la tabla oficial de la comunidad;
  -- reemplaza por completo el seed provisorio de 0001_init.sql.
  -- ---------------------------------------------------------------------
  delete from puntajes_config pc
  using mapa_juego m
  where pc.juego_id = m.nuevo_id;

  insert into puntajes_config (juego_id, posicion, puntos)
  select m.nuevo_id, p.posicion, p.puntaje
  from puntuaciones p
  join mapa_juego m on m.viejo_id = p.juego_id;

  -- ---------------------------------------------------------------------
  -- Usuarios: todos los viejos tienen challonge_id (era su PK).
  -- email/roladmin/uid del esquema viejo no se migran: el admin ahora es
  -- por env var y las cuentas de competidores llegan en una fase futura.
  -- ---------------------------------------------------------------------
  insert into usuarios (challonge_id, challonge_username, es_temporal)
  select v.challonge_id, v.challonge_username, false
  from usuario v
  where not exists (
    select 1 from usuarios n where n.challonge_id = v.challonge_id
  );

  -- ---------------------------------------------------------------------
  -- Nombres alternativos: estado 'S'/'N' pasa a boolean activo.
  -- ---------------------------------------------------------------------
  insert into nombres_alternativos (usuario_id, nombre, activo)
  select u.id, v.nombre_alternativo, v.estado = 'S'
  from nombre_alternativo v
  join usuarios u on u.challonge_id = v.challonge_id
  on conflict (usuario_id, nombre) do nothing;

  -- ---------------------------------------------------------------------
  -- Torneos: torneo_id viejo ya era el id de Challonge. La temporada se
  -- deriva del anio de la fecha (mismo criterio que insertar_torneo).
  -- url_challonge se desconoce en el esquema viejo, queda null.
  -- ---------------------------------------------------------------------
  insert into torneos (id, nombre, fecha_inicio, temporada, juego_id, url_challonge)
  select v.torneo_id,
         v.nombre_torneo,
         v.fecha_torneo,
         extract(year from v.fecha_torneo)::int,
         m.nuevo_id,
         null
  from torneo v
  join mapa_juego m on m.viejo_id = v.juego_id
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------
  -- Resultados: el puntaje historico desnormalizado se copia tal cual.
  -- ---------------------------------------------------------------------
  insert into resultados (torneo_id, usuario_id, posicion, puntaje)
  select v.torneo_id, u.id, v.posicion, v.puntaje
  from torneo_resultado v
  join usuarios u on u.challonge_id = v.challonge_id
  on conflict (torneo_id, usuario_id) do nothing;

  -- ---------------------------------------------------------------------
  -- Ranking snapshots: la tabla vieja "ranking" esta vacia, asi que se
  -- reconstruye la historia con el mismo algoritmo que recalcularSnapshots
  -- (insertar_torneo): por temporada, torneos en orden cronologico,
  -- acumulado por usuario y posicion global al cierre de cada torneo.
  -- ---------------------------------------------------------------------
  delete from ranking_snapshots
  where temporada in (
    select distinct extract(year from fecha_torneo)::int from torneo
  );

  insert into ranking_snapshots
    (torneo_id, usuario_id, temporada, puntaje_acumulado, posicion_global)
  select snap.torneo_id,
         snap.usuario_id,
         snap.temporada,
         snap.puntaje_acumulado,
         row_number() over (
           partition by snap.torneo_id
           order by snap.puntaje_acumulado desc, snap.usuario_id
         ) as posicion_global
  from (
    select t.id as torneo_id,
           t.temporada,
           r.usuario_id,
           sum(r.puntaje) as puntaje_acumulado
    from (
      select id, temporada,
             row_number() over (partition by temporada order by fecha_inicio, id) as rn
      from torneos
      where temporada in (
        select distinct extract(year from fecha_torneo)::int from torneo
      )
    ) t
    join (
      select r0.torneo_id, r0.usuario_id, r0.puntaje, t0.temporada, t0.rn
      from resultados r0
      join (
        select id, temporada,
               row_number() over (partition by temporada order by fecha_inicio, id) as rn
        from torneos
      ) t0 on t0.id = r0.torneo_id
    ) r on r.temporada = t.temporada and r.rn <= t.rn
    group by t.id, t.temporada, r.usuario_id
  ) snap;
end
$mig$;
