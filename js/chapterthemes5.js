'use strict';
// Saison 4 de l'Aventure, les civilisations anciennes, chapitres 25 à 32 (équivalent de ChapterThemes5.kt,
// appelé par chapterthemes4.js). Chapitre 26 (Babylone) : chapterbabylone.js ; 27 (Grèce) : chapterolympe.js ; 28 (Rome) : chapterrome.js ; 29 (Chine) : chapterchine.js ; 30 (Aztèques) : chapteraztec.js ; 31 (Incas) : chapterinca.js ; 32 (Vikings) : chaptervikings.js.
// 25 Égypte : grès, felouques sur le Nil (blocs mobiles), grès friable, papyrus (trampolines), scarabées d'or,
//    obélisque à l'arrivée, œil d'Horus doré.

const vp5 = new Paint(), vs5 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const vpath5 = new Path(), vrect5 = new RectF();
const pc5 = (s) => Color.parseColor(s);
const CH5_SANDSTONE = [0xFFE2C285, 0xFFD4AE6A, 0xFFEBCF96];
/** Angles (sur le bord du trampoline) des tiges de papyrus : de l'arrière vers les côtés, rien devant. */
const CH5_PAPYRUS_RING = [Math.PI * 1.5, Math.PI * 1.32, Math.PI * 1.68, Math.PI * 1.12, Math.PI * 1.88, Math.PI * 0.97, Math.PI * 0.03];

/** Ombelle de papyrus : gerbe de rayons fins en dôme, qui retombent au bout (rayon r, penchée de lean). */
function drawPapyrusUmbel5(canvas, x, y, r, lean) {
  vpath5.reset();
  for (let j = 0; j < 19; j++) {
    const off = (j / 18 - 0.5) * 2, an = -Math.PI / 2 + lean * 0.7 + off * 1.95, len = r * (1 - 0.15 * Math.abs(off));
    const ca = Math.cos(an), sa = Math.sin(an);
    vpath5.moveTo(x, y);
    vpath5.quadTo(x + ca * len * 0.62, y + sa * len * 0.62 - len * 0.08, x + ca * len, y + sa * len + len * 0.45 * Math.abs(ca) ** 1.4);
  }
  vs5.color = pc5('#558B2F'); vs5.strokeWidth = r * 0.1; canvas.drawPath(vpath5, vs5);
  vs5.color = pc5('#AED581'); vs5.strokeWidth = r * 0.05; canvas.drawPath(vpath5, vs5);
  // Petites touffes claires au bout d'un rayon sur deux
  vp5.color = pc5('#E6EE9C');
  for (let j = 0; j < 19; j += 2) {
    const off = (j / 18 - 0.5) * 2, an = -Math.PI / 2 + lean * 0.7 + off * 1.95, len = r * (1 - 0.15 * Math.abs(off)), ca = Math.cos(an);
    canvas.drawCircle(x + ca * len, y + Math.sin(an) * len + len * 0.45 * Math.abs(ca) ** 1.4, r * 0.07, vp5);
  }
  vp5.color = pc5('#4E7A26'); canvas.drawCircle(x, y, r * 0.1, vp5);
}

// ---------- Hiéroglyphes gravés sur les faces des blocs de grès (25) ----------
// Chaque signe tient dans une case de 1 × 1 centrée en (0, 0), y vers le bas. Codes : 0 moveTo x y, 1 lineTo x y,
// 2 quadTo cx cy x y, 3 cercle cx cy r, 4 ellipse cx cy rx ry.
const CH5_GLYPHS = [
  [4, 0, -0.28, 0.13, 0.17, 0, -0.25, -0.08, 1, 0.25, -0.08, 0, 0, -0.11, 1, 0, 0.48],                                    // ânkh
  [0, -0.4, -0.05, 2, 0, -0.32, 0.4, -0.05, 2, 0, 0.16, -0.4, -0.05, 3, 0, -0.07, 0.07, 0, -0.42, -0.3, 2, 0, -0.42, 0.42, -0.28,
    0, -0.05, 0.08, 1, -0.12, 0.42, 0, 0.1, 0.07, 2, 0.2, 0.35, 0.38, 0.28, 2, 0.42, 0.18, 0.32, 0.2],                      // œil d'Horus
  [0, -0.45, -0.08, 1, -0.33, -0.16, 1, -0.21, -0.08, 1, -0.09, -0.16, 1, 0.03, -0.08, 1, 0.15, -0.16, 1, 0.27, -0.08, 1, 0.39, -0.16,
    0, -0.45, 0.14, 1, -0.33, 0.06, 1, -0.21, 0.14, 1, -0.09, 0.06, 1, 0.03, 0.14, 1, 0.15, 0.06, 1, 0.27, 0.14, 1, 0.39, 0.06],  // eau
  [0, 0.02, 0.48, 2, 0.22, 0, -0.02, -0.48, 2, -0.16, 0, 0.02, 0.48, 0, 0.02, 0.4, 1, 0.01, 0.05],                         // roseau
  [3, 0, 0, 0.3, 3, 0, 0, 0.06],                                                                                          // soleil
  [0, -0.07, 0.48, 1, -0.07, -0.3, 0, 0.07, 0.48, 1, 0.07, -0.3, 0, -0.18, -0.36, 1, 0.18, -0.36, 0, -0.2, -0.23, 1, 0.2, -0.23,
    0, -0.2, -0.1, 1, 0.2, -0.1, 0, -0.18, 0.03, 1, 0.18, 0.03, 0, -0.16, 0.48, 1, 0.16, 0.48],                              // pilier djed
  [4, 0, 0.05, 0.17, 0.24, 3, 0, -0.27, 0.08, 0, 0, -0.19, 1, 0, 0.29, 0, -0.17, -0.05, 1, -0.34, -0.15, 0, 0.17, -0.05, 1, 0.34, -0.15,
    0, -0.17, 0.13, 1, -0.34, 0.25, 0, 0.17, 0.13, 1, 0.34, 0.25],                                                         // scarabée
  [0, -0.28, -0.05, 2, 0.02, -0.16, 0.3, 0.1, 1, -0.1, 0.2, 2, -0.28, 0.15, -0.28, -0.05, 2, -0.32, -0.3, -0.2, -0.33,
    2, -0.38, -0.27, -0.44, 0.02, 0, -0.06, 0.19, 1, -0.09, 0.48, 0, 0.06, 0.17, 1, 0.09, 0.48],                             // ibis
  [0, -0.45, 0.28, 2, -0.25, 0.06, -0.05, 0.27, 2, 0.15, 0.44, 0.35, 0.2, 1, 0.46, 0.1, 0, 0.33, 0.14, 1, 0.29, 0.01, 0, 0.41, 0.12, 1, 0.43, 0],  // vipère à cornes
  [0, 0.05, 0.48, 2, 0, 0, -0.05, -0.45, 2, 0.24, -0.48, 0.2, -0.2, 2, 0.17, 0.2, 0.05, 0.48, 0, 0, -0.22, 1, 0.17, -0.3,
    0, 0.02, -0.02, 1, 0.17, -0.08, 0, 0.04, 0.2, 1, 0.14, 0.15],                                                          // plume de Maât
  [0, -0.32, 0.2, 2, 0, -0.3, 0.32, 0.2, 1, -0.32, 0.2],                                                                  // pain
  [0, -0.4, 0, 2, 0, -0.22, 0.4, 0, 2, 0, 0.22, -0.4, 0],                                                                 // bouche
  [4, 0, 0.1, 0.17, 0.27, 3, 0, -0.29, 0.13, 3, -0.05, -0.31, 0.03, 3, 0.06, -0.31, 0.03, 0, 0.1, 0.36, 1, 0.3, 0.46,
    0, -0.08, 0.36, 1, -0.12, 0.48],                                                                                       // chouette
  [0, -0.36, -0.02, 2, 0, 0.36, 0.36, -0.02, 1, -0.36, -0.02, 0, 0.36, -0.02, 2, 0.47, 0.12, 0.3, 0.16],                  // corbeille
  [0, -0.45, 0.1, 1, 0.2, 0.1, 2, 0.42, 0.06, 0.43, -0.05, 1, -0.45, -0.05, 0, 0.08, -0.05, 2, 0.16, -0.21, 0.3, -0.19],   // main
  [0, 0, 0.48, 1, 0, 0.05, 2, -0.36, -0.08, -0.28, -0.4, 2, -0.1, -0.15, 0, 0.05, 2, 0.36, -0.08, 0.28, -0.4, 2, 0.1, -0.15, 0, 0.05,
    2, -0.1, -0.28, 0, -0.46, 2, 0.1, -0.28, 0, 0.05],                                                                    // lotus
  [3, 0, -0.1, 0.24, 0, -0.3, 0.22, 1, 0.3, 0.22],                                                                       // anneau shen
];
/** Couleurs des frises peintes : bleu égyptien, rouge ocre, or, vert. */
const CH5_FRIEZE = [[46, 92, 150], [176, 66, 40], [214, 160, 58], [70, 130, 90]];

/** Hasard entier, le même sur Android (pour qu'un bloc porte les mêmes signes des deux côtés) : 0 ≤ résultat < 1. */
function egHash5(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16;
  return (n >>> 0) % 1000 / 1000;
}

/** Ajoute à vpath5 le signe g, centré en (x, y), d'une hauteur s. */
function egGlyphPath5(g, x, y, s) {
  const d = CH5_GLYPHS[g];
  let i = 0;
  while (i < d.length) {
    const op = d[i];
    if (op === 0) { vpath5.moveTo(x + d[i + 1] * s, y + d[i + 2] * s); i += 3; }
    else if (op === 1) { vpath5.lineTo(x + d[i + 1] * s, y + d[i + 2] * s); i += 3; }
    else if (op === 2) { vpath5.quadTo(x + d[i + 1] * s, y + d[i + 2] * s, x + d[i + 3] * s, y + d[i + 4] * s); i += 5; }
    else if (op === 3) { vpath5.addCircle(x + d[i + 1] * s, y + d[i + 2] * s, d[i + 3] * s); i += 4; }
    else {
      vrect5.set(x + (d[i + 1] - d[i + 3]) * s, y + (d[i + 2] - d[i + 4]) * s, x + (d[i + 1] + d[i + 3]) * s, y + (d[i + 2] + d[i + 4]) * s);
      vpath5.addOval(vrect5); i += 5;
    }
  }
}

/** Trace vpath5 comme une gravure : sillon sombre (ou pigment), lèvre claire du bas éclairée, décalée de off. */
function egEngrave5(canvas, s, ink, lit) {
  vs5.color = ink; vs5.strokeWidth = s * 0.11; canvas.drawPath(vpath5, vs5);
  canvas.save(); canvas.translate(s * 0.045, s * 0.055);
  vs5.color = Color.argb(lit, 255, 244, 214); vs5.strokeWidth = s * 0.045; canvas.drawPath(vpath5, vs5);
  canvas.restore();
}

/**
 * Une face latérale gravée, dans son repère (origine en haut à gauche, x vers la droite sur wd, y vers le bas sur dh) :
 * parfois une frise peinte en haut, un liseré en bas, puis des colonnes de signes, parfois un cartouche.
 */
function egCarveFace5(canvas, h0, wd, dh, right) {
  const lit = right ? 60 : 120, painted = egHash5(h0 + 3) < 0.28;
  const pig = CH5_FRIEZE[Math.floor(egHash5(h0 + 4) * 2)];
  const ink = painted ? Color.argb(170, pig[0], pig[1], pig[2]) : Color.argb(right ? 120 : 135, 92, 60, 24);
  const m = k * 0.12, band = egHash5(h0 + 1), low = egHash5(h0 + 2) < 0.3;
  let y0 = k * 0.13;
  // Frise du haut : carreaux de couleur entre deux filets, ou ondes, ou simple double filet
  if (band < 0.5) {
    const ya = k * 0.1, yb = k * 0.24;
    if (band < 0.25) {
      const n = Math.max(3, Math.floor((wd - 2 * m) / (k * 0.11))), cw = (wd - 2 * m) / n;
      for (let i = 0; i < n; i++) {
        const c = CH5_FRIEZE[(i + Math.floor(egHash5(h0 + 5) * 4)) % 4];
        vp5.color = Color.argb(right ? 120 : 150, c[0], c[1], c[2]);
        canvas.drawRect(m + i * cw + cw * 0.12, ya + k * 0.025, m + (i + 1) * cw - cw * 0.12, yb - k * 0.025, vp5);
      }
    } else if (band < 0.4) {
      vpath5.reset(); vpath5.moveTo(m, (ya + yb) / 2);
      const n = Math.max(3, Math.floor((wd - 2 * m) / (k * 0.1))), cw = (wd - 2 * m) / n;
      for (let i = 0; i < n; i++) vpath5.quadTo(m + (i + 0.5) * cw, i % 2 ? yb - k * 0.02 : ya + k * 0.02, m + (i + 1) * cw, (ya + yb) / 2);
      egEngrave5(canvas, k * 0.2, ink, lit);
    }
    vpath5.reset(); vpath5.moveTo(m, ya); vpath5.lineTo(wd - m, ya); vpath5.moveTo(m, yb); vpath5.lineTo(wd - m, yb);
    egEngrave5(canvas, k * 0.16, ink, lit);
    y0 = yb + k * 0.06;
  }
  let y1 = dh - k * 0.12;
  if (low) {
    // Liseré du bas : double filet
    vpath5.reset(); vpath5.moveTo(m, dh - k * 0.2); vpath5.lineTo(wd - m, dh - k * 0.2); vpath5.moveTo(m, dh - k * 0.14); vpath5.lineTo(wd - m, dh - k * 0.14);
    egEngrave5(canvas, k * 0.15, ink, lit);
    y1 = dh - k * 0.25;
  }
  // Colonnes de signes séparées par des filets ; une colonne devient parfois un cartouche
  const gs = k * 0.24, nc = Math.max(1, Math.floor((wd - 2 * m) / (k * 0.3))), cw = (wd - 2 * m) / nc;
  const nr = Math.max(1, Math.floor((y1 - y0) / (gs * 1.2))), rh = (y1 - y0) / nr;
  const cart = egHash5(h0 + 6) < 0.35 ? Math.floor(egHash5(h0 + 7) * nc) : -1;
  vpath5.reset();
  for (let c = 0; c < nc; c++) {
    const cx = m + (c + 0.5) * cw, inCart = c === cart, sz = inCart ? gs * 0.78 : gs;
    for (let r = 0; r < nr; r++) {
      const g = Math.floor(egHash5(h0 * 31 + c * 7 + r * 13 + 11) * CH5_GLYPHS.length);
      egGlyphPath5(g, cx, y0 + (r + 0.5) * rh, sz);
    }
    if (inCart) {
      // Cartouche : ovale allongé autour des signes, barre au pied
      const l = cx - cw * 0.42, rr = cx + cw * 0.42, t = y0 + k * 0.01, b = y1 - k * 0.05, q = cw * 0.4;
      vpath5.moveTo(l, t + q); vpath5.quadTo(l, t, l + q, t); vpath5.lineTo(rr - q, t); vpath5.quadTo(rr, t, rr, t + q);
      vpath5.lineTo(rr, b - q); vpath5.quadTo(rr, b, rr - q, b); vpath5.lineTo(l + q, b); vpath5.quadTo(l, b, l, b - q); vpath5.close();
      vpath5.moveTo(cx - cw * 0.42, y1 - k * 0.01); vpath5.lineTo(cx + cw * 0.42, y1 - k * 0.01);
    }
    if (c > 0 && c !== cart && c - 1 !== cart) { vpath5.moveTo(m + c * cw, y0); vpath5.lineTo(m + c * cw, y1); }
  }
  egEngrave5(canvas, gs * 0.85, ink, lit);
}

/** Faces gravées d'un bloc de grès (carré : les deux faces visibles, en perspective ; rond : deux colonnes devant). */
function drawEgyptWalls5(canvas, pl, seed) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 97 + 5;
  vs5.shader = null;
  if (pl.round) {
    const ry = 0.70710677 * k * a;
    canvas.save(); canvas.translate(-k * 0.34, ry - k * 0.02);
    egCarveFace5(canvas, h0, k * 0.68, dh - k * 0.02, false);
    canvas.restore();
    return;
  }
  const wd = 2 * a * 0.8660254 * k, yF = 2 * a * 0.5 * k;
  if (egHash5(h0) < 0.85) {
    canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735);
    egCarveFace5(canvas, h0 + 101, wd, dh, false);
    canvas.restore();
  }
  if (egHash5(h0 + 50) < 0.7) {
    canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735);
    egCarveFace5(canvas, h0 + 202, wd, dh, true);
    canvas.restore();
  }
}

function chapterBlockLook5(b) {
  if (quest.season === 26) return chapterBlockLook26(b);
  if (quest.season === 27) return chapterBlockLook27(b);
  if (quest.season === 28) return chapterBlockLook28(b);
  if (quest.season === 29) return chapterBlockLook29(b);
  if (quest.season === 30) return chapterBlockLook30(b);
  if (quest.season === 31) return chapterBlockLook31(b);
  if (quest.season === 32) return chapterBlockLook32(b);
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(0xFFE8C46A, 'metal', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFF8A5A32, 'bois', false);       // felouque
  if (k0 === Kind.CRUMBLY) return std(0xFFF0DCAE, 'granit', false);    // grès friable
  if (k0 === Kind.TRAMPOLINE) return std(0xFF7CB342, 'lisse', true);   // gerbe de papyrus
  return std(CH5_SANDSTONE[c % 3], 'granit');
}

function drawChapterDeco5(canvas, pl) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, sin = Math.sin, abs = Math.abs;
  vp5.shader = null;
  const seed = Math.abs(Math.trunc(pl.cx * 7 + pl.cz * 13)), kd = pl.kind;
  if (pl.theme === 26) { drawChapterDeco26(canvas, pl, seed); return; }
  if (pl.theme === 27) { drawChapterDeco27(canvas, pl, seed); return; }
  if (pl.theme === 28) { drawChapterDeco28(canvas, pl, seed); return; }
  if (pl.theme === 29) { drawChapterDeco29(canvas, pl, seed); return; }
  if (pl.theme === 30) { drawChapterDeco30(canvas, pl, seed); return; }
  if (pl.theme === 31) { drawChapterDeco31(canvas, pl, seed); return; }
  if (pl.theme === 32) { drawChapterDeco32(canvas, pl, seed); return; }
  const isoLine = (u0, v0, u1, v1) => canvas.drawLine(isoX(u0 * a, v0 * a), isoY(u0 * a, 0, v0 * a), isoX(u1 * a, v1 * a), isoY(u1 * a, 0, v1 * a), vs5);
  if (kd === Kind.MOVING) {
    // Felouque : mât et grande voile latine qui se gonfle au vent, petites vagues du Nil autour
    vs5.strokeWidth = k * 0.025;
    for (let i = 0; i < 2; i++) { const q = (time * 0.7 + i * 0.5) % 1; vrect5.set(-rx * (1 + q * 0.4), -ry * (1 + q * 0.4), rx * (1 + q * 0.4), ry * (1 + q * 0.4)); vs5.color = Color.argb(Math.floor(120 * (1 - q)), 210, 240, 255); canvas.drawOval(vrect5, vs5); }
    vs5.color = pc5('#5A3A1E'); vs5.strokeWidth = k * 0.04;
    canvas.drawLine(0, 0, 0, -k * 1.25, vs5);
    const puff = sin(time * 1.6 + seed) * k * 0.06;
    vpath5.reset(); vpath5.moveTo(0, -k * 1.25); vpath5.quadTo(k * 0.55 + puff, -k * 0.75, k * 0.62 + puff, -k * 0.18); vpath5.lineTo(0, -k * 0.18); vpath5.close();
    vp5.color = pc5('#FFF8EC'); canvas.drawPath(vpath5, vp5);
    vs5.color = Color.argb(110, 160, 130, 90); vs5.strokeWidth = k * 0.015; canvas.drawPath(vpath5, vs5);
    vs5.color = pc5('#5A3A1E'); vs5.strokeWidth = k * 0.025; canvas.drawLine(-k * 0.1, -k * 1.3, k * 0.7 + puff, -k * 0.12, vs5);
  } else if (kd === Kind.CRUMBLY) {
    drawEgyptWalls5(canvas, pl, seed);
    // Grès fendu, un filet de sable qui s'échappe
    vs5.color = Color.argb(150, 140, 100, 50); vs5.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.2, -rx * 0.05, ry * 0.15, vs5); canvas.drawLine(-rx * 0.05, ry * 0.15, rx * 0.45, -ry * 0.25, vs5);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; vp5.color = Color.argb(Math.floor(160 * (1 - q)), 230, 200, 140); canvas.drawCircle(rx * (0.1 + 0.08 * i), ry * 0.2 + q * k * 0.5, k * 0.025, vp5); }
  } else if (kd === Kind.TRAMPOLINE) {
    // Couronne de papyrus qui pousse autour du trampoline (côtés et arrière, le centre reste libre) :
    // tiges nues qui ondulent, penchées vers l'extérieur, ombelle en gerbe au sommet
    for (let i = 0; i < CH5_PAPYRUS_RING.length; i++) {
      const th = CH5_PAPYRUS_RING[i], cx = Math.cos(th), bx = cx * rx * 0.72, by = Math.sin(th) * ry * 0.72;
      const sway = sin(time * 2.4 + i * 1.3) * k * 0.035, lean = cx * 0.35;
      const hh = k * (0.5 + 0.12 * (1 - Math.abs(cx)) + 0.05 * ((seed + i) % 3));
      const tx = bx + Math.sin(lean) * hh + sway, ty = by - Math.cos(lean) * hh;
      vpath5.reset(); vpath5.moveTo(bx, by); vpath5.quadTo(bx + (tx - bx) * 0.3, by + (ty - by) * 0.5, tx, ty);
      vs5.color = pc5('#4E7A26'); vs5.strokeWidth = k * 0.03; canvas.drawPath(vpath5, vs5);
      vs5.color = pc5('#7A6A2E'); vs5.strokeWidth = k * 0.04; canvas.drawLine(bx, by, bx + (tx - bx) * 0.08, by - k * 0.07, vs5);
      drawPapyrusUmbel5(canvas, tx, ty, k * 0.2, lean + sway / k);
    }
  } else if (kd !== Kind.MINI && !pl.finish) drawEgyptWalls5(canvas, pl, seed);
  if (kd === Kind.MOVING || kd === Kind.CRUMBLY || kd === Kind.TRAMPOLINE) return;
  if (seed % 4 === 0) {
    // Œil d'Horus gravé
    vs5.color = Color.argb(150, 90, 60, 20); vs5.strokeWidth = k * 0.025;
    vrect5.set(-k * 0.2, -k * 0.08, k * 0.2, k * 0.08); canvas.drawOval(vrect5, vs5);
    vp5.color = Color.argb(170, 60, 40, 10); canvas.drawCircle(0, 0, k * 0.055, vp5);
    canvas.drawLine(-k * 0.05, k * 0.08, -k * 0.08, k * 0.22, vs5);
    vpath5.reset(); vpath5.moveTo(k * 0.04, k * 0.08); vpath5.quadTo(k * 0.1, k * 0.2, k * 0.2, k * 0.17); canvas.drawPath(vpath5, vs5);
    canvas.drawLine(-k * 0.22, -k * 0.13, k * 0.2, -k * 0.14, vs5);
  } else {
    // Joints entre les pierres et petits hiéroglyphes
    vs5.color = Color.argb(90, 120, 85, 40); vs5.strokeWidth = k * 0.015;
    isoLine(0, -0.9, 0, 0.9); isoLine(-0.9, 0.3, 0.9, 0.3);
    vs5.color = Color.argb(110, 110, 75, 30); vs5.strokeWidth = k * 0.02;
    const gx = isoX(-0.45 * a, -0.45 * a), gy = isoY(-0.45 * a, 0, -0.45 * a);
    if (seed % 3 === 0) { canvas.drawLine(gx, gy - k * 0.12, gx, gy + k * 0.06, vs5); vrect5.set(gx - k * 0.05, gy - k * 0.24, gx + k * 0.05, gy - k * 0.12); canvas.drawOval(vrect5, vs5); canvas.drawLine(gx - k * 0.08, gy - k * 0.08, gx + k * 0.08, gy - k * 0.08, vs5); }
    else if (seed % 3 === 1) { vpath5.reset(); vpath5.moveTo(gx - k * 0.12, gy); vpath5.quadTo(gx - k * 0.06, gy - k * 0.1, gx, gy); vpath5.quadTo(gx + k * 0.06, gy - k * 0.1, gx + k * 0.12, gy); canvas.drawPath(vpath5, vs5); }
    else canvas.drawCircle(gx, gy - k * 0.06, k * 0.06, vs5);
  }
}

/** Scarabée d'or à ramasser (25). */
function drawChapterPickup5(canvas, cy, shadow) {
  if (quest.season === 26) return drawChapterPickup26(canvas, cy, shadow);
  if (quest.season === 27) return drawChapterPickup27(canvas, cy, shadow);
  if (quest.season === 28) return drawChapterPickup28(canvas, cy, shadow);
  if (quest.season === 29) return drawChapterPickup29(canvas, cy, shadow);
  if (quest.season === 30) return drawChapterPickup30(canvas, cy, shadow);
  if (quest.season === 31) return drawChapterPickup31(canvas, cy, shadow);
  if (quest.season === 32) return drawChapterPickup32(canvas, cy, shadow);
  const r = k * 0.18;
  vp5.shader = null;
  if (shadow) { vp5.color = Color.argb(45, 0, 0, 0); vrect5.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(vrect5, vp5); }
  vp5.color = Color.argb(Math.floor(70 + 40 * Math.sin(time * 4)), 255, 210, 80); canvas.drawCircle(0, cy, r * 1.35, vp5);
  vs5.color = pc5('#8A5A00'); vs5.strokeWidth = r * 0.1;
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { const yy = cy - r * 0.2 + j * r * 0.35; canvas.drawLine(s * r * 0.4, yy, s * r * 0.85, yy + (j - 1) * r * 0.25, vs5); }
  vp5.color = pc5('#FFC93C'); vrect5.set(-r * 0.55, cy - r * 0.45, r * 0.55, cy + r * 0.85); canvas.drawOval(vrect5, vp5);
  vs5.color = pc5('#B8860B'); vs5.strokeWidth = r * 0.07; canvas.drawLine(0, cy - r * 0.4, 0, cy + r * 0.8, vs5);
  vp5.color = pc5('#E0A82E'); canvas.drawCircle(0, cy - r * 0.6, r * 0.28, vp5);
  vp5.color = pc5('#FF7043'); canvas.drawCircle(0, cy - r * 1.0, r * 0.18, vp5);
  vp5.color = Color.argb(170, 255, 255, 255); canvas.drawCircle(-r * 0.22, cy - r * 0.05, r * 0.12, vp5);
  return true;
}

/** Obélisque à la pointe dorée à l'arrivée (25). */
function drawChapterFinish5(canvas, p) {
  if (quest.season === 26) { drawChapterFinish26(canvas, p); return; }
  if (quest.season === 27) { drawChapterFinish27(canvas, p); return; }
  if (quest.season === 28) { drawChapterFinish28(canvas, p); return; }
  if (quest.season === 29) { drawChapterFinish29(canvas, p); return; }
  if (quest.season === 30) { drawChapterFinish30(canvas, p); return; }
  if (quest.season === 31) { drawChapterFinish31(canvas, p); return; }
  if (quest.season === 32) { drawChapterFinish32(canvas, p); return; }
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  vp5.shader = null;
  vp5.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 220, 90); canvas.drawCircle(bx, by - k * 1.5, k * 0.5, vp5);
  vpath5.reset(); vpath5.moveTo(bx - k * 0.2, by); vpath5.lineTo(bx - k * 0.13, by - k * 1.35); vpath5.lineTo(bx + k * 0.13, by - k * 1.35); vpath5.lineTo(bx + k * 0.2, by); vpath5.close();
  vp5.color = pc5('#E8CC90'); canvas.drawPath(vpath5, vp5);
  vpath5.reset(); vpath5.moveTo(bx, by); vpath5.lineTo(bx + k * 0.2, by); vpath5.lineTo(bx + k * 0.13, by - k * 1.35); vpath5.lineTo(bx, by - k * 1.35); vpath5.close();
  vp5.color = pc5('#C8A868'); canvas.drawPath(vpath5, vp5);
  vpath5.reset(); vpath5.moveTo(bx - k * 0.13, by - k * 1.35); vpath5.lineTo(bx, by - k * 1.6); vpath5.lineTo(bx + k * 0.13, by - k * 1.35); vpath5.close();
  vp5.color = pc5('#FFC93C'); canvas.drawPath(vpath5, vp5);
  vs5.color = Color.argb(140, 110, 75, 30); vs5.strokeWidth = k * 0.02;
  for (let i = 0; i < 4; i++) { const yy = by - k * (0.25 + 0.25 * i); canvas.drawLine(bx - k * 0.06, yy, bx + k * 0.06, yy, vs5); }
}

/** Objet doré : l'œil d'Horus (25). */
function drawCollectible5(canvas, c, x, y, r, got) {
  if (c === 26) { drawCollectible26(canvas, c, x, y, r, got); return; }
  if (c === 27) { drawCollectible27(canvas, c, x, y, r, got); return; }
  if (c === 28) { drawCollectible28(canvas, c, x, y, r, got); return; }
  if (c === 29) { drawCollectible29(canvas, c, x, y, r, got); return; }
  if (c === 30) { drawCollectible30(canvas, c, x, y, r, got); return; }
  if (c === 31) { drawCollectible31(canvas, c, x, y, r, got); return; }
  if (c === 32) { drawCollectible32(canvas, c, x, y, r, got); return; }
  vp5.shader = null;
  const main = got ? pc5('#FFC93C') : pc5('#9A9AA2'), dark = got ? pc5('#1A3A7A') : pc5('#6E6E78');
  if (got) { vp5.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, vp5); }
  vpath5.reset(); vpath5.moveTo(x - r, y); vpath5.quadTo(x - r * 0.1, y - r * 0.75, x + r * 0.9, y - r * 0.05); vpath5.quadTo(x, y + r * 0.55, x - r, y); vpath5.close();
  vp5.color = main; canvas.drawPath(vpath5, vp5);
  vs5.color = dark; vs5.strokeWidth = r * 0.12; canvas.drawPath(vpath5, vs5);
  vp5.color = dark; canvas.drawCircle(x - r * 0.05, y - r * 0.05, r * 0.24, vp5);
  canvas.drawLine(x - r * 0.95, y - r * 0.55, x + r * 0.85, y - r * 0.6, vs5);
  canvas.drawLine(x - r * 0.15, y + r * 0.3, x - r * 0.3, y + r * 0.95, vs5);
  vpath5.reset(); vpath5.moveTo(x + r * 0.15, y + r * 0.28); vpath5.quadTo(x + r * 0.4, y + r * 0.95, x + r * 0.75, y + r * 0.7); vpath5.quadTo(x + r * 0.85, y + r * 0.5, x + r * 0.65, y + r * 0.5);
  canvas.drawPath(vpath5, vs5);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground5(canvas, c) {
  if (c === 26) { drawChapterMapBackground26(canvas); return; }
  if (c === 27) { drawChapterMapBackground27(canvas); return; }
  if (c === 28) { drawChapterMapBackground28(canvas); return; }
  if (c === 29) { drawChapterMapBackground29(canvas); return; }
  if (c === 30) { drawChapterMapBackground30(canvas); return; }
  if (c === 31) { drawChapterMapBackground31(canvas); return; }
  if (c === 32) { drawChapterMapBackground32(canvas); return; }
  vp5.color = Color.WHITE; vp5.shader = new LinearGradient(0, 0, 0, h, [0xFF2A3A7A, 0xFFF08A4A, 0xFFF6D08A], [0, 0.55, 1]); canvas.drawRect(0, 0, w, h, vp5); vp5.shader = null;
}
