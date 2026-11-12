'use strict';
// Barre du haut, fin de partie, pause et réglages (équivalent de Menus.kt).

function canAffordSomething() {
  return Skins.items.some((it) => it.isShop && !profile.owns(it) && profile.coins >= it.price)
    || Skins.tints.some((t) => !profile.ownsTint(t) && profile.coins >= t.price);
}

/** Version web : le classement utilise toujours le pseudo choisi dans le jeu. */
function myName() { return profile.pseudo; }

/**
 * Pastille d'énergie « ⚡ 3/5 » sous les pièces, en haut à droite (bord droit en x, centre en cy, hauteur ph), avec
 * dessous le compte à rebours de la prochaine énergie. Toucher = mode Aventure. shown : valeur affichée (écran de
 * fin : elle monte quand les énergies gagnées arrivent). Renvoie le rectangle de la pastille.
 */
function drawEnergyPill(canvas, x, cy, ph, shown = null, minW = 0) {
  const now = Energy.now(), e = Energy.get(now);
  const text = `${shown === null ? e : shown}/${Energy.MAX}`;
  progText.textSize = ph * 0.46;
  const pw = Math.max(minW, progText.measureText(text) + ph * 1.35);
  const face = new RectF(x - pw, cy - ph / 2, x, cy + ph / 2);
  drawPillBack(canvas, face);
  drawBigBolt(canvas, face.left + ph * 0.26, face.top + ph * 0.13, ph * 0.46, ph * 0.74);
  progText.textAlign = Align.LEFT; progText.color = e === 0 ? UI.RED : Color.WHITE;
  canvas.drawText(text, face.left + ph * 0.9, cy + ph * 0.16, progText);
  // Compte à rebours de la prochaine énergie, juste dessous
  let bottom = face.bottom;
  if (e < Energy.MAX) {
    progText.textAlign = Align.CENTER; progText.textSize = ph * 0.36; progText.color = Color.WHITE;
    progText.setShadowLayer(w * 0.008, 0, w * 0.003, Color.argb(200, 6, 10, 26));
    canvas.drawText('⏱ ' + Energy.format(Energy.secondsToNext(now)), face.centerX(), face.bottom + ph * 0.5, progText);
    progText.shadow = null;
    bottom = face.bottom + ph * 0.62;
  }
  progText.textAlign = Align.CENTER; progText.color = Color.WHITE;
  buttons.push({ rect: new RectF(face.left - w * 0.02, face.top, w, bottom), action: () => { quest.season = currentChapter(); openQuestMap(); } });
  return face;
}

/** Petit badge doré « +5 » posé sur le coin haut droit d'une pastille (gain qui vient d'arriver). q : 0 → 1 (apparition). */
function drawGainBadge(canvas, r, text, q) {
  const ph = r.height(), s = ph * 0.5 * (1 + 0.35 * (1 - q));
  progText.textSize = s;
  const bw = Math.max(progText.measureText(text) + s * 0.9, s * 1.9), bh = s * 1.5;
  const cx = Math.min(r.right - bw * 0.25, w - bw / 2 - w * 0.008), cy = r.top + ph * 0.02;
  const a = Math.round(255 * q);
  progPaint.shader = null; progPaint.color = Color.argb(Math.round(150 * q), 90, 50, 0);
  rect.set(cx - bw / 2, cy - bh / 2 + bh * 0.1, cx + bw / 2, cy + bh / 2 + bh * 0.1); canvas.drawRoundRect(rect, bh / 2, bh / 2, progPaint);
  progPaint.color = Color.argb(a, 255, 255, 255);
  rect.set(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2);
  progPaint.shader = new LinearGradient(0, rect.top, 0, rect.bottom, Color.parseColor('#FFE680'), Color.parseColor('#F5A623'));
  canvas.drawRoundRect(rect, bh / 2, bh / 2, progPaint);
  progPaint.shader = null;
  progText.color = Color.argb(a, 74, 42, 0);
  canvas.drawText(text, cx, cy + s * 0.36, progText);
  progText.color = Color.WHITE;
}

/**
 * Bouton large avec une icône à gauche ('share' = l'icône de partage, sinon un emoji) et un texte sur une ou deux
 * lignes (coupé à l'espace le plus proche du milieu quand il est trop long).
 */
function drawIconButton(canvas, r, icon, label, bg, textSize, action) {
  drawButton(canvas, r, '', bg, textSize, action);
  const down = isPressed(r) ? r.height() * 0.14 * 0.75 : 0, cy = r.centerY() + down;
  const iw = r.height() * 0.5, pad = r.height() * 0.32, room = r.width() - pad * 2 - iw - r.height() * 0.12;
  btnTextPaint.textSize = textSize; btnTextPaint.color = Color.WHITE;
  let lines = [label];
  if (btnTextPaint.measureText(label) > room && label.includes(' ')) {
    // Deux lignes : coupe à l'espace le plus proche du milieu
    let best = -1;
    for (let i = 0; i < label.length; i++) if (label[i] === ' ' && (best < 0 || Math.abs(i - label.length / 2) < Math.abs(best - label.length / 2))) best = i;
    lines = [label.slice(0, best), label.slice(best + 1)];
  }
  let tw = Math.max(...lines.map((l) => btnTextPaint.measureText(l)));
  if (tw > room) { btnTextPaint.textSize *= Math.max(0.6, room / tw); tw = Math.max(...lines.map((l) => btnTextPaint.measureText(l))); }
  const x0 = r.centerX() - (iw + r.height() * 0.12 + Math.min(tw, room)) / 2;
  if (icon === 'share') drawShareGlyph(canvas, x0 + iw / 2, cy, iw * 0.5);
  else { progText.textSize = iw * 0.86; progText.color = Color.WHITE; canvas.drawText(icon, x0 + iw / 2, cy + iw * 0.3, progText); }
  btnTextPaint.textAlign = Align.LEFT;
  btnTextPaint.setShadowLayer(r.height() * 0.05, 0, r.height() * 0.035, Color.argb(120, 0, 0, 0));
  const lh = btnTextPaint.textSize * 1.08, ty = cy - (btnTextPaint.descent() + btnTextPaint.ascent()) / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => canvas.drawText(ellipsize(l, btnTextPaint, room), x0 + iw + r.height() * 0.12, ty + i * lh, btnTextPaint));
  btnTextPaint.shadow = null; btnTextPaint.textAlign = Align.CENTER;
}

// Pièces gagnées qui volent jusqu'au total en haut à droite, puis le total qui monte avec des « + » qui pulsent
const GO_FLY_T = 0.55, GO_FLY_DUR = 0.45, GO_COUNT_T = 0.9, GO_COUNT_DUR = 0.55;
let goFxPrev = 0;

function drawGameOver(canvas) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  // Barre du haut : les pièces puis les énergies gagnées rejoignent leur total, qui monte
  const earned = coinsThisRun, cq = clamp((gameOverTime - GO_COUNT_T) / GO_COUNT_DUR, 0, 1);
  const shown = earned > 0 ? profile.coins - Math.round(earned * (1 - cq)) : profile.coins;
  const bump = earned > 0 && gameOverTime > GO_COUNT_T ? Math.max(0, Math.sin(Math.min(1, (gameOverTime - GO_COUNT_T) / (GO_COUNT_DUR + 0.25)) * Math.PI)) : 0;
  const bolts = energyThisRun, eq = clamp((gameOverTime - GO_COUNT_T - GO_ENERGY_LAG) / GO_COUNT_DUR, 0, 1);
  const eShown = bolts > 0 ? Math.max(0, Energy.get(Energy.now()) - Math.round(bolts * (1 - eq))) : null;
  const pills = drawTopBar(canvas, shown, bump, undefined, undefined, undefined, eShown);
  // Panneau : ruban « Perdu ! » (doré + couronne si nouveau record), score doré, boutons, record, objectif, Rejouer
  const r0 = gameOverReason ? w * 0.055 : 0, u0 = unlockedLabels.length ? w * 0.055 : 0;
  const ph = w * 1.085 + r0 + u0, left = w * 0.08, right = w * 0.92;
  let top = Math.max(insetTop + w * (newBest ? 0.4 : 0.33), (insetTop + ub()) / 2 - ph / 2 + w * 0.07);
  top = Math.max(insetTop + w * 0.3, Math.min(top, ub() - ph - w * 0.035));
  const bottom = top + ph, cx = w / 2;
  drawPanel(canvas, new RectF(left, top, right, bottom));
  const pop = clamp(gameOverTime / 0.35, 0, 1);
  const ribbonY = top + w * 0.085;
  if (newBest) drawCrown(canvas, cx, ribbonY - w * 0.065 + Math.sin(gameOverTime * 3) * w * 0.008, w * 0.13);
  drawTitleRibbon(canvas, cx, ribbonY, tr('over.title'), Color.parseColor(newBest ? '#F5A623' : '#7B5CF0'), w * 0.072, w * 0.58);
  greyTextPaint.textAlign = Align.CENTER;
  if (gameOverReason) {
    greyTextPaint.textSize = w * 0.036;
    canvas.drawText(fitText(gameOverReason, greyTextPaint, right - left - w * 0.1), cx, top + w * 0.215, greyTextPaint);
  }
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.05;
  canvas.drawText(tr('over.score_label'), cx, top + w * 0.225 + r0, darkTextPaint);
  darkTextPaint.textAlign = Align.LEFT;
  const numSize = w * 0.19 * (1.4 - 0.4 * pop) * Math.min(1, 3.2 / Math.max(3.2, String(score).length));
  drawGoldNumber(canvas, String(score), cx, top + w * 0.415 + r0, numSize, pop);
  // « Ralenti de la mort » (si saut raté) et « Partage tes exploits », côte à côte : boutons secondaires, plus
  // petits que « Rejouer » et regroupés au centre (ils sont centrés dans la même bande, la mise en page ne bouge pas)
  const by = top + w * 0.47 + r0, bh = w * 0.125, bl = left + w * 0.05, br = right - w * 0.05;
  if (gameOverTime > 0.6) {
    const sh = w * 0.095, sy = by + (bh - sh) / 2, sw = w * 0.33, gap = w * 0.025;
    if (deathSnap) {
      drawIconButton(canvas, new RectF(cx - gap / 2 - sw, sy, cx - gap / 2, sy + sh), '🎬', tr('death.title'), dangerBtnPaint, w * 0.031, () => openDeathReplay());
      drawIconButton(canvas, new RectF(cx + gap / 2, sy, cx + gap / 2 + sw, sy + sh), 'share', tr('over.share'), backBtnPaint, w * 0.031, () => shareScore());
    } else drawIconButton(canvas, new RectF(cx - sw * 0.65, sy, cx + sw * 0.65, sy + sh), 'share', tr('over.share'), backBtnPaint, w * 0.034, () => shareScore());
  }
  // Filet de séparation
  progPaint.shader = null; progPaint.color = Color.argb(60, 150, 185, 255);
  canvas.drawRect(bl, by + bh + w * 0.045, br, by + bh + w * 0.048, progPaint);
  // Record perso (ou badge « nouveau record ») ; les pièces gagnées partent de là vers le total en haut
  let y = top + w * 0.7 + r0;
  const recY = y;
  progText.textSize = w * 0.042; textPaint.textSize = w * 0.05;
  const t = newBest ? '👑 ' + tr('over.new_record') : tr('over.personal_record', { n: best });
  if (newBest) {
    const lw = progText.measureText(t) + w * 0.08;
    rect.set(cx - lw / 2, y - w * 0.06, cx + lw / 2, y + w * 0.03);
    progPaint.color = Color.parseColor('#C77700');
    canvas.drawRoundRect(new RectF(rect.left, rect.top + w * 0.01, rect.right, rect.bottom + w * 0.01), w * 0.045, w * 0.045, progPaint);
    progPaint.color = Color.parseColor('#FFC93C'); canvas.drawRoundRect(rect, w * 0.045, w * 0.045, progPaint);
    progText.color = UI.INK_DARK; canvas.drawText(t, cx, y, progText);
    progText.color = Color.WHITE;
  } else canvas.drawText(fitText(t, textPaint, right - left - w * 0.1), cx, y, textPaint);
  if (unlockedLabels.length) {
    y += w * 0.055;
    greyTextPaint.textSize = w * 0.036;
    canvas.drawText(fitText(tr('over.unlocked', { items: unlockedLabels.join(', ') }), greyTextPaint, right - left - w * 0.08), cx, y, greyTextPaint);
  }
  // Le prochain objectif, pour donner envie de rejouer (objet de boutique : toucher = l'ouvrir)
  const goalY = top + w * 0.8 + r0 + u0;
  if (gameOverTime > 0.35) {
    if (overGoal === null) overGoal = nextGoal();
    const a = clamp((gameOverTime - 0.35) / 0.3, 0, 1);
    progText.textSize = w * 0.038;
    const text = fitText('🎯 ' + overGoal, progText, right - left - w * 0.2), gw = progText.measureText(text) + w * 0.09;
    rect.set(cx - gw / 2, goalY - w * 0.052, cx + gw / 2, goalY + w * 0.052);
    progPaint.color = Color.argb(Math.round(170 * a), 44, 58, 106);
    canvas.drawRoundRect(rect, w * 0.052, w * 0.052, progPaint);
    progStroke.color = Color.argb(Math.round(110 * a), 150, 185, 255); progStroke.strokeWidth = w * 0.003;
    canvas.drawRoundRect(rect, w * 0.052, w * 0.052, progStroke);
    progText.color = Color.argb(Math.round(255 * a), 255, 229, 140);
    canvas.drawText(text, cx, goalY + w * 0.014, progText);
    progText.color = Color.WHITE;
    if (overGoalItem) {
      const item = overGoalItem;
      if (a >= 1) buttons.push({ rect: new RectF(rect.left, rect.top, rect.right, rect.bottom), action: () => openShopAt(item) });
    }
  }
  // Gros bouton vert « Rejouer »
  if (gameOverTime > 0.6) {
    const pulse = 1 + 0.02 * Math.sin(gameOverTime * 5);
    const bw = (right - left - w * 0.1) / 2 * pulse, bh2 = w * 0.075 * pulse, cy = top + w * 0.965 + r0 + u0;
    drawButton(canvas, new RectF(cx - bw, cy - bh2, cx + bw, cy + bh2), '▶ ' + tr('over.replay'), primaryBtnPaint, w * 0.068, () => replay());
  }
  drawGameOverGainFx(canvas, earned, pills.coins, recY, '🪙', GO_COUNT_T, true);
  drawGameOverGainFx(canvas, bolts, pills.energy, recY, '⚡', GO_COUNT_T + GO_ENERGY_LAG, false);
  goFxPrev = gameOverTime;
}

/** Délai des énergies gagnées par rapport aux pièces (elles arrivent juste après). */
const GO_ENERGY_LAG = 0.35;

/**
 * Gains de la partie (pièces ou énergies) qui volent du milieu de l'écran jusqu'à leur pastille en haut à droite,
 * avec des « + » qui pulsent autour, puis un badge doré « +5 » posé sur le coin haut droit de la pastille.
 * countT : moment où le total commence à monter.
 */
function drawGameOverGainFx(canvas, earned, r, fromY, glyph, countT, sound) {
  const t = gameOverTime, prev = goFxPrev;
  if (earned <= 0 || !r) return;
  const flyT = countT - (GO_COUNT_T - GO_FLY_T);
  const tx = r.left + r.height() * 0.5, ty = r.centerY(), fx = w / 2, fy = fromY - w * 0.02;
  const n = Math.min(8, Math.max(glyph === '⚡' ? 1 : 3, earned));
  for (let i = 0; i < n; i++) {
    const t0 = flyT + i * 0.04, q = (t - t0) / GO_FLY_DUR;
    if (prev < t0 + GO_FLY_DUR && t >= t0 + GO_FLY_DUR && i % 2 === 0) sounds.play(sound ? 'COIN' : 'STAR', 0.35, 1 + i * 0.05);
    if (q <= 0 || q >= 1) continue;
    const e = q * q, x = fx + (tx - fx) * e + Math.sin(q * Math.PI) * w * 0.08 * (i % 2 ? 1 : -1), y = fy + (ty - fy) * e - Math.sin(q * Math.PI) * w * 0.12;
    progText.textSize = w * (0.06 - 0.02 * q); progText.color = Color.WHITE;
    canvas.drawText(glyph, x, y + w * 0.02, progText);
  }
  // « + » qui pulsent autour du total pendant qu'il monte
  const pq = (t - countT) / (GO_COUNT_DUR + 0.45);
  if (pq > 0 && pq < 1) {
    const cx = r.centerX(), cy = r.centerY();
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + 0.3, d = r.width() * (0.5 + 0.25 * ((i * 7) % 3) / 2) + w * 0.03 * pq;
      const pulse = Math.abs(Math.sin(t * 12 + i * 1.3)), alpha = Math.round(255 * Math.min(1, (1 - pq) * 2));
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.55 + w * 0.01;
      progText.textSize = w * (0.03 + 0.022 * pulse); progText.color = Color.argb(alpha, 255, 214, 60);
      progText.setShadowLayer(w * 0.006, 0, w * 0.003, Color.argb(Math.round(alpha * 0.7), 120, 70, 0));
      canvas.drawText('+', x, y, progText);
    }
    progText.shadow = null;
  }
  // Badge « +5 » sur la pastille : il apparaît avec le décompte et reste affiché (on voit combien on a gagné)
  if (t > countT) drawGainBadge(canvas, r, '+' + earned, clamp((t - countT) / 0.3, 0, 1));
  progText.color = Color.WHITE;
}

function drawPause(canvas) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const left = w * 0.1, right = w * 0.9, ph = w * 0.86, top = (insetTop + ub() - ph) / 2, bottom = top + ph;
  drawPanel(canvas, new RectF(left, top, right, bottom), '⏸ ' + tr('pause.title'));
  drawInfoPill(canvas, w / 2, top + w * 0.235, tr('common.score', { n: score }), w * 0.042, right - left - w * 0.1, Color.WHITE);
  const bh = w * 0.13, sh = w * 0.11;
  let y = top + w * 0.33;
  drawButton(canvas, new RectF(left + w * 0.08, y, right - w * 0.08, y + bh), tr('pause.resume'), primaryBtnPaint, w * 0.06, () => resumeGame());
  y += bh + w * 0.045;
  drawButton(canvas, new RectF(left + w * 0.08, y, right - w * 0.08, y + sh), '⚙️ ' + tr('hud.settings'), backBtnPaint, w * 0.045, () => openSettings());
  y += sh + w * 0.035;
  drawButton(canvas, new RectF(left + w * 0.08, y, right - w * 0.08, y + sh), tr('pause.quit'), dangerBtnPaint, w * 0.045, () => endGame(tr('pause.quit_reason')));
}

function settingRow(canvas, l, r, y, label, value, toggle, action) {
  const rh = w * 0.12;
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.042;
  canvas.drawText(fitText(label, darkTextPaint, value === null && toggle === null ? r - l : (r - l) * 0.55), l, y + rh * 0.6, darkTextPaint);
  if (toggle !== null) {
    const tw = w * 0.12, th = w * 0.065;
    rect.set(r - tw, y + (rh - th) / 2, r, y + (rh + th) / 2);
    progPaint.color = toggle ? Color.parseColor('#3DBE4A') : Color.parseColor('#46527A');
    canvas.drawRoundRect(rect, th / 2, th / 2, progPaint);
    progPaint.color = Color.WHITE;
    canvas.drawCircle(toggle ? rect.right - th / 2 : rect.left + th / 2, rect.centerY(), th * 0.4, progPaint);
  } else if (value !== null) {
    greyTextPaint.textAlign = Align.RIGHT; greyTextPaint.textSize = w * 0.04;
    canvas.drawText(fitText(value, greyTextPaint, (r - l) * 0.5), r, y + rh * 0.6, greyTextPaint);
    greyTextPaint.textAlign = Align.CENTER;
  }
  lockedPaint.alpha = 120;
  canvas.drawRect(l, y + rh, r, y + rh + w * 0.003, lockedPaint);
  lockedPaint.alpha = 255;
  if (action) buttons.push({ rect: new RectF(l, y, r, y + rh), action });
}

/** Réglages : sous-écran « Mon compte » et défilement quand l'écran est trop petit pour tout afficher. */
const settingsView = {
  account: false, scroll: 0, maxScroll: 0, top: 0, bottom: 0, dragY: -1, downX: 0, dragStart: 0, moved: false,
  /** Élan après un lancer (px/s), dernier point suivi, molette restant à parcourir. */
  vel: 0, lastY: 0, lastT: 0, wheel: 0,
  /** Doigt posé sur un curseur de volume, sens du geste pas encore connu (1 effets, 2 musique). */
  sliderPending: 0,
};

function drawSettings(canvas) {
  // Aperçu du zoom : le jeu reste visible derrière (zoompicker.js)
  if (zoomPick.open) { drawZoomPicker(canvas); return; }
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const left = w * 0.05, right = w * 0.95, head = w * 0.16, foot = w * 0.22;
  const contentH = w * (0.2 + 0.19 + 0.12 + (navigator.vibrate ? 0.12 : 0) + 0.12 + 0.12 + 0.12 + 0.12 + 0.12);
  const ph = Math.min(head + contentH + foot, ub() - insetTop - w * 0.06);
  const top = Math.max(insetTop + w * 0.03, (insetTop + ub()) / 2 - ph / 2), bottom = top + ph;
  panel(canvas, left, top, right, bottom, '⚙️ ' + tr('settings.title'), () => { state = settingsReturnState; });
  // 7 appuis sur le titre : menu de test caché (testmenu.js)
  if (TEST_MENU) buttons.push({ rect: new RectF(w * 0.25, top + w * 0.03, w * 0.75, top + w * 0.14), action: () => testTitleTap() });
  const l = left + w * 0.07, r = right - w * 0.07;
  // Zone qui défile entre le titre et le bouton OK
  const v = settingsView, firstButton = buttons.length;
  v.top = top + head - w * 0.01; v.bottom = bottom - foot + w * 0.02;
  v.maxScroll = Math.max(0, contentH - (v.bottom - v.top) + w * 0.02);
  v.scroll = clamp(v.scroll, 0, v.maxScroll);
  canvas.save();
  canvas.clipRect(left, v.top, right, v.bottom);
  let y = top + head - v.scroll;
  settingRow(canvas, l, r, y, '👤 ' + tr('account.title'), (myName() || '—') + '  ›', null, () => { v.account = true; });
  y += w * 0.2;
  const bh = w * 0.035;
  sfxSlider.set(l, y + w * 0.06, r, y + w * 0.06 + bh);
  drawSlider(canvas, sfxSlider, tr('settings.sfx'), sounds.soundVolume);
  y += w * 0.19;
  musicSlider.set(l, y + w * 0.06, r, y + w * 0.06 + bh);
  drawSlider(canvas, musicSlider, tr('settings.music'), sounds.musicVolume);
  y += w * 0.12;
  if (navigator.vibrate) {
    settingRow(canvas, l, r, y, '📳 ' + tr('settings.vibration_label'), null, profile.vibrationOn, () => { profile.vibrationOn = !profile.vibrationOn; if (profile.vibrationOn) vibrate(15); });
    y += w * 0.12;
  }
  // Mesure anonyme (telemetry.js) : le joueur peut la couper, plus rien n'est alors envoyé
  settingRow(canvas, l, r, y, '📊 ' + tr('settings.stats_label'), null, Telemetry.enabled, () => { Telemetry.enabled = !Telemetry.enabled; });
  y += w * 0.12;
  settingRow(canvas, l, r, y, '📺 ' + tr('settings.fake_ads_label'), null, profile.fakeAdsOn, () => { profile.fakeAdsOn = !profile.fakeAdsOn; });
  y += w * 0.12;
  // Zoom en partie : écran d'aperçu avec curseur (zoompicker.js)
  settingRow(canvas, l, r, y, '🔍 ' + tr('settings.zoom_label'), profile.gameZoom + ' %  ›', null, openZoomPicker);
  y += w * 0.12;
  const pref = profile.language;
  const langLabel = pref === LANG_AUTO ? tr('settings.language_auto', { v: I18n.nameOf(I18n.lang) }) : I18n.nameOf(pref);
  settingRow(canvas, l, r, y, '🌐 ' + tr('settings.language_label'), langLabel + '  ›', null, () => {
    openLangPicker();
  });
  y += w * 0.12;
  settingRow(canvas, l, r, y, 'ℹ️ ' + tr('settings.version', { v: 'Web ' + WEB_VERSION }), null, null, null);
  canvas.restore();
  // Les lignes cachées par le défilement ne se touchent pas
  for (let i = buttons.length - 1; i >= firstButton; i--) {
    const c = buttons[i].rect.centerY();
    if (c < v.top || c > v.bottom) buttons.splice(i, 1);
  }
  if (v.maxScroll > 0) {
    const trackH = v.bottom - v.top, thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + v.maxScroll));
    const ty0 = v.top + (trackH - thumbH) * (v.scroll / v.maxScroll);
    rect.set(right - w * 0.035, ty0, right - w * 0.021, ty0 + thumbH);
    canvas.drawRoundRect(rect, w * 0.01, w * 0.01, lockedPaint);
  }
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.16, w * 0.7, bottom - w * 0.05), 'OK', backBtnPaint, w * 0.05, () => { state = settingsReturnState; });
  if (v.account) drawAccountPanel(canvas);
}

/** Sous-écran « Mon compte » : pseudo, code ami, suppression du compte. */
function drawAccountPanel(canvas) {
  buttons.length = 0;
  const left = w * 0.06, right = w * 0.94, ph = w * 0.76;
  const top = (insetTop + ub()) / 2 - ph / 2, bottom = top + ph;
  const close = () => { settingsView.account = false; };
  panel(canvas, left, top, right, bottom, '👤 ' + tr('account.title'), close);
  const l = left + w * 0.07, r = right - w * 0.07;
  let y = top + w * 0.17;
  settingRow(canvas, l, r, y, tr('settings.player'), (myName() || '—') + '  ✎', null, () => askPseudo(false));
  y += w * 0.12;
  // Code ami : toucher = écran Duels, onglet Amis (Copier / Partager)
  settingRow(canvas, l, r, y, '🤝 ' + tr('friends.your_code'), myCode() + '  ›', null, () => { close(); openDuels(1); });
  y += w * 0.12;
  settingRow(canvas, l, r, y, '🗑️ ' + tr('account.delete'), '›', null, () => confirmDeleteAccount());
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.16, w * 0.7, bottom - w * 0.05), 'OK', backBtnPaint, w * 0.05, close);
  // Toucher dans le vide : rien ; à côté du panneau : fermer
  buttons.push({ rect: new RectF(left, top, right, bottom), action: () => {} });
  buttons.push({ rect: new RectF(0, 0, w, h), action: close });
}

// ---------- Défilement des réglages au doigt (les curseurs de volume gardent leur glissé) ----------
function settingsPointerDown(x, y) {
  const v = settingsView;
  if (state !== State.SETTINGS || v.account || zoomPick.open || langPicker || test.open || v.maxScroll <= 0 || y < v.top || y > v.bottom) return false;
  v.dragY = y; v.downX = x; v.dragStart = v.scroll; v.moved = false;
  v.vel = 0; v.wheel = 0;          // un doigt posé arrête l'élan
  v.lastY = y; v.lastT = performance.now(); v.sliderPending = 0;
  return true;
}
function settingsPointerMove(x, y) {
  const v = settingsView;
  if (v.dragY < 0) return;
  const now = performance.now();
  if (!v.moved) {
    const dx = Math.abs(x - v.downX), dy = Math.abs(y - v.dragY);
    // Doigt posé sur un curseur et parti de côté : c'est le curseur, pas la liste
    if (v.sliderPending && dx > w * 0.02 && dx > dy) { dragSlider = v.sliderPending; v.sliderPending = 0; v.dragY = -1; dragTo(x); return; }
    if (dy <= w * 0.02) return;
    // Départ du défilement à partir de là : la liste ne saute pas du seuil
    v.moved = true; v.sliderPending = 0; v.dragY = y; v.dragStart = v.scroll; v.lastY = y; v.lastT = now;
    return;
  }
  v.scroll = clamp(v.dragStart - (y - v.dragY), 0, v.maxScroll);
  const dms = now - v.lastT;
  if (dms > 0) { v.vel = v.vel * 0.3 - (y - v.lastY) * 1000 / dms * 0.7; v.lastY = y; v.lastT = now; }
}
function settingsPointerUp(x) {
  const v = settingsView;
  if (v.dragY < 0) return;
  if (!v.moved) {
    if (v.sliderPending) {
      // Simple appui sur un curseur : il va à cet endroit
      dragSlider = v.sliderPending; dragTo(v.downX);
      if (dragSlider === 1) sounds.play('GREAT');
      dragSlider = 0;
    } else {
      const hit = buttons.find((b) => b.rect.contains(v.downX, v.dragY));
      if (hit) { sounds.play('CLICK', 0.6); hit.action(); }
    }
  }
  // Doigt immobile avant de lâcher : pas d'élan
  if (!v.moved || performance.now() - v.lastT > 80) v.vel = 0;
  v.sliderPending = 0;
  v.dragY = -1;
}
/** Réglages : élan après un lancer, et molette qui glisse en douceur vers son but. */
function updateSettingsScroll(dt) {
  const v = settingsView;
  if (state !== State.SETTINGS) { v.vel = 0; v.wheel = 0; return; }
  if (v.wheel !== 0) {
    const step = v.wheel * Math.min(1, dt * 14);
    v.scroll = clamp(v.scroll + step, 0, v.maxScroll);
    v.wheel -= step;
    if (Math.abs(v.wheel) < 0.5 || v.scroll <= 0 || v.scroll >= v.maxScroll) v.wheel = 0;
  }
  if (v.dragY < 0 && v.vel !== 0) {
    v.scroll += v.vel * dt;
    if (v.scroll <= 0 || v.scroll >= v.maxScroll) v.vel = 0;
    v.scroll = clamp(v.scroll, 0, v.maxScroll);
    v.vel *= Math.exp(-3.5 * dt);
    if (Math.abs(v.vel) < w * 0.05) v.vel = 0;
  }
}
