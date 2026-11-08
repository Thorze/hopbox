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
  scheduleRocket(false); scheduleEagle(false); scheduleHeli(false); scheduleUfo(false); scheduleWhale(false); scheduleBlizzard(false); scheduleNuke(false);
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

const qhPaint = new Paint(), qhStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const qhText = new Paint({ textAlign: Align.CENTER, bold: true });

/** Pastille de la barre du haut (énergie ou pièces) avec un « + » vert à droite. */
function drawPlusPill(canvas, l, r, cy, ph, draw, onPlus) {
  const p = qhPaint, face = new RectF(l, cy - ph / 2, r, cy + ph / 2);
  p.shader = null; p.color = Color.argb(90, 10, 20, 50); canvas.drawRoundRect(new RectF(l, face.top + ph * 0.1, r, face.bottom + ph * 0.1), ph / 2, ph / 2, p);
  p.color = Color.parseColor('#24345E'); canvas.drawRoundRect(face, ph / 2, ph / 2, p);
  qhStroke.color = Color.argb(120, 255, 255, 255); qhStroke.strokeWidth = w * 0.004; canvas.drawRoundRect(face, ph / 2, ph / 2, qhStroke);
  draw(face);
  // « + » vert
  const pr = ph * 0.42, px0 = r - ph * 0.5, dn = isPressed(face) ? ph * 0.05 : 0;
  p.color = Color.parseColor('#2E8B3A'); canvas.drawCircle(px0, cy + ph * 0.05, pr, p);
  p.color = Color.parseColor('#4CBB47'); canvas.drawCircle(px0, cy - dn, pr, p);
  qhStroke.color = Color.WHITE; qhStroke.strokeWidth = ph * 0.11;
  canvas.drawLine(px0 - pr * 0.5, cy - dn, px0 + pr * 0.5, cy - dn, qhStroke); canvas.drawLine(px0, cy - dn - pr * 0.5, px0, cy - dn + pr * 0.5, qhStroke);
  buttons.push({ rect: face, action: onPlus });
}

/** Petite île flottante : roche en strates avec des cailloux, racines et lianes qui pendent, herbe qui déborde et fleurs. */
function drawFloatingIsland(canvas, x, y, r) {
  const p = qhPaint, st = qhStroke, path = questPath;
  // Roche : silhouette irrégulière qui se termine en pointe
  path.reset();
  path.moveTo(x - r, y);
  path.lineTo(x - r * 0.92, y + r * 0.28); path.lineTo(x - r * 0.7, y + r * 0.42); path.lineTo(x - r * 0.62, y + r * 0.68);
  path.lineTo(x - r * 0.35, y + r * 0.82); path.lineTo(x - r * 0.18, y + r * 1.12); path.lineTo(x + r * 0.02, y + r * 1.28);
  path.lineTo(x + r * 0.2, y + r * 1.0); path.lineTo(x + r * 0.45, y + r * 0.86); path.lineTo(x + r * 0.62, y + r * 0.58);
  path.lineTo(x + r * 0.88, y + r * 0.4); path.lineTo(x + r, y); path.close();
  p.color = Color.WHITE; p.shader = new LinearGradient(0, y, 0, y + r * 1.3, Color.parseColor('#A9774E'), Color.parseColor('#5B3A22'));
  canvas.drawPath(path, p); p.shader = null;
  // Strates plus sombres et cailloux incrustés
  st.color = Color.argb(90, 60, 35, 18); st.strokeWidth = r * 0.04;
  canvas.drawLine(x - r * 0.85, y + r * 0.3, x + r * 0.8, y + r * 0.36, st);
  canvas.drawLine(x - r * 0.55, y + r * 0.66, x + r * 0.55, y + r * 0.62, st);
  for (const [dx, dy, rr, c] of [[-0.55, 0.45, 0.12, '#8A8F98'], [0.35, 0.5, 0.1, '#9AA0A8'], [-0.1, 0.85, 0.09, '#7C8189'], [0.6, 0.25, 0.07, '#A7ADB5']]) {
    p.color = Color.parseColor(c); canvas.drawOval(new RectF(x + r * dx - r * rr, y + r * dy - r * rr * 0.7, x + r * dx + r * rr, y + r * dy + r * rr * 0.7), p);
    p.color = Color.argb(90, 255, 255, 255); canvas.drawOval(new RectF(x + r * dx - r * rr * 0.6, y + r * dy - r * rr * 0.6, x + r * dx, y + r * dy - r * rr * 0.1), p);
  }
  // Racines et lianes qui pendent, avec des feuilles
  for (const [dx, len, sway] of [[-0.75, 0.55, 0], [-0.3, 0.75, 1.3], [0.5, 0.6, 2.4], [0.8, 0.35, 3.1]]) {
    const bx = x + r * dx, by = y + r * 0.12, sw = Math.sin(time * 1.5 + sway) * r * 0.06;
    st.color = Color.parseColor('#3F7F2A'); st.strokeWidth = r * 0.045;
    path.reset(); path.moveTo(bx, by); path.quadTo(bx + sw + r * 0.08, by + r * len * 0.5, bx + sw, by + r * len);
    canvas.drawPath(path, st);
    p.color = Color.parseColor('#5DB043');
    for (const q of [0.35, 0.7, 1.0]) canvas.drawOval(new RectF(bx + sw * q - r * 0.07, by + r * len * q - r * 0.04, bx + sw * q + r * 0.05, by + r * len * q + r * 0.04), p);
  }
  // Herbe : dessus bombé et bord ondulé qui déborde
  p.color = Color.parseColor('#4C9A32'); canvas.drawOval(new RectF(x - r * 1.06, y - r * 0.3, x + r * 1.06, y + r * 0.24), p);
  for (let i = 0; i <= 10; i++) { const fx = x - r * 0.98 + i * r * 0.196; canvas.drawCircle(fx, y + r * 0.13 + Math.sin(i * 1.7) * r * 0.03, r * 0.1, p); }
  p.color = Color.parseColor('#7CC94A'); canvas.drawOval(new RectF(x - r * 0.98, y - r * 0.36, x + r * 0.98, y + r * 0.13), p);
  p.color = Color.parseColor('#9BDB63'); canvas.drawOval(new RectF(x - r * 0.6, y - r * 0.32, x + r * 0.2, y - r * 0.12), p);
  // Brins d'herbe
  st.color = Color.parseColor('#3F8A28'); st.strokeWidth = r * 0.03;
  for (const dx of [-0.85, -0.5, 0.1, 0.45, 0.8]) { const gx = x + r * dx, gy = y - r * 0.12; canvas.drawLine(gx, gy, gx - r * 0.04, gy - r * 0.14, st); canvas.drawLine(gx, gy, gx + r * 0.05, gy - r * 0.12, st); }
  // Fleurs
  for (const [dx, dy, c] of [[-0.62, -0.18, '#FF7AB6'], [-0.15, -0.26, '#B57BFF'], [0.62, -0.16, '#FFD54F'], [0.3, -0.05, '#FF8A65']]) {
    const fx = x + r * dx, fy = y + r * dy;
    p.color = Color.parseColor(c);
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; canvas.drawCircle(fx + Math.cos(a) * r * 0.05, fy + Math.sin(a) * r * 0.035, r * 0.04, p); }
    p.color = Color.parseColor('#FFF3B0'); canvas.drawCircle(fx, fy, r * 0.03, p);
  }
}

/** Panneau en bois suspendu par deux cordes, avec le chapitre et son titre. */
function drawWoodSign(canvas, cx, top, sw, sh, small, big) {
  const p = qhPaint, st = qhStroke;
  canvas.save();
  canvas.rotate(Math.sin(time * 1.3) * 0.8, cx, insetTop);
  const l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Deux grosses cordes tressées qui montent tout droit (leur départ est caché derrière les pastilles du haut)
  p.shader = null;
  for (const rx0 of [l + sw * 0.15, r - sw * 0.15]) {
    const ropeTop = insetTop + w * 0.085, rw = w * 0.016;
    p.color = Color.parseColor('#B98B50'); canvas.drawRect(rx0 - rw / 2, ropeTop, rx0 + rw / 2, t + sh * 0.1, p);
    st.color = Color.parseColor('#8A6235'); st.strokeWidth = w * 0.004;
    for (let yy = ropeTop; yy < t + sh * 0.08; yy += rw * 0.9) canvas.drawLine(rx0 - rw / 2, yy, rx0 + rw / 2, yy + rw * 0.6, st);
    st.color = Color.argb(110, 255, 235, 190); st.strokeWidth = w * 0.003; canvas.drawLine(rx0 - rw * 0.25, ropeTop, rx0 - rw * 0.25, t + sh * 0.08, st);
    // Nœud sur la planche
    p.color = Color.parseColor('#9C7442'); canvas.drawOval(new RectF(rx0 - rw * 1.1, t + sh * 0.02, rx0 + rw * 1.1, t + sh * 0.2), p);
    st.color = Color.parseColor('#7A5530'); st.strokeWidth = w * 0.003; canvas.drawLine(rx0 - rw * 0.8, t + sh * 0.08, rx0 + rw * 0.8, t + sh * 0.14, st);
  }
  // Planche : épaisseur, face en dégradé, veines, clous
  p.color = Color.parseColor('#7A4A22'); canvas.drawRoundRect(new RectF(l, t + w * 0.012, r, b + w * 0.012), w * 0.03, w * 0.03, p);
  p.color = Color.WHITE; p.shader = new LinearGradient(0, t, 0, b, Color.parseColor('#E0A15E'), Color.parseColor('#B8743A'));
  canvas.drawRoundRect(new RectF(l, t, r, b), w * 0.03, w * 0.03, p); p.shader = null;
  st.color = Color.argb(70, 90, 50, 20); st.strokeWidth = w * 0.004;
  for (const q of [0.3, 0.55, 0.78]) canvas.drawLine(l + sw * 0.05, t + sh * q, r - sw * 0.05, t + sh * q + sh * 0.03 * Math.sin(q * 9), st);
  st.color = Color.argb(110, 255, 230, 180); st.strokeWidth = w * 0.004; canvas.drawLine(l + w * 0.02, t + w * 0.008, r - w * 0.02, t + w * 0.008, st);
  p.color = Color.parseColor('#5E3B22');
  for (const [nx, ny] of [[l + sw * 0.12, t + sh * 0.12], [r - sw * 0.12, t + sh * 0.12], [l + sw * 0.05, b - sh * 0.15], [r - sw * 0.05, b - sh * 0.15]]) canvas.drawCircle(nx, ny, w * 0.008, p);
  // Textes : chapitre en petit, titre en gros (blanc, contour brun)
  qhText.textAlign = Align.CENTER; qhText.textSize = sh * 0.24; qhText.color = Color.parseColor('#5A3416');
  canvas.drawText(small, cx, t + sh * 0.36, qhText);
  qhText.textSize = sh * 0.36;
  const tt = fitText(big, qhText, sw * 0.9);
  st.color = Color.parseColor('#5A3416'); st.strokeWidth = sh * 0.07; st.style = Style.STROKE;
  qhText.style = Style.STROKE; qhText.strokeWidth = sh * 0.07; qhText.color = Color.parseColor('#5A3416'); canvas.drawText(tt, cx, t + sh * 0.78, qhText);
  qhText.style = Style.FILL; qhText.color = Color.WHITE; canvas.drawText(tt, cx, t + sh * 0.78, qhText);
  canvas.restore();
}

/** En-tête de la carte de l'Aventure ; renvoie sa hauteur (depuis insetTop). */
function drawQuestHeader(canvas, interactive, season) {
  const now = Energy.now(), e = Energy.get(now);
  const cy = insetTop + w * 0.085, ph = w * 0.085;
  // Flèche retour
  const br = w * 0.058, bcx = w * 0.04 + br, down = isPressed(new RectF(bcx - br, cy - br, bcx + br, cy + br)) ? w * 0.006 : 0;
  qhPaint.shader = null; qhPaint.color = Color.parseColor('#1F4FA0'); canvas.drawCircle(bcx, cy + w * 0.007, br, qhPaint);
  qhPaint.color = Color.parseColor('#3B8DF5'); canvas.drawCircle(bcx, cy + down, br, qhPaint);
  qhStroke.color = Color.WHITE; qhStroke.strokeWidth = w * 0.004; canvas.drawCircle(bcx, cy + down, br, qhStroke);
  qhStroke.strokeWidth = br * 0.2;
  canvas.drawLine(bcx + br * 0.4, cy + down, bcx - br * 0.4, cy + down, qhStroke);
  canvas.drawLine(bcx - br * 0.4, cy + down, bcx - br * 0.05, cy + down - br * 0.35, qhStroke);
  canvas.drawLine(bcx - br * 0.4, cy + down, bcx - br * 0.05, cy + down + br * 0.35, qhStroke);
  buttons.push({ rect: new RectF(bcx - br * 1.2, cy - br * 1.2, bcx + br * 1.2, cy + br * 1.2), action: () => { if (interactive) closeQuestMap(); } });
  // Panneau du chapitre (dessiné avant les pastilles : le haut des cordes passe derrière), et ton personnage
  drawWoodSign(canvas, w * 0.63, insetTop + w * 0.215, w * 0.6, w * 0.15, tr('quest.season', { n: season }), tr(`quest.s${season}.title`));
  drawMapHero(canvas, interactive);
  // Énergie : ⚡ 3/5 · 12:34 (ou « Plein »), « + » = recharger
  drawPlusPill(canvas, w * 0.2, w * 0.58, cy, ph, (f) => {
    qhText.textAlign = Align.LEFT; qhText.style = Style.FILL;
    qhText.textSize = ph * 0.62; qhText.color = Color.WHITE; canvas.drawText('⚡', f.left + ph * 0.18, cy + ph * 0.22, qhText);
    qhText.textSize = ph * 0.48; canvas.drawText(`${e}/${Energy.MAX}`, f.left + ph * 0.92, cy + ph * 0.17, qhText);
    qhText.textSize = ph * 0.34; qhText.color = Color.parseColor(e < Energy.MAX ? '#FFD54F' : '#9FE0A0');
    const sub = e < Energy.MAX ? Energy.format(Energy.secondsToNext(now)) : tr('quest.full_short');
    canvas.drawText(fitText(sub, qhText, f.width() - ph * 2.95), f.left + ph * 1.95, cy + ph * 0.13, qhText);
    qhText.textAlign = Align.CENTER;
  }, () => { if (interactive) buyEnergy(); });
  // Pièces, « + » = boutique
  drawPlusPill(canvas, w * 0.61, w * 0.96, cy, ph, (f) => {
    qhText.textAlign = Align.LEFT; qhText.style = Style.FILL;
    qhText.textSize = ph * 0.62; qhText.color = Color.WHITE; canvas.drawText('🪙', f.left + ph * 0.16, cy + ph * 0.22, qhText);
    qhText.textSize = ph * 0.48; canvas.drawText(fitText(String(profile.coins), qhText, f.width() - ph * 2.1), f.left + ph * 1.0, cy + ph * 0.17, qhText);
    qhText.textAlign = Align.CENTER;
  }, () => { if (interactive) openCustomize(); });
  return w * 0.42;
}

// Toucher son personnage sur la carte : il fait une de ses animations d'attente (salto, petits sauts, danse…)
const MAP_HERO_ANIMS = [IdleAnim.FRONTFLIP, IdleAnim.BACKFLIP, IdleAnim.HOPS, IdleAnim.DANCE, IdleAnim.LOOK, IdleAnim.STRETCH, IdleAnim.IMPATIENT];
const mapHero = { anim: -1, at: 0, last: -1, lastTime: 0, lift: 0, dx: 0, rot: 0, flipX: 1, sW: 1, sH: 1, front: false, turn: false, shut: false };

/** Ton personnage sur son île flottante : il sautille, ou joue l'animation lancée en le touchant. */
function drawMapHero(canvas, interactive) {
  const dt = Math.min(0.05, Math.max(0, time - mapHero.lastTime)); mapHero.lastTime = time;
  const isY = insetTop + w * 0.33 + Math.sin(time * 1.4) * w * 0.008, isX = w * 0.17, sc = 1.25, feet = isY - w * 0.02;
  drawFloatingIsland(canvas, isX, isY, w * 0.12);
  let lift, front = true, sW = 1, sH = 1, rot = 0, dx = 0, turn = false;
  if (mapHero.anim !== -1) {
    mapHero.at += dt;
    if (mapHero.at >= IDLE_DURATION[mapHero.anim]) mapHero.anim = -1;
  }
  if (mapHero.anim !== -1) {
    computeIdlePose(mapHero);
    lift = mapHero.lift * 0.55; front = mapHero.front || mapHero.anim === IdleAnim.FRONTFLIP || mapHero.anim === IdleAnim.BACKFLIP || mapHero.anim === IdleAnim.HOPS;
    sW = mapHero.sW; sH = mapHero.sH; rot = mapHero.rot; dx = mapHero.dx; turn = mapHero.turn;
    eyesShut = mapHero.shut;
  } else lift = Math.abs(Math.sin(time * 3.2)) * 0.3;   // petits sauts en attendant
  canvas.save();
  canvas.scale(sc, sc, isX, feet);
  const bodyY = feet - lift * k - k * 0.3;
  if (rot !== 0) canvas.rotate(rot, isX + dx, bodyY);
  drawCharacter(canvas, isX + dx, feet - lift * k, 0, sW, sH, !turn, false, front);
  canvas.restore();
  eyesShut = false;
  if (interactive) buttons.push({ rect: new RectF(isX - w * 0.13, feet - w * 0.2, isX + w * 0.13, feet + w * 0.05), action: () => {
    let a; do a = MAP_HERO_ANIMS[rndInt(MAP_HERO_ANIMS.length)]; while (a === mapHero.last);
    mapHero.anim = a; mapHero.last = a; mapHero.at = 0;
    sounds.play('JUMP', 0.5, 1.2);
  } });
}

/** Contour d'un œuf de demi-hauteur r centré en (x, y) : plus pointu en haut, plus rond en bas. */
function eggPath(x, y, r) {
  questPath.reset();
  const rx = r * 0.78;
  for (let i = 0; i <= 32; i++) {
    const a = i / 32 * 6.2832, c = Math.cos(a);
    const ex = x + rx * Math.sin(a), ey = y - r * c * (c > 0 ? 1.12 : 0.88);
    if (i === 0) questPath.moveTo(ex, ey); else questPath.lineTo(ex, ey);
  }
  questPath.close();
}

/** Œuf doré (gagné) ou œuf pâle (pas encore gagné), de demi-hauteur r. */
function drawMedalEgg(canvas, x, y, r, got) {
  eggPath(x, y, r);
  if (got) {
    questPaint.color = Q_GOLD; canvas.drawPath(questPath, questPaint);
    questStroke.color = Q_GOLD_DARK; questStroke.strokeWidth = r * 0.16; canvas.drawPath(questPath, questStroke);
    questPaint.color = Color.argb(200, 255, 248, 210); canvas.drawOval(new RectF(x - r * 0.42, y - r * 0.72, x - r * 0.08, y - r * 0.18), questPaint);
  } else {
    questPaint.color = Color.parseColor('#E9E4DA'); canvas.drawPath(questPath, questPaint);
    questStroke.color = Color.argb(90, 120, 100, 80); questStroke.strokeWidth = r * 0.1; canvas.drawPath(questPath, questStroke);
  }
}

/** Nid de la carte, posé sur son rocher : bord de brindilles, creux sombre et les 3 œufs du niveau (dorés s'ils sont gagnés). */
function drawMapNest(canvas, tx, ty, rx, medals, showEggs, locked, bulpa = false) {
  const ry = rx * 0.5, p = questPaint, st = questStroke;
  const wood = locked ? Color.parseColor('#8E8579') : Color.parseColor('#8D5A2B');
  p.color = Color.argb(50, 0, 0, 0); canvas.drawOval(new RectF(tx - rx * 1.05, ty - ry * 0.6, tx + rx * 1.05, ty + ry * 1.5), p);
  p.color = shade(wood, 0.8); canvas.drawOval(new RectF(tx - rx, ty - ry * 0.9, tx + rx, ty + ry * 1.25), p);
  p.color = wood; canvas.drawOval(new RectF(tx - rx, ty - ry, tx + rx, ty + ry), p);
  st.strokeWidth = rx * 0.07;
  for (let i = 0; i < 9; i++) {
    const a0 = 0.15 + i * 0.33;
    st.color = shade(wood, i % 2 === 0 ? 1.25 : 0.7);
    canvas.drawArc(new RectF(tx - rx * 0.98, ty - ry * 0.98, tx + rx * 0.98, ty + ry * 1.1), a0 * 57.3, 26, false, st);
  }
  p.color = locked ? Color.parseColor('#5E574F') : Color.parseColor('#4A2E14');
  canvas.drawOval(new RectF(tx - rx * 0.7, ty - ry * 0.62, tx + rx * 0.7, ty + ry * 0.55), p);
  // Bulpa, prisonnier au fond du nid de l'aigle : il tremble de peur par moments
  if (bulpa) {
    // Toutes les 6 s, il pâlit et bleuit (peur et froid) pendant 2 s, en grelottant plus fort
    const c = time % 6, cold = c >= 3 && c <= 5 ? Math.sin((c - 3) / 2 * Math.PI) : 0;
    const shake = (time % 2.6) < 0.7 || cold > 0.2 ? Math.sin(time * 45) * rx * (0.04 + 0.03 * cold) : 0;
    drawBulpa(canvas, tx + shake, ty + ry * 0.85, rx * 0.9, false, true, cold);
    // Petits flocons autour de lui quand il a froid
    if (cold > 0.3) {
      textPaint.textSize = rx * 0.22; textPaint.alpha = Math.round(255 * cold);
      for (let i = 0; i < 3; i++) { const a = time * 1.5 + i * 2.1; canvas.drawText('❄', tx + Math.cos(a) * rx * 0.62, ty - rx * 0.55 + Math.sin(a) * rx * 0.18, textPaint); }
      textPaint.alpha = 255;
    }
    // Le bord avant du nid repasse devant lui
    const o = new RectF(tx - rx * 0.86, ty - ry * 0.8, tx + rx * 0.86, ty + ry * 0.78);
    st.color = wood; st.strokeWidth = ry * 0.5; canvas.drawArc(o, 10, 160, false, st);
    st.color = shade(wood, 1.25); st.strokeWidth = rx * 0.05; canvas.drawArc(o, 30, 40, false, st); canvas.drawArc(o, 110, 40, false, st);
  }
  if (showEggs) {
    const er = rx * 0.27;
    drawMedalEgg(canvas, tx, ty - ry * 0.28, er, (medals & 2) !== 0);
    drawMedalEgg(canvas, tx - rx * 0.36, ty - ry * 0.02, er, (medals & 1) !== 0);
    drawMedalEgg(canvas, tx + rx * 0.36, ty - ry * 0.02, er, (medals & 4) !== 0);
  }
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
  // En-tête : flèche retour, énergie et pièces (avec « + »), panneau en bois du chapitre, ton personnage sur son île
  const top = insetTop, headH = drawQuestHeader(canvas, interactive, season);
  // Bas : total des œufs dorés et liste des chapitres (le retour est la flèche en haut)
  const backH = w * 0.1, backTop = ub() - w * 0.05 - backH;
  drawButton(canvas, new RectF(w * 0.27, backTop, w * 0.73, backTop + backH), '📖 ' + tr('quest.chapters'), tabOffPaint, w * 0.045, () => { if (interactive) quest.chapters = true; });
  const totalY = backTop - w * 0.04;
  progText.textSize = w * 0.042;
  const totalText = '🥚 ' + tr('quest.total', { n: QuestProgress.totalMedals(season), t: Quest.LEVELS * 3 });
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
  // Sentier qui serpente vers le haut : 5 rangées de 3 nids (gauche → droite, puis droite → gauche…),
  // toute la largeur de l'écran est utilisée pour avoir de grands nids
  const areaTop = top + headH + w * 0.1, areaBot = mapBottom;
  const rows = Math.ceil(Quest.LEVELS / 3), rowH = (areaBot - areaTop) / rows, nestR = Math.min(w * 0.13, rowH * 0.42);
  const nestPos = (n) => {
    const row = Math.floor((n - 1) / 3), idx = (n - 1) % 3, col = row % 2 === 0 ? idx : 2 - idx;
    return [w * (0.2 + 0.3 * col) + Math.sin(n * 1.7) * w * 0.025, areaBot - rowH * (row + 0.55) - (col === 1 ? rowH * 0.12 : 0)];
  };
  const done = QuestProgress.done(season);
  // Le sentier en pointillés, du niveau 1 au nid de l'aigle
  questStroke.color = Color.argb(170, 255, 255, 255); questStroke.strokeWidth = w * 0.012;
  for (let n = 1; n < Quest.LEVELS; n++) {
    const [x0, y0] = nestPos(n), [x1, y1] = nestPos(n + 1);
    const steps = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / (w * 0.035)));
    for (let i = 0; i < steps; i += 2) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      canvas.drawLine(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, questStroke);
    }
  }
  // Les nids, du haut vers le bas (ceux du bas passent devant)
  for (let n = Quest.LEVELS; n >= 1; n--) {
    const [x, y0] = nestPos(n);
    const unlocked = QuestProgress.unlocked(season, n), isDone = n <= done, cur = unlocked && !isDone, last = n === Quest.LEVELS;
    const rx = nestR * (last ? 1.2 : 1), bounce = cur ? Math.abs(Math.sin(time * 3)) * rx * 0.08 : 0, y = y0 - bounce;
    // Rocher sous le nid
    const rock = Color.parseColor(last ? '#8D6E63' : unlocked ? '#A3A8AF' : '#8C929C');
    questPaint.color = Color.argb(45, 0, 0, 0); canvas.drawOval(new RectF(x - rx * 1.1, y0 + rx * 0.45, x + rx * 1.1, y0 + rx * 0.85), questPaint);
    questPaint.color = shade(rock, 0.7); canvas.drawOval(new RectF(x - rx * 1.05, y + rx * 0.05, x + rx * 1.05, y + rx * 0.72), questPaint);
    questPaint.color = rock; canvas.drawOval(new RectF(x - rx * 1.05, y - rx * 0.12, x + rx * 1.05, y + rx * 0.5), questPaint);
    // Le nid et ses 3 œufs (dorés quand ils sont gagnés)
    const bulpaHere = last && done < Quest.LEVELS;   // Bulpa attend au fond du dernier nid tant que le chapitre n'est pas fini
    drawMapNest(canvas, x, y, rx, unlocked ? QuestProgress.medals(season, n) : 0, unlocked && !bulpaHere, !unlocked, bulpaHere);
    // Numéro (ou cadenas) dans une grosse pastille : verte si réussi, orange si c'est le prochain
    const br = w * 0.042, bcx = x + rx * 0.95, bcy = y + rx * 0.42;
    questPaint.color = Color.argb(70, 0, 0, 0); canvas.drawCircle(bcx, bcy + w * 0.005, br, questPaint);
    questPaint.color = Color.parseColor(isDone ? '#7CB342' : cur ? '#FF7A45' : '#8C929C'); canvas.drawCircle(bcx, bcy, br, questPaint);
    questStroke.color = Color.WHITE; questStroke.strokeWidth = w * 0.006; canvas.drawCircle(bcx, bcy, br, questStroke);
    btnTextPaint.color = Color.WHITE; btnTextPaint.textSize = unlocked ? w * 0.045 : w * 0.036;
    canvas.drawText(unlocked ? String(n) : '🔒', bcx, bcy - (btnTextPaint.descent() + btnTextPaint.ascent()) / 2, btnTextPaint);
    if (cur) {
      const my = y - rx * 0.75 - Math.abs(Math.sin(time * 3)) * rx * 0.2;
      questPaint.color = Color.parseColor('#FF7A45');
      questPath.reset(); questPath.moveTo(x - rx * 0.25, my - rx * 0.28); questPath.lineTo(x + rx * 0.25, my - rx * 0.28); questPath.lineTo(x, my); questPath.close();
      canvas.drawPath(questPath, questPaint);
    }
    if (interactive) {
      buttons.push({ rect: new RectF(x - rx * 1.2, y - rx * 0.9, x + rx * 1.3, y + rx * 0.9), action: () => {
        if (unlocked) { quest.selected = n; state = State.QUEST_INTRO; } else banners.push({ text: tr('quest.locked'), life: 2 });
      } });
    }
  }
  // L'aigle tourne en planant autour de son nid, au sommet (il regarde dans le sens où il vole)
  const [ex0, ey0] = nestPos(Quest.LEVELS), ang = time * 0.55;
  const eagleX = ex0 + Math.cos(ang) * w * 0.22, eagleY = ey0 - nestR * 1.3 + Math.sin(ang) * w * 0.04 + Math.sin(time * 1.7) * w * 0.01;
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
  drawMedalEgg(canvas, cx, cy, w * 0.032, got);
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
  // Niveau raté sur un saut (ou une glissade) : « Ralenti de la mort » sous la carte
  if (!quest.success) drawDeathButton(canvas, w / 2, bottom + w * 0.08);
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
function drawBulpa(canvas, x, feetY, s, happy = true, hat = true, cold = 0) {
  const p = questPaint, r = s / 2, cy = feetY - s * 0.12 - r, PC = Color.parseColor;
  p.color = PC('#1B1B1B');
  rect.set(x - r * 0.75, feetY - s * 0.16, x - r * 0.08, feetY); canvas.drawOval(rect, p);
  rect.set(x + r * 0.08, feetY - s * 0.16, x + r * 0.75, feetY); canvas.drawOval(rect, p);
  // Boule rouge (qui pâlit et bleuit quand il a peur et froid : cold de 0 à 1)
  p.color = Theme.lerp(PC('#C62828'), PC('#8FB0D8'), cold); canvas.drawCircle(x, cy, r, p);
  p.color = Theme.lerp(PC('#E53935'), PC('#CFE2F5'), cold); canvas.drawCircle(x - r * 0.08, cy - r * 0.08, r * 0.9, p);
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
