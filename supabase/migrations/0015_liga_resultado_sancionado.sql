-- Permite cerrar una pelea sin ganador cuando ambos participantes reciben
-- una sancion: 0-0 cuenta como partido jugado, pero no como victoria.

alter table liga_partidos
  add column resultado_tipo text not null default 'pendiente';

alter table liga_partidos
  drop constraint liga_partidos_marcador_coherente;

update liga_partidos
   set resultado_tipo = case when ganador_id is null then 'pendiente' else 'jugado' end;

alter table liga_partidos
  add constraint liga_partidos_resultado_tipo_valido check (
    resultado_tipo in ('pendiente', 'jugado', 'sancionado')
  ),
  add constraint liga_partidos_resultado_coherente check (
    (resultado_tipo = 'pendiente' and ganador_id is null and matches_a is null and matches_b is null)
    or (
      resultado_tipo = 'jugado'
      and matches_a is not null and matches_b is not null
      and greatest(matches_a, matches_b) = 3
      and least(matches_a, matches_b) between 0 and 2
      and ganador_id = case when matches_a > matches_b
                            then participante_a_id
                            else participante_b_id end
    )
    or (
      resultado_tipo = 'sancionado'
      and ganador_id is null
      and matches_a = 0
      and matches_b = 0
    )
  );