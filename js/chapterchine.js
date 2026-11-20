'use strict';
// Chapitre 29, Chine : la Grande Muraille (équivalent de ChapterChina.kt, appelé par chapterthemes5.js).
// Pierres de la muraille et leurs créneaux, laque rouge à pièces d'or, jade aux nuages dorés, lanternes volantes qui
// luisent (blocs mobiles), vieilles briques qui s'effritent, tambours de fête (trampolines), petites lanternes à
// ramasser, pagode à l'arrivée, enveloppe rouge dorée.

const cp9 = new Paint(), cs9 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const cpath9 = new Path(), crect9 = new RectF();
const CN9_STONE = 0xFFA89A88, CN9_RED = 0xFFC8322A, CN9_JADE = 0xFF3A8A7A;

function chapterBlockLook29(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(CN9_RED, 'lisse', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFFE8382A, 'lisse', true);      // lanterne volante
  if (k0 === Kind.CRUMBLY) return std(0xFF8A8078, 'granit', false);   // vieilles briques
  if (k0 === Kind.TRAMPOLINE) return std(0xFFB8221A, 'lisse', true);  // tambour de fête
  return c % 3 === 0 ? std(CN9_STONE, 'granit', false) : c % 3 === 1 ? std(CN9_RED, 'lisse', b.round) : std(CN9_JADE, 'lisse', false);
}

/** Faces latérales d'un bloc carré, chacune dans son repère (x sur wd, y sur dh). */
function cnWalls9(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 73 + 17, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Assises de briques décalées sur une face. */
function cnBricks9(canvas, wd, dh, rows, alpha) {
  cs9.color = Color.argb(alpha, 40, 32, 28); cs9.strokeWidth = k * 0.012;
  for (let r = 1; r < rows; r++) {
    canvas.drawLine(k * 0.03, r * dh / rows, wd - k * 0.03, r * dh / rows, cs9);
    for (let x = (r % 2) * k * 0.12 + k * 0.12; x < wd; x += k * 0.24) canvas.drawLine(x, (r - 1) * dh / rows, x, r * dh / rows, cs9);
  }
}

/** Pièce porte-bonheur (ronde, trou carré) en (x, y), rayon r. */
function cnCoin9(canvas, x, y, r, col, hole) {
  cp9.color = col; canvas.drawCircle(x, y, r, cp9);
  cp9.color = hole; canvas.drawRect(x - r * 0.32, y - r * 0.32, x + r * 0.32, y + r * 0.32, cp9);
  cs9.color = hole; cs9.strokeWidth = r * 0.1; canvas.drawCircle(x, y, r * 0.78, cs9);
}

/** Volute de nuage doré (spirale) en (x, y), taille s. */
function cnCloud9(canvas, x, y, s, col) {
  cs9.color = col; cs9.strokeWidth = s * 0.14;
  cpath9.reset(); cpath9.moveTo(x - s, y + s * 0.2); cpath9.quadTo(x - s, y - s * 0.6, x - s * 0.3, y - s * 0.5); cpath9.quadTo(x, y - s * 0.4, x - s * 0.15, y - s * 0.1);
  cpath9.moveTo(x - s * 0.3, y - s * 0.5); cpath9.quadTo(x + s * 0.3, y - s * 0.9, x + s * 0.6, y - s * 0.3); cpath9.quadTo(x + s * 0.8, y + s * 0.1, x + s, y + s * 0.2);
  cpath9.moveTo(x + s * 0.6, y - s * 0.3); cpath9.quadTo(x + s * 0.3, y - s * 0.1, x + s * 0.45, y + s * 0.05);
  canvas.drawPath(cpath9, cs9);
}

/** Face laquée rouge : cadre d'or, pièce porte-bonheur, volutes de nuages. */
function cnRedFace9(canvas, h0, wd, dh, right) {
  const gold = right ? 0xFFC8962E : 0xFFFFD24F;
  cs9.color = gold; cs9.strokeWidth = k * 0.025; canvas.drawRect(k * 0.08, k * 0.08, wd - k * 0.08, dh - k * 0.08, cs9);
  cs9.strokeWidth = k * 0.012; canvas.drawRect(k * 0.13, k * 0.13, wd - k * 0.13, dh - k * 0.13, cs9);
  cnCoin9(canvas, wd / 2, dh / 2, Math.min(wd, dh) * 0.16, gold, right ? 0xFF8A1A14 : 0xFFA8221A);
  if (egHash5(h0) < 0.6) { cnCloud9(canvas, wd * 0.22, dh * 0.82, k * 0.1, gold); cnCloud9(canvas, wd * 0.78, dh * 0.24, k * 0.1, gold); }
}

/** Face de jade : treillis doré et volutes de nuages. */
function cnJadeFace9(canvas, h0, wd, dh, right) {
  const gold = right ? Color.argb(200, 200, 150, 46) : Color.argb(230, 255, 210, 79);
  cs9.color = gold; cs9.strokeWidth = k * 0.02; canvas.drawRect(k * 0.06, k * 0.06, wd - k * 0.06, k * 0.2, cs9);
  for (let x = k * 0.12; x < wd - k * 0.08; x += k * 0.14) canvas.drawLine(x, k * 0.06, x, k * 0.2, cs9);
  const n = Math.max(2, Math.floor(wd / (k * 0.34)));
  for (let i = 0; i < n; i++) cnCloud9(canvas, (i + 0.5) * wd / n, dh * (egHash5(h0 + i) < 0.5 ? 0.55 : 0.72), k * 0.11, gold);
}

/** Merlon de créneau posé sur le dessus du bloc (centre u, v en demi-largeurs, côté s, hauteur hh). */
function cnMerlon9(canvas, a, u, v, s, hh, col) {
  const P = (uu, vv, y) => [isoX(uu * a, vv * a), isoY(uu * a, y, vv * a)];
  const c = [P(u - s, v - s, 0), P(u + s, v - s, 0), P(u + s, v + s, 0), P(u - s, v + s, 0)];
  const tp = [P(u - s, v - s, hh), P(u + s, v - s, hh), P(u + s, v + s, hh), P(u - s, v + s, hh)];
  const quad = (q, color) => { cpath9.reset(); cpath9.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) cpath9.lineTo(q[i][0], q[i][1]); cpath9.close(); cp9.color = color; canvas.drawPath(cpath9, cp9); };
  quad([c[3], c[2], tp[2], tp[3]], shade(col, 0.72));
  quad([c[1], c[2], tp[2], tp[1]], shade(col, 0.9));
  quad(tp, shade(col, 1.12));
}

function drawChapterDeco29(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind, dh = platformDepth * k;
  cp9.shader = null; cs9.shader = null;
  if (kd === Kind.MOVING) {
    // Lanterne volante : halo, côtes dorées, bords dorés, gland qui pend sous le bloc, flamme qui vacille
    const fl = 0.8 + 0.2 * Math.sin(time * 9 + seed);
    for (let i = 0; i < 3; i++) { cp9.color = Color.argb(Math.round(26 * fl), 255, 160, 70); canvas.drawCircle(0, dh * 0.4, rx * (1.3 + i * 0.35), cp9); }
    cp9.color = Color.argb(Math.round(70 * fl), 255, 230, 140); crect9.set(-rx * 0.7, ry * 0.2, rx * 0.7, dh * 0.85); canvas.drawOval(crect9, cp9);
    cs9.color = 0xFFFFD24F; cs9.strokeWidth = k * 0.02;
    for (let i = -3; i <= 3; i++) {
      const u = i / 3.4, x = Math.sin(u * Math.PI / 2) * rx, yt = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
      cpath9.reset(); cpath9.moveTo(x, yt); cpath9.quadTo(x * 1.08, yt + dh * 0.5, x, yt + dh); canvas.drawPath(cpath9, cs9);
    }
    cs9.strokeWidth = k * 0.05; crect9.set(-rx, -ry, rx, ry); canvas.drawOval(crect9, cs9);
    crect9.set(-rx, dh - ry, rx, dh + ry); canvas.drawArc(crect9, 0, 180, false, cs9);
    const sw = Math.sin(time * 2 + seed) * k * 0.06;
    cs9.strokeWidth = k * 0.03; canvas.drawLine(0, dh + ry, sw, dh + ry + k * 0.35, cs9);
    cp9.color = 0xFFE8382A; crect9.set(sw - k * 0.05, dh + ry + k * 0.3, sw + k * 0.05, dh + ry + k * 0.62); canvas.drawRect(crect9, cp9);
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Tambour de fête : rangées de clous dorés sur le flanc, anneaux dorés, baguettes croisées derrière
    for (let i = -7; i <= 7; i++) {
      const u = i / 7.5, x = Math.sin(u * Math.PI / 2) * rx * 0.98, yt = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
      cp9.color = 0xFFFFD24F; canvas.drawCircle(x, yt + k * 0.1, k * 0.032, cp9); canvas.drawCircle(x, yt + dh - k * 0.12, k * 0.032, cp9);
    }
    cs9.color = 0xFFE0A830; cs9.strokeWidth = k * 0.04; crect9.set(-rx * 0.98, -ry * 0.98, rx * 0.98, ry * 0.98); canvas.drawOval(crect9, cs9);
    const hit = pl.bounce * k * 0.15;
    for (const sd of [-1, 1]) {
      cs9.color = 0xFF8A5A2A; cs9.strokeWidth = k * 0.05; canvas.drawLine(sd * rx * 0.3, -ry * 0.9 - hit, -sd * rx * 0.7, -ry * 0.9 - k * 0.6, cs9);
      cp9.color = 0xFFE8382A; canvas.drawCircle(sd * rx * 0.3, -ry * 0.9 - hit, k * 0.07, cp9);
    }
    return;
  }
  if (kd === Kind.CRUMBLY) {
    cnWalls9(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      cnBricks9(cv, wd, dh2, 6, right ? 70 : 95);
      cs9.color = Color.argb(140, 40, 32, 28); cs9.strokeWidth = k * 0.018; cv.drawLine(wd * 0.3, 0, wd * 0.45, dh2 * 0.5, cs9); cv.drawLine(wd * 0.45, dh2 * 0.5, wd * 0.38, dh2, cs9);
    });
    cs9.color = Color.argb(150, 50, 40, 34); cs9.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.25, -rx * 0.05, ry * 0.1, cs9); canvas.drawLine(-rx * 0.05, ry * 0.1, rx * 0.45, -ry * 0.3, cs9);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; cp9.color = Color.argb(Math.floor(160 * (1 - q)), 170, 160, 150); canvas.drawCircle(rx * (0.1 + 0.08 * i), ry * 0.2 + q * k * 0.5, k * 0.03, cp9); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  const bc = pl.baseColor;
  if (pl.round) {
    // Pilier laqué : anneaux d'or sur le devant, pièce sur le dessus
    cs9.color = 0xFFFFD24F; cs9.strokeWidth = k * 0.05;
    for (const f of [0.18, 0.82]) { crect9.set(-rx, dh * f - ry, rx, dh * f + ry); canvas.drawArc(crect9, 0, 180, false, cs9); }
    canvas.save(); canvas.translate(isoX(-0.4 * a, -0.4 * a), isoY(-0.4 * a, 0, -0.4 * a)); canvas.scale(1, 0.58); cnCoin9(canvas, 0, 0, k * 0.14, 0xFFFFD24F, 0xFFA8221A); canvas.restore();
    return;
  }
  if (bc === CN9_STONE) {
    // Pierres de la muraille : briques, créneaux le long des deux bords du fond (le centre reste libre)
    cnWalls9(canvas, pl, seed, (cv, h0, wd, dh2, right) => cnBricks9(cv, wd, dh2, 7, right ? 60 : 80));
    for (let i = 0; i < 3; i++) {
      const q = -0.62 + i * 0.62;
      cnMerlon9(canvas, a, -0.8, q, 0.14, 0.22, CN9_STONE);
      cnMerlon9(canvas, a, q, -0.8, 0.14, 0.22, CN9_STONE);
    }
    return;
  }
  cnWalls9(canvas, pl, seed, bc === CN9_RED ? cnRedFace9 : cnJadeFace9);
  if (seed % 3 === 0) { canvas.save(); canvas.translate(isoX(-0.5 * a, -0.5 * a), isoY(-0.5 * a, 0, -0.5 * a)); canvas.scale(1, 0.58); cnCoin9(canvas, 0, 0, k * 0.13, 0xFFFFD24F, bc === CN9_RED ? 0xFFA8221A : 0xFF2A6A5A); canvas.restore(); }
}

/** Petite lanterne rouge à ramasser, qui se balance et luit (29). */
function drawChapterPickup29(canvas, cy, shadow) {
  const r = k * 0.16;
  cp9.shader = null;
  if (shadow) { cp9.color = Color.argb(45, 0, 0, 0); crect9.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(crect9, cp9); }
  canvas.save(); canvas.rotate(Math.sin(time * 2.2) * 10, 0, cy - r * 1.4);
  cp9.color = Color.argb(Math.floor(70 + 40 * Math.sin(time * 5)), 255, 150, 60); canvas.drawCircle(0, cy, r * 1.8, cp9);
  cs9.color = 0xFF3A2418; cs9.strokeWidth = r * 0.08; canvas.drawLine(0, cy - r * 1.5, 0, cy - r * 0.9, cs9);
  cp9.color = 0xFFE8382A; crect9.set(-r, cy - r * 0.86, r, cy + r * 0.86); canvas.drawOval(crect9, cp9);
  cp9.color = Color.argb(150, 255, 200, 120); crect9.set(-r * 0.5, cy - r * 0.6, r * 0.3, cy + r * 0.4); canvas.drawOval(crect9, cp9);
  cs9.color = 0xFFFFD24F; cs9.strokeWidth = r * 0.07;
  for (const u of [-0.5, 0, 0.5]) { crect9.set(-r * Math.abs(u) - 1, cy - r * 0.86, r * Math.abs(u) + 1, cy + r * 0.86); canvas.drawOval(crect9, cs9); }
  cp9.color = 0xFFFFD24F; canvas.drawRect(-r * 0.45, cy - r * 1.0, r * 0.45, cy - r * 0.8, cp9); canvas.drawRect(-r * 0.45, cy + r * 0.8, r * 0.45, cy + r * 1.0, cp9);
  canvas.drawLine(0, cy + r, 0, cy + r * 1.5, cs9);
  cp9.color = 0xFFE8382A; canvas.drawRect(-r * 0.12, cy + r * 1.4, r * 0.12, cy + r * 1.9, cp9);
  canvas.restore();
  return true;
}

/** Pagode à trois toits relevés à l'arrivée, flèche dorée (29). */
function drawChapterFinish29(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  cp9.shader = null;
  cp9.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 190, 90); canvas.drawCircle(bx, by - k * 1.0, k * 0.6, cp9);
  let y = by;
  for (const [hw, th] of [[0.3, 0.3], [0.24, 0.26], [0.18, 0.24]]) {
    cp9.color = 0xFFC8322A; canvas.drawRect(bx - k * hw * 0.72, y - k * th, bx + k * hw * 0.72, y, cp9);
    cp9.color = 0xFFFFD24F; canvas.drawRect(bx - k * hw * 0.2, y - k * th * 0.7, bx + k * hw * 0.2, y - k * th * 0.2, cp9);
    const ry2 = y - k * th;
    cpath9.reset(); cpath9.moveTo(bx - k * hw * 1.3, ry2 + k * 0.02); cpath9.quadTo(bx - k * hw * 0.9, ry2 + k * 0.06, bx - k * hw * 0.5, ry2 + k * 0.02);
    cpath9.lineTo(bx + k * hw * 0.5, ry2 + k * 0.02); cpath9.quadTo(bx + k * hw * 0.9, ry2 + k * 0.06, bx + k * hw * 1.3, ry2 + k * 0.02);
    cpath9.lineTo(bx + k * hw * 0.4, ry2 - k * 0.12); cpath9.lineTo(bx - k * hw * 0.4, ry2 - k * 0.12); cpath9.close();
    cp9.color = 0xFF2A5A4A; canvas.drawPath(cpath9, cp9);
    cs9.color = 0xFFE8B84A; cs9.strokeWidth = k * 0.02; canvas.drawLine(bx - k * hw * 1.3, ry2 + k * 0.02, bx + k * hw * 1.3, ry2 + k * 0.02, cs9);
    y = ry2 - k * 0.1;
  }
  cs9.color = 0xFFFFD24F; cs9.strokeWidth = k * 0.03; canvas.drawLine(bx, y, bx, y - k * 0.22, cs9);
  cp9.color = 0xFFFFD24F; canvas.drawCircle(bx, y - k * 0.08, k * 0.04, cp9); canvas.drawCircle(bx, y - k * 0.16, k * 0.035, cp9);
}

/** Objet doré : l'enveloppe rouge du Nouvel An, pièce porte-bonheur dorée (29). */
function drawCollectible29(canvas, c, x, y, r, got) {
  cp9.shader = null;
  const main = got ? 0xFFE8382A : 0xFF9A9AA2, gold = got ? 0xFFFFC93C : 0xFF6E6E78;
  if (got) { cp9.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, cp9); }
  cp9.color = main; crect9.set(x - r * 0.62, y - r * 0.9, x + r * 0.62, y + r * 0.9); canvas.drawRoundRect(crect9, r * 0.12, r * 0.12, cp9);
  cpath9.reset(); cpath9.moveTo(x - r * 0.62, y - r * 0.6); cpath9.lineTo(x, y - r * 0.15); cpath9.lineTo(x + r * 0.62, y - r * 0.6);
  cs9.color = gold; cs9.strokeWidth = r * 0.08; canvas.drawPath(cpath9, cs9);
  cnCoin9(canvas, x, y + r * 0.25, r * 0.32, gold, main);
  cs9.color = gold; cs9.strokeWidth = r * 0.08; canvas.drawRoundRect(crect9, r * 0.12, r * 0.12, cs9);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground29(canvas) {
  cp9.color = Color.WHITE; cp9.shader = new LinearGradient(0, 0, 0, h, [0xFF070A26, 0xFF3A2A6A, 0xFFE8705A], [0, 0.5, 1]); canvas.drawRect(0, 0, w, h, cp9); cp9.shader = null;
}
