# Prototipo: jugadores

Pregunta: ¿cómo se consulta y administra a un jugador desde el teléfono sin
repartirlo entre un sheet del directorio y una página de perfil con números
distintos?

Se exploró en `/prototype/jugadores` (ya borrado) contra el `AppShell` real, con
queries y mutaciones de producción.

## Variantes

- **Actual** — lista alfabética con PJ/G/A; el detalle abre un sheet con 8
  números, edición e invitación. El perfil del ranking es otra página con otros
  8 números.
- **Plantel** — directorio de personas: alfabético con separadores por letra,
  cuenta vinculada en cada fila, una página de perfil con la gestión arriba.
- **Tabla** — ranking ordenable por G+A / Goles / Asist. / PJ / % V con barra
  proporcional; perfil tipo ficha con números grandes, racha y G/A por partido;
  gestión en un menú `⋯`.
- **Vestuario** — nunca salís de la lista: en el teléfono la fila se despliega
  en el lugar; en escritorio, maestro–detalle con el perfil al costado.

## Decisión

Gana **Vestuario**.

- Lista ordenada por partidos jugados (los que más vienen, arriba), con G · A
  a la derecha y `—` si todavía no jugó.
- Fila desplegada (mobile): Partidos, Goles, Asist., % victorias; últimos 5
  resultados como V/E/D; últimos 3 partidos con "Ver los N partidos";
  Editar / Invitar / Archivar.
- Escritorio (≥ 64rem): lista de 22rem a la izquierda, panel con el mismo
  contenido ampliado (últimos 10, historial completo) y las acciones en el
  encabezado del panel.
- El jugador seleccionado vive en `?p=` para recargar y compartir.
- Cada partido del historial enlaza a su detalle y se ve desde el lado del
  jugador: color de su equipo, su marcador primero, ganó/empató/perdió y su G/A.
- Racha con V/E/D, no G/E/P: "G" ya significa goles en la misma vista.
- Sin partidos cerrados: una línea en `muted-foreground`, no una grilla de ceros.

## Descartadas

- **Plantel**: la mejor para administrar, pero deja los números en segundo plano
  y no compara a nadie. Separar por letra con ~20 jugadores deja casi una
  sección por fila.
- **Tabla**: la más canchera, pero duplica Estadísticas › Ranking y esconde
  editar/invitar a dos toques para el organizador.
- **Actual**: el mismo jugador en dos superficies con métricas y formatos
  distintos (66.67% vs 66,67%).

## Pendiente

- El perfil `/dashboard/estadisticas/jugadores/[playerId]` (entrada desde el
  ranking y vistas compartida/pública) no cambió. Si se quiere una sola
  superficie, el ranking podría enlazar a `/dashboard/jugadores?p=<id>`.
