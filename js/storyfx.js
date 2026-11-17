'use strict';
// Scènes animées de l'histoire des chapitres 2 à 16 (équivalent de StoryFx.kt), comme l'enlèvement de Bulpa au chapitre 1 :
// 'a' = ce qui t'envoie dans le chapitre (1re page du début), 'm' = le milieu (après le niveau 8 : on aperçoit le
// personnage du chapitre), 'z' = le moment fort de la fin (1re page de la fin).
// t = secondes depuis l'ouverture de la page : l'action dure 2 à 3 s, puis la scène reste vivante (petites boucles).

const sfp = new Paint(), sfs = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), sfPath = new Path();
const sfText = new Paint({ textAlign: Align.CENTER, bold: true });
/** Avancement de 0 à 1 entre t0 et t0 + d. */
const sfq = (t, t0, d) => clamp((t - t0) / d, 0, 1);
const sfOut = (q) => 1 - (1 - q) * (1 - q);
const sfInOut = (q) => q * q * (3 - 2 * q);
/** Va-et-vient périodique : monte en 0,4 s, reste, redescend, reste caché (pour un personnage qui jette un œil). */
function sfPeek(t, period) {
  const ph = t % period, up = period * 0.55;
  return ph < 0.4 ? sfInOut(ph / 0.4) : ph < up ? 1 : ph < up + 0.4 ? 1 - sfInOut((ph - up) / 0.4) : 0;
}
/** Couleur du bloc sur lequel tu te tiens, selon le chapitre. */
const SF_BLOCK = { 1: 0xFF7CC576, 2: 0xFFD98BA0, 3: 0xFF8E8A9E, 4: 0xFF6B7A3A, 5: 0xFFFFC928, 6: 0xFFF8C8DC, 7: 0xFFDCEFFB, 8: 0xFF3A2F36,
  9: 0xFFB87333, 10: 0xFFD93A3A, 11: 0xFF2A2A3A, 12: 0xFFD8B26E, 13: 0xFFF07C1A, 14: 0xFF1F1F24, 15: 0xFF7CB342, 16: 0xFFFFD1DC, 17: 0xFF9A6234, 18: 0xFF7A8A5A,
  19: 0xFFCFE6E8, 20: 0xFF90A4AE, 21: 0xFFC8683F, 22: 0xFF5A4E66, 23: 0xFFE53935, 24: 0xFF8A7AA8 };
/** Décor de la page d'arrivée : le monde d'où tu viens (ou celui où tu arrives). */
const SF_ARRIVAL = { 2: 1, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11, 13: 12, 14: 13, 15: 15, 16: 15, 17: 17, 18: 17, 19: 17, 20: 19, 21: 20, 22: 21, 23: 22, 24: 23 };

function sfBackground(canvas, c) {
  if (c <= 1) {
    sfp.color = Color.WHITE; sfp.shader = new LinearGradient(0, 0, 0, h, 0xFF8FD0F2, 0xFFFDE2C8); canvas.drawRect(0, 0, w, h, sfp); sfp.shader = null;
    storyMountain(canvas, w * 0.2, h * 0.38, w * 0.5, 0xFFB8C4D6); storyMountain(canvas, w * 0.72, h * 0.3, w * 0.6, 0xFF9AA9C0);
  } else drawChapterMapBackground(canvas, c);
  sfp.shader = null; sfp.color = Color.argb(50, 0, 0, 20); canvas.drawRect(0, 0, w, h, sfp);
}
/** Bloc (ombre, dessus, face avant) centré en x, dessus à la hauteur y, demi-largeur half. */
function sfBlock(canvas, c, x, y, half) {
  const col = SF_BLOCK[c] || SF_BLOCK[2];
  sfp.shader = null; sfp.color = Color.argb(60, 0, 0, 0); rect.set(x - half * 1.05, y + w * 0.02, x + half * 1.05, y + w * 0.14); canvas.drawOval(rect, sfp);
  sfp.color = shade(col, 0.72); rect.set(x - half, y + w * 0.01, x + half, y + w * 0.1); canvas.drawRoundRect(rect, w * 0.04, w * 0.04, sfp);
  sfp.color = col; rect.set(x - half, y - w * 0.02, x + half, y + w * 0.05); canvas.drawRoundRect(rect, w * 0.04, w * 0.04, sfp);
}
/** Ton personnage (pieds en x, y), agrandi s fois, éventuellement penché de rot degrés. */
function sfPlayer(canvas, x, y, s, scared, front, right = true, rot = 0) {
  canvas.save();
  if (rot) canvas.rotate(rot, x, y - k * s * 0.45);
  canvas.scale(s, s, x, y);
  drawCharacter(canvas, x, y, 0, 1, 1, right, scared, front);
  canvas.restore();
}
/** Personnage d'un chapitre, mis à la même échelle que toi (s = sa hauteur en blocs, quelle que soit sa forme). */
function sfHero(canvas, id, x, y, s, rot = 0, right = false) {
  canvas.save(); if (rot) canvas.rotate(rot, x, y - k * s * 0.45);
  drawHeroAt(canvas, id, x, y, s * 1.35 / specialHeight(id), true, right);
  canvas.restore();
}
/** Bulle « bande dessinée » qui surgit à t0 : étoile à pointes avec un symbole au milieu. */
function sfBurst(canvas, t, t0, x, y, r, label, col = 0xFFFFD23F) {
  if (t < t0) return;
  const q = sfq(t, t0, 0.3), s = q < 1 ? 1.2 * sfOut(q) : 1 + 0.05 * Math.sin((t - t0) * 6);
  canvas.save(); canvas.translate(x, y); canvas.scale(s, s); canvas.rotate(-8);
  sfPath.reset();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.66 : r; if (i === 0) sfPath.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else sfPath.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  sfPath.close();
  sfp.shader = null; sfp.color = col; canvas.drawPath(sfPath, sfp);
  sfs.color = 0xFF3A2A1A; sfs.strokeWidth = r * 0.08; canvas.drawPath(sfPath, sfs);
  sfText.textSize = r * 0.72; sfText.color = 0xFF3A2A1A; canvas.drawText(label, 0, r * 0.25, sfText);
  canvas.restore();
}
/** Gerbe de points qui partent de (x, y) à t0 et retombent en s'effaçant. */
function sfSparks(canvas, t, t0, x, y, n, dist, rgb, size, dur = 0.9, seed = 0) {
  const q = (t - t0) / dur;
  if (q < 0 || q > 1) return;
  sfp.shader = null;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + hash01(i + seed) * 0.6, d = dist * sfOut(q) * (0.55 + 0.45 * hash01(i + seed + 31));
    sfp.color = ca(rgb, 255 * (1 - q));
    canvas.drawCircle(x + Math.cos(a) * d, y + Math.sin(a) * d + q * q * dist * 0.5, size * (1 - q * 0.5), sfp);
  }
}
/** Feu d'artifice qui se répète : une gerbe toutes les `every` secondes, à un endroit qui change. */
function sfFireworks(canvas, t, t0, every, cols) {
  if (t < t0) return;
  for (let j = 0; j < 2; j++) {
    const n = Math.floor((t - t0) / every) - j;
    if (n < 0) continue;
    const s = t0 + n * every, x = w * (0.15 + 0.7 * hash01(n * 7 + 3)), y = h * (0.1 + 0.22 * hash01(n * 5 + 1));
    sfSparks(canvas, t, s, x, y, 16, w * 0.13, cols[n % cols.length], w * 0.01, every * 1.6, n * 13);
  }
}
function sfFlash(canvas, rgb, a) { if (a <= 0) return; sfp.shader = null; sfp.color = ca(rgb, a); canvas.drawRect(0, 0, w, h, sfp); }
function sfPoly(canvas, color, pts) {
  sfp.shader = null; sfp.color = color; sfPath.reset(); sfPath.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) sfPath.lineTo(pts[i], pts[i + 1]);
  sfPath.close(); canvas.drawPath(sfPath, sfp);
}
/** Neige, pétales, confettis… qui tombent en boucle. */
function sfFall(canvas, t, n, rgbs, size, speed, drift, kind = 0) {
  sfp.shader = null;
  for (let i = 0; i < n; i++) {
    const q = (t * speed * (0.7 + 0.6 * hash01(i + 90)) + hash01(i + 40)) % 1, x = w * hash01(i * 3 + 7) + Math.sin(t * 1.5 + i) * w * drift, y = h * (q * 0.7) - w * 0.05;
    sfp.color = 0xFF000000 + rgbs[i % rgbs.length];
    if (kind === 0) canvas.drawCircle(x, y, size, sfp);
    else { canvas.save(); canvas.rotate(t * 120 + i * 40, x, y); rect.set(x - size, y - size * (kind === 1 ? 0.6 : 0.35), x + size, y + size * (kind === 1 ? 0.6 : 0.35)); canvas.drawOval(rect, sfp); canvas.restore(); }
  }
}
/** Fantôme en drap (pour le manoir). */
function sfGhost(canvas, x, y, s, a) {
  sfPath.reset(); sfPath.moveTo(x - s, y + s * 0.9); sfPath.lineTo(x - s, y);
  sfPath.cubicTo(x - s, y - s * 1.3, x + s, y - s * 1.3, x + s, y); sfPath.lineTo(x + s, y + s * 0.9);
  for (let i = 0; i < 4; i++) { const x0 = x + s - i * s * 0.5; sfPath.quadTo(x0 - s * 0.125, y + s * (i % 2 ? 1.2 : 0.6) + Math.sin(time * 6 + i) * s * 0.1, x0 - s * 0.5, y + s * 0.9); }
  sfPath.close();
  sfp.shader = null; sfp.color = ca(0xF4F4FF, 230 * a); canvas.drawPath(sfPath, sfp);
  sfp.color = ca(0x1B1B2A, 255 * a);
  rect.set(x - s * 0.45, y - s * 0.35, x - s * 0.15, y + s * 0.05); canvas.drawOval(rect, sfp);
  rect.set(x + s * 0.15, y - s * 0.35, x + s * 0.45, y + s * 0.05); canvas.drawOval(rect, sfp);
}
/** Guitare électrique tenue en biais. */
function sfGuitar(canvas, x, y, s, rot) {
  canvas.save(); canvas.rotate(rot, x, y);
  sfp.shader = null; sfp.color = 0xFF6B3A1E; rect.set(x, y - s * 0.07, x + s * 1.3, y + s * 0.07); canvas.drawRect(rect, sfp);
  sfp.color = 0xFF2A2A2A; rect.set(x + s * 1.25, y - s * 0.12, x + s * 1.5, y + s * 0.12); canvas.drawRoundRect(rect, s * 0.05, s * 0.05, sfp);
  sfp.color = 0xFFE53935; canvas.drawCircle(x - s * 0.15, y, s * 0.42, sfp); canvas.drawCircle(x + s * 0.3, y, s * 0.3, sfp);
  sfp.color = 0xFFFFFFFF; canvas.drawCircle(x - s * 0.05, y, s * 0.1, sfp);
  canvas.restore();
}
/** Sarcophage debout, x = centre, y = pied ; lid = décalage du couvercle (0 fermé). */
function sfSarcophagus(canvas, x, y, s, inside, lidDx, lidRot = 0) {
  const l = x - s * 0.5, r = x + s * 0.5, top = y - s * 1.6;
  sfp.shader = null; sfp.color = 0xFF3A2414; rect.set(l, top, r, y); canvas.drawRoundRect(rect, s * 0.45, s * 0.45, sfp);
  if (inside) { canvas.save(); rect.set(l + s * 0.06, top + s * 0.06, r - s * 0.06, y); canvas.clipRect(rect.left, rect.top, rect.right, rect.bottom); inside(); canvas.restore(); }
  canvas.save(); canvas.translate(lidDx, 0); if (lidRot) canvas.rotate(lidRot, r, y);
  sfp.shader = new LinearGradient(l, 0, r, 0, [0xFFB8862E, 0xFFFFD35A, 0xFFC8962E], [0, 0.45, 1]); rect.set(l, top, r, y); canvas.drawRoundRect(rect, s * 0.45, s * 0.45, sfp); sfp.shader = null;
  sfp.color = 0xFFF2D7A0; canvas.drawCircle(x, top + s * 0.42, s * 0.24, sfp);
  sfp.color = 0xFF2F4F9E; rect.set(x - s * 0.34, top + s * 0.2, x + s * 0.34, top + s * 0.34); canvas.drawRect(rect, sfp);
  sfp.color = 0xFF1B1B1B; canvas.drawCircle(x - s * 0.09, top + s * 0.42, s * 0.035, sfp); canvas.drawCircle(x + s * 0.09, top + s * 0.42, s * 0.035, sfp);
  sfs.color = 0xFF2F4F9E; sfs.strokeWidth = s * 0.05;
  for (let i = 0; i < 4; i++) { const yy = top + s * (0.8 + i * 0.2); canvas.drawLine(x - s * 0.32, yy, x + s * 0.32, yy, sfs); }
  canvas.restore();
}
/** Rayons qui tournent depuis (x, y). */
function sfRays(canvas, x, y, len, a, t, rgb) {
  sfs.strokeWidth = w * 0.05;
  for (let i = 0; i < 12; i++) { const an = t * 0.4 + i * 0.5236; sfs.color = ca(rgb, (i % 2 === 0 ? 90 : 50) * a); canvas.drawLine(x, y, x + Math.cos(an) * len, y + Math.sin(an) * len, sfs); }
}
/** Éclair en zigzag entre deux points. */
/** Plante carnivore qui a gobé Bulpa (chapitre 10) : tige, mâchoires qui mâchonnent, Bulpa coincé entre les deux. */
function sfCarnivore(canvas, x, by, t) {
  const sin = Math.sin, hy = by - w * 0.17 + sin(t * 2) * w * 0.008, chew = 0.5 + 0.5 * sin(t * 3);
  sfs.color = 0xFF3E8A2A; sfs.strokeWidth = w * 0.022;
  sfPath.reset(); sfPath.moveTo(x, by + w * 0.04); sfPath.quadTo(x - w * 0.07, by - w * 0.06, x, hy); canvas.drawPath(sfPath, sfs);
  sfPoly(canvas, 0xFF4FA83A, [x - w * 0.03, by, x - w * 0.14, by - w * 0.06, x - w * 0.04, by + w * 0.03]);
  sfPoly(canvas, 0xFF4FA83A, [x + w * 0.01, by + w * 0.01, x + w * 0.12, by - w * 0.03, x + w * 0.02, by + w * 0.04]);
  sfp.color = 0xFF8E1B1B; rect.set(x - w * 0.1, hy - w * 0.1, x + w * 0.1, hy + w * 0.06); canvas.drawOval(rect, sfp);
  drawBulpa(canvas, x + sin(t * 20) * w * 0.003, hy + w * 0.03, w * 0.1, false);
  const jt = hy - w * 0.085 - chew * w * 0.02, jb = hy + w * 0.05;
  sfp.color = 0xFF4FA83A;
  rect.set(x - w * 0.12, jt - w * 0.06, x + w * 0.12, jt + w * 0.06); canvas.drawArc(rect, 180, 180, true, sfp);
  rect.set(x - w * 0.12, jb - w * 0.05, x + w * 0.12, jb + w * 0.05); canvas.drawArc(rect, 0, 180, true, sfp);
  sfp.color = 0xFFE53935; canvas.drawCircle(x - w * 0.05, jt - w * 0.03, w * 0.012, sfp); canvas.drawCircle(x + w * 0.04, jt - w * 0.035, w * 0.009, sfp);
  for (let i = 0; i < 5; i++) { const tx0 = x - w * 0.1 + i * w * 0.05; sfPoly(canvas, 0xFFFFFFFF, [tx0 - w * 0.012, jt, tx0 + w * 0.012, jt, tx0, jt + w * 0.025]); }
  for (let i = 0; i < 4; i++) { const tx0 = x - w * 0.075 + i * w * 0.05; sfPoly(canvas, 0xFFFFFFFF, [tx0 - w * 0.012, jb, tx0 + w * 0.012, jb, tx0, jb - w * 0.025]); }
}

/** Tête de T-Rex qui surgit (chapitre 18), tournée vers la gauche ; (x, y) = arrière du crâne, jaw = mâchoire ouverte de 0 à 1. */
function sfTrexHead(canvas, x, y, s, jaw) {
  sfp.shader = null;
  sfp.color = 0xFF436A32; rect.set(x + s * 0.1, y - s * 0.3, x + s * 1.2, y + s * 0.5); canvas.drawRect(rect, sfp);
  sfp.color = 0xFF8E1B1B;
  sfPath.reset(); sfPath.moveTo(x - s * 0.9, y + s * 0.03); sfPath.lineTo(x + s * 0.25, y + s * 0.06); sfPath.lineTo(x - s * 0.35, y + s * (0.08 + 0.35 * jaw)); sfPath.close(); canvas.drawPath(sfPath, sfp);
  canvas.save(); canvas.rotate(-jaw * 25, x + s * 0.2, y + s * 0.1);
  sfp.color = 0xFF436A32;
  sfPath.reset(); sfPath.moveTo(x + s * 0.3, y + s * 0.08); sfPath.lineTo(x - s * 0.9, y + s * 0.1); sfPath.quadTo(x - s * 0.4, y + s * 0.4, x + s * 0.4, y + s * 0.35); sfPath.close(); canvas.drawPath(sfPath, sfp);
  sfp.color = 0xFFFFFFFF;
  for (let i = 0; i < 5; i++) { const tx0 = x - s * 0.82 + i * s * 0.2; sfPath.reset(); sfPath.moveTo(tx0, y + s * 0.1); sfPath.lineTo(tx0 + s * 0.08, y + s * 0.1); sfPath.lineTo(tx0 + s * 0.04, y + s * 0.02); sfPath.close(); canvas.drawPath(sfPath, sfp); }
  canvas.restore();
  sfp.color = 0xFF4E7A3A;
  sfPath.reset(); sfPath.moveTo(x + s * 0.4, y - s * 0.35); sfPath.quadTo(x - s * 0.4, y - s * 0.55, x - s * 1.0, y - s * 0.15); sfPath.lineTo(x - s * 1.0, y + s * 0.03); sfPath.lineTo(x + s * 0.4, y + s * 0.15); sfPath.close(); canvas.drawPath(sfPath, sfp);
  sfp.color = 0xFFFFFFFF;
  for (let i = 0; i < 5; i++) { const tx0 = x - s * 0.92 + i * s * 0.2; sfPath.reset(); sfPath.moveTo(tx0, y + s * 0.03); sfPath.lineTo(tx0 + s * 0.08, y + s * 0.03); sfPath.lineTo(tx0 + s * 0.04, y + s * 0.12); sfPath.close(); canvas.drawPath(sfPath, sfp); }
  sfp.color = 0xFFFFFFFF; canvas.drawCircle(x - s * 0.2, y - s * 0.28, s * 0.08, sfp);
  sfp.color = 0xFF1B1B1B; canvas.drawCircle(x - s * 0.23, y - s * 0.27, s * 0.04, sfp); canvas.drawCircle(x - s * 0.88, y - s * 0.1, s * 0.025, sfp);
  sfs.color = 0xFF2E4A22; sfs.strokeWidth = s * 0.05; canvas.drawLine(x - s * 0.34, y - s * 0.4, x - s * 0.08, y - s * 0.38, sfs);
}

/** Cage de fer accrochée (chapitre 17), centre du bas en (x, y), transparence a de 0 à 1. */
function sfCage(canvas, x, y, a) {
  if (a <= 0) return;
  sfs.color = ca(0x4A4A50, 255 * a); sfs.strokeWidth = w * 0.008;
  for (let i = 0; i <= 5; i++) { const bx0 = x - w * 0.08 + i * w * 0.032; canvas.drawLine(bx0, y - w * 0.19, bx0, y, sfs); }
  sfp.color = ca(0x4A4A50, 255 * a);
  rect.set(x - w * 0.09, y - w * 0.21, x + w * 0.09, y - w * 0.18); canvas.drawRoundRect(rect, w * 0.01, w * 0.01, sfp);
  rect.set(x - w * 0.09, y - w * 0.01, x + w * 0.09, y + w * 0.015); canvas.drawRect(rect, sfp);
}

/** Vergue du navire (chapitre 17), d'où pend la cage. */
function sfYard(canvas) {
  sfs.color = 0xFF5A3A22; sfs.strokeWidth = w * 0.02; canvas.drawLine(w * 0.45, h * 0.18, w * 1.05, h * 0.16, sfs);
}

/** Liquide qui ondule, surface en y (comme sfLiquid de StoryFx.kt). */
function sfLiquid(canvas, y, t, top, bottom, freq = 1.4, speed = 3) {
  sfp.shader = new LinearGradient(0, y, 0, h, top, bottom);
  sfPath.reset(); sfPath.moveTo(0, h); for (let i = 0; i <= 20; i++) sfPath.lineTo(w * i / 20, y + Math.sin(i * freq + t * speed) * w * 0.008); sfPath.lineTo(w, h); sfPath.close(); canvas.drawPath(sfPath, sfp); sfp.shader = null;
}

function sfBolt(canvas, x0, y0, x1, y1, seed, rgb, width) {
  sfs.color = 0xFF000000 + rgb; sfs.strokeWidth = width;
  sfPath.reset(); sfPath.moveTo(x0, y0);
  for (let i = 1; i < 6; i++) { const f = i / 6, j = (hash01(seed + i) - 0.5) * w * 0.05; sfPath.lineTo(x0 + (x1 - x0) * f + j, y0 + (y1 - y0) * f - j * 0.5); }
  sfPath.lineTo(x1, y1); canvas.drawPath(sfPath, sfs);
}
/** Faisceau de projecteur depuis (x, y), orienté de a degrés (0 = vers le haut). */
function sfBeamLight(canvas, x, y, a, len, spread, rgb, alpha) {
  const r0 = (a - spread - 90) * Math.PI / 180, r1 = (a + spread - 90) * Math.PI / 180;
  sfPoly(canvas, ca(rgb, alpha), [x, y, x + Math.cos(r0) * len, y + Math.sin(r0) * len, x + Math.cos(r1) * len, y + Math.sin(r1) * len]);
}
/** Foule en ombres chinoises, bras levés qui se balancent. */
function sfCrowd(canvas, t, y, lighters) {
  sfp.shader = null; sfs.strokeWidth = w * 0.014;
  for (let i = 0; i < 14; i++) {
    const x = w * (i + 0.5) / 14, hy = y + Math.sin(i * 2.1) * w * 0.012, sw = Math.sin(t * 3 + i) * w * 0.02;
    sfp.color = 0xFF0E0A14; canvas.drawCircle(x, hy, w * 0.03, sfp); rect.set(x - w * 0.04, hy + w * 0.02, x + w * 0.04, hy + w * 0.2); canvas.drawRoundRect(rect, w * 0.03, w * 0.03, sfp);
    sfs.color = 0xFF0E0A14; canvas.drawLine(x + w * 0.025, hy + w * 0.03, x + w * 0.04 + sw, hy - w * 0.06, sfs);
    if (lighters && i % 3 === 0) { sfp.color = ca(0xFFD27A, 200 + 55 * Math.sin(t * 9 + i)); canvas.drawCircle(x + w * 0.04 + sw, hy - w * 0.075, w * 0.008, sfp); }
  }
}

/**
 * Scène animée [kind] ('a' arrivée, 'm' milieu, 'z' fin) du chapitre c, en plein écran (la bulle de texte est
 * dessinée par-dessus, en bas).
 */
function drawStoryFx(canvas, c, kind, t) {
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, PI = Math.PI;
  const bx = w / 2, by = h * 0.52, P = 1.8, hero = ChapterInfo.hero(c), bob = abs(sin(t * 4)) * w * 0.012;
  const key = c + kind;
  let bg = kind === 'a' ? SF_ARRIVAL[c] : c;
  if (key === '12a') bg = t < 2.2 ? 11 : 12;
  if (key === '15a') bg = t < 1.6 ? 14 : 15;
  if (key === '18a') bg = t < 2.2 ? 17 : 18;
  if (key === '19a') bg = t < 1.8 ? 17 : 19;
  if (key === '20a') bg = t < 1.8 ? 19 : 20;
  if (key === '21a') bg = t < 1.6 ? 20 : 21;
  if (key === '22a') bg = t < 1.6 ? 21 : 22;
  if (key === '23a') bg = t < 1.6 ? 22 : 23;
  if (key === '24a') bg = t < 1.4 ? 23 : 24;
  sfBackground(canvas, bg);
  // Secousses du premier plan (le décor reste en place)
  let shake = 0;
  if (key === '2m') { const ph = t % 1.8; if (ph < 0.3) shake = w * 0.014 * (1 - ph / 0.3); }
  else if (key === '2z' && t < 0.6) shake = w * 0.008;
  else if (key === '8a' && t > 1.2) shake = w * 0.006 * (t < 2.4 ? 1 : 0.4);
  else if (key === '9a' && t < 0.8) shake = w * 0.008;
  else if (key === '5a' && t > 1.4 && t < 2.6) shake = w * 0.006;
  else if (key === '18m') { const ph = t % 1.6; if (ph < 0.25) shake = w * 0.012 * (1 - ph / 0.25); }
  canvas.save(); if (shake) canvas.translate(sin(t * 53) * shake, cos(t * 41) * shake * 0.6);
  switch (key) {
    // ---------- 2 : dans le ventre de la baleine ----------
    case '2a': {
      const sea = by + w * 0.06, ws = w * 0.085, wx = bx + w * 0.16;
      const up = sfOut(sfq(t, 0.7, 0.8)) - sfInOut(sfq(t, 2.3, 1.0)) * 0.75, wy = sea + ws * 0.2 - up * ws * 1.6;
      drawWhale(canvas, wx, wy, ws, -1);
      sfp.color = Color.WHITE; sfp.shader = new LinearGradient(0, sea, 0, h, 0xFF3D8FD6, 0xFF1C4E8C); canvas.drawRect(0, sea, w, h, sfp); sfp.shader = null;
      sfs.color = ca(0xFFFFFF, 150); sfs.strokeWidth = w * 0.006;
      sfPath.reset(); for (let i = 0; i <= 24; i++) { const x = w * i / 24, y = sea + sin(i * 1.3 + t * 2) * w * 0.006; if (i === 0) sfPath.moveTo(x, y); else sfPath.lineTo(x, y); } canvas.drawPath(sfPath, sfs);
      const px0 = bx - w * 0.2;
      sfBlock(canvas, 1, px0, by, w * 0.15);
      const suck = sfInOut(sfq(t, 1.55, 0.5)), mx = wx - ws * 1.35, my = wy + ws * 0.8;
      // Bulpa, juste à côté, est aspiré avec toi
      const suckB = sfInOut(sfq(t, 1.7, 0.5));
      if (suckB < 1) {
        const qx = px0 + w * 0.09 + (mx - px0 - w * 0.09) * suckB, qy = by - bob * (1 - suckB) + (my - by) * suckB;
        canvas.save(); canvas.rotate(suckB * 220, qx, qy - w * 0.06);
        drawBulpa(canvas, qx, qy, w * 0.11 * (1 - suckB * 0.85), t < 1.1);
        canvas.restore();
      }
      if (suck < 1) {
        const pp = px0 - w * 0.05;
        sfPlayer(canvas, pp + (mx - pp) * suck, by - bob * (1 - suck) + (my - by) * suck, P * (1 - suck * 0.85), t > 1.1, t > 1.1, true, suck * 200);
      }
      sfBurst(canvas, t, 1.1, px0 - w * 0.06, by - w * 0.38, w * 0.075, '?!');
      sfSparks(canvas, t, 2.3, wx, sea, 14, w * 0.18, 0xE8F6FF, w * 0.013, 1.0);
      break;
    }
    case '2m': {
      sfp.shader = new RadialGradient(bx, 0, w * 0.6, [ca(0xBFF4FF, 130), ca(0xBFF4FF, 0)], [0, 1]); canvas.drawRect(0, 0, w, h * 0.5, sfp); sfp.shader = null;
      sfs.strokeWidth = w * 0.006;
      for (let i = 0; i < 14; i++) { const q = (t * 0.25 + hash01(i)) % 1; sfs.color = ca(0xE8FBFF, 200 * (1 - q)); canvas.drawCircle(w * hash01(i * 5 + 1) + sin(t * 2 + i) * w * 0.02, by + w * 0.1 - q * h * 0.5, w * (0.01 + 0.015 * hash01(i + 9)), sfs); }
      sfBlock(canvas, 2, bx, by, w * 0.2);
      const ph = t % 1.8;
      sfPlayer(canvas, bx - w * 0.07, by - (ph < 0.3 ? w * 0.04 * sin(ph / 0.3 * PI) : bob), P, ph < 0.6, ph < 0.6);
      // Bulpa chatouille la luette d'Abysse : il saute à chaque hoquet
      drawBulpa(canvas, bx + w * 0.11, by - (ph < 0.3 ? w * 0.06 * sin(ph / 0.3 * PI) : abs(sin(t * 4 + 1)) * w * 0.012), w * 0.11, ph >= 0.6);
      if (ph < 1.0) sfBurst(canvas, ph, 0, bx + w * 0.22, by - w * 0.32, w * 0.075, '!');
      break;
    }
    case '2z': {
      const rise = sfOut(sfq(t, 0.6, 1.0)), topY = by - (by - h * 0.2) * rise;
      sfBlock(canvas, 2, bx, by, w * 0.2);
      if (t > 0.6) { drawSpout(canvas, bx, by, by - topY + w * 0.02, w * 0.13, 1); sfSparks(canvas, t, 0.6, bx, by, 16, w * 0.25, 0xE8F6FF, w * 0.012, 1.2); }
      // Bulpa est éjecté avec toi
      const qx = bx + w * 0.14, qy = topY + w * 0.05 * rise - (t > 1.6 ? abs(sin(t * 3 + 1)) * w * 0.02 : 0);
      canvas.save(); canvas.rotate(-(1 - rise) * rise * 1080, qx, qy - w * 0.06); drawBulpa(canvas, qx, qy, w * 0.11); canvas.restore();
      sfPlayer(canvas, bx - w * 0.05, topY - (t > 1.6 ? abs(sin(t * 3)) * w * 0.02 : 0), P, false, true, true, (1 - rise) * rise * 1440 * (t > 0.6 ? 1 : 0));
      sfBurst(canvas, t, 0.65, bx - w * 0.28, by - w * 0.1, w * 0.08, '💦', 0xFFBFEFFF);
      break;
    }
    // ---------- 3 : enlevé par les aliens ----------
    case '3a': {
      const rise = sfOut(sfq(t, 0, 1.2)), ux = w * 1.3 + (bx - w * 1.3) * sfInOut(sfq(t, 0.9, 1.0)), uy = h * 0.2 + sin(t * 2) * w * 0.01;
      const lift = sfInOut(sfq(t, 2.3, 1.6));
      let py = h * 0.85 + (by - h * 0.85) * rise; py -= (py - (uy + w * 0.2)) * lift * 0.7;
      if (t > 1.9) drawBeam(canvas, ux, uy + w * 0.03, by + w * 0.03, w * 0.12, sfq(t, 1.9, 0.3));
      sfs.strokeWidth = w * 0.008; sfs.color = ca(0xFFFFFF, 180 * (1 - rise));
      for (const dx of [-0.06, 0, 0.06]) canvas.drawLine(bx + dx * w, py + w * 0.04, bx + dx * w, py + w * 0.25, sfs);
      sfPlayer(canvas, bx, py, P * (1 - 0.35 * lift), t > 1.4, true, true, (1 - rise) * 540 + sin(t * 3) * 10 * lift);
      drawUfo(canvas, ux, uy, w * 0.12);
      sfBurst(canvas, t, 1.5, bx + w * 0.24, by - w * 0.34, w * 0.075, '?!');
      break;
    }
    case '3m': {
      const cl = w * 0.62, ct = by - w * 0.1, up = sfPeek(t, 3.2);
      sfBlock(canvas, 3, bx - w * 0.18, by, w * 0.18);
      sfPlayer(canvas, bx - w * 0.18, by - bob, P, false, false, true);
      canvas.save(); canvas.clipRect(0, 0, w, ct);
      sfHero(canvas, 'zorg', w * 0.79, ct + w * 0.03 + (1 - up) * w * 0.2, 1.3);
      sfp.color = 0xFFF2F2E6; rect.set(w * 0.64, ct - w * 0.12 + (1 - up) * w * 0.2, w * 0.71, ct - w * 0.03 + (1 - up) * w * 0.2); canvas.drawRect(rect, sfp);
      canvas.restore();
      sfp.shader = new LinearGradient(0, ct, 0, by + w * 0.06, 0xFF9AA3B5, 0xFF4E5566); rect.set(cl, ct, w * 0.97, by + w * 0.06); canvas.drawRoundRect(rect, w * 0.02, w * 0.02, sfp); sfp.shader = null;
      for (let i = 0; i < 5; i++) { sfp.color = (Math.floor(t * 3) + i) % 3 === 0 ? 0xFF5CF2E6 : (i % 2 ? 0xFFFF5252 : 0xFFFFEB3B); canvas.drawCircle(cl + w * (0.05 + i * 0.065), ct + w * 0.05, w * 0.014, sfp); }
      sfBurst(canvas, t, 1.0, bx - w * 0.38, by - w * 0.35, w * 0.065, '?');
      break;
    }
    case '3z': {
      const ux = bx, uy = h * 0.18 + sin(t * 2) * w * 0.01, d = sfInOut(sfq(t, 0.2, 1.8));
      drawBeam(canvas, ux, uy + w * 0.03, by + w * 0.03, w * 0.12, 1 - sfq(t, 2.4, 0.6));
      sfBlock(canvas, 3, bx, by, w * 0.2);
      sfPlayer(canvas, bx, (uy + w * 0.2) + (by - uy - w * 0.2) * d - (d >= 1 ? bob : 0), P * (0.6 + 0.4 * d), false, true);
      drawUfo(canvas, ux, uy, w * 0.12);
      sfSparks(canvas, t, 2.0, bx, by, 14, w * 0.2, 0xBFFFC8, w * 0.012);
      for (let i = 0; i < 6; i++) { const ph = (t * 0.9 + i / 6) % 1; if (t < 2) break; sfp.color = ca(0xFFF59D, 255 * sin(ph * PI)); canvas.drawPath(islandStar(w * (0.1 + 0.8 * hash01(i * 3 + Math.floor(t * 0.9 + i / 6))), h * (0.3 + 0.15 * hash01(i + 5)), w * 0.025, w * 0.01, 1, 0), sfp); }
      break;
    }
    // ---------- 4 : capturé par l'armée ----------
    case '4a': {
      const hx = w * 1.3 + (bx + w * 0.1 - w * 1.3) * sfInOut(sfq(t, 0.4, 1.2)), lq = sfInOut(sfq(t, 2.4, 1.6));
      const hy = h * 0.2 + sin(t * 3) * w * 0.01 - lq * h * 0.08, nq = sfOut(sfq(t, 1.7, 0.4));
      const px0 = bx - w * 0.06, lift = lq * (by - h * 0.32), sw = sin(t * 3) * 8 * lq;
      sfBlock(canvas, 4, px0, by, w * 0.2);
      canvas.save(); canvas.rotate(sw, hx, hy);
      sfHero(canvas, 'zorg', px0 + w * 0.08, by - lift - (t < 1 ? bob : 0), 0.9);
      sfPlayer(canvas, px0 - w * 0.05, by - lift - (t < 1 ? bob : 0), P, t > 1.0, t > 1.0);
      if (nq > 0) {
        const nb = hy + (by + w * 0.01 - lift - hy) * nq, nt = nb - w * 0.3;
        sfs.color = 0xFF6B5A3A; sfs.strokeWidth = w * 0.006;
        canvas.drawLine(hx, hy + w * 0.05, px0 - w * 0.05, nt, sfs); canvas.drawLine(hx, hy + w * 0.05, px0 + w * 0.05, nt, sfs);
        for (let i = 0; i <= 6; i++) { const f = i / 6; canvas.drawLine(px0 - w * 0.05 + w * 0.1 * f, nt, px0 - w * 0.15 + w * 0.3 * f, nb, sfs); }
        for (let i = 0; i <= 5; i++) { const f = i / 5, y = nt + (nb - nt) * f, hw = w * (0.05 + 0.1 * f); canvas.drawLine(px0 - hw, y, px0 + hw, y, sfs); }
      }
      canvas.restore();
      drawHelicopterDir(canvas, hx, hy, w * 0.09, 4, -1);
      sfBurst(canvas, t, 2.1, px0 - w * 0.3, by - w * 0.3, w * 0.075, '!!');
      break;
    }
    case '4m': {
      const a1 = sin(t * 0.8) * 35, a2 = -sin(t * 0.8 + 1.5) * 35;
      sfBeamLight(canvas, w * 0.04, h * 0.64, 30 + a1, h * 0.7, 7, 0xFFF6C0, 70);
      sfBeamLight(canvas, w * 0.96, h * 0.64, -30 + a2, h * 0.7, 7, 0xFFF6C0, 70);
      sfHero(canvas, 'sergent', w * 0.84, by - w * 0.06, 1.0);
      sfp.color = 0xFF1B1B1B; canvas.drawCircle(w * 0.815, by - w * 0.17, w * 0.016, sfp); canvas.drawCircle(w * 0.85, by - w * 0.17, w * 0.016, sfp);
      sfp.color = ca(0xFFFFFF, 255 * (0.5 + 0.5 * sin(t * 5))); canvas.drawCircle(w * 0.81, by - w * 0.175, w * 0.005, sfp);
      sfBlock(canvas, 4, bx - w * 0.12, by, w * 0.26);
      sfPlayer(canvas, bx - w * 0.2, by, P * 0.9, true, true);
      // Zorg, caché derrière les caisses, jette un œil
      const zp = sfPeek(t, 3.0);
      sfHero(canvas, 'zorg', bx + w * 0.075, by - w * 0.1 - zp * w * 0.07, 0.9);
      for (const [x, y, s] of [[bx + w * 0.02, by, 0.1], [bx + w * 0.13, by, 0.1], [bx + w * 0.075, by - w * 0.1, 0.1]]) {
        const sz = w * s; sfp.color = 0xFFA87A42; rect.set(x - sz / 2, y - sz, x + sz / 2, y); canvas.drawRect(rect, sfp);
        sfs.color = 0xFF6E4A22; sfs.strokeWidth = w * 0.006; canvas.drawRect(rect, sfs); canvas.drawLine(rect.left, rect.top, rect.right, rect.bottom, sfs); canvas.drawLine(rect.right, rect.top, rect.left, rect.bottom, sfs);
      }
      sfBurst(canvas, t, 1.2, bx - w * 0.38, by - w * 0.32, w * 0.065, '!');
      break;
    }
    case '4z': {
      const fx = bx, ft = by - w * 0.3, q = sfInOut(sfq(t, 0.5, 0.9));
      sfBeamLight(canvas, w * 0.04, h * 0.64, 30 + sin(t * 1.3) * 30, h * 0.7, 7, 0xFFF6C0, 60);
      sfBlock(canvas, 4, w * 0.24, by, w * 0.16); sfBlock(canvas, 4, w * 0.76, by, w * 0.16);
      sfs.color = 0xFF9AA0A8; sfs.strokeWidth = w * 0.004;
      for (let i = 0; i <= 8; i++) { const f = i / 8; canvas.drawLine(fx - w * 0.06, ft + w * 0.3 * f, fx + w * 0.06, ft + w * 0.3 * f - w * 0.04, sfs); canvas.drawLine(fx - w * 0.06, ft + w * 0.3 * f - w * 0.04, fx + w * 0.06, ft + w * 0.3 * f, sfs); }
      sfs.color = 0xFF6E747C; sfs.strokeWidth = w * 0.012; canvas.drawLine(fx - w * 0.06, ft - w * 0.02, fx - w * 0.06, by + w * 0.03, sfs); canvas.drawLine(fx + w * 0.06, ft - w * 0.02, fx + w * 0.06, by + w * 0.03, sfs);
      sfs.color = 0xFF55595F; sfs.strokeWidth = w * 0.004; for (let i = 0; i < 6; i++) { const x = fx - w * 0.06 + i * w * 0.024; canvas.drawLine(x, ft - w * 0.02, x + w * 0.012, ft - w * 0.04, sfs); canvas.drawLine(x + w * 0.012, ft - w * 0.04, x + w * 0.024, ft - w * 0.02, sfs); }
      // Zorg saute juste derrière toi
      const q2 = sfInOut(sfq(t, 0.85, 0.9)), x2 = w * 0.16 + (w * 0.5) * q2, y2 = by - sin(PI * q2) * w * 0.4 - (q2 >= 1 ? abs(sin(t * 4 + 1)) * w * 0.012 : 0);
      sfHero(canvas, 'zorg', x2, y2, 0.9, q2 > 0 && q2 < 1 ? -q2 * 360 : 0);
      const x = w * 0.28 + (w * 0.52) * q, y = by - sin(PI * q) * w * 0.45 - (q >= 1 ? bob : 0);
      sfPlayer(canvas, x, y, P, false, q >= 1, true, q < 1 && q > 0 ? q * 360 : 0);
      if (t > 1.4) { const on = Math.floor(t * 4) % 2 === 0; sfp.shader = new RadialGradient(on ? 0 : w, 0, w * 0.5, [ca(on ? 0xFF2A2A : 0x2A6BFF, 110), ca(0x000000, 0)], [0, 1]); canvas.drawRect(0, 0, w, h * 0.6, sfp); sfp.shader = null; }
      sfBurst(canvas, t, 1.5, w * 0.76, by - w * 0.4, w * 0.075, '!!');
      break;
    }
    // ---------- 5 : la centrale explose ----------
    case '5a': {
      const tx = w * 0.78, tb = by + w * 0.02, tt = by - w * 0.42, boom = t >= 2.2;
      const tsh = t > 0.6 && !boom ? sin(t * 40) * w * 0.004 * sfq(t, 0.6, 1.4) : 0;
      sfp.shader = new LinearGradient(tx - w * 0.14, 0, tx + w * 0.14, 0, [0xFF7A808A, 0xFFC8CDD4, 0xFF5E646E], [0, 0.4, 1]);
      sfPath.reset(); sfPath.moveTo(tx - w * 0.15 + tsh, tb); sfPath.quadTo(tx - w * 0.05 + tsh, by - w * 0.2, tx - w * 0.1 + tsh, tt); sfPath.lineTo(tx + w * 0.1 + tsh, tt); sfPath.quadTo(tx + w * 0.05 + tsh, by - w * 0.2, tx + w * 0.15 + tsh, tb); sfPath.close();
      canvas.drawPath(sfPath, sfp); sfp.shader = null;
      sfp.color = 0xFFD32F2F; rect.set(tx - w * 0.1 + tsh, tt, tx + w * 0.1 + tsh, tt + w * 0.04); canvas.drawRect(rect, sfp);
      for (let i = 0; i < 4; i++) { const q = (t * 0.4 + i / 4) % 1; sfp.color = ca(boom ? 0x9CFF6A : 0xE0E0E0, 140 * (1 - q)); canvas.drawCircle(tx + sin(q * 3 + i) * w * 0.04, tt - q * w * 0.3, w * (0.04 + 0.06 * q), sfp); }
      sfBlock(canvas, 4, bx - w * 0.2, by, w * 0.17);
      sfPlayer(canvas, bx - w * 0.2, by - (t < 0.5 ? bob : 0), P, t > 0.5, t > 0.5);
      const lv = h - (h - by - w * 0.05) * sfOut(sfq(t, 2.4, 1.2));
      if (t > 2.4) {
        sfp.shader = new LinearGradient(0, lv, 0, h, 0xFF8CFF4A, 0xFF2E8B1A);
        sfPath.reset(); sfPath.moveTo(0, h); for (let i = 0; i <= 20; i++) sfPath.lineTo(w * i / 20, lv + sin(i * 1.4 + t * 3) * w * 0.008); sfPath.lineTo(w, h); sfPath.close(); canvas.drawPath(sfPath, sfp); sfp.shader = null;
        for (let i = 0; i < 6; i++) { const q = (t * 0.8 + i / 6) % 1; sfp.color = ca(0xC6FF9A, 200 * (1 - q)); canvas.drawCircle(w * hash01(i + 60), lv + w * 0.04 - q * w * 0.05, w * 0.01, sfp); }
      }
      if (!boom) sfFlash(canvas, 0xFF1A1A, 70 * (0.5 + 0.5 * sin(t * 12)));
      sfFlash(canvas, 0xE6FFD0, 230 * (1 - sfq(t, 2.2, 0.6)) * (boom ? 1 : 0));
      sfBurst(canvas, t, 2.2, tx, tt - w * 0.05, w * 0.12, '💥', 0xFFB6FF4A);
      sfSparks(canvas, t, 2.2, tx, tt, 18, w * 0.3, 0x9CFF6A, w * 0.016, 1.1);
      break;
    }
    case '5m': {
      const ay = by + w * 0.07, up = sfPeek(t, 4);
      sfBlock(canvas, 5, bx - w * 0.18, by, w * 0.17);
      sfPlayer(canvas, bx - w * 0.18, by - bob, P, up > 0.5, false, true);
      sfHero(canvas, 'toxik', w * 0.76, ay + (1 - up) * w * 0.22 - w * 0.01, 1.3);
      sfp.shader = new LinearGradient(0, ay, 0, h, 0xFF8CFF4A, 0xFF2E8B1A);
      sfPath.reset(); sfPath.moveTo(0, h); for (let i = 0; i <= 20; i++) sfPath.lineTo(w * i / 20, ay + sin(i * 1.4 + t * 3) * w * 0.008); sfPath.lineTo(w, h); sfPath.close(); canvas.drawPath(sfPath, sfp); sfp.shader = null;
      sfs.strokeWidth = w * 0.005; for (let i = 0; i < 5; i++) { const q = (t * 0.7 + i / 5) % 1; sfs.color = ca(0xE0FFC8, 220 * (1 - q)); canvas.drawCircle(w * (0.68 + 0.16 * hash01(i + 3)), ay - q * w * 0.04, w * (0.008 + 0.012 * q), sfs); }
      sfBurst(canvas, t, 1.0, bx - w * 0.4, by - w * 0.34, w * 0.065, '?!');
      break;
    }
    case '5z': {
      const lv = by + w * 0.07 + sfInOut(sfq(t, 0.2, 2.2)) * (h - by), sun = sfq(t, 0.8, 1.5);
      sfRays(canvas, 0, 0, w * 1.1, sun, t, 0xFFE9A0);
      sfFlash(canvas, 0xFFE8B0, 50 * sun);
      sfBlock(canvas, 5, bx - w * 0.15, by, w * 0.2);
      sfPlayer(canvas, bx - w * 0.15, by - bob, P, false, true);
      const hq = sfq(t, 2.0, 1.4); if (hq > 0) sfHero(canvas, 'toxik', w * 1.1 - w * 0.36 * hq, by - abs(sin(t * 6)) * w * 0.05, 1.3);
      sfp.shader = new LinearGradient(0, lv, 0, h, 0xFF8CFF4A, 0xFF2E8B1A); canvas.drawRect(0, lv, w, h, sfp); sfp.shader = null;
      break;
    }
    // ---------- 6 : au pays des rêves ----------
    case '6a': {
      const night = sfq(t, 1.5, 2.0);
      sfFlash(canvas, 0x2A1B4E, 190 * night);
      for (let i = 0; i < 18; i++) { sfp.color = ca(0xFFFFFF, night * (120 + 120 * sin(t * 3 + i))); canvas.drawCircle(w * hash01(i * 7 + 2), h * 0.45 * hash01(i * 3 + 1), w * 0.006, sfp); }
      if (night > 0.3) { const s = sfOut(sfq(t, 2.1, 0.6)); drawSleepyMoon(canvas, w * 0.78, h * 0.16, w * 0.08 * s); }
      sfBlock(canvas, 5, bx, by, w * 0.2);
      eyesShut = t > 2.0 || (t % 1.0) > (t < 1.2 ? 0.85 : 0.5);
      sfPlayer(canvas, bx - w * 0.06, by, P, false, true, true, t > 1.5 ? sin(t * 1.5) * 6 : 0);
      eyesShut = false;
      // Bulpa s'endort à côté… et fait un cauchemar
      const nm = sfq(t, 2.3, 0.5);
      drawBulpa(canvas, bx + w * 0.13 + (nm > 0 ? sin(t * 40) * w * 0.004 : 0), by, w * 0.11, nm <= 0);
      if (nm > 0) {
        const ncx = bx + w * 0.2, ncy = by - w * 0.21;
        sfp.color = ca(0xA596D6, 240 * nm);
        for (const d of [-0.035, 0, 0.035]) canvas.drawCircle(ncx + d * w, ncy - (d === 0 ? w * 0.015 : 0), w * 0.03, sfp);
        if (Math.floor(t * 3) % 2 === 0) sfBolt(canvas, ncx, ncy + w * 0.02, ncx - w * 0.02, ncy + w * 0.07, Math.floor(t * 3), 0xFFE066, w * 0.005);
      }
      sfText.color = 0xFFFFFFFF;
      for (let i = 0; i < 3; i++) { const q = ((t - 1.0) / 2.4 + i / 3) % 1; if (t < 1.0 + i * 0.8) continue; sfText.textSize = w * (0.05 + 0.05 * q); sfText.alpha = Math.round(255 * sin(q * PI)); canvas.drawText('Z', bx + w * (0.1 + 0.14 * q), by - w * (0.3 + 0.25 * q), sfText); }
      sfText.alpha = 255;
      break;
    }
    case '6m': {
      const fl = w * 0.68, fr = w * 0.84, fy = by + w * 0.02;
      sfs.color = 0xFFFFFFFF; sfs.strokeWidth = w * 0.014;
      for (let i = 0; i < 4; i++) { const x = fl + (fr - fl) * i / 3; canvas.drawLine(x, fy, x, fy - w * 0.1, sfs); }
      canvas.drawLine(fl - w * 0.01, fy - w * 0.08, fr + w * 0.01, fy - w * 0.08, sfs); canvas.drawLine(fl - w * 0.01, fy - w * 0.04, fr + w * 0.01, fy - w * 0.04, sfs);
      for (let i = 0; i < 3; i++) {
        const q = (t / 2.6 + i / 3) % 1, x = w * 1.15 - q * w * 1.3, jq = (q - 0.22) / 0.14, y = fy - (jq > 0 && jq < 1 ? sin(jq * PI) * w * 0.14 : 0);
        canvas.save(); canvas.scale(-1, 1, x, y); drawSheep(canvas, x, y, w * 0.1, jq > 0 && jq < 1 ? 0.1 : 0); canvas.restore();
      }
      const my = h * 0.25 + sin(t * 1.3) * w * 0.02;
      sfHero(canvas, 'morphee', w * 0.72, my, 1.2);
      for (let i = 0; i < 10; i++) { const q = (t * 0.6 + i / 10) % 1; sfp.color = ca(0xFFD86A, 230 * (1 - q)); canvas.drawCircle(w * 0.62 + sin(i * 2.7) * w * 0.05 - q * w * 0.15, my + q * h * 0.25, w * 0.007, sfp); }
      sfBlock(canvas, 6, w * 0.28, by, w * 0.16);
      eyesShut = (t % 2.2) > 1.5;
      sfPlayer(canvas, w * 0.28, by - bob * 0.5, P, false, false, true);
      eyesShut = false;
      break;
    }
    case '6z': {
      const s = sfInOut(sfq(t, 0, 2.5)), sy = by + w * 0.12 - (by + w * 0.12 - h * 0.2) * s;
      sfFlash(canvas, 0xFFB27A, 80 * s);
      sfRays(canvas, bx, sy, w * 0.9, s, t, 0xFFE9A0);
      sfp.shader = new RadialGradient(bx, sy, w * 0.25, [0xFFFFF3B0, ca(0xFFD27A, 0)], [0.3, 1]); canvas.drawCircle(bx, sy, w * 0.25, sfp); sfp.shader = null;
      sfp.color = 0xFFFFE066; canvas.drawCircle(bx, sy, w * 0.09, sfp);
      for (let i = 0; i < 12; i++) { sfp.color = ca(0xFFFFFF, (1 - s) * (120 + 120 * sin(t * 3 + i))); canvas.drawCircle(w * hash01(i * 7 + 2), h * 0.4 * hash01(i * 3 + 1), w * 0.006, sfp); }
      sfBlock(canvas, 6, bx, by, w * 0.2);
      sfPlayer(canvas, bx - w * 0.06, by - abs(sin(t * 2.5)) * w * 0.03, P, false, true);
      drawBulpa(canvas, bx + w * 0.13, by - abs(sin(t * 2.5 + 1)) * w * 0.03, w * 0.11);
      break;
    }
    // ---------- 7 : emporté par le blizzard ----------
    case '7a': {
      const cx = bx + w * 0.22, ring = t > 0.2 && t < 1.8, cold = sfq(t, 1.6, 1.2);
      sfBlock(canvas, 6, bx - w * 0.02, by, w * 0.32);
      canvas.save(); if (ring) canvas.rotate(sin(t * 40) * 12, cx, by);
      sfs.color = 0xFF3A2A1A; sfs.strokeWidth = w * 0.01; canvas.drawLine(cx - w * 0.04, by - w * 0.04, cx - w * 0.06, by, sfs); canvas.drawLine(cx + w * 0.04, by - w * 0.04, cx + w * 0.06, by, sfs);
      sfp.color = 0xFFE53935; canvas.drawCircle(cx - w * 0.045, by - w * 0.15, w * 0.03, sfp); canvas.drawCircle(cx + w * 0.045, by - w * 0.15, w * 0.03, sfp);
      canvas.drawCircle(cx, by - w * 0.08, w * 0.07, sfp);
      sfp.color = 0xFFFFFFFF; canvas.drawCircle(cx, by - w * 0.08, w * 0.055, sfp);
      canvas.drawLine(cx, by - w * 0.08, cx, by - w * 0.12, sfs); canvas.drawLine(cx, by - w * 0.08, cx + w * 0.03, by - w * 0.08, sfs);
      canvas.restore();
      if (ring) sfBurst(canvas, t, 0.3, cx + w * 0.12, by - w * 0.25, w * 0.065, '!!');
      eyesShut = t < 0.9;
      const jump = t > 0.9 && t < 1.3 ? sin((t - 0.9) / 0.4 * PI) * w * 0.07 : 0;
      sfPlayer(canvas, bx - w * 0.15 + (t > 2.0 ? sin(t * 40) * w * 0.004 : 0), by - jump, P, t > 0.9, t > 0.9);
      eyesShut = false;
      sfFlash(canvas, 0xDDEEFF, 150 * cold);
      sfs.strokeWidth = w * 0.006;
      for (let i = 0; i < 40; i++) { const q = (t * 0.9 + hash01(i)) % 1, y = h * 0.62 * hash01(i * 3 + 1); sfs.color = ca(0xFFFFFF, 230 * cold); canvas.drawLine(w * (1.1 - q * 1.3), y, w * (1.1 - q * 1.3) + w * 0.06, y, sfs); }
      break;
    }
    case '7m': {
      const dy = by - w * 0.02, up = sfPeek(t, 4.2);
      sfFall(canvas, t, 40, [0xFFFFFF], w * 0.006, 0.15, 0.01);
      sfBlock(canvas, 7, bx - w * 0.2, by, w * 0.17);
      sfp.color = 0xFF8FA8C8;
      for (let i = 0; i < 5; i++) { const x = bx + w * (-0.02 + i * 0.1), y = by + w * (0.08 + (i % 2) * 0.03); rect.set(x - w * 0.035, y - w * 0.016, x + w * 0.035, y + w * 0.016); canvas.drawOval(rect, sfp); for (let j = 0; j < 3; j++) canvas.drawCircle(x + w * 0.04, y + (j - 1) * w * 0.012, w * 0.007, sfp); }
      canvas.save(); canvas.clipRect(0, 0, w, dy - w * 0.02);
      sfHero(canvas, 'yeti', w * 0.84, dy + (1 - up) * w * 0.25, 1.6);
      canvas.restore();
      sfp.color = 0xFFF4FAFF; rect.set(w * 0.62, dy - w * 0.08, w * 1.08, dy + w * 0.1); canvas.drawOval(rect, sfp);
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, t > 1.5, false, true);
      sfBurst(canvas, t, 1.6, bx - w * 0.42, by - w * 0.34, w * 0.065, '!');
      break;
    }
    case '7z': {
      const cx = w * 0.77, top = by - w * 0.34, shat = t >= 2.0;
      sfFall(canvas, t, 30, [0xFFFFFF], w * 0.006, 0.15, 0.01);
      sfBlock(canvas, 7, bx - w * 0.2, by, w * 0.17); sfBlock(canvas, 7, cx, by, w * 0.17);
      sfHero(canvas, 'yeti', cx, by - (shat ? abs(sin(t * 4)) * w * 0.03 : 0), 1.5, shat ? sin(t * 4) * 6 : 0);
      if (!shat) {
        sfp.color = ca(0xBFE6FF, 200); rect.set(cx - w * 0.15, top, cx + w * 0.15, by + w * 0.01); canvas.drawRoundRect(rect, w * 0.02, w * 0.02, sfp);
        sfs.color = ca(0xFFFFFF, 200); sfs.strokeWidth = w * 0.008; canvas.drawLine(cx - w * 0.11, top + w * 0.04, cx - w * 0.06, top + w * 0.1, sfs);
        const cq = sfq(t, 0.6, 1.3); sfs.strokeWidth = w * 0.006;
        sfPath.reset(); sfPath.moveTo(cx, top); for (let i = 1; i <= 6; i++) sfPath.lineTo(cx + (i % 2 ? 1 : -1) * w * 0.04, top + (by - top) * i / 6 * cq);
        canvas.drawPath(sfPath, sfs);
        if (cq > 0.5) { sfPath.reset(); sfPath.moveTo(cx - w * 0.15, top + w * 0.15); sfPath.lineTo(cx - w * 0.06, top + w * 0.18); sfPath.lineTo(cx, top + w * 0.14); canvas.drawPath(sfPath, sfs); }
      } else {
        const q = sfq(t, 2.0, 1.0);
        for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, d = w * 0.3 * sfOut(q), x = cx + cos(a) * d, y = by - w * 0.15 + sin(a) * d + q * q * w * 0.2; sfPoly(canvas, ca(0xDDF2FF, 255 * (1 - q)), [x, y - w * 0.03, x + w * 0.025, y + w * 0.02, x - w * 0.02, y + w * 0.015]); }
      }
      sfPlayer(canvas, bx - w * 0.2, by - (shat ? bob : 0), P, !shat, false, true);
      sfBurst(canvas, t, 2.0, cx, top - w * 0.02, w * 0.1, '💥', 0xFFBFE6FF);
      break;
    }
    // ---------- 8 : le volcan se réveille ----------
    case '8a': {
      const cx = w * 0.8, ct = h * 0.24, base = by - w * 0.02, er = t >= 2.0;
      sfFlash(canvas, 0xFF4A1A, 90 * sfq(t, 2.0, 1.0));
      sfPoly(canvas, 0xFF3A2A2E, [w * 0.52, base, cx - w * 0.06, ct, cx + w * 0.06, ct, w * 1.08, base]);
      sfPoly(canvas, 0xFF2A1E22, [cx + w * 0.02, ct, cx + w * 0.06, ct, w * 1.08, base, w * 0.9, base]);
      for (let i = 0; i < 4; i++) { const q = (t * 0.35 + i / 4) % 1; if (t < 0.4) break; sfp.color = ca(er ? 0x5A4A4A : 0x9A9AA0, 160 * (1 - q)); canvas.drawCircle(cx + sin(q * 3 + i) * w * 0.05, ct - q * w * 0.35, w * (0.03 + 0.07 * q), sfp); }
      if (er) for (let i = 0; i < 14; i++) { const q = ((t - 2.0) * 0.8 + hash01(i)) % 1, a = -PI / 2 + (hash01(i + 5) - 0.5) * 1.4, v = w * 0.4; sfp.color = ca(0xFF8A2A, 255 * (1 - q)); canvas.drawCircle(cx + cos(a) * v * q, ct + sin(a) * v * q + q * q * w * 0.5, w * 0.012, sfp); }
      sfBlock(canvas, 7, bx - w * 0.15, by, w * 0.22);
      const cq = sfq(t, 1.4, 1.2); sfs.color = 0xFF5A86B0; sfs.strokeWidth = w * 0.006;
      if (cq > 0) { sfPath.reset(); sfPath.moveTo(bx - w * 0.37, by); for (let i = 1; i <= 6; i++) sfPath.lineTo(bx - w * 0.37 + w * 0.44 * cq * i / 6, by + (i % 2 ? w * 0.02 : -w * 0.005)); canvas.drawPath(sfPath, sfs); }
      sfPlayer(canvas, bx - w * 0.15, by - (t < 1.2 ? bob : 0), P, t > 1.2, t > 1.2);
      sfBurst(canvas, t, 2.0, cx, ct - w * 0.08, w * 0.1, '💥', 0xFFFFB347);
      break;
    }
    case '8m': {
      const px = w * 0.76, py = by;
      sfBlock(canvas, 8, bx - w * 0.2, by, w * 0.17);
      sfp.shader = new RadialGradient(px, py, w * 0.2, [0xFFFFB347, ca(0xFF5A1A, 0)], [0.4, 1]); canvas.drawCircle(px, py, w * 0.2, sfp); sfp.shader = null;
      sfp.color = 0xFFFF7A1F; rect.set(px - w * 0.16, py - w * 0.035, px + w * 0.16, py + w * 0.04); canvas.drawOval(rect, sfp);
      sfp.color = 0xFFFFC14A; rect.set(px - w * 0.1, py - w * 0.02, px + w * 0.06, py + w * 0.015); canvas.drawOval(rect, sfp);
      sfHero(canvas, 'pyro', px, py - abs(sin(t * 5)) * w * 0.03, 1.2, sin(t * 5) * 10);
      for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1, dx = (i - 1) * w * 0.12; sfp.color = ca(0xFF8A2A, 255 * (1 - q * 0.5)); canvas.drawCircle(px + dx * q, py - sin(q * PI) * w * 0.25, w * 0.016, sfp); }
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, false, false, true);
      sfBurst(canvas, t, 0.8, bx - w * 0.42, by - w * 0.34, w * 0.065, '?');
      break;
    }
    case '8z': {
      const px = w * 0.76, py = by, rise = sfOut(sfq(t, 0.5, 1.3)), bow = t > 2.2 ? sin(sfq(t, 2.2, 1.0) * PI) * 25 : 0;
      sfFlash(canvas, 0xFF4A1A, 60 * (1 - sfq(t, 0, 2.5)));
      sfs.strokeWidth = w * 0.01;
      for (let i = 0; i < 3; i++) { const q = (t * 0.2 + i / 3) % 1; sfs.color = ca(0xBDB6B0, 150 * (1 - q)); rect.set(px - w * (0.05 + 0.12 * q), py - w * 0.1 - q * h * 0.3, px + w * (0.05 + 0.12 * q), py - w * 0.07 - q * h * 0.3); canvas.drawOval(rect, sfs); }
      sfBlock(canvas, 8, bx - w * 0.2, by, w * 0.17);
      sfp.color = 0xFFFF7A1F; rect.set(px - w * 0.16, py - w * 0.035, px + w * 0.16, py + w * 0.04); canvas.drawOval(rect, sfp);
      canvas.save(); canvas.clipRect(0, 0, w, py);
      canvas.save(); canvas.rotate(-bow, px, py - w * 0.01 + (1 - rise) * w * 0.25);
      sfHero(canvas, 'pyro', px, py - w * 0.01 + (1 - rise) * w * 0.25, 1.3);
      canvas.restore(); canvas.restore();
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, false, false, true);
      break;
    }
    // ---------- 9 : propulsé dans la tour de l'horloge ----------
    case '9a': {
      const wx = w * 0.82, wy = h * 0.16, q = sfInOut(sfq(t, 0.8, 1.2)), sx0 = bx - w * 0.12;
      sfFlash(canvas, 0xFF8A2A, 200 * (1 - sfq(t, 0.8, 0.5)) * (t > 0.8 ? 1 : 0));
      sfp.shader = new LinearGradient(w * 0.72, 0, w * 0.93, 0, 0xFF6E5A48, 0xFF3A2E24); rect.set(w * 0.72, h * 0.04, w * 0.93, by - w * 0.1); canvas.drawRect(rect, sfp); sfp.shader = null;
      sfPoly(canvas, 0xFF4A2E22, [w * 0.69, h * 0.04, w * 0.96, h * 0.04, w * 0.825, h * 0.04 - w * 0.12]);
      sfp.color = t > 2.0 ? 0xFF2A2A3A : 0xFFFFE7A0; canvas.drawCircle(wx, wy, w * 0.055, sfp);
      sfs.color = 0xFFB8873A; sfs.strokeWidth = w * 0.012; canvas.drawCircle(wx, wy, w * 0.055, sfs);
      if (t > 2.0) { sfs.color = 0xFFE0E0E0; sfs.strokeWidth = w * 0.004; for (let i = 0; i < 6; i++) { const a = i * 1.05; canvas.drawLine(wx, wy, wx + cos(a) * w * 0.05, wy + sin(a) * w * 0.05, sfs); } }
      sfBlock(canvas, 8, sx0, by, w * 0.18);
      for (let i = 1; i < 8; i++) { const f = q - i * 0.05; if (f <= 0 || q >= 1.0 && t > 3) continue; const x = sx0 + (wx - sx0) * f, y = by + (wy - by) * f - sin(PI * f) * w * 0.15; sfp.color = ca(0x8A8A90, 120 * (1 - i / 8)); canvas.drawCircle(x, y - w * 0.05, w * (0.03 - i * 0.002), sfp); }
      if (q < 1) { const x = sx0 + (wx - sx0) * q, y = by + (wy - by) * q - sin(PI * q) * w * 0.15; sfPlayer(canvas, x, y, P * (1 - 0.75 * q), t > 0.8, true, true, q * 720); }
      sfBurst(canvas, t, 2.0, wx - w * 0.14, wy + w * 0.08, w * 0.07, '💫');
      sfSparks(canvas, t, 2.0, wx, wy, 12, w * 0.15, 0xE8F6FF, w * 0.01);
      break;
    }
    case '9m': {
      const hx = w * 0.77, ht = by - w * 0.36, ph = t % 3, out = ph > 0.2 && ph < 2.0 ? sfOut(sfq(ph, 0.2, 0.3)) * (1 - sfq(ph, 1.7, 0.3)) : 0;
      drawGear(canvas, w * 0.12, h * 0.18, w * 0.09, t * 0.6, 0xFFB8873A, 12); drawGear(canvas, w * 0.27, h * 0.25, w * 0.06, -t * 0.9, 0xFF8C6A2B, 9);
      sfp.color = 0xFF6B3E1E; rect.set(hx - w * 0.15, ht, hx + w * 0.15, by - w * 0.02); canvas.drawRect(rect, sfp);
      sfPoly(canvas, 0xFF4A2A12, [hx - w * 0.19, ht + w * 0.01, hx + w * 0.19, ht + w * 0.01, hx, ht - w * 0.12]);
      sfp.color = 0xFFFFF6E0; canvas.drawCircle(hx, ht + w * 0.1, w * 0.065, sfp);
      sfs.color = 0xFF3A2A1A; sfs.strokeWidth = w * 0.008; canvas.drawLine(hx, ht + w * 0.1, hx + sin(t * 2) * w * 0.05, ht + w * 0.1 - cos(t * 2) * w * 0.05, sfs); canvas.drawLine(hx, ht + w * 0.1, hx + w * 0.03, ht + w * 0.1, sfs);
      sfp.color = 0xFF2A1A0A; rect.set(hx - w * 0.05, ht + w * 0.19, hx + w * 0.05, ht + w * 0.3); canvas.drawRect(rect, sfp);
      if (out > 0) sfHero(canvas, 'chronos', hx, ht + w * 0.3 + w * 0.02 * out, 0.4 + 0.5 * out);
      sfp.color = 0xFF8C5A2E; rect.set(hx - w * 0.05, ht + w * 0.19, hx - w * 0.05 + w * 0.1 * (1 - out * 0.85), ht + w * 0.3); canvas.drawRect(rect, sfp);
      sfBlock(canvas, 9, bx - w * 0.22, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.22, by - bob, P, false, false, true);
      if (out > 0.5) sfBurst(canvas, ph, 0.3, hx - w * 0.2, ht + w * 0.05, w * 0.06, '♪');
      break;
    }
    case '9z': {
      const pvx = bx, pvy = h * 0.1, a = sin(t * 3) * 25;
      const ring = ((t * 3 / PI) + 0.5) % 1;
      sfs.strokeWidth = w * 0.01;
      for (let i = 0; i < 2; i++) { const q = (ring + i * 0.5) % 1; sfs.color = ca(0xFFE7A0, 200 * (1 - q)); rect.set(pvx - w * (0.15 + 0.35 * q), pvy + w * 0.05 - w * 0.2 * q, pvx + w * (0.15 + 0.35 * q), pvy + w * 0.25 + w * 0.2 * q); canvas.drawArc(rect, 200, 140, false, sfs); }
      sfs.color = 0xFF5E4418; sfs.strokeWidth = w * 0.02; canvas.drawLine(pvx - w * 0.2, pvy, pvx + w * 0.2, pvy, sfs);
      canvas.save(); canvas.rotate(a, pvx, pvy);
      sfp.color = 0xFF8C6A2B; canvas.drawCircle(pvx, pvy + w * 0.2, w * 0.03, sfp);
      sfp.shader = new LinearGradient(pvx - w * 0.12, 0, pvx + w * 0.12, 0, [0xFFB8862E, 0xFFFFE07A, 0xFFB8862E], [0, 0.4, 1]);
      sfPath.reset(); sfPath.moveTo(pvx - w * 0.13, pvy + w * 0.18); sfPath.cubicTo(pvx - w * 0.1, pvy + w * 0.02, pvx - w * 0.06, pvy, pvx, pvy); sfPath.cubicTo(pvx + w * 0.06, pvy, pvx + w * 0.1, pvy + w * 0.02, pvx + w * 0.13, pvy + w * 0.18); sfPath.close();
      canvas.drawPath(sfPath, sfp); sfp.shader = null;
      sfp.color = 0xFF9C7420; rect.set(pvx - w * 0.14, pvy + w * 0.16, pvx + w * 0.14, pvy + w * 0.2); canvas.drawRoundRect(rect, w * 0.02, w * 0.02, sfp);
      canvas.restore();
      sfBlock(canvas, 9, bx, by, w * 0.2);
      sfPlayer(canvas, bx, by - abs(sin(t * 5)) * w * 0.04, P, false, true);
      sfBurst(canvas, t, 0.4, bx + w * 0.3, h * 0.28, w * 0.07, '🔔');
      break;
    }
    // ---------- 10 : rapetissé par le rayon ----------
    case '10a': {
      const gx = w * 0.8, gy = by - w * 0.14, shrink = sfInOut(sfq(t, 1.9, 0.7)), beam = t > 1.6 && t < 2.4;
      sfs.color = 0xFF5E4418; sfs.strokeWidth = w * 0.02; canvas.drawLine(gx, gy, gx, by + w * 0.02, sfs); canvas.drawLine(gx - w * 0.06, by + w * 0.02, gx + w * 0.06, by + w * 0.02, sfs);
      sfp.color = 0xFF8C6A9E; rect.set(gx - w * 0.08, gy - w * 0.07, gx + w * 0.1, gy + w * 0.05); canvas.drawRoundRect(rect, w * 0.02, w * 0.02, sfp);
      sfPoly(canvas, 0xFF5E4A6E, [gx - w * 0.08, gy - w * 0.04, gx - w * 0.17, gy - w * 0.02, gx - w * 0.17, gy + w * 0.0, gx - w * 0.08, gy + w * 0.02]);
      sfp.color = (Math.floor(t * 4) % 2) ? 0xFFFF5252 : 0xFF5CF2E6; canvas.drawCircle(gx + w * 0.05, gy - w * 0.01, w * 0.015, sfp);
      if (t < 1.6) for (let i = 0; i < 2; i++) sfBolt(canvas, gx - w * 0.08 + i * w * 0.16, gy - w * 0.07, gx + (hash01(Math.floor(t * 10) + i) - 0.5) * w * 0.2, gy - w * 0.16, Math.floor(t * 10) * 7 + i, 0xFFF59D, w * 0.006);
      const px0 = bx - w * 0.15, py = by - w * 0.08 * (1 - shrink * 0.6);
      sfBlock(canvas, 9, px0, by, w * 0.18);
      if (beam) { sfs.color = (Math.floor(t * 12) % 2) ? 0xFFFFE07A : 0xFFB57BFF; sfs.strokeWidth = w * 0.03; canvas.drawLine(gx - w * 0.17, gy - w * 0.01, px0, py, sfs); sfs.color = 0xFFFFFFFF; sfs.strokeWidth = w * 0.01; canvas.drawLine(gx - w * 0.17, gy - w * 0.01, px0, py, sfs); }
      sfPlayer(canvas, px0 - w * 0.04, by, P * (1 - 0.65 * shrink), t > 1.0, true);
      drawBulpa(canvas, px0 + w * 0.1, by, w * 0.11 * (1 - 0.65 * shrink), t <= 1.0);
      sfBurst(canvas, t, 1.0, gx, gy - w * 0.2, w * 0.065, '⚡');
      sfSparks(canvas, t, 2.0, px0, py, 12, w * 0.15, 0xFFE07A, w * 0.01);
      break;
    }
    case '10m': {
      const q = (t / 6) % 1, x = w * 1.2 - q * w * 1.5, dr = w * 0.075;
      sfBlock(canvas, 10, bx - w * 0.22, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.22, by - bob, P, true, false, true);
      sfCarnivore(canvas, w * 0.66, by, t);
      sfHero(canvas, 'atlas', x + w * 0.15, by + w * 0.04, 1.2);
      sfp.color = ca(0xBFEAFF, 200); canvas.drawCircle(x, by + w * 0.04 - dr, dr, sfp);
      sfs.color = ca(0xFFFFFF, 220); sfs.strokeWidth = w * 0.008; rect.set(x - dr * 0.7, by + w * 0.04 - dr * 1.7, x + dr * 0.7, by + w * 0.04 - dr * 0.3); canvas.drawArc(rect, 200 - t * 120, 60, false, sfs);
      sfp.color = 0xFFFFFFFF; canvas.drawCircle(x - dr * 0.35, by + w * 0.04 - dr * 1.4, dr * 0.15, sfp);
      break;
    }
    case '10z': {
      const lx = w * 0.72, ly = by + w * 0.02, lift = sfInOut(sfq(t, 0.6, 1.4));
      sfp.shader = new RadialGradient(w * 0.84, by - w * 0.12, w * 0.3, [ca(0xFFFFE0, 255 * lift), ca(0xFFF6A0, 0)], [0.2, 1]); canvas.drawCircle(w * 0.84, by - w * 0.12, w * 0.3, sfp); sfp.shader = null;
      sfHero(canvas, 'atlas', w * 0.8, by + w * 0.01, 1.2);
      canvas.save(); canvas.rotate(-10 - 65 * lift, lx, ly);
      sfp.color = 0xFF4E9A32; sfPath.reset(); sfPath.moveTo(lx, ly); sfPath.cubicTo(lx + w * 0.1, ly - w * 0.18, lx + w * 0.38, ly - w * 0.16, lx + w * 0.46, ly - w * 0.02); sfPath.cubicTo(lx + w * 0.36, ly + w * 0.06, lx + w * 0.1, ly + w * 0.06, lx, ly); canvas.drawPath(sfPath, sfp);
      sfs.color = 0xFF7CC94A; sfs.strokeWidth = w * 0.008; canvas.drawLine(lx, ly, lx + w * 0.44, ly - w * 0.03, sfs);
      canvas.restore();
      sfBlock(canvas, 10, bx - w * 0.2, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.24, by - (lift >= 1 ? bob : 0), P, false, false, true);
      drawBulpa(canvas, bx - w * 0.08, by - abs(sin(t * 4 + 1)) * w * 0.03, w * 0.11);
      sfBurst(canvas, t, 2.0, w * 0.84, by - w * 0.3, w * 0.065, '✨', 0xFFFFF3A0);
      break;
    }
    // ---------- 11 : aspiré dans la borne d'arcade ----------
    case '11a': {
      const sx = w * 0.78, sy = by - w * 0.22, walk = sfInOut(sfq(t, 0, 1.2)), x = bx - w * 0.25 + (sx - w * 0.12 - bx + w * 0.25) * walk;
      sfBlock(canvas, 10, bx, by, w * 0.42);
      sfp.color = 0xFF8A5A34; rect.set(sx - w * 0.015, sy, sx + w * 0.015, by); canvas.drawRect(rect, sfp);
      sfp.color = 0xFFF2F2EC; rect.set(sx - w * 0.09, sy - w * 0.12, sx + w * 0.09, sy + w * 0.03); canvas.drawRoundRect(rect, w * 0.03, w * 0.03, sfp);
      sfp.color = 0xFF3A3A3A; rect.set(sx - w * 0.04, sy - w * 0.07, sx - w * 0.02, sy - w * 0.02); canvas.drawRoundRect(rect, w * 0.01, w * 0.01, sfp); rect.set(sx + w * 0.02, sy - w * 0.07, sx + w * 0.04, sy - w * 0.02); canvas.drawRoundRect(rect, w * 0.01, w * 0.01, sfp);
      if (t < 1.8) sfPlayer(canvas, x, by - (walk < 1 ? abs(sin(t * 10)) * w * 0.02 : 0), P * 0.6, t > 1.2, false, true);
      if (t > 1.2 && t < 1.9) for (let i = 0; i < 3; i++) sfBolt(canvas, x, by - w * 0.1, x + cos(i * 2.1 + t * 9) * w * 0.12, by - w * 0.1 + sin(i * 2.1 + t * 9) * w * 0.12, Math.floor(t * 14) * 3 + i, 0xFFF59D, w * 0.006);
      sfFlash(canvas, 0xFFFFFF, 160 * (1 - sfq(t, 1.2, 0.4)) * (t > 1.2 ? 1 : 0));
      if (t > 1.8) {
        const q = sfq(t, 1.8, 1.0), cols = [0xFF00E5FF, 0xFFFF4FD8, 0xFFFFE066, 0xFF7CFF4F];
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * PI * 2 + q * 4, d = w * 0.12 * sin(q * PI) + w * 0.01, tx = x + (sx - x) * q, ty = by - w * 0.08 + (sy - w * 0.045 - by + w * 0.08) * q, s = w * 0.018 * (1 - q * 0.7);
          sfp.color = cols[i % 4]; rect.set(tx + cos(a) * d - s, ty + sin(a) * d - s, tx + cos(a) * d + s, ty + sin(a) * d + s); canvas.drawRect(rect, sfp);
        }
      }
      sfBurst(canvas, t, 1.2, sx - w * 0.2, sy - w * 0.18, w * 0.065, '⚡');
      break;
    }
    case '11m': {
      const sy = h * 0.15 + (h * 0.62 - h * 0.15) * (0.5 - 0.5 * cos(t * PI / 1.5));
      sfBlock(canvas, 11, bx - w * 0.2, by, w * 0.17); sfBlock(canvas, 11, w * 0.77, by, w * 0.15);
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, abs(sy - by + w * 0.1) < w * 0.12, false, true);
      sfHero(canvas, 'pixel', w * 0.77, by - bob, 1.4, sin(t * 4) * 8);
      sfp.shader = new LinearGradient(0, sy - w * 0.06, 0, sy + w * 0.06, [ca(0x00E5FF, 0), ca(0x00E5FF, 110), ca(0x00E5FF, 0)], [0, 0.5, 1]); canvas.drawRect(0, sy - w * 0.06, w, sy + w * 0.06, sfp); sfp.shader = null;
      sfs.color = 0xFF7FF6FF; sfs.strokeWidth = w * 0.006; canvas.drawLine(0, sy, w, sy, sfs);
      if (Math.floor(t * 2) % 2 === 0) sfBurst(canvas, 1, 0, w * 0.15, h * 0.17, w * 0.06, '⚠', 0xFFFF4F4F);
      break;
    }
    case '11z': {
      const v = Math.floor(sfOut(sfq(t, 0, 2.0)) * 987650), s = String(v).padStart(6, '0'), on = t < 2 || Math.floor(t * 4) % 2 === 0;
      sfFireworks(canvas, t, 0.3, 0.6, [0x00E5FF, 0xFF4FD8, 0xFFE066, 0x7CFF4F]);
      sfText.textSize = w * 0.14;
      sfText.color = 0xFFFF4FD8; canvas.drawText(s, bx + w * 0.008, h * 0.27 + w * 0.008, sfText);
      sfText.color = on ? 0xFF7FF6FF : 0xFFFFFFFF; canvas.drawText(s, bx, h * 0.27, sfText);
      sfBlock(canvas, 11, bx, by, w * 0.2);
      sfPlayer(canvas, bx, by - abs(sin(t * 5)) * w * 0.04, P, false, true);
      sfBurst(canvas, t, 2.0, bx + w * 0.3, by - w * 0.3, w * 0.07, '★');
      break;
    }
    // ---------- 12 : téléporté dans la pyramide ----------
    case '12a': {
      const before = t < 2.2, glitch = t > 0.4 && t < 2.4;
      if (before) {
        sfBlock(canvas, 11, bx, by, w * 0.2);
        const vis = t < 0.5 || hash01(Math.floor(t * 16) + 3) > 0.35;
        if (vis) sfPlayer(canvas, bx + (glitch ? (hash01(Math.floor(t * 20)) - 0.5) * w * 0.05 : 0), by, P, t > 0.5, true);
      } else {
        const f = sfq(t, 2.2, 0.5);
        sfBlock(canvas, 12, bx, by, w * 0.2);
        sfPlayer(canvas, bx, h * 0.08 + (by - h * 0.08) * f * f, P, f < 1, true);
        sfSparks(canvas, t, 2.7, bx, by, 14, w * 0.2, 0xE6C68A, w * 0.014);
      }
      if (glitch) {
        const n = Math.floor(t * 14), cols = [0x00E5FF, 0xFF4FD8, 0xFFFFFF];
        for (let i = 0; i < 6; i++) { const y = h * 0.65 * hash01(n * 6 + i), hh = w * (0.01 + 0.04 * hash01(n * 6 + i + 50)); sfp.color = ca(cols[i % 3], 110); canvas.drawRect(0, y, w, y + hh, sfp); }
      }
      sfFlash(canvas, 0xFFFFFF, 220 * (1 - sfq(t, 2.2, 0.4)) * (before ? 0 : 1));
      sfBurst(canvas, t, 0.6, bx + w * 0.28, by - w * 0.34, w * 0.07, '⚠', 0xFFFF6B6B);
      if (t > 2.2) sfBurst(canvas, t, 2.7, bx - w * 0.3, by - w * 0.3, w * 0.065, '?!');
      break;
    }
    case '12m': {
      const sx = w * 0.78, lid = sfPeek(t, 3.6) * w * 0.07;
      for (const tx of [w * 0.06, w * 0.5]) { sfp.color = 0xFF5E4418; rect.set(tx - w * 0.008, h * 0.25, tx + w * 0.008, h * 0.32); canvas.drawRect(rect, sfp); sfp.color = ca(0xFF9A3C, 230); canvas.drawCircle(tx, h * 0.25 - w * 0.02 + sin(t * 9 + tx) * w * 0.004, w * 0.02, sfp); sfp.color = 0xFFFFE07A; canvas.drawCircle(tx, h * 0.25 - w * 0.015, w * 0.01, sfp); }
      sfBlock(canvas, 12, bx - w * 0.2, by, w * 0.17);
      sfSarcophagus(canvas, sx, by + w * 0.01, w * 0.2, () => sfHero(canvas, 'ramses', sx, by, 1.2, sin(t * 6) * 6), lid);
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, false, false, true);
      sfBurst(canvas, t, 1.0, bx - w * 0.42, by - w * 0.34, w * 0.065, '?!');
      break;
    }
    case '12z': {
      const wl = w * 0.62, wt = h * 0.18, open = sfInOut(sfq(t, 0.5, 1.5));
      sfp.color = 0xFFB8925A; rect.set(wl, wt, w, by + w * 0.02); canvas.drawRect(rect, sfp);
      sfs.color = 0xFF8A6A3A; sfs.strokeWidth = w * 0.005;
      for (let j = 0; j < 6; j++) { const y = wt + (by - wt) * j / 6; canvas.drawLine(wl, y, w, y, sfs); }
      sfp.shader = new LinearGradient(0, wt, 0, by, 0xFFFFFFF0, 0xFFFFE6A0); rect.set(w * 0.7, wt + w * 0.05, w * 0.92, by + w * 0.02); canvas.drawRect(rect, sfp); sfp.shader = null;
      sfPoly(canvas, ca(0xFFF3C0, 90 * open), [w * 0.7, by - w * 0.15, w * 0.7, by + w * 0.02, w * 0.1, by + w * 0.1, w * 0.25, by - w * 0.05]);
      for (let i = 0; i < 8; i++) { sfp.color = ca(0xFFFFFF, open * (100 + 100 * sin(t * 2 + i))); canvas.drawCircle(w * (0.3 + 0.4 * hash01(i + 2)) + sin(t + i) * w * 0.02, by - w * (0.02 + 0.12 * hash01(i + 9)), w * 0.005, sfp); }
      canvas.save(); canvas.clipRect(wl, wt, w, by + w * 0.02);
      sfp.color = 0xFFC8A06A; rect.set(w * 0.7, wt + w * 0.05 - open * (by - wt), w * 0.92, by + w * 0.02 - open * (by - wt)); canvas.drawRect(rect, sfp);
      canvas.restore();
      sfBlock(canvas, 12, bx - w * 0.2, by, w * 0.17);
      sfPlayer(canvas, bx - w * 0.2, by - (open >= 1 ? bob : 0), P, false, false, true);
      sfBurst(canvas, t, 2.0, w * 0.81, wt - w * 0.02, w * 0.065, '✨', 0xFFFFF3A0);
      break;
    }
    // ---------- 13 : la malédiction de la momie ----------
    case '13a': {
      const sx = w * 0.78, open = sfInOut(sfq(t, 0.6, 0.6)), night = sfq(t, 1.2, 2.0), moon = sfOut(sfq(t, 2.0, 1.5));
      sfFlash(canvas, 0x140A28, 170 * night);
      if (moon > 0) { const my = h * 0.3 - h * 0.16 * moon; sfp.shader = new RadialGradient(w * 0.2, my, w * 0.16, [ca(0xFFF6D0, 160), ca(0xFFF6D0, 0)], [0.4, 1]); canvas.drawCircle(w * 0.2, my, w * 0.16, sfp); sfp.shader = null; sfp.color = 0xFFFFF6D8; canvas.drawCircle(w * 0.2, my, w * 0.07, sfp); }
      sfBlock(canvas, 12, bx - w * 0.2, by, w * 0.17);
      sfSarcophagus(canvas, sx, by + w * 0.01, w * 0.2, null, 0, -70 * open);
      for (let i = 0; i < 6; i++) { const q = ((t - 1.0) * 0.3 + i / 6) % 1; if (t < 1.0) break; sfp.color = ca(0x9A5AE0, 120 * (1 - q)); canvas.drawCircle(sx - q * w * 0.5 + sin(i + t) * w * 0.03, by - w * 0.15 - q * w * 0.3, w * (0.04 + 0.08 * q), sfp); }
      sfPlayer(canvas, bx - w * 0.2, by - (t < 1 ? bob : 0), P, t > 1.0, t > 1.0);
      sfBurst(canvas, t, 1.1, bx - w * 0.42, by - w * 0.34, w * 0.065, '!!');
      break;
    }
    case '13m': {
      const out = t > 1.0, dark = sfq(t, 1.0, 0.4), gq = sfInOut(sfq(t, 1.2, 2.0));
      for (let i = 0; i < 3; i++) {
        const x = w * (0.07 + i * 0.07), y = by - w * 0.04 - (i === 1 ? w * 0.03 : 0);
        sfp.color = 0xFFEDE3C8; rect.set(x - w * 0.015, y - w * 0.08, x + w * 0.015, y); canvas.drawRect(rect, sfp);
        if (!out) { sfp.color = ca(0xFFC14A, 230); rect.set(x - w * 0.01, y - w * 0.12 + sin(t * 9 + i) * w * 0.003, x + w * 0.01, y - w * 0.08); canvas.drawOval(rect, sfp); }
        else { const q = ((t - 1) * 0.5 + i / 3) % 1; sfp.color = ca(0xBBBBBB, 120 * (1 - q)); canvas.drawCircle(x + sin(q * 5) * w * 0.01, y - w * 0.1 - q * w * 0.12, w * (0.008 + 0.012 * q), sfp); }
      }
      sfFlash(canvas, 0x0A0614, 120 * dark);
      sfBlock(canvas, 13, bx - w * 0.05, by, w * 0.18);
      sfPlayer(canvas, bx - w * 0.1, by - (out ? 0 : bob), P, out, out, true);
      // Ramsès, mort de peur, en perd ses bandelettes
      sfHero(canvas, 'ramses', bx + w * 0.09 + (out ? sin(t * 45) * w * 0.005 : 0), by, 1.05);
      if (out) for (let i = 0; i < 2; i++) {
        const q = ((t - 1) * 0.7 + i * 0.5) % 1, bx0 = bx + w * 0.09 + q * w * (i === 0 ? -0.1 : 0.12), by0 = by - w * 0.14 - q * w * 0.1;
        sfs.color = ca(0xEDE3C8, 230 * (1 - q)); sfs.strokeWidth = w * 0.008;
        canvas.drawLine(bx0 - w * 0.02, by0, bx0 + w * 0.02, by0 + w * 0.012 * sin(t * 9 + i), sfs);
      }
      if (t > 1.2) sfHero(canvas, 'casperon', -w * 0.15 + (w * 0.9) * gq, by - w * 0.12 + sin(t * 2) * w * 0.03, 1.3);
      sfBurst(canvas, t, 1.8, w * 0.75, by - w * 0.42, w * 0.07, '👻', 0xFFE8E8FF);
      break;
    }
    case '13z': {
      const gx = w * 0.7, gw = w * 0.2, gt = by - w * 0.36, open = sfInOut(sfq(t, 0.5, 1.5));
      sfp.shader = new RadialGradient(w * 0.82, h * 0.12, w * 0.18, [ca(0xFFF6D0, 160), ca(0xFFF6D0, 0)], [0.4, 1]); canvas.drawCircle(w * 0.82, h * 0.12, w * 0.18, sfp); sfp.shader = null;
      sfp.color = 0xFFFFF6D8; canvas.drawCircle(w * 0.82, h * 0.12, w * 0.07, sfp);
      sfp.color = ca(0xC9D0FF, 70 * open); rect.set(gx - gw, gt, gx + gw, by + w * 0.02); canvas.drawRect(rect, sfp);
      for (const side of [-1, 1]) {
        canvas.save(); canvas.scale(1 - 0.82 * open, 1, gx + side * gw, 0);
        sfs.color = 0xFF16121C; sfs.strokeWidth = w * 0.012;
        for (let i = 0; i <= 5; i++) { const x = gx + side * gw * i / 5; canvas.drawLine(x, gt, x, by + w * 0.02, sfs); sfPoly(canvas, 0xFF16121C, [x - w * 0.012, gt, x + w * 0.012, gt, x, gt - w * 0.03]); }
        canvas.drawLine(gx, gt + w * 0.05, gx + side * gw, gt + w * 0.05, sfs); canvas.drawLine(gx, by - w * 0.05, gx + side * gw, by - w * 0.05, sfs);
        canvas.restore();
      }
      for (let i = 0; i < 6; i++) {
        const q = sfq(t, 1.0 + i * 0.25, 2.0); if (q <= 0 || q >= 1) continue;
        const x = gx + (w * 0.82 - gx) * q + sin(q * 9 + i) * w * 0.04, y = by - w * 0.15 + (h * 0.12 - by + w * 0.15) * q, f = sin(t * 18 + i) * w * 0.02, s = w * 0.03 * (1 - q * 0.5);
        sfPoly(canvas, 0xFF0E0A14, [x, y, x - s * 1.6, y - s * 0.4 - f, x - s * 0.7, y + s * 0.2, x, y + s * 0.4, x + s * 0.7, y + s * 0.2, x + s * 1.6, y - s * 0.4 - f]);
      }
      sfHero(canvas, 'casperon', w * 0.42, by - w * 0.1 + sin(t * 2) * w * 0.03, 1.2, sin(t * 5) * 8);
      sfBlock(canvas, 13, w * 0.2, by, w * 0.15);
      sfHero(canvas, 'ramses', w * 0.11, by - (open >= 1 ? abs(sin(t * 4 + 1)) * w * 0.02 : 0), 1.0, 0, true);
      sfPlayer(canvas, w * 0.25, by - (open >= 1 ? bob : 0), P, false, false, true);
      break;
    }
    // ---------- 14 : un accord contre les fantômes ----------
    case '14a': {
      const cx = bx - w * 0.05, cy = by - w * 0.16, blow = sfq(t, 2.0, 1.0), rock = t > 1.4;
      sfBlock(canvas, 13, cx, by, w * 0.2);
      for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.09, r = w * 0.27 * (1 + 2.5 * blow); sfGhost(canvas, cx + cos(a) * r, cy + sin(a) * r * 0.55, w * 0.055, 1 - blow); }
      sfPlayer(canvas, cx, by - (rock ? abs(sin(t * 5)) * w * 0.02 : 0), P, !rock, true);
      if (rock) sfGuitar(canvas, cx - w * 0.06, by - w * 0.07, w * 0.13 * sfOut(sfq(t, 1.4, 0.3)), -25);
      if (t > 2.0) { sfs.strokeWidth = w * 0.01; for (let i = 0; i < 3; i++) { const q = ((t - 2.0) * 0.9 + i / 3) % 1; sfs.color = ca(0xFFE07A, 200 * (1 - q)); canvas.drawCircle(cx, cy, w * (0.08 + 0.5 * q), sfs); } }
      sfText.color = 0xFFFFE07A;
      for (let i = 0; i < 4; i++) { if (t < 2.0) break; const q = ((t - 2.0) * 0.5 + i / 4) % 1; sfText.textSize = w * 0.07; sfText.alpha = Math.round(255 * sin(q * PI)); canvas.drawText(i % 2 ? '♪' : '♫', cx + w * (i - 1.5) * 0.15, cy - q * w * 0.3, sfText); }
      sfText.alpha = 255;
      sfBurst(canvas, t, 2.0, cx + w * 0.3, by - w * 0.36, w * 0.075, '🎸');
      break;
    }
    case '14m': {
      for (let i = 0; i < 3; i++) sfBeamLight(canvas, w * (0.2 + i * 0.3), 0, 180 + sin(t * 0.9 + i * 2) * 25, h * 0.7, 6, [0xFF4FA0, 0x4FD0FF, 0xFFE066][i], 60);
      sfBlock(canvas, 14, bx - w * 0.22, by - w * 0.04, w * 0.16);
      sfPlayer(canvas, bx - w * 0.22, by - w * 0.04 - bob, P * 0.9, false, true);
      const dx = bx + sin(t * 0.9) * w * 0.32, dy = by + w * 0.1 - abs(sin(t * 3)) * w * 0.02;
      sfHero(canvas, 'decibel', dx, dy, 1.1, -75 + sin(t * 3) * 10);
      sfCrowd(canvas, t, by + w * 0.13, true);
      break;
    }
    case '14z': {
      for (const fx of [w * 0.1, w * 0.9]) {
        const ph = (t * 0.9 + (fx > bx ? 0.5 : 0)) % 1, hgt = w * 0.4 * sin(ph * PI);
        sfp.shader = new LinearGradient(0, by - hgt, 0, by, 0xFFFFF3A0, 0xFFFF3D00);
        sfPath.reset(); sfPath.moveTo(fx - w * 0.05, by); sfPath.quadTo(fx - w * 0.06, by - hgt * 0.5, fx + sin(t * 9) * w * 0.01, by - hgt); sfPath.quadTo(fx + w * 0.06, by - hgt * 0.5, fx + w * 0.05, by); sfPath.close();
        canvas.drawPath(sfPath, sfp); sfp.shader = null;
      }
      sfFall(canvas, t, 30, [0xFF2F7A, 0x2FD0FF, 0xFFD23F, 0x7AFF5A], w * 0.012, 0.3, 0.02, 2);
      sfBlock(canvas, 14, bx, by, w * 0.2);
      const j = abs(sin(t * 4)) * w * 0.05;
      sfPlayer(canvas, bx, by - j, P, false, true, true, sin(t * 4) * 8);
      sfGuitar(canvas, bx - w * 0.06, by - j - w * 0.07, w * 0.13, -25 + sin(t * 4) * 10);
      sfCrowd(canvas, t, by + w * 0.14, false);
      sfBurst(canvas, t, 0.5, bx + w * 0.3, by - w * 0.38, w * 0.075, '🤘');
      break;
    }
    // ---------- 15 : le dojo des nuages ----------
    case '15a': {
      // Ton dernier accord (fin du ch. 14) : l'onde de choc t'envoie au-dessus des nuages, jusqu'au temple
      const before = t < 1.6;
      if (before) {
        const launch = sfq(t, 1.0, 0.6);
        sfBlock(canvas, 14, bx, by, w * 0.2);
        if (t > 0.3) { sfs.strokeWidth = w * 0.012; for (let i = 0; i < 3; i++) { const q = ((t - 0.3) * 1.2 + i / 3) % 1; sfs.color = ca(0xFFE07A, 220 * (1 - q)); canvas.drawCircle(bx, by - w * 0.12, w * (0.08 + 0.6 * q), sfs); } }
        const py = by - launch * launch * h * 0.6;
        sfPlayer(canvas, bx, py - (launch === 0 ? abs(sin(t * 6)) * w * 0.02 : 0), P, false, true, true, launch * 540);
        if (launch === 0) sfGuitar(canvas, bx - w * 0.06, py - w * 0.07, w * 0.13, -25 + sin(t * 6) * 10);
        sfBurst(canvas, t, 0.3, bx + w * 0.3, by - w * 0.36, w * 0.075, '🎸');
      } else {
        const f = sfq(t, 1.6, 0.7);
        sfFall(canvas, t, 16, [0xFFC1D6, 0xFF9FBF], w * 0.012, 0.12, 0.03, 1);
        sfBlock(canvas, 15, bx, by, w * 0.2);
        sfPlayer(canvas, bx, h * 0.05 + (by - h * 0.05) * f * f - (f >= 1 ? bob : 0), P, false, true, true, (1 - f) * 360);
        sfSparks(canvas, t, 2.3, bx, by, 12, w * 0.2, 0xFFF3A0, w * 0.012);
        sfBurst(canvas, t, 2.4, bx - w * 0.3, by - w * 0.3, w * 0.065, '?!');
      }
      sfFlash(canvas, 0xFFFFFF, before ? 0 : 200 * (1 - sfq(t, 1.6, 0.4)));
      break;
    }
    case '15m': {
      const poles = [[0.6, 0.12], [0.75, 0.22], [0.9, 0.15]];
      sfFall(canvas, t, 14, [0xFFC1D6, 0xFF9FBF], w * 0.012, 0.12, 0.03, 1);
      for (const [u, hh] of poles) { const x = w * u; sfp.color = 0xFF6FA040; rect.set(x - w * 0.018, by - w * hh, x + w * 0.018, by + w * 0.06); canvas.drawRect(rect, sfp); sfs.color = 0xFF4E7A2A; sfs.strokeWidth = w * 0.006; for (let y = by - w * hh + w * 0.05; y < by + w * 0.05; y += w * 0.06) canvas.drawLine(x - w * 0.018, y, x + w * 0.018, y, sfs); }
      const n = Math.floor(t / 1.1), seq = [0, 1, 2, 1], a = poles[seq[n % 4]], b = poles[seq[(n + 1) % 4]], q = sfInOut((t % 1.1) / 1.1);
      const x = w * (a[0] + (b[0] - a[0]) * q), y = by - w * (a[1] + (b[1] - a[1]) * q) - sin(q * PI) * w * 0.12;
      sfHero(canvas, 'shinobi', x, y, 1.0, q * 360);
      sfBlock(canvas, 15, bx - w * 0.22, by, w * 0.16);
      eyesShut = true;
      sfPlayer(canvas, bx - w * 0.22, by - w * 0.03 - sin(t * 1.5) * w * 0.012, P, false, true);
      eyesShut = false;
      break;
    }
    case '15z': {
      const gx = w * 0.82, gy = by - w * 0.2, hit = t >= 0.6, belt = sfOut(sfq(t, 1.0, 1.0)), wob = hit ? sin((t - 0.6) * 30) * w * 0.006 * Math.max(0, 1 - (t - 0.6) / 1.5) : 0;
      sfFall(canvas, t, 14, [0xFFC1D6, 0xFF9FBF], w * 0.012, 0.12, 0.03, 1);
      sfs.color = 0xFF8A1E1E; sfs.strokeWidth = w * 0.018; canvas.drawLine(gx - w * 0.11, gy - w * 0.14, gx - w * 0.11, by + w * 0.02, sfs); canvas.drawLine(gx + w * 0.11, gy - w * 0.14, gx + w * 0.11, by + w * 0.02, sfs); canvas.drawLine(gx - w * 0.14, gy - w * 0.13, gx + w * 0.14, gy - w * 0.13, sfs);
      sfp.shader = new RadialGradient(gx - w * 0.02, gy - w * 0.02, w * 0.1, [0xFFFFD27A, 0xFFB8862E, 0xFF7A5418], [0, 0.6, 1]); canvas.drawCircle(gx + wob, gy, w * 0.085, sfp); sfp.shader = null;
      if (hit) { sfs.strokeWidth = w * 0.008; for (let i = 0; i < 2; i++) { const q = ((t - 0.6) * 0.8 + i / 2) % 1; sfs.color = ca(0xFFE07A, 180 * (1 - q)); canvas.drawCircle(gx, gy, w * (0.09 + 0.3 * q), sfs); } }
      sfBlock(canvas, 15, bx - w * 0.15, by, w * 0.2);
      const px = bx - w * 0.15;
      sfPlayer(canvas, px, by - (belt >= 1 ? bob : 0), P, false, true);
      const wy = h * 0.05 + (by - w * 0.06 - (belt >= 1 ? bob : 0) - h * 0.05) * belt;
      sfp.color = 0xFF1B1B1B; rect.set(px - w * 0.09, wy - w * 0.012, px + w * 0.09, wy + w * 0.012); canvas.drawRoundRect(rect, w * 0.01, w * 0.01, sfp);
      sfs.color = 0xFF1B1B1B; sfs.strokeWidth = w * 0.012; canvas.drawLine(px + w * 0.02, wy, px + w * 0.035, wy + w * 0.05, sfs); canvas.drawLine(px + w * 0.02, wy, px + w * 0.005, wy + w * 0.05, sfs);
      sfBurst(canvas, t, 2.0, px - w * 0.28, by - w * 0.36, w * 0.065, '★');
      break;
    }
    // ---------- 16 : l'usine de gourmandises ----------
    case '16a': {
      const fq = sfOut(sfq(t, 0, 1.6)), tx = -w * 0.1 + (bx + w * 0.16 + w * 0.1) * fq, ty = h * 0.25 + (by - w * 0.22 - h * 0.25) * fq + sin(t * 4) * w * 0.02, rot = sin(t * 5) * 30 * (1 - fq) + sin(t * 2) * 5;
      sfFireworks(canvas, t, 1.8, 0.7, [0xFF5C9A, 0x6FD3FF, 0xFFE066, 0xB57BFF]);
      sfBlock(canvas, 15, bx - w * 0.15, by, w * 0.2);
      sfPlayer(canvas, bx - w * 0.15, by - bob, P, false, true);
      if (fq >= 1) { sfp.shader = new RadialGradient(tx, ty, w * 0.15, [ca(0xFFE07A, 120), ca(0xFFE07A, 0)], [0.3, 1]); canvas.drawCircle(tx, ty, w * 0.15, sfp); sfp.shader = null; }
      canvas.save(); canvas.rotate(rot, tx, ty);
      sfp.shader = new LinearGradient(tx - w * 0.08, 0, tx + w * 0.08, 0, [0xFFC9962E, 0xFFFFE07A, 0xFFC9962E], [0, 0.5, 1]); rect.set(tx - w * 0.08, ty - w * 0.045, tx + w * 0.08, ty + w * 0.045); canvas.drawRoundRect(rect, w * 0.01, w * 0.01, sfp); sfp.shader = null;
      sfp.color = 0xFFFF5C9A; canvas.drawPath(islandStar(tx, ty, w * 0.025, w * 0.011, 1, 0), sfp);
      sfs.color = 0xFF8C6A2B; sfs.strokeWidth = w * 0.004; canvas.drawLine(tx - w * 0.065, ty - w * 0.03, tx - w * 0.065, ty + w * 0.03, sfs); canvas.drawLine(tx + w * 0.065, ty - w * 0.03, tx + w * 0.065, ty + w * 0.03, sfs);
      canvas.restore();
      sfBurst(canvas, t, 1.7, bx + w * 0.32, by - w * 0.42, w * 0.07, '🎉', 0xFFFFC6E0);
      break;
    }
    case '16m': {
      const ry = by + w * 0.06, mars = [0.56, 0.73, 0.9];
      sfp.shader = new LinearGradient(0, ry, 0, h, 0xFF7A4A2A, 0xFF3E2414);
      sfPath.reset(); sfPath.moveTo(0, h); for (let i = 0; i <= 20; i++) sfPath.lineTo(w * i / 20, ry + sin(i * 1.2 + t * 2) * w * 0.008); sfPath.lineTo(w, h); sfPath.close(); canvas.drawPath(sfPath, sfp); sfp.shader = null;
      for (let i = 0; i < 3; i++) { const x = w * mars[i], y = ry - w * 0.02 + sin(t * 2 + i) * w * 0.008; sfp.color = i % 2 ? 0xFFFFF4F8 : 0xFFFFC6DA; rect.set(x - w * 0.05, y - w * 0.04, x + w * 0.05, y + w * 0.03); canvas.drawRoundRect(rect, w * 0.02, w * 0.02, sfp); }
      const n = Math.floor(t / 0.9), seq = [0, 1, 2, 1], a = mars[seq[n % 4]], b = mars[seq[(n + 1) % 4]], q = sfInOut((t % 0.9) / 0.9);
      sfHero(canvas, 'chocochou', w * (a + (b - a) * q), ry - w * 0.06 - sin(q * PI) * w * 0.12, 1.0);
      sfBlock(canvas, 16, bx - w * 0.22, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.22, by - bob, P, false, false, true);
      sfBurst(canvas, t, 1.2, bx - w * 0.42, by - w * 0.34, w * 0.065, '😋', 0xFFFFE0EC);
      break;
    }
    case '16z': {
      const cx = w * 0.76, boom = t >= 1.2;
      sfFireworks(canvas, t, 2.0, 0.6, [0xFF5C9A, 0x6FD3FF, 0xFFE066, 0x8CE06A]);
      sfBlock(canvas, 16, bx - w * 0.2, by, w * 0.16); sfBlock(canvas, 16, cx, by, w * 0.15);
      if (!boom) {
        const wob = sin(t * 30) * w * 0.004 * sfq(t, 0.4, 0.8);
        for (const [hw, i] of [[0.13, 0], [0.1, 1], [0.07, 2]]) { const y = by - w * 0.08 * (i + 1); sfp.color = 0xFFF2C38A; rect.set(cx - w * hw + wob, y, cx + w * hw + wob, y + w * 0.08); canvas.drawRect(rect, sfp); sfp.color = 0xFFFF9EC4; rect.set(cx - w * hw + wob, y - w * 0.01, cx + w * hw + wob, y + w * 0.025); canvas.drawRoundRect(rect, w * 0.012, w * 0.012, sfp); }
        sfp.color = 0xFFD81B3C; canvas.drawCircle(cx + wob, by - w * 0.25, w * 0.025, sfp);
      }
      if (boom) {
        const q = sfq(t, 1.2, 2.0), cols = [0xFFFFFFFF, 0xFF6FD3FF, 0xFFFFE066, 0xFF8CE06A, 0xFFFF5C9A];
        for (let i = 0; i < 30; i++) { const a = -PI * hash01(i + 70), v = w * (0.3 + 0.4 * hash01(i + 20)), x = cx + cos(a) * v * sfOut(q), y = by - w * 0.12 + sin(a) * v * sfOut(q) + q * q * w * 0.6; if (q >= 1) break; sfp.color = cols[i % 5]; rect.set(x - w * 0.01, y - w * 0.004, x + w * 0.01, y + w * 0.004); canvas.drawRect(rect, sfp); }
        if (t > 3.2) sfFall(canvas, t, 30, [0xFFFFFF, 0x6FD3FF, 0xFFE066, 0x8CE06A, 0xFF5C9A], w * 0.01, 0.25, 0.02, 2);
      }
      sfFlash(canvas, 0xFFFFFF, 200 * (1 - sfq(t, 1.2, 0.4)) * (boom ? 1 : 0));
      // Toute la bande est de la fête : Bulpa, l'Aigle et Zorg
      sfBlock(canvas, 16, w * 0.53, by + w * 0.03, w * 0.07);
      drawBulpa(canvas, w * 0.18, by - abs(sin(t * 5 + 1)) * w * 0.03, w * 0.1);
      sfHero(canvas, 'aigle', w * 0.42, by - abs(sin(t * 5 + 2)) * w * 0.03, 1.0);
      sfHero(canvas, 'zorg', w * 0.54, by + w * 0.03 - abs(sin(t * 5 + 3)) * w * 0.03, 0.85, 0, true);
      sfPlayer(canvas, bx - w * 0.2, by - (boom ? abs(sin(t * 5)) * w * 0.04 : 0), P, false, boom, true);
      sfBurst(canvas, t, 1.2, cx, by - w * 0.36, w * 0.08, '🎉', 0xFFFFC6E0);
      break;
    }
    // ---------- 17 : à l'abordage ! ----------
    case '17a': {
      // Sieste sur le pont après le banquet… un boulet de canon siffle, puis un grappin emporte Bulpa
      const px0 = bx - w * 0.2, wake = t > 1.3;
      sfBlock(canvas, 17, bx - w * 0.05, by, w * 0.3);
      eyesShut = !wake;
      sfPlayer(canvas, px0, by, P, wake, wake, true, !wake ? sin(t * 1.5) * 5 : 0);
      eyesShut = false;
      if (!wake) {
        sfText.color = 0xFFFFFFFF;
        for (let i = 0; i < 2; i++) { const q = (t / 1.2 + i * 0.5) % 1; sfText.textSize = w * (0.04 + 0.04 * q); sfText.alpha = Math.round(255 * sin(q * PI)); canvas.drawText('Z', px0 + w * (0.08 + 0.1 * q), by - w * (0.25 + 0.2 * q), sfText); }
        sfText.alpha = 255;
      }
      const cq = sfq(t, 0.6, 0.8);
      if (cq > 0 && cq < 1) {
        const cxp = w * 1.1 - cq * w * 1.3, cyp = h * 0.18 + cq * h * 0.12;
        sfs.color = ca(0xFFFFFF, 120); sfs.strokeWidth = w * 0.01; canvas.drawLine(cxp, cyp, cxp + w * 0.18, cyp - w * 0.03, sfs);
        sfp.color = 0xFF1B1B1B; canvas.drawCircle(cxp, cyp, w * 0.025, sfp);
      }
      sfSparks(canvas, t, 1.4, w * 0.1, by + w * 0.1, 14, w * 0.18, 0xE8F6FF, w * 0.014, 1.0);
      const gq = sfInOut(sfq(t, 2.0, 1.0)), qx = bx + w * 0.06 + gq * w * 0.6, qy = by - gq * h * 0.25;
      if (gq > 0) {
        sfs.color = 0xFF8A6A3A; sfs.strokeWidth = w * 0.006; canvas.drawLine(qx, qy - w * 0.12, w * 1.1, qy - w * 0.3, sfs);
        sfs.color = 0xFF9E9E9E; sfs.strokeWidth = w * 0.012; canvas.drawLine(qx - w * 0.03, qy - w * 0.12, qx + w * 0.03, qy - w * 0.14, sfs);
      }
      canvas.save(); canvas.rotate(gq * 20, qx, qy - w * 0.06); drawBulpa(canvas, qx, qy, w * 0.11, !wake); canvas.restore();
      sfBurst(canvas, t, 1.3, px0 - w * 0.12, by - w * 0.36, w * 0.075, '!!');
      break;
    }
    case '17m': {
      // Bulpa dans la cage du capitaine, pendue à la vergue ; une silhouette encapuchonnée dans la vigie
      const cxg = w * 0.72, cyg = by - w * 0.24 + sin(t * 1.4) * w * 0.01;
      sfYard(canvas);
      sfs.color = 0xFF8A6A3A; sfs.strokeWidth = w * 0.006; canvas.drawLine(cxg, h * 0.172, cxg, cyg - w * 0.21, sfs);
      drawBulpa(canvas, cxg, cyg - w * 0.01 - abs(sin(t * 5)) * w * 0.02, w * 0.1);
      sfCage(canvas, cxg, cyg, 1);
      const vx = w * 0.16, vy = h * 0.16;
      sfs.color = 0xFF5A3A22; sfs.strokeWidth = w * 0.02; canvas.drawLine(vx, vy, vx, by + w * 0.05, sfs);
      sfp.color = 0xFF1A1424;
      sfPath.reset(); sfPath.moveTo(vx - w * 0.045, vy + w * 0.01); sfPath.quadTo(vx - w * 0.05, vy - w * 0.07, vx, vy - w * 0.1); sfPath.quadTo(vx + w * 0.05, vy - w * 0.07, vx + w * 0.045, vy + w * 0.01); sfPath.close(); canvas.drawPath(sfPath, sfp);
      if (t % 3 > 0.15) { sfp.color = 0xFFFFD54F; canvas.drawCircle(vx - w * 0.012, vy - w * 0.055, w * 0.006, sfp); canvas.drawCircle(vx + w * 0.012, vy - w * 0.055, w * 0.006, sfp); }
      sfp.color = 0xFF6A4A2A; rect.set(vx - w * 0.07, vy, vx + w * 0.07, vy + w * 0.05); canvas.drawRect(rect, sfp);
      sfBlock(canvas, 17, bx - w * 0.1, by, w * 0.18);
      sfPlayer(canvas, bx - w * 0.1, by - bob, P, false, false, true);
      sfBurst(canvas, t, 0.8, cxg + w * 0.14, cyg - w * 0.28, w * 0.06, '!');
      break;
    }
    case '17z': {
      // Tu bondis jusqu'à la corde et la tranches : la cage tombe sur le pont, Bulpa en sort
      const cxg = w * 0.72, cut = t >= 1.0, cyg0 = by - w * 0.28, cyg = cyg0 + (by - cyg0) * sfInOut(sfq(t, 1.0, 0.45));
      sfYard(canvas);
      sfs.color = 0xFF8A6A3A; sfs.strokeWidth = w * 0.006;
      if (!cut) canvas.drawLine(cxg, h * 0.172, cxg, cyg - w * 0.21, sfs); else canvas.drawLine(cxg, h * 0.172, cxg + sin(t * 6) * w * 0.01, h * 0.172 + w * 0.08, sfs);
      sfBlock(canvas, 17, w * 0.24, by, w * 0.16); sfBlock(canvas, 17, cxg, by, w * 0.16);
      const bq = sfq(t, 1.7, 0.5);
      drawBulpa(canvas, cxg + bq * w * 0.1, cyg - w * 0.01 - (bq > 0 ? abs(sin(t * 5)) * w * 0.05 : 0), w * 0.1, cut);
      sfCage(canvas, cxg, cyg, 1 - sfq(t, 1.5, 0.4));
      const q = sfInOut(sfq(t, 0.3, 0.7)), back = sfInOut(sfq(t, 1.0, 0.6)), ropeX = cxg - w * 0.06, ropeY = cyg0 - w * 0.3;
      let x, y;
      if (t < 1.0) { x = w * 0.24 + (ropeX - w * 0.24) * q; y = by + (ropeY - by) * q - sin(q * PI) * w * 0.1; }
      else { x = ropeX + (cxg - w * 0.12 - ropeX) * back; y = ropeY + (by - ropeY) * back - (back >= 1 ? bob : 0); }
      sfPlayer(canvas, x, y, P * 0.9, false, true, true, t < 1.3 ? q * 360 : 0);
      if (t >= 0.95 && t <= 1.2) { sfs.color = 0xFFFFFFFF; sfs.strokeWidth = w * 0.01; canvas.drawLine(ropeX - w * 0.04, ropeY - w * 0.06, ropeX + w * 0.12, ropeY + w * 0.04, sfs); }
      if (t > 1.7) sfFall(canvas, t, 30, [0xFFD54F, 0xE53950, 0x4FC3F7, 0xFFFFFF], w * 0.01, 0.25, 0.02, 2);
      sfBurst(canvas, t, 1.6, w * 0.3, by - w * 0.36, w * 0.07, '★');
      break;
    }
    // ---------- 18 : panique au Jurassique ----------
    case '18a': {
      // Le navire fonce dans un vortex lumineux… et tu atterris à la Préhistoire, face à un T-Rex qui rugit
      const before = t < 2.2;
      if (before) {
        const vx = w * 0.62, vy = h * 0.3, grow = sfOut(sfq(t, 0, 1.0));
        for (let i = 0; i < 6; i++) {
          sfs.color = ca(i % 2 === 0 ? 0x9A5AE0 : 0x5CF2E6, 200); sfs.strokeWidth = w * 0.012;
          const rr = w * (0.06 + i * 0.045) * grow; rect.set(vx - rr, vy - rr * 0.6, vx + rr, vy + rr * 0.6); canvas.drawArc(rect, t * 200 + i * 40, 230, false, sfs);
        }
        sfp.color = ca(0xFFFFFF, 200 * grow); canvas.drawCircle(vx, vy, w * 0.03 * grow, sfp);
        const suck = sfInOut(sfq(t, 1.2, 0.9));
        sfBlock(canvas, 17, bx - w * 0.15, by, w * 0.2);
        sfPlayer(canvas, bx - w * 0.15 + (vx - bx + w * 0.15) * suck, by + (vy - by) * suck, P * (1 - suck * 0.85), t > 0.8, t > 0.8, true, suck * 540);
        sfBurst(canvas, t, 0.8, bx - w * 0.38, by - w * 0.34, w * 0.07, '?!');
      } else {
        const f = sfq(t, 2.2, 0.5);
        sfBlock(canvas, 18, bx - w * 0.12, by, w * 0.2);
        const rq = sfOut(sfq(t, 2.8, 0.5));
        if (rq > 0) sfTrexHead(canvas, w * 1.12 - rq * w * 0.3, by - w * 0.3, w * 0.2, 0.5 + 0.5 * sin(t * 10));
        sfPlayer(canvas, bx - w * 0.12, h * 0.08 + (by - h * 0.08) * f * f, P, true, true);
        sfSparks(canvas, t, 2.7, bx - w * 0.12, by, 12, w * 0.2, 0xC8E6A0, w * 0.012);
        sfBurst(canvas, t, 3.0, w * 0.52, by - w * 0.5, w * 0.085, '!!', 0xFFFFB74D);
      }
      sfFlash(canvas, 0xFFFFFF, before ? 0 : 220 * (1 - sfq(t, 2.2, 0.4)));
      break;
    }
    case '18m': {
      // Le sol tremble à chaque pas… Zorg se cache derrière un œuf géant
      const ex = w * 0.72, up = sfPeek(t, 3.2);
      sfBlock(canvas, 18, bx - w * 0.18, by, w * 0.18); sfBlock(canvas, 18, ex, by, w * 0.17);
      sfHero(canvas, 'zorg', ex + w * 0.04 + up * w * 0.09, by - w * 0.01, 1.0);
      sfp.color = 0xFFF2EAD0; rect.set(ex - w * 0.1, by - w * 0.3, ex + w * 0.1, by + w * 0.01); canvas.drawOval(rect, sfp);
      sfp.color = ca(0x7A8A5A, 160);
      for (const [u, v, rr] of [[-0.04, -0.22, 0.018], [0.04, -0.12, 0.022], [-0.03, -0.06, 0.014], [0.05, -0.25, 0.012]]) canvas.drawCircle(ex + w * u, by + w * v, w * rr, sfp);
      sfPlayer(canvas, bx - w * 0.18, by - bob, P, true, false, true);
      const ph = t % 1.6;
      if (ph < 0.6) for (let i = 0; i < 5; i++) { const q = ph / 0.6; sfp.color = ca(0x5E8A3A, 230 * (1 - q)); canvas.drawCircle(w * (0.1 + 0.2 * i), h * 0.1 + q * h * 0.3, w * 0.012, sfp); }
      sfBurst(canvas, t, 1.0, bx - w * 0.4, by - w * 0.34, w * 0.065, '!');
      break;
    }
    case '18z': {
      // Zorg redémarre sa soucoupe pendant que l'œuf éclot : voici Rexy !
      sfBlock(canvas, 18, w * 0.22, by, w * 0.16); sfBlock(canvas, 18, w * 0.55, by, w * 0.12);
      const ux = w * 0.82, uy = h * 0.2 + sin(t * 2) * w * 0.01, lift = sfInOut(sfq(t, 1.6, 1.0));
      if (t > 1.2) drawBeam(canvas, ux, uy + w * 0.03, by + w * 0.03, w * 0.1, 1 - sfq(t, 2.8, 0.5));
      sfHero(canvas, 'zorg', ux, by - lift * (by - uy - w * 0.12), 1.0 * (1 - lift * 0.4));
      drawUfo(canvas, ux, uy, w * 0.11);
      const ex = w * 0.55, hatch = sfOut(sfq(t, 1.2, 0.5));
      if (hatch > 0) sfHero(canvas, 'rexy', ex, by - abs(sin(t * 5)) * w * 0.02 * hatch, 1.0 * hatch);
      sfp.color = 0xFFF2EAD0;
      if (hatch <= 0) {
        const wob = t > 0.4 ? sin(t * 30) * 4 : 0;
        canvas.save(); canvas.rotate(wob, ex, by);
        rect.set(ex - w * 0.08, by - w * 0.22, ex + w * 0.08, by + w * 0.005); canvas.drawOval(rect, sfp);
        if (t > 0.6) { sfs.color = 0xFF8A7A5A; sfs.strokeWidth = w * 0.005; sfPath.reset(); sfPath.moveTo(ex - w * 0.08, by - w * 0.11); sfPath.lineTo(ex - w * 0.04, by - w * 0.14); sfPath.lineTo(ex, by - w * 0.1); sfPath.lineTo(ex + w * 0.04, by - w * 0.14); sfPath.lineTo(ex + w * 0.08, by - w * 0.11); canvas.drawPath(sfPath, sfs); }
        canvas.restore();
      } else {
        rect.set(ex - w * 0.08, by - w * 0.11, ex + w * 0.08, by + w * 0.005); canvas.drawArc(rect, 0, 180, true, sfp);
        canvas.save(); canvas.translate(-hatch * w * 0.12, -hatch * w * 0.15); canvas.rotate(-hatch * 40, ex, by - w * 0.11);
        rect.set(ex - w * 0.08, by - w * 0.22, ex + w * 0.08, by); canvas.drawArc(rect, 180, 180, true, sfp);
        canvas.restore();
      }
      sfPlayer(canvas, w * 0.22, by - abs(sin(t * 6)) * w * 0.05, P, false, true, true);
      sfBurst(canvas, t, 1.4, ex, by - w * 0.36, w * 0.07, '✨', 0xFFFFF3A0);
      break;
    }
    // ---------- 19 : les secrets d'Atlantide ----------
    case '19a': {
      // Le navire coule : l'eau monte… puis tu descends doucement vers la cité engloutie, Abysse t'offre des bulles
      const before = t < 1.8;
      if (before) {
          sfBlock(canvas, 17, bx, by, w * 0.2);
          sfPlayer(canvas, bx, by, P, t > 0.6, true);
          sfLiquid(canvas, h - (h - h * 0.1) * sfInOut(sfq(t, 0.4, 1.4)), t, 0xFF3D8FD6, 0xFF0D4F86);
          sfBurst(canvas, t, 0.6, bx + w * 0.3, by - w * 0.36, w * 0.07, "!!");
      } else {
          const f = sfOut(sfq(t, 1.8, 1.6));
          sfBlock(canvas, 19, bx - w * 0.1, by, w * 0.2);
          drawWhale(canvas, w * 1.1 - sfq(t, 2.2, 3) * w * 1.4, h * 0.25, w * 0.07, -1);
          sfPlayer(canvas, bx - w * 0.1, h * 0.1 + (by - h * 0.1) * f, P, false, true, true, (1 - f) * 40);
          sfs.strokeWidth = w * 0.005;
          for (let i = 0; i < 10; i++) { const q = ((t * 0.4 + i / 10) % 1); sfs.color = ca(0xE8FBFF, 200 * (1 - q)); canvas.drawCircle(bx - w * 0.1 + sin(i * 2 + t) * w * 0.1, by - q * h * 0.4, w * (0.008 + 0.01 * hash01(i)), sfs) }
      }
      sfFlash(canvas, 0xBFF6FF, before ? 0 : 200 * (1 - sfq(t, 1.8, 0.4)));
      break;
    }
    case '19m': {
      // Une statue s'illumine… et un petit gardien en scaphandre se montre derrière une colonne
      const sx = w * 0.78; const glow = 0.5 + 0.5 * sin(t * 2);
      sfp.color = 0xFF8AB0B8; rect.set(sx - w * 0.1, by - w * 0.32, sx + w * 0.1, by + w * 0.02); canvas.drawRoundRect(rect, w * 0.08, w * 0.08, sfp);
      sfp.color = ca(0x7FF6FF, 120 + 120 * glow); canvas.drawCircle(sx - w * 0.04, by - w * 0.2, w * 0.018, sfp); canvas.drawCircle(sx + w * 0.04, by - w * 0.2, w * 0.018, sfp);
      const up = sfPeek(t, 3.2);
      sfHero(canvas, 'nautilus', w * 0.55 + up * w * 0.06, by, 1.0);
      sfp.color = 0xFFE6F2F2; rect.set(w * 0.48, by - w * 0.36, w * 0.58, by + w * 0.02); canvas.drawRect(rect, sfp);
      sfBlock(canvas, 19, bx - w * 0.22, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.22, by - bob, P, false, false, true);
      sfBurst(canvas, t, 1.0, bx - w * 0.4, by - w * 0.34, w * 0.065, "?!");
      break;
    }
    case '19z': {
      // Le cristal central s'allume : toute la cité devient bleue
      const on = sfq(t, 0.6, 1.2);
      sfRays(canvas, bx, h * 0.18, w * 1.1, on, t, 0x7FF6FF);
      sfp.color = ca(0x7FF6FF, 140 * on); canvas.drawCircle(bx, h * 0.18, w * 0.18, sfp);
      sfPoly(canvas, 0xFFC8FFFF, [bx, h * 0.1, bx + w * 0.05, h * 0.18, bx, h * 0.26, bx - w * 0.05, h * 0.18]);
      sfFlash(canvas, 0x7FF6FF, 60 * on);
      sfBlock(canvas, 19, bx - w * 0.18, by, w * 0.18); sfBlock(canvas, 19, w * 0.78, by, w * 0.14);
      sfPlayer(canvas, bx - w * 0.18, by - abs(sin(t * 4)) * w * 0.04 * on, P, false, true);
      sfHero(canvas, 'nautilus', w * 0.78, by - abs(sin(t * 4 + 1)) * w * 0.03 * on, 1.0);
      sfSparks(canvas, t, 1.2, bx, h * 0.18, 16, w * 0.3, 0xBFFFFF, w * 0.012, 1.2);
      break;
    }
    // ---------- 20 : gravité zéro ----------
    case '20a': {
      // Le cristal envoie un faisceau vers le ciel… et tu flottes en orbite
      const before = t < 1.8;
      if (before) {
          sfBlock(canvas, 19, bx, by, w * 0.2);
          const lift = sfInOut(sfq(t, 0.8, 1.0));
          if (t > 0.5) { sfp.color = ca(0x7FF6FF, 140); rect.set(bx - w * 0.06, 0, bx + w * 0.06, by); canvas.drawRect(rect, sfp) }
          sfPlayer(canvas, bx, by - lift * h * 0.6, P, false, true, true, lift * 360);
      } else {
          const f = sfOut(sfq(t, 1.8, 2.0));
          sfBlock(canvas, 20, bx, by, w * 0.2);
          sfPlayer(canvas, bx, h * 0.15 + (by - h * 0.15) * f - (f >= 1 ? sin(t * 2) * w * 0.02 : 0), P, f < 1, true, true, (1 - f) * 180 + sin(t * 1.5) * 8);
      }
      sfFlash(canvas, 0xFFFFFF, before ? 0 : 200 * (1 - sfq(t, 1.8, 0.4)));
      break;
    }
    case '20m': {
      // Pixel pirate le sas pendant qu'Astro dérive vers les astéroïdes
      const dx = w * 0.78 + sin(t * 0.7) * w * 0.05; const dy = h * 0.28 + cos(t * 0.6) * w * 0.04;
      sfHero(canvas, 'astro', dx, dy, 1.0, t * 30);
      for (let i = 0; i < 3; i++) { const q = ((t * 0.08 + i / 3) % 1); const ax = w * (1.1 - q * 1.3); const ay = h * (0.12 + 0.1 * i); sfp.color = 0xFF7A7590; canvas.drawCircle(ax, ay, w * (0.03 + 0.01 * i), sfp) }
      sfp.color = 0xFF607D8B; rect.set(w * 0.06, by - w * 0.3, w * 0.18, by + w * 0.02); canvas.drawRect(rect, sfp);
      sfp.color = Math.floor(t * 4) % 2 === 0 ? 0xFF69F0AE : 0xFFFF5252; canvas.drawCircle(w * 0.12, by - w * 0.22, w * 0.015, sfp);
      sfHero(canvas, 'pixel', w * 0.25, by, 0.9);
      sfSparks(canvas, t % 1.5, 0.2, w * 0.18, by - w * 0.2, 8, w * 0.06, 0x7FF6FF, w * 0.008);
      sfBlock(canvas, 20, bx + w * 0.02, by, w * 0.16);
      sfPlayer(canvas, bx + w * 0.02, by - sin(t * 2) * w * 0.02, P, false, false, true);
      break;
    }
    case '20z': {
      // Tu attrapes Astro en plein vol et vous vous posez sur la station
      const q = sfInOut(sfq(t, 0.3, 1.2)); const fx = w * 0.72; const fy = h * 0.22;
      sfBlock(canvas, 20, w * 0.25, by, w * 0.16); sfBlock(canvas, 20, w * 0.7, by, w * 0.18);
      const down = sfInOut(sfq(t, 1.5, 1.0));
      const px = t < 1.5 ? w * 0.25 + (fx - w * 0.25) * q : fx - w * 0.06 * down;
      const py = t < 1.5 ? by + (fy - by) * q : fy + (by - fy) * down;
      sfHero(canvas, 'astro', t < 1.5 ? fx + sin(t * 2) * w * 0.02 : px + w * 0.1, t < 1.5 ? fy - w * 0.02 : py, 1.0, t < 1.5 ? t * 40 : 0);
      sfPlayer(canvas, px, py - (down >= 1 ? abs(sin(t * 4)) * w * 0.03 : 0), P, false, true, true, t < 1.5 ? q * 360 : 0);
      sfBurst(canvas, t, 2.5, w * 0.3, by - w * 0.36, w * 0.07, "★");
      break;
    }
    // ---------- 21 : ruée vers l'Ouest ----------
    case '21a': {
      // La capsule de retour file dans le ciel… et s'écrase dans le désert
      const before = t < 1.6;
      if (before) {
          const q = sfq(t, 0.2, 1.4); const cx0 = w * 0.1 + q * w * 0.8; const cy0 = h * 0.1 + q * h * 0.4;
          for (let i = 0; i < 5; i++) { sfp.color = ca(0xFF9800, 200 * (1 - i / 5)); canvas.drawCircle(cx0 - i * w * 0.04, cy0 - i * w * 0.02, w * (0.04 - i * 0.005), sfp) }
          sfp.color = 0xFFB0BEC5; rect.set(cx0 - w * 0.05, cy0 - w * 0.04, cx0 + w * 0.05, cy0 + w * 0.04); canvas.drawOval(rect, sfp);
          sfp.color = 0xFF4FC3F7; canvas.drawCircle(cx0 + w * 0.02, cy0 - w * 0.01, w * 0.015, sfp);
      } else {
          const dust = sfq(t, 1.6, 1.5);
          sfBlock(canvas, 21, bx, by, w * 0.2);
          sfPlayer(canvas, bx, by - (t > 2.3 ? bob : 0), P, t < 2.8, true);
          for (let i = 0; i < 8; i++) { const a = i * 0.8; sfp.color = ca(0xE8C8A0, 200 * (1 - dust)); canvas.drawCircle(bx + cos(a) * w * 0.25 * dust, by - w * 0.05 + sin(a) * w * 0.08 * dust, w * (0.05 + 0.06 * dust), sfp) }
          sfBurst(canvas, t, 2.0, bx + w * 0.3, by - w * 0.36, w * 0.075, "!!");
      }
      sfFlash(canvas, 0xFFE0A0, before ? 0 : 220 * (1 - sfq(t, 1.6, 0.4)));
      break;
    }
    case '21m': {
      // Le train fonce, Astro sur le toit ; là-haut, une silhouette encapuchonnée à cheval t'observe
      const hx = w * 0.82; const hy = h * 0.16;
      sfp.color = 0xFF1A0E2A;
      rect.set(hx - w * 0.07, hy - w * 0.02, hx + w * 0.05, hy + w * 0.04); canvas.drawOval(rect, sfp);
      sfPoly(canvas, 0xFF1A0E2A, [hx + w * 0.03, hy, hx + w * 0.09, hy - w * 0.05, hx + w * 0.07, hy + w * 0.01]);
      for (const lx of [-0.05, -0.02, 0.01, 0.03]) { rect.set(hx + w * lx, hy + w * 0.03, hx + w * (lx + 0.012), hy + w * 0.09); canvas.drawRect(rect, sfp) }
      sfPoly(canvas, 0xFF1A0E2A, [hx - w * 0.04, hy - w * 0.01, hx - w * 0.01, hy - w * 0.1, hx + w * 0.02, hy - w * 0.01]);
      if (t % 3 > 0.15) { sfp.color = 0xFFFFD54F; canvas.drawCircle(hx - w * 0.015, hy - w * 0.06, w * 0.004, sfp); canvas.drawCircle(hx + w * 0.002, hy - w * 0.06, w * 0.004, sfp) }
      const tx0 = w * 0.75 - ((t * 0.2) % 1) * w * 0.1;
      sfp.color = 0xFF7A4A22; rect.set(tx0 - w * 0.15, by - w * 0.08, tx0 + w * 0.15, by + w * 0.02); canvas.drawRect(rect, sfp);
      sfHero(canvas, 'astro', tx0, by - w * 0.08 - abs(sin(t * 6)) * w * 0.01, 0.9);
      sfs.color = 0xFFC9A26A; sfs.strokeWidth = w * 0.006; rect.set(bx - w * 0.3, by - w * 0.4, bx - w * 0.1, by - w * 0.33); canvas.drawOval(rect, sfs);
      sfBlock(canvas, 21, bx - w * 0.2, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, false, false, true);
      break;
    }
    case '21z': {
      // La locomotive part dans le ravin, les wagons s'arrêtent juste au bord : Astro est sauvé
      const q = sfq(t, 0.4, 1.4);
      canvas.save(); canvas.rotate(q * 50, w * 0.85 + q * w * 0.2, by);
      sfp.color = 0xFF2A2A30; rect.set(w * 0.75 + q * w * 0.2, by - w * 0.12 + q * h * 0.3, w * 0.95 + q * w * 0.2, by + q * h * 0.3); canvas.drawRect(rect, sfp);
      canvas.restore();
      sfp.color = 0xFF7A4A22; rect.set(w * 0.25, by - w * 0.08, w * 0.68, by + w * 0.02); canvas.drawRect(rect, sfp);
      sfHero(canvas, 'astro', w * 0.58, by - w * 0.08 - (q >= 1 ? abs(sin(t * 5)) * w * 0.03 : 0), 0.9);
      sfPlayer(canvas, w * 0.38, by - w * 0.08 - (q >= 1 ? abs(sin(t * 5 + 1)) * w * 0.03 : 0), P * 0.9, false, true);
      sfBurst(canvas, t, 1.8, w * 0.3, by - w * 0.4, w * 0.07, "★");
      break;
    }
    // ---------- 22 : la mine aux cristaux ----------
    case '22a': {
      // Le train défonce l'entrée de la mine… éboulement !
      const before = t < 1.6;
      if (before) {
          sfp.color = 0xFF2A1E2A; rect.set(w * 0.62, by - w * 0.35, w * 0.98, by + w * 0.05); canvas.drawRoundRect(rect, w * 0.18, w * 0.18, sfp);
          const q = sfInOut(sfq(t, 0.2, 1.3)); const tx0 = w * 0.05 + q * w * 0.6;
          sfp.color = 0xFF2A2A30; rect.set(tx0 - w * 0.12, by - w * 0.14, tx0 + w * 0.12, by); canvas.drawRect(rect, sfp);
          sfPlayer(canvas, tx0 - w * 0.05, by - w * 0.14, P * 0.8, q > 0.5, true);
      } else {
          sfFall(canvas, t, 18, [0x6A5E5A, 0x8A7A70], w * 0.02, 0.5, 0.01, 0);
          sfBlock(canvas, 22, bx, by, w * 0.2);
          sfPlayer(canvas, bx, by, P, true, true);
          sfBurst(canvas, t, 1.9, bx - w * 0.3, by - w * 0.36, w * 0.075, "!!");
      }
      sfFlash(canvas, 0xFFFFFF, before ? 0 : 220 * (1 - sfq(t, 1.6, 0.4)));
      break;
    }
    case '22m': {
      // Une petite lumière dans le noir… une taupe casquée creuse un raccourci
      sfFlash(canvas, 0x05020A, 120);
      const up = sfInOut(sfq(t, 0.6, 0.8)); const mx = w * 0.72;
      for (let i = 0; i < 8; i++) { const q = ((t * 1.2 + i / 8) % 1); sfp.color = ca(0x6A4A2A, 220 * (1 - q)); canvas.drawCircle(mx + cos(i * 0.8) * w * 0.1 * q, by - q * w * 0.1, w * 0.012, sfp) }
      sfHero(canvas, 'pepite', mx, by + (1 - up) * w * 0.15, 1.0);
      sfp.color = 0xFF3A2A1A; rect.set(mx - w * 0.14, by - w * 0.01, mx + w * 0.14, by + w * 0.06); canvas.drawOval(rect, sfp);
      sfp.color = ca(0xFFE0A0, 60 + 60 * abs(sin(t * 3))); canvas.drawCircle(mx + w * 0.04, by - w * 0.1 * up, w * 0.12 * up, sfp);
      sfBlock(canvas, 22, bx - w * 0.2, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.2, by - bob, P, false, false, true);
      sfBurst(canvas, t, 1.2, bx - w * 0.4, by - w * 0.34, w * 0.065, "?");
      break;
    }
    case '22z': {
      // La paroi de cristal vole en éclats : toute la bande est de l'autre côté
      const crack = sfq(t, 0.5, 0.6); const gone = t > 1.1;
      if (!gone) {
          sfPoly(canvas, ca(0x8FE0FF, 220), [w * 0.5, by - w * 0.5, w * 0.75, by - w * 0.46, w * 0.8, by + w * 0.04, w * 0.48, by + w * 0.04]);
          if (crack > 0) { sfs.color = 0xFFFFFFFF; sfs.strokeWidth = w * 0.006; canvas.drawLine(w * 0.52, by - w * 0.4, w * 0.62, by - w * 0.2, sfs); canvas.drawLine(w * 0.62, by - w * 0.2, w * 0.58, by, sfs); canvas.drawLine(w * 0.62, by - w * 0.2, w * 0.76, by - w * 0.3, sfs) }
      }
      sfSparks(canvas, t, 1.1, w * 0.64, by - w * 0.22, 20, w * 0.35, 0x8FE0FF, w * 0.016, 1.2);
      sfBlock(canvas, 22, w * 0.25, by, w * 0.16); sfBlock(canvas, 22, w * 0.72, by, w * 0.2);
      if (gone) {
          drawBulpa(canvas, w * 0.62, by - abs(sin(t * 5)) * w * 0.03, w * 0.1);
          sfHero(canvas, 'billy', w * 0.74, by - abs(sin(t * 5 + 1)) * w * 0.03, 0.9);
          sfHero(canvas, 'pepite', w * 0.86, by - abs(sin(t * 5 + 2)) * w * 0.03, 0.8);
      }
      sfPlayer(canvas, w * 0.25, by - (gone ? abs(sin(t * 5)) * w * 0.04 : 0), P, false, true);
      break;
    }
    // ---------- 23 : le cirque céleste ----------
    case '23a': {
      // Tu remontes le puits d'aération… et tu débouches sous un chapiteau posé sur les nuages
      const before = t < 1.6;
      if (before) {
          sfp.color = 0xFF1A1228; rect.set(bx - w * 0.16, 0, bx + w * 0.16, h); canvas.drawRect(rect, sfp);
          sfs.color = 0xFF3A2A4E; sfs.strokeWidth = w * 0.01;
          for (let i = 0; i < 8; i++) { const y = (i * h / 8 + t * h * 0.5) % h; canvas.drawLine(bx - w * 0.16, y, bx + w * 0.16, y, sfs) }
          sfPlayer(canvas, bx, by - sfq(t, 0.2, 1.4) * h * 0.5, P, false, false, true);
      } else {
          const f = sfOut(sfq(t, 1.6, 0.6));
          sfBlock(canvas, 23, bx, by, w * 0.2);
          sfPlayer(canvas, bx, h + (by - h) * f - (f >= 1 ? bob : 0), P, false, true, true, (1 - f) * 360);
          sfBurst(canvas, t, 2.2, bx + w * 0.3, by - w * 0.36, w * 0.075, "🎪", 0xFFFFC6E0);
      }
      sfFlash(canvas, 0xFFFFFF, before ? 0 : 200 * (1 - sfq(t, 1.6, 0.4)));
      break;
    }
    case '23m': {
      // Roulement de tambour : le clown acrobate jongle avec des balles lumineuses
      const cxp = w * 0.72;
      sfBlock(canvas, 23, cxp, by, w * 0.16);
      sfHero(canvas, 'boumboum', cxp, by - abs(sin(t * 3)) * w * 0.02, 1.1);
      const cols = [0xFFFF5C9A, 0xFFFFD54F, 0xFF4FC3F7, 0xFF8CE06A];
      for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; sfp.color = cols[i]; canvas.drawCircle(cxp + cos(a) * w * 0.1, by - w * 0.28 + sin(a) * w * 0.07, w * 0.022, sfp) }
      sfBlock(canvas, 23, bx - w * 0.22, by, w * 0.16);
      sfPlayer(canvas, bx - w * 0.22, by - bob, P, false, false, true);
      sfBurst(canvas, t, 1.0, bx - w * 0.42, by - w * 0.34, w * 0.065, "♪");
      break;
    }
    case '23z': {
      // BOUM ! Le canon géant te propulse sous les confettis ; Rexy est libre
      const cxp = w * 0.18; const cyp = by - w * 0.05;
      canvas.save(); canvas.rotate(-35, cxp, cyp);
      sfp.color = 0xFF5A5A66; rect.set(cxp - w * 0.02, cyp - w * 0.06, cxp + w * 0.24, cyp + w * 0.06); canvas.drawRoundRect(rect, w * 0.04, w * 0.04, sfp);
      sfp.color = 0xFFE53935; rect.set(cxp + w * 0.2, cyp - w * 0.07, cxp + w * 0.25, cyp + w * 0.07); canvas.drawRect(rect, sfp);
      canvas.restore();
      sfp.color = 0xFF8A5A2A; canvas.drawCircle(cxp, cyp + w * 0.04, w * 0.05, sfp);
      const q = sfq(t, 0.6, 1.4);
      sfBlock(canvas, 23, w * 0.78, by, w * 0.16);
      sfHero(canvas, 'rexy', w * 0.84, by - abs(sin(t * 5)) * w * 0.03 * q, 1.0);
      if (q > 0) sfPlayer(canvas, cxp + w * 0.2 + (w * 0.72 - cxp - w * 0.2) * q, cyp - w * 0.15 - sin(q * PI) * h * 0.3 + q * w * 0.1, P * 0.9, false, true, true, q * 540);
      sfBurst(canvas, t, 0.6, cxp + w * 0.3, cyp - w * 0.25, w * 0.08, "💥");
      if (t > 0.6) sfFall(canvas, t, 30, [0xFF5C9A, 0xFFD54F, 0x4FC3F7, 0x8CE06A], w * 0.01, 0.25, 0.02, 2);
      break;
    }
    // ---------- 24 : l'arène des champions ----------
    case '24a': {
      // Le canon t'envoie au-dessus des nuages, face à la forteresse flottante
      const before = t < 1.4;
      if (before) {
          sfBlock(canvas, 23, bx, by, w * 0.2);
          sfPlayer(canvas, bx, by - sfInOut(sfq(t, 0.3, 1.0)) * h * 0.6, P, false, true, true, sfq(t, 0.3, 1.0) * 540);
          sfBurst(canvas, t, 0.3, bx + w * 0.25, by - w * 0.2, w * 0.08, "💥");
      } else {
          const f = sfOut(sfq(t, 1.4, 0.8));
          sfBlock(canvas, 24, bx, by, w * 0.2);
          sfPlayer(canvas, bx, h * 0.05 + (by - h * 0.05) * f, P, t > 2.2, true, true, (1 - f) * 360);
          if ((t % 2.5) < 0.12 && t > 2) sfFlash(canvas, 0xE8D0FF, 150);
          sfBurst(canvas, t, 2.4, bx - w * 0.3, by - w * 0.34, w * 0.07, "?!");
      }
      sfFlash(canvas, 0xFFFFFF, before ? 0 : 200 * (1 - sfq(t, 1.4, 0.4)));
      break;
    }
    case '24m': {
      // Tous tes amis arrivent et te font une courte échelle géante
      const sx = w * 0.62;
      sfBlock(canvas, 24, sx, by, w * 0.2);
      const ids = ['rexy', 'zorg', 'astro', 'billy'];
      let y = by;
      for (const [i, id] of ids.entries()) { sfHero(canvas, id, sx + sin(t * 2 + i) * w * 0.005, y, 0.85); y -= w * 0.12 }
      drawBulpa(canvas, sx, y, w * 0.09);
      sfPlayer(canvas, sx, y - w * 0.1 - abs(sin(t * 3)) * w * 0.06, P * 0.8, false, true);
      sfBlock(canvas, 24, w * 0.2, by, w * 0.12);
      sfHero(canvas, 'pepite', w * 0.2, by, 0.85, 0, true);
      sfBurst(canvas, t, 1.0, w * 0.85, h * 0.15, w * 0.065, "!");
      break;
    }
    case '24z': {
      // Au sommet, le Maître des Ombres retire sa capuche… et applaudit
      const on = sfq(t, 0.4, 1.2);
      sfRays(canvas, w * 0.72, by - w * 0.2, w * 0.9, on, t, 0xFFE8A0);
      sfBlock(canvas, 24, bx - w * 0.2, by, w * 0.16); sfBlock(canvas, 24, w * 0.72, by, w * 0.16);
      sfHero(canvas, 'maitreombres', w * 0.72, by - abs(sin(t * 6)) * w * 0.015 * on, 1.1);
      sfPlayer(canvas, bx - w * 0.2, by - abs(sin(t * 4)) * w * 0.04 * on, P, false, true);
      if (t > 1.2) sfFall(canvas, t, 30, [0xFFD54F, 0xE1BEE7, 0xFFFFFF, 0x7E57C2], w * 0.01, 0.25, 0.02, 2);
      sfBurst(canvas, t, 1.4, w * 0.72, by - w * 0.42, w * 0.07, "👏", 0xFFFFF3A0);
      break;
    }

  }
  canvas.restore();
}
