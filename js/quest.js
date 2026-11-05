'use strict';
// Mode Aventure (équivalent de Quest.kt et QuestUi.kt) : saisons de 15 niveaux identiques pour tous,
// drapeau d'arrivée, pièces dorées (objectifs), énergie. Pas d'imprévu, pas de bonus, pas de vies.

/** Générateur « mulberry32 » : exactement la même suite que SeededRandom (Quest.kt). */
function SeededRandom(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Quest = {
  SEASONS: 1,
  LEVELS: 15,
  JUMPS: [15, 17, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 44, 50],
  PALETTE_SIZE: 8,
  /** Météo de chaque niveau de la saison 1 : 0 soleil, 1 pluie, 2 orage (sans foudre), 4 nuages, 5 neige. */
  WEATHER: [0, 0, 4, 0, 1, 4, 5, 0, 1, 4, 5, 2, 4, 1, 2],
  weatherIcon(kind) { return { 1: '🌧️', 2: '⛈️', 4: '☁️', 5: '❄️' }[kind] || '☀️'; },
  /** Récompense (pièces) la première fois qu'on termine le niveau n. */
  reward(n) { return 10 + n; },
  /** Les blocs du niveau n (1 à 15) de la saison : toujours les mêmes (comme Quest.level en Kotlin). */
  level(season, n) {
    const f = Math.fround;
    const t = (n - 1) / (this.LEVELS - 1);
    const rnd = SeededRandom(season * 1000 + n * 37 + 11);
    const jumps = this.JUMPS[n - 1];
    const tramp = n >= 4 ? 0.10 : 0;
    const mini = n >= 8 ? 0.07 : 0;
    const moving = n >= 6 ? Math.min(0.08 + 0.01 * (n - 6), 0.16) : 0;
    const crumble = n >= 7 ? Math.min(0.15 + 0.03 * (n - 7), 0.4) : 0;
    const iceP = n >= 10 ? 0.10 + 0.02 * (n - 10) : 0;
    const blocks = [];
    let prevKind = Kind.NORMAL, prevHalf = 0.85;
    for (let i = 0; i < jumps; i++) {
      // Toujours le même nombre de tirages par bloc, pour rester identique à Android
      const rKind = rnd(), rIce = rnd(), rCrumble = rnd(), rHalf = rnd(), rRound = rnd(), rDist = rnd(), rAlong = rnd(), rColor = rnd(), rCoin = rnd(), rPhase = rnd();
      const last = i === jumps - 1;
      let kind;
      if (last || i === jumps - 2 || i < 2) kind = Kind.NORMAL;
      else if (prevKind === Kind.TRAMPOLINE) kind = Kind.NORMAL;
      else if (rKind < tramp) kind = Kind.TRAMPOLINE;
      else if (rKind < tramp + mini) kind = Kind.MINI;
      else if (rKind < tramp + mini + moving) kind = Kind.MOVING;
      else if (prevKind === Kind.NORMAL && rIce < iceP) kind = Kind.ICE;
      else if (rCrumble < crumble) kind = Kind.CRUMBLY;
      else kind = Kind.NORMAL;
      let half = last ? 0.9 : kind === Kind.MINI ? 0.3 : (0.85 - 0.4 * t) * (0.8 + rHalf * 0.35);
      if (kind === Kind.ICE) half = Math.max(half, ICE_MIN_HALF);
      const isMoving = kind === Kind.MOVING;
      const minDist = prevHalf + half + 0.45 + (isMoving ? 0.8 : 0);
      const dist = minDist + rDist * (isMoving ? 1.2 : 1.0 + 1.3 * t);
      blocks.push({
        kind, half: f(half), round: !last && kind !== Kind.ICE && rRound < 0.4, dist: f(dist), alongX: rAlong < 0.5,
        color: Math.min(this.PALETTE_SIZE - 1, Math.floor(rColor * this.PALETTE_SIZE)), coin: !last && rCoin < 0.3,
        phase: f(rPhase * 6.283), finish: last,
      });
      prevKind = kind; prevHalf = half;
    }
    // Au moins 3 pièces par niveau (toujours aux mêmes endroits)
    if (blocks.filter((b) => b.coin).length < 3) {
      for (let q = 1; q <= 3; q++) blocks[Math.floor(jumps * q / 4)].coin = true;
    }
    return { season, number: n, blocks, perfectGoal: Math.round(jumps * (0.2 + 0.1 * t)), coinCount: blocks.filter((b) => b.coin).length, difficulty: t, weather: this.WEATHER[n - 1] };
  },
};

/** Énergie : 5 ⚡ max, +1 toutes les 20 minutes, un échec coûte 1 ⚡, le plein coûte 100 pièces. */
const Energy = {
  MAX: 5, REGEN: 20 * 60, PRICE: 100,
  now() { return Math.floor(Date.now() / 1000) - 1700000000; },
  get(now) {
    if (!store.getInt('energy_init', 0)) { store.set('energy', this.MAX); store.set('energy_t', now); store.set('energy_init', 1); }
    let e = store.getInt('energy', this.MAX);
    if (e >= this.MAX) return this.MAX;
    let t = store.getInt('energy_t', now);
    if (now < t) { t = now; store.set('energy_t', t); }
    const n = Math.floor((now - t) / this.REGEN);
    if (n > 0) {
      e = Math.min(this.MAX, e + n);
      t = e >= this.MAX ? now : t + n * this.REGEN;
      store.set('energy', e); store.set('energy_t', t);
    }
    return e;
  },
  secondsToNext(now) {
    if (this.get(now) >= this.MAX) return 0;
    return Math.max(0, this.REGEN - (now - store.getInt('energy_t', now)));
  },
  spend(now) {
    const e = this.get(now);
    if (e <= 0) return;
    if (e >= this.MAX) store.set('energy_t', now);
    store.set('energy', e - 1);
  },
  refill(now) { store.set('energy', this.MAX); store.set('energy_t', now); },
  format(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; },
};

/** Progression : niveaux terminés et pièces dorées de chaque niveau. */
const QuestProgress = {
  MEDAL_FINISH: 1, MEDAL_COINS: 2, MEDAL_PERFECTS: 4,
  medals(season, n) { return store.getInt(`q${season}_m${n}`, 0); },
  medalCount(m) { return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1); },
  done(season) { return store.getInt(`q${season}_done`, 0); },
  seasonUnlocked(season) { return season <= 1 || this.done(season - 1) >= Quest.LEVELS; },
  unlocked(season, n) { return this.seasonUnlocked(season) && n <= this.done(season) + 1; },
  totalMedals(season) { let s = 0; for (let n = 1; n <= Quest.LEVELS; n++) s += this.medalCount(this.medals(season, n)); return s; },
  complete(season, n, allCoins, perfectsOk) {
    const before = this.medals(season, n);
    let now = before | this.MEDAL_FINISH;
    if (allCoins) now |= this.MEDAL_COINS;
    if (perfectsOk) now |= this.MEDAL_PERFECTS;
    store.set(`q${season}_m${n}`, now);
    if (n > this.done(season)) store.set(`q${season}_done`, n);
    return [now & ~before, (before & this.MEDAL_FINISH) === 0];
  },
};

const quest = { season: 1, active: false, level: 0, spec: null, spawned: 0, coins: 0, perfects: 0, selected: 1, success: false, newMedals: 0, reward: 0, energyLeft: 0, storyScene: 0, storyPage: 0, storyT: 0 };
const questPaint = new Paint();
const questStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const questPath = new Path();
const Q_GOLD = Color.parseColor('#FFC93C'), Q_GOLD_DARK = Color.parseColor('#C98A00');

// ---------- Partie ----------

function startQuestLevel(n) {
  if (Energy.get(Energy.now()) <= 0) return;
  const spec = Quest.level(quest.season, n);
  Object.assign(quest, { active: true, level: n, spec, spawned: 0, coins: 0, perfects: 0 });
  // Ni météo, ni imprévu, ni catastrophe pendant un niveau
  weather = 0; strikeAt = -1; crashAt = -1; isl.cycloneAt = -1;
  scheduleRocket(false); scheduleEagle(false); scheduleHeli(false); scheduleUfo(false); scheduleWhale(false); scheduleBlizzard(false);
  resetGame();
  // Météo fixée pour le niveau (décor seulement : l'orage n'envoie pas la foudre sur le joueur)
  if (spec.weather) { startWeather(spec.weather, 0.75); strikeAt = -1; }
  banners.push({ text: tr('quest.go', { n, j: spec.blocks.length }), life: 2.6 });
}

function spawnQuest() {
  const spec = quest.spec;
  if (!spec || quest.spawned >= spec.blocks.length) return;
  const b = spec.blocks[quest.spawned++];
  alongX = b.alongX;
  const color = b.finish ? Color.parseColor('#FFE082') : b.kind === Kind.MINI ? Color.parseColor('#F5C542') : b.kind === Kind.ICE ? ICE_COLOR : palette[b.color % palette.length];
  next = new Platform(alongX ? current.cx + b.dist : px, alongX ? pz : current.cz + b.dist, b.half, b.round, color, b.kind, alongX);
  next.movePhase = b.phase;
  next.coin = b.coin ? 1 : 0;
  next.finish = b.finish;
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function completeQuestLevel() {
  const spec = quest.spec;
  if (!spec) return;
  const [fresh, first] = QuestProgress.complete(quest.season, quest.level, quest.coins >= spec.coinCount, quest.perfects >= spec.perfectGoal);
  quest.success = true; quest.newMedals = fresh;
  quest.reward = first ? Quest.reward(quest.level) : 0;
  profile.coins = profile.coins + quest.reward;
  // Fin de la saison 1 : l'aigle devient jouable
  if (quest.level >= Quest.LEVELS) profile.grant(Skins.find(Slot.CHARACTER, 'aigle'));
  quest.energyLeft = Energy.get(Energy.now());
  const x = sx(px, pz) + camX, y = sy(px, 1.2, pz) + camY;
  for (const c of [Q_GOLD, Color.parseColor('#3DBE6E'), Color.parseColor('#FF7A45')]) spawnSparkles(x, y, c, 22);
  sounds.play('UNLOCK');
  vibrate(120);
  state = State.QUEST_END;
}

function failQuest() {
  Energy.spend(Energy.now());
  Object.assign(quest, { success: false, newMedals: 0, reward: 0, energyLeft: Energy.get(Energy.now()) });
  state = State.QUEST_END;
}

function backToQuestMap() { quest.active = false; quest.spec = null; if (!openStoryIfPending()) state = State.QUEST_MAP; }
/** Ouvre la carte de l'Aventure (avec la scène d'histoire en attente, s'il y en a une). */
function openQuestMap() { quest.active = false; if (!openStoryIfPending()) state = State.QUEST_MAP; }
function closeQuestMap() { quest.active = false; quest.spec = null; resetGame(); }

function buyEnergy() {
  if (profile.coins < Energy.PRICE) { banners.push({ text: tr('quest.not_enough'), life: 2 }); return; }
  profile.coins = profile.coins - Energy.PRICE;
  Energy.refill(Energy.now());
  sounds.play('UNLOCK');
}

function questHudLine() {
  const spec = quest.spec;
  if (!spec) return '';
  return tr('quest.progress', { n: quest.level, i: jumps, t: spec.blocks.length }) + `   🪙 ${Math.min(quest.coins, spec.coinCount)}/${spec.coinCount}   🎯 ${Math.min(quest.perfects, spec.perfectGoal)}/${spec.perfectGoal}`;
}

function questCrumbleDur() { return 2.2 - 0.8 * (quest.spec ? quest.spec.difficulty : 0); }

// ---------- Dessin ----------

/** Choix du mode sur l'accueil : « Libre » (le jeu infini, sélectionné) ou « Aventure » (les saisons). */
function drawModeTabs(canvas) {
  const bw = w * 0.4, bh = w * 0.11, top = insetTop + w * 0.585, gap = w * 0.03;
  drawButton(canvas, new RectF(w / 2 - gap / 2 - bw, top, w / 2 - gap / 2, top + bh), '🏃 ' + tr('mode.free'), primaryBtnPaint, w * 0.048, () => banners.push({ text: tr('hud.hint1'), life: 1.6 }));
  drawButton(canvas, new RectF(w / 2 + gap / 2, top, w / 2 + gap / 2 + bw, top + bh), '🗺️ ' + tr('quest.button'), shopPaint, w * 0.048, () => openQuestMap());
}

/** Drapeau d'arrivée planté au fond du dernier bloc (dans le repère du bloc). */
function drawFinishFlag(canvas, p) {
  const bx = isoX(p.half * 0.55, p.half * 0.55), by = isoY(p.half * 0.55, 0, p.half * 0.55), top = by - k * 1.7;
  questStroke.color = Color.parseColor('#5D4037'); questStroke.strokeWidth = k * 0.06;
  canvas.drawLine(bx, by, bx, top, questStroke);
  const fw = k * 0.75, fh = k * 0.45, cols = 4, rows = 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = bx + fw * c / cols, x1 = bx + fw * (c + 1) / cols;
    const wave0 = Math.sin(time * 5 + c * 0.9) * k * 0.05 * c / cols, wave1 = Math.sin(time * 5 + (c + 1) * 0.9) * k * 0.05 * (c + 1) / cols;
    const y0 = top + fh * r / rows, y1 = top + fh * (r + 1) / rows;
    questPath.reset();
    questPath.moveTo(x0, y0 + wave0); questPath.lineTo(x1, y0 + wave1); questPath.lineTo(x1, y1 + wave1); questPath.lineTo(x0, y1 + wave0); questPath.close();
    questPaint.color = (r + c) % 2 === 0 ? Color.parseColor('#2E3A59') : Color.WHITE;
    canvas.drawPath(questPath, questPaint);
  }
  questPaint.color = Q_GOLD;
  canvas.drawCircle(bx, top, k * 0.06, questPaint);
}

function drawMedalCoin(canvas, x, y, r, got) {
  if (got) {
    questPaint.color = Q_GOLD; canvas.drawCircle(x, y, r, questPaint);
    questStroke.color = Q_GOLD_DARK; questStroke.strokeWidth = r * 0.22; canvas.drawCircle(x, y, r * 0.95, questStroke);
  } else { questPaint.color = Color.parseColor('#DDE2EA'); canvas.drawCircle(x, y, r, questPaint); }
}

/** Position (x, z) du niveau n sur la carte : un escalier de blocs qui monte en lacets vers le nid. */
const MAP_STEP = 1.75, MAP_HALF = 0.55, MAP_HEIGHT = 0.5;
function mapCell(n) {
  let x = 0, z = 0;
  for (let i = 1; i < n; i++) { if (Math.floor((i - 1) / 2) % 2 === 0) x += MAP_STEP; else z += MAP_STEP; }
  return [x, z];
}

/** Pièce dorée à plat sur la face gauche d'un bloc : ellipse inclinée comme l'arête du bloc. */
function drawFaceCoin(canvas, cx, cy, r, got) {
  const C30 = Math.cos(Math.PI / 6);
  const ring = (rad) => {
    questPath.reset();
    for (let i = 0; i <= 24; i++) {
      const a = i / 24 * 6.2832, x = cx + rad * Math.cos(a) * C30, y = cy + rad * Math.sin(a) + rad * Math.cos(a) * 0.5;
      if (i === 0) questPath.moveTo(x, y); else questPath.lineTo(x, y);
    }
    questPath.close();
  };
  ring(r);
  if (got) {
    questPaint.color = Q_GOLD; canvas.drawPath(questPath, questPaint);
    questStroke.color = Q_GOLD_DARK; questStroke.strokeWidth = r * 0.2; canvas.drawPath(questPath, questStroke);
    ring(r * 0.45); questPaint.color = Color.parseColor('#FFE082'); canvas.drawPath(questPath, questPaint);
  } else { questPaint.color = Color.argb(70, 0, 0, 0); canvas.drawPath(questPath, questPaint); }
}

/** Carte de la saison en vue isométrique : niveaux en blocs, pièces dorées, énergie. */
function drawQuestMap(canvas) {
  const interactive = state === State.QUEST_MAP, season = quest.season;
  // Ciel et montagnes au loin
  questPaint.color = Color.WHITE;   // fond opaque (la couleur précédente pouvait être transparente)
  questPaint.shader = new LinearGradient(0, 0, 0, h, Color.parseColor('#9FD3F0'), Color.parseColor('#FDE2C8'));
  canvas.drawRect(0, 0, w, h, questPaint);
  questPaint.shader = null;
  questPath.reset();
  questPath.moveTo(0, h * 0.62); questPath.lineTo(w * 0.18, h * 0.45); questPath.lineTo(w * 0.33, h * 0.55); questPath.lineTo(w * 0.62, h * 0.3);
  questPath.lineTo(w * 0.82, h * 0.46); questPath.lineTo(w, h * 0.38); questPath.lineTo(w, h); questPath.lineTo(0, h); questPath.close();
  questPaint.color = Color.argb(70, 120, 140, 175);
  canvas.drawPath(questPath, questPaint);
  // En-tête : saison, énergie, pièces
  const now = Energy.now(), e = Energy.get(now), top = insetTop + w * 0.03, headH = e < Energy.MAX ? w * 0.38 : w * 0.27;
  rect.set(w * 0.04, top, w * 0.96, top + headH);
  canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.06;
  canvas.drawText(tr('quest.season', { n: season }) + ' · ' + tr(`quest.s${season}.title`), w / 2, top + w * 0.09, darkTextPaint);
  const ey = top + w * 0.18;
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.055;
  canvas.drawText(`⚡ ${e}/${Energy.MAX}`, w * 0.09, ey, darkTextPaint);
  greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = w * 0.033;
  canvas.drawText(e >= Energy.MAX ? tr('quest.energy_full') : tr('quest.energy_next', { t: Energy.format(Energy.secondsToNext(now)) }), w * 0.09, ey + w * 0.05, greyTextPaint);
  greyTextPaint.textAlign = Align.CENTER;
  drawCoinPill(canvas, w * 0.91, ey - w * 0.005, true);
  if (e < Energy.MAX) {
    const bh = w * 0.085;
    drawButton(canvas, new RectF(w * 0.25, ey + w * 0.085, w * 0.75, ey + w * 0.085 + bh), tr('quest.refill', { n: Energy.PRICE }), shopPaint, w * 0.04, () => { if (interactive) buyEnergy(); });
  }
  // Bas : total des pièces dorées et retour
  const backH = w * 0.11, backTop = ub() - w * 0.05 - backH;
  drawButton(canvas, new RectF(w * 0.3, backTop, w * 0.7, backTop + backH), tr('quest.back'), primaryBtnPaint, w * 0.05, () => { if (interactive) closeQuestMap(); });
  const totalY = backTop - w * 0.04;
  progText.textSize = w * 0.042;
  const totalText = '🪙 ' + tr('quest.total', { n: QuestProgress.totalMedals(season), t: Quest.LEVELS * 3 });
  const tw = progText.measureText(totalText) + w * 0.06;
  rect.set(w / 2 - tw / 2, totalY - w * 0.06, w / 2 + tw / 2, totalY + w * 0.02);
  progPaint.color = Color.argb(120, 0, 0, 0);
  canvas.drawRoundRect(rect, w * 0.04, w * 0.04, progPaint);
  progText.color = Color.WHITE;
  canvas.drawText(totalText, w / 2, totalY, progText);
  // Échelle de la carte : tout l'escalier tient entre l'en-tête et le bas, quel que soit l'écran
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let n = 1; n <= Quest.LEVELS; n++) {
    const [cx, cz] = mapCell(n), ux = (cx - cz) * C30, uy = -(cx + cz) * S30;
    minX = Math.min(minX, ux - (MAP_HALF * 2 + 0.2) * C30); maxX = Math.max(maxX, ux + (MAP_HALF * 2 + 0.2) * C30);
    minY = Math.min(minY, uy - 1.7); maxY = Math.max(maxY, uy + MAP_HALF + MAP_HEIGHT + 0.1);
  }
  const areaTop = top + headH + w * 0.04, areaBot = totalY - w * 0.09;
  const s = Math.min(w * 0.92 / (maxX - minX), (areaBot - areaTop) / (maxY - minY), w / 6.5);
  const ox = w / 2 - (minX + maxX) / 2 * s, oy = (areaTop + areaBot) / 2 - (minY + maxY) / 2 * s;
  const PX = (x, z) => ox + (x - z) * C30 * s, PY = (x, y, z) => oy + (-(x + z) * S30 - y) * s;
  const done = QuestProgress.done(season);
  for (let n = Quest.LEVELS; n >= 1; n--) {
    const [cx, cz] = mapCell(n);
    const unlocked = QuestProgress.unlocked(season, n), isDone = n <= done, cur = unlocked && !isDone;
    const color = Color.parseColor(isDone ? '#3DBE6E' : cur ? '#FF7A45' : n === Quest.LEVELS ? '#B79B73' : '#C9CED8');
    const a = MAP_HALF, bounce = cur ? Math.abs(Math.sin(time * 3)) * 0.08 : 0;
    const nx = PX(cx - a, cz - a), ny = PY(cx - a, bounce, cz - a), rx = PX(cx + a, cz - a), ry = PY(cx + a, bounce, cz - a);
    const fx2 = PX(cx + a, cz + a), fy = PY(cx + a, bounce, cz + a), lx = PX(cx - a, cz + a), ly = PY(cx - a, bounce, cz + a);
    const dy = (MAP_HEIGHT + bounce) * s, sh = s * 0.12;
    const poly = (pts, c) => { questPaint.color = c; questPath.reset(); questPath.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) questPath.lineTo(pts[i], pts[i + 1]); questPath.close(); canvas.drawPath(questPath, questPaint); };
    poly([nx, ny + dy + sh, rx, ry + dy + sh, fx2, fy + dy + sh, lx, ly + dy + sh], Color.argb(40, 0, 0, 0));
    poly([lx, ly, nx, ny, nx, ny + dy, lx, ly + dy], shade(color, 0.82));
    poly([nx, ny, rx, ry, rx, ry + dy, nx, ny + dy], shade(color, 0.62));
    poly([nx, ny, rx, ry, fx2, fy, lx, ly], shade(color, 1.08));
    const tx = PX(cx, cz), ty = PY(cx, bounce, cz);
    btnTextPaint.color = Color.WHITE; btnTextPaint.textSize = s * (unlocked ? 0.55 : 0.42);
    canvas.drawText(unlocked ? String(n) : '🔒', tx, ty - (btnTextPaint.descent() + btnTextPaint.ascent()) / 2, btnTextPaint);
    // Les 3 pièces dorées, posées sur la face gauche du bloc (déformées selon sa perspective)
    if (unlocked) {
      const m = QuestProgress.medals(season, n);
      for (let j = 0; j < 3; j++) { const tt = 0.22 + 0.28 * j; drawFaceCoin(canvas, lx + (nx - lx) * tt, ly + (ny - ly) * tt + dy * 0.52, s * 0.115, (m & (1 << j)) !== 0); }
    }
    if (n === Quest.LEVELS) {
      darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = s * 0.8;
      canvas.drawText('🪺', tx, ty - s * 0.55, darkTextPaint);
    }
    if (cur) {
      const my = ty - s * 0.6 - Math.abs(Math.sin(time * 3)) * s * 0.15;
      poly([tx - s * 0.18, my - s * 0.2, tx + s * 0.18, my - s * 0.2, tx, my], Color.parseColor('#FF7A45'));
    }
    if (interactive) {
      buttons.push({ rect: new RectF(tx - s * 0.95, ty - s * 0.95, tx + s * 0.95, ty + s * 0.75), action: () => {
        if (unlocked) { quest.selected = n; state = State.QUEST_INTRO; } else banners.push({ text: tr('quest.locked'), life: 2 });
      } });
    }
  }
  // L'aigle tourne en planant autour de son nid, au sommet (il regarde dans le sens où il vole)
  const [nx0, nz0] = mapCell(Quest.LEVELS), ang = time * 0.55;
  const eagleX = PX(nx0, nz0) + Math.cos(ang) * w * 0.26, eagleY = PY(nx0, 1.6, nz0) + Math.sin(ang) * w * 0.05 + Math.sin(time * 1.7) * w * 0.01;
  drawEagle(canvas, eagleX, eagleY, w * 0.06, Math.sin(ang) > 0 ? -1 : 1);
}

function drawQuestCard(canvas, top, bottom) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  rect.set(w * 0.07, top, w * 0.93, bottom);
  canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
}

function questObjectiveLine(canvas, y, got, text, fresh) {
  const cx = w * 0.16, cy = y - w * 0.014;
  // Pièce gagnée à l'instant : halo vert qui pulse
  if (fresh) { questPaint.color = Color.argb(Math.floor(90 + 60 * Math.sin(time * 5)), 61, 190, 110); canvas.drawCircle(cx, cy, w * 0.048, questPaint); }
  drawMedalCoin(canvas, cx, cy, w * 0.03, got);
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.042;
  darkTextPaint.color = Color.parseColor(fresh ? '#2E8B57' : got ? '#2E3A59' : '#7A869A');
  canvas.drawText(fitText(text, darkTextPaint, w * 0.68), w * 0.21, y, darkTextPaint);
  darkTextPaint.color = Color.parseColor('#2E3A59');
}

function drawQuestIntro(canvas) {
  const n = quest.selected, spec = Quest.level(quest.season, n);
  const top = h * 0.24, bottom = top + w * 1.02;
  drawQuestCard(canvas, top, bottom);
  buttons = [];   // la carte dessinée dessous ne doit pas capter les touchers
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.075;
  canvas.drawText(tr('quest.level', { n }), w / 2, top + w * 0.13, darkTextPaint);
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.042;
  canvas.drawText(tr('quest.jumps', { n: spec.blocks.length }) + '   ' + Quest.weatherIcon(spec.weather), w / 2, top + w * 0.2, greyTextPaint);
  const m = QuestProgress.medals(quest.season, n);
  let y = top + w * 0.32;
  questObjectiveLine(canvas, y, (m & QuestProgress.MEDAL_FINISH) !== 0, tr('quest.obj.finish'), false); y += w * 0.1;
  questObjectiveLine(canvas, y, (m & QuestProgress.MEDAL_COINS) !== 0, tr('quest.obj.coins', { n: spec.coinCount }), false); y += w * 0.1;
  questObjectiveLine(canvas, y, (m & QuestProgress.MEDAL_PERFECTS) !== 0, tr('quest.obj.perfects', { n: spec.perfectGoal }), false);
  const now = Energy.now(), e = Energy.get(now);
  y += w * 0.12;
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.045;
  canvas.drawText(`⚡ ${e}/${Energy.MAX}`, w / 2, y, darkTextPaint);
  greyTextPaint.textSize = w * 0.034;
  canvas.drawText(e > 0 ? tr('quest.energy_cost') : tr('quest.energy_next', { t: Energy.format(Energy.secondsToNext(now)) }), w / 2, y + w * 0.05, greyTextPaint);
  const bh = w * 0.12, by = bottom - w * 0.3;
  if (e > 0) drawButton(canvas, new RectF(w * 0.2, by, w * 0.8, by + bh), '▶ ' + tr('quest.play'), primaryBtnPaint, w * 0.06, () => startQuestLevel(n));
  else drawButton(canvas, new RectF(w * 0.15, by, w * 0.85, by + bh), tr('quest.refill', { n: Energy.PRICE }), shopPaint, w * 0.045, () => buyEnergy());
  drawButton(canvas, new RectF(w * 0.3, by + bh + w * 0.04, w * 0.7, by + bh * 1.8 + w * 0.04), tr('quest.back'), tabOffPaint, w * 0.045, () => { state = State.QUEST_MAP; });
}

function drawQuestEnd(canvas) {
  const n = quest.level, spec = quest.spec || Quest.level(quest.season, n);
  const top = h * 0.2, bottom = top + w * 1.12;
  drawQuestCard(canvas, top, bottom);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.075;
  darkTextPaint.color = Color.parseColor(quest.success ? '#2E8B57' : '#E53950');
  canvas.drawText(tr(quest.success ? 'quest.won' : 'quest.lost'), w / 2, top + w * 0.13, darkTextPaint);
  darkTextPaint.color = Color.parseColor('#2E3A59');
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.042;
  canvas.drawText(tr('quest.level', { n }), w / 2, top + w * 0.2, greyTextPaint);
  const m = QuestProgress.medals(quest.season, n), nm = quest.newMedals;
  let y = top + w * 0.31;
  questObjectiveLine(canvas, y, (m & 1) !== 0, tr('quest.obj.finish'), (nm & 1) !== 0); y += w * 0.1;
  questObjectiveLine(canvas, y, (m & 2) !== 0, tr('quest.obj.coins', { n: spec.coinCount }) + `  (${Math.min(quest.coins, spec.coinCount)}/${spec.coinCount})`, (nm & 2) !== 0); y += w * 0.1;
  questObjectiveLine(canvas, y, (m & 4) !== 0, tr('quest.obj.perfects', { n: spec.perfectGoal }) + `  (${Math.min(quest.perfects, spec.perfectGoal)}/${spec.perfectGoal})`, (nm & 4) !== 0);
  y += w * 0.12;
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.045;
  const info = !quest.success ? tr('quest.lost_energy', { n: quest.energyLeft })
    : n >= Quest.LEVELS && quest.reward > 0 ? tr('quest.season_done') + `  +${quest.reward} 🪙`
    : quest.reward > 0 ? tr('quest.reward', { n: quest.reward }) : '';
  if (info) canvas.drawText(fitText(info, darkTextPaint, w * 0.8), w / 2, y, darkTextPaint);
  const bh = w * 0.12, by = bottom - w * 0.3;
  if (quest.success && n < Quest.LEVELS) {
    drawButton(canvas, new RectF(w * 0.18, by, w * 0.82, by + bh), tr('quest.next') + ' ▶', primaryBtnPaint, w * 0.055, () => { backToQuestMap(); if (state === State.QUEST_MAP) { quest.selected = n + 1; state = State.QUEST_INTRO; } });
  } else if (!quest.success && quest.energyLeft > 0) {
    drawButton(canvas, new RectF(w * 0.18, by, w * 0.82, by + bh), '↻ ' + tr('quest.retry'), primaryBtnPaint, w * 0.055, () => startQuestLevel(n));
  } else if (!quest.success) {
    drawButton(canvas, new RectF(w * 0.12, by, w * 0.88, by + bh), tr('quest.refill', { n: Energy.PRICE }), shopPaint, w * 0.045, () => { buyEnergy(); quest.energyLeft = Energy.get(Energy.now()); });
  }
  drawButton(canvas, new RectF(w * 0.28, by + bh + w * 0.04, w * 0.72, by + bh * 1.8 + w * 0.04), '🗺️ ' + tr('quest.map'), tabOffPaint, w * 0.045, () => backToQuestMap());
}

// ---------- Histoire (équivalent de QuestStory.kt) ----------
// Scènes : 0 = début (1re ouverture de la carte), 1 = après le niveau 5, 2 = après le niveau 10,
// 3 = fin (Bulpa est libéré et l'aigle devient un personnage jouable).
const QuestStory = {
  PAGES: [3, 1, 1, 3],
  AFTER: [0, 5, 10, 15],
  seen(season, scene) { return store.getInt(`q${season}_story${scene}`, 0) === 1; },
  markSeen(season, scene) { store.set(`q${season}_story${scene}`, 1); },
  pending(season) {
    const done = QuestProgress.done(season);
    for (let i = 0; i < this.PAGES.length; i++) if (!this.seen(season, i) && done >= this.AFTER[i]) return i;
    return -1;
  },
};

function openStoryIfPending() {
  const sc = QuestStory.pending(quest.season);
  if (sc < 0) return false;
  Object.assign(quest, { storyScene: sc, storyPage: 0, storyT: 0 });
  state = State.QUEST_STORY;
  return true;
}
function nextStoryPage() {
  if (quest.storyPage + 1 < QuestStory.PAGES[quest.storyScene]) { quest.storyPage++; quest.storyT = 0; } else finishStory();
}
function finishStory() { QuestStory.markSeen(quest.season, quest.storyScene); state = State.QUEST_MAP; }

function storyPoly(canvas, color, pts) {
  questPaint.color = color; questPath.reset(); questPath.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) questPath.lineTo(pts[i], pts[i + 1]);
  questPath.close(); canvas.drawPath(questPath, questPaint);
}
/** Bloc vu en perspective : (x, y) = centre du dessus, a = demi-côté, hgt = épaisseur (pixels). */
function storyIsoBox(canvas, x, y, a, hgt, color) {
  const c = a * 1.732;
  storyPoly(canvas, shade(color, 0.82), [x - c, y, x, y + a, x, y + a + hgt, x - c, y + hgt]);
  storyPoly(canvas, shade(color, 0.62), [x, y + a, x + c, y, x + c, y + hgt, x, y + a + hgt]);
  storyPoly(canvas, shade(color, 1.08), [x, y - a, x + c, y, x, y + a, x - c, y]);
}
function storyMountain(canvas, px, py, width, color) {
  storyPoly(canvas, color, [px - width, h, px, py, px + width, h]);
  const sw = width * 0.18, sy = py + (h - py) * 0.18;
  storyPoly(canvas, Color.argb(230, 255, 255, 255), [px, py, px + sw, sy, px + sw * 0.4, sy - (sy - py) * 0.15, px, sy, px - sw * 0.5, sy - (sy - py) * 0.1, px - sw, sy]);
}
function storyNest(canvas, x, y, r) {
  questPaint.color = Color.parseColor('#7A5230');
  rect.set(x - r, y - r * 0.35, x + r, y + r * 0.35); canvas.drawOval(rect, questPaint);
  questStroke.color = Color.parseColor('#A0714A'); questStroke.strokeWidth = r * 0.06;
  for (let i = 0; i <= 6; i++) { const a = -0.9 + i * 0.3; canvas.drawLine(x - r * 0.9, y + r * a * 0.2, x + r * 0.9, y - r * a * 0.15, questStroke); }
}
/** Bulpa : boule rouge, chaussures noires, lunettes rondes noires, haut-de-forme blanc. s = diamètre. */
function drawBulpa(canvas, x, feetY, s, happy = true, hat = true) {
  const p = questPaint, r = s / 2, cy = feetY - s * 0.12 - r, PC = Color.parseColor;
  p.color = PC('#1B1B1B');
  rect.set(x - r * 0.75, feetY - s * 0.16, x - r * 0.08, feetY); canvas.drawOval(rect, p);
  rect.set(x + r * 0.08, feetY - s * 0.16, x + r * 0.75, feetY); canvas.drawOval(rect, p);
  p.color = PC('#C62828'); canvas.drawCircle(x, cy, r, p);
  p.color = PC('#E53935'); canvas.drawCircle(x - r * 0.08, cy - r * 0.08, r * 0.9, p);
  p.color = Color.argb(90, 255, 255, 255); canvas.drawCircle(x - r * 0.4, cy - r * 0.42, r * 0.18, p);
  const ey = cy - r * 0.12;
  questStroke.color = PC('#1B1B1B'); questStroke.strokeWidth = r * 0.09;
  for (const dx of [-0.36, 0.36]) {
    p.color = Color.WHITE; canvas.drawCircle(x + dx * r, ey, r * 0.26, p);
    p.color = PC('#1B1B1B'); canvas.drawCircle(x + dx * r + r * 0.04, ey + r * 0.04, r * 0.11, p);
    canvas.drawCircle(x + dx * r, ey, r * 0.28, questStroke);
  }
  canvas.drawLine(x - r * 0.08, ey, x + r * 0.08, ey, questStroke);
  questStroke.strokeWidth = r * 0.07;
  rect.set(x - r * 0.25, cy + r * 0.05, x + r * 0.25, cy + r * 0.45);
  canvas.drawArc(rect, happy ? 20 : 200, 140, false, questStroke);
  if (hat) drawBulpaHat(canvas, x, cy - r * 0.78, s);
}
function drawBulpaHat(canvas, x, baseY, s) {
  const p = questPaint;
  p.color = Color.parseColor('#DDE2EA'); rect.set(x - s * 0.42, baseY - s * 0.07, x + s * 0.42, baseY + s * 0.07); canvas.drawOval(rect, p);
  p.color = Color.WHITE; rect.set(x - s * 0.25, baseY - s * 0.5, x + s * 0.25, baseY); canvas.drawRoundRect(rect, s * 0.04, s * 0.04, p);
  p.color = Color.parseColor('#1B1B1B'); rect.set(x - s * 0.25, baseY - s * 0.13, x + s * 0.25, baseY - s * 0.04); canvas.drawRect(rect, p);
}
function storyFeather(canvas, x, y, s, angle) {
  canvas.save(); canvas.rotate(angle, x, y);
  questPaint.color = Color.parseColor('#6D4C41'); rect.set(x - s * 0.18, y - s * 0.6, x + s * 0.18, y + s * 0.6); canvas.drawOval(rect, questPaint);
  questStroke.color = Color.parseColor('#D7CCC8'); questStroke.strokeWidth = s * 0.05; canvas.drawLine(x, y - s * 0.6, x, y + s * 0.8, questStroke);
  canvas.restore();
}
function storyPlayer(canvas, x, y, scale, scared, front, right = true) {
  canvas.save(); canvas.scale(scale, scale, x, y);
  drawCharacter(canvas, x, y, 0, 1, 1, right, scared, front);
  canvas.restore();
}
function storyWrap(text, paint, maxW) {
  const lines = []; let cur = '';
  // « ! », « ? », « : »… restent collés au mot d'avant (pas seuls en début de ligne)
  const words = [];
  for (const wd of text.split(' ')) { if (wd && wd.length <= 2 && [...wd].every((c) => '!?:;»…'.includes(c)) && words.length) words[words.length - 1] += '\u00A0' + wd; else words.push(wd); }
  for (const word of words) {
    const t = cur ? cur + ' ' + word : word;
    if (paint.measureText(t) <= maxW || !cur) cur = t; else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Une scène d'histoire en plein écran : illustration, bulle de dialogue, touche pour continuer. */
function drawQuestStory(canvas) {
  const sc = quest.storyScene, pg = quest.storyPage, t = quest.storyT, PC = Color.parseColor;
  questPaint.color = Color.WHITE;   // fond opaque (la couleur précédente pouvait être transparente)
  questPaint.shader = new LinearGradient(0, 0, 0, h, PC('#8FD0F2'), PC('#FDE2C8'));
  canvas.drawRect(0, 0, w, h, questPaint);
  questPaint.shader = null;
  const near = [0, 0.3, 0.6, 1][sc];
  const peakX = w * 0.72, peakY = h * (0.3 - 0.12 * near);
  storyMountain(canvas, w * 0.2, h * 0.38, w * 0.5, PC('#B8C4D6'));
  storyMountain(canvas, peakX, peakY, w * (0.55 + 0.25 * near), PC('#9AA9C0'));
  if (sc < 3) storyNest(canvas, peakX, peakY - w * 0.01, w * (0.04 + 0.04 * near));
  // Fin de l'histoire : rayons dorés derrière l'aigle
  if (sc === 3 && pg === 2) {
    questStroke.strokeWidth = w * 0.05;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.4 + i * 0.5236;
      questStroke.color = Color.argb(i % 2 === 0 ? 90 : 50, 255, 214, 90);
      canvas.drawLine(w / 2, h * 0.3, w / 2 + Math.cos(a) * w * 0.6, h * 0.3 + Math.sin(a) * w * 0.6, questStroke);
    }
  }
  const bx = w / 2, by = h * 0.5, ba = w * 0.2;
  storyIsoBox(canvas, bx, by, ba, w * 0.16, PC(sc === 3 ? '#A1887F' : '#7CC576'));
  const big = 1.8, bob = Math.abs(Math.sin(t * 4)) * w * 0.012;
  let speaker = '', text = '';
  if (sc === 0 && pg === 0) {
    storyPlayer(canvas, bx - ba * 0.8, by - bob, big, false, false);
    drawBulpa(canvas, bx + ba * 0.75, by - Math.abs(Math.sin(t * 4 + 1)) * w * 0.012, w * 0.13);
    speaker = tr('story.bulpa'); text = tr('story.0.0');
  } else if (sc === 0 && pg === 1) {
    storyPlayer(canvas, bx - ba * 0.5, by, big, true, true);
    const f = Math.min(t / 2.2, 1), ex = w * (0.55 + 0.2 * f), ey = h * (0.36 - 0.12 * f), es = w * 0.13;
    canvas.save(); canvas.rotate(Math.sin(t * 9) * 8, ex, ey + es * 0.4);
    drawBulpa(canvas, ex, ey + es * 0.45 + w * 0.15, w * 0.12, false);
    canvas.restore();
    drawEagle(canvas, ex, ey, es, 1);
    speaker = tr('story.bulpa'); text = tr('story.0.1');
  } else if (sc === 0) {
    storyPlayer(canvas, bx, by - bob, big, false, false);
    drawEagle(canvas, peakX - w * 0.08 + Math.sin(t) * w * 0.03, peakY - w * 0.08, w * 0.04, -1);
    speaker = tr('story.you'); text = tr('story.0.2');
  } else if (sc === 1) {
    storyPlayer(canvas, bx - ba * 0.4, by, big, false, true);
    const f = (t % 3.5) / 3.5;
    storyFeather(canvas, bx + ba * 0.6 + Math.sin(t * 2.5) * w * 0.06, h * 0.15 + (by - h * 0.17) * f, w * 0.06, Math.sin(t * 2.5) * 35);
    speaker = tr('story.you'); text = tr('story.1.0');
  } else if (sc === 2) {
    storyPlayer(canvas, bx - ba * 0.7, by - bob, big, false, false);
    drawBulpaHat(canvas, bx + ba * 0.7, by + w * 0.01, w * 0.13);
    speaker = tr('story.you'); text = tr('story.2.0');
  } else if (pg < 2) {
    storyNest(canvas, bx + ba * 0.55, by - w * 0.01, w * 0.17);
    drawBulpa(canvas, bx + ba * 0.55, by - w * 0.02 - bob, w * 0.13, true, pg === 1);
    storyPlayer(canvas, bx - ba * 0.85, by, big, false, false);
    drawEagle(canvas, bx + ba * 0.1, h * 0.27 + Math.sin(t * 2) * w * 0.02, w * 0.12, -1);
    if (pg === 0) { speaker = tr('story.bulpa'); text = tr('story.3.0'); } else { speaker = tr('story.eagle'); text = tr('story.3.1'); }
  } else {
    drawEagle(canvas, w / 2, h * 0.3 + Math.sin(t * 2) * w * 0.02, w * 0.16, 1);
    storyPlayer(canvas, bx - ba * 0.7, by - bob, big, false, true);
    drawBulpa(canvas, bx + ba * 0.7, by - Math.abs(Math.sin(t * 4 + 1)) * w * 0.012, w * 0.13);
    text = tr('story.3.2');
  }
  // Bulle de dialogue
  const bl = w * 0.06, br = w * 0.94, btop = h * 0.66;
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.05;
  const lines = storyWrap(text, darkTextPaint, br - bl - w * 0.1), lineH = w * 0.065;
  const bbot = btop + w * 0.1 + lines.length * lineH + (speaker ? w * 0.05 : 0);
  rect.set(bl, btop, br, bbot);
  canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
  let ty = btop + w * 0.09;
  if (speaker) {
    darkTextPaint.color = PC(speaker === tr('story.bulpa') ? '#E53935' : speaker === tr('story.eagle') ? '#6D4C41' : '#FF7A45');
    darkTextPaint.textSize = w * 0.042;
    canvas.drawText(speaker, bl + w * 0.05, ty, darkTextPaint);
    darkTextPaint.color = PC('#2E3A59'); darkTextPaint.textSize = w * 0.05;
    ty += w * 0.065;
  }
  let shown = Math.floor(t * 45);
  for (const line of lines) {
    canvas.drawText(shown >= line.length ? line : line.substring(0, Math.max(0, shown)), bl + w * 0.05, ty, darkTextPaint);
    shown -= line.length + 1; ty += lineH;
  }
  const last = sc === 3 && pg === QuestStory.PAGES[3] - 1;
  drawButton(canvas, new RectF(w * 0.7, insetTop + w * 0.04, w * 0.96, insetTop + w * 0.13), tr('story.skip') + ' ⏭', chipPaint, w * 0.036, () => finishStory());
  if (last) {
    const y0 = bbot + w * 0.05;
    drawButton(canvas, new RectF(w * 0.12, y0, w * 0.88, y0 + w * 0.12), '🦅 ' + tr('story.equip'), primaryBtnPaint, w * 0.05, () => {
      profile.select(Slot.CHARACTER, 'aigle'); loadLook(); finishStory();
    });
    drawButton(canvas, new RectF(w * 0.3, y0 + w * 0.16, w * 0.7, y0 + w * 0.26), tr('story.later'), tabOffPaint, w * 0.042, () => finishStory());
  } else {
    textPaint.textSize = w * 0.04;
    textPaint.alpha = clamp(Math.round(150 + 100 * Math.sin(t * 4)), 0, 255);
    canvas.drawText(tr('story.tap') + ' ▶', w / 2, bbot + w * 0.09, textPaint);
    textPaint.alpha = 255;
    buttons.push({ rect: new RectF(0, 0, w, h), action: () => { if (quest.storyT * 45 < text.length) quest.storyT = 100; else nextStoryPage(); } });
  }
}
