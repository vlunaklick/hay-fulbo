# Prototipo de la vista del grupo

Pregunta: ¿cómo se organiza `/dashboard/grupo` (personas, permisos, link para sumarse, vista pública, notas y cambio de grupo) para que el responsable la use desde el teléfono en la cancha?

Antes: una sola página larga con cuatro secciones apiladas; en 390 px cada integrante ocupaba dos filas por el select de permisos y la etiqueta se cortaba ("Miembro · solo cons").

## Variantes

Se probaron en `/prototype/grupo` con datos de peor caso (15 personas, nombre y email larguísimos, nombre de grupo que no entra en la barra).

- **Plantel** — la lista es la pantalla: Invitar como única acción primaria (abre un sheet), filas de una línea agrupadas por permiso, cada persona abre su sheet; ajustes al final como filas resumen.
- **Vestuario** — hub del grupo: identidad arriba, filas agrupadas que llevan a un tema cada una; drill-down en el teléfono, master-detail en escritorio; los otros grupos visibles en la página.
- **Pizarra** — todo inline sin overlays: el título es el selector de grupo, franja de invitación con "Compartir link", búsqueda y filtros por rol, toggle Miembro|Líder en cada fila.

## Decisión

Gana **Vestuario**.

- Una decisión por pantalla en el teléfono: el hub resume el estado (integrantes y líderes, link activo, visibilidad, regla de notas) y cada tema se abre solo.
- El tema abierto vive en `?tema=` (`integrantes`, `invitar`, `publico`, `notas`): el gesto de volver del teléfono regresa al hub y los accesos directos linkean a `?tema=invitar` (antes `#invitar`).
- En escritorio el hub queda fijo a la izquierda y el tema a la derecha; sin tema abierto se muestra Integrantes.
- Los permisos se cambian desde un menú `⋯` por persona (radio Miembro/Líder + "Sacar del grupo" separado), así la fila entra en una línea a 390 px.
- "Compartir" usa la hoja nativa del teléfono (WhatsApp a un toque) y copia en escritorio.
- Visibilidad pública y quórum de notas pasan de botón/select a opciones visibles (`ToggleGroup`); cada opción de quórum explica cuándo se revela.
- Los otros grupos del usuario aparecen en la página con "Crear grupo". El selector de la barra se mantiene porque lo usan todas las demás pantallas.

Rechazadas:

- **Plantel**: cambiar un rol o un ajuste cuesta un toque extra detrás de un sheet y en escritorio deja la pantalla vacía a la derecha.
- **Pizarra**: la más rápida para grupos grandes, pero la más densa; en 390 px el toggle por fila empuja los nombres largos a dos líneas y la página vuelve a mezclar todo en un solo scroll.

## Evidencia

Revisado a 390 × 844 y 1440 × 900 en las tres variantes, con flujos de cambiar rol, sacar, renovar/desactivar link, visibilidad y quórum; sin errores de consola.
