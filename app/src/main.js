// The Vice Panels editor. It wires the page around the renderer in cover.js: a tray of the person's
// own photos (read locally, never uploaded), five panel layouts, six colour grades, caption lettering
// controls, and one-click PNG export at the three post sizes. A ?shot= query (see shots.js) sets up a
// fixed scene for screenshots instead of the default one.

import { LAYOUTS, getLayout, pointInPanel } from './layouts.js';
import { GRADES, getGrade } from './grades.js';
import { EXPORT_SIZES, renderCover } from './cover.js';
import { shotConfig } from './shots.js';

const SAMPLE_URLS = {
  pier: 'samples/pier.jpg',
  boulevard: 'samples/boulevard.jpg',
  car: 'samples/car.jpg',
};

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const tray = document.getElementById('tray');
const zoomSlider = document.getElementById('zoom');

const scene = {
  layoutId: 'hero',
  gradeId: 'vice',
  sizeId: 'square',
  photos: [], // { img, name } — the person's photos and the bundled samples, in tray order
  panels: [], // per layout panel: { photo: index into photos or -1, zoom, panX, panY }
  selected: 0,
  caption: {
    line1: 'SUNSET',
    line2: 'HEIST',
    subtitle: 'A VICE PANELS ORIGINAL',
    size: 1,
    fill: 'sunset',
    outline: true,
    position: 'bottom',
  },
};

let lastMetrics = [];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function currentSize() {
  return EXPORT_SIZES.find((size) => size.id === scene.sizeId) ?? EXPORT_SIZES[0];
}

function ensurePanels() {
  const count = getLayout(scene.layoutId).panels.length;
  while (scene.panels.length < count) scene.panels.push({ photo: -1, zoom: 1, panX: 0, panY: 0 });
  if (scene.selected >= count) scene.selected = 0;
}

/** The renderer-facing scene: layout and grade resolved, panel photo indexes turned into images. */
function buildScene() {
  ensurePanels();
  return {
    layout: getLayout(scene.layoutId),
    grade: getGrade(scene.gradeId),
    caption: scene.caption,
    panels: getLayout(scene.layoutId).panels.map((_, i) => {
      const panel = scene.panels[i];
      return {
        img: scene.photos[panel.photo]?.img ?? null,
        zoom: panel.zoom,
        panX: panel.panX,
        panY: panel.panY,
      };
    }),
  };
}

function render(highlight = scene.selected) {
  const { w, h } = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  lastMetrics = renderCover(ctx, w, h, buildScene(), highlight);
}

/** Adds a loaded image to the tray and returns its index. */
function addPhoto(img, name) {
  scene.photos.push({ img, name });
  renderTray();
  return scene.photos.length - 1;
}

/** Loads one of the bundled samples into the tray (once) and returns its index. */
async function loadSample(name) {
  const label = `sample:${name}`;
  const existing = scene.photos.findIndex((photo) => photo.name === label);
  if (existing >= 0) return existing;
  return addPhoto(await loadImage(SAMPLE_URLS[name]), label);
}

function assignPhoto(panelIndex, photoIndex) {
  ensurePanels();
  scene.panels[panelIndex].photo = photoIndex;
  scene.selected = panelIndex;
  syncZoom();
  render();
}

function fillAllPanels(photoIndex) {
  ensurePanels();
  for (const panel of scene.panels) panel.photo = photoIndex;
  render();
}

function renderTray() {
  tray.replaceChildren();
  scene.photos.forEach((photo, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tray-item';
    item.title = 'Click to put this photo in the selected panel; double-click to fill every panel';
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name.replace('sample:', '');
    item.append(thumb);
    item.addEventListener('click', () => assignPhoto(scene.selected, i));
    item.addEventListener('dblclick', () => fillAllPanels(i));
    tray.append(item);
  });
}

function syncZoom() {
  ensurePanels();
  zoomSlider.value = String(scene.panels[scene.selected]?.zoom ?? 1);
}

function markActive(container, attr, value) {
  for (const button of container.querySelectorAll(`[data-${attr}]`)) {
    button.classList.toggle('active', button.dataset[attr] === value);
  }
}

function buildChips() {
  const layoutBox = document.getElementById('layouts');
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    button.textContent = layout.name;
    button.addEventListener('click', () => {
      scene.layoutId = layout.id;
      ensurePanels();
      markActive(layoutBox, 'layout', layout.id);
      render();
    });
    layoutBox.append(button);
  }
  markActive(layoutBox, 'layout', scene.layoutId);
  const gradeBox = document.getElementById('grades');
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = grade.swatch;
    button.append(swatch, grade.name);
    button.addEventListener('click', () => {
      scene.gradeId = grade.id;
      markActive(gradeBox, 'grade', grade.id);
      render();
    });
    gradeBox.append(button);
  }
  markActive(gradeBox, 'grade', scene.gradeId);
  const fillBox = document.getElementById('fill-styles');
  markActive(fillBox, 'fill', scene.caption.fill);
  for (const button of fillBox.querySelectorAll('[data-fill]')) {
    button.addEventListener('click', () => {
      scene.caption.fill = button.dataset.fill;
      markActive(fillBox, 'fill', scene.caption.fill);
      render();
    });
  }
}

/** The pointer's position in cover coordinates (0..1 on both axes). */
function coverPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

function wireCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = coverPoint(event);
    const layout = getLayout(scene.layoutId);
    const index = layout.panels.findIndex((panel) => pointInPanel(point.x, point.y, panel));
    if (index < 0) return;
    scene.selected = index;
    syncZoom();
    const panel = scene.panels[index];
    drag = { x: event.clientX, y: event.clientY, panX: panel.panX, panY: panel.panY };
    canvas.setPointerCapture(event.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const metrics = lastMetrics[scene.selected];
    const panel = scene.panels[scene.selected];
    if (!metrics || !panel) return;
    const rect = canvas.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) / rect.width) * canvas.width;
    const dy = ((event.clientY - drag.y) / rect.height) * canvas.height;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    if (metrics.ox > 0) panel.panX = clamp(drag.panX - dx / metrics.ox);
    if (metrics.oy > 0) panel.panY = clamp(drag.panY - dy / metrics.oy);
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = scene.panels[scene.selected];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.07 : 0.93)));
    syncZoom();
    render();
  }, { passive: false });
}

function wireControls() {
  document.getElementById('photo-files').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    }
    if (scene.photos.length) assignPhoto(scene.selected, scene.photos.length - 1);
    status.textContent = `${scene.photos.length} photo(s) in the tray. Click a panel, then a photo.`;
  });
  for (const button of document.querySelectorAll('[data-sample]')) {
    button.addEventListener('click', async () => {
      const index = await loadSample(button.dataset.sample);
      assignPhoto(scene.selected, index);
    });
  }
  document.getElementById('fill-all').addEventListener('click', () => {
    const panel = scene.panels[scene.selected];
    if (panel && panel.photo >= 0) fillAllPanels(panel.photo);
  });
  document.getElementById('clear-panel').addEventListener('click', () => {
    const panel = scene.panels[scene.selected];
    if (panel) {
      panel.photo = -1;
      panel.zoom = 1;
      panel.panX = 0;
      panel.panY = 0;
      syncZoom();
      render();
    }
  });
  zoomSlider.addEventListener('input', () => {
    const panel = scene.panels[scene.selected];
    if (panel) {
      panel.zoom = Number(zoomSlider.value);
      render();
    }
  });
  const captionFields = [
    ['cap-line1', 'line1'],
    ['cap-line2', 'line2'],
    ['cap-sub', 'subtitle'],
  ];
  for (const [id, key] of captionFields) {
    document.getElementById(id).addEventListener('input', (event) => {
      scene.caption[key] = event.target.value;
      render();
    });
  }
  document.getElementById('cap-size').addEventListener('input', (event) => {
    scene.caption.size = Number(event.target.value);
    render();
  });
  document.getElementById('cap-outline').addEventListener('change', (event) => {
    scene.caption.outline = event.target.checked;
    render();
  });
  document.getElementById('cap-pos').addEventListener('change', (event) => {
    scene.caption.position = event.target.value;
    render();
  });
  const sizeSelect = document.getElementById('size');
  for (const size of EXPORT_SIZES) {
    const option = document.createElement('option');
    option.value = size.id;
    option.textContent = size.label;
    sizeSelect.append(option);
  }
  sizeSelect.value = scene.sizeId;
  sizeSelect.addEventListener('change', () => {
    scene.sizeId = sizeSelect.value;
    render();
  });
  for (const button of document.querySelectorAll('[data-export]')) {
    button.addEventListener('click', () => exportPng(button.dataset.export));
  }
  const veil = document.getElementById('drop-veil');
  window.addEventListener('dragover', (event) => {
    event.preventDefault();
    veil.classList.add('show');
  });
  window.addEventListener('dragleave', (event) => {
    if (!event.relatedTarget) veil.classList.remove('show');
  });
  window.addEventListener('drop', async (event) => {
    event.preventDefault();
    veil.classList.remove('show');
    for (const file of event.dataTransfer.files) {
      if (file.type.startsWith('image/')) addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    }
    if (scene.photos.length) assignPhoto(scene.selected, scene.photos.length - 1);
  });
}

/** Renders the cover at an export size onto a fresh canvas and downloads it as a PNG. */
function exportPng(sizeId) {
  const size = EXPORT_SIZES.find((entry) => entry.id === sizeId) ?? EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, buildScene(), -1);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved vice-panels-${size.w}x${size.h}.png`;
  }, 'image/png');
}

/** Pushes the scene's caption back into the form fields (used by the default and shot scenes). */
function syncCaptionInputs() {
  document.getElementById('cap-line1').value = scene.caption.line1;
  document.getElementById('cap-line2').value = scene.caption.line2;
  document.getElementById('cap-sub').value = scene.caption.subtitle;
  document.getElementById('cap-size').value = String(scene.caption.size);
  document.getElementById('cap-outline').checked = scene.caption.outline;
  document.getElementById('cap-pos').value = scene.caption.position;
  markActive(document.getElementById('fill-styles'), 'fill', scene.caption.fill);
}

/** The scene the editor opens with: the three samples composed into the hero layout. */
async function initDefault() {
  const car = await loadSample('car');
  const pier = await loadSample('pier');
  const boulevard = await loadSample('boulevard');
  ensurePanels();
  scene.panels[0].photo = car;
  scene.panels[1].photo = pier;
  scene.panels[2].photo = boulevard;
  scene.panels[3].photo = car;
  scene.panels[3].zoom = 1.7;
  scene.panels[3].panX = 0.35;
  scene.panels[3].panY = -0.2;
  scene.selected = 0;
  syncZoom();
  syncCaptionInputs();
  render();
}

/** Sets up the fixed ?shot= scene and flags readiness once it is painted. */
async function initShot(query) {
  const config = shotConfig(query);
  document.body.classList.add(config.mode === 'cover' ? 'shot-cover' : 'shot-editor');
  scene.layoutId = config.layout;
  scene.gradeId = config.grade;
  scene.sizeId = config.size;
  Object.assign(scene.caption, config.caption);
  const indexes = [];
  for (const name of config.photos) indexes.push(await loadSample(name));
  ensurePanels();
  getLayout(scene.layoutId).panels.forEach((_, i) => {
    scene.panels[i].photo = indexes[i % indexes.length];
  });
  scene.selected = 0;
  syncZoom();
  syncCaptionInputs();
  markActive(document.getElementById('layouts'), 'layout', scene.layoutId);
  markActive(document.getElementById('grades'), 'grade', scene.gradeId);
  document.getElementById('size').value = scene.sizeId;
  render(config.mode === 'cover' ? -1 : scene.selected);
  await document.fonts.ready;
  render(config.mode === 'cover' ? -1 : scene.selected);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

buildChips();
wireControls();
wireCanvas();
try {
  await document.fonts.load('120px Anton');
} catch {
  // The lettering falls back to a heavy sans until the vendored Anton face is ready.
}
const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  await initShot(query);
} else {
  await initDefault();
}
