-- CHECK acepta NULL como resultado valido. Cada estado debe evaluar a un
-- booleano definido: un FT jugado exige ganador; una sancion exige ambos ceros.
-- Si existen datos incompletos, la validacion falla para que se revisen;
-- no se inventan ganadores ni marcadores para corregirlos automaticamente.
alter table public.liga_partidos
  drop constraint liga_partidos_resultado_coherente,
  add constraint liga_partidos_resultado_coherente check (
    (resultado_tipo = 'pendiente' and ganador_id is null and matches_a is null and matches_b is null)
    or (
      resultado_tipo = 'jugado'
      and ganador_id is not null
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
      and matches_a is not null and matches_b is not null
      and matches_a = 0
      and matches_b = 0
    )
  );
