'use strict';
// Menu de test caché (équivalent de TestMenu.kt) : 7 appuis sur le titre « Réglages » l'ouvrent.
// Il déclenche à la demande une mise à mort, un imprévu ou un mini-jeu bonus.
// Toujours présent sur le web pour tester dans le navigateur (retiré des APK / AAB Android publiés).

const TEST_MENU = true;
const test = { open: false, taps: 0, lastTap: -10, forceDoom: false, unlockAll: false, storyChain: null,
  scroll: 0, maxScroll: 0, top: 0, bottom: 0, dragY: -1, downX: 0, dragStart: 0, moved: false, vel: 0, lastY: 0, lastT: 0 };

function testTitleTap() {
  if (!TEST_MENU) return;
  if (time - test.lastTap > 1.5) test.taps = 0;
  test.taps++; test.lastTap = time;
  if (test.taps >= 7) { test.taps = 0; test.open = true; test.scroll = 0; test.vel = 0; }
  else if (test.taps >= 4) banners.push({ text: `🧪 encore ${7 - test.taps}…`, life: 0.8 });
}

/** Sections du menu : [titre, boutons [libellé, id], boutons par ligne]. */
function testItems() {
  const chapters = (from) => Array.from({ length: ChapterInfo.PER_SEASON }, (_, i) => [`${from + i}. ${ChapterInfo.icon(from + i)}`, 'ch' + (from + i)]);
  return [
    ['Mises à mort', [['⚡ Foudre', 'strike'], ['✈️ Avion', 'plane'], ['🌋 Volcan', 'volcano'], ['🛰️ Satellite', 'satellite']], 3],
    ['Imprévus (après 1 saut)', [['🚀 Fusée', 'rocket'], ['🌊 Tornade mer', 'tornado'], ['🌋 Tornade lave', 'tornado_lava'], ['🦅 Aigle', 'eagle'], ['🚁 Hélico', 'heli'],
      ['🛸 Ovni', 'ufo'], ['🐋 Baleine', 'whale'], ['🐧 Blizzard', 'blizzard'], ['☢️ Nucléaire', 'nuke']], 3],
    ['Bonus', [['⏱️ Timing', 'timing'], ['👆 Tapote', 'mash'], ['⭐ Étoiles', 'stars'], ['🎡 Roue', 'wheel']], 3],
    ['Aventure', [['👑 Légendaire', 'legend'], [test.unlockAll ? '🔓 Tout ouvert' : '🔒 Tout ouvrir', 'unlock']], 3],
    ['Chapitres · saison 1 (tout débloqué)', chapters(1), 4],
    ['Chapitres · saison 2 (tout débloqué)', chapters(1 + ChapterInfo.PER_SEASON), 4],
    ['Histoires (début, milieu, fin)', Array.from({ length: 15 }, (_, i) => [`📖 ${i + 2}`, 'story' + (i + 2)]), 5],
  ];
}

function drawTestMenu(canvas) {
  buttons = [];
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const rowH = w * 0.1, gap = w * 0.025, items = testItems();
  // Hauteur du contenu ; le panneau prend au plus la hauteur de l'écran, le reste défile au doigt ou à la molette
  let contentH = 0;
  for (const [, list, cols] of items) contentH += w * 0.09 + Math.ceil(list.length / cols) * (rowH + gap);
  const head = w * 0.19, foot = w * 0.19;
  const ph = Math.min(head + contentH + foot, ub() - insetTop - w * 0.06);
  const top = Math.max(insetTop + w * 0.03, (insetTop + ub() - ph) / 2), bottom = top + ph;
  rect.set(w * 0.04, top, w * 0.96, bottom);
  drawPanel(canvas, rect, '🧪 Tests', () => { test.open = false; });
  test.top = top + head - w * 0.01; test.bottom = bottom - foot + w * 0.01;
  test.maxScroll = Math.max(0, contentH - (test.bottom - test.top) + w * 0.02);
  test.scroll = clamp(test.scroll, 0, test.maxScroll);
  canvas.save();
  canvas.clipRect(w * 0.04, test.top, w * 0.96, test.bottom);
  darkTextPaint.textAlign = Align.CENTER;
  let y = top + head - test.scroll;
  for (const [title, list, cols] of items) {
    greyTextPaint.textSize = w * 0.036;
    canvas.drawText(title, w / 2, y + w * 0.04, greyTextPaint);
    y += w * 0.09;
    const cw = (w * 0.84 - (cols - 1) * gap) / cols;
    list.forEach(([label, id], i) => {
      const x0 = w * 0.08 + (i % cols) * (cw + gap), y0 = y + Math.floor(i / cols) * (rowH + gap);
      const r = new RectF(x0, y0, x0 + cw, y0 + rowH);
      const on = id === 'unlock' && test.unlockAll;
      drawButton(canvas, r, label, on ? tabOnPaint : tabOffPaint, w * (cols > 3 ? 0.036 : 0.034), () => runTest(id));
      // Bouton à moitié caché par le bord de la zone : pas touchable
      if (r.top < test.top || r.bottom > test.bottom) buttons.pop();
    });
    y += Math.ceil(list.length / cols) * (rowH + gap);
  }
  canvas.restore();
  // Barre de défilement
  if (test.maxScroll > 0) {
    const trackH = test.bottom - test.top, thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + test.maxScroll));
    const ty0 = test.top + (trackH - thumbH) * (test.scroll / test.maxScroll);
    rect.set(w * 0.935, ty0, w * 0.948, ty0 + thumbH);
    canvas.drawRoundRect(rect, w * 0.01, w * 0.01, lockedPaint);
  }
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.15, w * 0.7, bottom - w * 0.04), tr('common.back'), backBtnPaint, w * 0.048, () => { test.open = false; });
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

// ---------- Défilement du menu de test : glisser = défiler (avec élan), toucher = bouton ----------
function testPointerDown(x, y) {
  if (state !== State.SETTINGS || !test.open || y < test.top || y > test.bottom) return false;
  test.dragY = y; test.downX = x; test.dragStart = test.scroll; test.moved = false;
  test.vel = 0; test.lastY = y; test.lastT = performance.now();
  return true;
}
function testPointerMove(y) {
  if (test.dragY < 0) return;
  if (Math.abs(y - test.dragY) > w * 0.02) test.moved = true;
  if (!test.moved) return;
  test.scroll = clamp(test.dragStart - (y - test.dragY), 0, test.maxScroll);
  const now = performance.now(), dms = now - test.lastT;
  if (dms > 0) { test.vel = test.vel * 0.3 - (y - test.lastY) * 1000 / dms * 0.7; test.lastY = y; test.lastT = now; }
}
function testPointerUp() {
  if (test.dragY < 0) return;
  if (!test.moved) {
    test.vel = 0;
    const hit = buttons.find((b) => b.rect.contains(test.downX, test.dragY));
    if (hit) { sounds.play('CLICK', 0.6); hit.action(); }
  } else if (performance.now() - test.lastT > 80) test.vel = 0;
  test.dragY = -1;
}
/** Élan après un glissé rapide (appelé à chaque image). */
function updateTestScroll(dt) {
  if (!test.open || test.dragY >= 0 || test.vel === 0) return;
  test.scroll += test.vel * dt;
  if (test.scroll <= 0 || test.scroll >= test.maxScroll) test.vel = 0;
  test.scroll = clamp(test.scroll, 0, test.maxScroll);
  test.vel *= Math.exp(-3.5 * dt);
  if (Math.abs(test.vel) < w * 0.05) test.vel = 0;
}

/** Ferme les réglages, repart sur une partie libre et prépare le test demandé. */
function runTest(id) {
  // Tout débloquer dans l'Aventure (pour cette session seulement, rien n'est enregistré)
  if (id === 'unlock') { test.unlockAll = !test.unlockAll; banners.push({ text: test.unlockAll ? '🧪 Aventure : tout est ouvert' : '🧪 Aventure : progression normale', life: 1.5 }); return; }
  test.open = false;
  // Carte d'un chapitre, tous ses niveaux ouverts (énergie remise au plein)
  if (id.startsWith('ch')) {
    test.unlockAll = true; Energy.refill(Energy.now());
    quest.season = Number(id.slice(2)); chapterPage = -1;
    openQuestMap();
    banners.push({ text: '🧪 Chapitre ' + quest.season + ' : tout est ouvert', life: 1.5 });
    return;
  }
  // Histoire d'un chapitre : début, milieu et fin à la suite, même déjà vues
  if (id.startsWith('story')) {
    quest.season = Number(id.slice(5)); quest.active = false; quest.chapters = false; chapterPage = -1;
    test.storyChain = [1, 3];
    Object.assign(quest, { storyScene: 0, storyPage: 0, storyT: 0, storyFull: false });
    state = State.QUEST_STORY;
    return;
  }
  // Niveau légendaire de l'Aventure, sans condition (énergie remise au plein)
  if (id === 'legend') { Energy.refill(Energy.now()); quest.season = 1; startQuestLevel(Quest.LEGEND); state = State.READY; return; }
  if (quest.active) { quest.active = false; quest.spec = null; }
  state = State.READY;
  resetGame();
  switch (id) {
    case 'strike': startWeather(2, 1); strikeAt = time + 1.5; test.forceDoom = true; break;
    case 'plane': crashAt = time + 1; test.forceDoom = true; break;
    case 'volcano': volcanoAt = time + 1; test.forceDoom = true; break;
    case 'satellite': satelliteAt = time + 1; test.forceDoom = true; break;
    case 'rocket': spc.rocketAt = time + 0.3; break;
    case 'tornado': case 'tornado_lava': startWeather(3, 1); isl.cycloneAt = time + 0.3; isl.forceKind = id === 'tornado_lava' ? 2 : 1; break;
    case 'eagle': frs.eagleAt = time + 0.3; break;
    case 'heli': bas.heliAt = time + 0.3; break;
    case 'ufo': aln.ufoAt = time + 0.3; break;
    case 'whale': sea.whaleAt = time + 0.3; break;
    case 'blizzard': startWeather(5, 1); pol.blizzardAt = time + 0.3; break;
    case 'nuke': nuk.nukeAt = time + 0.3; break;
    default:
      startBonus();
      bonusType = BONUS_TYPES.find((t) => t.id === id);
      return;
  }
  const doom = id === 'strike' || id === 'plane' || id === 'volcano' || id === 'satellite';
  banners.push({ text: doom ? '🧪 Test : ça arrive…' : '🧪 Test : fais un saut', life: 2 });
}
