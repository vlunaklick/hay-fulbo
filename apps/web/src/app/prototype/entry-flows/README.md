# Prototipo: flujos de entrada

Pregunta: ¿cómo debería verse la primera pantalla cuando alguien llega desde un
link de WhatsApp (`/jugar`, `/sumarse`, `/invitaciones`) o rebota a `/login`
para seguir?

Ruta local: `/prototype/entry-flows?v=1&screen=jugar&state=abierta`

- `1` — **Pase**: el destino (partido o grupo) manda arriba como un bloque tipo
  entrada; la acción vive en una barra fija al pulgar. En escritorio, contexto a
  la izquierda y acción a la derecha.
- `2` — **Paso a paso**: una pregunta por pantalla. `/jugar` es "¿Quién sos?" →
  "¿Jugás?" → "Listo", con nombres como filas grandes en lugar de un select.
- `3` — **La lista**: la lista numerada de WhatsApp es la interfaz. Tocás tu
  nombre y confirmás en la barra; en invitaciones ves el plantel y dónde entrás.

Teclas: `1–3` o `←/→` cambian de variante, `S` cambia de pantalla, `R` re-monta,
`H` oculta el picker. `?chrome=0` lo oculta desde la URL.

Datos y mutaciones son mock en memoria (`shared.tsx`). Código descartable.
