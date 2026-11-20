// The Vice Panels cover renderer. renderCover paints a whole cover onto a 2D context at any size:
// framed photo panels in the layout's shapes, the colour grade washed over them, and the caption in
// big Anton lettering. It returns the per-panel draw metrics the editor needs to turn pointer drags
// into pan offsets. The same function paints the on-screen preview and every exported PNG.

import { panelBounds, panelCentroid } from './layouts.js';

export const EXPORT_SIZES = [
  { id: 'square', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: 'portrait', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: 'wide', w: 1920, h: 1080, label: '1920 × 1080' },
];

const DISPLAY_FONT = "Anton, 'Arial Black', sans-serif";

/** Traces a path through pixel-space points. */
function tracePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** Moves every point of a pixel-space polygon toward (cx, cy) by d pixels. */
function insetPoints(pts, cx, cy, d) {
  return pts.map(([x, y]) => {
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * d, y + (dy / len) * d];
  });
}

/**
 * Cover-fits a photo into a box: returns the draw rectangle for drawImage plus the spare overflow on
 * each axis, which the pan offsets (each -1..1) slide across.
 */
function coverFit(img, bx, by, bw, bh, zoom, panX, panY) {
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const ox = Math.max(0, (dw - bw) / 2);
  const oy = Math.max(0, (dh - bh) / 2);
  return { dx: bx - ox * (1 + panX), dy: by - oy * (1 + panY), dw, dh, ox, oy };
}

/** Paints one panel: the photo clipped inside the frame, or a dusk gradient placeholder when empty. */
function drawPanel(ctx, panel, state, grade, w, h, border) {
  const pts = panel.map(([x, y]) => [x * w, y * h]);
  const [nx, ny, nw, nh] = panelBounds(panel);
  const bx = nx * w;
  const by = ny * h;
  const bw = nw * w;
  const bh = nh * h;
  const [cx, cy] = panelCentroid(panel);
  const clip = insetPoints(pts, cx * w, cy * h, border * 0.45);
  ctx.save();
  tracePath(ctx, clip);
  ctx.clip();
  let metrics = { bx, by, bw, bh, ox: 0, oy: 0 };
  if (state?.img) {
    const fit = coverFit(state.img, bx, by, bw, bh, state.zoom ?? 1, state.panX ?? 0, state.panY ?? 0);
    ctx.filter = grade.filter;
    ctx.drawImage(state.img, fit.dx, fit.dy, fit.dw, fit.dh);
    ctx.filter = 'none';
    metrics = fit;
  } else {
    const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    g.addColorStop(0, '#3b1154');
    g.addColorStop(0.55, '#7e1e5c');
    g.addColorStop(1, '#c22a6d');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `${Math.max(13, Math.min(bw, bh) * 0.09)}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', bx + bw / 2, by + bh / 2);
  }
  ctx.restore();
  return metrics;
}

/** Lays the grade's washes and vignette over the painted panels so they read as one poster. */
function applyGrade(ctx, grade, w, h) {
  for (const wash of grade.washes) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [offset, colour] of wash.stops) g.addColorStop(offset, colour);
    ctx.save();
    ctx.globalCompositeOperation = wash.mode;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (grade.vignette > 0) {
    const r = Math.hypot(w, h) / 2;
    const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
    v.addColorStop(0, 'rgba(5, 2, 12, 0)');
    v.addColorStop(1, `rgba(5, 2, 12, ${(grade.vignette * 0.55).toFixed(3)})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

/** The paint for one caption line under the chosen fill style, spanning y0..y1. */
function captionPaint(ctx, fill, y0, y1) {
  if (fill === 'solid') return '#ffffff';
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  if (fill === 'neon') {
    g.addColorStop(0, '#67e8f9');
    g.addColorStop(0.52, '#e879f9');
    g.addColorStop(1, '#ff2e88');
  } else {
    g.addColorStop(0, '#ffe259');
    g.addColorStop(0.55, '#ff7518');
    g.addColorStop(1, '#ff2e88');
  }
  return g;
}

/** Draws the caption stack: the big lines, then the letterspaced subtitle with its flanking rules. */
function drawCaption(ctx, w, h, caption) {
  const lines = [caption.line1, caption.line2]
    .map((line) => (line ?? '').trim().toUpperCase())
    .filter(Boolean);
  const sub = (caption.subtitle ?? '').trim().toUpperCase();
  if (!lines.length && !sub) return;
  const unit = Math.min(w, h);
  let size = unit * 0.128 * (caption.size ?? 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const setFont = (px) => { ctx.font = `${px}px ${DISPLAY_FONT}`; };
  setFont(size);
  for (const line of lines) {
    const width = ctx.measureText(line).width;
    if (width > w * 0.92) size *= (w * 0.92) / width;
  }
  setFont(size);
  const lineHeight = size * 1.04;
  const subSize = size * 0.27;
  const subBand = sub ? subSize * 1.9 : 0;
  const stackHeight = lines.length * lineHeight + subBand;
  const margin = h * 0.05;
  const stackTop = caption.position === 'top' ? margin : h - margin - stackHeight;
  lines.forEach((line, i) => {
    const centreY = stackTop + lineHeight * (i + 0.5);
    if (caption.outline) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#17081f';
      ctx.lineWidth = size * 0.17;
      ctx.strokeText(line, w / 2, centreY);
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = captionPaint(ctx, caption.fill, centreY - size / 2, centreY + size / 2);
    if (caption.fill === 'neon') {
      ctx.shadowColor = 'rgba(255, 46, 136, 0.85)';
      ctx.shadowBlur = size * 0.22;
    } else {
      ctx.shadowColor = 'rgba(10, 4, 20, 0.55)';
      ctx.shadowBlur = size * 0.1;
      ctx.shadowOffsetY = size * 0.045;
    }
    ctx.fillText(line, w / 2, centreY);
    ctx.restore();
  });
  if (sub) {
    const centreY = stackTop + lines.length * lineHeight + subBand / 2;
    ctx.save();
    setFont(subSize);
    ctx.letterSpacing = `${Math.round(subSize * 0.42)}px`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.shadowColor = 'rgba(10, 4, 20, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    const subWidth = ctx.measureText(sub).width;
    ctx.fillText(sub, w / 2, centreY);
    ctx.restore();
    const ruleY = centreY;
    const gap = subSize * 0.7;
    const ruleLen = Math.max(0, (w * 0.92 - subWidth) / 2 - gap);
    if (ruleLen > unit * 0.03) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(2, unit * 0.0035);
      ctx.beginPath();
      ctx.moveTo(w / 2 - subWidth / 2 - gap - ruleLen, ruleY);
      ctx.lineTo(w / 2 - subWidth / 2 - gap, ruleY);
      ctx.moveTo(w / 2 + subWidth / 2 + gap, ruleY);
      ctx.lineTo(w / 2 + subWidth / 2 + gap + ruleLen, ruleY);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * Paints the cover described by `scene` ({ layout, panels, grade, caption }) onto ctx at w × h.
 * `highlight` is an editor-only panel index to outline as selected, or -1. Returns draw metrics
 * per panel for the editor's pan handling.
 */
export function renderCover(ctx, w, h, scene, highlight = -1) {
  const unit = Math.min(w, h);
  const border = Math.max(4, unit * 0.012);
  ctx.fillStyle = '#150826';
  ctx.fillRect(0, 0, w, h);
  const metrics = scene.layout.panels.map((panel, i) =>
    drawPanel(ctx, panel, scene.panels[i], scene.grade, w, h, border));
  applyGrade(ctx, scene.grade, w, h);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = border;
  for (const panel of scene.layout.panels) {
    tracePath(ctx, panel.map(([x, y]) => [x * w, y * h]));
    ctx.stroke();
  }
  ctx.strokeRect(border / 2, border / 2, w - border, h - border);
  // A hairline of shade just inside each frame, so the white borders read as printed poster
  // frames with depth instead of flat stripes where two panels meet.
  ctx.strokeStyle = 'rgba(12, 4, 24, 0.20)';
  ctx.lineWidth = Math.max(1.5, border * 0.22);
  for (const panel of scene.layout.panels) {
    const [cx, cy] = panelCentroid(panel);
    tracePath(ctx, insetPoints(panel.map(([x, y]) => [x * w, y * h]), cx * w, cy * h, border * 0.72));
    ctx.stroke();
  }
  ctx.restore();
  drawCaption(ctx, w, h, scene.caption);
  if (highlight >= 0 && scene.layout.panels[highlight]) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(2.5, border * 0.42);
    ctx.setLineDash([unit * 0.022, unit * 0.015]);
    tracePath(ctx, scene.layout.panels[highlight].map(([x, y]) => [x * w, y * h]));
    ctx.stroke();
    ctx.restore();
  }
  return metrics;
}
