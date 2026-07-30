-- Registro de eventos de sistema para el panel de admin "Sistema" (Hito 14
-- del plan de go-live): ultimo ping de salud exitoso, y a futuro cualquier
-- otro evento que valga la pena mostrar (backups, etc). Mismo patron que
-- identidad_eventos: RLS habilitado y SIN policy -- ni anon ni authenticated
-- pueden leer o escribir, solo el service_role (bypassa RLS), usado por
-- /api/health unicamente cuando el header x-health-secret es correcto.
create table sistema_eventos (
  id         bigint generated always as identity primary key,
  tipo       text not null,
  ok         boolean not null,
  detalle    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sistema_eventos_tipo_created_at_idx on sistema_eventos (tipo, created_at desc);

alter table sistema_eventos enable row level security;

-- 0007 otorgo estos privilegios a las tablas que existian en ese momento;
-- esta tabla es nueva y necesita el mismo grant explicito (sin esto,
-- ni siquiera service_role puede escribir -- RLS sin policy ya la protege
-- de anon/authenticated, igual que identidad_eventos).
grant all on sistema_eventos to anon, authenticated, service_role;
