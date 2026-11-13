'use strict';
// Retour des atterrissages parfaits (équivalent de PerfectFx.kt) : onde dorée sur le bloc, son des étoiles qui monte
// d'un cran à chaque parfait enchaîné, multiplicateur « PARFAIT ×n » qui saute. Le rebond d'un trampoline
// ne casse pas la série et ne la fait pas monter.
// Parfaits enchaînés : l'onde de choc au sol est de plus en plus impressionnante (plus large, plus d'anneaux, éclats,
// secousse, souffle « whoosh ») et le personnage s'entoure d'une aura de plus en plus forte (blanche, dorée, orange
// puis bleu électrique avec des éclairs), qui retombe dès que la série s'arrête.

let ripples = [], comboT = -1, comboStreak = 0, comboPoints = 0, comboX = 0, comboY = 0;
let auraPower = 0;   // force de l'aura affichée (suit la série en douceur : 0 = aucune, 6 = maximum)
const auraPaint = new Paint(), auraLine = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), auraPath = new Path();
/** Couleurs de l'aura selon sa force : [cœur, bord]. */
const AURA_COLORS = [['#FFFFFF', '#FFF2B0'], ['#FFF7C2', '#FFD54F'], ['#FFE680', '#FFB300'], ['#FFD24A', '#FF8A1F'], ['#FFC23A', '#FF5A2A'], ['#CFF6FF', '#38BDF8'], ['#FFFFFF', '#7DD3FC']]
  .map((p) => p.map((c) => Color.parseColor(c)));
/** Force de l'aura pour une série de parfaits : rien avant 2, puis un cran par parfait, 6 au plus. */
const auraLevel = (streak) => clamp(streak - 1, 0, 6);
const rippleLine = new Paint({ style: Style.STROKE }), rippleFill = new Paint(), rippleRect = new RectF();
const comboFill = new Paint({ textAlign: Align.CENTER, bold: true });
const comboLine = new Paint({ textAlign: Align.CENTER, bold: true, style: Style.STROKE, strokeJoin: 'round' });
const COMBO_COLORS = ['#FFFFFF', '#FFE066', '#FFC93C', '#FF9F1C', '#FF6B4A', '#FF4F9A'].map((c) => Color.parseColor(c));

function onPerfect(streak, points) {
  // Onde de choc : un anneau de plus tous les 2 parfaits (4 au plus), de plus en plus large
  const power = Math.min(streak, 10), rings = 1 + Math.min(3, Math.floor(streak / 2));
  for (let i = 0; i < rings; i++) ripples.push({ x: px, z: pz, power, t: -0.1 * i });
  if (streak >= 3) {
    // Éclats au ras du sol, secousse et souffle, plus forts à chaque parfait
    const x = sx(px, pz) + camX, y = sy(px, 0.1, pz) + camY, lvl = auraLevel(streak);
    spawnSparkles(x, y, AURA_COLORS[lvl][1], Math.min(48, 8 + 5 * streak));
    shake(Math.min(0.1, 0.015 * streak));
    sounds.play('WHOOSH', Math.min(1, 0.3 + 0.08 * streak), Math.min(1.5, 0.85 + 0.05 * streak));
    if (streak >= 5) vibrate(20);
  }
  comboT = 0; comboStreak = streak; comboPoints = points;
  comboX = sx(px, pz) + camX; comboY = sy(px, playerHeight * 2.6, pz) + camY;
  sounds.play('STAR', 0.7, Scoring.perfectRate(streak));
  if (Scoring.perfectVoice(streak)) sounds.play('PERFECT');
}

function updatePerfectFx(dt) {
  if (ripples.length) { for (const r of ripples) r.t += dt; ripples = ripples.filter((r) => r.t <= 0.65); }
  if (comboT >= 0) { comboT += dt; if (comboT > 1.1) comboT = -1; }
  // L'aura monte vite et retombe doucement
  const target = auraLevel(perfectStreak);
  auraPower += (target - auraPower) * Math.min(1, dt * (target > auraPower ? 6 : 3));
  if (auraPower < 0.02) auraPower = 0;
}

/**
 * Aura du personnage quand il enchaîne les parfaits : des flammes d'énergie qui montent autour de lui, de plus en
 * plus hautes et vives, un halo au sol, puis des éclairs à pleine puissance. Dessinée juste avant le personnage
 * (les flammes de devant sont légères pour ne pas le cacher).
 */
function drawAura(canvas) {
  if (auraPower <= 0 || !(state === State.READY || state === State.CHARGING || state === State.JUMPING)) return;
  const p = auraPower, lvl = clamp(Math.round(p), 0, 6), [core, edge] = AURA_COLORS[lvl];
  const cx = sx(px, pz), base = sy(px, py, pz), fade = Math.min(1, p);
  const hgt = k * (0.95 + 0.26 * p), wid = k * (0.4 + 0.07 * p);
  const er = Color.red(edge), eg = Color.green(edge), eb = Color.blue(edge);
  // Halo au sol
  auraPaint.color = Color.WHITE;
  auraPaint.shader = new RadialGradient(cx, base, wid * 1.7, [Color.argb(Math.round(120 * fade), er, eg, eb), Color.argb(0, er, eg, eb)], [0, 1]);
  rippleRect.set(cx - wid * 1.7, base - wid * 0.75, cx + wid * 1.7, base + wid * 0.75); canvas.drawOval(rippleRect, auraPaint);
  // Flammes : plusieurs langues qui ondulent, du bord (large, transparente) au cœur (étroite, claire)
  const flames = 3 + Math.min(4, Math.floor(p));
  for (let i = 0; i < flames; i++) {
    const f = i / (flames - 1 || 1), ph = time * (5 + i * 1.3) + i * 2.1;
    const fw = wid * (1 - 0.45 * f) * (1 + 0.08 * Math.sin(ph * 1.7)), fh = hgt * (0.75 + 0.3 * f) * (1 + 0.1 * Math.sin(ph));
    const sway = Math.sin(ph * 0.9) * wid * 0.22, ox = (i % 2 === 0 ? -1 : 1) * wid * 0.16 * (1 - f);
    auraPath.reset();
    auraPath.moveTo(cx + ox - fw, base);
    auraPath.cubicTo(cx + ox - fw * 1.15, base - fh * 0.45, cx + ox - fw * 0.25 + sway, base - fh * 0.7, cx + ox + sway, base - fh);
    auraPath.cubicTo(cx + ox + fw * 0.25 + sway, base - fh * 0.7, cx + ox + fw * 1.15, base - fh * 0.45, cx + ox + fw, base);
    auraPath.close();
    const c = f > 0.6 ? core : edge, a = Math.round((72 + 40 * f) * fade);
    auraPaint.shader = new LinearGradient(0, base, 0, base - fh, [Color.argb(a, Color.red(c), Color.green(c), Color.blue(c)), Color.argb(Math.round(a * 0.8), er, eg, eb), Color.argb(0, er, eg, eb)], [0, 0.55, 1]);
    canvas.drawPath(auraPath, auraPaint);
  }
  auraPaint.shader = null;
  // Étincelles qui montent
  const sparks = Math.floor(2 + p * 2);
  for (let i = 0; i < sparks; i++) {
    const t = (time * (0.9 + 0.13 * i) + i * 0.37) % 1, a = i * 2.4;
    auraPaint.color = Color.argb(Math.round(230 * (1 - t) * fade), Color.red(core), Color.green(core), Color.blue(core));
    canvas.drawCircle(cx + Math.sin(a + time * 2) * wid * (0.9 - 0.4 * t), base - hgt * (0.1 + 0.95 * t), k * 0.035 * (1 - 0.5 * t), auraPaint);
  }
  // Pleine puissance : petits éclairs autour du personnage
  if (p > 4.5) {
    const tick = Math.floor(time * 16);
    auraLine.strokeWidth = k * 0.03;
    for (let b = 0; b < 2; b++) {
      let h0 = (tick * 7919 + b * 104729) | 0;
      const rnd2 = () => { h0 = (Math.imul(h0, 1103515245) + 12345) & 0x7fffffff; return h0 / 0x7fffffff; };
      const side = b === 0 ? -1 : 1;
      let x = cx + side * wid * (0.5 + 0.5 * rnd2()), y = base - hgt * (0.15 + 0.5 * rnd2());
      auraPath.reset(); auraPath.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += side * wid * 0.22 * (rnd2() - 0.2); y -= hgt * 0.12 * (0.5 + rnd2()); auraPath.lineTo(x, y); }
      auraLine.color = Color.argb(Math.round(230 * fade), 255, 255, 255); canvas.drawPath(auraPath, auraLine);
    }
  }
}

/** Ondes sur le dessus du bloc (dessinées juste avant le personnage). */
function drawRipples(canvas) {
  for (const r of ripples) {
    if (r.t < 0) continue;
    // (au-delà du 2e parfait d'affilée, l'onde déborde largement du bloc)
    const f = r.t / 0.65, rad = (0.2 + (1.0 + 0.17 * Math.max(0, r.power - 2)) * f) * (0.75 + 0.1 * Math.min(r.power, 5)), cx = sx(r.x, r.z), cy = sy(r.x, 0, r.z);
    rippleRect.set(cx - 1.2247449 * k * rad, cy - 0.70710677 * k * rad, cx + 1.2247449 * k * rad, cy + 0.70710677 * k * rad);
    if (f < 0.35) { rippleFill.color = Color.argb(Math.round(90 * (1 - f / 0.35)), 255, 236, 150); canvas.drawOval(rippleRect, rippleFill); }
    rippleLine.strokeWidth = k * (0.05 + 0.015 * Math.min(r.power, 8)) * (1 - f) + 1;
    rippleLine.color = Color.argb(Math.round(235 * (1 - f)), 255, Math.round(213 + 42 * f), Math.round(79 + 176 * f));
    canvas.drawOval(rippleRect, rippleLine);
  }
}

/** Multiplicateur « PARFAIT ×n » qui saute puis s'envole. */
function drawCombo(canvas) {
  if (comboT < 0) return;
  const t = comboT;
  const pop = t < 0.12 ? 0.5 + 0.85 * (t / 0.12) : t < 0.3 ? 1.35 - 0.35 * ((t - 0.12) / 0.18) : 1;
  const a = t < 0.75 ? 1 : clamp(1 - (t - 0.75) / 0.35, 0, 1);
  const y = zoomY(comboY - camY) - w * 0.08 * t;
  const size = w * (0.062 + 0.005 * Math.min(comboStreak, 6)) * pop;
  const label = comboStreak >= 2 ? tr('hud.perfect') + ' ×' + comboStreak : tr('hud.perfect');
  // Toujours entièrement dans l'écran, même quand le personnage est près du bord
  comboFill.textSize = size;
  const half = comboFill.measureText(label) / 2 + w * 0.04, x = clamp(zoomX(comboX - camX), half, Math.max(half, w - half));
  const color = COMBO_COLORS[clamp(comboStreak - 1, 0, COMBO_COLORS.length - 1)];
  canvas.save(); canvas.rotate(comboStreak % 2 === 0 ? -4 : 4, x, y);
  for (const [text, s, dy] of [[label, size, 0], ['+' + comboPoints, size * 0.62, size * 0.85]]) {
    comboLine.textSize = s; comboFill.textSize = s; comboLine.strokeWidth = s * 0.16;
    comboLine.color = Color.argb(Math.round(200 * a), 40, 24, 10); canvas.drawText(text, x, y + dy, comboLine);
    comboFill.color = color; comboFill.alpha = Math.round(255 * a); canvas.drawText(text, x, y + dy, comboFill);
  }
  canvas.restore();
}
