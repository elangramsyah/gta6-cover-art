// Colour grades for Vice Panels covers. A grade is applied in two passes by the renderer: its `filter`
// string is set on the canvas while each panel photo is drawn (saturation, contrast, warmth), then its
// `washes` — full-cover gradients in a composite mode — are laid over the panels to unify them, and a
// vignette of the given strength (0..1) darkens the corners. Every grade is the app's own recipe.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.03)',
    washes: [
      { stops: [[0, 'rgba(56, 189, 248, 0.20)'], [0.45, 'rgba(255, 94, 58, 0.10)'], [1, 'rgba(255, 46, 136, 0.38)']], mode: 'soft-light' },
      { stops: [[0.55, 'rgba(255, 120, 60, 0)'], [1, 'rgba(190, 24, 93, 0.22)']], mode: 'source-over' },
    ],
    vignette: 0.32,
    swatch: 'linear-gradient(160deg, #38bdf8, #ff5e3a 55%, #ff2e88)',
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    filter: 'saturate(1.5) contrast(1.16) brightness(0.96) hue-rotate(-8deg)',
    washes: [
      { stops: [[0, 'rgba(34, 211, 238, 0.30)'], [0.55, 'rgba(30, 27, 75, 0.12)'], [1, 'rgba(217, 70, 239, 0.34)']], mode: 'overlay' },
      { stops: [[0.6, 'rgba(10, 10, 40, 0)'], [1, 'rgba(10, 6, 32, 0.30)']], mode: 'source-over' },
    ],
    vignette: 0.45,
    swatch: 'linear-gradient(160deg, #22d3ee, #312e81 55%, #d946ef)',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'saturate(1.22) contrast(1.05) sepia(0.28) brightness(1.05)',
    washes: [
      { stops: [[0, 'rgba(255, 214, 120, 0.16)'], [1, 'rgba(234, 88, 12, 0.30)']], mode: 'soft-light' },
      { stops: [[0.65, 'rgba(120, 40, 0, 0)'], [1, 'rgba(80, 26, 4, 0.20)']], mode: 'source-over' },
    ],
    vignette: 0.3,
    swatch: 'linear-gradient(160deg, #fde68a, #f59e0b 55%, #ea580c)',
  },
  {
    id: 'noir',
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.35) brightness(0.98)',
    washes: [
      { stops: [[0.55, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.34)']], mode: 'source-over' },
    ],
    vignette: 0.6,
    swatch: 'linear-gradient(160deg, #e5e7eb, #6b7280 55%, #111827)',
  },
  {
    id: 'pastel',
    name: 'Pastel Vice',
    filter: 'saturate(0.85) contrast(0.95) brightness(1.12)',
    washes: [
      { stops: [[0, 'rgba(165, 243, 252, 0.28)'], [1, 'rgba(249, 168, 212, 0.30)']], mode: 'screen' },
      { stops: [[0.7, 'rgba(255, 255, 255, 0)'], [1, 'rgba(190, 120, 200, 0.12)']], mode: 'source-over' },
    ],
    vignette: 0.15,
    swatch: 'linear-gradient(160deg, #a5f3fc, #fbcfe8 60%, #f9a8d4)',
  },
  {
    id: 'clean',
    name: 'Clean',
    filter: 'none',
    washes: [],
    vignette: 0.12,
    swatch: 'linear-gradient(160deg, #f8fafc, #cbd5e1)',
  },
];

/** The grade with the given id, or the first grade when the id is unknown. */
export function getGrade(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}
