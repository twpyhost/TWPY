-- Reemplaza el esquema plano de identidad (usuarios/nombres_alternativos,
-- una fila = una cuenta de Challonge) por el modelo objetivo documentado en
-- CLAUDE.md: players / player_challonge_accounts / player_aliases /
-- tournament_participants_raw. Sin datos de produccion que preservar
-- (confirmado) -- reemplazo completo, no migracion aditiva.

-- =========================================================================
-- Borra el esquema de identidad viejo. torneos/puntajes_config/juegos
-- quedan intactos.
-- =========================================================================

drop table if exists ranking_snapshots cascade;
drop table if exists resultados cascade;
drop table if exists nombres_alternativos cascade;
drop table if exists usuarios cascade;

-- =========================================================================
-- players: la persona canonica. Deliberadamente sin challonge_id -- una
-- persona puede tener 0, 1 o varias cuentas de Challonge a lo largo del
-- tiempo (ver player_challonge_accounts).
-- =========================================================================

create table players (
  id                     bigint generated always as identity primary key,
  display_name           text not null,
  avatar_url             text,
  discord_id             text,
  -- vinculo con Supabase Auth (fase de cuentas de competidores)
  auth_user_id           uuid unique references auth.users (id) on delete set null,
  -- si no es null, este jugador fue absorbido en una fusion: apunta al
  -- jugador "base" que sobrevive. Nunca se borra la fila (integridad
  -- referencial de resultados historicos + auditoria en identidad_eventos).
  merged_into_player_id  bigint references players (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint players_no_self_merge check (
    merged_into_player_id is null or merged_into_player_id <> id
  )
);

create index players_merged_into_idx on players (merged_into_player_id);

create trigger players_set_updated_at
  before update on players
  for each row execute function public.set_updated_at();

-- =========================================================================
-- player_challonge_accounts: multiples cuentas de Challonge por jugador
-- a lo largo del tiempo. challonge_id es el UNICO criterio usado para
-- auto-resolver participantes al importar un torneo (nunca por nombre).
-- =========================================================================

create table player_challonge_accounts (
  id                 bigint generated always as identity primary key,
  player_id          bigint not null references players (id) on delete cascade,
  challonge_id       bigint not null unique,
  challonge_username text not null,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create index player_challonge_accounts_player_idx on player_challonge_accounts (player_id);

-- Solo una cuenta activa ("ACTIVA") por jugador a la vez.
create unique index player_challonge_accounts_un_activa
  on player_challonge_accounts (player_id)
  where active;

-- =========================================================================
-- player_aliases: nombres vistos DENTRO de una misma cuenta de Challonge
-- (un usuario puede renombrarse en Challonge sin cambiar de cuenta).
-- =========================================================================

create table player_aliases (
  challonge_id bigint not null references player_challonge_accounts (challonge_id) on delete cascade,
  nombre       text not null,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (challonge_id, nombre)
);

create unique index player_aliases_un_activo
  on player_aliases (challonge_id)
  where activo;

-- =========================================================================
-- tournament_participants_raw: cola de resolucion Y tabla de resultados
-- historicos (reemplaza a "resultados"). Una fila por participante de
-- Challonge por torneo, resuelto o no. posicion/puntaje se calculan una
-- sola vez al importar (igual que antes) y quedan inmutables desde
-- entonces; player_id es null hasta que un admin lo vincula/crea.
-- =========================================================================

create table tournament_participants_raw (
  id                  bigint generated always as identity primary key,
  torneo_id           bigint not null references torneos (id) on delete cascade,
  -- null = participante de Challonge sin cuenta propia (invitado manual)
  challonge_id        bigint,
  challonge_username  text,
  -- nombre visto en Challonge para este torneo especifico
  nombre_participante text not null,
  posicion            int not null,
  puntaje             int not null,
  -- null = pendiente de resolucion (cola de identidades)
  player_id           bigint references players (id) on delete set null,
  resolved_at         timestamptz,
  resolved_by         uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- Un solo resultado por cuenta de Challonge por torneo (evita duplicados si
-- Challonge devuelve el mismo participante dos veces).
create unique index tournament_participants_raw_torneo_challonge_un
  on tournament_participants_raw (torneo_id, challonge_id)
  where challonge_id is not null;

-- Un solo resultado por jugador resuelto por torneo (evita doble conteo si
-- dos filas del mismo torneo terminan apuntando al mismo jugador).
create unique index tournament_participants_raw_torneo_player_un
  on tournament_participants_raw (torneo_id, player_id)
  where player_id is not null;

create index tournament_participants_raw_player_idx on tournament_participants_raw (player_id);
create index tournament_participants_raw_challonge_idx on tournament_participants_raw (challonge_id);

-- =========================================================================
-- ranking_snapshots: mismo shape/semantica que antes, ahora referenciando
-- player_id en vez de usuario_id.
-- =========================================================================

create table ranking_snapshots (
  torneo_id         bigint not null references torneos (id) on delete cascade,
  player_id         bigint not null references players (id) on delete cascade,
  temporada         int not null,
  puntaje_acumulado int not null,
  posicion_global   int not null,
  primary key (torneo_id, player_id)
);

create index ranking_snapshots_temporada_idx on ranking_snapshots (temporada, torneo_id);

-- =========================================================================
-- identidad_eventos: log de auditoria de la pantalla de admin
-- "Resolucion de identidades" (vincular/crear/registrar/fusionar/deshacer).
-- =========================================================================

create table identidad_eventos (
  id            bigint generated always as identity primary key,
  tipo          text not null check (tipo in ('vincular', 'crear_jugador', 'registrar_manual', 'fusionar', 'deshacer')),
  actor_user_id uuid references auth.users (id) on delete set null,
  detalle       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index identidad_eventos_created_at_idx on identidad_eventos (created_at desc);

-- =========================================================================
-- RLS: mismo patron que el resto del esquema (lectura publica, escritura
-- solo via service_role desde rutas de admin).
-- =========================================================================

alter table players                     enable row level security;
alter table player_challonge_accounts   enable row level security;
alter table player_aliases              enable row level security;
alter table tournament_participants_raw enable row level security;
alter table ranking_snapshots           enable row level security;
alter table identidad_eventos           enable row level security;

-- Los jugadores fusionados/absorbidos nunca deben aparecer en paginas
-- publicas. service_role (rutas admin) ignora RLS y los ve igual.
create policy "lectura publica" on players
  for select using (merged_into_player_id is null);

create policy "lectura publica" on player_challonge_accounts for select using (true);
create policy "lectura publica" on player_aliases            for select using (true);
create policy "lectura publica" on ranking_snapshots          for select using (true);

-- tournament_participants_raw e identidad_eventos: SIN policy de select.
-- Son la cola interna de resolucion y el log de auditoria del admin, no
-- contenido publico -- las paginas publicas nunca deben leer estas tablas
-- directamente. Solo el service_role (getSupabaseAdmin(), siempre detras
-- de getAdminUser()) puede leerlas o escribirlas.

-- Sin policies de insert/update/delete en ninguna tabla: mismo patron que
-- el resto del esquema.

-- =========================================================================
-- Seed: nada que sembrar aca (juegos/puntajes_config ya sembrados en
-- 0001_init.sql y no se tocan).
-- =========================================================================
