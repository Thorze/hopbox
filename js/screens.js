'use strict';
// Écrans (équivalent de Screens.kt) : pseudo, classement, personnage, missions, pause, son, fin de partie.

// ---------- Pseudo (fenêtre HTML) ----------
let pseudoDialogShown = false;
function askPseudo(first, error = null) {
  if (pseudoDialogShown) return;
  pseudoDialogShown = true;
  const dlg = document.getElementById('pseudo-dialog');
  const input = document.getElementById('pseudo-input');
  document.getElementById('pseudo-title').textContent = first ? tr('pseudo.title_first') : tr('pseudo.title_change');
  document.getElementById('pseudo-msg').textContent = error || tr('pseudo.info');
  const cancel = document.getElementById('pseudo-cancel');
  const mustChoose = first || pseudoConflict;
  cancel.style.display = mustChoose ? 'none' : '';
  input.value = profile.pseudo || '';
  dlg.classList.add('open');
  setTimeout(() => input.focus(), 50);
  const close = () => { dlg.classList.remove('open'); pseudoDialogShown = false; input.blur(); };
  document.getElementById('pseudo-form').onsubmit = (e) => {
    e.preventDefault();
    const p = input.value.trim().slice(0, 16);
    close();
    if (!p) {
      if (!profile.pseudo) profile.pseudo = tr('pseudo.default') + (1000 + rndInt(9000));
      afterPseudo();
      return;
    }
    online.checkPseudo(p, profile.playerId).then((free) => {
      if (free === false) askPseudo(first, tr('pseudo.taken', { name: p }));
      else { profile.pseudo = p; pseudoConflict = false; afterPseudo(); }
    });
  };
  cancel.onclick = () => close();
}

function afterPseudo() {
  syncOnline();
  if (!profile.customized) openCustomize();
}

/** Envoie la meilleure partie en attente (et le pseudo) au serveur. */
function syncOnline() {
  const pseudo = profile.pseudo;
  if (syncing || !pseudo || !profile.needsSync()) return;
  syncing = true;
  const sc = profile.pendingScore;
  online.submit(profile.playerId, pseudo, sc, profile.pendingDuration, profile.pendingJumps).then((result) => {
    syncing = false;
    if (result === 'ok') {
      profile.clearPending(sc);
      profile.syncedPseudo = pseudo;
      if (state === State.LEADERBOARD && boardTab > 0) loadWorld();
      if (profile.needsSync() && (profile.pendingScore !== sc || profile.pseudo !== pseudo)) syncOnline();
    } else if (result === 'taken') {
      pseudoConflict = true;
      askPseudo(false, tr('pseudo.taken_sync', { name: pseudo }));
    } else if (result === 'rejected') {
      profile.clearPending(sc);
      profile.syncedPseudo = pseudo;
    }
  });
}

/** Nombre de joueurs affichés dans les classements en ligne. */
const BOARD_SIZE = 50;

function openBoard(tab) {
  if (state !== State.LEADERBOARD) boardReturnState = state;
  state = State.LEADERBOARD;
  boardTab = tab;
  boardScroll = 0;
  personalRuns = profile.topRuns();
  if (tab > 0) loadWorld();
}

function loadWorld() {
  worldStatus = 'loading';
  worldRank = null;
  const tab = boardTab;
  online.fetchBoard(BOARD_SIZE, profile.playerId, tab === 1 ? 'week' : 'all').then((board) => {
    if (boardTab !== tab) return;
    if (!board) worldStatus = 'error';
    else { worldEntries = board.top; worldRank = board.myRank; worldStatus = 'ok'; boardScrollToMe = true; }
  });
}

function openMissions() { if (state === State.MISSIONS) return; missionsReturnState = state; state = State.MISSIONS; }
function openSettings() { if (state === State.SETTINGS) return; settingsReturnState = state; langPicker = false; state = State.SETTINGS; }

function dragTo(x) {
  const r = dragSlider === 1 ? sfxSlider : dragSlider === 2 ? musicSlider : null;
  if (!r) return;
  const v = clamp((x - r.left) / r.width(), 0, 1);
  const snapped = v < 0.03 ? 0 : v;
  if (dragSlider === 1) sounds.soundVolume = snapped; else sounds.musicVolume = snapped;
}

// ---------- Boutons ----------
const isLight = (c) => Color.red(c) * 0.3 + Color.green(c) * 0.59 + Color.blue(c) * 0.11 > 170;

const reliefPaint = new Paint();
let pressedRect = null, pressedAt = 0;

/** Ce bouton vient-il d'être touché (il s'affiche enfoncé un court instant) ? */
function isPressed(r) {
  return !!pressedRect && Math.abs(pressedRect.centerX() - r.centerX()) < w * 0.03 && Math.abs(pressedRect.centerY() - r.centerY()) < w * 0.03;
}

function drawButton(canvas, r, label, bg, textSize, action) {
  const radius = r.height() / 2;
  buttons.push({ rect: new RectF(r.left, r.top, r.right, r.bottom), action });
  let face = r;
  if (Color.alpha(bg.color) === 255 && !bg.shader) {
    // Bouton en relief : une épaisseur plus foncée dessous, la face s'enfonce quand on appuie
    const depth = r.height() * 0.13, down = isPressed(r) ? depth * 0.75 : 0;
    reliefPaint.color = shade(bg.color, 0.68);
    rect.set(r.left, r.top + depth, r.right, r.bottom + depth); canvas.drawRoundRect(rect, radius, radius, reliefPaint);
    face = new RectF(r.left, r.top + down, r.right, r.bottom + down);
    canvas.drawRoundRect(face, radius, radius, bg);
    reliefPaint.color = Color.argb(45, 255, 255, 255);
    rect.set(r.left + radius * 0.4, face.top + r.height() * 0.08, r.right - radius * 0.4, face.top + r.height() * 0.45);
    canvas.drawRoundRect(rect, radius * 0.6, radius * 0.6, reliefPaint);
  } else canvas.drawRoundRect(r, radius, radius, bg);
  btnTextPaint.textSize = textSize;
  btnTextPaint.color = (bg === tabOffPaint || bg === lockedPaint || bg === shopPaint || (bg === itemPaint && isLight(bg.color)))
    ? Color.parseColor('#2E3A59') : Color.WHITE;
  canvas.drawText(fitText(label, btnTextPaint, face.width() - radius), face.centerX(), face.centerY() - (btnTextPaint.descent() + btnTextPaint.ascent()) / 2, btnTextPaint);
}

/** Bouton carré aux coins arrondis, façon verre dépoli, avec une épaisseur dessous. */
function drawGlassSquare(canvas, face) {
  const rad = face.width() * 0.26, depth = w * 0.012, down = isPressed(face) ? depth * 0.75 : 0;
  reliefPaint.color = Color.argb(150, 60, 66, 84);
  rect.set(face.left, face.top + depth, face.right, face.bottom + depth); canvas.drawRoundRect(rect, rad, rad, reliefPaint);
  reliefPaint.color = Color.argb(205, 232, 236, 244);
  rect.set(face.left, face.top + down, face.right, face.bottom + down); canvas.drawRoundRect(rect, rad, rad, reliefPaint);
  reliefPaint.color = Color.argb(70, 255, 255, 255);
  rect.set(face.left + rad * 0.3, face.top + down + face.height() * 0.06, face.right - rad * 0.3, face.top + down + face.height() * 0.42);
  canvas.drawRoundRect(rect, rad * 0.7, rad * 0.7, reliefPaint);
  progStroke.color = Color.argb(220, 255, 255, 255); progStroke.strokeWidth = w * 0.004;
  rect.set(face.left, face.top + down, face.right, face.bottom + down); canvas.drawRoundRect(rect, rad, rad, progStroke);
}

/** Réduit un peu la taille du texte s'il est trop long (langues aux mots longs), puis le coupe si besoin. */
function fitText(text, paint, maxWidth, minScale = 0.72) {
  const tw = paint.measureText(text);
  // Petite marge : avec les arrondis de la police, la taille exacte dépasse parfois d'un cheveu
  if (tw > maxWidth) paint.textSize *= Math.max(minScale, maxWidth / tw * 0.97);
  return ellipsize(text, paint, maxWidth);
}

function ellipsize(text, paint, maxWidth) {
  if (paint.measureText(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && paint.measureText(t + '…') > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

function panel(canvas, left, top, right, bottom) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  rect.set(left, top, right, bottom);
  canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
}

// ---------- Classement ----------
function drawLeaderboard(canvas) {
  const left = w * 0.06, right = w * 0.94, top = insetTop + h * 0.05, bottom = ub() - h * 0.03;
  panel(canvas, left, top, right, bottom);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.075;
  canvas.drawText(tr('board.title'), w / 2, top + w * 0.12, darkTextPaint);
  const tabTop = top + w * 0.17, tabH = w * 0.1;
  const tabs = [tr('board.tab_mine'), tr('board.tab_week'), tr('board.tab_world')];
  const tw = (right - left - w * 0.08) / tabs.length;
  tabs.forEach((label, i) => {
    const x0 = left + w * 0.04 + i * tw;
    drawButton(canvas, new RectF(x0 + w * 0.006, tabTop, x0 + tw - w * 0.006, tabTop + tabH), label,
      boardTab === i ? tabOnPaint : tabOffPaint, w * 0.04, () => openBoard(i));
  });
  const listTop = tabTop + tabH + w * 0.06, footer = bottom - w * 0.2, listBottom = footer - w * 0.06;
  const rowH = (footer - w * 0.08 - listTop) / profile.MAX_RUNS;
  // Liste défilable (classements en ligne : jusqu'à 50 joueurs)
  const count = boardTab === 0 ? personalRuns.length : worldStatus === 'ok' ? worldEntries.length : 0;
  boardListTop = listTop; boardListBottom = listBottom;
  boardMaxScroll = Math.max(0, count * rowH - (listBottom - listTop));
  if (boardScrollToMe) {
    boardScrollToMe = false;
    const me = worldEntries.findIndex((e) => e.me);
    if (me >= 0) boardScroll = (me + 0.5) * rowH - (listBottom - listTop) / 2;
  }
  boardScroll = clamp(boardScroll, 0, boardMaxScroll);
  darkTextPaint.textSize = Math.min(w * 0.048, rowH * 0.5);
  greyTextPaint.textSize = w * 0.045;
  const colRank = left + w * 0.06, colName = left + w * 0.17, colScore = right - w * 0.06;
  const centerY = (listTop + footer) / 2;
  const row = (i, name, value, mine) => {
    const y = listTop + rowH * i - boardScroll;
    if (y + rowH < listTop || y > listBottom) return;
    if (mine) { rect.set(left + w * 0.03, y, right - w * 0.03, y + rowH * 0.92); canvas.drawRoundRect(rect, rowH * 0.3, rowH * 0.3, highlightPaint); }
    const ty = y + rowH * 0.46 - (darkTextPaint.descent() + darkTextPaint.ascent()) / 2;
    darkTextPaint.textAlign = Align.LEFT;
    canvas.drawText(`${i + 1}.`, colRank, ty, darkTextPaint);
    canvas.drawText(ellipsize(name, darkTextPaint, colScore - colName - w * 0.15), colName, ty, darkTextPaint);
    darkTextPaint.textAlign = Align.RIGHT;
    canvas.drawText(value, colScore, ty, darkTextPaint);
  };
  if (boardTab === 0) {
    if (!personalRuns.length) canvas.drawText(tr('board.no_games'), w / 2, centerY, greyTextPaint);
    else personalRuns.forEach((r, i) => {
      const d = new Date(r.time);
      row(i, fmtDate(d), String(r.score), false);
    });
    greyTextPaint.textSize = w * 0.04;
    canvas.drawText(tr('common.record', { n: best }), w / 2, footer, greyTextPaint);
  } else {
    if (worldStatus === 'loading' || worldStatus === 'idle') canvas.drawText(tr('board.loading'), w / 2, centerY, greyTextPaint);
    else if (worldStatus === 'error') {
      canvas.drawText(tr('board.error'), w / 2, centerY, greyTextPaint);
      canvas.drawText(tr('board.check_connection'), w / 2, centerY + w * 0.07, greyTextPaint);
    } else {
      if (!worldEntries.length) canvas.drawText(tr('board.empty'), w / 2, centerY, greyTextPaint);
      canvas.save();
      canvas.clipRect(left, listTop, right, listBottom);
      worldEntries.forEach((e, i) => row(i, e.pseudo, String(e.best), e.me));
      canvas.restore();
      if (boardMaxScroll > 0) {
        const trackH = listBottom - listTop;
        const thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + boardMaxScroll));
        const ty0 = listTop + (trackH - thumbH) * (boardScroll / boardMaxScroll);
        rect.set(right - w * 0.025, ty0, right - w * 0.012, ty0 + thumbH);
        canvas.drawRoundRect(rect, w * 0.01, w * 0.01, lockedPaint);
      }
    }
    greyTextPaint.textSize = w * 0.04;
    const pseudo = profile.pseudo || '';
    const info = best <= 0 ? tr('board.play_first')
      : worldRank != null && boardTab === 1 ? tr('board.rank_week', { name: pseudo, rank: worldRank })
        : worldRank != null ? tr('board.rank_all', { name: pseudo, rank: worldRank, n: best })
          : boardTab === 1 ? tr('board.no_week') : tr('board.your_record', { n: best });
    canvas.drawText(ellipsize(info, greyTextPaint, right - left - w * 0.06), w / 2, footer, greyTextPaint);
  }
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.15, w * 0.7, bottom - w * 0.05), tr('common.back'), primaryBtnPaint, w * 0.045, () => { state = boardReturnState; });
}

// ---------- Barre Perfect ----------
function drawPerfectBar(canvas) {
  const a = clamp(perfectBarAlpha, 0, 1);
  const scale = 1 + 0.12 * perfectPulse;
  const cy = insetTop + h * 0.17 + w * 0.17;
  const bw = w * 0.62 * scale, bh = w * 0.085 * scale;
  canvas.save();
  canvas.translate(w / 2, cy);
  rect.set(-bw / 2, -bh / 2, bw / 2, bh / 2);
  perfectBgPaint.alpha = Math.floor(110 * a);
  canvas.drawRoundRect(rect, bh / 2, bh / 2, perfectBgPaint);
  const level = clamp((Math.max(shownStreak, 3) - 2) / 4, 0, 1);
  const fillW = (bw - bh * 0.3) * level;
  if (fillW > 0) {
    rect.set(-bw / 2 + bh * 0.15, -bh / 2 + bh * 0.15, -bw / 2 + bh * 0.15 + fillW, bh / 2 - bh * 0.15);
    perfectBarPaint.shader = new LinearGradient(rect.left, 0, Math.max(rect.right, rect.left + 1), 0, Color.parseColor('#FFD54F'), Color.parseColor('#FF7A45'));
    perfectBarPaint.alpha = Math.floor(255 * a);
    canvas.drawRoundRect(rect, bh * 0.35, bh * 0.35, perfectBarPaint);
  }
  const points = perfectStreak >= 3 ? Scoring.perfectPoints(perfectStreak) : lastPerfectPoints;
  textPaint.textSize = bh * 0.55; textPaint.alpha = Math.floor(255 * a);
  canvas.drawText(`${tr('hud.perfect')}  ×${shownStreak}   +${points}`, 0, -(textPaint.descent() + textPaint.ascent()) / 2, textPaint);
  textPaint.alpha = 255;
  canvas.restore();
}

// ---------- Son ----------
function drawSlider(canvas, r, label, value) {
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.05;
  canvas.drawText(label, r.left, r.top - w * 0.05, darkTextPaint);
  darkTextPaint.textAlign = Align.RIGHT;
  canvas.drawText(value <= 0 ? tr('settings.off') : Math.floor(value * 100) + ' %', r.right, r.top - w * 0.05, darkTextPaint);
  const bh = r.height();
  canvas.drawRoundRect(r, bh / 2, bh / 2, tabOffPaint);
  rect.set(r.left, r.top, r.left + r.width() * value, r.bottom);
  canvas.drawRoundRect(rect, bh / 2, bh / 2, primaryBtnPaint);
  const kx = r.left + r.width() * value;
  canvas.drawCircle(kx, r.centerY(), bh * 1.1, cursorPaint);
  cursorStroke.strokeWidth = w * 0.006;
  canvas.drawCircle(kx, r.centerY(), bh * 1.1, cursorStroke);
}

/** Date courte au format de la langue (clé « format.date » : dd/MM/yy, MM/dd/yy, dd.MM.yy…). */
function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return tr('format.date').replace('dd', p(d.getDate())).replace('MM', p(d.getMonth() + 1)).replace('yy', String(d.getFullYear()).slice(2));
}

// ---------- Personnage ----------
/** Progression : série de jours d'affilée, puis missions et défi du jour. */
function drawMissions(canvas) {
  const left = w * 0.04, right = w * 0.96, top = insetTop + w * 0.04, bottom = ub() - w * 0.04;
  panel(canvas, left, top, right, bottom);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.065;
  drawProgressTabs(canvas, top, 0);
  // --- Série de jours ---
  const today = DailyReward.today(), last = store.getInt('daily_last', -1);
  const streak = last === today || last === today - 1 ? store.getInt('daily_streak', 0) : 0, claimed = last === today;
  let y = top + w * 0.15;
  const sr = new RectF(left + w * 0.04, y, right - w * 0.04, y + w * 0.36);
  progPaint.shader = null; progPaint.color = Color.parseColor('#FFF3E0');
  canvas.drawRoundRect(sr, w * 0.03, w * 0.03, progPaint);
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.045;
  canvas.drawText(fitText('🔥 ' + tr('progress.streak', { n: streak }), darkTextPaint, sr.width() * 0.6), sr.left + w * 0.04, sr.top + w * 0.075, darkTextPaint);
  greyTextPaint.textAlign = Align.RIGHT; greyTextPaint.textSize = w * 0.032;
  canvas.drawText(tr('progress.best', { n: store.getInt('st_daily_best', 0) }), sr.right - w * 0.04, sr.top + w * 0.072, greyTextPaint);
  const gap = w * 0.015, tw = (sr.width() - w * 0.08 - gap * 6) / 7;
  for (let i = 0; i < 7; i++) {
    const n = i + 1, x0 = sr.left + w * 0.04 + i * (tw + gap);
    const r = new RectF(x0, sr.top + w * 0.11, x0 + tw, sr.top + w * 0.11 + tw * 1.25);
    progPaint.color = Color.parseColor(n <= Math.min(streak, 7) ? '#FFB74D' : '#EEE6DC');
    canvas.drawRoundRect(r, w * 0.02, w * 0.02, progPaint);
    darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.032;
    canvas.drawText(n === 7 ? '7+' : String(n), r.centerX(), r.top + tw * 0.42, darkTextPaint);
    darkTextPaint.textSize = w * 0.026;
    canvas.drawText('+' + DailyReward.reward(n), r.centerX(), r.top + tw * 0.95, darkTextPaint);
  }
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.032;
  canvas.drawText(claimed ? tr('daily.tomorrow', { n: DailyReward.reward(streak + 1) }) : tr('progress.today'), sr.centerX(), sr.bottom - w * 0.035, greyTextPaint);
  y = sr.bottom + w * 0.04;
  // --- Missions du jour ---
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.045;
  canvas.drawText('📋 ' + tr('missions.title'), left + w * 0.05, y + w * 0.045, darkTextPaint);
  y += w * 0.08;
  const list = missions.list(), footer = w * 0.27;
  const cardH = clamp((bottom - footer - y - w * 0.07) / list.length - w * 0.02, w * 0.13, w * 0.18);
  list.forEach((m, i) => {
    if (m.challenge) {
      darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.04;
      canvas.drawText(tr('missions.challenge'), left + w * 0.05, y + w * 0.045, darkTextPaint);
      y += w * 0.07;
    }
    const done = missions.isDone(i), pr = missions.progress(i);
    rect.set(left + w * 0.04, y, right - w * 0.04, y + cardH);
    canvas.drawRoundRect(rect, w * 0.03, w * 0.03, done ? highlightPaint : tabOffPaint);
    darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.038;
    canvas.drawText(fitText((done ? '✅ ' : '') + m.label, darkTextPaint, right - left - w * 0.3), left + w * 0.08, y + cardH * 0.4, darkTextPaint);
    darkTextPaint.textAlign = Align.RIGHT;
    canvas.drawText(`+${m.reward} 🪙`, right - w * 0.08, y + cardH * 0.4, darkTextPaint);
    const bl = left + w * 0.08, br = right - w * 0.2, by = y + cardH * 0.6, bh = cardH * 0.17;
    rect.set(bl, by, br, by + bh); canvas.drawRoundRect(rect, bh / 2, bh / 2, lockedPaint);
    const f = clamp(pr / m.target, 0, 1);
    if (f > 0) { rect.set(bl, by, bl + (br - bl) * f, by + bh); canvas.drawRoundRect(rect, bh / 2, bh / 2, done ? greenZonePaint : primaryBtnPaint); }
    greyTextPaint.textAlign = Align.RIGHT; greyTextPaint.textSize = w * 0.03;
    canvas.drawText(`${pr} / ${m.target}`, right - w * 0.08, by + bh, greyTextPaint);
    y += cardH + w * 0.02;
  });
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.035;
  canvas.drawText(missions.allMissionsDone() ? tr('missions.all_done') : tr('missions.all_bonus', { n: missions.ALL_DONE_REWARD }), w / 2, bottom - w * 0.18, greyTextPaint);
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.14, w * 0.7, bottom - w * 0.04), 'OK', primaryBtnPaint, w * 0.05, () => { state = missionsReturnState; });
}

/** Onglets en haut de l'écran Progression : « Progression » (série + missions) et « Stats ». */
function drawProgressTabs(canvas, top, active) {
  const labels = ['🎯 ' + tr('progress.title'), '📊 ' + tr('hud.stats')], tw = w * 0.4, th = w * 0.095, y0 = top + w * 0.035;
  for (let i = 0; i < 2; i++) {
    const x0 = w / 2 - tw - w * 0.01 + i * (tw + w * 0.02), r = new RectF(x0, y0, x0 + tw, y0 + th);
    canvas.drawRoundRect(r, th / 2, th / 2, i === active ? primaryBtnPaint : tabOffPaint);
    const tp = i === active ? btnTextPaint : darkTextPaint;
    tp.textAlign = Align.CENTER; tp.textSize = w * 0.042;
    canvas.drawText(fitText(labels[i], tp, tw - w * 0.04), r.centerX(), r.centerY() - (tp.descent() + tp.ascent()) / 2, tp);
    if (i !== active) buttons.push({ rect: r, action: () => {
      if (i === 1) { statsReturnState = missionsReturnState; statsScroll = 0; statsVel = 0; state = State.STATS; } else { missionsReturnState = statsReturnState; state = State.MISSIONS; }
    } });
  }
}
