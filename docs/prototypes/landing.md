# Prototipo de landing

Pregunta: ¿qué ve en `/` alguien que llega sin sesión? Antes del cambio, `/` redirigía directo a `/login`, sin ningún contexto sobre el producto.

## Rondas

1. **Dirección.** La puerta (utilidad, una pantalla), La fecha (recorrido del producto paso a paso) y El chat (preguntas del grupo de WhatsApp contra las respuestas de Hay Fulbo). Gustó la línea de La puerta, pero con un pedido: simple, poco texto e intuitivo.
2. **Simplificar.** Mínima (solo palabras), Marcador (una tarjeta de resultado) y Pasos (pestañas que muestran el producto). Ganó **Marcador**, aunque se sentía plano y le faltaba contenido.
3. **Profundidad sobre Marcador.** Cancha (el resultado sobre una cancha dibujada con tiza), Ficha (piezas del producto flotando alrededor más un enlace para compartir) y La noche (línea de tiempo que maneja la tarjeta).

## Decisión

Gana **Cancha**.

- Título "El partido, en orden.", una línea de apoyo y un único CTA, "Armar mi grupo" → `/login`. "Ingresar" queda como acción secundaria (`ghost`) en el header.
- El hero es una superficie `bg-card` con líneas de cancha en `foreground/10`. La cancha es vertical en el teléfono y horizontal desde `md`, y el resultado de ejemplo (7–5, $4.500 c/u, "Faltan 3") se apoya sobre el círculo central.
- Debajo, tres bloques con UI real: Equipos (avatares por equipo), Goleadores y Aportes (lo que debe cada uno).
- Sin sombra en la tarjeta: la separación la da el cambio tonal (`bg-background` sobre `bg-card`), siguiendo la regla de elevación de DESIGN.md.
- Un usuario con sesión sigue yendo de `/` a `/dashboard`.

## Descartes

- **La puerta / Mínima:** convierten rápido, pero no muestran el producto; la página se veía vacía.
- **La fecha:** demasiado larga y con mucho texto para lo que se pidió.
- **El chat:** depende del texto, y en el teléfono lo que importa queda debajo del primer scroll.
- **Pasos / La noche:** hay que tocar para entender el producto; si nadie toca, la idea se pierde.
- **Ficha:** la composición flotante solo funciona en escritorio, y necesita sombras que el sistema reserva para overlays.
