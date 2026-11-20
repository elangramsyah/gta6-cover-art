// Fixed scenes for screenshots, driven by the query string so every screenshot in shots.json can be
// reproduced exactly: ?shot=cover renders one clean cover that fills the window, ?shot=editor shows the
// editor with its panels and controls around the same cover. `photo` names one bundled sample
// (samples/<name>.jpg) for every panel; `photos` names several, assigned to the panels in order and
// repeated when the layout has more panels than names. `caption` and `caption2` are the two big lines,
// `sub` the subtitle, and layout, grade, fill, pos and size pick the rest of the scene.

export function shotConfig(query) {
  const names = query.get('photos') ?? query.get('photo') ?? 'pier';
  return {
    mode: query.get('shot'),
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'vice',
    size: query.get('size') ?? 'square',
    photos: names.split(',').map((name) => name.trim()).filter(Boolean),
    caption: {
      line1: query.get('caption') ?? 'SUNSET',
      line2: query.get('caption2') ?? '',
      subtitle: query.get('sub') ?? 'A VICE PANELS ORIGINAL',
      fill: query.get('fill') ?? 'sunset',
      position: query.get('pos') ?? 'bottom',
    },
  };
}
