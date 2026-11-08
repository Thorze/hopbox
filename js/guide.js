'use strict';
// Guide « Comment jouer ? » (version web d'essai), ouvert depuis le menu ☰ :
// - Les bases : l'entraînement interactif (tutorial.js) ;
// - Les blocs : un carrousel de tous les blocs du jeu, dessinés en vrai, avec une phrase simple et une astuce ;
// - Le parfait : le rond du milieu et la série de parfaits, avec les points de plus en plus gros.
// Textes très courts et très simples (enfants comme grands-parents).

const guide = { open: false, page: 'menu', idx: 0, lastTime: 0, t: 0 };
const guidePaint = new Paint(), guideText = new Paint({ textAlign: Align.CENTER, bold: true });
const GUIDE_BLOCKS = ['normal', 'mini', 'trampoline', 'moving', 'crumbly', 'golden', 'ice', 'coin', 'heart'];
let guidePlatforms = null;

function openGuide() { Object.assign(guide, { open: true, page: 'menu', idx: 0, t: 0 }); }
function closeGuide() { guide.open = false; }
/** Retour : d'une rubrique vers le sommaire, du sommaire vers le jeu. */
function guideBack() { if (guide.page === 'menu') closeGuide(); else guide.page = 'menu'; }

/** Les blocs d'exemple (de vrais blocs du jeu, créés une fois). */
function guideBlock(id) {
  if (!guidePlatforms) guidePlatforms = {};
  if (guidePlatforms[id]) return guidePlatforms[id];
  let p;
  const C = Color.parseColor;
  switch (id) {
    case 'mini': p = new Platform(0, 0, 0.42, false, C('#7E8CE0'), Kind.MINI); break;
    case 'trampoline': p = new Platform(0, 0, 0.75, true, C('#3F8EFC'), Kind.TRAMPOLINE); break;
    case 'moving': p = new Platform(0, 0, 0.7, false, C('#B07FD6'), Kind.MOVING, true); break;
    case 'crumbly': p = new Platform(0, 0, 0.7, false, C('#C49A6C'), Kind.CRUMBLY); break;
    case 'golden': p = new Platform(0, 0, 0.7, false, C('#FFC93C'), Kind.CRUMBLY); p.golden = true; break;
    case 'ice': p = new Platform(0, 0, 0.75, false, ICE_COLOR, Kind.ICE); break;
    case 'coin': p = new Platform(0, 0, 0.75, false, C('#4FC3A1')); p.coin = 1; break;
    case 'heart': p = new Platform(0, 0, 0.75, false, C('#FF8FB1')); p.heart = true; break;
    default: p = new Platform(0, 0, 0.75, false, C('#FF7A45')); break;
  }
  guidePlatforms[id] = p;
  return p;
}

/** Dessine un vrai bloc du jeu, agrandi de [scale], avec son dessus centré en (x, y). */
function drawGuideBlock(canvas, id, x, y, scale, dt) {
  const p = guideBlock(id);
  if (id === 'moving') p.update(dt);
  // Bloc fragile / doré : il tremble en boucle comme quand on est dessus
  if (id === 'crumbly' || id === 'golden') { p.crumbleDur = 2; p.crumbleT = (guide.t * 0.8) % 1.6; }
  const save = [camX, camY, shakeX, shakeY];
  camX = w * 0.5 - x; camY = h * 0.6 - y; shakeX = 0; shakeY = 0;
  canvas.save(); canvas.scale(scale, scale, x, y);
  p.draw(canvas);
  canvas.restore();
  [camX, camY, shakeX, shakeY] = save;
}

/** Texte centré sur plusieurs lignes ; renvoie la hauteur utilisée. */
function guideLines(canvas, text, x, y, maxW, paint, lh, maxLines = 6) {
  const lines = wrapText(text, paint, maxW).slice(0, maxLines);
  lines.forEach((l, i) => canvas.drawText(l, x, y + i * lh, paint));
  return lines.length * lh;
}

// Canvas factice : sert à mesurer la hauteur d'une page sans rien dessiner
const GUIDE_NULL_CANVAS = new Proxy({}, { get: () => () => {} });

/** Dessine une page en la réduisant si elle dépasse la place disponible (petits écrans). */
function guideFit(canvas, drawPage, top, avail, cx) {
  const needed = drawPage(GUIDE_NULL_CANVAS) - top;
  const s = needed > avail ? avail / needed : 1;
  canvas.save();
  if (s < 1) canvas.scale(s, s, cx, top);
  drawPage(canvas);
  canvas.restore();
}

function drawGuide(canvas) {
  if (!guide.open) return;
  if (state !== State.READY) { guide.open = false; return; }
  const dt = Math.min(0.05, Math.max(0, time - guide.lastTime)); guide.lastTime = time; guide.t += dt;
  buttons.length = 0;
  const left = w * 0.04, right = w * 0.96, top = insetTop + w * 0.04, bottom = ub() - w * 0.04;
  panel(canvas, left, top, right, bottom, '❓ ' + tr('guide.title'), () => guideBack());
  if (guide.page === 'menu') drawGuideMenu(canvas, left, top, right, bottom);
  else if (guide.page === 'blocks') drawGuideBlocks(canvas, left, top, right, bottom, dt);
  else guideFit(canvas, (c) => drawGuidePerfect(c, left, top, right, bottom), top, bottom - top - w * 0.04, (left + right) / 2);
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

/** Sommaire : trois grandes cartes. */
function drawGuideMenu(canvas, left, top, right, bottom) {
  const cats = [
    ['👆', 'basics', '#4CBB47', () => { closeGuide(); startTuto(); }],
    ['🧱', 'blocks', '#3F8EFC', () => { guide.page = 'blocks'; guide.idx = 0; }],
    ['🎯', 'perfect', '#FF9F1C', () => { guide.page = 'perfect'; }],
  ];
  const ch = w * 0.3, gap = w * 0.06;
  let y = top + w * 0.26;
  for (const [icon, key, col, action] of cats) {
    const r = new RectF(left + w * 0.05, y, right - w * 0.05, y + ch), dn = isPressed(r) ? w * 0.008 : 0;
    guidePaint.shader = null; guidePaint.color = shade(Color.parseColor(col), 0.75);
    canvas.drawRoundRect(new RectF(r.left, r.top + w * 0.014, r.right, r.bottom + w * 0.014), w * 0.05, w * 0.05, guidePaint);
    guidePaint.color = Color.parseColor(col); canvas.drawRoundRect(new RectF(r.left, r.top + dn, r.right, r.bottom + dn), w * 0.05, w * 0.05, guidePaint);
    guideText.color = Color.WHITE; guideText.textAlign = Align.CENTER; guideText.textSize = w * 0.12;
    canvas.drawText(icon, r.left + w * 0.12, r.centerY() + dn + w * 0.04, guideText);
    guideText.textAlign = Align.LEFT; guideText.textSize = w * 0.065;
    canvas.drawText(fitText(tr(`guide.${key}`), guideText, r.width() - w * 0.3), r.left + w * 0.25, r.centerY() + dn - w * 0.01, guideText);
    guideText.textSize = w * 0.036; guideText.color = Color.argb(225, 255, 255, 255);
    canvas.drawText(fitText(tr(`guide.${key}_sub`), guideText, r.width() - w * 0.3), r.left + w * 0.25, r.centerY() + dn + w * 0.05, guideText);
    guideText.textSize = w * 0.07; guideText.color = Color.WHITE; guideText.textAlign = Align.CENTER;
    canvas.drawText('›', r.right - w * 0.06, r.centerY() + dn + w * 0.025, guideText);
    buttons.push({ rect: r, action });
    y += ch + gap;
  }
}

/** Les blocs : un bloc à la fois, flèches pour passer au suivant. */
function drawGuideBlocks(canvas, left, top, right, bottom, dt) {
  const cx = (left + right) / 2, ny = bottom - w * 0.13;
  // Le contenu (bloc, textes, astuce) est réduit s'il ne tient pas au-dessus des flèches
  let moved = false;
  guideFit(canvas, (c) => { const y = drawGuideBlockPage(c, left, top, right, moved ? dt : 0); moved = true; return y; }, top, ny - top - w * 0.03, cx);
  drawGuideBlocksNav(canvas, left, right, bottom);
}

/** Contenu d'une page de bloc ; renvoie le bas du contenu. */
function drawGuideBlockPage(canvas, left, top, right, dt) {
  const id = GUIDE_BLOCKS[guide.idx], cx = (left + right) / 2;
  // Sous-titre de la rubrique et compteur
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.038;
  canvas.drawText(`🧱 ${tr('guide.blocks')} · ${guide.idx + 1}/${GUIDE_BLOCKS.length}`, cx, top + w * 0.21, greyTextPaint);
  // Le bloc, en grand, sur un petit halo
  const by = top + w * 0.38;
  guidePaint.shader = null; guidePaint.color = Color.argb(40, 63, 142, 252); canvas.drawCircle(cx, by + w * 0.12, w * 0.25, guidePaint);
  drawGuideBlock(canvas, id, cx, by, 1.7, dt);
  // Nom, explication, astuce
  let y = by + w * 0.5;
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.07;
  canvas.drawText(fitText(tr(`guide.b.${id}`), darkTextPaint, right - left - w * 0.1), cx, y, darkTextPaint);
  y += w * 0.08;
  greyTextPaint.textSize = w * 0.045; greyTextPaint.color = Color.parseColor('#4A5570');
  y += guideLines(canvas, tr(`guide.b.${id}_text`), cx, y, right - left - w * 0.12, greyTextPaint, w * 0.06);
  greyTextPaint.color = Color.parseColor('#7A869A');
  // Astuce dans une bulle jaune
  y += w * 0.02;
  guideText.textAlign = Align.CENTER; guideText.textSize = w * 0.04; guideText.color = Color.parseColor('#7A4B00');
  const tip = '💡 ' + tr(`guide.b.${id}_tip`), tl = wrapText(tip, guideText, right - left - w * 0.2).slice(0, 3);
  const th = tl.length * w * 0.055 + w * 0.04;
  guidePaint.color = Color.parseColor('#FFF3C4'); canvas.drawRoundRect(new RectF(left + w * 0.06, y, right - w * 0.06, y + th), w * 0.035, w * 0.035, guidePaint);
  tl.forEach((l, i) => canvas.drawText(l, cx, y + w * 0.065 + i * w * 0.055, guideText));
  return y + th;
}

/** Navigation des blocs : précédent / points / suivant. */
function drawGuideBlocksNav(canvas, left, right, bottom) {
  const cx = (left + right) / 2, ny = bottom - w * 0.13, bh = w * 0.1;
  const first = guide.idx === 0, last = guide.idx === GUIDE_BLOCKS.length - 1;
  drawButton(canvas, new RectF(left + w * 0.05, ny, left + w * 0.3, ny + bh), '‹', first ? lockedPaint : backBtnPaint, w * 0.07, () => { if (!first) guide.idx--; });
  drawButton(canvas, new RectF(right - w * 0.3, ny, right - w * 0.05, ny + bh), '›', last ? lockedPaint : backBtnPaint, w * 0.07, () => { if (!last) guide.idx++; });
  for (let i = 0; i < GUIDE_BLOCKS.length; i++) {
    guidePaint.color = i === guide.idx ? Color.parseColor('#3F8EFC') : Color.parseColor('#D5DBE6');
    canvas.drawCircle(cx + (i - (GUIDE_BLOCKS.length - 1) / 2) * w * 0.035, ny + bh / 2, w * (i === guide.idx ? 0.012 : 0.009), guidePaint);
  }
}

/** Le parfait : le rond, puis l'escalier des points de la série. */
function drawGuidePerfect(canvas, left, top, right, bottom) {
  const cx = (left + right) / 2, maxW = right - left - w * 0.12;
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.038;
  canvas.drawText('🎯 ' + tr('guide.perfect'), cx, top + w * 0.21, greyTextPaint);
  // Un bloc avec le rond du milieu qui clignote en vert
  const by = top + w * 0.33;
  drawGuideBlock(canvas, 'normal', cx, by, 1.3, 0);
  const pulse = 0.5 + 0.5 * Math.sin(guide.t * 5), rr = k * 1.3 * 0.2;
  const st = new Paint({ style: Style.STROKE }); st.color = Color.argb(Math.round(150 + 100 * pulse), 76, 187, 71); st.strokeWidth = w * 0.01;
  canvas.drawOval(new RectF(cx - rr * 1.25 * (1 + 0.15 * pulse), by - rr * 0.72 * (1 + 0.15 * pulse), cx + rr * 1.25 * (1 + 0.15 * pulse), by + rr * 0.72 * (1 + 0.15 * pulse)), st);
  let y = by + w * 0.42;
  greyTextPaint.textSize = w * 0.045; greyTextPaint.color = Color.parseColor('#4A5570');
  y += guideLines(canvas, tr('guide.p.how'), cx, y, maxW, greyTextPaint, w * 0.058);
  y += w * 0.02;
  y += guideLines(canvas, tr('guide.p.streak'), cx, y, maxW, greyTextPaint, w * 0.058);
  greyTextPaint.color = Color.parseColor('#7A869A');
  // L'escalier des points : 1er, 2e… 6e et plus
  y += w * 0.03;
  const pts = [1, 1, 2, 3, 4, 5], colW = (right - left - w * 0.1) / 6, base = y + w * 0.2;
  pts.forEach((pt, i) => {
    const x0 = left + w * 0.05 + i * colW, bh = w * (0.04 + 0.03 * pt), hl = Math.floor(guide.t * 1.5) % 6 === i;
    guidePaint.color = Color.parseColor(hl ? '#FFB13C' : '#FFD27A');
    canvas.drawRoundRect(new RectF(x0 + colW * 0.12, base - bh, x0 + colW * 0.88, base), w * 0.02, w * 0.02, guidePaint);
    guideText.textAlign = Align.CENTER; guideText.color = Color.parseColor('#7A4B00'); guideText.textSize = w * (hl ? 0.05 : 0.044);
    canvas.drawText(`+${pt}`, x0 + colW / 2, base - bh - w * 0.015, guideText);
    greyTextPaint.textSize = w * 0.03;
    canvas.drawText(fitText(tr('guide.p.ranks').split('|')[i] || '', greyTextPaint, colW * 0.95), x0 + colW / 2, base + w * 0.045, greyTextPaint);
  });
  y = base + w * 0.11;
  greyTextPaint.textSize = w * 0.042; greyTextPaint.color = Color.parseColor('#C0392B');
  y += guideLines(canvas, '⚠️ ' + tr('guide.p.lose'), cx, y, maxW, greyTextPaint, w * 0.055, 2);
  greyTextPaint.color = Color.parseColor('#2E8B57');
  y += w * 0.01 + guideLines(canvas, '💡 ' + tr('guide.p.tip'), cx, y + w * 0.01, maxW, greyTextPaint, w * 0.055, 2);
  greyTextPaint.color = Color.parseColor('#7A869A');
  return y;
}
