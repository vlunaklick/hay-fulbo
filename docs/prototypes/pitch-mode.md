# Prototipo: modo cancha

Pregunta: ¿qué modelo de interacción permite cargar goles con una mano, al sol y apurado, sin perder autoría ni confianza en el marcador?

Se exploró en `/prototype/pitch-mode` (ya borrado) contra la vista anterior, con datos en memoria y el peor contenido realista: 7 contra 7, nombres de tres palabras, un nombre de equipo que se trunca y goles de los tres tipos.

## Variantes

- **Tablero** — dos botones de Gol gigantes en la zona del pulgar; el autor se elige en un paso a pantalla completa, con los autogoles plegados. Dos toques por gol.
- **Planilla** — sin botón de Gol: los dos planteles siempre a la vista y tocar al jugador es el gol. Un toque por gol.
- **Al toque** — cada mitad de la pantalla es un botón; el gol entra al instante como sin autor y la autoría se asigna en una pausa.

## Decisión

Gana **Planilla**.

- Un toque por gol, sobre el nombre del jugador: el planillero conoce a todos y no necesita un paso intermedio.
- Los dos planteles con sus goles quedan a la vista, así el marcador se puede auditar de un vistazo.
- Marcador compacto arriba (`text-5xl`, `tabular-nums`); filas de 56 px con borde del color del equipo; nombres largos en dos líneas.
- "Sin autor" y "Autogol rival" quedan al pie de cada plantel. El autogol abre un sheet con los jugadores del rival porque es raro.
- Restar pasa a un modo "Corregir" explícito con franja `destructive`: cada toque resta, y los jugadores sin goles quedan deshabilitados.
- Barra fija de "Último: … · Deshacer", sin temporizador: el deshacer es el comando inverso (`adjustStat` con el delta opuesto). Es la red de seguridad de un toque mal dado.
- Se mantiene el tema oscuro forzado, el poll de 5 s y los permisos: sin permiso para cargar, los planteles se muestran de solo lectura.

## Descartadas

- **Tablero**: más segura ante toques accidentales, pero conserva los dos toques por gol, que era la fricción principal.
- **Al toque**: la más rápida en el momento, pero los goles que nadie asigna quedan sin autor para siempre, y un sin autor real no se distingue de uno pendiente.
- Vista anterior: el Gol quedaba a media pantalla y el sheet mezclaba 7 jugadores, sin autor y 7 autogoles en una lista que había que scrollear.

## Pendiente

- Con 11 por lado la lista scrollea; medirlo con un partido real.
- Tema claro para leer bajo sol directo: no se probó, queda como pregunta aparte.
