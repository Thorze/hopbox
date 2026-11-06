'use strict';
// Imprévu « Ovni » (équivalent de Ufo.kt) : environ 1 partie sur 60. Une soucoupe aspire le joueur
// et l'emmène sur une planète à GRAVITÉ FAIBLE (sauts plus lents et plus hauts, même distance).
// 10 à 15 rochers, puis une piste d'atterrissage avec la méga pièce : la soucoupe le ramène au ciel.

const PL_ALIEN = 11, PL_PAD = 12, ALIEN_JUMP_TIME = 1.7, ALIEN_JUMP_HEIGHT = 1.9;
const UFO_COME = 1.0, UFO_SUCK = 2.4, UFO_TRAVEL = 3.2;
const ALIEN_COLORS = [0xFF8E6CC9, 0xFF5FB8A8, 0xFFB565A7, 0xFF6C7FD8];
const aln = { ufoAt: -1, active: false, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, ux: 0, uy: 0 };
const alnPaint = new Paint();
const alnStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const alnPath = new Path();
const alnOval = new RectF();

function inAlien() { return aln.active; }
function scheduleUfo(on) { aln.ufoAt = on ? time + 12 + rnd() * 23 : -1; }

function checkUfo() {
  if (aln.ufoAt < 0 || time < aln.ufoAt) return;
  if (state === State.GAME_OVER) { aln.ufoAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure()) { aln.ufoAt = time + 0.5; return; }
  aln.ufoAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  Object.assign(aln, { phase: 0, t: 0, veil: 0, fallVy: 0, ux: sx(px, pz), uy: sy(px, 0, pz) });
  charge = 0; perfectStreak = 0;
  state = State.UFO;
  sounds.play('UNLOCK', 0.4, 0.5);
  Stats.add('ufos');
}

function updateUfo(dt) {
  aln.t += dt;
  if (aln.phase === 0) {
    if (aln.t >= 0.3 && aln.t <= 1.2) { scareT = scareDuration; scareKind = 1; }
    const q = clamp((aln.t - 1.2) / (UFO_SUCK - 1.2), 0, 1);
    py = q * q * 5.5;
    aln.veil = clamp((aln.t - 1.9) / 0.5, 0, 1);
    if (aln.t >= UFO_SUCK) { aln.phase = 1; aln.t = 0; aln.veil = 1; }
  } else if (aln.phase === 1) {
    aln.veil = 1;
    if (aln.t >= UFO_TRAVEL) enterAlien();
  } else {
    aln.veil = Math.max(0, 1 - aln.t / 0.6);
    aln.fallVy += 7 * dt; py -= aln.fallVy * dt;
    if (py <= 0) {
      py = 0; aln.veil = 0; landSquash = 1;
      spawnDust(px, pz); sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('ufo.title'), life: 3.2 });
      popups.push({ text: tr('ufo.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2 });
      state = State.READY;
    }
  }
}

function enterAlien() {
  Object.assign(aln, { active: true, total: 10 + rndInt(6), spawned: 0, phase: 2, t: 0, fallVy: 0 });
  weather = 0; strikeAt = -1; crashAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1; bas.heliAt = -1;
  platforms = [];
  current = new Platform(0, 0, 0.8, false, ALIEN_COLORS[0], Kind.NORMAL, true, PL_ALIEN);
  platforms.push(current);
  px = 0; pz = 0; py = 6;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

function spawnAlien() {
  aln.spawned++;
  alongX = rnd() < 0.5;
  const final = aln.spawned >= aln.total;
  const half = final ? 0.8 : 0.5 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * (final ? 1.2 : 1.9);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, false,
    ALIEN_COLORS[rndInt(ALIEN_COLORS.length)], Kind.NORMAL, alongX, final ? PL_PAD : PL_ALIEN);
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('ufo.pad'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    next.coin = rnd() < 0.3 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function startUfoHome() {
  Object.assign(aln, { phase: 0, t: 0, fallVy: 0, veil: 0, ux: sx(px, pz), uy: sy(px, 0, pz) });
  pendingBounce = false; perfectStreak = 0;
  Stats.add('mega');
  banners.push({ text: tr('ufo.back'), life: 3 });
  sounds.play('UNLOCK');
  state = State.UFO_HOME;
}

function updateUfoHome(dt) {
  aln.t += dt;
  if (aln.phase === 0) {
    const q = clamp((aln.t - 1.0) / 1.3, 0, 1);
    py = q * q * 5.5;
    aln.veil = clamp((aln.t - 1.8) / 0.5, 0, 1);
    if (aln.t >= 2.4) leaveAlien();
  } else {
    aln.veil = Math.max(0, 1 - aln.t / 0.45);
    aln.fallVy += 30 * dt; py -= aln.fallVy * dt;
    if (py <= 0) { py = 0; aln.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leaveAlien() {
  Object.assign(aln, { active: false, phase: 1, t: 0, fallVy: 0 });
  platforms = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// ufoAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetAlien() { aln.active = false; aln.veil = 0; }
function alienFallReason() { return inAlien() ? tr('reason.alien') : null; }

// ---------- Dessin ----------

function drawUfo(canvas, x, y, s) {
  const p = alnPaint;
  p.shader = null;
  p.color = Color.argb(200, 150, 230, 240); alnOval.set(x - s * 0.55, y - s * 0.75, x + s * 0.55, y + s * 0.2); canvas.drawOval(alnOval, p);
  p.color = 0xFF7CDB6B; canvas.drawCircle(x, y - s * 0.32, s * 0.2, p);
  p.color = 0xFF1B1B1B;
  alnOval.set(x - s * 0.13, y - s * 0.38, x - s * 0.03, y - s * 0.28); canvas.drawOval(alnOval, p);
  alnOval.set(x + s * 0.03, y - s * 0.38, x + s * 0.13, y - s * 0.28); canvas.drawOval(alnOval, p);
  alnStroke.strokeWidth = s * 0.03; alnStroke.color = 0xFF7CDB6B;
  canvas.drawLine(x - s * 0.08, y - s * 0.5, x - s * 0.14, y - s * 0.66, alnStroke);
  canvas.drawLine(x + s * 0.08, y - s * 0.5, x + s * 0.14, y - s * 0.66, alnStroke);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, y - s * 0.15, 0, y + s * 0.3, 0xFFD9DEE6, 0xFF7C8594);
  alnOval.set(x - s * 1.25, y - s * 0.15, x + s * 1.25, y + s * 0.3); canvas.drawOval(alnOval, p);
  p.shader = null;
  p.color = 0xFF5E6675; alnOval.set(x - s * 0.6, y + s * 0.15, x + s * 0.6, y + s * 0.42); canvas.drawOval(alnOval, p);
  for (let i = 0; i < 7; i++) {
    p.color = (Math.floor(time * 6) + i) % 3 === 0 ? 0xFFFFEB3B : 0xFFE57373;
    canvas.drawCircle(x - s + i * s * 0.333, y + s * 0.08, s * 0.07, p);
  }
}

function drawBeam(canvas, x, topY, groundY, s, alpha) {
  const p = alnPaint, path = alnPath;
  path.reset(); path.moveTo(x - s * 0.45, topY); path.lineTo(x + s * 0.45, topY); path.lineTo(x + s * 1.2, groundY); path.lineTo(x - s * 1.2, groundY); path.close();
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, topY, 0, groundY, Color.argb(Math.round(170 * alpha), 200, 255, 160), Color.argb(Math.round(60 * alpha), 200, 255, 160));
  canvas.drawPath(path, p);
  p.shader = null;
  alnStroke.strokeWidth = s * 0.04;
  for (let i = 0; i < 4; i++) {
    const q = (time * 0.8 + i * 0.25) % 1, yy = groundY + (topY - groundY) * q, ww = s * (1.2 - 0.75 * q);
    alnStroke.color = Color.argb(Math.round(140 * alpha * (1 - q)), 230, 255, 200);
    alnOval.set(x - ww, yy - ww * 0.15, x + ww, yy + ww * 0.15); canvas.drawOval(alnOval, alnStroke);
  }
}

function drawAlienRock(canvas, pl) {
  drawTexturedBox(canvas, pl, 'granit');
  const a = pl.half, p = alnPaint, seed = Math.abs(Math.trunc(pl.cx * 11 + pl.cz * 5));
  for (let i = 0; i < 2; i++) {
    const u = i === 0 ? -0.4 : 0.35, v = i === 0 ? 0.3 : -0.35;
    const cx = isoX(u * a, v * a), cy = isoY(u * a, 0, v * a), r = k * a * (0.18 + 0.06 * ((seed + i) % 2));
    p.color = Color.argb(70, 0, 0, 0); alnOval.set(cx - r * 1.22, cy - r * 0.7, cx + r * 1.22, cy + r * 0.7); canvas.drawOval(alnOval, p);
  }
}

function drawPad(canvas, pl) {
  drawTexturedBox(canvas, { half: pl.half, baseColor: 0xFF4A4F5C }, 'metal');
  const a = pl.half;
  alnStroke.strokeWidth = k * 0.04;
  for (let i = 0; i < 3; i++) {
    const q = (time * 0.7 + i / 3) % 1, r = a * (0.3 + 0.6 * q);
    alnStroke.color = Color.argb(Math.round(220 * (1 - q)), 140, 255, 200);
    alnOval.set(-1.2247449 * k * r, -0.70710677 * k * r, 1.2247449 * k * r, 0.70710677 * k * r); canvas.drawOval(alnOval, alnStroke);
  }
}

function drawAlienBackdrop(canvas) {
  if (!inAlien()) return false;
  drawAlienScene(canvas, -camX, 1);
  return true;
}

function drawAlienScene(canvas, scrollX, alpha) {
  const p = alnPaint, a = Math.round(255 * alpha);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h * 0.65, Color.argb(a, 0x1B, 0x0B, 0x3A), Color.argb(a, 0xE0, 0x7A, 0xB4));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  for (const s of spc.stars) {
    const tw = 0.45 + 0.55 * Math.sin(time * (1.2 + s[3]) + s[2]);
    p.color = Color.argb(clamp(Math.round(200 * tw * alpha), 0, 255), 255, 255, 255);
    canvas.drawCircle(s[0] * w, s[1] * h * 0.55, w * (0.002 + 0.003 * s[3]), p);
  }
  const gx = w * 0.72 + scrollX * 0.01, gy = h * 0.2, gr = w * 0.16;
  p.color = Color.argb(a, 120, 210, 200); canvas.drawCircle(gx, gy, gr, p);
  p.color = Color.argb(Math.round(90 * alpha), 40, 120, 130); canvas.drawCircle(gx + gr * 0.25, gy + gr * 0.2, gr * 0.85, p);
  alnStroke.strokeWidth = w * 0.012; alnStroke.color = Color.argb(Math.round(190 * alpha), 255, 220, 170);
  canvas.save(); canvas.rotate(-15, gx, gy);
  alnOval.set(gx - gr * 1.7, gy - gr * 0.35, gx + gr * 1.7, gy + gr * 0.35); canvas.drawOval(alnOval, alnStroke);
  canvas.restore();
  p.color = Color.argb(a, 255, 200, 230); canvas.drawCircle(w * 0.18, h * 0.1, w * 0.045, p);
  p.color = Color.argb(a, 200, 230, 255); canvas.drawCircle(w * 0.3, h * 0.16, w * 0.025, p);
  for (let i = 0; i < 4; i++) {
    const fxp = ((i * 0.27 + time * 0.01) % 1.2) * w - w * 0.1, fyp = h * (0.3 + 0.08 * i) + Math.sin(time * 0.8 + i) * h * 0.01;
    p.color = Color.argb(a, 110, 80, 140); alnOval.set(fxp - w * 0.03, fyp - w * 0.015, fxp + w * 0.03, fyp + w * 0.02); canvas.drawOval(alnOval, p);
  }
  const cols = [0xFF5B3F8C, 0xFF3E2A6B];
  for (let layer = 0; layer < 2; layer++) {
    const baseY = h * (0.55 + 0.12 * layer), c = cols[layer], C = Color.argb(a, Color.red(c), Color.green(c), Color.blue(c));
    const path = alnPath;
    path.reset(); path.moveTo(0, h); path.lineTo(-w * 0.3, baseY);
    let x = -w * 0.3 + (((scrollX * (0.03 + 0.04 * layer)) % (w * 0.3)) + w * 0.3) % (w * 0.3);
    while (x < w * 1.3) { path.quadTo(x + w * 0.15, baseY - h * (0.05 + 0.02 * layer), x + w * 0.3, baseY); x += w * 0.3; }
    path.lineTo(w * 1.3, h); path.close();
    p.color = C; canvas.drawPath(path, p);
    // Champignons de tailles et couleurs variées, chacun garde son aspect quand le décor défile
    const sp = w * 0.2, shift = scrollX * (0.03 + 0.04 * layer);
    for (let slot = Math.floor((-w * 0.15 - shift) / sp); slot * sp + shift < w * 1.15; slot++) {
      if (mushRand(slot, layer * 7 + 1) >= 0.8) continue;
      const x = slot * sp + shift + (mushRand(slot, layer * 7 + 2) - 0.5) * sp * 0.6;
      const sz = w * (0.025 + 0.045 * mushRand(slot, layer * 7 + 3)) * (1 + 0.3 * layer);
      const cap = MUSH_COLORS[Math.min(MUSH_COLORS.length - 1, Math.floor(mushRand(slot, layer * 7 + 4) * MUSH_COLORS.length))];
      const stemH = sz * (0.55 + 0.5 * mushRand(slot, layer * 7 + 5));
      drawMushroom(canvas, x, baseY + h * 0.01, sz, stemH, cap, alpha, slot);
    }
  }
}

function drawUfoOverlay(canvas) {
  const p = alnPaint, s = k * 0.95;
  if (aln.phase === 0 && (state === State.UFO || state === State.UFO_HOME)) {
    const t = aln.t, q = clamp(t / UFO_COME, 0, 1), e = q * q * (3 - 2 * q);
    const targetY = aln.uy - k * 3.6, uy = -h * 0.15 + (targetY + h * 0.15) * e + Math.sin(time * 2) * k * 0.05;
    if (t > UFO_COME) drawBeam(canvas, aln.ux, uy + s * 0.3, aln.uy + k * 0.2, s, clamp((t - UFO_COME) / 0.3, 0, 1));
    drawUfo(canvas, aln.ux, uy, s);
  }
  if (aln.veil <= 0.01) return;
  if (state === State.UFO) {
    if (aln.phase === 1) {
      const t = aln.t / UFO_TRAVEL;
      p.color = Color.WHITE;
      p.shader = new LinearGradient(0, 0, 0, h, 0xFF05030F, 0xFF2A1450);
      canvas.drawRect(0, 0, w, h, p);
      p.shader = null;
      spc.stars.slice(0, 50).forEach((st) => {
        const y = (st[1] * h + aln.t * h * (0.6 + st[3])) % h;
        alnStroke.strokeWidth = w * 0.003; alnStroke.color = Color.argb(clamp(Math.round(200 * st[3] + 55), 0, 255), 255, 255, 255);
        canvas.drawLine(st[0] * w, y, st[0] * w, y + h * 0.03 * (1 + st[3]), alnStroke);
      });
      const pr = w * (0.08 + 0.9 * t * t);
      p.color = 0xFF8E6CC9; canvas.drawCircle(w * 0.5, h * 1.05, pr, p);
      p.color = Color.argb(120, 224, 122, 180); canvas.drawCircle(w * 0.5, h * 1.05, pr * 1.04, p);
      const ux = w * 0.5 + Math.sin(aln.t * 3) * w * 0.05, uy = h * 0.35;
      drawUfo(canvas, ux, uy, k * 1.4);
      drawBubble(canvas, ux, uy - k * 1.4, tr(aln.t < 1.6 ? 'ufo.help' : 'ufo.wow'));
    } else drawAlienScene(canvas, 0, aln.veil);
  } else if (state === State.UFO_HOME) {
    const sky = Theme.sky(score), a = Math.round(255 * aln.veil);
    p.color = Color.WHITE;
    p.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, Color.red(sky.top), Color.green(sky.top), Color.blue(sky.top)), Color.argb(a, Color.red(sky.bottom), Color.green(sky.bottom), Color.blue(sky.bottom)));
    canvas.drawRect(0, 0, w, h, p);
    p.shader = null;
    if (aln.phase === 0) {
      const cx = w / 2, cy = h * 0.5;
      drawUfo(canvas, cx, h * 0.18, k * 1.2);
      drawBeam(canvas, cx, h * 0.18 + k * 0.4, h * 0.8, k * 1.2, aln.veil);
      canvas.save(); canvas.rotate((aln.t * 120) % 360, cx, cy - k * 0.5); canvas.scale(1.5, 1.5, cx, cy - k * 0.5);
      drawCharacter(canvas, cx, cy, 0, 1, 1, true, false, true);
      canvas.restore();
      if (aln.t > 2.0) drawBubble(canvas, cx, cy - k * 1.9, tr('ufo.bye'));
    }
  }
}

const MUSH_COLORS = [0xFFD65CB4, 0xFF4FC3F7, 0xFF9CCC65, 0xFFFFB74D, 0xFFB388FF, 0xFFFFEE58, 0xFFFF7A7A];

/** Nombre pseudo-aléatoire entre 0 et 1, toujours le même pour un emplacement donné. */
function mushRand(n, salt) { const v = Math.sin(n * 12.9898 + salt * 78.233) * 43758.547; return v - Math.floor(v); }

function drawMushroom(canvas, x, groundY, sz, stemH, cap, alpha, seed) {
  const p = alnPaint, a = Math.round(255 * alpha), glow = 0.6 + 0.4 * Math.sin(time * 2 + seed), top = groundY - stemH;
  const r = Color.red(cap), g = Color.green(cap), b = Color.blue(cap);
  p.color = Color.argb(a, 232, 222, 242); canvas.drawRect(x - sz * 0.17, top, x + sz * 0.17, groundY, p);
  p.color = Color.argb(Math.round(80 * alpha * glow), r, g, b); canvas.drawCircle(x, top, sz * 0.95, p);
  p.color = Color.argb(a, r, g, b); alnOval.set(x - sz * 0.62, top - sz * 0.5, x + sz * 0.62, top + sz * 0.12); canvas.drawArc(alnOval, 180, 180, true, p);
  p.color = Color.argb(Math.round(255 * glow * alpha), 255, 245, 250);
  canvas.drawCircle(x - sz * 0.25, top - sz * 0.22, sz * 0.08, p);
  canvas.drawCircle(x + sz * 0.2, top - sz * 0.28, sz * 0.07, p);
  canvas.drawCircle(x + sz * 0.02, top - sz * 0.12, sz * 0.06, p);
}
