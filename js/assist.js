'use strict';
// Aides du débutant (équivalent d'Assist.kt) : mode libre seulement (ni tuto, ni Aventure, ni duel). Elles
// s'effacent selon le meilleur score : record sous 5 = toutes les aides, de 5 à 15 elles diminuent, 15 ou plus
// = mode normal ; et au plus tard après 10 parties (elles s'effacent de la 7e à la 10e).
// Ombre d'atterrissage pendant l'appui, jauge plus lente qui reprend sa vitesse peu à peu, premiers blocs plus
// réguliers, seconde chance pendant les 3 premières parties et conseil après une chute.

const ASSIST_SCORE = 15, ASSIST_MAX_GAMES = 10, ASSIST_SAVE_GAMES = 3, ASSIST_EARLY = 12;
const assist = { saved: false, lastCause: '', hinted: false };
const assistPaint = new Paint(), assistStroke = new Paint({ style: Style.STROKE }), assistPath = new Path();
const assistText = new Paint({ textAlign: Align.CENTER });

/** Niveau d'aide (0..1) d'après le record et le nombre de parties jouées. */
function assistBase(games, best) {
  if (games >= ASSIST_MAX_GAMES || best >= ASSIST_SCORE) return 0;
  return Math.min(clamp((ASSIST_SCORE - best) / 10, 0, 1), clamp((ASSIST_MAX_GAMES - games) / 3, 0, 1));
}

function assistFreeRun() { return !tuto.active && !quest.active && !duel.active; }

/** Niveau d'aide de la partie en cours (0 = mode normal). */
// Le score de la partie compte comme un record : les aides s'effacent dès 5 points et disparaissent à 15 pendant la partie même.
function assistLevel() { return assistFreeRun() ? assistBase(Stats.get('games'), Math.max(profile.best, score)) : 0; }

/** Aide sur le bloc n° k de la partie : pleine au début, nulle après ASSIST_EARLY blocs. */
function assistEarly(k) { return assistLevel() * clamp(1 - (k - 1) / ASSIST_EARLY, 0, 1); }

/** Vitesse de la jauge (1 = normale) : 0,45 sur les 5 premiers sauts d'un débutant complet, puis elle accélère en douceur. */
function assistChargeSpeed() {
  const a = assistLevel();
  if (a <= 0) return 1;
  const run = jumps <= 5 ? 1 : Math.max(0.4, 1 - (jumps - 5) / 20 * 0.6);
  return 1 - 0.55 * a * run;
}

/** Écart aléatoire des distances, resserré pour les premiers blocs (rythme plus régulier). */
function assistSpread(k, spread) { return spread * (1 - 0.65 * assistEarly(k)); }

/** Demi-largeur d'un bloc, élargie pour les premiers blocs du débutant. */
function assistHalf(k, half) {
  const f = assistEarly(k);
  return f <= 0 ? half : Math.max(half, half + (0.9 - half) * f);
}

/** Seconde chance : pendant les 3 premières parties du débutant, une fois par partie. */
function assistCanSave() { return !assist.saved && assistLevel() > 0 && Stats.get('games') < ASSIST_SAVE_GAMES; }

function assistSave() {
  assist.saved = true;
  const cause = fallCause;
  fallCause = '';
  startRevive(true);
  assistHintBanner(cause);
  Telemetry.track('assist', { what: 'save' });
}

/** Bannière de conseil selon la cause de la chute ; vrai si un conseil a été montré. */
function assistHintBanner(cause) {
  const key = cause === 'short' ? 'assist.hint_short' : cause === 'long' ? 'assist.hint_long' : null;
  if (!key) return false;
  assist.hinted = true;
  banners.push({ text: tr(key), life: 3 });
  return true;
}

function assistOnGameOver() { if (assistFreeRun()) assist.lastCause = fallCause; }
function assistReset() { assist.saved = false; assist.hinted = false; }

/** Premier appui d'une partie du débutant : conseil tiré de la chute précédente. */
function assistOnFirstCharge() {
  if (assist.hinted || jumps > 0 || assistLevel() <= 0) return false;
  return assistHintBanner(assist.lastCause);
}

/** Saut trop court, mais on reste sur son bloc : petit encouragement. */
function assistOnShortStay() {
  if (assistLevel() <= 0) return;
  popups.push({ text: tr('assist.more'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.2, pz) + camY, life: 1.2 });
}

/** Ombre d'atterrissage pendant l'appui : verte si le cube retombera sur le bloc suivant, blanche sinon. */
function drawAimGhost(canvas) {
  if (state !== State.CHARGING) return;
  const a = assistLevel();
  if (a <= 0) return;
  const d = charge / maxChargeTime * maxReach;
  const gx = alongX ? px + d : px, gz = alongX ? pz : pz + d;
  const on = next.contains(gx, gz);
  const alpha = Math.min(1, 0.25 + a), r = 0.26;
  const p = assistPath;
  p.reset();
  for (let i = 0; i <= 24; i++) {
    const t = i / 24 * 2 * Math.PI, x = gx + r * Math.cos(t), z = gz + r * Math.sin(t);
    if (i === 0) p.moveTo(sx(x, z), sy(x, 0, z)); else p.lineTo(sx(x, z), sy(x, 0, z));
  }
  p.close();
  assistPaint.color = on ? Color.argb(Math.floor(150 * alpha), 76, 187, 71) : Color.argb(Math.floor(90 * alpha), 255, 255, 255);
  canvas.drawPath(p, assistPaint);
  assistStroke.strokeWidth = k * 0.035;
  assistStroke.color = on ? Color.argb(Math.floor(255 * alpha), 200, 255, 190) : Color.argb(Math.floor(200 * alpha), 255, 255, 255);
  canvas.drawPath(p, assistStroke);
  assistPaint.color = assistStroke.color;
  canvas.drawCircle(sx(gx, gz), sy(gx, 0, gz), k * 0.05, assistPaint);
}

/** Accueil du tout nouveau joueur : un doigt qui appuie, au-dessus du cube. */
function drawHoldFinger(canvas) {
  if (state !== State.READY || jumps > 0 || score > 0 || menu.open || !assistFreeRun()) return;
  if (Stats.get('games') >= ASSIST_SAVE_GAMES || assistLevel() <= 0) return;
  const press = Math.abs(Math.sin(time * 3));
  assistText.textSize = w * 0.11; assistText.color = Color.WHITE;
  canvas.drawText('👆', zoomX(sx(px, pz)), zoomY(sy(px, playerHeight, pz)) - w * 0.08 + press * w * 0.025, assistText);
}
