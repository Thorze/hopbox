'use strict';
// Bonus « Le ballon » (équivalent de Balloon.kt) : tant qu'on appuie, le perso souffle dans le ballon (il gonfle les
// joues, puis reprend sa respiration) ; plus le ballon est gros, plus il rapporte (jusqu'à +12). Le seuil d'éclatement
// change à chaque fois : juste avant, le ballon tremble et pâlit. On lâche à temps : il s'envole avec les points. Trop
// gonflé : il éclate, 0 point.

const BALLOON_MAX = 12;
const BONUS_BALLOON_COLORS = ['#E53950', '#3F8EFC', '#3DBE6E', '#FF8A2A', '#B56BEA', '#FF5FA2'];
/** Une respiration : on souffle BALLOON_BLOW s, puis on reprend son souffle BALLOON_INHALE s (le ballon ne grossit pas). */
const BALLOON_BLOW = 0.8, BALLOON_INHALE = 0.45;
/** Le ballon part de la bouche en penchant vers la droite (degrés). */
const BALLOON_TILT = 55;
// shortT : secondes d'affichage de « trop court » après une tape qui n'a pas eu le temps de gonfler ;
// idleT : secondes sans appui depuis le début ou depuis le dernier essai trop court
const bal = { f: 0, burst: 1, rate: 0.4, pumping: false, popped: false, popT: 0, flyT: -1, br: 0, lastPts: 0, buzzT: 0, shortT: 0, idleT: 0, color: 0, shards: [] };
const balPaint = new Paint(), balStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), balPath = new Path(), balRect = new RectF();

function balloonStart() {
  Object.assign(bal, { f: 0, pumping: false, popped: false, popT: 0, flyT: -1, br: 0, lastPts: 0, buzzT: 0, shortT: 0, idleT: 0, shards: [] });
  // Il éclate entre 72 % et 115 % de la taille qui donne +12 (au-delà de 100 %, on reste à +12 mais le risque monte)
  bal.burst = 0.72 + rnd() * 0.43;
  // Vitesse pendant qu'on souffle (les reprises de souffle comprises, environ 3 s pour atteindre +12)
  bal.rate = Math.min(0.47 * (1 + 0.06 * (bonusCount - 1)), 0.67);
  bal.color = Color.parseColor(BONUS_BALLOON_COLORS[rndInt(BONUS_BALLOON_COLORS.length)]);
}

/** Points du ballon tel qu'il est gonflé. */
function balloonPoints() { return Math.min(BALLOON_MAX, Math.floor(bal.f * BALLOON_MAX + 1e-6)); }

/** 0 loin du seuil, 1 au moment d'éclater : le ballon tremble et pâlit. */
function balloonDanger() { return clamp(1 - (bal.burst - bal.f) / 0.18, 0, 1); }

/** Reprise de souffle en cours : 0 sinon, monte puis redescend (0 à 1) pendant l'inspiration. */
function balloonInhale() {
  if (!bal.pumping) return 0;
  const u = bal.br % (BALLOON_BLOW + BALLOON_INHALE);
  return u < BALLOON_BLOW ? 0 : Math.sin(Math.PI * (u - BALLOON_BLOW) / BALLOON_INHALE);
}
function balloonBlowing() { return bal.pumping && bal.br % (BALLOON_BLOW + BALLOON_INHALE) < BALLOON_BLOW; }

function balloonPress() { if (!bal.popped && bal.flyT < 0) { bal.pumping = true; bal.br = 0; bal.idleT = 0; } }

/**
 * Lâcher : on garde les points et le ballon s'envole. Une simple tape (comme aux autres bonus) n'a pas le temps de
 * gonfler : au lieu de perdre le bonus, on dégonfle et on rappelle qu'il faut laisser le doigt appuyé.
 */
function balloonRelease() {
  if (bonusType.id !== 'balloon' || !bal.pumping || bonusResult !== 0) return;
  bal.pumping = false;
  const pts = balloonPoints();
  if (pts === 0) { bal.f = 0; bal.br = 0; bal.lastPts = 0; bal.shortT = 2.2; return; }
  if (pts > 0) { bal.flyT = 0; sounds.play('BALLOON_AWAY', 0.9); }
  finishBonus(pts);
}

/** Tant que le bonus est en jeu (avant le résultat). */
function balloonUpdate(dt, t) {
  if (bal.pumping) {
    if (balloonBlowing()) bal.f += bal.rate * dt;
    // Bruit de la respiration : on souffle au début de chaque souffle, on inspire au début de chaque reprise
    const cyc = BALLOON_BLOW + BALLOON_INHALE, before = bal.br;
    bal.br += dt;
    if (before === 0 || Math.floor(bal.br / cyc) > Math.floor(before / cyc)) sounds.play('BREATH_OUT', 0.9);
    else if (before % cyc < BALLOON_BLOW && bal.br % cyc >= BALLOON_BLOW) sounds.play('BREATH_IN', 0.8);
    const pts = balloonPoints();
    if (pts > bal.lastPts) { bal.lastPts = pts; sounds.play('BLOP', 0.55, Math.min(0.7 + pts * 0.07, 1.6)); }
    // Tout près du seuil : petites vibrations
    bal.buzzT -= dt;
    if (balloonDanger() > 0.55 && bal.buzzT <= 0) { vibrate(8); bal.buzzT = 0.18; }
    if (bal.f >= bal.burst) balloonPop();
  } else if (bal.f === 0) {
    // Personne n'appuie (10 s depuis le début ou depuis le dernier essai trop court) : on passe
    bal.idleT += dt;
    if (bal.idleT > 10) finishBonus(0);
  }
  if (bal.shortT > 0) bal.shortT -= dt;
}

/** Ce qu'il faut faire, en gros sous la scène pendant le bonus : maintenir, lâcher, ou lâcher vite. */
function balloonPrompt() {
  if (bal.pumping) return tr(balloonDanger() > 0.55 ? 'bonus.balloon.danger' : 'bonus.balloon.release');
  return tr(bal.shortT > 0 ? 'bonus.balloon.short' : 'bonus.balloon.hold');
}
/** La consigne pulse tant qu'on n'appuie pas, pour attirer l'œil. */
function balloonPromptPulse() { return !bal.pumping; }

/** Les trois règles du ballon, une par ligne, sous le titre (à la place de la consigne d'une ligne). */
function drawBalloonRules(canvas, y) {
  textPaint.textSize = w * 0.042;
  for (let i = 1; i <= 3; i++) canvas.drawText(fitText(tr('bonus.balloon.step' + i), textPaint, w * 0.92, 0.6), w / 2, y + (i - 1) * w * 0.062, textPaint);
}

function balloonPop() {
  bal.pumping = false; bal.popped = true; bal.popT = 0;
  const r = balloonRadius(), c = balloonCenter(r);
  for (let i = 0; i < 10; i++) {
    const an = i / 10 * Math.PI * 2 + rnd() * 0.4, sp = w * (0.5 + rnd() * 0.6);
    bal.shards.push({ x: c[0] + Math.cos(an) * r * 0.6, y: c[1] + Math.sin(an) * r * 0.6, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - w * 0.3, rot: rnd() * 360, vr: (rnd() - 0.5) * 900, s: w * (0.025 + rnd() * 0.025) });
  }
  sounds.play('EXPLOSION', 0.45, 1.8); sounds.play('POP', 0.9);
  finishBonus(0);
}

/** Animations qui continuent pendant l'affichage du résultat (éclats, envol). */
function balloonAnim(dt) {
  if (bal.popped) {
    bal.popT += dt;
    for (const s of bal.shards) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += w * 2.2 * dt; s.vx *= Math.exp(-1.5 * dt); s.rot += s.vr * dt; }
  }
  if (bal.flyT >= 0) bal.flyT += dt;
}

// ---------- Dessin ----------
function balloonGround() { return ub() - w * 0.27; }
/** Position du perso (pieds) et de sa bouche, où est attaché le ballon. */
function balloonHeroX() { return w * 0.27; }
function balloonMouth() { return [balloonHeroX() + w * 0.09, balloonGround() - w * 0.058]; }
function balloonRadius() { return w * (0.035 + 0.15 * Math.min(bal.f, 1.2)); }
/** Centre du ballon : dans l'axe penché qui part de la bouche (le nœud est contre la bouche). */
function balloonCenter(r) {
  const [mx, my] = balloonMouth(), a = BALLOON_TILT * Math.PI / 180, d = r * 1.12 + w * 0.02;
  return [mx + Math.sin(a) * d, my - Math.cos(a) * d];
}

function balloonDraw(canvas) {
  const PC = Color.parseColor, gy = balloonGround(), [mx, my] = balloonMouth(), danger = bal.popped ? 0 : balloonDanger();
  balPaint.shader = null;
  // Écran peu haut (tablette) : toute la scène est réduite depuis le sol pour ne pas monter sur le titre
  const sc = Math.min(1, (gy - (h * 0.2 + w * 0.33)) / (w * 0.8));
  canvas.save(); canvas.scale(sc, sc, w / 2, gy);
  // Fond de la scène : un ciel doux, pour que les blocs du jeu derrière ne gênent pas
  balRect.set(w * 0.06, gy - w * 0.74, w * 0.94, gy + w * 0.07);
  balPaint.color = Color.WHITE; balPaint.shader = new LinearGradient(0, balRect.top, 0, balRect.bottom, PC('#3A4C7A'), PC('#7C6FA8'));
  canvas.drawRoundRect(balRect, w * 0.05, w * 0.05, balPaint); balPaint.shader = null;
  balStroke.color = Color.argb(70, 255, 255, 255); balStroke.strokeWidth = w * 0.005; canvas.drawRoundRect(balRect, w * 0.05, w * 0.05, balStroke);
  // Sol : petite estrade en bois
  balRect.set(w * 0.14, gy, w * 0.76, gy + w * 0.035); balPaint.color = PC('#8D5A34'); canvas.drawRoundRect(balRect, w * 0.012, w * 0.012, balPaint);
  balPaint.color = PC('#6B4224'); balRect.set(w * 0.14, gy + w * 0.025, w * 0.76, gy + w * 0.035); canvas.drawRect(balRect, balPaint);
  // Le perso : il se gonfle (plus large) quand il souffle, se redresse en prenant sa respiration
  const S = w * 0.28 / k, inh = balloonInhale(), blow = balloonBlowing() ? 0.5 + 0.5 * Math.sin(bal.br * 9) : 0;
  canvas.save(); canvas.translate(balloonHeroX(), gy); canvas.scale(S * (1 + 0.06 * blow - 0.03 * inh), S * (1 - 0.03 * blow + 0.07 * inh));
  drawCharacter(canvas, 0, 0, 0, 1, 1, true, danger > 0.6 || bal.popped, false);
  canvas.restore();
  // Joues gonflées pendant qu'il souffle
  if (blow > 0 && !bal.popped) { balPaint.color = Color.argb(Math.round(90 + 70 * blow), 255, 140, 160); canvas.drawCircle(mx - w * 0.024, my + w * 0.006, w * (0.018 + 0.01 * blow), balPaint); }
  // Reprise de souffle : de petits filets d'air qui rentrent par la bouche
  if (inh > 0) {
    balStroke.color = Color.argb(Math.round(200 * inh), 255, 255, 255); balStroke.strokeWidth = w * 0.006;
    const u = (bal.br % (BALLOON_BLOW + BALLOON_INHALE) - BALLOON_BLOW) / BALLOON_INHALE;
    for (let i = 0; i < 3; i++) {
      const d = w * (0.09 - 0.06 * u) + i * w * 0.018, a = -Math.PI * (0.62 + i * 0.1);
      const x0 = mx + Math.cos(a) * d, y0 = my + Math.sin(a) * d;
      canvas.drawLine(x0, y0, x0 + (mx - x0) * 0.3, y0 + (my - y0) * 0.3, balStroke);
    }
  }
  // Le ballon (ou ce qu'il en reste)
  if (bal.popped) drawBalloonPop(canvas);
  else {
    const r = balloonRadius();
    let [cx, cy] = balloonCenter(r), tilt = BALLOON_TILT;
    if (bal.flyT >= 0) {
      // Lâché : il se redresse, et s'envole en se balançant
      const up = bal.flyT * bal.flyT * w * 0.9 + bal.flyT * w * 0.25;
      cy -= up; cx += Math.sin(bal.flyT * 3) * w * 0.03; tilt *= Math.max(0, 1 - bal.flyT * 2.5);
    }
    // Il grossit par à-coups à chaque souffle, tremble près du seuil
    const puff = balloonBlowing() ? 0.015 * Math.sin(bal.br * 9) : 0;
    const wob = danger * 0.05 * Math.sin(time * 42), sx = 1 + wob + puff, sy = 1 - wob + puff;
    const col = mixColor(bal.color, 0xFFFFFFFF, 0.35 * danger);
    canvas.save(); canvas.translate(cx, cy); canvas.rotate(tilt); canvas.scale(sx, sy);
    if (bal.flyT >= 0) {
      balStroke.color = Color.argb(200, 255, 255, 255); balStroke.strokeWidth = w * 0.004;
      balPath.reset(); balPath.moveTo(0, r * 1.12); balPath.quadTo(Math.sin(time * 5) * w * 0.03, r * 1.12 + w * 0.08, 0, r * 1.12 + w * 0.16); canvas.drawPath(balPath, balStroke);
    }
    balRect.set(-r, -r * 1.12, r, r * 1.12);
    balPaint.color = Color.WHITE; balPaint.shader = new RadialGradient(-r * 0.35, -r * 0.45, r * 1.6, [mixColor(col, 0xFFFFFFFF, 0.35), col, shade(col, 0.62)], [0, 0.45, 1]);
    canvas.drawOval(balRect, balPaint); balPaint.shader = null;
    // Nœud (contre la bouche tant qu'il n'est pas lâché)
    balPath.reset(); balPath.moveTo(-r * 0.12 - w * 0.008, r * 1.12 + w * 0.02); balPath.lineTo(r * 0.12 + w * 0.008, r * 1.12 + w * 0.02); balPath.lineTo(0, r * 1.08); balPath.close();
    balPaint.color = shade(col, 0.75); canvas.drawPath(balPath, balPaint);
    // Reflets
    balPaint.color = Color.argb(170, 255, 255, 255); balRect.set(-r * 0.6, -r * 0.82, -r * 0.22, -r * 0.3); canvas.drawOval(balRect, balPaint);
    balPaint.color = Color.argb(120, 255, 255, 255); canvas.drawCircle(-r * 0.2, -r * 0.82, r * 0.07, balPaint);
    canvas.restore();
  }
  drawBalloonGauge(canvas, gy);
  canvas.restore();
}

/** Jauge de 0 à +12 à droite, et le gain actuel au-dessus. */
function drawBalloonGauge(canvas, gy) {
  const PC = Color.parseColor, x = w * 0.88, top = gy - w * 0.62, bw = w * 0.05, pts = bal.popped ? 0 : balloonPoints();
  balRect.set(x - bw / 2, top, x + bw / 2, gy); balPaint.color = Color.argb(110, 10, 15, 35); canvas.drawRoundRect(balRect, bw / 2, bw / 2, balPaint);
  const fillTop = gy - (gy - top) * (pts / BALLOON_MAX);
  if (pts > 0) {
    balRect.set(x - bw / 2, fillTop, x + bw / 2, gy);
    balPaint.color = Color.WHITE; balPaint.shader = new LinearGradient(0, gy, 0, top, [PC('#3DBE6E'), PC('#FFC93C'), PC('#FF7A45')], [0, 0.6, 1]);
    canvas.drawRoundRect(balRect, bw / 2, bw / 2, balPaint); balPaint.shader = null;
  }
  balStroke.color = Color.argb(150, 255, 255, 255); balStroke.strokeWidth = w * 0.004;
  for (let i = 1; i < BALLOON_MAX; i++) { const y = gy - (gy - top) * i / BALLOON_MAX, l = i % 4 === 0 ? bw * 0.5 : bw * 0.25; canvas.drawLine(x - bw / 2, y, x - bw / 2 + l, y, balStroke); }
  textPaint.textSize = w * 0.032;
  for (const v of [4, 8, 12]) canvas.drawText(String(v), x - bw * 1.4, gy - (gy - top) * v / BALLOON_MAX + w * 0.011, textPaint);
  if (bonusResult === 0 && bonusT >= bonusIntro) {
    textPaint.textSize = w * 0.075; textPaint.color = pts > 0 ? PC('#FFD54F') : Color.WHITE;
    canvas.drawText('+' + pts, x - bw * 0.3, top - w * 0.04, textPaint);
    textPaint.color = Color.WHITE;
  }
}

/** Éclatement : onde, éclats de caoutchouc qui volent et retombent, « POP ! ». */
function drawBalloonPop(canvas) {
  const r0 = w * 0.2, [cx, cy] = balloonCenter(balloonRadius()), t = bal.popT;
  if (t < 0.35) {
    const f = t / 0.35;
    balStroke.color = Color.argb(Math.round(230 * (1 - f)), 255, 255, 255); balStroke.strokeWidth = w * 0.012 * (1 - f);
    canvas.drawCircle(cx, cy, r0 * (0.6 + f * 0.9), balStroke);
    for (let i = 0; i < 12; i++) {
      const an = i / 12 * Math.PI * 2, a = r0 * (0.7 + f * 0.6), b = r0 * (0.95 + f * 0.8);
      canvas.drawLine(cx + Math.cos(an) * a, cy + Math.sin(an) * a, cx + Math.cos(an) * b, cy + Math.sin(an) * b, balStroke);
    }
  }
  for (const s of bal.shards) {
    canvas.save(); canvas.translate(s.x, s.y); canvas.rotate(s.rot);
    balPath.reset(); balPath.moveTo(-s.s, -s.s * 0.4); balPath.quadTo(0, -s.s, s.s, -s.s * 0.2); balPath.lineTo(s.s * 0.3, s.s * 0.5); balPath.close();
    balPaint.color = bal.color; canvas.drawPath(balPath, balPaint);
    canvas.restore();
  }
  if (t < 1.1) {
    const pop = Math.min(1, t / 0.15), fade = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.3;
    textPaint.textSize = w * 0.13 * (0.6 + 0.4 * pop);
    textPaint.color = Color.argb(Math.round(255 * fade), 255, 230, 90);
    canvas.drawText(tr('bonus.balloon.pop'), cx, cy + w * 0.04, textPaint);
    textPaint.color = Color.WHITE;
  }
}
