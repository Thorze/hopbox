'use strict';
// Cartes et décors de l'Aventure, chapitres 2 à 16 (équivalent de MapArt.kt) :
// - fonds peints (images/scenes/cN.webp, faits par tools/scenes), plein écran, pour la carte et pendant les niveaux ;
// - ambiance animée par-dessus (bulles, neige, braises, pétales…) ;
// - sentier de la carte : large chemin bordé, la partie déjà faite en couleur vive ;
// - socles des niveaux : plateau en relief à la matière du chapitre, numéro bien lisible devant, 3 objets dorés dessus.

const sceneArt = { full: new Map(), order: [], thumbs: new Map(), loading: new Set() };
/** Images pleine taille gardées en mémoire (la carte du chapitre en cours, et la précédente). */
const SCENE_KEEP = 2;
const ap = new Paint(), apS = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), apPath = new Path();

function sceneUrl(c) { return 'images/scenes/c' + c + '.webp'; }
function makeSceneThumb(c, img) {
  if (sceneArt.thumbs.has(c)) return;
  const t = document.createElement('canvas'); t.width = 180; t.height = 400;
  t.getContext('2d').drawImage(img, 0, 0, 180, 400);
  sceneArt.thumbs.set(c, t);
}
/** Fond peint du chapitre c, ou null tant qu'il se charge. */
function sceneImage(c) {
  let img = sceneArt.full.get(c);
  if (!img) {
    img = new Image();
    img.onload = () => makeSceneThumb(c, img);
    img.src = sceneUrl(c);
    sceneArt.full.set(c, img); sceneArt.order.push(c);
    while (sceneArt.order.length > SCENE_KEEP) sceneArt.full.delete(sceneArt.order.shift());
  } else if (sceneArt.order[sceneArt.order.length - 1] !== c) {
    sceneArt.order.splice(sceneArt.order.indexOf(c), 1); sceneArt.order.push(c);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
/** Petite version du fond (vignettes de la liste des chapitres), ou null tant qu'elle se prépare. */
function sceneThumb(c) {
  const t = sceneArt.thumbs.get(c);
  if (t) return t;
  if (!sceneArt.loading.has(c)) {
    sceneArt.loading.add(c);
    const img = new Image(); img.onload = () => makeSceneThumb(c, img); img.src = sceneUrl(c);
  }
  return null;
}
/** Image posée pour couvrir le rectangle (rognée sur les côtés ou en haut, le bas est gardé en priorité). */
function drawCover(canvas, img, x, y, ww, hh) {
  const iw = img.width, ih = img.height, s = Math.max(ww / iw, hh / ih), dw = iw * s, dh = ih * s;
  canvas.save(); canvas.clipRect(x, y, x + ww, y + hh);
  canvas.drawBitmap(img, x + (ww - dw) / 2, y + (hh - dh) * 0.65, dw, dh);
  canvas.restore();
}
/** Vignette d'un chapitre (liste des chapitres) ; false si l'image n'est pas encore prête. */
function drawSceneThumb(canvas, c, th, rad) {
  const t = c >= 2 ? sceneThumb(c) : null;
  if (!t) return false;
  canvas.save();
  const clip = new Path(), p = clip.p;
  if (p.roundRect) p.roundRect(th.left, th.top, th.width(), th.height(), rad); else p.rect(th.left, th.top, th.width(), th.height());
  canvas.clipPath(clip);
  drawCover(canvas, t, th.left, th.top, th.width(), th.height());
  canvas.restore();
  return true;
}

/**
 * Fond peint plein écran du chapitre c (carte, ou décor d'un niveau si level), avec son ambiance animée.
 * false si l'image n'est pas encore chargée : l'ancien décor dessiné prend alors le relais.
 */
function drawSceneBackground(canvas, c, level) {
  if (c < 2) return false;
  const img = sceneImage(c);
  if (!img) return false;
  drawCover(canvas, img, 0, 0, w, h);
  // Pendant un niveau, le fond est un peu assombri : les blocs ressortent mieux
  if (level) { ap.shader = null; ap.color = Color.argb(50, 0, 0, 0); canvas.drawRect(0, 0, w, h, ap); }
  drawSceneAmbient(canvas, c, level);
  return true;
}

// ---------- Ambiance animée ----------
// [nombre, genre, couleurs (0xRRGGBB), taille (× w), vitesse x, vitesse y (× h par seconde), ondulation (× w), scintillement 0..1]
const AMBIENT = {
  2: [40, 'bubble', [0xE8FBFF], 0.006, 0, -0.05, 0.01, 0],
  3: [50, 'twinkle', [0xFFFFFF, 0xBFF6FF], 0.005, 0, 0, 0, 1],
  4: [30, 'dot', [0xFFE0B0], 0.003, 0.02, -0.004, 0.006, 0.3],
  5: [36, 'glow', [0xB6FF4A], 0.005, 0, -0.03, 0.01, 0.5],
  6: [40, 'twinkle', [0xFFFFFF, 0xFFC6E0], 0.006, 0, -0.01, 0.006, 1],
  7: [70, 'dot', [0xFFFFFF], 0.004, 0.01, 0.06, 0.02, 0],
  8: [50, 'glow', [0xFFB347, 0xFF5A1A], 0.004, 0.005, -0.06, 0.012, 0.6],
  9: [40, 'glow', [0xFFE7B0], 0.003, 0.004, -0.006, 0.01, 0.8],
  10: [26, 'glow', [0xFFF6A0, 0xE8FF8A], 0.005, 0.006, -0.01, 0.02, 0.7],
  11: [30, 'twinkle', [0xFF4FD8, 0x4FF0FF], 0.005, 0, 0, 0, 1],
  12: [60, 'streak', [0xFFD9A0], 0.003, 0.18, 0.01, 0.004, 0],
  13: [22, 'glow', [0xC9D0FF, 0xB388FF], 0.007, 0.01, -0.008, 0.02, 0.7],
  14: [50, 'confetti', [0xFF2F7A, 0x2FD0FF, 0xFFD23F, 0x7AFF5A, 0xFFFFFF], 0.006, 0.01, 0.07, 0.02, 0],
  15: [34, 'petal', [0xFFC1D6, 0xFF9FBF], 0.008, 0.03, 0.05, 0.03, 0],
  16: [40, 'twinkle', [0xFFFFFF, 0xFFE0F0], 0.006, 0, -0.005, 0.004, 1],
  17: [34, 'twinkle', [0xFFF0C0, 0xFFFFFF], 0.005, 0, 0, 0, 1],
  18: [32, 'glow', [0xFFF6C0, 0xE8FF8A], 0.004, 0.005, -0.008, 0.015, 0.6],
  19: [36, 'bubble', [0xE8FBFF], 0.006, 0, -0.05, 0.01, 0],
  20: [60, 'twinkle', [0xFFFFFF, 0xBFD8FF], 0.005, 0, 0, 0, 1],
  21: [26, 'dot', [0xFFE0B0], 0.003, 0.03, -0.004, 0.006, 0.3],
  22: [30, 'glow', [0x8FE0FF, 0xD08FFF], 0.004, 0, -0.01, 0.01, 0.8],
  23: [40, 'confetti', [0xFF5C9A, 0xFFD54F, 0x4FC3F7, 0x8CE06A], 0.006, 0.01, 0.05, 0.02, 0],
  24: [36, 'glow', [0xFFE8A0, 0xE1BEE7], 0.004, 0, -0.02, 0.012, 0.7],
};
const ca = (rgb, a) => clamp(Math.round(a), 0, 255) * 16777216 + rgb;

function drawSceneAmbient(canvas, c, level) {
  const a = AMBIENT[c];
  if (!a) return;
  const [n, kind, cols, size, vx, vy, wob, tw] = a, ox = level ? -camX * 0.12 : 0;
  ap.shader = null;
  for (let i = 0; i < n; i++) {
    const h1 = hash01(i * 7 + c * 131), h2 = hash01(i * 13 + c * 17 + 5), h3 = hash01(i * 29 + c * 3 + 11), sp = 0.6 + 0.8 * h3;
    let x = h1 * w + vx * h * time * sp + ox + Math.sin(time * (0.6 + h2) + i) * wob * w;
    let y = h2 * h + vy * h * time * sp;
    x = ((x % (w * 1.1)) + w * 1.1) % (w * 1.1) - w * 0.05;
    y = ((y % (h * 1.1)) + h * 1.1) % (h * 1.1) - h * 0.05;
    const r = size * w * (0.6 + 0.8 * h3), col = cols[i % cols.length];
    const al = tw > 0 ? 1 - tw * (0.5 + 0.5 * Math.sin(time * (2 + 3 * h1) + i * 1.7)) : 1;
    switch (kind) {
      case 'bubble':
        apS.color = ca(col, 150); apS.strokeWidth = r * 0.25; canvas.drawCircle(x, y, r, apS);
        ap.color = ca(col, 200); canvas.drawCircle(x - r * 0.35, y - r * 0.35, r * 0.25, ap);
        break;
      case 'twinkle':
        apS.color = ca(col, 230 * al); apS.strokeWidth = r * 0.3;
        canvas.drawLine(x - r * 2, y, x + r * 2, y, apS); canvas.drawLine(x, y - r * 2, x, y + r * 2, apS);
        ap.color = ca(col, 255 * al); canvas.drawCircle(x, y, r * 0.5, ap);
        break;
      case 'dot': ap.color = ca(col, 210 * al); canvas.drawCircle(x, y, r, ap); break;
      case 'glow':
        ap.color = ca(col, 45 * al); canvas.drawCircle(x, y, r * 3, ap);
        ap.color = ca(col, 230 * al); canvas.drawCircle(x, y, r, ap);
        break;
      case 'streak': apS.color = ca(col, 140); apS.strokeWidth = r * 0.7; canvas.drawLine(x, y, x - r * 8, y - r * 0.4, apS); break;
      case 'confetti': case 'petal':
        canvas.save(); canvas.rotate((time * 120 * sp + i * 47) % 360, x, y);
        ap.color = ca(col, 230);
        if (kind === 'petal') { rect.set(x - r, y - r * 0.55, x + r, y + r * 0.55); canvas.drawOval(rect, ap); }
        else canvas.drawRect(x - r, y - r * 0.4 * Math.abs(Math.sin(time * 3 + i)), x + r, y + r * 0.4 * Math.abs(Math.sin(time * 3 + i)) + 1, ap);
        canvas.restore();
        break;
    }
  }
}

// ---------- Sentier de la carte ----------
// [partie faite, partie à faire, bordure] pour chaque chapitre
const MAP_ROAD = {
  2: [0xFFE6A8, 0xD8C9A6, 0x5A3E22], 3: [0x9FF6FF, 0x8C86A8, 0x1E1A33], 4: [0xFFD54F, 0xC9B89A, 0x3A2A1A],
  5: [0xC6FF5A, 0x9AA27A, 0x1E2410], 6: [0xFFF0FA, 0xD8C8E8, 0x6A4A8A], 7: [0xFFFFFF, 0xC8DCEB, 0x2E5A80],
  8: [0xFFB347, 0x7A5A50, 0x1A0A06], 9: [0xFFD27A, 0xA08060, 0x2A1A0A], 10: [0xFFF3A0, 0xC8B890, 0x3A2A10],
  11: [0x4FF0FF, 0x6A5A8A, 0x14082A], 12: [0xFFE2A0, 0xD2B488, 0x5A3A1A], 13: [0xD9C8FF, 0x7E7890, 0x120E1E],
  14: [0xFF4FA0, 0x6A6070, 0x0A080E], 15: [0xFFFFFF, 0xCFC8B8, 0x4A4038], 16: [0xFFFFFF, 0xF2C0D8, 0x8A3A5A],
  17: [0xFFE2A0, 0xC8B08A, 0x5A3A1E], 18: [0xD8F08A, 0x9A8A6A, 0x2E3A1E],
  19: [0x9FF6FF, 0x8AB8C8, 0x1E4A60], 20: [0x9FD8FF, 0x7A7A9A, 0x14102A], 21: [0xFFE2A0, 0xD8A878, 0x5A2A14], 22: [0xD08FFF, 0x6A5A7A, 0x120A1E], 23: [0xFFFFFF, 0xFFC0DC, 0x8A2A5A], 24: [0xFFE07A, 0xA898C8, 0x2A1A3E],
};

/** Chemin (Path) le long de la ligne pts, jusqu'à la longueur upTo (Infinity : en entier). */
function roadPath(pts, upTo) {
  apPath.reset(); apPath.moveTo(pts[0], pts[1]);
  let run = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1], d = Math.hypot(x1 - x0, y1 - y0);
    if (run + d >= upTo) { const f = d > 0 ? (upTo - run) / d : 0; apPath.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); break; }
    apPath.lineTo(x1, y1); run += d;
  }
  return apPath;
}

/** Sentier large et lisible : ombre, bordure, chemin ; la partie déjà parcourue (jusqu'au niveau en cours) brille. */
function drawMapRoad(canvas, c, lay, done) {
  const [doneCol, todoCol, edge] = MAP_ROAD[c] || MAP_ROAD[2], pts = lay.line;
  ap.shader = null; apS.shader = null;
  canvas.save(); canvas.translate(0, w * 0.007);
  apS.color = ca(0, 80); apS.strokeWidth = w * 0.04; canvas.drawPath(roadPath(pts, Infinity), apS);
  canvas.restore();
  apS.color = ca(edge, 255); apS.strokeWidth = w * 0.034; canvas.drawPath(roadPath(pts, Infinity), apS);
  apS.color = ca(todoCol, 235); apS.strokeWidth = w * 0.022; canvas.drawPath(roadPath(pts, Infinity), apS);
  const sDone = lay.nodeS ? lay.nodeS[Math.min(done, lay.nodeS.length - 1)] : 0;
  if (sDone > 0) {
    apS.color = ca(doneCol, 90); apS.strokeWidth = w * 0.03; canvas.drawPath(roadPath(pts, sDone), apS);
    apS.color = ca(doneCol, 255); apS.strokeWidth = w * 0.02; canvas.drawPath(roadPath(pts, sDone), apS);
  }
  // Pointillés au milieu du chemin
  apS.color = ca(edge, 120); apS.strokeWidth = w * 0.0055; apS.strokeCap = 'butt';
  drawDashedPath(canvas, pts, apS);
  apS.strokeCap = 'round';
}

// ---------- Socles des niveaux ----------
// [dessus, côté, accent] pour chaque chapitre
const PEDESTAL = {
  2: [0xE9D3A6, 0xB98B5E, 0xFF7F9E], 3: [0xA9A6B8, 0x6B6780, 0x5CF2E6], 4: [0x8A9660, 0x4E5A2A, 0xFFD54F],
  5: [0xE3C000, 0x8C7600, 0x7CFF4F], 6: [0xFFFFFF, 0xE2D2F2, 0xFFC6E0], 7: [0xF2FAFF, 0x8FC2E4, 0xFFFFFF],
  8: [0x5A4A4E, 0x2A2024, 0xFF7A1F], 9: [0xD8B24A, 0x8C6A2B, 0xFFE7A0], 10: [0xD9B98A, 0x7A5634, 0x7CC24A],
  11: [0x2A2340, 0x141020, 0x00E5FF], 12: [0xE6C68A, 0xB88A4A, 0x2F4F9E], 13: [0x77727F, 0x4A4652, 0xB388FF],
  14: [0x3A3A42, 0x16161A, 0xFF4081], 15: [0xE8E2D0, 0x9C9584, 0xD32F2F], 16: [0xFF9EC4, 0xE2A56B, 0xFFFFFF],
  17: [0xC9965A, 0x7A4A22, 0xFFD54F], 18: [0x8A9466, 0x4E5A3A, 0xF2EAD0],
  19: [0xE6F2F2, 0x8AB0B8, 0x7FF6FF], 20: [0xCFD8DC, 0x607D8B, 0xFF5252], 21: [0xD8885A, 0x8A4A2A, 0xFFC93C], 22: [0x6A5E7A, 0x3A3048, 0x8FE0FF], 23: [0xE53935, 0x8E1B1B, 0xFFD54F], 24: [0x9A8AB8, 0x5A4A78, 0xE0A82E],
};
const opaqueOf = (rgb) => 0xFF000000 + rgb;

/** Contour du côté du socle : bande de hauteur hgt sous l'ellipse du dessus (demi-axes rx, ry). */
function pedestalSide(x, y, rx, ry, hgt) {
  const k = 0.5523, p = apPath;
  p.reset(); p.moveTo(x - rx, y); p.lineTo(x - rx, y + hgt);
  p.cubicTo(x - rx, y + hgt + ry * k, x - rx * k, y + hgt + ry, x, y + hgt + ry);
  p.cubicTo(x + rx * k, y + hgt + ry, x + rx, y + hgt + ry * k, x + rx, y + hgt);
  p.lineTo(x + rx, y); p.close();
  return p;
}

/**
 * Socle du niveau n, posé en (x, y) (y0 : le sol, sans le rebond). medals : objets dorés gagnés (bits 1, 2, 4).
 * Verrouillé : grisé, sans objets ; en cours : halo qui pulse ; les 3 objets gagnés : liseré doré.
 */
function drawMapPedestal(canvas, c, x, y, y0, rx, n, medals, unlocked, isDone, cur, last) {
  const P = PEDESTAL[c] || PEDESTAL[2], ry = rx * 0.42, hgt = rx * 0.36;
  const tone = (rgb) => (unlocked ? opaqueOf(rgb) : Theme.lerp(opaqueOf(rgb), 0xFF6E7380, 0.62));
  const top = tone(P[0]), side = tone(P[1]), acc = tone(P[2]);
  ap.shader = null; apS.shader = null;
  // Ombre au sol (reste au sol quand le socle rebondit)
  canvas.save(); canvas.scale(1, 0.38, x, y0 + hgt + ry * 0.4);
  ap.shader = new RadialGradient(x, y0 + hgt + ry * 0.4, rx * 1.35, [Color.argb(120, 0, 0, 0), Color.argb(0, 0, 0, 0)], [0.35, 1]);
  canvas.drawCircle(x, y0 + hgt + ry * 0.4, rx * 1.35, ap);
  canvas.restore(); ap.shader = null;
  // Niveau en cours : halo qui pulse autour du socle
  if (cur) {
    const p = 0.5 + 0.5 * Math.sin(time * 4);
    canvas.save(); canvas.scale(1, 0.45, x, y + hgt * 0.5);
    ap.shader = new RadialGradient(x, y + hgt * 0.5, rx * (1.5 + 0.2 * p), [ca(0xFFB060, 170), ca(0xFFB060, 0)], [0.45, 1]);
    canvas.drawCircle(x, y + hgt * 0.5, rx * (1.5 + 0.2 * p), ap);
    canvas.restore(); ap.shader = null;
  }
  // Côté, ombré de gauche à droite
  const sidePath = pedestalSide(x, y, rx, ry, hgt);
  ap.shader = new LinearGradient(x - rx, 0, x + rx, 0, [shade(side, 0.7), shade(side, 1.18), side, shade(side, 0.5)], [0, 0.3, 0.62, 1]);
  canvas.drawPath(sidePath, ap); ap.shader = null;
  drawPedestalDeco(canvas, c, x, y, rx, ry, hgt, acc, side, unlocked);
  apS.color = Color.argb(110, 0, 0, 0); apS.strokeWidth = rx * 0.03; canvas.drawPath(pedestalSide(x, y, rx, ry, hgt), apS);
  // Dessus éclairé de haut à gauche
  rect.set(x - rx, y - ry, x + rx, y + ry);
  ap.shader = new RadialGradient(x - rx * 0.35, y - ry * 0.5, rx * 1.4, [shade(top, 1.22), top, shade(top, 0.82)], [0, 0.5, 1]);
  canvas.drawOval(rect, ap); ap.shader = null;
  rect.set(x - rx * 0.78, y - ry * 0.78, x + rx * 0.78, y + ry * 0.78);
  apS.color = (shade(top, 0.78) & 0xFFFFFF) + 0x60000000; apS.strokeWidth = rx * 0.035; canvas.drawOval(rect, apS);
  rect.set(x - rx, y - ry, x + rx, y + ry);
  apS.color = Color.argb(150, 255, 255, 255); apS.strokeWidth = rx * 0.045; canvas.drawArc(rect, 195, 150, false, apS);
  apS.color = Color.argb(90, 0, 0, 0); apS.strokeWidth = rx * 0.03; canvas.drawOval(rect, apS);
  // Les 3 objets dorés gagnés : liseré doré
  if (unlocked && medals === 7) { apS.color = 0xFFFFC93C; apS.strokeWidth = rx * 0.07; canvas.drawOval(rect, apS); }
  if (c === 11 && unlocked) { apS.color = ca(0x00E5FF, 90); apS.strokeWidth = rx * 0.12; canvas.drawOval(rect, apS); apS.color = ca(0x7FF6FF, 255); apS.strokeWidth = rx * 0.03; canvas.drawOval(rect, apS); }
  // Objets dorés du niveau, sur le dessus (celui du fond d'abord)
  if (unlocked) {
    const er = rx * 0.27, lift = ry * 0.25;
    drawCollectible(canvas, c, x, y - ry * 0.32 - lift, er, (medals & 2) !== 0);
    drawCollectible(canvas, c, x - rx * 0.43, y + ry * 0.05 - lift, er, (medals & 1) !== 0);
    drawCollectible(canvas, c, x + rx * 0.43, y + ry * 0.05 - lift, er, (medals & 4) !== 0);
  }
  if (last) drawCrownSmall(canvas, x, y - ry * 1.9, rx * 0.25);
  // Numéro (ou cadenas) dans une pastille, devant le socle : vert si réussi, orange si c'est le prochain
  const br = Math.max(rx * 0.3, w * 0.036), bcx = x, bcy = y + hgt + ry * 0.45;
  ap.color = Color.argb(80, 0, 0, 0); canvas.drawCircle(bcx, bcy + br * 0.12, br, ap);
  ap.color = isDone ? 0xFF7CB342 : cur ? 0xFFFF7A45 : 0xFF8C929C; canvas.drawCircle(bcx, bcy, br, ap);
  apS.color = Color.WHITE; apS.strokeWidth = br * 0.16; canvas.drawCircle(bcx, bcy, br, apS);
  btnTextPaint.color = Color.WHITE; btnTextPaint.textSize = unlocked ? br * 1.1 : br * 0.9;
  canvas.drawText(unlocked ? String(n) : '🔒', bcx, bcy - (btnTextPaint.descent() + btnTextPaint.ascent()) / 2, btnTextPaint);
}

/** Petit détail du chapitre sur le côté du socle (coraux, rayures de danger, neige, fissures de lave…). */
function drawPedestalDeco(canvas, c, x, y, rx, ry, hgt, acc, side, unlocked) {
  const sin = Math.sin;
  apS.shader = null; ap.shader = null;
  switch (c) {
    case 2:
      apS.color = acc; apS.strokeWidth = rx * 0.06;
      for (const u of [-0.75, 0.62]) { const bx = x + rx * u, by = y + hgt + ry * 0.4; canvas.drawLine(bx, by, bx - rx * 0.08, by - hgt * 0.9, apS); canvas.drawLine(bx - rx * 0.04, by - hgt * 0.45, bx + rx * 0.1, by - hgt * 0.8, apS); }
      break;
    case 3: apS.color = unlocked ? ca(0x5CF2E6, 200) : ca(0x9A9AA8, 120); apS.strokeWidth = rx * 0.05; rect.set(x - rx * 1.02, y + hgt * 0.4 - ry, x + rx * 1.02, y + hgt * 0.4 + ry); canvas.drawArc(rect, 10, 160, false, apS); break;
    case 4: case 5: {
      canvas.save(); canvas.clipPath(pedestalSide(x, y, rx, ry, hgt));
      apS.color = c === 4 ? acc : 0xFF1B1B1B; apS.strokeWidth = rx * 0.12; apS.strokeCap = 'butt';
      for (let i = -6; i <= 6; i++) canvas.drawLine(x + i * rx * 0.3, y + hgt + ry, x + i * rx * 0.3 + hgt * 1.6, y, apS);
      apS.strokeCap = 'round';
      canvas.restore();
      if (c === 5) { ap.color = acc; for (const u of [-0.5, 0.1, 0.6]) { const bx = x + rx * u, by = y + ry * (0.9 - Math.abs(u) * 0.4); rect.set(bx - rx * 0.07, by - rx * 0.02, bx + rx * 0.07, by + hgt * (0.5 + 0.3 * sin(time * 2 + u * 5))); canvas.drawRoundRect(rect, rx * 0.07, rx * 0.07, ap); } }
      break;
    }
    case 6: ap.color = unlocked ? 0xFFFFFFFF : 0xFFB8BAC4; for (const [u, v, r] of [[-0.95, 0.9, 0.26], [-0.6, 1.25, 0.3], [0, 1.4, 0.32], [0.6, 1.25, 0.3], [0.95, 0.9, 0.26]]) canvas.drawCircle(x + rx * u, y + hgt * v, rx * r, ap); break;
    case 7:
      ap.color = unlocked ? 0xFFFFFFFF : 0xFFC8CAD2;
      for (let i = 0; i < 6; i++) { const u = -0.8 + i * 0.32, bx = x + rx * u, by = y + ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.95; apPath.reset(); apPath.moveTo(bx - rx * 0.06, by); apPath.lineTo(bx, by + hgt * (0.4 + 0.3 * hash01(i + 70))); apPath.lineTo(bx + rx * 0.06, by); apPath.close(); canvas.drawPath(apPath, ap); }
      break;
    case 8: apS.color = unlocked ? ca(0xFF7A1F, 230) : ca(0x888888, 120); apS.strokeWidth = rx * 0.04;
      for (const u of [-0.6, 0.1, 0.65]) { const bx = x + rx * u; apPath.reset(); apPath.moveTo(bx, y + ry * 0.8); apPath.lineTo(bx + rx * 0.08, y + hgt * 0.6 + ry * 0.6); apPath.lineTo(bx - rx * 0.05, y + hgt + ry * 0.5); canvas.drawPath(apPath, apS); }
      break;
    case 9: ap.color = shade(acc, 0.85); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, bx = x + Math.cos(a) * rx * 1.02, by = y + Math.sin(a) * ry * 1.02; canvas.drawCircle(bx, by, rx * 0.06, ap); } break;
    case 10: apS.color = shade(side, 0.7); apS.strokeWidth = rx * 0.025; for (const u of [-0.7, -0.3, 0.15, 0.55]) canvas.drawLine(x + rx * u, y + ry * 0.6, x + rx * (u + 0.03), y + hgt + ry * 0.6, apS);
      ap.color = acc; for (const u of [-0.85, -0.5, 0.75]) canvas.drawCircle(x + rx * u, y + ry * 0.55 * (1 - Math.abs(u) * 0.3), rx * 0.1, ap); break;
    case 12: apS.color = acc; apS.strokeWidth = rx * 0.035; for (const u of [-0.6, -0.25, 0.3, 0.65]) { const bx = x + rx * u, by = y + hgt * 0.45 + ry * 0.7; canvas.drawLine(bx, by - hgt * 0.25, bx, by + hgt * 0.25, apS); canvas.drawLine(bx - rx * 0.05, by - hgt * 0.1, bx + rx * 0.05, by - hgt * 0.1, apS); } break;
    case 13: ap.color = acc; for (const u of [-0.85, 0.85]) { const bx = x + rx * u, by = y + ry * 0.3; rect.set(bx - rx * 0.05, by - rx * 0.2, bx + rx * 0.05, by); canvas.drawRect(rect, ap); if (unlocked) { ap.color = ca(0xFFD27A, 200 + 50 * sin(time * 8 + u * 5)); canvas.drawCircle(bx, by - rx * 0.26, rx * 0.06, ap); ap.color = acc; } } break;
    case 14: apS.color = shade(side, 1.8); apS.strokeWidth = rx * 0.03; { const b = unlocked ? 1 + 0.08 * Math.abs(sin(time * 6.28)) : 1; canvas.drawCircle(x, y + hgt * 0.5 + ry * 0.75, hgt * 0.42 * b, apS); canvas.drawCircle(x, y + hgt * 0.5 + ry * 0.75, hgt * 0.2, apS); } break;
    case 15: apS.color = acc; apS.strokeWidth = rx * 0.06; rect.set(x - rx, y + hgt * 0.45 - ry, x + rx, y + hgt * 0.45 + ry); canvas.drawArc(rect, 0, 180, false, apS); break;
    case 16:
      ap.color = acc;
      for (let i = 0; i < 7; i++) { const u = -0.9 + i * 0.3, bx = x + rx * u, by = y + ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.9, d = hgt * (0.3 + 0.5 * hash01(i + 160)); rect.set(bx - rx * 0.07, by - rx * 0.04, bx + rx * 0.07, by + d); canvas.drawRoundRect(rect, rx * 0.07, rx * 0.07, ap); }
      break;
    case 17:
      // Planches du pont et cordage enroulé
      apS.color = shade(side, 0.75); apS.strokeWidth = rx * 0.025;
      for (const u of [-0.6, -0.2, 0.2, 0.6]) canvas.drawLine(x + rx * u, y + ry * 0.75, x + rx * u, y + hgt + ry * 0.75, apS);
      apS.color = 0xFFD9B87A; apS.strokeWidth = rx * 0.07; rect.set(x - rx, y + hgt * 0.5 - ry, x + rx, y + hgt * 0.5 + ry); canvas.drawArc(rect, 0, 180, false, apS);
      break;
    case 18:
      // Mousse qui coule du bord
      ap.color = unlocked ? 0xFF5E8A3A : 0xFF8A8E86;
      for (let i = 0; i < 6; i++) { const u = -0.85 + i * 0.34, bx = x + rx * u, by = y + ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.9, d = hgt * (0.25 + 0.4 * hash01(i + 180)); rect.set(bx - rx * 0.09, by - rx * 0.04, bx + rx * 0.09, by + d); canvas.drawRoundRect(rect, rx * 0.09, rx * 0.09, ap); }
      break;
    case 19: apS.color = shade(side, 0.8); apS.strokeWidth = rx * 0.03; for (const u of [-0.7, -0.35, 0, 0.35, 0.7]) canvas.drawLine(x + rx * u, y + ry * 0.7, x + rx * u, y + hgt + ry * 0.7, apS); break;
    case 20: for (let i = 0; i < 5; i++) { const u = -0.6 + i * 0.3; ap.color = unlocked && Math.trunc(time * 2 + i) % 2 === 0 ? acc : shade(side, 1.3); canvas.drawCircle(x + rx * u, y + hgt * 0.5 + ry * 0.75, rx * 0.05, ap); } break;
    case 21: case 24: apS.color = acc; apS.strokeWidth = rx * 0.06; rect.set(x - rx, y + hgt * 0.45 - ry, x + rx, y + hgt * 0.45 + ry); canvas.drawArc(rect, 0, 180, false, apS); break;
    case 22:
      ap.color = unlocked ? acc : 0xFFB0B4BC;
      for (const u of [-0.75, -0.2, 0.45]) { const bx = x + rx * u, by = y + ry * 0.7; apPath.reset(); apPath.moveTo(bx - rx * 0.07, by); apPath.lineTo(bx, by - hgt * 0.7); apPath.lineTo(bx + rx * 0.07, by); apPath.close(); canvas.drawPath(apPath, ap); }
      break;
    case 23: canvas.save(); canvas.clipPath(pedestalSide(x, y, rx, ry, hgt)); ap.color = 0xFFFFFFFF; for (let i = -3; i <= 3; i++) canvas.drawRect(x + i * rx * 0.3 - rx * 0.07, y, x + i * rx * 0.3 + rx * 0.07, y + hgt + ry, ap); canvas.restore(); break;
  }
}

// ---------- Île de ton personnage (en haut à gauche de la carte) ----------
// [dessus clair, dessus, bord du dessus, roche (haut), roche (bas), forme, bord]
// forme : 0 roche qui finit en pointe, 1 nuage, 2 plateau (laiton, néon, scène), 3 gâteau ;
// bord : 0 net, 1 bosses qui débordent (sable, neige, mousse), 2 coulures de glaçage
const ISLAND = {
  2: [0xFBEBC4, 0xE9CF94, 0xC9A56A, 0xB9786A, 0x4E2C34, 0, 1], 3: [0xE4E1EE, 0xB3AFC4, 0x7E7994, 0x8E89A3, 0x2E2A40, 0, 0],
  4: [0xF8DFA8, 0xDDB574, 0xB48848, 0xC8693F, 0x5E2A18, 0, 1], 5: [0xC9C9C0, 0x9E9E96, 0xE3C000, 0x7A6A4A, 0x24201A, 0, 0],
  6: [0xFFFFFF, 0xF6EEFF, 0xD9C8F0, 0xF6EEFF, 0xC8B4E6, 1, 0], 7: [0xFFFFFF, 0xEEF7FF, 0xBFD8EE, 0xA8DCF5, 0x2A6496, 0, 1],
  8: [0x6E5E60, 0x4A3E40, 0x2A2224, 0x3E3134, 0x100A0A, 0, 0], 9: [0xF6DC8A, 0xD8B24A, 0x8C6A2B, 0xB8873A, 0x4A3214, 2, 0],
  10: [0xC4EA86, 0x7CC24A, 0x4E8A2A, 0x8A5A34, 0x3A2412, 0, 1], 11: [0x3E3366, 0x2A2346, 0x15102A, 0x2A2046, 0x08050F, 2, 0],
  12: [0xFBE6B4, 0xE6C68A, 0xB88A4A, 0xD8A866, 0x6E4822, 0, 1], 13: [0x8E8E76, 0x6A6A55, 0x44443A, 0x6E6A78, 0x1E1B26, 0, 1],
  14: [0x6A6A76, 0x44444E, 0x1E1E24, 0x3A3A44, 0x0A0A0E, 2, 0], 15: [0xCDE0A6, 0x9CB878, 0x6A8650, 0xDCD6C6, 0x5E584C, 0, 1],
  16: [0xFFE0EC, 0xFF9EC4, 0xE07AA6, 0xF2C38A, 0xB87A42, 3, 2],
  17: [0xF6DCA0, 0xE2C58A, 0xB89060, 0x9A7A5A, 0x3E2A1E, 0, 1], 18: [0xA8C878, 0x7AA052, 0x4E7A32, 0x7A6A52, 0x2E2418, 0, 1],
  19: [0xF2E6C8, 0xD8C8A0, 0xA89A70, 0x6A9AA8, 0x1E4A60, 0, 1], 20: [0xB0BEC5, 0x90A4AE, 0x607D8B, 0x7A7590, 0x2A2438, 2, 0], 21: [0xF2C08A, 0xD8A06A, 0xA86A3A, 0xB85A38, 0x5A2A14, 0, 1], 22: [0x6A5E7A, 0x4E445A, 0x2A2238, 0x3A3048, 0x0C0814, 0, 0], 23: [0xFFFFFF, 0xF0E0F0, 0xD8B0D0, 0xF6EEFF, 0xC8B4E6, 1, 0], 24: [0xD8C8A8, 0xB8A888, 0x8A7A5A, 0x4A3A5A, 0x1A0A2E, 0, 0],
};
/** Silhouette de la roche (u, v en demi-largeurs depuis le centre du dessus). */
const ISLAND_ROCK = [-1, 0, -0.92, 0.28, -0.7, 0.42, -0.62, 0.68, -0.35, 0.82, -0.18, 1.12, 0.02, 1.28, 0.2, 1.0, 0.45, 0.86, 0.62, 0.58, 0.88, 0.4, 1, 0];

function islandRockPath(x, y, r) {
  apPath.reset();
  for (let i = 0; i < ISLAND_ROCK.length; i += 2) {
    const px = x + r * ISLAND_ROCK[i], py = y + r * ISLAND_ROCK[i + 1];
    if (i === 0) apPath.moveTo(px, py); else apPath.lineTo(px, py);
  }
  apPath.close();
  return apPath;
}
function ellipsePath(cx, cy, rx, ry) {
  const k = 0.5523, p = apPath;
  p.reset(); p.moveTo(cx - rx, cy);
  p.cubicTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry); p.cubicTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
  p.cubicTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry); p.cubicTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
  p.close();
  return p;
}
function islandStar(cx, cy, ro, ri, sy, rot) {
  apPath.reset();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? ro : ri, px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * sy;
    if (i === 0) apPath.moveTo(px, py); else apPath.lineTo(px, py);
  }
  apPath.close();
  return apPath;
}
function islandPoly(canvas, color, pts) {
  ap.color = color; apPath.reset(); apPath.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) apPath.lineTo(pts[i], pts[i + 1]);
  apPath.close(); canvas.drawPath(apPath, ap);
}
/** Dôme (demi-ellipse posée sur sa base) : chapeau de champignon, haut d'une pierre tombale. */
function domePath(cx, by, rx, ry) {
  apPath.reset(); apPath.moveTo(cx - rx, by); apPath.cubicTo(cx - rx, by - ry * 1.33, cx + rx, by - ry * 1.33, cx + rx, by); apPath.close();
  return apPath;
}
/** Bas du bord du dessus de l'île à l'abscisse u (en demi-largeurs). */
const islandRimBottom = (u) => -0.03 + 0.27 * Math.sqrt(Math.max(0, 1 - u * u));

/**
 * Île flottante de ton personnage, à la matière du chapitre c (chapitres 2 à 16) : sable et corail, roche lunaire,
 * nuage, glace, basalte, engrenage, néon, gâteau… (x, y) : centre du dessus, r : demi-largeur.
 */
function drawHeroIsland(canvas, c, x, y, r) {
  const I = ISLAND[c] || ISLAND[2], shape = I[5];
  const X = (u) => x + r * u, Y = (v) => y + r * v;
  const r0 = opaqueOf(I[3]), r1 = opaqueOf(I[4]);
  ap.shader = null; apS.shader = null;
  // Corps de l'île
  if (shape === 0) {
    const body = islandRockPath(x, y, r);
    ap.shader = new LinearGradient(0, y, 0, y + r * 1.3, r0, r1); canvas.drawPath(body, ap);
    ap.shader = new LinearGradient(x - r, 0, x + r, 0, [Color.argb(0, 0, 0, 0), Color.argb(0, 0, 0, 0), Color.argb(90, 0, 0, 0)], [0, 0.5, 1]);
    canvas.drawPath(body, ap); ap.shader = null;
    if (c !== 7 && c !== 12) {
      apS.color = ca(shade(r1, 0.75) & 0xFFFFFF, 100); apS.strokeWidth = r * 0.04;
      canvas.drawLine(X(-0.85), Y(0.3), X(0.8), Y(0.36), apS); canvas.drawLine(X(-0.55), Y(0.66), X(0.55), Y(0.62), apS);
      for (const [u, v, rr] of [[-0.55, 0.45, 0.11], [0.35, 0.52, 0.09], [-0.1, 0.88, 0.08]]) {
        ap.color = shade(r0, 0.72); rect.set(X(u - rr), Y(v - rr * 0.7), X(u + rr), Y(v + rr * 0.7)); canvas.drawOval(rect, ap);
        ap.color = Color.argb(70, 255, 255, 255); rect.set(X(u - rr * 0.6), Y(v - rr * 0.6), X(u), Y(v - rr * 0.1)); canvas.drawOval(rect, ap);
      }
    }
  } else if (shape === 1) {
    const puffs = [[-0.82, 0.1, 0.3], [-0.48, 0.28, 0.36], [0, 0.36, 0.42], [0.48, 0.28, 0.36], [0.82, 0.1, 0.3], [-0.22, 0.6, 0.28], [0.26, 0.58, 0.26], [0.02, 0.82, 0.18]];
    ap.color = r1; for (const [u, v, rr] of puffs) canvas.drawCircle(X(u), Y(v + 0.06), r * rr, ap);
    ap.color = r0; for (const [u, v, rr] of puffs) canvas.drawCircle(X(u - 0.03), Y(v - 0.02), r * rr * 0.92, ap);
  } else {
    const hgt = r * (shape === 2 ? 0.34 : 0.5);
    ap.shader = new LinearGradient(x - r, 0, x + r, 0, [shade(r0, 0.7), shade(r0, 1.15), r0, r1], [0, 0.3, 0.62, 1]);
    canvas.drawPath(pedestalSide(x, Y(-0.03), r * 1.06, r * 0.27, hgt), ap); ap.shader = null;
  }
  drawIslandDeco(canvas, c, I, x, y, r, 0);
  // Dessus : bord plus sombre (qui déborde en bosses ou en coulures), puis le dessus éclairé
  const t0 = opaqueOf(I[0]), t1 = opaqueOf(I[1]), t2 = opaqueOf(I[2]);
  ap.color = t2; rect.set(X(-1.06), Y(-0.3), X(1.06), Y(0.24)); canvas.drawOval(rect, ap);
  if (I[6] === 1) for (let i = 0; i <= 10; i++) canvas.drawCircle(X(-0.98 + i * 0.196), Y(0.13 + Math.sin(i * 1.7) * 0.03), r * 0.1, ap);
  else if (I[6] === 2) {
    ap.color = t1;
    for (let i = 0; i < 9; i++) {
      const u = -0.92 + i * 0.23;
      rect.set(X(u - 0.075), Y(0), X(u + 0.075), Y(islandRimBottom(u) + 0.1 + 0.25 * hash01(i + 300))); canvas.drawRoundRect(rect, r * 0.075, r * 0.075, ap);
    }
  }
  drawIslandDeco(canvas, c, I, x, y, r, 1);
  ap.color = t1; rect.set(X(-0.98), Y(-0.36), X(0.98), Y(0.13)); canvas.drawOval(rect, ap);
  ap.color = shape === 2 ? ca(I[0], 110) : t0; rect.set(X(-0.6), Y(-0.32), X(0.2), Y(-0.12)); canvas.drawOval(rect, ap);
  drawIslandDeco(canvas, c, I, x, y, r, 2);
}

/** Détails de l'île : phase 0 = sur le corps et dessous (ce qui pend), 1 = bord du dessus, 2 = dessus et accessoires (sur les côtés). */
function drawIslandDeco(canvas, c, I, x, y, r, phase) {
  const sin = Math.sin, cos = Math.cos, X = (u) => x + r * u, Y = (v) => y + r * v, R = (v) => r * v;
  const line = (u0, v0, u1, v1) => canvas.drawLine(X(u0), Y(v0), X(u1), Y(v1), apS);
  const oval = (l, t, rr, b, col) => { ap.color = col; rect.set(X(l), Y(t), X(rr), Y(b)); canvas.drawOval(rect, ap); };
  const hang = (u, v, len, sway, ph, col, width) => {
    const bx = X(u), by = Y(v), sw = sin(time * 1.3 + ph) * R(sway);
    apS.color = col; apS.strokeWidth = R(width);
    apPath.reset(); apPath.moveTo(bx, by); apPath.quadTo(bx - sw + R(0.06), by + R(len) * 0.5, bx + sw, by + R(len)); canvas.drawPath(apPath, apS);
    return sw;
  };
  ap.shader = null; apS.shader = null;
  switch (c) {
    case 2:
      if (phase === 0) {
        for (const [u, len, ph] of [[-0.72, 0.62, 0], [-0.3, 0.85, 1.3], [0.42, 0.7, 2.4], [0.8, 0.42, 3.1]]) {
          const sw = hang(u, 0.15, len, 0.09, ph, 0xFF3E7D4A, 0.055);
          for (const q of [0.4, 0.75]) oval(u + sw / r * q - 0.02, 0.15 + len * q - 0.035, u + sw / r * q + 0.11, 0.15 + len * q + 0.02, 0xFF62A85A);
        }
        apS.strokeWidth = R(0.02);
        for (let i = 0; i < 4; i++) {
          const q = (time * 0.3 + i * 0.25) % 1;
          apS.color = ca(0xE8FBFF, 210 * (1 - q));
          canvas.drawCircle(X((i % 2 ? 1.1 : -1.1) + sin(time * 2 + i) * 0.04), Y(0.9 - q * 1.7), R(0.035 + 0.02 * (i % 2)), apS);
        }
      } else if (phase === 2) {
        apS.color = 0xFFFF7F9E; apS.strokeWidth = R(0.075);
        line(-0.72, -0.1, -0.76, -0.62); line(-0.745, -0.34, -0.9, -0.5); line(-0.75, -0.44, -0.6, -0.6); line(-0.88, -0.48, -0.9, -0.62);
        ap.color = 0xFFFFB8CA; for (const [u, v] of [[-0.76, -0.62], [-0.6, -0.6], [-0.9, -0.62]]) canvas.drawCircle(X(u), Y(v), R(0.045), ap);
        ap.color = 0xFFFF9A3C; canvas.drawPath(islandStar(X(0.68), Y(-0.1), R(0.17), R(0.07), 0.55, 0.3), ap);
        ap.color = 0xFFFFC98A; for (let i = 0; i < 5; i++) { const a = 0.3 - Math.PI / 2 + i * 1.2566; canvas.drawCircle(X(0.68) + cos(a) * R(0.08), Y(-0.1) + sin(a) * R(0.044), R(0.018), ap); }
        oval(0.38, -0.06, 0.5, 0.02, 0xFFFFF3E0);
      }
      break;
    case 3:
      if (phase === 0) {
        for (const [u, len, wd] of [[-0.5, 0.42, 0.07], [-0.15, 0.62, 0.09], [0.28, 0.5, 0.08], [0.6, 0.32, 0.06]]) {
          const bx = X(u), by = Y(0.5 - Math.abs(u) * 0.25);
          ap.color = ca(0x5CF2E6, 70 + 40 * sin(time * 3 + u * 4)); canvas.drawCircle(bx, by + R(len) * 0.7, R(0.12), ap);
          islandPoly(canvas, 0xFF3FCFD0, [bx - R(wd), by, bx + R(wd), by, bx, by + R(len)]);
          islandPoly(canvas, 0xFFB8FFF8, [bx - R(wd), by, bx, by, bx, by + R(len)]);
        }
      } else if (phase === 2) {
        const t1 = opaqueOf(I[1]);
        for (const [u, v, a, b] of [[-0.62, -0.12, 0.16, 0.055], [0.5, -0.25, 0.11, 0.04], [0.32, 0.02, 0.08, 0.03]]) {
          oval(u - a, v - b, u + a, v + b, shade(t1, 0.8)); oval(u - a * 0.8, v - b * 0.2, u + a * 0.9, v + b * 1.1, shade(t1, 1.08));
          oval(u - a * 0.85, v - b * 0.9, u + a * 0.85, v + b * 0.5, shade(t1, 0.72));
        }
        // Antenne qui clignote
        apS.color = 0xFFB0B4C0; apS.strokeWidth = R(0.035); line(-0.74, -0.14, -0.74, -0.66); line(-0.74, -0.2, -0.86, -0.08); line(-0.74, -0.2, -0.62, -0.08);
        oval(-0.88, -0.66, -0.6, -0.56, 0xFFD0D4DE);
        ap.color = sin(time * 4) > 0 ? 0xFFFF5252 : 0xFF7A2A2A; canvas.drawCircle(X(-0.74), Y(-0.72), R(0.045), ap);
        // Cristaux
        ap.color = ca(0x5CF2E6, 70 + 40 * sin(time * 2.5)); canvas.drawCircle(X(0.74), Y(-0.3), R(0.26), ap);
        for (const [u, hh, wd] of [[0.62, 0.38, 0.07], [0.75, 0.58, 0.09], [0.87, 0.32, 0.06]]) {
          islandPoly(canvas, 0xFF3FCFD0, [X(u - wd), Y(-0.08), X(u + wd), Y(-0.08), X(u + wd * 0.6), Y(-0.08 - hh * 0.8), X(u), Y(-0.08 - hh), X(u - wd * 0.6), Y(-0.08 - hh * 0.8)]);
          islandPoly(canvas, 0xFFB8FFF8, [X(u - wd), Y(-0.08), X(u), Y(-0.08), X(u), Y(-0.08 - hh), X(u - wd * 0.6), Y(-0.08 - hh * 0.8)]);
        }
      }
      break;
    case 4:
      if (phase === 0) { for (const [u, len, ph] of [[-0.6, 0.45, 0], [0.1, 0.4, 1.5], [0.5, 0.5, 2.6]]) hang(u, 0.25, len, 0.03, ph, 0xFF6B4A2A, 0.035); }
      else if (phase === 2) {
        ap.color = 0xFF4E8F3A; rect.set(X(-0.8), Y(-0.72), X(-0.66), Y(-0.08)); canvas.drawRoundRect(rect, R(0.07), R(0.07), ap);
        rect.set(X(-0.97), Y(-0.56), X(-0.86), Y(-0.3)); canvas.drawRoundRect(rect, R(0.055), R(0.055), ap);
        rect.set(X(-0.94), Y(-0.38), X(-0.76), Y(-0.29)); canvas.drawRoundRect(rect, R(0.045), R(0.045), ap);
        rect.set(X(-0.6), Y(-0.62), X(-0.5), Y(-0.42)); canvas.drawRoundRect(rect, R(0.05), R(0.05), ap);
        rect.set(X(-0.7), Y(-0.5), X(-0.54), Y(-0.42)); canvas.drawRoundRect(rect, R(0.04), R(0.04), ap);
        apS.color = 0xFF7DC25A; apS.strokeWidth = R(0.018); line(-0.75, -0.66, -0.75, -0.14); line(-0.715, -0.66, -0.715, -0.14);
        ap.color = 0xFFFF6FA8; canvas.drawCircle(X(-0.73), Y(-0.74), R(0.045), ap);
        for (const [u, v] of [[0.58, -0.1], [0.84, -0.08], [0.71, -0.22]]) {
          oval(u - 0.15, v - 0.08, u + 0.15, v + 0.08, 0xFFB89C64); oval(u - 0.13, v - 0.08, u + 0.12, v + 0.05, 0xFFD6BC84);
        }
        apS.color = 0xFF8A7448; apS.strokeWidth = R(0.015); line(0.71, -0.29, 0.71, -0.15); line(0.58, -0.17, 0.58, -0.03); line(0.84, -0.15, 0.84, -0.01);
      }
      break;
    case 5:
      if (phase === 0) {
        const goo = [[-0.6, 0.3], [-0.15, 0.5], [0.4, 0.35]];
        ap.color = 0xFF7CFF4F;
        for (const [u, len] of goo) { rect.set(X(u - 0.05), Y(0.1), X(u + 0.05), Y(0.1 + len)); canvas.drawRoundRect(rect, R(0.05), R(0.05), ap); }
        goo.forEach(([u, len], i) => {
          const q = (time * 0.7 + i * 0.37) % 1;
          ap.color = ca(0x7CFF4F, 230 * (1 - q)); canvas.drawCircle(X(u), Y(0.12 + len + q * 0.9), R(0.045), ap);
        });
      } else if (phase === 1) {
        canvas.save(); canvas.clipPath(ellipsePath(x, Y(-0.03), R(1.06), R(0.27)));
        apS.color = 0xFF1B1B1B; apS.strokeWidth = R(0.1); apS.strokeCap = 'butt';
        for (let i = -6; i <= 6; i++) canvas.drawLine(X(i * 0.3), Y(0.3), X(i * 0.3 + 0.3), Y(-0.35), apS);
        apS.strokeCap = 'round'; canvas.restore();
      } else if (phase === 2) {
        // Baril radioactif
        ap.shader = new LinearGradient(X(-0.88), 0, X(-0.58), 0, [0xFFB89A00, 0xFFFFE04A, 0xFFE3C000, 0xFF8C7600], [0, 0.3, 0.6, 1]);
        rect.set(X(-0.88), Y(-0.64), X(-0.58), Y(-0.1)); canvas.drawRoundRect(rect, R(0.04), R(0.04), ap); ap.shader = null;
        oval(-0.88, -0.7, -0.58, -0.58, 0xFFC9A800);
        apS.color = 0xFF6E5C00; apS.strokeWidth = R(0.025); line(-0.88, -0.46, -0.58, -0.46); line(-0.88, -0.24, -0.58, -0.24);
        ap.color = 0xFF1B1B1B; canvas.drawCircle(X(-0.73), Y(-0.35), R(0.075), ap);
        ap.color = 0xFFE3C000; canvas.drawCircle(X(-0.73), Y(-0.35), R(0.022), ap);
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094 + 1.047; canvas.drawCircle(X(-0.73) + cos(a) * R(0.05), Y(-0.35) + sin(a) * R(0.05), R(0.02), ap); }
        // Flaque toxique
        oval(0.48, -0.2, 0.94, 0.02, ca(0x7CFF4F, 90 + 60 * sin(time * 3)));
        oval(0.54, -0.16, 0.88, -0.02, 0xFF5FE03A); oval(0.6, -0.14, 0.72, -0.08, 0xFFC6FFA0);
      }
      break;
    case 6:
      if (phase === 0) {
        for (const [u, len, ph] of [[-0.45, 0.5, 0], [0.05, 0.72, 1.7], [0.5, 0.45, 3.1]]) {
          const sw = sin(time * 1.4 + ph) * R(0.06), bx = X(u), by = Y(0.55), ex = bx + sw, ey = by + R(len);
          apS.color = ca(0xFFFFFF, 170); apS.strokeWidth = R(0.015); canvas.drawLine(bx, by, ex, ey, apS);
          ap.color = 0xFFFFE27A; canvas.drawPath(islandStar(ex, ey + R(0.07), R(0.1), R(0.045), 1, sw / r * 2), ap);
        }
      } else if (phase === 2) {
        // Baguette étoilée et petit nuage rose
        apS.color = 0xFFFFFFFF; apS.strokeWidth = R(0.035); line(0.66, -0.1, 0.74, -0.52);
        const sy = Y(-0.62) + sin(time * 2) * R(0.03);
        ap.color = ca(0xFFE27A, 90 + 50 * sin(time * 3)); canvas.drawCircle(X(0.75), sy, R(0.2), ap);
        ap.color = 0xFFFFD84A; canvas.drawPath(islandStar(X(0.75), sy, R(0.15), R(0.065), 1, sin(time) * 0.2), ap);
        const cy0 = Y(-0.6) + sin(time * 1.3 + 1) * R(0.04);
        ap.color = 0xFFFFC6E0; for (const [u, v, rr] of [[-0.86, 0.04, 0.09], [-0.72, -0.02, 0.12], [-0.57, 0.03, 0.09]]) canvas.drawCircle(X(u), cy0 + R(v), R(rr), ap);
        ap.color = ca(0xFFFFFF, 150 + 100 * sin(time * 5)); for (const [u, v] of [[-0.4, -0.05], [0.4, -0.2], [-0.8, -0.15]]) canvas.drawPath(islandStar(X(u), Y(v), R(0.05), R(0.018), 1, 0), ap);
      }
      break;
    case 7:
      if (phase === 0) {
        apS.color = Color.argb(130, 255, 255, 255); apS.strokeWidth = R(0.03); line(-0.6, 0.38, -0.32, 0.8); line(0.3, 0.34, 0.12, 0.92); line(0.7, 0.3, 0.55, 0.55);
        for (let i = 0; i < 9; i++) {
          const u = -0.88 + i * 0.22, by = Y(islandRimBottom(u) + 0.05);
          islandPoly(canvas, 0xFFE8F6FF, [X(u - 0.06), by, X(u + 0.06), by, X(u), by + R(0.18 + 0.3 * hash01(i + 70))]);
        }
      } else if (phase === 2) {
        ap.color = 0xFF6B4A2A; rect.set(X(-0.77), Y(-0.26), X(-0.69), Y(-0.08)); canvas.drawRect(rect, ap);
        for (const [v, wd] of [[-0.2, 0.22], [-0.42, 0.18], [-0.62, 0.13]]) {
          islandPoly(canvas, 0xFF2E6B4A, [X(-0.73 - wd), Y(v), X(-0.73 + wd), Y(v), X(-0.73), Y(v - 0.3)]);
          islandPoly(canvas, 0xFFFFFFFF, [X(-0.73 - wd * 0.45), Y(v - 0.17), X(-0.73 + wd * 0.45), Y(v - 0.17), X(-0.73), Y(v - 0.3)]);
        }
        for (const [u, hh, wd] of [[0.64, 0.34, 0.07], [0.76, 0.5, 0.08], [0.87, 0.28, 0.06]]) {
          islandPoly(canvas, 0xFF9FD3F0, [X(u - wd), Y(-0.08), X(u + wd), Y(-0.08), X(u), Y(-0.08 - hh)]);
          islandPoly(canvas, 0xFFF2FBFF, [X(u - wd), Y(-0.08), X(u), Y(-0.08), X(u), Y(-0.08 - hh)]);
        }
      }
      break;
    case 8:
      if (phase === 0) {
        const glow = 0.6 + 0.4 * sin(time * 3);
        for (const [col, wd] of [[ca(0xFF7A1F, 110 * glow), 0.09], [0xFFFFA040, 0.03]]) {
          apS.color = col; apS.strokeWidth = R(wd);
          for (const pts of [[-0.7, 0.3, -0.5, 0.5, -0.56, 0.7], [0.1, 0.2, 0.0, 0.5, 0.1, 0.8, 0.0, 1.05], [0.6, 0.3, 0.45, 0.55]]) {
            apPath.reset(); apPath.moveTo(X(pts[0]), Y(pts[1])); for (let i = 2; i < pts.length; i += 2) apPath.lineTo(X(pts[i]), Y(pts[i + 1]));
            canvas.drawPath(apPath, apS);
          }
        }
        const q = (time * 0.6) % 1;
        ap.color = ca(0xFF8A2A, 255 * (1 - q)); canvas.drawCircle(X(0.02), Y(1.3 + q * 0.8), R(0.06 * (1 - q * 0.5)), ap);
      } else if (phase === 2) {
        apS.color = ca(0xFF7A1F, 150 + 80 * sin(time * 3)); apS.strokeWidth = R(0.025);
        line(-0.5, -0.05, -0.3, -0.15); line(-0.3, -0.15, -0.35, -0.25); line(0.25, -0.02, 0.45, -0.1); line(0.45, -0.1, 0.42, -0.25);
        islandPoly(canvas, 0xFF2A2224, [X(-0.97), Y(-0.06), X(-0.5), Y(-0.06), X(-0.64), Y(-0.36), X(-0.82), Y(-0.36)]);
        oval(-0.82, -0.4, -0.64, -0.32, ca(0xFF7A1F, 200 + 55 * sin(time * 4)));
        for (let i = 0; i < 3; i++) {
          const q = (time * 0.4 + i / 3) % 1;
          ap.color = ca(0x8A8A90, 150 * (1 - q)); canvas.drawCircle(X(-0.73 + sin(q * 4 + i) * 0.08), Y(-0.45 - q * 0.6), R(0.07 + 0.08 * q), ap);
        }
        islandPoly(canvas, 0xFF2A1E2E, [X(0.58), Y(-0.08), X(0.88), Y(-0.08), X(0.76), Y(-0.64)]);
        islandPoly(canvas, 0xFF5A4A6A, [X(0.58), Y(-0.08), X(0.72), Y(-0.08), X(0.76), Y(-0.64)]);
      }
      break;
    case 9:
      if (phase === 0) {
        ap.color = shade(opaqueOf(I[3]), 1.3);
        for (let i = 0; i < 6; i++) { const u = -0.85 + i * 0.34; canvas.drawCircle(X(u), Y(islandRimBottom(u) + 0.17), R(0.035), ap); }
        const a = sin(time * 2.2) * 0.45, px0 = x, py0 = Y(0.58), ex = px0 + sin(a) * R(0.6), ey = py0 + cos(a) * R(0.6);
        apS.color = 0xFF8C6A2B; apS.strokeWidth = R(0.04); canvas.drawLine(px0, py0, ex, ey, apS);
        ap.color = 0xFFD8B24A; canvas.drawCircle(ex, ey, R(0.13), ap);
        ap.color = 0xFFFFE7A0; canvas.drawCircle(ex - R(0.04), ey - R(0.04), R(0.05), ap);
      } else if (phase === 1) {
        ap.color = opaqueOf(I[2]);
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + time * 0.3; canvas.drawCircle(x + cos(a) * R(1.07), Y(-0.03) + sin(a) * R(0.28), R(0.06), ap); }
      } else if (phase === 2) {
        apS.color = ca(0x8C6A2B, 140); apS.strokeWidth = R(0.025); rect.set(X(-0.7), Y(-0.3), X(0.7), Y(0.07)); canvas.drawOval(rect, apS);
        // Engrenage qui tourne
        const gx = X(0.74), gy = Y(-0.4), gr = R(0.15);
        apS.color = 0xFF8C6A2B; apS.strokeWidth = R(0.05); canvas.drawLine(gx, gy, gx, Y(-0.08), apS);
        ap.color = 0xFFC99A3A; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + time * 1.2; canvas.drawCircle(gx + cos(a) * gr, gy + sin(a) * gr, R(0.045), ap); }
        canvas.drawCircle(gx, gy, gr, ap); ap.color = 0xFF5E4418; canvas.drawCircle(gx, gy, R(0.05), ap);
        // Petite horloge
        const cx0 = X(-0.74), cy0 = Y(-0.42);
        apS.color = 0xFF8C6A2B; apS.strokeWidth = R(0.05); canvas.drawLine(cx0, cy0, cx0, Y(-0.08), apS);
        ap.color = 0xFFFFF6E0; canvas.drawCircle(cx0, cy0, R(0.15), ap);
        apS.color = 0xFFC99A3A; apS.strokeWidth = R(0.035); canvas.drawCircle(cx0, cy0, R(0.15), apS);
        apS.color = 0xFF3A2A1A; apS.strokeWidth = R(0.022);
        canvas.drawLine(cx0, cy0, cx0 + sin(time) * R(0.11), cy0 - cos(time) * R(0.11), apS);
        canvas.drawLine(cx0, cy0, cx0 + sin(time / 12) * R(0.07), cy0 - cos(time / 12) * R(0.07), apS);
      }
      break;
    case 10:
      if (phase === 0) {
        for (const [u, len, ph] of [[-0.75, 0.5, 0], [-0.3, 0.72, 1.3], [0.5, 0.58, 2.4], [0.8, 0.35, 3.1]]) {
          const sw = hang(u, 0.12, len, 0.05, ph, 0xFF5B3A20, 0.04);
          oval(u + sw / r - 0.06, 0.12 + len - 0.035, u + sw / r + 0.05, 0.12 + len + 0.035, 0xFF6DB84A);
        }
      } else if (phase === 2) {
        ap.color = 0xFFF5E6C8; rect.set(X(-0.8), Y(-0.44), X(-0.66), Y(-0.08)); canvas.drawRoundRect(rect, R(0.05), R(0.05), ap);
        ap.color = 0xFFE53935; canvas.drawPath(domePath(X(-0.73), Y(-0.4), R(0.25), R(0.24)), ap);
        ap.color = 0xFFFFFFFF; for (const [u, v, rr] of [[-0.83, -0.5, 0.04], [-0.68, -0.58, 0.05], [-0.58, -0.46, 0.03], [-0.74, -0.45, 0.025]]) canvas.drawCircle(X(u), Y(v), R(rr), ap);
        apS.color = 0xFF3F8A28; apS.strokeWidth = R(0.035); line(0.72, -0.1, 0.72, -0.6);
        oval(0.72, -0.36, 0.9, -0.28, 0xFF5DB043);
        const fy = Y(-0.66) + sin(time * 1.6) * R(0.015);
        ap.color = 0xFFFFD54F; for (let i = 0; i < 6; i++) { const a = i * 1.047 + time * 0.2; canvas.drawCircle(X(0.72) + cos(a) * R(0.08), fy + sin(a) * R(0.08), R(0.065), ap); }
        ap.color = 0xFF8D5A2B; canvas.drawCircle(X(0.72), fy, R(0.055), ap);
        ap.color = ca(0xBFEAFF, 220); canvas.drawCircle(X(0.42), Y(-0.06), R(0.05), ap);
        ap.color = 0xFFFFFFFF; canvas.drawCircle(X(0.405), Y(-0.075), R(0.016), ap);
      }
      break;
    case 11:
      if (phase === 0) {
        islandPoly(canvas, ca(0x14101F, 235), [X(-0.55), Y(0.56), X(0.55), Y(0.56), x, Y(1.15)]);
        apPath.reset(); apPath.moveTo(X(-0.55), Y(0.56)); apPath.lineTo(x, Y(1.15)); apPath.lineTo(X(0.55), Y(0.56));
        apS.color = ca(0xFF4FD8, 110); apS.strokeWidth = R(0.08); canvas.drawPath(apPath, apS);
        apS.color = 0xFFFF8AE6; apS.strokeWidth = R(0.025); canvas.drawPath(apPath, apS);
        rect.set(X(-1.06), Y(0.04), X(1.06), Y(0.58));
        apS.color = ca(0xFF4FD8, 110); apS.strokeWidth = R(0.08); canvas.drawArc(rect, 0, 180, false, apS);
        apS.color = 0xFFFF8AE6; apS.strokeWidth = R(0.025); canvas.drawArc(rect, 0, 180, false, apS);
      } else if (phase === 1) {
        const p = ellipsePath(x, Y(-0.03), R(1.06), R(0.27));
        apS.color = ca(0x00E5FF, 90 + 40 * sin(time * 3)); apS.strokeWidth = R(0.12); canvas.drawPath(p, apS);
        apS.color = 0xFF7FF6FF; apS.strokeWidth = R(0.03); canvas.drawPath(p, apS);
      } else if (phase === 2) {
        canvas.save(); canvas.clipPath(ellipsePath(x, Y(-0.115), R(0.98), R(0.245)));
        apS.color = ca(0xFF4FD8, 110); apS.strokeWidth = R(0.015);
        for (const v of [-0.27, -0.17, -0.06, 0.06]) line(-1, v, 1, v);
        for (let i = -4; i <= 4; i++) line(i * 0.14, -0.36, i * 0.3, 0.13);
        canvas.restore();
        for (const [col, wd] of [[ca(0xFF4FD8, 100), 0.08], [0xFFFF8AE6, 0.028]]) {
          apS.color = col; apS.strokeWidth = R(wd);
          apPath.reset(); apPath.moveTo(X(-0.74), Y(-0.1)); apPath.quadTo(X(-0.82), Y(-0.4), X(-0.72), Y(-0.7)); canvas.drawPath(apPath, apS);
          for (const [eu, ev] of [[-0.98, -0.6], [-0.92, -0.82], [-0.5, -0.8], [-0.46, -0.58]]) {
            apPath.reset(); apPath.moveTo(X(-0.72), Y(-0.7)); apPath.quadTo(X((-0.72 + eu) / 2), Y(-0.86), X(eu), Y(ev)); canvas.drawPath(apPath, apS);
          }
        }
        for (const [col, wd] of [[ca(0x00E5FF, 100), 0.08], [0xFF7FF6FF, 0.028]]) {
          apS.color = col; apS.strokeWidth = R(wd);
          apPath.reset(); apPath.moveTo(X(0.54), Y(-0.1)); apPath.lineTo(X(0.92), Y(-0.1)); apPath.lineTo(X(0.73), Y(-0.56)); apPath.close(); canvas.drawPath(apPath, apS);
        }
      }
      break;
    case 12:
      if (phase === 0) {
        canvas.save(); canvas.clipPath(islandRockPath(x, y, r));
        apS.color = ca(shade(opaqueOf(I[4]), 0.8) & 0xFFFFFF, 110); apS.strokeWidth = R(0.025);
        for (let j = 0; j < 5; j++) {
          const v = 0.28 + j * 0.25; line(-1, v, 1, v);
          for (let i = -4; i <= 4; i++) { const u = i * 0.32 + (j % 2) * 0.16; line(u, v - 0.25, u, v); }
        }
        canvas.restore();
        apS.color = 0xFF2F4F9E; apS.strokeWidth = R(0.02);
        line(-0.42, 0.38, -0.42, 0.48); canvas.drawCircle(X(-0.3), Y(0.43), R(0.035), apS); line(-0.2, 0.36, -0.12, 0.48); line(0.22, 0.4, 0.34, 0.4);
        for (let i = 0; i < 6; i++) {
          const q = (time * 0.8 + i / 6) % 1;
          ap.color = ca(0xE6C68A, 230 * (1 - q)); canvas.drawCircle(X(0.02 + sin(i * 2.3) * 0.03), Y(1.3 + q * 0.7), R(0.022), ap);
        }
      } else if (phase === 2) {
        apS.color = 0xFF8A5A2B; apS.strokeWidth = R(0.065);
        apPath.reset(); apPath.moveTo(X(-0.74), Y(-0.1)); apPath.quadTo(X(-0.7), Y(-0.45), X(-0.84), Y(-0.76)); canvas.drawPath(apPath, apS);
        apS.color = 0xFF6E4422; apS.strokeWidth = R(0.015);
        for (const v of [-0.25, -0.4, -0.55, -0.68]) line(-0.79, v, -0.69, v + 0.02);
        apS.color = 0xFF3F9A3A; apS.strokeWidth = R(0.05);
        for (const [eu, ev] of [[-1.1, -0.62], [-1.02, -0.9], [-0.62, -0.94], [-0.52, -0.66], [-0.86, -0.98]]) {
          apPath.reset(); apPath.moveTo(X(-0.84), Y(-0.76)); apPath.quadTo(X((-0.84 + eu) / 2), Y(-0.92), X(eu), Y(ev)); canvas.drawPath(apPath, apS);
        }
        islandPoly(canvas, 0xFFE6C68A, [X(0.63), Y(-0.1), X(0.81), Y(-0.1), X(0.77), Y(-0.72), X(0.67), Y(-0.72)]);
        islandPoly(canvas, 0xFFB88A4A, [X(0.72), Y(-0.1), X(0.81), Y(-0.1), X(0.77), Y(-0.72), X(0.72), Y(-0.72)]);
        islandPoly(canvas, 0xFFFFD54F, [X(0.67), Y(-0.72), X(0.77), Y(-0.72), X(0.72), Y(-0.84)]);
        apS.color = 0xFF2F4F9E; apS.strokeWidth = R(0.015); line(0.685, -0.55, 0.705, -0.55); line(0.69, -0.45, 0.69, -0.38); canvas.drawCircle(X(0.695), Y(-0.28), R(0.02), apS);
      }
      break;
    case 13:
      if (phase === 0) {
        for (const [u, len, ph] of [[-0.7, 0.5, 0], [-0.2, 0.7, 1.1], [0.45, 0.55, 2.3]]) hang(u, 0.2, len, 0.025, ph, 0xFF2E2A26, 0.035);
        apS.color = ca(0xE0E0F0, 120); apS.strokeWidth = R(0.012);
        const wx = X(-0.45), wy = Y(0.42), web = [[-0.75, 0.7], [-0.6, 0.85], [-0.4, 0.9], [-0.2, 0.75]];
        for (const [eu, ev] of web) canvas.drawLine(wx, wy, X(eu), Y(ev), apS);
        for (const f of [0.4, 0.75]) {
          apPath.reset(); apPath.moveTo(wx + (X(web[0][0]) - wx) * f, wy + (Y(web[0][1]) - wy) * f);
          for (let i = 1; i < web.length; i++) apPath.lineTo(wx + (X(web[i][0]) - wx) * f, wy + (Y(web[i][1]) - wy) * f);
          canvas.drawPath(apPath, apS);
        }
        for (let i = 0; i < 3; i++) {
          const q = (time * 0.15 + i / 3) % 1;
          ap.color = ca(0xB388FF, 120 * sin(q * Math.PI)); canvas.drawCircle(X(-0.9 + i * 0.9 + sin(time + i) * 0.1), Y(1.0 - q * 0.5), R(0.07), ap);
        }
      } else if (phase === 2) {
        ap.color = 0xFF8E8A98; canvas.drawPath(domePath(X(-0.74), Y(-0.44), R(0.15), R(0.14)), ap);
        rect.set(X(-0.89), Y(-0.45), X(-0.59), Y(-0.08)); canvas.drawRect(rect, ap);
        ap.color = 0xFF6E6A78; rect.set(X(-0.66), Y(-0.5), X(-0.59), Y(-0.08)); canvas.drawRect(rect, ap);
        apS.color = 0xFF55515E; apS.strokeWidth = R(0.03); line(-0.75, -0.45, -0.75, -0.2); line(-0.83, -0.37, -0.67, -0.37);
        oval(0.56, -0.3, 0.88, -0.08, 0xFFF07C1A); oval(0.64, -0.3, 0.8, -0.08, 0xFFFF9A3C);
        apS.color = 0xFFC0600F; apS.strokeWidth = R(0.015); line(0.72, -0.29, 0.72, -0.09);
        apS.color = 0xFF3F7F2A; apS.strokeWidth = R(0.035); line(0.72, -0.3, 0.75, -0.38);
        const fl = ca(0xFFE070, 180 + 75 * sin(time * 9));
        islandPoly(canvas, fl, [X(0.62), Y(-0.22), X(0.68), Y(-0.22), X(0.65), Y(-0.26)]);
        islandPoly(canvas, fl, [X(0.76), Y(-0.22), X(0.82), Y(-0.22), X(0.79), Y(-0.26)]);
        islandPoly(canvas, fl, [X(0.64), Y(-0.16), X(0.8), Y(-0.16), X(0.72), Y(-0.12)]);
      }
      break;
    case 14:
      if (phase === 0) {
        apS.color = 0xFF55555F; apS.strokeWidth = R(0.025);
        for (const u of [-0.55, 0.55]) { canvas.drawCircle(X(u), Y(islandRimBottom(u) + 0.15), R(0.1), apS); canvas.drawCircle(X(u), Y(islandRimBottom(u) + 0.15), R(0.04), apS); }
        hang(-0.3, 0.56, 0.5, 0.04, 0, 0xFF16161A, 0.035); hang(0.25, 0.56, 0.38, 0.04, 2, 0xFF16161A, 0.035);
      } else if (phase === 1) {
        // Liseré rose autour de la scène, et ampoules qui s'allument à tour de rôle sur le devant
        apS.color = ca(0xFF4081, 170); apS.strokeWidth = R(0.03); canvas.drawPath(ellipsePath(x, Y(-0.03), R(1.06), R(0.27)), apS);
        const cols = [0xFFFF4081, 0xFF2FD0FF, 0xFFFFD23F], step = Math.floor(time * 6);
        for (let i = 0; i < 11; i++) {
          const a = (15 + i * 15) * Math.PI / 180, on = (i + step) % 3 === 0;
          ap.color = on ? cols[i % 3] : 0xFF4A4A55;
          canvas.drawCircle(x + cos(a) * R(1.0), Y(-0.03) + sin(a) * R(0.25), R(on ? 0.04 : 0.03), ap);
        }
      } else if (phase === 2) {
        ap.color = 0xFF1F1F24; rect.set(X(-0.94), Y(-0.6), X(-0.58), Y(-0.08)); canvas.drawRoundRect(rect, R(0.03), R(0.03), ap);
        apS.color = 0xFF4A4A55; apS.strokeWidth = R(0.02); canvas.drawRoundRect(rect, R(0.03), R(0.03), apS);
        const b = 1 + 0.12 * Math.abs(sin(time * 6.28));
        for (const [v, rr] of [[-0.47, 0.07], [-0.24, 0.11]]) {
          ap.color = 0xFF5A5A66; canvas.drawCircle(X(-0.76), Y(v), R(rr * b), ap);
          ap.color = 0xFF2A2A32; canvas.drawCircle(X(-0.76), Y(v), R(rr * 0.45 * b), ap);
        }
        apS.color = 0xFF9A9AA6; apS.strokeWidth = R(0.025);
        line(0.74, -0.1, 0.74, -0.6); line(0.74, -0.1, 0.62, -0.02); line(0.74, -0.1, 0.86, -0.02); line(0.74, -0.6, 0.66, -0.68);
        ap.color = 0xFF2E2E36; canvas.drawCircle(X(0.64), Y(-0.71), R(0.06), ap);
        ap.color = 0xFFB0B0BC; canvas.drawCircle(X(0.625), Y(-0.73), R(0.02), ap);
      }
      break;
    case 15:
      if (phase === 0) {
        apS.color = ca(0x3A342C, 90); apS.strokeWidth = R(0.025); line(-0.7, 0.3, -0.5, 0.6); line(-0.2, 0.4, -0.05, 0.95); line(0.4, 0.35, 0.3, 0.7); line(0.7, 0.3, 0.6, 0.45);
        // Petite cascade qui tombe du bord gauche
        ap.color = ca(0xE8F6FF, 210); rect.set(X(-0.99), Y(0.05), X(-0.86), Y(1.25)); canvas.drawRect(rect, ap);
        apS.color = 0xFFFFFFFF; apS.strokeWidth = R(0.02);
        for (let i = 0; i < 5; i++) { const q = (time * 0.9 + i / 5) % 1, v = 0.1 + q * 1.05, u = -0.96 + 0.05 * (i % 2); line(u, v, u, v + 0.12); }
        ap.color = ca(0xFFFFFF, 120); for (const [u, rr] of [[-1.0, 0.1], [-0.88, 0.12], [-0.94, 0.08]]) canvas.drawCircle(X(u), Y(1.25 + sin(time * 2 + u * 9) * 0.02), R(rr), ap);
      } else if (phase === 2) {
        apS.color = 0xFF5B3A20; apS.strokeWidth = R(0.05);
        apPath.reset(); apPath.moveTo(X(-0.74), Y(-0.1)); apPath.quadTo(X(-0.86), Y(-0.32), X(-0.62), Y(-0.5)); canvas.drawPath(apPath, apS);
        for (const [u, v, a, b] of [[-0.82, -0.44, 0.17, 0.065], [-0.56, -0.58, 0.16, 0.06], [-0.66, -0.34, 0.11, 0.045]]) {
          oval(u - a, v - b, u + a, v + b, 0xFF2E5A34); oval(u - a * 0.8, v - b * 1.1, u + a * 0.7, v + b * 0.2, 0xFF4E8A4A);
        }
        apS.color = 0xFFD32F2F; apS.strokeWidth = R(0.045); line(0.6, -0.08, 0.6, -0.58); line(0.86, -0.08, 0.86, -0.58); line(0.55, -0.48, 0.91, -0.48);
        apS.color = 0xFF2A2020; apS.strokeWidth = R(0.055);
        apPath.reset(); apPath.moveTo(X(0.5), Y(-0.6)); apPath.quadTo(X(0.73), Y(-0.56), X(0.96), Y(-0.64)); canvas.drawPath(apPath, apS);
      }
      break;
    case 16:
      if (phase === 0) {
        apS.color = 0xFFFFF6F0; apS.strokeWidth = R(0.07); rect.set(X(-1.06), Y(-0.04), X(1.06), Y(0.5)); canvas.drawArc(rect, 0, 180, false, apS);
        apS.color = 0xFF7A4A2A; apS.strokeWidth = R(0.06); rect.set(X(-1.04), Y(0.2), X(1.04), Y(0.72)); canvas.drawArc(rect, 5, 170, false, apS);
      } else if (phase === 2) {
        const cols = [0xFFFFFFFF, 0xFF6FD3FF, 0xFFFFE066, 0xFF8CE06A, 0xFFB57BFF];
        apS.strokeWidth = R(0.025);
        for (let i = 0; i < 14; i++) {
          const u = -0.85 + 1.7 * hash01(i + 400), v = -0.3 + 0.36 * hash01(i + 450), a = hash01(i + 500) * 3;
          apS.color = cols[i % cols.length]; canvas.drawLine(X(u), Y(v), X(u + cos(a) * 0.05), Y(v + sin(a) * 0.03), apS);
        }
        apS.color = 0xFFFFFFFF; apS.strokeWidth = R(0.035); line(-0.74, -0.1, -0.74, -0.5);
        for (const [rr, col] of [[0.16, 0xFFFF5C9A], [0.12, 0xFFFFFFFF], [0.08, 0xFFFF5C9A], [0.04, 0xFFFFFFFF]]) { ap.color = col; canvas.drawCircle(X(-0.74), Y(-0.64), R(rr), ap); }
        ap.color = 0xFFFFFFFF; for (const [u, v, rr] of [[0.62, -0.12, 0.08], [0.78, -0.12, 0.08], [0.7, -0.2, 0.08]]) canvas.drawCircle(X(u), Y(v), R(rr), ap);
        apS.color = 0xFF3F8A28; apS.strokeWidth = R(0.025);
        apPath.reset(); apPath.moveTo(X(0.7), Y(-0.36)); apPath.quadTo(X(0.74), Y(-0.5), X(0.84), Y(-0.56)); canvas.drawPath(apPath, apS);
        ap.color = 0xFFD81B3C; canvas.drawCircle(X(0.7), Y(-0.32), R(0.1), ap);
        ap.color = Color.argb(160, 255, 255, 255); canvas.drawCircle(X(0.67), Y(-0.35), R(0.03), ap);
      }
      break;
    case 17:
      if (phase === 0) {
        // Algues qui pendent de la roche
        for (const [u, len, ph] of [[-0.6, 0.4, 0], [0.15, 0.5, 1.4], [0.6, 0.35, 2.5]]) hang(u, 0.2, len, 0.04, ph, 0xFF3E7A4A, 0.04);
      } else if (phase === 2) {
        // Palmier penché et petit drapeau pirate planté dans le sable
        apS.color = 0xFF7A5030; apS.strokeWidth = R(0.06);
        apPath.reset(); apPath.moveTo(X(-0.62), Y(-0.08)); apPath.quadTo(X(-0.7), Y(-0.45), X(-0.5), Y(-0.78)); canvas.drawPath(apPath, apS);
        for (let i = 0; i < 6; i++) {
          const an = -2.6 + i * 0.45 + sin(time * 1.4 + i) * 0.05;
          ap.color = i % 2 === 0 ? 0xFF2E7A40 : 0xFF1F5A32;
          rect.set(X(-0.5) - R(0.2), Y(-0.78) - R(0.05), X(-0.5) + R(0.2), Y(-0.78) + R(0.05));
          canvas.save(); canvas.rotate(an * 57.3, X(-0.5), Y(-0.78)); canvas.translate(R(0.18), 0); canvas.drawOval(rect, ap); canvas.restore();
        }
        apS.color = 0xFF5A3A22; apS.strokeWidth = R(0.025); line(0.72, -0.08, 0.72, -0.62);
        const wv = sin(time * 4) * 0.03;
        ap.color = 0xFF1B1B1B; apPath.reset(); apPath.moveTo(X(0.72), Y(-0.62)); apPath.lineTo(X(0.98), Y(-0.6 + wv)); apPath.lineTo(X(0.98), Y(-0.44 + wv)); apPath.lineTo(X(0.72), Y(-0.46)); apPath.close(); canvas.drawPath(apPath, ap);
        ap.color = 0xFFF2F2F2; canvas.drawCircle(X(0.85), Y(-0.54 + wv * 0.5), R(0.035), ap);
      }
      break;
    case 18:
      if (phase === 0) {
        // Lianes qui pendent de la roche
        for (const [u, len, ph] of [[-0.65, 0.5, 0], [-0.1, 0.6, 1.2], [0.5, 0.45, 2.3]]) {
          const sw = hang(u, 0.2, len, 0.05, ph, 0xFF3E6A2A, 0.035);
          oval(u - 0.06 + sw / r, 0.2 + len - 0.04, u + 0.06 + sw / r, 0.2 + len + 0.04, 0xFF5E8A3A);
        }
      } else if (phase === 2) {
        // Fougère et œuf tacheté
        apS.color = 0xFF3E7A2E; apS.strokeWidth = R(0.03);
        for (let i = 0; i < 5; i++) {
          const an = -2.4 + i * 0.4;
          apPath.reset(); apPath.moveTo(X(-0.6), Y(-0.08)); apPath.quadTo(X(-0.6 + cos(an) * 0.2), Y(-0.08 + sin(an) * 0.35), X(-0.6 + cos(an) * 0.42), Y(-0.08 + sin(an) * 0.3)); canvas.drawPath(apPath, apS);
        }
        oval(0.5, -0.5, 0.82, -0.06, 0xFFF2EAD0);
        ap.color = 0xFF8A9A6A; canvas.drawCircle(X(0.6), Y(-0.35), R(0.035), ap); canvas.drawCircle(X(0.72), Y(-0.22), R(0.03), ap); canvas.drawCircle(X(0.7), Y(-0.4), R(0.025), ap);
      }
      break;
    case 19:
      if (phase === 2) {
        ap.color = 0xFFE6F2F2; rect.set(X(0.6), Y(-0.7), X(0.78), Y(-0.08)); canvas.drawRect(rect, ap);
        ap.color = 0xFFFFFFFF; rect.set(X(0.56), Y(-0.76), X(0.82), Y(-0.68)); canvas.drawRect(rect, ap);
        ap.color = 0xFFFF7FA8; canvas.drawCircle(X(-0.6), Y(-0.12), R(0.08), ap); canvas.drawCircle(X(-0.5), Y(-0.1), R(0.06), ap);
      }
      break;
    case 20:
      if (phase === 2) {
        apS.color = 0xFF90A4AE; apS.strokeWidth = R(0.03); line(0.7, -0.08, 0.7, -0.45);
        ap.color = 0xFFECEFF1; rect.set(X(0.5), Y(-0.72), X(0.9), Y(-0.38)); canvas.drawArc(rect, 20, 180, true, ap);
        ap.color = Math.trunc(time * 2) % 2 === 0 ? 0xFFFF5252 : 0xFF69F0AE; canvas.drawCircle(X(0.7), Y(-0.6), R(0.04), ap);
      }
      break;
    case 21:
      if (phase === 2) {
        ap.color = 0xFF3E8A3A; rect.set(X(0.62), Y(-0.75), X(0.74), Y(-0.08)); canvas.drawRoundRect(rect, R(0.06), R(0.06), ap);
        rect.set(X(0.74), Y(-0.45), X(0.88), Y(-0.37)); canvas.drawRect(rect, ap); rect.set(X(0.82), Y(-0.6), X(0.88), Y(-0.37)); canvas.drawRoundRect(rect, R(0.03), R(0.03), ap);
      }
      break;
    case 22:
      if (phase === 2) for (const [u, hh] of [[0.6, 0.5], [0.72, 0.65], [0.84, 0.45]]) { ap.color = 0xFF8FE0FF; apPath.reset(); apPath.moveTo(X(u - 0.05), Y(-0.08)); apPath.lineTo(X(u), Y(-0.08 - hh)); apPath.lineTo(X(u + 0.05), Y(-0.08)); apPath.close(); canvas.drawPath(apPath, ap); }
      break;
    case 23:
      if (phase === 2) {
        for (let i = 0; i < 4; i++) { ap.color = i % 2 === 0 ? 0xFFE53935 : 0xFFFFFFFF; apPath.reset(); apPath.moveTo(X(0.72), Y(-0.7)); apPath.lineTo(X(0.5 + i * 0.11), Y(-0.1)); apPath.lineTo(X(0.61 + i * 0.11), Y(-0.1)); apPath.close(); canvas.drawPath(apPath, ap); }
        ap.color = 0xFFFFD54F; canvas.drawCircle(X(0.72), Y(-0.72), R(0.04), ap);
      }
      break;
    case 24:
      if (phase === 2) {
        apS.color = 0xFF5A3A22; apS.strokeWidth = R(0.025); line(0.72, -0.08, 0.72, -0.7);
        const wv = sin(time * 4) * 0.03;
        ap.color = 0xFF7A3A8A; apPath.reset(); apPath.moveTo(X(0.72), Y(-0.7)); apPath.lineTo(X(0.98), Y(-0.66 + wv)); apPath.lineTo(X(0.72), Y(-0.5)); apPath.close(); canvas.drawPath(apPath, ap);
        ap.color = 0xFFE0A82E; canvas.drawCircle(X(0.72), Y(-0.72), R(0.035), ap);
      }
      break;
  }
}
