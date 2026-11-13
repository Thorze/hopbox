'use strict';
// Bloc friable doré (équivalent de GoldBlock.kt) : 1 bloc friable sur 5 en mode libre. Jauge de vie à côté du bloc,
// pièces gagnées en restant dessus, acquises seulement après un atterrissage réussi sur le bloc suivant.

const GOLD_BLOCK_COLOR = Color.parseColor('#E8A317');
let goldPending = 0, goldShown = 0, goldHintShown = false;
const goldGaugePaint = new Paint(), goldGaugeLine = new Paint({ style: Style.STROKE }), goldGaugeRect = new RectF();
const goldText = new Paint({ textAlign: Align.CENTER, bold: true });
const goldTextLine = new Paint({ textAlign: Align.CENTER, bold: true, style: Style.STROKE, strokeJoin: 'round' });

/** Pièces en cours sur le bloc doré où l'on se tient (0 sinon). */
function goldOnBlock() {
  const p = current;
  if (!p.golden || p.crumbleT < 0 || p.collapsed || p.crumbleSafe) return 0;
  return Scoring.goldCoins(p.crumbleT);
}

/** Chaque nouvelle pièce gagnée sur le bloc : petit « tic » qui monte. */
function updateGoldBlock() {
  if (state !== State.READY && state !== State.CHARGING) return;
  const n = goldOnBlock();
  if (n > goldShown) {
    goldShown = n;
    sounds.play('COIN', 0.45, 0.85 + 0.06 * n);
    spawnSparkles(sx(current.cx, current.cz) + camX, sy(current.cx, 0.2, current.cz) + camY, Color.parseColor('#FFD54F'), 6);
  }
}

/** Au décollage : les pièces du bloc sont « en jeu » jusqu'à l'atterrissage suivant. */
function goldTakeoff() { goldPending = goldOnBlock(); goldShown = 0; }

/** Atterrissage réussi sur le bloc suivant : les pièces en jeu sont acquises. */
function goldBank() {
  const n = goldPending;
  goldPending = 0;
  if (n <= 0 || duel.active) return;
  coinsThisRun += n;
  profile.coins = profile.coins + n;
  if (quest.active) {
    quest.stats.gold += n;   // défi « trésor doré » de l'Aventure
    if (quest.level !== Quest.LEGEND) Challenges.save(quest.season, quest.level, quest.stats);
    checkQuestEggs();
  }
  // À gauche du personnage, pour ne pas se cacher derrière « PARFAIT ×n »
  const x = sx(px, pz) + camX - k * 1.4, y = sy(px, 0.3, pz) + camY;
  spawnSparkles(x, y, Color.parseColor('#FFC93C'), 26);
  popups.push({ text: `+${n} 🪙`, x, y, life: 1.2 });
  sounds.play('COIN');
  missionEvent(MissionType.COINS, n);
}

/** Chute ou bloc écroulé : les pièces en jeu sont perdues. */
function goldLose() {
  // (le bloc peut déjà être en train de s'écrouler : on compte les pièces sans regarder s'il est tombé)
  const atStake = current.golden && current.crumbleT >= 0 && !current.crumbleSafe ? Scoring.goldCoins(current.crumbleT) : 0;
  if (goldPending > 0 || atStake > 0) popups.push({ text: tr('popup.golden_lost'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.2, pz) + camY, life: 1.2 });
  goldPending = 0; goldShown = 0;
}

/** Jauge de vie verticale à côté du bloc doré, avec le compteur de pièces ; pièces en jeu pendant le saut. */
function drawGoldGauge(canvas) {
  const p = current;
  if ((state === State.READY || state === State.CHARGING) && p.golden && p.crumbleT >= 0 && !p.collapsed && !p.crumbleSafe) {
    const f = clamp(1 - p.crumbleT / p.crumbleDur, 0, 1);
    const bx = sx(p.cx, p.cz) + 1.2247449 * k * p.half + k * 0.28, base = sy(p.cx, 0, p.cz);
    const bw = k * 0.16, bh = k * 1.1, top = base - bh, pad = bw * 0.18;
    goldGaugeRect.set(bx - bw / 2, top, bx + bw / 2, base);
    goldGaugePaint.shader = null; goldGaugePaint.color = Color.argb(150, 20, 24, 40);
    canvas.drawRoundRect(goldGaugeRect, bw / 2, bw / 2, goldGaugePaint);
    const fillTop = base - pad - (bh - 2 * pad) * f;
    const blink = f < 0.25 ? 0.55 + 0.45 * Math.abs(Math.sin(time * 18)) : 1;
    goldGaugePaint.color = Color.parseColor(f > 0.5 ? '#4CBB47' : f > 0.25 ? '#FF9F1C' : '#E5484D');
    goldGaugePaint.alpha = Math.round(255 * blink);
    goldGaugeRect.set(bx - bw / 2 + pad, fillTop, bx + bw / 2 - pad, base - pad);
    if (goldGaugeRect.height() > 0) canvas.drawRoundRect(goldGaugeRect, bw * 0.3, bw * 0.3, goldGaugePaint);
    goldGaugeLine.color = Color.argb(200, 255, 255, 255); goldGaugeLine.strokeWidth = k * 0.02;
    goldGaugeRect.set(bx - bw / 2, top, bx + bw / 2, base);
    canvas.drawRoundRect(goldGaugeRect, bw / 2, bw / 2, goldGaugeLine);
    drawGoldCount(canvas, bx, top - k * 0.12, goldOnBlock(), k * 0.3);
  } else if (goldPending > 0 && state === State.JUMPING) {
    // Pièces en jeu : elles suivent le personnage jusqu'à l'atterrissage
    drawGoldCount(canvas, sx(px, pz), sy(px, py + playerHeight * 3.4, pz), goldPending, k * 0.3);
  }
}

function drawGoldCount(canvas, x, y, n, size) {
  const t = '🪙 ' + n;
  goldText.textSize = size; goldTextLine.textSize = size; goldTextLine.strokeWidth = size * 0.18;
  goldTextLine.color = Color.argb(200, 60, 36, 0); canvas.drawText(t, x, y, goldTextLine);
  goldText.color = n >= Scoring.GOLD_MAX ? Color.parseColor('#FFE066') : Color.WHITE; canvas.drawText(t, x, y, goldText);
}
