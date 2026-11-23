'use strict';
/*
 * Moteur de voyage (comme Voyage.kt) : un imprévu emmène le joueur dans le monde d'un chapitre de l'Aventure (son fond
 * peint, ses blocs, son ambiance) le temps d'une vingtaine de sauts, jusqu'à la méga pièce posée sur un trou blanc qui
 * le ramène dans le ciel. Tout le décor vient de la fiche du chapitre (chapitres.json) et de ses crochets : un nouveau
 * voyage n'a besoin que de son déclencheur.
 *
 * Premier déclencheur : le trou noir (imprévu non mortel). Il remplace le bloc suivant ; en sautant dedans, le joueur
 * est aspiré, traverse un tunnel d'étoiles et tombe dans un monde tiré au hasard (chapitres 9 et plus).
 * Tomber dans le vide, là-bas, termine la partie, comme dans la base de l'hélicoptère.
 */

const PL_BLACKHOLE = 20, PL_WHITEHOLE = 21;
const HOLE_GROW = 0.9, VOY_SUCK = 1.5, VOY_TUNNEL = 2.4, VOY_OUT = 1.8;
/** Premier chapitre dont le monde peut être visité (avant : mondes déjà visités par les autres imprévus). */
const VOY_FIRST_WORLD = 9;
// phase — VOYAGE : 0 = aspiré, 1 = tunnel, 2 = chute dans le monde. VOYAGE_OUT : 0 = projeté par le trou blanc, 1 = retour au ciel.
const vyg = { holeAt: -1, arriveT: -1, hole: null, active: false, c: 0, total: 0, spawned: 0, phase: 0, t: 0, fallVy: 0, veil: 0, announced: false };
const vygPaint = new Paint();
const vygStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });
const vygOval = new RectF();

function inVoyage() { return vyg.active; }
function blackholeBusy() { return vyg.arriveT >= 0 && vyg.arriveT < HOLE_GROW; }

function scheduleBlackhole(on) { vyg.holeAt = on ? time + 6 + rnd() * 9 : -1; }

/** Le trou noir s'ouvre à la place du bloc suivant. */
function checkBlackhole(dt) {
  if (vyg.arriveT >= 0 && vyg.arriveT < HOLE_GROW) {
    vyg.arriveT += dt;
    if (vyg.arriveT >= HOLE_GROW) banners.push({ text: tr('voyage.hole'), life: 4 });
  }
  if (vyg.holeAt < 0 || time < vyg.holeAt) return;
  if (state === State.GAME_OVER) { vyg.holeAt = -1; return; }
  if (state !== State.READY || jumps === 0 || pendingBounce || ice.sliding || arrivalBusy() || inAdventure() ||
      current.kind === Kind.TRAMPOLINE || current.crumbly) { vyg.holeAt = time + 0.4; return; }
  vyg.holeAt = -1;
  if (!surpriseAllowed()) return;
  markSurprise();
  const r = new Platform(next.cx, next.cz, 0.7, true, 0xFF1A0B2E, Kind.NORMAL, alongX, PL_BLACKHOLE);
  const i = platforms.indexOf(next);
  if (i >= 0) platforms[i] = r; else platforms.push(r);
  next = r; vyg.hole = r; vyg.arriveT = 0;
  sounds.play('VORTEX');
  vibrate(15);
}

/** Atterrissage dans le trou noir : le joueur est aspiré. */
function startVoyageIn() {
  Object.assign(vyg, { phase: 0, t: 0, fallVy: 0, veil: 0, arriveT: -1, announced: false });
  pendingBounce = false; perfectStreak = 0;
  sounds.play('VORTEX');
  vibrate(120);
  state = State.VOYAGE;
}

function updateVoyage(dt) {
  vyg.t += dt;
  if (vyg.phase === 0) {
    // Le joueur s'enfonce en tournoyant, le tunnel recouvre peu à peu l'écran
    const q = clamp(vyg.t / VOY_SUCK, 0, 1);
    py = -q * q * 1.4;
    vyg.veil = clamp((vyg.t - 0.7) / 0.6, 0, 1);
    if (vyg.t >= VOY_SUCK) { vyg.phase = 1; vyg.t = 0; vyg.veil = 1; }
  } else if (vyg.phase === 1) {
    vyg.veil = 1;
    if (!vyg.announced && vyg.t > 0.25) { vyg.announced = true; banners.push({ text: tr('voyage.to'), life: 2.2 }); }
    if (vyg.t >= VOY_TUNNEL) enterVoyage();
  } else {
    vyg.veil = Math.max(0, 1 - vyg.t / 0.5);
    vyg.fallVy += 26 * dt; py -= vyg.fallVy * dt;
    if (py <= 0) {
      py = 0; vyg.veil = 0; landSquash = 1;
      spawnDust(px, pz); shake(0.06); sounds.play('LAND'); vibrate(80);
      banners.push({ text: tr('quest.s' + vyg.c + '.title'), life: 3.2 });
      popups.push({ text: tr('voyage.goal'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.8 });
      state = State.READY;
    }
  }
}

/** Arrivée dans le monde d'un chapitre tiré au hasard (pas le même que la dernière fois). */
function enterVoyage() {
  const last = doomGet('voyage_last'), worlds = [];
  for (let c = VOY_FIRST_WORLD; c <= CHAPTER_COUNT; c++) if (c !== last) worlds.push(c);
  vyg.c = worlds[Math.floor(Math.random() * worlds.length)];
  doomPut('voyage_last', vyg.c);
  Object.assign(vyg, { active: true, hole: null, total: 18 + rndInt(5), spawned: 0, phase: 2, t: 0, fallVy: 0 });
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; batDoomAt = -1; hornetDoomAt = -1; isl.cycloneAt = -1; frs.eagleAt = -1;
  platforms = []; leaving = [];
  current = voyageBlock(0, 0, 0.8, Kind.NORMAL, true, 0);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 6;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

/** Bloc habillé comme dans les niveaux du chapitre visité (chapterBlockLook lit le chapitre en cours). */
function voyageBlock(x, z, half, kind, along, color) {
  const b = { kind, half, round: false, dist: 0, alongX: along, color, coin: false, phase: 0, finish: false };
  const keep = quest.season;
  quest.season = vyg.c;
  let look;
  try { look = chapterBlockLook(b); } finally { quest.season = keep; }
  const p = new Platform(x, z, half, look.round, look.color, look.kind, along, look.island);
  p.material = look.material; p.theme = vyg.c; p.blink = !!look.blink;
  return p;
}

/** Blocs du monde visité, puis le trou blanc avec la méga pièce. */
function spawnVoyage() {
  vyg.spawned++;
  alongX = rnd() < 0.5;
  const final = vyg.spawned >= vyg.total;
  const half = final ? 0.75 : 0.5 + rnd() * 0.3;
  const dist = current.half + half + 0.45 + rnd() * (final ? 1.2 : 1.8);
  const x = alongX ? current.cx + dist : px, z = alongX ? pz : current.cz + dist;
  if (final) {
    next = new Platform(x, z, half, true, 0xFFFFFFFF, Kind.NORMAL, alongX, PL_WHITEHOLE);
    next.coin = MEGA_COIN;
    popups.push({ text: tr('voyage.exit'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
  } else {
    // Quelques blocs friables une fois lancé, comme dans les niveaux du chapitre
    const kind = vyg.spawned > 3 && rnd() < 0.15 ? Kind.CRUMBLY : Kind.NORMAL;
    next = voyageBlock(x, z, half, kind, alongX, rndInt(8));
    next.coin = rnd() < 0.25 ? 1 : 0;
    if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  }
  platforms.push(next);
  trimPlatforms();
}

/** Atterrissage sur le trou blanc : la méga pièce, et le joueur est renvoyé dans le ciel. */
function startVoyageOut() {
  Object.assign(vyg, { phase: 0, t: 0, fallVy: 0, veil: 0 });
  perfectStreak = 0; pendingBounce = false;
  Stats.add('mega');
  const bx = sx(current.cx, current.cz) + camX, by = sy(current.cx, 0.4, current.cz) + camY;
  for (const c of [0xFFFFFFFF, 0xFF8FE3FF, 0xFFD9B8FF]) spawnSparkles(bx, by, c, 22);
  sounds.play('VORTEX');
  vibrate(200); shake(0.15);
  banners.push({ text: tr('voyage.visited', { title: tr('quest.s' + vyg.c + '.title'), n: vyg.c }), life: 4 });
  state = State.VOYAGE_OUT;
}

function updateVoyageOut(dt) {
  vyg.t += dt;
  if (vyg.phase === 0) {
    py += (8 + vyg.t * 25) * dt;
    vyg.veil = clamp((vyg.t - 0.6) / 0.5, 0, 1);
    if (vyg.t >= VOY_OUT) leaveVoyage();
  } else {
    vyg.veil = Math.max(0, 1 - vyg.t / 0.45);
    vyg.fallVy += 30 * dt; py -= vyg.fallVy * dt;
    if (py <= 0) { py = 0; vyg.veil = 0; landSquash = 1; spawnDust(px, pz); sounds.play('LAND'); state = State.READY; }
  }
}

function leaveVoyage() {
  Object.assign(vyg, { active: false, phase: 1, t: 0, fallVy: 0 });
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.8, false, palette[rndInt(palette.length)]);
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 7;
  spawnNext(); updateCameraTarget(); camX = camTargetX; camY = camTargetY;
}

// holeAt n'est pas remis à zéro : il est prévu par skyNewGame() juste avant resetGame()
function resetVoyage() { Object.assign(vyg, { active: false, arriveT: -1, hole: null, veil: 0 }); }

function voyageFallReason() { return inVoyage() ? tr('reason.voyage') : null; }

// ---------- Dessin ----------

/** Fond du monde visité : le fond peint du chapitre et son ambiance ; false hors voyage (ou image pas prête). */
function drawVoyageBackdrop(canvas) {
  if (!inVoyage()) return false;
  if (!drawSceneBackground(canvas, vyg.c, true)) return false;
  drawChapterAmbient(canvas, vyg.c);
  return true;
}

/**
 * Trou noir (aspire, disque d'accrétion orange et violet) ou trou blanc (rejette, bleu et blanc), posé à plat à la
 * place d'un bloc. Le canvas est déjà placé au centre du dessus.
 */
function drawVoyageHole(canvas, pl) {
  const white = pl.island === PL_WHITEHOLE;
  const grow = pl === vyg.hole && vyg.arriveT >= 0 ? smooth01(vyg.arriveT / HOLE_GROW) : 1;
  if (grow <= 0.01) return;
  const p = vygPaint, st = vygStroke, o = vygOval;
  const rx = 1.2247449 * k * pl.half * grow, ry = 0.70710677 * k * pl.half * grow;
  p.shader = new RadialGradient(0, 0, rx * 1.6, [white ? Color.argb(150, 190, 240, 255) : Color.argb(150, 150, 60, 220), white ? Color.argb(0, 190, 240, 255) : Color.argb(0, 150, 60, 220)]);
  canvas.save(); canvas.scale(1, ry / rx); canvas.drawCircle(0, 0, rx * 1.6, p); canvas.restore();
  p.shader = null;
  // Disque qui tourne : anneaux de plus en plus serrés vers le centre
  for (let i = 0; i < 6; i++) {
    const f = 1 - i * 0.11;
    const c0 = white ? [0xFFFFFFFF, 0xFFB8F0FF, 0xFF7FD8FF][i % 3] : [0xFFFFB347, 0xFFFF5FA2, 0xFFA86BFF][i % 3];
    st.color = Color.argb(200 - i * 18, Color.red(c0), Color.green(c0), Color.blue(c0));
    st.strokeWidth = k * (0.07 - i * 0.006);
    o.set(-rx * f, -ry * f, rx * f, ry * f);
    const spin = (time * (white ? -140 : 160) * (1 + i * 0.25)) % 360;
    canvas.drawArc(o, spin + i * 50, 230, false, st);
  }
  // Ce qui est aspiré (ou rejeté) en spirale
  for (let i = 0; i < 12; i++) {
    const q0 = (time * 0.55 + i / 12) % 1, q = white ? q0 : 1 - q0, ang = q * 7 + i * 0.52;
    p.color = white ? Color.argb(Math.floor(230 * (1 - q)), 255, 255, 255) : Color.argb(Math.floor(230 * (1 - q)), 255, 210, 150);
    canvas.drawCircle(Math.cos(ang) * rx * 1.3 * q, Math.sin(ang) * ry * 1.3 * q, k * 0.03, p);
  }
  // Horizon : noir avec un liseré de lumière, ou cœur blanc éblouissant
  o.set(-rx * 0.42, -ry * 0.42, rx * 0.42, ry * 0.42);
  if (white) {
    p.shader = new RadialGradient(0, 0, rx * 0.5, [Color.WHITE, Color.argb(0, 200, 240, 255)]);
    canvas.drawOval(o, p);
    p.shader = null;
  } else {
    p.color = 0xFF050208; canvas.drawOval(o, p);
    st.color = Color.argb(220, 255, 217, 160); st.strokeWidth = k * 0.025; canvas.drawOval(o, st);
  }
}

/** Tunnel d'étoiles : la traversée (aspiré par le trou noir, ou rejeté par le trou blanc). */
function drawVoyageOverlay(canvas) {
  const out = state === State.VOYAGE_OUT, p = vygPaint;
  if (vyg.veil > 0.01) drawVoyageTunnel(canvas, out);
  // Éclair blanc à la sortie du trou blanc
  if (out && vyg.phase === 0 && vyg.t < 0.3) {
    p.shader = null; p.color = Color.argb(Math.floor(220 * (1 - vyg.t / 0.3)), 255, 255, 255);
    canvas.drawRect(0, 0, w, h, p);
  }
}

function drawVoyageTunnel(canvas, out) {
  const a = vyg.veil, p = vygPaint, st = vygStroke;
  const cx = w / 2, cy = h * 0.45, maxR = Math.max(w, h) * 0.75;
  p.shader = new RadialGradient(cx, cy, maxR, [out ? Color.argb(Math.floor(255 * a), 40, 70, 120) : Color.argb(Math.floor(255 * a), 46, 12, 80), Color.argb(Math.floor(255 * a), 4, 2, 12)]);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  // Anneaux qui filent vers l'extérieur
  for (let j = 0; j < 5; j++) {
    const q = (time * 0.7 + j * 0.2) % 1;
    st.color = out ? Color.argb(Math.floor(140 * a * (1 - q)), 160, 220, 255) : Color.argb(Math.floor(140 * a * (1 - q)), 190, 110, 255);
    st.strokeWidth = w * (0.004 + 0.02 * q);
    canvas.drawCircle(cx, cy, q * q * maxR, st);
  }
  // Étoiles en traits, de plus en plus rapides en s'éloignant du centre
  st.strokeWidth = w * 0.004;
  for (let i = 0; i < 70; i++) {
    const ang = i * 2.399963, d = (time * 0.55 + i * 0.137) % 1, r0 = d * d * maxR, len = d * w * 0.09;
    st.color = Color.argb(Math.floor(235 * a * Math.min(1, d * 3)), 255, 255, 255);
    canvas.drawLine(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len), st);
  }
  // Le joueur au milieu, qui tourne (pendant le tunnel seulement : avant et après, il est dans la scène)
  const inTunnel = (!out && vyg.phase === 1) || (out && vyg.phase === 0 && vyg.veil >= 1);
  if (inTunnel) {
    canvas.save();
    canvas.rotate((time * 300) % 360, cx, cy);
    canvas.scale(1.3, 1.3, cx, cy);
    drawCharacter(canvas, cx, cy + k * 0.4, 0, 1, 1, true, false, true);
    canvas.restore();
  }
}
