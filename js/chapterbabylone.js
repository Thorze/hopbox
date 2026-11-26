'use strict';
// Chapitre 26, Babylone : les jardins suspendus (équivalent de ChapterBabylon.kt, appelé par chapterthemes5.js).
// Briques bleues émaillées (frises de rosettes, lions et aurochs d'or en relief), terrasses de briques couvertes de
// jardin, plateformes suspendues à des lianes qui se balancent (blocs mobiles), briques crues qui s'effritent,
// fontaines (trampolines), tablettes d'argile à ramasser, petite ziggourat à l'arrivée, étoile d'Ishtar dorée.

const bp6 = new Paint(), bs6 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const bpath6 = new Path(), brect6 = new RectF();
const BA6_BLUE = [0xFF2E5CB8, 0xFF3A70C8, 0xFF2A52A8];

function chapterBlockLook26(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(0xFF2E5CB8, 'lisse', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFF9A6A3A, 'bois', false);      // plateforme suspendue aux lianes
  if (k0 === Kind.CRUMBLY) return std(0xFFC8A070, 'granit', false);   // briques crues
  if (k0 === Kind.TRAMPOLINE) return std(0xFF4FB3D9, 'lisse', true);  // fontaine
  // Un bloc sur trois : terrasse de briques couverte de jardin ; sinon briques bleues émaillées
  return c % 3 === 1 ? std(0xFFD49A62, 'granit', false) : std(BA6_BLUE[c % 3], 'lisse');
}

/** Rosette à 8 pétales (x, y, rayon r). */
function baRosette6(canvas, x, y, r, petal, heart) {
  bp6.color = petal;
  for (let i = 0; i < 8; i++) {
    const an = i * Math.PI / 4;
    canvas.drawCircle(x + Math.cos(an) * r * 0.58, y + Math.sin(an) * r * 0.58, r * 0.3, bp6);
  }
  bp6.color = heart; canvas.drawCircle(x, y, r * 0.32, bp6);
}

/** Animal d'or en relief, de profil vers la gauche (centre x, y, longueur s) : 0 lion, 1 aurochs. */
function baBeast6(canvas, kind, x, y, s, gold, dark) {
  const X = (u) => x + u * s, Y = (v) => y + v * s;
  // Pattes, trapues
  bs6.color = gold; bs6.strokeWidth = s * 0.09;
  for (const [a, b] of [[-0.2, -0.23], [-0.08, -0.06], [0.14, 0.12], [0.24, 0.27]]) canvas.drawLine(X(a), Y(0.04), X(b), Y(0.27), bs6);
  // Queue relevée
  bs6.strokeWidth = s * 0.045; bpath6.reset();
  bpath6.moveTo(X(0.27), Y(-0.05)); bpath6.quadTo(X(0.44), Y(-0.06), X(kind ? 0.36 : 0.42), Y(kind ? 0.16 : -0.24)); canvas.drawPath(bpath6, bs6);
  // Corps, haut et ramassé
  bpath6.reset();
  bpath6.moveTo(X(-0.26), Y(-0.04)); bpath6.quadTo(X(-0.02), Y(-0.21), X(0.26), Y(-0.11)); bpath6.quadTo(X(0.35), Y(0.0), X(0.26), Y(0.1));
  bpath6.lineTo(X(-0.22), Y(0.1)); bpath6.close();
  bp6.color = gold; canvas.drawPath(bpath6, bp6);
  bs6.color = dark; bs6.strokeWidth = s * 0.02; canvas.drawPath(bpath6, bs6);
  if (kind === 0) {
    // Lion : grosse crinière en couronne, tête ronde, gueule ouverte, touffe de la queue
    bp6.color = dark; canvas.drawCircle(X(-0.25), Y(-0.1), s * 0.19, bp6);
    canvas.drawCircle(X(0.42), Y(-0.26), s * 0.045, bp6);
    bp6.color = gold; canvas.drawCircle(X(-0.32), Y(-0.09), s * 0.11, bp6);
    canvas.drawCircle(X(-0.26), Y(-0.24), s * 0.035, bp6);
    bpath6.reset(); bpath6.moveTo(X(-0.44), Y(-0.07)); bpath6.lineTo(X(-0.35), Y(-0.04)); bpath6.lineTo(X(-0.44), Y(0.0)); bpath6.close();
    bp6.color = dark; canvas.drawPath(bpath6, bp6);
    canvas.drawCircle(X(-0.35), Y(-0.12), s * 0.018, bp6);
  } else {
    // Aurochs : tête basse, longue corne en avant
    bp6.color = gold; brect6.set(X(-0.44), Y(-0.12), X(-0.2), Y(0.05)); canvas.drawOval(brect6, bp6);
    bs6.color = dark; bs6.strokeWidth = s * 0.035; bpath6.reset();
    bpath6.moveTo(X(-0.28), Y(-0.1)); bpath6.quadTo(X(-0.32), Y(-0.28), X(-0.48), Y(-0.26)); canvas.drawPath(bpath6, bs6);
    bp6.color = dark; canvas.drawCircle(X(-0.35), Y(-0.06), s * 0.018, bp6);
  }
}

/** Une face de briques bleues émaillées (repère de la face : x sur wd, y sur dh). */
function baGlazedFace6(canvas, h0, wd, dh, right) {
  const m = k * 0.1, dk = right ? 0.75 : 1;
  // Assises de briques : joints sombres, quelques reflets clairs
  bs6.color = Color.argb(Math.round(70 * dk), 10, 30, 70); bs6.strokeWidth = k * 0.012;
  const rows = 9, rh = dh / rows;
  for (let r = 1; r < rows; r++) {
    canvas.drawLine(m * 0.4, r * rh, wd - m * 0.4, r * rh, bs6);
    for (let x = (r % 2) * k * 0.13 + k * 0.13; x < wd - m * 0.4; x += k * 0.26) canvas.drawLine(x, (r - 1) * rh, x, r * rh, bs6);
  }
  bs6.color = Color.argb(Math.round(60 * dk), 200, 230, 255); bs6.strokeWidth = k * 0.02;
  for (let i = 0; i < 4; i++) { const x = m + egHash5(h0 + 20 + i) * (wd - 2 * m - k * 0.12), y = (Math.floor(egHash5(h0 + 30 + i) * rows) + 0.35) * rh; canvas.drawLine(x, y, x + k * 0.1, y, bs6); }
  // Frise de rosettes en haut (presque toujours), en bas parfois
  const band = (yc) => {
    bs6.color = Color.argb(Math.round(220 * dk), 255, 214, 80); bs6.strokeWidth = k * 0.018;
    canvas.drawLine(m * 0.5, yc - k * 0.075, wd - m * 0.5, yc - k * 0.075, bs6); canvas.drawLine(m * 0.5, yc + k * 0.075, wd - m * 0.5, yc + k * 0.075, bs6);
    const n = Math.max(2, Math.floor((wd - m) / (k * 0.18)));
    for (let i = 0; i < n; i++) baRosette6(canvas, m * 0.5 + (i + 0.5) * (wd - m) / n, yc, k * 0.05, Color.argb(Math.round(235 * dk), 255, 250, 235), Color.argb(255, 230, 160, 40));
  };
  if (egHash5(h0 + 1) < 0.85) band(k * 0.17);
  if (egHash5(h0 + 2) < 0.3) band(dh - k * 0.17);
  // Animal d'or en relief, une face sur deux environ
  if (egHash5(h0 + 3) < 0.5) {
    const s = Math.min(wd * 0.62, dh * 0.62);
    baBeast6(canvas, egHash5(h0 + 4) < 0.6 ? 0 : 1, wd * 0.5, dh * 0.56, s,
      right ? Color.argb(255, 210, 160, 50) : Color.argb(255, 246, 196, 74), right ? Color.argb(255, 140, 90, 20) : Color.argb(255, 170, 110, 26));
  }
}

/** Une face de terrasse en briques crues : assises, lierre et glycine qui retombent du jardin. */
function baTerraceFace6(canvas, h0, wd, dh, right) {
  bs6.color = Color.argb(right ? 50 : 60, 90, 50, 20); bs6.strokeWidth = k * 0.012;
  for (let r = 1; r < 8; r++) canvas.drawLine(k * 0.05, r * dh / 8, wd - k * 0.05, r * dh / 8, bs6);
  // Frise bleue sous le jardin
  bp6.color = Color.argb(255, 46, 92, 184); canvas.drawRect(k * 0.04, k * 0.06, wd - k * 0.04, k * 0.17, bp6);
  const n = Math.max(2, Math.floor(wd / (k * 0.16)));
  for (let i = 0; i < n; i++) baRosette6(canvas, k * 0.04 + (i + 0.5) * (wd - k * 0.08) / n, k * 0.115, k * 0.035, 0xFFFFF6E0, 0xFFE8A83A);
  // Lianes
  for (let i = 0; i < 6; i++) {
    const x = k * 0.1 + egHash5(h0 + i * 3) * (wd - k * 0.2), len = dh * (0.25 + 0.6 * egHash5(h0 + i * 3 + 1)), wis = egHash5(h0 + i * 3 + 2) < 0.35;
    const sw = Math.sin(time * 1.3 + i + h0) * k * 0.02;
    bs6.color = 0xFF3A5A26; bs6.strokeWidth = k * 0.014;
    bpath6.reset(); bpath6.moveTo(x, k * 0.05); bpath6.quadTo(x + sw, len * 0.6, x + sw * 1.6, len); canvas.drawPath(bpath6, bs6);
    for (let j = 1; j <= 5; j++) {
      const q = j / 5.5, px = x + sw * 1.6 * q * q, py = k * 0.05 + (len - k * 0.05) * q;
      bp6.color = wis && j > 2 ? 0xFFB89AE8 : (j % 2 ? 0xFF4E7E34 : 0xFF6A9A42);
      brect6.set(px - k * 0.035, py - k * 0.022, px + k * 0.035, py + k * 0.022); canvas.drawOval(brect6, bp6);
    }
  }
}

/** Faces latérales d'un bloc carré, chacune dans son repère (comme drawEgyptWalls5). */
function baWalls6(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 89 + 7, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Massif de verdure (centre x, y, rayon r) et ses fleurs. */
function baBush6(canvas, x, y, r, seed) {
  bp6.color = 0xFF2E5A22; canvas.drawCircle(x, y + r * 0.15, r, bp6);
  bp6.color = 0xFF4E8A34; canvas.drawCircle(x - r * 0.15, y, r * 0.8, bp6);
  bp6.color = 0xFF7AAE4A; canvas.drawCircle(x + r * 0.2, y - r * 0.25, r * 0.45, bp6);
  bp6.color = [0xFFFF5A7A, 0xFFFFFFFF, 0xFFFFD54F, 0xFFFF8AA8][seed % 4];
  canvas.drawCircle(x - r * 0.4, y - r * 0.2, r * 0.18, bp6); canvas.drawCircle(x + r * 0.45, y + r * 0.2, r * 0.16, bp6);
}

function drawChapterDeco26(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind;
  bp6.shader = null; bs6.shader = null;
  if (kd === Kind.MOVING) {
    // Plateforme suspendue : deux lianes fleuries montent du bloc jusqu'à leur point d'attache, au-dessus du milieu
    // de la course (le bloc se balance dessous comme une balançoire)
    const ox = pl.moveAlongX ? -pl.offset : 0, oz = pl.moveAlongX ? 0 : -pl.offset;
    const ax = isoX(ox, oz), ay = isoY(ox, 0, oz) - k * 5.5;
    for (const sd of [-1, 1]) {
      const bx = sd * rx * 0.7, by = -ry * 0.05, tx = ax + sd * k * 0.25;
      bs6.color = 0xFF5A4A22; bs6.strokeWidth = k * 0.035; canvas.drawLine(bx, by, tx, ay, bs6);
      bs6.color = 0xFF3A6A2A; bs6.strokeWidth = k * 0.02;
      bpath6.reset(); bpath6.moveTo(bx, by);
      for (let j = 1; j <= 8; j++) { const q = j / 8, px = bx + (tx - bx) * q, py = by + (ay - by) * q; bpath6.lineTo(px + Math.sin(q * 12 + sd) * k * 0.04, py); }
      canvas.drawPath(bpath6, bs6);
      for (let j = 1; j <= 7; j++) {
        const q = j / 8, px = bx + (tx - bx) * q, py = by + (ay - by) * q;
        if (py < -k * 3.2) break;
        bp6.color = j % 3 === 0 ? 0xFFFF7AA0 : (j % 2 ? 0xFF4E8A34 : 0xFF7AAE4A);
        brect6.set(px - k * 0.06, py - k * 0.03, px + k * 0.06, py + k * 0.03); canvas.drawOval(brect6, bp6);
      }
    }
    // Planches et petit pot de fleurs
    bs6.color = Color.argb(120, 60, 36, 16); bs6.strokeWidth = k * 0.015;
    for (const u of [-0.33, 0, 0.33]) canvas.drawLine(isoX(u * a, -0.9 * a), isoY(u * a, 0, -0.9 * a), isoX(u * a, 0.9 * a), isoY(u * a, 0, 0.9 * a), bs6);
    baBush6(canvas, -rx * 0.45, -ry * 0.1, k * 0.11, seed);
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Fontaine : jets d'eau tout autour du bassin, qui retombent vers l'extérieur
    for (let i = 0; i < 8; i++) {
      const th = i * Math.PI / 4 + 0.39, cx = Math.cos(th), cy = Math.sin(th);
      const x0 = cx * rx * 0.86, y0 = cy * ry * 0.86, x1 = cx * rx * 1.32, y1 = cy * ry * 1.32 + k * 0.12, peak = -k * (0.42 + 0.06 * Math.sin(time * 3 + i));
      bs6.color = Color.argb(150, 200, 236, 255); bs6.strokeWidth = k * 0.03;
      bpath6.reset(); bpath6.moveTo(x0, y0); bpath6.quadTo((x0 + x1) / 2, peak + (y0 + y1) / 2, x1, y1); canvas.drawPath(bpath6, bs6);
      for (let j = 0; j < 3; j++) {
        const q = (time * 1.4 + j / 3 + i * 0.13) % 1, u = 1 - q;
        const px = u * u * x0 + 2 * u * q * (x0 + x1) / 2 + q * q * x1, py = u * u * y0 + 2 * u * q * (peak + (y0 + y1) / 2) + q * q * y1;
        bp6.color = Color.argb(230, 255, 255, 255); canvas.drawCircle(px, py, k * 0.025, bp6);
      }
    }
    bs6.color = Color.argb(170, 255, 214, 80); bs6.strokeWidth = k * 0.025;
    brect6.set(-rx * 0.97, -ry * 0.97, rx * 0.97, ry * 0.97); canvas.drawOval(brect6, bs6);
    return;
  }
  if (kd === Kind.CRUMBLY) {
    // Briques crues fendues, poussière d'argile qui s'échappe
    baWalls6(canvas, pl, seed, (cv, h0, wd, dh, right) => {
      bs6.color = Color.argb(right ? 60 : 80, 110, 70, 30); bs6.strokeWidth = k * 0.014;
      for (let r = 1; r < 7; r++) { cv.drawLine(k * 0.05, r * dh / 7, wd - k * 0.05, r * dh / 7, bs6); for (let x = (r % 2) * k * 0.14 + k * 0.14; x < wd; x += k * 0.28) cv.drawLine(x, (r - 1) * dh / 7, x, r * dh / 7, bs6); }
    });
    bs6.color = Color.argb(150, 120, 80, 40); bs6.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.45, -ry * 0.25, -rx * 0.05, ry * 0.1, bs6); canvas.drawLine(-rx * 0.05, ry * 0.1, rx * 0.4, -ry * 0.3, bs6);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; bp6.color = Color.argb(Math.floor(150 * (1 - q)), 210, 170, 120); canvas.drawCircle(rx * (0.1 + 0.08 * i), ry * 0.2 + q * k * 0.5, k * 0.025, bp6); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  if (pl.baseColor === 0xFFD49A62) {
    // Terrasse de jardin : faces de briques et lianes, massifs fleuris le long des bords du fond (le centre reste libre)
    baWalls6(canvas, pl, seed, baTerraceFace6);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const q = (i + 0.5) / n;
      baBush6(canvas, isoX(-0.82 * a, (-0.82 + 1.64 * q) * a), isoY(-0.82 * a, 0, (-0.82 + 1.64 * q) * a), k * (0.1 + 0.03 * ((seed + i) % 3)), seed + i);
      baBush6(canvas, isoX((-0.82 + 1.64 * q) * a, -0.82 * a), isoY((-0.82 + 1.64 * q) * a, 0, -0.82 * a), k * (0.1 + 0.03 * ((seed + i + 1) % 3)), seed + i + 2);
    }
    return;
  }
  // Briques bleues émaillées : faces à frises et animaux d'or, rosette dorée au dessus
  if (!pl.round) baWalls6(canvas, pl, seed, baGlazedFace6);
  else { canvas.save(); canvas.translate(-k * 0.36, ry - k * 0.02); baGlazedFace6(canvas, seed * 89 + 7, k * 0.72, platformDepth * k, false); canvas.restore(); }
  bs6.color = Color.argb(70, 10, 30, 70); bs6.strokeWidth = k * 0.012;
  if (!pl.round) for (const u of [-0.5, 0.5]) {
    canvas.drawLine(isoX(u * a, -0.95 * a), isoY(u * a, 0, -0.95 * a), isoX(u * a, 0.95 * a), isoY(u * a, 0, 0.95 * a), bs6);
    canvas.drawLine(isoX(-0.95 * a, u * a), isoY(-0.95 * a, 0, u * a), isoX(0.95 * a, u * a), isoY(0.95 * a, 0, u * a), bs6);
  }
  if (seed % 3 === 0) {
    const gx = isoX(-0.55 * a, -0.55 * a), gy = isoY(-0.55 * a, 0, -0.55 * a);
    canvas.save(); canvas.translate(gx, gy); canvas.scale(1, 0.58);
    baRosette6(canvas, 0, 0, k * 0.13, 0xFFFFF6E0, 0xFFE8A83A);
    canvas.restore();
  }
}

/** Tablette d'argile gravée de cunéiformes (26). */
function drawChapterPickup26(canvas, cy, shadow) {
  const r = k * 0.2;
  bp6.shader = null;
  if (shadow) { bp6.color = Color.argb(45, 0, 0, 0); brect6.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(brect6, bp6); }
  bp6.color = Color.argb(Math.floor(60 + 40 * Math.sin(time * 4)), 255, 220, 140); canvas.drawCircle(0, cy, r * 1.4, bp6);
  canvas.save(); canvas.rotate(Math.sin(time * 2) * 8, 0, cy);
  bp6.color = 0xFF8A5A32; brect6.set(-r * 0.7 + r * 0.08, cy - r * 0.9 + r * 0.1, r * 0.7 + r * 0.08, cy + r * 0.9 + r * 0.1); canvas.drawRoundRect(brect6, r * 0.25, r * 0.25, bp6);
  bp6.color = 0xFFD8A46A; brect6.set(-r * 0.7, cy - r * 0.9, r * 0.7, cy + r * 0.9); canvas.drawRoundRect(brect6, r * 0.25, r * 0.25, bp6);
  bs6.color = 0xFF7A4A22; bs6.strokeWidth = r * 0.06;
  for (let row = 0; row < 4; row++) {
    const yy = cy - r * 0.6 + row * r * 0.4;
    canvas.drawLine(-r * 0.55, yy + r * 0.17, r * 0.55, yy + r * 0.17, bs6);
    for (let j = 0; j < 3; j++) {
      const xx = -r * 0.4 + j * r * 0.38 + (row % 2) * r * 0.1;
      bpath6.reset(); bpath6.moveTo(xx - r * 0.08, yy - r * 0.05); bpath6.lineTo(xx + r * 0.08, yy - r * 0.05); bpath6.lineTo(xx, yy + r * 0.04); bpath6.close();
      bp6.color = 0xFF7A4A22; canvas.drawPath(bpath6, bp6); canvas.drawLine(xx, yy, xx, yy + r * 0.12, bs6);
    }
  }
  bp6.color = Color.argb(150, 255, 255, 255); canvas.drawCircle(-r * 0.4, cy - r * 0.65, r * 0.1, bp6);
  canvas.restore();
  return true;
}

/** Petite ziggourat à l'arrivée, temple bleu et doré au sommet (26). */
function drawChapterFinish26(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  bp6.shader = null;
  bp6.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 220, 90); canvas.drawCircle(bx, by - k * 1.2, k * 0.5, bp6);
  let y = by;
  [[0.36, 0.26], [0.28, 0.24], [0.2, 0.22]].forEach(([hw, th]) => {
    const t = y - k * th;
    bp6.color = 0xFFC8946A; canvas.drawRect(bx - k * hw, t, bx, y, bp6);
    bp6.color = 0xFFE8B884; canvas.drawRect(bx, t, bx + k * hw, y, bp6);
    bp6.color = 0xFFFFE8C0; canvas.drawRect(bx - k * hw, t, bx + k * hw, t + k * 0.025, bp6);
    y = t;
  });
  bp6.color = 0xFFD8B080; canvas.drawRect(bx - k * 0.05, by - k * 0.5, bx + k * 0.05, by, bp6);
  bs6.color = Color.argb(120, 90, 60, 40); bs6.strokeWidth = k * 0.012;
  for (let i = 1; i < 8; i++) canvas.drawLine(bx - k * 0.05, by - i * k * 0.06, bx + k * 0.05, by - i * k * 0.06, bs6);
  bp6.color = 0xFF2E5CB8; canvas.drawRect(bx - k * 0.11, y - k * 0.22, bx + k * 0.11, y, bp6);
  bp6.color = 0xFFFFD54F; canvas.drawRect(bx - k * 0.11, y - k * 0.13, bx + k * 0.11, y - k * 0.1, bp6);
  for (const s of [-1, 1]) { bpath6.reset(); bpath6.moveTo(bx + s * k * 0.1, y - k * 0.22); bpath6.quadTo(bx + s * k * 0.16, y - k * 0.32, bx + s * k * 0.08, y - k * 0.38); bpath6.lineTo(bx + s * k * 0.06, y - k * 0.22); bpath6.close(); canvas.drawPath(bpath6, bp6); }
}

/** Objet doré : l'étoile d'Ishtar (26). */
function drawCollectible26(canvas, c, x, y, r, got) {
  bp6.shader = null;
  const main = got ? 0xFFFFC93C : 0xFF9A9AA2, dark = got ? 0xFFC98A00 : 0xFF6E6E78;
  if (got) { bp6.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, bp6); }
  bs6.color = dark; bs6.strokeWidth = r * 0.1; canvas.drawCircle(x, y, r * 0.95, bs6);
  bpath6.reset();
  for (let i = 0; i < 16; i++) {
    const an = -Math.PI / 2 + i * Math.PI / 8, rr = i % 2 ? r * 0.36 : (i % 4 === 0 ? r * 0.85 : r * 0.68);
    i ? bpath6.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : bpath6.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
  }
  bpath6.close(); bp6.color = main; canvas.drawPath(bpath6, bp6);
  bs6.strokeWidth = r * 0.06; canvas.drawPath(bpath6, bs6);
  bp6.color = dark; canvas.drawCircle(x, y, r * 0.14, bp6);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground26(canvas) {
  bp6.color = Color.WHITE; bp6.shader = new LinearGradient(0, 0, 0, h, [0xFF2A64B0, 0xFF9ACBE6, 0xFFFFD8A0], [0, 0.6, 1]); canvas.drawRect(0, 0, w, h, bp6); bp6.shader = null;
}

/** Dessin propre au chapitre 26 (liste : chapterhooks.js). */
const CHAPTER_HOOKS_26 = {
  blockLook: chapterBlockLook26,
  deco: drawChapterDeco26,
  pickup: drawChapterPickup26,
  finish: drawChapterFinish26,
  collectible: drawCollectible26,
  mapBackground: drawChapterMapBackground26,
};
