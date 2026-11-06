'use strict';
// Jauge d'énergie de l'Aventure (équivalent de EnergyGauge.kt) : gros éclair doré en relief, panneau
// sombre avec « ÉNERGIE (3 / 5) », batterie à 5 éclairs et compte à rebours ; « -1 » après un échec.

const gaugePaint = new Paint();
const gaugeStroke = new Paint({ style: Style.STROKE });
const gaugeText = new Paint({ bold: true });
const gaugePath = new Path();

function boltPath(x, y, bw, bh) {
  const pts = [0.58, 0, 0.08, 0.56, 0.44, 0.56, 0.3, 1, 0.92, 0.4, 0.56, 0.4, 0.78, 0];
  gaugePath.reset();
  for (let i = 0; i < pts.length; i += 2) { const px = x + pts[i] * bw, py = y + pts[i + 1] * bh; if (i === 0) gaugePath.moveTo(px, py); else gaugePath.lineTo(px, py); }
  gaugePath.close();
  return gaugePath;
}

/** Gros éclair doré en relief avec un halo. (x, y) = coin haut-gauche. */
function drawBigBolt(canvas, x, y, bw, bh) {
  const c = canvas.ctx, gx = x + bw * 0.5, gy = y + bh * 0.5, r = bh * 0.75;
  const g = c.createRadialGradient(gx, gy, 0, gx, gy, r);
  g.addColorStop(0, 'rgba(255,200,60,0.5)'); g.addColorStop(1, 'rgba(255,200,60,0)');
  c.fillStyle = g; c.beginPath(); c.arc(gx, gy, r, 0, Math.PI * 2); c.fill();
  gaugePaint.shader = null; gaugePaint.color = Color.parseColor('#D9480F');
  canvas.drawPath(boltPath(x + bw * 0.07, y + bh * 0.035, bw, bh), gaugePaint);
  gaugePaint.shader = new LinearGradient(0, y, 0, y + bh, Color.parseColor('#FFE45C'), Color.parseColor('#FF8A1F'));
  canvas.drawPath(boltPath(x, y, bw, bh), gaugePaint);
  gaugePaint.shader = null;
}

/** Jauge complète. (left, top) = coin haut-gauche, width = largeur totale. Renvoie sa hauteur. */
function drawEnergyGauge(canvas, left, top, width, e, secondsToNext, minus) {
  const hgt = width * 0.34, PC = Color.parseColor;
  let x = left;
  if (minus) {
    gaugeText.color = Color.parseColor('#E53950'); gaugeText.textAlign = Align.LEFT; gaugeText.textSize = hgt * 0.55;
    canvas.drawText('-1', x, top + hgt * 0.7, gaugeText);
    x += gaugeText.measureText('-1') + hgt * 0.06;
  }
  const boltW = hgt * 0.62, pl = x + boltW * 0.55, pr = left + width;
  rect.set(pl, top, pr, top + hgt);
  gaugePaint.color = Color.argb(240, 38, 43, 58); canvas.drawRoundRect(rect, hgt * 0.18, hgt * 0.18, gaugePaint);
  gaugeStroke.color = Color.argb(190, 205, 212, 228); gaugeStroke.strokeWidth = hgt * 0.03; canvas.drawRoundRect(rect, hgt * 0.18, hgt * 0.18, gaugeStroke);
  const cl = pl + boltW * 0.55, cr = pr - hgt * 0.12, cx = (cl + cr) / 2;
  gaugeText.textAlign = Align.LEFT; gaugeText.textSize = hgt * 0.17;
  const a = tr('quest.energy_title') + ' (', b = String(e), c = ` / ${Energy.MAX})`;
  let tx = cx - gaugeText.measureText(a + b + c) / 2; const ty = top + hgt * 0.27;
  gaugeText.color = PC('#E8ECF4'); canvas.drawText(a, tx, ty, gaugeText); tx += gaugeText.measureText(a);
  gaugeText.color = PC(e === 0 ? '#FF5A5A' : '#FFD54F'); canvas.drawText(b, tx, ty, gaugeText); tx += gaugeText.measureText(b);
  gaugeText.color = PC('#AEB6C6'); canvas.drawText(c, tx, ty, gaugeText);
  // Batterie à 5 éclairs
  const bx0 = cl, bx1 = cr - hgt * 0.06, by0 = top + hgt * 0.36, by1 = top + hgt * 0.72;
  rect.set(bx0, by0, bx1, by1);
  gaugePaint.color = Color.argb(255, 26, 30, 42); canvas.drawRoundRect(rect, hgt * 0.07, hgt * 0.07, gaugePaint);
  gaugeStroke.color = PC('#C9D1E0'); gaugeStroke.strokeWidth = hgt * 0.025; canvas.drawRoundRect(rect, hgt * 0.07, hgt * 0.07, gaugeStroke);
  rect.set(bx1, by0 + (by1 - by0) * 0.3, bx1 + hgt * 0.05, by1 - (by1 - by0) * 0.3);
  gaugePaint.color = PC('#C9D1E0'); canvas.drawRoundRect(rect, hgt * 0.02, hgt * 0.02, gaugePaint);
  const pad = hgt * 0.05, sw = (bx1 - bx0 - pad * 2) / Energy.MAX, ih = (by1 - by0) * 0.72, iw = ih * 0.6;
  for (let i = 0; i < Energy.MAX; i++) {
    const sx0 = bx0 + pad + sw * i + (sw - iw) / 2, sy0 = (by0 + by1) / 2 - ih / 2;
    if (i < e) gaugePaint.shader = new LinearGradient(0, sy0, 0, sy0 + ih, PC('#FFE45C'), PC('#FF8A1F')); else gaugePaint.color = PC('#4E5568');
    canvas.drawPath(boltPath(sx0, sy0, iw, ih), gaugePaint);
    gaugePaint.shader = null;
  }
  if (e === 0) {
    gaugeText.textAlign = Align.CENTER; gaugeText.textSize = hgt * 0.15; gaugeText.color = PC('#FF5A5A');
    canvas.drawText(tr('quest.energy_left', { n: 0 }), (bx0 + bx1) / 2, (by0 + by1) / 2 + hgt * 0.055, gaugeText);
  }
  gaugeText.textSize = hgt * 0.13;
  const y2 = top + hgt * 0.9;
  if (e >= Energy.MAX) {
    gaugeText.textAlign = Align.CENTER; gaugeText.color = PC('#AEB6C6');
    canvas.drawText('✔ ' + tr('quest.energy_full'), cx, y2, gaugeText);
  } else {
    const p1 = '⏳ ' + tr('quest.next_in') + ' ', p2 = Energy.format(secondsToNext);
    gaugeText.textAlign = Align.LEFT;
    const w1 = gaugeText.measureText(p1), w2 = gaugeText.measureText(p2);
    let x2 = cx - (w1 + w2) / 2;
    gaugeText.color = PC('#AEB6C6'); canvas.drawText(p1, x2, y2, gaugeText); x2 += w1;
    gaugeText.color = Color.WHITE; canvas.drawText(p2, x2, y2, gaugeText);
  }
  drawBigBolt(canvas, x, top - hgt * 0.06, boltW, hgt * 1.1);
  return hgt;
}

const darkBtnPaint = new Paint({ color: Color.parseColor('#4A5163') });

/**
 * Fenêtre d'achat d'énergie, style sombre « boutique de jeu » : gros éclair, batterie qui se remplit
 * jusqu'à e + qty, choix de 1 à 5 énergies (prix dégressif), solde avant → après, Annuler / Acheter.
 */
function drawEnergyDialog(canvas, e, qty, t, ready, onQty, onCancel, onBuy) {
  buttons = [];
  const PC = Color.parseColor;
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const ph = w * 1.1, top = Math.max(insetTop + w * 0.17, (insetTop + ub() - ph) / 2 + w * 0.06), l = w * 0.06, r = w * 0.94;
  rect.set(l, top, r, top + ph);
  gaugePaint.shader = new LinearGradient(0, top, 0, top + ph, PC('#3A4156'), PC('#232836'));
  canvas.drawRoundRect(rect, w * 0.06, w * 0.06, gaugePaint);
  gaugePaint.shader = null;
  gaugeStroke.color = Color.argb(200, 210, 218, 232); gaugeStroke.strokeWidth = w * 0.006;
  canvas.drawRoundRect(rect, w * 0.06, w * 0.06, gaugeStroke);
  drawBigBolt(canvas, w / 2 - w * 0.1, top - w * 0.15, w * 0.2, w * 0.32);
  gaugeText.textAlign = Align.CENTER; gaugeText.textSize = w * 0.062; gaugeText.color = Color.WHITE;
  canvas.drawText(tr('quest.refill_title'), w / 2, top + w * 0.27, gaugeText);
  const il = w * 0.11, ir = w * 0.89, it = top + w * 0.33, ib = it + w * 0.56;
  rect.set(il, it, ir, ib);
  gaugePaint.color = Color.argb(255, 30, 34, 46); canvas.drawRoundRect(rect, w * 0.04, w * 0.04, gaugePaint);
  gaugeStroke.color = Color.argb(110, 200, 210, 225); gaugeStroke.strokeWidth = w * 0.004; canvas.drawRoundRect(rect, w * 0.04, w * 0.04, gaugeStroke);
  // Batterie : les éclairs achetés se remplissent un par un
  const bx0 = w * 0.23, bx1 = w * 0.74, by0 = it + w * 0.05, by1 = it + w * 0.17;
  rect.set(bx0, by0, bx1, by1);
  gaugePaint.color = Color.argb(255, 20, 23, 32); canvas.drawRoundRect(rect, w * 0.025, w * 0.025, gaugePaint);
  gaugeStroke.color = PC('#C9D1E0'); gaugeStroke.strokeWidth = w * 0.007; canvas.drawRoundRect(rect, w * 0.025, w * 0.025, gaugeStroke);
  rect.set(bx1, by0 + (by1 - by0) * 0.3, bx1 + w * 0.018, by1 - (by1 - by0) * 0.3);
  gaugePaint.color = PC('#C9D1E0'); canvas.drawRoundRect(rect, w * 0.006, w * 0.006, gaugePaint);
  const missing = Energy.MAX - e, fill = clamp((t - 0.15) / 0.6, 0, 1), shown = e + Math.ceil(qty * fill);
  const pad = w * 0.015, sw = (bx1 - bx0 - pad * 2) / Energy.MAX, ih = (by1 - by0) * 0.78, iw = ih * 0.6;
  for (let i = 0; i < Energy.MAX; i++) {
    const sc = i >= e && i === shown - 1 && fill < 1 ? 1.25 : 1, cw = iw * sc, ch = ih * sc;
    const sx0 = bx0 + pad + sw * i + (sw - cw) / 2, sy0 = (by0 + by1) / 2 - ch / 2;
    if (i < shown) gaugePaint.shader = new LinearGradient(0, sy0, 0, sy0 + ch, PC('#FFE45C'), PC('#FF8A1F')); else gaugePaint.color = PC('#4E5568');
    canvas.drawPath(boltPath(sx0, sy0, cw, ch), gaugePaint);
    gaugePaint.shader = null;
  }
  // Choix de la quantité : +1 à +5, prix dégressif (au-delà du plein : grisé)
  const cy0 = it + w * 0.22, cy1 = it + w * 0.4, gap = w * 0.015, cl = il + w * 0.03, cwid = (ir - il - w * 0.06 - gap * 4) / 5;
  for (let k = 1; k <= Energy.MAX; k++) {
    const x0 = cl + (k - 1) * (cwid + gap), rr = new RectF(x0, cy0, x0 + cwid, cy1);
    const enabled = k <= missing, sel = k === qty;
    gaugePaint.color = sel ? PC('#FF7A45') : enabled ? PC('#3A4155') : Color.argb(255, 36, 40, 52);
    canvas.drawRoundRect(rr, w * 0.025, w * 0.025, gaugePaint);
    if (sel) { gaugeStroke.color = PC('#FFD54F'); gaugeStroke.strokeWidth = w * 0.006; canvas.drawRoundRect(rr, w * 0.025, w * 0.025, gaugeStroke); }
    const alpha = enabled ? 255 : 90;
    gaugeText.textAlign = Align.CENTER; gaugeText.textSize = w * 0.036; gaugeText.color = Color.argb(alpha, 255, 255, 255);
    canvas.drawText(`+${k} ⚡`, rr.centerX(), cy0 + w * 0.055, gaugeText);
    gaugeText.textSize = w * 0.032; gaugeText.color = sel ? Color.WHITE : Color.argb(alpha, 255, 213, 79);
    canvas.drawText(`${Energy.price(k)} 🪙`, rr.centerX(), cy0 + w * 0.11, gaugeText);
    const d = Energy.discount(k);
    if (d > 0) { gaugeText.textSize = w * 0.027; gaugeText.color = sel ? Color.WHITE : Color.argb(alpha, 76, 217, 100); canvas.drawText(`-${d} %`, rr.centerX(), cy0 + w * 0.155, gaugeText); }
    if (enabled) buttons.push({ rect: rr, action: () => onQty(k) });
  }
  // Solde avant → après (ou ce qui manque, en rouge)
  const price = Energy.price(qty), enough = profile.coins >= price;
  const sol = enough ? `${tr('quest.balance')} 🪙 ${profile.coins} → ${profile.coins - price}` : tr('custom.missing_short', { n: price - profile.coins });
  gaugeText.textSize = w * 0.04;
  const pw = gaugeText.measureText(sol) + w * 0.08, py = it + w * 0.48;
  rect.set(w / 2 - pw / 2, py - w * 0.045, w / 2 + pw / 2, py + w * 0.035);
  gaugePaint.color = Color.argb(255, 52, 58, 76); canvas.drawRoundRect(rect, rect.height() / 2, rect.height() / 2, gaugePaint);
  gaugeStroke.color = Color.argb(120, 200, 210, 225); gaugeStroke.strokeWidth = w * 0.004; canvas.drawRoundRect(rect, rect.height() / 2, rect.height() / 2, gaugeStroke);
  gaugeText.textAlign = Align.CENTER; gaugeText.color = PC(enough ? '#E8ECF4' : '#FF5A5A');
  canvas.drawText(sol, w / 2, py + w * 0.008, gaugeText);
  const bh = w * 0.12, by = top + ph - w * 0.17;
  drawButton(canvas, new RectF(l + w * 0.06, by, w / 2 - w * 0.02, by + bh), tr('common.cancel'), darkBtnPaint, w * 0.045, onCancel);
  drawButton(canvas, new RectF(w / 2 + w * 0.02, by, r - w * 0.06, by + bh), tr('quest.buy') + ` 🪙 ${price}`, ready ? primaryBtnPaint : lockedPaint, w * 0.04, onBuy);
}
