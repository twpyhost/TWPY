-- Limpia las funciones del esquema viejo (quedaron rotas al borrar las
-- tablas legacy en 0003) y deja la autenticacion de admins en Supabase:
-- un usuario de Supabase Auth es admin si tiene el rol 'admin' en
-- user_roles. La app lo consulta via la funcion is_admin().

-- =========================================================================
-- Funciones legacy: todas referencian tablas borradas (juego, torneo,
-- torneo_resultado, usuario, ranking, puntuaciones). La logica ya vive en
-- la app (insertar_torneo route y la capa de datos).
-- =========================================================================

drop function if exists public.insertar_torneo(integer, text, integer, text, date);
drop function if exists public.insertar_puntaje(integer, integer, integer, integer);
drop function if exists public.insertar_jugador(text, integer, text);
drop function if exists public.get_filtro_ano();
drop function if exists public.player_ranking(integer, integer);
drop function if exists public.player_ranking();
drop function if exists public.get_ranking();
drop sequence if exists public.seq_challonge_id;

-- =========================================================================
-- Roles de admin (tablas ya existentes del esquema viejo, se reutilizan)
-- =========================================================================

-- El rol viejo 'admin_challonge' pasa a llamarse 'admin'
update roles set name = 'admin' where name = 'admin_challonge';

insert into roles (name)
select 'admin'
where not exists (select 1 from roles where name = 'admin');

-- user_roles.user_id no tenia FK a auth.users
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'user_roles'
      and constraint_name = 'user_roles_user_id_fkey'
  ) then
    alter table user_roles
      add constraint user_roles_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end
$$;

-- RLS: cada usuario puede ver solo sus propios roles; escritura solo via
-- service_role (igual que el resto del esquema).
alter table roles      enable row level security;
alter table user_roles enable row level security;

drop policy if exists "lectura autenticados" on roles;
create policy "lectura autenticados" on roles
  for select to authenticated using (true);

drop policy if exists "leer roles propios" on user_roles;
create policy "leer roles propios" on user_roles
  for select to authenticated using (user_id = (select auth.uid()));

-- =========================================================================
-- is_admin(): la usan las rutas de la app (rpc) y sirve para policies
-- futuras. security definer para poder leer user_roles sin depender de
-- las policies del usuario.
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon, service_role;

-- =========================================================================
-- updated_at automatico en usuarios (la columna existia desde 0001 pero
-- nada la mantenia al dia)
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists usuarios_set_updated_at on usuarios;
create trigger usuarios_set_updated_at
  before update on usuarios
  for each row execute function public.set_updated_at();
