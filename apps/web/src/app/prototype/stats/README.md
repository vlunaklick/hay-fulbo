# Prototipo: estadísticas y sociedades

Pregunta: ¿cómo se lee el rendimiento del grupo desde el teléfono, y dónde viven
las sociedades (hoy `/dashboard/estadisticas/sociedades`)?

Ruta local: `/prototype/stats?v=1|2|3` · `&screen=sociedades` abre la vista de
sociedades de cada variante · `&data=empty` muestra el grupo sin partidos.
Teclas `1–3` y `←/→` cambian de variante.

- `1` **Tabla viva**: un único ranking que se reordena con una tira de métricas
  (G+A, goles, asistencias, efectividad, nota, duplas). Cada fila se expande con
  el detalle. Sociedades es una métrica más.
- `2` **Portada**: la figura del período arriba, podios cortos por categoría y
  la tabla completa en un sheet. Sociedades queda como página propia, también
  editorial (dupla líder y "la que no arranca").
- `3` **Planilla**: tabla densa ordenable por cualquier columna, con la columna
  de nombres fija, más una pestaña "Química" con una matriz de efectividad por
  pareja (escala divergente `chart-5` ↔ `chart-2`, con el número en cada casilla).

Los datos salen de un `StatsSource` determinístico pasado por
`deriveStatsDashboard`, así que los filtros y los números son los de producción.

## Decisión

Pendiente.
