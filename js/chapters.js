'use strict';
// Chapitres de l'Aventure : bannière de l'accueil et liste des chapitres (équivalent de Chapters.kt).

/** Nombre de chapitres affichés dans la liste (les derniers, pas encore prêts, sont grisés). */
const CHAPTERS_SHOWN = 8;

/** Le chapitre à mettre en avant : le premier pas terminé parmi ceux qui sont prêts et accessibles. */
function currentChapter() {
  for (let c = 1; c <= Quest.SEASONS; c++) {
    if (!QuestProgress.seasonUnlocked(c)) return Math.max(1, c - 1);
    if (QuestProgress.done(c) < Quest.LEVELS) return c;
  }
  return Quest.SEASONS;
}

/** Il y a un niveau à jouer et l'énergie est pleine : pastille « ! ». */
function chapterCallsYou(c) {
  return QuestProgress.done(c) < Quest.LEVELS && Energy.get(Energy.now()) >= Energy.MAX;
}

/** Carte d'un chapitre (bannière ou ligne de la liste) ; grisée si verrouillée ou pas encore prête. */
function drawChapterCard(canvas, r0, c, banner) {
  const PC = Color.parseColor, ready = c <= Quest.SEASONS, open = ready && QuestProgress.seasonUnlocked(c);
  const down = banner && isPressed(r0) ? w * 0.008 : 0;
  const r = new RectF(r0.left, r0.top + down, r0.right, r0.bottom + down);
  const rad = w * 0.045, depth = w * 0.014;
  questPaint.shader = null;
  questPaint.color = open ? PC('#2F7A68') : PC('#1A2444');
  rect.set(r.left, r.top + depth - down, r.right, r.bottom + depth - down);
  canvas.drawRoundRect(rect, rad, rad, questPaint);
  // Face unie (style plat), vert discret
  questPaint.color = Color.WHITE;
  questPaint.shader = open ? new LinearGradient(0, r.top, 0, r.bottom, PC('#6CC2AA'), PC('#3F9682')) : new LinearGradient(0, r.top, 0, r.bottom, PC('#3C4A74'), PC('#2A3558'));
  canvas.drawRoundRect(r, rad, rad, questPaint);
  questPaint.shader = null;
  questStroke.color = open ? Color.argb(120, 200, 255, 235) : Color.argb(110, 132, 168, 240); questStroke.strokeWidth = w * 0.004;
  canvas.drawRoundRect(r, rad, rad, questStroke);

  const pad = r.height() * 0.12;
  const th = new RectF(r.left + pad, r.top + pad, r.left + pad + r.height() - 2 * pad, r.bottom - pad);
  drawChapterThumb(canvas, th, c, ready);

  const tx = th.right + w * 0.035, maxW = r.right - tx - (banner ? w * 0.05 : w * 0.04);
  // Tout est placé par rapport à la hauteur de la carte (la liste des 8 chapitres a des cartes plus basses)
  const u = r.height() / 0.16;
  progText.textAlign = Align.LEFT;
  progText.color = Color.argb(215, 255, 255, 255); progText.textSize = u * 0.025;
  canvas.drawText(fitText(tr('quest.chapter_caps', { n: c }), progText, maxW), tx, r.top + u * 0.04, progText);
  progText.color = Color.WHITE; progText.textSize = u * 0.04;
  canvas.drawText(fitText(ready ? tr(`quest.s${c}.title`) : '???', progText, maxW), tx, r.top + u * 0.077, progText);
  progText.textSize = u * 0.027;
  const lineY = r.top + u * 0.135;
  if (!ready) {
    progText.color = Color.argb(230, 255, 255, 255);
    canvas.drawText(fitText('⏳ ' + tr('quest.soon'), progText, maxW), tx, lineY, progText);
  } else if (!open) {
    progText.color = Color.argb(230, 255, 255, 255);
    canvas.drawText(fitText('🔒 ' + tr('quest.chapter_locked', { n: c - 1 }), progText, maxW), tx, lineY, progText);
  } else if (QuestProgress.done(c) >= Quest.LEVELS && banner && c >= Quest.SEASONS) {
    canvas.drawText(fitText(tr('quest.next_soon'), progText, maxW), tx, lineY, progText);
  } else {
    const done = QuestProgress.done(c), barW = maxW, barY = r.top + u * 0.089;
    questPaint.color = Color.argb(70, 0, 0, 0);
    rect.set(tx, barY, tx + barW, barY + u * 0.018);
    canvas.drawRoundRect(rect, w * 0.009, w * 0.009, questPaint);
    if (done > 0) {
      questPaint.color = PC('#FFD54F');
      rect.set(tx, barY, tx + barW * done / Quest.LEVELS, barY + u * 0.018);
      canvas.drawRoundRect(rect, w * 0.009, w * 0.009, questPaint);
    }
    const lvl = done >= Quest.LEVELS ? '✓ ' + tr('quest.chapter_done') : tr('quest.banner_level', { n: done + 1, t: Quest.LEVELS });
    const coins = `${ChapterInfo.icon(c)} ${QuestProgress.totalMedals(c)}/${Quest.LEVELS * 3}`;
    // Bannière du menu : l'énergie restante aussi
    const energy = banner ? `   ⚡ ${Energy.get(Energy.now())}/${Energy.MAX}` : '';
    canvas.drawText(fitText(`${lvl}   ${coins}${energy}`, progText, barW), tx, lineY + u * 0.004, progText);
  }
  progText.textAlign = Align.CENTER; progText.color = Color.WHITE;

  if (banner) {
    if (open && chapterCallsYou(c)) {
      const bx = r.right - w * 0.012, by = r.top + w * 0.012;
      questPaint.color = PC('#E53950'); canvas.drawCircle(bx, by, w * 0.032, questPaint);
      questStroke.color = Color.WHITE; questStroke.strokeWidth = w * 0.006; canvas.drawCircle(bx, by, w * 0.032, questStroke);
      progText.textSize = w * 0.04;
      canvas.drawText('!', bx, by + w * 0.014, progText);
    }
  }
}

/** Vignette : la montagne de l'aigle pour le 1er chapitre ; un « ? » pour ceux qui ne sont pas prêts. */
function drawChapterThumb(canvas, th, c, ready) {
  const PC = Color.parseColor, rad = th.width() * 0.2;
  questPaint.shader = null;
  if (!ready) {
    questPaint.color = PC('#6E7686'); canvas.drawRoundRect(th, rad, rad, questPaint);
    progText.textSize = th.height() * 0.55; progText.color = Color.argb(200, 255, 255, 255);
    canvas.drawText('?', th.centerX(), th.centerY() + th.height() * 0.2, progText);
    progText.color = Color.WHITE;
    return;
  }
  if (c > 1) { drawChapterThumbOf(canvas, th, c, rad); return; }
  questPaint.color = Color.WHITE;
  questPaint.shader = new LinearGradient(0, th.top, 0, th.bottom, PC('#9FD3F0'), PC('#FDE2C8'));
  canvas.drawRoundRect(th, rad, rad, questPaint);
  questPaint.shader = null;
  const s = th.width(), base = th.bottom - s * 0.1;
  const tri = (pts, color) => {
    questPaint.color = color; questPath.reset(); questPath.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) questPath.lineTo(pts[i], pts[i + 1]);
    questPath.close(); canvas.drawPath(questPath, questPaint);
  };
  tri([th.left + s * 0.04, base, th.left + s * 0.28, th.top + s * 0.4, th.left + s * 0.5, base], PC('#B9C7D9'));
  const px = th.left + s * 0.58, py = th.top + s * 0.24;
  tri([th.left + s * 0.14, base, px, py, th.right - s * 0.04, base], PC('#8FA39A'));
  tri([px - s * 0.11, py + s * 0.14, px, py, px + s * 0.1, py + s * 0.13, px + s * 0.03, py + s * 0.1, px - s * 0.03, py + s * 0.15], Color.WHITE);
  questPaint.color = PC('#7CB342');
  rect.set(th.left, base - s * 0.02, th.right, th.bottom); canvas.drawRoundRect(rect, rad, rad, questPaint);
  rect.set(th.left, base - s * 0.02, th.right, base + s * 0.04); canvas.drawRect(rect, questPaint);
  const cols = [PC('#FF7A45'), PC('#A3A8AF'), PC('#FFC93C')];
  for (let i = 0; i <= 2; i++) {
    const bx = th.left + s * (0.24 + 0.12 * i), by = base - s * (0.02 + 0.13 * i), bs = s * 0.09;
    questPaint.color = shade(cols[i], 0.7); rect.set(bx, by - bs * 0.5, bx + bs, by + bs * 0.25); canvas.drawRect(rect, questPaint);
    questPaint.color = cols[i]; rect.set(bx, by - bs * 0.75, bx + bs, by - bs * 0.4); canvas.drawRect(rect, questPaint);
  }
  questStroke.color = PC('#5D4037'); questStroke.strokeWidth = s * 0.025;
  canvas.drawLine(px, py, px, py - s * 0.17, questStroke);
  tri([px, py - s * 0.17, px + s * 0.12, py - s * 0.13, px, py - s * 0.09], PC('#E53950'));
  const a = time * 0.9;
  drawEagle(canvas, th.left + s * (0.36 + 0.16 * Math.cos(a)), th.top + s * (0.22 + 0.06 * Math.sin(a)), s * 0.07, Math.sin(a) > 0 ? -1 : 1);
}

/** Liste des chapitres, par-dessus la carte : le chapitre en cours en couleur, les suivants grisés. */
/** Saison affichée dans la liste des chapitres (-1 : celle du chapitre en cours). */
let chapterPage = -1;
/** Défilement de la liste des chapitres : glisser = défiler (avec élan), toucher = choisir. */
const chList = Object.assign(new ScrollList(), { shown: -1 });

function drawChapters(canvas) {
  buttons = [];   // la carte dessinée dessous ne doit pas capter les touchers
  canvas.drawRect(0, 0, w, h, overlayPaint);
  // Cartes grandes et lisibles, de même taille sur tous les écrans ; la liste défile quand elle ne tient pas
  const cardH = w * 0.21, gap = w * 0.04, per = ChapterInfo.PER_SEASON;
  const page = chapterPage >= 0 ? chapterPage : Math.floor((quest.season - 1) / per);
  const first = page * per + 1, last = Math.min(Quest.SEASONS, (page + 1) * per), count = last - first + 1;
  const head = w * 0.29, foot = w * 0.19, contentH = count * (cardH + gap) + w * 0.02;
  const ph = Math.min(head + contentH + foot, ub() - insetTop - w * 0.06);
  const top = Math.max(insetTop + w * 0.03, (insetTop + ub() - ph) / 2), bottom = top + ph;
  rect.set(w * 0.03, top, w * 0.97, bottom);
  drawPanel(canvas, rect, '📖 ' + tr('quest.chapters'), () => { quest.chapters = false; });
  // Onglets « Saison 1 / Saison 2 » : 8 chapitres par saison
  const seasons = Math.ceil(Quest.SEASONS / per), tabW = (w * 0.84 - w * 0.03 * (seasons - 1)) / seasons;
  for (let s = 0; s < seasons; s++) {
    const tl = w * 0.08 + s * (tabW + w * 0.03);
    drawButton(canvas, new RectF(tl, top + w * 0.165, tl + tabW, top + w * 0.255), tr('quest.season_tab', { n: s + 1 }), s === page ? shopPaint : chipPaint, w * 0.042, () => { chapterPage = s; });
  }
  // Zone qui défile entre les onglets et le bouton Retour
  const L = chList;
  L.top = top + head - w * 0.005; L.bottom = bottom - foot + w * 0.01;
  L.maxScroll = Math.max(0, contentH - (L.bottom - L.top));
  // À l'ouverture (ou en changeant de saison) : le chapitre en cours bien visible
  if (L.shown !== page) {
    const cur = quest.season - first;
    L.scroll = cur >= 0 && cur < count ? (cur + 0.5) * (cardH + gap) - (L.bottom - L.top) / 2 : 0;
    L.vel = 0; L.shown = page;
  }
  L.scroll = clamp(L.scroll, 0, L.maxScroll);
  canvas.save();
  canvas.clipRect(w * 0.03, L.top, w * 0.97, L.bottom);
  let y = L.top + w * 0.02 - L.scroll;
  for (let c = first; c <= last; c++) {
    const r = new RectF(w * 0.07, y, w * 0.93, y + cardH);
    if (r.bottom + w * 0.03 >= L.top && r.top <= L.bottom) {
      drawChapterCard(canvas, r, c, false);
      if (c === quest.season) {
        questStroke.color = Color.parseColor('#FF7A45'); questStroke.strokeWidth = w * 0.008;
        rect.set(r.left - w * 0.01, r.top - w * 0.008, r.right + w * 0.01, r.bottom + w * 0.022);
        canvas.drawRoundRect(rect, w * 0.055, w * 0.055, questStroke);
      }
      const open = QuestProgress.seasonUnlocked(c);
      // Seule la partie visible de la carte est touchable
      const hit = new RectF(r.left, Math.max(r.top, L.top), r.right, Math.min(r.bottom, L.bottom));
      if (hit.bottom - hit.top > w * 0.03) buttons.push({ rect: hit, action: () => {
        if (open) { quest.season = c; quest.chapters = false; }
        else banners.push({ text: tr('quest.chapter_locked', { n: c - 1 }), life: 1.8 });
      } });
    }
    y += cardH + gap;
  }
  canvas.restore();
  // Barre de défilement, et ombre en bas tant qu'il reste des chapitres cachés
  if (L.maxScroll > 0) {
    const trackH = L.bottom - L.top, thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + L.maxScroll));
    const ty0 = L.top + (trackH - thumbH) * (L.scroll / L.maxScroll);
    rect.set(w * 0.945, ty0, w * 0.958, ty0 + thumbH);
    canvas.drawRoundRect(rect, w * 0.01, w * 0.01, lockedPaint);
  }
  const bh = w * 0.11;
  drawButton(canvas, new RectF(w * 0.3, bottom - bh - w * 0.05, w * 0.7, bottom - w * 0.05), tr('common.back'), backBtnPaint, w * 0.048, () => { quest.chapters = false; });
  // Tout le reste de l'écran : ne fait rien (pas de toucher qui traverse vers la carte)
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

function chListActive() { return state === State.QUEST_MAP && quest.chapters; }

/** Vignette des chapitres 2 à 8 : la carte du chapitre en miniature, avec son personnage. */
function drawChapterThumbOf(canvas, th, c, rad) {
  // Petite version du fond peint (mapart.js) ; l'ancien décor tant qu'elle se prépare
  if (drawSceneThumb(canvas, c, th, rad)) {
    const hero = ChapterInfo.hero(c);
    drawHeroAt(canvas, hero, th.centerX(), th.bottom - th.height() * 0.1, th.height() * 0.6 / (k * specialHeight(hero)), true);
    return;
  }
  canvas.save();
  const clip = new Path();
  const ctxp = clip.p;
  if (ctxp.roundRect) ctxp.roundRect(th.left, th.top, th.width(), th.height(), rad); else ctxp.rect(th.left, th.top, th.width(), th.height());
  canvas.clipPath(clip);
  canvas.translate(th.left, th.top);
  const s = th.width() / w;
  canvas.scale(s, s);
  canvas.translate(0, -(h - th.height() / s) * 0.35);
  drawChapterMapBackground(canvas, c);
  canvas.restore();
  const hero = ChapterInfo.hero(c);
  drawHeroAt(canvas, hero, th.centerX(), th.bottom - th.height() * 0.1, th.height() * 0.6 / (k * specialHeight(hero)), true);
}
