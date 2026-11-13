'use strict';
// Imprévu « Nucléaire » (équivalent de Nuclear.kt) : le sol tremble, un champignon atomique s'élève,
// le souffle emporte le personnage dans une ZONE RADIOACTIVE (barils dans un lac de liquide vert, bulles).
// 20 à 25 sauts plus loin, on saute DANS la tour de refroidissement de la centrale (méga pièce) :
// le panache de vapeur le propulse dans le ciel habituel.

const PL_BARREL = 18, PL_PLANT = 19;
const NUK_RUMBLE = 0.8, NUK_BLAST = 3.0, NUK_BLOWN = 2.6, NUK_PLUME = 3.2, NUK_SHOT = 0.6;
const NUK_WATER = 1.0, BARREL_H = 2.8, TOWER_H = 3.8;
const BARREL_YELLOW = 0xFFFFC928, BARREL_GREEN = 0xFF8BC34A;
const nuk = { nukeAt: -1, active: false, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, coinX: 0, coinY: 0, side: 1 };
const nukPaint = new Paint();
const nukStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const nukPath = new Path();
const nukOval = new RectF();

function inNuke() { return nuk.active; }
function scheduleNuke(on) { nuk.nukeAt = on ? time + 10 + rnd() * 15 : -1; }

function checkNuke() {
  if (nuk.nukeAt < 0 || time < nuk.nukeAt) return;
  if (state === State.GAME_OVER) { nuk.nukeAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure()) { nuk.nukeAt = time + 0.5; return; }
  nuk.nukeAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  Object.assign(nuk, { phase: 0, t: 0, veil: 0, fallVy: 0, side: rnd() < 0.5 ? 1 : -1 });
  charge = 0; perfectStreak = 0;
  state = State.NUKE;
  sounds.play('VOLCANO', 0.8); sounds.play('ALARM', 0.45); vibrate(120);   // grondement et alerte nucléaire
  Stats.add('nukes');
}

function updateNuke(dt) {
  const prev = nuk.t;
  nuk.t += dt;
  if (nuk.phase === 0) {
    const t = nuk.t;
    // Le sol tremble de plus en plus, puis très fort après l'éclair
    shake(t < NUK_RUMBLE ? 0.02 + 0.05 * t / NUK_RUMBLE : 0.12);
    if (t >= 0.3 && t <= 2.4) { scareT = scareDuration; scareKind = 0; }
    if (prev < NUK_RUMBLE && t >= NUK_RUMBLE) { sounds.play('EXPLOSION'); vibrate(200); }
    // L'onde de choc arrive : le personnage est soulevé
    if (t > 2.55) py += (4 + (t - 2.55) * 30) * dt;
    nuk.veil = clamp((t - 2.6) / 0.4, 0, 1);
    if (t >= NUK_BLAST) { nuk.phase = 1; nuk.t = 0; nuk.veil = 1; sounds.play('FALL', 0.7); }
  } else if (nuk.phase === 1) {
    nuk.veil = 1;
    if (nuk.t >= NUK_BLOWN) enterNuke();
  } else {
    nuk.veil = Math.max(0, 1 - nuk.t / 0.5);
    nuk.fallVy += 22 * dt; py -= nuk.fallVy * dt;
    if (py <= 0) {
      py = 0; nuk.veil = 0; landSquash = 1;
      spawnDust(px, pz); sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('nuke.title'), life: 3.2 });
      popups.push({ text: tr('nuke.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2 });
      state = State.READY;
    }
  }
}

function enterNuke() {
  Object.assign(nuk, { active: true, total: 20 + rndInt(6), spawned: 0, phase: 2, t: 0, fallVy: 0 });
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1; bas.heliAt = -1; aln.ufoAt = -1; sea.whaleAt = -1; pol.blizzardAt = -1;
  ice.next = false;
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.75, true, BARREL_YELLOW, Kind.NORMAL, true, PL_BARREL);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 6;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

/** Zone radioactive : barils ronds plus petits, certains dérivent sur le liquide, puis la centrale. */
function spawnNuke() {
  nuk.spawned++;
  alongX = rnd() < 0.5;
  const final = nuk.spawned >= nuk.total;
  const drifting = !final && nuk.spawned > 2 && nuk.spawned < nuk.total - 1 && rnd() < 0.3;
  const half = final ? 0.85 : drifting ? 0.55 + rnd() * 0.1 : 0.42 + rnd() * 0.18;
  const dist = current.half + half + 0.5 + rnd() * (final ? 1.3 : 2.0);
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, true,
    drifting ? BARREL_GREEN : BARREL_YELLOW, drifting ? Kind.MOVING : Kind.NORMAL, alongX, final ? PL_PLANT : PL_BARREL);
  if (drifting) next.moveSpeed = 1.1 + rnd() * 0.6;
  if (final) {
    next.coin = MEGA_COIN;
    popups.push({ text: tr('nuke.plant'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    next.coin = rnd() < 0.22 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  trimPlatforms();
}

/** Saut dans la tour de la centrale : la méga pièce, puis le panache de vapeur. */
function startNukeOut() {
  Object.assign(nuk, { phase: 0, t: 0, fallVy: 0, veil: 0, coinX: sx(next.cx, next.cz) + camX, coinY: sy(next.cx, 0.85, next.cz) + camY });
  px = next.cx; pz = next.cz;
  next.coin = 0; perfectStreak = 0;
  profile.coins = profile.coins + MEGA_COIN;
  coinsThisRun += MEGA_COIN;
  missionEvent(MissionType.COINS, MEGA_COIN);
  Stats.add('mega');
  popups.push({ text: `+${MEGA_COIN} 🪙`, x: nuk.coinX, y: nuk.coinY - k, life: 1.6 });
  spawnSparkles(nuk.coinX, nuk.coinY, Color.parseColor('#FFD54F'), 30);
  sounds.play('COIN'); sounds.play('UNLOCK'); vibrate(120);
  state = State.NUKE_OUT;
}

function updateNukeOut(dt) {
  const prev = nuk.t;
  nuk.t += dt;
  if (nuk.phase === 0) {
    nuk.fallVy += 20 * dt; py -= nuk.fallVy * dt;
    nuk.veil = clamp((nuk.t - 0.3) / 0.3, 0, 1);
    if (nuk.t >= 0.65) { nuk.phase = 1; nuk.t = 0; nuk.veil = 1; }
  } else if (nuk.phase === 1) {
    nuk.veil = 1;
    if (prev < NUK_SHOT && nuk.t >= NUK_SHOT) {
      sounds.play('GEYSER'); sounds.play('JUMP', 1, 0.55); vibrate(120); shake(0.1);
      banners.push({ text: tr('nuke.back'), life: 2.6 });
    }
    if (nuk.t >= NUK_PLUME) leaveNuke();
  } else {
    nuk.veil = Math.max(0, 1 - nuk.t / 0.45);
    nuk.fallVy += 30 * dt; py -= nuk.fallVy * dt;
    if (py <= 0) { py = 0; nuk.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leaveNuke() {
  Object.assign(nuk, { active: false, phase: 2, t: 0, fallVy: 0 });
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// nukeAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetNuke() { nuk.active = false; nuk.veil = 0; }
function nukeFallReason() { return inNuke() ? tr('reason.nuke') : null; }

// ---------- Dessin ----------

function nukeHorizon() { return h * 0.34; }
function argbOf(a, c) { return Color.argb(Math.max(0, Math.min(255, Math.round(a))), Color.red(c), Color.green(c), Color.blue(c)); }

/** Couleur du liquide radioactif à la hauteur y de l'écran. */
function toxicAt(y) {
  const q = clamp((y - nukeHorizon()) / (h - nukeHorizon()), 0, 1);
  return q < 0.45 ? Theme.lerp(0xFF9BFF5A, 0xFF39A82A, q / 0.45) : Theme.lerp(0xFF39A82A, 0xFF123F0C, (q - 0.45) / 0.55);
}

/** Ajoute au chemin la moitié avant (basse) d'une ellipse, de gauche à droite (ou l'inverse). */
function frontArc(cx, cy, rx, ry, leftToRight, first) {
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = Math.PI * (leftToRight ? 1 - u : u);
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (first && i === 0) nukPath.moveTo(x, y); else nukPath.lineTo(x, y);
  }
}

/** Symbole radioactif (trèfle noir) de rayon r, centré en (x, y). */
function drawTrefoil(canvas, x, y, r) {
  const p = nukPaint;
  p.shader = null; p.color = 0xFF1A1A1A;
  canvas.drawCircle(x, y, r * 0.17, p);
  for (let b = 0; b < 3; b++) {
    const mid = -Math.PI / 2 + b * 2 * Math.PI / 3, n = 8;
    nukPath.reset();
    for (let i = 0; i <= n; i++) {
      const a = mid - Math.PI / 6 + i * (Math.PI / 3) / n;
      if (i === 0) nukPath.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else nukPath.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    for (let i = n; i >= 0; i--) {
      const a = mid - Math.PI / 6 + i * (Math.PI / 3) / n;
      nukPath.lineTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3);
    }
    nukPath.close();
    canvas.drawPath(nukPath, p);
  }
}

/** Baril radioactif qui plonge dans le liquide vert. Le canvas est déjà placé sur le dessus. */
function drawBarrel(canvas, pl) {
  const p = nukPaint, st = nukStroke, c = pl.baseColor;
  const rx = 1.2247449 * k * pl.half, ry = 0.70710677 * k * pl.half, d = BARREL_H * k;
  const wl = NUK_WATER * k + Math.sin(time * 2 + pl.cx) * k * 0.03;
  const g0 = sy(pl.cx, 0, pl.cz);
  // Corps cylindrique, éclairé au centre
  nukPath.reset(); nukPath.moveTo(-rx, 0); nukPath.lineTo(-rx, d); frontArc(0, d, rx, ry, true, false); nukPath.lineTo(rx, 0); nukPath.close();
  p.color = Color.WHITE;
  p.shader = new LinearGradient(-rx, 0, rx, 0, [shade(c, 0.5), shade(c, 1), shade(c, 1.2), shade(c, 0.85), shade(c, 0.45)], [0, 0.32, 0.45, 0.75, 1]);
  canvas.drawPath(nukPath, p);
  p.shader = null;
  // Cerclages
  for (const ry0 of [0.28, 0.72]) {
    st.strokeWidth = k * 0.06; st.color = shade(c, 0.55);
    nukPath.reset(); frontArc(0, ry0 * k, rx, ry, true, true); canvas.drawPath(nukPath, st);
    st.strokeWidth = k * 0.02; st.color = Color.argb(110, 255, 255, 255);
    nukPath.reset(); frontArc(0, ry0 * k - k * 0.05, rx * 0.98, ry, true, true); canvas.drawPath(nukPath, st);
  }
  // Symbole radioactif sur la face avant
  const s = k * 0.2 * Math.min(1.2, pl.half / 0.5);
  p.color = Color.argb(70, 0, 0, 0); canvas.drawCircle(0, ry + k * 0.5, s * 1.08, p);
  drawTrefoil(canvas, 0, ry + k * 0.5, s);
  // Coulures vertes depuis le couvercle
  p.color = 0xFF76FF03;
  for (const [dx, len] of [[-0.45, 0.32], [0.3, 0.22]]) {
    const x = dx * rx, y0 = ry * Math.sqrt(Math.max(0, 1 - dx * dx));
    const l = k * len * (0.8 + 0.2 * Math.sin(time * 1.5 + pl.cx + dx));
    nukOval.set(x - k * 0.05, y0 - k * 0.04, x + k * 0.05, y0 + l); canvas.drawRoundRect(nukOval, k * 0.05, k * 0.05, p);
    canvas.drawCircle(x, y0 + l, k * 0.065, p);
  }
  // Couvercle
  p.color = shade(c, 1.12); nukOval.set(-rx, -ry, rx, ry); canvas.drawOval(nukOval, p);
  st.strokeWidth = k * 0.045; st.color = shade(c, 0.7);
  nukOval.set(-rx * 0.86, -ry * 0.86, rx * 0.86, ry * 0.86); canvas.drawOval(nukOval, st);
  p.color = shade(c, 0.6); nukOval.set(rx * 0.38, -ry * 0.42, rx * 0.6, -ry * 0.18); canvas.drawOval(nukOval, p);
  p.color = 0xFF76FF03; nukOval.set(-rx * 0.62, ry * 0.45, -rx * 0.22, ry * 0.8); canvas.drawOval(nukOval, p);
  drawCenterMark(canvas, shade(c, 0.5));
  // Partie immergée : recouverte par le liquide vert
  nukPath.reset(); frontArc(0, wl, rx, ry, true, true); nukPath.lineTo(rx, d); frontArc(0, d, rx, ry, false, false); nukPath.close();
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, wl, 0, d + ry, argbOf(200, toxicAt(g0 + wl)), argbOf(255, toxicAt(g0 + d + ry)));
  canvas.drawPath(nukPath, p);
  p.shader = null;
  // Lueur au ras du liquide et petite onde qui s'éloigne
  st.strokeWidth = k * 0.05; st.color = Color.argb(230, 204, 255, 144);
  nukPath.reset(); frontArc(0, wl, rx * 1.02, ry, true, true); canvas.drawPath(nukPath, st);
  const q = (time * 0.6 + pl.cx * 0.3) % 1, rr = 1 + q * 0.7;
  st.strokeWidth = k * 0.025; st.color = Color.argb(Math.round(150 * (1 - q)), 190, 255, 120);
  nukOval.set(-rx * rr, wl - ry * rr, rx * rr, wl + ry * rr); canvas.drawArc(nukOval, 15, 150, false, st);
}

/** Largeur relative de la tour de refroidissement à la hauteur relative t (0 = haut, 1 = pied). */
function towerWidth(t) {
  return t < 0.3 ? 0.8 + 0.2 * ((0.3 - t) / 0.3) ** 2 : 0.8 + 0.45 * ((t - 0.3) / 0.7) ** 2;
}

function towerPath(rx, ry, hgt) {
  nukPath.reset();
  const n = 14;
  for (let i = 0; i <= n; i++) { const t = i / n; if (i === 0) nukPath.moveTo(-rx * towerWidth(t), t * hgt); else nukPath.lineTo(-rx * towerWidth(t), t * hgt); }
  frontArc(0, hgt, rx * towerWidth(1), ry * towerWidth(1), true, false);
  for (let i = n; i >= 0; i--) { const t = i / n; nukPath.lineTo(rx * towerWidth(t), t * hgt); }
  nukPath.close();
}

const CONCRETE = [0xFF6E7378, 0xFFD9DCDF, 0xFFB8BCC0, 0xFF5F6469];

/** Tour de refroidissement de la centrale : on saute dedans, la méga pièce flotte au-dessus. */
function drawPlant(canvas, pl) {
  const p = nukPaint, st = nukStroke;
  const rx = 1.2247449 * k * pl.half, ry = 0.70710677 * k * pl.half, hgt = TOWER_H * k;
  const wl = NUK_WATER * k * 1.3 + Math.sin(time * 2 + pl.cx) * k * 0.03;
  const g0 = sy(pl.cx, 0, pl.cz);
  // Corps en béton
  towerPath(rx, ry, hgt);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(-rx * 1.25, 0, rx * 1.25, 0, CONCRETE, [0, 0.38, 0.62, 1]);
  canvas.drawPath(nukPath, p);
  p.shader = null;
  // Bandes rouges en haut
  for (const [t0, t1] of [[0.05, 0.1], [0.15, 0.2]]) {
    nukPath.reset();
    frontArc(0, t0 * hgt, rx * towerWidth(t0), ry * towerWidth(t0), true, true);
    frontArc(0, t1 * hgt, rx * towerWidth(t1), ry * towerWidth(t1), false, false);
    nukPath.close();
    p.color = 0xFFE53935; canvas.drawPath(nukPath, p);
  }
  // Panneau radioactif
  const sy0 = ry + 0.42 * hgt * 0.62;
  p.color = 0xFFFFC928; canvas.drawCircle(0, sy0, k * 0.34, p);
  st.strokeWidth = k * 0.04; st.color = 0xFF1A1A1A; canvas.drawCircle(0, sy0, k * 0.34, st);
  drawTrefoil(canvas, 0, sy0, k * 0.27);
  // Pied dans le liquide
  canvas.save();
  towerPath(rx, ry, hgt);
  canvas.clipPath(nukPath);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, wl, 0, hgt + ry, argbOf(210, toxicAt(g0 + wl)), argbOf(255, toxicAt(g0 + hgt)));
  nukPath.reset(); frontArc(0, wl, rx * 1.4, ry * 1.2, true, true); nukPath.lineTo(rx * 1.4, hgt + ry * 2); nukPath.lineTo(-rx * 1.4, hgt + ry * 2); nukPath.close();
  canvas.drawPath(nukPath, p);
  p.shader = null;
  canvas.restore();
  const tw = towerWidth(wl / hgt);
  st.strokeWidth = k * 0.05; st.color = Color.argb(230, 204, 255, 144);
  nukPath.reset(); frontArc(0, wl, rx * tw * 1.02, ry * tw, true, true); canvas.drawPath(nukPath, st);
  // Ouverture : intérieur sombre, lueur verte, rebord
  p.color = 0xFF13210F; nukOval.set(-rx, -ry, rx, ry); canvas.drawOval(nukOval, p);
  p.shader = new RadialGradient(0, ry * 0.2, rx * 0.9, [Color.argb(220, 140, 255, 80), Color.argb(0, 60, 200, 40)]);
  canvas.drawOval(nukOval, p);
  p.shader = null;
  st.strokeWidth = k * 0.08; st.color = 0xFFE3E6E8; canvas.drawOval(nukOval, st);
  // Vapeur verdâtre qui s'échappe
  for (let i = 0; i < 6; i++) {
    const q = (time * 0.35 + i / 6) % 1;
    p.color = Color.argb(Math.round(120 * (1 - q)), 214, 245, 200);
    canvas.drawCircle(Math.sin(time * 0.8 + i * 1.7) * rx * 0.35 * q, -q * k * 2.4, k * (0.22 + q * 0.45) * pl.half, p);
  }
  if (pl.coin > 0) {
    const bob = Math.abs(Math.sin(time * 4)) * k * 0.2;
    textPaint.textSize = k * 0.45;
    canvas.drawText('⬇', 0, -k * 1.7 - bob, textPaint);
  }
}

/** Décor de la zone radioactive à la place du ciel (renvoie false si l'on n'y est pas). */
function drawNukeBackdrop(canvas) {
  if (!inNuke()) return false;
  sounds.setAmbient(ambientSound());   // bouillonnement du lac radioactif
  drawNukeScene(canvas, -camX, 1);
  return true;
}

function drawNukeScene(canvas, scrollX, alpha) {
  const p = nukPaint, st = nukStroke, a = Math.round(255 * alpha), hy = nukeHorizon(), par = scrollX * 0.04;
  p.color = Color.WHITE; p.alpha = a;
  p.shader = new LinearGradient(0, 0, 0, hy, 0xFF33402A, 0xFFB9C98C);
  canvas.drawRect(0, 0, w, hy + 2, p);
  p.shader = null;
  // Soleil voilé
  p.color = Color.argb(Math.round(90 * alpha), 230, 255, 170); canvas.drawCircle(w * 0.72, h * 0.12, w * 0.15, p);
  p.color = Color.argb(Math.round(210 * alpha), 238, 248, 190); canvas.drawCircle(w * 0.72, h * 0.12, w * 0.055, p);
  // Reste du champignon atomique, au loin
  drawMushroom(canvas, w * 0.18 + par * 0.5, hy, w * 0.28, 1, 0.35 * alpha, 1);
  // Silhouette industrielle : usine en ruine, cheminées, tours de refroidissement qui fument
  const dark = Color.argb(a, 47, 58, 40);
  const off = ((par % (w * 1.2)) + w * 1.2) % (w * 1.2);
  for (let rep = -1; rep <= 1; rep++) {
    const bx = rep * w * 1.2 + off;
    p.color = dark;
    canvas.drawRect(bx + w * 0.05, hy - h * 0.05, bx + w * 0.22, hy + 2, p);
    canvas.drawRect(bx + w * 0.09, hy - h * 0.1, bx + w * 0.115, hy - h * 0.05, p);
    canvas.drawRect(bx + w * 0.15, hy - h * 0.085, bx + w * 0.17, hy - h * 0.05, p);
    nukPath.reset(); nukPath.moveTo(bx + w * 0.24, hy + 2);
    for (let i = 0; i < 4; i++) { nukPath.lineTo(bx + w * (0.24 + i * 0.05), hy - h * 0.06); nukPath.lineTo(bx + w * (0.29 + i * 0.05), hy - h * 0.035); }
    nukPath.lineTo(bx + w * 0.44, hy + 2); nukPath.close();
    canvas.drawPath(nukPath, p);
    for (const tx of [0.62, 0.8]) {
      const cx = bx + w * tx, tw = w * 0.055, th = h * 0.09;
      nukPath.reset();
      nukPath.moveTo(cx - tw * 0.85, hy - th);
      nukPath.quadTo(cx - tw * 0.6, hy - th * 0.45, cx - tw * 1.15, hy + 2);
      nukPath.lineTo(cx + tw * 1.15, hy + 2);
      nukPath.quadTo(cx + tw * 0.6, hy - th * 0.45, cx + tw * 0.85, hy - th);
      nukPath.close();
      p.color = Color.argb(a, 74, 86, 64); canvas.drawPath(nukPath, p);
      for (let i = 0; i < 4; i++) {
        const q = (time * 0.18 + i * 0.25 + tx) % 1;
        p.color = Color.argb(Math.round(110 * (1 - q) * alpha), 225, 235, 215);
        canvas.drawCircle(cx + q * tw * 1.5, hy - th - q * h * 0.08, tw * (0.5 + q * 0.9), p);
      }
    }
  }
  // Lac radioactif
  p.color = Color.WHITE; p.alpha = a;
  p.shader = new LinearGradient(0, hy, 0, h, [0xFF9BFF5A, 0xFF39A82A, 0xFF123F0C], [0, 0.45, 1]);
  canvas.drawRect(0, hy, w, h, p);
  p.shader = null;
  // Ondes lumineuses à la surface
  for (let i = 0; i < 12; i++) {
    const row = (i * 0.37) % 1, y = hy + (h - hy) * (row * row * 0.9 + 0.04);
    const x = ((i * 0.618 + time * 0.01 * (0.5 + row)) % 1.2) * w - w * 0.1 + scrollX * 0.04 * row;
    const q = (time * 0.4 + i * 0.21) % 1, r = w * (0.03 + 0.06 * row) * (0.6 + q);
    st.strokeWidth = w * 0.003; st.color = Color.argb(Math.round(140 * (1 - q) * alpha), 210, 255, 150);
    nukOval.set(x - r, y - r * 0.25, x + r, y + r * 0.25); canvas.drawOval(nukOval, st);
  }
  // Barils renversés qui flottent au loin
  for (let i = 0; i < 4; i++) {
    const row = 0.1 + (i * 0.29) % 0.5, y = hy + (h - hy) * row * row + Math.sin(time * 1.4 + i) * w * 0.004;
    const sz = w * (0.025 + 0.05 * row), x = ((i * 0.41 + 0.2 + time * 0.004) % 1.2) * w - w * 0.1 + scrollX * 0.04 * row;
    canvas.save(); canvas.rotate(70 + Math.sin(time + i) * 8, x, y);
    p.color = Color.argb(a, 230, 180, 30); nukOval.set(x - sz * 0.5, y - sz * 0.75, x + sz * 0.5, y + sz * 0.75); canvas.drawRoundRect(nukOval, sz * 0.15, sz * 0.15, p);
    p.color = Color.argb(a, 150, 110, 20);
    canvas.drawRect(x - sz * 0.5, y - sz * 0.3, x + sz * 0.5, y - sz * 0.22, p);
    canvas.drawRect(x - sz * 0.5, y + sz * 0.22, x + sz * 0.5, y + sz * 0.3, p);
    canvas.restore();
  }
  drawToxicBubbles(canvas, alpha, hy);
  // Brume verte au ras du liquide
  for (let i = 0; i < 7; i++) {
    const x = (((i * 0.31) + time * 0.012) % 1.3) * w - w * 0.15;
    p.color = Color.argb(Math.round(45 * alpha), 170, 255, 120);
    nukOval.set(x - w * 0.16, hy - h * 0.012, x + w * 0.16, hy + h * 0.03); canvas.drawOval(nukOval, p);
  }
}

/** Bulles vertes qui remontent du fond du lac et éclatent à la surface. */
function drawToxicBubbles(canvas, alpha, hy) {
  const p = nukPaint, st = nukStroke;
  for (let i = 0; i < 26; i++) {
    const speed = 0.12 + (i % 5) * 0.03, q = (time * speed + i * 0.137) % 1;
    const x = w * ((i * 0.618) % 1) + Math.sin(time * 2 + i) * w * 0.012;
    const yStart = h * (0.8 + 0.25 * ((i * 0.43) % 1)), y = yStart - (yStart - hy) * q;
    const r = w * (0.006 + 0.008 * ((i * 7) % 4) / 3) * (0.7 + 0.5 * q);
    if (q < 0.94) {
      p.color = Color.argb(Math.round(150 * alpha), 170, 255, 110); canvas.drawCircle(x, y, r, p);
      p.color = Color.argb(Math.round(200 * alpha), 240, 255, 220); canvas.drawCircle(x - r * 0.35, y - r * 0.35, r * 0.3, p);
    } else {
      const s = (q - 0.94) / 0.06;
      st.strokeWidth = w * 0.0025; st.color = Color.argb(Math.round(200 * (1 - s) * alpha), 210, 255, 160);
      nukOval.set(x - r * (1 + 2 * s), hy - r * 0.4 * (1 + s), x + r * (1 + 2 * s), hy + r * 0.4 * (1 + s)); canvas.drawOval(nukOval, st);
    }
  }
}

/** Champignon atomique : pied, collerette, chapeau de feu qui vire à la fumée (smoke 0 = brûlant, 1 = fumée). */
function drawMushroom(canvas, cx, baseY, s, grow, alpha, smoke) {
  if (alpha <= 0.01 || grow <= 0.01) return;
  const p = nukPaint, st = nukStroke, g = grow, fire = 1 - smoke;
  const col = (hot, cold, aMul = 1) => argbOf(255 * alpha * aMul, Theme.lerp(hot, cold, smoke));
  const topY = baseY - s * 1.25 * g;
  p.shader = null;
  p.color = col(0xFFFFB25C, 0xFF8D7B6A, 0.85);
  nukOval.set(cx - s * 0.75 * g, baseY - s * 0.14 * g, cx + s * 0.75 * g, baseY + s * 0.06 * g); canvas.drawOval(nukOval, p);
  nukPath.reset();
  nukPath.moveTo(cx - s * 0.1 * g, topY + s * 0.2 * g);
  nukPath.quadTo(cx - s * 0.07 * g, baseY - s * 0.5 * g, cx - s * 0.2 * g, baseY - s * 0.05 * g);
  nukPath.lineTo(cx + s * 0.2 * g, baseY - s * 0.05 * g);
  nukPath.quadTo(cx + s * 0.07 * g, baseY - s * 0.5 * g, cx + s * 0.1 * g, topY + s * 0.2 * g);
  nukPath.close();
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, topY, 0, baseY, col(0xFFFFE08A, 0xFFA1887F), col(0xFFFF7A2F, 0xFF6D5D52));
  canvas.drawPath(nukPath, p);
  p.shader = null;
  st.strokeWidth = s * 0.05 * g; st.color = col(0xFFFFC266, 0xFFBCAAA4, 0.8);
  nukOval.set(cx - s * 0.3 * g, baseY - s * 0.62 * g, cx + s * 0.3 * g, baseY - s * 0.52 * g); canvas.drawOval(nukOval, st);
  const capR = s * 0.5 * g;
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + time * 0.6;
    p.color = col(i % 2 === 0 ? 0xFFFF8A3D : 0xFFFFB347, i % 2 === 0 ? 0xFF8D6E63 : 0xFFA1887F);
    canvas.drawCircle(cx + Math.cos(i * 2.4) * capR * 0.62, topY + Math.sin(i * 2.4) * capR * 0.22, capR * (0.42 + 0.08 * Math.sin(a)), p);
  }
  if (fire > 0.05) {
    p.shader = new RadialGradient(cx, topY + capR * 0.1, capR * 0.75, [Color.argb(Math.round(230 * alpha * fire), 255, 245, 190), Color.argb(0, 255, 160, 60)]);
    canvas.drawCircle(cx, topY + capR * 0.1, capR * 0.75, p);
    p.shader = null;
  }
}

/** Champignon atomique à l'horizon, derrière les plateformes (pendant l'explosion). */
function drawNukeSky(canvas) {
  if (state !== State.NUKE || nuk.phase !== 0 || nuk.t < NUK_RUMBLE) return;
  const t = nuk.t, gq = clamp((t - NUK_RUMBLE) / 1.6, 0, 1), grow = 1 - (1 - gq) ** 3;
  nukPaint.color = Color.argb(Math.round(110 * grow), 255, 150, 60); canvas.drawRect(0, 0, w, h, nukPaint);
  drawMushroom(canvas, w * (0.5 + 0.22 * nuk.side), h * 0.4, w * 0.45, grow, 1, clamp((t - 1.6) / 1.4, 0, 0.6));
}

/** Scènes : tremblement, éclair et onde de choc ; vol dans le souffle ; panache de la centrale. */
function drawNukeOverlay(canvas) {
  const p = nukPaint;
  if (state === State.NUKE && nuk.phase === 0) {
    const t = nuk.t, cx = w * (0.5 + 0.22 * nuk.side), baseY = h * 0.4;
    if (t >= NUK_RUMBLE) {
      const wq = clamp((t - 2.0) / 0.8, 0, 1);
      if (wq > 0) {
        const r = w * (0.2 + 1.6 * wq);
        nukStroke.strokeWidth = w * (0.02 + 0.05 * wq); nukStroke.color = Color.argb(Math.round(200 * (1 - wq * 0.5)), 255, 236, 200);
        nukOval.set(cx - r, baseY - r * 0.3, cx + r, baseY + r * 0.3 + h * 0.6 * wq); canvas.drawOval(nukOval, nukStroke);
        p.color = Color.argb(Math.round(150 * wq), 220, 170, 110); canvas.drawRect(0, 0, w, h, p);
      }
      const fl = clamp(1 - (t - NUK_RUMBLE) / 0.6, 0, 1);
      if (fl > 0) { p.color = Color.argb(Math.round(255 * fl), 255, 255, 245); canvas.drawRect(0, 0, w, h, p); }
    }
    if (t > 0.3 && t < 1.6) drawBubble(canvas, sx(px, pz), sy(px, playerHeight * 2.6, pz), tr('nuke.what'));
  }
  if (state === State.NUKE_OUT && nuk.phase === 0 && nuk.t < 0.6) {
    const q = nuk.t / 0.6;
    p.color = Color.argb(Math.round(200 * (1 - q)), 255, 214, 80);
    canvas.drawCircle(nuk.coinX - camX, nuk.coinY - camY, k * (0.5 + q * 1.5), p);
  }
  if (nuk.veil <= 0.01) return;
  if (state === State.NUKE) {
    if (nuk.phase < 2) drawBlownScene(canvas, nuk.phase === 1 ? nuk.t : 0, nuk.veil);
    else { p.color = Color.argb(Math.round(255 * nuk.veil), 150, 185, 110); canvas.drawRect(0, 0, w, h, p); }
  } else if (state === State.NUKE_OUT) {
    if (nuk.phase === 1) drawPlumeScene(canvas);
    else if (nuk.phase === 2) {
      const sky = Theme.sky(score);
      p.color = Color.WHITE; p.alpha = Math.round(255 * nuk.veil);
      p.shader = new LinearGradient(0, 0, 0, h, sky.top, sky.bottom);
      canvas.drawRect(0, 0, w, h, p);
      p.shader = null;
    } else { p.color = Color.argb(Math.round(255 * nuk.veil), 14, 40, 12); canvas.drawRect(0, 0, w, h, p); }
  }
}

/** Emporté par le souffle de l'explosion : ciel orangé, débris, personnage qui tournoie. */
function drawBlownScene(canvas, t, alpha) {
  const p = nukPaint, st = nukStroke, a = Math.round(255 * alpha), dir = -nuk.side;
  p.color = Color.WHITE; p.alpha = a;
  p.shader = new LinearGradient(0, 0, 0, h, 0xFFFF9E45, 0xFF6B4A3A);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  drawMushroom(canvas, w * (0.5 - 0.3 * nuk.side), h * 0.78, w * 0.5, 1, 0.6 * alpha, 0.5);
  st.strokeWidth = w * 0.005;
  for (let i = 0; i < 70; i++) {
    const y = ((i * 0.618) % 1) * h, sp = 1.4 + (i % 5) * 0.35;
    const raw = (((i * 0.37) % 1) * w * 1.4 + t * w * sp) % (w * 1.4) - w * 0.2, x = dir > 0 ? raw : w - raw;
    st.color = Color.argb(Math.round(170 * alpha), 255, 225, 180);
    canvas.drawLine(x, y, x - dir * w * 0.07, y + h * 0.006, st);
  }
  for (let i = 0; i < 12; i++) {
    const y = h * (0.1 + ((i * 0.53) % 0.8));
    const raw = (((i * 0.29) % 1) * w * 1.4 + t * w * (1.8 + (i % 3) * 0.5)) % (w * 1.4) - w * 0.2, x = dir > 0 ? raw : w - raw;
    const s = w * (0.012 + (i % 3) * 0.008);
    canvas.save(); canvas.rotate(t * 500 + i * 40, x, y);
    p.color = i % 3 === 0 ? Color.argb(a, 230, 180, 30) : Color.argb(a, 90, 70, 55);
    canvas.drawRect(x - s, y - s * 0.6, x + s, y + s * 0.6, p);
    canvas.restore();
  }
  const u = clamp(t / NUK_BLOWN, 0, 1);
  const cx = dir > 0 ? w * (0.2 + 0.6 * u) : w * (0.8 - 0.6 * u), cy = h * 0.45 + Math.sin(t * 5) * h * 0.05;
  canvas.save(); canvas.rotate(t * 300 * dir, cx, cy - k * 0.5); canvas.scale(1.6, 1.6, cx, cy - k * 0.5);
  drawCharacter(canvas, cx, cy, 0, 1, 1, true, true, true);
  canvas.restore();
  if (t > 0.1) drawBubble(canvas, cx, cy - k * 2, tr(t < 1.3 ? 'nuke.blown' : 'nuke.hot'));
}

/** Le panache de vapeur de la tour propulse le personnage dans le ciel. */
function drawPlumeScene(canvas) {
  const p = nukPaint, t = nuk.t, sky = Theme.sky(score);
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h, sky.top, Theme.lerp(sky.bottom, 0xFFB9C98C, 0.5));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  const shot = clamp((t - NUK_SHOT) / (NUK_PLUME - NUK_SHOT), 0, 1), scroll = shot * shot * h * 1.1;
  const cx = w / 2, topY = h * 0.6 + scroll, tw = w * 0.2;
  nukPath.reset();
  nukPath.moveTo(cx - tw, topY);
  nukPath.quadTo(cx - tw * 0.75, topY + h * 0.2, cx - tw * 1.35, topY + h * 0.45);
  nukPath.lineTo(cx + tw * 1.35, topY + h * 0.45);
  nukPath.quadTo(cx + tw * 0.75, topY + h * 0.2, cx + tw, topY);
  nukPath.close();
  p.shader = new LinearGradient(cx - tw * 1.35, 0, cx + tw * 1.35, 0, CONCRETE, [0, 0.38, 0.62, 1]);
  canvas.drawPath(nukPath, p);
  p.shader = null;
  p.color = 0xFFE53935; canvas.drawRect(cx - tw * 0.97, topY + h * 0.02, cx + tw * 0.97, topY + h * 0.04, p);
  p.color = 0xFF13210F; nukOval.set(cx - tw, topY - tw * 0.25, cx + tw, topY + tw * 0.25); canvas.drawOval(nukOval, p);
  const power = t < NUK_SHOT ? t / NUK_SHOT * 0.3 : 1;
  for (let i = 0; i < 16; i++) {
    const q = (time * 1.2 + i / 16) % 1;
    p.color = Color.argb(Math.round(200 * (1 - q) * power), 200, 255, 170);
    canvas.drawCircle(cx + Math.sin(time * 3 + i) * tw * 0.25 * q, topY - q * h * 1.2, tw * (0.6 + q * 0.9) * power, p);
  }
  for (const c of isl.clouds) {
    const span = h * 1.4, y = (((c[1] * span + scroll * 1.6 * c[2]) % span) + span) % span - h * 0.2;
    p.color = Color.argb(200, 255, 255, 255);
    canvas.drawCircle(c[0] * w, y, w * 0.08 * c[2], p);
    canvas.drawCircle(c[0] * w + w * 0.07 * c[2], y + w * 0.02, w * 0.06 * c[2], p);
    canvas.drawCircle(c[0] * w - w * 0.07 * c[2], y + w * 0.02, w * 0.055 * c[2], p);
  }
  if (t >= NUK_SHOT) {
    const q = t - NUK_SHOT, pcx = cx + Math.sin(q * 4) * w * 0.05, pcy = topY - tw * 0.3 - q * h * 0.55 - q * q * h * 0.12;
    canvas.save(); canvas.rotate(q * 520, pcx, pcy - k * 0.5); canvas.scale(1.5, 1.5, pcx, pcy - k * 0.5);
    drawCharacter(canvas, pcx, pcy, 0, 1, 1, true, false, true);
    canvas.restore();
    if (q > 0.3) drawBubble(canvas, pcx, pcy - k * 1.9, tr('island.yay'));
  }
}
