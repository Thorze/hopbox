'use strict';
// Modèles de la jauge de charge (rubrique « Jauge » de la boutique), équivalent de GaugeSkins.kt.
// L'intérieur garde toujours le même dégradé (chargeGaugeColor, game.js) pour rester lisible :
// seuls le contour, le fond et les effets changent d'un modèle à l'autre.

const gaugeSkinPaint = new Paint();
const GAUGE_NAVY = 0xFF1D2E5C, GAUGE_TRACK_NAVY = 0xFF14203F;
const GAUGE_RAINBOW = ['#FF4D4D', '#FFC93C', '#3DBE6E', '#3F8EFC', '#8E5CD9'];

/** Anneau arrondi autour de la jauge : rectangle (l, t, r, b) agrandi de e de chaque côté. */
function gaugeRing(canvas, l, t, r, b, e, rad) {
  rect.set(l - e, t - e, r + e, b + e);
  canvas.drawRoundRect(rect, rad + e, rad + e, gaugeSkinPaint);
}

/**
 * Jauge de charge centrée sur cx, bord haut à top, largeur bw, hauteur bh, remplie à ratio (0 à 1).
 * id : modèle de la boutique (Slot.GAUGE). t : temps pour les effets animés.
 */
function drawChargeGauge(canvas, cx, top, bw, bh, ratio, id, t) {
  const l = cx - bw / 2, r = cx + bw / 2, b = top + bh, rad = bh / 2, o = bh * 0.27;
  const p = gaugeSkinPaint, PC = Color.parseColor, fill = chargeGaugeColor(ratio);
  p.shader = null;
  let track = Color.argb(90, 0, 0, 0);
  switch (id) {
    case 'blanc':   // contour blanc seul (jauge par défaut)
      p.color = Color.argb(235, 255, 255, 255); gaugeRing(canvas, l, top, r, b, o, rad);
      break;
    case 'nuit':
      p.color = GAUGE_NAVY; gaugeRing(canvas, l, top, r, b, o * 1.4, rad);
      track = GAUGE_TRACK_NAVY;
      break;
    case 'or':   // doré, avec un fin liseré brun pour rester visible sur les ciels clairs
      p.color = PC('#7A4E12'); gaugeRing(canvas, l, top, r, b, o * 1.8, rad);
      p.color = Color.WHITE; p.shader = new LinearGradient(0, top - o, 0, b + o, PC('#FFF0B8'), PC('#D49A2E'));
      gaugeRing(canvas, l, top, r, b, o * 1.1, rad); p.shader = null;
      break;
    case 'royale':   // fond bleu nuit, épais contour doré
      p.color = GAUGE_NAVY; gaugeRing(canvas, l, top, r, b, o * 2.2, rad);
      p.color = Color.WHITE; p.shader = new LinearGradient(0, top - o, 0, b + o, PC('#FFF0B8'), PC('#D49A2E'));
      gaugeRing(canvas, l, top, r, b, o * 1.3, rad); p.shader = null;
      track = GAUGE_TRACK_NAVY;
      break;
    case 'arcenciel': {   // contour arc-en-ciel qui défile
      p.color = GAUGE_NAVY; gaugeRing(canvas, l, top, r, b, o * 2.1, rad);
      const len = bw * 1.25, x0 = l - o * 2 - len * ((t * 0.45) % 1);
      const cols = GAUGE_RAINBOW.concat(GAUGE_RAINBOW, [GAUGE_RAINBOW[0]]).map(PC);
      p.color = Color.WHITE; p.shader = new LinearGradient(x0, 0, x0 + len * 2, 0, cols, null);
      gaugeRing(canvas, l, top, r, b, o * 1.2, rad); p.shader = null;
      track = GAUGE_TRACK_NAVY;
      break;
    }
    case 'neon': {   // tube néon cyan avec halo
      const c = PC('#3DF5FF');
      for (const [e, a] of [[o * 4.2, 35], [o * 3, 60], [o * 2.1, 110]]) { p.color = Color.argb(a, Color.red(c), Color.green(c), Color.blue(c)); gaugeRing(canvas, l, top, r, b, e, rad); }
      p.color = c; gaugeRing(canvas, l, top, r, b, o * 1.3, rad);
      p.color = Color.argb(230, 235, 255, 255); gaugeRing(canvas, l, top, r, b, o * 0.5, rad);
      track = PC('#0B1030');
      break;
    }
    case 'flamme': {   // le contour prend la couleur de la charge et rougeoie de plus en plus
      const pulse = ratio >= 0.999 ? 0.75 + 0.25 * Math.sin(t * 18) : 1;
      for (const [e, a] of [[o * 4.4, 50], [o * 3.1, 90]]) {
        p.color = Color.argb(Math.round(a * ratio * pulse), Color.red(fill), Color.green(fill), Color.blue(fill));
        gaugeRing(canvas, l, top, r, b, e, rad);
      }
      p.color = GAUGE_NAVY; gaugeRing(canvas, l, top, r, b, o * 2.1, rad);
      p.color = fill; gaugeRing(canvas, l, top, r, b, o * 1.3, rad);
      p.color = GAUGE_NAVY; gaugeRing(canvas, l, top, r, b, o * 0.5, rad);   // trait sombre : l'anneau ne se confond pas avec l'intérieur
      track = GAUGE_TRACK_NAVY;
      break;
    }
    default:   // 'classique' : blanc avec un liseré bleu nuit, lisible sur tous les décors
      p.color = GAUGE_NAVY; gaugeRing(canvas, l, top, r, b, o * 2, rad);
      p.color = Color.WHITE; gaugeRing(canvas, l, top, r, b, o, rad);
  }
  p.color = track;
  rect.set(l, top, r, b); canvas.drawRoundRect(rect, rad, rad, p);
  if (ratio > 0) {
    p.color = fill;
    rect.set(l, top, l + bw * ratio, b);
    canvas.drawRoundRect(rect, rad, rad, p);
  }
}

/** Charge de démonstration (boutique) : monte en 1,6 s, reste pleine un instant, puis recommence. */
function gaugeDemoRatio(t) {
  const c = t % 2.2;
  return Math.min(1, c / 1.6);
}
