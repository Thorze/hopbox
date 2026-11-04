'use strict';
// Imprévu « Chute de neige » (équivalent de Polar.kt) : quand il neige, une fois sur trois, une rafale
// de blizzard emporte le joueur sur la BANQUISE (beaucoup de glace glissante). Au bout, la méga pièce
// flotte au-dessus d'un trou : on saute dedans, grande rampe de glace, méga tremplin vers le ciel.

const PL_FLOE = 16, PL_HOLE = 17;
const POL_GUST = 1.8, POL_BLOWN = 2.6, POL_RAMP = 3.6, POL_BOUNCE = 2.6;
const FLOE_COLORS = [0xFFEAF6FF, 0xFFDDEFFA, 0xFFF2F8FC];
const pol = { blizzardAt: -1, active: false, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, coinX: 0, coinY: 0 };
const polPaint = new Paint();
const polStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const polPath = new Path();
const polOval = new RectF();

function inPolar() { return pol.active; }
function scheduleBlizzard() { pol.blizzardAt = weather === 5 && rndInt(3) === 0 ? time + 10 + rnd() * 20 : -1; }

function checkBlizzard() {
  if (pol.blizzardAt < 0 || time < pol.blizzardAt) return;
  if (state === State.GAME_OVER) { pol.blizzardAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure()) { pol.blizzardAt = time + 0.5; return; }
  pol.blizzardAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  Object.assign(pol, { phase: 0, t: 0, veil: 0, fallVy: 0 });
  charge = 0; perfectStreak = 0;
  state = State.BLIZZARD;
  sounds.play('BLIZZARD');
  Stats.add('blizzards');
}

function updateBlizzard(dt) {
  pol.t += dt;
  if (pol.phase === 0) {
    if (pol.t >= 0.3 && pol.t <= 1.0) { scareT = scareDuration; scareKind = 0; }
    if (pol.t > 1.0) py += (3 + (pol.t - 1) * 10) * dt;
    pol.veil = clamp((pol.t - 1.1) / 0.6, 0, 1);
    if (pol.t >= POL_GUST) { pol.phase = 1; pol.t = 0; pol.veil = 1; sounds.play('FALL', 0.6); }
  } else if (pol.phase === 1) {
    pol.veil = 1;
    if (pol.t >= POL_BLOWN) enterPolar();
  } else {
    pol.veil = Math.max(0, 1 - pol.t / 0.5);
    pol.fallVy += 22 * dt; py -= pol.fallVy * dt;
    if (py <= 0) {
      py = 0; pol.veil = 0; landSquash = 1;
      spawnDust(px, pz); sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('polar.title'), life: 3.2 });
      popups.push({ text: tr('polar.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2 });
      state = State.READY;
    }
  }
}

function enterPolar() {
  Object.assign(pol, { active: true, total: 14 + rndInt(5), spawned: 0, phase: 2, t: 0, fallVy: 0 });
  weather = 0; strikeAt = -1; crashAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1; bas.heliAt = -1; aln.ufoAt = -1; sea.whaleAt = -1;
  ice.next = false;
  platforms = [];
  current = new Platform(0, 0, 0.8, false, FLOE_COLORS[0], Kind.NORMAL, true, PL_FLOE);
  platforms.push(current);
  px = 0; pz = 0; py = 6;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

function spawnPolar() {
  pol.spawned++;
  alongX = rnd() < 0.5;
  const final = pol.spawned >= pol.total, slippery = !final && rnd() < 0.65;
  const half = final ? 0.7 : slippery ? Math.max(ICE_MIN_HALF, 0.5 + rnd() * 0.25) : 0.5 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * (final ? 1.2 : 1.8);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, false,
    slippery ? ICE_COLOR : FLOE_COLORS[rndInt(FLOE_COLORS.length)], slippery ? Kind.ICE : Kind.NORMAL, alongX, final ? PL_HOLE : PL_FLOE);
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('polar.hole'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    next.coin = rnd() < 0.25 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function startRamp() {
  Object.assign(pol, { phase: 0, t: 0, fallVy: 0, veil: 0, coinX: sx(next.cx, next.cz) + camX, coinY: sy(next.cx, 0.85, next.cz) + camY });
  next.coin = 0; perfectStreak = 0;
  profile.coins = profile.coins + MEGA_COIN;
  coinsThisRun += MEGA_COIN;
  missionEvent(MissionType.COINS, MEGA_COIN);
  Stats.add('mega');
  popups.push({ text: `+${MEGA_COIN} 🪙`, x: pol.coinX, y: pol.coinY - k, life: 1.6 });
  spawnSparkles(pol.coinX, pol.coinY, Color.parseColor('#FFD54F'), 30);
  sounds.play('COIN'); sounds.play('UNLOCK'); vibrate(120);
  state = State.SLIDE_OUT;
}

function updateSlideOut(dt) {
  pol.t += dt;
  if (pol.phase === 0) {
    pol.fallVy += 20 * dt; py -= pol.fallVy * dt;
    pol.veil = clamp((pol.t - 0.3) / 0.3, 0, 1);
    if (pol.t >= 0.65) { pol.phase = 1; pol.t = 0; pol.veil = 1; banners.push({ text: tr('polar.ramp'), life: 2.6 }); }
  } else if (pol.phase === 1) {
    pol.veil = 1;
    if (pol.t >= POL_BOUNCE && pol.t - dt < POL_BOUNCE) { sounds.play('JUMP', 1, 0.55); vibrate(120); shake(0.1); }
    if (pol.t >= POL_RAMP) leavePolar();
  } else {
    pol.veil = Math.max(0, 1 - pol.t / 0.45);
    pol.fallVy += 30 * dt; py -= pol.fallVy * dt;
    if (py <= 0) { py = 0; pol.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leavePolar() {
  Object.assign(pol, { active: false, phase: 2, t: 0, fallVy: 0 });
  platforms = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// blizzardAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetPolar() { pol.active = false; pol.veil = 0; }
function polarFallReason() { return inPolar() ? tr('reason.polar') : null; }

// ---------- Dessin ----------

function drawSnowFloe(canvas, pl) {
  drawTexturedBox(canvas, pl, 'lisse');
  const rx = 1.2247449 * k * pl.half, ry = 0.70710677 * k * pl.half, p = polPaint;
  p.color = Color.argb(235, 255, 255, 255); polOval.set(-rx * 0.85, -ry * 0.85 - k * 0.04, rx * 0.85, ry * 0.85 - k * 0.04); canvas.drawOval(polOval, p);
  p.color = Color.argb(120, 200, 225, 245); polOval.set(-rx * 0.5, -ry * 0.2, rx * 0.2, ry * 0.4); canvas.drawOval(polOval, p);
}

function drawHole(canvas, pl) {
  const rx = 1.2247449 * k * pl.half, ry = 0.70710677 * k * pl.half, p = polPaint;
  p.shader = null;
  p.color = 0xFFB9DDF2; polOval.set(-rx * 1.5, -ry * 1.5 + k * 0.12, rx * 1.5, ry * 1.5 + k * 0.12); canvas.drawOval(polOval, p);
  p.color = 0xFFF4FAFE; polOval.set(-rx * 1.5, -ry * 1.5, rx * 1.5, ry * 1.5); canvas.drawOval(polOval, p);
  p.color = 0xFF0D3B66; polOval.set(-rx * 0.85, -ry * 0.85, rx * 0.85, ry * 0.85); canvas.drawOval(polOval, p);
  p.color = 0xFF062441; polOval.set(-rx * 0.65, -ry * 0.55, rx * 0.65, ry * 0.75); canvas.drawOval(polOval, p);
  polStroke.strokeWidth = k * 0.04; polStroke.color = 0xFF9FD3F0;
  polOval.set(-rx * 0.85, -ry * 0.85, rx * 0.85, ry * 0.85); canvas.drawOval(polOval, polStroke);
  if (pl.coin > 0) {
    const bob = Math.abs(Math.sin(time * 4)) * k * 0.2;
    textPaint.textSize = k * 0.45;
    canvas.drawText('⬇', 0, -k * 1.55 - bob, textPaint);
  }
}

function drawPolarBackdrop(canvas) {
  if (!inPolar()) return false;
  drawPolarScene(canvas, -camX, 1);
  return true;
}

function drawPolarScene(canvas, scrollX, alpha) {
  const p = polPaint, a = Math.round(255 * alpha), path = polPath;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h * 0.5, Color.argb(a, 0x9C, 0xCF, 0xEF), Color.argb(a, 0xF3, 0xF9, 0xFD));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  p.color = Color.argb(Math.round(150 * alpha), 255, 240, 200); canvas.drawCircle(w * 0.25, h * 0.3, w * 0.12, p);
  p.color = Color.argb(a, 255, 236, 180); canvas.drawCircle(w * 0.25, h * 0.3, w * 0.06, p);
  const hy = h * 0.42;
  p.color = Color.argb(a, 33, 84, 128); canvas.drawRect(0, hy, w, h, p);
  p.color = Color.argb(a, 22, 62, 102); canvas.drawRect(0, h * 0.7, w, h, p);
  const off = (((scrollX * 0.02) % (w * 0.6)) + w * 0.6) % (w * 0.6);
  for (let i = -1; i <= 2; i++) {
    const bx = i * w * 0.6 + off;
    path.reset(); path.moveTo(bx - w * 0.15, hy); path.lineTo(bx - w * 0.08, hy - h * 0.08); path.lineTo(bx - w * 0.02, hy - h * 0.05); path.lineTo(bx + w * 0.04, hy - h * 0.12); path.lineTo(bx + w * 0.14, hy); path.close();
    p.color = Color.argb(a, 236, 246, 252); canvas.drawPath(path, p);
    path.reset(); path.moveTo(bx + w * 0.04, hy - h * 0.12); path.lineTo(bx + w * 0.14, hy); path.lineTo(bx + w * 0.03, hy); path.close();
    p.color = Color.argb(a, 186, 216, 236); canvas.drawPath(path, p);
  }
  for (let i = 0; i < 6; i++) {
    const row = (i * 0.37) % 1, y = hy + h * (0.04 + row * 0.4), sz = w * (0.06 + 0.08 * row);
    const x = ((((i * 0.53) + time * 0.006 * (0.5 + row)) % 1.3) * w) - w * 0.15 + scrollX * 0.04 * row;
    p.color = Color.argb(a, 230, 242, 250); polOval.set(x - sz, y - sz * 0.22, x + sz, y + sz * 0.22); canvas.drawOval(polOval, p);
    if (i % 2 === 0) drawPenguin(canvas, x + Math.sin(time * 0.6 + i) * sz * 0.4, y, sz * 0.32, alpha, i);
  }
  p.color = Color.argb(Math.round(220 * alpha), 255, 255, 255);
  for (let i = 0; i < 50; i++) {
    const sz0 = ((i * 31) % 10) / 10;
    const y = ((((i * 104729) % 1000) / 1000 * h + time * h * (0.06 + 0.05 * sz0)) % (h * 1.05));
    const x = ((((i * 7919) % 1000) / 1000 * w * 1.1 + Math.sin(time + i) * w * 0.02) % (w * 1.1));
    canvas.drawCircle(x, y, w * (0.003 + 0.005 * sz0), p);
  }
}

function drawPenguin(canvas, x, y, s, alpha, seed) {
  const p = polPaint, a = Math.round(255 * alpha);
  canvas.save(); canvas.rotate(Math.sin(time * 6 + seed) * 6, x, y);
  p.color = Color.argb(a, 30, 34, 44);
  polOval.set(x - s * 0.45, y - s * 1.4, x + s * 0.45, y); canvas.drawOval(polOval, p);
  canvas.drawCircle(x, y - s * 1.45, s * 0.35, p);
  p.color = Color.argb(a, 245, 245, 245); polOval.set(x - s * 0.28, y - s * 1.1, x + s * 0.28, y - s * 0.05); canvas.drawOval(polOval, p);
  p.color = Color.argb(a, 255, 167, 38);
  canvas.drawRect(x + s * 0.2, y - s * 1.5, x + s * 0.48, y - s * 1.38, p);
  polOval.set(x - s * 0.35, y - s * 0.08, x - s * 0.05, y + s * 0.06); canvas.drawOval(polOval, p);
  polOval.set(x + s * 0.05, y - s * 0.08, x + s * 0.35, y + s * 0.06); canvas.drawOval(polOval, p);
  p.color = Color.argb(a, 255, 255, 255); canvas.drawCircle(x + s * 0.12, y - s * 1.52, s * 0.08, p);
  canvas.restore();
}

function rampPoint(u) {
  const x0 = -w * 0.05, y0 = h * 0.12, x1 = w * 0.35, y1 = h * 1.05, x2 = w * 0.7, y2 = h * 0.62, m = 1 - u;
  return [m * m * x0 + 2 * m * u * x1 + u * u * x2, m * m * y0 + 2 * m * u * y1 + u * u * y2];
}

function drawRampScene(canvas) {
  const p = polPaint, t = pol.t, path = polPath, st = polStroke;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h, 0xFF8FC6EA, 0xFFEAF5FC);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  const n = 30;
  path.reset();
  for (let i = 0; i <= n; i++) { const [x, y] = rampPoint(i / n); if (i === 0) path.moveTo(x, y); else path.lineTo(x, y); }
  for (let i = n; i >= 0; i--) { const [x, y] = rampPoint(i / n); path.lineTo(x, y + h * 0.08); }
  path.close();
  p.color = 0xFF9ED4F2; canvas.drawPath(path, p);
  st.strokeWidth = w * 0.012; st.color = 0xFFFFFFFF;
  path.reset();
  for (let i = 0; i <= n; i++) { const [x, y] = rampPoint(i / n); if (i === 0) path.moveTo(x, y); else path.lineTo(x, y); }
  canvas.drawPath(path, st);
  // Le bout de la rampe remonte comme un tremplin de saut à ski
  const [tx, ty] = rampPoint(1);
  let cx, cy;
  if (t < POL_BOUNCE) {
    const u = (t / POL_BOUNCE) ** 2;
    [cx, cy] = rampPoint(u);
    st.strokeWidth = w * 0.004;
    for (let i = 0; i < Math.floor(6 + 14 * u); i++) {
      const ly = cy - k * (0.2 + (i % 5) * 0.25);
      st.color = Color.argb(Math.round(180 * u), 255, 255, 255);
      canvas.drawLine(cx - w * (0.06 + 0.1 * u) - i * w * 0.01, ly, cx - w * 0.03, ly, st);
    }
    p.color = Color.argb(Math.round(200 * u), 255, 255, 255);
    for (let i = 0; i < 6; i++) canvas.drawCircle(cx - k * 0.3 - i * k * 0.12, cy - k * 0.1 - Math.abs(Math.sin(t * 20 + i)) * k * 0.25, k * 0.06, p);
  } else {
    const q = t - POL_BOUNCE;
    cx = tx + q * w * 0.35; cy = ty - q * h * 1.4;
  }
  canvas.save();
  if (t >= POL_BOUNCE) canvas.rotate((t - POL_BOUNCE) * 600, cx, cy - k * 0.5);
  canvas.scale(1.4, 1.4, cx, cy);
  drawCharacter(canvas, cx, cy, 0, 1, 1, true, false, true);
  canvas.restore();
  if (t > 1.2 && t < POL_BOUNCE) drawBubble(canvas, cx, cy - k * 1.6, tr('polar.fast'));
  if (t >= POL_BOUNCE) drawBubble(canvas, cx, cy - k * 1.8, tr('island.yay'));
}

function drawPolarOverlay(canvas) {
  const p = polPaint;
  if (state === State.BLIZZARD && pol.phase === 0) {
    const q = clamp(pol.t / POL_GUST, 0, 1);
    p.color = Color.argb(Math.round(140 * q), 235, 244, 252); canvas.drawRect(0, 0, w, h, p);
    polStroke.strokeWidth = w * 0.004;
    for (let i = 0; i < Math.floor(40 + 80 * q); i++) {
      const y = ((i * 0.618) % 1) * h, x = (((i * 0.37) % 1) * w * 1.3 + time * w * (1.2 + (i % 4) * 0.3)) % (w * 1.3) - w * 0.15;
      polStroke.color = Color.argb(Math.round(200 * (0.4 + 0.6 * q)), 255, 255, 255);
      canvas.drawLine(x, y, x + w * 0.04, y + h * 0.006, polStroke);
    }
  }
  if (state === State.SLIDE_OUT && pol.phase === 0 && pol.t < 0.6) {
    const q = pol.t / 0.6;
    p.color = Color.argb(Math.round(200 * (1 - q)), 255, 214, 80);
    canvas.drawCircle(pol.coinX - camX, pol.coinY - camY, k * (0.5 + q * 1.5), p);
  }
  if (pol.veil <= 0.01) return;
  if (state === State.BLIZZARD) {
    if (pol.phase === 1) {
      p.color = Color.WHITE;
      p.shader = new LinearGradient(0, 0, 0, h, 0xFFDCEBF5, 0xFFB4CFE3);
      canvas.drawRect(0, 0, w, h, p);
      p.shader = null;
      polStroke.strokeWidth = w * 0.005;
      for (let i = 0; i < 90; i++) {
        const y = ((i * 0.618) % 1) * h, x = (((i * 0.37) % 1) * w * 1.4 + pol.t * w * (1.6 + (i % 5) * 0.3)) % (w * 1.4) - w * 0.2;
        polStroke.color = Color.argb(210, 255, 255, 255);
        canvas.drawLine(x, y, x + w * 0.06, y + h * 0.01, polStroke);
      }
      const cx = w * (0.3 + 0.4 * (pol.t / POL_BLOWN)), cy = h * 0.45 + Math.sin(pol.t * 5) * h * 0.04;
      canvas.save(); canvas.rotate(pol.t * 260, cx, cy - k * 0.5); canvas.scale(1.6, 1.6, cx, cy - k * 0.5);
      drawCharacter(canvas, cx, cy, 0, 1, 1, true, true, true);
      canvas.restore();
      drawBubble(canvas, cx, cy - k * 2, tr(pol.t < 1.3 ? 'polar.help' : 'polar.brr'));
    } else drawPolarScene(canvas, 0, pol.veil);
  } else if (state === State.SLIDE_OUT) {
    if (pol.phase === 1) drawRampScene(canvas);
    else if (pol.phase === 2) {
      const sky = Theme.sky(score), a = Math.round(255 * pol.veil);
      p.color = Color.WHITE;
      p.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, Color.red(sky.top), Color.green(sky.top), Color.blue(sky.top)), Color.argb(a, Color.red(sky.bottom), Color.green(sky.bottom), Color.blue(sky.bottom)));
      canvas.drawRect(0, 0, w, h, p);
      p.shader = null;
    } else { p.color = Color.argb(Math.round(255 * pol.veil), 10, 40, 72); canvas.drawRect(0, 0, w, h, p); }
  }
}
