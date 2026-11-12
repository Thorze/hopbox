'use strict';
// Écrans (équivalent de Screens.kt) : pseudo, classement, personnage, missions, pause, son, fin de partie.

// ---------- Pseudo (fenêtre HTML) ----------
let pseudoDialogShown = false;

/** Premier lancement : pseudo automatique, réservé tout de suite (autres chiffres s'il est pris), sans fenêtre. */
function autoPseudo(tries = 3) {
  const name = tr('pseudo.default') + (1000 + rndInt(9000));
  profile.pseudo = name;
  store.setBool('pseudo_auto', true);
  online.setPseudo(name).then((result) => {
    if (profile.pseudo !== name) return;   // le joueur a choisi le sien entre-temps
    if (result === 'ok') { profile.syncedPseudo = name; syncOnline(); }
    else if (result !== 'error' && tries > 1) autoPseudo(tries - 1);
  });
}

/** Après la première vraie fin de partie : une seule fois, proposer de changer le pseudo automatique. */
function offerPseudoChange() {
  if (!store.getBool('pseudo_auto') || store.getBool('pseudo_offered')) return;
  setTimeout(() => {
    if (state !== State.GAME_OVER || pseudoDialogShown || store.getBool('pseudo_offered')) return;
    store.setBool('pseudo_offered', true);
    askPseudo(false, null, true);
  }, 1800);
}

function askPseudo(first, error = null, offer = false) {
  if (pseudoDialogShown) return;
  pseudoDialogShown = true;
  const dlg = document.getElementById('pseudo-dialog');
  const input = document.getElementById('pseudo-input');
  document.getElementById('pseudo-title').textContent = offer ? tr('pseudo.title_offer') : first ? tr('pseudo.title_first') : tr('pseudo.title_change');
  document.getElementById('pseudo-msg').textContent = error || (offer ? tr('pseudo.offer', { name: profile.pseudo || '' }) : tr('pseudo.info'));
  const cancel = document.getElementById('pseudo-cancel');
  const mustChoose = first || pseudoConflict;
  cancel.style.display = mustChoose ? 'none' : '';
  cancel.textContent = offer ? tr('pseudo.keep') : tr('common.cancel');
  input.value = profile.pseudo || '';
  dlg.classList.add('open');
  // Pseudo automatique : tout sélectionné, il suffit de taper le sien par-dessus
  setTimeout(() => { input.focus(); if (offer) input.select(); }, 50);
  const close = () => { dlg.classList.remove('open'); pseudoDialogShown = false; input.blur(); };
  document.getElementById('pseudo-form').onsubmit = (e) => {
    e.preventDefault();
    const p = input.value.trim().slice(0, 16);
    close();
    if (p && p === profile.pseudo && store.getBool('pseudo_auto')) { if (offer) Telemetry.track('pseudo', { auto: 1 }); return; }   // pseudo automatique gardé
    if (!p) {
      if (!profile.pseudo) profile.pseudo = tr('pseudo.default') + (1000 + rndInt(9000));
      afterPseudo();
      return;
    }
    // Le serveur garde le pseudo tout de suite (unique, sans gros mot) ; hors connexion, il sera envoyé plus tard
    online.setPseudo(p).then((result) => {
      if (result === 'taken') askPseudo(first, tr('pseudo.taken', { name: p }), offer);
      else if (result === 'forbidden') askPseudo(first, tr('pseudo.forbidden'), offer);
      else if (result === 'invalid') askPseudo(first, tr('pseudo.info'), offer);
      else {
        if (offer || store.getBool('pseudo_auto')) Telemetry.track('pseudo', { auto: 0 });
        profile.pseudo = p;
        store.setBool('pseudo_auto', false);
        if (result === 'ok') profile.syncedPseudo = p;
        pseudoConflict = false; afterPseudo();
      }
    });
  };
  cancel.onclick = () => { if (offer) Telemetry.track('pseudo', { auto: 1 }); close(); };
}

function afterPseudo() {
  syncOnline();
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
    } else if ((result === 'taken' || result === 'forbidden') && store.getBool('pseudo_auto')) {
      autoPseudo();   // pseudo automatique déjà pris : on en tire un autre, sans déranger le joueur
    } else if (result === 'taken' || result === 'forbidden') {
      pseudoConflict = true;
      askPseudo(false, result === 'taken' ? tr('pseudo.taken_sync', { name: pseudo }) : tr('pseudo.forbidden'));
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
  boardScroll = 0; boardVel = 0; boardWheel = 0;
  personalRuns = profile.topRuns();
  if (tab > 0) loadWorld();
}

function loadWorld() {
  worldStatus = 'loading';
  worldRank = null;
  const tab = boardTab;
  const period = tab === 1 ? 'day' : tab === 2 ? 'week' : 'all';
  online.fetchBoard(BOARD_SIZE, profile.playerId, period).then((board) => {
    if (boardTab !== tab) return;
    if (!board) worldStatus = 'error';
    else { worldEntries = board.top; worldRank = board.myRank; worldStatus = 'ok'; boardScrollToMe = true; }
  });
}

function openMissions() { if (state === State.MISSIONS) return; missionsReturnState = state; state = State.MISSIONS; }
function openSettings() {
  if (state === State.SETTINGS) return;
  settingsReturnState = state; langPicker = false; settingsView.account = false; settingsView.scroll = 0;
  state = State.SETTINGS;
}

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

/**
 * Bouton « bonbon » du thème Nuit & Or : épaisseur plus foncée dessous, face en dégradé (clair en haut), reflet
 * brillant, fin liseré clair et texte ombré. La face s'enfonce quand on appuie. Les fonds translucides restent plats.
 */
function drawButton(canvas, r, label, bg, textSize, action) {
  const radius = r.height() / 2;
  buttons.push({ rect: new RectF(r.left, r.top, r.right, r.bottom), action });
  let face = r;
  const solid = Color.alpha(bg.color) === 255 && !bg.shader;
  if (solid) {
    const c = bg.color, depth = r.height() * 0.14, down = isPressed(r) ? depth * 0.75 : 0;
    reliefPaint.shader = null;
    // Ombre douce puis épaisseur
    reliefPaint.color = Color.argb(70, 3, 6, 18);
    rect.set(r.left, r.top + depth + r.height() * 0.07, r.right, r.bottom + depth + r.height() * 0.07); canvas.drawRoundRect(rect, radius, radius, reliefPaint);
    reliefPaint.color = shade(c, 0.6);
    rect.set(r.left, r.top + depth, r.right, r.bottom + depth); canvas.drawRoundRect(rect, radius, radius, reliefPaint);
    face = new RectF(r.left, r.top + down, r.right, r.bottom + down);
    // Face en dégradé
    reliefPaint.color = Color.WHITE;
    reliefPaint.shader = new LinearGradient(0, face.top, 0, face.bottom, shade(c, 1.2), shade(c, 0.9));
    canvas.drawRoundRect(face, radius, radius, reliefPaint);
    reliefPaint.shader = null;
    // Reflet brillant sur la moitié haute
    reliefPaint.color = Color.argb(58, 255, 255, 255);
    rect.set(face.left + radius * 0.35, face.top + r.height() * 0.07, face.right - radius * 0.35, face.top + r.height() * 0.46);
    canvas.drawRoundRect(rect, radius * 0.62, radius * 0.62, reliefPaint);
    // Liseré clair
    btnRim.color = Color.argb(70, 255, 255, 255); btnRim.strokeWidth = Math.max(1, r.height() * 0.03);
    rect.set(face.left + btnRim.strokeWidth / 2, face.top + btnRim.strokeWidth / 2, face.right - btnRim.strokeWidth / 2, face.bottom - btnRim.strokeWidth / 2);
    canvas.drawRoundRect(rect, radius, radius, btnRim);
  } else canvas.drawRoundRect(r, radius, radius, bg);
  btnTextPaint.textSize = textSize;
  const dark = bg === shopPaint || (bg === itemPaint && isLight(bg.color));
  btnTextPaint.color = dark ? UI.INK_DARK : (bg === tabOffPaint || bg === lockedPaint) ? UI.SOFT : Color.WHITE;
  const text = fitText(label, btnTextPaint, face.width() - radius);
  if (solid && !dark) btnTextPaint.setShadowLayer(r.height() * 0.05, 0, r.height() * 0.035, Color.argb(120, 0, 0, 0));
  canvas.drawText(text, face.centerX(), face.centerY() - (btnTextPaint.descent() + btnTextPaint.ascent()) / 2, btnTextPaint);
  btnTextPaint.shadow = null;
}
const btnRim = new Paint({ style: Style.STROKE });

/** Bouton carré aux coins arrondis du thème (verre sombre, liseré clair), avec une épaisseur dessous. */
function drawGlassSquare(canvas, face) {
  const rad = face.width() * 0.3, depth = w * 0.012, down = isPressed(face) ? depth * 0.75 : 0;
  reliefPaint.shader = null;
  reliefPaint.color = Color.argb(120, 3, 6, 18);
  rect.set(face.left, face.top + depth, face.right, face.bottom + depth); canvas.drawRoundRect(rect, rad, rad, reliefPaint);
  reliefPaint.color = Color.WHITE;
  rect.set(face.left, face.top + down, face.right, face.bottom + down);
  reliefPaint.shader = new LinearGradient(0, rect.top, 0, rect.bottom, Color.argb(235, 52, 68, 118), Color.argb(235, 24, 34, 70));
  canvas.drawRoundRect(rect, rad, rad, reliefPaint);
  reliefPaint.shader = null;
  reliefPaint.color = Color.argb(38, 255, 255, 255);
  rect.set(face.left + rad * 0.3, face.top + down + face.height() * 0.06, face.right - rad * 0.3, face.top + down + face.height() * 0.42);
  canvas.drawRoundRect(rect, rad * 0.7, rad * 0.7, reliefPaint);
  progStroke.color = Color.argb(150, 150, 180, 240); progStroke.strokeWidth = w * 0.004;
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

/* Logo « HOP BOX » de l'accueil (équivalent de drawLogo dans UiStyle.kt) : une couleur par lettre,
 * gros contour sombre, ombre, et une petite vague de sauts qui traverse les lettres. */
const LOGO_COLORS = ['#FF7A45', '#FFC93C', '#4CC24A', '#3B8DF5', '#B06CF0', '#FF5C8A'].map(c => Color.parseColor(c));
const logoFill = new Paint({ textAlign: Align.CENTER, bold: true });
const logoLine = new Paint({ textAlign: Align.CENTER, bold: true, style: Style.STROKE, strokeJoin: 'round' });
let logoShaders = [], logoShaderSize = 0;
function drawLogo(canvas, text, cx, baseline, size, wave = true) {
  logoFill.textSize = size; logoLine.textSize = size;
  if (logoShaderSize !== size) {
    logoShaders = LOGO_COLORS.map(c => new LinearGradient(0, -size * 0.72, 0, 0, shade(c, 1.25), c));
    logoShaderSize = size;
  }
  const gap = size * 0.03;
  let total = -gap;
  for (const ch of text) total += logoFill.measureText(ch) + gap;
  let x = cx - total / 2, ci = 0;
  [...text].forEach((ch, i) => {
    const cw = logoFill.measureText(ch);
    if (ch === ' ') { x += cw + gap; return; }
    const ph = (((time * 0.9 - i * 0.07) % 2.2) + 2.2) % 2.2;
    const hop = wave && ph < 0.3 ? Math.sin(ph / 0.3 * Math.PI) * size * 0.12 : 0;
    canvas.save(); canvas.translate(x + cw / 2, baseline - hop); canvas.rotate(ci % 2 === 0 ? -4 : 4);
    logoLine.color = Color.argb(90, 10, 20, 50); logoLine.strokeWidth = size * 0.16;
    canvas.drawText(ch, 0, size * 0.07, logoLine);
    logoLine.color = Color.parseColor('#1E2A4A'); canvas.drawText(ch, 0, 0, logoLine);
    logoFill.shader = logoShaders[ci % LOGO_COLORS.length]; canvas.drawText(ch, 0, 0, logoFill); logoFill.shader = null;
    logoLine.color = Color.argb(110, 255, 255, 255); logoLine.strokeWidth = size * 0.02; canvas.drawText(ch, 0, 0, logoLine);
    canvas.restore();
    x += cw + gap; ci++;
  });
}

/*
 * Thème « Nuit & Or » (équivalent de UiStyle.kt), le même sur tous les écrans : panneaux bleu nuit au fin liseré
 * doré, cartes de verre sombre, boutons « bonbon » brillants, textes blancs et bleu-gris, accents dorés.
 * Un seul endroit à modifier pour changer l'allure de tout le jeu.
 */
const UI = {
  PANEL_TOP: Color.parseColor('#1D2E5C'), PANEL_BOTTOM: Color.parseColor('#0D1632'),
  GOLD_HI: Color.parseColor('#F7DE9C'), GOLD_LO: Color.parseColor('#B2823A'),
  CARD_TOP: Color.parseColor('#283A70'), CARD_BOTTOM: Color.parseColor('#1C2A56'), CARD_LINE: Color.argb(130, 132, 168, 240),
  DEEP: Color.parseColor('#121B3A'),
  INK: Color.WHITE, SOFT: Color.parseColor('#B9C5E6'), DIM: Color.parseColor('#8490B6'), INK_DARK: Color.parseColor('#2A2440'),
  GOLD: Color.parseColor('#FFD54F'), BLUE: Color.parseColor('#62B6FF'), RED: Color.parseColor('#FF6B6B'), GREEN: Color.parseColor('#62E08C'),
  ORANGE: Color.parseColor('#FF9A3C'),
};
const panelFill = new Paint(), panelLine = new Paint({ style: Style.STROKE }), panelRect = new RectF(), panelArrow = new Path();
const panelTitle = new Paint({ bold: true }), panelTitleLine = new Paint({ bold: true, style: Style.STROKE, strokeJoin: 'round' });
const panelHeaderH = () => w * 0.15;

/**
 * Panneau du jeu : bleu nuit en dégradé, fin liseré doré, léger éclat en haut. Avec un titre, celui-ci est en blanc
 * contouré dans l'en-tête et, si back est donné, un bouton rond bleu « retour » à gauche.
 */
function drawPanel(canvas, r, title = null, back = null, header = title != null) {
  const rad = w * 0.055, e = w * 0.007;
  panelFill.shader = null;
  // Ombre portée
  panelFill.color = Color.argb(120, 2, 5, 16);
  panelRect.set(r.left + w * 0.004, r.top + w * 0.022, r.right - w * 0.004, r.bottom + w * 0.026); canvas.drawRoundRect(panelRect, rad, rad, panelFill);
  // Liseré doré
  panelFill.color = Color.WHITE;
  panelFill.shader = new LinearGradient(0, r.top, 0, r.bottom, [UI.GOLD_HI, UI.GOLD_LO, UI.GOLD_HI], [0, 0.55, 1]);
  canvas.drawRoundRect(r, rad, rad, panelFill);
  // Corps bleu nuit
  panelRect.set(r.left + e, r.top + e, r.right - e, r.bottom - e);
  panelFill.shader = new LinearGradient(0, r.top, 0, r.bottom, UI.PANEL_TOP, UI.PANEL_BOTTOM);
  canvas.drawRoundRect(panelRect, rad - e, rad - e, panelFill);
  // Éclat doux en haut
  panelFill.shader = new LinearGradient(0, r.top, 0, r.top + Math.min(r.height() * 0.4, w * 0.5), Color.argb(46, 120, 165, 255), Color.argb(0, 120, 165, 255));
  canvas.drawRoundRect(panelRect, rad - e, rad - e, panelFill);
  panelFill.shader = null;
  // Fin filet intérieur
  panelLine.strokeWidth = w * 0.003; panelLine.color = Color.argb(70, 150, 185, 255);
  panelRect.set(r.left + e * 2.2, r.top + e * 2.2, r.right - e * 2.2, r.bottom - e * 2.2); canvas.drawRoundRect(panelRect, rad - e * 2.2, rad - e * 2.2, panelLine);
  if (title != null) drawPanelTitle(canvas, title, r.centerX(), r.top + panelHeaderH() * 0.68, r.width() - w * 0.3);
  if (back) drawBackButton(canvas, r.left + w * 0.085, r.top + panelHeaderH() * 0.5, w * 0.048, back);
}

/**
 * Carte de verre du thème (ligne de liste, encadré) entre (l, t) et (r, b). kind : '' = normale, 'deep' = creux
 * sombre, 'warm' = mise en avant orangée (demande reçue, « c'est toi »), 'gold' = victoire, 'done' = réussi (vert).
 */
function drawCard(canvas, l, t, r, b, kind = '', rad = w * 0.035) {
  let top = UI.CARD_TOP, bottom = UI.CARD_BOTTOM, line = UI.CARD_LINE;
  if (kind === 'deep') { top = UI.DEEP; bottom = UI.DEEP; line = Color.argb(70, 120, 150, 220); }
  else if (kind === 'warm') { top = Color.parseColor('#7A4A22'); bottom = Color.parseColor('#4C2E1A'); line = Color.parseColor('#F0A24A'); }
  else if (kind === 'gold') { top = Color.parseColor('#6E5818'); bottom = Color.parseColor('#3F3310'); line = UI.GOLD; }
  else if (kind === 'done') { top = Color.parseColor('#1F5A44'); bottom = Color.parseColor('#163F36'); line = Color.parseColor('#5FD98A'); }
  panelFill.shader = null;
  if (kind !== 'deep') {
    panelFill.color = Color.argb(80, 2, 5, 16);
    panelRect.set(l, t + w * 0.008, r, b + w * 0.008); canvas.drawRoundRect(panelRect, rad, rad, panelFill);
  }
  panelRect.set(l, t, r, b);
  panelFill.color = Color.WHITE;
  panelFill.shader = new LinearGradient(0, t, 0, b, top, bottom);
  canvas.drawRoundRect(panelRect, rad, rad, panelFill);
  panelFill.shader = null;
  panelLine.strokeWidth = w * 0.004; panelLine.color = line;
  panelRect.set(l + w * 0.002, t + w * 0.002, r - w * 0.002, b - w * 0.002); canvas.drawRoundRect(panelRect, rad, rad, panelLine);
}

/** Pastille sombre d'information (une ligne de texte bleu-gris), centrée en (cx, cy). */
function drawInfoPill(canvas, cx, cy, text, size, maxW, color = UI.SOFT) {
  panelTitle.textSize = size;
  const t = fitText(text, panelTitle, maxW - size * 1.6), pw = panelTitle.measureText(t) + size * 1.6, ph = size * 2.1;
  panelFill.shader = null; panelFill.color = Color.argb(150, 40, 54, 100);
  panelRect.set(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2); canvas.drawRoundRect(panelRect, ph / 2, ph / 2, panelFill);
  panelLine.strokeWidth = w * 0.003; panelLine.color = Color.argb(90, 150, 185, 255); canvas.drawRoundRect(panelRect, ph / 2, ph / 2, panelLine);
  panelTitle.color = color; panelTitle.textAlign = Align.CENTER;
  canvas.drawText(t, cx, cy - (panelTitle.descent() + panelTitle.ascent()) / 2, panelTitle);
  panelTitle.textAlign = Align.LEFT;
}

/**
 * Grand nombre doré en relief (score des écrans de fin) : halo, épaisseur brune, contour, dégradé or et reflet.
 * alpha de 0 à 1.
 */
function drawGoldNumber(canvas, text, cx, baseline, size, alpha = 1) {
  const a = (v) => Math.round(v * alpha);
  // Halo lumineux derrière
  panelFill.color = Color.WHITE;
  panelFill.shader = new RadialGradient(cx, baseline - size * 0.36, size * 1.25, [Color.argb(a(120), 150, 200, 255), Color.argb(a(40), 120, 170, 255), Color.argb(0, 120, 170, 255)], [0, 0.5, 1]);
  canvas.drawCircle(cx, baseline - size * 0.36, size * 1.25, panelFill);
  panelFill.shader = null;
  panelTitle.textSize = size; panelTitleLine.textSize = size;
  panelTitle.textAlign = Align.CENTER; panelTitleLine.textAlign = Align.CENTER;
  // Épaisseur (vers le bas) et contour brun
  panelTitleLine.strokeWidth = size * 0.11;
  panelTitleLine.color = Color.argb(a(255), 110, 66, 6); canvas.drawText(text, cx, baseline + size * 0.075, panelTitleLine);
  panelTitleLine.color = Color.argb(a(255), 160, 104, 14); canvas.drawText(text, cx, baseline + size * 0.035, panelTitleLine);
  panelTitleLine.color = Color.argb(a(255), 122, 76, 8); canvas.drawText(text, cx, baseline, panelTitleLine);
  // Dégradé or
  panelTitle.color = Color.argb(a(255), 255, 255, 255);
  panelTitle.shader = new LinearGradient(0, baseline - size * 0.74, 0, baseline, [Color.parseColor('#FFFBD6'), Color.parseColor('#FFE27A'), Color.parseColor('#FFC83A'), Color.parseColor('#F09A1C')], [0, 0.35, 0.62, 1]);
  canvas.drawText(text, cx, baseline, panelTitle);
  panelTitle.shader = null;
  // Fin reflet
  panelTitleLine.strokeWidth = size * 0.015; panelTitleLine.color = Color.argb(a(150), 255, 255, 240); canvas.drawText(text, cx, baseline, panelTitleLine);
  panelTitle.color = Color.WHITE; panelTitle.textAlign = Align.LEFT; panelTitleLine.textAlign = Align.LEFT;
}

/** Titre blanc contouré de bleu nuit ; l'icône de tête (emoji) est dessinée sans contour. */
function drawPanelTitle(canvas, title, cx, baseline, maxW, size = w * 0.062, outline = Color.parseColor('#0A1230')) {
  const sp = title.indexOf(' ');
  const icon = sp >= 1 && sp <= 4 && !/[\p{L}\p{N}]/u.test(title.slice(0, sp)) ? title.slice(0, sp + 1) : '';
  const text = title.slice(icon.length);
  panelTitle.textSize = size;
  const total = panelTitle.measureText(icon) + panelTitle.measureText(text);
  if (total > maxW) panelTitle.textSize = size * Math.max(0.7, maxW / total);
  panelTitleLine.textSize = panelTitle.textSize;
  const iw = panelTitle.measureText(icon);
  let x = cx - (iw + panelTitle.measureText(text)) / 2;
  panelTitle.color = Color.WHITE;
  if (icon) canvas.drawText(icon, x, baseline, panelTitle);
  x += iw;
  panelTitleLine.strokeWidth = panelTitle.textSize * 0.16;
  panelTitleLine.color = Color.argb(110, 2, 5, 20); canvas.drawText(text, x, baseline + panelTitle.textSize * 0.07, panelTitleLine);
  panelTitleLine.color = outline; canvas.drawText(text, x, baseline, panelTitleLine);
  canvas.drawText(text, x, baseline, panelTitle);
}

/** Bouton rond bleu « retour » (flèche), brillant et en relief, enregistré pour les appuis. */
function drawBackButton(canvas, cx, cy, r, action) {
  const hit = new RectF(cx - r * 1.3, cy - r * 1.3, cx + r * 1.3, cy + r * 1.3);
  buttons.push({ rect: hit, action });
  const down = isPressed(hit) ? r * 0.12 : 0;
  panelFill.shader = null;
  panelFill.color = Color.parseColor('#12408F'); canvas.drawCircle(cx, cy + r * 0.17, r, panelFill);
  panelFill.color = Color.WHITE;
  panelFill.shader = new LinearGradient(0, cy + down - r, 0, cy + down + r, Color.parseColor('#63BBFF'), Color.parseColor('#1F77EE'));
  canvas.drawCircle(cx, cy + down, r, panelFill);
  panelFill.shader = null;
  panelFill.color = Color.argb(70, 255, 255, 255); canvas.drawCircle(cx, cy + down - r * 0.32, r * 0.56, panelFill);
  panelLine.strokeWidth = r * 0.07; panelLine.color = Color.argb(120, 255, 255, 255); canvas.drawCircle(cx, cy + down, r * 0.96, panelLine);
  panelLine.strokeWidth = r * 0.24; panelLine.color = Color.WHITE; panelLine.strokeCap = 'round'; panelLine.strokeJoin = 'round';
  panelArrow.reset();
  panelArrow.moveTo(cx + r * 0.04, cy + down - r * 0.42); panelArrow.lineTo(cx - r * 0.38, cy + down); panelArrow.lineTo(cx + r * 0.04, cy + down + r * 0.42);
  panelArrow.moveTo(cx - r * 0.38, cy + down); panelArrow.lineTo(cx + r * 0.42, cy + down);
  canvas.drawPath(panelArrow, panelLine);
  panelLine.strokeCap = 'butt'; panelLine.strokeJoin = 'miter';
}

/* ---------- Grands moments : ruban, couronne, coffre, gains (équivalents de UiStyle.kt) ---------- */
const fxFill = new Paint(), fxLine = new Paint({ style: Style.STROKE, strokeJoin: 'round' }), fxPath = new Path(), fxRect = new RectF();
const fxText = new Paint({ textAlign: Align.CENTER, bold: true });

/** Ruban-bandeau centré en (cx, cy) : bouts repliés derrière, texte blanc contouré. */
function drawTitleRibbon(canvas, cx, cy, text, color, size, minW = 0) {
  panelTitle.textSize = size;
  const tw = Math.min(panelTitle.measureText(text), w * 0.62), bw = Math.max(tw + size * 1.4, minW), bh = size * 1.45, drop = bh * 0.28;
  fxFill.shader = null;
  for (const side of [-1, 1]) {
    const edge = cx + side * bw / 2, inner = edge - side * size * 0.3, outer = edge + side * size * 1.05;
    const t = cy - bh / 2 + drop, b = cy + bh / 2 + drop;
    fxPath.reset(); fxPath.moveTo(inner, t); fxPath.lineTo(outer, t); fxPath.lineTo(outer - side * size * 0.38, (t + b) / 2);
    fxPath.lineTo(outer, b); fxPath.lineTo(inner, b); fxPath.close();
    fxFill.color = shade(color, 0.68); canvas.drawPath(fxPath, fxFill);
    fxPath.reset(); fxPath.moveTo(edge, cy + bh / 2); fxPath.lineTo(edge, b); fxPath.lineTo(inner, cy + bh / 2); fxPath.close();
    fxFill.color = shade(color, 0.42); canvas.drawPath(fxPath, fxFill);
  }
  fxRect.set(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2);
  fxFill.color = Color.argb(60, 0, 0, 0);
  canvas.drawRoundRect(new RectF(fxRect.left, fxRect.top + bh * 0.08, fxRect.right, fxRect.bottom + bh * 0.08), size * 0.15, size * 0.15, fxFill);
  fxFill.color = Color.WHITE;   // opaque : l'alpha de la couleur s'applique aussi au dégradé
  fxFill.shader = new LinearGradient(0, fxRect.top, 0, fxRect.bottom, shade(color, 1.25), color);
  canvas.drawRoundRect(fxRect, size * 0.15, size * 0.15, fxFill);
  fxFill.shader = null; fxFill.color = Color.argb(70, 255, 255, 255);
  canvas.drawRect(fxRect.left + size * 0.15, fxRect.top + bh * 0.1, fxRect.right - size * 0.15, fxRect.top + bh * 0.2, fxFill);
  drawPanelTitle(canvas, text, cx, cy + size * 0.36, w * 0.62, size, shade(color, 0.45));
}

/** Couronne dorée posée sur baseY, largeur s. */
function drawCrown(canvas, cx, baseY, s) {
  const pts = [-0.5, -0.2, -0.56, -0.82, -0.25, -0.46, 0, -0.98, 0.25, -0.46, 0.56, -0.82, 0.5, -0.2];
  fxPath.reset(); fxPath.moveTo(cx + pts[0] * s, baseY + pts[1] * s);
  for (let i = 1; i < pts.length / 2; i++) fxPath.lineTo(cx + pts[i * 2] * s, baseY + pts[i * 2 + 1] * s);
  fxPath.close();
  fxFill.color = Color.argb(60, 0, 0, 0);
  canvas.save(); canvas.translate(0, s * 0.05); canvas.drawPath(fxPath, fxFill); canvas.restore();
  fxFill.color = Color.WHITE;
  fxFill.shader = new LinearGradient(0, baseY - s, 0, baseY, Color.parseColor('#FFE680'), Color.parseColor('#F5A623'));
  canvas.drawPath(fxPath, fxFill); fxFill.shader = null;
  fxLine.color = Color.parseColor('#B8730A'); fxLine.strokeWidth = s * 0.04; canvas.drawPath(fxPath, fxLine);
  fxFill.color = Color.parseColor('#FFF1B8');
  for (const i of [1, 3, 5]) canvas.drawCircle(cx + pts[i * 2] * s, baseY + pts[i * 2 + 1] * s, s * 0.075, fxFill);
  fxRect.set(cx - s * 0.54, baseY - s * 0.25, cx + s * 0.54, baseY + s * 0.02);
  fxFill.color = Color.parseColor('#E8940F');
  canvas.drawRoundRect(fxRect, s * 0.06, s * 0.06, fxFill); canvas.drawRoundRect(fxRect, s * 0.06, s * 0.06, fxLine);
  ['#E53950', '#3B8DF5', '#4CBB47'].forEach((c, i) => { fxFill.color = Color.parseColor(c); canvas.drawCircle(cx + (i - 1) * s * 0.3, baseY - s * 0.115, s * 0.07, fxFill); });
}

/** Pastille sombre « Solde : 🪙 1180 → 1155 » centrée en (cx, cy) (ou ce qui manque, en rouge), pour tous les achats. */
function drawBalancePill(canvas, cx, cy, price) {
  const enough = profile.coins >= price;
  const sol = enough ? `${tr('quest.balance')} 🪙 ${profile.coins} → ${profile.coins - price}` : tr('custom.missing_short', { n: price - profile.coins });
  fxText.textSize = w * 0.04;
  const pw = fxText.measureText(sol) + w * 0.08;
  fxRect.set(cx - pw / 2, cy - w * 0.045, cx + pw / 2, cy + w * 0.035);
  fxFill.shader = null; fxFill.color = Color.argb(255, 52, 58, 76); canvas.drawRoundRect(fxRect, fxRect.height() / 2, fxRect.height() / 2, fxFill);
  fxLine.color = Color.argb(120, 200, 210, 225); fxLine.strokeWidth = w * 0.004; canvas.drawRoundRect(fxRect, fxRect.height() / 2, fxRect.height() / 2, fxLine);
  fxText.color = Color.parseColor(enough ? '#E8ECF4' : '#FF5A5A'); canvas.drawText(sol, cx, cy + w * 0.008, fxText);
}

/** Largeur de la pastille de gain pour text. */
function gainChipWidth(text, ph = w * 0.1) { fxText.textSize = ph * 0.55; return fxText.measureText(text) + ph; }

/** Pastille de gain « +66 🪙 » centrée en (cx, cy). */
function drawGainChip(canvas, cx, cy, text, ph = w * 0.1) {
  fxText.textSize = ph * 0.55;
  const pw = fxText.measureText(text) + ph;
  fxRect.set(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2);
  fxFill.shader = null; fxFill.color = Color.argb(120, 10, 20, 50); canvas.drawRoundRect(fxRect, ph / 2, ph / 2, fxFill);
  fxLine.color = Color.argb(90, 255, 255, 255); fxLine.strokeWidth = w * 0.004; canvas.drawRoundRect(fxRect, ph / 2, ph / 2, fxLine);
  fxText.color = Color.parseColor('#FFE066'); canvas.drawText(text, cx, cy + ph * 0.2, fxText);
}

/** Images du coffre fermé / ouvert (images/), fournies pour le jeu. */
const chestImgs = { closed: new Image(), open: new Image() };
chestImgs.closed.src = 'images/chest_closed.png'; chestImgs.open.src = 'images/chest_open.png';

/** Coffre au trésor posé sur baseY, largeur s ; open de 0 (fermé) à 1 (ouvert, plein d'or), burst ≥ 0 = pièces qui jaillissent. */
function drawChest(canvas, cx, baseY, s, open, burst) {
  const oy = baseY - s * 0.45;
  fxFill.shader = null;
  fxFill.color = Color.argb(70, 0, 0, 0); canvas.drawOval(new RectF(cx - s * 0.52, baseY - s * 0.06, cx + s * 0.52, baseY + s * 0.06), fxFill);
  // L'image : fermée, puis ouverte avec un petit rebond au moment où le couvercle saute
  const img = open >= 0.5 && chestImgs.open.complete && chestImgs.open.naturalWidth ? chestImgs.open : chestImgs.closed;
  const k = s / (chestImgs.closed.naturalWidth || 414), pop = open >= 0.5 && burst >= 0 && burst <= 0.35 ? 1 + 0.12 * Math.sin(burst / 0.35 * Math.PI) : 1;
  let bodyTop = baseY - s * 0.75;
  if (img.complete && img.naturalWidth) {
    const bw = img.naturalWidth * k * pop, bh = img.naturalHeight * k * pop;
    bodyTop = baseY - bh;
    canvas.drawBitmap(img, cx - bw / 2, baseY - bh, bw, bh);
  }
  if (burst >= 0) {
    fxText.textSize = s * 0.2;
    for (let i = 0; i < 10; i++) {
      const vx = (i - 4.5) * s * 0.32, vy = s * (2.6 + 0.5 * ((i * 7) % 3)), t = burst - i * 0.03;
      if (t < 0 || t > 1.3) continue;
      fxText.color = Color.argb(clamp(Math.round(255 * clamp(1 - t / 1.3, 0, 1) * 1.6), 0, 255), 0, 0, 0);
      canvas.drawText('🪙', cx + vx * t, bodyTop - vy * t + s * 3.2 * t * t, fxText);
    }
    fxText.color = Color.WHITE;
  }
}

function panel(canvas, left, top, right, bottom, title = null, back = null, header = title != null) {
  canvas.drawRect(0, 0, w, h, overlayPaint);
  rect.set(left, top, right, bottom);
  drawPanel(canvas, rect, title, back, header);
}

// ---------- Classement ----------
const rowStripePaint = new Paint({ color: Color.argb(26, 150, 185, 255) });
function drawLeaderboard(canvas) {
  const left = w * 0.06, right = w * 0.94, top = insetTop + h * 0.05, bottom = ub() - h * 0.03;
  panel(canvas, left, top, right, bottom, '🏆 ' + tr('board.title'), () => { state = boardReturnState; });
  const tabTop = top + w * 0.17, tabH = w * 0.1;
  const tabs = [tr('board.tab_mine'), tr('board.tab_day'), tr('board.tab_week'), tr('board.tab_world')];
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
    rect.set(left + w * 0.03, y, right - w * 0.03, y + rowH * 0.92);
    if (mine) canvas.drawRoundRect(rect, rowH * 0.3, rowH * 0.3, highlightPaint);
    // Une ligne sur deux sur fond bleuté, pour suivre la ligne plus facilement
    else if (i % 2 === 1) canvas.drawRoundRect(rect, rowH * 0.3, rowH * 0.3, rowStripePaint);
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
      : worldRank != null && boardTab === 1 ? tr('board.rank_day', { name: pseudo, rank: worldRank })
      : worldRank != null && boardTab === 2 ? tr('board.rank_week', { name: pseudo, rank: worldRank })
        : worldRank != null ? tr('board.rank_all', { name: pseudo, rank: worldRank, n: best })
          : boardTab === 1 ? tr('board.no_day')
          : boardTab === 2 ? tr('board.no_week') : tr('board.your_record', { n: best });
    canvas.drawText(ellipsize(info, greyTextPaint, right - left - w * 0.06), w / 2, footer, greyTextPaint);
  }
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.15, w * 0.7, bottom - w * 0.05), tr('common.back'), backBtnPaint, w * 0.045, () => { state = boardReturnState; });
}

// ---------- Barre Perfect ----------
function drawPerfectBar(canvas) {
  const a = clamp(perfectBarAlpha, 0, 1);
  const scale = 1 + 0.12 * perfectPulse;
  const cy = scoreY() + w * 0.17;
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
  canvas.drawRoundRect(rect, bh / 2, bh / 2, accentPaint);
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
  panel(canvas, left, top, right, bottom, null, null, true);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.065;
  drawProgressTabs(canvas, top, 0);
  // --- Série de jours ---
  const today = DailyReward.today(), last = store.getInt('daily_last', -1);
  const streak = last === today || last === today - 1 ? store.getInt('daily_streak', 0) : 0, claimed = last === today;
  let y = top + w * 0.15;
  const sr = new RectF(left + w * 0.04, y, right - w * 0.04, y + w * 0.36);
  drawCard(canvas, sr.left, sr.top, sr.right, sr.bottom);
  progPaint.shader = null;
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.045;
  canvas.drawText(fitText('🔥 ' + tr('progress.streak', { n: streak }), darkTextPaint, sr.width() * 0.6), sr.left + w * 0.04, sr.top + w * 0.075, darkTextPaint);
  greyTextPaint.textAlign = Align.RIGHT; greyTextPaint.textSize = w * 0.032;
  canvas.drawText(tr('progress.best', { n: store.getInt('st_daily_best', 0) }), sr.right - w * 0.04, sr.top + w * 0.072, greyTextPaint);
  const gap = w * 0.015, tw = (sr.width() - w * 0.08 - gap * 6) / 7;
  for (let i = 0; i < 7; i++) {
    const n = i + 1, x0 = sr.left + w * 0.04 + i * (tw + gap);
    const r = new RectF(x0, sr.top + w * 0.11, x0 + tw, sr.top + w * 0.11 + tw * 1.25);
    // Jour déjà gagné : case dorée (texte sombre) ; à venir : creux sombre (texte bleu-gris)
    const got = n <= Math.min(streak, 7);
    if (got) {
      progPaint.color = Color.WHITE; progPaint.shader = new LinearGradient(0, r.top, 0, r.bottom, Color.parseColor('#FFD86B'), Color.parseColor('#F5A623'));
      canvas.drawRoundRect(r, w * 0.02, w * 0.02, progPaint); progPaint.shader = null;
    } else { progPaint.color = UI.DEEP; canvas.drawRoundRect(r, w * 0.02, w * 0.02, progPaint); }
    darkTextPaint.color = got ? UI.INK_DARK : UI.SOFT;
    darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.032;
    canvas.drawText(n === 7 ? '7+' : String(n), r.centerX(), r.top + tw * 0.42, darkTextPaint);
    darkTextPaint.textSize = w * 0.026;
    canvas.drawText('+' + DailyReward.reward(n), r.centerX(), r.top + tw * 0.95, darkTextPaint);
  }
  darkTextPaint.color = UI.INK;
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
    drawCard(canvas, left + w * 0.04, y, right - w * 0.04, y + cardH, done ? 'done' : '', w * 0.03);
    darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.038;
    canvas.drawText(fitText((done ? '✅ ' : '') + m.label, darkTextPaint, right - left - w * 0.3), left + w * 0.08, y + cardH * 0.4, darkTextPaint);
    darkTextPaint.textAlign = Align.RIGHT;
    canvas.drawText(`+${m.reward} 🪙`, right - w * 0.08, y + cardH * 0.4, darkTextPaint);
    const bl = left + w * 0.08, br = right - w * 0.2, by = y + cardH * 0.6, bh = cardH * 0.17;
    progPaint.shader = null; progPaint.color = Color.argb(150, 8, 12, 30);
    rect.set(bl, by, br, by + bh); canvas.drawRoundRect(rect, bh / 2, bh / 2, progPaint);
    const f = clamp(pr / m.target, 0, 1);
    if (f > 0) { rect.set(bl, by, bl + (br - bl) * f, by + bh); canvas.drawRoundRect(rect, bh / 2, bh / 2, done ? greenZonePaint : accentPaint); }
    greyTextPaint.textAlign = Align.RIGHT; greyTextPaint.textSize = w * 0.03;
    canvas.drawText(`${pr} / ${m.target}`, right - w * 0.08, by + bh, greyTextPaint);
    y += cardH + w * 0.02;
  });
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.035;
  canvas.drawText(missions.allMissionsDone() ? tr('missions.all_done') : tr('missions.all_bonus', { n: missions.ALL_DONE_REWARD }), w / 2, bottom - w * 0.18, greyTextPaint);
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.14, w * 0.7, bottom - w * 0.04), 'OK', backBtnPaint, w * 0.05, () => { state = missionsReturnState; });
}

/** Onglets en haut de l'écran Progression : « Progression » (série + missions) et « Stats ». */
function drawProgressTabs(canvas, top, active) {
  const labels = ['🎯 ' + tr('progress.title'), '📊 ' + tr('hud.stats')], tw = w * 0.4, th = w * 0.095, y0 = top + w * 0.035;
  for (let i = 0; i < 2; i++) {
    const x0 = w / 2 - tw - w * 0.01 + i * (tw + w * 0.02), r = new RectF(x0, y0, x0 + tw, y0 + th);
    // Onglets de l'en-tête : actif = pastille bleue brillante, inactif = ardoise sombre
    progPaint.shader = null;
    if (i === active) {
      progPaint.color = Color.parseColor('#12408F'); rect.set(r.left, r.top + th * 0.1, r.right, r.bottom + th * 0.1); canvas.drawRoundRect(rect, th / 2, th / 2, progPaint);
      progPaint.color = Color.WHITE; progPaint.shader = new LinearGradient(0, r.top, 0, r.bottom, Color.parseColor('#58B2FF'), Color.parseColor('#1F77EE'));
      canvas.drawRoundRect(r, th / 2, th / 2, progPaint); progPaint.shader = null;
      progPaint.color = Color.argb(50, 255, 255, 255); rect.set(r.left + th * 0.3, r.top + th * 0.08, r.right - th * 0.3, r.top + th * 0.46); canvas.drawRoundRect(rect, th * 0.3, th * 0.3, progPaint);
    } else { progPaint.color = Color.parseColor('#2A3760'); canvas.drawRoundRect(r, th / 2, th / 2, progPaint); }
    const tp = btnTextPaint;
    tp.textAlign = Align.CENTER; tp.textSize = w * 0.042; tp.color = i === active ? Color.WHITE : UI.SOFT;
    canvas.drawText(fitText(labels[i], tp, tw - w * 0.04), r.centerX(), r.centerY() - (tp.descent() + tp.ascent()) / 2, tp);
    if (i !== active) buttons.push({ rect: r, action: () => {
      if (i === 1) { statsReturnState = missionsReturnState; statsScroll = 0; statsVel = 0; state = State.STATS; } else { missionsReturnState = statsReturnState; state = State.MISSIONS; }
    } });
  }
}

/* ---------- Palier du mode libre (tout en haut), équivalent de drawTierHud dans UiStyle.kt ---------- */
const TIER_COLORS = ['#4CBB47', '#3B8DF5', '#9B5CF0', '#FF9F1C', '#E5484D', '#FFC93C'].map((c) => Color.parseColor(c));
function tierColor(tier) { return TIER_COLORS[clamp(tier - 1, 0, TIER_COLORS.length - 1)]; }
const tierFill = new Paint(), tierLine = new Paint({ style: Style.STROKE }), tierText = new Paint({ textAlign: Align.CENTER, bold: true }), tierRect = new RectF();
function drawTierHud(canvas, jumps, pulse) {
  const tier = Difficulty.tier(jumps), inTier = jumps - Difficulty.tierStart(tier), size = Difficulty.tierSize(tier), f = inTier / size;
  const c = tierColor(tier), cNext = tierColor(tier + 1);
  const cy = insetTop + w * 0.095, barL = w * 0.25, barR = w * 0.78, bh = w * 0.058;
  tierFill.shader = null; tierFill.color = Color.argb(70, 0, 0, 0);
  tierRect.set(barL, cy - bh / 2 + w * 0.006, barR, cy + bh / 2 + w * 0.006); canvas.drawRoundRect(tierRect, bh / 2, bh / 2, tierFill);
  tierFill.color = Color.argb(120, 18, 24, 44);
  tierRect.set(barL, cy - bh / 2, barR, cy + bh / 2); canvas.drawRoundRect(tierRect, bh / 2, bh / 2, tierFill);
  const pad = bh * 0.16, fillR = barL + pad + (barR - barL - 2 * pad) * f;
  if (f > 0) {
    tierRect.set(barL + pad, cy - bh / 2 + pad, Math.max(fillR, barL + pad + bh * 0.7), cy + bh / 2 - pad);
    tierFill.color = Color.WHITE; tierFill.shader = new LinearGradient(barL, 0, barR, 0, c, cNext);
    canvas.drawRoundRect(tierRect, tierRect.height() / 2, tierRect.height() / 2, tierFill);
    tierFill.shader = null; tierFill.color = Color.argb(70, 255, 255, 255);
    tierRect.set(tierRect.left + bh * 0.15, tierRect.top + bh * 0.05, tierRect.right - bh * 0.15, tierRect.centerY());
    canvas.drawRoundRect(tierRect, tierRect.height() / 2, tierRect.height() / 2, tierFill);
  }
  tierLine.color = Color.argb(80, 255, 255, 255); tierLine.strokeWidth = w * 0.003;
  tierRect.set(barL, cy - bh / 2, barR, cy + bh / 2); canvas.drawRoundRect(tierRect, bh / 2, bh / 2, tierLine);
  // Niveau de difficulté du palier, dans un petit onglet au milieu, juste au-dessus de la barre
  {
    tierText.textSize = w * 0.03;
    const name = tr('tier.name' + Math.min(tier, 6)), tw = tierText.measureText(name) + w * 0.05, mx = (barL + barR) / 2;
    const b = cy - bh / 2 + w * 0.004, t = b - w * 0.042;
    tierFill.shader = null; tierFill.color = shade(c, 0.6); canvas.drawRoundRect(new RectF(mx - tw / 2, t + w * 0.004, mx + tw / 2, b + w * 0.004), w * 0.02, w * 0.02, tierFill);
    tierFill.color = c; canvas.drawRoundRect(new RectF(mx - tw / 2, t, mx + tw / 2, b), w * 0.02, w * 0.02, tierFill);
    tierText.color = Color.WHITE; tierText.setShadowLayer(w * 0.003, 0, w * 0.0015, Color.argb(150, 0, 0, 0));
    canvas.drawText(name, mx, b - w * 0.011, tierText);
    tierText.shadow = null;
  }
  tierText.textSize = bh * 0.62; tierText.color = Color.WHITE;
  tierText.setShadowLayer(w * 0.004, 0, w * 0.002, Color.argb(140, 0, 0, 0));
  const label = fitText(tr('hud.progress') + '  ' + inTier + '/' + size, tierText, barR - barL - bh * 2.2);
  canvas.drawText(label, (barL + barR) / 2, cy + tierText.textSize * 0.36, tierText);
  tierText.shadow = null;
  const rN = bh * 0.62, nx = barR - bh * 0.4;
  // Opaque (sinon la barre se voit au travers) : ombre, disque plein, anneau coloré, numéro blanc
  tierFill.color = Color.argb(70, 0, 0, 0); canvas.drawCircle(nx, cy + w * 0.005, rN, tierFill);
  tierFill.color = Color.parseColor('#1A2038'); canvas.drawCircle(nx, cy, rN, tierFill);
  tierLine.color = cNext; tierLine.strokeWidth = rN * 0.2; canvas.drawCircle(nx, cy, rN * 0.88, tierLine);
  tierText.textSize = rN * 0.95; tierText.color = Color.WHITE;
  tierText.setShadowLayer(w * 0.003, 0, w * 0.0015, Color.argb(140, 0, 0, 0));
  canvas.drawText(String(tier + 1), nx, cy + tierText.textSize * 0.36, tierText);
  tierText.shadow = null;
  const r = bh * 1.05 * (1 + 0.25 * pulse), ax = barL - r * 0.25;
  if (pulse > 0) { tierFill.color = Color.argb(Math.round(120 * pulse), Color.red(c), Color.green(c), Color.blue(c)); canvas.drawCircle(ax, cy, r * (1.25 + 0.4 * (1 - pulse)), tierFill); }
  tierFill.color = Color.argb(70, 0, 0, 0); canvas.drawCircle(ax, cy + w * 0.006, r, tierFill);
  tierFill.color = Color.parseColor('#1A2038'); canvas.drawCircle(ax, cy, r, tierFill);
  tierLine.color = c; tierLine.strokeWidth = r * 0.22; canvas.drawCircle(ax, cy, r * 0.86, tierLine);
  tierLine.color = Color.argb(90, 255, 255, 255); tierLine.strokeWidth = r * 0.06;
  canvas.drawArc(new RectF(ax - r * 0.86, cy - r * 0.86, ax + r * 0.86, cy + r * 0.86), 200, 70, false, tierLine);
  tierText.textSize = r * 0.95; tierText.color = Color.WHITE;
  canvas.drawText(String(tier), ax, cy + tierText.textSize * 0.36, tierText);
}
