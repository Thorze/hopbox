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
