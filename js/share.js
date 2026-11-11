'use strict';
// Fin de partie : prochain objectif et partage du score en image (équivalent de ShareCard.kt, même carte).

/** Phrases de la carte : en anglais court, compris partout (volontairement non traduites). */
// Phrases de la carte de partage (card.p1 … card.p10), dans la langue du joueur
const SHARE_PHRASE_COUNT = 10;
let overGoal = null;
/** Objet de boutique visé par l'objectif de fin de partie (toucher = l'ouvrir dans la boutique). */
let overGoalItem = null;

/** Prochain objectif proposé sur l'écran de fin (le plus proche et le plus motivant). */
function nextGoal() {
  overGoalItem = null;
  if (!newBest && best > 0) {
    const gap = best - score + 1;
    if (gap <= Math.max(10, Math.floor(best / 4))) return tr('goal.record', { n: gap });
  }
  const list = missions.list();
  let bi = -1, bf = 0;
  list.forEach((m, i) => {
    if (missions.isDone(i)) return;
    const f = missions.progress(i) / Math.max(1, m.target);
    if (f >= 0.5 && f < 1 && f > bf) { bf = f; bi = i; }
  });
  if (bi >= 0) return tr('goal.mission', { m: list[bi].label, p: missions.progress(bi), t: list[bi].target });
  if (DailyReward.canClaim(DailyReward.today())) return tr('goal.daily');
  // Un objet de la boutique tiré au hasard à chaque fin de partie : parmi ceux qu'on peut s'offrir, sinon parmi
  // les 4 moins chers qui restent à acheter (l'affichage change d'une partie à l'autre)
  const notOwned = Skins.items.filter((it) => it.isShop && !profile.owns(it));
  const affordable = notOwned.filter((it) => profile.coins >= it.price);
  const pool = affordable.length ? affordable : notOwned.sort((a, b) => a.price - b.price).slice(0, 4);
  const item = pool.length ? pool[rndInt(pool.length)] : undefined;
  if (item) {
    overGoalItem = item;
    // « les lunettes Pixel » : la catégorie de l'objet, avec son article, dans chaque langue
    const thing = tr(`goal.item.${item.slot.key}`, { item: item.label });
    return profile.coins >= item.price ? tr('goal.buy', { thing }) : tr('goal.coins', { n: item.price - profile.coins, thing });
  }
  return tr('goal.record_plain', { n: best });
}

const cardPaint = new Paint();
const cardText = new Paint({ bold: true, textAlign: Align.CENTER });
const cardStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });
const cardPath = new Path();

function cardBlock(c, cx, topY, s, color) {
  const hgt = s * 1.1;
  cardPaint.shader = null;
  cardPath.reset(); cardPath.moveTo(cx - s, topY); cardPath.lineTo(cx, topY + s * 0.5); cardPath.lineTo(cx, topY + s * 0.5 + hgt); cardPath.lineTo(cx - s, topY + hgt); cardPath.close();
  cardPaint.color = shade(color, 0.82); c.drawPath(cardPath, cardPaint);
  cardPath.reset(); cardPath.moveTo(cx + s, topY); cardPath.lineTo(cx, topY + s * 0.5); cardPath.lineTo(cx, topY + s * 0.5 + hgt); cardPath.lineTo(cx + s, topY + hgt); cardPath.close();
  cardPaint.color = shade(color, 0.64); c.drawPath(cardPath, cardPaint);
  cardPath.reset(); cardPath.moveTo(cx, topY - s * 0.5); cardPath.lineTo(cx + s, topY); cardPath.lineTo(cx, topY + s * 0.5); cardPath.lineTo(cx - s, topY); cardPath.close();
  cardPaint.color = shade(color, 1.08); c.drawPath(cardPath, cardPaint);
}

function cardSpark(c, x, y, r, color) {
  cardPath.reset();
  cardPath.moveTo(x, y - r); cardPath.lineTo(x + r * 0.25, y - r * 0.25); cardPath.lineTo(x + r, y); cardPath.lineTo(x + r * 0.25, y + r * 0.25);
  cardPath.lineTo(x, y + r); cardPath.lineTo(x - r * 0.25, y + r * 0.25); cardPath.lineTo(x - r, y); cardPath.lineTo(x - r * 0.25, y - r * 0.25); cardPath.close();
  cardPaint.shader = null; cardPaint.color = color; c.drawPath(cardPath, cardPaint);
}

/** Petit hasard fixe à partir d'une graine (mêmes confettis pour une même carte). */
function cardRng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** Dessine la carte (W × H) : fond, rayons, confettis, titre, personnage dans la pose, bulle, score, adresse. */
function drawShareCard(c, W, H, pose, phrase, seed) {
  const rnd = cardRng(seed), cx = W / 2, cy = H * 0.47;
  cardPaint.color = Color.WHITE;
  cardPaint.shader = new LinearGradient(0, 0, 0, H, Color.parseColor('#4FB8EE'), Color.parseColor('#FFC9A0'));
  c.drawRect(0, 0, W, H, cardPaint);
  cardPaint.shader = null;
  cardPaint.color = Color.argb(34, 255, 255, 255);
  for (let i = 0; i < 16; i++) {
    const a0 = i * Math.PI * 2 / 16;
    cardPath.reset(); cardPath.moveTo(cx, cy); cardPath.lineTo(cx + Math.cos(a0) * H, cy + Math.sin(a0) * H); cardPath.lineTo(cx + Math.cos(a0 + 0.17) * H, cy + Math.sin(a0 + 0.17) * H); cardPath.close();
    c.drawPath(cardPath, cardPaint);
  }
  const conf = [0xFFFF7A45, 0xFFFFC93C, 0xFF3DBE6E, 0xFF3F8EFC, 0xFFE84393, 0xFFFFFFFF];
  for (let i = 0; i < (pose === 4 ? 70 : 40); i++) {
    const x = rnd() * W, y = rnd() * H * 0.78;
    c.save(); c.rotate(rnd() * 360, x, y);
    cardPaint.color = conf[Math.floor(rnd() * conf.length)];
    c.drawRect(x - W * 0.008, y - W * 0.004, x + W * 0.008, y + W * 0.004, cardPaint);
    c.restore();
  }
  // Titre : le même logo illustré que l'accueil
  if (logoImg.complete && logoImg.naturalWidth) {
    const lh = H * 0.18, lw = lh * LOGO_RATIO, lt = H * 0.02;
    c.drawBitmap(logoImg, cx - lw / 2, lt, lw, lh);
  } else {
    drawLogo(c, 'HOP BOX', cx, H * 0.145, W * 0.19, false);
  }
  const S = W * 0.33 / k, blockTop = H * 0.62, blockS = W * 0.2;
  const blockColor = pose === 4 ? Color.parseColor('#FFC93C') : Color.parseColor('#9EA7B8');
  let feetY = blockTop, rot = 0, sw = 1, sh = 1;
  if (pose === 0) { feetY = blockTop - W * 0.11; }
  else if (pose === 1) rot = -10;
  else if (pose === 3) { feetY = blockTop - W * 0.1; rot = 26; }
  cardBlock(c, cx, blockTop, blockS, blockColor);
  cardPaint.color = Color.argb(60, 0, 0, 0);
  const shw = blockS * (pose === 0 || pose === 3 ? 0.35 : 0.5);
  c.drawOval(new RectF(cx - shw, blockTop - shw * 0.28, cx + shw, blockTop + shw * 0.28), cardPaint);
  if (pose === 0) {
    cardPaint.color = Color.argb(170, 255, 255, 255);
    for (let i = -1; i <= 1; i++) c.drawRoundRect(new RectF(cx + i * W * 0.06 - W * 0.008, feetY + W * 0.03, cx + i * W * 0.06 + W * 0.008, feetY + W * 0.1 - (i === 0 ? 0 : W * 0.025)), W * 0.008, W * 0.008, cardPaint);
  } else if (pose === 1 || pose === 4) {
    for (let i = 0; i < 6; i++) { const a0 = -2.6 + i * 0.45; cardSpark(c, cx + Math.cos(a0) * W * 0.27, feetY - W * 0.16 + Math.sin(a0) * W * 0.22, W * (0.025 + 0.012 * (i % 2)), Color.parseColor('#FFF59D')); }
  } else if (pose === 2) {
    cardPaint.color = Color.argb(200, 255, 255, 255);
    for (let i = 0; i < 5; i++) c.drawCircle(cx + (i - 2) * W * 0.07, blockTop - W * 0.005, W * (0.022 + 0.008 * (2 - Math.abs(i - 2))), cardPaint);
  } else if (pose === 3) {
    cardStroke.strokeWidth = W * 0.012; cardStroke.color = Color.argb(190, 255, 255, 255);
    const arc = new RectF(cx - W * 0.2, feetY - W * 0.32, cx + W * 0.2, feetY + W * 0.06);
    c.drawArc(arc, 200, 70, false, cardStroke); c.drawArc(arc, 20, 70, false, cardStroke);
  }
  c.save(); c.translate(cx, feetY); c.rotate(rot); c.scale(S, S);
  drawCharacter(c, 0, 0, 0, sw, sh, true, false, true);
  c.restore();
  cardText.textSize = W * 0.055;
  const tw = cardText.measureText(phrase), bx = Math.min(cx + W * 0.14, W - tw / 2 - W * 0.07), by = Math.max(feetY - W * 0.42, H * 0.21 + W * 0.075);
  const bub = new RectF(bx - tw / 2 - W * 0.04, by - W * 0.075, bx + tw / 2 + W * 0.04, by + W * 0.03);
  cardPaint.color = Color.argb(60, 0, 0, 0); c.drawRoundRect(new RectF(bub.left, bub.top + W * 0.01, bub.right, bub.bottom + W * 0.01), W * 0.05, W * 0.05, cardPaint);
  cardPaint.color = Color.WHITE; c.drawRoundRect(bub, W * 0.05, W * 0.05, cardPaint);
  cardPath.reset(); cardPath.moveTo(bub.left + W * 0.08, bub.bottom - 2); cardPath.lineTo(bub.left + W * 0.05, bub.bottom + W * 0.05); cardPath.lineTo(bub.left + W * 0.14, bub.bottom - 2); cardPath.close();
  c.drawPath(cardPath, cardPaint);
  cardText.color = Color.parseColor('#2E3A59'); c.drawText(phrase, bx, by, cardText);
  const sc = new RectF(W * 0.18, H * 0.74, W * 0.82, H * 0.955);
  cardPaint.color = Color.argb(70, 20, 30, 60); c.drawRoundRect(new RectF(sc.left, sc.top + W * 0.015, sc.right, sc.bottom + W * 0.015), W * 0.05, W * 0.05, cardPaint);
  cardPaint.color = Color.WHITE; c.drawRoundRect(sc, W * 0.05, W * 0.05, cardPaint);
  cardText.color = Color.parseColor('#8A94A8'); cardText.textSize = W * 0.04; c.drawText(tr('card.score'), cx, sc.top + W * 0.06, cardText);
  cardText.color = Color.parseColor('#2E3A59'); cardText.textSize = W * 0.13; c.drawText(String(score), cx, sc.top + W * 0.175, cardText);
  // Sous le score : nombre de sauts et palier atteint (pour comprendre d'où vient le score)
  cardText.color = Color.parseColor('#8A94A8'); cardText.textSize = W * 0.042;
  c.drawText(fitText(tr('card.stats', { j: jumps, t: Difficulty.tier(jumps) }), cardText, sc.width() * 0.9), cx, sc.bottom - W * 0.035, cardText);
  if (newBest) {
    cardText.textSize = W * 0.042;
    const t = tr('card.record'), nw = cardText.measureText(t) + W * 0.06, nb = new RectF(cx - nw / 2, sc.top - W * 0.05, cx + nw / 2, sc.top + W * 0.015);
    cardPaint.color = Color.parseColor('#FFC93C'); c.drawRoundRect(nb, W * 0.03, W * 0.03, cardPaint);
    cardText.color = Color.parseColor('#7A4B00'); c.drawText(t, cx, nb.bottom - W * 0.018, cardText);
  }
  // Pas d'adresse du jeu tant qu'il n'est pas finalisé
}

/** Image du score : partage natif (téléphone) si possible, sinon téléchargement du fichier PNG. */
function shareScore() {
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  drawShareCard(new Canvas(cv.getContext('2d')), W, H, Math.floor(Math.random() * 5), tr('card.p' + (Math.floor(Math.random() * SHARE_PHRASE_COUNT) + 1)), Math.floor(Math.random() * 1e9));
  const text = tr('share.text', { n: score });
  cv.toBlob(async (blob) => {
    if (!blob) { banners.push({ text: tr('share.error'), life: 2 }); return; }
    const file = new File([blob], 'hopbox-score.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'hopbox-score.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    banners.push({ text: tr('share.saved'), life: 2 });
  }, 'image/png');
}

/** Bouton rond bleu avec l'icône universelle de partage (trois points reliés). */
/** Onglet bleu « Partage tes exploits » logé dans le coin bas droit d'une carte (bord droit right, bas bottom) ;
 * son coin bas droit reprend l'arrondi cornerR de la carte pour s'y fondre. */
const sharePath = new Path();
function drawSharePill(canvas, right, bottom, cornerR, action, leftEdge = null) {
  const ph = w * 0.075;
  progText.textSize = w * 0.032;
  const label = tr('over.share'), pw = leftEdge !== null ? right - leftEdge : Math.min(progText.measureText(label) + ph * 1.5, w * 0.55);
  // leftEdge : collé à l'onglet rouge, sans arrondi à la jonction
  const l = right - pw, t = bottom - ph, face = new RectF(l, t, right, bottom), tl = leftEdge !== null ? 0 : ph * 0.5;
  sharePath.reset();
  sharePath.moveTo(l, bottom); sharePath.lineTo(l, t + tl); if (tl > 0) sharePath.quadTo(l, t, l + tl, t);
  sharePath.lineTo(right, t); sharePath.lineTo(right, bottom - cornerR); sharePath.quadTo(right, bottom, right - cornerR, bottom);
  sharePath.close();
  progPaint.shader = null; progPaint.color = Color.parseColor(isPressed(face) ? '#2F74D8' : '#3F8EFC');
  canvas.drawPath(sharePath, progPaint);
  const tw = Math.min(progText.measureText(label), pw - ph * 1.35), gx = l + (pw - tw - ph * 0.75) / 2 + ph * 0.3;
  drawShareGlyph(canvas, leftEdge !== null ? gx : l + ph * 0.55, face.centerY(), ph * 0.27);
  progText.color = Color.WHITE; progText.textAlign = Align.LEFT;
  canvas.drawText(fitText(label, progText, pw - ph * 1.35), leftEdge !== null ? gx + ph * 0.45 : l + ph, face.centerY() + w * 0.011, progText);
  progText.textAlign = Align.CENTER;
  buttons.push({ rect: new RectF(l, t - ph * 0.25, right, bottom + ph * 0.25), action });
}

/** Onglet rouge « 🎬 Ralenti de la mort », calé dans le coin bas gauche de la carte du score. */
function drawDeathPill(canvas, left, bottom, cornerR, action, rightEdge = null) {
  const ph = w * 0.075;
  progText.textSize = w * 0.032;
  const label = '🎬 ' + tr('death.title'), pw = rightEdge !== null ? rightEdge - left : Math.min(progText.measureText(label) + ph * 0.9, w * 0.4);
  // rightEdge : collé à l'onglet bleu, sans arrondi à la jonction
  const r = left + pw, t = bottom - ph, face = new RectF(left, t, r, bottom), tr0 = rightEdge !== null ? 0 : ph * 0.5;
  sharePath.reset();
  sharePath.moveTo(r, bottom); sharePath.lineTo(r, t + tr0); if (tr0 > 0) sharePath.quadTo(r, t, r - tr0, t);
  sharePath.lineTo(left, t); sharePath.lineTo(left, bottom - cornerR); sharePath.quadTo(left, bottom, left + cornerR, bottom);
  sharePath.close();
  progPaint.shader = null; progPaint.color = Color.parseColor(isPressed(face) ? '#B81F33' : '#D7263D');
  canvas.drawPath(sharePath, progPaint);
  progText.color = Color.WHITE; progText.textAlign = Align.CENTER;
  canvas.drawText(fitText(label, progText, pw - ph * 0.5), left + pw / 2, face.centerY() + w * 0.011, progText);
  buttons.push({ rect: new RectF(left, t - ph * 0.25, r, bottom + ph * 0.25), action });
}

/** Icône universelle de partage (trois points reliés), blanche, de rayon r. */
function drawShareGlyph(canvas, cx, cy, r) {
  const s = r * 0.95, p1 = [cx + s * 0.7, cy - s * 0.75], p2 = [cx - s * 0.75, cy], p3 = [cx + s * 0.7, cy + s * 0.75];
  progStroke.color = Color.WHITE; progStroke.strokeWidth = r * 0.24;
  canvas.drawLine(p2[0], p2[1], p1[0], p1[1], progStroke); canvas.drawLine(p2[0], p2[1], p3[0], p3[1], progStroke);
  progPaint.color = Color.WHITE;
  for (const [x, y] of [p1, p2, p3]) canvas.drawCircle(x, y, r * 0.42, progPaint);
}
