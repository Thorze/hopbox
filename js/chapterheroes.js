'use strict';
// Personnages gagnés dans les chapitres 2 à 8 de l'Aventure et leur version dorée (équivalent de ChapterHeroes.kt).
// Même repère que specials.js : profil tourné vers la droite, unités du monde, pieds en (0, 0), y vers le haut.

function chapterHeroHeight(id) {
  switch (id) {
    case 'baleine': case 'leviathan': return 0.62;
    case 'zorg': case 'zorgor': return 0.72;
    case 'sergent': case 'general': return 0.78;
    case 'toxik': case 'plutonium': return 0.6;
    case 'morphee': case 'sableor': return 0.74;
    case 'yeti': case 'yetior': return 0.8;
    case 'pyro': case 'solaire': return 0.8;
    case 'chronos': case 'horloger': return 0.86;
    case 'atlas': case 'scarabor': return 0.66;
    case 'pixel': case 'arcadeking': return 0.66;
    case 'ramses': case 'pharaon': return 0.7;
    case 'casperon': case 'spectre': return 0.72;
    case 'decibel': case 'legende': return 0.82;
    case 'shinobi': case 'shogun': return 0.7;
    case 'chocochou': case 'delice': return 0.8;
    default: return null;
  }
}

const hp = new Paint(), hs = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), hpath = new Path(), hrect = new RectF();
const CH_GOLD_IDS = ['leviathan', 'zorgor', 'general', 'plutonium', 'sableor', 'yetior', 'solaire',
  'horloger', 'scarabor', 'arcadeking', 'pharaon', 'spectre', 'legende', 'shogun', 'delice'];

/** Teinte dorée d'une couleur (version « prestige ») : on garde la luminosité, on passe dans les ors. */
function goldOf(c) {
  const l = (Color.red(c) * 0.3 + Color.green(c) * 0.59 + Color.blue(c) * 0.11) / 255;
  return Color.argb(Color.alpha(c), clamp(Math.floor(150 + 105 * l), 0, 255), clamp(Math.floor(95 + 130 * l), 0, 255), clamp(Math.floor(10 + 90 * l * l), 0, 255));
}

/** Assombrit / éclaircit une couleur en gardant son alpha. */
function shadeC(c, f) {
  return Color.argb(Color.alpha(c), clamp(Math.floor(Color.red(c) * f), 0, 255), clamp(Math.floor(Color.green(c) * f), 0, 255), clamp(Math.floor(Color.blue(c) * f), 0, 255));
}
const withA = (c, a) => Color.argb(a, Color.red(c), Color.green(c), Color.blue(c));

/** Dessine le personnage de chapitre id (canvas centré sur ses pieds, miroir déjà appliqué). */
function drawChapterHero(canvas, id, base, sw, sh, closed, front, scared) {
  const gold = CH_GOLD_IDS.includes(id);
  const col = (c, raw) => (raw || !gold ? c : goldOf(c));
  const X = (x) => x * sw, Y = (y) => base - y * sh, unit = (sw + sh) / 2;
  const circle = (x, y, r, c, raw = false) => { hp.shader = null; hp.color = col(c, raw); canvas.drawCircle(X(x), Y(y), r * unit, hp); };
  const oval = (cx, cy, rx, ry, c, raw = false) => { hp.shader = null; hp.color = col(c, raw); hrect.set(X(cx - rx), Y(cy + ry), X(cx + rx), Y(cy - ry)); canvas.drawOval(hrect, hp); };
  const box = (l, b, r, t, c, radius = 0, raw = false) => {
    hp.shader = null; hp.color = col(c, raw); hrect.set(X(l), Y(t), X(r), Y(b));
    if (radius > 0) canvas.drawRoundRect(hrect, radius * sw, radius * sh, hp); else canvas.drawRect(hrect, hp);
  };
  const poly = (c, pts, raw = false) => {
    hpath.reset(); hpath.moveTo(X(pts[0]), Y(pts[1]));
    for (let i = 2; i < pts.length; i += 2) hpath.lineTo(X(pts[i]), Y(pts[i + 1]));
    hpath.close(); hp.shader = null; hp.color = col(c, raw); canvas.drawPath(hpath, hp);
  };
  const line = (x0, y0, x1, y1, c, width, raw = false) => { hs.color = col(c, raw); hs.strokeWidth = width * k; canvas.drawLine(X(x0), Y(y0), X(x1), Y(y1), hs); };
  const eye = (x, y, r) => {
    const rr = r * (scared ? 1.25 : 1);
    if (closed) { box(x - rr, y - rr * 0.15, x + rr, y + rr * 0.15, 0xFF1B1B1B, 0, true); return; }
    circle(x, y, rr, 0xFFFFFFFF, true);
    circle(x + (front ? 0 : rr * 0.35), y + rr * 0.1, rr * (scared ? 0.32 : 0.5), 0xFF1B1B1B, true);
  };
  const cube = (l, b, r, t, c, rad = 0.06) => {
    box(l, b, r, t, shadeC(c, 0.72), rad);
    box(l, b + 0.03, r - 0.03, t, c, rad);
    box(l + 0.04, t - 0.07, r - 0.08, t - 0.03, shadeC(c, 1.18), 0.02);
  };
  const flying = state === State.JUMPING || state === State.FALLING;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs;
  if (gold) {
    const hgt = chapterHeroHeight(id) || 0.6;
    hp.shader = null; hp.color = Color.argb(Math.floor(60 + 30 * abs(sin(time * 2.5))), 255, 214, 90);
    canvas.drawCircle(X(0), Y(hgt * 0.5), hgt * 0.75 * unit, hp);
  }

  switch (id) {
    case 'baleine': case 'leviathan': {
      const c = 0xFF22406E;
      poly(shadeC(c, 0.85), [-0.28, 0.22, -0.5, 0.42, -0.46, 0.18, -0.52, 0.02]);
      cube(-0.3, 0, 0.32, 0.5, c, 0.1);
      box(-0.27, 0.02, 0.28, 0.17, 0xFFB8D4EC, 0.06);
      for (let i = 0; i < 3; i++) line(-0.18 + i * 0.14, 0.05, -0.18 + i * 0.14, 0.15, 0xFF8FB2D2, 0.012);
      eye(0.17, 0.32, 0.045);
      line(0.12, 0.2, 0.28, 0.22, 0xFF0E1E36, 0.015);
      const q = (time * 1.6) % 1, hgt = 0.18 + 0.1 * sin(q * Math.PI);
      line(0.02, 0.52, 0.02, 0.52 + hgt, 0xCCBFE8FF, 0.04, !gold);
      for (const dx of [-0.08, 0.12]) circle(0.02 + dx, 0.52 + hgt - 0.02, 0.035, 0xCCDDF3FF, !gold);
      if (gold) {
        for (let i = 0; i < 5; i++) circle(-0.18 + i * 0.09, 0.53, 0.035, 0xFFFFFFFF, true);
        poly(0xFFFFC93C, [-0.14, 0.55, -0.14, 0.66, -0.08, 0.6, -0.02, 0.68, 0.04, 0.6, 0.1, 0.66, 0.1, 0.55], true);
      }
      break;
    }
    case 'zorg': case 'zorgor': {
      if (gold) {
        oval(0, 0.06, 0.42, 0.08, 0xFFB8860B, true);
        oval(0, 0.1, 0.38, 0.07, 0xFFFFD54F, true);
        for (let i = 0; i < 5; i++) circle(-0.3 + i * 0.15, 0.06, 0.025, ((Math.floor(time * 4) + i) % 2 === 0) ? 0xFFFFFFFF : 0xFFFF8F00, true);
      }
      const c = 0xFF8BDB3A, y0 = gold ? 0.12 : 0;
      if (!gold) for (const x of [-0.14, 0.1]) box(x, 0, x + 0.07, 0.08, shadeC(c, 0.7), 0.02);
      cube(-0.24, y0 + 0.05, 0.26, y0 + 0.5, c, 0.12);
      const wob = sin(time * 5) * 0.03;
      line(-0.08, y0 + 0.5, -0.14 + wob, y0 + 0.68, shadeC(c, 0.7), 0.02);
      line(0.12, y0 + 0.5, 0.18 + wob, y0 + 0.68, shadeC(c, 0.7), 0.02);
      circle(-0.14 + wob, y0 + 0.69, 0.035, 0xFFFF5CA8);
      circle(0.18 + wob, y0 + 0.69, 0.035, 0xFFFF5CA8);
      eye(0.02, y0 + 0.36, 0.04); eye(0.14, y0 + 0.39, 0.04); eye(0.08, y0 + 0.25, 0.035);
      line(0.02, y0 + 0.14, 0.17, y0 + 0.15, 0xFF2E5A12, 0.014);
      break;
    }
    case 'sergent': case 'general': {
      const c = 0xFF6B7A3A;
      for (const x of [-0.16, 0.08]) box(x, 0, x + 0.09, 0.08, 0xFF3A2E20, 0.02);
      cube(-0.26, 0.06, 0.28, 0.56, c, 0.06);
      for (const [x, y] of [[-0.16, 0.2], [0.08, 0.13], [-0.05, 0.4], [0.16, 0.32], [-0.2, 0.47]]) {
        oval(x, y, 0.06, 0.035, (Math.trunc(x * 100) % 2 === 0) ? 0xFF4E5A2A : 0xFF8C8A55);
      }
      box(-0.28, 0.5, 0.3, 0.62, 0xFF5D4037, 0.06);
      box(-0.3, 0.48, -0.2, 0.56, 0xFF4E342E, 0.03);
      const lens = gold ? 0xFFDDE7F2 : 0xFF9AD0F0;
      circle(0.1, 0.44, 0.07, 0xFF3A3A3A);
      circle(0.1, 0.44, 0.05, lens, gold);
      if (gold) circle(0.08, 0.46, 0.018, 0xFFFFFFFF, true); else eye(0.1, 0.44, 0.03);
      line(0.02, 0.25, 0.18, 0.24, 0xFF2E2A1A, 0.014);
      box(0, 0.62, 0.04, 0.7, 0xFF424242);
      const len = 0.28 * abs(cos(time * 25));
      line(0.02 - len, 0.71, 0.02 + len, 0.71, 0xFF616161, 0.03);
      if (gold) { hp.color = 0xFFFFFFFF; for (let i = 0; i < 5; i++) drawStar(canvas, X(-0.16 + i * 0.08), Y(0.3), 0.03 * unit, hp); }
      break;
    }
    case 'toxik': case 'plutonium': {
      const c = gold ? 0xFFFFB300 : 0xFF7CFF3A, wob = sin(time * 6) * 0.02;
      box(-0.27 - wob, 0, 0.27 + wob, 0.5 + wob, withA(c, 200), 0.14, true);
      box(-0.22, 0.04, 0.2, 0.46 + wob, Color.argb(120, 255, 255, 255), 0.12, true);
      box(-0.25, 0.02, 0.25, 0.47 + wob, withA(c, 160), 0.13, true);
      for (let i = 0; i < 4; i++) {
        const q = (time * 0.5 + i * 0.27) % 1;
        circle(-0.15 + i * 0.09, 0.06 + q * 0.38, 0.025 + 0.01 * (i % 2), Color.argb(170, 255, 255, 255), true);
      }
      const tx = X(-0.06), ty = Y(0.18), tr0 = 0.07 * unit;
      hp.shader = null; hp.color = 0xFF1B1B1B;
      canvas.drawCircle(tx, ty, tr0 * 0.25, hp);
      hrect.set(tx - tr0, ty - tr0, tx + tr0, ty + tr0);
      for (let i = 0; i < 3; i++) canvas.drawArc(hrect, -90 + i * 120 - 30, 60, true, hp);
      eye(0.08, 0.36, 0.045); eye(0.19, 0.35, 0.04);
      const dq = (time * 0.7) % 1;
      circle(0.2, 0.1 - dq * 0.1, 0.025 * (1 - dq), withA(c, 200), true);
      if (gold && flying) for (let i = 0; i < 3; i++) circle(-0.3 - i * 0.08, 0.2 + sin(time * 20 + i) * 0.05, 0.02, 0xFFFFF3B0, true);
      break;
    }
    case 'morphee': case 'sableor': {
      const c = gold ? 0xFFFFE082 : 0xFFF7F8FF;
      const puffs = [[-0.2, 0.18, 0.16], [0.18, 0.18, 0.16], [0, 0.14, 0.18], [-0.16, 0.38, 0.17], [0.16, 0.38, 0.17], [0, 0.45, 0.18]];
      for (const [x, y, r] of puffs) circle(x, y - 0.015, r, shadeC(c, 0.84), true);
      for (const [x, y, r] of puffs) circle(x, y + 0.02, r - 0.01, c, true);
      if (closed || !flying) {
        line(0.04, 0.34, 0.12, 0.33, 0xFF3A3A5A, 0.014, true);
        line(0.16, 0.34, 0.24, 0.33, 0xFF3A3A5A, 0.014, true);
      } else { eye(0.08, 0.34, 0.04); eye(0.2, 0.34, 0.04); }
      circle(0.03, 0.27, 0.03, 0x66FF7AB6, true);
      circle(0.25, 0.27, 0.03, 0x66FF7AB6, true);
      const hat = gold ? 0xFF3949AB : 0xFF3F6FD8;
      poly(hat, [-0.22, 0.56, 0.22, 0.56, -0.05, 0.82, -0.3, 0.74], true);
      box(-0.24, 0.53, 0.24, 0.59, 0xFFFFFFFF, 0.03, true);
      circle(-0.31, 0.73, 0.05, gold ? 0xFFFFD54F : 0xFFFFFFFF, true);
      hp.color = 0xFFFFE066;
      drawStar(canvas, X(0), Y(0.66), 0.03 * unit, hp);
      drawStar(canvas, X(-0.14), Y(0.68), 0.025 * unit, hp);
      if (!flying) {
        const q = (time * 0.5) % 1;
        textPaint.textSize = 0.14 * unit; textPaint.alpha = Math.floor(255 * (1 - q));
        canvas.drawText('z', X(0.3 + q * 0.15), Y(0.6 + q * 0.25), textPaint);
        textPaint.alpha = 255;
      }
      if (gold) {
        hs.color = Color.argb(150, 255, 255, 255); hs.strokeWidth = 0.008 * k;
        let px0 = 0, py0 = 0;
        for (let i = 0; i < 5; i++) {
          const a = time * 0.6 + i * 1.256, sx0 = X(cos(a) * 0.42), sy0 = Y(0.35 + sin(a) * 0.32);
          if (i > 0) canvas.drawLine(px0, py0, sx0, sy0, hs);
          hp.color = 0xFFFFFFFF; drawStar(canvas, sx0, sy0, 0.025 * unit, hp);
          px0 = sx0; py0 = sy0;
        }
      }
      break;
    }
    case 'yeti': case 'yetior': {
      const fur = gold ? 0xFFFFF1C1 : 0xFFF2F6FA, face = gold ? 0xFFFFD54F : 0xFFA9D8F2;
      for (const x of [-0.18, 0.08]) box(x, 0, x + 0.11, 0.1, shadeC(fur, 0.8), 0.04, true);
      box(-0.3, 0.05, 0.3, 0.66, shadeC(fur, 0.85), 0.12, true);
      box(-0.28, 0.07, 0.27, 0.66, fur, 0.12, true);
      for (let i = 0; i < 7; i++) {
        const a = i / 6;
        poly(fur, [-0.3 + a * 0.6 - 0.05, 0.64, -0.3 + a * 0.6 + 0.05, 0.64, -0.3 + a * 0.6 + sin(time * 3 + i) * 0.02, 0.72], true);
      }
      box(-0.02, 0.26, 0.27, 0.52, face, 0.08, true);
      eye(0.07, 0.43, 0.04); eye(0.19, 0.43, 0.04);
      box(0.06, 0.31, 0.22, 0.35, 0xFF2B4A66, 0.02, true);
      box(0.09, 0.33, 0.12, 0.36, 0xFFFFFFFF, 0, true);
      box(0.16, 0.33, 0.19, 0.36, 0xFFFFFFFF, 0, true);
      const horn = gold ? 0xFFFFFFFF : 0xFFD9F4FF;
      poly(horn, [-0.2, 0.66, -0.1, 0.66, -0.18, 0.84], true);
      poly(horn, [0.12, 0.66, 0.22, 0.66, 0.2, 0.84], true);
      if (gold) for (let i = 0; i < 3; i++) {
        const tw = abs(sin(time * 5 + i * 1.7));
        line(-0.2 + i * 0.2, 0.18, -0.2 + i * 0.2 + 0.04 * tw, 0.22, 0xFFFFFFFF, 0.015, true);
      }
      break;
    }
    case 'pyro': case 'solaire': {
      const rock = gold ? 0xFFE0A82E : 0xFF2B2630, lava = gold ? 0xFFFFF3B0 : 0xFFFF7A1F;
      for (const x of [-0.18, 0.08]) box(x, 0, x + 0.11, 0.12, shadeC(rock, 0.8), 0.03, true);
      box(-0.3, 0.08, 0.3, 0.62, shadeC(rock, 0.75), 0.08, true);
      box(-0.28, 0.1, 0.28, 0.62, rock, 0.08, true);
      const lc = withA(lava, Math.floor(255 * (0.6 + 0.4 * abs(sin(time * 3)))));
      line(-0.22, 0.5, -0.1, 0.38, lc, 0.025, true);
      line(-0.1, 0.38, -0.16, 0.22, lc, 0.025, true);
      line(0.05, 0.18, 0.2, 0.28, lc, 0.025, true);
      line(-0.02, 0.58, 0.04, 0.5, lc, 0.02, true);
      circle(0.08, 0.42, 0.045, lava, true);
      circle(0.2, 0.42, 0.04, lava, true);
      if (!closed) { circle(0.09, 0.42, 0.02, 0xFFFFFFE0, true); circle(0.21, 0.42, 0.018, 0xFFFFFFE0, true); }
      for (let i = 0; i < 4; i++) {
        const fx0 = -0.2 + i * 0.13, hgt = 0.14 + 0.06 * sin(time * 9 + i * 1.3);
        poly(gold ? 0xFFFFE066 : 0xFFFF9F1C, [fx0 - 0.06, 0.62, fx0 + 0.06, 0.62, fx0 + 0.01, 0.62 + hgt], true);
        poly(gold ? 0xFFFFFFFF : 0xFFFFD54F, [fx0 - 0.03, 0.62, fx0 + 0.03, 0.62, fx0 + 0.005, 0.62 + hgt * 0.6], true);
      }
      if (gold) poly(0xFFFFC93C, [-0.16, 0.62, -0.16, 0.72, -0.08, 0.66, 0, 0.75, 0.08, 0.66, 0.16, 0.72, 0.16, 0.62], true);
      if (flying) for (let i = 0; i < 3; i++) circle(-0.32 - i * 0.07, 0.3 + sin(time * 22 + i) * 0.06, 0.018, 0xFFFFB74D, true);
      break;
    }
    case 'chronos': case 'horloger': {
      // Automate en cuivre riveté : monocle, haut-de-forme à engrenage, clé à remonter dans le dos
      for (const x of [-0.16, 0.08]) box(x, 0, x + 0.09, 0.08, 0xFF5D4037, 0.02);
      cube(-0.26, 0.06, 0.28, 0.56, 0xFFB87333, 0.05);
      for (const [x, y] of [[-0.22, 0.1], [0.2, 0.1], [-0.22, 0.5], [0.2, 0.5], [-0.02, 0.1]]) circle(x, y, 0.018, 0xFF7A4A24);
      const ka = cos(time * 4);
      line(-0.26, 0.32, -0.38, 0.32, 0xFF9E9E9E, 0.03);
      oval(-0.42, 0.32 + 0.06 * ka, 0.035, 0.07 * abs(ka) + 0.01, 0xFFBDBDBD);
      oval(-0.42, 0.32 - 0.06 * ka, 0.035, 0.07 * abs(ka) + 0.01, 0xFFBDBDBD);
      eye(0.02, 0.4, 0.04); eye(0.15, 0.4, 0.045);
      hs.color = col(0xFFFFC93C); hs.strokeWidth = 0.014 * k; canvas.drawCircle(X(0.15), Y(0.4), 0.065 * unit, hs);
      line(0.21, 0.37, 0.24, 0.2, 0xFFFFC93C, 0.008);
      line(0.04, 0.24, 0.17, 0.25, 0xFF3E2414, 0.014);
      box(-0.24, 0.56, 0.26, 0.6, 0xFF2B2B2B);
      box(-0.15, 0.6, 0.17, 0.84, 0xFF2B2B2B, 0.02);
      box(-0.15, 0.62, 0.17, 0.66, 0xFF8C6239);
      hs.color = col(0xFFC9A13B); hs.strokeWidth = 0.02 * k; canvas.drawCircle(X(0.12), Y(0.74), 0.06 * unit, hs);
      for (let i = 0; i < 6; i++) { const an = time * 2 + i * 1.047; line(0.12 + cos(an) * 0.06, 0.74 + sin(an) * 0.06, 0.12 + cos(an) * 0.085, 0.74 + sin(an) * 0.085, 0xFFC9A13B, 0.02); }
      if (gold) {
        const nums = ['XII', 'III', 'VI', 'IX'];
        textPaint.textSize = 0.09 * unit; textPaint.color = 0xFFFFF3B0;
        for (let i = 0; i < 4; i++) { const an = time * 0.7 + i * 1.571; canvas.drawText(nums[i], X(cos(an) * 0.45), Y(0.45 + sin(an) * 0.35), textPaint); }
        textPaint.color = Color.WHITE;
      }
      break;
    }
    case 'atlas': case 'scarabor': {
      const shell = 0xFF1565C0;
      for (let i = 0; i < 3; i++) { const lx = -0.15 + i * 0.14, step = flying ? 0 : sin(time * 10 + i) * 0.02; line(lx, 0.12, lx - 0.05 + step, 0, 0xFF1B1B1B, 0.025); }
      oval(-0.04, 0.3, 0.3, 0.22, shadeC(shell, 0.7));
      oval(-0.06, 0.32, 0.28, 0.2, shell);
      line(-0.06, 0.52, -0.06, 0.12, shadeC(shell, 0.6), 0.012);
      oval(-0.12, 0.4, 0.1, 0.06, gold ? 0xFFFFF8E1 : 0x8880D8FF, true);
      if (flying) { oval(-0.2, 0.5, 0.16, 0.05, 0x99E1F5FE, true); oval(0.05, 0.52, 0.16, 0.05, 0x99E1F5FE, true); }
      circle(0.25, 0.28, 0.11, 0xFF263238);
      poly(0xFF37474F, [0.28, 0.34, 0.36, 0.62, 0.42, 0.6, 0.34, 0.3]);
      poly(0xFF37474F, [0.36, 0.62, 0.3, 0.66, 0.42, 0.6]);
      eye(0.29, 0.29, 0.035);
      if (gold) { circle(-0.15, 0.34, 0.03, 0xFFE53950, true); circle(0.02, 0.4, 0.03, 0xFF29B6F6, true); circle(-0.04, 0.24, 0.03, 0xFF66BB6A, true); }
      break;
    }
    case 'pixel': case 'arcadeking': {
      for (const x of [-0.16, 0.08]) box(x, 0, x + 0.09, 0.07, 0xFF212121, 0.01);
      box(-0.26, 0.05, 0.28, 0.58, 0xFF1A1A2E, 0.04);
      hs.color = gold ? 0xFFFFE082 : 0xFF00E5FF; hs.strokeWidth = 0.02 * k;
      hrect.set(X(-0.26), Y(0.58), X(0.28), Y(0.05)); canvas.drawRoundRect(hrect, 0.04 * sw, 0.04 * sh, hs);
      box(-0.12, 0.16, 0.24, 0.48, gold ? 0xFF5D4A00 : 0xFF0B3D2E, 0.05, true);
      const scr = gold ? 0xFFFFF176 : 0xFF69F0AE;
      if (closed) { box(-0.02, 0.37, 0.04, 0.385, scr, 0, true); box(0.1, 0.37, 0.16, 0.385, scr, 0, true); }
      else { box(-0.02, 0.35, 0.04, 0.41, scr, 0, true); box(0.1, 0.35, 0.16, 0.41, scr, 0, true); }
      box(-0.03, 0.25, 0.17, 0.27, scr, 0, true); box(-0.05, 0.27, -0.03, 0.29, scr, 0, true); box(0.17, 0.27, 0.19, 0.29, scr, 0, true);
      const q = (time * 1.5) % 1;
      box(-0.12, 0.16 + q * 0.3, 0.24, 0.17 + q * 0.3, 0x3300FF88, 0, true);
      if (gold) for (let i = 0; i < 5; i++) {
        const bob = sin(time * 3 + i) * 0.015 + (i % 2 === 0 ? 0.04 : 0);
        box(-0.18 + i * 0.09, 0.66 + bob, -0.13 + i * 0.09, 0.71 + bob, 0xFFFFC93C, 0, true);
      }
      break;
    }
    case 'ramses': case 'pharaon': {
      const c = gold ? 0xFFE0A82E : 0xFFEDE6D6;
      for (const x of [-0.15, 0.08]) box(x, 0, x + 0.09, 0.08, shadeC(c, 0.8), 0.02, true);
      box(-0.26, 0.06, 0.27, 0.56, shadeC(c, 0.85), 0.05, true);
      box(-0.25, 0.07, 0.25, 0.56, c, 0.05, true);
      const glow = clamp(Math.floor(200 + 55 * sin(time * 4)), 0, 255);
      if (gold) {
        for (let i = 0; i < 5; i++) box(-0.32, 0.3 + i * 0.06, -0.2, 0.33 + i * 0.06, i % 2 === 0 ? 0xFF1E3A8A : 0xFFFFC93C, 0, true);
        box(-0.27, 0.54, 0.27, 0.64, 0xFF1E3A8A, 0.03, true);
        for (let i = 0; i < 5; i++) box(-0.25 + i * 0.1, 0.55, -0.2 + i * 0.1, 0.63, 0xFFFFC93C, 0, true);
        box(0.06, 0.02, 0.12, 0.14, 0xFF1E3A8A, 0.02, true);
        eye(0.04, 0.4, 0.04); eye(0.17, 0.4, 0.04);
      } else {
        for (let i = 0; i < 6; i++) line(-0.25, 0.12 + i * 0.08, 0.25, 0.16 + i * 0.08 - (i % 2 === 0 ? 0.06 : 0), 0xFFBFB49C, 0.014, true);
        line(0.2, 0.12, 0.32, 0.04 + sin(time * 4) * 0.02, 0xFFEDE6D6, 0.03, true);
        box(-0.05, 0.36, 0.24, 0.44, 0xFF3E3A30, 0.02, true);
        if (!closed) { circle(0.03, 0.4, 0.03, Color.argb(glow, 255, 230, 60), true); circle(0.16, 0.4, 0.03, Color.argb(glow, 255, 230, 60), true); }
      }
      break;
    }
    case 'casperon': case 'spectre': {
      const fl = sin(time * 2.5) * 0.03, body = gold ? 0xE6FFD54F : 0xCCF5FAFF;
      circle(0, 0.38 + fl, 0.32, gold ? 0x40FFE082 : 0x4080D8FF, true);
      hpath.reset();
      hpath.moveTo(X(-0.24), Y(0.08 + fl));
      hpath.lineTo(X(-0.24), Y(0.42 + fl));
      hpath.cubicTo(X(-0.24), Y(0.72 + fl), X(0.26), Y(0.72 + fl), X(0.26), Y(0.42 + fl));
      hpath.lineTo(X(0.26), Y(0.08 + fl));
      for (let i = 0; i < 4; i++) { const x0 = 0.26 - i * 0.125; hpath.quadTo(X(x0 - 0.06), Y(fl + sin(time * 6 + i) * 0.02), X(x0 - 0.125), Y(0.08 + fl)); }
      hpath.close();
      hp.shader = null; hp.color = body; canvas.drawPath(hpath, hp);
      eye(0.06, 0.44 + fl, 0.045); eye(0.18, 0.44 + fl, 0.04);
      oval(0.12, 0.3 + fl, 0.04, 0.03, 0xFF37474F, true);
      hs.color = 0xFF90A4AE; hs.strokeWidth = 0.012 * k;
      for (let i = 0; i < 3; i++) canvas.drawCircle(X(-0.24 - i * 0.06), Y(0.12 + fl - i * 0.03), 0.025 * unit, hs);
      if (gold) poly(0xFFFFC93C, [-0.14, 0.66 + fl, -0.14, 0.78 + fl, -0.07, 0.71 + fl, 0, 0.82 + fl, 0.07, 0.71 + fl, 0.14, 0.78 + fl, 0.14, 0.66 + fl], true);
      break;
    }
    case 'decibel': case 'legende': {
      for (const x of [-0.16, 0.08]) box(x, 0, x + 0.09, 0.08, 0xFF424242, 0.02);
      cube(-0.26, 0.06, 0.28, 0.58, 0xFF1C1C22, 0.05);
      line(-0.1, 0.12, -0.1, 0.4, 0xFF9E9E9E, 0.012);
      for (let i = 0; i < 5; i++) {
        const sx0 = -0.2 + i * 0.09, hgt = 0.14 + 0.04 * sin(time * 8 + i);
        poly(i % 2 === 0 ? 0xFF76FF03 : 0xFFFF2BD6, [sx0 - 0.04, 0.58, sx0 + 0.04, 0.58, sx0 + 0.01, 0.58 + hgt]);
      }
      hp.shader = null;
      hp.color = col(0xFFFF2BD6); drawStar(canvas, X(0.04), Y(0.4), 0.07 * unit, hp);
      hp.color = col(0xFF00E5FF); drawStar(canvas, X(0.18), Y(0.4), 0.065 * unit, hp);
      line(0.04, 0.24, 0.18, 0.26, 0xFFFFFFFF, 0.016);
      hs.color = col(0xFFE0E0E0); hs.strokeWidth = 0.025 * k;
      hrect.set(X(-0.2), Y(0.25), X(0.24), Y(0.05)); canvas.drawArc(hrect, 0, 180, false, hs);
      box(-0.24, 0.08, -0.16, 0.2, 0xFFE53950, 0.03);
      box(0.2, 0.08, 0.28, 0.2, 0xFFE53950, 0.03);
      if (gold || flying) {
        textPaint.textSize = 0.14 * unit; textPaint.color = gold ? 0xFFFFF3B0 : 0xFF00E5FF;
        for (let i = 0; i < 3; i++) { const q = (time * 0.6 + i * 0.33) % 1; canvas.drawText(i % 2 === 0 ? '♪' : '♫', X(-0.35 + i * 0.3), Y(0.6 + q * 0.4), textPaint); }
        textPaint.color = Color.WHITE;
      }
      break;
    }
    case 'shinobi': case 'shogun': {
      if (!gold) {
        line(-0.3, 0.2, -0.05, 0.62, 0xFF8D6E63, 0.025); line(-0.22, 0.15, 0.02, 0.6, 0xFF8D6E63, 0.025);
        for (const x of [-0.15, 0.08]) box(x, 0, x + 0.09, 0.07, 0xFF111111, 0.02);
        cube(-0.25, 0.05, 0.27, 0.56, 0xFF1E1E26, 0.06);
        box(-0.06, 0.33, 0.25, 0.45, 0xFFF1C9A5, 0.03);
        eye(0.04, 0.39, 0.035); eye(0.16, 0.39, 0.035);
        box(-0.25, 0.47, 0.27, 0.52, 0xFFD32F2F);
        const wv = sin(time * 7) * 0.05;
        poly(0xFFD32F2F, [-0.25, 0.5, -0.48, 0.56 + wv, -0.46, 0.5 + wv, -0.25, 0.48]);
        poly(0xFFB71C1C, [-0.25, 0.49, -0.42, 0.44 - wv, -0.4, 0.4 - wv, -0.25, 0.47]);
      } else {
        for (const x of [-0.15, 0.08]) box(x, 0, x + 0.09, 0.07, 0xFF5D4037, 0.02, true);
        box(-0.26, 0.05, 0.28, 0.56, 0xFFB8860B, 0.05, true);
        box(-0.25, 0.06, 0.26, 0.56, 0xFFE0A82E, 0.05, true);
        for (let i = 0; i < 4; i++) box(-0.25, 0.08 + i * 0.06, 0.26, 0.1 + i * 0.06, 0xFF8B1A1A, 0, true);
        box(-0.04, 0.34, 0.24, 0.46, 0xFF3A2A10, 0.03, true);
        eye(0.05, 0.4, 0.035); eye(0.16, 0.4, 0.035);
        box(-0.3, 0.52, 0.32, 0.62, 0xFFB8860B, 0.04, true);
        box(-0.18, 0.6, 0.2, 0.7, 0xFFE0A82E, 0.06, true);
        hs.color = 0xFFFFE066; hs.strokeWidth = 0.03 * k;
        hrect.set(X(-0.12), Y(0.92), X(0.16), Y(0.62)); canvas.drawArc(hrect, 200, 140, false, hs);
      }
      break;
    }
    case 'chocochou': case 'delice': {
      const wrap = gold ? 0xFFE0A82E : 0xFFC68B59;
      poly(wrap, [-0.26, 0.32, 0.28, 0.32, 0.22, 0, -0.2, 0], true);
      for (let i = 0; i < 5; i++) line(-0.18 + i * 0.09, 0.3, -0.15 + i * 0.075, 0.02, shadeC(wrap, 0.75), 0.012, true);
      oval(0.01, 0.36, 0.3, 0.09, gold ? 0xFFB8860B : 0xFF5D3A1F, true);
      const cream = gold ? 0xFFFFF3B0 : 0xFFFFFDF7;
      oval(0.01, 0.44, 0.26, 0.08, shadeC(cream, 0.9), true);
      oval(0.01, 0.52, 0.2, 0.07, cream, true);
      oval(0.01, 0.6, 0.13, 0.06, cream, true);
      eye(0.05, 0.2, 0.04); eye(0.16, 0.2, 0.035);
      line(0.06, 0.1, 0.15, 0.11, 0xFF5D3A1F, 0.014, true);
      const cols = [0xFFE53950, 0xFF3F8EFC, 0xFFFFC93C, 0xFF3DBE6E];
      for (let i = 0; i < 7; i++) { const u = -0.18 + i * 0.06, v = 0.44 + (i % 3) * 0.06; line(u, v, u + 0.03, v + 0.015, gold ? 0xFFFFFFFF : cols[i % 4], 0.014, true); }
      circle(0.02, 0.72, 0.06, 0xFFE53950, true);
      line(0.02, 0.77, 0.07, 0.86, 0xFF3E7D2A, 0.012, true);
      if (gold) {
        poly(0xFFFFC93C, [-0.14, 0.78, -0.14, 0.9, -0.07, 0.83, 0, 0.94, 0.07, 0.83, 0.14, 0.9, 0.14, 0.78], true);
        circle(-0.07, 0.81, 0.015, 0xFFE53950, true); circle(0.07, 0.81, 0.015, 0xFFE53950, true);
      }
      break;
    }
  }
  if (gold) {
    for (let i = 0; i < 3; i++) {
      const tw = abs(sin(time * 4 + i * 2.1)), sx0 = -0.32 + i * 0.32, sy0 = 0.5 + (i % 2) * 0.32;
      line(sx0 - 0.05 * tw, sy0, sx0 + 0.05 * tw, sy0, 0xFFFFFFFF, 0.015, true);
      line(sx0, sy0 - 0.05 * tw, sx0, sy0 + 0.05 * tw, 0xFFFFFFFF, 0.015, true);
    }
  }
}

/** Dessine le personnage id (n'importe lequel) à l'écran, pieds en (x, feetY), agrandi scale fois. */
function drawHeroAt(canvas, id, x, feetY, scale, front = true, right = true) {
  const saved = lookSpecial;
  lookSpecial = id;
  canvas.save();
  canvas.scale(scale, scale, x, feetY);
  drawCharacter(canvas, x, feetY, 0, 1, 1, right, false, front);
  canvas.restore();
  lookSpecial = saved;
}
