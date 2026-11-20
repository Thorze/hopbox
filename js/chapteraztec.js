'use strict';
// Chapitre 30, Aztèques : la cité d'or (équivalent de ChapterAztec.kt, appelé par chapterthemes5.js).
// Pierre sculptée à grecques, mosaïque de turquoise, ocre rouge au soleil d'or, tambours en pierre du Soleil, jardins
// flottants (blocs mobiles), vieilles pierres qui s'effritent, couronnes de plumes de quetzal (trampolines), masques
// d'or à ramasser, temple jumeau à l'arrivée, soleil d'or. Particularité : les plaques d'or glissent (les blocs de
// glace du jeu, redessinés en or : drawGoldSlide30).

const ap0 = new Paint(), as0 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const apath0 = new Path(), arect0 = new RectF();
const AZ0_STONE = 0xFFC8B090, AZ0_TURQ = 0xFF3AA8A0, AZ0_RED = 0xFFB8442A, AZ0_GOLD = 0xFFE8B030;

function chapterBlockLook30(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(0xFFD8C0A0, 'granit', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.ICE) return std(AZ0_GOLD, 'metal', false);          // plaque d'or qui glisse
  if (k0 === Kind.MOVING) return std(0xFF6A4A2A, 'granit', false);    // jardin flottant
  if (k0 === Kind.CRUMBLY) return std(0xFFA89880, 'granit', false);   // vieille pierre
  if (k0 === Kind.TRAMPOLINE) return std(0xFF3A9A8A, 'lisse', true);  // couronne de plumes
  return c % 3 === 0 ? std(AZ0_STONE, 'granit', b.round) : c % 3 === 1 ? std(AZ0_TURQ, 'lisse', false) : std(AZ0_RED, 'granit', false);
}

/** Faces latérales d'un bloc carré, chacune dans son repère (x sur wd, y sur dh). */
function azWalls0(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 71 + 19, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Grecque aztèque (crochets en escalier) le long d'une bande. */
function azFret0(canvas, x0, x1, y, u, col) {
  as0.color = col; as0.strokeWidth = u * 0.18;
  apath0.reset();
  for (let x = x0; x + u * 1.1 <= x1; x += u * 1.6) {
    apath0.moveTo(x, y + u / 2); apath0.lineTo(x + u * 0.4, y - u / 2); apath0.lineTo(x + u, y - u / 2); apath0.lineTo(x + u, y); apath0.lineTo(x + u * 0.7, y);
  }
  canvas.drawPath(apath0, as0);
}

/** Soleil d'or : disque et rayons triangulaires (centre x, y, rayon r). */
function azSun0(canvas, x, y, r, col, dark) {
  ap0.color = col;
  for (let i = 0; i < 8; i++) {
    const an = i * Math.PI / 4;
    apath0.reset(); apath0.moveTo(x + Math.cos(an - 0.22) * r * 0.62, y + Math.sin(an - 0.22) * r * 0.62); apath0.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); apath0.lineTo(x + Math.cos(an + 0.22) * r * 0.62, y + Math.sin(an + 0.22) * r * 0.62); apath0.close();
    canvas.drawPath(apath0, ap0);
  }
  canvas.drawCircle(x, y, r * 0.58, ap0);
  as0.color = dark; as0.strokeWidth = r * 0.06; canvas.drawCircle(x, y, r * 0.42, as0);
  ap0.color = dark; canvas.drawCircle(x - r * 0.14, y - r * 0.06, r * 0.06, ap0); canvas.drawCircle(x + r * 0.14, y - r * 0.06, r * 0.06, ap0);
  canvas.drawRect(x - r * 0.12, y + r * 0.12, x + r * 0.12, y + r * 0.18, ap0);
}

/** Face de pierre sculptée : grecque rouge en haut, signe « ollin » (mouvement) gravé. */
function azStoneFace0(canvas, h0, wd, dh, right) {
  const dk = right ? 0.7 : 1;
  azFret0(canvas, k * 0.08, wd - k * 0.08, k * 0.17, k * 0.13, Color.argb(Math.round(220 * dk), 150, 46, 30));
  as0.color = Color.argb(Math.round(70 * dk), 80, 60, 40); as0.strokeWidth = k * 0.012; canvas.drawLine(k * 0.04, k * 0.3, wd - k * 0.04, k * 0.3, as0);
  if (egHash5(h0) < 0.7) {
    const cx = wd / 2, cy = dh * 0.62, s = Math.min(wd, dh) * 0.26;
    as0.color = Color.argb(Math.round(150 * dk), 90, 64, 40); as0.strokeWidth = k * 0.025;
    canvas.drawLine(cx - s, cy - s * 0.8, cx + s, cy + s * 0.8, as0); canvas.drawLine(cx + s, cy - s * 0.8, cx - s, cy + s * 0.8, as0);
    canvas.drawCircle(cx, cy, s * 0.32, as0);
    for (const [ex, ey] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) canvas.drawCircle(cx + ex * s * 1.05, cy + ey * s * 0.85, s * 0.12, as0);
  }
}

/** Face de mosaïque de turquoise : petites tesselles de nuances variées, cadre d'or. */
function azTurqFace0(canvas, h0, wd, dh, right) {
  const sz = k * 0.1, dk = right ? 0.75 : 1;
  for (let y = k * 0.06, r = 0; y < dh - k * 0.06; y += sz, r++) for (let x = k * 0.06, c = 0; x < wd - k * 0.06; x += sz, c++) {
    const hh = egHash5(h0 + r * 31 + c * 7), g2 = 150 + Math.round(70 * hh), b2 = 140 + Math.round(60 * hh);
    ap0.color = Color.argb(255, Math.round(40 * dk), Math.round(g2 * dk), Math.round(b2 * dk)); canvas.drawRect(x + k * 0.008, y + k * 0.008, x + sz - k * 0.008, y + sz - k * 0.008, ap0);
  }
  as0.color = right ? 0xFFC8962E : 0xFFFFD24F; as0.strokeWidth = k * 0.03; canvas.drawRect(k * 0.04, k * 0.04, wd - k * 0.04, dh - k * 0.04, as0);
}

/** Face d'ocre rouge : soleil d'or au centre, liseré d'or et petits disques. */
function azRedFace0(canvas, h0, wd, dh, right) {
  const gold = right ? 0xFFC8962E : 0xFFFFD24F;
  as0.color = gold; as0.strokeWidth = k * 0.02; canvas.drawRect(k * 0.07, k * 0.07, wd - k * 0.07, dh - k * 0.07, as0);
  azSun0(canvas, wd / 2, dh / 2, Math.min(wd, dh) * 0.3, gold, right ? 0xFF8A2A1A : 0xFFA83A22);
  for (let i = 0; i < 4; i++) { ap0.color = gold; canvas.drawCircle(k * 0.16 + i * (wd - k * 0.32) / 3, dh - k * 0.16, k * 0.03, ap0); }
}

/** Plaque d'or glissante (bloc de glace du chapitre 30) : or poli, reflet qui balaie le dessus, soleils gravés. */
function drawGoldSlide30(canvas, pl) {
  drawTexturedBox(canvas, pl, 'metal');
  const a = pl.half, cxk = 0.8660254 * k, syk = 0.5 * k, lX = -2 * a * cxk, rX = 2 * a * cxk, fY = 2 * a * syk, bY = -2 * a * syk;
  ap0.shader = null; as0.shader = null;
  // Reflet qui balaie le dessus
  canvas.save();
  apath0.reset(); apath0.moveTo(0, bY); apath0.lineTo(rX, 0); apath0.lineTo(0, fY); apath0.lineTo(lX, 0); apath0.close(); canvas.clipPath(apath0);
  const q = ((time * 0.6 + pl.movePhase) % 2) - 0.5, gx = lX + (rX - lX) * q;
  apath0.reset(); apath0.moveTo(gx - k * 0.2, bY); apath0.lineTo(gx + k * 0.1, bY); apath0.lineTo(gx + k * 0.6, fY); apath0.lineTo(gx + k * 0.3, fY); apath0.close();
  ap0.color = Color.argb(150, 255, 255, 230); canvas.drawPath(apath0, ap0);
  canvas.restore();
  as0.color = Color.argb(200, 255, 246, 200); as0.strokeWidth = k * 0.03;
  apath0.reset(); apath0.moveTo(0, bY * 0.82); apath0.lineTo(rX * 0.82, 0); apath0.lineTo(0, fY * 0.82); apath0.lineTo(lX * 0.82, 0); apath0.close(); canvas.drawPath(apath0, as0);
  // Soleils gravés sur les deux faces, étincelles
  azWalls0(canvas, pl, Math.abs(Math.trunc(pl.cx * 7 + pl.cz * 13)), (cv, h0, wd, dh, right) => {
    azSun0(cv, wd / 2, dh / 2, Math.min(wd, dh) * 0.28, right ? 0xFFB8862A : 0xFFFFE07A, right ? 0xFF8A5A10 : 0xFFC8902A);
  });
  for (let i = 0; i < 3; i++) {
    const tw = Math.abs(Math.sin(time * 3 + i * 2.1 + pl.movePhase)), x = (i - 1) * a * 0.55 * 1.2247449 * k, y = ((i % 2) - 0.5) * a * 0.5 * 0.70710677 * k, r = k * (0.04 + 0.06 * tw);
    as0.color = Color.argb(Math.round(230 * tw), 255, 255, 230); as0.strokeWidth = k * 0.025;
    canvas.drawLine(x - r, y, x + r, y, as0); canvas.drawLine(x, y - r, x, y + r, as0);
  }
}

function drawChapterDeco30(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind, dh = platformDepth * k;
  ap0.shader = null; as0.shader = null;
  if (kd === Kind.ICE) return;
  if (kd === Kind.MOVING) {
    // Jardin flottant : rides sur l'eau, terre et racines sur les faces, massifs et œillets d'Inde sur les bords
    for (let i = 0; i < 2; i++) { const q = (time * 0.7 + i * 0.5) % 1; as0.color = Color.argb(Math.floor(110 * (1 - q)), 210, 240, 255); as0.strokeWidth = k * 0.025; arect0.set(-rx * (1.1 + q * 0.4), dh * 0.8 - ry * (1.1 + q * 0.4), rx * (1.1 + q * 0.4), dh * 0.8 + ry * (1.1 + q * 0.4)); canvas.drawOval(arect0, as0); }
    azWalls0(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      as0.color = Color.argb(right ? 90 : 120, 40, 26, 14); as0.strokeWidth = k * 0.014;
      for (let i = 0; i < 5; i++) { const x = (i + 0.5) * wd / 5; apath0.reset(); apath0.moveTo(x, dh2 * 0.3); apath0.quadTo(x + k * 0.05, dh2 * 0.6, x - k * 0.03, dh2 * 0.95); cv.drawPath(apath0, as0); }
      ap0.color = Color.argb(right ? 120 : 150, 90, 160, 200); cv.drawRect(0, dh2 * 0.78, wd, dh2, ap0);
    });
    for (let i = 0; i < 4; i++) {
      const q = (i + 0.5) / 4;
      for (const [u, v] of [[-0.8, -0.8 + 1.6 * q], [-0.8 + 1.6 * q, -0.8]]) {
        const x = isoX(u * a, v * a), y = isoY(u * a, 0, v * a), r = k * (0.1 + 0.03 * ((seed + i) % 3));
        ap0.color = 0xFF3E7A2A; canvas.drawCircle(x, y, r, ap0); ap0.color = 0xFF6AA844; canvas.drawCircle(x - r * 0.2, y - r * 0.25, r * 0.6, ap0);
        ap0.color = (i + seed) % 2 ? 0xFFFF8A20 : 0xFFFFC030; canvas.drawCircle(x + r * 0.35, y - r * 0.3, r * 0.22, ap0);
      }
    }
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Couronne de plumes de quetzal derrière, disque de turquoise et d'or
    const cols = [0xFF2E9A5A, 0xFF3AB0C8, 0xFFE8384A, 0xFFFFC93C, 0xFF2E9A5A, 0xFF3AB0C8, 0xFFE8384A, 0xFFFFC93C, 0xFF2E9A5A];
    for (let i = 0; i < 9; i++) {
      const u = i / 8 - 0.5, an = -Math.PI / 2 + u * 2.4, bx = Math.cos(an) * rx * 0.75, by = Math.sin(an) * ry * 0.75 - k * 0.05, len = k * (0.75 + 0.15 * Math.cos(u * Math.PI)) + pl.bounce * k * 0.08;
      const ex = bx + Math.cos(an) * len * 0.5 + Math.sin(time * 2 + i) * k * 0.03, ey = by + Math.sin(an) * len * 0.3 - len * 0.7;
      ap0.color = cols[i]; apath0.reset(); apath0.moveTo(bx - k * 0.05, by); apath0.quadTo(ex - k * 0.1, (by + ey) / 2, ex, ey); apath0.quadTo(ex + k * 0.1, (by + ey) / 2, bx + k * 0.05, by); apath0.close(); canvas.drawPath(apath0, ap0);
      as0.color = Color.argb(160, 255, 255, 255); as0.strokeWidth = k * 0.01; canvas.drawLine(bx, by, ex, ey, as0);
    }
    as0.color = 0xFFFFD24F; as0.strokeWidth = k * 0.04; arect0.set(-rx * 0.97, -ry * 0.97, rx * 0.97, ry * 0.97); canvas.drawOval(arect0, as0);
    return;
  }
  if (kd === Kind.CRUMBLY) {
    azWalls0(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      azFret0(cv, k * 0.08, wd - k * 0.08, k * 0.17, k * 0.13, Color.argb(right ? 110 : 150, 130, 46, 30));
      as0.color = Color.argb(130, 60, 44, 30); as0.strokeWidth = k * 0.016; cv.drawLine(wd * 0.32, k * 0.25, wd * 0.48, dh2 * 0.55, as0); cv.drawLine(wd * 0.48, dh2 * 0.55, wd * 0.4, dh2, as0);
    });
    as0.color = Color.argb(150, 70, 54, 40); as0.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.25, -rx * 0.05, ry * 0.1, as0); canvas.drawLine(-rx * 0.05, ry * 0.1, rx * 0.45, -ry * 0.3, as0);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; ap0.color = Color.argb(Math.floor(160 * (1 - q)), 190, 170, 140); canvas.drawCircle(rx * (0.1 + 0.08 * i), ry * 0.2 + q * k * 0.5, k * 0.03, ap0); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  const bc = pl.baseColor;
  if (pl.round) {
    // Tambour de pierre : pierre du Soleil sculptée sur le dessus, grecque sur le devant
    canvas.save(); canvas.scale(1, 0.577);
    as0.color = Color.argb(150, 90, 64, 40); as0.strokeWidth = k * 0.02;
    for (const f of [0.92, 0.7, 0.5]) canvas.drawCircle(0, 0, rx * f, as0);
    for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8; canvas.drawLine(Math.cos(an) * rx * 0.5, Math.sin(an) * rx * 0.5, Math.cos(an) * rx * 0.7, Math.sin(an) * rx * 0.7, as0); }
    canvas.restore();
    canvas.save(); canvas.translate(-k * 0.36, ry - k * 0.02); azFret0(canvas, 0, k * 0.72, k * 0.18, k * 0.12, Color.argb(210, 150, 46, 30)); canvas.restore();
    return;
  }
  azWalls0(canvas, pl, seed, bc === AZ0_STONE ? azStoneFace0 : bc === AZ0_TURQ ? azTurqFace0 : azRedFace0);
  if (bc === AZ0_RED && seed % 2 === 0) { canvas.save(); canvas.translate(isoX(-0.5 * a, -0.5 * a), isoY(-0.5 * a, 0, -0.5 * a)); canvas.scale(1, 0.58); azSun0(canvas, 0, 0, k * 0.15, 0xFFFFD24F, 0xFFA83A22); canvas.restore(); }
}

/** Masque d'or à ramasser : yeux de turquoise, ornement de nez, boucles d'oreilles (30). */
function drawChapterPickup30(canvas, cy, shadow) {
  const r = k * 0.19;
  ap0.shader = null;
  if (shadow) { ap0.color = Color.argb(45, 0, 0, 0); arect0.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(arect0, ap0); }
  ap0.color = Color.argb(Math.floor(60 + 40 * Math.sin(time * 4)), 255, 220, 120); canvas.drawCircle(0, cy, r * 1.45, ap0);
  canvas.save(); canvas.rotate(Math.sin(time * 2) * 8, 0, cy);
  for (const sd of [-1, 1]) { ap0.color = 0xFF3AB0A8; canvas.drawCircle(sd * r * 0.92, cy, r * 0.22, ap0); ap0.color = 0xFFFFD24F; canvas.drawCircle(sd * r * 0.92, cy, r * 0.1, ap0); }
  ap0.color = 0xFFB8862A; arect0.set(-r * 0.78 + r * 0.06, cy - r * 0.92 + r * 0.06, r * 0.78 + r * 0.06, cy + r * 0.98 + r * 0.06); canvas.drawRoundRect(arect0, r * 0.5, r * 0.6, ap0);
  ap0.color = 0xFFFFC93C; arect0.set(-r * 0.78, cy - r * 0.92, r * 0.78, cy + r * 0.98); canvas.drawRoundRect(arect0, r * 0.5, r * 0.6, ap0);
  ap0.color = 0xFFFFE08A; arect0.set(-r * 0.6, cy - r * 0.8, r * 0.1, cy - r * 0.3); canvas.drawOval(arect0, ap0);
  for (const sd of [-1, 1]) { ap0.color = 0xFFFFFFFF; arect0.set(sd * r * 0.32 - r * 0.18, cy - r * 0.3, sd * r * 0.32 + r * 0.18, cy - r * 0.1); canvas.drawOval(arect0, ap0); ap0.color = 0xFF2A8A88; canvas.drawCircle(sd * r * 0.32, cy - r * 0.2, r * 0.08, ap0); }
  ap0.color = 0xFFB8862A; apath0.reset(); apath0.moveTo(0, cy - r * 0.1); apath0.lineTo(-r * 0.12, cy + r * 0.25); apath0.lineTo(r * 0.12, cy + r * 0.25); apath0.close(); canvas.drawPath(apath0, ap0);
  ap0.color = 0xFF3AB0A8; arect0.set(-r * 0.22, cy + r * 0.28, r * 0.22, cy + r * 0.4); canvas.drawOval(arect0, ap0);
  ap0.color = 0xFF8A3A1A; arect0.set(-r * 0.3, cy + r * 0.5, r * 0.3, cy + r * 0.66); canvas.drawRoundRect(arect0, r * 0.08, r * 0.08, ap0);
  canvas.restore();
  return true;
}

/** Petit temple jumeau à l'arrivée : degrés, double escalier, sanctuaires bleu et rouge (30). */
function drawChapterFinish30(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  ap0.shader = null;
  ap0.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 210, 100); canvas.drawCircle(bx, by - k * 0.9, k * 0.6, ap0);
  let y = by;
  for (let i = 0; i < 4; i++) {
    const hw = k * (0.42 - i * 0.07), t = y - k * 0.16;
    ap0.color = 0xFFB89A78; canvas.drawRect(bx - hw, t, bx, y, ap0);
    ap0.color = 0xFFE0C8A0; canvas.drawRect(bx, t, bx + hw, y, ap0);
    ap0.color = Color.argb(160, 150, 46, 30); canvas.drawRect(bx - hw, t + k * 0.05, bx + hw, t + k * 0.07, ap0);
    y = t;
  }
  ap0.color = 0xFFF2E0C0; canvas.drawRect(bx - k * 0.08, y, bx + k * 0.08, by, ap0);
  for (const [sd, c0] of [[-1, 0xFF3A7AC8], [1, 0xFFC8322A]]) {
    ap0.color = c0; canvas.drawRect(bx + sd * k * 0.12 - k * 0.08, y - k * 0.22, bx + sd * k * 0.12 + k * 0.08, y, ap0);
    ap0.color = 0xFF2A1810; canvas.drawRect(bx + sd * k * 0.12 - k * 0.03, y - k * 0.1, bx + sd * k * 0.12 + k * 0.03, y, ap0);
  }
  ap0.color = 0xFFFFD24F; canvas.drawCircle(bx, y - k * 0.3, k * 0.06, ap0);
}

/** Objet doré : le soleil d'or (pierre du Soleil) (30). */
function drawCollectible30(canvas, c, x, y, r, got) {
  ap0.shader = null;
  const main = got ? 0xFFFFC93C : 0xFF9A9AA2, dark = got ? 0xFFC98A00 : 0xFF6E6E78;
  if (got) { ap0.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, ap0); }
  azSun0(canvas, x, y, r, main, dark);
  as0.color = dark; as0.strokeWidth = r * 0.05; canvas.drawCircle(x, y, r * 0.58, as0);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground30(canvas) {
  ap0.color = Color.WHITE; ap0.shader = new LinearGradient(0, 0, 0, h, [0xFF2A3A8A, 0xFFE8908A, 0xFFFFE0A0], [0, 0.4, 1]); canvas.drawRect(0, 0, w, h, ap0); ap0.shader = null;
}
