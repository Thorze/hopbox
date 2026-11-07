'use strict';
// Imprévu mortel « satellite » (équivalent de Satellite.kt, mêmes dessins) : l'écran monte dans l'espace,
// une météorite percute un satellite au-dessus de la Terre, il tombe ; retour sur le joueur : le satellite
// en feu lui tombe dessus. Le son « satellite » tourne en fond pendant toute la scène.

let satelliteAt = -1;
const SAT_HIT = 2.4, SAT_BACK = 4.6, SAT_IMPACT = 6.4, SAT_END = 9.0;
const satPaint = new Paint();
const satStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const satPath = new Path();
const satRect = new RectF();

function checkSatellite() {
  if (satelliteAt < 0 || time < satelliteAt) return;
  satelliteAt = -1;
  if (!test.forceDoom && (score >= 15 || score >= best) || (state !== State.READY && state !== State.CHARGING)) return;
  test.forceDoom = false;
  state = State.STRUCK; strikeT = 0; struckDead = true; doomKind = 3; doomHappened(); Stats.add('satellite');
}

function updateSatellite(before) {
  const t = strikeT;
  if (t < SAT_IMPACT) scareT = scareDuration;
  if (before < SAT_HIT && t >= SAT_HIT) { sounds.play('EXPLOSION', 0.7); shake(0.08); }
  if (before < SAT_IMPACT && t >= SAT_IMPACT) { sounds.play('EXPLOSION'); vibrate(300); shake(0.25); }
  if (t >= SAT_END) endGame(tr('reason.satellite'));
}

function drawSatelliteDoom(canvas) { if (strikeT < SAT_BACK) drawOrbitScene(canvas, strikeT); else drawSatelliteFall(canvas, strikeT); }

const PANEL = 0xFF1F3F8F, GOLD = 0xFFC9962E, METAL = 0xFF90A4AE;

/** Le satellite : corps doré, panneaux solaires, antenne parabolique, voyant qui clignote. */
function drawSat(canvas, x, y, s, rot, panels, burn) {
  const p = satPaint, st = satStroke, PC = Color.parseColor;
  canvas.save(); canvas.translate(x, y); canvas.rotate(rot);
  p.shader = null;
  for (const side of (panels >= 2 ? [-1, 1] : [-1])) {
    st.strokeWidth = s * 0.06; st.color = PC('#B0BEC5'); canvas.drawLine(side * s * 0.35, 0, side * s * 0.55, 0, st);
    const l = side < 0 ? -s * 1.55 : s * 0.55;
    satRect.set(l, -s * 0.28, l + s, s * 0.28);
    p.color = PANEL; canvas.drawRect(satRect, p);
    st.strokeWidth = s * 0.025; st.color = PC('#6E8BD6');
    for (let j = 1; j <= 3; j++) canvas.drawLine(l + s * j / 4, -s * 0.28, l + s * j / 4, s * 0.28, st);
    canvas.drawLine(l, 0, l + s, 0, st);
    st.color = PC('#CFD8DC'); canvas.drawRect(satRect, st);
  }
  satRect.set(-s * 0.36, -s * 0.34, s * 0.36, s * 0.34); p.color = GOLD; canvas.drawRoundRect(satRect, s * 0.06, s * 0.06, p);
  satRect.set(-s * 0.36, -s * 0.34, s * 0.05, s * 0.34); p.color = PC('#E8C15A'); canvas.drawRoundRect(satRect, s * 0.06, s * 0.06, p);
  st.strokeWidth = s * 0.02; st.color = PC('#8D6A1E');
  canvas.drawLine(-s * 0.3, -s * 0.1, s * 0.3, -s * 0.1, st); canvas.drawLine(-s * 0.3, s * 0.12, s * 0.3, s * 0.12, st);
  st.strokeWidth = s * 0.04; st.color = PC('#ECEFF1'); canvas.drawLine(0, -s * 0.34, 0, -s * 0.6, st);
  p.color = PC('#F5F7F8'); satRect.set(-s * 0.22, -s * 0.78, s * 0.22, -s * 0.58); canvas.drawArc(satRect, 0, 180, true, p);
  if ((time * 2) % 1 < 0.5) { p.color = PC('#FF3B30'); canvas.drawCircle(s * 0.25, -s * 0.24, s * 0.06, p); }
  if (burn > 0) { p.color = Color.argb(Math.round(70 * burn), 255, 120, 30); canvas.drawCircle(0, 0, s * 0.5, p); }
  canvas.restore();
}

function drawOrbitScene(canvas, t) {
  const p = satPaint, st = satStroke, path = satPath, PC = Color.parseColor;
  const off = t < 0.8 ? -h * (1 - smooth01(t / 0.8)) : t > SAT_BACK - 0.8 ? -h * smooth01((t - (SAT_BACK - 0.8)) / 0.8) : 0;
  const shk = t >= SAT_HIT && t <= SAT_HIT + 0.6 ? w * 0.012 * (1 - (t - SAT_HIT) / 0.6) : 0;
  canvas.save();
  canvas.translate(Math.sin(t * 61) * shk, off + Math.cos(t * 53) * shk);
  canvas.clipRect(0, 0, w, h);
  p.color = Color.WHITE; p.shader = new LinearGradient(0, 0, 0, h, 0xFF02030A, 0xFF0B1230);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  for (let i = 0; i < 80; i++) {
    const tw = 0.5 + 0.5 * Math.sin(time * (1 + hash01(i + 5)) + i);
    p.color = Color.argb(Math.round(220 * tw), 255, 255, 255);
    canvas.drawCircle(hash01(i) * w, hash01(i + 300) * h * 0.75, w * (0.0015 + 0.003 * hash01(i + 600)), p);
  }
  canvas.save(); canvas.translate(w * 0.12, h * 0.1); canvas.scale(w * 0.35 / 100, w * 0.35 / 100);
  p.shader = new RadialGradient(0, 0, 100, [Color.argb(140, 255, 245, 210), Color.argb(35, 255, 220, 150), Color.argb(0, 255, 200, 120)], [0, 0.3, 1]);
  canvas.drawCircle(0, 0, 100, p);
  canvas.restore();
  p.shader = null;
  p.color = Color.argb(255, 255, 252, 235); canvas.drawCircle(w * 0.12, h * 0.1, w * 0.028, p);
  st.strokeWidth = w * 0.004; st.color = Color.argb(120, 255, 250, 225);
  canvas.drawLine(w * 0.03, h * 0.1, w * 0.21, h * 0.1, st); canvas.drawLine(w * 0.12, h * 0.1 - w * 0.09, w * 0.12, h * 0.1 + w * 0.09, st);
  // La Terre
  const ex = w * 0.5, ey = h * 1.28, er = h * 0.62;
  canvas.save(); canvas.translate(ex, ey); canvas.scale(er / 100, er / 100);
  p.shader = new RadialGradient(-40, -60, 150, [0xFF7FD0FF, 0xFF2B6CC0, 0xFF0B2A5A], [0, 0.5, 1]);
  canvas.drawCircle(0, 0, 100, p);
  p.shader = null;
  path.reset(); path.addCircle(0, 0, 100);
  canvas.save(); canvas.clipPath(path);
  const spin = (time * 2.5) % 200;
  for (let i = 0; i < 14; i++) {
    const cx0 = ((hash01(i + 40) * 200 + spin) % 200) - 100, cy0 = -97 + hash01(i + 50) * 55, sc = 0.5 + 0.7 * hash01(i + 55);
    p.color = i % 3 === 0 ? 0xFF8BC34A : i % 3 === 1 ? 0xFF4CAF50 : 0xFFC8B273;
    for (let j = 0; j < 4; j++) {
      const bx = cx0 + (hash01(i * 9 + j) - 0.5) * 14 * sc, by = cy0 + (hash01(i * 9 + j + 4) - 0.5) * 6 * sc;
      satRect.set(bx - 7 * sc, by - 2.5 * sc, bx + 7 * sc, by + 2.5 * sc); canvas.drawOval(satRect, p);
    }
  }
  for (let i = 0; i < 14; i++) {
    const cx0 = ((hash01(i + 70) * 200 + spin * 1.6) % 200) - 100, cy0 = -99 + hash01(i + 80) * 55;
    p.color = Color.argb(140, 255, 255, 255);
    satRect.set(cx0 - 12, cy0 - 1.2, cx0 + 12, cy0 + 1.2); canvas.drawOval(satRect, p);
    satRect.set(cx0 - 5, cy0 - 2.2, cx0 + 7, cy0 + 0.8); canvas.drawOval(satRect, p);
  }
  p.color = Color.WHITE;
  p.shader = new LinearGradient(-100, 0, 100, 0, [Color.argb(0, 0, 0, 20), Color.argb(0, 0, 0, 20), Color.argb(150, 0, 0, 25)], [0, 0.5, 1]);
  canvas.drawRect(-100, -100, 100, 100, p);
  p.shader = null;
  canvas.restore();
  for (const [wd, al] of [[10, 40], [5, 70], [2, 140]]) { st.strokeWidth = wd; st.color = Color.argb(al, 120, 200, 255); canvas.drawCircle(0, 0, 101, st); }
  canvas.restore();
  // Satellite
  const s = w * 0.07, sx0 = w * (0.18 + 0.09 * Math.min(t, SAT_HIT)), sy0 = h * 0.38 + Math.sin(t * 1.5) * h * 0.005;
  if (t < SAT_HIT) drawSat(canvas, sx0, sy0, s, -8 + Math.sin(t) * 4, 2, 0);
  else {
    const k0 = t - SAT_HIT;
    const fx0 = sx0 + k0 * w * 0.14, fy0 = sy0 + k0 * k0 * h * 0.045 + k0 * h * 0.02;
    const shrink = 1 - 0.45 * smooth01(k0 / 2), burn = smooth01((k0 - 0.8) / 1);
    if (burn > 0) {
      for (let j = 1; j <= 8; j++) {
        const q = k0 - j * 0.05;
        p.color = Color.argb(Math.round(180 * burn * (1 - j / 9)), 255, 200 - 15 * j, 60);
        canvas.drawCircle(sx0 + q * w * 0.14, sy0 + q * q * h * 0.045 + q * h * 0.02, s * 0.4 * shrink * (1 - j * 0.07), p);
      }
    }
    drawSat(canvas, fx0, fy0, s * shrink, -8 + k0 * 320, 1, burn);
    canvas.save(); canvas.translate(sx0 + k0 * w * 0.05, sy0 - k0 * h * 0.06 + k0 * k0 * h * 0.02); canvas.rotate(k0 * -200);
    p.color = PANEL; canvas.drawRect(-s * 0.5, -s * 0.14, s * 0.5, s * 0.14, p);
    st.strokeWidth = s * 0.02; st.color = PC('#CFD8DC'); canvas.drawRect(-s * 0.5, -s * 0.14, s * 0.5, s * 0.14, st);
    canvas.restore();
    for (let j = 0; j < 16; j++) {
      const ang = hash01(j + 900) * 6.283, sp = w * (0.08 + 0.2 * hash01(j + 910));
      canvas.save(); canvas.translate(sx0 + Math.cos(ang) * sp * k0, sy0 + Math.sin(ang) * sp * k0); canvas.rotate(k0 * 400 * (hash01(j + 920) - 0.5));
      p.color = j % 3 === 0 ? PANEL : j % 3 === 1 ? GOLD : METAL;
      const ds = s * (0.06 + 0.08 * hash01(j + 930));
      canvas.drawRect(-ds, -ds * 0.5, ds, ds * 0.5, p);
      canvas.restore();
    }
    if (k0 < 0.9) {
      const q = k0 / 0.9;
      for (const [rr, c] of [[1, 0xFFFF6A1A], [0.7, 0xFFFFB347], [0.4, 0xFFFFF3B0]]) {
        p.color = Color.argb(Math.round(230 * (1 - q)), Color.red(c), Color.green(c), Color.blue(c));
        canvas.drawCircle(sx0, sy0, s * (0.6 + 1.8 * q) * rr, p);
      }
    }
  }
  // Météorite
  if (t >= 1.0 && t <= SAT_HIT) {
    const q = (t - 1.0) / (SAT_HIT - 1.0), mx0 = w * 1.1, my0 = -h * 0.02, hx = w * (0.18 + 0.09 * SAT_HIT);
    const at = (qq) => [mx0 + (hx - mx0) * qq, my0 + (sy0 - my0) * qq];
    bombTrail(canvas, q, w * 0.03, 10, at);
    const [mx, my] = at(q), mr = w * 0.032;
    path.reset();
    for (let j = 0; j < 8; j++) {
      const ang = j * 0.785, rr = mr * (0.75 + 0.35 * hash01(j + 950));
      if (j === 0) path.moveTo(mx + Math.cos(ang) * rr, my + Math.sin(ang) * rr); else path.lineTo(mx + Math.cos(ang) * rr, my + Math.sin(ang) * rr);
    }
    path.close();
    p.color = PC('#5D4037'); canvas.drawPath(path, p);
    p.color = Color.argb(200, 255, 140, 40); canvas.drawCircle(mx - mr * 0.25, my + mr * 0.2, mr * 0.45, p);
  }
  if (t >= SAT_HIT && t <= SAT_HIT + 0.3) { p.color = Color.argb(Math.round(200 * (1 - (t - SAT_HIT) / 0.3)), 255, 245, 220); canvas.drawRect(0, 0, w, h, p); }
  canvas.restore();
}

function drawSatelliteFall(canvas, t) {
  const p = satPaint, st = satStroke, k0 = t - SAT_BACK;
  p.shader = null;
  p.color = Color.argb(Math.round(Math.min(1, k0 * 1.5) * 70), 40, 20, 50); canvas.drawRect(0, 0, w, h, p);
  const tx = sx(px, pz), ty = sy(px, 0.3, pz), gy0 = sy(px, 0, pz);
  const warn = (t - (SAT_IMPACT - 1.4)) / 1.4;
  if (warn >= 0 && warn <= 1) {
    p.color = Color.argb(Math.round(130 * warn), 10, 0, 20);
    satRect.set(tx - k * 0.75 * warn, gy0 - k * 0.24 * warn, tx + k * 0.75 * warn, gy0 + k * 0.24 * warn); canvas.drawOval(satRect, p);
    st.strokeWidth = w * 0.006; st.color = Color.argb(Math.round(200 * warn * (0.5 + 0.5 * Math.sin(time * 18))), 255, 60, 30); canvas.drawOval(satRect, st);
  }
  const launch = SAT_IMPACT - 1.6;
  if (t >= launch && t <= SAT_IMPACT) {
    const q = (t - launch) / 1.6, x0 = tx + w * 0.5, y0 = -h * 0.15;
    const at = (qq) => [x0 + (tx - x0) * qq, y0 + (ty - y0) * Math.pow(Math.max(0, qq), 1.7)];
    const s = w * 0.08 * (0.7 + 0.5 * q);
    bombTrail(canvas, q, s * 0.32, 12, at);
    const [x, y] = at(q);
    volFlame(canvas, x + s * 0.15, y - s * 0.1, s * 0.45, s * (0.9 + 0.3 * Math.sin(time * 20)), Color.argb(170, 255, 120, 30));
    drawSat(canvas, x, y, s, t * 260, 1, 0.6);
  }
  const s0 = t - SAT_IMPACT;
  if (s0 >= 0) {
    if (s0 < 0.7) {
      const q = s0 / 0.7;
      st.strokeWidth = k * 0.1 * (1 - q); st.color = Color.argb(Math.round(230 * (1 - q)), 255, 170, 70);
      satRect.set(tx - k * (0.3 + 3 * q), gy0 - k * (0.1 + q), tx + k * (0.3 + 3 * q), gy0 + k * (0.1 + q)); canvas.drawOval(satRect, st);
      for (const [rr, c] of [[1, 0xFFFF6A1A], [0.65, 0xFFFFB347], [0.35, 0xFFFFF3B0]]) {
        p.color = Color.argb(Math.round(235 * (1 - q)), Color.red(c), Color.green(c), Color.blue(c));
        canvas.drawCircle(tx, gy0 - k * 0.3, k * (0.5 + 1.6 * q) * rr, p);
      }
    }
    if (s0 < 1.4) {
      const g = w * 1.6;
      for (let j = 0; j < 18; j++) {
        const ang = 3.4 + 2.6 * hash01(j + 960), sp = w * (0.25 + 0.25 * hash01(j + 970));
        const dx = tx + Math.cos(ang) * sp * s0, dy = gy0 - k * 0.2 + Math.sin(ang) * sp * 1.2 * s0 + 0.5 * g * s0 * s0;
        if (dy > gy0 + w * 0.06) continue;
        canvas.save(); canvas.translate(dx, dy); canvas.rotate(s0 * 500 * (hash01(j + 980) - 0.5));
        p.color = j % 3 === 0 ? PANEL : j % 3 === 1 ? GOLD : METAL;
        const ds = k * (0.05 + 0.06 * hash01(j + 990));
        canvas.drawRect(-ds, -ds * 0.5, ds, ds * 0.5, p);
        canvas.restore();
      }
    }
    if (s0 < 1.8) {
      const fade = s0 < 1.1 ? 1 : 1 - (s0 - 1.1) / 0.7;
      for (let j = 0; j < 4; j++) {
        const fxp = tx + (j - 1.5) * k * 0.22, hh = k * (0.7 + 0.3 * Math.sin(time * 17 + j * 1.9)) * fade;
        volFlame(canvas, fxp, gy0 + k * 0.05, k * 0.25, hh, Color.argb(Math.round(200 * fade), 235, 80, 20));
        volFlame(canvas, fxp, gy0 + k * 0.05, k * 0.12, hh * 0.6, Color.argb(Math.round(230 * fade), 255, 220, 120));
      }
    }
    for (let i = 0; i < 16; i++) {
      const q = (s0 * 0.35 + i / 16) % 1;
      if (s0 < i * 0.05) continue;
      p.color = Color.argb(Math.round(70 * (1 - q) * Math.min(1, s0 * 2)), 60, 58, 62);
      canvas.drawCircle(tx + Math.sin(i * 2.3 + s0) * k * 0.2 * (0.5 + q), gy0 - k * 0.3 - q * k * 2.4, k * (0.2 + 0.4 * q), p);
    }
    if (s0 < 0.35) { p.color = Color.argb(Math.round(200 * (1 - s0 / 0.35)), 255, 240, 210); canvas.drawRect(0, 0, w, h, p); }
  }
}

/** Épave du satellite plantée à côté du tas de cendres, avec une trace noire (dessinée avant le tas). */
function drawSatelliteWreck(canvas, ox, oy) {
  const s0 = strikeT - SAT_IMPACT;
  if (s0 < 0) return;
  const p = satPaint, st = satStroke, PC = Color.parseColor, g = Math.min(1, s0 / 0.3);
  p.shader = null;
  p.color = Color.argb(Math.round(150 * g), 20, 15, 15); satRect.set(ox - k * 0.9, oy - k * 0.3, ox + k * 0.9, oy + k * 0.3); canvas.drawOval(satRect, p);
  canvas.save(); canvas.translate(ox + k * 0.55, oy - k * 0.05); canvas.rotate(-28);
  p.color = PANEL; canvas.drawRect(-k * 0.1, -k * 0.62, k * 0.1, 0, p);
  st.strokeWidth = k * 0.015; st.color = PC('#6E8BD6');
  for (let j = 1; j <= 3; j++) canvas.drawLine(-k * 0.1, -k * 0.155 * j, k * 0.1, -k * 0.155 * j, st);
  st.color = PC('#CFD8DC'); canvas.drawRect(-k * 0.1, -k * 0.62, k * 0.1, 0, st);
  canvas.restore();
  p.color = GOLD; satRect.set(ox - k * 0.75, oy - k * 0.12, ox - k * 0.42, oy + k * 0.06); canvas.drawRoundRect(satRect, k * 0.03, k * 0.03, p);
  p.color = PC('#ECEFF1'); satRect.set(ox - k * 0.7, oy - k * 0.32, ox - k * 0.46, oy - k * 0.14); canvas.drawArc(satRect, 0, 180, true, p);
  for (let j = 0; j < 2; j++) volFlame(canvas, ox + (j === 0 ? k * 0.5 : -k * 0.6), oy, k * 0.1, k * (0.25 + 0.08 * Math.sin(time * 15 + j * 2)), Color.argb(200, 255, 140, 40));
  if ((time * 3) % 1 < 0.3) { p.color = PC('#FFF59D'); canvas.drawCircle(ox + k * 0.62, oy - k * 0.45, k * 0.03, p); }
}
