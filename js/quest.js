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

const quest = { season: 1, active: false, level: 0, spec: null, spawned: 0, coins: 0, perfects: 0, selected: 1, success: false, newMedals: 0, reward: 0, energyLeft: 0 };
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

function backToQuestMap() { quest.active = false; quest.spec = null; state = State.QUEST_MAP; }
function openQuestMap() { quest.active = false; state = State.QUEST_MAP; }
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

/** Carte de la saison en vue isométrique : niveaux en blocs, pièces dorées, énergie. */
function drawQuestMap(canvas) {
  const interactive = state === State.QUEST_MAP, season = quest.season;
  // Ciel et montagnes au loin
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
    if (unlocked) {
      const m = QuestProgress.medals(season, n);
      for (let j = 0; j < 3; j++) drawMedalCoin(canvas, tx + (j - 1) * s * 0.36, ty - s * 0.75, s * 0.14, (m & (1 << j)) !== 0);
    }
    if (n === Quest.LEVELS) {
      darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = s * 0.8;
      canvas.drawText('🪺', tx, ty - s * (unlocked ? 1.05 : 0.55), darkTextPaint);
    }
    if (cur) {
      const my = ty - s * 1.25 - Math.abs(Math.sin(time * 3)) * s * 0.15;
      poly([tx - s * 0.18, my - s * 0.2, tx + s * 0.18, my - s * 0.2, tx, my], Color.parseColor('#FF7A45'));
    }
    if (interactive) {
      buttons.push({ rect: new RectF(tx - s * 0.95, ty - s * 0.95, tx + s * 0.95, ty + s * 0.75), action: () => {
        if (unlocked) { quest.selected = n; state = State.QUEST_INTRO; } else banners.push({ text: tr('quest.locked'), life: 2 });
      } });
    }
  }
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
    drawButton(canvas, new RectF(w * 0.18, by, w * 0.82, by + bh), tr('quest.next') + ' ▶', primaryBtnPaint, w * 0.055, () => { backToQuestMap(); quest.selected = n + 1; state = State.QUEST_INTRO; });
  } else if (!quest.success && quest.energyLeft > 0) {
    drawButton(canvas, new RectF(w * 0.18, by, w * 0.82, by + bh), '↻ ' + tr('quest.retry'), primaryBtnPaint, w * 0.055, () => startQuestLevel(n));
  } else if (!quest.success) {
    drawButton(canvas, new RectF(w * 0.12, by, w * 0.88, by + bh), tr('quest.refill', { n: Energy.PRICE }), shopPaint, w * 0.045, () => { buyEnergy(); quest.energyLeft = Energy.get(Energy.now()); });
  }
  drawButton(canvas, new RectF(w * 0.28, by + bh + w * 0.04, w * 0.72, by + bh * 1.8 + w * 0.04), '🗺️ ' + tr('quest.map'), tabOffPaint, w * 0.045, () => backToQuestMap());
}
