---
name: Hay Fulbo
description: El registro simple y confiable de cada fecha.
# Hex values are the dark theme (the default), derived from packages/ui/src/tokens/tokens.ts.
# The OKLCH values in that file are the source of truth; these are for reference only.
colors:
  background: "#090F09"
  card: "#111811"
  popover: "#151D15"
  secondary: "#1C241C"
  border: "#2F382F"
  foreground: "#EFF0E4"
  muted-foreground: "#9EA092"
  primary: "#B0E739"
  primary-foreground: "#090F09"
  primary-text: "#B0E739"
  destructive: "#FF645F"
  success: "#6AD895"
  team-blue: "#60AAF3"
  team-blue-ink: "#011B35"
  team-amber: "#F5BC69"
  team-amber-ink: "#391C00"
typography:
  headline:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  eyebrow:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.12em"
rounded:
  xs: "4px"
  control: "10px"
  surface: "12px"
  overlay: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "16px"
---

# Design System: Hay Fulbo

## Overview

**Creative North Star: "La pizarra después del partido"**

Hay Fulbo se siente como una herramienta que el grupo abre al costado de la cancha: oscura para funcionar bien de noche, directa para usar con una mano y precisa para cerrar cuentas sin discusión. Es moderna por su claridad, no por efectos decorativos.

El sistema usa pocas capas, controles familiares y jerarquía fuerte. Rechaza la estética de apuestas, los paneles empresariales genéricos, el neón gamer, el glassmorphism y cualquier detalle que compita con el partido.

**Key Characteristics:**

- Tema oscuro por defecto; tema claro completo y con el mismo contraste.
- Una acción dominante por vista.
- Verde cancha reservado para acción, selección y progreso.
- Datos densos solo donde ayudan a comparar.
- Mobile-first con objetivos táctiles de 44 px.

## Where things live

| Qué                        | Dónde                                                                     |
| -------------------------- | ------------------------------------------------------------------------- |
| Tokens de color (fuente)   | `packages/ui/src/tokens/tokens.ts`                                        |
| Tema web generado          | `packages/ui/src/styles/globals.css` (región `tokens:start`/`tokens:end`) |
| Tema native generado       | `apps/native/global.css` y `apps/native/lib/theme-tokens.ts`              |
| Componentes web            | `packages/ui/src/components/*` (shadcn sobre Base UI)                     |
| Componentes native         | `apps/native/components/ui/*` (React Native Reusables + Uniwind)          |
| Hex para metadata/imágenes | `tokenHex(name, theme)` de `@hay-fulbo/ui/tokens`                         |
| Prototipos descartables    | `apps/web/src/app/prototype/*` y su `prototype.css`; fuera del sistema    |

Para cambiar un color: editar `tokens.ts`, correr `bun run tokens:sync` y commitear los archivos generados. `bun test` falla si un archivo generado no coincide con la fuente o si un par de texto/superficie baja de WCAG AA en cualquiera de los dos temas.

## Colors

Todos los colores son tokens semánticos en OKLCH con valor claro y oscuro. El código de producto usa siempre la clase del token (`bg-card`, `text-muted-foreground`, `bg-team-blue`), nunca colores de la paleta de Tailwind, hex sueltos ni `text-white`. Un test de lint del diseño (`packages/ui/scripts/design-lint.test.ts`) lo hace cumplir.

### Roles

| Token                                | Uso                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `background` / `foreground`          | Fondo raíz y texto principal.                                                                                                    |
| `card` / `card-foreground`           | Superficies de contenido.                                                                                                        |
| `popover`                            | Menús, sheets, diálogos.                                                                                                         |
| `primary` / `primary-foreground`     | **Verde Cancha.** Acción primaria, selección actual, progreso completo.                                                          |
| `primary-text`                       | Verde Cancha como texto o icono sobre superficie neutra (`text-primary-text`). En claro es un tono más profundo para cumplir AA. |
| `secondary`, `muted`, `accent`       | Controles secundarios, fondos tenues, hover y selección no primaria.                                                             |
| `muted-foreground`                   | Metadata, ayudas, labels.                                                                                                        |
| `destructive`                        | Error, deuda, acción irreversible. Sobre fondo tenue (`bg-destructive/10`).                                                      |
| `success`                            | Pago completo, victoria, confirmación. Sobre fondo tenue (`bg-success/10`).                                                      |
| `team-blue`, `team-amber` (+ `-ink`) | Identifican a los dos equipos. Iguales en ambos temas.                                                                           |
| `chart-1` … `chart-5`                | Series de datos.                                                                                                                 |
| `border`, `input`, `ring`            | Divisores, bordes de campos, foco.                                                                                               |

**The One Whistle Rule.** Solo una acción primaria usa `primary` dentro de una misma vista. Un estado positivo (pagado, ganado) usa `success`, no `primary`.

**Team colors are not decoration.** `team-blue` y `team-amber` aparecen solo cuando representan a un equipo: chips, marcador, botones de asignación (`variant="team-blue"`). No colorean navegación ni acciones genéricas.

**Status never depends on color alone.** Deuda, pagos y validaciones muestran texto además del color.

## Typography

**Fuente:** Manrope Variable (`font-sans`), una sola familia. Los números de marcadores, importes y rankings usan `tabular-nums` para no saltar.

| Rol           | Clases                                          | Uso                                                          |
| ------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Display       | `text-5xl`…`text-7xl font-black tabular-nums`   | Marcador en vivo, resultado hero.                            |
| Page title    | `text-2xl font-bold tracking-tight md:text-3xl` | `h1` de cada pantalla del dashboard.                         |
| Section title | `text-lg font-bold` o `CardTitle`               | Secciones y jugadores destacados.                            |
| Body          | `text-sm` (`text-base` en inputs móviles)       | Contenido y formularios; textos largos a 70ch.               |
| Eyebrow       | `eyebrow` (+ color)                             | Kicker sobre un título, label de un dato, caption de equipo. |
| Caption       | `text-xs text-muted-foreground`                 | Metadata secundaria.                                         |

`eyebrow` es una utilidad del sistema (`text-xs`, 600, `0.12em`, mayúsculas). No construir eyebrows a mano con `tracking-[…]` ni tamaños arbitrarios: nada por debajo de `text-xs` (12 px). Los inputs usan `text-base` en móvil para que iOS no haga zoom.

## Shape

El radio base es `--radius: 0.75rem` (12 px) y la escala se deriva de él.

| Clase          | Valor | Uso                                                                   |
| -------------- | ----- | --------------------------------------------------------------------- |
| `rounded-xs`   | 4 px  | Checkbox y piezas muy chicas.                                         |
| `rounded-md`   | 10 px | **Controles:** botón, input, textarea, select, toggle, tab, skeleton. |
| `rounded-lg`   | 12 px | **Superficies:** card, alert, item, empty, lista de tabs.             |
| `rounded-xl`   | 16 px | **Overlays:** dialog y bloques destacados.                            |
| `rounded-full` | —     | Badges, avatares, progress, indicadores.                              |

`rounded-none` solo aparece en piezas internas que heredan el radio del contenedor.

## Elevation

El sistema es plano por defecto. La profundidad se comunica con cambio tonal y borde (`ring-1 ring-foreground/10` en cards); las sombras aparecen solo en overlays flotantes (sheet, dialog, menú) y nunca crean pilas de tarjetas.

**The Floor Markings Rule.** Primero espacio, tono y divisores; la sombra es el último recurso.

## Interaction

- **Tap targets:** todo control interactivo mide al menos 44 px (`h-11`/`size-11`). Los tamaños `sm`/`xs` de `Button` cambian padding y texto, no la altura táctil.
- **Focus:** `focus-visible:ring-2 ring-ring/50` y borde `ring`, igual en todos los controles.
- **Motion:** transiciones de estado de 150–200 ms con `ease-out`. Con `prefers-reduced-motion` las animaciones y transiciones se anulan globalmente.

## Components

Usar los componentes de `@hay-fulbo/ui/components/*` antes que markup propio. Si falta algo, agregarlo con el CLI de shadcn al paquete `ui` y adaptarlo a esta guía (radio, 44 px, foco, tokens) antes de usarlo.

### Button

| Variante                   | Cuándo                                                          |
| -------------------------- | --------------------------------------------------------------- |
| `default`                  | La acción primaria de la vista. Una sola.                       |
| `secondary`                | Acciones de apoyo junto a la primaria.                          |
| `outline`                  | Acciones neutras en barras y cards.                             |
| `ghost`                    | Acciones de icono, navegación, acciones terciarias en listas.   |
| `destructive`              | Borrar, cancelar un partido, expulsar. Fondo tenue, texto rojo. |
| `link`                     | Navegación dentro de un texto.                                  |
| `team-blue` / `team-amber` | Asignar a un equipo.                                            |

### Badge

`default` solo para selección o estado primario; `success` para pagado/ganado; `destructive` para pendiente/cancelado; `secondary` y `outline` para estados neutros; `ghost` para estados apagados (exento).

### Cards / Containers

`Card` con `rounded-lg`, `bg-card` y anillo tenue; sin sombra en reposo. Padding interno de 16 px (`size="sm"`: 12 px). No anidar cards.

### Inputs / Fields

`Field` + `Input`/`Select`/`Textarea`: 44 px, `rounded-md`, borde `input`, foco `ring`. Error con `aria-invalid` (borde y texto `destructive`) más un mensaje en `FieldError`.

### Feedback

`Alert` (`default`, `destructive`, `success`) para mensajes en página; `toast` (Sonner) para confirmaciones efímeras; `Empty` para estados vacíos con una acción; `Skeleton` mientras carga.

### Navigation

Barra superior compacta y navegación inferior móvil cuando existan tres o más destinos persistentes. El estado activo usa texto `foreground` y un indicador pequeño `primary`, no una pastilla saturada completa.

### Match stepper

La carga del Partido se organiza en tabs directas con un checklist compacto de completitud. Cada paso muestra solo los controles necesarios y conserva un único CTA fijo para avanzar o cerrar.

## Do's and Don'ts

### Do:

- **Do** estilizar con tokens semánticos y componentes de `@hay-fulbo/ui`.
- **Do** cambiar colores en `tokens.ts` y correr `bun run tokens:sync`.
- **Do** reservar `primary` para una acción, selección o progreso, y usar `text-primary-text` (no `text-primary`) cuando el verde es texto.
- **Do** mostrar estado, deuda y validaciones con texto además de color.
- **Do** sostener objetivos táctiles de 44 px y foco visible.
- **Do** ampliar el layout en escritorio sin cambiar el orden mental móvil.

### Don't:

- **Don't** usar colores de la paleta de Tailwind (`bg-red-500`), hex sueltos ni `text-white`.
- **Don't** usar tamaños de texto arbitrarios (`text-[11px]`) ni eyebrows a mano.
- **Don't** editar a mano las regiones generadas de `globals.css` o `global.css`.
- **Don't** parecer una casa de apuestas ni un videojuego con neón.
- **Don't** usar gradientes púrpura, glassmorphism, adornos de IA ni animaciones gratuitas.
- **Don't** construir un panel empresarial genérico lleno de tarjetas y tablas.
- **Don't** exponer muchos controles a la vez ni usar formularios largos.
