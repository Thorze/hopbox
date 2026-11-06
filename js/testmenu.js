'use strict';
// Menu de test caché (équivalent de TestMenu.kt) : 7 appuis sur le titre « Réglages » l'ouvrent.
// Il déclenche à la demande une mise à mort, un imprévu ou un mini-jeu bonus.
// Passer TEST_MENU à false pour le retirer de la version finale.

const TEST_MENU = true;
const test = { open: false, taps: 0, lastTap: -10, forceDoom: false };

function testTitleTap() {
  if (!TEST_MENU) return;
  if (time - test.lastTap > 1.5) test.taps = 0;
  test.taps++; test.lastTap = time;
  if (test.taps >= 7) { test.taps = 0; test.open = true; }
  else if (test.taps >= 4) banners.push({ text: `🧪 encore ${7 - test.taps}…`, life: 0.8 });
}

const TEST_ITEMS = [
  ['Mises à mort', [['⚡ Foudre', 'strike'], ['✈️ Avion', 'plane'], ['🌋 Volcan', 'volcano'], ['🛰️ Satellite', 'satellite']]],
  ['Imprévus (après 1 saut)', [['🚀 Fusée', 'rocket'], ['🌪️ Tornade', 'tornado'], ['🦅 Aigle', 'eagle'], ['🚁 Hélico', 'heli'],
    ['🛸 Ovni', 'ufo'], ['🐋 Baleine', 'whale'], ['🐧 Blizzard', 'blizzard']]],
  ['Bonus', [['⏱️ Timing', 'timing'], ['👆 Tapote', 'mash'], ['⭐ Étoiles', 'stars'], ['🎡 Roue', 'wheel']]],
];

function drawTestMenu(canvas) {
  buttons = [];
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const rowH = w * 0.1, gap = w * 0.025;
  let rows = 0;
  for (const [, items] of TEST_ITEMS) rows += Math.ceil(items.length / 3);
  const ph = w * 0.2 + TEST_ITEMS.length * w * 0.09 + rows * (rowH + gap) + w * 0.17;
  const top = Math.max(insetTop + w * 0.06, (insetTop + ub() - ph) / 2);
  rect.set(w * 0.04, top, w * 0.96, top + ph);
  canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.062;
  canvas.drawText('🧪 Tests', w / 2, top + w * 0.11, darkTextPaint);
  let y = top + w * 0.2;
  const cw = (w * 0.84 - 2 * gap) / 3;
  for (const [title, items] of TEST_ITEMS) {
    greyTextPaint.textSize = w * 0.036;
    canvas.drawText(title, w / 2, y + w * 0.04, greyTextPaint);
    y += w * 0.09;
    items.forEach(([label, id], i) => {
      const x0 = w * 0.08 + (i % 3) * (cw + gap), y0 = y + Math.floor(i / 3) * (rowH + gap);
      drawButton(canvas, new RectF(x0, y0, x0 + cw, y0 + rowH), label, tabOffPaint, w * 0.034, () => runTest(id));
    });
    y += Math.ceil(items.length / 3) * (rowH + gap);
  }
  drawButton(canvas, new RectF(w * 0.3, top + ph - w * 0.15, w * 0.7, top + ph - w * 0.04), tr('common.back'), primaryBtnPaint, w * 0.048, () => { test.open = false; });
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

/** Ferme les réglages, repart sur une partie libre et prépare le test demandé. */
function runTest(id) {
  test.open = false;
  if (quest.active) { quest.active = false; quest.spec = null; }
  state = State.READY;
  resetGame();
  switch (id) {
    case 'strike': startWeather(2, 1); strikeAt = time + 1.5; test.forceDoom = true; break;
    case 'plane': crashAt = time + 1; test.forceDoom = true; break;
    case 'volcano': volcanoAt = time + 1; test.forceDoom = true; break;
    case 'satellite': satelliteAt = time + 1; test.forceDoom = true; break;
    case 'rocket': spc.rocketAt = time + 0.3; break;
    case 'tornado': startWeather(3, 1); isl.cycloneAt = time + 0.3; break;
    case 'eagle': frs.eagleAt = time + 0.3; break;
    case 'heli': bas.heliAt = time + 0.3; break;
    case 'ufo': aln.ufoAt = time + 0.3; break;
    case 'whale': sea.whaleAt = time + 0.3; break;
    case 'blizzard': startWeather(5, 1); pol.blizzardAt = time + 0.3; break;
    default:
      startBonus();
      bonusType = BONUS_TYPES.find((t) => t.id === id);
      return;
  }
  const doom = id === 'strike' || id === 'plane' || id === 'volcano' || id === 'satellite';
  banners.push({ text: doom ? '🧪 Test : ça arrive…' : '🧪 Test : fais un saut', life: 2 });
}
