'use strict';
// Thème « montagne de l'aigle » de la saison 1 (équivalent de QuestTheme.kt) : ciel selon l'altitude,
// montagnes avec sapins, nuages bas, blocs de roche, plumes, aigle au loin, nid à l'arrivée.

const MOUNTAIN_COLORS = [0xFF9EA3AA, 0xFF8D6E63, 0xFF7C9A5A, 0xFFA1887F, 0xFF78909C, 0xFFB0A089, 0xFF6D8B74, 0xFFC2B8A3];

/** Le score qui choisit le ciel : en Aventure, c'est l'altitude (le niveau), pas les points. */
function skyScore() {
  if (!quest.active) return score;
  const n = quest.level;
  return n <= 6 ? 22 : n <= 11 ? 32 : 44;
}

function mountainRange(canvas, baseY, height, color, seed, parallax, pines) {
  const path = questPath, span = w * 1.6, off = ((-camX * parallax) % span + span) % span, steps = 14;
  const ridge = (u) => 0.55 + 0.3 * Math.sin(u * 6.283 * 2 + seed) + 0.15 * Math.sin(u * 6.283 * 5 + seed * 2.1);
  path.reset(); path.moveTo(-w * 0.2, h);
  for (let rep = -1; rep <= 1; rep++) for (let i = 0; i <= steps; i++) {
    const u = i / steps; path.lineTo(rep * span + off + u * span - w * 0.3, baseY - height * ridge(u));
  }
  path.lineTo(w * 1.2, h); path.close();
  questPaint.shader = null; questPaint.color = color; canvas.drawPath(path, questPaint);
  if (!pines) return;
  questPaint.color = shade(color, 0.7);
  for (let rep = -1; rep <= 1; rep++) for (let i = 0; i < 22; i++) {
    const u = (i + 0.5) / 22, x = rep * span + off + u * span - w * 0.3;
    if (x < -w * 0.1 || x > w * 1.1) continue;
    const y = baseY - height * ridge(u) + height * 0.12, s = w * (0.025 + 0.012 * ((i * 7) % 3));
    path.reset();
    path.moveTo(x, y - s * 2.2); path.lineTo(x + s * 0.7, y - s * 0.6); path.lineTo(x + s * 0.45, y - s * 0.6); path.lineTo(x + s, y + s * 0.4);
    path.lineTo(x - s, y + s * 0.4); path.lineTo(x - s * 0.45, y - s * 0.6); path.lineTo(x - s * 0.7, y - s * 0.6); path.close();
    canvas.drawPath(path, questPaint);
  }
}

/** Décor de montagne dessiné juste après le ciel (derrière les nuages, la météo et les blocs). */
function drawMountainScenery(canvas, night) {
  const d = quest.spec ? quest.spec.difficulty : 0, dim = 1 - 0.45 * night;
  const col = (c) => Color.argb(255, Math.round(((c >>> 16) & 255) * dim), Math.round(((c >>> 8) & 255) * dim), Math.round((c & 255) * dim));
  mountainRange(canvas, h * (0.62 + 0.18 * d), h * 0.3, col(0xFFB4C3D6), 1, 0.03, false);
  mountainRange(canvas, h * (0.78 + 0.18 * d), h * 0.26, col(0xFF8FA39A), 4, 0.07, true);
  for (let i = 0; i <= 2; i++) {
    const sp = 0.035 + 0.012 * i, f = ((time * sp + i * 0.37) % 1.2) - 0.1;
    const x = w * (0.18 + 0.3 * i) + Math.sin(time * 1.3 + i * 2) * w * 0.06;
    drawFeather(canvas, x, h * f, w * 0.035, Math.sin(time * 1.3 + i * 2) * 35);
  }
  if (quest.eagleT >= 0) {
    const f = quest.eagleT / 7, ex = quest.eagleDir > 0 ? -w * 0.15 + f * w * 1.3 : w * 1.15 - f * w * 1.3;
    drawEagle(canvas, ex, h * (0.16 + 0.05 * Math.sin(f * 6)), w * 0.035, quest.eagleDir);
  }
}

/** Nuages bas : [x de départ, hauteur, taille, vitesse], comme ceux du ciel du mode libre. */
const LOW_CLOUDS = [[0, 0.9, 1.9, 0.005], [0.45, 0.95, 2.2, 0.004], [0.9, 0.88, 1.6, 0.006], [1.25, 0.97, 2.0, 0.0045]];
const lowCloudShapes = [];

/** Nuages bas, sous les blocs, dans les derniers niveaux (on est au-dessus). */
function drawLowClouds(canvas) {
  const d = quest.spec ? quest.spec.difficulty : 0;
  if (d < 0.55) return;
  const a = clamp((d - 0.55) / 0.3, 0, 1);
  LOW_CLOUDS.forEach(([bx, by, s, sp], i) => {
    const span = w * 1.6, pos = bx * w + time * sp * w;
    const x = (pos % span + span) % span - w * 0.3, lap = Math.floor(pos / span);
    if (!lowCloudShapes[i] || lowCloudShapes[i].lap !== lap) lowCloudShapes[i] = { lap, shape: makeCloudShape() };
    drawCloud(canvas, x, by * h, w * 0.15 * s, 215 * a, lowCloudShapes[i].shape);
  });
}

/** Minuteur de l'aigle qui passe au loin (et son cri lointain). */
function updateQuestTheme(dt) {
  if (!quest.active || state === State.QUEST_END) { quest.eagleT = -1; quest.eagleAt = 0; return; }
  if (quest.eagleT >= 0) { quest.eagleT += dt; if (quest.eagleT > 7) quest.eagleT = -1; return; }
  if (quest.eagleAt <= 0) quest.eagleAt = time + 8 + Math.random() * 10;
  else if (time >= quest.eagleAt) {
    quest.eagleT = 0; quest.eagleDir = Math.random() < 0.5 ? 1 : -1; quest.eagleAt = time + 25 + Math.random() * 15;
    if (quest.season === 1) sounds.play('EAGLE', 0.25);
  }
}

function drawFeather(canvas, x, y, s, angle) {
  canvas.save(); canvas.rotate(angle, x, y);
  questPaint.shader = null; questPaint.color = Color.parseColor('#6D4C41');
  rect.set(x - s * 0.18, y - s * 0.6, x + s * 0.18, y + s * 0.6); canvas.drawOval(rect, questPaint);
  questStroke.color = Color.parseColor('#D7CCC8'); questStroke.strokeWidth = s * 0.05; canvas.drawLine(x, y - s * 0.6, x, y + s * 0.8, questStroke);
  canvas.restore();
}

function drawPine(canvas, x, y, s) {
  questPaint.shader = null;
  questPaint.color = Color.argb(45, 0, 0, 0); rect.set(x - s * 0.35, y - s * 0.07, x + s * 0.35, y + s * 0.07); canvas.drawOval(rect, questPaint);
  questPaint.color = Color.parseColor('#6D4C41'); rect.set(x - s * 0.06, y - s * 0.25, x + s * 0.06, y); canvas.drawRect(rect, questPaint);
  ['#2E7D4F', '#388E5C', '#43A06A'].forEach((c, i) => {
    const by = y - s * (0.2 + 0.27 * i), hw = s * (0.36 - 0.08 * i);
    questPaint.color = Color.parseColor(c);
    questPath.reset(); questPath.moveTo(x, by - s * 0.42); questPath.lineTo(x + hw, by); questPath.lineTo(x - hw, by); questPath.close();
    canvas.drawPath(questPath, questPaint);
  });
}

function drawRock(canvas, x, y, s) {
  questPaint.shader = null;
  questPaint.color = Color.parseColor('#7D838C'); rect.set(x - s * 0.5, y - s * 0.45, x + s * 0.5, y + s * 0.08); canvas.drawOval(rect, questPaint);
  questPaint.color = Color.parseColor('#A4AAB3'); rect.set(x - s * 0.35, y - s * 0.42, x + s * 0.15, y - s * 0.15); canvas.drawOval(rect, questPaint);
}

/** Arrivée (repère du bloc) : nid avec une plume ; au niveau 15, le grand nid avec Bulpa qui tremble. */
function drawFinishNest(canvas, p) {
  if (quest.season > 1) { drawChapterFinish(canvas, p); return; }
  const last = quest.level >= Quest.LEVELS;
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45), r = k * (last ? 0.78 : 0.52);
  if (last) drawBulpa(canvas, bx + Math.sin(time * 45) * k * 0.025, by + r * 0.05, k * 0.85, false);
  questPaint.shader = null;
  questPaint.color = Color.parseColor('#7A5230'); rect.set(bx - r, by - r * 0.32, bx + r, by + r * 0.32); canvas.drawOval(rect, questPaint);
  questPaint.color = Color.parseColor('#5D3F24'); rect.set(bx - r * 0.7, by - r * 0.2, bx + r * 0.7, by + r * 0.08); canvas.drawOval(rect, questPaint);
  questStroke.color = Color.parseColor('#A0714A'); questStroke.strokeWidth = k * 0.03;
  for (let i = 0; i <= 5; i++) { const a = -0.8 + i * 0.32; canvas.drawLine(bx - r * 0.95, by + r * a * 0.18, bx + r * 0.95, by - r * a * 0.14, questStroke); }
  if (last) {
    textPaint.textSize = k * 0.32 * (1 + 0.08 * Math.abs(Math.sin(time * 6)));
    canvas.drawText('😨', bx + k * 0.55, by - k * 1.45, textPaint);
  } else drawFeather(canvas, bx + r * 0.15, by - r * 0.8, k * 0.85, 18 + Math.sin(time * 2) * 6);
}
