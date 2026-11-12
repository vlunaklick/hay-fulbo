# Prototipo: vista compartida (`/g/[slug]` y `/compartido`)

Pregunta: ¿qué tiene que ver primero alguien que abre el enlace del grupo desde
WhatsApp, y cómo navega a un partido o a un jugador sin perderse?

Ruta local: `/prototype/public-share?v=1..4`

- `?modo=publico` oculta pagos (como `/g/[slug]`); por defecto se ve como
  `/compartido`, con pagos.
- `?slug=` elige el grupo. Por defecto `miercoles-chacabuco`.
- Teclas: `1`–`4` o `←`/`→` cambian de variante.

Lee la API pública real (`public.dashboard`, `public.match`, `public.player`).
No hay datos mock.

| #   | Variante     | Eje                                                                                 | Detalle de partido/jugador                          |
| --- | ------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Actual       | Producción sin tocar                                                                | Página propia                                       |
| 2   | La previa    | Narrativa en el tiempo: próxima fecha → último partido → tabla → resultados         | Página completa con "Volver"                        |
| 3   | La tabla     | Comparación: el ranking es la página, ordenable, con filas que se abren en el lugar | Fila expandida; ficha y partido en página           |
| 4   | El vestuario | App shell: barra inferior con tres destinos y detalle en sheets                     | Sheet (abajo en mobile, a la derecha en escritorio) |

## Decisión

Pendiente.
