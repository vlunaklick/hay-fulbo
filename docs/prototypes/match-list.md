# Prototipo de la lista de partidos

Pregunta: ¿cómo debería ser `/dashboard/partidos`, incluido el alta de un partido, para alguien que la abre desde el teléfono al costado de la cancha?

## Variantes

Se compararon contra la vista anterior (dos listas planas, Próximos y Jugados, y alta en un diálogo con solo la fecha):

- **La próxima**: jerarquía. La próxima fecha ocupa la pantalla y el historial queda como lista compacta de resultados. El alta va en la misma pantalla, con fechas sugeridas.
- **Planilla**: densidad. Un único registro filtrable por estado y agrupado por mes, con filas tipo marcador en mobile y tabla en escritorio. El alta va en un sheet.
- **Agenda**: tiempo. Tira semanal en mobile y grilla de cuatro semanas en escritorio. Tocar un día libre abre el alta para ese día.

## Decisión

Gana **La próxima**.

La pregunta más frecuente al abrir la vista es "¿cuándo jugamos y dónde?", y esta variante la responde sin scroll. También deja a la vista lo que falta cerrar. Para el organizador, armar la semana siguiente son dos toques: elige una fecha sugerida y crea.

- La fecha sugerida sale de la costumbre del grupo: los dos días y horarios más jugados, en días todavía sin partido, dentro de las próximas cuatro semanas.
- La cancha y el costo salen del último partido con cancha, siempre que esa cancha no esté archivada.
- "Otra fecha" abre un campo de fecha y hora.
- Al crear, la app navega al partido, igual que antes.
- Los partidos abiertos de días anteriores se muestran como "Falta cerrar" y ya no aparecen entre los próximos.
- Los próximos se ordenan del más cercano al más lejano.

## Descartes

- **Planilla**: la mejor para controlar y comparar, pero es la más administrativa y no destaca la próxima fecha. Sus filtros por estado y su tabla de escritorio quedan como opción si el historial crece mucho.
- **Agenda**: muestra muy bien los días libres, pero manda el historial a una sección aparte y ver un partido cuesta un toque más. En mobile, una tira de días que no muestra la semana del partido elegido confunde. Si vuelve, tiene que paginar por semanas completas.
- **Vista anterior**: mezclaba partidos jugados sin cerrar con los próximos y ordenaba los próximos al revés.

## Pendiente

`matches.list` no trae el nombre de la cancha (se toma de `matches.directory`) ni la cantidad de jugadores o la deuda por partido. Si la tarjeta del próximo partido tiene que mostrar convocados o caja, hay que sumarlo a la query.

## Evidencia

- Prototipo en `/prototype/match-list`, con picker en vivo sobre la vista anterior. Se borró al integrar la variante elegida.
- Revisado con datos sembrados por la API (14 partidos: abiertos, cerrados, uno sin cerrar y uno cancelado) a 390 × 844 y 1280 × 1100.
- En el prototipo se probó el alta de punta a punta desde Agenda; el sheet de Planilla se abrió con cancha y costo precargados. El alta de La próxima se verificó ya integrada en producción.

## Rediseño "Próximo paso" (nov 2026)

Se mantiene la decisión de La próxima con el patrón de `docs/prototypes/proximo-paso.md`. `NextStep` muestra, en orden: el partido en juego, el primer partido sin cerrar (organizadores), la próxima fecha o, sin fecha, el alta rápida con fechas sugeridas. Los próximos y "Armar otra fecha" (abre una sheet con el alta) van en filas. Los jugados se agrupan por mes en filas fecha · resultado. El alta rápida es `QuickCreateForm` en `new-match-dialog.tsx`, y el inicio la abre en una sheet.

### Escritorio

Desde `lg`, `NextStepLayout`: la derecha muestra el resumen (`MatchSummary`) del partido en foco (en juego, sin cerrar, próximo o último jugado). Las filas siguen siendo links al partido; en escritorio un clic simple lo muestra a la derecha y el resumen tiene "Abrir partido" (cmd/ctrl-clic sigue abriendo la página). "Armar otra fecha" abre el alta en la misma columna.
