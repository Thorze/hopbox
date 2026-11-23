'use strict';
// Bonus rare « Le grand saut » (équivalent de BigJump.kt) : un seul saut, très loin, vers une cible géante.
// Vue isométrique du jeu : le perso part de son bloc en bas à gauche, la cible flotte en haut à droite, dans l'axe du saut.
// Maintenir pour charger, relâcher : le centre rapporte 12 points, chaque anneau vers le bord un peu moins, à côté 0.
// Au sommet du saut, ralenti façon « bullet time » : zoom, bandes noires, ondes de vent, traînée, lignes de vitesse.

const BIGJUMP_CHANCE = 0.18;              // probabilité, à partir du 2e bonus de la partie
const BIGJUMP_RINGS = [12, 8, 5, 3, 1];   // points, du centre vers le bord
const BIGJUMP_RING_COLORS = ['#FFD54F', '#FFFFFF', '#E53950', '#FFFFFF', '#3F8EFC'];
const BIGJUMP_WAIT = 10;                  // secondes sans appui : bonus perdu
const BIGJUMP_FLIGHT = 1.9;               // durée du saut sans le ralenti (s)
const BIGJUMP_CHARGE = 2.4;               // s d'appui pour la pleine charge (un grand saut se charge longtemps)
// Monde (mêmes unités que le jeu : un bloc normal fait 1,2 de large)
const BIGJUMP_MAX = 34;                   // portée à pleine charge (un saut normal : 5,6 au plus)
const BIGJUMP_R = 5;                      // rayon de la cible
const BIGJUMP_ALT = 9;                    // la cible flotte plus haut que le bloc de départ
const BIGJUMP_ARC = 14;                   // hauteur de l'arc au-dessus de la ligne départ-cible
const BIGJUMP_HERO = 3;                   // perso et bloc grossis pour rester visibles en vue large
const BIG_JUMP = { id: 'bigjump', get title() { return tr('bonus.bigjump.title'); }, get hint() { return tr('bonus.bigjump.hint'); } };
const bigJumpPaint = new Paint();
const bigJumpStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });
const bigJumpText = new Paint({ textAlign: Align.CENTER, color: Color.WHITE, bold: true });
const bj = { phase: 'aim', charge: 0, charging: false, s: 0, dist: 0, D: 0, slow: 0, spin: 0, landT: 0, gain: 0,
  fallV: 0, x: 0, y: 0, shake: 0, ripples: [], ghosts: [], confetti: [], clouds: [], rippleT: 0, ghostT: 0, waitT: 0 };

// Projection isométrique (comme le jeu), en unités du monde : saut le long de x, hauteur y
const bigJumpU = (x) => x * cos30;
const bigJumpV = (x, y) => -x * sin30 - y;

function bigJumpStart() {
  Object.assign(bj, { phase: 'aim', charge: 0, charging: false, s: 0, slow: 0, spin: 0, landT: 0, gain: 0, fallV: 0, shake: 0,
    ripples: [], ghosts: [], confetti: [], rippleT: 0, ghostT: 0, waitT: 0, x: 0, y: 0 });
  bj.D = BIGJUMP_MAX * (0.64 + rnd() * 0.19);   // la bonne force change à chaque fois (entre 64 et 83 % de la jauge)
  bj.clouds = Array.from({ length: 16 }, () => ({ x: rnd() * w * 2.2 - w * 0.6, y: h * (0.08 + rnd() * 0.85), s: 0.5 + rnd() * 0.9, depth: 0.25 + rnd() * 0.55 }));
}

/** Appui pendant la visée : la charge commence. */
function bigJumpPress() {
  if (bj.phase !== 'aim') return;
  bj.charging = true; bj.charge = 0;
}

/** Lâcher : le saut part avec la force chargée. */
function bigJumpRelease() {
  if (bonusType !== BIG_JUMP || bj.phase !== 'aim' || !bj.charging) return;
  const ratio = clamp(bj.charge / BIGJUMP_CHARGE, 0, 1);
  bj.charging = false; bj.phase = 'fly'; bj.s = 0;
  bj.dist = ratio * BIGJUMP_MAX;
  sounds.play('JUMP', 1, 0.8 + 0.3 * ratio);
  vibrate(20);
}

/** Points selon l'écart au centre de la cible, le long du saut (0 si à côté). */
function bigJumpPoints(x) {
  const ring = Math.floor(Math.abs(x - bj.D) / BIGJUMP_R / 0.2);
  return ring < BIGJUMP_RINGS.length ? BIGJUMP_RINGS[ring] : 0;
}

/** Ralenti : 0 en dehors, 1 au sommet du saut. */
function bigJumpBell(s) {
  const f = clamp(1 - Math.abs(s - 0.5) / 0.17, 0, 1);
  return f * f * (3 - 2 * f);
}

function bigJumpUpdate(dt) {
  if (bj.shake > 0) bj.shake = Math.max(0, bj.shake - dt * 2.5);
  for (const r of bj.ripples) r.t += dt;
  bj.ripples = bj.ripples.filter((r) => r.t < 0.9);
  for (const c of bj.confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += k * 14 * dt; c.r += c.vr * dt; c.t -= dt; }
  bj.confetti = bj.confetti.filter((c) => c.t > 0);
  if (bj.phase === 'aim') {
    if (bj.charging) bj.charge = Math.min(BIGJUMP_CHARGE, bj.charge + dt);
    else if (bonusT >= bonusIntro) { bj.waitT += dt; if (bj.waitT > BIGJUMP_WAIT) { bj.phase = 'done'; finishBonus(0); } }
  } else if (bj.phase === 'fly') {
    bj.slow = bigJumpBell(bj.s);
    const before = bj.s;
    bj.s = Math.min(1, bj.s + dt / BIGJUMP_FLIGHT * (1 - 0.84 * bj.slow));
    if (before < 0.33 && bj.s >= 0.33) sounds.play('WHOOSH', 1, 0.6);   // entrée dans le ralenti
    bj.x = bj.dist * bj.s;
    bj.y = BIGJUMP_ALT * bj.s + BIGJUMP_ARC * 4 * bj.s * (1 - bj.s);
    bj.spin = 360 * (bj.s < 0.5 ? 2 * bj.s * bj.s : 1 - 2 * (1 - bj.s) * (1 - bj.s));
    // Ondes de vent laissées derrière le perso (orientées selon le trajet à l'écran), et images rémanentes
    bj.rippleT -= dt;
    if (bj.rippleT <= 0) {
      const dx = bj.dist, dy = BIGJUMP_ALT + BIGJUMP_ARC * 4 * (1 - 2 * bj.s);
      bj.ripples.push({ x: bj.x, y: bj.y + 0.45 * BIGJUMP_HERO, t: 0, a: Math.atan2(-dx * sin30 - dy, dx * cos30) });
      bj.rippleT = bj.slow > 0.1 ? 0.045 : 0.09;
    }
    bj.ghostT -= dt;
    if (bj.ghostT <= 0) { bj.ghosts.push({ x: bj.x, y: bj.y, spin: bj.spin }); if (bj.ghosts.length > 6) bj.ghosts.shift(); bj.ghostT = 0.035; }
    if (bj.s >= 1) {
      bj.ghosts = []; bj.slow = 0;
      const gain = bigJumpPoints(bj.x);
      if (gain > 0) {
        bj.phase = 'land'; bj.landT = 0; bj.gain = gain; bj.y = BIGJUMP_ALT; bj.spin = 0;
        bj.shake = gain >= 8 ? 1 : 0.5;
        sounds.play('LAND');
        if (gain === BIGJUMP_RINGS[0]) sounds.play('PERFECT');
        if (gain >= 8) {
          const ox = bigJumpU(bj.x) * k, oy = bigJumpV(bj.x, BIGJUMP_ALT + 0.5) * k;
          for (let i = 0; i < 40; i++) {
            const a = rnd() * Math.PI * 2, sp = k * (4 + rnd() * 6);
            bj.confetti.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a)) * sp - k * 3, r: rnd() * 360, vr: (rnd() - 0.5) * 900, t: 1.4 + rnd() * 0.6, c: palette[i % palette.length] });
          }
        }
        finishBonus(gain);
      } else { bj.phase = 'fall'; bj.fallV = 4; finishBonus(0); }
    }
  } else if (bj.phase === 'land') {
    bj.landT += dt;
  } else if (bj.phase === 'fall') {
    bj.fallV += 30 * dt; bj.y -= bj.fallV * dt; bj.spin += 400 * dt;
  }
}

/**
 * Caméra : centre (u, v) en unités projetées, et z = pixels par unité.
 * Visée : vue large qui cadre le bloc (en bas à gauche) et la cible (en haut à droite) ; l'intro part de la cible et recule.
 * Saut : la caméra se rapproche et suit le perso (zoom en plus pendant le ralenti), puis revient en vue large.
 * Atterrissage réussi : on s'approche de la cible pour fêter ça.
 */
function bigJumpCamera() {
  const R = BIGJUMP_R;
  const minU = bigJumpU(-4.5), maxU = bigJumpU(bj.D) + R * 1.2247 + 1;
  const minV = bigJumpV(bj.D, BIGJUMP_ALT) - R * 0.7071 - 2, maxV = bigJumpV(0, 0) + 5.5;
  const z = Math.min(w * 0.92 / (maxU - minU), (h * 0.62) / (maxV - minV));
  const fit = { u: (minU + maxU) / 2, v: (minV + maxV) / 2 - h * 0.05 / z, z };
  const close = { u: bigJumpU(bj.D), v: bigJumpV(bj.D, BIGJUMP_ALT) - h * 0.1 / (k * 0.6), z: k * 0.6 };   // cible sous les textes
  const mix = (a, b, p) => ({ u: a.u + (b.u - a.u) * p, v: a.v + (b.v - a.v) * p, z: a.z + (b.z - a.z) * p });
  const smooth = (p) => { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); };
  if (bj.phase === 'aim') return mix(close, fit, smooth((bonusT - 0.45) / (bonusIntro - 0.45)));
  if (bj.phase === 'fly') {
    const e = Math.pow(Math.sin(Math.PI * bj.s), 0.7);
    const c = mix(fit, { u: bigJumpU(bj.x), v: bigJumpV(bj.x, bj.y) - 0.6, z: k * 0.9 }, e);
    c.z *= 1 + 0.35 * bj.slow;
    return c;
  }
  if (bj.phase === 'land') return mix(fit, close, smooth(bj.landT / 0.6));
  return fit;
}

function bigJumpDrawCloud(canvas, x, y, s, alpha) {
  bigJumpPaint.color = Color.argb(alpha, 255, 255, 255);
  const r = w * 0.05 * s;
  canvas.drawCircle(x, y, r, bigJumpPaint);
  canvas.drawCircle(x + r * 1.1, y + r * 0.2, r * 0.8, bigJumpPaint);
  canvas.drawCircle(x - r * 1.05, y + r * 0.25, r * 0.7, bigJumpPaint);
  rect.set(x - r * 1.7, y + r * 0.1, x + r * 1.8, y + r * 0.8);
  canvas.drawRoundRect(rect, r * 0.35, r * 0.35, bigJumpPaint);
}

/** Ellipse isométrique d'un cercle horizontal de rayon r (unités) centré en (cx, cy) (pixels du monde). */
function bigJumpIsoOval(canvas, cx, cy, r, paint) {
  rect.set(cx - r * 1.2247 * k, cy - r * 0.7071 * k, cx + r * 1.2247 * k, cy + r * 0.7071 * k);
  canvas.drawOval(rect, paint);
}

/** La cible géante, sur une île volante, en vue iso. */
function bigJumpDrawTarget(canvas) {
  const R = BIGJUMP_R, PC = Color.parseColor;
  const cx = bigJumpU(bj.D) * k, cy = bigJumpV(bj.D, BIGJUMP_ALT) * k, th = 0.7 * k;
  const rx = R * 1.2247 * k, ry = R * 0.7071 * k;
  // Halo doré qui pulse (bonus rare)
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  for (let i = 3; i >= 1; i--) {
    bigJumpPaint.color = Color.argb(Math.round((18 + 10 * pulse) * (4 - i) / 3), 255, 214, 90);
    rect.set(cx - rx * (1 + 0.07 * i), cy - ry * (1 + 0.1 * i), cx + rx * (1 + 0.07 * i), cy + ry * (1 + 0.12 * i) + th);
    canvas.drawOval(rect, bigJumpPaint);
  }
  // Roche sous l'île
  bigJumpPaint.color = PC('#7A5A3C');
  tmpPath.reset(); tmpPath.moveTo(cx - rx * 0.92, cy + th * 0.6); tmpPath.lineTo(cx + rx * 0.92, cy + th * 0.6);
  tmpPath.lineTo(cx + rx * 0.3, cy + th + ry * 1.5); tmpPath.lineTo(cx - rx * 0.12, cy + th + ry * 2); tmpPath.close();
  canvas.drawPath(tmpPath, bigJumpPaint);
  bigJumpPaint.color = PC('#5E4430');
  tmpPath.reset(); tmpPath.moveTo(cx + rx * 0.2, cy + th * 0.6); tmpPath.lineTo(cx + rx * 0.92, cy + th * 0.6);
  tmpPath.lineTo(cx + rx * 0.3, cy + th + ry * 1.5); tmpPath.close();
  canvas.drawPath(tmpPath, bigJumpPaint);
  // Épaisseur
  bigJumpPaint.color = PC('#2C3E7A');
  rect.set(cx - rx, cy - ry + th, cx + rx, cy + ry + th); canvas.drawOval(rect, bigJumpPaint);
  rect.set(cx - rx, cy, cx + rx, cy + th); canvas.drawRect(rect, bigJumpPaint);
  // Anneaux, du bord vers le centre
  for (let i = BIGJUMP_RINGS.length - 1; i >= 0; i--) {
    bigJumpPaint.color = PC(BIGJUMP_RING_COLORS[i]);
    bigJumpIsoOval(canvas, cx, cy, R * (i + 1) / BIGJUMP_RINGS.length, bigJumpPaint);
  }
  // Points de chaque anneau, le long de l'axe du saut (vers le bloc de départ)
  bigJumpText.textSize = k * 0.9;
  for (let i = 0; i < BIGJUMP_RINGS.length; i++) {
    const x = bj.D - (i === 0 ? 0 : R * (i + 0.5) / BIGJUMP_RINGS.length);
    bigJumpText.color = BIGJUMP_RING_COLORS[i] === '#FFFFFF' ? PC('#2C3E7A') : Color.WHITE;
    canvas.drawText(String(BIGJUMP_RINGS[i]), bigJumpU(x) * k, bigJumpV(x, BIGJUMP_ALT) * k + bigJumpText.textSize * 0.36, bigJumpText);
  }
  bigJumpText.color = Color.WHITE;
}

/** Le perso (grossi), pieds au point du monde (x, y), tourné de spin degrés autour de son centre. */
function bigJumpDrawHero(canvas, x, y, spin, sx = 1, sy = 1) {
  const mid = 0.32 * BIGJUMP_HERO * k;
  canvas.save();
  canvas.translate(bigJumpU(x) * k, bigJumpV(x, y) * k);
  if (spin) { canvas.translate(0, -mid); canvas.rotate(spin); canvas.translate(0, mid); }
  canvas.scale(BIGJUMP_HERO * sx, BIGJUMP_HERO * sy);
  drawCharacter(canvas, 0, 0, 0, 1, 1, true, false, false);
  canvas.restore();
}

function bigJumpDraw(canvas) {
  const PC = Color.parseColor, cam = bigJumpCamera(), slow = bj.slow;
  const shx = bj.shake > 0 ? (rnd() - 0.5) * w * 0.03 * bj.shake : 0, shy = bj.shake > 0 ? (rnd() - 0.5) * w * 0.03 * bj.shake : 0;
  // Ciel de fin d'après-midi
  bigJumpPaint.color = Color.WHITE;
  bigJumpPaint.shader = new LinearGradient(0, 0, 0, h, PC('#4FA8EE'), PC('#FFE0B0'));
  canvas.drawRect(0, 0, w, h, bigJumpPaint);
  bigJumpPaint.shader = null;
  // Nuages en fond, en parallaxe (les plus lointains bougent moins), toujours à la même taille
  for (const c of bj.clouds) bigJumpDrawCloud(canvas, c.x - cam.u * cam.z * c.depth * 0.5, c.y - cam.v * cam.z * c.depth * 0.3, c.s, Math.round(120 + 100 * c.depth));
  // Monde : 1 unité = k pixels avant zoom (comme le jeu), ramené au zoom de la caméra
  canvas.save();
  canvas.translate(w / 2 + shx, h * 0.5 + shy); canvas.scale(cam.z / k, cam.z / k); canvas.translate(-cam.u * k, -cam.v * k);
  // Bloc de départ (matière choisie en boutique), grossi comme le perso
  canvas.save(); canvas.scale(BIGJUMP_HERO, BIGJUMP_HERO);
  drawTexturedBox(canvas, { half: 0.6, baseColor: PC('#9FB4C7') }, lookBlock, 1.3);
  canvas.restore();
  // Cible
  bigJumpDrawTarget(canvas);
  // Onde d'impact sur la cible
  if (bj.phase === 'land' && bj.landT < 0.7) {
    const f = bj.landT / 0.7;
    bigJumpStroke.color = Color.argb(Math.round(230 * (1 - f)), 255, 255, 255); bigJumpStroke.strokeWidth = k * 0.15 * (1 - f) + 2;
    bigJumpIsoOval(canvas, bigJumpU(bj.x) * k, bigJumpV(bj.x, BIGJUMP_ALT) * k, 0.3 + 3.5 * f, bigJumpStroke);
  }
  // Ondes de vent (vortex) : ellipses fines, perpendiculaires au trajet, qui s'ouvrent et s'effacent
  for (const r of bj.ripples) {
    const f = r.t / 0.9, a = Math.round(200 * (1 - f) * (0.35 + 0.65 * Math.max(slow, 0.3)));
    if (a <= 0) continue;
    canvas.save(); canvas.translate(bigJumpU(r.x) * k, bigJumpV(r.x, r.y) * k); canvas.rotate(r.a * 180 / Math.PI);
    bigJumpStroke.color = Color.argb(a, 220, 245, 255); bigJumpStroke.strokeWidth = k * 0.06;
    const ry = k * (0.35 + 1.1 * f), rxx = ry * 0.32;
    rect.set(-rxx, -ry, rxx, ry); canvas.drawOval(rect, bigJumpStroke);
    canvas.restore();
  }
  // Images rémanentes (silhouettes de la couleur du perso)
  bj.ghosts.forEach((g, i) => {
    const a = Math.round(25 + 18 * i), s = k * 0.25 * BIGJUMP_HERO;
    const c = playerLeft.color;
    bigJumpPaint.color = Color.argb(a, Color.red(c), Color.green(c), Color.blue(c));
    canvas.save(); canvas.translate(bigJumpU(g.x) * k, bigJumpV(g.x, g.y) * k - 0.32 * BIGJUMP_HERO * k); canvas.rotate(g.spin);
    rect.set(-s, -s, s, s); canvas.drawRoundRect(rect, s * 0.3, s * 0.3, bigJumpPaint);
    canvas.restore();
  });
  // Perso : écrasé pendant la charge, qui tourne pendant le saut
  const ratio = clamp(bj.charge / BIGJUMP_CHARGE, 0, 1);
  if (bj.phase === 'aim') bigJumpDrawHero(canvas, 0, 0, 0, 1 + 0.08 * ratio, 1 - 0.16 * ratio);
  else if (bj.phase === 'land') {
    const q = clamp(bj.landT / 0.35, 0, 1), sq = Math.sin(q * Math.PI) * 0.25 * (1 - q);
    bigJumpDrawHero(canvas, bj.x, bj.y, 0, 1 + sq, 1 - sq);
  } else if (bj.y > -40) bigJumpDrawHero(canvas, bj.x, bj.y, bj.spin);
  // Confettis
  for (const c of bj.confetti) {
    bigJumpPaint.color = c.c;
    canvas.save(); canvas.translate(c.x, c.y); canvas.rotate(c.r);
    rect.set(-k * 0.13, -k * 0.065, k * 0.13, k * 0.065); canvas.drawRect(rect, bigJumpPaint);
    canvas.restore();
  }
  canvas.restore();
  // Jauge de charge à taille fixe, au-dessus du perso (vue large : le perso est petit)
  if (bj.phase === 'aim' && bj.charging) {
    const gx = (bigJumpU(0) - cam.u) * cam.z + w / 2, gy = (bigJumpV(0, 1.5 * BIGJUMP_HERO) - cam.v) * cam.z + h * 0.5 - w * 0.05;
    drawChargeGauge(canvas, clamp(gx, w * 0.16, w * 0.84), gy, w * 0.22, w * 0.03, ratio, lookGauge, time);
  }

  // Ralenti : teinte froide, lignes de vitesse, bandes noires de cinéma
  if (slow > 0.01) {
    bigJumpPaint.color = Color.argb(Math.round(70 * slow), 10, 30, 80); canvas.drawRect(0, 0, w, h, bigJumpPaint);
    bigJumpStroke.strokeWidth = w * 0.004;
    for (let i = 0; i < 14; i++) {
      const y = h * ((i * 0.618 + 0.05) % 1), len = w * (0.15 + (i % 3) * 0.08);
      const x = w - ((time * w * (1.4 + (i % 4) * 0.3) + i * w * 0.37) % (w * 1.6));
      bigJumpStroke.color = Color.argb(Math.round(110 * slow), 255, 255, 255);
      canvas.drawLine(x, y, x + len, y, bigJumpStroke);
    }
    const bar = h * 0.09 * slow;
    bigJumpPaint.color = Color.BLACK;
    canvas.drawRect(0, 0, w, bar, bigJumpPaint); canvas.drawRect(0, h - bar, w, h, bigJumpPaint);
  }

  // Titres pendant la visée
  if (bj.phase === 'aim') {
    const ty = insetTop + h * 0.1;
    bigJumpText.color = PC('#FFD54F'); bigJumpText.textSize = w * 0.075;
    canvas.drawText('✨ ' + tr('bonus.rare') + ' ✨', w / 2, ty, bigJumpText);
    bigJumpText.color = Color.WHITE; bigJumpText.textSize = w * 0.085;
    canvas.drawText(BIG_JUMP.title, w / 2, ty + w * 0.1, bigJumpText);
    bigJumpText.textSize = w * 0.042;
    canvas.drawText(fitText(BIG_JUMP.hint, bigJumpText, w * 0.9), w / 2, ty + w * 0.17, bigJumpText);
    bigJumpText.textSize = w * 0.075;
    if (bonusT < bonusIntro) canvas.drawText(tr('bonus.ready'), w / 2, ub() - w * 0.12, bigJumpText);
  }
  // Résultat : gros « +12 » qui saute, « EN PLEIN CENTRE ! » pour le centre
  if (bj.phase === 'land') {
    const p = clamp(bj.landT / 0.35, 0, 1), sc = p < 1 ? 0.4 + 0.6 * p + 0.25 * Math.sin(p * Math.PI) : 1;
    bigJumpText.textSize = w * 0.2 * sc; bigJumpText.color = PC('#FFD54F');
    canvas.drawText('+' + bj.gain, w / 2, h * 0.3, bigJumpText);
    if (bj.gain === BIGJUMP_RINGS[0]) {
      bigJumpText.textSize = w * 0.07; bigJumpText.color = Color.WHITE;
      canvas.drawText(tr('bonus.bullseye'), w / 2, h * 0.3 + w * 0.12, bigJumpText);
    }
    bigJumpText.color = Color.WHITE;
  } else if (bj.phase === 'fall' || bj.phase === 'done') {
    bigJumpText.textSize = w * 0.085; bigJumpText.color = Color.WHITE;
    canvas.drawText(tr('bonus.miss'), w / 2, h * 0.3, bigJumpText);
  }
}
