'use strict';
// Imprévu « Fusée » (équivalent de Space.kt) : une fusée spéciale arrive à la place de la
// plateforme suivante. Si le joueur saute dessus, elle l'emmène dans un petit niveau bonus
// dans l'espace, au-dessus de la Terre (comètes, étoiles filantes). Au bout d'une quinzaine
// de sauts, une méga pièce flotte dans le vide : il faut sauter dans le vide pour l'attraper,
// puis on retombe sur Terre et la partie continue normalement.

const PL_SPACE = 3, PL_ROCKET = 4, PL_VOID = 5;
const SPC_DROP = 8, SPC_ARRIVE = 1.6, SPC_LIFTOFF = 2.2, SPC_ASCENT = 4.4, SPC_DIVE = 1.3, SPC_REENTRY = 4.4;
const spc = {
  rocketAt: -1, arriveT: -1, rocket: null, active: false, total: 0, spawned: 0,
  phase: 0, t: 0, fallVy: 0, veil: 0, coinX: 0, coinY: 0, coinT: -1,
  comets: [], shooting: [], nextComet: 2, nextShooting: 6, lastT: -1,
  stars: Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.85, Math.random() * 6, Math.random()]),
};
const spcPaint = new Paint();
const spcStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const spcPath = new Path();
const spcOval = new RectF();

function inSpace() { return spc.active; }
function rocketBusy() { return spc.arriveT >= 0 && spc.arriveT < SPC_ARRIVE; }

/** Environ une partie sur 30 : la fusée arrivera au bout de 12 à 35 secondes. */
function scheduleRocket(on) { spc.rocketAt = on ? time + 12 + rnd() * 23 : -1; }

function checkRocket(dt) {
  if (spc.arriveT >= 0 && spc.arriveT < SPC_ARRIVE) {
    spc.arriveT += dt;
    if (spc.arriveT >= SPC_ARRIVE) {
      shake(0.05);
      sounds.play('LAND', 0.8, 0.7);
      banners.push({ text: tr('space.rocket'), life: 4 });
    }
  }
  if (spc.rocketAt < 0 || time < spc.rocketAt) return;
  if (state === State.GAME_OVER) { spc.rocketAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure() ||
      current.kind === Kind.TRAMPOLINE || current.crumbly) { spc.rocketAt = time + 0.4; return; }
  spc.rocketAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  const r = new Platform(next.cx, next.cz, 0.62, true, 0xFFE53950, Kind.NORMAL, alongX, PL_ROCKET);
  const i = platforms.indexOf(next);
  if (i >= 0) platforms[i] = r; else platforms.push(r);
  next = r;
  spc.rocket = r;
  spc.arriveT = 0;
  sounds.play('JUMP', 0.7, 0.5);
  vibrate(15);
}

function rocketOffset(pl) {
  if (state === State.ROCKET) return [0, -spc.fallVy];
  if (pl === current) return [0, 0];
  const a = spc.arriveT < 0 ? 1 : clamp(spc.arriveT / SPC_ARRIVE, 0, 1);
  const e = 1 - (1 - a) * (1 - a) * (1 - a);
  return [(1 - e) * w * 0.35, (1 - e) * h * 0.9 + Math.sin(time * 2.4) * k * 0.06];
}

function startRocket() {
  spc.phase = 0; spc.t = 0; spc.fallVy = 0; spc.veil = 0; spc.arriveT = -1;
  pendingBounce = false; perfectStreak = 0;
  sounds.play('PLANE_FALL', 0.6);
  vibrate(120);
  state = State.ROCKET;
  Stats.add('space');
}

function updateRocket(dt) {
  spc.t += dt;
  if (spc.phase === 0) {
    if (spc.t < 0.8) shake(0.02);
    const q = clamp((spc.t - 0.7) / (SPC_LIFTOFF - 0.7), 0, 1);
    spc.fallVy = q * q * h * 1.3;          // décalage vers le haut en pixels
    py = spc.fallVy / k;
    if (spc.t > 0.7 && rnd() < 0.6 && spc.rocket) spawnDust(spc.rocket.cx, spc.rocket.cz);
    spc.veil = clamp((spc.t - 1.5) / 0.5, 0, 1);
    if (spc.t >= SPC_LIFTOFF) { spc.phase = 1; spc.t = 0; spc.veil = 1; }
  } else if (spc.phase === 1) {
    spc.veil = 1;
    if (spc.t >= SPC_ASCENT) enterSpace();
  } else {
    spc.veil = Math.max(0, 1 - spc.t / 0.5);
    spc.fallVy += 18 * dt;
    py -= spc.fallVy * dt;
    if (py <= 0) {
      py = 0; spc.veil = 0; landSquash = 1;
      spawnDust(px, pz);
      sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('space.title'), life: 3.2 });
      popups.push({ text: tr('space.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.8 });
      state = State.READY;
    }
  }
}

function spaceColor() { return [0xFF7E57C2, 0xFF5C6BC0, 0xFF26A69A, 0xFF8E9BB0, 0xFFEC6FA0][rndInt(5)]; }

function enterSpace() {
  spc.active = true; spc.rocket = null;
  spc.total = 14 + rndInt(3); spc.spawned = 0;
  spc.phase = 2; spc.t = 0; spc.fallVy = 0;
  spc.comets = []; spc.shooting = [];
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1;
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.8, false, spaceColor(), Kind.NORMAL, true, PL_SPACE);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = SPC_DROP;
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
}

function spawnSpace() {
  spc.spawned++;
  alongX = rnd() < 0.5;
  const final = spc.spawned >= spc.total;
  const half = final ? 0.6 : 0.5 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * (final ? 1.2 : 1.9);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, false,
    spaceColor(), Kind.NORMAL, alongX, final ? PL_VOID : PL_SPACE);
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('space.dive'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    next.coin = rnd() < 0.3 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  trimPlatforms();
}

function startSpaceDive() {
  spc.phase = 0; spc.t = 0; spc.fallVy = 0; spc.veil = 0; spc.coinT = 0;
  spc.coinX = sx(next.cx, next.cz) + camX;
  spc.coinY = sy(next.cx, 0.85, next.cz) + camY;
  next.coin = 0;
  perfectStreak = 0;
  profile.coins = profile.coins + MEGA_COIN;
  coinsThisRun += MEGA_COIN;
  missionEvent(MissionType.COINS, MEGA_COIN);
  popups.push({ text: `+${MEGA_COIN} 🪙`, x: spc.coinX, y: spc.coinY - k, life: 1.6 });
  spawnSparkles(spc.coinX, spc.coinY, Color.parseColor('#FFD54F'), 30);
  sounds.play('COIN');
  sounds.play('UNLOCK');
  vibrate(120);
  banners.push({ text: tr('space.back'), life: 3 });
  state = State.SPACEFALL;
  Stats.add('mega');
}

function updateSpaceFall(dt) {
  spc.t += dt;
  if (spc.coinT >= 0) spc.coinT += dt;
  if (spc.phase === 0) {
    spc.fallVy += 14 * dt;
    py -= spc.fallVy * dt;
    spc.veil = clamp((spc.t - 0.8) / 0.5, 0, 1);
    if (spc.t >= SPC_DIVE) { spc.phase = 1; spc.t = 0; spc.veil = 1; }
  } else if (spc.phase === 1) {
    spc.veil = 1;
    if (spc.t >= SPC_REENTRY) leaveSpace();
  } else {
    spc.veil = Math.max(0, 1 - spc.t / 0.45);
    spc.fallVy += 30 * dt;
    py -= spc.fallVy * dt;
    if (py <= 0) {
      py = 0; spc.veil = 0; landSquash = 1;
      spawnDust(px, pz); shake(0.06);
      sounds.play('LAND');
      state = State.READY;
    }
  }
}

function leaveSpace() {
  spc.active = false; spc.phase = 2; spc.t = 0; spc.fallVy = 0; spc.coinT = -1;
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 7;
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
}

// rocketAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetSpace() { spc.active = false; spc.arriveT = -1; spc.rocket = null; spc.veil = 0; spc.coinT = -1; }

function spaceFallReason() { return inSpace() ? tr('reason.space') : null; }

// ---------- Dessin ----------

function spcGlow(canvas, x, y, r, a, cr, cg, cb) {
  for (let i = 6; i >= 1; i--) {
    spcPaint.color = Color.argb(Math.round(a / 6), cr, cg, cb);
    canvas.drawCircle(x, y, r * i / 6, spcPaint);
  }
}

function drawSpaceBackdrop(canvas) {
  if (!inSpace()) return false;
  const dt = spc.lastT < 0 ? 0 : Math.min(0.1, time - spc.lastT);
  spc.lastT = time;
  drawSpaceScene(canvas, dt);
  return true;
}

function drawSpaceScene(canvas, dt) {
  const p = spcPaint, par = -camX * 0.03;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h, 0xFF03040C, 0xFF16204A);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  // Nébuleuses
  spcGlow(canvas, w * 0.2 + par * 0.5, h * 0.18, w * 0.45, 110, 126, 87, 194);
  spcGlow(canvas, w * 0.85 + par * 0.5, h * 0.42, w * 0.38, 80, 38, 166, 154);
  spcGlow(canvas, w * 0.6 + par * 0.5, h * 0.08, w * 0.3, 90, 236, 111, 160);
  // Étoiles qui scintillent
  for (const s of spc.stars) {
    const tw = 0.45 + 0.55 * Math.sin(time * (1.2 + s[3]) + s[2]);
    p.color = Color.argb(clamp(Math.round(230 * tw), 0, 255), 255, 255, s[3] > 0.8 ? 210 : 255);
    canvas.drawCircle(s[0] * w + par * (0.3 + s[3]), s[1] * h, w * (0.0025 + 0.004 * s[3]), p);
  }
  // Lune avec cratères
  const mx = w * 0.16 + par, my = h * 0.12, mr = w * 0.07;
  p.color = Color.rgb(214, 214, 220); canvas.drawCircle(mx, my, mr, p);
  p.color = Color.rgb(180, 180, 190);
  canvas.drawCircle(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, p);
  canvas.drawCircle(mx + mr * 0.35, my + mr * 0.25, mr * 0.16, p);
  canvas.drawCircle(mx + mr * 0.1, my - mr * 0.5, mr * 0.1, p);
  // Planète à anneaux
  const gx = w * 0.84 + par * 1.5, gy = h * 0.24, gr = w * 0.045;
  p.color = Color.rgb(236, 176, 98); canvas.drawCircle(gx, gy, gr, p);
  spcStroke.strokeWidth = w * 0.007; spcStroke.color = Color.argb(200, 250, 220, 160);
  spcOval.set(gx - gr * 1.9, gy - gr * 0.45, gx + gr * 1.9, gy + gr * 0.45);
  canvas.save(); canvas.rotate(-18, gx, gy); canvas.drawOval(spcOval, spcStroke); canvas.restore();
  // Comètes de temps en temps
  spc.nextComet -= dt;
  if (spc.nextComet <= 0) {
    const ltr = rnd() < 0.5;
    spc.comets.push([ltr ? -w * 0.2 : w * 1.2, h * (0.05 + rnd() * 0.45), (ltr ? 1 : -1) * w * (0.12 + rnd() * 0.1), h * (0.02 + rnd() * 0.04), 0.7 + rnd() * 0.6]);
    spc.nextComet = 4 + rnd() * 6;
  }
  spc.comets = spc.comets.filter((c) => {
    c[0] += c[2] * dt; c[1] += c[3] * dt;
    if (c[0] < -w * 0.4 || c[0] > w * 1.4 || c[1] > h) return false;
    drawComet(canvas, c[0], c[1], c[2], c[3], c[4]);
    return true;
  });
  // Étoiles filantes (rares, très rapides)
  spc.nextShooting -= dt;
  if (spc.nextShooting <= 0) {
    const ltr = rnd() < 0.5;
    spc.shooting.push([w * (0.1 + rnd() * 0.8), h * (0.03 + rnd() * 0.3), (ltr ? 1 : -1) * w * 1.6, h * 0.6, 0.7]);
    spc.nextShooting = 9 + rnd() * 12;
  }
  spc.shooting = spc.shooting.filter((s) => {
    s[4] -= dt;
    if (s[4] <= 0) return false;
    s[0] += s[2] * dt; s[1] += s[3] * dt;
    spcStroke.strokeWidth = w * 0.004;
    spcStroke.color = Color.argb(Math.round(230 * s[4] / 0.7), 255, 255, 255);
    canvas.drawLine(s[0], s[1], s[0] - s[2] * 0.09, s[1] - s[3] * 0.09, spcStroke);
    return true;
  });
  drawEarth(canvas, par);
}

function drawComet(canvas, x, y, vx, vy, size) {
  const p = spcPaint, len = w * 0.32 * size, l = Math.hypot(vx, vy), ux = vx / l, uy = vy / l, r = w * 0.012 * size;
  p.shader = new LinearGradient(x, y, x - ux * len, y - uy * len, Color.argb(200, 190, 235, 255), Color.argb(0, 120, 180, 255));
  spcPath.reset();
  spcPath.moveTo(x + uy * r * 1.2, y - ux * r * 1.2);
  spcPath.lineTo(x - ux * len, y - uy * len);
  spcPath.lineTo(x - uy * r * 1.2, y + ux * r * 1.2);
  spcPath.close();
  canvas.drawPath(spcPath, p);
  p.shader = null;
  p.color = Color.argb(90, 200, 240, 255); canvas.drawCircle(x, y, r * 2.4, p);
  p.color = Color.WHITE; canvas.drawCircle(x, y, r, p);
}

/** La Terre en bas de l'écran : océans, continents qui défilent, nuages et atmosphère. */
function drawEarth(canvas, par) {
  const p = spcPaint, r = w * 1.05, cx = w * 0.5 + par * 0.6, cy = h * 0.86 + r;
  // Halo de l'atmosphère
  for (let i = 4; i >= 1; i--) {
    p.color = Color.argb(30, 99, 195, 232);
    canvas.drawCircle(cx, cy, r * (1 + 0.018 * i), p);
  }
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, cy - r, 0, cy - r * 0.8, 0xFF2D8BD8, 0xFF0E3E7E);
  canvas.drawCircle(cx, cy, r, p);
  p.shader = null;
  canvas.save();
  spcPath.reset(); spcPath.addCircle(cx, cy, r);
  canvas.clipPath(spcPath);
  const top = cy - r;
  for (let i = 0; i < 5; i++) {
    const span = w * 1.8;
    const x = ((i * 0.37 * span + time * w * 0.01) % span) - w * 0.4;
    const y = top + h * (0.025 + 0.05 * ((i * 3) % 4) / 3);
    const s = w * (0.12 + 0.05 * (i % 3));
    p.color = Color.rgb(76, 160 - i * 6, 80);
    spcOval.set(x - s, y - s * 0.22, x + s, y + s * 0.22); canvas.drawOval(spcOval, p);
    spcOval.set(x - s * 0.3, y - s * 0.12, x + s * 0.9, y + s * 0.35); canvas.drawOval(spcOval, p);
    p.color = Color.argb(210, 255, 255, 255);
    const cxx = ((i * 0.53 * span + time * w * 0.018) % span) - w * 0.4;
    spcOval.set(cxx - s * 0.6, y - s * 0.06 + h * 0.02, cxx + s * 0.6, y + s * 0.07 + h * 0.02); canvas.drawOval(spcOval, p);
  }
  canvas.restore();
  spcStroke.strokeWidth = w * 0.006; spcStroke.color = Color.argb(200, 160, 220, 255);
  canvas.drawCircle(cx, cy, r, spcStroke);
}

/** Bloc spatial flottant avec deux petits réacteurs dessous (canvas placé sur la plateforme). */
function drawSpaceBlock(canvas, pl) {
  drawTexturedBox(canvas, pl, 'metal');
  const a = pl.half, fY = a * k, d = platformDepth * k, p = spcPaint;
  for (const side of [-1, 1]) {
    const x = side * a * 0.8660254 * k, y = fY * 0.5 + d;
    const fl = k * (0.28 + 0.08 * Math.sin(time * 30 + side + pl.cx));
    p.color = Color.argb(150, 90, 200, 255);
    spcOval.set(x - k * 0.1, y, x + k * 0.1, y + fl); canvas.drawOval(spcOval, p);
    p.color = Color.argb(230, 230, 250, 255);
    spcOval.set(x - k * 0.045, y, x + k * 0.045, y + fl * 0.6); canvas.drawOval(spcOval, p);
  }
}

/** Cible en pointillés sous la méga pièce qui flotte dans le vide. */
function drawVoidCoin(canvas, pl) {
  if (pl.coin <= 0) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 4), r = pl.half * (0.8 + 0.2 * pulse);
  spcStroke.strokeWidth = k * 0.03;
  spcStroke.color = Color.argb(Math.round(90 + 90 * pulse), 255, 220, 90);
  spcOval.set(-1.2247449 * k * r, -0.70710677 * k * r, 1.2247449 * k * r, 0.70710677 * k * r);
  for (let i = 0; i < 12; i++) canvas.drawArc(spcOval, i * 30 + time * 40, 15, false, spcStroke);
  textPaint.textSize = k * 0.45;
  canvas.drawText('⬇', 0, -k * (1.55 + Math.sin(time * 3) * 0.08), textPaint);
}

/** Fusée debout : la plateforme ronde est son sommet. (x, y) = centre du dessus, s = échelle. */
function drawRocketShape(canvas, x, y, s, flame) {
  const p = spcPaint;
  p.shader = null;
  const rw = 1.2247449 * k * 0.62 * s, ry = 0.70710677 * k * 0.62 * s;
  const bodyW = rw * 0.92, bodyH = k * 2.5 * s, bottom = y + bodyH, path = spcPath;
  if (flame > 0) {
    const fl = k * s * (0.9 + 0.6 * flame) * (0.85 + 0.3 * rnd());
    p.color = Color.argb(200, 255, 140, 30);
    path.reset(); path.moveTo(x - bodyW * 0.45, bottom + k * 0.15 * s); path.quadTo(x, bottom + fl * 1.3, x + bodyW * 0.45, bottom + k * 0.15 * s); path.close();
    canvas.drawPath(path, p);
    p.color = Color.argb(230, 255, 230, 120);
    path.reset(); path.moveTo(x - bodyW * 0.25, bottom + k * 0.15 * s); path.quadTo(x, bottom + fl * 0.8, x + bodyW * 0.25, bottom + k * 0.15 * s); path.close();
    canvas.drawPath(path, p);
  }
  p.color = 0xFFC62A3E;
  for (const side of [-1, 1]) {
    path.reset();
    path.moveTo(x + side * bodyW * 0.95, bottom - bodyH * 0.38);
    path.lineTo(x + side * bodyW * 1.55, bottom + k * 0.12 * s);
    path.lineTo(x + side * bodyW * 0.95, bottom - k * 0.05 * s);
    path.close();
    canvas.drawPath(path, p);
  }
  p.color = 0xFF4A5568;
  path.reset();
  path.moveTo(x - bodyW * 0.4, bottom - k * 0.05 * s); path.lineTo(x + bodyW * 0.4, bottom - k * 0.05 * s);
  path.lineTo(x + bodyW * 0.55, bottom + k * 0.18 * s); path.lineTo(x - bodyW * 0.55, bottom + k * 0.18 * s); path.close();
  canvas.drawPath(path, p);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(x - bodyW, 0, x + bodyW, 0, [0xFFFFFFFF, 0xFFE9EDF3, 0xFFAEB7C4], null);
  spcOval.set(x - bodyW, y, x + bodyW, bottom);
  canvas.drawRoundRect(spcOval, bodyW * 0.5, bodyW * 0.5, p);
  p.shader = null;
  p.color = 0xFFE53950; canvas.drawRect(x - bodyW, y + bodyH * 0.62, x + bodyW, y + bodyH * 0.7, p);
  p.color = 0xFF37474F; canvas.drawCircle(x, y + bodyH * 0.36, bodyW * 0.42, p);
  p.color = 0xFF63C3E8; canvas.drawCircle(x, y + bodyH * 0.36, bodyW * 0.32, p);
  p.color = Color.argb(170, 255, 255, 255); canvas.drawCircle(x - bodyW * 0.1, y + bodyH * 0.33, bodyW * 0.1, p);
  // Sommet : piste d'atterrissage ronde
  p.color = 0xFFC62A3E;
  spcOval.set(x - rw, y - ry + k * 0.12 * s, x + rw, y + ry + k * 0.12 * s); canvas.drawOval(spcOval, p);
  canvas.drawRect(x - rw, y, x + rw, y + k * 0.12 * s, p);
  p.color = 0xFFE53950; spcOval.set(x - rw, y - ry, x + rw, y + ry); canvas.drawOval(spcOval, p);
  p.color = 0xFFFFC93C; spcOval.set(x - rw * 0.62, y - ry * 0.62, x + rw * 0.62, y + ry * 0.62); canvas.drawOval(spcOval, p);
  p.color = 0xFFE53950; spcOval.set(x - rw * 0.42, y - ry * 0.42, x + rw * 0.42, y + ry * 0.42); canvas.drawOval(spcOval, p);
  if (Math.sin(time * 8) > 0) { p.color = 0xFF7CFF6B; canvas.drawCircle(x + rw * 0.85, y - ry * 0.1, k * 0.04 * s, p); }
}

function drawRocketPlatform(canvas, pl) {
  const launching = state === State.ROCKET;
  drawRocketShape(canvas, 0, 0, 1, launching ? Math.min(1, spc.t / 0.7) : 0.35);
  // Tant qu'elle attend le joueur : cible dorée qui pulse et flèche qui rebondit au-dessus
  if (launching || pl === current || rocketBusy()) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 5);
  for (let i = 0; i < 2; i++) {
    const q = (time * 0.9 + i * 0.5) % 1, r = pl.half * (0.7 + 0.9 * q);
    spcStroke.strokeWidth = k * 0.04;
    spcStroke.color = Color.argb(Math.round(220 * (1 - q)), 255, 214, 80);
    spcOval.set(-1.2247449 * k * r, -0.70710677 * k * r, 1.2247449 * k * r, 0.70710677 * k * r);
    canvas.drawOval(spcOval, spcStroke);
  }
  const bob = Math.abs(Math.sin(time * 4)) * k * 0.25;
  textPaint.textSize = k * (0.55 + 0.05 * pulse);
  canvas.drawText('⬇', 0, -k * 0.75 - bob, textPaint);
  drawBubble(canvas, 0, -k * 1.45 - bob, tr('space.jump'));
}

/** Scènes plein écran : montée en fusée vers l'espace, puis rentrée vers la Terre. */
function drawSpaceOverlay(canvas) {
  const p = spcPaint;
  if (state === State.SPACEFALL && spc.coinT >= 0 && spc.coinT <= 0.6) {
    const q = spc.coinT / 0.6;
    p.shader = null;
    p.color = Color.argb(Math.round(200 * (1 - q)), 255, 214, 80);
    canvas.drawCircle(spc.coinX - camX, spc.coinY - camY, k * (0.5 + q * 1.5), p);
  }
  if (spc.veil <= 0.01) return;
  const up = state === State.ROCKET, dur = up ? SPC_ASCENT : SPC_REENTRY;
  const q = spc.phase === 1 ? clamp(spc.t / dur, 0, 1) : (up ? 0 : 1);
  const space = up ? q : 1 - q, sky = Theme.sky(score), a = Math.round(255 * spc.veil);
  const top = Theme.lerp(sky.top, 0xFF03040C, space), bot = Theme.lerp(sky.bottom, 0xFF16204A, space);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h,
    Color.argb(a, Color.red(top), Color.green(top), Color.blue(top)),
    Color.argb(a, Color.red(bot), Color.green(bot), Color.blue(bot)));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  for (const s of spc.stars) {
    p.color = Color.argb(clamp(Math.round(220 * space * spc.veil), 0, 255), 255, 255, 255);
    const yy = ((s[1] * h + (up ? 1 : -1) * spc.t * h * 0.15 * (0.5 + s[3])) % h + h) % h;
    canvas.drawCircle(s[0] * w, yy, w * (0.003 + 0.003 * s[3]), p);
  }
  const dir = up ? 1 : -1;
  spcStroke.strokeWidth = w * 0.004;
  for (let i = 0; i < 16; i++) {
    const x = w * ((i * 0.618) % 1), len = h * 0.14;
    const y = ((((i * 0.37) * h + dir * spc.t * h * 2.4) % (h + len)) + h + len) % (h + len) - len;
    spcStroke.color = Color.argb(Math.round(110 * spc.veil), 255, 255, 255);
    canvas.drawLine(x, y, x, y + len, spcStroke);
  }
  const cloudA = clamp(1 - space, 0, 1);
  if (cloudA > 0.02) {
    for (const c of isl.clouds) {
      const span = h * 1.4;
      const y = (((c[1] * span + dir * spc.t * h * 1.4 * c[2]) % span) + span) % span - h * 0.2;
      drawIslPuff(canvas, c[0] * w, y, w * 0.12 * c[2], 210 * cloudA * spc.veil);
    }
  }
  const cx = w / 2, cy = h * (up ? 0.42 : 0.56);
  if (up) {
    const wob = Math.sin(time * 40) * k * 0.02;
    canvas.save();
    canvas.scale(1.4, 1.4, cx, cy);
    drawRocketShape(canvas, cx + wob, cy, 1, 1);
    drawCharacter(canvas, cx + wob, cy, 0, 1, 1, true, false, true);
    canvas.restore();
    if (spc.phase === 1 && spc.t > 0.6 && spc.t < 2.4) drawBubble(canvas, cx, cy - k * 2.2, tr('space.yay'));
  } else {
    const heat = spc.phase === 1 ? clamp(1 - spc.t / (SPC_REENTRY * 0.45), 0, 1) : 0;
    if (heat > 0) spcGlow(canvas, cx, cy - k * 0.5, k * 1.6 * (1 + 0.08 * Math.sin(time * 30)), 230 * heat, 255, 150, 50);
    canvas.save();
    canvas.rotate((spc.t * 300) % 360, cx, cy - k * 0.5);
    canvas.scale(1.7, 1.7, cx, cy - k * 0.5);
    drawCharacter(canvas, cx, cy, 0, 1, 1, true, false, true);
    canvas.restore();
    if (spc.phase === 1 && spc.t > 2.2) drawBubble(canvas, cx, cy - k * 1.9, tr('space.home'));
  }
}
