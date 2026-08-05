-- Modulo de Liga: fase de grupos controlada desde la web (spec en
-- docs/superpowers/specs/2026-08-04-liga-fase-de-grupos-design.md).
-- Independiente del ranking anual -- no toca ranking_snapshots,
-- puntajes_config ni el importador de Challonge. La fase final (bracket)
-- se sigue jugando en Challonge y entra por el flujo de torneos existente.

-- =========================================================================
-- ligas: una liga por temporada/edicion. El esquema admite mas de una
-- edicion (otro slug, otro JSON de fixture) aunque hoy no se construye
-- pantalla para elegir entre varias.
-- =========================================================================

create table ligas (
  id         bigint generated always as identity primary key,
  slug       text not null unique,
  nombre     text not null,
  temporada  int not null,
  estado     text not null default 'planificada'
             check (estado in ('planificada', 'en_curso', 'finalizada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ligas_set_updated_at
  before update on ligas
  for each row execute function public.set_updated_at();

-- =========================================================================
-- liga_fechas: las fechas del calendario (domingos con hora fija).
-- =========================================================================

create table liga_fechas (
  id       bigint generated always as identity primary key,
  liga_id  bigint not null references ligas (id) on delete cascade,
  numero   int not null,
  fecha    date not null,
  hora     time not null,
  unique (liga_id, numero)
);

-- =========================================================================
-- liga_grupos: los 5 grupos de la fase. cupos_clasificados y cerrado
-- controlan la tabla en vivo y si el admin puede seguir cargando peleas.
-- =========================================================================

create table liga_grupos (
  id                  bigint generated always as identity primary key,
  liga_id             bigint not null references ligas (id) on delete cascade,
  numero              int not null,
  nombre              text not null,
  cupos_clasificados  int not null default 5,
  cerrado             boolean not null default false,
  unique (liga_id, numero)
);

-- =========================================================================
-- liga_participantes: nombre del fixture, vinculado opcionalmente a un
-- players.id. player_id es nullable a proposito -- la liga funciona
-- completa sin vincular a nadie, el vinculo solo agrega link al perfil
-- (ver "Estado real de los datos" en el spec).
-- =========================================================================

create table liga_participantes (
  id               bigint generated always as identity primary key,
  grupo_id         bigint not null references liga_grupos (id) on delete cascade,
  nombre           text not null,
  player_id        bigint references players (id) on delete set null,
  orden_desempate  int,
  unique (grupo_id, nombre)
);

create index liga_participantes_grupo_idx  on liga_participantes (grupo_id);
create index liga_participantes_player_idx on liga_participantes (player_id);

-- =========================================================================
-- liga_partidos: una pelea entre dos participantes del mismo grupo, en una
-- fecha dada. ganador_id null = pendiente. cargado_at/cargado_by es toda
-- la auditoria que hace falta (el admin es una sola persona) -- no hay
-- tabla liga_eventos. No hay tabla de descansos: quien descansa en una
-- fecha se deriva (el participante del grupo que no aparece en ninguna
-- pelea de esa fecha).
-- =========================================================================

create table liga_partidos (
  id                 bigint generated always as identity primary key,
  grupo_id           bigint not null references liga_grupos (id) on delete cascade,
  fecha_id           bigint not null references liga_fechas (id) on delete cascade,
  participante_a_id  bigint not null references liga_participantes (id) on delete cascade,
  participante_b_id  bigint not null references liga_participantes (id) on delete cascade,
  orden              int not null,
  ganador_id         bigint references liga_participantes (id) on delete set null,
  cargado_at         timestamptz,
  cargado_by         uuid references auth.users (id) on delete set null,
  constraint liga_partidos_participantes_distintos check (participante_a_id <> participante_b_id),
  constraint liga_partidos_ganador_valido check (
    ganador_id is null or ganador_id in (participante_a_id, participante_b_id)
  ),
  unique (grupo_id, participante_a_id, participante_b_id)
);

create index liga_partidos_grupo_idx on liga_partidos (grupo_id);
create index liga_partidos_fecha_idx on liga_partidos (fecha_id);

-- =========================================================================
-- RLS: mismo patron que el resto del esquema (lectura publica, escritura
-- solo via service_role desde rutas de admin). Sin policies de
-- insert/update/delete.
-- =========================================================================

alter table ligas               enable row level security;
alter table liga_fechas         enable row level security;
alter table liga_grupos         enable row level security;
alter table liga_participantes  enable row level security;
alter table liga_partidos       enable row level security;

create policy "lectura publica" on ligas              for select using (true);
create policy "lectura publica" on liga_fechas        for select using (true);
create policy "lectura publica" on liga_grupos        for select using (true);
create policy "lectura publica" on liga_participantes for select using (true);
create policy "lectura publica" on liga_partidos      for select using (true);

-- 0007 otorgo "grant all on all tables" solo a las tablas que existian en
-- ese momento -- estas son nuevas y necesitan el mismo grant explicito
-- (sin esto ni siquiera service_role puede escribir en un ambiente nuevo,
-- ver el mismo caso en 0008_sistema_eventos.sql). RLS sigue siendo la
-- barrera real fila-a-fila.
grant all on ligas, liga_fechas, liga_grupos, liga_participantes, liga_partidos
  to anon, authenticated, service_role;
