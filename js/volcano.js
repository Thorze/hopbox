'use strict';
// Imprévu mortel « volcan » (équivalent de Volcano.kt, mêmes dessins) : grondement (volcan), l'écran part
// vers un volcan en éruption, revient sur le joueur (volcan2) : pluie de bombes de lave, ombre qui grossit,
// puis une énorme bombe le touche (onde de choc, gerbe, flammes) et il finit en cendres dans la lave.
// volcan_loop tourne en fond pendant toute la scène. Même calendrier que la foudre et l'avion.

let volcanoAt = -1;
const VOLCANO_BACK = 4.6, VOLCANO_IMPACT = 6.4, VOLCANO_END = 9.0;
const volPaint = new Paint();
const volStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const volPath = new Path();

/** Petit hasard fixe (0..1) à partir d'un entier : les mêmes gerbes à chaque image. */
function hash01(i) { const v = Math.sin(i * 12.9898 + 78.233) * 43758.547; return v - Math.floor(v); }
function smooth01(x) { const q = clamp(x, 0, 1); return q * q * (3 - 2 * q); }

function checkVolcano() {
  if (volcanoAt < 0 || time < volcanoAt) return;
  volcanoAt = -1;
  if (!test.forceDoom && (score >= 15 || score >= best) || (state !== State.READY && state !== State.CHARGING)) return;
  test.forceDoom = false;
  state = State.STRUCK; strikeT = 0; struckDead = true; doomKind = 2; doomHappened(); Stats.add('volcano');
  sounds.play('VOLCANO');
  vibrate(300);
}

function updateVolcano(before) {
  const t = strikeT;
  if (t < VOLCANO_IMPACT) scareT = scareDuration;            // le personnage a peur
  if (t >= 1.2 && t <= VOLCANO_BACK && Math.floor(t * 10) !== Math.floor(before * 10)) shake(0.05);
  if (before < VOLCANO_BACK && t >= VOLCANO_BACK) sounds.play('VOLCANO2');
  for (let i = 0; i < 5; i++) { const land = VOLCANO_BACK + 0.5 + i * 0.25; if (before < land && t >= land) shake(0.06); }
  if (before < VOLCANO_IMPACT && t >= VOLCANO_IMPACT) { vibrate(300); shake(0.25); }
  if (t >= VOLCANO_END) endGame(tr('reason.volcano'));
}

function drawVolcano(canvas) {
  if (strikeT < VOLCANO_BACK) drawVolcanoScene(canvas, strikeT); else drawLavaRain(canvas, strikeT);
}

/** Flamme en forme de goutte (pointe en haut), posée en (cx, by). */
function volFlame(canvas, cx, by, wd, ht, color) {
  const path = volPath;
  path.reset();
  path.moveTo(cx, by - ht);
  path.cubicTo(cx + wd * 0.25, by - ht * 0.6, cx + wd, by - ht * 0.35, cx, by);
  path.cubicTo(cx - wd, by - ht * 0.35, cx - wd * 0.25, by - ht * 0.6, cx, by - ht);
  path.close();
  volPaint.shader = null; volPaint.color = color;
  canvas.drawPath(path, volPaint);
}

/** Bombe de lave : halo, croûte sombre, fissures incandescentes qui tournent. */
function lavaBomb(canvas, x, y, r, spin) {
  const p = volPaint, st = volStroke, PC = Color.parseColor;
  canvas.save(); canvas.translate(x, y);
  p.color = Color.WHITE;
  p.shader = new RadialGradient(0, 0, 100, [Color.argb(150, 255, 140, 40), Color.argb(0, 255, 90, 20)]);
  canvas.scale(r * 2.3 / 100, r * 2.3 / 100);
  canvas.drawCircle(0, 0, 100, p);
  canvas.restore();
  p.shader = null;
  p.color = PC('#3A1D14'); canvas.drawCircle(x, y, r, p);
  p.color = PC('#C2410C'); canvas.drawCircle(x - r * 0.12, y + r * 0.12, r * 0.82, p);
  p.color = PC('#3A1D14'); canvas.drawCircle(x + r * 0.05, y - r * 0.05, r * 0.78, p);
  for (let j = 0; j < 5; j++) {
    const a = spin + j * 1.26;
    const ex = x + Math.cos(a) * r * 0.85, ey = y + Math.sin(a) * r * 0.85;
    const mx = x + Math.cos(a + 0.4) * r * 0.45, my = y + Math.sin(a + 0.4) * r * 0.45;
    st.strokeWidth = r * 0.22; st.color = Color.argb(120, 255, 120, 30);
    canvas.drawLine(x, y, mx, my, st); canvas.drawLine(mx, my, ex, ey, st);
    st.strokeWidth = r * 0.08; st.color = PC('#FFD54F');
    canvas.drawLine(x, y, mx, my, st); canvas.drawLine(mx, my, ex, ey, st);
  }
}

/** Traînée de feu et de fumée derrière une bombe qui suit at(q) → [x, y]. */
function bombTrail(canvas, q, r, n, at) {
  const p = volPaint;
  p.shader = null;
  for (let k2 = n * 2; k2 >= 1; k2--) {
    const qq = q - k2 * 0.022;
    if (qq < 0) continue;
    const [x, y] = at(qq);
    p.color = Color.argb(Math.round(60 * (1 - k2 / (n * 2 + 1))), 70, 60, 62);
    canvas.drawCircle(x, y, r * (0.7 + k2 * 0.07), p);
  }
  for (let k2 = 8; k2 >= 1; k2--) {
    const qq = q - k2 * 0.012;
    if (qq < 0) continue;
    const [x, y] = at(qq), f = k2 / 9;
    p.color = Color.argb(Math.round(220 * (1 - f)), 255, Math.round(220 - 160 * f), Math.round(80 - 60 * f));
    canvas.drawCircle(x, y, r * (1 - f * 0.6), p);
  }
}

/** Gerbe de gouttes de lave (arcs avec gravité), s secondes après l'impact en (x, y). */
function lavaBurst(canvas, x, y, s, n, power, seed, dur) {
  if (s < 0 || s > dur) return;
  const p = volPaint, g = w * 1.8;
  p.shader = null;
  for (let j = 0; j < n; j++) {
    const ang = Math.PI * (1.05 + 0.9 * (j + hash01(seed + j)) / n);
    const sp = w * power * (0.55 + 0.45 * hash01(seed + j + 50));
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp * 1.3;
    const px0 = x + vx * s, py0 = y + vy * s + 0.5 * g * s * s;
    if (py0 > y + w * 0.05) continue;
    const f = s / dur;
    p.color = Color.argb(Math.round(255 * (1 - f)), 255, Math.round(200 - 120 * f), 40);
    canvas.drawCircle(px0, py0, w * (0.006 + 0.006 * hash01(seed + j + 90)) * (1 - 0.5 * f), p);
  }
}

/** Plan sur le volcan : il arrive par la droite (l'écran « part »), puis repart vers la droite. */
function drawVolcanoScene(canvas, t) {
  const PC = Color.parseColor, p = volPaint, st = volStroke, path = volPath;
  const off = t < 0.8 ? w * (1 - smooth01(t / 0.8)) : t > VOLCANO_BACK - 0.8 ? w * smooth01((t - (VOLCANO_BACK - 0.8)) / 0.8) : 0;
  const erupt = smooth01((t - 1.2) / 0.6), sh = w * 0.007 * erupt;
  canvas.save();
  canvas.translate(off + Math.sin(t * 53) * sh, Math.cos(t * 47) * sh);
  canvas.clipRect(0, 0, w, h);
  const cx = w * 0.5, topY = h * 0.43, base = h * 0.84;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, base, [PC('#1A1026'), PC('#3B1A33'), PC('#9C2F2A'), PC('#F07A35')], [0, 0.35, 0.72, 1]);
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  // Lueur générale du cratère
  const pulse = 0.85 + 0.15 * Math.sin(t * 9);
  canvas.save(); canvas.translate(cx, topY); canvas.scale(w * 0.75 * pulse / 100, w * 0.75 * pulse / 100);
  p.color = Color.WHITE;
  p.shader = new RadialGradient(0, 0, 100, [Color.argb(150, 255, 150, 50), Color.argb(50, 255, 90, 30), Color.argb(0, 255, 60, 20)], [0, 0.45, 1]);
  p.alpha = Math.round(255 * (0.35 + 0.65 * erupt));
  canvas.drawCircle(0, 0, 100, p);
  canvas.restore();
  p.shader = null;
  // Nuage de cendres qui monte et s'étale, éclairé par en dessous
  const grow = smooth01((t - 0.9) / 3.2);
  if (grow > 0) {
    // Colonne qui s'élargit en champignon : plus c'est haut, plus c'est large
    for (let pass = 0; pass <= 1; pass++) for (let j = 0; j < 34; j++) {
      const f = hash01(j + 120), a = hash01(j + 100);
      const x = cx + (a - 0.5) * w * (0.12 + 0.95 * f * f) * (0.4 + 0.6 * grow) + Math.sin(t * 0.6 + j) * w * 0.01;
      const y = topY - h * (0.04 + 0.36 * f) * (0.3 + 0.7 * grow) - t * h * 0.006;
      const r = w * (0.07 + 0.06 * hash01(j + 140) + 0.06 * f) * (0.45 + 0.55 * grow);
      if (pass === 0) {
        p.color = Color.argb(Math.round(235 * Math.min(1, grow * 2)), 44 + Math.floor(12 * f), 35 + Math.floor(8 * f), 38 + Math.floor(8 * f));
        canvas.drawCircle(x, y, r, p);
      } else if (f < 0.55) {
        p.color = Color.argb(Math.round(55 * grow * (1 - f)), 230, 90, 40);   // dessous éclairé par la lave
        canvas.drawCircle(x, y + r * 0.45, r * 0.55, p);
      }
    }
  }
  // Fumerolles avant l'éruption
  for (let i = 0; i < 8; i++) {
    const q = (t * 0.3 + i / 8) % 1;
    p.color = Color.argb(Math.round(120 * (1 - q) * (1 - erupt * 0.6)), 90, 80, 85);
    canvas.drawCircle(cx + Math.sin(i * 1.7 + t) * w * 0.04 + q * w * 0.05, topY - q * h * 0.25, w * (0.03 + 0.08 * q), p);
  }
  // Deux chaînes de montagnes au loin
  [[0, '#3A1F33'], [1, '#2A1726']].forEach(([layer, col]) => {
    path.reset(); path.moveTo(0, base);
    const baseY = h * (0.62 + 0.07 * layer);
    for (let i = 0; i <= 16; i++) {
      path.lineTo(w * i / 16, baseY + h * (0.035 * Math.sin(i * 1.3 + layer * 2) + 0.02 * Math.sin(i * 3.1 + layer) + 0.012 * (hash01(i + layer * 30) - 0.5)));
    }
    path.lineTo(w, base); path.close();
    p.color = PC(col); canvas.drawPath(path, p);
  });
  // Le volcan : flancs concaves dentelés, éclairés à gauche
  const halfBase = w * 0.66, halfTop = w * 0.11;
  const flank = (side, s, i) => [cx + side * (halfBase - (halfBase - halfTop) * s) + (s >= 0.02 && s <= 0.98 ? (hash01(i) - 0.5) * w * 0.018 : 0), base - (base - topY) * Math.pow(s, 1.6)];
  path.reset(); path.moveTo(cx - halfBase, base);
  for (let i = 1; i <= 14; i++) { const [x, y] = flank(-1, i / 14, i + 200); path.lineTo(x, y); }
  for (let i = 1; i <= 5; i++) path.lineTo(cx - halfTop + 2 * halfTop * i / 6, topY + h * (0.004 + 0.006 * hash01(i + 260)));
  for (let i = 14; i >= 0; i--) { const [x, y] = flank(1, i / 14, i + 230); path.lineTo(x, y); }
  path.close();
  p.color = Color.WHITE;
  p.shader = new LinearGradient(cx - halfBase, 0, cx + halfBase, 0, [PC('#7A5246'), PC('#55392F'), PC('#3A2622'), PC('#22161A')], [0, 0.38, 0.62, 1]);
  canvas.drawPath(path, p);
  p.shader = null;
  // Ravines et arêtes éclairées
  for (let r = 0; r <= 10; r++) {
    const spread = (r / 10 - 0.5) * 1.7;
    path.reset();
    for (let s = 0; s <= 8; s++) {
      const q = s / 8, y = topY + h * 0.01 + (base - topY - h * 0.01) * q;
      const sProf = Math.pow(clamp((base - y) / (base - topY), 0, 1), 1 / 1.6), half = halfBase - (halfBase - halfTop) * sProf;
      const x = cx + spread * half * 0.9 + Math.sin(q * 7 + r) * w * 0.008;
      if (s === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    st.strokeWidth = w * 0.006; st.color = Color.argb(70, 10, 5, 5); canvas.drawPath(path, st);
    if (spread < 0) {
      canvas.save(); canvas.translate(-w * 0.006, 0);
      st.strokeWidth = w * 0.003; st.color = Color.argb(45, 255, 200, 160); canvas.drawPath(path, st);
      canvas.restore();
    }
  }
  // Cratère incandescent
  canvas.save(); canvas.translate(cx, topY + h * 0.008); canvas.scale(halfTop * 0.95 / 100, h * 0.02 / 100);
  p.color = Color.WHITE;
  p.shader = new RadialGradient(0, 0, 100, [PC('#FFF3B0'), PC('#FFB020'), PC('#C2410C')], [0, 0.5, 1]);
  canvas.drawCircle(0, 0, 100, p);
  canvas.restore();
  p.shader = null;
  // Colonne de feu qui jaillit
  if (erupt > 0) {
    const hh = h * (0.13 + 0.04 * Math.sin(t * 7) + 0.02 * Math.sin(t * 17)) * erupt;
    volFlame(canvas, cx, topY + h * 0.012, w * 0.1, hh * 1.05, Color.argb(110, 255, 80, 20));
    volFlame(canvas, cx + Math.sin(t * 11) * w * 0.006, topY + h * 0.01, w * 0.068, hh * 0.85, Color.argb(200, 255, 140, 30));
    volFlame(canvas, cx, topY + h * 0.008, w * 0.036, hh * 0.6, Color.argb(235, 255, 225, 130));
  }
  // Coulées de lave qui descendent
  const run = smooth01((t - 1.5) / 2.4);
  if (run > 0) {
    [-0.62, -0.2, 0.22, 0.55].forEach((spread, j) => {
      path.reset();
      let last = [cx, topY];
      for (let s = 0; s <= 14; s++) {
        const q = s / 14;
        if (q > run) break;
        const y = topY + h * 0.012 + (base - topY - h * 0.012) * q;
        const sProf = Math.pow(clamp((base - y) / (base - topY), 0, 1), 1 / 1.6), half = halfBase - (halfBase - halfTop) * sProf;
        const x = cx + spread * half * 0.85 * (0.25 + 0.75 * q) + Math.sin(q * 8 + j * 2) * w * 0.012;
        if (s === 0) path.moveTo(x, y); else path.lineTo(x, y);
        last = [x, y];
      }
      st.strokeWidth = w * 0.045; st.color = Color.argb(70, 255, 90, 20); canvas.drawPath(path, st);
      st.strokeWidth = w * 0.018; st.color = PC('#F05A16'); canvas.drawPath(path, st);
      st.strokeWidth = w * 0.007; st.color = PC('#FFE082'); canvas.drawPath(path, st);
      p.color = PC('#FFB347'); canvas.drawCircle(last[0], last[1], w * 0.012, p);
    });
  }
  // Sol : rochers sombres et fissures de lave
  p.color = PC('#1A1111'); canvas.drawRect(0, base, w, h, p);
  for (let i = 0; i < 4; i++) {
    path.reset();
    const x0 = w * (0.1 + 0.25 * i + 0.05 * hash01(i + 300));
    path.moveTo(x0, base + h * 0.01);
    for (let s = 1; s <= 4; s++) path.lineTo(x0 + (hash01(i * 7 + s) - 0.5) * w * 0.12, base + h * (0.01 + 0.03 * s));
    st.strokeWidth = w * 0.006; st.color = Color.argb(Math.min(255, Math.round(140 + 80 * pulse)), 255, 110, 30);
    canvas.drawPath(path, st);
  }
  p.color = PC('#0F0A0A');
  for (let i = 0; i < 8; i++) {
    const x = w * (i / 7) + (hash01(i + 310) - 0.5) * w * 0.08, r = w * (0.04 + 0.05 * hash01(i + 320));
    rect.set(x - r, base - r * 0.45, x + r, base + r * 0.4); canvas.drawOval(rect, p);
  }
  // Bombes crachées par le cratère, avec leur traînée
  if (t > 1.2) {
    const period = 1.8, g = h * 0.9, since = t - 1.2;
    for (let i = 0; i < 60; i++) {
      const tau = (since + hash01(i) * period) % period;
      if (tau > since || tau < 0.06) continue;
      const vx = (hash01(i + 7) - 0.5) * w * 0.6, vy = h * (0.6 + 0.4 * hash01(i + 3));
      const pos = (tt) => [cx + vx * tt, topY - vy * tt + 0.5 * g * tt * tt];
      const [x, y] = pos(tau);
      if (y > base) continue;
      const [x1, y1] = pos(tau - 0.06), f = tau / period;
      const r = w * (0.007 + 0.01 * hash01(i + 11)) * (1 - 0.4 * f);
      st.strokeWidth = r * 1.4; st.color = Color.argb(Math.round(150 * (1 - f)), 255, 120, 30);
      canvas.drawLine(x1, y1, x, y, st);
      p.color = Color.argb(Math.round(255 * (1 - f * 0.5)), 255, Math.round(230 - 140 * f), Math.round(90 - 70 * f));
      canvas.drawCircle(x, y, r, p);
    }
  }
  // Cendres qui tombent
  for (let i = 0; i < 30; i++) {
    const x = (hash01(i + 400) * w + t * w * 0.03 * (0.5 + hash01(i + 410))) % w;
    const y = (hash01(i + 420) * h + t * h * 0.05 * (0.5 + hash01(i + 430))) % h;
    p.color = Color.argb(120, 150, 140, 140); canvas.drawCircle(x, y, w * 0.003 * (1 + hash01(i + 440)), p);
  }
  // Éclair de l'explosion au début de l'éruption
  if (t >= 1.2 && t <= 1.7) { p.color = Color.argb(Math.round(170 * (1 - (t - 1.2) / 0.5)), 255, 200, 120); canvas.drawRect(0, 0, w, h, p); }
  // Vignette
  canvas.save(); canvas.translate(w / 2, h / 2); canvas.scale(h * 0.8 / 100, h * 0.8 / 100);
  p.color = Color.WHITE;
  p.shader = new RadialGradient(0, 0, 100, [Color.argb(0, 0, 0, 0), Color.argb(0, 0, 0, 0), Color.argb(150, 0, 0, 0)], [0, 0.55, 1]);
  canvas.drawCircle(0, 0, 160, p);
  canvas.restore();
  p.shader = null;
  canvas.restore();
}

/** Retour sur le joueur : cendres, petites bombes, ombre qui grossit, puis la grosse bombe. */
function drawLavaRain(canvas, t) {
  const p = volPaint, st = volStroke, k0 = t - VOLCANO_BACK;
  p.color = Color.WHITE;
  p.shader = new LinearGradient(0, 0, 0, h, Color.argb(175, 45, 10, 18), Color.argb(95, 150, 40, 15));
  p.alpha = Math.round(255 * Math.min(1, k0 * 1.5));
  canvas.drawRect(0, 0, w, h, p);
  p.shader = null;
  for (let i = 0; i < 40; i++) {
    const x = (hash01(i + 500) * w + k0 * w * 0.02 * (0.5 + hash01(i + 510))) % w;
    const y = (hash01(i + 520) * h + k0 * h * 0.08 * (0.5 + hash01(i + 530))) % h;
    p.color = Color.argb(130, 120, 110, 110); canvas.drawCircle(x, y, w * 0.0035, p);
  }
  for (let i = 0; i < 18; i++) {
    const y = h - (hash01(i + 540) * h + k0 * h * 0.15 * (0.6 + hash01(i + 550))) % h;
    const x = hash01(i + 560) * w + Math.sin(k0 * 3 + i) * w * 0.02;
    p.color = Color.argb(Math.round(200 * (0.5 + 0.5 * Math.sin(time * 9 + i))), 255, 150, 40); canvas.drawCircle(x, y, w * 0.004, p);
  }
  const tx = sx(px, pz), ty = sy(px, 0.3, pz), gy0 = sy(px, 0, pz);
  for (let i = 0; i < 5; i++) {
    const land = VOLCANO_BACK + 0.5 + i * 0.25, launch = land - 0.9;
    if (t < launch) continue;
    const ang = hash01(i * 5 + 1) * 6.283, dist = w * (0.16 + 0.2 * hash01(i * 5 + 2));
    const gx = tx + Math.cos(ang) * dist, gy = gy0 + Math.sin(ang) * dist * 0.35, r = w * 0.024;
    const dir = hash01(i * 5 + 3) > 0.5 ? 1 : -1, x0 = gx + dir * w * 0.35, y0 = -h * 0.08;
    const at = (q) => [x0 + (gx - x0) * q, y0 + (gy - y0) * q * q];
    if (t < land) {
      const q = (t - launch) / 0.9;
      bombTrail(canvas, q, r, 7, at);
      const [x, y] = at(q);
      lavaBomb(canvas, x, y, r, t * 5 + i);
    } else {
      const s = t - land;
      if (s < 1.4) { p.color = Color.argb(Math.round(220 * (1 - s / 1.4)), 230, 80, 20); rect.set(gx - r * 1.6, gy - r * 0.5, gx + r * 1.6, gy + r * 0.5); canvas.drawOval(rect, p); }
      if (s < 0.8) volFlame(canvas, gx, gy, r * 0.9, r * (2.2 + 0.6 * Math.sin(time * 20 + i)) * (1 - s / 0.8), Color.argb(220, 255, 150, 40));
      lavaBurst(canvas, gx, gy, s, 8, 0.25, i * 31, 0.7);
    }
  }
  // L'ombre de la grosse bombe grossit sous le joueur
  const warn = (t - (VOLCANO_IMPACT - 1.3)) / 1.3;
  if (warn >= 0 && warn <= 1) {
    p.color = Color.argb(Math.round(130 * warn), 20, 0, 0);
    rect.set(tx - k * 0.75 * warn, gy0 - k * 0.24 * warn, tx + k * 0.75 * warn, gy0 + k * 0.24 * warn);
    canvas.drawOval(rect, p);
    st.strokeWidth = w * 0.006; st.color = Color.argb(Math.round(200 * warn * (0.5 + 0.5 * Math.sin(time * 18))), 255, 60, 30);
    canvas.drawOval(rect, st);
  }
  // La grosse bombe
  const launch = VOLCANO_IMPACT - 1.3;
  if (t >= launch && t <= VOLCANO_IMPACT) {
    const q = (t - launch) / 1.3, x0 = tx + w * 0.45, y0 = -h * 0.15;
    const at = (qq) => [x0 + (tx - x0) * qq, y0 + (ty - y0) * Math.pow(Math.max(0, qq), 1.6)];
    const r = w * 0.07 * (0.75 + 0.25 * q);
    bombTrail(canvas, q, r, 12, at);
    const [x, y] = at(q);
    lavaBomb(canvas, x, y, r, t * 4);
  }
  // Impact : onde de choc, gerbe, flammes, fumée
  const s = t - VOLCANO_IMPACT;
  if (s >= 0) {
    if (s < 0.6) {
      const q = s / 0.6;
      st.strokeWidth = k * 0.09 * (1 - q); st.color = Color.argb(Math.round(230 * (1 - q)), 255, 150, 50);
      rect.set(tx - k * (0.3 + 2.6 * q), gy0 - k * (0.1 + 0.85 * q), tx + k * (0.3 + 2.6 * q), gy0 + k * (0.1 + 0.85 * q));
      canvas.drawOval(rect, st);
    }
    lavaBurst(canvas, tx, gy0, s, 18, 0.45, 777, 1.1);
    if (s < 1.7) {
      const fade = s < 1 ? 1 : 1 - (s - 1) / 0.7;
      for (let j = 0; j < 5; j++) {
        const fxp = tx + (j - 2) * k * 0.18;
        const hh = k * (0.8 + 0.3 * Math.sin(time * 17 + j * 1.9)) * (j === 2 ? 1.45 : j === 1 || j === 3 ? 1.15 : 0.85) * fade;
        volFlame(canvas, fxp, gy0 + k * 0.05, k * 0.28, hh, Color.argb(Math.round(200 * fade), 235, 70, 20));
        volFlame(canvas, fxp, gy0 + k * 0.05, k * 0.19, hh * 0.78, Color.argb(Math.round(220 * fade), 255, 150, 40));
        volFlame(canvas, fxp, gy0 + k * 0.05, k * 0.1, hh * 0.5, Color.argb(Math.round(240 * fade), 255, 235, 150));
      }
    }
    for (let i = 0; i < 16; i++) {
      const q = (s * 0.35 + i / 16) % 1;
      if (s < i * 0.05) continue;
      p.color = Color.argb(Math.round(70 * (1 - q) * Math.min(1, s * 2)), 60, 55, 58);
      canvas.drawCircle(tx + Math.sin(i * 2.3 + s) * k * 0.18 * (0.5 + q), gy0 - k * 0.3 - q * k * 2.4, k * (0.2 + 0.4 * q), p);
    }
    if (s < 0.4) { p.color = Color.argb(Math.round(190 * (1 - s / 0.4)), 255, 180, 80); canvas.drawRect(0, 0, w, h, p); }
  }
}

/** Mare de lave bouillonnante sous le tas de cendres, après l'impact (dessinée avant le tas). */
function drawLavaPool(canvas, ox, oy) {
  const s = strikeT - VOLCANO_IMPACT, g = Math.min(1, s / 0.5);
  if (g <= 0) return;
  const PC = Color.parseColor, p = volPaint, st = volStroke, wd = k * 1.05 * g, ht = k * 0.36 * g;
  p.shader = null;
  p.color = PC('#3A140A'); rect.set(ox - wd, oy - ht * 0.55, ox + wd, oy + ht * 0.55); canvas.drawOval(rect, p);
  canvas.save(); canvas.translate(ox, oy); canvas.scale(wd * 0.9 / 100, ht * 0.48 / 100);
  p.color = Color.WHITE;
  p.shader = new RadialGradient(0, 0, 100, [PC('#FFE38A'), PC('#FF8A1F'), PC('#C2410C')], [0, 0.45, 1]);
  canvas.drawCircle(0, 0, 100, p);
  canvas.restore();
  p.shader = null;
  for (let i = 0; i < 6; i++) {
    const a = hash01(i + 600) * 6.283 + time * 0.15, rr = 0.35 + 0.45 * hash01(i + 610);
    const x = ox + Math.cos(a) * wd * 0.8 * rr, y = oy + Math.sin(a) * ht * 0.4 * rr;
    p.color = Color.argb(200, 70, 25, 12); rect.set(x - k * 0.09, y - k * 0.03, x + k * 0.09, y + k * 0.03); canvas.drawOval(rect, p);
  }
  for (let i = 0; i < 4; i++) {
    const q = (time * 0.8 + hash01(i + 620)) % 1;
    const x = ox + (hash01(i + 630) - 0.5) * wd * 1.1, y = oy + (hash01(i + 640) - 0.5) * ht * 0.5;
    st.strokeWidth = k * 0.015; st.color = Color.argb(Math.round(220 * (1 - q)), 255, 230, 140);
    canvas.drawCircle(x, y, k * 0.06 * q, st);
  }
  for (let i = 0; i < 4; i++) {
    const q = (time * 0.35 + i / 4) % 1;
    p.color = Color.argb(Math.round(90 * (1 - q)), 200, 190, 190);
    canvas.drawCircle(ox + (i - 1.5) * wd * 0.4 + Math.sin(time + i) * k * 0.05, oy - q * k * 1.2, k * (0.08 + 0.18 * q), p);
  }
}
