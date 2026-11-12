# Prototipo: detalle de partido

Pregunta: ¿cómo se organiza `/dashboard/partidos/[matchId]` para que, desde el teléfono en la cancha, lo importante de cada estado del partido esté en la primera pantalla?

Antes, con el partido en juego, el editor de planteles ocupaba la primera pantalla del celular y el marcador quedaba abajo.

## Variantes

- **Tablero**: el marcador es el ancla y se queda fijo arriba al hacer scroll en mobile. Equipos, planilla, caja y notas van en pestañas que cambian según el estado.
- **Planilla**: una tabla por equipo. El marcador es la suma de sus filas y un gol se carga tocando el número del jugador.
- **Fases**: la página sigue el ciclo convocatoria → partido → cierre → notas. Solo la fase actual está abierta.

## Decisión

Gana **Tablero**.

Es la única que pone el marcador (o, antes del partido, quién juega y cómo llegan) en la primera pantalla en los cuatro estados, y deja una sola acción principal por estado: invitar antes, sumar goles durante, cerrar al final (barra fija sobre la navegación) y calificar después. Además es la que menos cambia el modelo mental de producción, porque reutiliza el marcador, la hoja "¿Quién la hizo?", el modo cancha y el resultado compartible.

Se descartaron:

- **Planilla**: cargar tocando el número es rápido, pero en 375 px cinco columnas dejan los nombres muy cortos y es fácil sumar al jugador equivocado.
- **Fases**: explica bien el ciclo, pero en mobile el acordeón esconde el marcador detrás de un paso y obliga a abrir y cerrar secciones durante el partido.

## Producción

- Por jugar (abierto y antes de la hora): equipos con cantidad de anotados y "Cómo llegan". Pestañas Equipos y Caja. "Invitar" es el botón principal del organizador.
- En juego: marcador con Gol/Restar, planillero y modo cancha. Pestañas Planilla, Equipos y Caja. Barra "Cerrar partido" con el primer pendiente.
- Cerrado: resultado compartible. Pestañas Notas, Planilla y Caja.
- Cancelado: equipos en solo lectura.
- La caja deja de ser una hoja lateral y pasa a ser una pestaña, con el total, lo juntado y lo que falta.
