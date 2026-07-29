---
name: Hay Fulbo
description: El registro simple y confiable de cada fecha.
colors:
  pitch-black: "#101512"
  locker-room: "#171D19"
  lifted-surface: "#202822"
  quiet-border: "#2B352E"
  chalk: "#F2F5EF"
  muted-chalk: "#9BA79E"
  pitch-lime: "#B7F34A"
  pitch-lime-ink: "#14200B"
  danger: "#FF766F"
  success: "#75D69C"
  team-blue: "#67A8FF"
  team-amber: "#FFB85C"
typography:
  headline:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.5
  label:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "0.01em"
rounded:
  control: "8px"
  surface: "12px"
  feature: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.pitch-lime}"
    textColor: "{colors.pitch-lime-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.lifted-surface}"
    textColor: "{colors.chalk}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.locker-room}"
    textColor: "{colors.chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  surface:
    backgroundColor: "{colors.locker-room}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.surface}"
    padding: "16px"
---

# Design System: Hay Fulbo

## Overview

**Creative North Star: "La pizarra después del partido"**

Hay Fulbo se siente como una herramienta que el grupo abre al costado de la cancha: oscura para funcionar bien de noche, directa para usar con una mano y precisa para cerrar cuentas sin discusión. Es moderna por su claridad, no por efectos decorativos.

El sistema usa pocas capas, controles familiares y jerarquía fuerte. Rechaza la estética de apuestas, los paneles empresariales genéricos, el neón gamer, el glassmorphism y cualquier detalle que compita con el partido.

**Key Characteristics:**

- Tema oscuro como experiencia principal.
- Una acción dominante por vista.
- Verde cancha reservado para acción y selección.
- Datos densos solo donde ayudan a comparar.
- Mobile-first con objetivos táctiles de 44 px.

## Colors

Una base verde-negra y tizas cálidas crean el ambiente de vestuario; el verde lima aparece solo cuando hay que actuar.

### Primary

- **Verde Cancha** (`#B7F34A`): acción primaria, selección actual y progreso completado. Ocupa menos del 10% de cada pantalla.
- **Tinta Lima** (`#14200B`): texto e iconos sobre Verde Cancha.

### Secondary

- **Azul Equipo** (`#67A8FF`) y **Ámbar Equipo** (`#FFB85C`): distinguen los dos equipos y series de datos. No decoran navegación ni acciones.

### Neutral

- **Negro Cancha** (`#101512`): fondo raíz.
- **Vestuario** (`#171D19`): superficie principal.
- **Superficie Elevada** (`#202822`): estados seleccionados, menús y controles secundarios.
- **Borde Quieto** (`#2B352E`): divisores y contornos.
- **Tiza** (`#F2F5EF`): texto principal.
- **Tiza Apagada** (`#9BA79E`): metadata y ayuda.

**The One Whistle Rule.** Solo una acción primaria usa Verde Cancha dentro de una misma vista.

## Typography

**Display Font:** Manrope Variable con `system-ui`
**Body Font:** Manrope Variable con `system-ui`

**Character:** Una sola familia geométrica mantiene el producto contemporáneo y calmo. Los números usan variantes tabulares para que marcadores y aportes no salten.

### Hierarchy

- **Headline** (750, 28 px, 1.1): nombre de pantalla o marcador principal.
- **Title** (700, 18 px, 1.25): secciones y jugadores destacados.
- **Body** (450, 16 px, 1.5): contenido y formularios, con textos largos limitados a 70ch.
- **Label** (650, 13 px, 0.01em): estados, columnas, botones y metadata.

**The Score Stays Still Rule.** Marcadores, importes y rankings usan números tabulares.

## Elevation

El sistema es plano por defecto. La profundidad se comunica con cambio tonal y borde; las sombras aparecen solo en overlays o elementos flotantes y nunca crean pilas de tarjetas.

### Shadow Vocabulary

- **Floating control** (`0 12px 32px rgb(0 0 0 / 28%)`): barra móvil, menú y sheet.
- **Focus halo** (`0 0 0 3px rgb(183 243 74 / 24%)`): foco visible de controles.

**The Floor Markings Rule.** Primero usar espacio, tono y divisores; la sombra es el último recurso.

## Components

### Buttons

- **Shape:** rectangular amable, radio de 8 px y altura mínima de 44 px.
- **Primary:** Verde Cancha con Tinta Lima; uno por vista.
- **Hover / Focus:** leve cambio de luminosidad y halo, 180 ms con ease-out-quart.
- **Secondary / Ghost:** Superficie Elevada o fondo transparente con Tiza.

### Chips

- **Style:** borde Quieto, fondo transparente y texto Tiza Apagada.
- **State:** seleccionado en Superficie Elevada con texto Tiza; el color de equipo solo aparece cuando representa un equipo.

### Cards / Containers

- **Corner Style:** 12 px.
- **Background:** Vestuario o continuidad directa con Negro Cancha.
- **Shadow Strategy:** sin sombra en reposo.
- **Border:** 1 px Quieto cuando el límite necesita ser explícito.
- **Internal Padding:** 16 px móvil, 24 px en superficies amplias.

### Inputs / Fields

- **Style:** Vestuario, borde Quieto, radio de 8 px y altura mínima de 44 px.
- **Focus:** borde Verde Cancha y halo accesible.
- **Error / Disabled:** texto y borde Danger para error; contraste reducido sin ocultar el valor para disabled.

### Navigation

Barra superior compacta y navegación inferior móvil cuando existan tres o más destinos persistentes. El estado activo usa texto Tiza y un indicador pequeño Verde Cancha, no una pastilla saturada completa.

### Match stepper

La carga del Partido se organiza en tabs directas con un checklist compacto de completitud. Cada paso muestra solo los controles necesarios y conserva un único CTA fijo para avanzar o cerrar.

## Do's and Don'ts

### Do:

- **Do** usar `#101512` como fondo y `#171D19` como superficie principal.
- **Do** reservar `#B7F34A` para una acción, selección o estado completado.
- **Do** mostrar estado, deuda y validaciones con texto además de color.
- **Do** sostener objetivos táctiles de 44 px y foco visible.
- **Do** ampliar el layout en escritorio sin cambiar el orden mental móvil.

### Don't:

- **Don't** parecer una casa de apuestas ni un videojuego con neón.
- **Don't** usar gradientes púrpura, glassmorphism, adornos de IA ni animaciones gratuitas.
- **Don't** construir un panel empresarial genérico lleno de tarjetas y tablas.
- **Don't** exponer muchos controles a la vez ni usar formularios largos.
- **Don't** anidar tarjetas, usar texto con gradiente o bordes laterales gruesos como acento.
- **Don't** animar propiedades de layout ni bloquear una tarea con coreografía.
