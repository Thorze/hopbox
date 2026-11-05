'use strict';
// Imprévu « Hélicoptère » (équivalent de Heli.kt) : environ 1 partie sur 60. Une planche suspendue
// sous un hélicoptère se balance à la place de la plateforme suivante ; dessus, on est emmené
// au-dessus d'une base militaire. 10 à 15 toits, puis un baril de TNT avec la méga pièce :
// BOUM ! L'explosion renvoie le joueur dans le ciel habituel.

const PL_HELI = 8, PL_ROOF = 9, PL_TNT = 10;
const HELI_ARRIVE = 1.8, HELI_LIFT = 2.2, HELI_FLIGHT = 3.0;
const ROOF_COLORS = [0xFF7C8B5A, 0xFF8D8F86, 0xFF9A8B6A, 0xFF6F7F73];
const bas = { heliAt: -1, arriveT: -1, heli: null, active: false, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, boomX: 0, boomY: 0, exploded: false };
const basPaint = new Paint();
const basStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const basPath = new Path();
const basOval = new RectF();

function inBase() { return bas.active; }
function heliBusy() { return bas.arriveT >= 0 && bas.arriveT < HELI_ARRIVE; }
function scheduleHeli(on) { bas.heliAt = on ? time + 12 + rnd() * 23 : -1; }

function checkHeli(dt) {
  if (bas.arriveT >= 0 && bas.arriveT < HELI_ARRIVE) {
    bas.arriveT += dt;
    if (bas.arriveT >= HELI_ARRIVE) banners.push({ text: tr('heli.board'), life: 4 });
  }
  if (bas.heliAt < 0 || time < bas.heliAt) return;
  if (state === State.GAME_OVER) { bas.heliAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure() ||
      current.kind === Kind.TRAMPOLINE || current.crumbly) { bas.heliAt = time + 0.4; return; }
  bas.heliAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  // Assez loin pour que la planche, en se balançant (±0,8), ne passe jamais au-dessus du bloc actuel
  const d = alongX ? next.cx - current.cx : next.cz - current.cz;
  const shift = Math.max(0, current.half + 0.6 + 0.45 + 0.8 - d);
  const r = new Platform(next.cx + (alongX ? shift : 0), next.cz + (alongX ? 0 : shift), 0.6, false, 0xFFA97B52, Kind.MOVING, alongX, PL_HELI);
  const i = platforms.indexOf(next);
  if (i >= 0) platforms[i] = r; else platforms.push(r);
  next = r; bas.heli = r; bas.arriveT = 0;
  vibrate(15);
}

/**
 * Bruit en boucle du moment (coupé en pause, en fin de partie…) : rotor tant que l'hélicoptère est
 * à l'écran, cliquetis tant que la roue du bonus tourne librement.
 */
function updateLoopSound() {
  const heli = bas.heli !== null && (state === State.READY || state === State.CHARGING || state === State.JUMPING || state === State.HELI);
  const wheel = state === State.BONUS && bonusType && bonusType.id === 'wheel' && bonusResult === 0 && bonusT >= bonusIntro && !wheelStopping;
  sounds.setLoop(heli ? 'helico' : wheel ? 'roue_boucle' : null);
}

function heliOffset(pl) {
  if (state === State.HELI && bas.phase === 0) return -bas.fallVy;
  if (pl === current) return 0;
  const a = bas.arriveT < 0 ? 1 : clamp(bas.arriveT / HELI_ARRIVE, 0, 1);
  const e = 1 - (1 - a) * (1 - a) * (1 - a);
  return -(1 - e) * h;
}

function startHeli() {
  Object.assign(bas, { phase: 0, t: 0, fallVy: 0, veil: 0, arriveT: -1 });
  pendingBounce = false; perfectStreak = 0;
  vibrate(120);
  state = State.HELI;
  Stats.add('helis');
}

function updateHeli(dt) {
  bas.t += dt;
  if (bas.phase === 0) {
    const q = clamp((bas.t - 0.4) / (HELI_LIFT - 0.4), 0, 1);
    bas.fallVy = q * q * h * 1.2; py = bas.fallVy / k;
    bas.veil = clamp((bas.t - 1.5) / 0.6, 0, 1);
    if (bas.t >= HELI_LIFT) { bas.phase = 1; bas.t = 0; bas.veil = 1; }
  } else if (bas.phase === 1) {
    bas.veil = 1;
    if (bas.t >= HELI_FLIGHT) enterBase();
  } else {
    bas.veil = Math.max(0, 1 - bas.t / 0.5);
    bas.fallVy += 26 * dt; py -= bas.fallVy * dt;
    if (py <= 0) {
      py = 0; bas.veil = 0; landSquash = 1;
      spawnDust(px, pz); shake(0.06); sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('heli.title'), life: 3.2 });
      popups.push({ text: tr('heli.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.8 });
      state = State.READY;
    }
  }
}

function enterBase() {
  Object.assign(bas, { active: true, heli: null, exploded: false, total: 10 + rndInt(6), spawned: 0, phase: 2, t: 0, fallVy: 0 });
  weather = 0; strikeAt = -1; crashAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1;
  platforms = [];
  current = new Platform(0, 0, 0.8, false, ROOF_COLORS[0], Kind.NORMAL, true, PL_ROOF);
  platforms.push(current);
  px = 0; pz = 0; py = 6;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

function spawnBase() {
  bas.spawned++;
  alongX = rnd() < 0.5;
  const final = bas.spawned >= bas.total;
  const half = final ? 0.75 : 0.55 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * (final ? 1.2 : 1.9);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, false,
    ROOF_COLORS[rndInt(ROOF_COLORS.length)], Kind.NORMAL, alongX, final ? PL_TNT : PL_ROOF);
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('heli.tnt'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    next.coin = rnd() < 0.25 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function startBoom() {
  Object.assign(bas, { phase: 0, t: 0, fallVy: 0, veil: 0, exploded: true, boomX: sx(current.cx, current.cz) + camX, boomY: sy(current.cx, 0.4, current.cz) + camY });
  // La méga pièce a déjà été ramassée par l'atterrissage (collectCoin)
  perfectStreak = 0; pendingBounce = false;
  Stats.add('mega');
  for (const c of [0xFFFFC93C, 0xFFFF7A1F, 0xFFE53950]) spawnSparkles(bas.boomX, bas.boomY, c, 22);
  sounds.play('EXPLOSION');
  vibrate(200); shake(0.3);
  banners.push({ text: tr('heli.back'), life: 3 });
  state = State.BOOM;
}

function updateBoom(dt) {
  bas.t += dt;
  if (bas.phase === 0) {
    py += (9 + bas.t * 30) * dt;
    bas.veil = clamp((bas.t - 0.8) / 0.4, 0, 1);
    if (bas.t >= 2.2) leaveBase();
  } else {
    bas.veil = Math.max(0, 1 - bas.t / 0.45);
    bas.fallVy += 30 * dt; py -= bas.fallVy * dt;
    if (py <= 0) { py = 0; bas.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leaveBase() {
  Object.assign(bas, { active: false, phase: 1, t: 0, fallVy: 0 });
  platforms = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// heliAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetBase() { Object.assign(bas, { active: false, arriveT: -1, heli: null, veil: 0, exploded: false }); }
function baseFallReason() { return inBase() ? tr('reason.base') : null; }

// ---------- Dessin ----------

function drawHelicopter(canvas, x, y, s, tilt) {
  const p = basPaint, path = basPath, st = basStroke;
  p.shader = null;
  canvas.save(); canvas.rotate(tilt, x, y);
  p.color = 0xFF5B6B3A;
  path.reset(); path.moveTo(x - s * 0.5, y - s * 0.15); path.lineTo(x - s * 1.7, y - s * 0.32); path.lineTo(x - s * 1.7, y - s * 0.12); path.lineTo(x - s * 0.5, y + s * 0.15); path.close();
  canvas.drawPath(path, p);
  p.color = 0xFF4A5730;
  path.reset(); path.moveTo(x - s * 1.6, y - s * 0.3); path.lineTo(x - s * 1.85, y - s * 0.62); path.lineTo(x - s * 1.72, y - s * 0.22); path.close();
  canvas.drawPath(path, p);
  const trr = Math.abs(Math.sin(time * 40));
  st.strokeWidth = s * 0.06; st.color = Color.argb(170, 60, 60, 60);
  canvas.drawLine(x - s * 1.78, y - s * 0.22 - s * 0.28 * trr, x - s * 1.78, y - s * 0.22 + s * 0.28 * trr, st);
  st.strokeWidth = s * 0.07; st.color = 0xFF3A3F2A;
  canvas.drawLine(x - s * 0.7, y + s * 0.72, x + s * 0.75, y + s * 0.72, st);
  canvas.drawLine(x - s * 0.35, y + s * 0.45, x - s * 0.4, y + s * 0.72, st);
  canvas.drawLine(x + s * 0.4, y + s * 0.45, x + s * 0.45, y + s * 0.72, st);
  p.color = 0xFF6B7D3F; basOval.set(x - s * 0.8, y - s * 0.5, x + s * 0.85, y + s * 0.55); canvas.drawOval(basOval, p);
  p.color = 0xFF5B6B3A; basOval.set(x - s * 0.8, y + s * 0.05, x + s * 0.85, y + s * 0.55); canvas.drawArc(basOval, 0, 180, true, p);
  p.color = 0xFF9FD8F0; basOval.set(x + s * 0.1, y - s * 0.4, x + s * 0.8, y + s * 0.15); canvas.drawOval(basOval, p);
  p.color = Color.argb(150, 255, 255, 255); basOval.set(x + s * 0.2, y - s * 0.32, x + s * 0.42, y - s * 0.12); canvas.drawOval(basOval, p);
  textPaint.textSize = s * 0.42;
  const old = textPaint.color; textPaint.color = Color.WHITE;
  canvas.drawText('★', x - s * 0.3, y + s * 0.15, textPaint);
  textPaint.color = old;
  p.color = 0xFF3A3F2A; canvas.drawRect(x - s * 0.06, y - s * 0.72, x + s * 0.06, y - s * 0.48, p);
  p.color = Color.argb(60, 40, 40, 40); basOval.set(x - s * 1.9, y - s * 0.84, x + s * 1.9, y - s * 0.66); canvas.drawOval(basOval, p);
  const bx = Math.cos(time * 30) * s * 1.9;
  st.strokeWidth = s * 0.07; st.color = Color.argb(200, 40, 40, 40);
  canvas.drawLine(x - bx, y - s * 0.75, x + bx, y - s * 0.75, st);
  canvas.restore();
}

function drawHeliPlatform(canvas, pl) {
  const a = pl.half, hx = 2 * a * 0.8660254 * k, hy = 2 * a * 0.5 * k, top = -k * 3.0;
  basStroke.strokeWidth = k * 0.025; basStroke.color = 0xFF8A6B45;
  canvas.drawLine(-hx, 0, -k * 0.3, top + k * 0.6, basStroke);
  canvas.drawLine(hx, 0, k * 0.3, top + k * 0.6, basStroke);
  canvas.drawLine(0, hy, 0, top + k * 0.6, basStroke);
  drawTexturedBox(canvas, pl, 'bois', 0.22);
  drawHelicopter(canvas, 0, top, k * 0.75, Math.sin(time * 2) * 4);
  if (state !== State.HELI && pl !== current && !heliBusy()) {
    const bob = Math.abs(Math.sin(time * 4)) * k * 0.2;
    textPaint.textSize = k * 0.5;
    canvas.drawText('⬇', 0, -k * 0.6 - bob, textPaint);
  }
}

function drawRoof(canvas, pl) {
  const a = pl.half;
  drawTexturedBox(canvas, pl, 'lisse', 3.4);
  const cxk = 0.8660254 * k, syk = 0.5 * k, lX = -2 * a * cxk, rX = 2 * a * cxk, fY = 2 * a * syk;
  const p = basPaint, path = basPath, seed = Math.abs(Math.trunc(pl.cx * 7 + pl.cz * 13));
  for (let face = 0; face < 2; face++) {
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const u0 = 0.15 + col * 0.27, u1 = u0 + 0.16, v0 = k * (0.45 + row * 0.65), v1 = v0 + k * 0.35;
      const pt = (u, v) => face === 0 ? [lX * (1 - u), fY * u + v] : [rX * u, fY * (1 - u) + v];
      const [x0, y0] = pt(u0, v0), [x1, y1] = pt(u1, v0), [x2, y2] = pt(u1, v1), [x3, y3] = pt(u0, v1);
      path.reset(); path.moveTo(x0, y0); path.lineTo(x1, y1); path.lineTo(x2, y2); path.lineTo(x3, y3); path.close();
      p.color = (seed + row * 3 + col + face) % 4 === 0 ? 0xFFFFD166 : 0xFF3B4A5A;
      canvas.drawPath(path, p);
    }
  }
  if (pl.island === PL_TNT) { drawTnt(canvas); return; }
  const kind = seed % 3;
  if (kind === 0) {
    const s = k * 0.18;
    p.color = 0xFFB08850; canvas.drawRect(rX * 0.35 - s, -s * 1.4, rX * 0.35 + s, s * 0.2, p);
    basStroke.strokeWidth = k * 0.02; basStroke.color = 0xFF7A5A30;
    canvas.drawLine(rX * 0.35 - s, -s * 1.4, rX * 0.35 + s, s * 0.2, basStroke);
  } else if (kind === 1) {
    basStroke.strokeWidth = k * 0.03; basStroke.color = 0xFF5A5A5A;
    canvas.drawLine(lX * 0.4, -fY * 0.1, lX * 0.4, -k * 0.9, basStroke);
    p.color = Math.sin(time * 5) > 0 ? 0xFFE53950 : 0xFF7A2030; canvas.drawCircle(lX * 0.4, -k * 0.9, k * 0.05, p);
  } else {
    const cx = rX * 0.2, cy = -fY * 0.35;
    p.color = 0xFF9AA0A6; basOval.set(cx - k * 0.16, cy - k * 0.08, cx + k * 0.16, cy + k * 0.08); canvas.drawOval(basOval, p);
    p.color = 0xFF6E747A; canvas.drawRect(cx - k * 0.16, cy - k * 0.25, cx + k * 0.16, cy, p);
    p.color = 0xFFB0B6BC; basOval.set(cx - k * 0.16, cy - k * 0.33, cx + k * 0.16, cy - k * 0.17); canvas.drawOval(basOval, p);
  }
}

function drawTnt(canvas) {
  if (bas.exploded) return;
  const p = basPaint, r = k * 0.3, hgt = k * 0.55;
  p.color = 0xFFB71C1C; canvas.drawRect(-r, -hgt, r, 0, p);
  basOval.set(-r, -k * 0.09, r, k * 0.09); canvas.drawOval(basOval, p);
  p.color = 0xFFE53935; basOval.set(-r, -hgt - k * 0.09, r, -hgt + k * 0.09); canvas.drawOval(basOval, p);
  p.color = 0xFF3A2A20; canvas.drawRect(-r, -hgt * 0.72, r, -hgt * 0.62, p); canvas.drawRect(-r, -hgt * 0.32, r, -hgt * 0.22, p);
  textPaint.textSize = k * 0.16;
  const old = textPaint.color; textPaint.color = Color.WHITE;
  canvas.drawText('TNT', 0, -hgt * 0.38, textPaint);
  textPaint.color = old;
  basStroke.strokeWidth = k * 0.025; basStroke.color = 0xFF3A2A20;
  canvas.drawLine(0, -hgt - k * 0.05, k * 0.08, -hgt - k * 0.25, basStroke);
  for (let i = 0; i < 5; i++) {
    const ang = time * 20 + i * 1.3, rr = k * (0.04 + 0.06 * Math.abs(Math.sin(time * 13 + i)));
    p.color = i % 2 === 0 ? 0xFFFFD54F : 0xFFFF7A1F;
    canvas.drawCircle(k * 0.08 + Math.cos(ang) * rr, -hgt - k * 0.25 + Math.sin(ang) * rr, k * 0.022, p);
  }
}

function drawBaseBackdrop(canvas) {
  if (!inBase()) return false;
  drawBaseScene(canvas, -camX, 1);
  return true;
}

function drawBaseScene(canvas, scrollX, alpha) {
  const p = basPaint, a = Math.round(255 * alpha), path = basPath;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h * 0.65, Color.argb(a, 0x2B, 0x3A, 0x67), Color.argb(a, 0xF2, 0xA6, 0x5A));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  for (let i = 0; i < 2; i++) {
    const bx = w * (0.2 + 0.6 * i) + scrollX * 0.02, by = h * 0.55;
    const ang = Math.sin(time * 0.6 + i * 2) * 0.5 - Math.PI / 2, len = h * 0.6;
    path.reset(); path.moveTo(bx, by);
    path.lineTo(bx + Math.cos(ang - 0.08) * len, by + Math.sin(ang - 0.08) * len);
    path.lineTo(bx + Math.cos(ang + 0.08) * len, by + Math.sin(ang + 0.08) * len); path.close();
    p.color = Color.argb(Math.round(50 * alpha), 255, 250, 210); canvas.drawPath(path, p);
  }
  path.reset();
  const mBase = h * 0.5;
  path.moveTo(0, mBase);
  let x = -w * 0.3 + (scrollX * 0.01) % (w * 0.3), up = true;
  while (x < w * 1.4) { path.lineTo(x, up ? mBase - h * 0.08 : mBase - h * 0.02); x += w * 0.2; up = !up; }
  path.lineTo(w, mBase); path.lineTo(w, h); path.lineTo(0, h); path.close();
  p.color = Color.argb(a, 92, 78, 96); canvas.drawPath(path, p);
  p.color = Color.argb(a, 120, 112, 86); canvas.drawRect(0, h * 0.55, w, h, p);
  p.color = Color.argb(a, 104, 96, 72); canvas.drawRect(0, h * 0.72, w, h, p);
  const off = (((scrollX * 0.05) % (w * 0.5)) + w * 0.5) % (w * 0.5);
  for (let i = -1; i <= 3; i++) {
    const hx = i * w * 0.5 + off;
    p.color = Color.argb(a, 86, 98, 70); basOval.set(hx - w * 0.14, h * 0.5, hx + w * 0.14, h * 0.62); canvas.drawArc(basOval, 180, 180, true, p);
    p.color = Color.argb(a, 60, 66, 50); canvas.drawRect(hx - w * 0.04, h * 0.53, hx + w * 0.04, h * 0.56, p);
  }
  const tx = w * 0.15 + (scrollX * 0.04) % w;
  p.color = Color.argb(a, 70, 66, 58);
  canvas.drawRect(tx - w * 0.008, h * 0.42, tx + w * 0.008, h * 0.56, p);
  canvas.drawRect(tx - w * 0.04, h * 0.4, tx + w * 0.04, h * 0.43, p);
  const rx = w * 0.85 + (scrollX * 0.04) % w;
  canvas.drawRect(rx - w * 0.006, h * 0.45, rx + w * 0.006, h * 0.56, p);
  const rw = Math.abs(Math.cos(time * 1.5)) * w * 0.05 + w * 0.005;
  p.color = Color.argb(a, 200, 205, 210); basOval.set(rx - rw, h * 0.42, rx + rw, h * 0.46); canvas.drawOval(basOval, p);
  const fx0 = w * 0.55 + (scrollX * 0.03) % w;
  basStroke.strokeWidth = w * 0.004; basStroke.color = Color.argb(a, 200, 200, 200);
  canvas.drawLine(fx0, h * 0.4, fx0, h * 0.56, basStroke);
  path.reset(); path.moveTo(fx0, h * 0.4);
  path.quadTo(fx0 + w * 0.04, h * 0.4 + Math.sin(time * 4) * h * 0.008, fx0 + w * 0.08, h * 0.405);
  path.lineTo(fx0 + w * 0.08, h * 0.435);
  path.quadTo(fx0 + w * 0.04, h * 0.435 + Math.sin(time * 4 + 1) * h * 0.008, fx0, h * 0.43); path.close();
  p.color = Color.argb(a, 63, 142, 252); canvas.drawPath(path, p);
  basStroke.strokeWidth = w * 0.003; basStroke.color = Color.argb(Math.round(160 * alpha), 60, 60, 60);
  canvas.drawLine(0, h * 0.6, w, h * 0.6, basStroke); canvas.drawLine(0, h * 0.625, w, h * 0.625, basStroke);
  let px0 = -((scrollX * 0.08) % (w * 0.06)) - w * 0.06;
  while (px0 < w) { canvas.drawLine(px0, h * 0.585, px0, h * 0.64, basStroke); px0 += w * 0.06; }
  const jx = ((time * 0.06) % 1.4) * w - w * 0.2, jy = h * 0.68;
  p.color = Color.argb(a, 86, 104, 60);
  canvas.drawRect(jx - w * 0.05, jy - w * 0.035, jx + w * 0.05, jy, p);
  canvas.drawRect(jx - w * 0.02, jy - w * 0.06, jx + w * 0.025, jy - w * 0.035, p);
  p.color = Color.argb(a, 30, 30, 30);
  canvas.drawCircle(jx - w * 0.03, jy + w * 0.005, w * 0.014, p); canvas.drawCircle(jx + w * 0.03, jy + w * 0.005, w * 0.014, p);
  for (let i = 0; i < 10; i++) {
    p.color = Color.argb(Math.round(180 * alpha * (0.5 + 0.5 * Math.sin(time * 2 + i))), 255, 220, 140);
    canvas.drawCircle(((i * 0.618) % 1) * w, h * (0.57 + 0.1 * ((i * 0.37) % 1)), w * 0.004, p);
  }
}

function drawHeliOverlay(canvas) {
  const p = basPaint;
  if (state === State.BOOM && bas.phase === 0 && bas.t < 1.2) {
    const q = bas.t / 1.2, x = bas.boomX - camX, y = bas.boomY - camY;
    p.shader = null;
    for (let i = 0; i < 8; i++) {
      const ang = i * 0.785, d = k * (0.3 + 2.2 * q);
      p.color = Color.argb(Math.round(160 * (1 - q)), 90, 90, 95);
      canvas.drawCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6 - q * k, k * (0.4 + 0.8 * q), p);
    }
    p.color = Color.argb(clamp(Math.round(255 * (1 - q)), 0, 255), 255, 170, 50); canvas.drawCircle(x, y, k * (0.6 + 2.4 * q), p);
    p.color = Color.argb(clamp(Math.round(255 * (1 - q * 1.5)), 0, 255), 255, 240, 160); canvas.drawCircle(x, y, k * (0.3 + 1.4 * q), p);
    if (bas.t < 0.15) { p.color = Color.argb(Math.round(220 * (1 - bas.t / 0.15)), 255, 255, 255); canvas.drawRect(0, 0, w, h, p); }
  }
  if (bas.veil <= 0.01) return;
  if (state === State.HELI) {
    drawBaseScene(canvas, bas.phase === 1 ? bas.t * w * 0.8 : 0, bas.veil);
    if (bas.phase === 1) {
      const cx = w * 0.5, cy = h * 0.28 + Math.sin(bas.t * 2.5) * h * 0.015, s = k * 1.1;
      drawHelicopter(canvas, cx, cy, s, -6);
      basStroke.strokeWidth = k * 0.025; basStroke.color = 0xFF8A6B45;
      const py0 = cy + s * 2.2;
      canvas.drawLine(cx - k * 0.6, py0, cx - k * 0.2, cy + s * 0.7, basStroke);
      canvas.drawLine(cx + k * 0.6, py0, cx + k * 0.2, cy + s * 0.7, basStroke);
      p.color = 0xFFA97B52; canvas.drawRect(cx - k * 0.7, py0, cx + k * 0.7, py0 + k * 0.12, p);
      canvas.save(); canvas.scale(1.3, 1.3, cx, py0);
      drawCharacter(canvas, cx, py0, 0, 1, 1, true, false, true);
      canvas.restore();
      if (bas.t > 0.4 && bas.t < 2.2) drawBubble(canvas, cx, py0 - k * 1.3, tr('heli.yay'));
    }
  } else if (state === State.BOOM) {
    const sky = Theme.sky(score), a = Math.round(255 * bas.veil);
    p.color = Color.WHITE;
    p.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, Color.red(sky.top), Color.green(sky.top), Color.blue(sky.top)), Color.argb(a, Color.red(sky.bottom), Color.green(sky.bottom), Color.blue(sky.bottom)));
    canvas.drawRect(0, 0, w, h, p);
    p.shader = null;
    if (bas.phase === 0) {
      const cx = w / 2, cy = h * 0.5;
      for (let i = 0; i < 5; i++) {
        const q = (bas.t * 1.5 + i * 0.2) % 1;
        p.color = Color.argb(Math.round(120 * (1 - q) * bas.veil), 80, 80, 85);
        canvas.drawCircle(cx + Math.sin(i * 2) * k * 0.4, cy + q * k * 2.5, k * (0.2 + 0.3 * q), p);
      }
      canvas.save(); canvas.rotate((bas.t * 330) % 360, cx, cy - k * 0.5); canvas.scale(1.6, 1.6, cx, cy - k * 0.5);
      drawCharacter(canvas, cx, cy, 0, 1, 1, true, true, true);
      canvas.restore();
      if (bas.t > 0.9) drawBubble(canvas, cx, cy - k * 1.9, tr('heli.boom'));
    }
  }
}
