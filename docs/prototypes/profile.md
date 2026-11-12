# Prototipo de perfil global

Pregunta: ¿cómo debería mostrar `/dashboard/perfil` los números de un jugador sumados entre todos sus grupos, sabiendo que se mira desde el teléfono?

## Variantes

Se probaron contra la vista actual, con datos reales de `stats.global` (dos grupos con partidos, uno vinculado sin partidos cerrados y uno sin vincular) y con estado vacío.

- **Ficha**: un número protagonista (G+A), el récord en una sola barra y los grupos como detalle.
- **Grupos**: el grupo es la forma de mirar. "Todos" es una pestaña más; cada grupo muestra el detalle de su jugador vinculado.
- **Relato**: los números contados como frases, sin grilla de métricas.

## Decisión

Gana **Grupos**.

El jugador piensa en "cómo vengo en los martes" más que en un total abstracto, y esta dirección es la única que usa el detalle que `stats.global` ya trae (promedios por partido, diferencia de gol, calificación, ausencias, autogoles). En mobile las pestañas son chips con scroll horizontal; en desktop pasan a una lista lateral con los PJ de cada grupo.

Descartadas:

- **Ficha**: se lee bien de un vistazo, pero elegir G+A como el número principal es una opinión que no todos comparten, y en desktop sobra espacio debajo de la card.
- **Relato**: la más fácil de entender, pero la peor para comparar cifras de un vistazo, y el badge "Donde más ganás" aparecía con muestras chicas (60% en 5 partidos).

## Cambios de comportamiento

- Se distingue "Sin partidos" (vinculado, todavía sin partidos cerrados) de "Sin vincular". Antes los dos casos decían "Sin vincular".
- "Todos" agrega G+A y perdidos, y reparte los partidos jugados por grupo; tocar un grupo abre su pestaña.

## Evidencia

Capturas a 390 × 844 y 1440 × 900 en tema oscuro de las cuatro vistas (la actual y las tres variantes), con datos reales y vacíos; sin errores de consola ni scroll horizontal.
