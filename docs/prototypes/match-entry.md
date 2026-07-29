# Prototipo de carga móvil de partido

Pregunta: ¿qué flujo permite crear, completar y cerrar un partido desde el celular con la menor fricción sin perder claridad sobre su estado?

## Variantes

- `?variant=A` — carga guiada: cinco pasos lineales, una decisión por pantalla.
- `?variant=B` — mesa de control: marcador persistente y acceso directo por pestañas a ficha, plantel, caja y juego.
- `?variant=C` — pizarras gemelas: edición simultánea por equipo, con actuaciones y aportes en cada columna.

## Decisión

Gana **B — Mesa de control**.

Es la única que funciona igual de bien antes, durante y después del partido: mantiene resultado, estado, cancha, convocatoria y cobro visibles; permite saltar directamente al dato que necesita corregirse; y conserva una acción de cierre inequívoca. La variante A reduce errores al crear, pero obliga a navegar pasos para correcciones durante el partido. La C hace muy fácil comparar equipos, pero sus dos columnas vuelven angostos los controles en 390 px.

Para producción se conserva el orden conceptual de A como checklist de completitud, dentro de la estructura navegable de B.

## Flujo de producción

1. Crear un partido abierto con fecha, cancha guardada y costo.
2. Nombrar los dos equipos temporales, elegir jugadores existentes o crear una ficha nueva y designar un capitán de cada plantel.
3. Repartir automáticamente el costo entre participantes; permitir ajustes de importe esperado, importe pagado y estado pendiente/parcial/pagado.
4. Registrar totales de goles y asistencias por jugador; permitir goles sin autor y autogoles acreditados al rival.
5. Validar cancha, costo, planteles, capitanes, prorrateo y consistencia entre goles y asistencias. Las deudas se advierten, pero no bloquean.
6. Solo el organizador cierra. Cerrar congela la edición y publica estadísticas; reabrir vuelve a habilitar correcciones. Cancelar requiere confirmación y permite recuperar el partido como abierto.

## Evidencia

- Inspección visual a 390 × 844 px de las variantes A, B y C mediante el navegador colaborativo.
- Recorrido interactivo en build de producción: crear abierto → cerrar → reabrir → cancelar → ofrecer recuperación.
- Grabación local de comparación: `browser-recording-ms6h9vmc`.
- `bun run check-types`: aprobado.
- `next build` desde `apps/web` con variables de entorno de prueba: aprobado.

El estado del prototipo vive solo en memoria y se expone completo al pie de cada variante.
