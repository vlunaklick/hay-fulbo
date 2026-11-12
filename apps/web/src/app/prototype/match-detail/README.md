# Prototipo: detalle de partido

Pregunta: ¿cómo se organiza `/dashboard/partidos/[matchId]` para que, desde el
teléfono en la cancha, lo importante de cada estado del partido esté en la
primera pantalla?

Ruta local: `/prototype/match-detail?v=1&estado=live&rol=organizer`

- `v=1` — **Tablero**: el marcador es el ancla (y se queda fijo arriba al hacer
  scroll en mobile); equipos, planilla, caja y notas van en pestañas.
- `v=2` — **Planilla**: una sola tabla por equipo; el marcador es la suma de sus
  filas y un gol se carga tocando el número del jugador.
- `v=3` — **Fases**: la página sigue el ciclo convocatoria → partido → cierre →
  notas; solo la fase actual está abierta y el resto queda en una línea.

`estado`: `upcoming` (por jugar), `live` (en juego), `closed`, `cancelled`.
`rol`: `organizer` o `player`. Teclas `1`–`3` y `←`/`→` cambian de variante;
`chrome=0` oculta los controles para sacar capturas.

Datos y acciones son mock en memoria (`data.ts`). Código descartable: la variante
elegida se reimplementa sobre las queries y comandos de producción.

## Decisión

Pendiente.
