# Prototipo de la vista de canchas

Pregunta: ¿para qué abre alguien `/dashboard/canchas` y qué forma tiene que tener la vista para eso?

## Variantes

Se compararon contra la vista anterior (lista simple que abría un diálogo de edición):

- **Al toque**: la página sirve para llegar. "Cómo llegar" y "Copiar dirección" a un toque en cada fila, el próximo partido destacado y el detalle y la edición en un sheet.
- **Libreta**: cada cancha como registro con historia (partidos jugados, último partido, costo, historial); búsqueda, orden y master-detail en escritorio.
- **En el lugar**: sin overlays; filas desplegables que se editan inline y alta como fila nueva.

## Decisión

Gana **Al toque**.

La mayoría abre la vista desde el teléfono camino a la cancha: lo que necesita es la dirección y la ruta, no un formulario. Por eso la acción dominante es "Cómo llegar" (en la tarjeta del próximo partido y como flecha en cada fila) y "Nueva cancha" pasa a botón secundario. Las canchas se ordenan por uso; las archivadas quedan colapsadas al final.

- Libreta se descartó por densidad: se acercaba a un panel administrativo y pedía búsqueda, orden y tres métricas para un directorio de 5 a 10 canchas.
- En el lugar se descartó porque es la que menos informa de entrada y suma un toque para llegar a Maps; la edición inline no compensa en una vista que se edita poco.

## Producción

- `matches.directory` suma, por cancha, partidos cerrados, fecha del último partido, próximo partido abierto y costo del último partido no cancelado.
- `CourtsPage` (`apps/web/src/components/courts-page.tsx`) reemplaza la rama de canchas de `DirectoryPage`, que queda solo para jugadores.
- El sheet sale desde abajo en móvil y desde la derecha en escritorio. Ver es la vista por defecto; editar y archivar quedan detrás de "Editar datos" y "Archivar" solo para organizadores.

## Evidencia

Revisado a 390 × 844 y 1440 × 900 con datos locales de peor caso (nombres y direcciones largas, canchas archivadas, una sin uso, partidos próximos y cancelados).
