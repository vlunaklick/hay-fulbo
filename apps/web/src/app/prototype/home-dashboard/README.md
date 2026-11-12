# Prototipo: inicio del grupo (`/dashboard`)

Pregunta: ¿qué tiene que contestar el inicio cuando alguien lo abre desde el
teléfono en la cancha?

Ruta local: `/prototype/home-dashboard?v=1` (teclas `1`–`4` y `←`/`→`).
Usa el shell real, la sesión real y las queries reales (`stats.dashboard`,
`matches.directory`, `matches.detail`, `stats.player`).
`&escenario=sin-fecha` quita el próximo partido y `&escenario=vacio` también
quita el historial.

1. **Actual**: `HomeDashboard` de producción, sin cambios, como referencia.
2. **La fecha**: el próximo partido es la página. Muestra la hora en tamaño
   display, la cancha, tu aporte, los dos planteles y la caja de la fecha.
   Resultados y goleadores quedan como notas al pie.
3. **Tu ficha**: arranca por "¿y yo?". Primero tu deuda y en qué equipo jugás,
   después tu temporada, tu racha y tu lugar en la tabla (±2 puestos).
4. **El muro**: el tiempo es la estructura. Una línea de tiempo con el próximo
   partido arriba y cada resultado abajo, con la temporada y los goleadores
   al costado en escritorio.

Todo este código es descartable. La variante elegida se reimplementa en
`components/home-dashboard.tsx` y después se borra esta carpeta.
