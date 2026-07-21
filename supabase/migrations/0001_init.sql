-- TWPY Ranking - esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o via supabase db push).

-- =========================================================================
-- Tablas
-- =========================================================================

create table if not exists juegos (
  id     bigint generated always as identity primary key,
  nombre text not null unique
);

create table if not exists usuarios (
  id                 bigint generated always as identity primary key,
  -- id de la cuenta de Challonge; null = usuario temporal (README)
  challonge_id       bigint unique,
  challonge_username text not null,
  es_temporal        boolean not null default false,
  -- vinculo con Supabase Auth (fase de cuentas de competidores)
  auth_user_id       uuid unique references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists nombres_alternativos (
  usuario_id bigint not null references usuarios (id) on delete cascade,
  nombre     text not null,
  activo     boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (usuario_id, nombre)
);

-- Solo un nombre alternativo activo por usuario
create unique index if not exists nombres_alternativos_un_activo
  on nombres_alternativos (usuario_id)
  where activo;

create table if not exists torneos (
  -- id del torneo en Challonge
  id            bigint primary key,
  nombre        text not null,
  fecha_inicio  date not null,
  temporada     int not null,
  juego_id      bigint not null references juegos (id),
  url_challonge text,
  created_at    timestamptz not null default now()
);

-- Puntaje parametrizable por juego y posicion (README)
create table if not exists puntajes_config (
  juego_id bigint not null references juegos (id) on delete cascade,
  posicion int not null,
  puntos   int not null,
  primary key (juego_id, posicion)
);

create table if not exists resultados (
  torneo_id  bigint not null references torneos (id) on delete cascade,
  usuario_id bigint not null references usuarios (id) on delete cascade,
  posicion   int not null,
  -- puntos otorgados, desnormalizado: cambiar la config despues
  -- no reescribe la historia
  puntaje    int not null,
  primary key (torneo_id, usuario_id)
);

-- Corte del ranking por cada torneo (README): registro historico de la
-- posicion global y el acumulado de la temporada al cierre de cada torneo.
create table if not exists ranking_snapshots (
  torneo_id         bigint not null references torneos (id) on delete cascade,
  usuario_id        bigint not null references usuarios (id) on delete cascade,
  temporada         int not null,
  puntaje_acumulado int not null,
  posicion_global   int not null,
  primary key (torneo_id, usuario_id)
);

create index if not exists ranking_snapshots_temporada_idx
  on ranking_snapshots (temporada, torneo_id);

-- =========================================================================
-- RLS: lectura publica, escritura solo via service_role (rutas de admin)
-- =========================================================================

alter table juegos               enable row level security;
alter table usuarios             enable row level security;
alter table nombres_alternativos enable row level security;
alter table torneos              enable row level security;
alter table puntajes_config      enable row level security;
alter table resultados           enable row level security;
alter table ranking_snapshots    enable row level security;

create policy "lectura publica" on juegos               for select using (true);
create policy "lectura publica" on usuarios             for select using (true);
create policy "lectura publica" on nombres_alternativos for select using (true);
create policy "lectura publica" on torneos              for select using (true);
create policy "lectura publica" on puntajes_config      for select using (true);
create policy "lectura publica" on resultados           for select using (true);
create policy "lectura publica" on ranking_snapshots    for select using (true);

-- Sin policies de insert/update/delete: solo el service_role (que ignora
-- RLS) puede escribir, siempre desde rutas de API protegidas por el admin.

-- =========================================================================
-- Seed
-- =========================================================================

insert into juegos (nombre)
values ('Tekken 8')
on conflict (nombre) do nothing;

-- Puntajes por posicion (valores actuales de la comunidad; ajustar aca o
-- en el dashboard de Supabase cuando cambie el reglamento).
insert into puntajes_config (juego_id, posicion, puntos)
select j.id, p.posicion, p.puntos
from juegos j,
     (values
        (1, 100),
        (2, 80),
        (3, 65),
        (4, 55),
        (5, 45),
        (7, 30)
     ) as p (posicion, puntos)
where j.nombre = 'Tekken 8'
on conflict (juego_id, posicion) do nothing;
