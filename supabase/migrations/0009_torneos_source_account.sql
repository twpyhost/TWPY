-- Dos cuentas organizadoras de Challonge: A (historica, backfill unico) y
-- B (actual, default para todo lo nuevo). Cada torneo guarda de cual vino,
-- solo para trazabilidad/auditoria -- no es user-facing todavia.
alter table torneos
  add column challonge_source_account text not null default 'B'
    check (challonge_source_account in ('A', 'B'));
