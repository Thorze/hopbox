'use strict';
// Écran « Duels » (équivalent de DuelUi.kt) : ton code ami, défis reçus, duels en cours et terminés, amis.
// Pas de notification : les défis sont relevés à l'ouverture de l'accueil et de cet écran (au plus toutes les 60 s),
// avec une pastille rouge sur ☰. Mises : le défieur paie à l'envoi, l'ami en acceptant ; remboursement en cas de
// refus ou d'expiration ; le gagnant reçoit 2 × la mise, chacun récupère la sienne en cas d'égalité. Le crédit
// est fait une seule fois (duels payés mémorisés dans duel_paid_<id>).

const DUEL_ATTEMPT_CHOICES = [1, 3, 5, 0], DUEL_HOUR_CHOICES = [1, 24, 72], DUEL_STAKE_CHOICES = [0, 10, 25, 50, 100];
const duels = {
  list: [], friends: [], loadedAt: 0, busy: false, status: 'idle', tab: 0, returnState: null,
  challenge: null, msg: '', msgT: -10, scroll: 0, maxScroll: 0, listTop: 0, listBottom: 0,
  dragY: -1, downX: 0, dragStart: 0, moved: false, last: null,
};
const duelPaint = new Paint(), duelText = new Paint({ bold: true });

// ---------- Données ----------

/** Relève défis, duels et amis (au plus toutes les 60 s, sauf force). */
function refreshDuels(force = false) {
  const now = Date.now();
  if (duels.busy || (!force && now - duels.loadedAt < 60000)) return;
  duels.busy = true; duels.loadedAt = now;
  if (!duels.list.length) duels.status = 'loading';
  Promise.all([online.duels(), online.friends()]).then(([list, friends]) => {
    duels.busy = false;
    if (!list || !friends) { duels.status = 'error'; return; }
    duels.list = list; duels.friends = friends; duels.status = 'ok';
    settleDuels();
    if (state === State.DUELS && duels.tab === 0) markDuelsSeen();
  });
}

/** Crédite une seule fois les mises des duels terminés, refusés ou expirés. */
function settleDuels() {
  for (const d of duels.list) {
    const key = 'duel_paid_' + d.id;
    if (!store.getBool(key, false)) continue;
    const name = d.opponent.pseudo || d.opponent.code;
    let gain = 0, text;
    if (d.status === 'declined' || d.status === 'expired') { gain = d.stake; text = tr('duel.settled_refund', { name }); }
    else if (d.status === 'finished') {
      gain = d.result === 'win' ? d.stake * 2 : d.result === 'draw' ? d.stake : 0;
      text = d.result === 'win' ? tr('duel.settled_win', { name, n: gain }) : d.result === 'draw' ? tr('duel.settled_draw', { name }) : tr('duel.settled_loss', { name });
    } else continue;
    store.del(key);
    if (gain > 0) { profile.coins = profile.coins + gain; sounds.play('COIN'); }
    banners.push({ text, life: 3 });
  }
}

/** Résultats vus (seuls les duels encore renvoyés par le serveur sont gardés en mémoire). */
function markDuelsSeen() {
  if (duels.status !== 'ok') return;
  const ids = new Set();
  for (const d of duels.list) if (d.status !== 'pending' && d.status !== 'active') ids.add(String(d.id));
  store.setSet('duels_seen', ids);
}

/** Défis reçus en attente + résultats pas encore vus. */
function duelsBadge() {
  const seen = store.getSet('duels_seen');
  return duels.list.filter((d) => (d.status === 'pending' && !d.sent) ||
    ((d.status === 'finished' || d.status === 'declined' || d.status === 'expired') && !seen.has(String(d.id)))).length;
}

function duelName(d) { return d.opponent.pseudo || d.opponent.code || '?'; }
function myCode() { return (online.account && online.account.code) || store.get('friend_code') || '······'; }
function duelToast(text) { duels.msg = text; duels.msgT = time; }

function fmtLeft(sec) {
  if (sec >= 86400) return tr('duel.time_d', { n: Math.floor(sec / 86400) }) + ' ' + tr('duel.time_h', { n: Math.floor(sec % 86400 / 3600) });
  if (sec >= 3600) return tr('duel.time_h', { n: Math.floor(sec / 3600) });
  return tr('duel.time_m', { n: Math.max(1, Math.ceil(sec / 60)) });
}
function attemptsLabel(a) { return a === 0 ? tr('duel.att_inf') : a === 1 ? tr('duel.att_1') : tr('duel.att_n', { n: a }); }
function hoursLabel(h) { return tr('duel.hours_' + h); }
function triesLine(t, a) { return a === 0 ? tr('duel.tries_inf', { t }) : tr('duel.tries', { t, a }); }

// ---------- Ouverture ----------

function openDuels(tab = 0) {
  if (state !== State.DUELS) duels.returnState = state === State.DUEL_END ? State.READY : state;
  state = State.DUELS; duels.tab = tab; duels.scroll = 0; duels.challenge = null;
  refreshDuels(true);
  if (tab === 0) markDuelsSeen();
}
function closeDuels() { duels.challenge = null; state = duels.returnState || State.READY; }

// ---------- Fenêtre de saisie (code ami, numéro de map, confirmation) ----------
let textDialogShown = false;
/** o : {title, msg, value, max, code, numeric, input (false = simple confirmation), ok, danger} */
function askText(o, onOk) {
  if (textDialogShown) return;
  textDialogShown = true;
  const $ = (id) => document.getElementById(id);
  const dlg = $('text-dialog'), input = $('text-input'), ok = $('text-ok');
  $('text-title').textContent = o.title;
  $('text-msg').textContent = o.msg || '';
  input.style.display = o.input === false ? 'none' : '';
  input.value = o.value || ''; input.maxLength = o.max || 16;
  input.inputMode = o.numeric ? 'numeric' : 'text';
  input.className = o.code ? 'code' : '';
  ok.textContent = o.ok || 'OK'; ok.className = o.danger ? 'danger' : '';
  dlg.classList.add('open');
  if (o.input !== false) setTimeout(() => input.focus(), 50);
  const close = () => { dlg.classList.remove('open'); textDialogShown = false; input.blur(); };
  $('text-form').onsubmit = (e) => { e.preventDefault(); const v = input.value.trim(); close(); onOk(v); };
  $('text-cancel').onclick = () => close();
}

// ---------- Actions ----------

function copyCode() {
  const code = myCode();
  try { navigator.clipboard.writeText(code).then(() => duelToast(tr('friends.copied')), () => duelToast(code)); } catch (e) { duelToast(code); }
}
function shareCode() {
  const text = tr('friends.share_text', { code: myCode() });
  if (navigator.share) navigator.share({ text }).catch(() => {}); else copyCode();
}

function askAddFriend() {
  askText({ title: tr('friends.add'), msg: tr('friends.add_info'), max: 6, code: true }, (v) => {
    if (!v) return;
    online.addFriend(v.toUpperCase()).then((r) => {
      if (r.ok) { duelToast(tr('friends.added', { name: r.pseudo || v.toUpperCase() })); duels.tab = 1; refreshDuels(true); }
      else duelToast(tr(r.error === 'offline' ? 'duel.error' : 'friends.err_' + r.error));
    });
  });
}

function askRemoveFriend(f) {
  const name = f.pseudo || f.code;
  askText({ title: tr('friends.remove'), msg: tr('friends.remove_confirm', { name }), input: false, ok: tr('friends.remove'), danger: true }, () => {
    online.removeFriend(f.code).then((ok) => { if (ok) refreshDuels(true); else duelToast(tr('duel.error')); });
  });
}

function sendChallenge() {
  const c = duels.challenge;
  if (!c) return;
  if (profile.coins < c.stake) { duelToast(tr('duel.not_enough')); return; }
  duels.challenge = null;
  online.challenge(c.friend.code, c.attempts, c.hours, c.stake).then(({ code, json }) => {
    if (code !== 200) { duelToast(tr('duel.error')); return; }
    if (c.stake > 0) { profile.coins = profile.coins - c.stake; store.setBool('duel_paid_' + json.id, true); }
    duelToast(tr('duel.sent', { name: c.friend.pseudo || c.friend.code }));
    duels.tab = 0; duels.scroll = 0; refreshDuels(true);
  });
}

function answerDuel(d, accept) {
  if (accept && profile.coins < d.stake) { duelToast(tr('duel.not_enough')); return; }
  online.answer(d.id, accept).then(({ code }) => {
    if (code !== 200) { duelToast(tr(code === 409 ? 'duel.over' : 'duel.error')); refreshDuels(true); return; }
    if (accept && d.stake > 0) { profile.coins = profile.coins - d.stake; store.setBool('duel_paid_' + d.id, true); }
    refreshDuels(true);
  });
}

/** Commence un essai (compté par le serveur), puis la partie sur la map du duel. */
function playDuel(d) {
  online.startTry(d.id).then(({ code, json }) => {
    if (code === 200) { duels.challenge = null; startDuelRun(json.seed, json.id, json); return; }
    duelToast(code === 0 ? tr('duel.error') : json && json.error === "plus d'essais" ? tr('duel.no_tries') : tr('duel.over'));
    refreshDuels(true);
  });
}

// ---------- Fin d'un essai ----------

function endDuelRun(reason) {
  state = State.DUEL_END;
  gameOverTime = 0;
  gameOverReason = reason;
  const last = { id: duel.id, score, coins: coinsThisRun, info: duel.info, status: 'sending' };
  duels.last = last;
  sounds.playGameOver(() => {});
  online.sendTry(duel.id, score, runTime, jumps).then(({ code, json }) => {
    if (code === 200) { last.info = json; last.status = 'ok'; refreshDuels(true); } else last.status = 'error';
  });
}

function retryDuel() {
  const last = duels.last;
  if (last) playDuel(last.info || { id: last.id });
}

function leaveDuelRun(toDuels) {
  stopDuelRun();
  resetGame();
  if (toDuels) { duels.returnState = State.READY; openDuels(0); }
}

function duelHudLine() {
  const i = duel.info;
  const line = i ? tr('duel.vs', { a: Math.max(i.myBest, score), name: duelName(i), b: i.theirBest }) : '';
  return line + `   🪙 +${coinsThisRun}`;
}

function drawDuelEnd(canvas) {
  const last = duels.last;
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const left = w * 0.08, right = w * 0.92, ph = w * 1.12;
  const top = Math.max(insetTop + w * 0.04, (insetTop + ub()) / 2 - ph / 2), bottom = top + ph;
  rect.set(left, top, right, bottom);
  drawPanel(canvas, rect, '⚔️ ' + (last.info ? tr('duel.against', { name: duelName(last.info) }) : tr('duel.title')));
  const cx = w / 2;
  if (gameOverReason) { greyTextPaint.textSize = w * 0.04; canvas.drawText(fitText(gameOverReason, greyTextPaint, right - left - w * 0.1), cx, top + w * 0.24, greyTextPaint); }
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.2;
  canvas.drawText(String(last.score), cx, top + w * 0.46, darkTextPaint);
  let y = top + w * 0.56;
  const i = last.info;
  greyTextPaint.textSize = w * 0.042;
  let line;
  if (last.status === 'sending') line = tr('duel.sending');
  else if (last.status === 'error' || !i) line = tr('duel.send_error');
  else line = (i.attempts === 0 ? tr('duel.end_try_inf', { t: i.myTries, mb: i.myBest, name: duelName(i), tb: i.theirBest })
    : tr('duel.end_try', { t: i.myTries, a: i.attempts, mb: i.myBest, name: duelName(i), tb: i.theirBest }));
  canvas.drawText(fitText(line, greyTextPaint, right - left - w * 0.08), cx, y, greyTextPaint);
  y += w * 0.08;
  if (last.status === 'ok' && i && i.status === 'finished') {
    const won = i.result === 'win', draw = i.result === 'draw';
    drawTitleRibbon(canvas, cx, y + w * 0.02, tr(won ? 'duel.win' : draw ? 'duel.draw' : 'duel.loss'), Color.parseColor(won ? '#F5A623' : draw ? '#3B8DF5' : '#7A869A'), w * 0.05);
    y += w * 0.1;
  }
  if (last.coins > 0) { drawGainChip(canvas, cx, y + w * 0.02, `+${last.coins} 🪙`, w * 0.085); y += w * 0.1; }
  const canRetry = last.status === 'ok' && i && i.status === 'active' && (i.attempts === 0 || i.myTries < i.attempts);
  const bh = w * 0.13, sh = w * 0.11;
  let by = bottom - w * 0.07 - sh * 2 - w * 0.03 - (canRetry ? bh + w * 0.04 : 0);
  if (canRetry) {
    drawButton(canvas, new RectF(left + w * 0.1, by, right - w * 0.1, by + bh), '↻ ' + tr('duel.retry'), primaryBtnPaint, w * 0.06, () => retryDuel());
    by += bh + w * 0.04;
  }
  drawButton(canvas, new RectF(left + w * 0.1, by, right - w * 0.1, by + sh), '⚔️ ' + tr('duel.title'), backBtnPaint, w * 0.045, () => leaveDuelRun(true));
  by += sh + w * 0.03;
  drawButton(canvas, new RectF(left + w * 0.1, by, right - w * 0.1, by + sh), tr('duel.home'), tabOffPaint, w * 0.045, () => leaveDuelRun(false));
}

// ---------- Écran Duels ----------

/** Carte blanche arrondie d'une ligne de la liste. */
function duelCard(canvas, l, t, r, b, tint = null) {
  duelPaint.color = Color.argb(35, 20, 50, 120);
  rect.set(l, t + w * 0.008, r, b + w * 0.008); canvas.drawRoundRect(rect, w * 0.035, w * 0.035, duelPaint);
  duelPaint.color = tint || Color.WHITE;
  rect.set(l, t, r, b); canvas.drawRoundRect(rect, w * 0.035, w * 0.035, duelPaint);
}

function duelLine(canvas, text, x, y, size, color, maxW, align = Align.LEFT) {
  duelText.textAlign = align; duelText.textSize = size; duelText.color = color;
  canvas.drawText(fitText(text, duelText, maxW), x, y, duelText);
}

/** Bouton de la liste, seulement s'il est visible (la liste défile sous un masque). */
function listButton(canvas, r, label, paint, size, action) {
  if (r.bottom < duels.listTop || r.top > duels.listBottom) return;
  drawButton(canvas, r, label, paint, size, action);
}

function duelRows() {
  const order = (d) => (d.status === 'pending' && !d.sent ? 0 : d.status === 'active' ? 1 : d.status === 'pending' ? 2 : 3);
  return duels.list.slice().sort((a, b) => order(a) - order(b));
}

function drawDuelRow(canvas, d, l, r, y, rh) {
  const name = duelName(d), ink = Color.parseColor('#2E3A59'), grey = Color.parseColor('#7A869A');
  const tx = l + w * 0.04, bw = w * 0.22, inner = r - l - w * 0.08;
  const settings = attemptsLabel(d.attempts) + ' · ' + hoursLabel(d.hours) + (d.stake ? ' · 🪙 ' + d.stake : '');
  if (d.status === 'pending' && !d.sent) {
    duelCard(canvas, l, y, r, y + rh, Color.parseColor('#FFF4E5'));
    duelLine(canvas, '⚔️ ' + tr('duel.received', { name }), tx, y + rh * 0.3, w * 0.042, ink, inner);
    duelLine(canvas, settings + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), tx, y + rh * 0.52, w * 0.033, grey, inner);
    const by = y + rh * 0.62, bh = rh * 0.3;
    listButton(canvas, new RectF(r - w * 0.04 - bw * 2 - w * 0.02, by, r - w * 0.04 - bw - w * 0.02, by + bh), tr('duel.decline'), tabOffPaint, w * 0.034, () => answerDuel(d, false));
    listButton(canvas, new RectF(r - w * 0.04 - bw, by, r - w * 0.04, by + bh), tr('duel.accept'), primaryBtnPaint, w * 0.034, () => answerDuel(d, true));
    return;
  }
  if (d.status === 'active') {
    duelCard(canvas, l, y, r, y + rh);
    const canPlay = d.attempts === 0 || d.myTries < d.attempts;
    const textW = inner - (canPlay ? bw + w * 0.02 : 0);
    duelLine(canvas, '⚔️ ' + tr('duel.against', { name }), tx, y + rh * 0.3, w * 0.04, ink, textW);
    duelLine(canvas, tr('duel.vs', { a: d.myBest, name, b: d.theirBest }), tx, y + rh * 0.55, w * 0.037, Color.parseColor('#2F6CD6'), textW);
    duelLine(canvas, triesLine(d.myTries, d.attempts) + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }) + (d.stake ? ' · 🪙 ' + d.stake : ''), tx, y + rh * 0.8, w * 0.032, grey, textW);
    if (canPlay) listButton(canvas, new RectF(r - w * 0.04 - bw, y + rh * 0.3, r - w * 0.04, y + rh * 0.7), '▶ ' + tr('duel.play'), primaryBtnPaint, w * 0.038, () => playDuel(d));
    return;
  }
  if (d.status === 'pending') {
    duelCard(canvas, l, y, r, y + rh, Color.parseColor('#F1F4FA'));
    duelLine(canvas, '⏳ ' + tr('duel.waiting', { name }), tx, y + rh * 0.4, w * 0.04, ink, inner);
    duelLine(canvas, settings + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), tx, y + rh * 0.68, w * 0.033, grey, inner);
    return;
  }
  // Terminé, refusé ou expiré
  const won = d.result === 'win', draw = d.result === 'draw';
  const title = d.status === 'declined' ? tr('duel.declined') : d.status === 'expired' ? tr('duel.expired') : tr(won ? 'duel.win' : draw ? 'duel.draw' : 'duel.loss');
  duelCard(canvas, l, y, r, y + rh, Color.parseColor(won ? '#FFF6D6' : '#F1F4FA'));
  duelLine(canvas, (won ? '🏆 ' : draw ? '🤝 ' : d.status === 'finished' ? '😞 ' : '✉️ ') + title + ' · ' + name, tx, y + rh * 0.4, w * 0.04, ink, inner * 0.7);
  if (d.status === 'finished') duelLine(canvas, tr('duel.vs', { a: d.myBest, name, b: d.theirBest }), tx, y + rh * 0.68, w * 0.034, grey, inner * 0.7);
  const gain = d.status === 'finished' ? (won ? d.stake * 2 : draw ? d.stake : 0) : d.sent ? d.stake : 0;
  if (gain > 0) duelLine(canvas, tr('duel.gain', { n: gain }), r - w * 0.04, y + rh * 0.55, w * 0.04, Color.parseColor('#C98A00'), inner * 0.3, Align.RIGHT);
}

function drawFriendRow(canvas, f, l, r, y, rh) {
  duelCard(canvas, l, y, r, y + rh);
  const tx = l + w * 0.04, bw = w * 0.2, x = w * 0.075;
  duelLine(canvas, f.pseudo || f.code, tx, y + rh * 0.42, w * 0.042, Color.parseColor('#2E3A59'), r - l - bw - x - w * 0.1);
  duelLine(canvas, tr('friends.record', { n: f.best, w: f.wins, l: f.losses }), tx, y + rh * 0.74, w * 0.032, Color.parseColor('#7A869A'), r - l - bw - x - w * 0.1);
  listButton(canvas, new RectF(r - w * 0.03 - x - w * 0.02 - bw, y + rh * 0.24, r - w * 0.03 - x - w * 0.02, y + rh * 0.76), tr('friends.challenge'), accentPaint, w * 0.036,
    () => { duels.challenge = { friend: f, attempts: 3, hours: 24, stake: 0 }; });
  listButton(canvas, new RectF(r - w * 0.03 - x, y + rh * 0.28, r - w * 0.03, y + rh * 0.72), '✕', tabOffPaint, w * 0.04, () => askRemoveFriend(f));
}

function drawDuels(canvas) {
  const left = w * 0.04, right = w * 0.96, top = insetTop + h * 0.03, bottom = ub() - h * 0.02;
  panel(canvas, left, top, right, bottom, '⚔️ ' + tr('duel.title'), () => closeDuels());
  const l = left + w * 0.05, r = right - w * 0.05;
  // Ton code ami : Copier / Partager
  let y = top + panelHeaderH() + w * 0.06;
  duelLine(canvas, tr('friends.your_code'), l, y, w * 0.034, Color.parseColor('#7A869A'), r - l);
  duelLine(canvas, myCode(), l, y + w * 0.075, w * 0.07, Color.parseColor('#2E3A59'), w * 0.4);
  const bw = w * 0.2, bh = w * 0.085;
  drawButton(canvas, new RectF(r - bw * 2 - w * 0.02, y - w * 0.005, r - bw - w * 0.02, y - w * 0.005 + bh), tr('friends.copy'), tabOffPaint, w * 0.034, () => copyCode());
  drawButton(canvas, new RectF(r - bw, y - w * 0.005, r, y - w * 0.005 + bh), tr('friends.share'), backBtnPaint, w * 0.034, () => shareCode());
  y += w * 0.13;
  // Onglets
  const tabs = [tr('duel.tab_duels') + (duelsBadge() ? ` (${duelsBadge()})` : ''), tr('duel.tab_friends') + (duels.friends.length ? ` (${duels.friends.length})` : '')];
  const tw = (r - l) / 2, tabH = w * 0.1;
  tabs.forEach((label, i) => drawButton(canvas, new RectF(l + i * tw + w * 0.006, y, l + (i + 1) * tw - w * 0.006, y + tabH), label,
    duels.tab === i ? tabOnPaint : tabOffPaint, w * 0.04, () => { duels.tab = i; duels.scroll = 0; if (i === 0) markDuelsSeen(); }));
  // Liste défilable (onglet Amis : bouton « Ajouter un ami » en bas)
  const footerH = duels.tab === 1 ? w * 0.15 : 0;
  const listTop = y + tabH + w * 0.04, listBottom = bottom - footerH - w * 0.04;
  duels.listTop = listTop; duels.listBottom = listBottom;
  const rows = duels.tab === 0 ? duelRows() : duels.friends;
  const rh = duels.tab === 0 ? w * 0.25 : w * 0.18, gap = w * 0.025;
  duels.maxScroll = Math.max(0, rows.length * (rh + gap) - (listBottom - listTop));
  duels.scroll = clamp(duels.scroll, 0, duels.maxScroll);
  const mid = (listTop + listBottom) / 2;
  greyTextPaint.textSize = w * 0.04;
  if (duels.status === 'error' && !rows.length) canvas.drawText(tr('duel.offline'), w / 2, mid, greyTextPaint);
  else if (duels.status === 'loading' && !rows.length) canvas.drawText(tr('board.loading'), w / 2, mid, greyTextPaint);
  else if (!rows.length) {
    const lines = tr(duels.tab === 0 ? 'duel.none' : 'friends.none');
    canvas.drawText(fitText(lines, greyTextPaint, r - l), w / 2, mid, greyTextPaint);
  }
  canvas.save();
  canvas.clipRect(left, listTop, right, listBottom);
  rows.forEach((row, i) => {
    const ry = listTop + i * (rh + gap) - duels.scroll;
    if (ry + rh < listTop || ry > listBottom) return;
    if (duels.tab === 0) drawDuelRow(canvas, row, l, r, ry, rh); else drawFriendRow(canvas, row, l, r, ry, rh);
  });
  canvas.restore();
  if (duels.tab === 1) {
    const fy = bottom - footerH;
    drawButton(canvas, new RectF(l, fy, r, fy + w * 0.11), '+ ' + tr('friends.add'), primaryBtnPaint, w * 0.042, () => askAddFriend());
  }
  // Barre de défilement quand la liste dépasse
  if (duels.maxScroll > 0) {
    const trackH = listBottom - listTop, thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + duels.maxScroll));
    const ty0 = listTop + (trackH - thumbH) * (duels.scroll / duels.maxScroll);
    rect.set(right - w * 0.032, ty0, right - w * 0.018, ty0 + thumbH);
    canvas.drawRoundRect(rect, w * 0.01, w * 0.01, lockedPaint);
  }
  if (duels.challenge) drawChallengeDialog(canvas);
  if (time - duels.msgT < 2.6) {
    textPaint.textSize = w * 0.04;
    const t = fitText(duels.msg, textPaint, w * 0.86), tw2 = textPaint.measureText(t) + w * 0.08;
    duelPaint.color = Color.argb(225, 30, 38, 60);
    rect.set(w / 2 - tw2 / 2, bottom - footerH - w * 0.12, w / 2 + tw2 / 2, bottom - footerH - w * 0.03);
    canvas.drawRoundRect(rect, rect.height() / 2, rect.height() / 2, duelPaint);
    canvas.drawText(t, w / 2, rect.centerY() + w * 0.014, textPaint);
  }
}

/** Fenêtre « Défier Léa » : essais, durée et mise, en pastilles. */
function drawChallengeDialog(canvas) {
  const c = duels.challenge;
  buttons.length = 0;
  const left = w * 0.06, right = w * 0.94, ph = w * 1.24;
  const top = (insetTop + ub()) / 2 - ph / 2, bottom = top + ph;
  panel(canvas, left, top, right, bottom, tr('duel.challenge_title', { name: c.friend.pseudo || c.friend.code }), () => { duels.challenge = null; });
  const l = left + w * 0.06, r = right - w * 0.06;
  let y = top + panelHeaderH() + w * 0.08;
  const chips = (label, values, current, text, set) => {
    duelLine(canvas, label, l, y, w * 0.042, Color.parseColor('#2E3A59'), r - l);
    y += w * 0.04;
    const n = values.length, cw = (r - l) / n;
    values.forEach((v, i) => drawButton(canvas, new RectF(l + i * cw + w * 0.008, y, l + (i + 1) * cw - w * 0.008, y + w * 0.1), text(v),
      v === current ? tabOnPaint : tabOffPaint, w * 0.038, () => set(v)));
    y += w * 0.18;
  };
  chips(tr('duel.attempts'), DUEL_ATTEMPT_CHOICES, c.attempts, (v) => (v === 0 ? '∞' : String(v)), (v) => { c.attempts = v; });
  chips(tr('duel.duration'), DUEL_HOUR_CHOICES, c.hours, hoursLabel, (v) => { c.hours = v; });
  chips(tr('duel.stake'), DUEL_STAKE_CHOICES, c.stake, (v) => (v === 0 ? '0' : '🪙' + v), (v) => { c.stake = v; });
  if (c.stake > 0) drawBalancePill(canvas, w / 2, y, c.stake);
  const by = bottom - w * 0.2;
  drawButton(canvas, new RectF(l, by, l + (r - l) * 0.42, by + w * 0.12), tr('common.cancel'), tabOffPaint, w * 0.045, () => { duels.challenge = null; });
  drawButton(canvas, new RectF(r - (r - l) * 0.54, by, r, by + w * 0.12), '⚔️ ' + tr('duel.send'), primaryBtnPaint, w * 0.05, () => sendChallenge());
}

// ---------- Défilement de la liste au doigt ----------
function duelsPointerDown(x, y) {
  if (state !== State.DUELS || duels.challenge || y < duels.listTop || y > duels.listBottom) return false;
  duels.dragY = y; duels.downX = x; duels.dragStart = duels.scroll; duels.moved = false;
  return true;
}
function duelsPointerMove(y) {
  if (duels.dragY < 0) return;
  if (Math.abs(y - duels.dragY) > w * 0.02) duels.moved = true;
  if (duels.moved) duels.scroll = clamp(duels.dragStart - (y - duels.dragY), 0, duels.maxScroll);
}
function duelsPointerUp() {
  if (duels.dragY < 0) return;
  if (!duels.moved) {
    const hit = buttons.find((b) => b.rect.contains(duels.downX, duels.dragY));
    if (hit) { sounds.play('CLICK', 0.6); hit.action(); }
  }
  duels.dragY = -1;
}

// ---------- Compte (Réglages) ----------
function confirmDeleteAccount() {
  askText({ title: tr('account.delete'), msg: tr('account.delete_confirm'), input: false, ok: tr('account.delete_ok'), danger: true }, () => {
    online.deleteAccount().then((ok) => {
      if (!ok) { banners.push({ text: tr('account.delete_error'), life: 3 }); return; }
      duels.list = []; duels.friends = []; duels.loadedAt = 0;
      banners.push({ text: tr('account.deleted'), life: 3 });
      state = State.READY;
      setTimeout(() => askPseudo(true), 300);
    });
  });
}
