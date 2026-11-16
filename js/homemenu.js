'use strict';
// Accueil épuré (équivalent de HomeMenu.kt) : un bouton ☰ en haut à gauche et les pièces en haut à droite
// (toucher = boutique). ☰ ouvre un panneau qui glisse depuis la gauche : Aventure (chapitre en cours et
// énergie), Boutique, Classement, Progression, Statistiques et Réglages. Pastille rouge sur ☰ quand il y a
// quelque chose à aller voir (achat possible, niveau qui t'attend avec le plein d'énergie).

const menu = { open: false, openedAt: 0 };
const MENU_ANIM = 0.22;

function menuBadge() { return canAffordSomething() || chapterCallsYou(currentChapter()) || duelsBadge() > 0; }
function openHomeMenu() { menu.open = true; menu.openedAt = time; }
function closeHomeMenu() { menu.open = false; }

function drawRedDot(canvas, x, y, r) {
  progPaint.color = Color.parseColor('#E53950'); canvas.drawCircle(x, y, r, progPaint);
  progStroke.color = Color.WHITE; progStroke.strokeWidth = r * 0.22; canvas.drawCircle(x, y, r, progStroke);
}

/*
 * En-tête commun des écrans plein écran (écran de fin, boutique) : même bouton en haut à gauche (carré « verre »,
 * ☰ ou ←), même pilule des pièces en haut à droite, mêmes tailles et même hauteur. L'accueil reprend les mêmes
 * dessins en plus petit, de chaque côté du logo.
 */
const TOP_BAR_Y = 0.09;   // axe de la barre du haut, sous la barre d'état (en w)
const TOP_BTN = 0.105, TOP_PILL = 0.085;   // côté du bouton, hauteur de la pilule des pièces (en w)
const topArrowStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), topArrowPath = new Path();
function topBarCy() { return insetTop + w * TOP_BAR_Y; }

/** Bouton carré « verre » en haut à gauche, centré en cy, de côté s : ☰ (menu) ou ← (back). Renvoie son rectangle. */
function drawTopLeftButton(canvas, cy, s, back, action) {
  const face = new RectF(w * 0.04, cy - s / 2, w * 0.04 + s, cy + s / 2);
  drawGlassSquare(canvas, face);
  const down = isPressed(face) ? w * 0.009 : 0, cx = face.centerX(), y0 = face.centerY() + down;
  if (back) {
    // Flèche ←, du même blanc et de la même épaisseur que les traits du ☰
    topArrowStroke.color = Color.WHITE; topArrowStroke.strokeWidth = s * 0.084;
    topArrowPath.reset();
    topArrowPath.moveTo(cx - s * 0.02, y0 - s * 0.2); topArrowPath.lineTo(cx - s * 0.22, y0); topArrowPath.lineTo(cx - s * 0.02, y0 + s * 0.2);
    topArrowPath.moveTo(cx - s * 0.22, y0); topArrowPath.lineTo(cx + s * 0.24, y0);
    canvas.drawPath(topArrowPath, topArrowStroke);
  } else {
    progPaint.shader = null; progPaint.color = Color.WHITE;
    for (let i = -1; i <= 1; i++) {
      const y = y0 + i * s * 0.19;
      rect.set(cx - s * 0.26, y - s * 0.042, cx + s * 0.26, y + s * 0.042);
      canvas.drawRoundRect(rect, s * 0.042, s * 0.042, progPaint);
    }
  }
  // Zone tactile plus grande que le dessin (au moins ~48 dp)
  buttons.push({ rect: new RectF(0, cy - w * 0.075, face.right + w * 0.025, cy + w * 0.075), action });
  return face;
}

/** Haut de l'accueil et de l'écran de fin : ☰ à gauche, pièces à droite. */
/**
 * cy, s (côté du ☰) et ph (hauteur des pastilles) : l'accueil les place de chaque côté du logo, en plus petit.
 * À droite : les pièces (toucher = boutique) et, juste dessous, l'énergie avec le compte à rebours de la prochaine
 * (toucher = Aventure). energyShown : énergie affichée (écran de fin, pendant qu'elle monte).
 * Renvoie { coins, energy } : les rectangles des deux pastilles.
 */
function drawTopBar(canvas, coinsShown = profile.coins, bump = 0, cy = topBarCy(), s = w * TOP_BTN, ph = w * TOP_PILL, energyShown = null) {
  const face = drawTopLeftButton(canvas, cy, s, false, () => openHomeMenu());
  if (menuBadge()) drawRedDot(canvas, face.right - s * 0.06, face.top + s * 0.06, w * 0.022);
  // Énergie sous les pièces (enregistrée avant les pièces : sa zone tactile passe devant)
  progText.textSize = ph * 0.46;
  const coinsW = progText.measureText(String(coinsShown)) + ph + w * 0.05;
  const energy = drawEnergyPill(canvas, w * 0.96, cy + ph * 1.2, ph * 0.92, energyShown, Math.min(coinsW, ph * 2.6));
  // Pièces en haut à droite : toucher = boutique
  // (écran de fin : le total peut être affiché en train de monter, avec un petit rebond)
  canvas.save();
  if (bump > 0) canvas.scale(1 + 0.12 * bump, 1 + 0.12 * bump, w * 0.84, cy);
  const coins = drawCoinPill(canvas, w * 0.96, cy, true, ph, 0, coinsShown);
  canvas.restore();
  buttons.push({ rect: new RectF(coins.left - w * 0.02, cy - w * 0.075, w, cy + ph * 0.6), action: () => openCustomize() });
  return { coins, energy };
}

// ---------- En-tête de l'accueil ----------
// Ligne du haut : ☰ à gauche, logo au centre, pièces à droite ; dessous, ton record et le record mondial
// (toucher = classement). Le record mondial est gardé en mémoire
// pour s'afficher hors connexion, et rafraîchi au plus toutes les 5 minutes.
const worldTop = { loaded: false, best: 0, pseudo: '', me: false, at: 0, busy: false };

function refreshWorldTop() {
  if (!worldTop.loaded) {
    worldTop.loaded = true;
    worldTop.best = store.getInt('world_best', 0); worldTop.pseudo = store.get('world_pseudo') || ''; worldTop.me = store.getInt('world_me', 0) === 1;
  }
  const now = Date.now();
  if (worldTop.busy || (worldTop.at && now - worldTop.at < 300000)) return;
  worldTop.busy = true; worldTop.at = now;
  online.fetchBoard(1, profile.playerId, 'all').then((b) => {
    worldTop.busy = false;
    if (!b || !b.top.length) return;
    const e = b.top[0];
    worldTop.best = e.best; worldTop.pseudo = e.pseudo || ''; worldTop.me = e.me;
    store.set('world_best', e.best); store.set('world_pseudo', worldTop.pseudo); store.set('world_me', e.me ? 1 : 0);
  });
}

/** Logo officiel (images/logo.webp, 800 × 577, fond transparent). */
const LOGO_RATIO = 800 / 577;
const logoImg = new Image();
logoImg.src = 'images/logo.webp';

function drawHomeHeader(canvas) {
  // Logo tout en haut, ☰ et pièces (plus petits) de chaque côté : le logo prend la place qui reste entre les deux
  const ms = w * 0.09, cph = w * 0.072;
  progText.textSize = cph * 0.46;
  const coinsW = progText.measureText(String(profile.coins)) + cph + w * 0.05;
  const half = Math.min(w / 2 - (w * 0.04 + ms + w * 0.025), w * 0.96 - coinsW - w * 0.025 - w / 2);
  // Hauteur tirée de la place disponible, largeur selon les proportions de l'image
  const lh = clamp(half * 2, w * 0.36, w * 0.6) * 0.643, lw = lh * LOGO_RATIO, lt0 = insetTop + w * 0.015;
  drawTopBar(canvas, profile.coins, 0, lt0 + lh * 0.42, ms, cph);
  // (le logo flotte doucement)
  const lt = lt0 + Math.sin(time * 1.6) * w * 0.006;
  if (logoImg.complete && logoImg.naturalWidth) canvas.drawBitmap(logoImg, w / 2 - lw / 2, lt, lw, lh);
  else drawLogo(canvas, 'HOP BOX', w / 2, lt0 + lh * 0.6, lw * 0.22);
  // Toucher le logo ne fait rien (et surtout ne lance pas de saut)
  buttons.push({ rect: new RectF(w / 2 - lw / 2, lt0, w / 2 + lw / 2, lt0 + lh), action: () => {}, silent: true });
  const pb = lt0 + lh;
  // Records en texte, centrés sous le logo : le tien, puis le record mondial (toucher = classement)
  refreshWorldTop();
  textPaint.textSize = w * 0.052;
  const y1 = pb + w * 0.07, l1 = tr('home.your_record', { n: best });
  canvas.drawText(fitText(l1, textPaint, w * 0.9), w / 2, y1, textPaint);
  buttons.push({ rect: new RectF(w * 0.15, y1 - w * 0.06, w * 0.85, y1 + w * 0.02), action: () => openBoard(0) });
  if (worldTop.best > 0) {
    textPaint.textSize = w * 0.04;
    const y2 = y1 + w * 0.065;
    const l2 = tr('home.world_record', { n: worldTop.best });
    canvas.drawText(fitText(l2, textPaint, w * 0.9), w / 2, y2, textPaint);
    buttons.push({ rect: new RectF(w * 0.1, y2 - w * 0.05, w * 0.9, y2 + w * 0.02), action: () => openBoard(3) });
  }
}

/** Panneau du menu ☰ (par-dessus l'accueil ou l'écran de fin), aux couleurs du thème Nuit & Or. */
function drawHomeMenu(canvas) {
  if (!menu.open) return;
  if (state !== State.READY && state !== State.GAME_OVER) { menu.open = false; return; }
  buttons.length = 0;
  const raw = clamp((time - menu.openedAt) / MENU_ANIM, 0, 1), q = 1 - (1 - raw) ** 3;
  progPaint.shader = null;
  progPaint.color = Color.argb(Math.round(175 * q), 6, 10, 26); canvas.drawRect(0, 0, w, h, progPaint);
  const pw = w * 0.8, left = -pw * (1 - q);
  const panel = new RectF(left - w * 0.1, 0, left + pw, h);
  // Ombre, liseré doré sur le bord droit, corps bleu nuit
  progPaint.color = Color.argb(110, 2, 5, 16);
  rect.set(panel.left, panel.top, panel.right + w * 0.02, panel.bottom); canvas.drawRoundRect(rect, w * 0.06, w * 0.06, progPaint);
  progPaint.color = Color.WHITE;
  progPaint.shader = new LinearGradient(0, 0, 0, h, [UI.GOLD_HI, UI.GOLD_LO, UI.GOLD_HI], [0, 0.55, 1]);
  rect.set(panel.left, panel.top - w * 0.1, panel.right + w * 0.007, panel.bottom + w * 0.1); canvas.drawRoundRect(rect, w * 0.06, w * 0.06, progPaint);
  progPaint.shader = new LinearGradient(0, 0, 0, h, UI.PANEL_TOP, UI.PANEL_BOTTOM);
  rect.set(panel.left, panel.top - w * 0.1, panel.right, panel.bottom + w * 0.1); canvas.drawRoundRect(rect, w * 0.055, w * 0.055, progPaint);
  progPaint.shader = new LinearGradient(0, 0, 0, w * 0.6, Color.argb(46, 120, 165, 255), Color.argb(0, 120, 165, 255));
  canvas.drawRoundRect(rect, w * 0.055, w * 0.055, progPaint);
  progPaint.shader = null;
  const x0 = left + w * 0.05, x1 = left + pw - w * 0.05, items = [];
  // En-tête : petit logo et bouton ✕
  const hy = insetTop + w * 0.1;
  const lh = w * 0.206, lw = lh * LOGO_RATIO, lcx = (x0 + x1) / 2 - w * 0.04;
  if (logoImg.complete && logoImg.naturalWidth) canvas.drawBitmap(logoImg, lcx - lw / 2, insetTop + w * 0.015, lw, lh);
  else drawLogo(canvas, 'HOP BOX', lcx, hy + w * 0.035, w * 0.085, false);
  const cs = w * 0.1, close = new RectF(x1 - cs, hy - cs / 2, x1, hy + cs / 2);
  drawGlassSquare(canvas, close);
  progText.color = Color.WHITE; progText.textSize = cs * 0.5;
  // La croix s'enfonce avec le bouton (même décalage que drawGlassSquare)
  const closeDown = isPressed(close) ? w * 0.009 : 0;
  canvas.drawText('✕', close.centerX(), close.centerY() + closeDown + cs * 0.18, progText);
  items.push({ rect: close, action: () => closeHomeMenu() });
  // Aventure : le chapitre en cours mis en avant, et l'énergie
  let y = insetTop + w * 0.26;
  progText.textAlign = Align.LEFT; progText.textSize = w * 0.032; progText.color = UI.DIM;
  canvas.drawText(tr('quest.button').toUpperCase(), x0 + w * 0.01, y, progText);
  progText.textAlign = Align.CENTER;
  y += w * 0.025;
  const c = currentChapter(), card = new RectF(x0, y, x1, y + w * 0.16);
  drawChapterCard(canvas, card, c, true);
  items.push({ rect: card, action: () => { closeHomeMenu(); quest.season = c; openQuestMap(); } });
  y = card.bottom + w * 0.06;
  // (4e valeur : pastille rouge sur la ligne)
  const rows = [['🛍️', tr('hud.shop'), () => openCustomize(), canAffordSomething()], ['⚔️', tr('duel.title'), () => openDuels(0), duelsBadge() > 0],
    ['🏆', tr('hud.board'), () => openBoard(0)], ['🎯', tr('hud.progress'), () => openMissions()], ['📊', tr('stats.title'), () => openStats()],
    ['❓', tr('tuto.menu'), () => openGuide()], ['⚙️', tr('hud.settings'), () => openSettings()]];
  // Les lignes rétrécissent sur les petits écrans pour que tout tienne
  const rh = Math.min(w * 0.125, (ub() - y - w * 0.07) / rows.length - w * 0.03);
  rows.forEach(([icon, label, action, badge], i) => {
    if (i === rows.length - 1) y += w * 0.03;
    const r = new RectF(x0, y, x1, y + rh), dn = isPressed(r) ? w * 0.006 : 0;
    drawCard(canvas, r.left, r.top + dn, r.right, r.bottom + dn, '', rh * 0.3);
    progText.color = Color.WHITE; progText.textSize = rh * 0.5;
    canvas.drawText(icon, r.left + rh * 0.55, r.centerY() + dn + rh * 0.18, progText);
    progText.textAlign = Align.LEFT; progText.color = Color.WHITE; progText.textSize = rh * 0.36;
    canvas.drawText(fitText(label, progText, r.width() - rh * 1.8), r.left + rh * 1.05, r.centerY() + dn + rh * 0.13, progText);
    progText.textAlign = Align.CENTER; progText.color = UI.DIM; progText.textSize = rh * 0.5;
    canvas.drawText('›', r.right - rh * 0.4, r.centerY() + dn + rh * 0.17, progText);
    if (badge) drawRedDot(canvas, r.right - rh * 0.85, r.centerY() + dn, w * 0.018);
    items.push({ rect: r, action: () => { closeHomeMenu(); action(); } });
    y += rh + w * 0.03;
  });
  progText.color = Color.WHITE;
  // Les liens d'abord, puis le panneau (toucher dans le vide = rien), puis le voile (toucher = fermer)
  buttons.length = 0;
  buttons.push(...items);
  buttons.push({ rect: new RectF(panel.left, panel.top, panel.right, panel.bottom), action: () => {} });
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => closeHomeMenu() });
}
