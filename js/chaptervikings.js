'use strict';
// Chapitre 32, Vikings : le pont arc-en-ciel (équivalent de ChapterVikings.kt, appelé par chapterthemes5.js).
// Bois sculpté d'entrelacs, pierres runiques au serpent rouge, boucliers peints, rochers enneigés à stalactites,
// drakkars (blocs mobiles), glace qui se fend (s'effrite), tambours arc-en-ciel du Bifröst (trampolines), pierres de
// rune à ramasser, petit Bifröst à l'arrivée, corne à boire dorée.

const vp2 = new Paint(), vs2 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const vpath2 = new Path(), vrect2 = new RectF();
const VK2_WOOD = 0xFF8A5A30, VK2_RUNE = 0xFF8A8A92, VK2_SNOW = 0xFF6A7080;
const VK2_BOW = [0xFFFF4A4A, 0xFFFF9A3A, 0xFFFFE04A, 0xFF5AD85A, 0xFF4AB0FF, 0xFF5A6AFF, 0xFFB45AFF];

function chapterBlockLook32(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(0xFF6A4A2A, 'bois', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFF7A5228, 'bois', false);       // drakkar
  if (k0 === Kind.CRUMBLY) return std(0xFFBFE6F2, 'glace', false);     // glace qui se fend
  if (k0 === Kind.TRAMPOLINE) return std(0xFF2A3A5A, 'lisse', true);   // tambour arc-en-ciel
  return c % 3 === 0 ? std(VK2_WOOD, 'bois', false) : c % 3 === 1 ? std(VK2_RUNE, 'granit', b.round) : std(VK2_SNOW, 'granit', false);
}

/** Faces latérales d'un bloc carré, chacune dans son repère (x sur wd, y sur dh). */
function vkWalls2(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 61 + 29, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Rune gravée (quelques traits tirés du numéro n), centre x, y, hauteur s. */
function vkRune2(canvas, n, x, y, s) {
  canvas.drawLine(x, y - s / 2, x, y + s / 2, vs2);
  const v = n % 6;
  if (v === 0) { canvas.drawLine(x, y - s / 2, x + s * 0.35, y - s * 0.2, vs2); canvas.drawLine(x, y - s * 0.15, x + s * 0.35, y + s * 0.1, vs2); }
  else if (v === 1) { canvas.drawLine(x, y - s / 2, x + s * 0.3, y - s * 0.25, vs2); canvas.drawLine(x + s * 0.3, y - s * 0.25, x, y, vs2); canvas.drawLine(x, y, x + s * 0.3, y + s / 2, vs2); }
  else if (v === 2) { canvas.drawLine(x - s * 0.3, y - s * 0.2, x + s * 0.3, y + s * 0.2, vs2); }
  else if (v === 3) { canvas.drawLine(x, y - s * 0.1, x + s * 0.3, y - s * 0.4, vs2); canvas.drawLine(x, y - s * 0.1, x - s * 0.3, y - s * 0.4, vs2); }
  else if (v === 4) { canvas.drawLine(x, y - s / 2, x + s * 0.3, y - s * 0.3, vs2); canvas.drawLine(x + s * 0.3, y - s * 0.3, x + s * 0.3, y + s * 0.5, vs2); }
  else { canvas.drawLine(x - s * 0.25, y + s * 0.1, x + s * 0.25, y - s * 0.3, vs2); canvas.drawLine(x - s * 0.25, y - s * 0.3, x + s * 0.25, y + s * 0.1, vs2); }
}

/** Face de bois sculpté : planches, bande d'entrelacs dorés en haut. */
function vkWoodFace2(canvas, h0, wd, dh, right) {
  vs2.color = Color.argb(right ? 80 : 110, 40, 22, 10); vs2.strokeWidth = k * 0.014;
  for (let x = k * 0.18; x < wd; x += k * 0.2) canvas.drawLine(x, 0, x, dh, vs2);
  const y = k * 0.18, u = k * 0.1;
  for (const ph of [0, Math.PI]) {
    vs2.color = right ? 0xFFB8862A : 0xFFE8B84A; vs2.strokeWidth = k * 0.03;
    vpath2.reset(); vpath2.moveTo(k * 0.06, y + Math.sin(ph) * u * 0.6);
    for (let x = k * 0.06; x <= wd - k * 0.06; x += k * 0.04) vpath2.lineTo(x, y + Math.sin(x / u * 1.6 + ph) * u * 0.6);
    canvas.drawPath(vpath2, vs2);
  }
  if (egHash5(h0) < 0.5) { vs2.color = Color.argb(right ? 120 : 160, 40, 22, 10); vs2.strokeWidth = k * 0.02; for (let i = 0; i < 4; i++) vkRune2(canvas, Math.floor(egHash5(h0 + i) * 6), wd * (0.2 + i * 0.2), dh * 0.62, k * 0.2); }
}

/** Face de pierre runique : serpent rouge qui court en arche, runes gravées dedans. */
function vkRuneFace2(canvas, h0, wd, dh, right) {
  vs2.color = right ? 0xFF8A2A22 : 0xFFC83A2A; vs2.strokeWidth = k * 0.07;
  vpath2.reset(); vpath2.moveTo(wd * 0.14, dh - k * 0.08); vpath2.quadTo(wd * 0.12, k * 0.12, wd * 0.5, k * 0.12); vpath2.quadTo(wd * 0.88, k * 0.12, wd * 0.86, dh - k * 0.08); canvas.drawPath(vpath2, vs2);
  vp2.color = right ? 0xFF8A2A22 : 0xFFC83A2A; canvas.drawCircle(wd * 0.86, dh - k * 0.08, k * 0.06, vp2);
  vs2.color = Color.argb(right ? 120 : 170, 30, 28, 34); vs2.strokeWidth = k * 0.018;
  for (let i = 0; i < 3; i++) vkRune2(canvas, Math.floor(egHash5(h0 + i * 3) * 6), wd * (0.32 + i * 0.18), dh * 0.55, k * 0.22);
}

/** Face de rocher enneigé : fissures, neige qui coule du haut, petites stalactites. */
function vkSnowFace2(canvas, h0, wd, dh, right) {
  vs2.color = Color.argb(right ? 70 : 100, 20, 24, 34); vs2.strokeWidth = k * 0.016;
  canvas.drawLine(wd * 0.3, k * 0.3, wd * 0.42, dh * 0.7, vs2); canvas.drawLine(wd * 0.7, k * 0.4, wd * 0.62, dh * 0.85, vs2);
  vp2.color = right ? 0xFFD8E4F0 : 0xFFF0F6FF;
  vpath2.reset(); vpath2.moveTo(0, 0); vpath2.lineTo(wd, 0); vpath2.lineTo(wd, k * 0.1);
  for (let i = 6; i >= 0; i--) { const x = i * wd / 6; vpath2.lineTo(x, k * (0.1 + 0.12 * egHash5(h0 + i))); }
  vpath2.close(); canvas.drawPath(vpath2, vp2);
  vp2.color = Color.argb(200, 220, 240, 255);
  for (let i = 0; i < 4; i++) { const x = wd * (0.15 + i * 0.23), len = k * (0.1 + 0.14 * egHash5(h0 + i + 9)); vpath2.reset(); vpath2.moveTo(x - k * 0.025, k * 0.12); vpath2.lineTo(x + k * 0.025, k * 0.12); vpath2.lineTo(x, k * 0.12 + len); vpath2.close(); canvas.drawPath(vpath2, vp2); }
}

function drawChapterDeco32(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind, dh = platformDepth * k;
  vp2.shader = null; vs2.shader = null;
  if (kd === Kind.MOVING) {
    // Drakkar : vagues autour, boucliers et rames sur les flancs, pont de planches, proue en tête de dragon
    for (let i = 0; i < 2; i++) { const q = (time * 0.7 + i * 0.5) % 1; vs2.color = Color.argb(Math.floor(110 * (1 - q)), 200, 255, 240); vs2.strokeWidth = k * 0.025; vrect2.set(-rx * (1.1 + q * 0.4), dh * 0.85 - ry * (1.1 + q * 0.4), rx * (1.1 + q * 0.4), dh * 0.85 + ry * (1.1 + q * 0.4)); canvas.drawOval(vrect2, vs2); }
    const cols = [0xFFC8322A, 0xFFFFD24F, 0xFF2A5AA8, 0xFFF2E8D0, 0xFF2E8A4A];
    vkWalls2(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      const ro = Math.sin(time * 3);
      vs2.color = 0xFF5A3A1A; vs2.strokeWidth = k * 0.03;
      for (let i = 0; i < 4; i++) { const x = (i + 0.5) * wd / 4; cv.drawLine(x, dh2 * 0.5, x + k * (0.1 + ro * 0.08), dh2 + k * 0.15, vs2); }
      for (let i = 0; i < 4; i++) { const x = (i + 0.5) * wd / 4; vp2.color = cols[(i + (right ? 2 : 0)) % 5]; cv.drawCircle(x, dh2 * 0.3, Math.min(wd / 9, k * 0.12), vp2); vp2.color = 0xFFC8C8D0; cv.drawCircle(x, dh2 * 0.3, k * 0.03, vp2); }
    });
    vs2.color = Color.argb(120, 50, 30, 14); vs2.strokeWidth = k * 0.015;
    for (const u of [-0.45, 0, 0.45]) canvas.drawLine(isoX(-0.9 * a, u * a), isoY(-0.9 * a, 0, u * a), isoX(0.9 * a, u * a), isoY(0.9 * a, 0, u * a), vs2);
    const px = isoX(a, -a) , py = isoY(a, 0, -a);
    vs2.color = 0xFF7A5228; vs2.strokeWidth = k * 0.09;
    vpath2.reset(); vpath2.moveTo(px - k * 0.1, py + k * 0.05); vpath2.quadTo(px + k * 0.25, py - k * 0.3, px + k * 0.15, py - k * 0.7); canvas.drawPath(vpath2, vs2);
    vp2.color = 0xFF7A5228; vrect2.set(px + k * 0.1, py - k * 0.86, px + k * 0.38, py - k * 0.66); canvas.drawOval(vrect2, vp2);
    vp2.color = 0xFFFFD24F; canvas.drawCircle(px + k * 0.26, py - k * 0.79, k * 0.03, vp2);
    vp2.color = 0xFFC8322A; vpath2.reset(); vpath2.moveTo(px + k * 0.36, py - k * 0.72); vpath2.lineTo(px + k * 0.48, py - k * 0.7); vpath2.lineTo(px + k * 0.36, py - k * 0.68); vpath2.close(); canvas.drawPath(vpath2, vp2);
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Tambour du Bifröst : anneaux arc-en-ciel sur le bord et le flanc, étincelles
    for (let i = 0; i < 7; i++) { const f = 1 - i * 0.04; vs2.color = VK2_BOW[i]; vs2.strokeWidth = k * 0.04; vrect2.set(-rx * f, -ry * f, rx * f, ry * f); canvas.drawOval(vrect2, vs2); }
    for (let i = 0; i < 7; i++) { vs2.color = VK2_BOW[i]; vs2.strokeWidth = k * 0.05; const y = dh * (0.15 + i * 0.11); vrect2.set(-rx, y - ry, rx, y + ry); canvas.drawArc(vrect2, 0, 180, false, vs2); }
    for (let i = 0; i < 6; i++) { const an = time * 1.5 + i * 1.05, tw = Math.abs(Math.sin(time * 4 + i)), x = Math.cos(an) * rx * 1.1, y = Math.sin(an) * ry * 1.1 - k * 0.1, r = k * (0.04 + 0.06 * tw); vs2.color = Color.argb(Math.round(230 * tw), 255, 255, 240); vs2.strokeWidth = k * 0.02; canvas.drawLine(x - r, y, x + r, y, vs2); canvas.drawLine(x, y - r, x, y + r, vs2); }
    return;
  }
  if (kd === Kind.CRUMBLY) {
    // Glace qui se fend : fissures blanches, givre qui scintille, stalactites
    vkWalls2(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      vs2.color = Color.argb(right ? 150 : 200, 255, 255, 255); vs2.strokeWidth = k * 0.018;
      cv.drawLine(wd * 0.3, 0, wd * 0.45, dh2 * 0.5, vs2); cv.drawLine(wd * 0.45, dh2 * 0.5, wd * 0.38, dh2, vs2); cv.drawLine(wd * 0.45, dh2 * 0.5, wd * 0.7, dh2 * 0.62, vs2);
    });
    vs2.color = Color.argb(220, 255, 255, 255); vs2.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.25, -rx * 0.05, ry * 0.1, vs2); canvas.drawLine(-rx * 0.05, ry * 0.1, rx * 0.45, -ry * 0.3, vs2);
    for (let i = 0; i < 4; i++) { const tw = Math.abs(Math.sin(time * 3 + i * 1.7 + seed)), x = (i - 1.5) * rx * 0.4, y = ((i % 2) - 0.5) * ry * 0.6, r = k * 0.06 * tw; vs2.color = Color.argb(Math.round(240 * tw), 255, 255, 255); vs2.strokeWidth = k * 0.018; canvas.drawLine(x - r, y, x + r, y, vs2); canvas.drawLine(x, y - r, x, y + r, vs2); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  const bc = pl.baseColor;
  if (pl.round) {
    // Bouclier peint posé sur un tambour de pierre : quartiers de couleur, umbo de fer
    const c0 = [0xFFC8322A, 0xFF2A5AA8, 0xFF2E8A4A][seed % 3], c1 = [0xFFF2E8D0, 0xFFFFD24F, 0xFFF2E8D0][seed % 3];
    canvas.save(); canvas.scale(1, 0.577);
    for (let i = 0; i < 4; i++) { vp2.color = i % 2 ? c0 : c1; vrect2.set(-rx * 0.9, -rx * 0.9, rx * 0.9, rx * 0.9); canvas.drawArc(vrect2, i * 90, 90, true, vp2); }
    vs2.color = 0xFF5A4A3A; vs2.strokeWidth = k * 0.06; canvas.drawCircle(0, 0, rx * 0.9, vs2);
    vp2.color = 0xFFB8B8C4; canvas.drawCircle(0, 0, rx * 0.2, vp2);
    canvas.restore();
    canvas.save(); canvas.translate(-k * 0.36, ry - k * 0.02); vkRuneFace2(canvas, seed * 61, k * 0.72, dh, false); canvas.restore();
    return;
  }
  if (bc === VK2_SNOW) {
    vkWalls2(canvas, pl, seed, vkSnowFace2);
    vpath2.reset(); vpath2.moveTo(isoX(-0.98 * a, -0.98 * a), isoY(-0.98 * a, 0, -0.98 * a));
    for (const [u, v] of [[0.98, -0.98], [0.98, 0.98], [-0.98, 0.98]]) vpath2.lineTo(isoX(u * a, v * a), isoY(u * a, 0, v * a));
    vpath2.close(); vs2.color = 0xFFF0F6FF; vs2.strokeWidth = k * 0.16; canvas.drawPath(vpath2, vs2);
    return;
  }
  vkWalls2(canvas, pl, seed, bc === VK2_WOOD ? vkWoodFace2 : vkRuneFace2);
}

/** Pierre de rune à ramasser : galet gris, rune qui luit en bleu (32). */
function drawChapterPickup32(canvas, cy, shadow) {
  const r = k * 0.19, glowA = 0.6 + 0.4 * Math.sin(time * 4);
  vp2.shader = null;
  if (shadow) { vp2.color = Color.argb(45, 0, 0, 0); vrect2.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(vrect2, vp2); }
  vp2.color = Color.argb(Math.round(70 * glowA), 120, 200, 255); canvas.drawCircle(0, cy, r * 1.5, vp2);
  canvas.save(); canvas.rotate(Math.sin(time * 2) * 8, 0, cy);
  vp2.color = 0xFF5A5A64; vrect2.set(-r * 0.72 + r * 0.06, cy - r * 0.9 + r * 0.06, r * 0.72 + r * 0.06, cy + r * 0.9 + r * 0.06); canvas.drawOval(vrect2, vp2);
  vp2.color = 0xFF9A9AA6; vrect2.set(-r * 0.72, cy - r * 0.9, r * 0.72, cy + r * 0.9); canvas.drawOval(vrect2, vp2);
  vs2.color = Color.argb(Math.round(255 * glowA), 140, 220, 255); vs2.strokeWidth = r * 0.14;
  canvas.drawLine(0, cy - r * 0.55, 0, cy + r * 0.55, vs2); canvas.drawLine(0, cy - r * 0.55, r * 0.35, cy - r * 0.2, vs2); canvas.drawLine(r * 0.35, cy - r * 0.2, 0, cy + r * 0.05, vs2); canvas.drawLine(0, cy + r * 0.05, r * 0.35, cy + r * 0.55, vs2);
  vp2.color = Color.argb(150, 255, 255, 255); canvas.drawCircle(-r * 0.3, cy - r * 0.5, r * 0.1, vp2);
  canvas.restore();
  return true;
}

/** Petit Bifröst à l'arrivée : arche arc-en-ciel et salle dorée d'Asgard à son bout (32). */
function drawChapterFinish32(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  vp2.shader = null;
  vp2.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 230, 140); canvas.drawCircle(bx, by - k * 0.8, k * 0.6, vp2);
  for (let i = 0; i < 7; i++) { vs2.color = VK2_BOW[i]; vs2.strokeWidth = k * 0.05; vrect2.set(bx - k * (0.42 - i * 0.04), by - k * (0.9 - i * 0.04), bx + k * (0.42 - i * 0.04), by + k * (0.5 - i * 0.04)); canvas.drawArc(vrect2, 180, 180, false, vs2); }
  vp2.color = 0xFFFFCF5A; canvas.drawRect(bx + k * 0.3, by - k * 0.26, bx + k * 0.5, by, vp2);
  vp2.color = 0xFFE8A83A; vpath2.reset(); vpath2.moveTo(bx + k * 0.27, by - k * 0.26); vpath2.lineTo(bx + k * 0.4, by - k * 0.4); vpath2.lineTo(bx + k * 0.53, by - k * 0.26); vpath2.close(); canvas.drawPath(vpath2, vp2);
}

/** Objet doré : la corne à boire (32). */
function drawCollectible32(canvas, c, x, y, r, got) {
  vp2.shader = null;
  const main = got ? 0xFFFFC93C : 0xFF9A9AA2, dark = got ? 0xFFC98A00 : 0xFF6E6E78;
  if (got) { vp2.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, vp2); }
  vpath2.reset(); vpath2.moveTo(x - r * 0.9, y - r * 0.5); vpath2.quadTo(x - r * 0.2, y + r * 1.0, x + r * 0.9, y - r * 0.3); vpath2.lineTo(x + r * 0.8, y + r * 0.0); vpath2.quadTo(x - r * 0.2, y + r * 0.6, x - r * 0.6, y - r * 0.7); vpath2.close();
  vp2.color = main; canvas.drawPath(vpath2, vp2);
  vs2.color = dark; vs2.strokeWidth = r * 0.08; canvas.drawPath(vpath2, vs2);
  vs2.strokeWidth = r * 0.12; canvas.drawLine(x - r * 0.95, y - r * 0.45, x - r * 0.55, y - r * 0.75, vs2);
  for (const u of [-0.25, 0.25]) { const xx = x + u * r; canvas.drawLine(xx, y + r * 0.28 + u * r * 0.2, xx + r * 0.08, y + r * 0.0 + u * r * 0.2, vs2); }
  vs2.strokeWidth = r * 0.05; canvas.drawLine(x - r * 0.4, y - r * 0.2, x + r * 0.4, y - r * 0.6, vs2);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground32(canvas) {
  vp2.color = Color.WHITE; vp2.shader = new LinearGradient(0, 0, 0, h, [0xFF030616, 0xFF123A52, 0xFF1E4A5A], [0, 0.5, 1]); canvas.drawRect(0, 0, w, h, vp2); vp2.shader = null;
}

/** Dessin propre au chapitre 32 (liste : chapterhooks.js). */
const CHAPTER_HOOKS_32 = {
  blockLook: chapterBlockLook32,
  deco: drawChapterDeco32,
  pickup: drawChapterPickup32,
  finish: drawChapterFinish32,
  collectible: drawCollectible32,
  mapBackground: drawChapterMapBackground32,
};
