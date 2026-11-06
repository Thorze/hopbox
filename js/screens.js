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

/* Logo « HOP BOX » de l'accueil (équivalent de drawLogo dans UiStyle.kt) : une couleur par lettre,
 * gros contour sombre, ombre, et une petite vague de sauts qui traverse les lettres. */
const LOGO_COLORS = ['#FF7A45', '#FFC93C', '#4CC24A', '#3B8DF5', '#B06CF0', '#FF5C8A'].map(c => Color.parseColor(c));
const logoFill = new Paint({ textAlign: Align.CENTER, bold: true });
const logoLine = new Paint({ textAlign: Align.CENTER, bold: true, style: Style.STROKE, strokeJoin: 'round' });
let logoShaders = [], logoShaderSize = 0;
function drawLogo(canvas, text, cx, baseline, size) {
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
    const hop = ph < 0.3 ? Math.sin(ph / 0.3 * Math.PI) * size * 0.12 : 0;
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

/** Style commun des panneaux (équivalent de UiStyle.kt) : cadre bleu en relief, intérieur clair, bande d'en-tête
 * avec titre blanc contouré et bouton rond « retour ». */
const panelFill = new Paint(), panelLine = new Paint({ style: Style.STROKE }), panelRect = new RectF(), panelArrow = new Path();
const panelTitle = new Paint({ bold: true }), panelTitleLine = new Paint({ bold: true, style: Style.STROKE, strokeJoin: 'round' });
const panelHeaderH = () => w * 0.15;
function drawPanel(canvas, r, title = null, back = null, header = title != null) {
  const rad = w * 0.05, depth = w * 0.022;
  panelFill.shader = null;
  panelFill.color = Color.argb(70, 10, 15, 35);
  panelRect.set(r.left + w * 0.006, r.top + depth + w * 0.012, r.right - w * 0.006, r.bottom + depth + w * 0.012); canvas.drawRoundRect(panelRect, rad, rad, panelFill);
  panelFill.color = Color.parseColor('#1F4FA0');
  panelRect.set(r.left, r.top + depth, r.right, r.bottom + depth); canvas.drawRoundRect(panelRect, rad, rad, panelFill);
  panelFill.shader = new LinearGradient(0, r.top, 0, r.bottom, Color.parseColor('#56A0F7'), Color.parseColor('#2F6CD6'));
  canvas.drawRoundRect(r, rad, rad, panelFill);
  panelFill.shader = null;
  panelLine.strokeWidth = w * 0.005; panelLine.color = Color.argb(90, 255, 255, 255);
  panelRect.set(r.left + w * 0.006, r.top + w * 0.006, r.right - w * 0.006, r.bottom - w * 0.006); canvas.drawRoundRect(panelRect, rad * 0.9, rad * 0.9, panelLine);
  const m = w * 0.02, inTop = header ? r.top + panelHeaderH() : r.top + m;
  panelRect.set(r.left + m, inTop, r.right - m, r.bottom - m);
  panelFill.shader = new LinearGradient(0, inTop, 0, r.bottom, Color.parseColor('#FFFFFF'), Color.parseColor('#E8EFFA'));
  canvas.drawRoundRect(panelRect, rad * 0.7, rad * 0.7, panelFill);
  panelFill.shader = null;
  panelLine.strokeWidth = w * 0.004; panelLine.color = Color.argb(60, 20, 50, 120); canvas.drawRoundRect(panelRect, rad * 0.7, rad * 0.7, panelLine);
  if (title != null) drawPanelTitle(canvas, title, r.centerX(), r.top + panelHeaderH() * 0.68, r.width() - w * 0.3);
  if (back) drawBackButton(canvas, r.left + w * 0.085, r.top + panelHeaderH() * 0.5, w * 0.048, back);
}

/** Titre blanc contouré de bleu foncé ; l'icône de tête (emoji) est dessinée sans contour. */
function drawPanelTitle(canvas, title, cx, baseline, maxW, size = w * 0.062, outline = Color.parseColor('#1B3E86')) {
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
  panelTitleLine.color = Color.argb(80, 10, 25, 70); canvas.drawText(text, x, baseline + panelTitle.textSize * 0.06, panelTitleLine);
  panelTitleLine.color = outline; canvas.drawText(text, x, baseline, panelTitleLine);
  canvas.drawText(text, x, baseline, panelTitle);
}

/** Bouton rond « retour » (flèche), en relief, enregistré pour les appuis. */
function drawBackButton(canvas, cx, cy, r, action) {
  const hit = new RectF(cx - r * 1.3, cy - r * 1.3, cx + r * 1.3, cy + r * 1.3);
  buttons.push({ rect: hit, action });
  const down = isPressed(hit) ? r * 0.12 : 0;
  panelFill.shader = null;
  panelFill.color = Color.parseColor('#1B4A99'); canvas.drawCircle(cx, cy + r * 0.16, r, panelFill);
  panelFill.color = Color.parseColor('#7DB8FF'); canvas.drawCircle(cx, cy + down, r, panelFill);
  panelFill.color = Color.argb(70, 255, 255, 255); canvas.drawCircle(cx, cy + down - r * 0.3, r * 0.55, panelFill);
  panelLine.strokeWidth = r * 0.24; panelLine.color = Color.WHITE; panelLine.strokeCap = 'round'; panelLine.strokeJoin = 'round';
  panelArrow.reset();
  panelArrow.moveTo(cx + r * 0.18, cy + down - r * 0.42); panelArrow.lineTo(cx - r * 0.24, cy + down); panelArrow.lineTo(cx + r * 0.18, cy + down + r * 0.42);
  canvas.drawPath(panelArrow, panelLine);
  panelLine.strokeCap = 'butt'; panelLine.strokeJoin = 'miter';
}

/* ---------- Grands moments : ruban, couronne, coffre, gains (équivalents de UiStyle.kt) ---------- */
const fxFill = new Paint(), fxLine = new Paint({ style: Style.STROKE, strokeJoin: 'round' }), fxPath = new Path(), fxRect = new RectF();
const fxText = new Paint({ textAlign: Align.CENTER, bold: true });

/** Ruban-bandeau centré en (cx, cy) : bouts repliés derrière, texte blanc contouré. */
function drawTitleRibbon(canvas, cx, cy, text, color, size) {
  panelTitle.textSize = size;
  const tw = Math.min(panelTitle.measureText(text), w * 0.62), bw = tw + size * 1.4, bh = size * 1.45, drop = bh * 0.28;
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

/** Pastille de gain « +66 🪙 » centrée en (cx, cy). */
function drawGainChip(canvas, cx, cy, text, ph = w * 0.1) {
  fxText.textSize = ph * 0.55;
  const pw = fxText.measureText(text) + ph;
  fxRect.set(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2);
  fxFill.shader = null; fxFill.color = Color.argb(120, 10, 20, 50); canvas.drawRoundRect(fxRect, ph / 2, ph / 2, fxFill);
  fxLine.color = Color.argb(90, 255, 255, 255); fxLine.strokeWidth = w * 0.004; canvas.drawRoundRect(fxRect, ph / 2, ph / 2, fxLine);
  fxText.color = Color.parseColor('#FFE066'); canvas.drawText(text, cx, cy + ph * 0.2, fxText);
}

/** Coffre au trésor posé sur baseY, largeur s ; open de 0 à 1 (couvercle basculé), burst ≥ 0 = pièces qui jaillissent. */
function drawChest(canvas, cx, baseY, s, open, burst) {
  const oy = baseY - s * 0.45;
  canvas.save(); canvas.rotate(time * 18, cx, oy);
  fxFill.shader = null; fxFill.color = Color.argb(Math.round(50 + 60 * open), 255, 236, 150);
  for (let i = 0; i < 12; i++) {
    const a0 = i * 0.5236;
    fxPath.reset(); fxPath.moveTo(cx, oy);
    fxPath.lineTo(cx + Math.cos(a0) * s * 0.95, oy + Math.sin(a0) * s * 0.95);
    fxPath.lineTo(cx + Math.cos(a0 + 0.2) * s * 0.95, oy + Math.sin(a0 + 0.2) * s * 0.95);
    fxPath.close(); canvas.drawPath(fxPath, fxFill);
  }
  canvas.restore();
  const bodyTop = baseY - s * 0.48, l = cx - s / 2, r = cx + s / 2;
  fxFill.color = Color.argb(70, 0, 0, 0); canvas.drawOval(new RectF(l - s * 0.04, baseY - s * 0.06, r + s * 0.04, baseY + s * 0.06), fxFill);
  if (open > 0) { fxFill.color = Color.argb(Math.round(200 * open), 255, 214, 90); canvas.drawOval(new RectF(l + s * 0.05, bodyTop - s * 0.1, r - s * 0.05, bodyTop + s * 0.1), fxFill); }
  fxRect.set(l, bodyTop, r, baseY);
  fxFill.shader = new LinearGradient(0, bodyTop, 0, baseY, Color.parseColor('#A066E8'), Color.parseColor('#6A35B8'));
  canvas.drawRoundRect(fxRect, s * 0.06, s * 0.06, fxFill); fxFill.shader = null;
  fxFill.color = Color.parseColor('#FFC93C');
  canvas.drawRect(l + s * 0.1, bodyTop, l + s * 0.2, baseY, fxFill); canvas.drawRect(r - s * 0.2, bodyTop, r - s * 0.1, baseY, fxFill);
  fxLine.color = Color.parseColor('#4A2380'); fxLine.strokeWidth = s * 0.03; canvas.drawRoundRect(fxRect, s * 0.06, s * 0.06, fxLine);
  fxRect.set(cx - s * 0.09, bodyTop - s * 0.02, cx + s * 0.09, bodyTop + s * 0.17);
  fxFill.color = Color.parseColor('#FFD54F'); canvas.drawRoundRect(fxRect, s * 0.03, s * 0.03, fxFill);
  fxLine.color = Color.parseColor('#B8730A'); canvas.drawRoundRect(fxRect, s * 0.03, s * 0.03, fxLine);
  fxFill.color = Color.parseColor('#5A3A00'); canvas.drawCircle(cx, bodyTop + s * 0.07, s * 0.025, fxFill);
  const sy = Math.cos(open * Math.PI * 0.62);
  canvas.save(); canvas.scale(1, sy, cx, bodyTop);
  fxRect.set(l - s * 0.02, bodyTop - s * 0.3, r + s * 0.02, bodyTop + s * 0.02);
  if (sy >= 0) fxFill.shader = new LinearGradient(0, fxRect.top, 0, fxRect.bottom, Color.parseColor('#B47CF5'), Color.parseColor('#7E45CC'));
  else fxFill.color = Color.parseColor('#3E1F70');
  canvas.drawRoundRect(fxRect, s * 0.2, s * 0.2, fxFill); fxFill.shader = null;
  if (sy >= 0) {
    fxFill.color = Color.parseColor('#FFC93C');
    canvas.drawRect(l + s * 0.1, fxRect.top + s * 0.04, l + s * 0.2, fxRect.bottom, fxFill);
    canvas.drawRect(r - s * 0.2, fxRect.top + s * 0.04, r - s * 0.1, fxRect.bottom, fxFill);
    fxFill.color = Color.argb(70, 255, 255, 255);
    canvas.drawRoundRect(new RectF(l + s * 0.25, fxRect.top + s * 0.05, r - s * 0.25, fxRect.top + s * 0.11), s * 0.03, s * 0.03, fxFill);
  }
  fxLine.color = Color.parseColor('#4A2380'); canvas.drawRoundRect(fxRect, s * 0.2, s * 0.2, fxLine);
  canvas.restore();
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
function drawLeaderboard(canvas) {
  const left = w * 0.06, right = w * 0.94, top = insetTop + h * 0.05, bottom = ub() - h * 0.03;
  panel(canvas, left, top, right, bottom, '🏆 ' + tr('board.title'), () => { state = boardReturnState; });
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
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.15, w * 0.7, bottom - w * 0.05), tr('common.back'), backBtnPaint, w * 0.045, () => { state = boardReturnState; });
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
    // Onglets posés sur la bande bleue de l'en-tête : actif = pastille blanche, inactif = translucide
    progPaint.color = i === active ? Color.WHITE : Color.argb(60, 255, 255, 255);
    canvas.drawRoundRect(r, th / 2, th / 2, progPaint);
    const tp = btnTextPaint;
    tp.textAlign = Align.CENTER; tp.textSize = w * 0.042; tp.color = i === active ? Color.parseColor('#2F6CD6') : Color.WHITE;
    canvas.drawText(fitText(labels[i], tp, tw - w * 0.04), r.centerX(), r.centerY() - (tp.descent() + tp.ascent()) / 2, tp);
    if (i !== active) buttons.push({ rect: r, action: () => {
      if (i === 1) { statsReturnState = missionsReturnState; statsScroll = 0; statsVel = 0; state = State.STATS; } else { missionsReturnState = statsReturnState; state = State.MISSIONS; }
    } });
  }
}
