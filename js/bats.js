'use strict';
// Chauves-souris du mode libre (équivalent de Bats.kt, mêmes dessins). Sous certains blocs, un dessous rocheux
// façon grotte (pierre sombre, stalactites) où dorment 1 à 20 chauves-souris suspendues la tête en bas, aux yeux
// rouges. Quand on se pose sur le bloc, aucune, une partie ou toutes se réveillent et s'envolent dans une
// direction au hasard jusqu'à sortir de l'écran (cri « chauve_souris » si elles sont peu, envol « chauves_souris_vol »
// si elles sont nombreuses).
// Imprévu mortel « chauves-souris » (même calendrier que la foudre, l'avion, le volcan et le satellite) : un bloc
// à chauves-souris est préparé ; quand on s'y pose (score < 15 et sous le record), une ou plusieurs foncent sur
// le joueur, le percutent et le font tomber.

/** Chauves-souris : à partir de ce moment, le prochain bloc en aura qui attaquent (-1 = jamais). */
let batDoomAt = -1;
const BAT_HIT = 1.25, BAT_END = 2.9, BAT_CHANCE = 0.07;
/** Couleurs : corps, membrane (du presque noir au brun gris). */
const BAT_TONES = [[0xFF1E1A22, 0xFF2E2733], [0xFF2A2026, 0xFF3F3036], [0xFF262630, 0xFF383848], [0xFF33282A, 0xFF4A3A3A]];
/** Chauves-souris en vol (coordonnées écran + caméra) et état de l'imprévu mortel. */
const batFx = { flying: [], side: 1, hit: false, fallVy: 0 };
const batPaint = new Paint();
const batStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const batPath = new Path();
const batRect = new RectF();

/** Couleurs de la roche : la plus sombre (côté droit, en bas) et la plus claire (côté gauche, en haut). */
const BAT_ROCK_DARK = [0x2A, 0x23, 0x31], BAT_ROCK_LIGHT = [0x93, 0x88, 0x9A];
const BAT_K = 9, BAT_MC = 6;

/** Teinte de roche entre la plus sombre (0) et la plus claire (1). */
function batRock(v) {
  const q = clamp(v, 0, 1), D = BAT_ROCK_DARK, L = BAT_ROCK_LIGHT;
  return Color.rgb(Math.floor(D[0] + (L[0] - D[0]) * q), Math.floor(D[1] + (L[1] - D[1]) * q), Math.floor(D[2] + (L[2] - D[2]) * q));
}

function batInterp(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) {
    const t = (x - xs[i - 1]) / Math.max(1e-4, xs[i] - xs[i - 1]);
    return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
  }
  return ys[xs.length - 1];
}

/**
 * Dessous rocheux d'un bloc et ses chauves-souris (mesures en unités du monde, repère du bloc) : un rocher taillé
 * en facettes (éclairé à gauche comme les faces des blocs), creusé d'une entrée de grotte sombre au plafond de
 * laquelle dorment les chauves-souris.
 */
class BatRoost {
  constructor(half, round, depth, doom) {
    const rnd = Math.random, K = BAT_K, MC = BAT_MC;
    this.doom = doom;
    this.wd = round ? 1.2247449 * half : 1.7320508 * half;
    this.ry = 0.70710677 * half; this.sq = !round; this.a = half; this.d = depth;
    this.tris = []; this.triColors = [];
    this.bx = new Array(K); this.by = new Array(K);
    this.ceilX = new Array(MC); this.ceilY = new Array(MC); this.floorX = new Array(MC); this.floorY = new Array(MC);
    this.tips = []; this.innerTips = []; this.crystals = []; this.crystalHue = Math.floor(rnd() * 2);
    this.deepest = 0; this.bats = [];
    const wd = this.wd;
    // Groupe : de 1 à 20, plus souvent petit ; serré autour d'un point
    const n = doom ? 5 + Math.floor(rnd() * 16) : 1 + Math.min(19, Math.floor(Math.pow(rnd(), 2.2) * 20));
    const center = (rnd() - 0.5) * wd * 0.5;
    const spread = wd * (0.2 + 0.4 * rnd()) * (0.5 + n / 20);
    const big = 0.75 + rnd() * 0.5;
    const bxs = [], bss = [];
    for (let i = 0; i < n; i++) {
      bxs.push(clamp(center + (rnd() + rnd() - 1) * spread, -wd * 0.55, wd * 0.55));
      bss.push(Math.min(0.45, (0.3 + rnd() * 0.16) * big * (1 - 0.3 * n / 20)));
    }
    const maxS = Math.max(...bss);
    // Entrée de la grotte autour du groupe, assez haute pour la plus grande
    let l = Math.max(-wd * 0.7, Math.min(...bxs) - 0.1 - maxS * 0.35);
    let r = Math.min(wd * 0.7, Math.max(...bxs) + 0.1 + maxS * 0.35);
    if (r - l < 0.45) { const c = (l + r) / 2; l = Math.max(-wd * 0.7, c - 0.225); r = Math.min(wd * 0.7, c + 0.225); }
    this.mouthL = l; this.mouthR = r;
    let top = 0;
    for (let i = 0; i <= 8; i++) top = Math.max(top, this.outline(l + (r - l) * i / 8));
    top += 0.07;
    const hgt = maxS * 1.45 + 0.14, step = (r - l) / (MC - 1);
    for (let i = 0; i < MC; i++) {
      const t = i / (MC - 1), edge = i === 0 || i === MC - 1;
      const inset = i === 0 ? 0.04 : i === MC - 1 ? -0.04 : 0;
      this.ceilX[i] = l + (r - l) * t + inset + (edge ? 0 : (rnd() - 0.5) * step * 0.4);
      this.ceilY[i] = top + (edge ? 0.13 : rnd() * 0.04);
      this.floorX[i] = l + (r - l) * t + inset + (edge ? 0 : (rnd() - 0.5) * step * 0.4);
      this.floorY[i] = top + hgt + (edge ? -0.12 : Math.sin(t * Math.PI) * 0.06 + rnd() * 0.04);
    }
    this.mouthTop = top;
    this.mouthBottom = Math.max(...this.floorY);
    // Bas du rocher : une pointe au hasard, et toujours assez profond sous la grotte
    const spacing = 2 * wd / (K - 1);
    const depthMax = 0.45 + 0.3 * half + rnd() * 0.15;
    const apex = 2 + Math.floor(rnd() * (K - 4));
    for (let i = 0; i < K; i++) {
      const x = -wd + spacing * i;
      this.bx[i] = x;
      if (i === 0 || i === K - 1) { this.by[i] = this.outline(x) + 0.04; continue; }
      const q = x / wd;
      let y = this.outline(x) + depthMax * Math.pow(Math.max(0, 1 - q * q), 0.55) * (0.8 + rnd() * 0.4);
      if (x > l - spacing && x < r + spacing) y = Math.max(y, this.mouthBottom + 0.16 + rnd() * 0.08);
      if (i === apex) y += 0.18 + rnd() * 0.2;
      this.by[i] = y;
      this.deepest = Math.max(this.deepest, y);
    }
    // Facettes : trois rangées de points (haut caché derrière le bloc, milieu, bas), en triangles
    const rows = [[], [], []];
    for (let i = 0; i < K; i++) {
      const x = this.bx[i], y0 = this.outline(x) - 0.08, edge = i === 0 || i === K - 1;
      rows[0].push(x, y0);
      rows[1].push(x + (edge ? 0 : (rnd() - 0.5) * spacing * 0.5), y0 + (this.by[i] - y0) * (0.38 + rnd() * 0.24));
      rows[2].push(x, this.by[i]);
    }
    const tri = (ra, ia, rb, ib, rc, ic) => {
      const t = [rows[ra][2 * ia], rows[ra][2 * ia + 1], rows[rb][2 * ib], rows[rb][2 * ib + 1], rows[rc][2 * ic], rows[rc][2 * ic + 1]];
      this.tris.push(t);
      const cx = (t[0] + t[2] + t[4]) / 3, cy = (t[1] + t[3] + t[5]) / 3;
      const df = clamp((cy - depth) / Math.max(0.1, this.deepest - depth), 0, 1);
      this.triColors.push(batRock(0.7 - 0.3 * cx / wd - 0.4 * df + (rnd() - 0.5) * 0.16));
    };
    for (let i = 0; i < K - 1; i++) for (let rw = 0; rw <= 1; rw++) {
      if ((i + rw) % 2 === 0) { tri(rw, i, rw, i + 1, rw + 1, i + 1); tri(rw, i, rw + 1, i + 1, rw + 1, i); }
      else { tri(rw, i, rw, i + 1, rw + 1, i); tri(rw, i + 1, rw + 1, i + 1, rw + 1, i); }
    }
    // Stalactites du rocher (la première a une goutte d'eau)
    const nt = 2 + Math.floor(rnd() * 2);
    for (let j = 0; j < nt; j++) {
      const x = (rnd() * 1.5 - 0.75) * wd;
      this.tips.push([x, this.bottomAt(x) - 0.05, 0.045 + rnd() * 0.035, 0.14 + rnd() * 0.2, j === 0 ? rnd() * 3.2 : -1]);
    }
    // Petites stalactites au plafond de la grotte
    const ni = Math.floor(rnd() * 3);
    for (let j = 0; j < ni; j++) this.innerTips.push([l + 0.08 + rnd() * Math.max(0, r - l - 0.16), 0.022 + rnd() * 0.02, 0.06 + rnd() * 0.08]);
    // Cristaux sur le rebord, une fois sur deux
    if (rnd() < 0.55) {
      const cx = l + 0.1 + rnd() * Math.max(0, r - l - 0.2), nc = 2 + Math.floor(rnd() * 2);
      for (let j = 0; j < nc; j++) {
        const x = cx + (j - 1) * 0.055 + (rnd() - 0.5) * 0.02;
        this.crystals.push([x, this.floorAt(x) + 0.015, 0.09 + rnd() * 0.1, (j - 1) * 0.03 + (rnd() - 0.5) * 0.02]);
      }
    }
    // Les chauves-souris, accrochées au plafond de la grotte
    for (let i = 0; i < n; i++) {
      const x = clamp(bxs[i], l + 0.05, r - 0.05);
      this.bats.push({ u: x, v: this.ceilAt(x) + 0.012, s: bss[i], ear: Math.floor(rnd() * 3), chub: 0.8 + rnd() * 0.45,
        tone: Math.floor(rnd() * BAT_TONES.length), ph: rnd() * 6.283, awake: false });
    }
    // Dessinées de la plus petite à la plus grande (les grandes devant)
    this.bats.sort((p, q) => p.s - q.s);
  }

  /** Haut du rocher (bord bas visible du bloc) à l'abscisse x. */
  outline(x) {
    const q = clamp(x / this.wd, -1, 1);
    return this.sq ? this.d + this.a * (1 - Math.abs(q)) : this.d + this.ry * Math.sqrt(1 - q * q);
  }
  bottomAt(x) { return batInterp(this.bx, this.by, x); }
  ceilAt(x) { return batInterp(this.ceilX, this.ceilY, x); }
  floorAt(x) { return batInterp(this.floorX, this.floorY, x); }
}

// ---------- Apparition ----------

/**
 * Mode libre : le bloc en train d'être créé aura-t-il des chauves-souris ? 0 non, 1 oui, 2 oui et elles attaquent
 * (l'imprévu mortel prévu, batDoomAt, force un bloc dès que son moment est passé).
 */
function batsPick(kind, jumpNo) {
  if (kind !== Kind.NORMAL) return 0;
  if (batDoomAt >= 0 && time >= batDoomAt) {
    batDoomAt = -1;
    if (test.forceDoom || (score < 15 && score < best)) return 2;
  }
  return jumpNo >= 3 && Math.random() < BAT_CHANCE ? 1 : 0;
}

/**
 * Distance d'un bloc à chauves-souris : plus loin que d'habitude, pour que sa grotte ne soit pas cachée par le bloc
 * d'où l'on saute, mais toujours à portée d'un saut lancé depuis la position du personnage.
 */
function batsDistance(dist, half) {
  const back = Math.max(0, alongX ? current.cx - px : current.cz - pz);
  const want = 1.9 * (current.half + half) + 0.3;
  const cap = maxReach - 0.45 - back;
  return Math.max(dist, Math.min(want, cap));
}

/** Menu de test : le prochain bloc est refait jusqu'à porter des chauves-souris qui attaquent (posé plus loin, comme en jeu). */
function batsTest() {
  test.forceDoom = true;
  for (let i = 0; i < 40; i++) {
    const at = platforms.indexOf(next);
    if (at >= 0) platforms.splice(at, 1);
    batDoomAt = time;
    spawnNext();
    if (next.bats) break;
  }
  batDoomAt = -1;
  if (!next.bats) next.bats = new BatRoost(next.half, next.round, platformDepth, true);
  updateCameraTarget();
}

// ---------- Réveil ----------

function batLaunch(p, b, delay) {
  b.awake = true;
  const x = sx(p.cx, p.cz) + b.u * k + camX;
  const y = sy(p.cx, 0, p.cz) + (p.dropY + p.leaveY + p.riseOffset + b.v) * k + camY;
  const a = Math.random() * 6.2831855, sp = w * (0.5 + Math.random() * 0.45);
  const f = { x, y: y + b.s * k * 0.7, s: b.s * k * 1.25, ear: b.ear, tone: b.tone, ph: b.ph, delay,
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, attack: false, hitAt: 0, side: 1, x0: 0, y0: 0 };
  batFx.flying.push(f);
  return f;
}

/** On vient de se poser (mode libre, état READY) : réveil des chauves-souris du bloc, ou imprévu mortel. */
function batsOnLand() {
  const roost = current.bats;
  if (!roost) return;
  const sleeping = roost.bats.filter((b) => !b.awake);
  if (!sleeping.length) return;
  if (roost.doom && state === State.READY && (test.forceDoom || (score < 15 && score < best))) { batDoomStart(sleeping); return; }
  // Aucune, une partie ou toutes
  const r = Math.random();
  let woken;
  if (r < 0.3) woken = [];
  else if (r < 0.65) { woken = sleeping.filter(() => Math.random() < 0.5); if (!woken.length) woken = [sleeping[Math.floor(Math.random() * sleeping.length)]]; }
  else woken = sleeping;
  if (!woken.length) return;
  for (const b of woken) batLaunch(current, b, Math.random() * 0.45);
  // Quelques-unes : un cri isolé ; un groupe (6 ou plus) : le bruit d'un envol
  if (woken.length >= 6) sounds.play('BATS_FLY', Math.min(1, 0.5 + 0.03 * woken.length)); else sounds.play('BAT', 0.8);
}

function batDoomStart(sleeping) {
  test.forceDoom = false;
  state = State.STRUCK; strikeT = 0; struckDead = true; doomKind = 4; doomHappened(); Stats.add('bats');
  batFx.side = Math.random() < 0.5 ? -1 : 1; batFx.hit = false; batFx.fallVy = 0;
  // Une à trois foncent sur le joueur, les autres (au hasard) s'envolent ailleurs
  const shuffled = sleeping.slice().sort(() => Math.random() - 0.5);
  const attackers = shuffled.slice(0, 1 + Math.floor(Math.random() * Math.min(3, sleeping.length)));
  attackers.forEach((b, i) => {
    const f = batLaunch(current, b, 0.1 + i * 0.12);
    f.attack = true; f.hitAt = BAT_HIT + i * 0.07; f.side = batFx.side; f.x0 = f.x; f.y0 = f.y;
  });
  for (const b of sleeping) if (!b.awake && Math.random() < 0.6) batLaunch(current, b, 0.2 + Math.random() * 0.6);
  sounds.play('BATS_FLY');
}

/** Déroulé de l'imprévu mortel (appelé par updateStrike quand doomKind = 4). */
function updateBatDoom(before) {
  const t = strikeT;
  scareT = scareDuration;          // le personnage voit les chauves-souris arriver, puis tombe
  if (before < BAT_HIT && t >= BAT_HIT) {
    batFx.hit = true; batFx.fallVy = -3.2;
    sounds.play('FALL'); sounds.play('BAT', 0.9); vibrate(300); shake(0.1);
    spawnSparkles(sx(px, pz) + camX, sy(px, playerHeight * 0.6, pz) + camY, Color.parseColor('#3A2F3A'), 10);
  }
  if (t >= BAT_END) endGame(tr('reason.bats'));
}

/** Fin de l'imprévu passée d'un toucher : le personnage est déjà tombé. */
function batDoomSkip() { py = -60; }

// ---------- Vol ----------

function updateBats(dt) {
  // Le joueur percuté : poussé du côté opposé aux chauves-souris, vers l'avant, et tombe
  if (state === State.STRUCK && doomKind === 4 && batFx.hit) {
    const push = 3.4 * dt;
    if (batFx.side < 0) pz -= push; else px -= push;
    batFx.fallVy += 26 * dt;
    py -= batFx.fallVy * dt;
  }
  const list = batFx.flying;
  if (!list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.t += dt;
    if (b.t < b.delay) continue;
    const ft = b.t - b.delay;
    if (b.attack && strikeT < b.hitAt && state === State.STRUCK) {
      // Courbe : sort de sous le bloc vers le côté, puis fonce sur le joueur
      const tx = sx(px, pz) + camX, ty = sy(px, playerHeight * 0.6, pz) + camY;
      const q = clamp((strikeT - b.delay) / (b.hitAt - b.delay), 0, 1);
      const cx = tx + b.side * w * 0.42, cy = Math.min(b.y0, ty) - h * 0.08;
      const nx = (1 - q) * (1 - q) * b.x0 + 2 * (1 - q) * q * cx + q * q * tx;
      const ny = (1 - q) * (1 - q) * b.y0 + 2 * (1 - q) * q * cy + q * q * ty;
      if (dt > 0) { b.vx = (nx - b.x) / dt; b.vy = (ny - b.y) / dt; }
      b.x = nx; b.y = ny;
      continue;
    }
    if (b.attack) {
      // Après l'impact : file tout droit, en accélérant
      b.attack = false;
      const l = Math.max(1, Math.hypot(b.vx, b.vy)), sp = Math.max(w * 0.9, l);
      b.vx = b.vx / l * sp; b.vy = b.vy / l * sp - h * 0.2;
    }
    // Les premiers instants, elle se laisse tomber puis prend son élan
    const go = Math.min(1, ft / 0.35);
    b.x += b.vx * go * dt;
    b.y += (b.vy * go + (1 - go) * w * 0.25) * dt;
    const m = b.s * 2, ex = b.x - camX, ey = b.y - camY;
    if (ft > 0.3 && (ex < -m || ex > w + m || ey < -m || ey > h + m)) list.splice(i, 1);
  }
}

/** Les chauves-souris en vol, par-dessus les blocs et le personnage. */
function drawFlyingBats(canvas) {
  for (const b of batFx.flying) {
    if (b.t < b.delay) continue;
    const dir = b.vx >= 0 ? 1 : -1;
    const wob = Math.sin(b.t * 9 + b.ph) * b.s * 0.12;
    drawBatFlying(canvas, b.x - camX, b.y - camY + wob, b.s, Math.sin(b.t * 22 + b.ph), dir, b.ear, b.tone);
  }
}

// ---------- Dessins ----------

const BAT_CAVE_COLORS = [0xFF0F0B15, 0xFF241C2E, 0xFF3B2F49], BAT_CAVE_STOPS = [0, 0.55, 1];
/** Cristaux : clair, foncé et lueur (violet, bleu). */
const BAT_CRYSTALS = [[0xFFE2C8FF, 0xFF9460DC, [170, 110, 255]], [0xFFC8F4FF, 0xFF4FA3D9, [100, 200, 255]]];

/** Contour de l'entrée de la grotte (plafond de gauche à droite, rebord de droite à gauche). */
function batMouthPath(r) {
  const path = batPath, n = BAT_MC;
  path.reset();
  path.moveTo(r.ceilX[0] * k, r.ceilY[0] * k);
  for (let i = 1; i < n; i++) path.lineTo(r.ceilX[i] * k, r.ceilY[i] * k);
  path.lineTo((r.mouthR + 0.02) * k, (r.ceilY[n - 1] + r.floorY[n - 1]) * 0.5 * k);
  for (let i = n - 1; i >= 0; i--) path.lineTo(r.floorX[i] * k, r.floorY[i] * k);
  path.lineTo((r.mouthL - 0.02) * k, (r.ceilY[0] + r.floorY[0]) * 0.5 * k);
  path.close();
}

/** Une stalactite en deux moitiés (gauche éclairée, droite dans l'ombre). */
function drawBatSpike(canvas, x, y0, w, len, light, dark) {
  const p = batPaint, path = batPath;
  path.reset(); path.moveTo((x - w) * k, y0 * k); path.lineTo(x * k, y0 * k); path.lineTo(x * k, (y0 + len) * k); path.close();
  p.color = light; canvas.drawPath(path, p);
  path.reset(); path.moveTo(x * k, y0 * k); path.lineTo((x + w) * k, y0 * k); path.lineTo(x * k, (y0 + len) * k); path.close();
  p.color = dark; canvas.drawPath(path, p);
}

/**
 * Dessous rocheux et chauves-souris suspendues (repère du bloc : origine au centre du dessus) : rocher en facettes,
 * stalactites, entrée de grotte sombre éclairée par une faible lueur, chauves-souris au plafond, cristaux qui
 * luisent sur le rebord.
 */
function drawBatRoost(canvas, r) {
  const p = batPaint, st = batStroke, path = batPath, PC = Color.parseColor;
  p.shader = null;
  // Facettes (un trait de la même couleur bouche les fentes entre les triangles)
  st.strokeWidth = k * 0.012;
  for (let i = 0; i < r.tris.length; i++) {
    const t = r.tris[i];
    path.reset(); path.moveTo(t[0] * k, t[1] * k); path.lineTo(t[2] * k, t[3] * k); path.lineTo(t[4] * k, t[5] * k); path.close();
    p.color = r.triColors[i]; canvas.drawPath(path, p);
    st.color = r.triColors[i]; canvas.drawPath(path, st);
  }
  // Stalactites du rocher, et la goutte d'eau
  for (const t of r.tips) {
    const x = t[0], y0 = t[1], len = t[3];
    drawBatSpike(canvas, x, y0, t[2], len, batRock(0.5 - 0.2 * x / r.wd), batRock(0.12));
    if (t[4] >= 0) {
      const u = (time + t[4]) % 3.2, tipY = (y0 + len) * k;
      if (u < 2.2) { p.color = Color.argb(200, 190, 222, 255); canvas.drawCircle(x * k, tipY + k * 0.02 * (u / 2.2), k * 0.03 * (u / 2.2), p); }
      else { const q = u - 2.2; p.color = Color.argb(Math.round(200 * (1 - q)), 190, 222, 255); canvas.drawCircle(x * k, tipY + k * (0.02 + 1.6 * q * q), k * 0.028, p); }
    }
  }
  // Entrée de la grotte : le noir au fond, une faible lueur vers le rebord
  batMouthPath(r);
  p.color = 0xFFFFFFFF;
  p.shader = new LinearGradient(0, r.mouthTop * k, 0, r.mouthBottom * k, BAT_CAVE_COLORS, BAT_CAVE_STOPS);
  canvas.drawPath(path, p);
  canvas.save();
  canvas.clipPath(path);
  const mx = (r.mouthL + r.mouthR) * 0.5 * k, rad = (r.mouthR - r.mouthL) * 0.6 * k, my = r.mouthBottom * k;
  p.shader = new RadialGradient(mx, my, rad, [Color.argb(85, 160, 120, 210), Color.argb(0, 160, 120, 210)]);
  canvas.drawRect(mx - rad, my - rad, mx + rad, my + rad, p);
  p.shader = null;
  for (const t of r.innerTips) drawBatSpike(canvas, t[0], r.ceilAt(t[0]) - 0.02, t[1], t[2], PC('#1C1524'), PC('#0D0912'));
  canvas.restore();
  // Plafond en surplomb (trait sombre) et rebord éclairé (trait clair)
  st.strokeWidth = k * 0.04; st.color = PC('#1A1420');
  path.reset(); path.moveTo(r.ceilX[0] * k, r.ceilY[0] * k);
  for (let i = 1; i < BAT_MC; i++) path.lineTo(r.ceilX[i] * k, r.ceilY[i] * k);
  canvas.drawPath(path, st);
  st.strokeWidth = k * 0.03; st.color = batRock(0.85);
  path.reset(); path.moveTo(r.floorX[0] * k, r.floorY[0] * k);
  for (let i = 1; i < BAT_MC; i++) path.lineTo(r.floorX[i] * k, r.floorY[i] * k);
  canvas.drawPath(path, st);
  for (const b of r.bats) if (!b.awake) drawBatHanging(canvas, b.u * k, b.v * k, b.s * k, b);
  // Cristaux sur le rebord, avec leur lueur
  if (r.crystals.length) {
    const c = BAT_CRYSTALS[r.crystalHue], g = c[2];
    const gx = r.crystals[Math.floor(r.crystals.length / 2)][0] * k, gy = (r.crystals[0][1] - 0.06) * k;
    p.color = 0xFFFFFFFF;
    p.shader = new RadialGradient(gx, gy, k * 0.3, [Color.argb(120, g[0], g[1], g[2]), Color.argb(0, g[0], g[1], g[2])]);
    canvas.drawCircle(gx, gy, k * 0.3, p);
    p.shader = null;
    for (const cr of r.crystals) {
      const x = cr[0], y = cr[1], hh = cr[2], lean = cr[3], w = 0.028;
      path.reset(); path.moveTo((x - w) * k, y * k); path.lineTo((x + lean) * k, (y - hh) * k); path.lineTo(x * k, (y + w * 0.6) * k); path.close();
      p.color = c[0]; canvas.drawPath(path, p);
      path.reset(); path.moveTo((x + lean) * k, (y - hh) * k); path.lineTo((x + w) * k, y * k); path.lineTo(x * k, (y + w * 0.6) * k); path.close();
      p.color = c[1]; canvas.drawPath(path, p);
    }
  }
}

/** Chauve-souris endormie, la tête en bas, ailes repliées autour du corps (accrochée en x, y ; taille s px). */
function drawBatHanging(canvas, x, y, s, b) {
  const p = batPaint, st = batStroke, path = batPath, tone = BAT_TONES[b.tone];
  canvas.save();
  canvas.translate(x, y);
  canvas.rotate(Math.sin(time * 1.3 + b.ph) * 5);
  // Pattes
  st.strokeWidth = s * 0.06; st.color = tone[0];
  canvas.drawLine(-s * 0.07, 0, -s * 0.05, s * 0.16, st);
  canvas.drawLine(s * 0.07, 0, s * 0.05, s * 0.16, st);
  // Ailes repliées (goutte)
  const bw = s * 0.28 * b.chub;
  path.reset();
  path.moveTo(0, s * 0.1);
  path.quadTo(bw * 1.25, s * 0.22, bw, s * 0.62);
  path.quadTo(bw * 0.8, s * 0.92, 0, s * 0.96);
  path.quadTo(-bw * 0.8, s * 0.92, -bw, s * 0.62);
  path.quadTo(-bw * 1.25, s * 0.22, 0, s * 0.1);
  path.close();
  p.color = tone[1]; canvas.drawPath(path, p);
  // Plis de la membrane et pouces griffus
  st.strokeWidth = s * 0.03; st.color = tone[0];
  canvas.drawLine(-bw * 0.35, s * 0.2, -bw * 0.45, s * 0.85, st);
  canvas.drawLine(bw * 0.35, s * 0.2, bw * 0.45, s * 0.85, st);
  p.color = tone[0];
  canvas.drawCircle(-bw * 0.9, s * 0.3, s * 0.035, p);
  canvas.drawCircle(bw * 0.9, s * 0.3, s * 0.035, p);
  // Tête en bas, oreilles vers le bas
  const hy = s * 1.02, hr = s * 0.18;
  drawBatEars(canvas, 0, hy, hr, b.ear, 1, tone[0]);
  p.color = tone[0]; canvas.drawCircle(0, hy, hr, p);
  // Yeux rouges (ferment de temps en temps)
  const blink = ((time + b.ph * 3) % 4.5) > 4.3;
  drawBatEyes(canvas, 0, hy + hr * 0.25, hr, blink);
  canvas.restore();
}

/** Oreilles autour de la tête ; dir 1 = vers le bas (suspendue), -1 = vers le haut (en vol). */
function drawBatEars(canvas, cx, cy, hr, ear, dir, color) {
  const p = batPaint, path = batPath;
  p.color = color;
  for (const sgn of [-1, 1]) {
    if (ear === 1) { canvas.drawCircle(cx + sgn * hr * 0.7, cy + dir * hr * 0.85, hr * 0.45, p); continue; }
    const len = ear === 2 ? 1.9 : 1.35;
    path.reset();
    path.moveTo(cx + sgn * hr * 0.2, cy + dir * hr * 0.5);
    path.lineTo(cx + sgn * hr * 0.95, cy + dir * hr * 0.3);
    path.lineTo(cx + sgn * hr * 0.85, cy + dir * hr * len);
    path.close();
    canvas.drawPath(path, p);
  }
}

/** Deux yeux rouges qui luisent (ou un trait s'ils clignent). */
function drawBatEyes(canvas, cx, cy, hr, closed) {
  const p = batPaint, PC = Color.parseColor, ex = hr * 0.42;
  if (closed) {
    batStroke.strokeWidth = hr * 0.12; batStroke.color = PC('#8A1C1C');
    canvas.drawLine(cx - ex - hr * 0.14, cy, cx - ex + hr * 0.14, cy, batStroke);
    canvas.drawLine(cx + ex - hr * 0.14, cy, cx + ex + hr * 0.14, cy, batStroke);
    return;
  }
  p.color = Color.argb(90, 255, 40, 30);
  canvas.drawCircle(cx - ex, cy, hr * 0.38, p); canvas.drawCircle(cx + ex, cy, hr * 0.38, p);
  p.color = PC('#FF2A1F');
  canvas.drawCircle(cx - ex, cy, hr * 0.2, p); canvas.drawCircle(cx + ex, cy, hr * 0.2, p);
  p.color = PC('#FFD0C8');
  canvas.drawCircle(cx - ex + hr * 0.06, cy - hr * 0.06, hr * 0.07, p); canvas.drawCircle(cx + ex + hr * 0.06, cy - hr * 0.06, hr * 0.07, p);
}

/** Chauve-souris en vol, ailes déployées qui battent (flap de -1 à 1), tournée vers dir. */
function drawBatFlying(canvas, x, y, s, flap, dir, ear, toneI) {
  const p = batPaint, path = batPath, tone = BAT_TONES[toneI];
  canvas.save();
  canvas.translate(x, y);
  canvas.rotate(dir * 8);
  for (const sgn of [-1, 1]) {
    const tipY = -s * 0.55 * flap - s * 0.1, elbY = -s * 0.32 * flap - s * 0.16;
    path.reset();
    path.moveTo(sgn * s * 0.1, -s * 0.12);
    path.lineTo(sgn * s * 0.5, elbY);
    path.lineTo(sgn * s * 1.0, tipY);
    // Bord de fuite festonné
    path.quadTo(sgn * s * 0.86, tipY * 0.4 + s * 0.02, sgn * s * 0.7, tipY * 0.35 + s * 0.14);
    path.quadTo(sgn * s * 0.56, tipY * 0.25 + s * 0.02, sgn * s * 0.42, tipY * 0.2 + s * 0.18);
    path.quadTo(sgn * s * 0.28, s * 0.06, sgn * s * 0.08, s * 0.2);
    path.close();
    p.color = tone[1]; canvas.drawPath(path, p);
    batStroke.strokeWidth = s * 0.035; batStroke.color = tone[0];
    canvas.drawLine(sgn * s * 0.1, -s * 0.12, sgn * s * 0.5, elbY, batStroke);
    canvas.drawLine(sgn * s * 0.5, elbY, sgn * s * 1.0, tipY, batStroke);
  }
  // Corps et tête
  p.color = tone[0];
  batRect.set(-s * 0.15, -s * 0.2, s * 0.15, s * 0.32); canvas.drawOval(batRect, p);
  const hr = s * 0.15, hy = -s * 0.28;
  drawBatEars(canvas, 0, hy, hr, ear, -1, tone[0]);
  p.color = tone[0]; canvas.drawCircle(0, hy, hr, p);
  drawBatEyes(canvas, dir * hr * 0.12, hy - hr * 0.05, hr, false);
  canvas.restore();
}
