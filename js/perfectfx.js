'use strict';
// Retour des atterrissages parfaits (équivalent de PerfectFx.kt) : onde dorée sur le bloc, son des étoiles qui monte
// d'un cran à chaque parfait enchaîné, multiplicateur « PARFAIT ×n » qui saute. Le rebond d'un trampoline
// ne casse pas la série et ne la fait pas monter.

let ripples = [], comboT = -1, comboStreak = 0, comboPoints = 0, comboX = 0, comboY = 0;
const rippleLine = new Paint({ style: Style.STROKE }), rippleFill = new Paint(), rippleRect = new RectF();
const comboFill = new Paint({ textAlign: Align.CENTER, bold: true });
const comboLine = new Paint({ textAlign: Align.CENTER, bold: true, style: Style.STROKE, strokeJoin: 'round' });
const COMBO_COLORS = ['#FFFFFF', '#FFE066', '#FFC93C', '#FF9F1C', '#FF6B4A', '#FF4F9A'].map((c) => Color.parseColor(c));

function onPerfect(streak, points) {
  const power = Math.min(streak, 5);
  ripples.push({ x: px, z: pz, power, t: 0 });
  if (streak >= 3) ripples.push({ x: px, z: pz, power, t: -0.12 });
  comboT = 0; comboStreak = streak; comboPoints = points;
  comboX = sx(px, pz) + camX; comboY = sy(px, playerHeight * 2.6, pz) + camY;
  sounds.play('STAR', 0.7, Scoring.perfectRate(streak));
  if (Scoring.perfectVoice(streak)) sounds.play('PERFECT');
}

function updatePerfectFx(dt) {
  if (ripples.length) { for (const r of ripples) r.t += dt; ripples = ripples.filter((r) => r.t <= 0.65); }
  if (comboT >= 0) { comboT += dt; if (comboT > 1.1) comboT = -1; }
}

/** Ondes sur le dessus du bloc (dessinées juste avant le personnage). */
function drawRipples(canvas) {
  for (const r of ripples) {
    if (r.t < 0) continue;
    const f = r.t / 0.65, rad = (0.2 + 1.0 * f) * (0.75 + 0.1 * r.power), cx = sx(r.x, r.z), cy = sy(r.x, 0, r.z);
    rippleRect.set(cx - 1.2247449 * k * rad, cy - 0.70710677 * k * rad, cx + 1.2247449 * k * rad, cy + 0.70710677 * k * rad);
    if (f < 0.35) { rippleFill.color = Color.argb(Math.round(90 * (1 - f / 0.35)), 255, 236, 150); canvas.drawOval(rippleRect, rippleFill); }
    rippleLine.strokeWidth = k * (0.05 + 0.015 * r.power) * (1 - f) + 1;
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
  const y = comboY - camY - w * 0.08 * t;
  const size = w * (0.062 + 0.005 * Math.min(comboStreak, 6)) * pop;
  const label = comboStreak >= 2 ? tr('hud.perfect') + ' ×' + comboStreak : tr('hud.perfect');
  // Toujours entièrement dans l'écran, même quand le personnage est près du bord
  comboFill.textSize = size;
  const half = comboFill.measureText(label) / 2 + w * 0.04, x = clamp(comboX - camX, half, Math.max(half, w - half));
  const color = COMBO_COLORS[clamp(comboStreak - 1, 0, COMBO_COLORS.length - 1)];
  canvas.save(); canvas.rotate(comboStreak % 2 === 0 ? -4 : 4, x, y);
  for (const [text, s, dy] of [[label, size, 0], ['+' + comboPoints, size * 0.62, size * 0.85]]) {
    comboLine.textSize = s; comboFill.textSize = s; comboLine.strokeWidth = s * 0.16;
    comboLine.color = Color.argb(Math.round(200 * a), 40, 24, 10); canvas.drawText(text, x, y + dy, comboLine);
    comboFill.color = color; comboFill.alpha = Math.round(255 * a); canvas.drawText(text, x, y + dy, comboFill);
  }
  canvas.restore();
}
