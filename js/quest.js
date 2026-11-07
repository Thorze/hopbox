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
  /** Niveau légendaire (n° 16) : débloqué avec les 3 pièces dorées de chaque niveau, gagne l'aigle royal doré. */
  LEGEND: 16, LEGEND_JUMPS: 55,
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
    // Niveau légendaire : plus long et plus dur que le niveau 15 (même calcul que Quest.kt)
    const legend = n === this.LEGEND;
    const t = legend ? 1.25 : (n - 1) / (this.LEVELS - 1);
    const rnd = SeededRandom(season * 1000 + n * 37 + 11);
    const jumps = legend ? this.LEGEND_JUMPS : this.JUMPS[n - 1];
    const tramp = legend ? 0.05 : n >= 4 ? 0.10 : 0;
    const mini = legend ? 0.10 : n >= 8 ? 0.07 : 0;
    const moving = legend ? 0.20 : n >= 6 ? Math.min(0.08 + 0.01 * (n - 6), 0.16) : 0;
    const crumble = legend ? 0.35 : n >= 7 ? Math.min(0.15 + 0.03 * (n - 7), 0.4) : 0;
    const iceP = legend ? 0.15 : n >= 10 ? 0.10 + 0.02 * (n - 10) : 0;
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
      if (legend && kind !== Kind.MINI) half = Math.max(half, 0.3);
      if (kind === Kind.ICE) half = Math.max(half, ICE_MIN_HALF);
      const isMoving = kind === Kind.MOVING;
      const minDist = prevHalf + half + 0.45 + (isMoving ? 0.8 : 0);
      const dist = minDist + rDist * (isMoving ? 1.2 : 1.0 + 1.3 * Math.min(t, 1));
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
    return { season, number: n, blocks, perfectGoal: Math.round(jumps * (0.2 + 0.1 * t)), coinCount: blocks.filter((b) => b.coin).length, difficulty: t, weather: legend ? 2 : this.WEATHER[n - 1] };
  },
};

/** Énergie : 5 ⚡ max, +1 toutes les 20 minutes, un échec coûte 1 ⚡, le plein coûte 100 pièces. */
const Energy = {
  MAX: 5, REGEN: 20 * 60,
  /** Prix de 1 à 5 énergies : de moins en moins cher par énergie (le plein = 100). */
  PRICES: [25, 45, 65, 80, 100],
  price(n) { return this.PRICES[Math.min(this.MAX, Math.max(1, n)) - 1]; },
  discount(n) { const k = Math.min(this.MAX, Math.max(1, n)); return Math.round((1 - this.price(k) / (this.PRICES[0] * k)) * 100); },
  /** Ajoute n énergies (achat) ; le compte à rebours continue tant que ce n'est pas le plein. */
  add(now, n) { const e = Math.min(this.MAX, this.get(now) + n); if (e >= this.MAX) store.set('energy_t', now); store.set('energy', e); },
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
  medals(season, n) { Challenges.migrate(); return store.getInt(`q${season}_m${n}`, 0); },
  medalCount(m) { return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1); },
  done(season) { return store.getInt(`q${season}_done`, 0); },
  seasonUnlocked(season) { return season <= 1 || this.done(season - 1) >= Quest.LEVELS; },
  unlocked(season, n) { return this.seasonUnlocked(season) && n <= this.done(season) + 1; },
  /** Niveau légendaire terminé (aigle royal doré gagné). */
  legendDone(season) { return store.getInt(`q${season}_legend`, 0) === 1; },
  /** Niveau légendaire jouable : chapitre terminé avec les 3 pièces dorées de chaque niveau. */
  legendUnlocked(season) { return this.done(season) >= Quest.LEVELS && this.totalMedals(season) >= Quest.LEVELS * 3; },
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

const quest = { season: 1, active: false, level: 0, spec: null, spawned: 0, coins: 0, perfects: 0, selected: 1, success: false, newMedals: 0, reward: 0, energyLeft: 0, storyScene: 0, storyPage: 0, storyT: 0, confirmEnergy: false, chapters: false, confirmT: 0, buyQty: 5, nextCry: 0, storyCried: false, eagleT: -1, eagleAt: 0, eagleDir: 1 };
const questPaint = new Paint();
const questStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const questPath = new Path();
const Q_GOLD = Color.parseColor('#FFC93C'), Q_GOLD_DARK = Color.parseColor('#C98A00');

// ---------- Partie ----------

function startQuestLevel(n) {
  if (Energy.get(Energy.now()) <= 0) return;
  const spec = Quest.level(quest.season, n);
  Object.assign(quest, { active: true, level: n, spec, spawned: 0, coins: 0, perfects: 0, challenges: n === Quest.LEGEND ? null : Challenges.of(spec), stats: newChallengeStats(), started: false, standT: 0, legendIntroT: -1 });
  // Ni météo, ni imprévu, ni catastrophe pendant un niveau
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1;
  scheduleRocket(false); scheduleEagle(false); scheduleHeli(false); scheduleUfo(false); scheduleWhale(false); scheduleBlizzard(false);
  resetGame();
  // Météo fixée pour le niveau (décor seulement : l'orage n'envoie pas la foudre sur le joueur)
  if (spec.weather) { startWeather(spec.weather, 0.75); strikeAt = -1; }
  if (n === Quest.LEGEND) {
    // Niveau légendaire : l'aigle royal doré passe dans le ciel avant le départ (on ne peut pas sauter pendant)
    quest.legendIntroT = 0; inputLockUntil = time + LEGEND_INTRO; sounds.play('EAGLE');
  } else {
    banners.push({ text: tr('quest.go', { n, j: spec.blocks.length }), life: 2.6 });
    if (Challenges.hasHidden(spec)) banners.push({ text: tr('quest.secret_hint'), life: 2.6 });
  }
  // Dernier niveau du chapitre (et niveau légendaire) : sa propre musique (elle continue si on réessaie)
  if (n >= Quest.LEVELS) sounds.playLevelMusic('boucle_mission_last'); else sounds.playPlaylist();
}

function spawnQuest() {
  const spec = quest.spec;
  if (!spec || quest.spawned >= spec.blocks.length) return;
  const b = spec.blocks[quest.spawned++];
  alongX = b.alongX;
  // Couleurs de roche, de mousse et de bois (thème montagne de l'aigle)
  const gold = b.kind === Kind.CRUMBLY && Challenges.hasGold(spec);
  const color = b.finish ? Color.parseColor('#BCAAA4') : gold ? GOLD_BLOCK_COLOR : b.kind === Kind.MINI ? Color.parseColor('#F5C542') : b.kind === Kind.ICE ? ICE_COLOR : MOUNTAIN_COLORS[b.color % MOUNTAIN_COLORS.length];
  // Dernier niveau du chapitre et niveau légendaire : les blocs simples sont des nids d'aigle
  const nest = quest.level >= Quest.LEVELS && b.kind === Kind.NORMAL && !b.finish;
  next = new Platform(alongX ? current.cx + b.dist : px, alongX ? pz : current.cz + b.dist, b.half, b.round || nest, nest ? NEST_COLOR : color, b.kind, alongX, nest ? PL_NEST : 0);
  next.movePhase = b.phase;
  next.coin = b.coin ? 1 : 0;
  next.finish = b.finish;
  next.material = 'granit';
  // Défi « trésor doré » : les blocs friables du niveau sont dorés (jauge et pièces à gagner, goldblock.js)
  if (gold) { next.golden = true; next.material = 'lisse'; }
  platforms.push(next);
  while (platforms.length > 6) platforms.shift();
}

function completeQuestLevel() {
  const spec = quest.spec;
  if (!spec) return;
  sounds.playPlaylist();
  if (quest.level === Quest.LEGEND) { completeLegend(); return; }
  // 2e et 3e pièces dorées : les deux défis du niveau
  const ch = quest.challenges || Challenges.of(spec);
  const [fresh, first] = QuestProgress.complete(quest.season, quest.level, Challenges.done(ch[0], quest.stats), Challenges.done(ch[1], quest.stats));
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

function backToQuestMap() { sounds.playPlaylist(); quest.active = false; quest.spec = null; if (!openStoryIfPending()) state = State.QUEST_MAP; }
/** Ouvre la carte de l'Aventure (avec la scène d'histoire en attente, s'il y en a une). */
function openQuestMap() { quest.active = false; quest.chapters = false; if (!openStoryIfPending()) state = State.QUEST_MAP; }
function closeQuestMap() { sounds.playPlaylist(); quest.active = false; quest.spec = null; resetGame(); }

/** Demande de recharge : ouvre la fenêtre de confirmation (rien n'est dépensé sans confirmer). */
function buyEnergy() {
  if (Energy.get(Energy.now()) >= Energy.MAX) {
    if (state === State.CUSTOMIZE) { custMsg = tr('quest.energy_full'); custMsgT = 2; } else banners.push({ text: tr('quest.energy_full'), life: 2 });
    return;
  }
  quest.confirmEnergy = true; quest.confirmT = time;
  quest.buyQty = Energy.MAX - Energy.get(Energy.now());   // par défaut : de quoi faire le plein
}

/** Prix d'une recharge jusqu'au plein (pour les boutons « Recharger »). */
function fullRefillPrice() { return Energy.price(Energy.MAX - Energy.get(Energy.now())); }

/** Achat confirmé : le plein d'énergie contre des pièces. */
function confirmBuyEnergy() {
  quest.confirmEnergy = false;
  const n = quest.buyQty, price = Energy.price(n);
  if (profile.coins < price) { banners.push({ text: tr('quest.not_enough'), life: 2 }); return; }
  profile.coins = profile.coins - price;
  Energy.add(Energy.now(), n);
  quest.energyLeft = Energy.get(Energy.now());
  banners.push({ text: tr('quest.refilled'), life: 2 });
  sounds.play('UNLOCK');
}

/** Fenêtre « Recharger l'énergie ? » : Annuler / Acheter (actif après une demi-seconde). */
function drawEnergyConfirm(canvas) {
  const e = Energy.get(Energy.now());
  quest.buyQty = Math.min(Math.max(1, Energy.MAX - e), Math.max(1, quest.buyQty));
  const enough = profile.coins >= Energy.price(quest.buyQty), t = time - quest.confirmT;
  drawEnergyDialog(canvas, e, quest.buyQty, t, enough && t > 0.5,
    (k) => { quest.buyQty = k; },
    () => { quest.confirmEnergy = false; },
    () => { if (enough && time - quest.confirmT > 0.5) confirmBuyEnergy(); });
}

/** Niveau légendaire réussi : l'aigle royal doré devient jouable. */
const LEGEND_REWARD = 300, LEGEND_INTRO = 3.4;
function completeLegend() {
  const first = !QuestProgress.legendDone(quest.season);
  store.set(`q${quest.season}_legend`, 1);
  profile.grant(Skins.find(Slot.CHARACTER, 'aigleor'));
  quest.success = true; quest.newMedals = first ? QuestProgress.MEDAL_FINISH : 0;
  quest.reward = first ? LEGEND_REWARD : 0;
  profile.coins = profile.coins + quest.reward;
  quest.energyLeft = Energy.get(Energy.now());
  const x = sx(px, pz) + camX, y = sy(px, 1.2, pz) + camY;
  for (let i = 0; i < 3; i++) spawnSparkles(x, y, Q_GOLD, 30);
  sounds.play('UNLOCK'); sounds.play('EAGLE'); vibrate(120);
  state = State.QUEST_END;
}

/** Animation d'entrée du niveau légendaire : l'aigle royal doré traverse le ciel, puis le départ est donné. */
function updateLegendIntro(dt) {
  if (quest.legendIntroT < 0) return;
  quest.legendIntroT += dt;
  const t = quest.legendIntroT, x = -w * 0.35 + (w * 1.7) * (t / LEGEND_INTRO), y = h * 0.3 + Math.sin(t * 2.2) * h * 0.03;
  if (t < LEGEND_INTRO) spawnSparkles(x + camX - w * 0.1, y + camY, Q_GOLD, 2);
  else { quest.legendIntroT = -1; if (quest.spec) banners.push({ text: tr('quest.legend_go', { j: quest.spec.blocks.length }), life: 2.6 }); }
}
const legendPaint = new Paint();
function drawLegendIntro(canvas) {
  const t = quest.legendIntroT;
  if (t === undefined || t < 0) return;
  const fade = clamp(Math.min(1, t / 0.4, (LEGEND_INTRO - t) / 0.5), 0, 1);
  legendPaint.shader = null; legendPaint.color = Color.argb(Math.round(110 * fade), 20, 14, 0); canvas.drawRect(0, 0, w, h, legendPaint);
  const x = -w * 0.35 + (w * 1.7) * (t / LEGEND_INTRO), y = h * 0.3 + Math.sin(t * 2.2) * h * 0.03;
  legendPaint.color = Color.argb(Math.round(90 * fade), 255, 214, 90); canvas.drawCircle(x, y, w * 0.3, legendPaint);
  drawEagle(canvas, x, y, w * 0.2, 1, true);
  if (t > 0.6) {
    const a = clamp((t - 0.6) / 0.4, 0, 1) * fade, sc = 0.7 + 0.3 * a;
    canvas.save(); canvas.scale(sc, sc, w / 2, h * 0.52);
    drawTitleRibbon(canvas, w / 2, h * 0.52, tr('quest.legend_eagle'), Color.parseColor('#E8A317'), w * 0.068);
    canvas.restore();
    textPaint.textSize = w * 0.045; textPaint.alpha = Math.round(255 * a);
    canvas.drawText(fitText(tr('quest.legend_intro'), textPaint, w * 0.9), w / 2, h * 0.52 + w * 0.16, textPaint);
    textPaint.alpha = 255;
  }
}

function questHudLine() {
  const spec = quest.spec;
  if (!spec) return '';
  const head = tr('quest.progress', { n: quest.level, i: jumps, t: spec.blocks.length });
  if (!quest.challenges) return head;
  return head + '   ' + challengeShort(quest.challenges[0]) + '   ' + challengeShort(quest.challenges[1]);
}

function questCrumbleDur() { return 2.2 - 0.8 * (quest.spec ? quest.spec.difficulty : 0); }

// ---------- Dessin ----------

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
  const interactive = state === State.QUEST_MAP && !quest.chapters, season = quest.season;
  // Ciel et montagnes au loin
  questPaint.color = Color.WHITE;   // fond opaque (la couleur précédente pouvait être transparente)
  questPaint.shader = new LinearGradient(0, 0, 0, h, Color.parseColor('#9FD3F0'), Color.parseColor('#FDE2C8'));
  canvas.drawRect(0, 0, w, h, questPaint);
  questPaint.shader = null;
  // Montagnes de l'aigle : chaîne lointaine, puis chaîne plus proche avec des sapins
  mountainRange(canvas, h * 0.62, h * 0.32, Color.parseColor('#B9C7D9'), 1, 0, false);
  mountainRange(canvas, h * 0.86, h * 0.3, Color.parseColor('#93A89D'), 4, 0, true);
  // En-tête : saison, énergie, pièces
  // En-tête compact : titre, puis la jauge à gauche et, à droite, les pièces (et « Recharger » dessous)
  const now = Energy.now(), e = Energy.get(now), top = insetTop + w * 0.03;
  const gaugeW = w * 0.52, gaugeTop = top + w * 0.095, headH = w * 0.095 + gaugeW * 0.34 + w * 0.03;
  rect.set(w * 0.04, top, w * 0.96, top + headH);
  drawPanel(canvas, rect);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.05;
  canvas.drawText(fitText(tr('quest.season', { n: season }) + ' · ' + tr(`quest.s${season}.title`), darkTextPaint, w * 0.86), w / 2, top + w * 0.07, darkTextPaint);
  const gh = drawEnergyGauge(canvas, w * 0.06, gaugeTop, gaugeW, e, Energy.secondsToNext(now), false);
  const colL = w * 0.62, colR = w * 0.93;
  if (e < Energy.MAX) {
    const cy = gaugeTop + w * 0.045;
    drawCoinPill(canvas, colR, cy, true, w * 0.08, colR - colL);
    drawButton(canvas, new RectF(colL, cy + w * 0.058, colR, cy + w * 0.058 + w * 0.075), tr('quest.refill_short', { n: fullRefillPrice() }), shopPaint, w * 0.03, () => { if (interactive) buyEnergy(); });
  } else drawCoinPill(canvas, colR, gaugeTop + gh / 2, true, w * 0.08, colR - colL);
  // Bas : total des pièces dorées et retour
  const backH = w * 0.11, backTop = ub() - w * 0.05 - backH;
  drawButton(canvas, new RectF(w * 0.08, backTop, w * 0.48, backTop + backH), '📖 ' + tr('quest.chapters'), tabOffPaint, w * 0.045, () => { if (interactive) quest.chapters = true; });
  drawButton(canvas, new RectF(w * 0.52, backTop, w * 0.92, backTop + backH), tr('quest.back'), backBtnPaint, w * 0.05, () => { if (interactive) closeQuestMap(); });
  const totalY = backTop - w * 0.04;
  progText.textSize = w * 0.042;
  const totalText = '🪙 ' + tr('quest.total', { n: QuestProgress.totalMedals(season), t: Quest.LEVELS * 3 });
  const tw = progText.measureText(totalText) + w * 0.06;
  rect.set(w / 2 - tw / 2, totalY - w * 0.06, w / 2 + tw / 2, totalY + w * 0.02);
  progPaint.color = Color.argb(120, 0, 0, 0);
  canvas.drawRoundRect(rect, w * 0.04, w * 0.04, progPaint);
  progText.color = Color.WHITE;
  canvas.drawText(totalText, w / 2, totalY, progText);
  // Chapitre terminé : accès au niveau légendaire (ou ce qu'il manque pour le débloquer)
  let mapBottom = totalY - w * 0.09;
  if (QuestProgress.done(season) >= Quest.LEVELS) {
    const ly = totalY - w * 0.17;
    if (QuestProgress.legendUnlocked(season)) {
      const label = '👑 ' + tr('quest.legend') + (QuestProgress.legendDone(season) ? '  ✓' : '');
      drawButton(canvas, new RectF(w * 0.16, ly - w * 0.05, w * 0.84, ly + w * 0.05), label, shopPaint, w * 0.045, () => { if (interactive) { quest.selected = Quest.LEGEND; state = State.QUEST_INTRO; } });
    } else {
      progText.textSize = w * 0.034;
      const t = fitText('🔒 👑 ' + tr('quest.legend_locked', { n: QuestProgress.totalMedals(season), t: Quest.LEVELS * 3 }), progText, w * 0.84), lw = progText.measureText(t) + w * 0.06;
      rect.set(w / 2 - lw / 2, ly - w * 0.04, w / 2 + lw / 2, ly + w * 0.035);
      progPaint.color = Color.argb(120, 0, 0, 0); canvas.drawRoundRect(rect, w * 0.04, w * 0.04, progPaint);
      canvas.drawText(t, w / 2, ly + w * 0.012, progText);
    }
    mapBottom = ly - w * 0.09;
  }
  // Échelle de la carte : tout l'escalier tient entre l'en-tête et le bas, quel que soit l'écran
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let n = 1; n <= Quest.LEVELS; n++) {
    const [cx, cz] = mapCell(n), ux = (cx - cz) * C30, uy = -(cx + cz) * S30;
    minX = Math.min(minX, ux - (MAP_HALF * 2 + 0.2) * C30); maxX = Math.max(maxX, ux + (MAP_HALF * 2 + 0.2) * C30);
    minY = Math.min(minY, uy - 1.7); maxY = Math.max(maxY, uy + MAP_HALF + MAP_HEIGHT + 0.1);
  }
  const areaTop = top + headH + w * 0.04, areaBot = mapBottom;
  const s = Math.min(w * 0.92 / (maxX - minX), (areaBot - areaTop) / (maxY - minY), w / 6.5);
  const ox = w / 2 - (minX + maxX) / 2 * s, oy = (areaTop + areaBot) / 2 - (minY + maxY) / 2 * s;
  const PX = (x, z) => ox + (x - z) * C30 * s, PY = (x, y, z) => oy + (-(x + z) * S30 - y) * s;
  const done = QuestProgress.done(season);
  for (let n = Quest.LEVELS; n >= 1; n--) {
    const [cx, cz] = mapCell(n);
    const unlocked = QuestProgress.unlocked(season, n), isDone = n <= done, cur = unlocked && !isDone;
    // Bloc de pierre (le piton du nid en roche brune) ; le dessus donne l'état du niveau
    const color = Color.parseColor(n === Quest.LEVELS ? '#8D6E63' : unlocked ? '#A3A8AF' : '#8C929C');
    const topColor = Color.parseColor(isDone ? '#7CB342' : cur ? '#FF7A45' : n === Quest.LEVELS ? '#A1887F' : '#C3C8CF');
    const a = MAP_HALF, bounce = cur ? Math.abs(Math.sin(time * 3)) * 0.08 : 0, hgt = n === Quest.LEVELS ? MAP_HEIGHT * 2.2 : MAP_HEIGHT;
    const nx = PX(cx - a, cz - a), ny = PY(cx - a, bounce, cz - a), rx = PX(cx + a, cz - a), ry = PY(cx + a, bounce, cz - a);
    const fx2 = PX(cx + a, cz + a), fy = PY(cx + a, bounce, cz + a), lx = PX(cx - a, cz + a), ly = PY(cx - a, bounce, cz + a);
    const dy = (hgt + bounce) * s, sh = s * 0.12;
    const poly = (pts, c) => { questPaint.color = c; questPath.reset(); questPath.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) questPath.lineTo(pts[i], pts[i + 1]); questPath.close(); canvas.drawPath(questPath, questPaint); };
    poly([nx, ny + dy + sh, rx, ry + dy + sh, fx2, fy + dy + sh, lx, ly + dy + sh], Color.argb(40, 0, 0, 0));
    poly([lx, ly, nx, ny, nx, ny + dy, lx, ly + dy], shade(color, 0.82));
    poly([nx, ny, rx, ry, rx, ry + dy, nx, ny + dy], shade(color, 0.62));
    poly([nx, ny, rx, ry, fx2, fy, lx, ly], shade(topColor, 1.05));
    // Fissures dans la pierre (face droite)
    questStroke.color = shade(color, 0.45); questStroke.strokeWidth = s * 0.025;
    canvas.drawLine(nx + (rx - nx) * 0.3, ny + (ry - ny) * 0.3 + dy * 0.25, nx + (rx - nx) * 0.45, ny + (ry - ny) * 0.45 + dy * 0.6, questStroke);
    canvas.drawLine(nx + (rx - nx) * 0.7, ny + (ry - ny) * 0.7 + dy * 0.4, nx + (rx - nx) * 0.62, ny + (ry - ny) * 0.62 + dy * 0.8, questStroke);
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

/** Haut d'une carte de hauteur cardH, centrée verticalement dans l'écran (sans déborder en haut). */
function questCardTop(cardH) { return Math.max(insetTop + w * 0.03, (insetTop + ub() - cardH) / 2); }

function drawQuestCard(canvas, top, bottom) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  rect.set(w * 0.07, top, w * 0.93, bottom);
  drawPanel(canvas, rect);
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
  const noEnergy = Energy.get(Energy.now()) <= 0, top = questCardTop(w * 1.22), bottom = top + w * 1.22;
  drawQuestCard(canvas, top, bottom);
  buttons = [];   // la carte dessinée dessous ne doit pas capter les touchers
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.075;
  const legend = n === Quest.LEGEND;
  canvas.drawText(legend ? '👑 ' + tr('quest.legend') : tr('quest.level', { n }), w / 2, top + w * 0.13, darkTextPaint);
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.042;
  canvas.drawText(tr('quest.jumps', { n: spec.blocks.length }) + '   ' + Quest.weatherIcon(spec.weather), w / 2, top + w * 0.2, greyTextPaint);
  let y = top + w * 0.32;
  if (legend) {
    // Niveau légendaire : terminer suffit, et l'aigle royal doré est à gagner
    const got = QuestProgress.legendDone(quest.season);
    questObjectiveLine(canvas, y, got, tr('quest.obj.finish'), false); y += w * 0.1;
    questObjectiveLine(canvas, y, got, tr('quest.legend_reward'), false); y += w * 0.1;
    greyTextPaint.textSize = w * 0.034; canvas.drawText(tr('quest.legend_warning'), w / 2, y, greyTextPaint);
  } else {
    const m = QuestProgress.medals(quest.season, n);
    questObjectiveLine(canvas, y, (m & QuestProgress.MEDAL_FINISH) !== 0, tr('quest.obj.finish'), false); y += w * 0.1;
    const ch = Challenges.of(spec);
    questObjectiveLine(canvas, y, (m & QuestProgress.MEDAL_COINS) !== 0, challengeText(ch[0]), false); y += w * 0.1;
    questObjectiveLine(canvas, y, (m & QuestProgress.MEDAL_PERFECTS) !== 0, challengeText(ch[1]), false);
  }
  const now = Energy.now(), e = Energy.get(now);
  y += w * 0.07;
  const gh = drawEnergyGauge(canvas, w * 0.14, y, w * 0.72, e, Energy.secondsToNext(now), false);
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.032;
  canvas.drawText(tr('quest.energy_cost'), w / 2, y + gh + w * 0.045, greyTextPaint);
  const bh = w * 0.12, by = top + w * 0.92;
  if (e > 0) drawButton(canvas, new RectF(w * 0.2, by, w * 0.8, by + bh), '▶ ' + tr('quest.play'), primaryBtnPaint, w * 0.06, () => startQuestLevel(n));
  // Plus d'énergie : bouton grisé à la place de « Jouer » (la recharge est plus bas, pour ne pas acheter par réflexe)
  else drawButton(canvas, new RectF(w * 0.15, by, w * 0.85, by + bh), tr('quest.no_energy'), lockedPaint, w * 0.045, () => {});
  // Sans énergie : « Recharger » à côté de « Retour » (jamais à la place de « Jouer »)
  const y2 = by + bh + w * 0.04, y3 = by + bh * 1.8 + w * 0.04;
  if (noEnergy) {
    drawButton(canvas, new RectF(w * 0.12, y2, w * 0.43, y3), tr('quest.back'), tabOffPaint, w * 0.042, () => { state = State.QUEST_MAP; });
    drawButton(canvas, new RectF(w * 0.47, y2, w * 0.88, y3), '⚡ ' + tr('quest.refill_short', { n: fullRefillPrice() }), shopPaint, w * 0.038, () => buyEnergy());
  } else drawButton(canvas, new RectF(w * 0.3, y2, w * 0.7, y3), tr('quest.back'), tabOffPaint, w * 0.045, () => { state = State.QUEST_MAP; });
}

function drawQuestEnd(canvas) {
  const n = quest.level, spec = quest.spec || Quest.level(quest.season, n);
  const energyNow = Energy.get(Energy.now()), noEnergy = !quest.success && energyNow <= 0, cardH = w * (quest.success ? 1.12 : 1.27);
  // Réussi : place pour la couronne au-dessus de la carte
  const crownRoom = quest.success ? w * 0.11 : 0, top = questCardTop(cardH + crownRoom) + crownRoom, bottom = top + cardH;
  drawQuestCard(canvas, top, bottom);
  if (quest.success) drawCrown(canvas, w / 2, top - w * 0.03 + Math.sin(time * 3) * w * 0.006, w * 0.15);
  drawTitleRibbon(canvas, w / 2, top + w * 0.035, tr(quest.success ? 'quest.won' : 'quest.lost'), Color.parseColor(quest.success ? '#FF9F1C' : '#E5484D'), w * 0.068);
  darkTextPaint.textAlign = Align.CENTER;
  darkTextPaint.color = Color.parseColor('#2E3A59');
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.042;
  const legend = n === Quest.LEGEND;
  canvas.drawText(legend ? '👑 ' + tr('quest.legend') : tr('quest.level', { n }), w / 2, top + w * 0.2, greyTextPaint);
  const nm = quest.newMedals;
  let y = top + w * 0.31;
  if (legend) {
    const got = QuestProgress.legendDone(quest.season);
    questObjectiveLine(canvas, y, got, tr('quest.obj.finish'), nm !== 0); y += w * 0.1;
    questObjectiveLine(canvas, y, got, tr('quest.legend_reward'), nm !== 0); y += w * 0.1;
    if (quest.success) { greyTextPaint.textSize = w * 0.036; canvas.drawText(tr('quest.legend_unlocked'), w / 2, y, greyTextPaint); }
  } else {
    const m = QuestProgress.medals(quest.season, n);
    questObjectiveLine(canvas, y, (m & 1) !== 0, tr('quest.obj.finish'), (nm & 1) !== 0); y += w * 0.1;
    const ch = quest.challenges || Challenges.of(spec);
    questObjectiveLine(canvas, y, (m & 2) !== 0, challengeText(ch[0]) + challengeResult(ch[0]), (nm & 2) !== 0); y += w * 0.1;
    questObjectiveLine(canvas, y, (m & 4) !== 0, challengeText(ch[1]) + challengeResult(ch[1]), (nm & 4) !== 0);
  }
  y += w * 0.12;
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.045;
  // Raté : la jauge d'énergie avec le « -1 »
  if (!quest.success) drawEnergyGauge(canvas, w * 0.12, y - w * 0.06, w * 0.76, energyNow, Energy.secondsToNext(Energy.now()), true);
  const info = !quest.success ? ''
    : legend && quest.reward > 0 ? tr('quest.reward', { n: quest.reward })
    : n >= Quest.LEVELS && quest.reward > 0 ? tr('quest.season_done') + `  +${quest.reward} 🪙`
    : quest.reward > 0 ? tr('quest.reward', { n: quest.reward }) : '';
  if (info) canvas.drawText(fitText(info, darkTextPaint, w * 0.8), w / 2, y, darkTextPaint);
  const bh = w * 0.12, by = top + w * (quest.success ? 0.82 : 0.97);
  if (quest.success && n < Quest.LEVELS) {
    drawButton(canvas, new RectF(w * 0.18, by, w * 0.82, by + bh), tr('quest.next') + ' ▶', primaryBtnPaint, w * 0.055, () => { backToQuestMap(); if (state === State.QUEST_MAP) { quest.selected = n + 1; state = State.QUEST_INTRO; } });
  } else if (quest.success && legend) {
    // Aigle royal doré gagné : on peut l'équiper tout de suite
    drawButton(canvas, new RectF(w * 0.12, by, w * 0.88, by + bh), '👑 ' + tr('story.equip'), primaryBtnPaint, w * 0.05, () => { profile.select(Slot.CHARACTER, 'aigleor'); loadLook(); backToQuestMap(); });
  } else if (!quest.success && energyNow > 0) {
    drawButton(canvas, new RectF(w * 0.18, by, w * 0.82, by + bh), '↻ ' + tr('quest.retry'), primaryBtnPaint, w * 0.055, () => startQuestLevel(n));
  } else if (!quest.success) {
    // Plus d'énergie : bouton grisé à la place de « Réessayer » (la recharge est en bas, pour ne pas acheter par réflexe)
    drawButton(canvas, new RectF(w * 0.12, by, w * 0.88, by + bh), tr('quest.no_energy') + ' · ' + tr('quest.energy_next', { t: Energy.format(Energy.secondsToNext(Energy.now())) }), lockedPaint, w * 0.038, () => {});
  }
  // Sans énergie : « Recharger » à côté de « Carte » (jamais à la place de « Réessayer »)
  const y2 = by + bh + w * 0.04, y3 = by + bh * 1.8 + w * 0.04;
  if (noEnergy) {
    drawButton(canvas, new RectF(w * 0.12, y2, w * 0.43, y3), '🗺️ ' + tr('quest.map'), tabOffPaint, w * 0.042, () => backToQuestMap());
    drawButton(canvas, new RectF(w * 0.47, y2, w * 0.88, y3), '⚡ ' + tr('quest.refill_short', { n: fullRefillPrice() }), shopPaint, w * 0.038, () => buyEnergy());
  } else if (quest.success) {
    // Niveau réussi : on peut le retenter tout de suite (pour aller chercher les pièces dorées qui manquent)
    drawButton(canvas, new RectF(w * 0.12, y2, w * 0.48, y3), '🗺️ ' + tr('quest.map'), tabOffPaint, w * 0.042, () => backToQuestMap());
    drawButton(canvas, new RectF(w * 0.52, y2, w * 0.88, y3), '↻ ' + tr('quest.replay'), energyNow > 0 ? backBtnPaint : lockedPaint, w * 0.042, () => { if (energyNow > 0) startQuestLevel(n); });
  } else drawButton(canvas, new RectF(w * 0.28, y2, w * 0.72, y3), '🗺️ ' + tr('quest.map'), tabOffPaint, w * 0.045, () => backToQuestMap());
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
  drawPanel(canvas, rect);
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

/** Cris de l'aigle : de temps en temps sur la carte, et quand il emporte Bulpa (début de l'histoire). */
function updateQuestSounds() {
  if (state === State.QUEST_MAP) {
    if (quest.nextCry <= 0) quest.nextCry = time + 6 + Math.random() * 5;
    else if (time >= quest.nextCry) { sounds.play('EAGLE', 0.45); quest.nextCry = time + 18 + Math.random() * 14; }
  } else if (state !== State.QUEST_INTRO) quest.nextCry = 0;
  if (state === State.QUEST_STORY && quest.storyScene === 0 && quest.storyPage === 1) {
    if (!quest.storyCried) { quest.storyCried = true; sounds.play('EAGLE', 0.9); }
  } else quest.storyCried = false;
}
