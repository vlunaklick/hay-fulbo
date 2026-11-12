# Prototipo de flujos de entrada

Pregunta: ¿cómo debería verse la primera pantalla cuando alguien llega desde un
link de WhatsApp (`/jugar`, `/sumarse`, `/invitaciones`) o rebota a `/login`
para seguir?

## Variantes

- **Pase** — el destino (partido o grupo) manda arriba como una entrada; la
  acción vive en una barra fija al pulgar. En escritorio, contexto a la
  izquierda y acción a la derecha.
- **Paso a paso** — una pregunta por pantalla: "¿Quién sos?" → "¿Jugás?" →
  "Listo", con los nombres como filas grandes en lugar de un select.
- **La lista** — la lista numerada de WhatsApp es la interfaz: tocás tu nombre y
  confirmás en la barra; en invitaciones se ve el plantel del grupo.

## Decisión

Gana **Pase**.

- El partido o grupo se muestra primero como un bloque tipo entrada: en
  `/jugar`, día, hora en `text-6xl font-black tabular-nums`, cancha con link a
  Maps y una franja `Anotados | Estimado por jugador`.
- En móvil la acción va en una barra fija abajo (`border-t`, `bg-background`,
  `env(safe-area-inset-bottom)`); en `lg` la barra pasa a la columna derecha.
- Las aceptaciones de grupo muestran qué cambia al aceptar (checklist) y con qué
  cuenta se acepta, con "Cambiar" para salir y volver al mismo link.
- `/login` con `returnTo` dice para qué estás entrando; desde `/sumarse` muestra
  el grupo.

Rechazadas:

- **Paso a paso**: menos errores de toque, pero más pasos para algo que hoy es
  un tap, y en escritorio queda una columna angosta y vacía.
- **La lista**: la más cercana a cómo se organiza el grupo, pero mostrar el
  plantel en `/sumarse` expone nombres a cualquiera con el link y requiere una
  consulta nueva.

## Pendiente

- El bloque del grupo no muestra organizador ni conteos (jugadores, partidos):
  las previews de `/sumarse` e `/invitaciones` hoy solo traen el nombre.
- `/login` desde `/invitaciones` no puede mostrar el grupo sin sesión.
- El select de nombres sigue siendo el paso más torpe en móvil.
