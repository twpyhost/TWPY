# Pagina Web TWPy

Esta página web será utilizada para rastrear los resultados y puntajes de torneos de la comunidad de Tekken PY

## Observaciones del análisis

El objetivo del PMV(Producto Mínimo Viable) es obtener una página web que permita consultar los resultados de los torneos, las puntuaciones y el ranking de jugadores de la comunidad (o comunidades en caso de querer expandir el objetivo)

La API de Challonge permite acceder a la información de los torneos como el nombre, fecha de creación e inicio, a que juego corresponde, la lista de participantes con su nombre de usuario e id de la plataforma, así también como su posición en dicho torneo.

Con este desarrollo lo que se busca es consumir la api de Challonge (de preferencia, que la api sea de la cuenta con la que se generan todos los torneos, para obtener el listado de torneos de manera más fácil) para obtener la información de cada torneo realizado, como los participantes y sus posiciones, y estos datos, cruzarlos con el sistema de puntaciones determinado por el administrador(en una BD para que sea parametrizable).

## Los datos que se estarían almacenando dentro nuestra BD serían los siguientes:

- Los datos de usuarios de Challonge(id y nombre de usuario)
- Datos de Nombres alternativos para los usuarios(pk compuesta del id de challonge y el nombre, pudiendo estar solamente un nombre alternativo como Activo)
- Los datos de Torneos de Challonge(id, fecha de inicio, a que juego corresponde)
- Las posiciones de los usuarios por cada Torneo
- Las puntuaciones por cada posicion según el juego (los puntajes deben ser parametrizables)
- La sumatoria de puntajes de los distintos torneos por año de cada usuario
- Por cada torneo, se añade una flecha arriba o abajo para indicar la subida o bajada de posición global del participante

El "sistema" debe registrar en la tabla local aquellos usuarios de challonge que no se encuentren registrados anteriormente, así también su nombre alternativo con estado Activo, la informacion del torneo y las posiciones del torneo junto con la puntuación correspondiente.

Para calcular las posiciones del ranking, el sistema debe realizar la sumatoria de los puntos obtenidos en cada torneo del año correspondiente, realizando cortes por cada torneo para poder mantener un registro historico de posiciones dentro del año

Los usuarios serán registrados automáticamente con el usuario y el id de challonge, exceptuando a aquellos participantes que no se hayan registrado con su usuario a traves de la web, para los cuales se deberá crear un id temporal y un nombre temporal, el cual se actualizará cuando se conozca el id de su usuario de challonge. Este nombre temporal se deberá respetar para todos los torneos venideros hasta que el usuario cuente con un id de challonge, ahi se reemplazará la información de sus resultados en torneos y nombres.

El proyecto se decidió construir en Next.js con hosting Vercel utilizando Neon para guardar PostgreSQL (Probar Supabase con postgres primero)
Estudiar la posibilidad de comprar dominios usando cnc.py (o hostinger si no se puede) costeando con torneo

### DER disponible aqui: https://miro.com/app/board/uXjVLtzFaL8=/

### API de Challonge: https://api.challonge.com/v1

### Trello del proyecto: https://trello.com/b/LT8wZFFH/mokete-gaming

#### Version 1.1

Añadir cache para seguridad respecto a DDOS a las consultas SQL (Redis???)
