'use strict';
// Écran « Duels » (équivalent de DuelUi.kt) : ton code ami, défis reçus, duels en cours et terminés, amis,
// page de présentation arcade « VS » avec éclairs, compte à rebours « 5, 4, 3, 2, 1, GO ! » et chronomètre
// de précision qui départage en cas de score égal. Pas de pièces gagnées ni de mises en pièces en mode duel.

const DUEL_ATTEMPT_CHOICES = [1, 3, 5, 0], DUEL_HOUR_CHOICES = [1, 24, 72];
const DUEL_OPP_SHAPES = ['cube', 'cylindre', 'boule', 'tour'];
const DUEL_OPP_COLORS = ['orange', 'menthe', 'lilas', 'citron', 'framboise', 'azur', 'pomme'];
const DUEL_OPP_HATS = ['none', 'casquette', 'bonnet', 'couronne', 'aureole', 'hautdeforme', 'cowboy'];
const DUEL_OPP_GLASSES = ['none', 'soleil', 'rond', 'etoile'];
const DUEL_OPP_BACKS = ['none', 'cape', 'ailes', 'sac'];

const duels = {
  list: [], friends: [], requests: [], sent: [], vsAt: 0, vsHit: false, loadedAt: 0, busy: false, status: 'idle', tab: 0, returnState: null,
  challenge: null, vs: null, msg: '', msgT: -10, scroll: 0, maxScroll: 0, listTop: 0, listBottom: 0,
  dragY: -1, downX: 0, dragStart: 0, moved: false, last: null,
};
const duelPaint = new Paint(), duelStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const duelText = new Paint({ bold: true }), duelPath = new Path();

// ---------- Apparence partagée pour l'écran VS ----------

function myLookCode() {
  return `${lookSpecial}|${lookShape}|${lookColor}|${lookHat}|${lookGlasses}|${lookShoes}|${lookBack}`;
}

function drawOpponentCharacter(canvas, d) {
  try {
    const raw = d.opponent && d.opponent.look;
    const parts = raw ? raw.split('|') : null;
    if (parts && parts.length >= 7) {
      lookSpecial = parts[0]; lookShape = parts[1]; lookColor = parts[2];
      lookHat = parts[3]; lookGlasses = parts[4]; lookShoes = parts[5]; lookBack = parts[6];
    } else {
      const key = (d.opponent && (d.opponent.code || d.opponent.pseudo)) || '?';
      let h = 5381;
      for (let i = 0; i < key.length; i++) h = (((h << 5) + h) ^ key.charCodeAt(i)) | 0;
      const u = h & 0x7fffffff;
      lookSpecial = Skins.NONE;
      lookShape = DUEL_OPP_SHAPES[u % DUEL_OPP_SHAPES.length];
      lookColor = DUEL_OPP_COLORS[Math.floor(u / 7) % DUEL_OPP_COLORS.length];
      lookHat = DUEL_OPP_HATS[Math.floor(u / 31) % DUEL_OPP_HATS.length];
      lookGlasses = DUEL_OPP_GLASSES[Math.floor(u / 127) % DUEL_OPP_GLASSES.length];
      lookShoes = Skins.NONE;
      lookBack = DUEL_OPP_BACKS[Math.floor(u / 509) % DUEL_OPP_BACKS.length];
    }
    for (const slot of Skins.tintable) tintColors.set(slot, 0);
    const c = Skins.find(Slot.COLOR, lookColor).color;
    playerTop.color = shade(c, 1.18); playerLeft.color = c; playerRight.color = shade(c, 0.78);
    playerTop.shader = null; playerLeft.shader = null; playerRight.shader = null;
    drawCharacter(canvas, 0, 0, 0, 1, 1, false, false, false);
  } finally {
    loadLook();
  }
}

// ---------- Chronomètre de précision & Compte à rebours ----------

function fmtChronoParts(sec) {
  const totalCs = Math.floor(Math.max(0, sec) * 100);
  const mins = Math.floor(totalCs / 6000);
  const secs = Math.floor(totalCs / 100) % 60;
  const cs = totalCs % 100;
  return [mins + ':' + String(secs).padStart(2, '0'), '.' + String(cs).padStart(2, '0')];
}

function fmtChronoFull(sec) {
  const [m, c] = fmtChronoParts(sec);
  return m + c;
}

/** Fait avancer le compte à rebours « 5, 4, 3, 2, 1, GO ! » au début d'un duel (le son est calé sur chaque seconde). */
function updateDuel(dt) {
  if (!duel.active || state === State.DUELS || state === State.DUEL_END || state === State.PAUSED) return;
  if (duel.countdown > 0) {
    duel.countdown = Math.max(0, duel.countdown - dt);
    const sec = Math.ceil(duel.countdown);
    if (sec >= 1 && sec <= 5 && sec !== duel.lastSec) {
      // Chaque chiffre « frappe » l'écran
      duel.lastSec = sec;
      vibrate(25); shake(0.05);
      if (!sounds.has('COUNTDOWN')) sounds.play('STAR', 0.75, 0.75 + (5 - sec) * 0.1);
    }
    if (duel.countdown <= 0) {
      duel.goT = DUEL_GO_T;
      duel.lastSec = 0;
      vibrate(50); shake(0.14);
      if (!sounds.has('COUNTDOWN')) sounds.play('GREAT', 1, 1.15);
    }
  } else if (duel.goT > 0) {
    duel.goT = Math.max(0, duel.goT - dt);
  }
}
const DUEL_GO_T = 0.9;

// Chiffres à 7 segments (afficheur de borne d'arcade) : a = haut, b = haut droit, c = bas droit, d = bas, e = bas gauche,
// f = haut gauche, g = milieu
const SEG_DIGITS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
const segPath = new Path();

/** Un segment : barre aux bouts pointus, horizontale (centre cx, cy, longueur len) ou verticale. */
function segBar(canvas, cx, cy, len, t, horizontal, paint) {
  const a = len / 2, b = t / 2;
  segPath.reset();
  if (horizontal) {
    segPath.moveTo(cx - a, cy); segPath.lineTo(cx - a + b, cy - b); segPath.lineTo(cx + a - b, cy - b);
    segPath.lineTo(cx + a, cy); segPath.lineTo(cx + a - b, cy + b); segPath.lineTo(cx - a + b, cy + b);
  } else {
    segPath.moveTo(cx, cy - a); segPath.lineTo(cx + b, cy - a + b); segPath.lineTo(cx + b, cy + a - b);
    segPath.lineTo(cx, cy + a); segPath.lineTo(cx - b, cy + a - b); segPath.lineTo(cx - b, cy - a + b);
  }
  segPath.close();
  canvas.drawPath(segPath, paint);
}

/** Chiffre n (0 à 9) à 7 segments dans la boîte (x, y, dw, dh) : segments allumés en on, éteints en off (fantôme). */
function drawSegDigit(canvas, x, y, dw, dh, n, on, off) {
  const t = dw * 0.2, g = t * 0.14, lit = SEG_DIGITS[n] || '', hx = x + dw / 2, vy1 = y + dh * 0.25, vy2 = y + dh * 0.75;
  const hl = dw - t - g * 2, vl = dh / 2 - t * 0.5 - g * 2;
  const seg = (id, cx, cy, len, hor) => { duelPaint.color = lit.includes(id) ? on : off; segBar(canvas, cx, cy, len, t, hor, duelPaint); };
  duelPaint.shader = null;
  seg('a', hx, y + t / 2, hl, true); seg('g', hx, y + dh / 2, hl, true); seg('d', hx, y + dh - t / 2, hl, true);
  seg('f', x + t / 2, vy1 + t * 0.12, vl, false); seg('b', x + dw - t / 2, vy1 + t * 0.12, vl, false);
  seg('e', x + t / 2, vy2 - t * 0.12, vl, false); seg('c', x + dw - t / 2, vy2 - t * 0.12, vl, false);
}

/**
 * Chronomètre de précision du duel, façon borne d'arcade : plaque sombre inclinée au liseré néon, chiffres à
 * 7 segments « M:SS.cc » (centièmes en ambre), filet qui balaie chaque seconde et éclair du liseré à chaque seconde.
 */
function drawDuelChrono(canvas) {
  const cx = w / 2, cy = insetTop + w * 0.092, pw = w * 0.47, ph = w * 0.105, sl = w * 0.022;
  const running = duel.countdown <= 0 && (state === State.READY || state === State.CHARGING || state === State.JUMPING);
  const secFrac = runTime - Math.floor(runTime);
  const beat = running && secFrac < 0.18 ? 1 - secFrac / 0.18 : 0;
  const neon = running ? Color.rgb(56, 220, 255) : Color.rgb(148, 163, 184);
  const plate = (grow) => {
    duelPath.reset();
    duelPath.moveTo(cx - pw / 2 + sl - grow, cy - ph / 2 - grow); duelPath.lineTo(cx + pw / 2 + sl + grow, cy - ph / 2 - grow);
    duelPath.lineTo(cx + pw / 2 - sl + grow, cy + ph / 2 + grow); duelPath.lineTo(cx - pw / 2 - sl - grow, cy + ph / 2 + grow);
    duelPath.close();
  };
  // Ombre, halo néon, plaque
  duelPaint.shader = null; duelPaint.color = Color.argb(110, 2, 5, 16);
  canvas.save(); canvas.translate(0, w * 0.01); plate(0); canvas.drawPath(duelPath, duelPaint); canvas.restore();
  duelStroke.strokeJoin = 'miter';
  duelStroke.strokeWidth = w * (0.02 + 0.012 * beat); duelStroke.color = Color.argb(Math.round(50 + 70 * beat), Color.red(neon), Color.green(neon), Color.blue(neon));
  plate(0); canvas.drawPath(duelPath, duelStroke);
  duelPaint.color = Color.WHITE;
  duelPaint.shader = new LinearGradient(0, cy - ph / 2, 0, cy + ph / 2, Color.parseColor('#17203F'), Color.parseColor('#070B1A'));
  canvas.drawPath(duelPath, duelPaint);
  duelPaint.shader = null;
  duelStroke.strokeWidth = w * 0.006; duelStroke.color = neon; canvas.drawPath(duelPath, duelStroke);
  duelStroke.strokeJoin = 'round';
  // Chiffres : minutes et secondes en blanc bleuté, centièmes plus petits en ambre
  const [mainStr, csStr] = fmtChronoParts(runTime);
  const dh = ph * 0.6, dw = dh * 0.55, gap = dw * 0.28, sdh = dh * 0.72, sdw = sdh * 0.55, colon = dw * 0.45;
  let total = 0;
  for (const ch of mainStr) total += ch === ':' ? colon + gap : dw + gap;
  total += colon * 0.8 + (sdw + gap * 0.8) * 2 - gap * 0.8;
  let x = cx - total / 2;
  const top = cy - dh / 2;
  const on = running ? Color.rgb(225, 248, 255) : Color.rgb(190, 200, 220), off = Color.argb(34, 90, 200, 255);
  const amber = running ? Color.parseColor('#FFC83A') : Color.parseColor('#9AA6C8'), amberOff = Color.argb(34, 255, 200, 60);
  canvas.save();
  canvas.translate(cx, cy); canvas.skew(-0.13, 0); canvas.translate(-cx, -cy);
  for (const ch of mainStr) {
    if (ch === ':') {
      // Deux points qui clignotent à chaque seconde
      duelPaint.color = !running || secFrac < 0.5 ? on : off;
      canvas.drawCircle(x + colon / 2, cy - dh * 0.2, dw * 0.11, duelPaint); canvas.drawCircle(x + colon / 2, cy + dh * 0.2, dw * 0.11, duelPaint);
      x += colon + gap;
    } else { drawSegDigit(canvas, x, top, dw, dh, ch.charCodeAt(0) - 48, on, off); x += dw + gap; }
  }
  duelPaint.color = amber; canvas.drawCircle(x + colon * 0.25, top + dh - dw * 0.1, dw * 0.11, duelPaint);
  x += colon * 0.8;
  for (const ch of csStr.slice(1)) { drawSegDigit(canvas, x, top + dh - sdh, sdw, sdh, ch.charCodeAt(0) - 48, amber, amberOff); x += sdw + gap * 0.8; }
  canvas.restore();
  // Filet qui balaie la seconde en cours, sous la plaque
  if (running) {
    duelPaint.color = Color.argb(200, Color.red(neon), Color.green(neon), Color.blue(neon));
    const bl = cx - pw / 2 - sl + w * 0.02, bw2 = pw - w * 0.04;
    canvas.drawRect(bl, cy + ph / 2 + w * 0.012, bl + bw2 * secFrac, cy + ph / 2 + w * 0.018, duelPaint);
  }
}

/** Texte arcade incliné : traînées cyan et magenta décalées, gros contour noir, dégradé clair → couleur. */
function drawArcadeText(canvas, label, cx, cy, size, color, alpha) {
  const a = (v) => Math.round(v * alpha);
  duelText.textAlign = Align.CENTER; duelText.textSize = size;
  const by = cy - (duelText.descent() + duelText.ascent()) / 2;
  canvas.save();
  canvas.translate(cx, cy); canvas.skew(-0.16, 0); canvas.translate(-cx, -cy);
  duelText.style = Style.FILL; duelText.shader = null;
  duelText.color = Color.argb(a(170), 40, 230, 255); canvas.drawText(label, cx - size * 0.045, by + size * 0.02, duelText);
  duelText.color = Color.argb(a(170), 255, 60, 170); canvas.drawText(label, cx + size * 0.045, by - size * 0.02, duelText);
  duelText.style = Style.STROKE; duelText.strokeJoin = 'round'; duelText.strokeWidth = size * 0.1;
  duelText.color = Color.argb(a(255), 8, 10, 24); canvas.drawText(label, cx, by + size * 0.03, duelText); canvas.drawText(label, cx, by, duelText);
  duelText.style = Style.FILL;
  duelText.color = Color.argb(a(255), 255, 255, 255);
  duelText.shader = new LinearGradient(0, by - size * 0.74, 0, by, [Color.WHITE, Color.WHITE, color], [0, 0.3, 1]);
  canvas.drawText(label, cx, by, duelText);
  duelText.shader = null;
  canvas.restore();
}

/**
 * Compte à rebours arcade « 5, 4, 3, 2, 1, GO ! » : chaque chiffre s'écrase sur l'écran (bande d'énergie, rayons de
 * vitesse, onde de choc), puis éclate et disparaît avant le suivant ; cinq losanges en bas s'éteignent un à un.
 */
function drawDuelCountdown(canvas) {
  if (!duel.active || (duel.countdown <= 0 && duel.goT <= 0)) return;
  if (state === State.DUELS || state === State.DUEL_END || state === State.PAUSED) return;
  const cx = w / 2, cy = h * 0.43;
  duelPaint.shader = null;
  if (duel.countdown > 0) {
    duelPaint.color = Color.argb(120, 6, 10, 26); canvas.drawRect(0, 0, w, h, duelPaint);
    const sec = clamp(Math.ceil(duel.countdown), 1, 5);
    const rawFrac = duel.countdown - Math.floor(duel.countdown), elapsed = 1 - (rawFrac === 0 ? 1 : rawFrac);
    const color = Color.parseColor(['#FF3355', '#FF8A1F', '#FFD21F', '#4FC3FF', '#38E8FF'][sec - 1]);
    const cr = Color.red(color), cg = Color.green(color), cb = Color.blue(color);
    const hit = clamp(elapsed / 0.14, 0, 1), out = clamp((elapsed - 0.7) / 0.3, 0, 1);
    drawCountdownBurst(canvas, cx, cy, elapsed, cr, cg, cb, 1 - out);
    // Le chiffre : il s'écrase (grand → normal avec un petit rebond), tient, puis éclate en grossissant
    const scale = elapsed < 0.14 ? 2.6 - 1.7 * hit : elapsed < 0.24 ? 0.9 + 0.1 * (elapsed - 0.14) / 0.1 : 1 + 0.6 * out * out;
    const alpha = clamp(elapsed / 0.06, 0, 1) * (1 - out);
    canvas.save();
    canvas.rotate(-7 * (1 - hit), cx, cy); canvas.scale(scale, scale, cx, cy);
    drawArcadeText(canvas, String(sec), cx, cy, w * 0.46, color, alpha);
    canvas.restore();
    // Cinq losanges : ceux qui restent sont allumés, celui de la seconde en cours pulse
    const py = cy + w * 0.36, gap = w * 0.085;
    for (let i = 0; i < 5; i++) {
      const lit = i < sec, x = cx + (i - 2) * gap, r = w * 0.024 * (lit && i === sec - 1 ? 1 + 0.35 * (1 - elapsed) : 1);
      duelPath.reset(); duelPath.moveTo(x, py - r); duelPath.lineTo(x + r, py); duelPath.lineTo(x, py + r); duelPath.lineTo(x - r, py); duelPath.close();
      duelPaint.color = lit ? color : Color.argb(90, 20, 28, 56); canvas.drawPath(duelPath, duelPaint);
      duelStroke.strokeWidth = w * 0.005; duelStroke.color = lit ? Color.WHITE : Color.argb(120, 150, 180, 240); canvas.drawPath(duelPath, duelStroke);
    }
  } else {
    const u = 1 - clamp(duel.goT / DUEL_GO_T, 0, 1);
    // Éclair blanc sur tout l'écran, puis « GO ! » qui jaillit
    duelPaint.color = Color.argb(Math.round(150 * (1 - u) * (1 - u)), 255, 255, 255); canvas.drawRect(0, 0, w, h, duelPaint);
    drawCountdownBurst(canvas, cx, cy, u * 0.8, 80, 255, 140, 1 - u);
    const scale = u < 0.16 ? 0.4 + 0.8 * (u / 0.16) : 1.2 + 0.5 * ((u - 0.16) / 0.84);
    const alpha = u < 0.5 ? 1 : clamp(1 - (u - 0.5) / 0.5, 0, 1);
    canvas.save(); canvas.scale(scale, scale, cx, cy);
    drawArcadeText(canvas, 'GO !', cx, cy, w * 0.3, Color.parseColor('#3DFF7A'), alpha);
    canvas.restore();
  }
}

/** Décor d'un coup du compte à rebours : bande d'énergie en biais, rayons de vitesse et onde de choc. */
function drawCountdownBurst(canvas, cx, cy, elapsed, cr, cg, cb, fade) {
  // Bande en biais qui traverse l'écran derrière le chiffre
  const bh = w * 0.3 * (1 - 0.25 * elapsed), slope = w * 0.16;
  duelPath.reset();
  duelPath.moveTo(0, cy - bh / 2 + slope / 2); duelPath.lineTo(w, cy - bh / 2 - slope / 2); duelPath.lineTo(w, cy + bh / 2 - slope / 2); duelPath.lineTo(0, cy + bh / 2 + slope / 2);
  duelPath.close();
  duelPaint.color = Color.WHITE;
  duelPaint.shader = new LinearGradient(0, 0, w, 0, [Color.argb(0, cr, cg, cb), Color.argb(Math.round(150 * fade), cr, cg, cb), Color.argb(Math.round(150 * fade), cr, cg, cb), Color.argb(0, cr, cg, cb)], [0, 0.3, 0.7, 1]);
  canvas.drawPath(duelPath, duelPaint);
  duelPaint.shader = null;
  // Rayons de vitesse qui partent du centre
  duelStroke.strokeCap = 'butt';
  for (let i = 0; i < 18; i++) {
    const a = i * 0.349 + 0.2, r0 = w * (0.3 + 0.55 * elapsed + 0.05 * (i % 3)), len = w * (0.1 + 0.05 * (i % 4));
    duelStroke.strokeWidth = w * (0.006 + 0.004 * (i % 2));
    duelStroke.color = Color.argb(Math.round(190 * fade * (1 - elapsed)), 255, 255, 255);
    canvas.drawLine(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len), duelStroke);
  }
  duelStroke.strokeCap = 'round';
  // Onde de choc
  duelStroke.strokeWidth = w * 0.02 * (1 - elapsed) + 1;
  duelStroke.color = Color.argb(Math.round(220 * (1 - elapsed) * fade), cr, cg, cb);
  canvas.drawCircle(cx, cy, w * (0.16 + 0.42 * elapsed), duelStroke);
}

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
    duels.list = list; duels.friends = friends.friends; duels.requests = friends.requests; duels.sent = friends.sent; duels.status = 'ok';
    if (duels.vs) {
      const updated = duels.list.find((d) => d.id === duels.vs.id);
      if (updated) duels.vs = updated;
    }
    if (state === State.DUELS && duels.tab === 0) markDuelsSeen();
  });
}

/** Résultats vus (seuls les duels encore renvoyés par le serveur sont gardés en mémoire). */
function markDuelsSeen() {
  if (duels.status !== 'ok') return;
  const ids = new Set();
  for (const d of duels.list) if (d.status !== 'pending' && d.status !== 'active') ids.add(String(d.id));
  store.setSet('duels_seen', ids);
}

/** Ce qui attend le joueur : défis reçus, résultats pas encore vus et demandes d'ami à valider. */
function duelsBadge() {
  return duelsOnlyBadge() + duels.requests.length;   // + demandes d'ami à valider
}
/** Défis reçus en attente + résultats pas encore vus (onglet Duels). */
function duelsOnlyBadge() {
  const seen = store.getSet('duels_seen');
  return duels.list.filter((d) => (d.status === 'pending' && !d.sent) ||
    ((d.status === 'finished' || d.status === 'declined' || d.status === 'expired') && !seen.has(String(d.id)))).length;
}

function duelName(d) { return (d.opponent && (d.opponent.pseudo || d.opponent.code)) || '?'; }
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
  state = State.DUELS; duels.tab = tab; duels.scroll = 0; duels.challenge = null; duels.vs = null;
  refreshDuels(true);
  if (tab === 0) markDuelsSeen();
}
function closeDuels() { duels.challenge = null; duels.vs = null; state = duels.returnState || State.READY; }

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
      // Demande envoyée : l'ami doit l'accepter avant qu'on puisse se défier
      if (r.ok) { duelToast(tr(r.pending ? 'friends.request_sent' : 'friends.added', { name: r.pseudo || v.toUpperCase() })); duels.tab = 1; refreshDuels(true); }
      else duelToast(tr(r.error === 'offline' ? 'duel.error' : 'friends.err_' + r.error));
    });
  });
}

/** Réponse à une demande d'ami reçue. */
function answerFriend(f, accept) {
  online.answerFriend(f.code, accept).then((r) => {
    if (r === 'ok') { if (accept) duelToast(tr('friends.added', { name: f.pseudo || f.code })); }
    else duelToast(tr(r === 'full' ? 'friends.err_full' : 'duel.error'));
    refreshDuels(true);
  });
}

/** Annule une demande d'ami envoyée. */
function cancelFriendRequest(f) {
  online.removeFriend(f.code).then((ok) => { if (ok) refreshDuels(true); else duelToast(tr('duel.error')); });
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
  duels.challenge = null;
  online.challenge(c.friend.code, c.attempts, c.hours, 0, myLookCode()).then(({ code }) => {
    if (code !== 200) { duelToast(tr('duel.error')); return; }
    duelToast(tr('duel.sent', { name: c.friend.pseudo || c.friend.code }));
    duels.tab = 0; duels.scroll = 0; refreshDuels(true);
  });
}

function answerDuel(d, accept) {
  online.answer(d.id, accept, myLookCode()).then(({ code, json }) => {
    if (code !== 200) { duelToast(tr(code === 409 ? 'duel.over' : 'duel.error')); refreshDuels(true); return; }
    if (accept && json) {
      // Dès qu'on accepte une partie, on ouvre la page de présentation arcade « VS »
      openDuelVs(json);
    }
    refreshDuels(true);
  });
}

/** Ouvre l'écran de présentation arcade « VS » avant de lancer le duel (les combattants entrent en scène). */
function openDuelVs(d) {
  duels.challenge = null;
  duels.vs = d; duels.vsAt = time; duels.vsHit = false;
  sounds.play('WHOOSH', 0.8, 1.2);
}

/** Commence un essai (compté par le serveur), puis la partie sur la map du duel avec le compte à rebours. */
function playDuel(dOrId) {
  const id = typeof dOrId === 'number' ? dOrId : dOrId.id;
  online.startTry(id, myLookCode()).then(({ code, json }) => {
    if (code === 200) { duels.challenge = null; duels.vs = null; startDuelRun(json.seed, json.id, json); return; }
    duels.vs = null;
    duelToast(code === 0 ? tr('duel.error') : json && json.error === "plus d'essais" ? tr('duel.no_tries') : tr('duel.over'));
    refreshDuels(true);
  });
}

// ---------- Écran de présentation Arcade « VS » ----------

function drawLightningBolt(canvas, x0, y0, x1, y1, seed, mainBolt) {
  const steps = mainBolt ? 9 : 6;
  const dx = (x1 - x0) / steps, dy = (y1 - y0) / steps;
  const amp = mainBolt ? w * 0.045 : w * 0.028;
  duelPath.reset();
  duelPath.moveTo(x0, y0);
  let hSeed = seed | 0;
  for (let i = 1; i < steps; i++) {
    hSeed = (Math.imul(hSeed, 1103515245) + 12345) & 0x7fffffff;
    const jitter = ((hSeed % 200) / 100 - 1) * amp;
    duelPath.lineTo(x0 + dx * i + jitter, y0 + dy * i - jitter * 0.25);
  }
  duelPath.lineTo(x1, y1);

  duelStroke.strokeWidth = mainBolt ? w * 0.024 : w * 0.014;
  duelStroke.color = seed % 2 === 0 ? Color.argb(145, 56, 189, 248) : Color.argb(145, 250, 204, 21);
  canvas.drawPath(duelPath, duelStroke);

  duelStroke.strokeWidth = mainBolt ? w * 0.008 : w * 0.0045;
  duelStroke.color = Color.WHITE;
  canvas.drawPath(duelPath, duelStroke);
}

/**
 * Page de présentation arcade façon jeu de combat : à gauche notre pseudo et dessous notre avatar, au milieu un gros
 * « VS » avec des éclairs, à droite l'adversaire. Les deux combattants entrent en glissant, puis le « VS » s'écrase
 * au centre (éclair blanc, secousse). En bas : « Commencer le duel ».
 */
function drawDuelVs(canvas, d) {
  buttons.length = 0;
  const slant = w * 0.07, midX = w * 0.5, PC = Color.parseColor;
  const tIn = time - duels.vsAt, ease = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;
  const slide = ease(tIn / 0.4), hitT = tIn - 0.42;
  if (hitT >= 0 && !duels.vsHit) { duels.vsHit = true; shake(0.12); vibrate(40); sounds.play('STRIKE', 0.5, 1.3); }
  const top = insetTop + w * 0.04, clashY = insetTop + (ub() - insetTop) * 0.47, feetY = clashY + w * 0.2;

  // Deux moitiés en biais : bleu électrique pour nous, rouge ardent pour l'adversaire
  duelPath.reset(); duelPath.moveTo(0, 0); duelPath.lineTo(midX + slant, 0); duelPath.lineTo(midX - slant, h); duelPath.lineTo(0, h); duelPath.close();
  duelPaint.color = Color.WHITE; duelPaint.shader = new LinearGradient(0, 0, midX, h, PC('#081030'), PC('#1D4ED8'));
  canvas.drawPath(duelPath, duelPaint);
  canvas.save(); canvas.clipPath(duelPath);
  drawVsStripes(canvas, -1, Color.argb(22, 120, 190, 255));
  canvas.restore();
  duelPath.reset(); duelPath.moveTo(midX + slant, 0); duelPath.lineTo(w, 0); duelPath.lineTo(w, h); duelPath.lineTo(midX - slant, h); duelPath.close();
  duelPaint.shader = new LinearGradient(midX, 0, w, h, PC('#3B0764'), PC('#BE123C'));
  canvas.drawPath(duelPath, duelPaint);
  canvas.save(); canvas.clipPath(duelPath);
  drawVsStripes(canvas, 1, Color.argb(22, 255, 150, 170));
  canvas.restore();
  duelPaint.shader = null;

  // Rayons d'énergie tournants au centre
  canvas.save(); canvas.translate(midX, clashY); canvas.rotate(time * 16);
  duelPaint.color = Color.argb(18, 255, 255, 255);
  const rayR = Math.max(w, h) * 0.75;
  for (let i = 0; i < 16; i++) {
    const a0 = i * Math.PI / 8, a1 = a0 + 0.11;
    duelPath.reset(); duelPath.moveTo(0, 0); duelPath.lineTo(Math.cos(a0) * rayR, Math.sin(a0) * rayR); duelPath.lineTo(Math.cos(a1) * rayR, Math.sin(a1) * rayR); duelPath.close();
    canvas.drawPath(duelPath, duelPaint);
  }
  canvas.restore();

  // En-tête : retour et infos du duel
  drawBackButton(canvas, w * 0.04 + w * 0.055, top + w * 0.055, w * 0.048, () => { duels.vs = null; });
  duelText.style = Style.FILL; duelText.shader = null; duelText.textAlign = Align.CENTER;
  duelText.textSize = w * 0.055; duelText.color = Color.WHITE;
  canvas.drawText('⚔️ ' + tr('duel.title').toUpperCase(), midX, top + w * 0.065, duelText);
  duelText.textSize = w * 0.033; duelText.color = Color.argb(215, 226, 232, 240);
  canvas.drawText(fitText(triesLine(d.myTries, d.attempts) + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), duelText, w * 0.68), midX, top + w * 0.115, duelText);

  const leftCx = w * 0.225, rightCx = w * 0.775, cardW = w * 0.41, nameH = w * 0.105, nameY = feetY - w * 0.52;
  const charScale = w * 0.33 / k;
  // Un combattant : podium lumineux, avatar qui respire, pseudo dans un cartouche en biais au-dessus, meilleur score dessous
  const fighter = (cx, dir, name, best, bestTime, tries, plate, glow, base, drawChar) => {
    const off = dir * (1 - slide) * w * 0.7;
    canvas.save(); canvas.translate(off, 0);
    const pw = w * 0.19, ph = w * 0.055;
    for (let i = 3; i >= 1; i--) {
      duelPaint.color = Color.argb(24 * (4 - i), Color.red(glow), Color.green(glow), Color.blue(glow));
      rect.set(cx - pw * (1 + i * 0.12), feetY - ph * (1 + i * 0.2), cx + pw * (1 + i * 0.12), feetY + ph * (1 + i * 0.2)); canvas.drawOval(rect, duelPaint);
    }
    duelPaint.color = Color.argb(220, 15, 23, 42); rect.set(cx - pw, feetY - ph * 0.5, cx + pw, feetY + ph * 1.15); canvas.drawOval(rect, duelPaint);
    duelPaint.color = base; rect.set(cx - pw, feetY - ph, cx + pw, feetY + ph * 0.65); canvas.drawOval(rect, duelPaint);
    duelStroke.strokeWidth = w * 0.005; duelStroke.color = glow; canvas.drawOval(rect, duelStroke);
    const bob = Math.sin(time * 4.5 + (dir > 0 ? 1.6 : 0)) * 0.03;
    canvas.save(); canvas.translate(cx, feetY); canvas.scale(charScale * (1 - bob * 0.5), charScale * (1 + bob), 0, 0);
    drawChar();
    canvas.restore();
    // Cartouche du pseudo, en biais
    const l = cx - cardW / 2, r = cx + cardW / 2, sk = w * 0.024;
    duelPath.reset(); duelPath.moveTo(l + sk, nameY); duelPath.lineTo(r + sk, nameY); duelPath.lineTo(r - sk, nameY + nameH); duelPath.lineTo(l - sk, nameY + nameH); duelPath.close();
    duelPaint.color = Color.argb(110, 2, 5, 16); canvas.save(); canvas.translate(0, w * 0.012); canvas.drawPath(duelPath, duelPaint); canvas.restore();
    duelPaint.color = plate; canvas.drawPath(duelPath, duelPaint);
    duelStroke.strokeJoin = 'miter'; duelStroke.strokeWidth = w * 0.007; duelStroke.color = glow; canvas.drawPath(duelPath, duelStroke); duelStroke.strokeJoin = 'round';
    duelText.style = Style.FILL; duelText.textAlign = Align.CENTER; duelText.textSize = w * 0.05; duelText.color = Color.WHITE;
    canvas.drawText(fitText(name, duelText, cardW - w * 0.07), cx, nameY + nameH / 2 - (duelText.descent() + duelText.ascent()) / 2, duelText);
    if (tries > 0) {
      duelText.textSize = w * 0.032; duelText.color = PC('#FFE066');
      canvas.drawText(fitText(`🏆 ${best}` + (bestTime > 0 ? ` · ⏱ ${fmtChronoFull(bestTime)}` : ''), duelText, cardW), cx, feetY + w * 0.15, duelText);
    }
    canvas.restore();
  };
  fighter(leftCx, -1, profile.pseudo || tr('board.you'), d.myBest, d.myTime || 0, d.myTries, Color.argb(235, 12, 26, 78), PC('#38BDF8'), PC('#1E3A8A'),
    () => drawCharacter(canvas, 0, 0, 0, 1, 1, true, false, false));
  fighter(rightCx, 1, duelName(d), d.theirBest, d.theirTime || 0, d.theirTries, Color.argb(235, 88, 8, 30), PC('#FB7185'), PC('#881337'),
    () => drawOpponentCharacter(canvas, d));

  // Éclairs et gros « VS » : ils arrivent avec le choc
  if (hitT >= 0) {
    const tick = Math.floor(time * 14);
    drawLightningBolt(canvas, midX + slant * 0.85, top + w * 0.16, midX - slant * 0.85, ub() - w * 0.26, tick * 31 + 7, true);
    for (let b = 0; b < 4; b++) {
      const ang = (b * 90 + 35 + (tick * 19) % 30) * Math.PI / 180, len = w * (0.2 + (b % 2) * 0.07);
      drawLightningBolt(canvas, midX, clashY, midX + Math.cos(ang) * len, clashY + Math.sin(ang) * len, tick * 97 + b * 13, false);
    }
    const slam = clamp(hitT / 0.16, 0, 1), vsPulse = (3.2 - 2.2 * slam) * (1 + 0.05 * Math.sin(time * 8));
    const vsR = w * 0.105;
    canvas.save(); canvas.scale(vsPulse, vsPulse, midX, clashY);
    for (let i = 3; i >= 1; i--) { duelPaint.color = Color.argb(35 * (4 - i), 250, 204, 21); canvas.drawCircle(midX, clashY, vsR * (1 + i * 0.22), duelPaint); }
    // Médaillon : étoile à pointes derrière, disque nuit, anneau doré
    duelPath.reset();
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12 + time * 0.6, rr = vsR * (i % 2 === 0 ? 1.42 : 1.08);
      if (i === 0) duelPath.moveTo(midX + Math.cos(a) * rr, clashY + Math.sin(a) * rr); else duelPath.lineTo(midX + Math.cos(a) * rr, clashY + Math.sin(a) * rr);
    }
    duelPath.close();
    duelPaint.color = PC('#F59E0B'); canvas.drawPath(duelPath, duelPaint);
    duelPaint.color = Color.WHITE; duelPaint.shader = new RadialGradient(midX, clashY - vsR * 0.3, vsR * 1.3, [PC('#27306A'), PC('#0B1028')], [0, 1]);
    canvas.drawCircle(midX, clashY, vsR, duelPaint); duelPaint.shader = null;
    duelStroke.strokeWidth = w * 0.01; duelStroke.color = PC('#FDE047'); canvas.drawCircle(midX, clashY, vsR, duelStroke);
    drawArcadeText(canvas, 'VS', midX, clashY, w * 0.125, PC('#FF8A1F'), 1);
    canvas.restore();
    // Éclair blanc du choc
    if (hitT < 0.3) { duelPaint.color = Color.argb(Math.round(190 * (1 - hitT / 0.3)), 255, 255, 255); canvas.drawRect(0, 0, w, h, duelPaint); }
  }

  // Note sur le chronomètre et gros bouton « Commencer le duel » en bas
  duelText.style = Style.FILL; duelText.textAlign = Align.CENTER; duelText.textSize = w * 0.032; duelText.color = Color.argb(215, 226, 232, 240);
  canvas.drawText(fitText(tr('duel.tiebreak_note'), duelText, w * 0.9), midX, ub() - w * 0.235, duelText);
  const pulse = 1 + 0.025 * Math.sin(time * 6), bw = w * 0.4 * pulse, bh = w * 0.07 * pulse, bcy = ub() - w * 0.125;
  if (tIn > 0.6) drawButton(canvas, new RectF(midX - bw, bcy - bh, midX + bw, bcy + bh), '⚡ ' + tr('duel.start_btn'), primaryBtnPaint, w * 0.054, () => playDuel(d));
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

/** Rayures en biais qui défilent dans une moitié de l'écran VS (dir : -1 vers la gauche, 1 vers la droite). */
function drawVsStripes(canvas, dir, color) {
  duelStroke.strokeCap = 'butt'; duelStroke.strokeWidth = w * 0.05; duelStroke.color = color;
  const step = w * 0.16, shift = ((time * w * 0.12 * dir) % step + step) % step;
  for (let x = -h * 0.3 - step + shift; x < w + step; x += step) canvas.drawLine(x, h, x + h * 0.3, 0, duelStroke);
  duelStroke.strokeCap = 'round';
}

// ---------- Fin d'un essai ----------

function endDuelRun(reason) {
  state = State.DUEL_END;
  gameOverTime = 0;
  gameOverReason = reason;
  const last = { id: duel.id, score, duration: runTime, info: duel.info, status: 'sending' };
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
  return i ? tr('duel.vs', { a: Math.max(i.myBest, score), name: duelName(i), b: i.theirBest }) : '';
}

/** Fin d'un essai : score doré, temps du chrono, où en est le duel, ruban du résultat, puis Réessayer / Duels / Accueil. */
function drawDuelEnd(canvas) {
  const last = duels.last;
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const i = last.info;
  const done = last.status === 'ok' && i && i.status === 'finished';
  const canRetry = last.status === 'ok' && i && i.status === 'active' && (i.attempts === 0 || i.myTries < i.attempts);
  const bh = w * 0.13, sh = w * 0.115, left = w * 0.08, right = w * 0.92;
  const ph = w * (0.99 + (done ? 0.14 : 0)) + (canRetry ? bh + w * 0.04 : 0);
  const top = Math.max(insetTop + w * 0.04, (insetTop + ub()) / 2 - ph / 2), bottom = top + ph, cx = w / 2;
  drawPanel(canvas, new RectF(left, top, right, bottom), '⚔️ ' + (i ? tr('duel.against', { name: duelName(i) }) : tr('duel.title')));
  greyTextPaint.textAlign = Align.CENTER;
  if (gameOverReason) { greyTextPaint.textSize = w * 0.036; canvas.drawText(fitText(gameOverReason, greyTextPaint, right - left - w * 0.1), cx, top + w * 0.2, greyTextPaint); }
  const pop = clamp(gameOverTime / 0.35, 0, 1);
  drawGoldNumber(canvas, String(last.score), cx, top + w * 0.415, w * 0.19 * (1.4 - 0.4 * pop) * Math.min(1, 3.2 / Math.max(3.2, String(last.score).length)), pop);
  // Temps précis du chronomètre sur cet essai (il départage les égalités)
  duelText.style = Style.FILL; duelText.shader = null; duelText.textAlign = Align.CENTER; duelText.textSize = w * 0.044; duelText.color = UI.BLUE;
  canvas.drawText('⏱ ' + fmtChronoFull(last.duration || 0), cx, top + w * 0.5, duelText);
  let line;
  if (last.status === 'sending') line = tr('duel.sending');
  else if (last.status === 'error' || !i) line = tr('duel.send_error');
  else line = (i.attempts === 0 ? tr('duel.end_try_inf', { t: i.myTries, mb: i.myBest, name: duelName(i), tb: i.theirBest })
    : tr('duel.end_try', { t: i.myTries, a: i.attempts, mb: i.myBest, name: duelName(i), tb: i.theirBest }));
  drawInfoPill(canvas, cx, top + w * 0.59, line, w * 0.034, right - left - w * 0.06, last.status === 'error' ? UI.RED : UI.SOFT);
  let y = top + w * 0.67;
  if (done) {
    const won = i.result === 'win', draw = i.result === 'draw';
    drawTitleRibbon(canvas, cx, y + w * 0.055, tr(won ? 'duel.win' : draw ? 'duel.draw' : 'duel.loss'), Color.parseColor(won ? '#F5A623' : draw ? '#3B8DF5' : '#66749A'), w * 0.06, w * 0.5);
    y += w * 0.14;
  }
  let by = y + w * 0.01;
  if (canRetry) {
    drawButton(canvas, new RectF(left + w * 0.07, by, right - w * 0.07, by + bh), '↻ ' + tr('duel.retry'), primaryBtnPaint, w * 0.06, () => retryDuel());
    by += bh + w * 0.04;
  }
  drawButton(canvas, new RectF(left + w * 0.07, by, right - w * 0.07, by + sh), '⚔️ ' + tr('duel.title'), backBtnPaint, w * 0.05, () => leaveDuelRun(true));
  by += sh + w * 0.035;
  drawButton(canvas, new RectF(left + w * 0.07, by, right - w * 0.07, by + sh), tr('duel.home'), greyBtnPaint, w * 0.05, () => leaveDuelRun(false));
}

// ---------- Écran Duels ----------

function duelLine(canvas, text, x, y, size, color, maxW, align = Align.LEFT) {
  duelText.style = Style.FILL; duelText.shader = null; duelText.textAlign = align; duelText.textSize = size; duelText.color = color;
  canvas.drawText(fitText(text, duelText, maxW), x, y, duelText);
}

/** Bouton de la liste, seulement s'il est visible (la liste défile sous un masque). */
function listButton(canvas, r, label, paint, size, action) {
  if (r.bottom < duels.listTop || r.top > duels.listBottom) return;
  drawButton(canvas, r, label, paint, size, action);
}

function duelRows() {
  const rank = (d) => (d.status === 'pending' && !d.sent ? 0 : d.status === 'active' ? 1 : d.status === 'pending' ? 2 : 3);
  return duels.list.slice().sort((a, b) => rank(a) - rank(b));
}

/** Lignes de l'onglet Amis : demandes reçues (à valider), demandes envoyées (en attente), puis les amis. */
function friendRows() {
  return [...duels.requests.map((f) => ({ kind: 'request', f })), ...duels.sent.map((f) => ({ kind: 'sent', f })), ...duels.friends.map((f) => ({ kind: 'friend', f }))];
}

function duelScoreLine(d, name) {
  const base = tr('duel.vs', { a: d.myBest, name, b: d.theirBest });
  if (!(d.myTime > 0) && !(d.theirTime > 0)) return base;
  return `${base}  (⏱ ${d.myTime > 0 ? fmtChronoFull(d.myTime) : '—'} / ${d.theirTime > 0 ? fmtChronoFull(d.theirTime) : '—'})`;
}

function drawDuelRow(canvas, d, l, r, y, rh) {
  const name = duelName(d), tx = l + w * 0.04, bw = w * 0.22, inner = r - l - w * 0.08;
  const settings = attemptsLabel(d.attempts) + ' · ' + hoursLabel(d.hours);
  if (d.status === 'pending' && !d.sent) {
    // Défi reçu : carte orangée, Refuser / Accepter
    drawCard(canvas, l, y, r, y + rh, 'warm');
    duelLine(canvas, '⚔️ ' + tr('duel.received', { name }), tx, y + rh * 0.3, w * 0.044, Color.WHITE, inner);
    duelLine(canvas, settings + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), tx, y + rh * 0.52, w * 0.033, Color.parseColor('#F3D9B8'), inner);
    const by = y + rh * 0.61, bh = rh * 0.29;
    listButton(canvas, new RectF(r - w * 0.04 - bw * 2 - w * 0.02, by, r - w * 0.04 - bw - w * 0.02, by + bh), tr('duel.decline'), greyBtnPaint, w * 0.034, () => answerDuel(d, false));
    listButton(canvas, new RectF(r - w * 0.04 - bw, by, r - w * 0.04, by + bh), tr('duel.accept'), primaryBtnPaint, w * 0.034, () => answerDuel(d, true));
  } else if (d.status === 'active') {
    drawCard(canvas, l, y, r, y + rh);
    const canPlay = d.attempts === 0 || d.myTries < d.attempts, textW = inner - (canPlay ? bw + w * 0.02 : 0);
    duelLine(canvas, '⚔️ ' + tr('duel.against', { name }), tx, y + rh * 0.3, w * 0.042, Color.WHITE, textW);
    duelLine(canvas, duelScoreLine(d, name), tx, y + rh * 0.55, w * 0.036, UI.GOLD, textW);
    duelLine(canvas, triesLine(d.myTries, d.attempts) + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), tx, y + rh * 0.8, w * 0.032, UI.SOFT, textW);
    if (canPlay) listButton(canvas, new RectF(r - w * 0.04 - bw, y + rh * 0.3, r - w * 0.04, y + rh * 0.7), '▶ ' + tr('duel.play'), primaryBtnPaint, w * 0.038, () => openDuelVs(d));
  } else if (d.status === 'pending') {
    drawCard(canvas, l, y, r, y + rh);
    duelLine(canvas, '⏳ ' + tr('duel.waiting', { name }), tx, y + rh * 0.4, w * 0.042, Color.WHITE, inner);
    duelLine(canvas, settings + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), tx, y + rh * 0.68, w * 0.033, UI.SOFT, inner);
  } else {
    // Terminé, refusé ou expiré
    const won = d.result === 'win', draw = d.result === 'draw';
    const title = d.status === 'declined' ? tr('duel.declined') : d.status === 'expired' ? tr('duel.expired') : tr(won ? 'duel.win' : draw ? 'duel.draw' : 'duel.loss');
    const icon = won ? '🏆 ' : draw ? '🤝 ' : d.status === 'finished' ? '😞 ' : '✉️ ';
    drawCard(canvas, l, y, r, y + rh, won ? 'gold' : '');
    duelLine(canvas, `${icon}${title} · ${name}`, tx, y + rh * 0.4, w * 0.042, won ? UI.GOLD : d.status === 'finished' && !draw ? UI.RED : Color.WHITE, inner);
    if (d.status === 'finished') duelLine(canvas, duelScoreLine(d, name), tx, y + rh * 0.68, w * 0.033, UI.SOFT, inner);
  }
}

function drawFriendRow(canvas, row, l, r, y, rh) {
  const f = row.f, name = f.pseudo || f.code, tx = l + w * 0.04, x = w * 0.075;
  if (row.kind === 'request') {
    // Demande d'ami reçue : à valider avant de pouvoir se défier
    const bw = w * 0.22, inner = r - l - w * 0.08;
    drawCard(canvas, l, y, r, y + rh, 'warm');
    duelLine(canvas, '🤝 ' + tr('friends.request', { name }), tx, y + rh * 0.36, w * 0.04, Color.WHITE, inner);
    const by = y + rh * 0.52, bh = rh * 0.36;
    duelLine(canvas, tr('friends.record_short', { n: f.best || 0 }), tx, by + bh * 0.68, w * 0.032, Color.parseColor('#F3D9B8'), inner - bw * 2 - w * 0.04);
    listButton(canvas, new RectF(r - w * 0.04 - bw * 2 - w * 0.02, by, r - w * 0.04 - bw - w * 0.02, by + bh), tr('duel.decline'), greyBtnPaint, w * 0.034, () => answerFriend(f, false));
    listButton(canvas, new RectF(r - w * 0.04 - bw, by, r - w * 0.04, by + bh), tr('duel.accept'), primaryBtnPaint, w * 0.034, () => answerFriend(f, true));
  } else if (row.kind === 'sent') {
    drawCard(canvas, l, y, r, y + rh, 'deep');
    const textW = r - l - x - w * 0.1;
    duelLine(canvas, '⏳ ' + name, tx, y + rh * 0.42, w * 0.042, UI.SOFT, textW);
    duelLine(canvas, tr('friends.waiting'), tx, y + rh * 0.74, w * 0.032, UI.DIM, textW);
    listButton(canvas, new RectF(r - w * 0.03 - x, y + rh * 0.28, r - w * 0.03, y + rh * 0.72), '✕', greyBtnPaint, w * 0.04, () => cancelFriendRequest(f));
  } else {
    const bw = w * 0.2, textW = r - l - bw - x - w * 0.1;
    drawCard(canvas, l, y, r, y + rh);
    duelLine(canvas, name, tx, y + rh * 0.42, w * 0.044, Color.WHITE, textW);
    duelLine(canvas, tr('friends.record', { n: f.best, w: f.wins, l: f.losses }), tx, y + rh * 0.74, w * 0.032, UI.GOLD, textW);
    listButton(canvas, new RectF(r - w * 0.03 - x - w * 0.02 - bw, y + rh * 0.24, r - w * 0.03 - x - w * 0.02, y + rh * 0.76), tr('friends.challenge'), accentPaint, w * 0.036, () => {
      duels.challenge = { friend: f, attempts: 3, hours: 24 };
    });
    listButton(canvas, new RectF(r - w * 0.03 - x, y + rh * 0.28, r - w * 0.03, y + rh * 0.72), '✕', greyBtnPaint, w * 0.04, () => askRemoveFriend(f));
  }
}

function drawDuels(canvas) {
  if (duels.vs) {
    drawDuelVs(canvas, duels.vs);
    return;
  }
  const left = w * 0.04, right = w * 0.96, top = insetTop + h * 0.03, bottom = ub() - h * 0.02;
  panel(canvas, left, top, right, bottom, '⚔️ ' + tr('duel.title'), () => closeDuels());
  const l = left + w * 0.05, r = right - w * 0.05;
  // Ton code ami, dans une carte : Copier / Partager
  let y = top + panelHeaderH() + w * 0.02;
  drawCard(canvas, l, y, r, y + w * 0.17);
  duelLine(canvas, tr('friends.your_code'), l + w * 0.035, y + w * 0.06, w * 0.034, UI.SOFT, w * 0.36);
  duelLine(canvas, myCode(), l + w * 0.035, y + w * 0.135, w * 0.07, UI.GOLD, w * 0.36);
  const bw = w * 0.2, bh = w * 0.09, cby = y + w * 0.04;
  drawButton(canvas, new RectF(r - bw * 2 - w * 0.045, cby, r - bw - w * 0.045, cby + bh), tr('friends.copy'), greyBtnPaint, w * 0.034, () => copyCode());
  drawButton(canvas, new RectF(r - bw - w * 0.025, cby, r - w * 0.025, cby + bh), tr('friends.share'), backBtnPaint, w * 0.034, () => shareCode());
  y += w * 0.21;
  // Onglets (avec ce qui attend le joueur : défis reçus et demandes d'ami)
  const nd = duelsOnlyBadge(), nf = duels.requests.length || duels.friends.length;
  const tabs = [tr('duel.tab_duels') + (nd ? ` (${nd})` : ''), tr('duel.tab_friends') + (nf ? ` (${nf})` : '')];
  const tw = (r - l) / 2, tabH = w * 0.1;
  tabs.forEach((label, i) => drawButton(canvas, new RectF(l + i * tw + w * 0.006, y, l + (i + 1) * tw - w * 0.006, y + tabH), label,
    duels.tab === i ? tabOnPaint : tabOffPaint, w * 0.04, () => { duels.tab = i; duels.scroll = 0; if (i === 0) markDuelsSeen(); }));
  // Pastille rouge sur l'onglet Amis : une demande d'ami attend
  if (duels.requests.length && duels.tab !== 1) drawRedDot(canvas, l + tw * 2 - w * 0.03, y + w * 0.012, w * 0.018);
  // Liste défilable (onglet Amis : bouton « Ajouter un ami » en bas)
  const footerH = duels.tab === 1 ? w * 0.15 : 0;
  const listTop = y + tabH + w * 0.04, listBottom = bottom - footerH - w * 0.04;
  duels.listTop = listTop; duels.listBottom = listBottom;
  const rows = duels.tab === 0 ? duelRows() : friendRows();
  const rh = duels.tab === 0 ? w * 0.25 : w * 0.19, gap = w * 0.025;
  duels.maxScroll = Math.max(0, rows.length * (rh + gap) - (listBottom - listTop));
  duels.scroll = clamp(duels.scroll, 0, duels.maxScroll);
  const mid = (listTop + listBottom) / 2;
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.04;
  if (duels.status === 'error' && !rows.length) canvas.drawText(tr('duel.offline'), w / 2, mid, greyTextPaint);
  else if (duels.status === 'loading' && !rows.length) canvas.drawText(tr('board.loading'), w / 2, mid, greyTextPaint);
  else if (!rows.length) wrapText(tr(duels.tab === 0 ? 'duel.none' : 'friends.none'), greyTextPaint, r - l - w * 0.06).forEach((ln, i) => canvas.drawText(ln, w / 2, mid + i * w * 0.058, greyTextPaint));
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
    drawButton(canvas, new RectF(l, fy, r, fy + w * 0.115), '+ ' + tr('friends.add'), primaryBtnPaint, w * 0.045, () => askAddFriend());
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
    duelPaint.shader = null; duelPaint.color = Color.argb(240, 44, 58, 106);
    rect.set(w / 2 - tw2 / 2, bottom - footerH - w * 0.12, w / 2 + tw2 / 2, bottom - footerH - w * 0.03);
    canvas.drawRoundRect(rect, rect.height() / 2, rect.height() / 2, duelPaint);
    duelStroke.strokeWidth = w * 0.004; duelStroke.color = UI.GOLD_LO; canvas.drawRoundRect(rect, rect.height() / 2, rect.height() / 2, duelStroke);
    canvas.drawText(t, w / 2, rect.centerY() + w * 0.014, textPaint);
  }
}

/** Fenêtre « Défier Léa » : essais et durée en pastilles (sans mise en pièces). */
function drawChallengeDialog(canvas) {
  const c = duels.challenge;
  buttons.length = 0;
  const left = w * 0.06, right = w * 0.94, ph = w * 0.88;
  const top = (insetTop + ub()) / 2 - ph / 2, bottom = top + ph;
  panel(canvas, left, top, right, bottom, tr('duel.challenge_title', { name: c.friend.pseudo || c.friend.code }), () => { duels.challenge = null; });
  const l = left + w * 0.06, r = right - w * 0.06;
  let y = top + panelHeaderH() + w * 0.08;
  const chips = (label, values, current, text, set) => {
    duelLine(canvas, label, l, y, w * 0.042, Color.WHITE, r - l);
    y += w * 0.04;
    const n = values.length, cw = (r - l) / n;
    values.forEach((v, i) => drawButton(canvas, new RectF(l + i * cw + w * 0.008, y, l + (i + 1) * cw - w * 0.008, y + w * 0.1), text(v),
      v === current ? tabOnPaint : tabOffPaint, w * 0.038, () => set(v)));
    y += w * 0.18;
  };
  chips(tr('duel.attempts'), DUEL_ATTEMPT_CHOICES, c.attempts, (v) => (v === 0 ? '∞' : String(v)), (v) => { c.attempts = v; });
  chips(tr('duel.duration'), DUEL_HOUR_CHOICES, c.hours, hoursLabel, (v) => { c.hours = v; });
  const by = bottom - w * 0.2;
  drawButton(canvas, new RectF(l, by, l + (r - l) * 0.42, by + w * 0.12), tr('common.cancel'), greyBtnPaint, w * 0.045, () => { duels.challenge = null; });
  drawButton(canvas, new RectF(r - (r - l) * 0.54, by, r, by + w * 0.12), '⚔️ ' + tr('duel.send'), primaryBtnPaint, w * 0.05, () => sendChallenge());
}

// ---------- Défilement de la liste au doigt ----------
function duelsPointerDown(x, y) {
  if (state !== State.DUELS || duels.challenge || duels.vs || y < duels.listTop || y > duels.listBottom) return false;
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
