'use strict';
// Histoire des chapitres 2 à 16 (équivalent de ChapterStory.kt), comme au chapitre 1 :
// - début : ce qui t'envoie dans ce monde (scène animée, storyfx.js), puis le but du chapitre ;
// - milieu (après le niveau 8) : on aperçoit le personnage du chapitre (scène animée) ;
// - fin : le moment fort (scène animée), puis le personnage rejoint l'équipe, avec le bouton pour jouer avec lui.

const csp = new Paint(), csst = new Paint({ style: Style.STROKE, strokeCap: 'round' });

function drawChapterStory(canvas) {
  const c = quest.season, sc = quest.storyScene, pg = quest.storyPage, t = quest.storyT;
  const fx = sc === 0 && pg === 0 ? 'a' : sc === 1 ? 'm' : sc === 3 && pg === 0 ? 'z' : '', end = sc === 3 && !fx;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, hero = ChapterInfo.hero(c);
  if (fx) drawStoryFx(canvas, c, fx, t);
  else {
  drawChapterMapBackground(canvas, c);
  csp.shader = null; csp.color = Color.argb(70, 0, 0, 20); canvas.drawRect(0, 0, w, h, csp);
  if (end) {
    csst.strokeWidth = w * 0.05;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.4 + i * 0.5236;
      csst.color = Color.argb(i % 2 === 0 ? 90 : 50, 255, 214, 90);
      canvas.drawLine(w * 0.64, h * 0.42, w * 0.64 + cos(a) * w * 0.7, h * 0.42 + sin(a) * w * 0.7, csst);
    }
  }
  const bx = w / 2, by = h * 0.52;
  csp.color = Color.argb(60, 0, 0, 0); canvas.drawOval(new RectF(bx - w * 0.38, by + w * 0.02, bx + w * 0.38, by + w * 0.14), csp);
  csp.color = Color.parseColor({ 2: '#D98BA0', 3: '#8E8A9E', 4: '#6B7A3A', 5: '#FFC928', 6: '#F8C8DC', 7: '#DCEFFB', 8: '#3A2F36',
    9: '#B87333', 10: '#D93A3A', 11: '#2A2A3A', 12: '#D8B26E', 13: '#F07C1A', 14: '#1F1F24', 15: '#7CB342', 16: '#FFD1DC' }[c] || '#3A2F36');
  canvas.drawRoundRect(new RectF(bx - w * 0.36, by - w * 0.02, bx + w * 0.36, by + w * 0.1), w * 0.04, w * 0.04, csp);
  const bob = abs(sin(t * 4)) * w * 0.012, big = 1.8;
  if (!end) {
    const px0 = bx - w * 0.18;
    canvas.save(); canvas.scale(big, big, px0, by);
    drawCharacter(canvas, px0, by, 0, 1, 1, true, true, true);
    canvas.restore();
    const f = Math.min(1, t / 2.5);
    if (c === 2) drawWhale(canvas, w * (0.95 - 0.25 * f), h * 0.28, w * 0.08, -1);
    else if (c === 3) {
      csp.color = Color.argb(Math.floor(80 + 40 * abs(sin(t * 5))), 120, 255, 120);
      canvas.drawRect(w * 0.55, h * 0.2, w * 0.65, by, csp);
      drawUfo(canvas, w * 0.6, h * 0.2, w * 0.13);
    } else if (c === 4) drawHelicopter(canvas, w * (1.05 - 0.35 * f), h * 0.22 + sin(t * 3) * w * 0.01, w * 0.09, -6);
    else if (c === 5) {
      csp.color = Color.argb(Math.floor(60 * (0.5 + 0.5 * sin(t * 3))), 120, 255, 80); canvas.drawRect(0, 0, w, h, csp);
      for (let i = 0; i < 10; i++) {
        const q = (t * 0.3 + i * 0.1) % 1;
        csp.color = Color.argb(Math.floor(200 * (1 - q)), 160, 255, 110);
        canvas.drawCircle(w * (0.1 + 0.08 * i), h * (0.65 - q * 0.4), w * 0.015, csp);
      }
    } else if (c === 6) drawHeroAt(canvas, 'morphee', w * 0.68, by - bob * 2 - w * 0.1, 1.6);
    else if (c === 7) {
      for (let i = 0; i < 40; i++) {
        const q = (t * 0.6 + hash01(i)) % 1;
        csp.color = Color.argb(210, 255, 255, 255);
        canvas.drawCircle(w * (1 - q), h * (0.1 + 0.5 * hash01(i * 3)), w * 0.006, csp);
      }
    } else if (c >= 9) {
      // Chapitres 9 à 16 : le personnage du chapitre, encore inconnu, observe de loin
      drawHeroAt(canvas, hero, w * 0.72, by - w * 0.02, 1.5 / specialHeight(hero), false, false);
    } else {
      csp.color = Color.argb(Math.floor(50 * (0.5 + 0.5 * sin(t * 2))), 255, 90, 20); canvas.drawRect(0, 0, w, h, csp);
      for (let i = 0; i < 20; i++) {
        const q = (t * 0.25 + hash01(i)) % 1;
        csp.color = Color.argb(Math.floor(230 * (1 - q)), 255, 170, 60);
        canvas.drawCircle(w * hash01(i * 5 + 2), h * (0.7 - q * 0.6), w * 0.008, csp);
      }
    }
  } else {
    const px0 = bx - w * 0.2;
    canvas.save(); canvas.scale(big, big, px0, by - bob);
    drawCharacter(canvas, px0, by - bob, 0, 1, 1, true, false, false);
    canvas.restore();
    drawHeroAt(canvas, hero, bx + w * 0.16, by - abs(sin(t * 4 + 1)) * w * 0.012, 1.75 * 1.35 / specialHeight(hero), false, false);
  }

  }

  // Bulle de texte
  const text = tr(`quest.s${c}.story${sc}${fx === 'a' || fx === 'z' ? 'a' : ''}`);
  const bl = w * 0.06, br = w * 0.94, btop = h * 0.66;
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.05;
  const lines = wrapText(text, darkTextPaint, br - bl - w * 0.1), lineH = w * 0.065;
  const bbot = btop + w * 0.1 + lines.length * lineH;
  rect.set(bl, btop, br, bbot);
  drawPanel(canvas, rect);
  let ty = btop + w * 0.09, shown = quest.storyFull ? 1e9 : Math.floor(t * 45);
  darkTextPaint.color = UI.INK;
  for (const line of lines) {
    canvas.drawText(shown >= line.length ? line : line.substring(0, Math.max(0, shown)), bl + w * 0.05, ty, darkTextPaint);
    shown -= line.length + 1; ty += lineH;
  }
  drawButton(canvas, new RectF(w * 0.7, insetTop + w * 0.04, w * 0.96, insetTop + w * 0.13), tr('story.skip') + ' ⏭', chipPaint, w * 0.036, () => finishStory());
  if (end) {
    const y0 = bbot + w * 0.05;
    drawButton(canvas, new RectF(w * 0.12, y0, w * 0.88, y0 + w * 0.12), '⭐ ' + tr('story.equip_x', { x: tr(`item.character.${hero}`) }), primaryBtnPaint, w * 0.046, () => {
      profile.select(Slot.CHARACTER, hero); loadLook(); finishStory();
    });
    drawButton(canvas, new RectF(w * 0.3, y0 + w * 0.16, w * 0.7, y0 + w * 0.26), tr('story.later'), greyBtnPaint, w * 0.042, () => finishStory());
  } else {
    textPaint.textSize = w * 0.04; textPaint.alpha = clamp(Math.floor(150 + 100 * sin(t * 4)), 0, 255);
    canvas.drawText(tr('story.tap') + ' ▶', w / 2, bbot + w * 0.09, textPaint);
    textPaint.alpha = 255;
    // (toucher pendant que le texte s'écrit l'affiche en entier, sans couper l'animation)
    buttons.push({ rect: new RectF(0, 0, w, h), action: () => { if (!quest.storyFull && quest.storyT * 45 < text.length) quest.storyFull = true; else nextStoryPage(); } });
  }
}
