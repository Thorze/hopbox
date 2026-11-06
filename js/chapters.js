'use strict';
// Chapitres de l'Aventure : bannière de l'accueil et liste des chapitres (équivalent de Chapters.kt).

/** Nombre de chapitres affichés dans la liste (les derniers, pas encore prêts, sont grisés). */
const CHAPTERS_SHOWN = 3;

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

/** Bannière « Aventure » de l'accueil, à la place des boutons de mode (on est déjà en mode libre). */
function drawQuestBanner(canvas) {
  const top = insetTop + w * 0.265, r = new RectF(w * 0.06, top, w * 0.94, top + w * 0.16), c = currentChapter();
  drawChapterCard(canvas, r, c, true);
  buttons.push({ rect: r, action: () => { quest.season = c; openQuestMap(); } });
}

/** Carte d'un chapitre (bannière ou ligne de la liste) ; grisée si verrouillée ou pas encore prête. */
function drawChapterCard(canvas, r0, c, banner) {
  const PC = Color.parseColor, ready = c <= Quest.SEASONS, open = ready && QuestProgress.seasonUnlocked(c);
  const down = banner && isPressed(r0) ? w * 0.008 : 0;
  const r = new RectF(r0.left, r0.top + down, r0.right, r0.bottom + down);
  const rad = w * 0.045, depth = w * 0.014;
  questPaint.shader = null;
  questPaint.color = open ? PC('#4A9682') : PC('#8A919E');
  rect.set(r.left, r.top + depth - down, r.right, r.bottom + depth - down);
  canvas.drawRoundRect(rect, rad, rad, questPaint);
  // Face unie (style plat), vert discret
  questPaint.color = open ? PC('#62B19C') : PC('#AAB1BD');
  canvas.drawRoundRect(r, rad, rad, questPaint);

  const pad = r.height() * 0.12;
  const th = new RectF(r.left + pad, r.top + pad, r.left + pad + r.height() - 2 * pad, r.bottom - pad);
  drawChapterThumb(canvas, th, c, ready);

  const tx = th.right + w * 0.035, maxW = r.right - tx - (banner ? w * 0.05 : w * 0.04);
  progText.textAlign = Align.LEFT;
  progText.color = Color.argb(215, 255, 255, 255); progText.textSize = w * 0.025;
  canvas.drawText(fitText(tr('quest.chapter_caps', { n: c }), progText, maxW), tx, r.top + w * 0.04, progText);
  progText.color = Color.WHITE; progText.textSize = w * 0.04;
  canvas.drawText(fitText(ready ? tr(`quest.s${c}.title`) : '???', progText, maxW), tx, r.top + w * 0.077, progText);
  progText.textSize = w * 0.027;
  const lineY = r.top + w * 0.135;
  if (!ready) {
    progText.color = Color.argb(230, 255, 255, 255);
    canvas.drawText(fitText('⏳ ' + tr('quest.soon'), progText, maxW), tx, lineY, progText);
  } else if (!open) {
    progText.color = Color.argb(230, 255, 255, 255);
    canvas.drawText(fitText('🔒 ' + tr('quest.chapter_locked', { n: c - 1 }), progText, maxW), tx, lineY, progText);
  } else if (QuestProgress.done(c) >= Quest.LEVELS && banner && c >= Quest.SEASONS) {
    canvas.drawText(fitText(tr('quest.next_soon'), progText, maxW), tx, lineY, progText);
  } else {
    const done = QuestProgress.done(c), barW = maxW, barY = r.top + w * 0.089;
    questPaint.color = Color.argb(70, 0, 0, 0);
    rect.set(tx, barY, tx + barW, barY + w * 0.018);
    canvas.drawRoundRect(rect, w * 0.009, w * 0.009, questPaint);
    if (done > 0) {
      questPaint.color = PC('#FFD54F');
      rect.set(tx, barY, tx + barW * done / Quest.LEVELS, barY + w * 0.018);
      canvas.drawRoundRect(rect, w * 0.009, w * 0.009, questPaint);
    }
    const lvl = done >= Quest.LEVELS ? '✓ ' + tr('quest.chapter_done') : tr('quest.banner_level', { n: done + 1, t: Quest.LEVELS });
    const coins = `🪙 ${QuestProgress.totalMedals(c)}/${Quest.LEVELS * 3}`;
    canvas.drawText(fitText(`${lvl}   ${coins}`, progText, barW), tx, lineY + w * 0.004, progText);
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
function drawChapters(canvas) {
  buttons = [];   // la carte dessinée dessous ne doit pas capter les touchers
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const cardH = w * 0.16, gap = w * 0.045, ph = w * 0.2 + CHAPTERS_SHOWN * (cardH + gap) + w * 0.13;
  const top = Math.max(insetTop + w * 0.08, (insetTop + ub() - ph) / 2);
  rect.set(w * 0.04, top, w * 0.96, top + ph);
  canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.065;
  canvas.drawText('📖 ' + tr('quest.chapters'), w / 2, top + w * 0.12, darkTextPaint);
  let y = top + w * 0.18;
  for (let c = 1; c <= CHAPTERS_SHOWN; c++) {
    const r = new RectF(w * 0.08, y, w * 0.92, y + cardH);
    drawChapterCard(canvas, r, c, false);
    if (c === quest.season) {
      questStroke.color = Color.parseColor('#FF7A45'); questStroke.strokeWidth = w * 0.008;
      rect.set(r.left - w * 0.012, r.top - w * 0.012, r.right + w * 0.012, r.bottom + w * 0.026);
      canvas.drawRoundRect(rect, w * 0.055, w * 0.055, questStroke);
    }
    const open = c <= Quest.SEASONS && QuestProgress.seasonUnlocked(c);
    buttons.push({ rect: r, action: () => {
      if (open) { quest.season = c; quest.chapters = false; }
      else banners.push({ text: c <= Quest.SEASONS ? tr('quest.chapter_locked', { n: c - 1 }) : tr('quest.soon'), life: 1.8 });
    } });
    y += cardH + gap;
  }
  const bh = w * 0.11;
  drawButton(canvas, new RectF(w * 0.3, top + ph - bh - w * 0.05, w * 0.7, top + ph - w * 0.05), tr('common.back'), primaryBtnPaint, w * 0.048, () => { quest.chapters = false; });
  // Tout le reste de l'écran : ne fait rien (pas de toucher qui traverse vers la carte)
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}
