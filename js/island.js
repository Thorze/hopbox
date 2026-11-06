'use strict';
// Imprévu « Cyclone » (équivalent d'Island.kt) : pendant une tornade, le cyclone emporte le joueur.
// Il tombe à travers les nuages, rebondit dessus, puis atterrit sur une île de piliers entourée
// de mer (bateaux, mouettes, bouée) ou de lave. Au bout de 15 à 20 sauts, un trampoline géant
// avec une méga pièce le renvoie dans les nuages.

const MEGA_COIN = 50;
const ISL_WATER = 1.15, ISL_PILLAR = 3.2, ISL_SUCK = 1.6, ISL_FALL = 3.2, ISL_DROP_H = 13;
const isl = {
  cycloneAt: -1, kind: 0, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, bounced: 0,
  skyT: 0, skyPhase: 0, veil: 0, funnelX: -1,
  gulls: Array.from({ length: 4 }, () => [Math.random(), 0.08 + Math.random() * 0.18, Math.random() * 6, 0.6 + Math.random() * 0.6]),
  clouds: Array.from({ length: 9 }, () => [Math.random(), Math.random(), 0.5 + Math.random() * 0.8]),
};
const islPaint = new Paint();
const islStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const islPath = new Path();
const islOval = new RectF();

function inIsland() { return isl.kind > 0; }

function scheduleCyclone() { isl.cycloneAt = time + 7 + Math.random() * 8; }

function checkCyclone() {
  if (isl.cycloneAt < 0 || time < isl.cycloneAt || weather !== 3 || inAdventure()) return;
  if ((state !== State.READY && state !== State.CHARGING) || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy()) {
    isl.cycloneAt = state === State.GAME_OVER ? -1 : time + 0.5;
    return;
  }
  isl.cycloneAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  charge = 0; isl.phase = 0; isl.t = 0; isl.funnelX = -1; isl.bounced = 0; perfectStreak = 0;
  scareT = scareDuration; scareKind = 1;
  sounds.play('SCARE');
  sounds.play('TORNADO', 0.9);
  vibrate(200);
  shake(0.05);
  state = State.CYCLONE;
  Stats.add('cyclones');
}

function updateCyclone(dt) {
  isl.t += dt;
  if (isl.phase === 0) {
    const lift = clamp((isl.t - 0.55) / (ISL_SUCK - 0.55), 0, 1);
    py = lift * lift * 6;
    if (isl.t < 0.6) scareT = scareDuration;
    if (isl.t >= ISL_SUCK) { isl.phase = 1; isl.t = 0; sounds.play('FALL'); }
  } else if (isl.phase === 1) {
    isl.veil = 1;
    if (isl.bounced < 2 && isl.t > 1.0 + isl.bounced * 1.0) {
      isl.bounced++;
      sounds.play('JUMP', 0.9, 0.7 + 0.15 * isl.bounced);
      vibrate(15);
    }
    if (isl.t >= ISL_FALL) enterIsland();
  } else {
    isl.veil = Math.max(0, 1 - isl.t / 0.45);
    isl.fallVy += 32 * dt;
    py -= isl.fallVy * dt;
    if (py <= 0) {
      py = 0; isl.veil = 0; landSquash = 1;
      spawnDust(px, pz); shake(0.1);
      sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr(isl.kind === 1 ? 'island.sea' : 'island.lava'), life: 3.2 });
      popups.push({ text: tr('island.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.8 });
      state = State.READY;
    }
  }
}

function islandColor() {
  return isl.kind === 1 ? [0xFFB98A5E, 0xFFA97B52, 0xFFC49A6C][rndInt(3)] : [0xFF5B5450, 0xFF4D4744, 0xFF655C57][rndInt(3)];
}

function enterIsland() {
  isl.kind = rndInt(3) === 0 ? 2 : 1;
  isl.total = 15 + rndInt(6);
  isl.spawned = 0; isl.phase = 2; isl.t = 0; isl.fallVy = 0;
  weather = 0; strikeAt = -1;
  platforms = [];
  current = new Platform(0, 0, 0.8, false, islandColor(), Kind.NORMAL, true, isl.kind);
  platforms.push(current);
  px = 0; pz = 0; py = ISL_DROP_H;
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
}

function spawnIsland() {
  isl.spawned++;
  alongX = rnd() < 0.5;
  const final = isl.spawned >= isl.total;
  const half = final ? 1.0 : 0.55 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * 1.9;
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, false,
    final ? 0xFF3F8EFC : islandColor(), final ? Kind.TRAMPOLINE : Kind.NORMAL, alongX, isl.kind);
  if (final) { next.coin = MEGA_COIN; next.mega = true; }
  else {
    next.coin = rnd() < 0.22 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function startSkyward() {
  isl.skyT = 0; isl.skyPhase = 0; isl.fallVy = 0;
  current.bounce = 1; pendingBounce = false;
  banners.push({ text: tr('island.back'), life: 3 });
  sounds.play('JUMP', 1, 0.6);
  sounds.play('UNLOCK');
  vibrate(120);
  shake(0.08);
  state = State.SKYWARD;
  Stats.add('islands'); Stats.add('mega');
}

function updateSkyward(dt) {
  isl.skyT += dt;
  if (isl.skyPhase === 0) {
    py += (6 + isl.skyT * 30) * dt;
    isl.veil = clamp((isl.skyT - 0.55) / 0.3, 0, 1);
    if (isl.skyT >= 2.3) leaveIsland();
  } else {
    isl.veil = Math.max(0, 1 - isl.skyT / 0.45);
    isl.fallVy += 30 * dt;
    py -= isl.fallVy * dt;
    if (py <= 0) {
      py = 0; isl.veil = 0; landSquash = 1;
      spawnDust(px, pz);
      sounds.play('LAND');
      state = State.READY;
    }
  }
}

function leaveIsland() {
  isl.kind = 0; isl.skyPhase = 1; isl.skyT = 0; isl.fallVy = 0;
  platforms = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  px = 0; pz = 0; py = 7;
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
}

// cycloneAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetIsland() { isl.kind = 0; isl.veil = 0; isl.funnelX = -1; }

function islandFallReason() { return isl.kind === 1 ? tr('reason.sea') : isl.kind === 2 ? tr('reason.lava') : null; }

// ---------- Dessin ----------
function islHorizon() { return h * 0.3; }
function liquidAt(y) {
  const q = clamp((y - islHorizon()) / (h - islHorizon()), 0, 1);
  return isl.kind === 1 ? Theme.lerp(0xFF63C3E8, 0xFF1B6EA6, q) : Theme.lerp(0xFFFFA43A, 0xFFB52A0C, q);
}

function drawIslandBackdrop(canvas) {
  if (!inIsland()) return false;
  if (isl.kind === 1) drawSeaBackdrop(canvas); else drawLavaBackdrop(canvas);
  return true;
}

function islGlow(canvas, x, y, r, a, cr, cg, cb) {
  for (let i = 5; i >= 1; i--) {
    islPaint.color = Color.argb(Math.round(a / 5), cr, cg, cb);
    canvas.drawCircle(x, y, r * i / 5, islPaint);
  }
}

function drawSeaBackdrop(canvas) {
  const p = islPaint, hy = islHorizon(), par = -camX * 0.04;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, hy, 0xFF6EC1F0, 0xFFDDF3FF);
  canvas.drawRect(0, 0, w, hy + 2, p);
  p.shader = null;
  islGlow(canvas, w * 0.78, h * 0.1, w * 0.18, 150, 255, 246, 200);
  p.color = 0xFFFFE07A; canvas.drawCircle(w * 0.78, h * 0.1, w * 0.06, p);
  for (let i = 0; i < 3; i++) {
    const x = ((i * 0.37 + time * 0.006) % 1.3) * w * 1.1 - w * 0.15, y = h * (0.06 + i * 0.06);
    p.color = Color.argb(200, 255, 255, 255);
    for (const [dx, dy, r] of [[0, 0, 0.05], [0.05, -0.015, 0.04], [-0.05, 0.005, 0.035]]) {
      islOval.set(x + (dx - r) * w, y + dy * w - r * w * 0.6, x + (dx + r) * w, y + dy * w + r * w * 0.6);
      canvas.drawOval(islOval, p);
    }
  }
  p.color = 0xFF7DA9B8;
  islOval.set(w * 0.04 + par, hy - h * 0.025, w * 0.34 + par, hy + h * 0.02); canvas.drawOval(islOval, p);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, hy, 0, h, 0xFF63C3E8, 0xFF1B6EA6);
  canvas.drawRect(0, hy, w, h, p);
  p.shader = null;
  drawCargo(canvas, ((0.15 + time * 0.004) % 1.3) * w - w * 0.1 + par, hy);
  drawSailboat(canvas, w * 1.15 - ((time * 0.018 + 0.4) % 1.4) * w + par, hy + h * 0.06);
  const st = islStroke;
  for (let row = 0; row < 14; row++) {
    const q = row / 13, y = hy + (h - hy) * (q * q * 0.95 + 0.02);
    const amp = w * (0.004 + 0.012 * q), len = w * (0.03 + 0.07 * q);
    st.strokeWidth = w * (0.002 + 0.004 * q);
    st.color = Color.argb(Math.round(70 + 90 * q), 255, 255, 255);
    islPath.reset();
    const shift = (time * w * (0.02 + 0.04 * q) * (row % 2 === 0 ? 1 : -0.7) + row * 37) % (len * 2);
    let x = -len * 2 + shift + par * q;
    while (x < w + len) {
      const yy = y + Math.sin(time * 2.2 + row + x * 0.02) * amp * 0.5;
      islPath.moveTo(x, yy); islPath.quadTo(x + len * 0.25, yy - amp, x + len * 0.5, yy);
      x += len * (1.6 + ((row * 7 + Math.floor(x / len)) % 3 + 3) % 3 * 0.4);
    }
    canvas.drawPath(islPath, st);
  }
  for (let i = 0; i < 10; i++) {
    const tw = Math.abs(Math.sin(time * 2 + i * 1.7));
    p.color = Color.argb(Math.round(180 * tw), 255, 255, 230);
    const x = w * (0.62 + 0.3 * ((i * 0.618) % 1)), y = hy + h * (0.02 + 0.12 * ((i * 0.382) % 1));
    canvas.drawRect(x, y, x + w * 0.02 * tw, y + w * 0.004, p);
  }
  drawBuoy(canvas, w * 0.82 + par * 2, h * 0.48);
  drawGulls(canvas);
}

function drawCargo(canvas, x, hy) {
  const p = islPaint, s = w * 0.11;
  for (let i = 0; i < 5; i++) {
    const q = (time * 0.25 + i * 0.2) % 1;
    p.color = Color.argb(Math.round(90 * (1 - q)), 230, 230, 235);
    canvas.drawCircle(x + s * 0.25 - q * s * 0.6, hy - s * 0.42 - q * s * 0.5, s * (0.06 + q * 0.1), p);
  }
  p.color = 0xFF5B6B7A; canvas.drawRect(x + s * 0.18, hy - s * 0.42, x + s * 0.3, hy - s * 0.22, p);
  p.color = 0xFFF2F2F2; canvas.drawRect(x + s * 0.05, hy - s * 0.24, x + s * 0.4, hy - s * 0.1, p);
  const cols = [0xFFE53950, 0xFF3F8EFC, 0xFFFFC93C, 0xFF3DBE6E];
  for (let i = 0; i < 4; i++) {
    p.color = cols[i];
    canvas.drawRect(x - s * 0.5 + i * s * 0.13, hy - s * 0.2, x - s * 0.39 + i * s * 0.13, hy - s * 0.1, p);
  }
  islPath.reset();
  islPath.moveTo(x - s * 0.62, hy - s * 0.1); islPath.lineTo(x + s * 0.55, hy - s * 0.1);
  islPath.lineTo(x + s * 0.45, hy + s * 0.02); islPath.lineTo(x - s * 0.55, hy + s * 0.02); islPath.close();
  p.color = 0xFF8E2B2B; canvas.drawPath(islPath, p);
}

function drawSailboat(canvas, x, y0) {
  const p = islPaint, s = w * 0.07, y = y0 + Math.sin(time * 1.6) * s * 0.06;
  canvas.save();
  canvas.rotate(Math.sin(time * 1.3) * 4, x, y);
  islPath.reset();
  islPath.moveTo(x - s * 0.6, y - s * 0.08); islPath.lineTo(x + s * 0.6, y - s * 0.08);
  islPath.lineTo(x + s * 0.42, y + s * 0.12); islPath.lineTo(x - s * 0.45, y + s * 0.12); islPath.close();
  p.color = 0xFF6D4C41; canvas.drawPath(islPath, p);
  p.color = 0xFF4E342E; canvas.drawRect(x - s * 0.02, y - s * 1.1, x + s * 0.02, y - s * 0.08, p);
  islPath.reset();
  islPath.moveTo(x + s * 0.04, y - s * 1.05); islPath.lineTo(x + s * 0.5, y - s * 0.16); islPath.lineTo(x + s * 0.04, y - s * 0.16); islPath.close();
  p.color = Color.WHITE; canvas.drawPath(islPath, p);
  islPath.reset();
  islPath.moveTo(x - s * 0.04, y - s * 0.9); islPath.lineTo(x - s * 0.04, y - s * 0.2); islPath.lineTo(x - s * 0.4, y - s * 0.2); islPath.close();
  p.color = 0xFFE53950; canvas.drawPath(islPath, p);
  canvas.restore();
  islStroke.strokeWidth = w * 0.003; islStroke.color = Color.argb(120, 255, 255, 255);
  canvas.drawLine(x + s * 0.5, y + s * 0.1, x + s * 1.4, y + s * 0.18, islStroke);
}

function drawBuoy(canvas, x, y0) {
  const p = islPaint, r = w * 0.05, y = y0 + Math.sin(time * 1.8) * r * 0.35;
  canvas.save();
  canvas.rotate(Math.sin(time * 1.8 + 0.8) * 12, x, y);
  p.color = Color.argb(70, 255, 255, 255);
  islOval.set(x - r * 1.7, y + r * 0.35, x + r * 1.7, y + r * 0.85); canvas.drawOval(islOval, p);
  p.color = 0xFFE53950; islOval.set(x - r, y - r * 0.55, x + r, y + r * 0.55); canvas.drawOval(islOval, p);
  p.color = Color.WHITE;
  canvas.drawRect(x - r * 0.62, y - r * 0.5, x - r * 0.3, y + r * 0.5, p);
  canvas.drawRect(x + r * 0.3, y - r * 0.5, x + r * 0.62, y + r * 0.5, p);
  p.color = 0xFF1B6EA6; islOval.set(x - r * 0.45, y - r * 0.22, x + r * 0.45, y + r * 0.08); canvas.drawOval(islOval, p);
  p.color = 0xFF37474F; canvas.drawRect(x - r * 0.05, y - r * 1.6, x + r * 0.05, y - r * 0.3, p);
  p.color = 0xFFFFC93C;
  islPath.reset();
  islPath.moveTo(x + r * 0.05, y - r * 1.6); islPath.lineTo(x + r * 0.6, y - r * 1.4 + Math.sin(time * 6) * r * 0.08);
  islPath.lineTo(x + r * 0.05, y - r * 1.2); islPath.close();
  canvas.drawPath(islPath, p);
  canvas.restore();
}

function drawGulls(canvas) {
  const st = islStroke;
  st.color = 0xFF37474F;
  for (const g of isl.gulls) {
    const x = (((g[0] + time * 0.03 * g[3]) % 1.2) - 0.1) * w;
    const y = g[1] * h + Math.sin(time * 0.7 + g[2]) * h * 0.01;
    const s = w * 0.04 * g[3], flap = Math.sin(time * 6 * g[3] + g[2]) * s * 0.35;
    st.strokeWidth = w * 0.006;
    islPath.reset();
    islPath.moveTo(x - s, y - flap * 0.5);
    islPath.quadTo(x - s * 0.5, y - s * 0.45 - flap, x, y);
    islPath.quadTo(x + s * 0.5, y - s * 0.45 - flap, x + s, y - flap * 0.5);
    canvas.drawPath(islPath, st);
  }
}

function drawLavaBackdrop(canvas) {
  const p = islPaint, hy = islHorizon(), par = -camX * 0.04;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, hy, 0xFF1E0A10, 0xFF9A3416);
  canvas.drawRect(0, 0, w, hy + 2, p);
  p.shader = null;
  const vx = w * 0.3 + par;
  for (let i = 0; i < 6; i++) {
    const q = (time * 0.12 + i / 6) % 1;
    p.color = Color.argb(Math.round(110 * (1 - q)), 70, 52, 56);
    canvas.drawCircle(vx + q * w * 0.12 + Math.sin(q * 6 + i) * w * 0.02, hy - h * 0.16 - q * h * 0.14, w * (0.04 + q * 0.07), p);
  }
  islPath.reset();
  islPath.moveTo(vx - w * 0.32, hy + 2); islPath.lineTo(vx - w * 0.06, hy - h * 0.15);
  islPath.lineTo(vx + w * 0.06, hy - h * 0.15); islPath.lineTo(vx + w * 0.34, hy + 2); islPath.close();
  p.color = 0xFF2A1416; canvas.drawPath(islPath, p);
  islGlow(canvas, vx, hy - h * 0.15, w * 0.12, 190, 255, 140, 40);
  islStroke.strokeWidth = w * 0.008; islStroke.color = 0xFFFF7A1F;
  islPath.reset();
  islPath.moveTo(vx + w * 0.02, hy - h * 0.15); islPath.quadTo(vx + w * 0.06, hy - h * 0.08, vx + w * 0.04, hy);
  canvas.drawPath(islPath, islStroke);
  for (let i = 0; i < 8; i++) {
    const q = (time * 0.6 + i * 0.13) % 1, dir = (i % 2 * 2 - 1) * (0.3 + (i % 4) * 0.15);
    p.color = Color.argb(Math.round(230 * (1 - q)), 255, 170, 60);
    canvas.drawCircle(vx + dir * q * w * 0.1, hy - h * 0.15 - Math.sin(q * Math.PI) * h * 0.08, w * 0.006, p);
  }
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, hy, 0, h, 0xFFFFA43A, 0xFFB52A0C);
  canvas.drawRect(0, hy, w, h, p);
  p.shader = null;
  for (let i = 0; i < 16; i++) {
    const q = (i * 0.618) % 1, row = (i * 0.37) % 1;
    const y = hy + (h - hy) * (row * row * 0.9 + 0.05), sz = w * (0.03 + 0.07 * row);
    const x = ((q * 1.4 + time * 0.008 * (0.5 + row)) % 1.4) * w - w * 0.2 + par * row;
    p.color = Color.argb(Math.round(120 + 60 * row), 90, 26, 12);
    islOval.set(x - sz, y - sz * 0.25, x + sz, y + sz * 0.25); canvas.drawOval(islOval, p);
    islStroke.strokeWidth = w * 0.003; islStroke.color = Color.argb(150, 255, 210, 90);
    canvas.drawArc(islOval, 190, 120, false, islStroke);
  }
  for (let i = 0; i < 9; i++) {
    const period = 1.6 + (i % 4) * 0.5, q = ((time + i * 0.71) % period) / period;
    const bx = w * ((i * 0.43 + 0.1) % 1), by = hy + (h - hy) * (0.1 + ((i * 0.29) % 0.85));
    const r = w * 0.018 * (0.5 + (i % 3) * 0.3);
    if (q < 0.8) { p.color = 0xFFFFC54A; islOval.set(bx - r * q, by - r * q * 0.8, bx + r * q, by); canvas.drawOval(islOval, p); }
    else {
      const s = (q - 0.8) / 0.2;
      p.color = Color.argb(Math.round(220 * (1 - s)), 255, 200, 80);
      for (let j = 0; j < 4; j++) {
        const a = j * 1.57 + 0.6;
        canvas.drawCircle(bx + Math.cos(a) * r * (0.6 + s), by - r * 0.4 - Math.sin(s * 3) * r * 0.8, w * 0.004, p);
      }
    }
  }
  for (let i = 0; i < 22; i++) {
    const q = (time * 0.15 * (0.6 + (i % 5) * 0.12) + i * 0.13) % 1;
    p.color = Color.argb(Math.round(200 * (1 - q)), 255, 150 + (i % 3) * 30, 50);
    canvas.drawCircle(w * ((i * 0.618) % 1) + Math.sin(time + i) * w * 0.02, h - q * h * 0.95, w * (0.003 + (i % 3) * 0.0015), p);
  }
}

/** Pilier de l'île : bloc texturé qui plonge dans l'eau (ou la lave). Le canvas est placé sur la plateforme. */
function drawIslandPillar(canvas, pl, screenY) {
  drawTexturedBox(canvas, pl, pl.mega ? 'lisse' : pl.island === 1 ? 'bois' : 'granit', ISL_PILLAR);
  const a = pl.half, lX = -2 * a * 0.8660254 * k, rX = -lX, fY = a * k;
  const wl = ISL_WATER * k + Math.sin(time * 2 + pl.cx) * k * 0.03, d = ISL_PILLAR * k + 2;
  islPath.reset();
  islPath.moveTo(lX, wl); islPath.lineTo(0, fY + wl); islPath.lineTo(rX, wl);
  islPath.lineTo(rX, d); islPath.lineTo(0, fY + d); islPath.lineTo(lX, d); islPath.close();
  const c1 = liquidAt(screenY + wl), c2 = liquidAt(screenY + fY + d);
  islPaint.color = Color.WHITE;
  islPaint.shader = new LinearGradient(0, wl, 0, fY + d,
    Color.argb(pl.island === 1 ? 150 : 215, Color.red(c1), Color.green(c1), Color.blue(c1)),
    Color.argb(255, Color.red(c2), Color.green(c2), Color.blue(c2)));
  canvas.drawPath(islPath, islPaint);
  islPaint.shader = null;
  const st = islStroke;
  st.strokeWidth = k * 0.05;
  st.color = pl.island === 1 ? Color.argb(220, 255, 255, 255) : Color.argb(230, 255, 214, 90);
  islPath.reset();
  islPath.moveTo(lX - k * 0.05, wl); islPath.lineTo(0, fY + wl + k * 0.03); islPath.lineTo(rX + k * 0.05, wl);
  canvas.drawPath(islPath, st);
  const q = (time * 0.6 + pl.cx * 0.3) % 1, rr = 1 + q * 0.7;
  st.strokeWidth = k * 0.025;
  st.color = pl.island === 1 ? Color.argb(Math.round(140 * (1 - q)), 255, 255, 255) : Color.argb(Math.round(160 * (1 - q)), 255, 190, 70);
  islOval.set(lX * rr, wl + fY * 0.5 - fY * 0.75 * rr, rX * rr, wl + fY * 0.5 + fY * 0.75 * rr);
  canvas.drawArc(islOval, 15, 150, false, st);
}

function drawMegaHint(canvas, pl) {
  const hgt = k * (1.25 + Math.sin(time * 3) * 0.08);
  textPaint.textSize = k * 0.5;
  canvas.drawText('⬆', 0, -hgt - k * pl.half * 0.9, textPaint);
}

function drawIslPuff(canvas, x, y, s, alpha) {
  islPaint.color = Color.argb(clamp(Math.round(alpha), 0, 255), 255, 255, 255);
  for (const [dx, dy, r] of [[0, 0, 1], [-0.7, 0.2, 0.7], [0.75, 0.15, 0.75], [0.3, -0.35, 0.65], [-0.35, -0.25, 0.6]]) {
    canvas.drawCircle(x + dx * s, y + dy * s, r * s * 0.62, islPaint);
  }
}

function drawCycloneOverlay(canvas) {
  if (state === State.CYCLONE && isl.phase === 0) drawFunnel(canvas);
  if (isl.veil <= 0.01) return;
  const up = state === State.SKYWARD, p = islPaint, sky = Theme.sky(score), a = Math.round(255 * isl.veil);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h,
    Color.argb(a, Color.red(sky.top), Color.green(sky.top), Color.blue(sky.top)),
    Color.argb(a, Color.red(sky.bottom), Color.green(sky.bottom), Color.blue(sky.bottom)));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  if (!up && state === State.CYCLONE && isl.phase === 1 && isl.t < 0.4) {
    p.color = Color.argb(Math.round(235 * (1 - isl.t / 0.4)), 150, 156, 170);
    canvas.drawRect(0, 0, w, h, p);
  }
  const t = up ? isl.skyT : isl.t, dir = up ? 1 : -1;
  islStroke.strokeWidth = w * 0.004;
  for (let i = 0; i < 18; i++) {
    const x = w * ((i * 0.618) % 1), len = h * 0.12;
    const y = ((((i * 0.37) * h + dir * t * h * 2.2) % (h + len)) + h + len) % (h + len) - len;
    islStroke.color = Color.argb(Math.round(110 * isl.veil), 255, 255, 255);
    canvas.drawLine(x, y, x, y + len, islStroke);
  }
  for (const c of isl.clouds) {
    const span = h * 1.4;
    const y = (((c[1] * span + dir * t * h * 1.3 * c[2]) % span) + span) % span - h * 0.2;
    drawIslPuff(canvas, c[0] * w, y, w * 0.12 * c[2], 200 * isl.veil);
  }
  const cx = w / 2;
  let cy = h * 0.48;
  if (!up && state === State.CYCLONE && isl.phase === 1) {
    for (let b = 0; b < 2; b++) {
      const tb = isl.t - (1.0 + b * 1.0);
      if (tb >= -0.6 && tb <= 0.5) drawIslPuff(canvas, cx + (b === 0 ? -1 : 1) * w * 0.05, h * 0.48 + k * 0.6 - tb * h * 0.6, w * 0.22, 240 * isl.veil);
      if (tb >= 0 && tb <= 0.45) cy -= Math.sin(tb / 0.45 * Math.PI) * h * 0.06;
    }
  }
  canvas.save();
  canvas.rotate((t * (up ? 200 : 330)) % 360, cx, cy - k * 0.5);
  canvas.scale(1.7, 1.7, cx, cy - k * 0.5);
  drawCharacter(canvas, cx, cy, 0, 1, 1, true, !up, true);
  canvas.restore();
  if (!up && state === State.CYCLONE && isl.phase === 1 && isl.t < 0.9) drawBubble(canvas, cx, cy - k * 1.9, tr('island.fall'));
  if (up && isl.skyPhase === 0 && isl.skyT > 0.8) drawBubble(canvas, cx, cy - k * 1.9, tr('island.yay'));
}

function drawFunnel(canvas) {
  const t = isl.t, tx = sx(px, pz), baseY = sy(px, 0, pz);
  if (isl.funnelX < 0) isl.funnelX = tx > w / 2 ? -w * 0.2 : w * 1.2;
  const arrive = clamp(t / 0.7, 0, 1), e = arrive * arrive * (3 - 2 * arrive);
  const cx = isl.funnelX + (tx - isl.funnelX) * e, alpha = Math.min(1, t / 0.3);
  const p = islPaint, st = islStroke, topY = -h * 0.05, N = 22;
  const half = (q) => w * (0.05 + 0.3 * q * q);
  const center = (q) => cx + Math.sin(time * 4 + q * 6) * w * 0.03 * q;
  const Y = (q) => baseY + k * 0.4 - (baseY + k * 0.4 - topY) * q;
  islPath.reset();
  for (let i = N; i >= 0; i--) { const q = i / N; const x = center(q) - half(q); if (i === N) islPath.moveTo(x, Y(q)); else islPath.lineTo(x, Y(q)); }
  for (let i = 0; i <= N; i++) { const q = i / N; islPath.lineTo(center(q) + half(q), Y(q)); }
  islPath.close();
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, topY, 0, baseY, Color.argb(Math.round(150 * alpha), 110, 116, 132), Color.argb(Math.round(95 * alpha), 140, 146, 160));
  canvas.drawPath(islPath, p);
  p.shader = null;
  for (let i = 0; i < 10; i++) {
    const q = (i / 10 + time * 0.5) % 1, hw = half(q);
    st.strokeWidth = w * 0.006;
    st.color = Color.argb(Math.max(0, Math.round(120 * alpha * Math.sin(q * Math.PI))), 230, 233, 240);
    islOval.set(center(q) - hw, Y(q) - hw * 0.16, center(q) + hw, Y(q) + hw * 0.16);
    canvas.drawArc(islOval, 0, 180, false, st);
  }
  for (let i = 0; i < 12; i++) {
    const ang = time * 7 + i * 0.52, r = w * (0.07 + (i % 4) * 0.025);
    const y = baseY - k * (0.3 + ((time * 0.8 + i * 0.17) % 1) * 2.5);
    p.color = Color.argb(Math.round(180 * alpha), 95, 82, 70);
    const x0 = cx + Math.cos(ang) * r;
    canvas.drawRect(x0, y + Math.sin(ang) * r * 0.25, x0 + w * 0.01, y + Math.sin(ang) * r * 0.25 + w * 0.01, p);
  }
  const grey = clamp((t - (ISL_SUCK - 0.45)) / 0.45, 0, 1);
  if (grey > 0) { p.color = Color.argb(Math.round(235 * grey), 150, 156, 170); canvas.drawRect(0, 0, w, h, p); }
}
