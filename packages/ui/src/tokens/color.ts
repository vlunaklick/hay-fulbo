/** Minimal OKLCH → sRGB conversion, for surfaces that cannot read CSS variables. */

type Rgb = [number, number, number];

export function parseOklch(value: string): { l: number; c: number; h: number } {
  const match = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  const [, l, percent, c, h] = match;
  return {
    l: Number(l) / (percent ? 100 : 1),
    c: Number(c),
    h: Number(h),
  };
}

/** Linear-light sRGB channels in [0, 1], gamut-clipped. */
function oklchToLinearSrgb(value: string): Rgb {
  const { l, c, h } = parseOklch(value);
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const clip = (channel: number) => Math.min(1, Math.max(0, channel));
  return [
    clip(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clip(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clip(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

function encodeGamma(channel: number) {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function oklchToHex(value: string): string {
  return `#${oklchToLinearSrgb(value)
    .map((channel) =>
      Math.round(encodeGamma(channel) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** WCAG 2 relative luminance. */
export function relativeLuminance(value: string): number {
  const [r, g, b] = oklchToLinearSrgb(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two OKLCH colors. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
}
