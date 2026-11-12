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
  list: [], friends: [], requests: [], sent: [], vsAt: 0, vsHit: false, fightAt: -1, fightSent: false, sparks: [], loadedAt: 0, vel: 0, lastY: 0, lastT: 0, stats: null, statsBusy: false, busy: false, status: 'idle', tab: 0, returnState: null,
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
    if (sec >= 1 && sec <= DUEL_COUNT && sec !== duel.lastSec) {
      // Chaque chiffre « frappe » l'écran
      duel.lastSec = sec;
      vibrate(25); shake(0.05);
      if (!duel.voice) sounds.play('STAR', 0.75, 0.75 + (DUEL_COUNT - sec) * 0.1);
    }
    if (duel.countdown <= 0) {
      duel.goT = DUEL_GO_T;
      duel.goAt = performance.now();
      duel.lastSec = 0;
      vibrate(50); shake(0.14);
      if (!duel.voice) sounds.play('GREAT', 1, 1.15);
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
  const clock = duelClock(), secFrac = clock - Math.floor(clock);
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
  const [mainStr, csStr] = fmtChronoParts(clock);
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
    const sec = clamp(Math.ceil(duel.countdown), 1, DUEL_COUNT);
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
    for (let i = 0; i < DUEL_COUNT; i++) {
      const lit = i < sec, x = cx + (i - (DUEL_COUNT - 1) / 2) * gap, r = w * 0.024 * (lit && i === sec - 1 ? 1 + 0.35 * (1 - elapsed) : 1);
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
    // Le dernier mot suit la voix : « GO ! », ou « 0 » quand la voix dit « zéro »
    const go = duel.goLabel;
    drawArcadeText(canvas, go, cx, cy, go.length <= 1 ? w * 0.46 : w * 0.3, Color.parseColor('#3DFF7A'), alpha);
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
  Telemetry.track('share', { what: 'code' });
  const text = tr('friends.share_text', { code: myCode() });
  if (navigator.share) navigator.share({ text }).catch(() => {}); else copyCode();
}

function askAddFriend() {
  askText({ title: tr('friends.add'), msg: tr('friends.add_info'), max: 6, code: true }, (v) => {
    if (!v) return;
    online.addFriend(v.toUpperCase()).then((r) => {
      // Demande envoyée : l'ami doit l'accepter avant qu'on puisse se défier
      if (r.ok) { Telemetry.track('friend', { what: 'sent' }); duelToast(tr(r.pending ? 'friends.request_sent' : 'friends.added', { name: r.pseudo || v.toUpperCase() })); duels.tab = 1; refreshDuels(true); }
      else duelToast(tr(r.error === 'offline' ? 'duel.error' : 'friends.err_' + r.error));
    });
  });
}

/** Réponse à une demande d'ami reçue. */
function answerFriend(f, accept) {
  online.answerFriend(f.code, accept).then((r) => {
    if (r === 'ok') { if (accept) { duelToast(tr('friends.added', { name: f.pseudo || f.code })); Telemetry.track('friend', { what: 'accepted' }); } }
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
    Telemetry.track('duel', { what: 'sent' });
    duels.tab = 0; duels.scroll = 0; refreshDuels(true);
  });
}

function answerDuel(d, accept) {
  online.answer(d.id, accept, myLookCode()).then(({ code, json }) => {
    if (code !== 200) { duelToast(tr(code === 409 ? 'duel.over' : 'duel.error')); refreshDuels(true); return; }
    if (accept && json) {
      Telemetry.track('duel', { what: 'accepted' });
      // Dès qu'on accepte une partie, on ouvre la page de présentation arcade « VS »
      openDuelVs(json);
    }
    refreshDuels(true);
  });
}

/** Ouvre l'écran de présentation arcade « VS » avant de lancer le duel (les combattants entrent en scène). */
function openDuelVs(d) {
  duels.challenge = null;
  duels.vs = d; duels.vsAt = time; duels.vsHit = false; duels.fightAt = -1; duels.fightSent = false;
  sounds.play('WHOOSH', 0.8, 1.2);
}

/** Commence un essai (compté par le serveur), puis la partie sur la map du duel avec le compte à rebours. */
function playDuel(dOrId) {
  const id = typeof dOrId === 'number' ? dOrId : dOrId.id;
  online.startTry(id, myLookCode()).then(({ code, json }) => {
    if (code === 200) { Telemetry.track('duel', { what: 'try' }); duels.challenge = null; duels.vs = null; startDuelRun(json.seed, json.id, json); return; }
    duels.vs = null;
    duelToast(code === 0 ? tr('duel.error') : json && json.error === "plus d'essais" ? tr('duel.no_tries') : tr('duel.over'));
    refreshDuels(true);
  });
}

// ---------- Écran de présentation Arcade « VS » ----------
/*
 * Écran « VS » façon jeu de combat arcade (équivalent de DuelUi.kt), palette bleu électrique / orange feu : diagonale
 * blanche, lignes de vitesse, effet cathodique. Les combattants entrent en glissant et se posent au même niveau, pseudo
 * dans un cartouche en biais au-dessus ; le « VS » (Teko), électrisé, s'écrase en haut au-dessus d'eux. « Commencer »
 * fait claquer un « DUEL ! » avant de lancer l'essai.
 */
const VS_SPARKS = 36;
const VS = {
  L0: Color.parseColor('#04122E'), L1: Color.parseColor('#0D47A1'), LG: Color.parseColor('#29B6F6'),
  R0: Color.parseColor('#2A0700'), R1: Color.parseColor('#D84315'), RG: Color.parseColor('#FFAB40'),
  GOLD: Color.parseColor('#FFE082'), INK: Color.parseColor('#1A1A1A'),
  FIRE: [Color.parseColor('#FFFDE7'), Color.parseColor('#FFD54F'), Color.parseColor('#FF6F00'), Color.parseColor('#B71C1C')],
  FIRE_POS: [0, 0.35, 0.62, 1]
};
const vsWordPaint = new Paint({ family: 'Teko', textAlign: Align.CENTER, strokeJoin: 'round' });
const vsSlashX = (y) => w * 0.6 - (y / h) * w * 0.2;
const vsEase = (x) => 1 - (1 - clamp(x, 0, 1)) ** 3;

function drawLightningBolt(canvas, x0, y0, x1, y1, seed, mainBolt) {
  const steps = mainBolt ? 9 : 6;
  const dx = (x1 - x0) / steps, dy = (y1 - y0) / steps, len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const amp = mainBolt ? w * 0.045 : Math.min(w * 0.028, len * 0.22);
  duelPath.reset();
  duelPath.moveTo(x0, y0);
  let hSeed = seed | 0;
  for (let i = 1; i < steps; i++) {
    hSeed = (Math.imul(hSeed, 1103515245) + 12345) & 0x7fffffff;
    const jitter = ((hSeed % 200) / 100 - 1) * amp;
    duelPath.lineTo(x0 + dx * i - dy / len * jitter, y0 + dy * i + dx / len * jitter);
  }
  duelPath.lineTo(x1, y1);
  // Halo électrique bleu, puis cœur blanc incandescent
  duelStroke.strokeWidth = mainBolt ? w * 0.024 : w * 0.012;
  duelStroke.color = Color.argb(150, 64, 196, 255);
  canvas.drawPath(duelPath, duelStroke);
  duelStroke.strokeWidth = mainBolt ? w * 0.008 : w * 0.004;
  duelStroke.color = Color.WHITE;
  canvas.drawPath(duelPath, duelStroke);
}

/** Mot arcade (Teko) : contour noir décalé, contour sombre, liseré blanc, dégradé feu, reflet ; electric = arcs autour. */
function drawVsWord(canvas, text, cx, cy, size, scale, electric) {
  const t = vsWordPaint;
  canvas.save(); canvas.translate(cx, cy); canvas.scale(scale, scale); canvas.rotate(-4.5);
  t.textSize = size; t.shader = null;
  const mc = Canvas.measureCtx; mc.font = t.font();
  const m = mc.measureText(text), asc = m.actualBoundingBoxAscent || size * 0.62, desc = m.actualBoundingBoxDescent || 0;
  const base = (asc - desc) / 2, top = base - asc, bottom = base + desc, half = m.width / 2;
  t.style = Style.STROKE;
  if (electric) {
    const flick = Math.abs(Math.sin(time * 31) * Math.sin(time * 13));
    t.color = Color.argb(Math.round(60 + 150 * flick), 90, 210, 255); t.strokeWidth = size * (0.22 + 0.03 * flick);
    canvas.drawText(text, size * 0.025, base + size * 0.035, t);
  }
  t.color = Color.BLACK; t.strokeWidth = size * 0.19; canvas.drawText(text, size * 0.05, base + size * 0.07, t);
  t.color = VS.INK; t.strokeWidth = size * 0.13; canvas.drawText(text, 0, base, t);
  t.color = Color.WHITE; t.strokeWidth = size * 0.045; canvas.drawText(text, 0, base, t);
  t.style = Style.FILL; t.color = Color.WHITE;
  t.shader = new LinearGradient(0, top, 0, bottom, VS.FIRE, VS.FIRE_POS);
  canvas.drawText(text, 0, base, t);
  t.shader = null;
  canvas.save(); canvas.clipRect(-size * 2, top, size * 2, top + (bottom - top) * 0.28);
  t.color = Color.argb(130, 255, 255, 255); canvas.drawText(text, 0, base, t);
  canvas.restore();
  if (electric) {
    // Arcs qui crépitent vers l'extérieur des lettres, redessinés ~14 fois par seconde
    const tick = Math.floor(time * 14), pad = size * 0.1;
    let hs = Math.imul(tick, 2654435761) | 0;
    const r = () => { hs = (Math.imul(hs, 1103515245) + 12345) & 0x7fffffff; return (hs % 1000) / 1000; };
    for (let i = 0; i < 5; i++) {
      const side = r(); let x0, y0, ang;
      if (side < 0.3) { x0 = -half * 0.8 + r() * half * 1.6; y0 = top - pad; ang = -1.57 + (r() - 0.5) * 1.6; }
      else if (side < 0.6) { x0 = -half * 0.8 + r() * half * 1.6; y0 = bottom + pad; ang = 1.57 + (r() - 0.5) * 1.6; }
      else if (side < 0.8) { x0 = -half - pad; y0 = top + r() * (bottom - top); ang = 3.14 + (r() - 0.5) * 1.6; }
      else { x0 = half + pad; y0 = top + r() * (bottom - top); ang = (r() - 0.5) * 1.6; }
      const len = size * (0.16 + r() * 0.18);
      drawLightningBolt(canvas, x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len, tick * 97 + i * 13, false);
    }
    if (tick % 5 < 2) drawLightningBolt(canvas, -half * 0.6, top - pad, half * 0.6, top - pad * 1.6, tick * 31 + 7, false);
  }
  canvas.restore();
}

/** Un combattant : faisceau lumineux, podium, avatar qui respire, pseudo dans un cartouche en biais au-dessus. */
function drawVsFighter(canvas, cx, dir, off, feetY, plateY, name, tag, best, bestTime, tries, glow, fill, drawChar) {
  canvas.save(); canvas.translate(dir * off, 0);
  const pw = w * 0.19, ph = w * 0.043;
  duelPath.reset(); duelPath.moveTo(cx - pw, feetY); duelPath.lineTo(cx - pw * 0.48, feetY - w * 0.6);
  duelPath.lineTo(cx + pw * 0.48, feetY - w * 0.6); duelPath.lineTo(cx + pw, feetY); duelPath.close();
  duelPaint.shader = null; duelPaint.color = glow; duelPaint.alpha = 42; canvas.drawPath(duelPath, duelPaint);
  duelPaint.color = Color.argb(115, 0, 0, 0); rect.set(cx - pw, feetY - ph, cx + pw, feetY + ph); canvas.drawOval(rect, duelPaint);
  duelStroke.strokeWidth = w * 0.009; duelStroke.color = glow; canvas.drawOval(rect, duelStroke);
  const bob = Math.sin(time * 5 + (dir > 0 ? 1.6 : 0)) * 0.03, charScale = w * 0.3 / k;
  canvas.save(); canvas.translate(cx, feetY); canvas.scale(charScale * (1 - bob * 0.5), charScale * (1 + bob), 0, 0);
  drawChar();
  canvas.restore();
  // Cartouche du pseudo, en biais, qui part du bord de l'écran
  const cardW = w * 0.42, nameH = w * 0.115, sk = w * 0.04;
  duelPath.reset();
  if (dir < 0) { duelPath.moveTo(-w * 0.05, plateY); duelPath.lineTo(cx + cardW / 2 + sk, plateY); duelPath.lineTo(cx + cardW / 2 - sk, plateY + nameH); duelPath.lineTo(-w * 0.05, plateY + nameH); }
  else { duelPath.moveTo(cx - cardW / 2 + sk, plateY); duelPath.lineTo(w * 1.05, plateY); duelPath.lineTo(w * 1.05, plateY + nameH); duelPath.lineTo(cx - cardW / 2 - sk, plateY + nameH); }
  duelPath.close();
  duelPaint.color = Color.argb(140, 0, 0, 0); canvas.save(); canvas.translate(0, w * 0.012); canvas.drawPath(duelPath, duelPaint); canvas.restore();
  duelPaint.color = fill; canvas.drawPath(duelPath, duelPaint);
  duelStroke.strokeJoin = 'miter'; duelStroke.strokeWidth = w * 0.009; duelStroke.color = glow; canvas.drawPath(duelPath, duelStroke); duelStroke.strokeJoin = 'round';
  const t = duelText;
  t.shader = null; t.textAlign = Align.CENTER; t.textSize = w * 0.058;
  const label = fitText(String(name).toUpperCase(), t, cardW - w * 0.08), ty = plateY + nameH / 2 - (t.descent() + t.ascent()) / 2;
  t.style = Style.STROKE; t.strokeJoin = 'round'; t.strokeWidth = w * 0.014; t.color = Color.BLACK; canvas.drawText(label, cx, ty, t);
  t.style = Style.FILL; t.color = Color.WHITE; canvas.drawText(label, cx, ty, t);
  t.textSize = w * 0.036; t.color = glow; t.textAlign = dir < 0 ? Align.LEFT : Align.RIGHT;
  canvas.drawText(tag, dir < 0 ? w * 0.05 : w * 0.95, plateY - w * 0.02, t);
  t.textAlign = Align.CENTER;
  if (tries > 0) {
    t.textSize = w * 0.04; t.color = VS.GOLD;
    canvas.drawText(fitText(`🏆 ${best}` + (bestTime > 0 ? ` · ⏱ ${fmtChronoFull(bestTime)}` : ''), t, w * 0.44), cx, feetY + w * 0.11, t);
  }
  canvas.restore();
}

function drawDuelVs(canvas, d) {
  buttons.length = 0;
  const midX = w * 0.5, tIn = time - duels.vsAt, slide = vsEase(tIn / 0.4), hitT = tIn - 0.45;
  const span = ub() - insetTop, vsY = insetTop + span * 0.225, plateY = insetTop + span * 0.37, feetY = insetTop + span * 0.6;
  const vsX = vsSlashX(vsY) - w * 0.02;
  if (hitT >= 0 && !duels.vsHit) {
    duels.vsHit = true; vibrate(40); sounds.play('STRIKE', 0.5, 1.3);
    duels.sparks = [];
    for (let i = 0; i < VS_SPARKS; i++) { const a = rnd() * 6.283, sp = 0.45 + rnd() * 1.3; duels.sparks.push([Math.cos(a) * sp, Math.sin(a) * sp, 0.5 + rnd() * 0.5]); }
  }
  canvas.save();
  if (hitT >= 0 && hitT <= 0.35) { const kk = (1 - hitT / 0.35) * w * 0.022; canvas.translate((rnd() - 0.5) * kk, (rnd() - 0.5) * kk); }
  // Deux camps : bleu électrique pour nous, orange feu pour l'adversaire
  duelPaint.color = Color.WHITE; duelPaint.shader = new LinearGradient(0, 0, w * 0.6, h, VS.L0, VS.L1);
  canvas.drawRect(-w * 0.05, -h * 0.05, w * 1.05, h * 1.05, duelPaint);
  duelPath.reset(); duelPath.moveTo(vsSlashX(-h * 0.05), -h * 0.05); duelPath.lineTo(w * 1.05, -h * 0.05);
  duelPath.lineTo(w * 1.05, h * 1.05); duelPath.lineTo(vsSlashX(h * 1.05), h * 1.05); duelPath.close();
  duelPaint.shader = new LinearGradient(w, 0, w * 0.4, h, VS.R0, VS.R1); canvas.drawPath(duelPath, duelPaint); duelPaint.shader = null;
  // Lignes de vitesse vers le centre
  duelStroke.strokeCap = 'butt';
  for (let i = 0; i < 26; i++) {
    const y = ((i * 53.3 + i * i * 7) / 660 * h) % h, len = w * (0.12 + ((i * 37) % 90) / 330);
    const sp = (tIn * (1.15 + (i % 5) * 0.27) * w + i * w * 0.36) % (w * 0.9), sx = vsSlashX(y);
    duelStroke.strokeWidth = w * 0.003 * (1 + i % 3);
    if (i % 2 === 0) { duelStroke.color = Color.argb(30, 255, 255, 255); const x = -len + sp; if (x < sx) canvas.drawLine(x, y, Math.min(x + len, sx), y, duelStroke); }
    else { duelStroke.color = Color.argb(30, 255, 230, 200); const x = w + len - sp; if (x > sx) canvas.drawLine(x, y, Math.max(x - len, sx), y, duelStroke); }
  }
  // Écran cathodique, puis la diagonale blanche qui vibre après le choc
  duelPaint.color = Color.argb(70, 0, 0, 0);
  const step = Math.max(3, w * 0.011);
  for (let y = 0; y < h; y += step) canvas.drawRect(0, y, w, y + Math.max(1, step * 0.3), duelPaint);
  duelStroke.color = Color.argb(230, 255, 255, 255);
  duelStroke.strokeWidth = hitT > 0 ? w * (0.012 + 0.0045 * Math.sin(time * 40)) : w * 0.006;
  canvas.drawLine(vsSlashX(0), 0, vsSlashX(h), h, duelStroke);
  duelStroke.strokeCap = 'round';
  // En-tête : retour (même bouton que le reste du jeu) et infos du duel
  const hy = topBarCy();
  drawTopLeftButton(canvas, hy, w * TOP_BTN, true, () => { duels.vs = null; });
  duelText.style = Style.FILL; duelText.shader = null; duelText.textAlign = Align.CENTER;
  duelText.textSize = w * 0.055; duelText.color = Color.WHITE;
  canvas.drawText('⚔️ ' + tr('duel.title').toUpperCase(), midX + w * 0.04, hy + w * 0.005, duelText);
  duelText.textSize = w * 0.033; duelText.color = Color.argb(215, 226, 232, 240);
  canvas.drawText(fitText(triesLine(d.myTries, d.attempts) + ' · ' + tr('duel.left', { t: fmtLeft(d.remaining) }), duelText, w * 0.68), midX + w * 0.04, hy + w * 0.055, duelText);
  // Les deux combattants, au même niveau
  const off = (1 - slide) * w;
  drawVsFighter(canvas, w * 0.25, -1, off, feetY, plateY, profile.pseudo || tr('board.you'), 'P1', d.myBest, d.myTime || 0, d.myTries,
    VS.LG, Color.argb(235, 5, 15, 40), () => drawCharacter(canvas, 0, 0, 0, 1, 1, true, false, false));
  drawVsFighter(canvas, w * 0.75, 1, off, feetY, plateY, duelName(d), 'P2', theirScore(d), d.hidden ? 0 : d.theirTime || 0, d.theirTries,
    VS.RG, Color.argb(235, 40, 6, 2), () => drawOpponentCharacter(canvas, d));
  // Le « VS » électrisé s'écrase en haut
  if (hitT >= 0) {
    if (hitT < 0.6) {
      duelStroke.color = Color.argb(Math.round(255 * (1 - hitT / 0.6)), 255, 236, 179); duelStroke.strokeWidth = w * 0.03 * (1 - hitT / 0.6);
      canvas.drawCircle(vsX, vsY, w * 0.09 + hitT * w * 1.27, duelStroke);
    }
    const damp = (1 - Math.exp(-3 * hitT)) / 3, tail = Math.exp(-3 * hitT) * 0.03;
    duelStroke.strokeWidth = w * 0.0075;
    (duels.sparks || []).forEach(([vxs, vys, l0], i) => {
      const life = l0 - hitT; if (life <= 0) return;
      const vx = vxs * w, vy = vys * w, x = vsX + vx * damp, y = vsY + vy * damp + w * 0.25 * hitT * hitT;
      duelStroke.color = Color.argb(Math.round(255 * Math.min(1, life)), 255, 180 + (i * 37) % 70, 60);
      canvas.drawLine(x, y, x - vx * tail, y - vy * tail, duelStroke);
    });
    const slam = clamp(hitT / 0.14, 0, 1);
    drawVsWord(canvas, 'VS', vsX, vsY, w * 0.33, 3 - 2 * vsEase(slam) + 0.015 * Math.sin(time * 7), slam >= 1);
    if (hitT < 0.25) { duelPaint.color = Color.argb(Math.round(215 * (1 - hitT / 0.25)), 255, 255, 255); canvas.drawRect(-w * 0.05, -h * 0.05, w * 1.05, h * 1.05, duelPaint); }
  }
  canvas.restore();
  // Note sur le chronomètre et gros bouton « Commencer le duel »
  duelText.style = Style.FILL; duelText.textAlign = Align.CENTER; duelText.textSize = w * 0.032; duelText.color = Color.argb(215, 226, 232, 240);
  canvas.drawText(fitText(tr('duel.tiebreak_note'), duelText, w * 0.9), midX, ub() - w * 0.235, duelText);
  const pulse = 1 + 0.025 * Math.sin(time * 6), bw = w * 0.4 * pulse, bh = w * 0.07 * pulse, bcy = ub() - w * 0.125;
  if (tIn > 0.6 && duels.fightAt < 0) drawButton(canvas, new RectF(midX - bw, bcy - bh, midX + bw, bcy + bh), '⚡ ' + tr('duel.start_btn'), primaryBtnPaint, w * 0.054, () => {
    duels.fightAt = time; sounds.play('STRIKE', 0.6, 1.1); vibrate(40);
  });
  // « DUEL ! » plein écran, puis l'essai commence
  if (duels.fightAt >= 0) {
    const f = time - duels.fightAt;
    duelPaint.color = Color.argb(Math.round(140 * Math.min(1, f * 3)), 0, 0, 0); canvas.drawRect(0, 0, w, h, duelPaint);
    drawVsWord(canvas, tr('duel.fight'), midX, insetTop + span * 0.45, w * 0.34, f < 0.15 ? 2.5 - 1.5 * (f / 0.15) : 1, f >= 0.15);
    if (f > 0.75 && !duels.fightSent) { duels.fightSent = true; playDuel(d); }
  }
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

// ---------- Fin d'un essai ----------

function endDuelRun(reason) {
  state = State.DUEL_END;
  gameOverTime = 0;
  gameOverReason = reason;
  if (duel.goAt && !duel.stopAt) duel.stopAt = performance.now();
  const clock = duelClock();
  Telemetry.track('duel', { what: 'done', score });
  const last = { id: duel.id, score, duration: clock, info: duel.info, status: 'sending' };
  duels.last = last;
  sounds.playGameOver(() => {});
  online.sendTry(duel.id, score, clock, jumps).then(({ code, json }) => {
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
  return i ? tr('duel.vs', { a: Math.max(i.myBest, score), name: duelName(i), b: theirScore(i) }) : '';
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
  else line = (i.attempts === 0 ? tr('duel.end_try_inf', { t: i.myTries, mb: i.myBest, name: duelName(i), tb: theirScore(i) })
    : tr('duel.end_try', { t: i.myTries, a: i.attempts, mb: i.myBest, name: duelName(i), tb: theirScore(i) }));
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

/** Score de l'adversaire à afficher : « ? » tant que le duel n'est pas terminé (le serveur le cache). */
function theirScore(d) { return d.hidden || d.theirBest == null ? '?' : String(d.theirBest); }

function duelScoreLine(d, name) {
  const base = tr('duel.vs', { a: d.myBest, name, b: theirScore(d) });
  const theirs = !d.hidden && d.theirTime > 0;
  if (!(d.myTime > 0) && !theirs) return base;
  return `${base}  (⏱ ${d.myTime > 0 ? fmtChronoFull(d.myTime) : '—'} / ${theirs ? fmtChronoFull(d.theirTime) : '—'})`;
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
    // Duel terminé : bouton rond « partager » à droite (image du vainqueur et du vaincu)
    const shareR = w * 0.055, textW = d.status === 'finished' ? inner - shareR * 2.4 : inner;
    duelLine(canvas, `${icon}${title} · ${name}`, tx, y + rh * 0.4, w * 0.042, won ? UI.GOLD : d.status === 'finished' && !draw ? UI.RED : Color.WHITE, textW);
    if (d.status === 'finished') {
      duelLine(canvas, duelScoreLine(d, name), tx, y + rh * 0.68, w * 0.033, UI.SOFT, textW);
      drawShareDuelButton(canvas, r - w * 0.04 - shareR, y + rh / 2, shareR, () => shareDuel(d));
    }
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
  const tabs = [tr('duel.tab_duels') + (nd ? ` (${nd})` : ''), tr('duel.tab_friends') + (nf ? ` (${nf})` : ''), '📊 ' + tr('duel.tab_stats')];
  const tw = (r - l) / 3, tabH = w * 0.1;
  tabs.forEach((label, i) => drawButton(canvas, new RectF(l + i * tw + w * 0.006, y, l + (i + 1) * tw - w * 0.006, y + tabH), label,
    duels.tab === i ? tabOnPaint : tabOffPaint, w * 0.04, () => { duels.tab = i; duels.scroll = 0; duels.vel = 0; if (i === 0) markDuelsSeen(); if (i === 2) refreshDuelStats(); }));
  // Pastille rouge sur l'onglet Amis : une demande d'ami attend
  if (duels.requests.length && duels.tab !== 1) drawRedDot(canvas, l + tw * 2 - w * 0.03, y + w * 0.012, w * 0.018);
  if (duels.tab === 2) {
    drawDuelStats(canvas, left, right, l, r, y + tabH + w * 0.04, bottom - w * 0.04);
    if (duels.challenge) drawChallengeDialog(canvas);
    return;
  }
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
  duels.vel = 0; duels.lastY = y; duels.lastT = performance.now();
  return true;
}
function duelsPointerMove(y) {
  if (duels.dragY < 0) return;
  if (Math.abs(y - duels.dragY) > w * 0.02) duels.moved = true;
  if (duels.moved) duels.scroll = clamp(duels.dragStart - (y - duels.dragY), 0, duels.maxScroll);
  // Vitesse du doigt (lissée) pour l'élan au lâcher
  const now = performance.now(), dms = now - duels.lastT;
  if (dms > 0) { duels.vel = duels.vel * 0.3 - (y - duels.lastY) * 1000 / dms * 0.7; duels.lastY = y; duels.lastT = now; }
}
/** Élan de la liste après un glissé rapide : elle continue puis ralentit. */
function updateDuelsScroll(dt) {
  if (state !== State.DUELS || duels.dragY >= 0 || duels.vel === 0) return;
  duels.scroll += duels.vel * dt;
  if (duels.scroll <= 0 || duels.scroll >= duels.maxScroll) duels.vel = 0;
  duels.scroll = clamp(duels.scroll, 0, duels.maxScroll);
  duels.vel *= Math.exp(-3.5 * dt);
  if (Math.abs(duels.vel) < w * 0.05) duels.vel = 0;
}
function duelsPointerUp() {
  if (duels.dragY < 0) return;
  // Doigt immobile avant de lâcher : pas d'élan
  if (performance.now() - duels.lastT > 80 || !duels.moved) duels.vel = 0;
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

// ---------- Duels terminés : image à partager et onglet « Stats » (équivalent de DuelShare.kt) ----------
const shareFillW = new Paint(), shareTextW = new Paint({ textAlign: Align.CENTER, bold: true }), sharePathW = new Path();

/** Petit bouton rond bleu « partager », centré en (cx, cy). */
function drawShareDuelButton(canvas, cx, cy, r, action) {
  const hit = new RectF(cx - r * 1.25, cy - r * 1.25, cx + r * 1.25, cy + r * 1.25);
  if (hit.bottom >= duels.listTop && hit.top <= duels.listBottom) buttons.push({ rect: hit, action });
  const down = isPressed(hit) ? r * 0.12 : 0;
  shareFillW.shader = null; shareFillW.color = Color.parseColor('#12408F'); canvas.drawCircle(cx, cy + r * 0.16, r, shareFillW);
  shareFillW.color = Color.WHITE; shareFillW.shader = new LinearGradient(0, cy - r, 0, cy + r, Color.parseColor('#63BBFF'), Color.parseColor('#1F77EE'));
  canvas.drawCircle(cx, cy + down, r, shareFillW); shareFillW.shader = null;
  drawShareGlyph(canvas, cx - r * 0.05, cy + down, r * 0.48);
}

/** Petit générateur pseudo-aléatoire à graine (confettis et feux d'artifice identiques à chaque image et sur Android). */
function shareRng(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }

/** Texte (blanc par défaut) cerné de sombre avec une ombre portée, centré en (x, y). */
function shareOutlined(c, text, x, y, size, fill, stroke = '#0A1240') {
  const p = shareTextW;
  p.textSize = size; p.strokeJoin = 'round'; p.shader = null;
  p.style = Style.STROKE; p.strokeWidth = size * 0.2;
  p.color = Color.argb(150, 4, 8, 30); c.drawText(text, x, y + size * 0.09, p);
  p.color = Color.parseColor(stroke); c.drawText(text, x, y, p);
  p.style = Style.FILL; p.color = Color.parseColor(fill); c.drawText(text, x, y, p);
}

/** Étincelle à quatre branches. */
function shareSparkle(c, x, y, r, color) {
  sharePathW.reset();
  sharePathW.moveTo(x, y - r); sharePathW.quadTo(x, y, x + r, y); sharePathW.quadTo(x, y, x, y + r);
  sharePathW.quadTo(x, y, x - r, y); sharePathW.quadTo(x, y, x, y - r); sharePathW.close();
  shareFillW.shader = null; shareFillW.color = color; c.drawPath(sharePathW, shareFillW);
}

/** Feu d'artifice : rayons fins terminés par un point brillant. */
function shareFirework(c, x, y, R, col, tip, rnd) {
  shareFillW.color = Color.WHITE;
  shareFillW.shader = new RadialGradient(x, y, R * 0.55, [Color.argb(110, 255, 255, 255), Color.argb(0, 255, 255, 255)], [0, 1]);
  c.drawCircle(x, y, R * 0.55, shareFillW); shareFillW.shader = null;
  const n = 30;
  shareLineW.strokeWidth = R * 0.022; shareLineW.color = col;
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n + rnd() * 0.08, r1 = R * (0.75 + rnd() * 0.25), r0 = R * 0.22;
    c.drawLine(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, shareLineW);
    shareFillW.color = tip; c.drawCircle(x + Math.cos(a) * r1, y + Math.sin(a) * r1, R * 0.03, shareFillW);
  }
}

/** Pseudo dans une capsule : orange vernie pour le vainqueur, ardoise pour le vaincu. */
function sharePlate(c, cx, cy, name, size, gold, W) {
  const p = shareTextW; p.textSize = size; p.style = Style.FILL;
  const label = ellipsize(name, p, W * 0.38), lw = p.measureText(label) + size * 1.6, hh = size * 0.82;
  const r = new RectF(cx - lw / 2, cy - hh, cx + lw / 2, cy + hh);
  shareFillW.shader = null; shareFillW.color = Color.parseColor(gold ? '#7A3300' : '#0D111C');
  c.drawRoundRect(new RectF(r.left - size * 0.1, r.top - size * 0.1, r.right + size * 0.1, r.bottom + size * 0.18), hh * 1.1, hh * 1.1, shareFillW);
  shareFillW.color = Color.WHITE;
  shareFillW.shader = new LinearGradient(0, r.top, 0, r.bottom, Color.parseColor(gold ? '#FFC24F' : '#4A5266'), Color.parseColor(gold ? '#F07A10' : '#262C3D'));
  c.drawRoundRect(r, hh, hh, shareFillW); shareFillW.shader = null;
  shareFillW.color = Color.argb(gold ? 90 : 40, 255, 255, 255);
  c.drawRoundRect(new RectF(r.left + hh * 0.5, r.top + hh * 0.18, r.right - hh * 0.5, r.top + hh * 0.75), hh * 0.3, hh * 0.3, shareFillW);
  p.style = Style.FILL; p.color = Color.parseColor(gold ? '#4A1E00' : '#DDE2EE');
  c.drawText(label, cx, cy + size * 0.36, p);
}

/**
 * Image d'un duel terminé (W × H) : fond bleu nuit à rayons, feux d'artifice et confettis, logo, titre ; le vainqueur
 * en grand sous un projecteur, sur un podium doré, avec sa couronne, son pseudo et son score doré ; le vaincu à côté,
 * gris et aplati en flaque, étourdi, avec son pseudo et son score. Égalité : les deux sur un podium.
 */
function drawDuelShareCard(c, W, H, d) {
  const won = d.result === 'win', draw = d.result === 'draw', me = profile.pseudo || tr('board.you'), opp = duelName(d);
  const rnd = shareRng(20261111);
  // Fond : bleu roi au centre, nuit sur les bords, rayons bleus et violets
  shareFillW.color = Color.WHITE;
  shareFillW.shader = new RadialGradient(W / 2, H * 0.46, H * 0.78, ['#3A6CF0', '#1C3DB0', '#0A1352'].map((x) => Color.parseColor(x)), [0, 0.45, 1]);
  c.drawRect(0, 0, W, H, shareFillW); shareFillW.shader = null;
  const ox = W / 2, oy = H * 0.47, nr = 24;
  for (let i = 0; i < nr; i++) {
    const a0 = i * Math.PI * 2 / nr, a1 = a0 + Math.PI * 2 / nr * 0.5;
    shareFillW.color = i % 2 ? Color.argb(46, 160, 90, 255) : Color.argb(34, 160, 210, 255);
    sharePathW.reset(); sharePathW.moveTo(ox, oy);
    sharePathW.lineTo(ox + Math.cos(a0) * H * 1.2, oy + Math.sin(a0) * H * 1.2); sharePathW.lineTo(ox + Math.cos(a1) * H * 1.2, oy + Math.sin(a1) * H * 1.2);
    sharePathW.close(); c.drawPath(sharePathW, shareFillW);
  }
  shareFirework(c, W * 0.16, H * 0.15, W * 0.2, Color.argb(220, 200, 110, 255), Color.parseColor('#FFC2F2'), rnd);
  shareFirework(c, W * 0.86, H * 0.21, W * 0.17, Color.argb(220, 90, 210, 255), Color.parseColor('#D8F7FF'), rnd);
  shareFirework(c, W * 0.93, H * 0.37, W * 0.07, Color.argb(200, 150, 140, 255), Color.parseColor('#E6E0FF'), rnd);
  // Confettis
  const conf = ['#FF4D6D', '#FFD23F', '#3DDC97', '#4CC9F0', '#B15CFF', '#FF8C42', '#FFFFFF'];
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = rnd() * H * 0.97, cw = W * (0.009 + rnd() * 0.009), ch = cw * (0.45 + rnd() * 0.3), rot = rnd() * 180;
    shareFillW.color = Color.parseColor(conf[Math.floor(rnd() * conf.length)]);
    c.save(); c.translate(x, y); c.rotate(rot); c.drawRect(-cw, -ch, cw, ch, shareFillW); c.restore();
  }
  // Logo et titre
  const lh = H * 0.2;
  if (logoImg.complete && logoImg.naturalWidth) { const lw = lh * LOGO_RATIO; c.drawBitmap(logoImg, W / 2 - lw / 2, H * 0.012, lw, lh); }
  const winnerName = won ? me : opp, loserName = won ? opp : me;
  const title = draw ? tr('duel.share_draw') : tr('duel.share_win', { a: winnerName, b: loserName });
  shareTextW.textSize = W * 0.074;
  let ts = W * 0.074; const tw = shareTextW.measureText(title); if (tw > W * 0.9) ts *= W * 0.9 / tw;
  shareOutlined(c, title, W / 2, H * 0.28, ts, '#FFFFFF');

  // Le vainqueur : projecteur, halo doré, podium en cylindre, personnage, couronne, étincelles
  const champion = (cx, feet, size, name, value, mine, crown) => {
    const pw = size * 0.74, ph = size * 0.16, depth = size * 0.2;
    shareFillW.color = Color.WHITE;
    shareFillW.shader = new LinearGradient(0, H * 0.35, 0, feet, Color.argb(0, 255, 236, 160), Color.argb(110, 255, 226, 130));
    sharePathW.reset(); sharePathW.moveTo(cx - size * 0.22, H * 0.35); sharePathW.lineTo(cx + size * 0.22, H * 0.35);
    sharePathW.lineTo(cx + pw * 1.05, feet); sharePathW.lineTo(cx - pw * 1.05, feet); sharePathW.close(); c.drawPath(sharePathW, shareFillW);
    shareFillW.shader = new RadialGradient(cx, feet - size * 0.45, size * 1.05, [Color.argb(170, 255, 214, 100), Color.argb(60, 255, 190, 80), Color.argb(0, 255, 180, 60)], [0, 0.5, 1]);
    c.drawCircle(cx, feet - size * 0.45, size * 1.05, shareFillW); shareFillW.shader = null;
    // Podium
    shareFillW.color = Color.argb(110, 0, 0, 30); c.drawOval(new RectF(cx - pw * 1.12, feet + depth - ph * 0.6, cx + pw * 1.12, feet + depth + ph * 1.4), shareFillW);
    shareFillW.color = Color.WHITE;
    shareFillW.shader = new LinearGradient(cx - pw, 0, cx + pw, 0, ['#9A5A08', '#FFD46A', '#E8A126', '#8E5206'].map((x) => Color.parseColor(x)), [0, 0.35, 0.7, 1]);
    c.drawOval(new RectF(cx - pw, feet + depth - ph, cx + pw, feet + depth + ph), shareFillW);
    c.drawRect(cx - pw, feet, cx + pw, feet + depth, shareFillW);
    shareFillW.shader = new LinearGradient(0, feet - ph, 0, feet + ph, Color.parseColor('#FFF2B8'), Color.parseColor('#F0B02C'));
    c.drawOval(new RectF(cx - pw, feet - ph, cx + pw, feet + ph), shareFillW); shareFillW.shader = null;
    shareLineW.strokeWidth = size * 0.018; shareLineW.color = Color.parseColor('#FFF8DA');
    c.drawOval(new RectF(cx - pw, feet - ph, cx + pw, feet + ph), shareLineW);
    // Personnage
    const scale = size / k;
    c.save(); c.translate(cx, feet); c.scale(scale, scale);
    if (mine) drawCharacter(c, 0, 0, 0, 1, 1, true, false, true); else drawOpponentCharacter(c, d);
    c.restore();
    if (crown) {
      drawCrown(c, cx, feet - size * 0.88, size * 0.34);
      shareOutlined(c, tr('duel.winner'), cx, feet - size * 1.22, W * 0.045, '#FFD54A', '#3A1E00');
    }
    // Étincelles
    for (const [dx, dy, r] of SHARE_SPARKLES) shareSparkle(c, cx + dx * size, feet + dy * size, r * size, dy < -1.1 ? Color.parseColor('#FFF4C2') : Color.WHITE);
    sharePlate(c, cx, feet + depth + ph * 0.2, name, W * 0.062, true, W);
    drawGoldNumber(c, String(value), cx, feet + depth + ph + W * 0.2, W * 0.18);
  };
  // Le vaincu : gris, aplati en flaque, étourdi
  const loser = (cx, feet, size, name, value, mine) => {
    shareFillW.shader = null; shareFillW.color = Color.argb(120, 0, 0, 30);
    c.drawOval(new RectF(cx - size * 0.95, feet - size * 0.1, cx + size * 0.95, feet + size * 0.16), shareFillW);
    shareFillW.color = Color.parseColor('#4B5368');
    c.drawOval(new RectF(cx - size * 0.85, feet - size * 0.14, cx + size * 0.85, feet + size * 0.1), shareFillW);
    shareFillW.color = Color.parseColor('#6A7389');
    c.drawOval(new RectF(cx - size * 0.6, feet - size * 0.13, cx + size * 0.35, feet + size * 0.02), shareFillW);
    const scale = size / k;
    c.save(); c.ctx.filter = 'grayscale(90%) brightness(0.85)';
    c.translate(cx, feet); c.rotate(-6); c.scale(scale * 1.25, scale * 0.5);
    if (mine) drawCharacter(c, 0, 0, 0, 1, 1, true, true, true); else drawOpponentCharacter(c, d);
    c.ctx.filter = 'none'; c.restore();
    // Étoiles qui tournent et goutte de sueur
    for (const [dx, dy, r, col] of SHARE_DIZZY) { shareFillW.color = Color.parseColor(col); drawStar(c, cx + dx * size, feet + dy * size, r * size, shareFillW); }
    const dx = cx + size * 0.55, dy = feet - size * 0.72, s = size * 0.16;
    shareFillW.color = Color.WHITE;
    shareFillW.shader = new LinearGradient(0, dy - s, 0, dy + s, Color.parseColor('#BDEBFF'), Color.parseColor('#3FA9F5'));
    sharePathW.reset(); sharePathW.moveTo(dx, dy - s * 1.2);
    sharePathW.quadTo(dx + s * 0.85, dy + s * 0.1, dx, dy + s * 0.7); sharePathW.quadTo(dx - s * 0.85, dy + s * 0.1, dx, dy - s * 1.2);
    sharePathW.close(); c.drawPath(sharePathW, shareFillW); shareFillW.shader = null;
    shareOutlined(c, tr('duel.loser'), cx, feet - size * 1.15, W * 0.04, '#C9CFDC', '#141A2C');
    sharePlate(c, cx, feet + size * 0.62, name, W * 0.045, false, W);
    shareOutlined(c, String(value), cx, feet + size * 0.62 + W * 0.13, W * 0.1, '#9AA6C2', '#141A2C');
  };
  if (draw) {
    champion(W * 0.27, H * 0.65, W * 0.26, me, d.myBest, true, false);
    champion(W * 0.73, H * 0.65, W * 0.26, opp, d.theirBest, false, false);
  } else {
    loser(W * 0.75, H * 0.64, W * 0.2, loserName, won ? d.theirBest : d.myBest, !won);
    champion(W * 0.32, H * 0.65, W * 0.28, winnerName, won ? d.myBest : d.theirBest, won, true);
  }
  const foot = d.myBest === d.theirBest && d.myTime > 0 && d.theirTime > 0 ? `⏱ ${d.myTime.toFixed(2)} s / ${d.theirTime.toFixed(2)} s` : '⚔️ ' + tr('duel.title') + ' · Hop Box';
  shareOutlined(c, foot, W / 2, H * 0.965, W * 0.036, '#E4EAFF');
}
/** Étincelles autour du vainqueur et étoiles du vaincu (positions en tailles de personnage). */
const SHARE_SPARKLES = [[-0.62, -0.95, 0.09], [0.6, -0.7, 0.07], [-0.75, -0.35, 0.05], [0.72, -1.2, 0.05], [0.45, -1.35, 0.04], [-0.4, -1.4, 0.04]];
const SHARE_DIZZY = [[-0.38, -0.78, 0.12, '#FFD23F'], [0.02, -0.92, 0.08, '#8A93A8'], [0.36, -0.8, 0.07, '#8A93A8'], [-0.62, -0.6, 0.06, '#8A93A8']];
const shareLineW = new Paint({ style: Style.STROKE, strokeCap: 'round' });

/** Partage de l'image d'un duel terminé (partage natif si possible, sinon téléchargement). */
function shareDuel(d) {
  Telemetry.track('share', { what: 'duel' });
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  drawDuelShareCard(new Canvas(cv.getContext('2d')), W, H, d);
  const text = tr('duel.share_text', { a: profile.pseudo || tr('board.you'), sa: d.myBest, sb: d.theirBest, b: duelName(d) });
  cv.toBlob(async (blob) => {
    if (!blob) { duelToast(tr('duel.error')); return; }
    const file = new File([blob], 'hopbox-duel.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hopbox-duel.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    duelToast(tr('share.saved'));
  }, 'image/png');
}

/** Recharge le bilan des duels (à l'ouverture de l'onglet Stats). */
function refreshDuelStats() {
  if (duels.statsBusy) return;
  duels.statsBusy = true;
  online.duelStats().then((st) => { duels.statsBusy = false; if (st) duels.stats = st; });
}

/** Barre des résultats : vert (victoires), bleu (égalités), rouge (défaites), sur un creux sombre. */
function drawResultBar(canvas, l, t, r, h, wins, losses, draws) {
  shareFillW.shader = null; shareFillW.color = Color.argb(170, 8, 12, 30);
  canvas.drawRoundRect(new RectF(l, t, r, t + h), h / 2, h / 2, shareFillW);
  const total = wins + losses + draws;
  if (total <= 0) return;
  let x = l;
  for (const [n, color] of [[wins, UI.GREEN], [draws, UI.BLUE], [losses, UI.RED]]) {
    if (n <= 0) continue;
    const x2 = x + (r - l) * n / total;
    shareFillW.color = color; canvas.save(); canvas.clipRect(x, t, x2, t + h); canvas.drawRoundRect(new RectF(l, t, r, t + h), h / 2, h / 2, shareFillW); canvas.restore();
    x = x2;
  }
}

/** Onglet Stats : bilan total, puis une ligne par adversaire (du plus affronté au moins affronté). */
function drawDuelStats(canvas, left, right, l, r, top, bottom) {
  const st = duels.stats;
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.04;
  if (!st) { duels.listTop = bottom; duels.listBottom = bottom; canvas.drawText(tr(duels.statsBusy ? 'board.loading' : 'duel.offline'), w / 2, (top + bottom) / 2, greyTextPaint); return; }
  const t = st.total, sh = w * 0.4;
  drawCard(canvas, l, top, r, top + sh);
  shareTextW.textAlign = Align.CENTER; shareTextW.textSize = w * 0.04; shareTextW.color = UI.SOFT;
  canvas.drawText(tr('duel.stats_total'), w / 2, top + w * 0.065, shareTextW);
  const cw = (r - l) / 3;
  [[t.wins, tr('duel.stats_wins'), UI.GREEN], [t.losses, tr('duel.stats_losses'), UI.RED], [t.draws, tr('duel.stats_draws'), UI.BLUE]].forEach(([n, label, color], i) => {
    const cx = l + cw * (i + 0.5);
    shareTextW.textSize = w * 0.11; shareTextW.color = color; canvas.drawText(String(n), cx, top + w * 0.19, shareTextW);
    shareTextW.textSize = w * 0.032; shareTextW.color = UI.SOFT; canvas.drawText(fitText(label, shareTextW, cw * 0.92), cx, top + w * 0.24, shareTextW);
  });
  const total = t.wins + t.losses + t.draws, by = top + w * 0.29, bh = w * 0.03;
  drawResultBar(canvas, l + w * 0.05, by, r - w * 0.05, bh, t.wins, t.losses, t.draws);
  shareTextW.textSize = w * 0.034; shareTextW.color = Color.WHITE;
  canvas.drawText(total > 0 ? tr('duel.stats_rate', { n: Math.round(t.wins * 100 / total) }) : tr('duel.stats_none'), w / 2, by + bh + w * 0.055, shareTextW);
  const listTop = top + sh + w * 0.04, rh = w * 0.17, gap = w * 0.022;
  duels.listTop = listTop; duels.listBottom = bottom;
  duels.maxScroll = Math.max(0, st.opponents.length * (rh + gap) - (bottom - listTop));
  duels.scroll = clamp(duels.scroll, 0, duels.maxScroll);
  if (!st.opponents.length) { wrapText(tr('duel.stats_none'), greyTextPaint, r - l - w * 0.06).forEach((ln, i) => canvas.drawText(ln, w / 2, (listTop + bottom) / 2 + i * w * 0.058, greyTextPaint)); return; }
  canvas.save(); canvas.clipRect(left, listTop, right, bottom);
  st.opponents.forEach((o, i) => {
    const y = listTop + i * (rh + gap) - duels.scroll;
    if (y + rh < listTop || y > bottom) return;
    const lead = o.wins - o.losses, tx = l + w * 0.04;
    drawCard(canvas, l, y, r, y + rh, lead > 0 ? 'gold' : '');
    shareTextW.textAlign = Align.LEFT; shareTextW.textSize = w * 0.044; shareTextW.color = Color.WHITE;
    canvas.drawText(fitText(o.pseudo || o.code, shareTextW, (r - l) * 0.5), tx, y + rh * 0.4, shareTextW);
    shareTextW.textSize = w * 0.03; shareTextW.color = UI.SOFT;
    canvas.drawText(fitText(tr('duel.stats_line', { w: o.wins, l: o.losses, d: o.draws }), shareTextW, (r - l) * 0.5), tx, y + rh * 0.68, shareTextW);
    shareTextW.textAlign = Align.RIGHT; shareTextW.textSize = w * 0.06; shareTextW.color = lead > 0 ? UI.GOLD : lead < 0 ? UI.RED : Color.WHITE;
    canvas.drawText(`${o.wins} – ${o.losses}`, r - w * 0.04, y + rh * 0.48, shareTextW);
    drawResultBar(canvas, r - w * 0.34, y + rh * 0.66, r - w * 0.04, w * 0.018, o.wins, o.losses, o.draws);
  });
  shareTextW.textAlign = Align.CENTER;
  canvas.restore();
}
