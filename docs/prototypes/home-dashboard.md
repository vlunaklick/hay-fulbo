# Prototipo del inicio del grupo

Pregunta: ¿qué tiene que contestar `/dashboard` cuando alguien lo abre desde el teléfono en la cancha?

## Variantes

Se probaron contra la vista actual con datos de prueba realistas: 14 jugadores con nombres largos, 6 partidos cerrados (9–8 y 2–2 incluidos), uno cancelado y un próximo partido con aporte parcial.

- **La fecha**: el próximo partido es la página, con la hora en tamaño display, los dos planteles y la caja. El resto queda como nota al pie.
- **Tu ficha**: arranca por "¿y yo?", con tu deuda, tu temporada, tu racha y tu lugar en la tabla.
- **El muro**: una línea de tiempo con el próximo partido arriba y los resultados abajo, y la temporada y los goleadores al costado.

## Decisión

Gana **El muro**.

El tiempo ordena la página sin títulos de sección. Lo que viene queda arriba y lo que pasó queda debajo, en el mismo orden en mobile y en escritorio. Es la única dirección que muestra la historia del grupo (marcador, figura, cancha, cancelados) sin mandar a otra pantalla.

Descartadas:

- **La fecha**: es la mejor el día del partido, pero sin fecha programada la página queda casi vacía y la historia queda escondida.
- **Tu ficha**: depende de que la cuenta esté vinculada a un jugador, y el organizador pierde de vista la caja del grupo.

## Cambios de comportamiento

- Se muestran hasta 6 resultados en vez de 3, cada uno con marcador por equipo, figura y cancha. Los partidos cancelados aparecen tachados.
- La fila de métricas personales desaparece. "Tu aporte" y "Caja" pasan a la card del próximo partido, y G+A personal queda en el perfil y en estadísticas.
- Se suma un resumen de temporada (partidos, goles, goles por partido) arriba de los goleadores.

## Evidencia

Capturas a 390 × 844 y 1440 × 900 en tema oscuro de las cuatro vistas, con datos de prueba; sin errores de consola.
