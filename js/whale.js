'use strict';
// Imprévu « Baleine » (équivalent de Whale.kt) : environ 1 partie sur 60. Le jet d'eau d'une baleine
// projette le joueur sous la mer : 25 à 30 sauts sur des rochers de corail et des MÉDUSES qui font
// rebondir, avec des créatures aléatoires en fond. Méga pièce sur le dos de la baleine : son geyser
// renvoie dans le ciel habituel.

const PL_CORAL = 13, PL_JELLY = 14, PL_WHALE = 15, SEA_JUMP_TIME = 1.25, SEA_JUMP_HEIGHT = 1.3;
const SEA_SPOUT = 1.0, SEA_LAUNCH = 2.2, SEA_DIVE = 2.6;
const CORAL_COLORS = [0xFFE8A27C, 0xFFD98BA0, 0xFFC9B47E, 0xFF9C8FC4];
const SEA_COLORS = [0xFFFF8A3D, 0xFFFFD54F, 0xFF4FC3F7, 0xFFEF5350, 0xFFAB47BC, 0xFF66BB6A, 0xFFFF80AB, 0xFF26C6DA];
const sea = { whaleAt: -1, active: false, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, wx: 0, wy: 0, lastT: -1, creatures: [] };
const seaPaint = new Paint();
const seaStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const seaPath = new Path();
const seaOval = new RectF();

function inSea() { return sea.active; }
function scheduleWhale(on) { sea.whaleAt = on ? time + 12 + rnd() * 23 : -1; }

function checkWhale() {
  if (sea.whaleAt < 0 || time < sea.whaleAt) return;
  if (state === State.GAME_OVER) { sea.whaleAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure()) { sea.whaleAt = time + 0.5; return; }
  sea.whaleAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  Object.assign(sea, { phase: 0, t: 0, veil: 0, fallVy: 0, wx: sx(px, pz), wy: sy(px, 0, pz) });
  charge = 0; perfectStreak = 0;
  state = State.WHALE;
  sounds.play('WHALE');
  Stats.add('whales');
}

function updateWhale(dt) {
  sea.t += dt;
  if (sea.phase === 0) {
    if (sea.t >= 0.2 && sea.t <= SEA_SPOUT) { scareT = scareDuration; scareKind = 1; }
    if (sea.t >= SEA_SPOUT && sea.t - dt < SEA_SPOUT) { sounds.play('GEYSER'); vibrate(120); shake(0.08); }
    if (sea.t > SEA_SPOUT) py += (8 + (sea.t - SEA_SPOUT) * 20) * dt;
    sea.veil = clamp((sea.t - 1.7) / 0.5, 0, 1);
    if (sea.t >= SEA_LAUNCH) { sea.phase = 1; sea.t = 0; sea.veil = 1; sounds.play('FALL', 0.6); }
  } else if (sea.phase === 1) {
    sea.veil = 1;
    if (sea.t >= SEA_DIVE) enterSea();
  } else {
    sea.veil = Math.max(0, 1 - sea.t / 0.6);
    sea.fallVy += 9 * dt; py -= sea.fallVy * dt;
    if (py <= 0) {
      py = 0; sea.veil = 0; landSquash = 1;
      spawnDust(px, pz); sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('whale.title'), life: 3.2 });
      popups.push({ text: tr('whale.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2 });
      state = State.READY;
    }
  }
}

function enterSea() {
  Object.assign(sea, { active: true, total: 25 + rndInt(6), spawned: 0, phase: 2, t: 0, fallVy: 0, creatures: [] });
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1; bas.heliAt = -1; aln.ufoAt = -1;
  platforms = [];
  current = new Platform(0, 0, 0.8, false, CORAL_COLORS[0], Kind.NORMAL, true, PL_CORAL);
  platforms.push(current);
  px = 0; pz = 0; py = 6;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

function spawnSea() {
  sea.spawned++;
  alongX = rnd() < 0.5;
  const final = sea.spawned >= sea.total;
  const jelly = !final && sea.spawned < sea.total - 1 && current.island !== PL_JELLY && rnd() < 0.25;
  const half = final ? 1.0 : jelly ? 0.55 : 0.5 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * (final ? 1.2 : 1.9);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, jelly,
    jelly ? 0xFFFF80C8 : CORAL_COLORS[rndInt(CORAL_COLORS.length)], jelly ? Kind.TRAMPOLINE : Kind.NORMAL, alongX,
    final ? PL_WHALE : jelly ? PL_JELLY : PL_CORAL);
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('whale.back'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else if (!jelly) {
    next.coin = rnd() < 0.3 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function startWhaleOut() {
  Object.assign(sea, { phase: 0, t: 0, fallVy: 0, veil: 0, wx: sx(px, pz), wy: sy(px, 0, pz) });
  pendingBounce = false; perfectStreak = 0;
  Stats.add('mega');
  banners.push({ text: tr('whale.out'), life: 3 });
  sounds.play('UNLOCK');
  sounds.play('WHALE', 0.8);
  state = State.WHALE_OUT;
}

function updateWhaleOut(dt) {
  sea.t += dt;
  if (sea.phase === 0) {
    if (sea.t >= 0.5 && sea.t - dt < 0.5) { sounds.play('GEYSER'); vibrate(120); shake(0.1); }
    if (sea.t > 0.5) py += (9 + (sea.t - 0.5) * 28) * dt;
    sea.veil = clamp((sea.t - 1.2) / 0.4, 0, 1);
    if (sea.t >= 2.4) leaveSea();
  } else {
    sea.veil = Math.max(0, 1 - sea.t / 0.45);
    sea.fallVy += 30 * dt; py -= sea.fallVy * dt;
    if (py <= 0) { py = 0; sea.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leaveSea() {
  Object.assign(sea, { active: false, phase: 1, t: 0, fallVy: 0 });
  platforms = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// whaleAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetSea() { sea.active = false; sea.veil = 0; }
function seaFallReason() { return inSea() ? tr('reason.sea_deep') : null; }

// ---------- Dessin ----------

function drawWhale(canvas, x, y, s, dir) {
  const p = seaPaint, path = seaPath, st = seaStroke;
  p.shader = null;
  canvas.save(); canvas.scale(dir, 1, x, y);
  p.color = 0xFF2F5F9E;
  const tail = Math.sin(time * 2) * s * 0.15;
  path.reset();
  path.moveTo(x - s * 1.6, y + s * 0.35);
  path.quadTo(x - s * 2.2, y + s * 0.2, x - s * 2.5, y - s * 0.35 + tail);
  path.lineTo(x - s * 2.15, y + s * 0.05 + tail * 0.5);
  path.lineTo(x - s * 2.55, y + s * 0.5 + tail);
  path.quadTo(x - s * 2.1, y + s * 0.65, x - s * 1.6, y + s * 0.6);
  path.close(); canvas.drawPath(path, p);
  p.color = 0xFF3D7CC9; seaOval.set(x - s * 1.9, y - s * 0.05, x + s * 1.9, y + s * 1.35); canvas.drawOval(seaOval, p);
  p.color = 0xFFCFE3F5; seaOval.set(x - s * 1.3, y + s * 0.75, x + s * 1.8, y + s * 1.33); canvas.drawOval(seaOval, p);
  st.strokeWidth = s * 0.03; st.color = 0xFF9DBAD6;
  for (let i = 0; i < 5; i++) { const lx = x - s * 0.8 + i * s * 0.45; canvas.drawLine(lx, y + s * 0.85, lx + s * 0.1, y + s * 1.25, st); }
  p.color = 0xFF2F5F9E;
  path.reset(); path.moveTo(x + s * 0.3, y + s * 0.95);
  path.quadTo(x - s * 0.1, y + s * 1.5, x - s * 0.5, y + s * 1.45);
  path.quadTo(x - s * 0.1, y + s * 1.2, x + s * 0.1, y + s * 0.85); path.close(); canvas.drawPath(path, p);
  p.color = Color.WHITE; canvas.drawCircle(x + s * 1.25, y + s * 0.55, s * 0.13, p);
  p.color = 0xFF1B1B1B; canvas.drawCircle(x + s * 1.28, y + s * 0.56, s * 0.07, p);
  st.strokeWidth = s * 0.04; st.color = 0xFF1E3F6E;
  seaOval.set(x + s * 1.05, y + s * 0.65, x + s * 1.75, y + s * 0.95); canvas.drawArc(seaOval, 20, 120, false, st);
  p.color = 0xFF1E3F6E; seaOval.set(x + s * 0.55, y + s * 0.02, x + s * 0.8, y + s * 0.12); canvas.drawOval(seaOval, p);
  canvas.restore();
}

function drawSpout(canvas, x, y, hgt, s, alpha) {
  const p = seaPaint, path = seaPath;
  path.reset(); path.moveTo(x - s * 0.12, y);
  path.quadTo(x - s * 0.25, y - hgt * 0.5, x - s * 0.45, y - hgt);
  path.lineTo(x + s * 0.45, y - hgt);
  path.quadTo(x + s * 0.25, y - hgt * 0.5, x + s * 0.12, y); path.close();
  p.color = Color.argb(Math.round(200 * alpha), 200, 235, 255); canvas.drawPath(path, p);
  for (let i = 0; i < 8; i++) {
    const ang = i * 0.785 + time * 3;
    p.color = Color.argb(Math.round(220 * alpha), 230, 248, 255);
    canvas.drawCircle(x + Math.cos(ang) * s * 0.55, y - hgt + Math.sin(ang) * s * 0.2, s * (0.12 + 0.06 * (i % 3)), p);
  }
}

function drawJelly(canvas, pl) {
  const rx = 1.2247449 * k * pl.half, ry = 0.70710677 * k * pl.half, sq = 1 - 0.3 * pl.bounce, p = seaPaint, st = seaStroke;
  p.shader = null;
  st.strokeWidth = k * 0.035;
  for (let i = 0; i < 6; i++) {
    const tx = -rx * 0.75 + i * rx * 0.3;
    st.color = Color.argb(170, 255, 170, 220);
    seaPath.reset(); seaPath.moveTo(tx, ry * 0.4);
    for (let yy = ry * 0.4; yy < k * 1.6;) { yy += k * 0.2; seaPath.lineTo(tx + Math.sin(time * 3 + yy * 0.05 + i) * k * 0.08, yy); }
    canvas.drawPath(seaPath, st);
  }
  p.color = Color.argb(70, 255, 140, 210); canvas.drawCircle(0, -ry * 0.3, rx * 1.25, p);
  p.color = Color.argb(215, 255, 128, 200); seaOval.set(-rx * 1.05, -ry * 1.1 - k * 0.55 * sq, rx * 1.05, ry * 0.9); canvas.drawArc(seaOval, 180, 180, true, p);
  p.color = Color.argb(235, 255, 160, 215); seaOval.set(-rx * 1.05, -ry * 0.9, rx * 1.05, ry * 0.9); canvas.drawOval(seaOval, p);
  p.color = Color.argb(160, 255, 230, 245);
  canvas.drawCircle(-rx * 0.35, -ry * 0.1, k * 0.06, p); canvas.drawCircle(rx * 0.25, ry * 0.15, k * 0.05, p); canvas.drawCircle(rx * 0.05, -ry * 0.45, k * 0.045, p);
}

function drawCoralRock(canvas, pl) {
  drawTexturedBox(canvas, pl, 'granit');
  const a = pl.half, seed = Math.abs(Math.trunc(pl.cx * 9 + pl.cz * 17)), st = seaStroke;
  for (let c = 0; c < 2; c++) {
    const ux = c === 0 ? a * 0.7 : -a * 0.2, uz = c === 0 ? -a * 0.2 : a * 0.7;
    const bx = isoX(ux, uz), by = isoY(ux, 0, uz);
    st.color = SEA_COLORS[(seed + c * 3) % SEA_COLORS.length];
    st.strokeWidth = k * 0.06; canvas.drawLine(bx, by, bx, by - k * 0.35, st);
    st.strokeWidth = k * 0.045;
    canvas.drawLine(bx, by - k * 0.15, bx - k * 0.15, by - k * 0.38, st);
    canvas.drawLine(bx, by - k * 0.22, bx + k * 0.14, by - k * 0.45, st);
  }
  if (seed % 2 === 0) {
    const ax = isoX(-a * 0.6, -a * 0.1), ay = isoY(-a * 0.6, 0, -a * 0.1);
    st.color = 0xFF43A047; st.strokeWidth = k * 0.05;
    seaPath.reset(); seaPath.moveTo(ax, ay);
    seaPath.quadTo(ax + Math.sin(time * 2 + seed) * k * 0.15, ay - k * 0.3, ax + Math.sin(time * 2 + seed + 1) * k * 0.1, ay - k * 0.6);
    canvas.drawPath(seaPath, st);
  }
}

function drawWhalePlatform(canvas, pl) {
  const s = k * pl.half * 1.05, p = seaPaint;
  drawWhale(canvas, 0, -s * 0.05, s, 1);
  for (let i = 0; i < 4; i++) {
    const q = (time * 0.8 + i * 0.25) % 1;
    p.color = Color.argb(Math.round(180 * (1 - q)), 220, 245, 255);
    canvas.drawCircle(s * 0.68 + Math.sin(q * 6 + i) * k * 0.05, -q * k * 1.2, k * (0.04 + 0.04 * q), p);
  }
}

function drawUnderwaterBackdrop(canvas) {
  if (!inSea()) return false;
  const dt = sea.lastT < 0 ? 0 : Math.min(0.1, time - sea.lastT);
  sea.lastT = time;
  drawSeaScene(canvas, -camX, 1, dt);
  return true;
}

function seaRand(n, salt) { const v = Math.sin(n * 12.9898 + salt * 78.233) * 43758.547; return v - Math.floor(v); }

function drawSeaScene(canvas, scrollX, alpha, dt) {
  const p = seaPaint, a = Math.round(255 * alpha), path = seaPath;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, 0x4F, 0xC3, 0xE8), Color.argb(a, 0x0B, 0x2E, 0x5C));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  for (let i = 0; i < 5; i++) {
    const x0 = w * (0.1 + 0.22 * i) + Math.sin(time * 0.4 + i) * w * 0.04;
    path.reset(); path.moveTo(x0, 0); path.lineTo(x0 + w * 0.08, 0); path.lineTo(x0 + w * 0.2, h * 0.75); path.lineTo(x0 + w * 0.05, h * 0.75); path.close();
    p.color = Color.argb(Math.round(28 * alpha), 255, 255, 230); canvas.drawPath(path, p);
  }
  p.color = Color.argb(a, 34, 74, 110);
  seaOval.set(-w * 0.2, h * 0.68, w * 0.6, h * 0.9); canvas.drawOval(seaOval, p);
  seaOval.set(w * 0.4, h * 0.7, w * 1.3, h * 0.92); canvas.drawOval(seaOval, p);
  p.color = Color.argb(a, 214, 190, 140); canvas.drawRect(0, h * 0.84, w, h, p);
  p.color = Color.argb(a, 196, 170, 120);
  seaOval.set(-w * 0.1, h * 0.81, w * 0.5, h * 0.88); canvas.drawOval(seaOval, p);
  seaOval.set(w * 0.45, h * 0.82, w * 1.15, h * 0.89); canvas.drawOval(seaOval, p);
  const sp = w * 0.13, shift = scrollX * 0.06;
  for (let slot = Math.floor((-w * 0.1 - shift) / sp); slot * sp + shift < w * 1.1; slot++) {
    const x = slot * sp + shift + (seaRand(slot, 1) - 0.5) * sp * 0.6, hh = h * (0.08 + 0.1 * seaRand(slot, 2));
    seaStroke.strokeWidth = w * (0.01 + 0.008 * seaRand(slot, 3));
    seaStroke.color = seaRand(slot, 4) < 0.5 ? Color.argb(a, 46, 125, 80) : Color.argb(a, 80, 160, 90);
    path.reset(); path.moveTo(x, h * 0.86);
    path.quadTo(x + Math.sin(time * 1.5 + slot) * w * 0.03, h * 0.86 - hh * 0.5, x + Math.sin(time * 1.5 + slot + 1) * w * 0.04, h * 0.86 - hh);
    canvas.drawPath(path, seaStroke);
  }
  updateCreatures(dt);
  for (const c of sea.creatures) drawCreature(canvas, c, alpha);
  for (let i = 0; i < 14; i++) {
    const q = (time * 0.12 * (0.6 + (i % 4) * 0.2) + i * 0.137) % 1;
    seaStroke.strokeWidth = w * 0.003; seaStroke.color = Color.argb(Math.round(160 * alpha * (1 - q * 0.5)), 220, 245, 255);
    canvas.drawCircle(((i * 0.618) % 1) * w + Math.sin(time * 2 + i) * w * 0.01, h * 0.9 - q * h, w * (0.006 + 0.005 * (i % 3)), seaStroke);
  }
}

function updateCreatures(dt) {
  sea.creatures = sea.creatures.filter((c) => { c[1] += c[3] * dt; return c[1] >= -w * 0.25 && c[1] <= w * 1.25; });
  while (sea.creatures.length < 14) sea.creatures.push(newCreature(sea.lastT > 0 && sea.creatures.length > 6));
}

// type : 0 poisson, 1 hippocampe, 2 tortue, 3 étoile de mer, 4 petite méduse, 5 crabe
function newCreature(fromEdge) {
  const type = rndInt(6), ltr = rnd() < 0.5;
  const size = w * (type === 2 ? 0.06 + rnd() * 0.05 : type === 3 || type === 5 ? 0.025 + rnd() * 0.025 : 0.02 + rnd() * 0.035);
  const speed = w * (type === 0 ? 0.05 + rnd() * 0.08 : type === 2 ? 0.02 + rnd() * 0.02 : type === 3 ? 0.004 : type === 5 ? 0.012 : 0.012 + rnd() * 0.02);
  const y = type === 3 || type === 5 ? h * (0.86 + rnd() * 0.08) : h * (0.1 + rnd() * 0.62);
  const x = fromEdge ? (ltr ? -w * 0.2 : w * 1.2) : rnd() * w;
  return [type, x, y, ltr ? speed : -speed, size, rndInt(SEA_COLORS.length), rnd() * 6];
}

function drawCreature(canvas, c, alpha) {
  const p = seaPaint, st = seaStroke, path = seaPath, x = c[1], s = c[4], dir = c[3] >= 0 ? 1 : -1, col = SEA_COLORS[c[5]];
  const a = Math.round(230 * alpha), y = c[2] + Math.sin(time * 1.5 + c[6]) * s * 0.3;
  const C = (cc) => Color.argb(a, Color.red(cc), Color.green(cc), Color.blue(cc));
  p.color = C(col);
  canvas.save(); canvas.scale(dir, 1, x, y);
  switch (c[0]) {
    case 0: {
      seaOval.set(x - s, y - s * 0.5, x + s, y + s * 0.5); canvas.drawOval(seaOval, p);
      const wag = Math.sin(time * 10 + c[6]) * s * 0.15;
      path.reset(); path.moveTo(x - s * 0.8, y); path.lineTo(x - s * 1.6, y - s * 0.5 + wag); path.lineTo(x - s * 1.6, y + s * 0.5 + wag); path.close(); canvas.drawPath(path, p);
      p.color = Color.argb(a, 255, 255, 255); canvas.drawCircle(x + s * 0.55, y - s * 0.12, s * 0.16, p);
      p.color = Color.argb(a, 20, 20, 20); canvas.drawCircle(x + s * 0.6, y - s * 0.12, s * 0.08, p);
      break;
    }
    case 1:
      canvas.drawCircle(x, y - s * 0.6, s * 0.35, p);
      path.reset(); path.moveTo(x + s * 0.25, y - s * 0.7); path.lineTo(x + s * 0.8, y - s * 0.6); path.lineTo(x + s * 0.25, y - s * 0.45); path.close(); canvas.drawPath(path, p);
      seaOval.set(x - s * 0.35, y - s * 0.4, x + s * 0.3, y + s * 0.5); canvas.drawOval(seaOval, p);
      st.strokeWidth = s * 0.22; st.color = p.color;
      seaOval.set(x - s * 0.5, y + s * 0.3, x + s * 0.1, y + s * 0.9); canvas.drawArc(seaOval, 270, 270, false, st);
      p.color = Color.argb(a, 20, 20, 20); canvas.drawCircle(x + s * 0.1, y - s * 0.68, s * 0.07, p);
      break;
    case 2: drawTurtle(canvas, x, y, s, col, alpha, c[6]); break;
    case 3:
      canvas.rotate(time * 10 + c[6] * 50, x, y);
      path.reset();
      for (let i = 0; i < 10; i++) {
        const ang = -1.5708 + i * 0.6283, r = i % 2 === 0 ? s : s * 0.42;
        if (i === 0) path.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); else path.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      }
      path.close(); canvas.drawPath(path, p);
      break;
    case 4: {
      const pulse = 1 + 0.15 * Math.sin(time * 4 + c[6]);
      p.color = Color.argb(Math.round(170 * alpha), Color.red(col), Color.green(col), Color.blue(col));
      seaOval.set(x - s * 0.6 * pulse, y - s * 0.6, x + s * 0.6 * pulse, y + s * 0.3); canvas.drawArc(seaOval, 180, 180, true, p);
      st.strokeWidth = s * 0.08; st.color = p.color;
      for (let i = -1; i <= 1; i++) canvas.drawLine(x + i * s * 0.3, y - s * 0.15, x + i * s * 0.3 + Math.sin(time * 3 + i) * s * 0.15, y + s * 0.8, st);
      break;
    }
    default:
      p.color = Color.argb(a, 239, 83, 80);
      seaOval.set(x - s * 0.7, y - s * 0.4, x + s * 0.7, y + s * 0.35); canvas.drawOval(seaOval, p);
      st.strokeWidth = s * 0.1; st.color = p.color;
      for (const i of [-1, 1]) { canvas.drawLine(x + i * s * 0.5, y, x + i * s * 0.95, y + s * 0.35, st); canvas.drawCircle(x + i * s * 0.9, y - s * 0.45, s * 0.22, p); }
      p.color = Color.argb(a, 20, 20, 20); canvas.drawCircle(x - s * 0.18, y - s * 0.45, s * 0.07, p); canvas.drawCircle(x + s * 0.18, y - s * 0.45, s * 0.07, p);
  }
  canvas.restore();
}

function drawWhaleOverlay(canvas) {
  const p = seaPaint;
  if (state === State.WHALE && sea.phase === 0) {
    const q = clamp(sea.t / SEA_SPOUT, 0, 1), e = q * q * (3 - 2 * q), s = k * 1.1;
    const wx = sea.wx - s * 0.7, wy = h * 1.1 + (sea.wy + k * 0.6 - h * 1.1) * e;
    if (sea.t > SEA_SPOUT) drawSpout(canvas, sea.wx, sea.wy + k * 0.3, sea.wy + k * 0.3 - (sy(px, py, pz) - k * 0.2), s, 1);
    drawWhale(canvas, wx, wy, s, 1);
  }
  if (state === State.WHALE_OUT && sea.phase === 0 && sea.t > 0.4) {
    drawSpout(canvas, sea.wx + k * 0.75, sea.wy, Math.max(k * 0.5, sea.wy - sy(px, py, pz)), k * 1.1, clamp((sea.t - 0.4) / 0.2, 0, 1));
  }
  if (sea.veil <= 0.01) return;
  if (state === State.WHALE) {
    if (sea.phase === 1) {
      const t = sea.t / SEA_DIVE;
      p.color = Color.WHITE;
      p.shader = new LinearGradient(0, 0, 0, h, Theme.lerp(0xFFBDE8FF, 0xFF4FC3E8, t), Theme.lerp(0xFF4FC3E8, 0xFF0B2E5C, t));
      canvas.drawRect(0, 0, w, h, p);
      p.shader = null;
      for (let i = 0; i < 24; i++) {
        const q = (sea.t * (0.6 + (i % 5) * 0.15) + i * 0.137) % 1;
        seaStroke.strokeWidth = w * 0.003; seaStroke.color = Color.argb(Math.round(200 * (1 - q)), 230, 248, 255);
        canvas.drawCircle(((i * 0.618) % 1) * w, h * (1 - q), w * (0.008 + 0.008 * (i % 3)), seaStroke);
      }
      const cx = w / 2, cy = h * 0.45 + t * h * 0.1;
      canvas.save(); canvas.rotate(sea.t * 140, cx, cy - k * 0.5); canvas.scale(1.6, 1.6, cx, cy - k * 0.5);
      drawCharacter(canvas, cx, cy, 0, 1, 1, true, sea.t < 1.2, true);
      canvas.restore();
      drawBubble(canvas, cx, cy - k * 2, tr(sea.t < 1.2 ? 'whale.help' : 'whale.wow'));
    } else drawSeaScene(canvas, 0, sea.veil, 0);
  } else if (state === State.WHALE_OUT) {
    const sky = Theme.sky(score), a = Math.round(255 * sea.veil);
    p.color = Color.WHITE;
    p.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, Color.red(sky.top), Color.green(sky.top), Color.blue(sky.top)), Color.argb(a, Color.red(sky.bottom), Color.green(sky.bottom), Color.blue(sky.bottom)));
    canvas.drawRect(0, 0, w, h, p);
    p.shader = null;
    if (sea.phase === 0) {
      const cx = w / 2, cy = h * 0.45;
      drawSpout(canvas, cx, h * 1.05, h * 1.05 - cy - k * 0.3, k * 1.4, sea.veil);
      canvas.save(); canvas.rotate((sea.t * 300) % 360, cx, cy - k * 0.5); canvas.scale(1.6, 1.6, cx, cy - k * 0.5);
      drawCharacter(canvas, cx, cy, 0, 1, 1, true, false, true);
      canvas.restore();
      if (sea.t > 1.4) drawBubble(canvas, cx, cy - k * 1.9, tr('island.yay'));
    }
  }
}

/** Tortue de mer de profil : carapace bombée à écailles, tête arrondie, nageoires qui battent. */
function drawTurtle(canvas, x, y, s, col, alpha, seed) {
  const p = seaPaint, path = seaPath, st = seaStroke, a = Math.round(255 * alpha);
  const shell = Theme.lerp(col, 0xFF5D7A3A, 0.55), skin = Theme.lerp(col, 0xFF8BC34A, 0.75), dark = shade(skin, 0.7);
  const C = (v) => Color.argb(a, Color.red(v), Color.green(v), Color.blue(v));
  const flap = Math.sin(time * 2.6 + seed);
  const flipper = (bx, by, len, wid, ang, color) => {
    canvas.save(); canvas.rotate(ang, bx, by);
    path.reset(); path.moveTo(bx, by - wid * 0.5);
    path.quadTo(bx - len * 0.45, by - wid * 0.9, bx - len, by + wid * 0.15);
    path.quadTo(bx - len * 0.55, by + wid * 0.55, bx, by + wid * 0.5); path.close();
    p.color = C(color); canvas.drawPath(path, p);
    canvas.restore();
  };
  flipper(x + s * 0.3, y + s * 0.1, s * 0.8, s * 0.3, -35 - flap * 22, dark);
  flipper(x - s * 0.6, y + s * 0.15, s * 0.42, s * 0.2, -20 + flap * 15, dark);
  p.color = C(skin);
  seaOval.set(x + s * 0.55, y - s * 0.22, x + s * 1.05, y + s * 0.18); canvas.drawOval(seaOval, p);
  seaOval.set(x + s * 0.85, y - s * 0.3, x + s * 1.38, y + s * 0.12); canvas.drawOval(seaOval, p);
  p.color = C(dark); canvas.drawCircle(x + s * 1.0, y - s * 0.18, s * 0.04, p); canvas.drawCircle(x + s * 0.9, y - s * 0.05, s * 0.035, p);
  p.color = Color.argb(a, 255, 255, 255); canvas.drawCircle(x + s * 1.18, y - s * 0.13, s * 0.085, p);
  p.color = Color.argb(a, 25, 25, 25); canvas.drawCircle(x + s * 1.2, y - s * 0.12, s * 0.05, p);
  p.color = Color.argb(a, 255, 255, 255); canvas.drawCircle(x + s * 1.215, y - s * 0.14, s * 0.018, p);
  st.strokeWidth = s * 0.03; st.color = C(dark);
  seaOval.set(x + s * 1.12, y - s * 0.08, x + s * 1.34, y + s * 0.06); canvas.drawArc(seaOval, 20, 110, false, st);
  p.color = C(Theme.lerp(skin, 0xFFFFF3C4, 0.55)); seaOval.set(x - s * 0.8, y - s * 0.1, x + s * 0.7, y + s * 0.18); canvas.drawOval(seaOval, p);
  p.color = C(shade(shell, 0.72)); seaOval.set(x - s * 0.9, y - s * 0.76, x + s * 0.8, y + s * 0.76); canvas.drawArc(seaOval, 180, 180, true, p);
  p.color = C(shell); seaOval.set(x - s * 0.84, y - s * 0.7, x + s * 0.74, y + s * 0.7); canvas.drawArc(seaOval, 180, 180, true, p);
  const scute = shade(shell, 1.18), edge = shade(shell, 0.7);
  const hex = (cx, cy, r) => {
    path.reset();
    for (let i = 0; i < 6; i++) { const ang = i * 1.0472, px0 = cx + Math.cos(ang) * r, py0 = cy + Math.sin(ang) * r * 0.75; if (i === 0) path.moveTo(px0, py0); else path.lineTo(px0, py0); }
    path.close();
    p.color = C(scute); canvas.drawPath(path, p);
    st.strokeWidth = s * 0.035; st.color = C(edge); canvas.drawPath(path, st);
  };
  hex(x - s * 0.42, y - s * 0.3, s * 0.2); hex(x - s * 0.03, y - s * 0.38, s * 0.22); hex(x + s * 0.36, y - s * 0.28, s * 0.18);
  hex(x - s * 0.62, y - s * 0.12, s * 0.11); hex(x - s * 0.23, y - s * 0.1, s * 0.12); hex(x + s * 0.16, y - s * 0.1, s * 0.12); hex(x + s * 0.5, y - s * 0.11, s * 0.1);
  p.color = Color.argb(Math.round(70 * alpha), 255, 255, 255); seaOval.set(x - s * 0.5, y - s * 0.6, x + s * 0.1, y - s * 0.42); canvas.drawOval(seaOval, p);
  flipper(x + s * 0.38, y + s * 0.06, s * 0.95, s * 0.34, -30 - flap * 28, skin);
}
