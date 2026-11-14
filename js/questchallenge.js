'use strict';
// Défis des pièces dorées de l'Aventure (équivalent de QuestChallenge.kt et des fonctions de défis de QuestUi.kt).
// Chaque niveau : 1) terminer, 2) et 3) deux défis propres au niveau.

const Challenges = {
  /** Les deux défis (2e et 3e pièce dorée) du niveau spec : [{type, n}, {type, n}]. */
  of(spec) {
    if (spec.season > 1) return this.ofChapter(spec);
    const jumps = spec.blocks.length, count = (k) => spec.blocks.filter((b) => b.kind === k).length;
    const time = (perJump) => ({ type: 'TIME', n: Math.round(jumps * perJump) });
    const moving = count(Kind.MOVING), crumbly = count(Kind.CRUMBLY), ice = count(Kind.ICE);
    switch (spec.number) {
      case 1: case 2: return [{ type: 'STREAK', n: 3 }, time(2.4)];
      case 3: return [{ type: 'STREAK', n: 4 }, { type: 'CLEAN', n: 0 }];
      case 4: case 5: return [{ type: 'EDGE', n: 2 }, { type: 'NO_STOP', n: 20 }];
      case 6: return [moving > 0 ? { type: 'MOVING', n: Math.min(2, moving) } : { type: 'STREAK', n: 3 }, { type: 'STREAK', n: 4 }];
      case 7: case 8: case 9: return [crumbly > 0 ? { type: 'GOLD', n: 6 } : { type: 'EDGE', n: 2 }, time(2.0)];
      case 10: case 11: case 12: return [ice > 0 ? { type: 'ICE', n: Math.min(2, ice) } : { type: 'STREAK', n: 4 }, { type: 'EDGE', n: 3 }];
      case 13: case 14: return [{ type: 'STREAK', n: 5 }, { type: 'NO_STOP', n: 17 }];
      default: return [{ type: 'STREAK', n: 5 }, time(1.7)];
    }
  },
  /**
   * Chapitres 2 à 8 : les 3 quêtes annexes du chapitre, deux par niveau à tour de rôle (A+B, A+C, B+C…),
   * de plus en plus dures. Identique à QuestChallenge.kt (difficulté arrondie en Float comme sur Android).
   */
  ofChapter(spec) {
    const jumps = spec.blocks.length, t = Math.fround(spec.difficulty);
    const streak = { type: 'STREAK', n: 3 + Math.round(2 * t) };
    const time = { type: 'TIME', n: Math.round(jumps * (2.4 - 0.7 * t)) };
    const coins = { type: 'COINS', n: spec.coinCount };
    const perfects = { type: 'PERFECTS', n: Math.round(jumps * (0.25 + 0.15 * t)) };
    const tramps = spec.blocks.filter((b) => b.kind === Kind.TRAMPOLINE).length;
    const bounce = tramps > 0 ? { type: 'BOUNCE', n: Math.min(tramps, 1 + Math.round(2 * t)) } : streak;
    let abc;
    switch (spec.season) {
      case 2: case 10: abc = [bounce, coins, time]; break;                 // méduses / champignons, bulles / pollen
      case 11: abc = [perfects, coins, time]; break;                       // overclocking, octets, compilation
      case 4: abc = [{ type: 'NO_STOP', n: 20 }, streak, time]; break;     // projecteurs : 2 s max par bloc
      case 5: abc = [{ type: 'NO_STOP', n: 15 }, perfects, time]; break;   // barils : 1,5 s max par bloc
      case 8: abc = [{ type: 'NO_STOP', n: 10 }, streak, time]; break;     // pierres brûlantes : 1 s max
      default: abc = [streak, coins, time];                                // cristaux, moutons, glaçons
    }
    const m = spec.number % 3;
    return m === 1 ? [abc[0], abc[1]] : m === 2 ? [abc[0], abc[2]] : [abc[1], abc[2]];
  },
  /** Défi à compteur : une fois l'objectif atteint, il reste acquis même si l'on tombe ensuite. */
  instant(c) { return ['STREAK', 'EDGE', 'MOVING', 'GOLD', 'ICE', 'COINS', 'PERFECTS', 'BOUNCE'].includes(c.type); },
  hasGold(spec) { return this.of(spec).some((c) => c.type === 'GOLD'); },
  done(c, s) {
    switch (c.type) {
      case 'STREAK': return s.maxStreak >= c.n;
      case 'TIME': return s.time <= c.n;
      case 'CLEAN': return s.faults === 0;
      case 'EDGE': return s.edges >= c.n;
      case 'NO_STOP': return !s.stopFailed;
      case 'MOVING': return s.movingPerfects >= c.n;
      case 'GOLD': return s.gold >= c.n;
      case 'COINS': return s.coins >= c.n;
      case 'PERFECTS': return s.perfects >= c.n;
      case 'BOUNCE': return s.bouncePerfects >= c.n;
      default: return s.icePerfects >= c.n;
    }
  },
  failed(c, s) { return (c.type === 'TIME' && s.time > c.n) || (c.type === 'CLEAN' && s.faults > 0) || (c.type === 'NO_STOP' && s.stopFailed); },
  progress(c, s) {
    const v = { STREAK: s.maxStreak, EDGE: s.edges, MOVING: s.movingPerfects, GOLD: s.gold, ICE: s.icePerfects,
      COINS: s.coins, PERFECTS: s.perfects, BOUNCE: s.bouncePerfects }[c.type];
    return v === undefined ? null : Math.min(v, c.n);
  },
  statKey(season, n, type) { return `q${season}_s${n}_${type.toLowerCase()}`; },
  /** Charge les compteurs déjà acquis sur ce niveau (bord, mobile, or, glace) et remet le reste à zéro. */
  load(season, n) {
    return {
      maxStreak: 0, time: 0, faults: 0, stopFailed: false, coins: 0, perfects: 0,
      bouncePerfects: store.getInt(this.statKey(season, n, 'BOUNCE'), 0),
      edges: store.getInt(this.statKey(season, n, 'EDGE'), 0),
      movingPerfects: store.getInt(this.statKey(season, n, 'MOVING'), 0),
      gold: store.getInt(this.statKey(season, n, 'GOLD'), 0),
      icePerfects: store.getInt(this.statKey(season, n, 'ICE'), 0),
    };
  },
  /** Enregistre les compteurs acquis sur ce niveau pour les garder aux prochaines parties. */
  save(season, n, s) {
    if (s.edges > 0) store.set(this.statKey(season, n, 'EDGE'), s.edges);
    if (s.movingPerfects > 0) store.set(this.statKey(season, n, 'MOVING'), s.movingPerfects);
    if (s.gold > 0) store.set(this.statKey(season, n, 'GOLD'), s.gold);
    if (s.icePerfects > 0) store.set(this.statKey(season, n, 'ICE'), s.icePerfects);
    if (s.bouncePerfects > 0) store.set(this.statKey(season, n, 'BOUNCE'), s.bouncePerfects);
  },
  /** Avancement déjà gardé d'une partie précédente (0..n), ou 0. */
  saved(season, n, c) {
    if (!['EDGE', 'MOVING', 'GOLD', 'ICE', 'BOUNCE'].includes(c.type)) return 0;
    return Math.min(store.getInt(this.statKey(season, n, c.type), 0), c.n);
  },
  /** Nouveaux défis (5.45) : niveaux terminés gardés, 2e et 3e pièces dorées retirées une seule fois. */
  migrate() {
    if (store.getInt('quest_medals_v2', 0) !== 0) return;
    for (let season = 1; season <= Quest.SEASONS; season++) for (let n = 1; n <= Quest.LEVELS; n++) {
      const key = `q${season}_m${n}`, m = store.getInt(key, 0);
      if (m !== 0) store.set(key, m & QuestProgress.MEDAL_FINISH);
    }
    store.set('quest_medals_v2', 1);
  },
};

function newChallengeStats() { return { maxStreak: 0, time: 0, faults: 0, edges: 0, stopFailed: false, movingPerfects: 0, gold: 0, icePerfects: 0, coins: 0, perfects: 0, bouncePerfects: 0 }; }

function challengeText(c) {
  switch (c.type) {
    case 'STREAK': return tr('quest.ch.streak', { n: c.n });
    case 'TIME': return tr('quest.ch.time', { n: c.n });
    case 'CLEAN': return tr('quest.ch.clean');
    case 'EDGE': return tr('quest.ch.edge', { n: c.n });
    // Secondes avec une décimale : le séparateur est dans le texte de chaque langue
    case 'NO_STOP': return tr('quest.ch.nostop', { a: Math.floor(c.n / 10), b: c.n % 10 });
    case 'MOVING': return tr('quest.ch.moving', { n: c.n });
    case 'GOLD': return tr('quest.ch.gold', { n: c.n });
    case 'COINS': return tr('quest.s' + quest.season + '.ch_coins', { n: c.n });
    case 'PERFECTS': return tr('quest.ch.perfects', { n: c.n });
    case 'BOUNCE': return tr(quest.season === 2 || quest.season === 10 ? 'quest.s' + quest.season + '.ch_bounce' : 'quest.ch.bounce', { n: c.n });
    default: return tr('quest.ch.ice', { n: c.n });
  }
}

function challengeSaved(n, c, got) {
  if (got) return '';
  const p = Challenges.saved(quest.season, n, c);
  return p > 0 ? `  (${p}/${c.n})` : '';
}

function challengeResult(c) {
  const p = Challenges.progress(c, quest.stats);
  if (p !== null) return `  (${p}/${c.n})`;
  if (c.type === 'TIME') return `  (${Math.floor(quest.stats.time)} s)`;
  return '';
}

const CHALLENGE_ICONS = { STREAK: '🔥', TIME: '⏱', CLEAN: '✨', EDGE: '😱', NO_STOP: '⏳', MOVING: '↔', GOLD: '🪙', ICE: '🧊', PERFECTS: '🎯', BOUNCE: '🪼' };
function challengeShort(c, got = false) {
  const s = quest.stats, p = Challenges.progress(c, s);
  let v;
  if (got) v = '✓';
  else if (Challenges.failed(c, s)) v = '✗';
  else if (p !== null) v = p >= c.n ? '✓' : `${p}/${c.n}`;
  else if (c.type === 'TIME') v = `${Math.floor(s.time)}/${c.n} s`;
  else v = '✓';
  return (c.type === 'COINS' ? ChapterInfo.pickupIcon(quest.season) : CHALLENGE_ICONS[c.type]) + ' ' + v;
}

/** Atterrissage réussi pendant un niveau (avant que le bloc devienne le bloc actuel). */
function questOnLand(perfect, scared) {
  const s = quest.stats;
  if (perfectStreak > s.maxStreak) s.maxStreak = perfectStreak;
  if (scared) { s.edges++; s.faults++; }
  if (perfect && next.kind === Kind.MOVING) s.movingPerfects++;
  if (perfect && next.kind === Kind.ICE) s.icePerfects++;
  if (perfect) s.perfects++;
  if (perfect && next.kind === Kind.TRAMPOLINE) s.bouncePerfects++;
  quest.standT = 0;
  if (quest.level !== Quest.LEGEND) Challenges.save(quest.season, quest.level, s);
  checkQuestEggs();
}

function questStopLimit() { const c = quest.challenges && quest.challenges.find((x) => x.type === 'NO_STOP'); return c ? c.n / 10 : 0; }

/** Œufs dorés des défis à compteur : gagnés dès que l'objectif est atteint, même sans finir le niveau. */
function checkQuestEggs() {
  const ch = quest.challenges;
  if (!ch) return;
  ch.forEach((c, i) => {
    const bit = i === 0 ? QuestProgress.MEDAL_COINS : QuestProgress.MEDAL_PERFECTS;
    if (!Challenges.instant(c) || !Challenges.done(c, quest.stats) || (quest.runFresh & bit)) return;
    if (!QuestProgress.grant(quest.season, quest.level, bit)) return;
    quest.runFresh |= bit;
    banners.push({ text: tr(qk('egg_won')), life: 2.4 });
    sounds.play('UNLOCK');
  });
}

/** Chrono du niveau et défi « sans t'arrêter ». */
function updateQuestChallenges(dt) {
  if (!quest.started) return;
  checkQuestEggs();
  if (state === State.READY || state === State.CHARGING || state === State.JUMPING) quest.stats.time += dt;
  // Seul le temps avant d'appuyer compte (pas la charge du saut : un saut lointain demande jusqu'à 1,4 s de charge)
  if (state === State.READY && !pendingBounce && !ice.sliding && !current.finish) {
    quest.standT += dt;
    const lim = questStopLimit();
    if (lim > 0 && !quest.stats.stopFailed && quest.standT > lim) {
      quest.stats.stopFailed = true;
      popups.push({ text: tr('quest.too_slow'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.2, pz) + camY, life: 1.3 });
    }
  }
}

const standPaint = new Paint();
/** Défi « sans t'arrêter » : petite barre qui se vide au-dessus du personnage tant qu'il est posé. */
function drawQuestStandTimer(canvas) {
  const lim = questStopLimit();
  if (!lim || !quest.started || quest.stats.stopFailed || current.finish) return;
  if (state !== State.READY) return;   // une fois le doigt posé, le sablier n'a plus d'importance
  const f = clamp(1 - quest.standT / lim, 0, 1);
  // Sablier à droite du personnage (bien distinct de la jauge de saut, au-dessus de la tête)
  drawHourglass(canvas, sx(px, pz) + k * 0.95, sy(px, playerHeight * 1.2, pz), k * 0.85, f);
}

const standStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), standPath = new Path();
/** Sablier de hauteur hgt centré en (x0, y0) ; f = part du sable restant en haut (1 = plein, 0 = écoulé). */
function drawHourglass(canvas, x0, y0, hgt, f) {
  const p = standPaint, st = standStroke, path = standPath, hw = hgt * 0.33, hh = hgt / 2;
  const sand = Color.parseColor(f > 0.5 ? '#F2C14E' : f > 0.25 ? '#FF9F1C' : '#E5484D');
  canvas.save();
  // Il tremble quand le temps presse
  if (f < 0.25) canvas.rotate(Math.sin(time * 40) * 8 * (1 - f / 0.25), x0, y0);
  p.shader = null;
  path.reset();
  path.moveTo(x0 - hw, y0 - hh); path.lineTo(x0 + hw, y0 - hh); path.lineTo(x0 + hw * 0.14, y0);
  path.lineTo(x0 + hw, y0 + hh); path.lineTo(x0 - hw, y0 + hh); path.lineTo(x0 - hw * 0.14, y0); path.close();
  p.color = Color.argb(140, 30, 42, 72); canvas.drawPath(path, p);
  // Sable du haut : il descend vers le goulot
  const top = hh * 0.9 * f;
  if (top > 0) {
    const wTop = hw * 0.14 + (hw * 0.92 - hw * 0.14) * (top / hh);
    path.reset();
    path.moveTo(x0 - wTop, y0 - top); path.lineTo(x0 + wTop, y0 - top);
    path.lineTo(x0 + hw * 0.1, y0 - hgt * 0.02); path.lineTo(x0 - hw * 0.1, y0 - hgt * 0.02); path.close();
    p.color = sand; canvas.drawPath(path, p);
  }
  // Tas du bas : il monte
  const bot = hh * 0.85 * (1 - f);
  if (bot > 0) {
    const wMid = hw * 0.92 * (1 - 0.6 * bot / hh);
    path.reset();
    path.moveTo(x0 - hw * 0.92, y0 + hh * 0.97); path.lineTo(x0 + hw * 0.92, y0 + hh * 0.97);
    path.lineTo(x0 + wMid, y0 + hh - bot * 0.75); path.lineTo(x0, y0 + hh - bot); path.lineTo(x0 - wMid, y0 + hh - bot * 0.75); path.close();
    p.color = sand; canvas.drawPath(path, p);
  }
  // Filet de sable qui tombe
  if (f > 0.001 && f < 0.999) { st.color = sand; st.strokeWidth = hgt * 0.04; canvas.drawLine(x0, y0, x0, y0 + hh - bot, st); }
  // Contour du verre et montants en bois
  st.color = Color.argb(230, 255, 255, 255); st.strokeWidth = hgt * 0.045;
  path.reset();
  path.moveTo(x0 - hw, y0 - hh); path.lineTo(x0 - hw * 0.14, y0); path.lineTo(x0 - hw, y0 + hh);
  path.moveTo(x0 + hw, y0 - hh); path.lineTo(x0 + hw * 0.14, y0); path.lineTo(x0 + hw, y0 + hh);
  canvas.drawPath(path, st);
  const cap = hgt * 0.1;
  const caps = [new RectF(x0 - hw * 1.25, y0 - hh - cap, x0 + hw * 1.25, y0 - hh + cap * 0.2), new RectF(x0 - hw * 1.25, y0 + hh - cap * 0.2, x0 + hw * 1.25, y0 + hh + cap)];
  p.color = Color.parseColor('#8D5A2B'); for (const r of caps) canvas.drawRoundRect(r, cap * 0.4, cap * 0.4, p);
  st.color = Color.parseColor('#5D3A1A'); st.strokeWidth = hgt * 0.03; for (const r of caps) canvas.drawRoundRect(r, cap * 0.4, cap * 0.4, st);
  canvas.restore();
}

