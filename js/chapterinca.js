'use strict';
// Chapitre 31, Incas : les terrasses du Machu Picchu (équivalent de ChapterInca.kt, appelé par chapterthemes5.js).
// Pierres polygonales jointives, terrasses herbeuses, niches trapézoïdales, tambours à croix andine, planches de
// pont de cordes (blocs mobiles), petites pierres qui s'effritent, tambours tissés aux rayures andines (trampolines),
// épis de maïs d'or à ramasser, Porte du Soleil à l'arrivée, lama d'or. Particularité : le brouillard des Andes passe.

const ip1 = new Paint(), is1 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const ipath1 = new Path(), irect1 = new RectF();
const IN1_STONE = 0xFFA8A490, IN1_GRASS = 0xFF9A9A88, IN1_NICHE = 0xFFB4AE98;
const IN1_WEAVE = [0xFFC8322A, 0xFFFFC030, 0xFF2A8AC8, 0xFF3A9A5A, 0xFFE8708A];

function chapterBlockLook31(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(IN1_NICHE, 'granit', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFF9A7A4A, 'bois', false);      // planches du pont de cordes
  if (k0 === Kind.CRUMBLY) return std(0xFF8A8676, 'granit', false);   // petites pierres
  if (k0 === Kind.TRAMPOLINE) return std(0xFFC8322A, 'lisse', true);  // tambour tissé
  return c % 3 === 0 ? std(IN1_STONE, 'granit', false) : c % 3 === 1 ? std(IN1_GRASS, 'granit', false) : std(IN1_NICHE, 'granit', b.round);
}

/** Faces latérales d'un bloc carré, chacune dans son repère (x sur wd, y sur dh). */
function inWalls1(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 67 + 23, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Appareil polygonal : pierres irrégulières jointives, bombées (joints sombres, reflets) sur une face. */
function inPolyFace1(canvas, h0, wd, dh, right) {
  const cols = Math.max(2, Math.round(wd / (k * 0.36))), rows = 3, cw = wd / cols, rh = dh / rows;
  const px = (r, c) => c === 0 ? 0 : c === cols ? wd : c * cw + (egHash5(h0 + r * 17 + c * 5) - 0.5) * cw * 0.5;
  const py = (r, c) => r === 0 ? 0 : r === rows ? dh : r * rh + (egHash5(h0 + r * 11 + c * 13 + 7) - 0.5) * rh * 0.45;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const q = [[px(r, c), py(r, c)], [px(r, c + 1), py(r, c + 1)], [px(r + 1, c + 1), py(r + 1, c + 1)], [px(r + 1, c), py(r + 1, c)]];
    const tint = egHash5(h0 + r * 7 + c * 3 + 1);
    ipath1.reset(); ipath1.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ipath1.lineTo(q[i][0], q[i][1]); ipath1.close();
    ip1.color = tint < 0.5 ? Color.argb(Math.round(50 * (0.5 - tint) * 2), 0, 0, 0) : Color.argb(Math.round(60 * (tint - 0.5) * 2), 255, 255, 240); canvas.drawPath(ipath1, ip1);
    is1.color = Color.argb(right ? 120 : 150, 40, 38, 30); is1.strokeWidth = k * 0.022; canvas.drawPath(ipath1, is1);
    is1.color = Color.argb(right ? 50 : 80, 255, 255, 240); is1.strokeWidth = k * 0.012;
    canvas.drawLine(q[0][0] + k * 0.03, q[0][1] + k * 0.03, q[1][0] - k * 0.03, q[1][1] + k * 0.03, is1);
  }
}

/** Assises régulières (mur de terrasse) sur une face. */
function inCourses1(canvas, h0, wd, dh, right) {
  is1.color = Color.argb(right ? 90 : 120, 40, 38, 30); is1.strokeWidth = k * 0.016;
  for (let r = 1; r < 4; r++) {
    canvas.drawLine(0, r * dh / 4, wd, r * dh / 4, is1);
    for (let x = (r % 2) * k * 0.15 + k * 0.15 + egHash5(h0 + r) * k * 0.05; x < wd; x += k * 0.3) canvas.drawLine(x, (r - 1) * dh / 4, x, r * dh / 4, is1);
  }
  // Herbe qui déborde du haut du mur
  is1.color = right ? 0xFF4A8A3A : 0xFF6AA848; is1.strokeWidth = k * 0.02;
  for (let i = 0; i < 9; i++) { const x = (i + 0.5) * wd / 9; canvas.drawLine(x, 0, x + (egHash5(h0 + i * 3) - 0.5) * k * 0.08, k * (0.08 + 0.1 * egHash5(h0 + i)), is1); }
}

/** Niche trapézoïdale inca au milieu d'une face polygonale. */
function inNicheFace1(canvas, h0, wd, dh, right) {
  inPolyFace1(canvas, h0, wd, dh, right);
  const cx = wd / 2, top = dh * 0.22, bot = dh * 0.86, tw = wd * 0.14, bw = wd * 0.22;
  ipath1.reset(); ipath1.moveTo(cx - bw, bot); ipath1.lineTo(cx - tw, top); ipath1.lineTo(cx + tw, top); ipath1.lineTo(cx + bw, bot); ipath1.close();
  ip1.color = right ? 0xFF2A2820 : 0xFF3A3830; canvas.drawPath(ipath1, ip1);
  is1.color = Color.argb(right ? 70 : 110, 255, 255, 240); is1.strokeWidth = k * 0.015; canvas.drawPath(ipath1, is1);
  if (egHash5(h0) < 0.4) { ip1.color = 0xFFFFC93C; canvas.drawCircle(cx, bot - k * 0.08, k * 0.05, ip1); }
}

/** Croix andine (chakana) gravée, centre x, y, taille s. */
function inChakana1(canvas, x, y, s, col) {
  is1.color = col; is1.strokeWidth = s * 0.12;
  ipath1.reset();
  const u = s / 3, pts = [[-1, -3], [1, -3], [1, -1], [3, -1], [3, 1], [1, 1], [1, 3], [-1, 3], [-1, 1], [-3, 1], [-3, -1], [-1, -1]];
  pts.forEach(([a2, b2], i) => (i ? ipath1.lineTo(x + a2 * u / 2, y + b2 * u / 2) : ipath1.moveTo(x + a2 * u / 2, y + b2 * u / 2))); ipath1.close();
  canvas.drawPath(ipath1, is1); canvas.drawCircle(x, y, u * 0.45, is1);
}

function drawChapterDeco31(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind, dh = platformDepth * k;
  ip1.shader = null; is1.shader = null;
  if (kd === Kind.MOVING) {
    // Pont de cordes : planches, deux mains courantes de corde tressée qui pendent, liens verticaux
    is1.color = Color.argb(120, 60, 40, 20); is1.strokeWidth = k * 0.015;
    for (let i = -3; i <= 3; i++) canvas.drawLine(isoX(i * 0.26 * a, -0.95 * a), isoY(i * 0.26 * a, 0, -0.95 * a), isoX(i * 0.26 * a, 0.95 * a), isoY(i * 0.26 * a, 0, 0.95 * a), is1);
    for (const v of [-0.95, 0.95]) {
      const p0 = [isoX(-1.4 * a, v * a), isoY(-1.4 * a, 0.5, v * a)], p1 = [isoX(1.4 * a, v * a), isoY(1.4 * a, 0.5, v * a)];
      is1.color = 0xFFB89A5A; is1.strokeWidth = k * 0.04;
      ipath1.reset(); ipath1.moveTo(p0[0], p0[1]); ipath1.quadTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + k * 0.25, p1[0], p1[1]); canvas.drawPath(ipath1, is1);
      is1.color = 0xFF8A6A3A; is1.strokeWidth = k * 0.015;
      for (let i = 1; i < 6; i++) { const q = i / 6, x = (1 - q) * (1 - q) * p0[0] + 2 * (1 - q) * q * (p0[0] + p1[0]) / 2 + q * q * p1[0], y = (1 - q) * (1 - q) * p0[1] + 2 * (1 - q) * q * ((p0[1] + p1[1]) / 2 + k * 0.25) + q * q * p1[1]; canvas.drawLine(x, y, isoX((-1.4 + 2.8 * q) * a, v * a * 0.95), isoY((-1.4 + 2.8 * q) * a, 0, v * a * 0.95), is1); }
    }
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Tambour tissé : rayures andines sur le flanc, pompons tout autour du bord
    for (let s2 = 0; s2 < 5; s2++) {
      is1.color = IN1_WEAVE[s2]; is1.strokeWidth = k * 0.06;
      const y = dh * (0.2 + s2 * 0.15); irect1.set(-rx, y - ry, rx, y + ry); canvas.drawArc(irect1, 0, 180, false, is1);
    }
    for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2, bob = Math.sin(time * 4 + i) * k * 0.02 + pl.bounce * k * 0.05; ip1.color = IN1_WEAVE[i % 5]; canvas.drawCircle(Math.cos(an) * rx * 1.02, Math.sin(an) * ry * 1.02 + k * 0.05 + bob, k * 0.06, ip1); }
    return;
  }
  if (kd === Kind.CRUMBLY) {
    inWalls1(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      for (let i = 0; i < 10; i++) { const x = egHash5(h0 + i) * wd, y = egHash5(h0 + i + 50) * dh2; is1.color = Color.argb(right ? 80 : 110, 40, 38, 30); is1.strokeWidth = k * 0.014; cv.drawCircle(x, y, k * (0.05 + 0.05 * egHash5(h0 + i + 9)), is1); }
    });
    is1.color = Color.argb(150, 50, 48, 40); is1.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.25, -rx * 0.05, ry * 0.1, is1); canvas.drawLine(-rx * 0.05, ry * 0.1, rx * 0.45, -ry * 0.3, is1);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; ip1.color = Color.argb(Math.floor(170 * (1 - q)), 140, 136, 120); canvas.drawCircle(rx * (0.1 + 0.08 * i), ry * 0.2 + q * k * 0.5, k * 0.035, ip1); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  const bc = pl.baseColor;
  if (pl.round) {
    canvas.save(); canvas.scale(1, 0.577); inChakana1(canvas, 0, 0, rx * 0.9, Color.argb(150, 60, 56, 44)); canvas.restore();
    canvas.save(); canvas.translate(-k * 0.36, ry - k * 0.02); inPolyFace1(canvas, seed * 67, k * 0.72, dh, false); canvas.restore();
    return;
  }
  if (bc === IN1_GRASS) {
    // Terrasse : herbe tout autour du dessus (le centre reste libre), fleurs de cantuta
    inWalls1(canvas, pl, seed, inCourses1);
    ipath1.reset(); ipath1.moveTo(isoX(-0.9 * a, -0.9 * a), isoY(-0.9 * a, 0, -0.9 * a));
    for (const [u, v] of [[0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) ipath1.lineTo(isoX(u * a, v * a), isoY(u * a, 0, v * a));
    ipath1.close(); is1.color = 0xFF6AA848; is1.strokeWidth = k * 0.12; canvas.drawPath(ipath1, is1);
    is1.color = 0xFF8AC858; is1.strokeWidth = k * 0.05; canvas.drawPath(ipath1, is1);
    for (let i = 0; i < 6; i++) { const q = (i + 0.5) / 6, u = -0.9 + 1.8 * q; for (const [uu, vv] of [[u, -0.9], [-0.9, u]]) if ((i + seed) % 2) { ip1.color = 0xFFE8384A; canvas.drawCircle(isoX(uu * a, vv * a), isoY(uu * a, 0, vv * a) - k * 0.04, k * 0.035, ip1); } }
    return;
  }
  inWalls1(canvas, pl, seed, bc === IN1_NICHE ? inNicheFace1 : inPolyFace1);
}

/** Épi de maïs d'or à ramasser : grains en rangées, feuilles qui s'ouvrent (31). */
function drawChapterPickup31(canvas, cy, shadow) {
  const r = k * 0.2;
  ip1.shader = null;
  if (shadow) { ip1.color = Color.argb(45, 0, 0, 0); irect1.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(irect1, ip1); }
  ip1.color = Color.argb(Math.floor(60 + 40 * Math.sin(time * 4)), 255, 220, 120); canvas.drawCircle(0, cy, r * 1.4, ip1);
  canvas.save(); canvas.rotate(Math.sin(time * 2) * 12 + 15, 0, cy);
  for (const sd of [-1, 1]) { ip1.color = sd < 0 ? 0xFF8AB84A : 0xFFB8C850; ipath1.reset(); ipath1.moveTo(0, cy + r); ipath1.quadTo(sd * r * 0.7, cy + r * 0.2, sd * r * 0.4, cy - r * 0.6); ipath1.quadTo(sd * r * 0.2, cy + r * 0.2, 0, cy + r); canvas.drawPath(ipath1, ip1); }
  ip1.color = 0xFFE0A020; irect1.set(-r * 0.32, cy - r * 0.95, r * 0.32, cy + r * 0.7); canvas.drawOval(irect1, ip1);
  for (let row = 0; row < 7; row++) for (let c = 0; c < 3; c++) {
    const yy = cy - r * 0.75 + row * r * 0.22, xx = (c - 1) * r * 0.17 * (1 - Math.abs(row - 3) * 0.08);
    ip1.color = (row + c) % 2 ? 0xFFFFD24F : 0xFFFFE680; canvas.drawCircle(xx, yy, r * 0.085, ip1);
  }
  ip1.color = Color.argb(160, 255, 255, 255); canvas.drawCircle(-r * 0.12, cy - r * 0.5, r * 0.07, ip1);
  canvas.restore();
  return true;
}

/** Porte du Soleil à l'arrivée : linteau et montants trapézoïdaux, soleil d'Inti doré (31). */
function drawChapterFinish31(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  ip1.shader = null;
  ip1.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 210, 100); canvas.drawCircle(bx, by - k * 0.8, k * 0.6, ip1);
  ip1.color = 0xFFA8A490;
  ipath1.reset(); ipath1.moveTo(bx - k * 0.42, by); ipath1.lineTo(bx - k * 0.34, by - k * 0.86); ipath1.lineTo(bx + k * 0.34, by - k * 0.86); ipath1.lineTo(bx + k * 0.42, by); ipath1.lineTo(bx + k * 0.2, by); ipath1.lineTo(bx + k * 0.14, by - k * 0.56); ipath1.lineTo(bx - k * 0.14, by - k * 0.56); ipath1.lineTo(bx - k * 0.2, by); ipath1.close();
  canvas.drawPath(ipath1, ip1);
  is1.color = Color.argb(150, 50, 48, 40); is1.strokeWidth = k * 0.015; canvas.drawPath(ipath1, is1);
  ip1.color = 0xFFFFD24F; canvas.drawCircle(bx, by - k * 0.72, k * 0.09, ip1);
  is1.color = 0xFFFFD24F; is1.strokeWidth = k * 0.02;
  for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; canvas.drawLine(bx + Math.cos(an) * k * 0.11, by - k * 0.72 + Math.sin(an) * k * 0.11, bx + Math.cos(an) * k * 0.16, by - k * 0.72 + Math.sin(an) * k * 0.16, is1); }
}

/** Objet doré : le petit lama d'or (31). */
function drawCollectible31(canvas, c, x, y, r, got) {
  ip1.shader = null;
  const main = got ? 0xFFFFC93C : 0xFF9A9AA2, dark = got ? 0xFFC98A00 : 0xFF6E6E78;
  if (got) { ip1.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, ip1); }
  is1.color = main; is1.strokeWidth = r * 0.16;
  for (const u of [-0.35, -0.15, 0.25, 0.45]) canvas.drawLine(x + u * r, y + r * 0.15, x + u * r, y + r * 0.85, is1);
  ip1.color = main; irect1.set(x - r * 0.55, y - r * 0.25, x + r * 0.6, y + r * 0.35); canvas.drawOval(irect1, ip1);
  is1.strokeWidth = r * 0.24; canvas.drawLine(x - r * 0.4, y - r * 0.05, x - r * 0.48, y - r * 0.7, is1);
  irect1.set(x - r * 0.78, y - r * 0.92, x - r * 0.34, y - r * 0.62); canvas.drawOval(irect1, ip1);
  for (const u of [-0.5, -0.38]) { irect1.set(x + u * r - r * 0.05, y - r * 1.12, x + u * r + r * 0.05, y - r * 0.82); canvas.drawOval(irect1, ip1); }
  ip1.color = dark; canvas.drawCircle(x - r * 0.62, y - r * 0.8, r * 0.05, ip1);
  is1.color = dark; is1.strokeWidth = r * 0.05; canvas.drawLine(x - r * 0.2, y - r * 0.1, x + r * 0.4, y - r * 0.1, is1);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground31(canvas) {
  ip1.color = Color.WHITE; ip1.shader = new LinearGradient(0, 0, 0, h, [0xFF3A7AC8, 0xFFC8E0F0, 0xFF6AA850], [0, 0.5, 1]); canvas.drawRect(0, 0, w, h, ip1); ip1.shader = null;
}

/** Devant les blocs : toutes les 10 s, un banc de brouillard des Andes traverse l'écran et voile les blocs. */
function drawAndesFog31(canvas) {
  const u = time % 10;
  if (u < 5 || state === State.QUEST_END) return;
  const f = (u - 5) / 5, a = Math.sin(f * Math.PI);
  ip1.shader = null;
  for (let i = 0; i < 16; i++) {
    const h1 = hash01(i * 7 + 1), x = -w * 0.4 + (f * 1.6 + h1 * 0.5) * w, y = h * (0.3 + 0.5 * hash01(i * 13 + 4)), r = w * (0.18 + 0.12 * hash01(i * 5));
    for (let j = 0; j < 4; j++) { ip1.color = Color.argb(Math.round(26 * a), 245, 248, 252); canvas.drawCircle(x, y, r * (1.15 - j * 0.25), ip1); }
  }
}

/** Dessin propre au chapitre 31 (liste : chapterhooks.js). */
const CHAPTER_HOOKS_31 = {
  blockLook: chapterBlockLook31,
  deco: drawChapterDeco31,
  pickup: drawChapterPickup31,
  finish: drawChapterFinish31,
  collectible: drawCollectible31,
  mapBackground: drawChapterMapBackground31,
  overlay: drawAndesFog31,
};
