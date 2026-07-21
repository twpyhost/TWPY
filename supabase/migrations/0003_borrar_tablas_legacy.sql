-- Elimina el esquema viejo una vez migrados los datos (0002).
--
-- Se conservan "roles" y "user_roles": estan atados a auth.users y no
-- forman parte del esquema de datos viejo; revisar aparte si se usan.

-- hijos primero (FKs hacia torneo/usuario/juego)
drop table if exists ranking;
drop table if exists torneo_resultado;
drop table if exists nombre_alternativo;
drop table if exists personaje;    -- vacia; referenciaba a juego
drop table if exists puntuaciones; -- migrada a puntajes_config
drop table if exists torneo;
drop table if exists usuario;
drop table if exists juego;
