'use strict';
// Barre du haut, fin de partie, pause et réglages (équivalent de Menus.kt).

function canAffordSomething() {
  return Skins.items.some((it) => it.isShop && !profile.owns(it) && profile.coins >= it.price)
    || Skins.tints.some((t) => !profile.ownsTint(t) && profile.coins >= t.price);
}

/** Version web : le classement utilise toujours le pseudo choisi dans le jeu. */
function myName() { return profile.pseudo; }

/** Pastille « ⚡ 3/5  12:34 » (prochaine énergie), même style que celle des pièces, hauteur [ph], largeur [pw]. */
function drawEnergyPill(canvas, x, cy, ph, pw) {
  const now = Energy.now(), e = Energy.get(now);
  const text = `${e}/${Energy.MAX}`, timer = e < Energy.MAX ? Energy.format(Energy.secondsToNext(now)) : '';
  const face = new RectF(x, cy - ph / 2, x + pw, cy + ph / 2);
  const down = isPressed(face) ? ph * 0.07 : 0;
  reliefPaint.color = Color.argb(150, 60, 66, 84);
  rect.set(face.left, face.top + ph * 0.1, face.right, face.bottom + ph * 0.1);
  canvas.drawRoundRect(rect, ph / 2, ph / 2, reliefPaint);
  rect.set(face.left, face.top + down, face.right, face.bottom + down);
  reliefPaint.color = Color.argb(205, 232, 236, 244);
  canvas.drawRoundRect(rect, ph / 2, ph / 2, reliefPaint);
  progStroke.color = Color.argb(220, 255, 255, 255); progStroke.strokeWidth = w * 0.004;
  canvas.drawRoundRect(rect, ph / 2, ph / 2, progStroke);
  drawBigBolt(canvas, face.left + ph * 0.24, face.top + down + ph * 0.13, ph * 0.48, ph * 0.74);
  progText.textAlign = Align.LEFT;
  progText.textSize = ph * 0.46; progText.color = Color.parseColor('#2E3A59');
  const tx = face.left + ph * 0.85;
  canvas.drawText(text, tx, cy + down + ph * 0.16, progText);
  if (timer) {
    const tx2 = tx + progText.measureText(text) + ph * 0.18;
    progText.textSize = ph * 0.33; progText.color = Color.parseColor('#6B7590');
    canvas.drawText(fitText(timer, progText, face.right - ph * 0.25 - tx2), tx2, cy + down + ph * 0.12, progText);
  }
  progText.textAlign = Align.CENTER; progText.color = Color.WHITE;
  buttons.push({ rect: face, action: () => { openCustomize(); custEnergy = true; progScroll = 0; } });
}

function drawTopBar(canvas) {
  const cy = insetTop + w * 0.1;
  // Pièces tout à gauche
  // Pièces et énergie empilées, de la hauteur des boutons (icône + étiquette), sans toucher « Classement »
  const pillH = w * 0.078, pillW = w * 0.25;
  drawCoinPill(canvas, w * 0.035, cy - w * 0.066 + pillH / 2, false, pillH, pillW);
  drawEnergyPill(canvas, w * 0.035, cy + w * 0.124 - pillH * 0.6, pillH, pillW);
  const r = w * 0.058;
  const entries = [['🏆', tr('hud.board'), () => openBoard(0)], ['🛍️', tr('hud.shop'), () => openCustomize()], ['🎯', tr('hud.progress'), () => openMissions()], ['⚙️', tr('hud.settings'), () => openSettings()]];
  entries.forEach(([icon, label, action], i) => {
    // Pièces à gauche, puis Classement, Boutique et Progression ; Réglages en haut à droite
    const cx = i === 3 ? w * 0.915 : w * 0.38 + i * w * 0.165, half = w * 0.066;
    const face = new RectF(cx - half, cy - half, cx + half, cy + half);
    drawGlassSquare(canvas, face);
    const down = isPressed(face) ? w * 0.009 : 0;
    progText.color = Color.WHITE; progText.textSize = w * 0.062;
    canvas.drawText(icon, cx, cy + w * 0.021 + down, progText);
    progText.textSize = w * 0.026;
    const lbl = fitText(label, progText, w * 0.14, 0.55), lw = progText.measureText(lbl) + w * 0.025;
    rect.set(cx - lw / 2, cy + half + w * 0.02, cx + lw / 2, cy + half + w * 0.058);
    progPaint.color = Color.argb(110, 0, 0, 0);
    canvas.drawRoundRect(rect, w * 0.019, w * 0.019, progPaint);
    canvas.drawText(lbl, cx, cy + half + w * 0.048, progText);
    if (i === 1 && canAffordSomething()) {
      progPaint.color = Color.parseColor('#E53950');
      const bx = cx + half * 0.95, by = cy - half * 0.95;
      canvas.drawCircle(bx, by, w * 0.024, progPaint);
      progText.textSize = w * 0.03;
      canvas.drawText('!', bx, by + w * 0.011, progText);
    }
    buttons.push({ rect: face, action });
  });
}

function drawGameOver(canvas) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  drawTopBar(canvas);
  const y0 = insetTop + (ub() - insetTop) * 0.3;
  if (gameOverReason) { textPaint.textSize = w * 0.045; canvas.drawText(fitText(gameOverReason, textPaint, w * 0.9), w / 2, y0 - w * 0.12, textPaint); }
  textPaint.textSize = w * 0.1;
  canvas.drawText(tr('over.title'), w / 2, y0, textPaint);
  const pop = clamp(gameOverTime / 0.35, 0, 1);
  textPaint.textSize = w * 0.24 * (1.4 - 0.4 * pop);
  textPaint.alpha = Math.round(255 * pop);
  canvas.drawText(String(score), w / 2, y0 + w * 0.27, textPaint);
  textPaint.alpha = 255;
  let y = y0 + w * 0.39;
  if (newBest) {
    progText.textSize = w * 0.045;
    const t = '🏆 ' + tr('over.new_record');
    const pw = progText.measureText(t) + w * 0.08;
    rect.set(w / 2 - pw / 2, y - w * 0.065, w / 2 + pw / 2, y + w * 0.025);
    progPaint.color = Color.parseColor('#FFC93C');
    canvas.drawRoundRect(rect, w * 0.045, w * 0.045, progPaint);
    progText.color = Color.parseColor('#2E3A59');
    canvas.drawText(t, w / 2, y, progText);
    progText.color = Color.WHITE;
  } else {
    textPaint.textSize = w * 0.05;
    canvas.drawText(tr('common.record', { n: best }), w / 2, y, textPaint);
  }
  y += w * 0.09;
  if (coinsThisRun > 0) {
    textPaint.textSize = w * 0.045;
    canvas.drawText(tr('over.coins', { n: coinsThisRun, total: profile.coins }), w / 2, y, textPaint);
    y += w * 0.08;
  }
  if (unlockedLabels.length) {
    textPaint.textSize = w * 0.042;
    canvas.drawText(fitText(tr('over.unlocked', { items: unlockedLabels.join(', ') }), textPaint, w * 0.92), w / 2, y, textPaint);
    y += w * 0.05;
  }
  drawPointsBar(canvas, y);
  if (gameOverTime > 0.6) {
    const pulse = 1 + 0.03 * Math.sin(gameOverTime * 5);
    const bw = w * 0.4 * pulse, bh = w * 0.085 * pulse, cy = ub() - w * 0.27;
    drawButton(canvas, new RectF(w / 2 - bw, cy - bh, w / 2 + bw, cy + bh), '▶ ' + tr('over.replay'), primaryBtnPaint, w * 0.075, () => replay());
  }
}

function drawPause(canvas) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const y0 = h * 0.3;
  textPaint.textSize = w * 0.12; canvas.drawText(tr('pause.title'), w / 2, y0, textPaint);
  textPaint.textSize = w * 0.045; canvas.drawText(tr('common.score', { n: score }), w / 2, y0 + w * 0.09, textPaint);
  const bh = w * 0.13, sh = w * 0.11;
  let y = y0 + w * 0.17;
  drawButton(canvas, new RectF(w * 0.2, y, w * 0.8, y + bh), tr('pause.resume'), primaryBtnPaint, w * 0.06, () => resumeGame());
  y += bh + w * 0.04;
  drawButton(canvas, new RectF(w * 0.2, y, w * 0.8, y + sh), '⚙️ ' + tr('hud.settings'), secondaryBtnPaint, w * 0.045, () => openSettings());
  y += sh + w * 0.03;
  drawButton(canvas, new RectF(w * 0.2, y, w * 0.8, y + sh), tr('pause.quit'), chipPaint, w * 0.045, () => endGame(tr('pause.quit_reason')));
}

function settingRow(canvas, l, r, y, label, value, toggle, action) {
  const rh = w * 0.12;
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.042;
  canvas.drawText(fitText(label, darkTextPaint, value === null && toggle === null ? r - l : (r - l) * 0.55), l, y + rh * 0.6, darkTextPaint);
  if (toggle !== null) {
    const tw = w * 0.12, th = w * 0.065;
    rect.set(r - tw, y + (rh - th) / 2, r, y + (rh + th) / 2);
    progPaint.color = toggle ? Color.parseColor('#FF7A45') : Color.parseColor('#C9CED8');
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

function drawSettings(canvas) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const left = w * 0.05, right = w * 0.95, ph = w * 1.42;
  const top = Math.max(insetTop, (insetTop + ub()) / 2 - ph / 2), bottom = top + ph;
  panel(canvas, left, top, right, bottom);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.065;
  canvas.drawText('⚙️ ' + tr('settings.title'), w / 2, top + w * 0.11, darkTextPaint);
  // 7 appuis sur le titre : menu de test caché (testmenu.js)
  if (TEST_MENU) buttons.push({ rect: new RectF(w * 0.25, top + w * 0.03, w * 0.75, top + w * 0.14), action: () => testTitleTap() });
  const l = left + w * 0.07, r = right - w * 0.07;
  let y = top + w * 0.16;
  settingRow(canvas, l, r, y, tr('settings.player'), (myName() || '—') + '  ✎', null, () => askPseudo(false));
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
  settingRow(canvas, l, r, y, '📺 ' + tr('settings.fake_ads_label'), null, profile.fakeAdsOn, () => { profile.fakeAdsOn = !profile.fakeAdsOn; });
  y += w * 0.12;
  const pref = profile.language;
  const langLabel = pref === LANG_AUTO ? tr('settings.language_auto', { v: I18n.nameOf(I18n.lang) }) : I18n.nameOf(pref);
  settingRow(canvas, l, r, y, '🌐 ' + tr('settings.language_label'), langLabel + '  ›', null, () => {
    openLangPicker();
  });
  y += w * 0.12;
  settingRow(canvas, l, r, y, 'ℹ️ ' + tr('settings.version', { v: 'Web ' + WEB_VERSION }), null, null, null);
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.16, w * 0.7, bottom - w * 0.05), 'OK', primaryBtnPaint, w * 0.05, () => { state = settingsReturnState; });
}
