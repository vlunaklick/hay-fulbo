# Prototipo: Canchas

Pregunta: ¿para qué abre alguien `/dashboard/canchas` y qué forma tiene que
tener la vista para eso?

Ruta local: `/prototype/canchas` (dentro del shell real del dashboard).
Picker arriba al centro; teclas `1–4` y `←`/`→`.

- `?v=1` **Actual**: la vista de producción, sin cambios, sobre datos mock.
- `?v=2` **Al toque**: interacción. Cómo llegar y copiar dirección a un toque por
  fila; próximo partido destacado; detalle y edición en un sheet.
- `?v=3` **Libreta**: densidad. Cada cancha como registro con uso (PJ, último
  partido, costo, historial); búsqueda y orden; master-detail en escritorio.
- `?v=4` **En el lugar**: modelo de edición. Sin overlays; filas que se
  despliegan y se editan inline; el alta es una fila más.

Parámetros extra: `?rol=miembro` (vista de consulta), `?vacio=1` (sin canchas).

Datos y acciones son mock en memoria (`data.ts`). Los conteos de uso por cancha
no existen hoy en `matches.directory`; la variante elegida necesitaría esa
query. Código descartable: se borra al promover la variante.
