'use strict';
// Blocs de glace (équivalent d'Ice.kt), à partir de 75 points : à l'atterrissage, on glisse dans
// le sens du saut de 55 % de la demi-largeur du bloc. Posé au centre, on reste toujours dessus ;
// trop loin après le centre, on glisse dans le vide. Le bloc d'avant est toujours fixe et solide.

const ICE_SLIDE = 0.55, ICE_SLIDE_TIME = 0.5, ICE_MIN_HALF = 0.5, ICE_COLOR = 0xFF8FDCFF;
const ice = { next: false, sliding: false, alongX: true, t: 0, from: 0, to: 0, bonusDue: false, hintShown: false, sparkT: 0 };

function iceSlideEnd(offset, half) { return offset + ICE_SLIDE * half; }
function resetIce() { ice.next = false; ice.sliding = false; ice.hintShown = false; }

/** Calcule la glissade dans le sens du saut, AVANT que la plateforme suivante ne choisisse sa direction. */
function prepareIceSlide(jumpAlongX) {
  ice.alongX = jumpAlongX;
  ice.from = jumpAlongX ? px : pz;
  const center = jumpAlongX ? current.cx : current.cz;
  ice.to = center + iceSlideEnd(ice.from - center, current.half);
  return ice.to;
}

function startIceSlide(bonusDue) {
  ice.t = 0; ice.sliding = true; ice.bonusDue = bonusDue;
  sounds.play('TAP', 0.3, 0.55);
  if (!ice.hintShown) {
    ice.hintShown = true;
    popups.push({ text: tr('popup.ice'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.4 });
  }
  state = State.READY;
}

function updateIceSlide(dt) {
  if (!ice.sliding) return;
  if (state !== State.READY) { ice.sliding = false; return; }
  ice.t += dt;
  const q = clamp(ice.t / ICE_SLIDE_TIME, 0, 1), e = 1 - (1 - q) * (1 - q);
  const pos = ice.from + (ice.to - ice.from) * e;
  if (ice.alongX) px = pos; else pz = pos;
  ice.sparkT -= dt;
  if (ice.sparkT <= 0 && q < 0.9) {
    ice.sparkT = 0.05;
    particles.push(mkParticle(sx(px, pz) + camX, sy(px, 0, pz) + camY, (rnd() - 0.5) * k * 0.6, -k * (0.3 + rnd() * 0.4), 0.4, k * 0.035, Color.argb(230, 220, 245, 255), k * 2));
  }
  if (q >= 1) {
    ice.sliding = false;
    if (!current.contains(px, pz)) { gameOverReason = tr('reason.ice'); startFall(); }
    else { checkScare(current); if (ice.bonusDue) startBonus(); }
  }
}

/** Bloc de glace : bleu translucide, givre, flocon, stalactites et reflets qui scintillent. */
function drawIceBlock(canvas, pl) {
  drawTexturedBox(canvas, pl, 'glace');
  const a = pl.half, cxk = 0.8660254 * k, syk = 0.5 * k;
  const lX = -2 * a * cxk, rX = 2 * a * cxk, fY = 2 * a * syk, bY = -2 * a * syk;
  const p = texPaint, st = texStroke, path = tmpPath;
  p.shader = null;
  path.reset(); path.moveTo(0, bY * 0.8); path.lineTo(rX * 0.8, 0); path.lineTo(0, fY * 0.8); path.lineTo(lX * 0.8, 0); path.close();
  p.color = Color.argb(70, 255, 255, 255); canvas.drawPath(path, p);
  st.strokeWidth = k * 0.05; st.color = Color.argb(230, 240, 252, 255);
  path.reset(); path.moveTo(0, bY); path.lineTo(rX, 0); path.lineTo(0, fY); path.lineTo(lX, 0); path.close();
  canvas.drawPath(path, st);
  p.color = Color.argb(235, 225, 246, 255);
  const n = 4;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x0 = side === 0 ? lX * (1 - t) : rX * t, y0 = side === 0 ? fY * t : fY * (1 - t);
      const len = k * (0.16 + 0.12 * ((i * 7 + side * 3) % 3) / 2), wid = k * 0.05;
      path.reset(); path.moveTo(x0 - wid, y0 + k * 0.02); path.lineTo(x0 + wid, y0 + k * 0.02); path.lineTo(x0, y0 + len); path.close();
      canvas.drawPath(path, p);
    }
  }
  textPaint.textSize = k * 0.34;
  const old = textPaint.color; textPaint.color = Color.WHITE;
  canvas.drawText('❄', 0, -(textPaint.descent() + textPaint.ascent()) / 2, textPaint);
  textPaint.color = old;
  for (let i = 0; i < 3; i++) {
    const tw = Math.sin(time * 2.3 + i * 2.1 + pl.cx);
    if (tw <= 0) continue;
    const x = [lX * 0.45, rX * 0.5, rX * 0.15][i], y = [fY * 0.25, -fY * 0.15, fY * 0.55][i], s = k * 0.09 * tw;
    st.strokeWidth = k * 0.018; st.color = Color.argb(Math.round(255 * tw), 255, 255, 255);
    canvas.drawLine(x - s, y, x + s, y, st); canvas.drawLine(x, y - s, x, y + s, st);
  }
}

/** Échap (ordinateur) : ferme l'écran ouvert ou met la partie en pause, comme le bouton retour d'Android. */
function handleBack() {
  // Menu ☰ ouvert : retour = le fermer
  if (menu.open) { closeHomeMenu(); return true; }
  // Fenêtre d'achat d'énergie ouverte : retour = annuler
  if (quest.confirmEnergy) { quest.confirmEnergy = false; sounds.play('CLICK', 0.6); return true; }
  if (state === State.SETTINGS) { if (test.open) test.open = false; else if (langPicker) langPicker = false; else { dragSlider = 0; state = settingsReturnState; } }
  else if (state === State.STATS) state = statsReturnState;
  else if (state === State.DAILY) claimDaily();
  else if (state === State.MISSIONS) state = missionsReturnState;
  else if (state === State.LEADERBOARD) state = boardReturnState;
  else if (state === State.CUSTOMIZE) { if (buyItem || buyTint) { buyItem = null; buyTint = null; } else closeCustomize(); }
  else if (state === State.PAUSED) resumeGame();
  else if (state === State.QUEST_MAP) { if (quest.chapters) quest.chapters = false; else closeQuestMap(); }
  else if (state === State.QUEST_INTRO) state = State.QUEST_MAP;
  else if (state === State.QUEST_END) backToQuestMap();
  else if (state === State.QUEST_STORY) finishStory();
  else if (canPause()) pauseGame();
  else return false;
  sounds.play('CLICK', 0.6);
  return true;
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && handleBack()) e.preventDefault(); });
