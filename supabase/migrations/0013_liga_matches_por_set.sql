-- Marcador por set en la fase de grupos de la Liga (spec en
-- docs/superpowers/specs/2026-08-11-liga-marcador-por-set-design.md).
--
-- Hasta 0012 un partido guardaba solo `ganador_id` y la tabla daba 1 punto
-- por victoria. Ahora cada partido es un first-to-3 y se carga cuantos
-- matches gano cada lado: el puntaje de la tabla pasa a ser la suma de
-- matches ganados, y la diferencia de matches rompe empates automaticamente
-- antes de caer al desempate manual (orden_desempate).

alter table liga_partidos
  add column matches_a int,
  add column matches_b int;

-- Resultados cargados con el sistema viejo: no tienen marcador y con
-- PTS = matches ganados aportarian 0 puntos, lo que falsea la tabla. Se
-- limpian para que el admin los vuelva a cargar con marcador (son pocos, de
-- la fecha 1). No se rellenan con 3-0 a proposito: seria inventar datos.
--
-- ORDEN IMPORTANTE: esto va ANTES de agregar la constraint. `add constraint`
-- valida las filas que ya estan en la tabla, y una fila vieja (ganador_id no
-- nulo, marcador nulo) la viola -- el ALTER fallaria y se revertiria todo.
-- Sobre una base vacia (tests, `db reset`) el orden da igual; sobre una con
-- datos reales, no.
update liga_partidos
   set ganador_id = null, cargado_at = null, cargado_by = null
 where ganador_id is not null;

-- Un partido es first-to-3: el ganador siempre llega a 3, el perdedor queda
-- entre 0 y 2, y ganador_id tiene que coincidir con el lado que llego a 3.
-- Sin resultado cargado las tres columnas son null (partido pendiente).
alter table liga_partidos
  add constraint liga_partidos_marcador_coherente check (
    (ganador_id is null and matches_a is null and matches_b is null)
    or (
      matches_a is not null and matches_b is not null
      and greatest(matches_a, matches_b) = 3
      and least(matches_a, matches_b) between 0 and 2
      and ganador_id = case when matches_a > matches_b
                            then participante_a_id
                            else participante_b_id end
    )
  );

-- Sin grants nuevos: son columnas de una tabla que ya los tiene (0012).
