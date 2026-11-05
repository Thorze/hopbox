'use strict';
// Imprévu « Aigle » (équivalent de Forest.kt) : environ 1 partie sur 50, par beau temps ou temps
// nuageux. Un aigle attrape le joueur et l'emporte au-dessus d'une forêt ; il le lâche dans son nid.
// On saute de nid en nid (10 à 15 sauts) jusqu'à un arbre géant : un saut vers le tronc attrape
// la méga pièce cachée dans son creux, une branche renvoie le joueur dans le ciel habituel.

const PL_NEST = 6, PL_TRUNK = 7;
const FRS_SWOOP = 1.0, FRS_CARRY = 2.0, FRS_FLIGHT = 3.2, FRS_DROP = 6, NEST_COLOR = 0xFF9C6B3E;
const frs = { eagleAt: -1, active: false, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, carried: false, fromLeft: true, grabX: 0, grabY: 0, coinX: 0, coinY: 0, coinT: -1 };
const frsPaint = new Paint();
const frsStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const frsPath = new Path();
const frsOval = new RectF();

function inForest() { return frs.active; }

function scheduleEagle(on) {
  frs.eagleAt = on ? time + 10 + rnd() * 20 : -1;
}

function checkEagle() {
  if (frs.eagleAt < 0 || time < frs.eagleAt) return;
  if (state === State.GAME_OVER) { frs.eagleAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure()) { frs.eagleAt = time + 0.5; return; }
  frs.eagleAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  Object.assign(frs, { phase: 0, t: 0, carried: false, veil: 0, fromLeft: sx(px, pz) > w / 2, grabX: sx(px, pz), grabY: sy(px, shapeHeight(1), pz) });
  charge = 0; perfectStreak = 0;
  state = State.EAGLE;
  sounds.play('EAGLE');
  Stats.add('eagles');
}

function updateEagle(dt) {
  frs.t += dt;
  if (frs.phase === 0) {
    if (frs.t >= 0.2 && frs.t <= FRS_SWOOP) { scareT = scareDuration; scareKind = 0; }
    if (!frs.carried && frs.t >= FRS_SWOOP) { frs.carried = true; sounds.play('SCARE'); vibrate(120); shake(0.06); }
    frs.veil = clamp((frs.t - 1.5) / 0.5, 0, 1);
    if (frs.t >= FRS_CARRY) { frs.phase = 1; frs.t = 0; frs.veil = 1; }
  } else if (frs.phase === 1) {
    frs.veil = 1;
    if (frs.t >= FRS_FLIGHT) enterForest();
  } else {
    frs.veil = Math.max(0, 1 - frs.t / 0.5);
    frs.fallVy += 24 * dt;
    py -= frs.fallVy * dt;
    if (py <= 0) {
      py = 0; frs.veil = 0; landSquash = 1;
      spawnDust(px, pz); shake(0.06);
      sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('forest.title'), life: 3.2 });
      popups.push({ text: tr('forest.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.8 });
      state = State.READY;
    }
  }
}

function enterForest() {
  Object.assign(frs, { active: true, carried: false, total: 10 + rndInt(6), spawned: 0, phase: 2, t: 0, fallVy: 0 });
  weather = 0; strikeAt = -1; crashAt = -1; isl.cycloneAt = -1;
  platforms = [];
  current = new Platform(0, 0, 0.75, true, NEST_COLOR, Kind.NORMAL, true, PL_NEST);
  platforms.push(current);
  px = 0; pz = 0; py = FRS_DROP;
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
}

function spawnForest() {
  frs.spawned++;
  alongX = rnd() < 0.5;
  const final = frs.spawned >= frs.total, beforeFinal = frs.spawned === frs.total - 1;
  const half = final ? 1.0 : beforeFinal ? 0.45 : 0.55 + rnd() * 0.25;
  const dist = current.half + half + 0.45 + rnd() * (final ? 0.9 : 1.8);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, true, NEST_COLOR, Kind.NORMAL, alongX, final ? PL_TRUNK : PL_NEST);
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('forest.trunk'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    next.coin = rnd() < 0.25 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function startTrunkGrab() {
  Object.assign(frs, { phase: 0, t: 0, fallVy: 0, veil: 0, coinT: 0, coinX: sx(next.cx, next.cz) + camX, coinY: sy(next.cx, 0.85, next.cz) + camY });
  next.coin = 0; perfectStreak = 0;
  profile.coins = profile.coins + MEGA_COIN;
  coinsThisRun += MEGA_COIN;
  missionEvent(MissionType.COINS, MEGA_COIN);
  Stats.add('mega');
  popups.push({ text: `+${MEGA_COIN} 🪙`, x: frs.coinX, y: frs.coinY - k, life: 1.6 });
  spawnSparkles(frs.coinX, frs.coinY, Color.parseColor('#FFD54F'), 30);
  sounds.play('COIN'); sounds.play('UNLOCK'); sounds.play('JUMP', 1, 0.6);
  vibrate(120);
  banners.push({ text: tr('forest.back'), life: 3 });
  state = State.FOREST_OUT;
}

function updateForestOut(dt) {
  frs.t += dt;
  if (frs.coinT >= 0) frs.coinT += dt;
  if (frs.phase === 0) {
    py += (5 + frs.t * 26) * dt;
    frs.veil = clamp((frs.t - 0.6) / 0.4, 0, 1);
    if (frs.t >= 2.2) leaveForest();
  } else {
    frs.veil = Math.max(0, 1 - frs.t / 0.45);
    frs.fallVy += 30 * dt;
    py -= frs.fallVy * dt;
    if (py <= 0) { py = 0; frs.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leaveForest() {
  Object.assign(frs, { active: false, phase: 1, t: 0, fallVy: 0, coinT: -1 });
  platforms = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  px = 0; pz = 0; py = 7;
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
}

// eagleAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetForest() { frs.active = false; frs.carried = false; frs.veil = 0; frs.coinT = -1; }
function forestFallReason() { return inForest() ? tr('reason.forest') : null; }

// ---------- Dessin ----------

function frsGlow(canvas, x, y, r, a, cr, cg, cb) {
  for (let i = 5; i >= 1; i--) { frsPaint.color = Color.argb(Math.round(a / 5), cr, cg, cb); canvas.drawCircle(x, y, r * i / 5, frsPaint); }
}

function drawForestBackdrop(canvas) {
  if (!inForest()) return false;
  drawForestScene(canvas, -camX, 1);
  return true;
}

function drawForestScene(canvas, scrollX, alpha) {
  const p = frsPaint, a = Math.round(255 * alpha), A = (c) => Color.argb(a, Color.red(c), Color.green(c), Color.blue(c));
  p.color = Color.argb(a, 255, 255, 255);
  p.shader = new LinearGradient(0, 0, 0, h * 0.6, A(0xFF8FD3F4), A(0xFFE9F7DC));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  frsGlow(canvas, w * 0.8, h * 0.12, w * 0.2, 150 * alpha, 255, 247, 200);
  p.color = Color.argb(a, 255, 228, 120); canvas.drawCircle(w * 0.8, h * 0.12, w * 0.065, p);
  const path = frsPath, mBase = h * 0.42;
  path.reset(); path.moveTo(0, mBase);
  let x = -w * 0.5 + (scrollX * 0.01) % (w * 0.5), up = true;
  while (x < w * 1.5) { path.lineTo(x, up ? mBase - h * 0.09 - (Math.floor(x / w * 7) % 3) * h * 0.02 : mBase - h * 0.02); x += w * 0.17; up = !up; }
  path.lineTo(w, mBase); path.lineTo(w, h); path.lineTo(0, h); path.close();
  p.color = Color.argb(a, 166, 190, 205); canvas.drawPath(path, p);
  const cols = [0xFF6E9C8A, 0xFF3E7A5A, 0xFF24563C];
  for (let layer = 0; layer < 3; layer++) {
    const baseY = h * (0.47 + 0.15 * layer), th = w * (0.11 + 0.06 * layer), sp = w * (0.085 + 0.05 * layer);
    const off = (((scrollX * (0.03 + 0.04 * layer)) % sp) + sp) % sp, c = cols[layer];
    p.color = A(c); canvas.drawRect(0, baseY, w, h, p);
    let tx = -sp + off, i = 0;
    while (tx < w + sp) { drawFir(canvas, tx, baseY + th * 0.15, th * (0.85 + 0.3 * (((i * 37 + layer * 11) % 7) / 6)), c, a); tx += sp; i++; }
    if (layer < 2) {
      p.shader = new LinearGradient(0, baseY + h * 0.02, 0, baseY + h * 0.1, Color.argb(0, 255, 255, 255), Color.argb(Math.round(90 * alpha), 255, 255, 255));
      canvas.drawRect(0, baseY + h * 0.02, w, baseY + h * 0.1, p);
      p.shader = null;
    }
  }
  for (let i = 0; i < 12; i++) {
    const q = (time * 0.07 + i * 0.137) % 1;
    const lx = ((((i * 0.618) % 1) * w + Math.sin(time * 1.3 + i) * w * 0.05 + scrollX * 0.05) % w + w) % w;
    const ly = q * h * 1.1 - h * 0.05;
    canvas.save(); canvas.rotate(time * 90 + i * 40, lx, ly);
    p.color = i % 3 === 0 ? Color.argb(a, 230, 150, 60) : Color.argb(a, 120, 175, 80);
    frsOval.set(lx - w * 0.012, ly - w * 0.006, lx + w * 0.012, ly + w * 0.006); canvas.drawOval(frsOval, p);
    canvas.restore();
  }
}

function drawFir(canvas, x, baseY, hgt, color, a) {
  for (let tier = 0; tier < 3; tier++) {
    const top = baseY - hgt + tier * hgt * 0.28, bot = top + hgt * 0.5, half = hgt * (0.2 + 0.08 * tier);
    const c = shade(color, 1 + 0.06 * (2 - tier));
    frsPaint.color = Color.argb(a, Color.red(c), Color.green(c), Color.blue(c));
    frsPath.reset(); frsPath.moveTo(x, top); frsPath.lineTo(x + half, bot); frsPath.lineTo(x - half, bot); frsPath.close();
    canvas.drawPath(frsPath, frsPaint);
  }
}

/** Nid de branchages posé sur la cime d'un sapin (canvas placé au centre du dessus). */
function drawNest(canvas, pl) {
  const rx = 1.2247449 * k * pl.half, ry = 0.70710677 * k * pl.half, seed = Math.abs(Math.trunc(pl.cx * 13 + pl.cz * 7));
  const p = frsPaint, path = frsPath;
  p.shader = null;
  p.color = 0xFF5D4037; canvas.drawRect(-k * 0.12, ry, k * 0.12, k * 6, p);
  for (let i = 0; i < 3; i++) {
    const top = ry * 0.6 + i * k * 0.75, half = rx * (0.95 + 0.35 * i);
    p.color = shade(0xFF2E6B47, 1.08 - 0.1 * i);
    path.reset(); path.moveTo(0, top - k * 0.2); path.lineTo(half, top + k * 1.05); path.lineTo(-half, top + k * 1.05); path.close();
    canvas.drawPath(path, p);
  }
  p.color = 0xFF6E4A2A; frsOval.set(-rx * 1.12, -ry * 0.6, rx * 1.12, ry * 1.35 + k * 0.16); canvas.drawOval(frsOval, p);
  p.color = 0xFF9C6B3E; frsOval.set(-rx * 1.12, -ry * 1.12, rx * 1.12, ry * 1.12); canvas.drawOval(frsOval, p);
  p.color = 0xFF5E3D22; frsOval.set(-rx * 0.8, -ry * 0.8, rx * 0.8, ry * 0.8); canvas.drawOval(frsOval, p);
  p.color = 0xFF7A5230; frsOval.set(-rx * 0.62, -ry * 0.5, rx * 0.62, ry * 0.7); canvas.drawOval(frsOval, p);
  frsStroke.strokeWidth = k * 0.025;
  for (let i = 0; i < 18; i++) {
    const ang = i * 0.35 + seed * 0.7, r0 = 0.95 + 0.12 * ((i * 5 + seed) % 3) / 2;
    const x0 = Math.cos(ang) * rx * r0, y0 = Math.sin(ang) * ry * r0, tx = -Math.sin(ang) * rx * 0.28, ty = Math.cos(ang) * ry * 0.28;
    frsStroke.color = i % 2 === 0 ? 0xFFC89B5F : 0xFF8A5A30;
    canvas.drawLine(x0 - tx, y0 - ty + k * 0.02, x0 + tx, y0 + ty - k * 0.02, frsStroke);
  }
  if (seed % 3 !== 0) {
    for (let e = 0; e < 2; e++) {
      const ex = e === 0 ? -rx * 0.38 : rx * 0.05, ey = e === 0 ? -ry * 0.4 : -ry * 0.55;
      p.color = 0xFFDCEFF5; frsOval.set(ex - k * 0.09, ey - k * 0.12, ex + k * 0.09, ey + k * 0.08); canvas.drawOval(frsOval, p);
      p.color = 0x99FFFFFF; frsOval.set(ex - k * 0.05, ey - k * 0.09, ex - k * 0.01, ey - k * 0.03); canvas.drawOval(frsOval, p);
    }
  }
}

/** Arbre géant : tronc, creux lumineux (la méga pièce y est dessinée par la plateforme) et feuillage. */
function drawGiantTree(canvas) {
  const p = frsPaint, r = k * 1.15, top = -k * 4.6, path = frsPath;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(-r, 0, r, 0, [0xFF8D6240, 0xFF6D4A2E, 0xFF4A3020], null);
  canvas.drawRect(-r, top, r, h, p);
  p.shader = null;
  frsStroke.strokeWidth = k * 0.04; frsStroke.color = 0x55301C10;
  for (let i = 0; i < 7; i++) {
    const x0 = -r + (i + 0.5) * r * 2 / 7;
    path.reset(); path.moveTo(x0, top);
    for (let y = top; y < h; y += k * 0.5) path.lineTo(x0 + Math.sin(y * 0.05 + i) * k * 0.06, y);
    canvas.drawPath(path, frsStroke);
  }
  p.color = 0xFF5D4037;
  for (const side of [-1, 1]) {
    const by = -k * (2.6 + (side < 0 ? 0.4 : 0));
    path.reset(); path.moveTo(side * r * 0.8, by);
    path.quadTo(side * r * 2.0, by - k * 0.5, side * r * 2.9, by - k * 1.1);
    path.lineTo(side * r * 2.9, by - k * 0.9);
    path.quadTo(side * r * 2.0, by - k * 0.1, side * r * 0.8, by + k * 0.4);
    path.close(); canvas.drawPath(path, p);
  }
  const greens = [0xFF2E7D32, 0xFF388E3C, 0xFF43A047, 0xFF2E6B47];
  [[0, -6.2, 1.9], [-1.6, -5.4, 1.4], [1.7, -5.5, 1.5], [-2.6, -4.1, 1.0], [2.7, -4.2, 1.05], [-0.8, -4.6, 1.2], [0.9, -4.5, 1.2]].forEach((b, i) => {
    p.color = greens[i % greens.length];
    canvas.drawCircle(b[0] * r, b[1] * k + Math.sin(time * 1.2 + i) * k * 0.03, b[2] * r, p);
  });
  const hy = -k * 0.85;
  p.color = 0xFF2B1A0E; frsOval.set(-r * 0.55, hy - k * 0.6, r * 0.55, hy + k * 0.55); canvas.drawOval(frsOval, p);
  frsGlow(canvas, 0, hy, r * 0.6, 150, 255, 210, 90);
  frsStroke.strokeWidth = k * 0.06; frsStroke.color = 0xFF7A5230; canvas.drawOval(frsOval, frsStroke);
}

/** L'aigle : ailes qui battent, tête blanche, bec jaune, serres. (x, y) = centre du corps. */
function drawEagle(canvas, x, y, s, dir) {
  const p = frsPaint, path = frsPath, flap = Math.sin(time * 11);
  p.shader = null;
  canvas.save(); canvas.scale(dir, 1, x, y);
  for (let front = 0; front < 2; front++) {
    const tipY = y - s * (0.2 + 0.9 * flap) + (front === 0 ? -s * 0.15 : 0);
    p.color = front === 0 ? 0xFF4E342E : 0xFF6D4C41;
    path.reset();
    path.moveTo(x - s * 0.15, y - s * 0.1);
    path.quadTo(x - s * 0.6, tipY - s * 0.2, x - s * 1.6, tipY);
    path.lineTo(x - s * 1.35, tipY + s * 0.18); path.lineTo(x - s * 1.45, tipY + s * 0.3);
    path.lineTo(x - s * 1.15, tipY + s * 0.32); path.lineTo(x - s * 1.2, tipY + s * 0.45);
    path.quadTo(x - s * 0.6, y + s * 0.15, x + s * 0.15, y + s * 0.1);
    path.close(); canvas.drawPath(path, p);
  }
  p.color = Color.WHITE;
  path.reset(); path.moveTo(x - s * 0.45, y); path.lineTo(x - s * 0.95, y - s * 0.15); path.lineTo(x - s * 0.95, y + s * 0.2); path.close();
  canvas.drawPath(path, p);
  p.color = 0xFF5D4037; frsOval.set(x - s * 0.55, y - s * 0.25, x + s * 0.45, y + s * 0.28); canvas.drawOval(frsOval, p);
  frsStroke.strokeWidth = s * 0.07; frsStroke.color = 0xFFFFC93C;
  canvas.drawLine(x - s * 0.05, y + s * 0.2, x - s * 0.1, y + s * 0.45, frsStroke);
  canvas.drawLine(x + s * 0.15, y + s * 0.2, x + s * 0.12, y + s * 0.45, frsStroke);
  p.color = Color.WHITE; canvas.drawCircle(x + s * 0.52, y - s * 0.2, s * 0.24, p);
  p.color = 0xFFFFB300;
  path.reset(); path.moveTo(x + s * 0.68, y - s * 0.27); path.quadTo(x + s * 0.98, y - s * 0.25, x + s * 0.9, y - s * 0.06); path.lineTo(x + s * 0.68, y - s * 0.12); path.close();
  canvas.drawPath(path, p);
  p.color = 0xFF1B1B1B; canvas.drawCircle(x + s * 0.58, y - s * 0.26, s * 0.045, p);
  canvas.restore();
}

function drawCarriedPlayer(canvas, x, talonY, scale) {
  canvas.save();
  canvas.rotate(Math.sin(time * 9) * 14, x, talonY);
  canvas.scale(scale, scale, x, talonY);
  drawCharacter(canvas, x, talonY - isoY(0, shapeHeight(1), 0), 0, 1, 1, true, true, true);
  canvas.restore();
}

function drawEagleOverlay(canvas) {
  const p = frsPaint;
  if (state === State.EAGLE && frs.phase === 0) {
    const t = frs.t, dir = frs.fromLeft ? 1 : -1, s = k * 0.9, gx = frs.grabX, gy = frs.grabY - s * 0.45;
    const sx0 = frs.fromLeft ? -w * 0.3 : w * 1.3;
    let ex, ey;
    if (t < FRS_SWOOP) {
      const q = t / FRS_SWOOP, e = q * q * (3 - 2 * q);
      ex = sx0 + (gx - sx0) * e;
      ey = -h * 0.1 + (gy + h * 0.1) * e - Math.sin(q * Math.PI) * h * 0.12;
      if (q < 0.5) {
        p.color = Color.argb(Math.max(0, Math.round(60 * Math.sin(q * 2 * Math.PI))), 0, 0, 0);
        frsOval.set(ex - w * 0.3, h * 0.5, ex + w * 0.3, h * 0.62); canvas.drawOval(frsOval, p);
      }
    } else {
      const q = (t - FRS_SWOOP) / (FRS_CARRY - FRS_SWOOP);
      ex = gx + dir * q * q * w * 0.7; ey = gy - q * q * h * 0.8;
      drawCarriedPlayer(canvas, ex, ey + s * 0.42, 1);
    }
    drawEagle(canvas, ex, ey, s, dir);
    if (t >= FRS_SWOOP && t < FRS_SWOOP + 0.6) drawBubble(canvas, ex, ey - s * 0.9, tr('forest.help'));
  }
  if (frs.veil > 0.01) {
    if (state === State.EAGLE) {
      drawForestScene(canvas, frs.phase === 1 ? frs.t * w * 0.9 : 0, frs.veil);
      if (frs.phase === 1) {
        const cx = w * 0.5, cy = h * 0.3 + Math.sin(frs.t * 3) * h * 0.02, s = k * 1.3;
        drawCarriedPlayer(canvas, cx, cy + s * 0.42, 1.4);
        drawEagle(canvas, cx, cy, s, 1);
        drawBubble(canvas, cx, cy - s * 1.2, tr(frs.t < 1.6 ? 'forest.help' : 'forest.wow'));
      }
    } else if (state === State.FOREST_OUT) {
      const sky = Theme.sky(score), a = Math.round(255 * frs.veil);
      p.color = Color.WHITE;
      p.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, Color.red(sky.top), Color.green(sky.top), Color.blue(sky.top)), Color.argb(a, Color.red(sky.bottom), Color.green(sky.bottom), Color.blue(sky.bottom)));
      canvas.drawRect(0, 0, w, h, p);
      p.shader = null;
      frsStroke.strokeWidth = w * 0.004;
      for (let i = 0; i < 16; i++) {
        const x = w * ((i * 0.618) % 1), len = h * 0.13;
        const y = ((((i * 0.37) * h + frs.t * h * 2.2) % (h + len)) + h + len) % (h + len) - len;
        frsStroke.color = Color.argb(Math.round(110 * frs.veil), 255, 255, 255);
        canvas.drawLine(x, y, x, y + len, frsStroke);
      }
      if (frs.phase === 0) {
        const cx = w / 2, cy = h * 0.5;
        canvas.save(); canvas.rotate((frs.t * 260) % 360, cx, cy - k * 0.5); canvas.scale(1.6, 1.6, cx, cy - k * 0.5);
        drawCharacter(canvas, cx, cy, 0, 1, 1, true, false, true);
        canvas.restore();
        if (frs.t > 0.8) drawBubble(canvas, cx, cy - k * 1.9, tr('island.yay'));
      }
    }
  }
  if (state === State.FOREST_OUT && frs.coinT >= 0 && frs.coinT <= 0.6) {
    const q = frs.coinT / 0.6;
    p.color = Color.argb(Math.round(200 * (1 - q)), 255, 214, 80);
    canvas.drawCircle(frs.coinX - camX, frs.coinY - camY, k * (0.5 + q * 1.5), p);
  }
}
