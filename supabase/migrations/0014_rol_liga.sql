-- Separacion de roles del panel: hasta ahora existia un unico rol 'admin'
-- (0004) y quien lo tenia entraba a todo. Se agrega el rol 'liga', pensado
-- para los organizadores de la fase de grupos: solo pueden operar
-- /admin/liga (cargar marcadores, resolver empates, cerrar grupos, vincular
-- participantes) y nada mas.
--
-- Jerarquia: 'admin' es superusuario e incluye lo que puede hacer 'liga'
-- (no hace falta darle los dos roles). is_admin() no cambia de significado:
-- sigue siendo "es superusuario", y las rutas que hoy la usan siguen valiendo.
--
-- Asignar el rol a alguien (manual, no hay UI):
--   insert into user_roles (user_id, role_id)
--   select u.id, r.id
--   from auth.users u, roles r
--   where u.email = 'persona@ejemplo.com' and r.name = 'liga'
--   on conflict do nothing;

insert into roles (name)
select 'liga'
where not exists (select 1 from roles where name = 'liga');

-- =========================================================================
-- roles_panel(): roles del usuario actual que dan acceso al panel. Se
-- devuelve el conjunto en una sola llamada (y no un is_liga() suelto) porque
-- la app necesita distinguir superusuario de solo-liga en el mismo request
-- para decidir el nav y el destino del redirect.
-- =========================================================================

create or replace function public.roles_panel()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(r.name order by r.name)
      from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.name in ('admin', 'liga')
    ),
    '{}'::text[]
  );
$$;

revoke execute on function public.roles_panel() from public;
grant execute on function public.roles_panel() to authenticated, anon, service_role;
