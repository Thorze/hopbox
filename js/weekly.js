'use strict';
// Map de la semaine (équivalent de WeeklyUi.kt, plan dans map_semaine.md) : la même map pour tout le monde du lundi
// au dimanche (heure de Paris), 10 essais gratuits par jour, un classement à part et des pièces pour tous les
// participants à la fin de la semaine. La partie est une partie de duel (duel.js) en mode « semaine » : ni bonus,
// ni imprévu, ni seconde chance, de plus en plus dure. En décembre (thème « noel »), les blocs sont des cadeaux.

const weekly = Object.assign(new ScrollList(true, true), {
  info: null, status: '', busy: false, loadedAt: 0, returnState: null, openT: 0, msg: '', msgT: 0,
  lastScore: 0, lastTime: 0, lastBest: 0, lastStatus: '', claiming: false, autoOpened: false,
});
const weeklyText = new Paint({ bold: true }), weeklyBar = new Paint();

/** Thème de Noël cette semaine : blocs cadeaux et titre « La route des cadeaux ». */
function weeklyNoel() { return !!weekly.info && weekly.info.theme === 'noel'; }

/** Pastille du menu ☰ : pièces à récupérer, ou nouvelle semaine pas encore ouverte. */
function weeklyBadge() {
  const i = weekly.info;
  return !!i && (!!i.reward || store.get('weekly_seen') !== i.week);
}

function weeklyTitle(noel) { return noel ? '🎁 ' + tr('weekly.title_noel') : '🏆 ' + tr('weekly.title'); }

function fmtWeekLeft(sec) {
  if (sec >= 86400) return tr('weekly.left_d', { d: Math.floor(sec / 86400), h: Math.floor(sec % 86400 / 3600) });
  if (sec >= 3600) return tr('weekly.left_h', { h: Math.floor(sec / 3600), m: Math.floor(sec % 3600 / 60) });
  return tr('weekly.left_m', { m: Math.max(1, Math.floor(sec / 60)) });
}

/** Relit la map de la semaine (au plus toutes les 10 minutes, sauf force). */
function refreshWeekly(force = false) {
  const now = Date.now();
  if (weekly.busy || (!force && now - weekly.loadedAt < 600000)) return;
  weekly.busy = true; weekly.loadedAt = now;
  if (!weekly.info) weekly.status = 'loading';
  online.weekly().then(({ code, json }) => {
    weekly.busy = false;
    if (code === 200) { weekly.info = json; weekly.status = 'ok'; }
    else if (!weekly.info) weekly.status = code === 0 ? 'offline' : 'error';
  });
}

/**
 * À l'accueil : garde la map de la semaine à jour et, s'il y a des pièces d'une semaine terminée à récupérer,
 * ouvre la fenêtre une fois (mêmes conditions que la fenêtre des fêtes, après elle).
 */
function checkWeekly() {
  if (state !== State.READY || jumps !== 0 || score !== 0 || time < 1.5 || quest.active || duel.active || menu.open) return;
  if (tuto.active || pseudoDialogShown || Stats.get('games') < 1) return;
  refreshWeekly();
  if (!weekly.autoOpened && weekly.info && weekly.info.reward) { weekly.autoOpened = true; openWeekly(); }
}

function openWeekly() {
  if (state === State.WEEKLY) return;
  weekly.returnState = state === State.GAME_OVER ? State.GAME_OVER : State.READY;
  weekly.reset(); weekly.openT = time; weekly.msgT = 0;
  refreshWeekly(true);
  if (weekly.info) store.set('weekly_seen', weekly.info.week);
  Telemetry.track('weekly', { what: 'open' });
  state = State.WEEKLY;
}

function closeWeekly() {
  if (weekly.info) store.set('weekly_seen', weekly.info.week);
  state = weekly.returnState;
}

function weeklyToast(text) { weekly.msg = text; weekly.msgT = 2.6; }

/** Lance un essai : le serveur le compte (10 par jour) et donne le numéro de la map. */
function playWeekly() {
  const i = weekly.info;
  if (i && i.triesLeft <= 0) { weeklyToast(tr('weekly.no_tries')); return; }
  online.weeklyStart(myLookCode()).then(({ code, json }) => {
    if (code === 200) {
      weekly.info = json;
      Telemetry.track('weekly', { what: 'try' });
      duel.weekly = true; duel.theme = json.theme;
      startDuelRun(json.seed, 0, null);
      return;
    }
    weeklyToast(tr(code === 0 ? 'weekly.offline' : json && json.error === "plus d'essais" ? 'weekly.no_tries' : 'weekly.error'));
    refreshWeekly(true);
  });
}

/** Pièces d'une semaine terminée : versées par le serveur une seule fois, puis ajoutées au porte-monnaie. */
function claimWeekly(rw) {
  if (weekly.claiming) return;
  weekly.claiming = true;
  online.weeklyClaim(rw.week).then(({ code, json }) => {
    weekly.claiming = false;
    if (code === 200) {
      weekly.info = json;
      const got = json.claimed || rw;
      profile.coins = profile.coins + got.coins;
      banners.push({ text: `+${got.coins} 🪙`, life: 2.4 });
      // Objets de Noël (traînée de cadeaux, blocs cadeaux) : jamais redonnés s'ils sont déjà gagnés
      for (const key of got.items || []) {
        const item = Fest.item(key);
        if (!item || profile.available(item)) continue;
        profile.grant(item);
        banners.push({ text: tr('fest.banner.item', { name: item.label }), life: 3.2 });
      }
      sounds.play('COIN');
      Telemetry.track('weekly', { what: 'claim', n: got.rank, coins: got.coins });
    } else { weeklyToast(tr('weekly.error')); refreshWeekly(true); }
  });
}

// ---------- Partie ----------

function weeklyHudLine() {
  const i = weekly.info;
  if (!i) return '';
  return tr('weekly.hud', { best: Math.max(i.best, score), t: clamp(i.triesMax - i.triesLeft, 1, i.triesMax), m: i.triesMax });
}

/** Fin d'un essai : envoyé au serveur, l'écran de fin montre le score, le meilleur de la semaine et la place. */
function endWeeklyRun(reason) {
  state = State.DUEL_END;
  gameOverTime = 0;
  gameOverReason = reason;
  if (duel.goAt && !duel.stopAt) duel.stopAt = performance.now();
  weekly.lastScore = score; weekly.lastTime = duelClock(); weekly.lastBest = weekly.info ? weekly.info.best : 0;
  weekly.lastStatus = 'sending';
  Telemetry.track('weekly', { what: 'done', score });
  sounds.playGameOver(() => {});
  online.weeklyScore(score, weekly.lastTime, jumps).then(({ code, json }) => {
    if (code === 200) { weekly.info = json; weekly.lastStatus = 'ok'; } else weekly.lastStatus = 'error';
  });
}

function leaveWeeklyRun(toWindow) {
  stopDuelRun();
  resetGame();
  if (toWindow) { state = State.READY; openWeekly(); }
}

function drawWeeklyEnd(canvas) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const i = weekly.info, ok = weekly.lastStatus === 'ok' && !!i;
  const record = ok && weekly.lastScore > weekly.lastBest && weekly.lastScore > 0;
  const canRetry = ok && i.triesLeft > 0;
  const bh = w * 0.13, sh = w * 0.115, left = w * 0.08, right = w * 0.92;
  const ph = w * (0.99 + (record ? 0.14 : 0)) + (canRetry ? bh + w * 0.04 : 0);
  const top = Math.max(insetTop + w * 0.04, (insetTop + ub()) / 2 - ph / 2), cx = w / 2;
  drawPanel(canvas, new RectF(left, top, right, top + ph), weeklyTitle(duel.theme === 'noel'));
  greyTextPaint.textAlign = Align.CENTER;
  if (gameOverReason) { greyTextPaint.textSize = w * 0.036; canvas.drawText(fitText(gameOverReason, greyTextPaint, right - left - w * 0.1), cx, top + w * 0.2, greyTextPaint); }
  const pop = clamp(gameOverTime / 0.35, 0, 1), st = String(weekly.lastScore);
  drawGoldNumber(canvas, st, cx, top + w * 0.415, w * 0.19 * (1.4 - 0.4 * pop) * Math.min(1, 3.2 / Math.max(3.2, st.length)), pop);
  weeklyText.style = Style.FILL; weeklyText.shader = null; weeklyText.textAlign = Align.CENTER; weeklyText.textSize = w * 0.044; weeklyText.color = UI.BLUE;
  const cs = Math.floor(Math.max(0, weekly.lastTime) * 100);
  canvas.drawText(`⏱ ${Math.floor(cs / 6000)}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`, cx, top + w * 0.5, weeklyText);
  const line = weekly.lastStatus === 'sending' ? tr('weekly.sending') : !ok ? tr('weekly.send_error')
    : i.rank != null ? tr('weekly.end_rank', { best: i.best, rank: i.rank, n: i.players }) : tr('weekly.end_best', { best: i.best });
  drawInfoPill(canvas, cx, top + w * 0.59, line, w * 0.034, right - left - w * 0.06, weekly.lastStatus === 'error' ? UI.RED : UI.SOFT);
  let y = top + w * 0.67;
  if (record) {
    drawTitleRibbon(canvas, cx, y + w * 0.055, tr('weekly.new_best'), Color.parseColor('#F5A623'), w * 0.06, w * 0.5);
    y += w * 0.14;
  }
  let by = y + w * 0.01;
  if (canRetry) {
    drawButton(canvas, new RectF(left + w * 0.07, by, right - w * 0.07, by + bh), '↻ ' + tr('weekly.retry', { n: i.triesLeft }), primaryBtnPaint, w * 0.055, () => {
      stopDuelRun(); resetGame(); playWeekly();
    });
    by += bh + w * 0.04;
  }
  drawButton(canvas, new RectF(left + w * 0.07, by, right - w * 0.07, by + sh), '🏆 ' + tr('weekly.board'), backBtnPaint, w * 0.05, () => leaveWeeklyRun(true));
  by += sh + w * 0.035;
  drawButton(canvas, new RectF(left + w * 0.07, by, right - w * 0.07, by + sh), tr('duel.home'), greyBtnPaint, w * 0.05, () => leaveWeeklyRun(false));
}

// ---------- Fenêtre ----------

function drawWeekly(canvas) {
  if (weekly.msgT > 0) weekly.msgT -= 1 / 60;
  const t = weeklyText;
  t.style = Style.FILL; t.shader = null;
  const left = w * 0.04, right = w * 0.96, top = insetTop + w * 0.04, bottom = ub() - w * 0.04;
  const q = clamp((time - weekly.openT) / 0.3, 0, 1), sc = 0.9 + 0.1 * (1 - (1 - q) * (1 - q));
  canvas.drawRect(0, 0, w, h, overlayPaint);
  canvas.save(); canvas.scale(sc, sc, w / 2, (top + bottom) / 2);
  const i = weekly.info;
  drawPanel(canvas, new RectF(left, top, right, bottom), weeklyTitle(weeklyNoel()));
  const inL = left + w * 0.045, inR = right - w * 0.045, btnTop = bottom - w * 0.17;
  weekly.top = top + panelHeaderH() + w * 0.01; weekly.bottom = btnTop - w * 0.02;
  const items = [];
  if (!i) {
    greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.04;
    const msg = tr(weekly.status === 'loading' || weekly.status === '' ? 'weekly.loading' : 'weekly.offline');
    let y = (weekly.top + weekly.bottom) / 2;
    for (const ln of wrapText(msg, greyTextPaint, inR - inL)) { canvas.drawText(ln, w / 2, y, greyTextPaint); y += w * 0.055; }
  } else {
    const scroll = weekly.scroll;
    const hit = (l, tt, r, b, action) => {
      const a = Math.max(tt - scroll, weekly.top), z = Math.min(b - scroll, weekly.bottom);
      if (z > a) items.push({ rect: new RectF(l, a, r, z), action });
    };
    canvas.save();
    canvas.clipRect(left, weekly.top, right, weekly.bottom);
    canvas.translate(0, -scroll);
    const sTop = weekly.top;
    let y = sTop + w * 0.015;
    // Pièces d'une semaine terminée
    const rw = i.reward;
    if (rw) {
      const rh = w * 0.3;
      drawCard(canvas, inL, y, inR, y + rh, 'gold', w * 0.035);
      t.textAlign = Align.LEFT; t.color = UI.GOLD; t.textSize = w * 0.036;
      canvas.drawText(fitText(tr('weekly.reward_title'), t, inR - inL - w * 0.08), inL + w * 0.04, y + w * 0.07, t);
      t.color = Color.WHITE; t.textSize = w * 0.044;
      canvas.drawText(fitText(tr('weekly.reward_rank', { rank: rw.rank, n: rw.players }), t, inR - inL - w * 0.08), inL + w * 0.04, y + w * 0.135, t);
      const br = new RectF(inL + w * 0.04, y + w * 0.17, inR - w * 0.04, y + w * 0.265);
      drawButton(canvas, br, weekly.claiming ? '…' : tr('weekly.claim', { c: rw.coins }) + ' 🪙', primaryBtnPaint, w * 0.045, () => {});
      buttons.pop();
      hit(br.left, br.top, br.right, br.bottom, () => claimWeekly(rw));
      y += rh + w * 0.03;
    }
    // Règles et fin de la semaine
    greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = w * 0.034;
    for (const ln of wrapText(tr(weeklyNoel() ? 'weekly.intro_noel' : 'weekly.intro'), greyTextPaint, inR - inL)) {
      canvas.drawText(ln, inL, y + w * 0.04, greyTextPaint); y += w * 0.046;
    }
    const greyColor = greyTextPaint.color;
    greyTextPaint.color = UI.GOLD;
    canvas.drawText(fitText(tr('weekly.ends', { t: fmtWeekLeft(i.endsIn) }), greyTextPaint, inR - inL), inL, y + w * 0.045, greyTextPaint);
    y += w * 0.075;
    // Noël : les objets à gagner
    if (weeklyNoel()) {
      greyTextPaint.color = Color.argb(235, 255, 220, 160);
      for (const ln of wrapText('🎁 ' + tr('weekly.noel_items'), greyTextPaint, inR - inL)) { canvas.drawText(ln, inL, y + w * 0.03, greyTextPaint); y += w * 0.046; }
      y += w * 0.02;
    }
    greyTextPaint.color = greyColor;
    // Moi : meilleur score et place
    const mh = w * 0.17;
    drawCard(canvas, inL, y, inR, y + mh, 'deep', w * 0.03);
    const third = (inR - inL) / 3;
    const cells = [
      [tr('weekly.my_best'), i.best > 0 ? String(i.best) : '—'],
      [tr('weekly.my_rank'), i.rank != null ? `${i.rank} / ${i.players}` : '—'],
      [tr('weekly.tries'), `${i.triesLeft} / ${i.triesMax}`],
    ];
    cells.forEach(([label, value], k2) => {
      const cx = inL + third * (k2 + 0.5);
      t.textAlign = Align.CENTER; t.color = Color.argb(200, 200, 215, 255); t.textSize = w * 0.028;
      canvas.drawText(fitText(label, t, third - w * 0.02), cx, y + mh * 0.36, t);
      t.color = k2 === 2 && i.triesLeft === 0 ? UI.RED : Color.WHITE; t.textSize = w * 0.05;
      canvas.drawText(fitText(value, t, third - w * 0.02), cx, y + mh * 0.78, t);
    });
    y += mh + w * 0.04;
    // Classement de la semaine
    t.textAlign = Align.LEFT; t.color = Color.WHITE; t.textSize = w * 0.042;
    canvas.drawText(tr('weekly.board'), inL, y + w * 0.04, t);
    y += w * 0.065;
    if (!i.top.length) {
      greyTextPaint.textSize = w * 0.034;
      canvas.drawText(fitText(tr('weekly.empty'), greyTextPaint, inR - inL), inL, y + w * 0.05, greyTextPaint);
      y += w * 0.09;
    }
    const rh = w * 0.105;
    const row = (rank, name, best, kind, gold) => {
      drawCard(canvas, inL, y, inR, y + rh - w * 0.015, kind, w * 0.025);
      const mid = y + (rh - w * 0.015) / 2 + w * 0.014;
      t.textSize = w * 0.04; t.textAlign = Align.LEFT;
      t.color = gold ? UI.GOLD : Color.argb(220, 200, 215, 255);
      canvas.drawText(rank, inL + w * 0.03, mid, t);
      t.color = Color.WHITE;
      canvas.drawText(fitText(name, t, inR - inL - w * 0.35), inL + w * 0.13, mid, t);
      t.textAlign = Align.RIGHT;
      canvas.drawText(String(best), inR - w * 0.035, mid, t);
    };
    i.top.forEach((r, k2) => {
      if (y + rh - scroll > weekly.top && y - scroll < weekly.bottom) {
        row(k2 === 0 ? '🥇' : k2 === 1 ? '🥈' : k2 === 2 ? '🥉' : `${k2 + 1}.`, r.pseudo, r.best, r.me ? 'warm' : k2 === 0 ? 'gold' : '', k2 < 3);
      }
      y += rh;
    });
    // Moi, plus bas que les premiers affichés
    if (i.rank != null && !i.top.some((r) => r.me)) { row(`${i.rank}.`, myName() || tr('weekly.me'), i.best, 'warm', false); y += rh; }
    greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.03;
    for (const ln of wrapText(tr('weekly.coins_rule'), greyTextPaint, inR - inL)) {
      canvas.drawText(ln, (inL + inR) / 2, y + w * 0.045, greyTextPaint); y += w * 0.042;
    }
    y += w * 0.04;
    canvas.restore();
    weekly.content(weekly.top, weekly.bottom, y - sTop);
    weekly.drawBar(canvas, weeklyBar, right - w * 0.015);
  }
  canvas.restore();
  if (weekly.msgT > 0 && weekly.msg) {
    textPaint.textSize = w * 0.04; textPaint.alpha = clamp(Math.round(255 * weekly.msgT / 0.4), 0, 255);
    canvas.drawText(fitText(weekly.msg, textPaint, w * 0.86), w / 2, btnTop - w * 0.03, textPaint);
    textPaint.alpha = 255;
  }
  buttons.push(...items);
  const gap = w * 0.03, mid = w / 2, canPlay = !!i && i.triesLeft > 0;
  drawButton(canvas, new RectF(inL, btnTop, mid - gap / 2, bottom - w * 0.045), tr('weekly.close'), greyBtnPaint, w * 0.045, () => closeWeekly());
  drawButton(canvas, new RectF(mid + gap / 2, btnTop, inR, bottom - w * 0.045),
    !i ? tr('weekly.retry_load') : canPlay ? '▶ ' + tr('weekly.play') : tr('weekly.tomorrow'),
    canPlay || !i ? primaryBtnPaint : greyBtnPaint, w * 0.05, () => {
      if (!i) refreshWeekly(true); else if (canPlay) playWeekly(); else weeklyToast(tr('weekly.no_tries'));
    });
}
