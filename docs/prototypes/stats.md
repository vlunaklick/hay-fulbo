# Prototipo de estadísticas y sociedades

Pregunta: ¿cómo se lee el rendimiento del grupo desde el teléfono, y dónde viven las sociedades (antes `/dashboard/estadisticas/sociedades`)?

## Variantes

- **Tabla viva**: un único ranking que se reordena con una tira de métricas (G+A, goles, asistencias, efectividad, nota, duplas). Cada fila se despliega con el detalle, y Sociedades es una métrica más.
- **Portada**: lectura editorial. La figura del período arriba, podios cortos por categoría y la tabla completa en un panel. Sociedades queda como página propia (dupla líder y "la que no arranca").
- **Planilla**: tabla densa ordenable por cualquier columna, con los nombres fijos, más una pestaña "Química" con la matriz de efectividad por pareja.

## Decisión

Gana **Planilla**.

- Pestañas: Tabla · Química · Partidos (`?tab=quimica` / `?tab=partidos`; Tabla es la predeterminada). Se quita la pestaña Resumen con la carrera G+A y los líderes.
- Tabla: todas las columnas del ranking (PJ, G, A, G+A, Prom., Ef., DG, G-E-P, Nota, Aus.), con la columna de nombres fija para desplazar horizontalmente en el teléfono. Se ordena tocando el encabezado (descendente, y al volver a tocar ascendente). Orden inicial por G+A.
- Química: una matriz triangular con los 7 jugadores con más partidos en mobile y 12 en escritorio (los inactivos no entran). Cada casilla muestra el % de victorias jugando juntos. La escala es divergente: `chart-5` por debajo del 40 %, `muted` entre 40 y 60 %, y `chart-2` desde el 60 %. El número siempre está impreso, para no depender solo del color. Debajo va la dupla elegida y la tabla de duplas. `/dashboard/estadisticas/sociedades` redirige a `?tab=quimica`, y Química aparece también en la vista compartida y en la pública.
- Filtros: el período queda a un toque, en tabs (Siempre, Este año, 30 días). Cancha y resultado pasan a un panel detrás de un botón con contador.

Rechazadas:

- **Tabla viva**: es la más rápida para una pregunta puntual, pero muestra una sola métrica por vez y no deja comparar.
- **Portada**: es la más legible para un visitante, pero ocupa mucha pantalla y esconde el ranking completo detrás de un panel.

## Evidencia

- Capturas a 390 × 844 y 1440 × 900 de las tres variantes y de sus vistas de sociedades, con datos determinísticos pasados por `deriveStatsDashboard`: 18 jugadores, 30 partidos, nombres largos, un jugador inactivo y notas parciales.
- Sin errores de consola en ninguna variante.

## Actualización: Próximo paso

Con el patrón de `docs/prototypes/proximo-paso.md` se quitan las pestañas y la barra de filtros. `/dashboard/estadisticas` queda como portada corta:

- `HeroNumber` con los partidos cerrados del período y un `NextStep`: "Calificá el último partido" si el visitante todavía no votó; si no, quién lidera la tabla con "Ver la tabla".
- Filas: Período (abre una Sheet con período, cancha y resultado), Tabla, Jugadores (Sheet A–Z), Sociedades y Partidos.
- La Planilla sigue entera en `/dashboard/estadisticas/tabla` y la Química en `/dashboard/estadisticas/sociedades` (que vuelve a ser página propia). Los partidos en `/dashboard/estadisticas/partidos`.
- Los filtros viven en la URL y viajan entre subpáginas. Los links viejos con `?tab=quimica|partidos|tabla` redirigen a su subpágina.
- **Escritorio**: maestro-detalle con `NextStepLayout`. La portada queda en la columna izquierda y la sección que nombra la URL se abre a la derecha (Tabla por defecto en `/dashboard/estadisticas`). En escritorio, `/tabla`, `/sociedades` y `/partidos` renderizan la misma portada con esa sección abierta; en móvil siguen siendo subpáginas. Período y Jugadores son `DrillDetail` (hoja inferior en móvil). En las fichas de jugador y partido, el resumen va a la izquierda y la lista de partidos o actuaciones a la derecha, abierta por defecto.
