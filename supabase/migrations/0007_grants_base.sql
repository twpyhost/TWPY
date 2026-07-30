-- La base local (`supabase start`) no reproduce los grants de tabla que ya
-- existen en el proyecto remoto (otorgados antes de que este repo tuviera
-- migraciones, probablemente por el bootstrap historico de la plataforma):
-- sin este grant explicito, anon/authenticated/service_role no tienen ni
-- SELECT sobre las tablas publicas en un ambiente nuevo (local, o un
-- restore de backup sobre un proyecto vacio -- ver Hito 4), y toda la capa
-- de datos falla con "permission denied" aun para service_role. RLS sigue
-- siendo la barrera real fila-a-fila; esto solo iguala el grant de tabla a
-- lo que remoto ya tiene hoy.
grant all on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Vuelve a aplicar la restriccion de 0006: sin este re-revoke, el grant
-- amplio de arriba se la pisaria.
revoke all on tournament_participants_raw from anon, authenticated;
