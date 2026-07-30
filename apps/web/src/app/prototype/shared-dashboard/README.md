# Prototipo: dashboard compartido

Pregunta: ¿qué arquitectura de información permite entender rápido la próxima
fecha, las deudas, los resultados y el ranking desde el enlace privado del grupo?

Ruta local: `/prototype/shared-dashboard?variant=a`

- `a` — **La tapa**: portada editorial; próxima fecha y deuda dominan, seguida
  por resultados y tabla completa.
- `b` — **Mesa técnica**: centro de control denso; maximiza comparación y volumen
  de datos en escritorio.
- `c` — **El vestuario**: feed mobile-first; ordena lo urgente y luego deja
  explorar ranking e historial.

## Decisión

Gana **C — El vestuario**.

Es la única dirección que mantiene una jerarquía natural al entrar desde
WhatsApp en un teléfono: identidad y privacidad → próxima fecha → deuda →
ranking → historial. A conserva mejor la tabla completa en escritorio y B es la
más eficiente para un operador, pero ambas requieren más lectura horizontal y
se sienten administrativas para un visitante de solo lectura.

## Arquitectura de información para producción

1. Encabezado del grupo con marca de enlace privado, solo lectura y no indexado.
2. Próximo partido con fecha/hora, cancha, dirección, Maps, costo por jugador,
   participantes y capitanes.
3. Estado de caja de esa fecha con total, avance pagado y deudores.
4. Filtros persistentes de período, cancha y tipo de resultado.
5. Ranking derivado exclusivamente de partidos cerrados: PJ, G, A, G+A,
   promedio G+A/PJ y G-E-P.
6. Historial cronológico de resultados; cada elemento abre el detalle del
   partido en la implementación real.
7. Estados vacíos contextuales que invitan a ampliar filtros y explican que los
   borradores no se publican.

Datos y filtros son mock en memoria. Este código es descartable: la variante
elegida debe reimplementarse sobre queries, permisos y rutas de producción.

## Evidencia

Validado visualmente en 1280×800 para A, B y C, y en iPhone 12 Pro
(390×844 CSS px) para C. `bun run check-types`, `oxlint` sobre el prototipo y
`next build` pasaron; el build necesita las variables obligatorias del proyecto.
