'use strict';
// Cœurs offerts dans l'Aventure (équivalent de QuestHeart.kt) : un niveau raté QH_FAILS fois de suite, et une
// fenêtre « Trop dur ? Voici un cœur pour t'aider ! » donne un cœur pour les tentatives suivantes. À la chute,
// l'ange rattrape le perso et le repose sur le dernier bloc réussi (startRevive, game.js), comme en mode libre.
// Les cœurs offerts sont acquis pour ce niveau : on les retrouve au départ de chaque essai, même s'ils ont servi.
// L'aide grandit si le niveau résiste encore : QH_FAILS échecs de plus, 2 cœurs à chaque essai, puis 3 au maximum.
// Le niveau réussi garde toutes ses récompenses.

const QH_FAILS = 7, QH_MAX = 3;
const qheartPaint = new Paint(), qheartStroke = new Paint({ style: Style.STROKE });
const qheartText = new Paint({ textAlign: Align.CENTER, bold: true }), qheartBody = new Paint({ textAlign: Align.CENTER });

const QuestHeart = {
  /** Reprise de la 1re version (q*_heart* : 1 = cœur offert pas encore servi, 2 = cœur qui a servi). */
  migrate(season, n) {
    const old = store.getInt(`q${season}_heart${n}`, 0);
    if (!old) return;
    store.set(`q${season}_heart${n}`, 0);
    if (!this.gifts(season, n)) { store.set(`q${season}_gifts${n}`, 1); if (old === 1) store.set(`q${season}_hearts${n}`, 1); }
  },
  /** Cœurs donnés au départ de chaque essai du niveau : un par cadeau déjà fait, QH_MAX au plus. */
  hearts(season, n) { this.migrate(season, n); return Math.min(QH_MAX, this.gifts(season, n)); },
  /** Cadeaux déjà faits sur le niveau (chacun ajoute un cœur à chaque essai, jusqu'à QH_MAX). */
  gifts(season, n) { return store.getInt(`q${season}_gifts${n}`, 0); },
  /** Échecs d'affilée depuis le dernier cadeau (remis à zéro quand le niveau est réussi). */
  fails(season, n) { return store.getInt(`q${season}_fails${n}`, 0); },
  setFails(season, n, v) { store.set(`q${season}_fails${n}`, v); },
};

/** Départ d'un essai (après resetGame) : tous les cœurs offerts sur ce niveau deviennent des vies, à chaque essai. */
function questHeartOnStart() {
  lives = Math.min(maxLives, QuestHeart.hearts(quest.season, quest.level));
}

/** Niveau réussi : le compteur d'échecs repart à zéro (les cœurs offerts restent acquis). */
function questHeartOnWin() { QuestHeart.setFails(quest.season, quest.level, 0); }

/** Niveau raté : un échec de plus ; au QH_FAILS-ième, nouveau cadeau : un cœur de plus à chaque essai (QH_MAX au plus). */
function questHeartOnFail() {
  const s = quest.season, n = quest.level;
  const f = QuestHeart.fails(s, n) + 1;
  QuestHeart.setFails(s, n, f);
  if (f < QH_FAILS || QuestHeart.gifts(s, n) >= QH_MAX) return;
  const g = QuestHeart.gifts(s, n) + 1, give = Math.min(QH_MAX, g);
  store.set(`q${s}_gifts${n}`, g);
  QuestHeart.setFails(s, n, 0);
  Object.assign(quest, { heartGift: true, heartGiftT: time, heartGiftN: give, heartGiftFirst: g === 1 });
  Telemetry.track('quest_heart', { season: s, level: n === Quest.LEGEND ? 99 : n, gift: g, hearts: give });
  sounds.play('UNLOCK');
}

function closeQuestHeartGift() { quest.heartGift = false; sounds.play('CLICK', 0.6); }

/** Fenêtre des cœurs offerts, par-dessus l'écran d'échec : gros cœurs qui arrivent en rebondissant et « Merci ! ». */
function drawQuestHeartGift(canvas) {
  buttons = [];   // l'écran d'échec dessiné dessous ne doit pas capter les touchers
  const PC = Color.parseColor, t = time - quest.heartGiftT;
  qheartPaint.shader = null; qheartPaint.color = Color.argb(225, 6, 10, 26);   // voile bien sombre : la carte d'échec s'efface
  canvas.drawRect(0, 0, w, h, qheartPaint);
  const ph = w * 0.86, top = Math.max(insetTop + w * 0.2, (insetTop + ub() - ph) / 2 + w * 0.08), l = w * 0.08, r = w * 0.92;
  // Carte rose clair, cadre blanc
  rect.set(l, top + w * 0.02, r, top + ph + w * 0.02);
  qheartPaint.shader = null; qheartPaint.color = Color.argb(90, 0, 0, 0); canvas.drawRoundRect(rect, w * 0.06, w * 0.06, qheartPaint);
  rect.set(l, top, r, top + ph);
  qheartPaint.color = Color.WHITE;
  qheartPaint.shader = new LinearGradient(0, top, 0, top + ph, PC('#FF8FB5'), PC('#C2185B')); canvas.drawRoundRect(rect, w * 0.06, w * 0.06, qheartPaint);
  qheartPaint.shader = null;
  qheartStroke.color = Color.WHITE; qheartStroke.strokeWidth = w * 0.008; canvas.drawRoundRect(rect, w * 0.06, w * 0.06, qheartStroke);
  // Gros cœurs : ils tombent du haut l'un après l'autre, rebondissent puis battent doucement
  const cnt = quest.heartGiftN || 1, size = w * (cnt === 1 ? 0.13 : cnt === 2 ? 0.105 : 0.09), gap = size * 2.25;
  for (let j = 0; j < cnt; j++) {
    const tj = t - j * 0.18, drop = clamp(tj / 0.55, 0, 1);
    if (tj <= 0) continue;
    const bounce = drop < 1 ? -(1 - drop) * (1 - drop) * w * 0.5 : -Math.abs(Math.sin((tj - 0.55) * 7)) * w * 0.05 * Math.exp(-(tj - 0.55) * 3);
    const beat = 1 + 0.07 * Math.max(0, Math.sin(time * 6 - j * 0.6)) * clamp(tj - 0.9, 0, 1);
    const hx = w / 2 + (j - (cnt - 1) / 2) * gap, hy = top + w * 0.02 + bounce, hs = size * beat;
    for (let i = 3; i >= 1; i--) { qheartPaint.color = Color.argb(Math.floor(40 * drop), 255, 255, 255); canvas.drawCircle(hx, hy, hs * (1.1 + 0.35 * i), qheartPaint); }
    qheartPaint.color = PC('#7A0E2E'); drawHeart(canvas, hx, hy + hs * 0.08, hs * 1.08, qheartPaint);
    qheartPaint.shader = new LinearGradient(0, hy - hs, 0, hy + hs, PC('#FF6B8E'), PC('#E0103F'));
    qheartPaint.color = Color.WHITE; drawHeart(canvas, hx, hy, hs, qheartPaint); qheartPaint.shader = null;
    qheartPaint.color = Color.argb(150, 255, 255, 255); canvas.drawCircle(hx - hs * 0.5, hy - hs * 0.45, hs * 0.18, qheartPaint);
  }
  // Textes
  qheartText.textSize = w * 0.085; qheartText.color = Color.WHITE;
  canvas.drawText(fitText(tr(quest.heartGiftFirst ? 'quest.heart_title' : 'quest.heart_title2'), qheartText, w * 0.76), w / 2, top + w * 0.3, qheartText);
  qheartText.textSize = w * 0.05; qheartText.color = PC('#FFF1A8');
  canvas.drawText(fitText((cnt === 1 ? tr('quest.heart_gift') : tr('quest.heart_gift_n', { n: cnt })), qheartText, w * 0.76), w / 2, top + w * 0.41, qheartText);
  qheartBody.textSize = w * 0.04; qheartBody.color = Color.WHITE;
  const lines = storyWrap(tr(cnt === 1 ? 'quest.heart_text' : 'quest.heart_text_n'), qheartBody, w * 0.72);
  lines.forEach((s, i) => canvas.drawText(s, w / 2, top + w * 0.51 + i * w * 0.055, qheartBody));
  // « Merci ! » (actif après une demi-seconde, pour ne pas le fermer par un toucher en trop)
  const bh = w * 0.13, by = top + ph - bh * 0.45;
  drawButton(canvas, new RectF(w * 0.22, by, w * 0.78, by + bh), tr('quest.heart_ok'), primaryBtnPaint, w * 0.062,
    () => { if (time - quest.heartGiftT > 0.5) closeQuestHeartGift(); });
}
