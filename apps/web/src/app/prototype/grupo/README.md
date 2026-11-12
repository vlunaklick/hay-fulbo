# Prototipo: Grupo (`/dashboard/grupo`)

Pregunta: ¿cómo se organiza la vista del grupo (personas, permisos, invitación,
ajustes y selector de grupo) para que el responsable la use desde el teléfono
en la cancha?

Ruta local: `/prototype/grupo?v=1` · teclas `1`–`3` o `←`/`→`.

- `1` — **Plantel**: la lista es la pantalla. Una sola acción primaria
  (Invitar, abre un sheet), filas de una línea agrupadas por permiso; tocar una
  persona abre su sheet (rol + sacar). Ajustes al final como filas resumen.
  Selector de grupo igual que hoy, en el chrome.
- `2` — **Vestuario**: hub del grupo. Identidad primero, filas agrupadas que
  bajan a un tema cada una (drill-down en el teléfono, master-detail en
  escritorio, sin overlays). El selector sale del chrome y vive en la página
  como lista de tus otros grupos. Roles desde un menú `⋯`.
- `3` — **Pizarra**: todo a la vista. El título es el selector de grupo; la
  invitación es una franja con "Compartir link"; búsqueda + filtros por rol;
  rol con toggle Miembro|Líder en cada fila. Escritorio: lista a la izquierda,
  ajustes en columna fija a la derecha.

Datos mock en memoria (`data.ts`), con el peor contenido real: 15 personas,
nombre y email larguísimos, nombre de grupo que no entra en la barra. Los
cambios persisten al cambiar de variante. Código descartable: la variante
elegida se reimplementa sobre las queries y mutaciones de producción.

## Decisión

Pendiente.
