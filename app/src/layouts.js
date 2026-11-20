// Panel layouts for Vice Panels covers. Each layout is a list of panels, and each panel is a polygon given as
// [x, y] points in cover coordinates (0..1 on both axes), so the same layout renders at any export size.
// The polygons are convex, which lets the renderer inset them toward their centroid to sit a photo inside
// the white frame. Order matters: panels are painted and hit-tested in list order.

/** A rectangle panel from its corners. */
function rect(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero + Trio',
    panels: [
      rect(0, 0, 1, 0.6),
      rect(0, 0.6, 0.34, 0.4),
      rect(0.34, 0.6, 0.33, 0.4),
      rect(0.67, 0.6, 0.33, 0.4),
    ],
  },
  {
    id: 'mosaic',
    name: 'Mosaic Six',
    panels: [
      rect(0, 0, 0.55, 0.5),
      rect(0.55, 0, 0.45, 0.28),
      rect(0.55, 0.28, 0.45, 0.22),
      rect(0, 0.5, 0.3, 0.5),
      rect(0.3, 0.5, 0.4, 0.5),
      rect(0.7, 0.5, 0.3, 0.5),
    ],
  },
  {
    id: 'slash',
    name: 'Diagonal Slash',
    panels: [
      [[0, 0], [0.44, 0], [0.3, 1], [0, 1]],
      [[0.44, 0], [0.76, 0], [0.62, 1], [0.3, 1]],
      [[0.76, 0], [1, 0], [1, 1], [0.62, 1]],
    ],
  },
  {
    id: 'duo',
    name: 'Duo Split',
    panels: [
      rect(0, 0, 0.52, 1),
      rect(0.52, 0, 0.48, 0.5),
      rect(0.52, 0.5, 0.48, 0.5),
    ],
  },
  {
    id: 'quad',
    name: 'Quad Grid',
    panels: [
      rect(0, 0, 0.5, 0.48),
      rect(0.5, 0, 0.5, 0.48),
      rect(0, 0.48, 0.5, 0.52),
      rect(0.5, 0.48, 0.5, 0.52),
    ],
  },
];

/** The layout with the given id, or the first layout when the id is unknown. */
export function getLayout(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

/** The centre of a panel polygon, in cover coordinates. */
export function panelCentroid(panel) {
  let x = 0;
  let y = 0;
  for (const [px, py] of panel) {
    x += px;
    y += py;
  }
  return [x / panel.length, y / panel.length];
}

/** The bounding box of a panel polygon, in cover coordinates: [x, y, width, height]. */
export function panelBounds(panel) {
  const xs = panel.map(([x]) => x);
  const ys = panel.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
}

/** True when the cover-space point (x, y) falls inside the panel polygon (ray casting). */
export function pointInPanel(x, y, panel) {
  let inside = false;
  for (let i = 0, j = panel.length - 1; i < panel.length; j = i++) {
    const [xi, yi] = panel[i];
    const [xj, yj] = panel[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
