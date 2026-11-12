# Patrón: Próximo paso

Pregunta: ¿cómo simplificamos todas las pantallas para que, en el teléfono, se entienda al instante qué hacer?

Se exploraron tres variantes sobre el detalle de partido (Una lista, Próximo paso, Relato). Gana **Próximo paso**, con la línea de resumen de caja ("falta $X") tomada de Una lista. Se aplica a toda la app.

## La forma de una pantalla

1. **`StatusHeader`**: título, una línea de metadata y, si aplica, el estado (pill con texto, nunca solo color).
2. **`HeroNumber`**: el número de la pantalla (marcador, total, anotados, deuda). Opcional si la pantalla no tiene uno.
3. **`NextStep`**: una tarjeta que responde "¿qué hago ahora?". Un kicker corto con el porqué ("3 deben su parte"), un título con la acción en palabras y **un único botón primario**. Cambia según el estado. Si no hay nada que hacer, no se muestra.
4. **`DrillList` + `DrillRow`**: todo lo demás en filas de 48 px: label a la izquierda, un valor corto a la derecha (`5 vs 5`, `falta $14.400`), chevron. Cada fila abre una `Sheet` o una página. Nada de pestañas ni de cards apiladas.
5. **`ActionDock`** (opcional): barra al pulgar solo para acciones del momento (sumar gol, terminar partido). Sin dock si no hace falta.

Componentes en `apps/web/src/components/next-step.tsx`.

## Reglas

- **Sin pestañas** (`Tabs`) para separar secciones de una pantalla. Lo que antes era una pestaña es una `DrillRow` que abre una `Sheet` (móvil: `side="bottom"`) o una subpágina.
- **Una acción primaria por vista** vive en `NextStep` (o en el dock, nunca en ambos).
- **Valores, no formularios**: la fila muestra el resumen; la edición vive adentro.
- **Escritorio amplía**: el contenido queda en una columna de `max-w-xl`; se puede mostrar la `Sheet` como panel derecho, pero el orden mental es el mismo.
- Estado vacío = un `NextStep` que lleva a crear lo primero.
