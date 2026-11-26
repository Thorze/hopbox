'use strict';
// Accueil épuré (équivalent de HomeMenu.kt) : un bouton ☰ en haut à gauche et les pièces en haut à droite
// (toucher = boutique). ☰ ouvre un panneau qui glisse depuis la gauche : Aventure (chapitre en cours et
// énergie), Boutique, Classement, Progression, Statistiques et Réglages. Pastille rouge sur ☰ quand il y a
// quelque chose à aller voir (achat possible, niveau qui t'attend avec le plein d'énergie).

// Accueil : ☰, logo et pièces en haut ; dessous quatre grandes cases (Mode libre, Aventure, Map de la semaine,
// Duels) et un bandeau Classement (plan_accueil.md). cards = faux : Mode libre choisi, le personnage attend le saut.
// wasLocked / unlockAt : cases vues verrouillées pendant cette session, moment du déblocage (petite animation).
// shakeAt / shakeX / shakeY : case verrouillée touchée (centre) et moment du toucher : elle tremble un instant.
const menu = { open: false, openedAt: 0, cards: true, wasLocked: false, unlockAt: -9, shakeAt: -9, shakeX: 0, shakeY: 0 };
/** Nouveau joueur : tant que sa première partie (Mode libre) n'est pas finie, seule la case Mode libre est ouverte. */
function homeLocked() { return Stats.get('games') < 1 && profile.best === 0; }
/** Durée de l'animation de déblocage des cases. */
const UNLOCK_ANIM = 0.8;
/** Taille du logo de l'accueil par rapport à l'ancien accueil sans cases. */
const HOME_LOGO = 0.8;
const MENU_ANIM = 0.22;

// (Aventure, Duels et Map de la semaine ont leur pastille sur leur case de l'accueil)
function menuBadge() { return canAffordSomething() || Fest.badge(); }
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
function drawTopBar(canvas, coinsShown = profile.coins, bump = 0, cy = topBarCy(), s = w * TOP_BTN, ph = w * TOP_PILL, energyShown = null, back = false) {
  // back : flèche ← (Mode libre : retour aux cases de l'accueil) à la place du ☰
  const face = drawTopLeftButton(canvas, cy, s, back, () => { if (back) menu.cards = true; else openHomeMenu(); });
  if (!back && menuBadge()) drawRedDot(canvas, face.right - s * 0.06, face.top + s * 0.06, w * 0.022);
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

/** En-tête de l'accueil : ☰ et pièces (plus petits) de chaque côté du logo. Renvoie le bas de l'en-tête. */
function drawHomeHeader(canvas) {
  // Le logo prend la place qui reste entre ☰ et les pièces
  const ms = w * 0.09, cph = w * 0.072;
  progText.textSize = cph * 0.46;
  const coinsW = progText.measureText(String(profile.coins)) + cph + w * 0.05;
  const half = Math.min(w / 2 - (w * 0.04 + ms + w * 0.025), w * 0.96 - coinsW - w * 0.025 - w / 2);
  // Hauteur tirée de la place disponible, largeur selon les proportions de l'image
  const lh = clamp(half * 2, w * 0.36, w * 0.6) * 0.643 * HOME_LOGO, lw = lh * LOGO_RATIO, lt0 = insetTop + w * 0.015;
  const cy = lt0 + lh * 0.42;
  drawTopBar(canvas, profile.coins, 0, cy, ms, cph);
  // Fête en cours : son bouton sous le ☰ (festui.js)
  drawFestButton(canvas, w * 0.04 + ms / 2, cy + ms * 1.3, ms);
  // (le logo flotte doucement)
  const lt = lt0 + Math.sin(time * 1.6) * w * 0.006;
  if (logoImg.complete && logoImg.naturalWidth) canvas.drawBitmap(logoImg, w / 2 - lw / 2, lt, lw, lh);
  else drawLogo(canvas, 'HOP BOX', w / 2, lt0 + lh * 0.6, lw * 0.22);
  // Toucher le logo ne fait rien (et surtout ne lance pas de saut)
  buttons.push({ rect: new RectF(w / 2 - lw / 2, lt0, w / 2 + lw / 2, lt0 + lh), action: () => {}, silent: true });
  // (sous le bouton de la Fête et la pastille d'énergie)
  return Math.max(lt0 + lh, cy + ms * 1.8);
}

/*
 * Cases de l'accueil : 2 × 2 en portrait, 4 sur une ligne sur un écran large, puis le bandeau Classement.
 * Titre et texte gardent leur taille ; seule l'illustration rétrécit quand la place manque. Le bloc est centré
 * dans la place qui reste entre l'en-tête et le bas utilisable (ub), jamais en dessous.
 */
function drawHomeCards(canvas) {
  const top0 = drawHomeHeader(canvas) + w * 0.03, bottom = ub() - w * 0.04;
  // Unité des cases : la largeur, sauf sur un écran large (tablette couchée) où elle suivrait trop la largeur
  const u = Math.min(w, h * 0.62), gap = u * 0.035, left = w * 0.04, right = w * 0.96, bandH = u * 0.17;
  const wide = h < w * 1.25, cols = wide ? 4 : 2, rows = wide ? 1 : 2;
  const cw = (right - left - gap * (cols - 1)) / cols, avail = bottom - top0 - bandH - gap;
  const ch = Math.max(u * 0.2, Math.min(cw * (wide ? 1.4 : 1.5), (avail - gap * (rows - 1)) / rows));
  const block = ch * rows + gap * (rows - 1) + gap + bandH;
  const top = top0 + Math.max(0, (bottom - top0 - block) / 2);
  const cell = (i) => {
    const l = left + (i % cols) * (cw + gap), t = top + Math.floor(i / cols) * (ch + gap);
    return new RectF(l, t, l + cw, t + ch);
  };
  // Illustrations : petites scènes animées avec ton personnage (drawHomeScene).
  // Texte du bas : ce qui t'attend (record, chapitre en cours, ton meilleur de la semaine, défis reçus).
  const noel = weeklyNoel(), c = currentChapter(), nd = duelsBadge();
  // Premier lancement : Aventure, Semaine et Duels verrouillés ; débloqués (avec une petite animation) au retour
  // à l'accueil après la première partie
  if (homeLocked()) menu.wasLocked = true;
  else if (menu.wasLocked) { menu.wasLocked = false; menu.unlockAt = time; sounds.play('UNLOCK'); }
  drawHomeTile(canvas, cell(0), SCENE_FREE, tr('home.free'), homeFreeDesc(), u, false, false, () => { menu.cards = false; });
  drawHomeTile(canvas, cell(1), SCENE_ADVENTURE, tr('quest.button'), homeAdventureDesc(c), u, chapterCallsYou(c), true, () => { quest.season = c; openQuestMap(); });
  drawHomeTile(canvas, cell(2), SCENE_WEEKLY, tr(noel ? 'weekly.title_noel' : 'weekly.title'), homeWeeklyDesc(), u, weeklyBadge(), true, () => openWeekly());
  drawHomeTile(canvas, cell(3), SCENE_DUELS, tr('duel.title'), nd > 0 ? tr('home.duels_new', { n: nd }) : tr('home.duels_desc'), u, nd > 0, true, () => openDuels(0));
  const bandTop = top + ch * rows + gap * (rows - 1) + gap;
  drawHomeBoard(canvas, new RectF(left, bandTop, right, bandTop + bandH), u);
  // Toucher à côté des cases : rien (et surtout pas de saut)
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {}, silent: true });
}

// Textes du bas des cases
function homeFreeDesc() { return best > 0 ? tr('common.record', { n: best }) : tr('home.free_desc'); }
function homeAdventureDesc(c) {
  return tr('home.adventure_progress', { n: c, i: Math.min(QuestProgress.done(c) + 1, Quest.LEVELS), t: Quest.LEVELS });
}
/** Ton meilleur de la semaine (ou « pas encore joué ») et le temps qui reste ; texte fixe tant que rien n'est chargé. */
function homeWeeklyDesc() {
  const i = weekly.info;
  if (!i) return tr('home.weekly_desc');
  const left = Math.max(0, i.endsIn - Math.floor((Date.now() - weekly.loadedAt) / 1000));
  return tr(i.best > 0 ? 'home.weekly_best' : 'home.weekly_new', { n: i.best }) + '\n' + tr('home.weekly_ends', { t: fmtWeekLeft(left) });
}

/**
 * Une case de l'accueil : titre en haut, illustration, texte court (2 lignes au plus) en bas ; badge : pastille rouge.
 * lockable : case verrouillée au premier lancement (homeLocked) : grisée avec un cadenas, son toucher rappelle qu'il
 * faut d'abord finir une partie.
 */
function drawHomeTile(canvas, r, scene, title, desc0, u, badge0, lockable, action) {
  const locked = lockable && homeLocked(), desc = locked ? tr('home.locked') : desc0, badge = badge0 && !locked;
  const dn = isPressed(r) ? w * 0.008 : 0;
  canvas.save(); canvas.translate(0, dn);
  // Déblocage : la case rebondit, liseré doré qui s'efface
  const uk = (time - menu.unlockAt) / UNLOCK_ANIM, unlocking = lockable && uk >= 0 && uk <= 1;
  if (unlocking) { const sc = 1 + 0.08 * Math.sin(uk * Math.PI); canvas.scale(sc, sc, r.centerX(), r.centerY()); }
  // Case verrouillée touchée : elle tremble
  const st = time - menu.shakeAt;
  if (locked && st >= 0 && st <= 0.4 && Math.abs(r.centerX() - menu.shakeX) < 1 && Math.abs(r.centerY() - menu.shakeY) < 1)
    canvas.translate(Math.sin(st * 45) * u * 0.015 * (1 - st / 0.4), 0);
  drawCard(canvas, r.left, r.top, r.right, r.bottom, '', u * 0.045);
  const pad = u * 0.03, cx = r.centerX();
  // Titre
  progText.color = locked ? UI.SOFT : Color.WHITE; progText.textSize = Math.min(u * 0.05, r.width() * 0.13);
  const ts = progText.textSize;
  // (marge de chaque côté pour la pastille rouge, dans le coin haut droit)
  canvas.drawText(fitText(title, progText, r.width() - pad * 2 - u * 0.07), cx, r.top + pad + ts * 0.85, progText);
  // Texte du bas
  greyTextPaint.textSize = Math.min(u * 0.034, r.width() * 0.09);
  const lines = wrapText(desc, greyTextPaint, r.width() - pad * 2), n = Math.min(2, lines.length);
  // (place de 2 lignes réservée, une seule ligne y est centrée : les illustrations ont toutes la même hauteur)
  const lh = greyTextPaint.textSize * 1.22, dTop = r.bottom - pad * 0.8 - 2 * lh;
  for (let i = 0; i < n; i++) canvas.drawText(lines[i], cx, dTop + lh * (i + 0.8 + (2 - n) * 0.5), greyTextPaint);
  progText.color = Color.WHITE;
  // Illustration : la place qui reste entre les deux
  rect.set(r.left + pad, r.top + pad + ts * 1.3, r.right - pad, dTop - pad * 0.4);
  if (rect.height() > u * 0.04) {
    // Décor et scène (immobile et grisée si la case est verrouillée), cadenas
    // (copie : le dessin du personnage se sert du rectangle commun « rect »)
    const ir = new RectF(rect.left, rect.top, rect.right, rect.bottom);
    drawHomeScene(canvas, scene, ir, u, locked);
    if (locked) {
      progPaint.color = Color.argb(185, 39, 44, 61);
      canvas.drawRoundRect(ir, u * 0.03, u * 0.03, progPaint);
      progText.textSize = Math.min(ir.height() * 0.33, ir.width() * 0.27);
      canvas.drawText('🔒', ir.centerX(), ir.centerY() + progText.textSize * 0.35, progText);
    }
  }
  if (badge) drawRedDot(canvas, r.right - u * 0.035, r.top + u * 0.035, w * 0.024);
  if (unlocking) {
    progStroke.color = UI.GOLD; progStroke.alpha = Math.round(255 * (1 - uk)); progStroke.strokeWidth = u * 0.012;
    canvas.drawRoundRect(r, u * 0.045, u * 0.045, progStroke);
    progStroke.alpha = 255;
  }
  canvas.restore();
  buttons.push({ rect: new RectF(r.left, r.top, r.right, r.bottom), action: () => {
    if (locked) { menu.shakeAt = time; menu.shakeX = r.centerX(); menu.shakeY = r.centerY(); } else action();
  } });
}

/** Bandeau Classement de l'accueil : ton record et le record mondial (toucher = classement). */
function drawHomeBoard(canvas, r, u) {
  refreshWorldTop();
  const dn = isPressed(r) ? w * 0.008 : 0;
  canvas.save(); canvas.translate(0, dn);
  drawCard(canvas, r.left, r.top, r.right, r.bottom, 'gold', u * 0.045);
  const s = r.height(), cy = r.centerY();
  progText.color = Color.WHITE; progText.textSize = s * 0.5;
  canvas.drawText('🏆', r.left + s * 0.55, cy + s * 0.18, progText);
  const x = r.left + s * 1.05, maxW = r.right - x - s * 0.45;
  progText.textAlign = Align.LEFT; progText.textSize = u * 0.05;
  canvas.drawText(fitText(tr('hud.board'), progText, maxW), x, cy - s * 0.04, progText);
  const line = tr('home.your_record', { n: best }) + (worldTop.best > 0 ? '   ·   ' + tr('home.world_record', { n: worldTop.best }) : '');
  greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = u * 0.034; greyTextPaint.color = UI.GOLD;
  canvas.drawText(fitText(line, greyTextPaint, maxW), x, cy + s * 0.27, greyTextPaint);
  greyTextPaint.color = UI.SOFT; greyTextPaint.textAlign = Align.CENTER;
  progText.textAlign = Align.CENTER; progText.color = UI.DIM; progText.textSize = s * 0.4;
  canvas.drawText('›', r.right - s * 0.3, cy + s * 0.14, progText);
  progText.color = Color.WHITE;
  canvas.restore();
  buttons.push({ rect: new RectF(r.left, r.top, r.right, r.bottom), action: () => openBoard(0) });
}

/** Mode libre, avant le premier saut : ← (retour aux cases) et les pièces en haut, ton record dessous. */
function drawFreeHeader(canvas) {
  drawTopBar(canvas, profile.coins, 0, topBarCy(), w * TOP_BTN, w * TOP_PILL, null, true);
  textPaint.textSize = w * 0.05;
  canvas.drawText(fitText(tr('home.your_record', { n: best }), textPaint, w * 0.9), w / 2, topBarCy() + w * 0.21, textPaint);
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
  // Liens (Aventure, Duels, Map de la semaine et Classement sont des cases de l'accueil) ; 4e valeur : pastille rouge
  let y = insetTop + w * 0.3;
  const rows = [['🛍️', tr('hud.shop'), () => openCustomize(), canAffordSomething()], ['🎯', tr('hud.progress'), () => openMissions()],
    ['📊', tr('stats.title'), () => openStats()], ['❓', tr('tuto.menu'), () => openGuide()], ['⚙️', tr('hud.settings'), () => openSettings()]];
  // Fête en cours : en tête de liste (festui.js)
  const fest = Fest.main();
  if (fest) rows.unshift([festIcon(fest), festTitle(fest), () => openFest(), Fest.badge()]);
  // Écran de fin : « Accueil » en tête, pour retrouver les cases (Aventure, Duels…)
  if (state === State.GAME_OVER) rows.unshift(['🏠', tr('menu.home'), () => resetGame()]);
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

// ---------- Scènes animées des cases de l'accueil (comme HomeMenu.kt) ----------
// Dessinées avec les éléments du jeu : ton personnage (avec ce que tu as équipé en boutique), tes blocs, l'île du
// chapitre en cours. Repère « monde » : +x vers le haut à droite, +z vers le haut à gauche, comme dans la partie.

const SCENE_FREE = 0, SCENE_ADVENTURE = 1, SCENE_WEEKLY = 2, SCENE_DUELS = 3;
const scenePaint = new Paint({ strokeCap: 'butt' }), sceneText = new Paint({ textAlign: Align.CENTER, bold: true });
const sceneFlag = new Path();

/** Position à l'écran (en k) d'un point du monde posé au sol. */
function sceneIsoX(x, z) { return (x - z) * 0.8660254; }
function sceneIsoY(x, z) { return -(x + z) * 0.5; }

/** Bloc du monde au point (x, z), dessus centré là ; a : demi-côté. */
function sceneBlock(canvas, x, z, a, color) {
  canvas.save(); canvas.translate(sceneIsoX(x, z) * k, sceneIsoY(x, z) * k);
  drawTexturedBox(canvas, { half: a, baseColor: color }, lookBlock);
  canvas.restore();
}

/** Ton personnage posé en (x, z), soulevé de y (en unités du monde). */
function sceneHero(canvas, x, z, y, squash, dirX, front) {
  drawCharacter(canvas, sceneIsoX(x, z) * k, sceneIsoY(x, z) * k, y, 1 + squash * 0.12, 1 - squash * 0.18, dirX, false, front);
}

/** Saut en boucle : avancement du vol (0 → 1), hauteur (en cloche) et écrasement au départ et à l'arrivée. */
function sceneHop(t, wait, fly, height) {
  const land = 0.22;
  if (t < wait) return { p: 0, y: 0, squash: clamp((t - (wait - 0.18)) / 0.18, 0, 1) };
  if (t < wait + fly) { const q = (t - wait) / fly; return { p: q, y: Math.sin(q * Math.PI) * height, squash: 0 }; }
  return { p: 1, y: 0, squash: clamp(1 - (t - wait - fly) / land, 0, 1) };
}

/** Scène d'une case, centrée dans r et à sa taille. locked : image figée. */
function drawHomeScene(canvas, scene, r, u, locked) {
  const t = locked ? 0 : time;
  canvas.save();
  const clip = new Path();
  if (clip.p.roundRect) clip.p.roundRect(r.left, r.top, r.width(), r.height(), u * 0.03); else clip.p.rect(r.left, r.top, r.width(), r.height());
  canvas.clipPath(clip);
  drawSceneBackdrop(canvas, scene, r, t);
  canvas.save();
  // Taille de chaque scène (en k) : largeur, hauteur
  let wk = scene === SCENE_ADVENTURE ? 3.6 : 4.4, hk = scene === SCENE_ADVENTURE ? 4.4 : scene === SCENE_DUELS ? 4.2 : 5.4;
  // Map de la semaine : le chemin change de forme chaque semaine, le cadre est pris sur ses blocs et le drapeau
  let cx0 = 0, cy0 = 0;
  if (scene === SCENE_WEEKLY) {
    const p = weekPathFor(weekly.info ? weekly.info.seed : 4821);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < 5; i++) {
      const sx = sceneIsoX(p.x[i], p.z[i]), sy = sceneIsoY(p.x[i], p.z[i]);
      x0 = Math.min(x0, sx - 0.95); x1 = Math.max(x1, sx + 0.95);
      y0 = Math.min(y0, sy - (i === 4 ? 1.6 : 1.3)); y1 = Math.max(y1, sy + 0.55 + platformDepth);
    }
    x1 = Math.max(x1, sceneIsoX(p.x[4], p.z[4]) + 0.9);
    wk = x1 - x0 + 0.3; hk = y1 - y0 + 0.3; cx0 = (x0 + x1) / 2; cy0 = (y0 + y1) / 2;
  }
  const sc = Math.min(r.width() / (wk * k), r.height() / (hk * k));
  canvas.translate(r.centerX(), r.centerY()); canvas.scale(sc, sc); canvas.translate(-cx0 * k, -cy0 * k);
  if (scene === SCENE_FREE) sceneFree(canvas, t);
  else if (scene === SCENE_ADVENTURE) sceneAdventure(canvas, t);
  else if (scene === SCENE_WEEKLY) sceneWeekly(canvas, t);
  else sceneDuels(canvas, t);
  canvas.restore();
  drawSceneFinish(canvas, r, u);
  canvas.restore();
}

/** Mode libre : ton personnage saute d'un bloc à l'autre, aller et retour. */
function sceneFree(canvas, t) {
  // Deux blocs le long de x ; le milieu du saut au centre du cadre
  const d = 1.9;
  canvas.translate(-sceneIsoX(d / 2, 0) * k, k * 0.55);
  sceneBlock(canvas, d, 0, 0.55, palette[1]);
  sceneBlock(canvas, 0, 0, 0.55, palette[0]);
  const leg = 1.25, back = Math.floor(t / leg) % 2 === 1, hp = sceneHop(t % leg, 0.45, 0.5, 1.1);
  sceneHero(canvas, back ? d * (1 - hp.p) : d * hp.p, 0, hp.y, hp.squash, true, back);
}

/** Aventure : l'île du chapitre en cours (comme sur la carte), ton personnage qui sautille dessus. */
function sceneAdventure(canvas, t) {
  const c = currentChapter(), r = k * 1.45, y0 = k * 0.35 + Math.sin(t * 1.3) * k * 0.06;
  drawHeroIsland(canvas, Math.max(2, c), 0, y0, r);
  canvas.save(); canvas.translate(0, y0);
  const hp = sceneHop(t % 1.6, 1.1, 0.4, 0.55);
  sceneHero(canvas, 0, 0, hp.y, hp.squash, Math.floor(t / 3.2) % 2 === 0, false);
  canvas.restore();
  // Numéro du chapitre sur un fanion planté dans l'île
  const fx0 = r * 0.55, fy0 = y0 + r * 0.02;
  scenePaint.style = Style.STROKE; scenePaint.color = Color.parseColor('#5D4037'); scenePaint.strokeWidth = k * 0.06;
  canvas.drawLine(fx0, fy0, fx0, fy0 - k * 1.2, scenePaint);
  scenePaint.style = Style.FILL; scenePaint.color = UI.GOLD;
  sceneFlag.reset(); sceneFlag.moveTo(fx0, fy0 - k * 1.2); sceneFlag.lineTo(fx0 + k * 0.75, fy0 - k * 1.0); sceneFlag.lineTo(fx0, fy0 - k * 0.8); sceneFlag.close();
  canvas.drawPath(sceneFlag, scenePaint);
  sceneText.family = null; sceneText.style = Style.FILL; sceneText.color = UI.INK_DARK; sceneText.textSize = k * 0.32;
  canvas.drawText(String(c), fx0 + k * 0.27, fy0 - k * 0.89, sceneText);
}

/** Blocs du petit chemin de la semaine : tirés de la graine de la map, pour qu'il change chaque semaine. */
const weekPath = { seed: null, x: [], z: [], a: [], c: [] };
function weekPathFor(seed) {
  const p = weekPath;
  if (p.seed === seed) return p;
  p.seed = seed;
  // (petit générateur à graine : le même chemin pour tout le monde la même semaine)
  let st = (seed | 0) || 1;
  const rnd = () => { st = (Math.imul(st, 1103515245) + 12345) | 0; return ((st >>> 8) & 0xFFFF) / 65536; };
  let x = 0, z = 0;
  for (let i = 0; i < 5; i++) {
    p.x[i] = x; p.z[i] = z; p.a[i] = 0.36 + rnd() * 0.16; p.c[i] = palette[Math.floor(rnd() * palette.length)];
    if (rnd() < 0.5) x += 1.45; else z += 1.45;
  }
  // Milieu du chemin à l'origine
  const mx = (p.x[0] + p.x[4]) / 2, mz = (p.z[0] + p.z[4]) / 2;
  for (let i = 0; i < 5; i++) { p.x[i] -= mx; p.z[i] -= mz; }
  return p;
}

/** Map de la semaine : un petit chemin de blocs jusqu'au drapeau à damier, ton personnage le parcourt. */
function sceneWeekly(canvas, t) {
  const p = weekPathFor(weekly.info ? weekly.info.seed : 4821);
  // Du plus loin au plus proche (le chemin monte vers le fond)
  for (let i = 4; i >= 0; i--) sceneBlock(canvas, p.x[i], p.z[i], p.a[i], p.c[i]);
  // Drapeau sur le dernier bloc
  const fx0 = sceneIsoX(p.x[4], p.z[4]) * k + k * 0.15, fy0 = sceneIsoY(p.x[4], p.z[4]) * k;
  scenePaint.style = Style.STROKE; scenePaint.color = Color.parseColor('#ECEFF1'); scenePaint.strokeWidth = k * 0.06;
  canvas.drawLine(fx0, fy0, fx0, fy0 - k * 1.4, scenePaint);
  scenePaint.style = Style.FILL;
  const sq = k * 0.17;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    scenePaint.color = (i + j) % 2 === 0 ? Color.WHITE : Color.parseColor('#22252F');
    const wave = Math.sin(t * 5 + i * 0.9) * k * 0.04;
    canvas.drawRect(fx0 + i * sq, fy0 - k * 1.4 + j * sq + wave, fx0 + (i + 1) * sq, fy0 - k * 1.4 + (j + 1) * sq + wave, scenePaint);
  }
  // Un saut par bloc, puis retour au départ
  const leg = 0.75, n = Math.floor(t / leg) % 5;
  if (n === 4) { sceneHero(canvas, p.x[4], p.z[4], 0, 0, true, true); return; }
  const hp = sceneHop(t % leg, 0.3, 0.38, 0.8);
  sceneHero(canvas, p.x[n] + (p.x[n + 1] - p.x[n]) * hp.p, p.z[n] + (p.z[n + 1] - p.z[n]) * hp.p, hp.y, hp.squash, p.x[n + 1] > p.x[n], false);
}

/** Duels : ton personnage face à un adversaire, chacun sur son bloc, qui sautent chacun leur tour ; « VS » au-dessus. */
function sceneDuels(canvas, t) {
  canvas.translate(0, k * 0.75);
  const d = 1.25;
  sceneBlock(canvas, -d / 2, d / 2, 0.5, palette[6]);
  sceneBlock(canvas, d / 2, -d / 2, 0.5, palette[5]);
  const me = sceneHop(t % 1.4, 0.2, 0.4, 0.6);
  sceneHero(canvas, -d / 2, d / 2, me.y, me.squash, true, false);
  const them = sceneHop((t + 0.7) % 1.4, 0.2, 0.4, 0.6);
  canvas.save(); canvas.translate(sceneIsoX(d / 2, -d / 2) * k, -them.y * k);
  drawOpponentCharacter(canvas, { opponent: { code: 'HOPBOX' } });
  canvas.restore();
  // « VS » doré qui pulse, au-dessus des deux
  sceneText.family = 'Teko'; sceneText.textSize = k * 1.1 * (1 + 0.08 * Math.sin(t * 6));
  const vy = -k * 1.9;
  sceneText.style = Style.STROKE; sceneText.strokeWidth = k * 0.14; sceneText.color = Color.parseColor('#3A1020');
  canvas.drawText('VS', 0, vy, sceneText);
  sceneText.style = Style.FILL; sceneText.color = UI.GOLD;
  canvas.drawText('VS', 0, vy, sceneText);
}

// ---------- Décors de fond des scènes (comme HomeMenu.kt) ----------
// Un décor par case (ciel et collines, coucher de soleil et rayons, nuit étoilée, rayons d'arcade), puis des
// finitions communes : halo derrière le sujet (avant la scène), bords assombris, reflet en haut et liseré (après).

const bdPath = new Path(), bdRect = new RectF(0, 0, 0, 0);
const bdColor = (s) => Color.parseColor(s);

/** Nombre pseudo-aléatoire stable (0..1) pour placer nuages, étoiles et étincelles toujours au même endroit. */
function bdRnd(i, salt) { const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.547; return v - Math.floor(v); }

/** Rayons qui tournent autour de (cx, cy) : n pointes de couleur color. */
function bdRays(canvas, cx, cy, len, n, rot, color) {
  scenePaint.shader = null; scenePaint.style = Style.FILL; scenePaint.color = color;
  bdPath.reset();
  const step = 2 * Math.PI / n;
  for (let i = 0; i < n; i++) {
    const a0 = rot + i * step, a1 = a0 + step * 0.5;
    bdPath.moveTo(cx, cy); bdPath.lineTo(cx + Math.cos(a0) * len, cy + Math.sin(a0) * len); bdPath.lineTo(cx + Math.cos(a1) * len, cy + Math.sin(a1) * len); bdPath.close();
  }
  canvas.drawPath(bdPath, scenePaint);
}

/** Nuage doux (trois bulles) centré en (x, y), de largeur s. */
function bdCloud(canvas, x, y, s, alpha) {
  scenePaint.shader = null; scenePaint.style = Style.FILL; scenePaint.color = Color.argb(alpha, 246, 251, 255);
  canvas.drawCircle(x - s * 0.28, y, s * 0.22, scenePaint);
  canvas.drawCircle(x + s * 0.02, y - s * 0.1, s * 0.3, scenePaint);
  canvas.drawCircle(x + s * 0.3, y + s * 0.02, s * 0.2, scenePaint);
  canvas.drawRect(x - s * 0.28, y, x + s * 0.3, y + s * 0.2, scenePaint);
}

/** Fond de la case (avant la scène), dans le cadre r déjà découpé aux coins arrondis. */
function drawSceneBackdrop(canvas, scene, r, t) {
  const W = r.width(), H = r.height(), p = scenePaint;
  p.style = Style.FILL;
  if (scene === SCENE_FREE) {
    // Ciel de jour, soleil en haut à droite, nuages qui passent, collines vertes en bas
    p.color = Color.WHITE; p.shader = new LinearGradient(0, r.top, 0, r.bottom, [bdColor('#3FA2EE'), bdColor('#8FD3FF'), bdColor('#D8F1FF')], [0, 0.55, 1]);
    canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
    p.color = Color.WHITE; p.shader = new RadialGradient(r.right - W * 0.18, r.top + H * 0.16, W * 0.55, [Color.argb(170, 255, 236, 160), Color.argb(0, 255, 236, 160)]);
    canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
    p.shader = null; p.color = bdColor('#FFF3B0');
    canvas.drawCircle(r.right - W * 0.18, r.top + H * 0.16, W * 0.09, p);
    for (let i = 0; i < 3; i++) {
      const sp = 0.025 + bdRnd(i, 1) * 0.02, x = r.left - W * 0.3 + ((bdRnd(i, 2) + t * sp) % 1) * W * 1.6;
      bdCloud(canvas, x, r.top + H * (0.14 + bdRnd(i, 3) * 0.3), W * (0.28 + bdRnd(i, 4) * 0.14), 255);
    }
    p.color = bdColor('#7ACB6E');
    bdRect.set(r.left - W * 0.3, r.bottom - H * 0.2, r.left + W * 0.7, r.bottom + H * 0.3); canvas.drawOval(bdRect, p);
    p.color = bdColor('#5DB25A');
    bdRect.set(r.left + W * 0.35, r.bottom - H * 0.15, r.right + W * 0.35, r.bottom + H * 0.35); canvas.drawOval(bdRect, p);
  } else if (scene === SCENE_ADVENTURE) {
    // Coucher de soleil, rayons dorés qui tournent lentement, poussières de lumière qui montent
    p.color = Color.WHITE; p.shader = new LinearGradient(0, r.top, 0, r.bottom, [bdColor('#FFC36B'), bdColor('#F27A45'), bdColor('#8A3557')], [0, 0.5, 1]);
    canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
    bdRays(canvas, r.centerX(), r.top + H * 0.42, W * 1.2, 14, t * 0.12, Color.argb(34, 255, 240, 200));
    for (let i = 0; i < 10; i++) {
      const q = (bdRnd(i, 5) + t * (0.05 + bdRnd(i, 6) * 0.05)) % 1;
      p.shader = null; p.color = Color.argb(Math.round(200 * Math.sin(q * Math.PI)), 255, 230, 160);
      canvas.drawCircle(r.left + W * bdRnd(i, 7), r.bottom - q * H, W * (0.008 + bdRnd(i, 8) * 0.012), p);
    }
  } else if (scene === SCENE_WEEKLY) {
    // Nuit bleue, aurore qui ondule, étoiles qui scintillent
    p.color = Color.WHITE; p.shader = new LinearGradient(0, r.top, 0, r.bottom, [bdColor('#141E52'), bdColor('#23419A'), bdColor('#3E7BD6')], [0, 0.6, 1]);
    canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
    p.shader = null;
    for (let b = 0; b < 2; b++) {
      bdPath.reset();
      const y0 = r.top + H * (0.2 + b * 0.12);
      bdPath.moveTo(r.left, y0);
      for (let s = 1; s <= 8; s++) bdPath.lineTo(r.left + W * s / 8, y0 + Math.sin(s * 0.9 + t * 0.8 + b * 2) * H * 0.05);
      for (let s = 8; s >= 0; s--) bdPath.lineTo(r.left + W * s / 8, y0 + H * 0.09 + Math.sin(s * 0.9 + t * 0.8 + b * 2 + 0.6) * H * 0.04);
      bdPath.close();
      p.color = b === 0 ? Color.argb(55, 110, 255, 200) : Color.argb(45, 190, 140, 255);
      canvas.drawPath(bdPath, p);
    }
    for (let i = 0; i < 18; i++) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (1.2 + bdRnd(i, 9) * 2) + i));
      p.color = Color.argb(Math.round(230 * tw), 255, 255, 255);
      canvas.drawCircle(r.left + W * bdRnd(i, 10), r.top + H * bdRnd(i, 11) * 0.7, W * (0.006 + bdRnd(i, 12) * 0.008), p);
    }
  } else {
    // Arène d'arcade : rayons qui tournent derrière le « VS », traits de vitesse, étincelles
    p.color = Color.WHITE; p.shader = new LinearGradient(0, r.top, 0, r.bottom, [bdColor('#FF6A5C'), bdColor('#D4284A'), bdColor('#5C0F2A')], [0, 0.5, 1]);
    canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
    bdRays(canvas, r.centerX(), r.top + H * 0.3, W * 1.3, 16, -t * 0.25, Color.argb(40, 255, 220, 120));
    p.shader = null; p.strokeCap = 'round';
    for (let i = 0; i < 6; i++) {
      const q = (bdRnd(i, 13) + t * 0.6) % 1, y = r.top + H * (0.15 + bdRnd(i, 14) * 0.75), x = r.right + W * 0.3 - q * W * 1.8;
      p.style = Style.STROKE; p.strokeWidth = W * 0.008; p.color = Color.argb(70, 255, 255, 255);
      canvas.drawLine(x, y, x + W * 0.22, y, p);
    }
    p.style = Style.FILL;
    for (let i = 0; i < 8; i++) {
      const tw = Math.abs(Math.sin(t * 3 + i * 1.7));
      p.color = Color.argb(Math.round(220 * tw), 255, 236, 140);
      canvas.drawCircle(r.left + W * bdRnd(i, 15), r.top + H * bdRnd(i, 16), W * 0.01 * (0.5 + tw), p);
    }
  }
  // Halo de lumière derrière le sujet
  p.style = Style.FILL;
  p.color = Color.WHITE; p.shader = new RadialGradient(r.centerX(), r.centerY() + H * 0.05, Math.max(W, H) * 0.55, [Color.argb(70, 255, 255, 255), Color.argb(0, 255, 255, 255)]);
  canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
  p.shader = null;
}

/** Finitions de la case (après la scène) : bords assombris, reflet en haut, liseré lumineux. */
function drawSceneFinish(canvas, r, u) {
  const W = r.width(), H = r.height(), p = scenePaint;
  p.style = Style.FILL;
  p.color = Color.WHITE; p.shader = new RadialGradient(r.centerX(), r.centerY(), Math.max(W, H) * 0.78, [Color.argb(0, 0, 0, 0), Color.argb(0, 0, 0, 0), Color.argb(95, 8, 10, 30)], [0, 0.55, 1]);
  canvas.drawRect(r.left, r.top, r.right, r.bottom, p);
  p.color = Color.WHITE; p.shader = new LinearGradient(0, r.top, 0, r.top + H * 0.4, Color.argb(50, 255, 255, 255), Color.argb(0, 255, 255, 255));
  canvas.drawRect(r.left, r.top, r.right, r.top + H * 0.4, p);
  p.shader = null; p.style = Style.STROKE; p.strokeWidth = u * 0.006; p.color = Color.argb(90, 255, 255, 255);
  bdRect.set(r.left + u * 0.003, r.top + u * 0.003, r.right - u * 0.003, r.bottom - u * 0.003);
  canvas.drawRoundRect(bdRect, u * 0.03, u * 0.03, p);
  p.style = Style.FILL;
}
