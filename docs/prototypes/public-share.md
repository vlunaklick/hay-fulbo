# Prototipo: vista compartida (`/g/[slug]` y `/compartido`)

Pregunta: ¿qué tiene que ver primero alguien que abre el enlace del grupo desde
WhatsApp, y cómo llega a un partido o a un jugador sin perderse?

Antecedente: `prototype/shared-dashboard` ya había elegido "El vestuario" como
feed, pero producción siguió mostrando la pantalla de estadísticas del miembro
(filtros + tabs Resumen/Ranking/Partidos), sin la próxima fecha aunque la API
ya la devolvía.

## Variantes

Las tres leían la API pública real sobre un grupo con 26 partidos, 21 jugadores
(nombre largo, inactivo, invitado), dos canchas, un cancelado, un autogol y una
próxima fecha con cuatro deudores.

- **La previa**: un solo scroll en orden temporal: próxima fecha → último
  partido con goleadores → top 5 → resultados por mes. Detalle en página
  completa con "Volver".
- **La tabla**: el ranking como página, ordenable por G+A, goles, asistencias,
  % de victorias y PJ, con filas que se abren en el lugar. La próxima fecha
  queda en una línea y los resultados en una tira horizontal.
- **El vestuario**: shell de app con tres destinos (Próxima, Resultados, Tabla)
  y el detalle de partido o jugador en un sheet.

## Decisión

Gana **El vestuario**.

- Cada destino tiene una sola tarea. El que entra desde WhatsApp cae en
  "Próxima": fecha como ticket, "Cómo llegar" como única acción primaria,
  equipos con sus colores y, en el enlace privado, "La caja" con quién falta
  pagar.
- El detalle nunca saca de la pantalla: en mobile es un sheet inferior y en
  escritorio un panel lateral. Desde un partido se abre un jugador y viceversa,
  y "atrás" vuelve paso a paso.
- Tabla con podio de tres y el resto en lista; métrica G+A, goles o
  asistencias.
- Resultados como marcadores agrupados por mes.

Rechazadas:

- **La previa**: mucho scroll en mobile para llegar a la tabla, y la tabla
  completa quedaba escondida detrás de un "ver todos".
- **La tabla**: excelente para comparar, pero reduce la próxima fecha y los
  pagos a una línea, justo lo que más se busca al abrir el enlace.
- Los filtros de período, cancha y resultado no pasan a la vista compartida.
  Siguen en `/dashboard/estadisticas` para miembros.

## Implementación

- `apps/web/src/features/shared-view/`. La vista vive en el layout de
  `/g/[slug]` y de `/compartido`. Las rutas `/partidos/[id]` y
  `/jugadores/[id]` siguen existiendo (los enlaces viejos funcionan) y se
  abren como sheet sobre la pantalla.
- Desde el rediseño "Próximo paso" (`docs/prototypes/proximo-paso.md`) ya no hay
  pestañas: una sola pantalla con la hora del próximo partido, un `NextStep`
  con "Cómo llegar" y filas Equipos, La caja (solo enlace privado), Resultados
  y Tabla. Cada fila abre la misma sheet.
- Sección y métrica en la URL: `?seccion=resultados|tabla|caja`,
  `?orden=goals|assists`. El viejo `?tab=` sigue abriendo la sección.
- `/g/[slug]` nunca muestra importes; `/compartido` sí.
