'use strict';
// Écran « Progression » (équivalent de Progression.kt) : personnage sur un podium, points,
// missions, objets en cartes classés par prix, et animation de transformation à chaque choix.

const TRANS_DUR = 0.8;
let progScroll = 0, progMaxScroll = 0, progGridTop = 0, progGridBottom = 0;
let progDragY = -1, progDragStart = 0, progDownX = 0, progDragMoved = false;
let buyItem = null, buyTint = null, transT = -1, transKind = 0, transSwapped = false;
let heroFx = [];
const progPaint = new Paint();
const progStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });
const progText = new Paint({ textAlign: Align.CENTER, color: Color.WHITE, bold: true });

const SLOT_ICONS = { character: '🧸', shape: '🔷', color: '🎨', glasses: '🕶️', hat: '🎩', shoes: '👟', back: '🎒', trail: '✨', block: '🧱' };
const TRAIL_ICONS = { none: '🚫', trait: '〰️', etoiles: '⭐', bulles: '🫧', notes: '🎵', coeurs: '💕', arcenciel: '🌈' };

/** Objets d'un onglet : celui par défaut, puis ceux débloqués par les points, puis la boutique, par prix. */
function sortedItems(slot) {
  const all = Skins.bySlot(slot);
  const rest = all.slice(1).sort((a, b) => ((a.quest > 0) - (b.quest > 0)) || (a.isShop - b.isShop) || ((a.isShop ? a.price : a.cost) - (b.isShop ? b.price : b.cost)));
  return [all[0], ...rest];
}

function openCustomize() {
  if (state === State.CUSTOMIZE) return;
  custReturnState = state; custMsg = ''; custMsgT = 0; progScroll = 0; buyItem = null; buyTint = null;
  state = State.CUSTOMIZE;
}

function closeCustomize() {
  profile.customized = true;
  if (transT >= 0 && !transSwapped) loadLook();
  transT = -1;
  state = custReturnState;
}

/** Équipe un élément avec une animation de transformation tirée au hasard. */
function equip(apply) {
  apply();
  if (transT >= 0 && !transSwapped) loadLook();
  transKind = rndInt(4); transT = 0; transSwapped = false;
  sounds.play('TAP', 0.8);
}

function updateProgression(dt) {
  if (custMsgT > 0) custMsgT -= dt;
  if (transT >= 0) {
    transT += dt;
    if (!transSwapped && transT >= TRANS_DUR * 0.5) { transSwapped = true; loadLook(); heroBurst(); sounds.play('STAR', 0.9); }
    if (transT >= TRANS_DUR) transT = -1;
  }
  for (const p of heroFx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
  heroFx = heroFx.filter((p) => p.life > 0);
}

function heroBurst() {
  const n = transKind === 0 ? 16 : transKind === 2 ? 18 : 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI + Math.random() * 0.3;
    const sp = w * (0.25 + Math.random() * 0.35);
    const star = transKind === 0 ? false : transKind <= 2 ? true : i % 2 === 1;
    const life = 0.5 + Math.random() * 0.4;
    const g = transKind === 3 ? w * 0.6 : -w * 0.1;
    const color = transKind === 0 ? Color.argb(230, 235, 238, 245)
      : transKind === 1 ? [0xFFFFD54F, 0xFF8EC5FF, 0xFFFF8FB1][i % 3] : transKind === 2 ? 0xFFFFF59D : 0xFFFFD54F;
    const vy = transKind === 3 ? -Math.abs(Math.sin(a)) * sp * 0.6 : Math.sin(a) * sp * 0.7;
    heroFx.push({ x: Math.cos(a) * w * 0.02, y: -w * 0.08, vx: Math.cos(a) * sp, vy, life, max: life, star, g, color });
  }
}

function drawCustomize(canvas) {
  const top = insetTop, bottom = ub(), PC = Color.parseColor;
  progPaint.color = Color.WHITE;
  progPaint.shader = new LinearGradient(0, 0, 0, h, PC('#33406B'), PC('#161C30'));
  canvas.drawRect(0, 0, w, h, progPaint);
  progPaint.shader = null;

  const hy = top + w * 0.1;
  drawRoundIcon(canvas, w * 0.09, hy, w * 0.055, '‹', w * 0.075, () => closeCustomize());
  progText.color = Color.WHITE; progText.textSize = w * 0.06;
  canvas.drawText(tr('shop.title'), w / 2, hy + w * 0.02, progText);
  drawCoinPill(canvas, w * 0.95, hy, true);

  const heroTop = top + w * 0.17;
  // Le podium rétrécit sur les écrans courts pour laisser au moins 2 rangées de cartes
  const heroH = clamp((bottom - top) - w * 1.55, w * 0.3, w * 0.62);
  drawHero(canvas, w / 2, heroTop, heroH);

  let y = heroTop + heroH + w * 0.02;
  drawPointsBar(canvas, y);
  y += w * 0.1;


  const perRow = Math.ceil(SLOTS.length / 2), tabH = w * 0.085, tw = (w * 0.92) / perRow;
  SLOTS.forEach((slot, i) => {
    const x0 = w * 0.04 + (i % perRow) * tw, y0 = y + Math.floor(i / perRow) * (tabH + w * 0.015);
    const r = new RectF(x0 + w * 0.006, y0, x0 + tw - w * 0.006, y0 + tabH);
    progPaint.color = slot === custSlot ? PC('#FF7A45') : Color.argb(40, 255, 255, 255);
    canvas.drawRoundRect(r, tabH / 2, tabH / 2, progPaint);
    progText.textSize = w * 0.03;
    const label = fitText(SLOT_ICONS[slot.key] + ' ' + slot.title, progText, r.width() - w * 0.02);
    canvas.drawText(label, r.centerX(), r.centerY() + progText.textSize * 0.36, progText);
    buttons.push({ rect: r, action: () => { if (custSlot !== slot) { custSlot = slot; progScroll = 0; } } });
  });
  y += 2 * tabH + w * 0.015 + w * 0.03;

  const tintable = Skins.tintable.has(custSlot);
  progGridTop = y;
  progGridBottom = bottom - (tintable ? w * 0.2 : w * 0.03);
  drawCards(canvas);
  if (tintable) drawPaints(canvas, progGridBottom + w * 0.02);

  if (custMsgT > 0 && custMsg) {
    progText.textSize = w * 0.036;
    const msg = fitText(custMsg, progText, w * 0.86);
    const mw = progText.measureText(msg) + w * 0.08, my = progGridBottom - w * 0.1;
    const a = Math.round(Math.min(1, custMsgT * 2) * 235);
    progPaint.color = Color.argb(a, 20, 24, 40);
    rect.set(w / 2 - mw / 2, my, w / 2 + mw / 2, my + w * 0.085);
    canvas.drawRoundRect(rect, w * 0.0425, w * 0.0425, progPaint);
    progText.alpha = a;
    canvas.drawText(msg, w / 2, my + w * 0.055, progText);
    progText.alpha = 255;
  }
  if (buyItem || buyTint) drawBuyDialog(canvas);
}

function drawRoundIcon(canvas, cx, cy, r, icon, size, action) {
  progPaint.color = Color.argb(60, 255, 255, 255);
  canvas.drawCircle(cx, cy, r, progPaint);
  progText.textSize = size; progText.color = Color.WHITE;
  canvas.drawText(icon, cx, cy + size * 0.35, progText);
  buttons.push({ rect: new RectF(cx - r * 1.3, cy - r * 1.3, cx + r * 1.3, cy + r * 1.3), action });
}

function drawCoinPill(canvas, x, cy, alignRight) {
  const text = String(profile.coins);
  progText.textSize = w * 0.046;
  const tw = progText.measureText(text), ph = w * 0.1, pw = tw + ph + w * 0.05;
  const l = alignRight ? x - pw : x, face = new RectF(l, cy - ph / 2, l + pw, cy + ph / 2);
  reliefPaint.color = Color.argb(150, 60, 66, 84);
  rect.set(face.left, face.top + w * 0.01, face.right, face.bottom + w * 0.01); canvas.drawRoundRect(rect, ph / 2, ph / 2, reliefPaint);
  reliefPaint.color = Color.argb(205, 232, 236, 244); canvas.drawRoundRect(face, ph / 2, ph / 2, reliefPaint);
  progStroke.color = Color.argb(220, 255, 255, 255); progStroke.strokeWidth = w * 0.004;
  canvas.drawRoundRect(face, ph / 2, ph / 2, progStroke);
  progText.textSize = ph * 0.72;
  canvas.drawText('🪙', face.left + ph * 0.52, cy + ph * 0.25, progText);
  progText.textSize = w * 0.046; progText.color = Color.parseColor('#2E3A59'); progText.textAlign = Align.LEFT;
  canvas.drawText(text, face.left + ph, cy + w * 0.016, progText);
  progText.textAlign = Align.CENTER; progText.color = Color.WHITE;
}

const easeIn = (t) => t * t;
const elasticOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1);

function drawHero(canvas, cx, heroTop, heroH) {
  const feetY = heroTop + heroH * 0.8, glowY = heroTop + heroH * 0.5, PC = Color.parseColor;
  canvas.save();
  canvas.translate(cx, glowY);
  canvas.rotate(time * 12);
  progPaint.color = Color.argb(22, 255, 255, 255);
  const rr = heroH * 0.75;
  for (let i = 0; i < 12; i++) {
    const a0 = i * (Math.PI / 6), a1 = a0 + Math.PI / 14;
    tmpPath.reset(); tmpPath.moveTo(0, 0); tmpPath.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); tmpPath.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); tmpPath.close();
    canvas.drawPath(tmpPath, progPaint);
  }
  canvas.restore();
  for (let i = 4; i >= 1; i--) { progPaint.color = Color.argb(14 + (4 - i) * 6, 255, 213, 79); canvas.drawCircle(cx, glowY, heroH * 0.12 * i, progPaint); }
  const pw = heroH * 0.55;
  progPaint.color = PC('#252E4D'); rect.set(cx - pw, feetY - heroH * 0.02, cx + pw, feetY + heroH * 0.16); canvas.drawOval(rect, progPaint);
  progPaint.color = PC('#4A5A8C'); rect.set(cx - pw, feetY - heroH * 0.09, cx + pw, feetY + heroH * 0.09); canvas.drawOval(rect, progPaint);
  progPaint.color = PC('#5C6DA3'); rect.set(cx - pw * 0.8, feetY - heroH * 0.065, cx + pw * 0.8, feetY + heroH * 0.065); canvas.drawOval(rect, progPaint);
  // Onglet « Blocs » : le personnage se tient sur un bloc de la matière choisie
  let lift = 0;
  if (custSlot === Slot.BLOCK) {
    const bs = heroH * 0.3 / k, half = 0.6, depth = 0.3;
    lift = (half + depth) * k * bs;
    canvas.save();
    canvas.translate(cx, feetY - lift);
    canvas.scale(bs, bs);
    drawTexturedBox(canvas, { half, baseColor: PC('#9FB4C7') }, lookBlock, depth);
    canvas.restore();
  }

  const p = transT >= 0 ? clamp(transT / TRANS_DUR, 0, 1) : -1;
  let sx = 1, sy = 1, dy = 0, flash = 0;
  const idle = Math.sin(time * 3) * 0.02;
  sy += idle; sx -= idle * 0.5;
  if (p >= 0) {
    if (transKind === 0) {
      const s = p < 0.5 ? 1 - easeIn(p / 0.5) : elasticOut((p - 0.5) / 0.5);
      sx *= s; sy *= s;
    } else if (transKind === 1) {
      sx *= Math.cos(p * 6 * Math.PI);
      dy = -Math.sin(p * Math.PI) * heroH * 0.18;
      if (Math.random() < 0.6) {
        const a = Math.random() * 2 * Math.PI;
        heroFx.push({ x: Math.cos(a) * heroH * 0.3, y: dy - Math.random() * heroH * 0.4, vx: -Math.sin(a) * w * 0.2, vy: -w * 0.15, life: 0.5, max: 0.5, star: true, g: 0, color: [0xFFFFD54F, 0xFF8EC5FF][rndInt(2)] });
      }
    } else if (transKind === 2) {
      flash = 1 - Math.abs(p - 0.5) * 2;
      sx *= 1 + 0.15 * flash; sy *= 1 + 0.15 * flash;
    } else {
      const up = heroH * 1.6;
      dy = p < 0.45 ? -easeIn(p / 0.45) * up : p < 0.55 ? -up : -(1 - easeIn((p - 0.55) / 0.45)) * up;
      if (p > 0.9) { const q = (p - 0.9) / 0.1; sy *= 1 - 0.25 * Math.sin(q * Math.PI); sx *= 1 + 0.2 * Math.sin(q * Math.PI); }
      if (p > 0.97 && heroFx.length < 40) {
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; heroFx.push({ x: 0, y: 0, vx: Math.cos(a) * w * 0.3, vy: -w * 0.05, life: 0.4, max: 0.4, star: false, g: 0, color: Color.argb(200, 220, 225, 235) }); }
      }
    }
  }
  const scale = heroH * 0.5 / k;
  canvas.save();
  canvas.clipRect(0, heroTop - w * 0.05, w, feetY + heroH * 0.2);
  canvas.translate(cx, feetY - lift + dy);
  canvas.scale(scale * sx, scale * sy);
  if (Math.abs(sx) > 0.01 && sy > 0.01) {
    const dirX = Math.floor(time / 2.5) % 2 === 0;
    drawCharacter(canvas, 0, 0, 0, 1, 1, dirX, false, false);
  }
  canvas.restore();
  for (const q of heroFx) {
    const a = clamp(q.life / q.max, 0, 1), c = q.color;
    progPaint.color = Color.argb(Math.round(Color.alpha(c) * a), Color.red(c), Color.green(c), Color.blue(c));
    const x = cx + q.x, yy = feetY + q.y;
    if (!q.star) canvas.drawCircle(x, yy, w * (0.025 + 0.03 * (1 - a)), progPaint);
    else drawStar(canvas, x, yy, w * 0.022 * (0.6 + a), progPaint);
  }
  if (flash > 0) {
    progPaint.color = Color.argb(Math.round(200 * flash), 255, 255, 255);
    canvas.drawCircle(cx, feetY - heroH * 0.3, heroH * (0.3 + 0.5 * flash), progPaint);
  }
}

function drawPointsBar(canvas, y) {
  const pts = profile.totalPoints, next = Skins.nextUnlock(pts), PC = Color.parseColor;
  const prev = Skins.items.filter((it) => !it.isShop && it.cost <= pts).reduce((m, it) => Math.max(m, it.cost), 0);
  const r = new RectF(w * 0.04, y, w * 0.96, y + w * 0.075);
  progPaint.color = Color.argb(110, 0, 0, 0);
  canvas.drawRoundRect(r, r.height() / 2, r.height() / 2, progPaint);
  const f = !next ? 1 : clamp((pts - prev) / Math.max(1, next.cost - prev), 0, 1);
  if (f > 0) {
    rect.set(r.left, r.top, r.left + Math.max(r.height(), r.width() * f), r.bottom);
    progPaint.color = Color.WHITE;
    progPaint.shader = new LinearGradient(rect.left, 0, rect.right, 0, PC('#FFD54F'), PC('#FF7A45'));
    canvas.drawRoundRect(rect, r.height() / 2, r.height() / 2, progPaint);
    progPaint.shader = null;
  }
  progText.textSize = w * 0.034;
  // Tous les paliers de points sont atteints : on indique ce qu'il reste à acheter en boutique
  const shopLeft = Skins.items.filter((it) => it.isShop && !profile.owns(it)).length + Skins.tints.filter((t) => !profile.ownsTint(t)).length;
  const text = !next ? `⭐ ${pts} · ` + (shopLeft > 0 ? tr('prog.shop_left', { n: shopLeft }) : tr('prog.all')) : `⭐ ${pts} / ${next.cost} · ` + tr('prog.next', { item: next.label });
  canvas.drawText(fitText(text, progText, r.width() - w * 0.06), r.centerX(), r.centerY() + w * 0.012, progText);
}

function drawCards(canvas) {
  const items = sortedItems(custSlot), selected = currentLook(custSlot), PC = Color.parseColor;
  const gap = w * 0.025, cardW = (w * 0.92 - 2 * gap) / 3, cardH = cardW * 1.15;
  const rows = Math.ceil(items.length / 3), viewH = progGridBottom - progGridTop;
  progMaxScroll = Math.max(0, rows * (cardH + gap) - gap - viewH);
  progScroll = clamp(progScroll, 0, progMaxScroll);
  const pts = profile.totalPoints;
  const special = lookSpecial !== Skins.NONE && custSlot !== Slot.CHARACTER && custSlot !== Slot.TRAIL;
  canvas.save();
  canvas.clipRect(0, progGridTop, w, progGridBottom);
  items.forEach((item, i) => {
    const x0 = w * 0.04 + (i % 3) * (cardW + gap), y0 = progGridTop + Math.floor(i / 3) * (cardH + gap) - progScroll;
    if (y0 > progGridBottom || y0 + cardH < progGridTop) return;
    const r = new RectF(x0, y0, x0 + cardW, y0 + cardH);
    const owned = profile.available(item), isSel = item.id === selected;
    progPaint.color = owned ? PC('#F4F6FB') : PC('#C9CFDD');
    canvas.drawRoundRect(r, w * 0.03, w * 0.03, progPaint);
    const thumb = new RectF(r.left + w * 0.015, r.top + w * 0.015, r.right - w * 0.015, r.top + cardH * 0.66);
    progPaint.color = isSel ? PC('#FFE3D6') : PC('#E3E8F2');
    canvas.drawRoundRect(thumb, w * 0.022, w * 0.022, progPaint);
    drawThumb(canvas, item, thumb.centerX(), thumb.centerY(), thumb.height(), !owned);
    progText.color = PC('#2E3A59'); progText.textSize = w * 0.03;
    const hidden = item.quest > 0 && !owned;
    canvas.drawText(fitText(hidden ? '???' : item.label, progText, cardW - w * 0.03), r.centerX(), r.top + cardH * 0.77, progText);
    const by = r.top + cardH * 0.9;
    if (isSel) {
      progText.color = PC('#FF7A45'); progText.textSize = w * 0.028;
      canvas.drawText('✓ ' + tr('prog.equipped'), r.centerX(), by + w * 0.01, progText);
    } else if (owned) {
      // rien
    } else if (hidden) {
      progText.color = PC('#4A5578'); progText.textSize = w * 0.026;
      canvas.drawText(fitText('🗺️ ' + tr('quest.season', { n: item.quest }), progText, cardW - w * 0.03), r.centerX(), by + w * 0.01, progText);
    } else if (item.isShop) {
      const pw = cardW * 0.7;
      rect.set(r.centerX() - pw / 2, by - w * 0.025, r.centerX() + pw / 2, by + w * 0.025);
      progPaint.color = profile.coins >= item.price ? PC('#FFC93C') : PC('#9AA3B8');
      canvas.drawRoundRect(rect, w * 0.025, w * 0.025, progPaint);
      progText.color = PC('#2E3A59'); progText.textSize = w * 0.03;
      canvas.drawText('🪙 ' + item.price, r.centerX(), by + w * 0.011, progText);
    } else {
      const bw = cardW * 0.7;
      rect.set(r.centerX() - bw / 2, by - w * 0.012, r.centerX() + bw / 2, by + w * 0.012);
      progPaint.color = PC('#A8B0C2'); canvas.drawRoundRect(rect, w * 0.012, w * 0.012, progPaint);
      const f = clamp(pts / item.cost, 0, 1);
      rect.right = rect.left + bw * f;
      progPaint.color = PC('#6C7BA8');
      if (f > 0) canvas.drawRoundRect(rect, w * 0.012, w * 0.012, progPaint);
      progText.color = PC('#4A5578'); progText.textSize = w * 0.024;
      canvas.drawText(`🔒 ${item.cost} pts`, r.centerX(), by - w * 0.02, progText);
    }
    if (isSel) { progStroke.color = PC('#FF7A45'); progStroke.strokeWidth = w * 0.008; canvas.drawRoundRect(r, w * 0.03, w * 0.03, progStroke); }
    if (special && !isSel) { progPaint.color = Color.argb(70, 22, 28, 48); canvas.drawRoundRect(r, w * 0.03, w * 0.03, progPaint); }
    progText.color = Color.WHITE;
    const hit = new RectF(r.left, Math.max(r.top, progGridTop), r.right, Math.min(r.bottom, progGridBottom));
    if (hit.height() > 0) buttons.push({ rect: hit, action: () => onCard(item, owned, isSel) });
  });
  canvas.restore();
  if (progMaxScroll > 0) {
    const thumbH = Math.max(w * 0.06, viewH * viewH / (viewH + progMaxScroll));
    const ty = progGridTop + (viewH - thumbH) * (progScroll / progMaxScroll);
    progPaint.color = Color.argb(90, 255, 255, 255);
    rect.set(w * 0.985, ty, w * 0.995, ty + thumbH);
    canvas.drawRoundRect(rect, w * 0.005, w * 0.005, progPaint);
  }
}

function onCard(item, owned, isSel) {
  if (isSel) return;
  if (owned) {
    const slot = custSlot;
    equip(() => profile.select(slot, item.id));
    if (lookSpecial !== Skins.NONE && slot !== Slot.CHARACTER && slot !== Slot.TRAIL) { custMsg = tr('custom.special'); custMsgT = 2.5; }
  } else if (item.quest > 0) { custMsg = tr('custom.quest_locked', { n: item.quest }); custMsgT = 2.5; }
  else if (item.isShop) buyItem = item;
  else { custMsg = tr('custom.locked', { n: item.cost }); custMsgT = 2.5; }
}

function drawThumb(canvas, item, cx, cy, size, dim) {
  // Personnage caché de l'Aventure : mystère tant qu'il n'est pas gagné
  if (item.quest > 0 && !profile.available(item)) { progText.textSize = size * 0.5; canvas.drawText('❔', cx, cy + size * 0.18, progText); return; }
  if (item.slot === Slot.COLOR) {
    const rad = size * 0.32;
    progPaint.color = item.color;
    if (item.id === Skins.RAINBOW || item.id === Skins.GALAXY) {
      const cols = item.id === Skins.RAINBOW ? ['#FF4D4D', '#FFC93C', '#3DBE6E', '#3F8EFC', '#8E5CD9'] : ['#1B1446', '#6A3FB5', '#E0609E'];
      progPaint.shader = new LinearGradient(cx - rad, cy - rad, cx + rad, cy + rad, cols.map(Color.parseColor), null);
    }
    canvas.drawCircle(cx, cy, rad, progPaint);
    progPaint.shader = null;
    progPaint.color = Color.argb(90, 255, 255, 255);
    canvas.drawCircle(cx - rad * 0.35, cy - rad * 0.35, rad * 0.3, progPaint);
  } else if (item.slot === Slot.BLOCK) {
    // Petit bloc dans la matière proposée
    canvas.save();
    canvas.translate(cx, cy - size * 0.05);
    const sc = size * 0.42 / k;
    canvas.scale(sc, sc);
    drawTexturedBox(canvas, { half: 0.55, baseColor: Color.parseColor('#9FB4C7') }, item.id, 0.7);
    canvas.restore();
  } else if (item.slot === Slot.TRAIL) {
    progText.textSize = size * 0.42;
    canvas.drawText(TRAIL_ICONS[item.id] || '✨', cx, cy + size * 0.15, progText);
  } else {
    const saved = [lookSpecial, lookShape, lookGlasses, lookHat, lookShoes, lookBack];
    if (item.slot !== Slot.CHARACTER) lookSpecial = Skins.NONE;
    if (item.slot === Slot.CHARACTER) lookSpecial = item.id;
    else if (item.slot === Slot.SHAPE) lookShape = item.id;
    else if (item.slot === Slot.GLASSES) lookGlasses = item.id;
    else if (item.slot === Slot.HAT) lookHat = item.id;
    else if (item.slot === Slot.SHOES) lookShoes = item.id;
    else if (item.slot === Slot.BACK) lookBack = item.id;
    const hgt = lookSpecial !== Skins.NONE ? specialHeight(lookSpecial) : 1;
    const scale = size * 0.55 / (k * Math.max(1, hgt));
    canvas.save();
    canvas.translate(cx, cy + size * 0.28);
    canvas.scale(scale, scale);
    drawCharacter(canvas, 0, 0, 0, 1, 1, true, false, false);
    canvas.restore();
    [lookSpecial, lookShape, lookGlasses, lookHat, lookShoes, lookBack] = saved;
  }
  if (dim) {
    progPaint.color = Color.argb(70, 200, 207, 221);
    rect.set(cx - size * 0.6, cy - size * 0.5, cx + size * 0.6, cy + size * 0.5);
    canvas.drawRect(rect, progPaint);
  }
}

function drawPaints(canvas, y) {
  progText.textAlign = Align.LEFT; progText.textSize = w * 0.032;
  canvas.drawText('🖌️ ' + tr('custom.paint'), w * 0.05, y + w * 0.035, progText);
  progText.textAlign = Align.CENTER;
  const chosen = profile.selectedTint(custSlot), count = Skins.tints.length;
  const step = (w * 0.9) / count, rad = Math.min(step * 0.38, w * 0.035), cy = y + w * 0.1;
  Skins.tints.forEach((t, i) => {
    const cx = w * 0.05 + step * (i + 0.5), owned = profile.ownsTint(t);
    if (t.id === Skins.ORIGINAL) {
      progPaint.color = Color.parseColor('#E3E7EE'); canvas.drawCircle(cx, cy, rad, progPaint);
      progStroke.color = Color.parseColor('#2E3A59'); progStroke.strokeWidth = w * 0.006;
      canvas.drawLine(cx - rad * 0.6, cy + rad * 0.6, cx + rad * 0.6, cy - rad * 0.6, progStroke);
    } else { progPaint.color = t.color; canvas.drawCircle(cx, cy, rad, progPaint); }
    if (t.id === chosen) {
      progStroke.color = Color.parseColor('#FF7A45'); progStroke.strokeWidth = w * 0.008;
      canvas.drawCircle(cx, cy, rad + w * 0.01, progStroke);
    } else if (!owned) {
      progText.textSize = w * 0.022; progText.color = Color.parseColor('#FFE082');
      canvas.drawText(String(t.price), cx, cy + rad + w * 0.03, progText);
      progText.color = Color.WHITE;
    }
    buttons.push({
      rect: new RectF(cx - step / 2, cy - rad - w * 0.02, cx + step / 2, cy + rad + w * 0.04),
      action: () => {
        if (t.id === chosen) return;
        if (owned) { const slot = custSlot; equip(() => profile.selectTint(slot, t.id)); } else buyTint = t;
      },
    });
  });
}

function drawBuyDialog(canvas) {
  buttons.length = 0;
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const item = buyItem, tint = buyTint;
  const label = item ? item.label : tint.label, price = item ? item.price : tint.price;
  const enough = profile.coins >= price;
  const pt = h / 2 - w * 0.45;
  const r = new RectF(w * 0.1, pt, w * 0.9, pt + w * 0.9);
  canvas.drawRoundRect(r, w * 0.05, w * 0.05, panelPaint);
  const th = new RectF(w * 0.35, pt + w * 0.06, w * 0.65, pt + w * 0.36);
  progPaint.color = Color.parseColor('#E3E8F2');
  canvas.drawRoundRect(th, w * 0.03, w * 0.03, progPaint);
  if (item) drawThumb(canvas, item, th.centerX(), th.centerY(), th.height(), false);
  else { progPaint.color = tint.color; canvas.drawCircle(th.centerX(), th.centerY(), th.height() * 0.3, progPaint); }
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.05;
  const title = item ? tr('prog.buy_title', { item: label }) : tr('prog.buy_paint', { paint: label });
  let ty = pt + w * 0.46;
  for (const l of wrapText(title, darkTextPaint, w * 0.7)) { canvas.drawText(l, w / 2, ty, darkTextPaint); ty += w * 0.065; }
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.038;
  canvas.drawText(enough ? `🪙 ${profile.coins} → ${profile.coins - price}` : tr('custom.missing_short', { n: price - profile.coins }), w / 2, pt + w * 0.62, greyTextPaint);
  const bh = w * 0.12, by = r.bottom - w * 0.17;
  drawButton(canvas, new RectF(r.left + w * 0.05, by, w / 2 - w * 0.02, by + bh), tr('common.cancel'), tabOffPaint, w * 0.042, () => { buyItem = null; buyTint = null; });
  drawButton(canvas, new RectF(w / 2 + w * 0.02, by, r.right - w * 0.05, by + bh), '🪙 ' + price, enough ? primaryBtnPaint : lockedPaint, w * 0.045, () => {
    if (!enough) return;
    if (item && profile.buy(item)) {
      const slot = item.slot;
      equip(() => profile.select(slot, item.id));
      custMsg = tr('custom.bought', { item: item.label }); custMsgT = 2.5; sounds.play('UNLOCK');
    } else if (tint && profile.buyTint(tint)) {
      const slot = custSlot;
      equip(() => profile.selectTint(slot, tint.id));
      custMsg = tr('custom.paint_bought', { paint: tint.label }); custMsgT = 2.5; sounds.play('UNLOCK');
    }
    buyItem = null; buyTint = null;
  });
}
