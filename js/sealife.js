'use strict';
// Vie marine du chapitre 2 (sous l'eau), derrière les plateformes : bancs de petits poissons, poissons-clowns,
// poissons tropicaux, pieuvres, hippocampes, tortues, et au loin requins et dauphins (équivalent de SeaLife.kt).
// Chaque animal a une profondeur : plus il est loin, plus il est petit, lent, pâle et bleuté.

const SL_SCHOOL = 0, SL_CLOWN = 1, SL_TROPICAL = 2, SL_OCTOPUS = 3, SL_SEAHORSE = 4, SL_TURTLE = 5, SL_SHARK = 6, SL_DOLPHIN = 7;
const SL_SCHOOL_COLORS = [0xFF4FC3F7, 0xFFFFD54F, 0xFFB0BEC5, 0xFF80DEEA, 0xFFFF8A65, 0xFFCE93D8];
const SL_TROPICAL_COLORS = [0xFFFFEB3B, 0xFF7E57C2, 0xFF26C6DA, 0xFFEC407A, 0xFF66BB6A];
const SL_OCTO_COLORS = [0xFFE57373, 0xFFBA68C8, 0xFFFF8A65];
const SL_HORSE_COLORS = [0xFFFFB74D, 0xFFF06292, 0xFFFFD54F, 0xFF4DB6AC];
const SL_TURTLE_COLORS = [0xFF8BC34A, 0xFF4DB6AC, 0xFFA1887F];

const seaLife = {
  animals: [], nextSpawn: 0, lastT: -1, lastCamX: NaN,
  paint: new Paint(), stroke: new Paint({ style: Style.STROKE, strokeCap: 'round' }),
  path: new Path(), clip: new Path(), oval: new RectF(),
};

/** Anime et dessine la vie marine (appelé après le fond du chapitre 2). */
function drawSeaLife(canvas) {
  const sl = seaLife;
  // Pas affiché depuis un moment (autre niveau, menu…) : on repart d'un océan neuf
  if (sl.lastT >= 0 && (time - sl.lastT > 1 || time < sl.lastT)) resetSeaLife();
  const dt = sl.lastT < 0 ? 0 : Math.min(0.1, Math.max(0, time - sl.lastT));
  sl.lastT = time;
  // Le décor défile un peu avec la caméra (les animaux lointains moins que les proches) ; pas lors d'un saut de caméra
  let dCam = Number.isNaN(sl.lastCamX) ? 0 : camX - sl.lastCamX;
  if (Math.abs(dCam) > w * 0.5) dCam = 0;
  sl.lastCamX = camX;
  if (sl.animals.length === 0 && dt === 0) {
    for (let i = 0; i < 4; i++) spawnSeaLife(true);
    sl.nextSpawn = time + 1.5;
  }
  sl.animals = sl.animals.filter((a) => {
    a.x += a.vx * dt - dCam * (0.05 + 0.15 * a.depth);
    return a.x >= -w * 0.6 && a.x <= w * 1.6;
  });
  if (time >= sl.nextSpawn) {
    if (sl.animals.length < 26) spawnSeaLife(false);
    sl.nextSpawn = time + 1.2 + Math.random() * 2.8;
  }
  // Les plus lointains d'abord
  sl.animals.sort((a, b) => a.depth - b.depth);
  for (const a of sl.animals) drawSeaAnimal(canvas, a);
}

/** Remet la vie marine à zéro. */
function resetSeaLife() { seaLife.animals = []; seaLife.lastT = -1; seaLife.lastCamX = NaN; }

function spawnSeaLife(onScreen) {
  const sl = seaLife, r = Math.random(), R = Math.random, pick = (arr) => arr[Math.floor(R() * arr.length)];
  const bigOnScreen = sl.animals.some((a) => a.type === SL_SHARK || a.type === SL_DOLPHIN);
  const type = r < 0.30 ? SL_SCHOOL : r < 0.45 ? SL_CLOWN : r < 0.58 ? SL_TROPICAL : r < 0.67 ? SL_SEAHORSE
    : r < 0.76 ? SL_TURTLE : r < 0.84 ? SL_OCTOPUS : bigOnScreen ? SL_SCHOOL : r < 0.92 ? SL_DOLPHIN : SL_SHARK;
  // Requins et dauphins : toujours au loin (pâles), pour rester un décor
  const depth = (type === SL_SHARK || type === SL_DOLPHIN) ? 0.1 + R() * 0.25 : 0.25 + R() * 0.75;
  const ltr = R() < 0.5;
  const base = { [SL_SCHOOL]: 0.012 + R() * 0.01, [SL_CLOWN]: 0.022 + R() * 0.012, [SL_TROPICAL]: 0.024 + R() * 0.016,
    [SL_OCTOPUS]: 0.035 + R() * 0.02, [SL_SEAHORSE]: 0.025 + R() * 0.015, [SL_TURTLE]: 0.05 + R() * 0.04,
    [SL_SHARK]: 0.12 + R() * 0.06, [SL_DOLPHIN]: 0.09 + R() * 0.04 }[type];
  const size = w * base * (0.55 + 0.6 * depth);
  const speedBase = { [SL_SCHOOL]: 0.09 + R() * 0.06, [SL_CLOWN]: 0.04 + R() * 0.04, [SL_TROPICAL]: 0.04 + R() * 0.04,
    [SL_OCTOPUS]: 0.02, [SL_SEAHORSE]: 0.012 + R() * 0.01, [SL_TURTLE]: 0.025 + R() * 0.015,
    [SL_SHARK]: 0.07 + R() * 0.03, [SL_DOLPHIN]: 0.12 + R() * 0.05 }[type];
  const vx = w * speedBase * (0.5 + 0.6 * depth) * (ltr ? 1 : -1);
  const y = h * (0.12 + R() * 0.62);
  const x0 = onScreen ? w * (0.1 + R() * 0.8) : ltr ? -size * 3 : w + size * 3;
  const color = type === SL_SCHOOL ? pick(SL_SCHOOL_COLORS) : type === SL_CLOWN ? 0xFFFF7A1A : type === SL_TROPICAL ? pick(SL_TROPICAL_COLORS)
    : type === SL_OCTOPUS ? pick(SL_OCTO_COLORS) : type === SL_SEAHORSE ? pick(SL_HORSE_COLORS) : type === SL_TURTLE ? pick(SL_TURTLE_COLORS)
    : type === SL_SHARK ? 0xFF78909C : 0xFF90A4AE;
  // Bancs : petits poissons par 5 à 12, poissons-clowns parfois par 2 ou 3 ; les autres seuls
  const count = type === SL_SCHOOL ? (R() < 0.2 ? 1 : 5 + Math.floor(R() * 8))
    : type === SL_CLOWN ? (R() < 0.5 ? 1 : 2 + Math.floor(R() * 2)) : type === SL_TROPICAL ? (R() < 0.7 ? 1 : 2) : 1;
  for (let i = 0; i < count; i++) {
    const ox = count === 1 ? 0 : (R() - 0.5) * size * (6 + count);
    const oy = count === 1 ? 0 : (R() - 0.5) * size * (3 + count * 0.6);
    sl.animals.push({ type, x: x0 + ox, y: y + oy, vx: vx * (0.95 + R() * 0.1), size: size * (0.85 + R() * 0.3), color, seed: R() * 6.28, depth });
  }
}

/** Couleur c voilée par l'eau selon la profondeur (loin = bleuté), avec l'opacité alpha (0..1). */
function waterTint(c, depth, alpha = 1) {
  const f = (1 - depth) * 0.6;
  return Color.argb(Math.floor(255 * alpha * (0.45 + 0.5 * depth)),
    Math.floor(Color.red(c) * (1 - f) + 40 * f), Math.floor(Color.green(c) * (1 - f) + 120 * f), Math.floor(Color.blue(c) * (1 - f) + 170 * f));
}

function drawSeaAnimal(canvas, a) {
  const sl = seaLife, p = sl.paint, path = sl.path, st = sl.stroke, ov = sl.oval;
  const s = a.size, x = a.x, y = a.y + Math.sin(time * 1.3 + a.seed) * s * 0.35, dir = a.vx >= 0 ? 1 : -1;
  const col = (c, al = 1) => waterTint(c, a.depth, al);
  const WHITE = 0xFFFFFFFF;
  const eye = (ex, ey, r) => { p.color = col(WHITE); canvas.drawCircle(ex, ey, r, p); p.color = col(0xFF1A1A1A); canvas.drawCircle(ex + r * 0.2, ey, r * 0.55, p); };
  const tri = (x1, y1, x2, y2, x3, y3) => { path.reset(); path.moveTo(x1, y1); path.lineTo(x2, y2); path.lineTo(x3, y3); path.close(); canvas.drawPath(path, p); };
  canvas.save();
  canvas.scale(dir, 1, x, y);
  switch (a.type) {
    case SL_SCHOOL: {
      p.color = col(a.color);
      ov.set(x - s, y - s * 0.42, x + s, y + s * 0.42); canvas.drawOval(ov, p);
      const wag = Math.sin(time * 14 + a.seed) * s * 0.18;
      tri(x - s * 0.8, y, x - s * 1.55, y - s * 0.45 + wag, x - s * 1.55, y + s * 0.45 + wag);
      p.color = col(Theme.lerp(a.color, WHITE, 0.5));
      ov.set(x - s * 0.6, y, x + s * 0.7, y + s * 0.3); canvas.drawOval(ov, p);
      eye(x + s * 0.55, y - s * 0.1, s * 0.15);
      break;
    }
    case SL_CLOWN: {
      const wag = Math.sin(time * 9 + a.seed) * s * 0.15;
      p.color = col(a.color);
      tri(x - s * 0.75, y, x - s * 1.35, y - s * 0.45 + wag, x - s * 1.35, y + s * 0.45 + wag);
      ov.set(x - s, y - s * 0.55, x + s, y + s * 0.55); canvas.drawOval(ov, p);
      // Trois bandes blanches bordées de noir
      canvas.save();
      sl.clip.reset(); sl.clip.addOval(ov); canvas.clipPath(sl.clip);
      for (const bx of [-0.55, 0.05, 0.55]) {
        p.color = col(0xFF222222); canvas.drawRect(x + (bx - 0.14) * s, y - s, x + (bx + 0.14) * s, y + s, p);
        p.color = col(WHITE); canvas.drawRect(x + (bx - 0.1) * s, y - s, x + (bx + 0.1) * s, y + s, p);
      }
      canvas.restore();
      p.color = col(0xFFFF9A3C);
      ov.set(x - s * 0.3, y - s * 0.85, x + s * 0.35, y - s * 0.35); canvas.drawArc(ov, 180, 180, true, p);
      eye(x + s * 0.7, y - s * 0.12, s * 0.14);
      break;
    }
    case SL_TROPICAL: {
      const wag = Math.sin(time * 8 + a.seed) * s * 0.12;
      p.color = col(a.color);
      path.reset(); path.moveTo(x, y - s); path.lineTo(x + s * 0.8, y); path.lineTo(x, y + s); path.lineTo(x - s * 0.7, y); path.close(); canvas.drawPath(path, p);
      tri(x - s * 0.6, y, x - s * 1.15, y - s * 0.4 + wag, x - s * 1.15, y + s * 0.4 + wag);
      // Nageoires hautes et basses, et rayures
      p.color = col(Theme.lerp(a.color, 0xFF000000, 0.25));
      path.reset(); path.moveTo(x - s * 0.1, y - s * 0.9); path.quadTo(x - s * 0.7, y - s * 1.4, x - s * 0.6, y - s * 0.3); path.close(); canvas.drawPath(path, p);
      path.reset(); path.moveTo(x - s * 0.1, y + s * 0.9); path.quadTo(x - s * 0.7, y + s * 1.4, x - s * 0.6, y + s * 0.3); path.close(); canvas.drawPath(path, p);
      st.strokeWidth = s * 0.12; st.color = col(Theme.lerp(a.color, WHITE, 0.6));
      canvas.drawLine(x + s * 0.15, y - s * 0.75, x + s * 0.15, y + s * 0.75, st);
      canvas.drawLine(x - s * 0.25, y - s * 0.6, x - s * 0.25, y + s * 0.6, st);
      eye(x + s * 0.45, y - s * 0.18, s * 0.13);
      break;
    }
    case SL_OCTOPUS: {
      // Nage par à-coups : la tête se contracte et les tentacules ondulent
      const pulse = 1 + 0.12 * Math.sin(time * 3 + a.seed);
      p.color = col(a.color); st.color = p.color; st.strokeWidth = s * 0.16;
      for (let i = 0; i < 6; i++) {
        const bx = x - s * 0.45 + i * s * 0.18;
        path.reset(); path.moveTo(bx, y + s * 0.2);
        path.quadTo(bx + Math.sin(time * 4 + i + a.seed) * s * 0.3, y + s * 0.7, bx - s * 0.1 + Math.sin(time * 3 + i) * s * 0.25, y + s * 1.15);
        canvas.drawPath(path, st);
      }
      ov.set(x - s * 0.55 * pulse, y - s * 0.75, x + s * 0.55 * pulse, y + s * 0.4); canvas.drawOval(ov, p);
      p.color = col(Theme.lerp(a.color, WHITE, 0.35));
      canvas.drawCircle(x - s * 0.2, y - s * 0.45, s * 0.08, p);
      canvas.drawCircle(x + s * 0.05, y - s * 0.55, s * 0.06, p);
      eye(x - s * 0.15, y - s * 0.05, s * 0.13);
      eye(x + s * 0.2, y - s * 0.05, s * 0.13);
      break;
    }
    case SL_SEAHORSE: {
      p.color = col(a.color);
      canvas.drawCircle(x, y - s * 0.6, s * 0.35, p);
      tri(x + s * 0.25, y - s * 0.7, x + s * 0.8, y - s * 0.6, x + s * 0.25, y - s * 0.45);
      ov.set(x - s * 0.35, y - s * 0.4, x + s * 0.3, y + s * 0.5); canvas.drawOval(ov, p);
      st.strokeWidth = s * 0.22; st.color = p.color;
      ov.set(x - s * 0.5, y + s * 0.3, x + s * 0.1, y + s * 0.9); canvas.drawArc(ov, 270, 270, false, st);
      // Petite nageoire dorsale qui vibre
      p.color = col(Theme.lerp(a.color, WHITE, 0.4));
      ov.set(x - s * 0.55, y - s * 0.2 + Math.sin(time * 12) * s * 0.03, x - s * 0.2, y + s * 0.15); canvas.drawOval(ov, p);
      p.color = col(0xFF1A1A1A);
      canvas.drawCircle(x + s * 0.1, y - s * 0.68, s * 0.07, p);
      break;
    }
    case SL_TURTLE:
      drawTurtle(canvas, x, y, s, (waterTint(a.color, a.depth) | 0xFF000000) >>> 0, 0.45 + 0.5 * a.depth, a.seed);
      break;
    case SL_SHARK: {
      const wag = Math.sin(time * 5 + a.seed) * s * 0.12;
      p.color = col(a.color);
      path.reset();
      path.moveTo(x + s, y);
      path.quadTo(x + s * 0.6, y - s * 0.32, x - s * 0.2, y - s * 0.28);
      path.quadTo(x - s * 0.8, y - s * 0.2, x - s * 1.1, y + wag * 0.3);
      path.quadTo(x - s * 0.7, y + s * 0.22, x, y + s * 0.22);
      path.quadTo(x + s * 0.7, y + s * 0.2, x + s, y);
      path.close(); canvas.drawPath(path, p);
      // Aileron, nageoires et queue
      tri(x + s * 0.05, y - s * 0.26, x - s * 0.25, y - s * 0.7, x - s * 0.35, y - s * 0.24);
      tri(x + s * 0.2, y + s * 0.15, x - s * 0.15, y + s * 0.5, x - s * 0.1, y + s * 0.15);
      path.reset(); path.moveTo(x - s * 1.0, y + wag * 0.3); path.lineTo(x - s * 1.45, y - s * 0.5 + wag); path.lineTo(x - s * 1.25, y + wag * 0.5); path.lineTo(x - s * 1.4, y + s * 0.35 + wag); path.close(); canvas.drawPath(path, p);
      p.color = col(0xFFECEFF1);
      path.reset(); path.moveTo(x + s * 0.9, y + s * 0.04); path.quadTo(x + s * 0.3, y + s * 0.22, x - s * 0.5, y + s * 0.1); path.quadTo(x + s * 0.2, y + s * 0.05, x + s * 0.9, y + s * 0.04); canvas.drawPath(path, p);
      p.color = col(0xFF263238);
      canvas.drawCircle(x + s * 0.62, y - s * 0.08, s * 0.04, p);
      break;
    }
    default: { // Dauphin : ondule en nageant
      canvas.rotate(Math.sin(time * 2 + a.seed) * 8, x, y);
      p.color = col(a.color);
      path.reset();
      path.moveTo(x + s * 1.15, y + s * 0.02);
      path.lineTo(x + s * 0.8, y - s * 0.06);
      path.quadTo(x + s * 0.5, y - s * 0.38, x - s * 0.2, y - s * 0.3);
      path.quadTo(x - s * 0.8, y - s * 0.2, x - s * 1.05, y);
      path.quadTo(x - s * 0.6, y + s * 0.22, x + s * 0.1, y + s * 0.22);
      path.quadTo(x + s * 0.7, y + s * 0.18, x + s * 1.15, y + s * 0.02);
      path.close(); canvas.drawPath(path, p);
      path.reset(); path.moveTo(x, y - s * 0.3); path.quadTo(x - s * 0.1, y - s * 0.6, x - s * 0.35, y - s * 0.62); path.lineTo(x - s * 0.3, y - s * 0.28); path.close(); canvas.drawPath(path, p);
      const wag = Math.sin(time * 4 + a.seed) * s * 0.15;
      path.reset(); path.moveTo(x - s * 1.0, y); path.lineTo(x - s * 1.35, y - s * 0.35 + wag); path.lineTo(x - s * 1.2, y + wag * 0.3); path.lineTo(x - s * 1.35, y + s * 0.3 + wag); path.close(); canvas.drawPath(path, p);
      p.color = col(0xFFE3F2FD);
      path.reset(); path.moveTo(x + s * 1.1, y + s * 0.04); path.quadTo(x + s * 0.3, y + s * 0.24, x - s * 0.6, y + s * 0.08); path.quadTo(x + s * 0.3, y + s * 0.08, x + s * 1.1, y + s * 0.04); canvas.drawPath(path, p);
      eye(x + s * 0.6, y - s * 0.1, s * 0.06);
    }
  }
  canvas.restore();
}
