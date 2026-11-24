'use strict';
// Bandes de décor mises en cache (équivalent de LayerCache.kt) : une rangée qui ne fait que glisser
// (arbres, collines, champignons…) est dessinée une fois dans un canvas hors écran, puis recollée avec un
// décalage. Elle n'est redessinée que si la caméra sort de la partie déjà dessinée ou si l'écran change.

function makeStrip() { return { img: null, start: 0, top: 0, forW: 0, forH: 0 }; }
const forestStrips = [makeStrip(), makeStrip(), makeStrip(), makeStrip(), makeStrip()];
const alienStrips = [makeStrip(), makeStrip(), makeStrip()];
function releaseStrips(list) { for (const s of list) s.img = null; }

/** Colle la bande décalée de shift entre top et bottom ; render(canvas, x0, x1) dessine en coordonnées « monde ». */
function drawStrip(canvas, cache, shift, top, bottom, alpha, scale, render) {
  const span = w * 1.6, visStart = -shift;
  const bw = Math.max(1, Math.round(span * scale)), bh = Math.max(1, Math.round((bottom - top) * scale));
  const stale = !cache.img || cache.img.width !== bw || cache.img.height !== bh || cache.top !== top ||
    cache.forW !== w || cache.forH !== h || visStart < cache.start || visStart + w > cache.start + span;
  if (stale) {
    if (!cache.img || cache.img.width !== bw || cache.img.height !== bh) {
      cache.img = document.createElement('canvas');
      cache.img.width = bw; cache.img.height = bh;
    }
    const g = cache.img.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    cache.start = visStart - w * 0.3; cache.top = top; cache.forW = w; cache.forH = h;
    g.scale(scale, scale);
    g.translate(-cache.start, -top);
    render(new Canvas(g), cache.start, cache.start + span);
  }
  canvas.drawBitmap(cache.img, cache.start + shift, top, span, bottom - top, alpha / 255);
}
