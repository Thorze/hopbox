'use strict';
// Chapitre 27, Grèce : le festin de l'Olympe (équivalent de ChapterOlympus.kt, appelé par chapterthemes5.js).
// Blocs de marbre à frise grecque (métopes peintes à figures noires), tambours de colonne cannelés, nuages qui
// dérivent (blocs mobiles), marbre fendu qui s'effrite, lyre d'Apollon (trampolines), couronnes de laurier à
// ramasser, petit temple à l'arrivée, chouette d'Athéna dorée. Particularité : Zeus foudroie le bloc suivant.

const op7 = new Paint(), os7 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const opath7 = new Path(), orect7 = new RectF();
const OL7_MARBLE = [0xFFF2EEE6, 0xFFF6F2EA, 0xFFEDE6D8];

function chapterBlockLook27(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(0xFFF2EEE6, 'marbre', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFFF4F8FF, 'lisse', true);       // nuage qui dérive
  if (k0 === Kind.CRUMBLY) return std(0xFFE8E0D0, 'marbre', false);    // marbre fendu
  if (k0 === Kind.TRAMPOLINE) return std(0xFF4A6AA8, 'lisse', true);   // lyre d'Apollon
  // Un bloc sur trois : tambour de colonne cannelé (rond) ; sinon bloc de marbre à frise
  return c % 3 === 1 ? std(OL7_MARBLE[1], 'marbre', true) : std(OL7_MARBLE[c % 3], 'marbre', false);
}

/** Frise de méandres (grecque) le long d'une bande (x0 → x1, centre y, hauteur u). */
function olMeander7(canvas, x0, x1, y, u, col) {
  os7.color = col; os7.strokeWidth = u * 0.16;
  opath7.reset();
  for (let x = x0; x + u * 1.2 <= x1; x += u * 1.4) {
    opath7.moveTo(x, y + u / 2); opath7.lineTo(x, y - u / 2); opath7.lineTo(x + u, y - u / 2); opath7.lineTo(x + u, y + u * 0.15);
    opath7.lineTo(x + u * 0.4, y + u * 0.15); opath7.lineTo(x + u * 0.4, y - u * 0.1);
  }
  opath7.moveTo(x0, y + u / 2); opath7.lineTo(x1, y + u / 2);
  canvas.drawPath(opath7, os7);
}

/** Petite scène à figures noires sur fond ocre (centre x, y, hauteur s) : 0 chouette, 1 coureur, 2 rameau d'olivier. */
function olFigure7(canvas, kind, x, y, s, ink) {
  op7.color = ink; os7.color = ink;
  if (kind === 0) {
    orect7.set(x - s * 0.22, y - s * 0.3, x + s * 0.22, y + s * 0.36); canvas.drawOval(orect7, op7);
    canvas.drawCircle(x, y - s * 0.32, s * 0.2, op7);
    opath7.reset(); opath7.moveTo(x - s * 0.18, y - s * 0.42); opath7.lineTo(x - s * 0.22, y - s * 0.58); opath7.lineTo(x - s * 0.06, y - s * 0.48);
    opath7.moveTo(x + s * 0.18, y - s * 0.42); opath7.lineTo(x + s * 0.22, y - s * 0.58); opath7.lineTo(x + s * 0.06, y - s * 0.48); canvas.drawPath(opath7, op7);
    op7.color = 0xFFE89A4A; canvas.drawCircle(x - s * 0.08, y - s * 0.34, s * 0.06, op7); canvas.drawCircle(x + s * 0.08, y - s * 0.34, s * 0.06, op7);
  } else if (kind === 1) {
    canvas.drawCircle(x + s * 0.08, y - s * 0.42, s * 0.1, op7);
    os7.strokeWidth = s * 0.1;
    canvas.drawLine(x + s * 0.05, y - s * 0.3, x - s * 0.02, y + s * 0.05, os7);
    canvas.drawLine(x - s * 0.02, y + s * 0.05, x + s * 0.24, y + s * 0.2, os7); canvas.drawLine(x + s * 0.24, y + s * 0.2, x + s * 0.2, y + s * 0.42, os7);
    canvas.drawLine(x - s * 0.02, y + s * 0.05, x - s * 0.2, y + s * 0.24, os7); canvas.drawLine(x - s * 0.2, y + s * 0.24, x - s * 0.36, y + s * 0.2, os7);
    os7.strokeWidth = s * 0.07;
    canvas.drawLine(x + s * 0.04, y - s * 0.22, x + s * 0.28, y - s * 0.32, os7); canvas.drawLine(x + s * 0.04, y - s * 0.22, x - s * 0.22, y - s * 0.12, os7);
  } else {
    os7.strokeWidth = s * 0.05;
    canvas.drawLine(x - s * 0.4, y + s * 0.3, x + s * 0.4, y - s * 0.3, os7);
    for (let i = 0; i < 6; i++) {
      const q = (i + 0.5) / 6, px = x - s * 0.4 + q * s * 0.8, py = y + s * 0.3 - q * s * 0.6;
      for (const sd of [-1, 1]) { orect7.set(px - s * 0.12, py + sd * s * 0.1 - s * 0.04, px + s * 0.12, py + sd * s * 0.1 + s * 0.04); canvas.drawOval(orect7, op7); }
    }
  }
}

/** Une face de marbre (repère de la face : x sur wd, y sur dh) : veines, frise grecque, denticules, métope peinte. */
function olMarbleFace7(canvas, h0, wd, dh, right) {
  const dk = right ? 0.7 : 1, m = k * 0.08;
  // Veines grises du marbre
  os7.color = Color.argb(Math.round(45 * dk), 120, 120, 130); os7.strokeWidth = k * 0.01;
  for (let i = 0; i < 3; i++) {
    const y0 = dh * (0.25 + 0.25 * i) + egHash5(h0 + i) * dh * 0.15;
    opath7.reset(); opath7.moveTo(k * 0.04, y0);
    opath7.quadTo(wd * 0.35, y0 - dh * 0.1 * egHash5(h0 + 9 + i), wd * 0.6, y0 + dh * 0.05); opath7.quadTo(wd * 0.8, y0 + dh * 0.12, wd - k * 0.04, y0 - dh * 0.02);
    canvas.drawPath(opath7, os7);
  }
  // Frise grecque en haut : bleue ou ocre rouge, denticules dessous
  const blue = egHash5(h0 + 1) < 0.6;
  olMeander7(canvas, m, wd - m, k * 0.15, k * 0.11, blue ? Color.argb(Math.round(230 * dk), 46, 80, 150) : Color.argb(Math.round(230 * dk), 176, 70, 34));
  op7.color = Color.argb(Math.round(70 * dk), 110, 100, 90);
  for (let x = m; x < wd - m; x += k * 0.09) canvas.drawRect(x, k * 0.25, x + k * 0.05, k * 0.31, op7);
  // Métope peinte à figures noires, une face sur deux
  if (egHash5(h0 + 2) < 0.5) {
    const s = Math.min(wd * 0.5, dh * 0.5), cx = wd * 0.5, cy = dh * 0.6;
    op7.color = right ? 0xFFB8642E : 0xFFD8783A; canvas.drawRect(cx - s * 0.55, cy - s * 0.55, cx + s * 0.55, cy + s * 0.55, op7);
    os7.color = 0xFF1E1410; os7.strokeWidth = k * 0.015; canvas.drawRect(cx - s * 0.55, cy - s * 0.55, cx + s * 0.55, cy + s * 0.55, os7);
    olFigure7(canvas, Math.floor(egHash5(h0 + 3) * 3), cx, cy + s * 0.06, s * 0.9, 0xFF1E1410);
  }
}

/** Faces latérales d'un bloc carré, chacune dans son repère. */
function olWalls7(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 83 + 11, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Bouffée de nuage (centre x, y, rayon r) : blanche, ombrée de bleu dessous. */
function olPuff7(canvas, x, y, r) {
  op7.color = 0xFFC8D4EE; canvas.drawCircle(x, y + r * 0.18, r, op7);
  op7.color = 0xFFFFFFFF; canvas.drawCircle(x - r * 0.08, y - r * 0.05, r * 0.88, op7);
}

function drawChapterDeco27(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind, dh = platformDepth * k;
  op7.shader = null; os7.shader = null;
  if (kd === Kind.MOVING) {
    // Nuage : bouffées tout autour, qui débordent du bloc et respirent doucement
    for (let i = 0; i < 10; i++) {
      const th = i / 10 * Math.PI * 2, br = 1 + 0.06 * Math.sin(time * 2 + i);
      olPuff7(canvas, Math.cos(th) * rx * 0.95, Math.sin(th) * ry * 0.95 + dh * 0.35 * (Math.sin(th) > 0 ? 1 : 0.4), k * (0.2 + 0.05 * ((seed + i) % 3)) * br);
    }
    for (let i = 0; i < 5; i++) olPuff7(canvas, (i - 2) * rx * 0.42, ry * 0.9 + dh * 0.75 + Math.abs(i - 2) * -k * 0.08, k * 0.24);
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Lyre d'Apollon : deux bras dorés en corne derrière le tambour, traverse, cordes qui vibrent au rebond
    const yb = -ry * 0.62, top = -k * 1.05, vib = pl.bounce * k * 0.03;
    os7.color = 0xFFB8860B; os7.strokeWidth = k * 0.09;
    for (const sd of [-1, 1]) {
      opath7.reset(); opath7.moveTo(sd * rx * 0.42, yb);
      opath7.cubicTo(sd * rx * 0.95, yb - k * 0.25, sd * rx * 0.9, top + k * 0.2, sd * rx * 0.62, top);
      opath7.quadTo(sd * rx * 0.55, top - k * 0.12, sd * rx * 0.68, top - k * 0.2);
      canvas.drawPath(opath7, os7);
    }
    os7.color = 0xFFFFD54F; os7.strokeWidth = k * 0.045;
    for (const sd of [-1, 1]) {
      opath7.reset(); opath7.moveTo(sd * rx * 0.42, yb);
      opath7.cubicTo(sd * rx * 0.95, yb - k * 0.25, sd * rx * 0.9, top + k * 0.2, sd * rx * 0.62, top);
      canvas.drawPath(opath7, os7);
    }
    os7.color = 0xFFC8962E; os7.strokeWidth = k * 0.06; canvas.drawLine(-rx * 0.66, top + k * 0.06, rx * 0.66, top + k * 0.06, os7);
    os7.color = Color.argb(220, 255, 250, 230); os7.strokeWidth = k * 0.012;
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * rx * 0.14, w2 = Math.sin(time * 40 + i) * vib;
      opath7.reset(); opath7.moveTo(x, top + k * 0.08); opath7.quadTo(x + w2, (top + yb) / 2, x * 0.8, yb + k * 0.02); canvas.drawPath(opath7, os7);
    }
    op7.color = 0xFFFFD54F; orect7.set(-rx * 0.3, yb - k * 0.05, rx * 0.3, yb + k * 0.06); canvas.drawRoundRect(orect7, k * 0.04, k * 0.04, op7);
    return;
  }
  if (kd === Kind.CRUMBLY) {
    // Marbre fendu : faces à frise, grandes fissures, éclats qui tombent
    olWalls7(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      olMeander7(cv, k * 0.08, wd - k * 0.08, k * 0.15, k * 0.11, Color.argb(right ? 160 : 210, 176, 70, 34));
      os7.color = Color.argb(right ? 90 : 120, 90, 80, 70); os7.strokeWidth = k * 0.015;
      cv.drawLine(wd * 0.3, k * 0.3, wd * 0.45, dh2 * 0.55, os7); cv.drawLine(wd * 0.45, dh2 * 0.55, wd * 0.38, dh2 * 0.9, os7); cv.drawLine(wd * 0.45, dh2 * 0.55, wd * 0.62, dh2 * 0.7, os7);
    });
    os7.color = Color.argb(150, 100, 90, 80); os7.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.2, -rx * 0.05, ry * 0.12, os7); canvas.drawLine(-rx * 0.05, ry * 0.12, rx * 0.45, -ry * 0.25, os7);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; op7.color = Color.argb(Math.floor(170 * (1 - q)), 240, 236, 228); canvas.drawRect(rx * (0.1 + 0.08 * i) - k * 0.02, ry * 0.2 + q * k * 0.5 - k * 0.02, rx * (0.1 + 0.08 * i) + k * 0.02, ry * 0.2 + q * k * 0.5 + k * 0.02, op7); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  if (pl.round) {
    // Tambour de colonne : cannelures sur le devant, anneau doré sur le bord du dessus
    for (let i = -6; i <= 6; i++) {
      const u = i / 6.6, x = Math.sin(u * Math.PI / 2) * rx, yTop = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
      os7.color = Color.argb(Math.round(60 + 50 * Math.abs(u)), 110, 104, 96); os7.strokeWidth = k * 0.03 * (1 - Math.abs(u) * 0.6);
      canvas.drawLine(x, yTop + k * 0.06, x, yTop + dh - k * 0.06, os7);
      os7.color = Color.argb(Math.round(110 * (1 - Math.abs(u))), 255, 255, 255); os7.strokeWidth = k * 0.012;
      canvas.drawLine(x + k * 0.025, yTop + k * 0.06, x + k * 0.025, yTop + dh - k * 0.06, os7);
    }
    os7.color = 0xFFE0B040; os7.strokeWidth = k * 0.025; orect7.set(-rx * 0.94, -ry * 0.94, rx * 0.94, ry * 0.94); canvas.drawOval(orect7, os7);
    return;
  }
  // Bloc de marbre : faces à frise et métopes, veines et mosaïque d'angle sur le dessus
  olWalls7(canvas, pl, seed, olMarbleFace7);
  os7.color = Color.argb(45, 120, 120, 130); os7.strokeWidth = k * 0.012;
  opath7.reset(); opath7.moveTo(isoX(-0.8 * a, 0.3 * a), isoY(-0.8 * a, 0, 0.3 * a));
  opath7.quadTo(isoX(-0.2 * a, -0.4 * a), isoY(-0.2 * a, 0, -0.4 * a), isoX(0.7 * a, -0.6 * a), isoY(0.7 * a, 0, -0.6 * a)); canvas.drawPath(opath7, os7);
  if (seed % 3 === 0) {
    const gx = isoX(-0.55 * a, -0.55 * a), gy = isoY(-0.55 * a, 0, -0.55 * a);
    canvas.save(); canvas.translate(gx, gy); canvas.scale(1, 0.58); canvas.rotate(45);
    olMeander7(canvas, -k * 0.2, k * 0.2, 0, k * 0.1, Color.argb(160, 46, 80, 150));
    canvas.restore();
  }
}

/** Couronne de laurier dorée et verte à ramasser (27). */
function drawChapterPickup27(canvas, cy, shadow) {
  const r = k * 0.19;
  op7.shader = null;
  if (shadow) { op7.color = Color.argb(45, 0, 0, 0); orect7.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(orect7, op7); }
  op7.color = Color.argb(Math.floor(60 + 40 * Math.sin(time * 4)), 255, 230, 140); canvas.drawCircle(0, cy, r * 1.4, op7);
  canvas.save(); canvas.rotate(Math.sin(time * 2) * 10, 0, cy);
  for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) {
    const an = Math.PI / 2 + sd * (0.35 + i * 0.36), px = Math.cos(an) * r * 0.8, py = cy + Math.sin(an) * r * 0.8;
    canvas.save(); canvas.translate(px, py); canvas.rotate((an + sd * 1.2) * 180 / Math.PI);
    op7.color = i % 2 ? 0xFF6A9A3A : 0xFF8AB84A; orect7.set(-r * 0.24, -r * 0.09, r * 0.24, r * 0.09); canvas.drawOval(orect7, op7);
    op7.color = 0xFFFFD54F; orect7.set(-r * 0.18, -r * 0.03, r * 0.18, r * 0.03); canvas.drawOval(orect7, op7);
    canvas.restore();
  }
  op7.color = 0xFFD8342E;
  opath7.reset(); opath7.moveTo(0, cy + r * 0.82); opath7.lineTo(-r * 0.3, cy + r * 1.25); opath7.lineTo(-r * 0.12, cy + r * 1.2); opath7.close(); canvas.drawPath(opath7, op7);
  opath7.reset(); opath7.moveTo(0, cy + r * 0.82); opath7.lineTo(r * 0.3, cy + r * 1.25); opath7.lineTo(r * 0.12, cy + r * 1.2); opath7.close(); canvas.drawPath(opath7, op7);
  canvas.drawCircle(0, cy + r * 0.82, r * 0.1, op7);
  canvas.restore();
  return true;
}

/** Petit temple de marbre à l'arrivée : marches, colonnes, fronton et acrotères d'or (27). */
function drawChapterFinish27(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  op7.shader = null;
  op7.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 230, 120); canvas.drawCircle(bx, by - k * 0.9, k * 0.55, op7);
  op7.color = 0xFFD8D0C2; canvas.drawRect(bx - k * 0.42, by - k * 0.08, bx + k * 0.42, by, op7);
  op7.color = 0xFFF6F2EA; canvas.drawRect(bx - k * 0.38, by - k * 0.14, bx + k * 0.38, by - k * 0.08, op7);
  for (let i = 0; i < 4; i++) {
    const x = bx - k * 0.3 + i * k * 0.2;
    op7.color = 0xFFC8C0B2; canvas.drawRect(x - k * 0.045, by - k * 0.82, x, by - k * 0.14, op7);
    op7.color = 0xFFFBF8F0; canvas.drawRect(x, by - k * 0.82, x + k * 0.045, by - k * 0.14, op7);
  }
  op7.color = 0xFF3A5A9A; canvas.drawRect(bx - k * 0.4, by - k * 0.92, bx + k * 0.4, by - k * 0.82, op7);
  opath7.reset(); opath7.moveTo(bx - k * 0.44, by - k * 0.92); opath7.lineTo(bx, by - k * 1.18); opath7.lineTo(bx + k * 0.44, by - k * 0.92); opath7.close();
  op7.color = 0xFFF6F2EA; canvas.drawPath(opath7, op7);
  op7.color = 0xFFFFD54F;
  for (const [x, y] of [[bx, by - k * 1.18], [bx - k * 0.44, by - k * 0.92], [bx + k * 0.44, by - k * 0.92]]) canvas.drawCircle(x, y - k * 0.04, k * 0.045, op7);
}

/** Objet doré : la chouette d'Athéna (27). */
function drawCollectible27(canvas, c, x, y, r, got) {
  op7.shader = null;
  const main = got ? 0xFFFFC93C : 0xFF9A9AA2, dark = got ? 0xFFC98A00 : 0xFF6E6E78;
  if (got) { op7.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, op7); }
  op7.color = main; orect7.set(x - r * 0.6, y - r * 0.4, x + r * 0.6, y + r * 0.95); canvas.drawOval(orect7, op7);
  canvas.drawCircle(x, y - r * 0.45, r * 0.55, op7);
  opath7.reset(); opath7.moveTo(x - r * 0.5, y - r * 0.7); opath7.lineTo(x - r * 0.6, y - r * 1.05); opath7.lineTo(x - r * 0.2, y - r * 0.85);
  opath7.moveTo(x + r * 0.5, y - r * 0.7); opath7.lineTo(x + r * 0.6, y - r * 1.05); opath7.lineTo(x + r * 0.2, y - r * 0.85); canvas.drawPath(opath7, op7);
  op7.color = got ? 0xFFFFF3C0 : 0xFFD0D0D6; canvas.drawCircle(x - r * 0.24, y - r * 0.45, r * 0.22, op7); canvas.drawCircle(x + r * 0.24, y - r * 0.45, r * 0.22, op7);
  op7.color = dark; canvas.drawCircle(x - r * 0.24, y - r * 0.45, r * 0.1, op7); canvas.drawCircle(x + r * 0.24, y - r * 0.45, r * 0.1, op7);
  opath7.reset(); opath7.moveTo(x - r * 0.08, y - r * 0.3); opath7.lineTo(x + r * 0.08, y - r * 0.3); opath7.lineTo(x, y - r * 0.12); opath7.close(); canvas.drawPath(opath7, op7);
  os7.color = dark; os7.strokeWidth = r * 0.07;
  for (let i = 0; i < 3; i++) canvas.drawLine(x - r * 0.25 + i * r * 0.25, y + r * 0.2, x - r * 0.25 + i * r * 0.25, y + r * 0.45, os7);
  canvas.drawLine(x - r * 0.3, y + r * 0.95, x - r * 0.1, y + r * 0.95, os7); canvas.drawLine(x + r * 0.1, y + r * 0.95, x + r * 0.3, y + r * 0.95, os7);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground27(canvas) {
  op7.color = Color.WHITE; op7.shader = new LinearGradient(0, 0, 0, h, [0xFF2A6CC8, 0xFF8AC8F0, 0xFFFFF6E0], [0, 0.6, 1]); canvas.drawRect(0, 0, w, h, op7); op7.shader = null;
}

/** Devant les blocs : toutes les 7 s, l'éclair de Zeus frappe le bloc suivant (flash, étincelles, bloc électrisé). */
function drawZeusBolt27(canvas) {
  const u = time % 7;
  if (u < 4 || u > 5.4 || state === State.QUEST_END || !next) return;
  const x = sx(next.cx, next.cz), y = sy(next.cx, 0, next.cz), cyc = Math.floor(time / 7);
  op7.shader = null;
  if (u < 4.45) {
    const a = u < 4.06 ? 1 : u < 4.12 ? 0.35 : u < 4.2 ? 0.95 : Math.max(0, 1 - (u - 4.2) / 0.25);
    op7.color = Color.argb(Math.round(110 * a), 255, 255, 240); canvas.drawRect(0, 0, w, h, op7);
    opath7.reset(); opath7.moveTo(x + (hash01(cyc) - 0.5) * w * 0.4, -h * 0.02);
    const n = 8;
    for (let i = 1; i < n; i++) { const q = i / n; opath7.lineTo(x + (hash01(cyc * 13 + i) - 0.5) * w * 0.12 * (1 - q) + (hash01(cyc) - 0.5) * w * 0.4 * (1 - q), -h * 0.02 + (y + h * 0.02) * q); }
    opath7.lineTo(x, y);
    os7.color = Color.argb(Math.round(110 * a), 170, 200, 255); os7.strokeWidth = k * 0.22; canvas.drawPath(opath7, os7);
    os7.color = Color.argb(Math.round(255 * a), 255, 255, 255); os7.strokeWidth = k * 0.07; canvas.drawPath(opath7, os7);
  }
  // Étincelles et anneau électrique sur le bloc foudroyé
  const f = (u - 4) / 1.4;
  for (let i = 0; i < 10; i++) {
    const an = i * 0.628 + cyc, d = k * (0.3 + 1.1 * f);
    op7.color = Color.argb(Math.round(230 * (1 - f)), 255, 240, 160); canvas.drawCircle(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.55 - k * 0.6 * f * (1 - f), k * 0.05 * (1 - f * 0.5), op7);
  }
  os7.color = Color.argb(Math.round(200 * (1 - f)), 160, 210, 255); os7.strokeWidth = k * 0.05;
  orect7.set(x - k * (0.6 + 0.7 * f), y - k * (0.35 + 0.4 * f), x + k * (0.6 + 0.7 * f), y + k * (0.35 + 0.4 * f)); canvas.drawOval(orect7, os7);
}
