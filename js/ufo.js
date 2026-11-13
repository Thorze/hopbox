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
  sounds.play('UFO', 0.8);   // la soucoupe arrive et aspire le joueur avec son rayon
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
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1; bas.heliAt = -1;
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.8, false, ALIEN_COLORS[0], Kind.NORMAL, true, PL_ALIEN);
  platforms.push(current);
  current.riseT = RISE_TIME;
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
  trimPlatforms();
}

function startUfoHome() {
  Object.assign(aln, { phase: 0, t: 0, fallVy: 0, veil: 0, ux: sx(px, pz), uy: sy(px, 0, pz) });
  pendingBounce = false; perfectStreak = 0;
  Stats.add('mega');
  banners.push({ text: tr('ufo.back'), life: 3 });
  sounds.play('UNLOCK');
  sounds.play('UFO', 0.6);   // elle revient le chercher
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
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// ufoAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetAlien() { releaseStrips(alienStrips); aln.active = false; aln.veil = 0; }
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
  const p = alnPaint, st = alnStroke, path = alnPath, a = Math.round(255 * alpha);
  const A = (c, mul = 1) => Color.argb(clamp(Math.round(((c >>> 24) & 255) * alpha * mul), 0, 255), Color.red(c), Color.green(c), Color.blue(c));
  p.color = Color.WHITE; p.alpha = a;
  p.shader = new LinearGradient(0, 0, 0, h * 0.62, [0xFF140828, 0xFF4A1E6B, 0xFFE07AB4], [0, 0.55, 1]);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  [0x50FF6FB5, 0x4040C8E0, 0x38B07CFF].forEach((c, i) => {
    canvas.save();
    canvas.translate(w * (0.2 + 0.35 * i) + scrollX * 0.004, h * (0.12 + 0.09 * (i % 2)));
    canvas.scale(w * 0.32 / 100, w * 0.18 / 100);
    p.color = Color.WHITE; p.shader = new RadialGradient(0, 0, 100, [A(c), A(c & 0x00FFFFFF)]);
    canvas.drawCircle(0, 0, 100, p);
    canvas.restore();
  });
  p.shader = null;
  for (const s of spc.stars) {
    const tw = 0.45 + 0.55 * Math.sin(time * (1.2 + s[3]) + s[2]);
    p.color = Color.argb(clamp(Math.round(200 * tw * alpha), 0, 255), 255, 255, 255);
    canvas.drawCircle(s[0] * w, s[1] * h * 0.55, w * (0.002 + 0.003 * s[3]), p);
  }
  const gx = w * 0.72 + scrollX * 0.01, gy = h * 0.2, gr = w * 0.16;
  const ring = (front) => {
    canvas.save(); canvas.rotate(-15, gx, gy);
    const start = front ? 0 : 180;
    alnOval.set(gx - gr * 1.75, gy - gr * 0.38, gx + gr * 1.75, gy + gr * 0.38);
    st.strokeWidth = w * 0.018; st.color = Color.argb(Math.round(150 * alpha), 230, 190, 150); canvas.drawArc(alnOval, start, 180, false, st);
    alnOval.set(gx - gr * 1.5, gy - gr * 0.3, gx + gr * 1.5, gy + gr * 0.3);
    st.strokeWidth = w * 0.008; st.color = Color.argb(Math.round(200 * alpha), 255, 230, 190); canvas.drawArc(alnOval, start, 180, false, st);
    canvas.restore();
  };
  ring(false);
  canvas.save(); canvas.translate(gx, gy); canvas.scale(gr / 100, gr / 100);
  p.color = Color.WHITE; p.shader = new RadialGradient(-35, -35, 140, [A(0xFFB8F2E6), A(0xFF5CC6B8), A(0xFF22656E)], [0, 0.5, 1]);
  canvas.drawCircle(0, 0, 100, p);
  p.shader = null;
  path.reset(); path.addCircle(0, 0, 100); canvas.clipPath(path);
  for (let bnd = 0; bnd < 5; bnd++) { p.color = Color.argb(Math.round(40 * alpha), 20, 80, 90); alnOval.set(-120, -70 + bnd * 32, 120, -54 + bnd * 32); canvas.drawOval(alnOval, p); }
  canvas.restore();
  ring(true);
  [0xFFFFC8E6, 0xFFC8E6FF].forEach((mc, i) => {
    const mx = w * (0.18 + 0.12 * i), my = h * (0.1 + 0.06 * i), mr = w * (0.045 - 0.02 * i);
    canvas.save(); canvas.translate(mx, my); canvas.scale(mr / 100, mr / 100);
    p.color = Color.WHITE; p.shader = new RadialGradient(-30, -30, 150, [A(mc), A(shade(mc, 0.55))]);
    canvas.drawCircle(0, 0, 100, p);
    p.shader = null;
    p.color = Color.argb(Math.round(60 * alpha), 60, 30, 80);
    canvas.drawCircle(-25, 20, 22, p); canvas.drawCircle(30, -20, 14, p); canvas.drawCircle(15, 45, 10, p);
    canvas.restore();
  });
  for (let i = 0; i < 4; i++) {
    const fxp = ((i * 0.27 + time * 0.01) % 1.2) * w - w * 0.1, fyp = h * (0.3 + 0.08 * i) + Math.sin(time * 0.8 + i) * h * 0.01, rs = w * (0.03 + 0.012 * i);
    path.reset();
    path.moveTo(fxp - rs, fyp); path.lineTo(fxp - rs * 0.6, fyp - rs * 0.45); path.lineTo(fxp + rs * 0.5, fyp - rs * 0.5);
    path.lineTo(fxp + rs, fyp - rs * 0.05); path.lineTo(fxp + rs * 0.3, fyp + rs * 0.7); path.lineTo(fxp - rs * 0.4, fyp + rs * 0.55); path.close();
    p.color = A(0xFF5A3F7E); canvas.drawPath(path, p);
    path.reset();
    path.moveTo(fxp - rs, fyp); path.lineTo(fxp - rs * 0.6, fyp - rs * 0.45); path.lineTo(fxp + rs * 0.5, fyp - rs * 0.5); path.lineTo(fxp + rs, fyp - rs * 0.05); path.close();
    p.color = A(0xFF8C6BB5); canvas.drawPath(path, p);
    const gl = 0.6 + 0.4 * Math.sin(time * 2.5 + i);
    p.color = Color.argb(Math.round(90 * gl * alpha), 120, 255, 230); canvas.drawCircle(fxp + rs * 0.1, fyp - rs * 0.65, rs * 0.45, p);
    path.reset(); path.moveTo(fxp, fyp - rs * 0.45); path.lineTo(fxp + rs * 0.12, fyp - rs * 0.95); path.lineTo(fxp + rs * 0.25, fyp - rs * 0.45); path.close();
    p.color = A(0xFF9FFFE8); canvas.drawPath(path, p);
  }
  // Trois rangées de collines, cratères, champignons et plantes : chaque rangée est dessinée une fois et
  // recollée (layercache.js) ; seule la lueur des champignons est animée par-dessus.
  const cols = [0xFF6A4A9C, 0xFF4E3480, 0xFF35225E];
  const capOf = (slot, layer, k2) => MUSH_COLORS[Math.min(MUSH_COLORS.length - 1, Math.floor(mushRand(slot, layer * 7 + k2) * MUSH_COLORS.length))];
  for (let layer = 0; layer < 3; layer++) {
    const baseY = h * (0.54 + 0.1 * layer), c = cols[layer], shift = scrollX * (0.025 + 0.035 * layer);
    // Hauteur de la crête à l'abscisse « monde » xw (= position à l'écran − shift)
    const hill = (xw) => { const u = xw / w; return baseY - h * (0.035 + 0.01 * layer) * (1 + Math.sin(u * 5.1 + layer * 1.7)) - h * 0.012 * Math.sin(u * 13 + layer); };
    const top = baseY - h * 0.11 - w * (0.26 + 0.08 * layer), bottom = baseY + h * 0.12;
    p.color = Color.WHITE; p.shader = new LinearGradient(0, baseY - h * 0.08, 0, baseY + h * 0.25, A(shade(c, 1.25)), A(shade(c, 0.75)));
    canvas.drawRect(0, bottom - 1, w, h, p);
    p.shader = null;
    const sp = w * (0.16 - 0.02 * layer);
    drawStrip(canvas, alienStrips[layer], shift, top, bottom, a, 0.75, (cv, x0, x1) => {
      const cp = alnPaint, cpath = alnPath;
      cpath.reset(); cpath.moveTo(x0, bottom + 2);
      for (let i = 0; i <= 48; i++) { const xw = x0 + (x1 - x0) * i / 48; cpath.lineTo(xw, hill(xw)); }
      cpath.lineTo(x1, bottom + 2); cpath.close();
      cp.color = Color.WHITE; cp.shader = new LinearGradient(0, baseY - h * 0.08, 0, baseY + h * 0.25, shade(c, 1.25), shade(c, 0.75));
      cv.drawPath(cpath, cp);
      cp.shader = null;
      cpath.reset();
      for (let i = 0; i <= 48; i++) { const xw = x0 + (x1 - x0) * i / 48; if (i === 0) cpath.moveTo(xw, hill(xw)); else cpath.lineTo(xw, hill(xw)); }
      st.strokeWidth = w * 0.005; st.color = Color.argb(110, 255, 170, 230); cv.drawPath(cpath, st);
      if (layer >= 1) {
        const cs = w * 0.45;
        for (let n = Math.floor(x0 / cs) - 1; n <= Math.floor(x1 / cs) + 1; n++) {
          if (mushRand(n, 50 + layer) > 0.6) continue;
          const cx = n * cs + mushRand(n, 51 + layer) * cs * 0.5, cy = hill(cx) + h * (0.03 + 0.03 * mushRand(n, 52 + layer));
          const cr = w * (0.04 + 0.03 * mushRand(n, 53 + layer)) * (0.8 + 0.3 * layer);
          cp.color = shade(c, 0.62); alnOval.set(cx - cr, cy - cr * 0.3, cx + cr, cy + cr * 0.3); cv.drawOval(alnOval, cp);
          cp.color = shade(c, 1.2); alnOval.set(cx - cr * 0.95, cy + cr * 0.05, cx + cr * 0.95, cy + cr * 0.34); cv.drawOval(alnOval, cp);
          cp.color = shade(c, 0.62); alnOval.set(cx - cr * 0.85, cy - cr * 0.24, cx + cr * 0.85, cy + cr * 0.2); cv.drawOval(alnOval, cp);
        }
      }
      for (let slot = Math.floor((x0 - w * 0.15) / sp); slot <= Math.floor((x1 + w * 0.15) / sp); slot++) {
        const r1 = mushRand(slot, layer * 7 + 1), x = slot * sp + (mushRand(slot, layer * 7 + 2) - 0.5) * sp * 0.6, gy0 = hill(x) + h * 0.012;
        if (r1 < 0.62) {
          const sz = w * (0.03 + 0.05 * mushRand(slot, layer * 7 + 3)) * (1 + 0.35 * layer);
          drawMushroom(cv, x, gy0, sz, sz * (0.7 + 0.7 * mushRand(slot, layer * 7 + 5)), capOf(slot, layer, 4), 1, slot + layer * 31, false);
          if (mushRand(slot, layer * 7 + 6) < 0.4) drawMushroom(cv, x + sz * 0.85, gy0 + h * 0.004, sz * 0.45, sz * 0.4, capOf(slot, layer, 8), 1, slot + 99, false);
        } else if (r1 < 0.85) drawAlienPlant(cv, x, gy0, w * (0.05 + 0.04 * mushRand(slot, layer * 7 + 3)) * (1 + 0.35 * layer), 1, slot + layer * 17, false);
      }
    });
    // Lueur des champignons qui pulse doucement (en direct, très peu coûteuse)
    for (let slot = Math.floor((-shift - w * 0.15) / sp); slot <= Math.floor((-shift + w * 1.15) / sp); slot++) {
      if (mushRand(slot, layer * 7 + 1) >= 0.62) continue;
      const xw = slot * sp + (mushRand(slot, layer * 7 + 2) - 0.5) * sp * 0.6;
      const sz = w * (0.03 + 0.05 * mushRand(slot, layer * 7 + 3)) * (1 + 0.35 * layer), cap = capOf(slot, layer, 4);
      const stemH = sz * (0.7 + 0.7 * mushRand(slot, layer * 7 + 5)), seed = slot + layer * 31;
      const tx = xw + shift + (mushRand(seed, 90) - 0.5) * sz * 0.5, ty = hill(xw) + h * 0.012 - stemH - sz * 0.2;
      const glow = 0.5 + 0.5 * Math.sin(time * 2 + seed);
      p.color = Color.argb(Math.round(38 * glow * alpha), Color.red(cap), Color.green(cap), Color.blue(cap));
      canvas.drawCircle(tx, ty, sz * 1.1, p);
    }
  }
  for (let i = 0; i < 20; i++) {
    const q = (time * 0.05 * (0.6 + mushRand(i, 70)) + mushRand(i, 71)) % 1;
    const x = ((mushRand(i, 72) * w + Math.sin(time * 0.7 + i) * w * 0.03 + (scrollX * 0.05) % w) % w + w) % w, y = h * (1 - q * 0.6);
    p.color = Color.argb(clamp(Math.round(180 * (1 - q) * alpha * (0.5 + 0.5 * Math.sin(time * 4 + i))), 0, 255), 180, 255, 230);
    canvas.drawCircle(x, y, w * 0.004, p);
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

/** Champignon lumineux : halo doux, pied courbé avec son anneau, chapeau bombé en dégradé, lamelles, points qui brillent. */
function drawMushroom(canvas, x, groundY, sz, stemH, cap, alpha, seed, anim = true) {
  const p = alnPaint, st = alnStroke, path = alnPath;
  const A = (c, mul = 1) => Color.argb(clamp(Math.round(255 * alpha * mul), 0, 255), Color.red(c), Color.green(c), Color.blue(c));
  const glow = anim ? 0.6 + 0.4 * Math.sin(time * 2 + seed) : 0.8, sway = anim ? Math.sin(time * 1.1 + seed * 0.7) * 4 : 0, bend = (mushRand(seed, 90) - 0.5) * sz * 0.5;
  canvas.save(); canvas.rotate(sway, x, groundY);
  const top = groundY - stemH, tx = x + bend;
  canvas.save(); canvas.translate(tx, top - sz * 0.15); canvas.scale(sz * 1.5 / 100, sz * 1.5 / 100);
  p.color = Color.WHITE; p.shader = new RadialGradient(0, 0, 100, [A(cap, 0.45 * glow), A(cap, 0)]);
  canvas.drawCircle(0, 0, 100, p);
  canvas.restore();
  p.shader = null;
  p.color = Color.argb(Math.round(60 * alpha), 20, 10, 40); alnOval.set(x - sz * 0.35, groundY - sz * 0.06, x + sz * 0.35, groundY + sz * 0.06); canvas.drawOval(alnOval, p);
  path.reset();
  path.moveTo(x - sz * 0.16, groundY);
  path.cubicTo(x - sz * 0.14, groundY - stemH * 0.4, tx - sz * 0.12, top + stemH * 0.3, tx - sz * 0.09, top);
  path.lineTo(tx + sz * 0.09, top);
  path.cubicTo(tx + sz * 0.12, top + stemH * 0.3, x + sz * 0.14, groundY - stemH * 0.4, x + sz * 0.16, groundY);
  path.close();
  p.color = Color.WHITE; p.shader = new LinearGradient(x - sz * 0.16, 0, x + sz * 0.16, 0, A(0xFFF4ECFA), A(0xFFB9A6D0));
  canvas.drawPath(path, p);
  p.shader = null;
  const ry = top + stemH * 0.3;
  p.color = A(0xFFDCCDEB); alnOval.set(tx - sz * 0.17, ry - sz * 0.04, tx + sz * 0.17, ry + sz * 0.05); canvas.drawOval(alnOval, p);
  p.color = A(shade(cap, 0.55)); alnOval.set(tx - sz * 0.6, top - sz * 0.08, tx + sz * 0.6, top + sz * 0.1); canvas.drawOval(alnOval, p);
  st.strokeWidth = sz * 0.025; st.color = A(shade(cap, 0.4));
  for (let j = -3; j <= 3; j++) canvas.drawLine(tx, top + sz * 0.02, tx + j * sz * 0.16, top + sz * 0.02 + (j === 0 ? sz * 0.05 : sz * 0.03), st);
  path.reset();
  path.moveTo(tx - sz * 0.64, top);
  path.cubicTo(tx - sz * 0.62, top - sz * 0.62, tx + sz * 0.62, top - sz * 0.62, tx + sz * 0.64, top);
  path.quadTo(tx, top + sz * 0.08, tx - sz * 0.64, top);
  path.close();
  p.color = Color.WHITE; p.shader = new LinearGradient(0, top - sz * 0.5, 0, top, A(shade(cap, 1.25)), A(shade(cap, 0.8)));
  canvas.drawPath(path, p);
  p.shader = null;
  p.color = Color.argb(Math.round(110 * alpha), 255, 255, 255); alnOval.set(tx - sz * 0.42, top - sz * 0.42, tx - sz * 0.12, top - sz * 0.3); canvas.drawOval(alnOval, p);
  const n = 3 + Math.floor(mushRand(seed, 91) * 3);
  for (let j = 0; j < n; j++) {
    const ang = 3.4 + j * (2.6 / n) + mushRand(seed, 92 + j) * 0.3, rr = 0.3 + 0.25 * mushRand(seed, 100 + j);
    const dx = tx + Math.cos(ang) * sz * 0.5 * rr * 1.2, dy = top - sz * 0.08 + Math.sin(ang) * sz * 0.4 * rr * 1.2, ds = sz * (0.05 + 0.04 * mushRand(seed, 110 + j));
    p.color = Color.argb(Math.round(120 * glow * alpha), 255, 255, 255); canvas.drawCircle(dx, dy, ds * 1.6, p);
    p.color = Color.argb(Math.round(255 * alpha), 255, 250, 252); canvas.drawCircle(dx, dy, ds, p);
  }
  canvas.restore();
}

/** Plante extraterrestre : tiges courbées qui portent des bulbes lumineux. */
function drawAlienPlant(canvas, x, groundY, hgt, alpha, seed, anim = true) {
  const p = alnPaint, st = alnStroke, path = alnPath, glow = anim ? 0.55 + 0.45 * Math.sin(time * 2.4 + seed) : 0.8;
  const bulb = MUSH_COLORS[Math.min(MUSH_COLORS.length - 1, Math.floor(mushRand(seed, 120) * MUSH_COLORS.length))];
  for (let j = 0; j <= 2; j++) {
    const lean = (j - 1) * hgt * 0.35 + (anim ? Math.sin(time * 1.3 + seed + j) * hgt * 0.05 : 0);
    const hh = hgt * (0.7 + 0.3 * mushRand(seed, 121 + j)) * (j === 1 ? 1.2 : 0.9), ex = x + lean, ey = groundY - hh;
    path.reset(); path.moveTo(x + (j - 1) * hgt * 0.05, groundY); path.quadTo(x + lean * 0.2, groundY - hh * 0.6, ex, ey);
    st.strokeWidth = hgt * 0.06; st.color = Color.argb(Math.round(255 * alpha), 70, 170, 150); canvas.drawPath(path, st);
    p.color = Color.argb(Math.round(90 * glow * alpha), Color.red(bulb), Color.green(bulb), Color.blue(bulb)); canvas.drawCircle(ex, ey, hgt * 0.16, p);
    p.color = Color.argb(Math.round(255 * alpha), Color.red(bulb), Color.green(bulb), Color.blue(bulb)); canvas.drawCircle(ex, ey, hgt * 0.08, p);
    p.color = Color.argb(Math.round(220 * alpha), 255, 255, 255); canvas.drawCircle(ex - hgt * 0.025, ey - hgt * 0.025, hgt * 0.025, p);
  }
}
