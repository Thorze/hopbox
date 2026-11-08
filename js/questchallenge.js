'use strict';
// Défis des pièces dorées de l'Aventure (équivalent de QuestChallenge.kt et des fonctions de défis de QuestUi.kt).
// Chaque niveau : 1) terminer, 2) et 3) deux défis propres au niveau.

const Challenges = {
  /** Les deux défis (2e et 3e pièce dorée) du niveau spec : [{type, n}, {type, n}]. */
  of(spec) {
    const jumps = spec.blocks.length, count = (k) => spec.blocks.filter((b) => b.kind === k).length;
    const time = (perJump) => ({ type: 'TIME', n: Math.round(jumps * perJump) });
    const moving = count(Kind.MOVING), crumbly = count(Kind.CRUMBLY), ice = count(Kind.ICE);
    switch (spec.number) {
      case 1: case 2: return [{ type: 'STREAK', n: 3 }, time(2.4)];
      case 3: return [{ type: 'HIDDEN', n: 1 }, { type: 'CLEAN', n: 0 }];
      case 4: case 5: return [{ type: 'EDGE', n: 2 }, { type: 'NO_STOP', n: 15 }];
      case 6: return [moving > 0 ? { type: 'MOVING', n: Math.min(2, moving) } : { type: 'STREAK', n: 3 }, { type: 'STREAK', n: 4 }];
      case 7: case 8: case 9: return [crumbly > 0 ? { type: 'GOLD', n: 6 } : { type: 'EDGE', n: 2 }, time(2.0)];
      case 10: case 11: case 12: return [ice > 0 ? { type: 'ICE', n: Math.min(2, ice) } : { type: 'STREAK', n: 4 }, { type: 'EDGE', n: 3 }];
      case 13: case 14: return [{ type: 'HIDDEN', n: 2 }, { type: 'NO_STOP', n: 13 }];
      default: return [{ type: 'STREAK', n: 5 }, time(1.7)];
    }
  },
  hasGold(spec) { return this.of(spec).some((c) => c.type === 'GOLD'); },
  hasHidden(spec) { return this.of(spec).some((c) => c.type === 'HIDDEN'); },
  done(c, s) {
    switch (c.type) {
      case 'STREAK': return s.maxStreak >= c.n;
      case 'TIME': return s.time <= c.n;
      case 'HIDDEN': return s.hidden >= c.n;
      case 'CLEAN': return s.faults === 0;
      case 'EDGE': return s.edges >= c.n;
      case 'NO_STOP': return !s.stopFailed;
      case 'MOVING': return s.movingPerfects >= c.n;
      case 'GOLD': return s.gold >= c.n;
      default: return s.icePerfects >= c.n;
    }
  },
  failed(c, s) { return (c.type === 'TIME' && s.time > c.n) || (c.type === 'CLEAN' && s.faults > 0) || (c.type === 'NO_STOP' && s.stopFailed); },
  progress(c, s) {
    const v = { STREAK: s.maxStreak, HIDDEN: s.hidden, EDGE: s.edges, MOVING: s.movingPerfects, GOLD: s.gold, ICE: s.icePerfects }[c.type];
    return v === undefined ? null : Math.min(v, c.n);
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

function newChallengeStats() { return { maxStreak: 0, time: 0, hidden: 0, faults: 0, edges: 0, stopFailed: false, movingPerfects: 0, gold: 0, icePerfects: 0 }; }

function challengeText(c) {
  switch (c.type) {
    case 'STREAK': return tr('quest.ch.streak', { n: c.n });
    case 'TIME': return tr('quest.ch.time', { n: c.n });
    case 'HIDDEN': return tr('quest.ch.hidden', { n: c.n });
    case 'CLEAN': return tr('quest.ch.clean');
    case 'EDGE': return tr('quest.ch.edge', { n: c.n });
    // Secondes avec une décimale : le séparateur est dans le texte de chaque langue
    case 'NO_STOP': return tr('quest.ch.nostop', { a: Math.floor(c.n / 10), b: c.n % 10 });
    case 'MOVING': return tr('quest.ch.moving', { n: c.n });
    case 'GOLD': return tr('quest.ch.gold', { n: c.n });
    default: return tr('quest.ch.ice', { n: c.n });
  }
}

function challengeResult(c) {
  const p = Challenges.progress(c, quest.stats);
  if (p !== null) return `  (${p}/${c.n})`;
  if (c.type === 'TIME') return `  (${Math.floor(quest.stats.time)} s)`;
  return '';
}

const CHALLENGE_ICONS = { STREAK: '🔥', TIME: '⏱', HIDDEN: '⭐', CLEAN: '✨', EDGE: '😱', NO_STOP: '⏳', MOVING: '↔', GOLD: '🪙', ICE: '🧊' };
function challengeShort(c) {
  const s = quest.stats, p = Challenges.progress(c, s);
  let v;
  if (Challenges.failed(c, s)) v = '✗';
  else if (p !== null) v = p >= c.n ? '✓' : `${p}/${c.n}`;
  else if (c.type === 'TIME') v = `${Math.floor(s.time)}/${c.n} s`;
  else v = '✓';
  return CHALLENGE_ICONS[c.type] + ' ' + v;
}

/** Atterrissage réussi pendant un niveau (avant que le bloc devienne le bloc actuel). */
function questOnLand(perfect, scared) {
  const s = quest.stats;
  if (perfectStreak > s.maxStreak) s.maxStreak = perfectStreak;
  if (scared) { s.edges++; s.faults++; }
  if (perfect && next.kind === Kind.MOVING) s.movingPerfects++;
  if (perfect && next.kind === Kind.ICE) s.icePerfects++;
  quest.standT = 0;
  if (next.secret) {
    next.secret = false;
    const x = sx(px, pz) + camX - k * 1.2, y = sy(px, 0.4, pz) + camY;
    if (perfect) {
      s.hidden++; spawnSparkles(x, y, Q_GOLD, 26);
      popups.push({ text: tr('quest.secret_got'), x, y, life: 1.3 });
      sounds.play('STAR', 0.9, 1.2);
    } else popups.push({ text: tr('quest.secret_lost'), x, y, life: 1.2 });
  }
}

/** Après la création du bloc suivant : 3 parfaits d'affilée font apparaître une pièce cachée dessus. */
function questAfterSpawn(perfect) {
  if (!quest.spec) return;
  if (perfect && perfectStreak >= 3 && perfectStreak % 3 === 0 && !next.finish && Challenges.hasHidden(quest.spec)) {
    next.secret = true;
    banners.push({ text: tr('quest.secret_appears'), life: 1.6 });
  }
}

function questStopLimit() { const c = quest.challenges && quest.challenges.find((x) => x.type === 'NO_STOP'); return c ? c.n / 10 : 0; }

/** Chrono du niveau et défi « sans t'arrêter ». */
function updateQuestChallenges(dt) {
  if (!quest.started) return;
  if (state === State.READY || state === State.CHARGING || state === State.JUMPING) quest.stats.time += dt;
  if ((state === State.READY || state === State.CHARGING) && !pendingBounce && !ice.sliding && !current.finish) {
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
  if (state !== State.READY && state !== State.CHARGING) return;
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

const secretPaint = new Paint(), secretLine = new Paint({ style: Style.STROKE });
/** Œuf caché : gros œuf doré étoilé qui flotte au-dessus du bloc (repère du bloc). */
function drawSecretCoin(canvas) {
  const y = -k * 0.75 + Math.sin(time * 3) * k * 0.06, r = k * 0.2;
  secretPaint.color = Color.argb(90, 255, 220, 90); canvas.drawCircle(0, y, r * 1.7, secretPaint);
  drawMedalEgg(canvas, 0, y, r, true);
  const tw = 0.5 + 0.5 * Math.sin(time * 6), s = r * (0.6 + 0.4 * tw);
  secretLine.color = Color.argb(Math.round(230 * tw), 255, 255, 255); secretLine.strokeWidth = k * 0.025;
  canvas.drawLine(r * 0.9 - s, y - r * 0.9, r * 0.9 + s, y - r * 0.9, secretLine);
  canvas.drawLine(r * 0.9, y - r * 0.9 - s, r * 0.9, y - r * 0.9 + s, secretLine);
}
