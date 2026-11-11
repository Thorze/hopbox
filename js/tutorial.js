'use strict';
// « Comment jouer ? » (version web d'essai) : un petit tuto pour tout le monde, enfants compris.
// Une carte explique une seule chose (une icône, une phrase), puis le joueur s'entraîne tout de suite
// sur de grands blocs faciles, sans pouvoir perdre : s'il tombe, il revient sur son bloc et réessaie.
// Montré automatiquement aux nouveaux joueurs (après le choix du personnage), et depuis le menu ☰.

const tuto = { active: false, step: 0, done: 0, card: true, cardAt: 0, nextCardAt: -1 };
const TUTO_STEPS = [
  { icon: '👆', key: 's1', goal: 3 },
  { icon: '🎯', key: 's2', goal: 2, perfect: true },   // seuls les vrais parfaits comptent pour cette étape
  { icon: '🪙', key: 's3', goal: 1, coin: true },
];
/** Demi-largeur de la zone « parfait » autour du centre du bloc (la même que dans land()). */
const PERFECT_HALF = 0.13;
/**
 * Sauts bloqués pendant le tuto : carte d'explication affichée, ou étape réussie en attendant la carte
 * suivante (sinon, en enchaînant vite, on pouvait continuer à sauter sans fin, jusqu'au niveau bonus).
 */
function tutoLocked() { return tuto.active && (tuto.card || tuto.nextCardAt > 0); }
const tutoPaint = new Paint(), tutoText = new Paint({ textAlign: Align.CENTER, bold: true });

/* Débutant : ses 3 premières parties, la jauge est lente sur les 5 premiers sauts (équivalent de Tutorial.kt).
 * On le lui signale (tortue 🐢 près de la jauge, bannière au 1er appui), puis on le prévient quand elle reprend
 * sa vitesse normale (bannière, puis éclair ⚡ et contour orange qui pulse sur la charge suivante). */
const BEGINNER_GAMES = 3, BEGINNER_JUMPS = 5;
const gauge = { slowShown: false, fastWarn: false };
const gaugeWarnPaint = new Paint({ style: Style.STROKE });
function beginnerRun() { return !tuto.active && Stats.get('games') < BEGINNER_GAMES; }
function beginnerSlow() { return beginnerRun() && jumps < BEGINNER_JUMPS; }

/** Saut réussi compté : au 5e d'une partie de débutant, on prévient du changement de vitesse. */
function beginnerOnJumpCounted() {
  if (!beginnerRun() || jumps !== BEGINNER_JUMPS) return;
  gauge.fastWarn = true;
  banners.push({ text: tr('gauge.fast'), life: 2.8 });
}

/** Décore la jauge de charge normale (rectangle bar, déjà dessinée) selon la phase du débutant. */
function drawBeginnerGaugeHint(canvas, bar) {
  const slow = beginnerSlow();
  if (!slow && !gauge.fastWarn) return;
  if (slow && !gauge.slowShown) { gauge.slowShown = true; banners.push({ text: tr('gauge.slow'), life: 2.6 }); }
  const bh = bar.height();
  if (gauge.fastWarn) {
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(time * 9)), o = bh * 0.55;
    gaugeWarnPaint.strokeWidth = bh * (0.25 + 0.2 * pulse);
    gaugeWarnPaint.color = Color.argb(Math.round(150 + 105 * pulse), 255, 140, 40);
    canvas.drawRoundRect(new RectF(bar.left - o, bar.top - o, bar.right + o, bar.bottom + o), bh, bh, gaugeWarnPaint);
  }
  tutoText.textAlign = Align.CENTER; tutoText.color = Color.WHITE; tutoText.textSize = bh * 2.4;
  canvas.drawText(slow ? '🐢' : '⚡', bar.left - bh * 2.1, bar.centerY() + bh * 0.85, tutoText);
}

/** Nouveau joueur qui n'a encore jamais vu le tuto ni joué. */
function tutoPending() { return !store.getBool('tuto_done', false) && profile.best === 0 && store.getInt('sky_games', 0) === 0; }

function startTuto() {
  Object.assign(tuto, { active: true, step: 0, done: 0, card: true, cardAt: time, nextCardAt: -1 });
  // Pas d'imprévu, pas de météo pendant l'entraînement
  scheduleRocket(false); scheduleEagle(false); scheduleHeli(false); scheduleUfo(false); scheduleWhale(false); scheduleBlizzard(false); scheduleNuke(false);
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1;
  resetGame();
  state = State.READY;
}

/** Fin du tuto : retour à l'accueil, prêt à jouer pour de vrai. */
function finishTuto() {
  tuto.active = false;
  store.setBool('tuto_done', true);
  resetGame();
  state = State.READY;
}

/** Blocs de l'entraînement : grands, proches, toujours du même côté de difficulté (très facile). */
function spawnTuto() {
  alongX = rnd() < 0.5;
  const half = 0.85, dist = current.half + half + 0.5 + rnd() * 0.5;
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, false, palette[rndInt(palette.length)]);
  next.coin = TUTO_STEPS[tuto.step] && TUTO_STEPS[tuto.step].coin ? 1 : 0;
  platforms.push(next);
  trimPlatforms();
}

/** Saut réussi pendant l'entraînement. */
function tutoOnLand(perfect) {
  if (tuto.card || tuto.nextCardAt > 0) return;
  const st = TUTO_STEPS[tuto.step];
  if (!st) return;
  // Étape « parfait » : un atterrissage à côté du rond ne compte pas, on encourage à réessayer
  if (st.perfect && !perfect) {
    popups.push({ text: tr('tuto.almost'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.2, pz) + camY, life: 1.3 });
    return;
  }
  tuto.done++;
  const txt = perfect ? tr('tuto.perfect') : tr('tuto.bravo');
  popups.push({ text: txt, x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.2, pz) + camY, life: 1.1 });
  if (tuto.done >= st.goal) tuto.nextCardAt = time + 0.9;
}

/** Tombé pendant l'entraînement : pas de défaite, on revient sur son bloc. */
function tutoRespawn() {
  px = current.cx; pz = current.cz; py = 0;
  landSquash = 1; perfectStreak = 0; gameOverReason = null;
  state = State.READY;
  popups.push({ text: tr('tuto.retry'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.2, pz) + camY, life: 1.4 });
  sounds.play('LAND', 0.8);
}

/** Passe à la carte suivante (ou à la carte de fin). */
function tutoNextCard() {
  tuto.step++; tuto.done = 0; tuto.card = true; tuto.cardAt = time; tuto.nextCardAt = -1;
}

/**
 * Jauge du tuto : grande barre sombre, la zone de la bonne force en vert sur le fond, et un gros curseur
 * blanc qui avance (pas de remplissage qui la cacherait). Dans la zone, le curseur et la zone s'allument.
 */
function drawTutoGauge(canvas, ratio) {
  const from = alongX ? px : pz, c = alongX ? next.cx : next.cz;
  const a = clamp((c - next.half - from) / maxReach, 0, 1), b = clamp((c + next.half - from) / maxReach, 0, 1);
  const bw = w * 0.34, bh = w * 0.038, cx = sx(px, pz), top = sy(px, playerHeight, pz) - w * 0.11, l = cx - bw / 2;
  const inZone = ratio >= a && ratio <= b, p = tutoPaint;
  p.shader = null;
  // Fond (avec un léger contour blanc pour ressortir sur tous les décors)
  p.color = Color.argb(230, 255, 255, 255); canvas.drawRoundRect(new RectF(l - w * 0.008, top - w * 0.008, l + bw + w * 0.008, top + bh + w * 0.008), bh, bh, p);
  p.color = Color.parseColor('#3A4560'); canvas.drawRoundRect(new RectF(l, top, l + bw, top + bh), bh / 2, bh / 2, p);
  // Partie déjà parcourue, discrète
  p.color = Color.argb(90, 255, 255, 255); canvas.drawRoundRect(new RectF(l, top, l + bw * ratio, top + bh), bh / 2, bh / 2, p);
  // Zone de la bonne force
  p.color = inZone ? Color.parseColor('#6CF08A') : Color.parseColor('#39B54A');
  canvas.drawRoundRect(new RectF(l + bw * a, top + bh * 0.15, l + bw * b, top + bh * 0.85), bh * 0.35, bh * 0.35, p);
  // Étape « parfait » : la petite zone dorée du centre du bloc, c'est elle qu'il faut viser
  const aimPerfect = !!(TUTO_STEPS[tuto.step] && TUTO_STEPS[tuto.step].perfect);
  const pa = clamp((c - PERFECT_HALF - from) / maxReach, 0, 1), pb = clamp((c + PERFECT_HALF - from) / maxReach, 0, 1);
  const inPerfect = aimPerfect && ratio >= pa && ratio <= pb;
  if (aimPerfect) {
    p.color = Color.parseColor(inPerfect ? '#FFF2A8' : '#FFC93C');
    canvas.drawRoundRect(new RectF(l + bw * pa, top, l + bw * pb, top + bh), bh * 0.2, bh * 0.2, p);
    // Petite étoile repère au-dessus de la zone dorée
    tutoText.textAlign = Align.CENTER; tutoText.color = Color.parseColor('#FFC93C'); tutoText.textSize = w * 0.04;
    tutoText.setShadowLayer(w * 0.005, 0, w * 0.002, Color.argb(200, 60, 40, 0));
    if (!inZone) canvas.drawText('★', l + bw * (pa + pb) / 2, top - w * 0.012, tutoText);
    tutoText.shadow = null;
  }
  // Curseur : grosse poignée blanche, verte dans la zone
  const kx = l + bw * clamp(ratio, 0, 1), kr = bh * (inZone ? 0.95 : 0.8);
  p.color = Color.argb(90, 0, 0, 0); canvas.drawCircle(kx, top + bh / 2 + w * 0.005, kr, p);
  p.color = Color.WHITE; canvas.drawCircle(kx, top + bh / 2, kr, p);
  p.color = Color.parseColor(inPerfect ? '#FFB300' : inZone ? '#39B54A' : '#FF7A45'); canvas.drawCircle(kx, top + bh / 2, kr * 0.55, p);
  // « Lâche ! » au-dessus quand c'est le bon moment (étape « parfait » : seulement dans la zone dorée)
  if (aimPerfect ? inPerfect : inZone) {
    tutoText.textAlign = Align.CENTER; tutoText.color = Color.parseColor(aimPerfect ? '#F5A623' : '#39B54A'); tutoText.textSize = w * 0.05;
    tutoText.setShadowLayer(w * 0.006, 0, w * 0.003, Color.argb(220, 255, 255, 255));
    canvas.drawText(tr('tuto.release'), cx, top - w * 0.03, tutoText);
    tutoText.shadow = null;
  }
}

/** Carte d'explication, consigne pendant l'entraînement, bouton « Passer ». */
function drawTuto(canvas) {
  if (!tuto.active) return;
  if (tuto.nextCardAt > 0 && time >= tuto.nextCardAt && state === State.READY) tutoNextCard();
  const last = tuto.step >= TUTO_STEPS.length, st = TUTO_STEPS[tuto.step];
  if (!tuto.card) {
    // Consigne en haut, avec les étapes réussies
    const top = insetTop + w * 0.04, r = new RectF(w * 0.04, top, w * 0.74, top + w * 0.17);
    tutoPaint.shader = null;
    drawCard(canvas, r.left, r.top, r.right, r.bottom, '', w * 0.04);
    tutoText.color = Color.WHITE; tutoText.textAlign = Align.LEFT; tutoText.textSize = w * 0.042;
    canvas.drawText(fitText(st.icon + ' ' + tr('tuto.' + st.key + '.hint'), tutoText, r.width() - w * 0.06), r.left + w * 0.03, r.top + w * 0.07, tutoText);
    // Pastilles : sauts réussis / à faire
    for (let i = 0; i < st.goal; i++) {
      const cx = r.left + w * 0.06 + i * w * 0.075, cy = r.top + w * 0.12, ok = i < tuto.done;
      tutoPaint.color = ok ? Color.parseColor('#4CBB47') : Color.parseColor('#121B3A'); canvas.drawCircle(cx, cy, w * 0.026, tutoPaint);
      if (ok) { tutoText.textAlign = Align.CENTER; tutoText.color = Color.WHITE; tutoText.textSize = w * 0.032; canvas.drawText('✓', cx, cy + w * 0.011, tutoText); }
    }
    tutoText.textAlign = Align.CENTER;
    drawButton(canvas, new RectF(w * 0.76, top + w * 0.02, w * 0.96, top + w * 0.15), tr('tuto.skip'), tabOffPaint, w * 0.036, () => finishTuto());
    return;
  }
  // Carte d'explication : voile, carte en bas (on voit le personnage au-dessus), une icône, une phrase
  buttons.length = 0;
  const q = clamp((time - tuto.cardAt) / 0.25, 0, 1);
  tutoPaint.shader = null; tutoPaint.color = Color.argb(Math.round(110 * q), 10, 14, 30);
  canvas.drawRect(0, 0, w, h, tutoPaint);
  const cardH = w * 1.1, bottom = ub() - w * 0.06 + (1 - q) * w * 0.3, top = bottom - cardH;
  const card = new RectF(w * 0.06, top, w * 0.94, bottom);
  drawPanel(canvas, card);
  // Étapes ●●○○
  const n = TUTO_STEPS.length + 1;
  for (let i = 0; i < n; i++) {
    tutoPaint.color = i <= tuto.step ? UI.GOLD : Color.parseColor('#46527A');
    canvas.drawCircle(w / 2 + (i - (n - 1) / 2) * w * 0.05, top + w * 0.06, w * 0.014, tutoPaint);
  }
  const icon = last ? '🏁' : st.icon, key = last ? 'end' : st.key;
  tutoText.textAlign = Align.CENTER; tutoText.color = Color.WHITE;
  tutoText.textSize = w * 0.16 * (0.85 + 0.15 * Math.abs(Math.sin(time * 3)));
  canvas.drawText(icon, w / 2, top + w * 0.27, tutoText);
  tutoText.color = Color.WHITE; tutoText.textSize = w * 0.068;
  canvas.drawText(fitText(tr('tuto.' + key + '.title'), tutoText, card.width() - w * 0.08), w / 2, top + w * 0.39, tutoText);
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.047;
  const lines = wrapText(tr('tuto.' + key + '.text'), greyTextPaint, card.width() - w * 0.12);
  lines.slice(0, 5).forEach((l, i) => canvas.drawText(l, w / 2, top + w * 0.48 + i * w * 0.058, greyTextPaint));
  // Boutons : « À toi ! » (ou « C'est parti ! » à la fin), et « Passer le tuto » sur sa propre ligne en dessous,
  // bien séparé du bord de la carte, avec une grande zone de toucher (toute la bande sous le bouton)
  const by = bottom - w * 0.3;
  if (q >= 1) {
    if (last) drawButton(canvas, new RectF(w * 0.16, by, w * 0.84, by + w * 0.13), tr('tuto.go'), primaryBtnPaint, w * 0.06, () => finishTuto());
    else drawButton(canvas, new RectF(w * 0.16, by, w * 0.84, by + w * 0.13), tr('tuto.try'), primaryBtnPaint, w * 0.06, () => {
      tuto.card = false;
      if (st.coin && next) next.coin = 1;
    });
    if (!last) {
      greyTextPaint.textSize = w * 0.044;
      const sy0 = bottom - w * 0.075;
      canvas.drawText(tr('tuto.skip_all'), w / 2, sy0, greyTextPaint);
      buttons.push({ rect: new RectF(card.left + w * 0.08, by + w * 0.15, card.right - w * 0.08, bottom - w * 0.01), action: () => finishTuto() });
    }
  }
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}
