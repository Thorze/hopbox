'use strict';
// « Ralenti de la mort » (version web d'essai) : sur l'écran de fin, si la partie s'est terminée sur un
// saut raté, un bouton rejoue ce dernier saut. Le saut repart à vitesse normale, passe au ralenti avant
// l'impact avec un zoom, une croix au point d'atterrissage, la cible en vert, un verdict (trop court /
// trop long / à côté) et un médaillon en vue de profil (les deux blocs en coupe et l'arc du saut).

let lastJumpSnap = null;   // dernier saut lancé (départ, force, durée, hauteur, figure)
let deathSnap = null;      // dernier saut RATÉ qui a fait tomber (null si la chute vient d'ailleurs)
const death = { open: false, t: 0, lastTime: 0, paused: false, drag: false, bar: null };
const deathPaint = new Paint();
const deathStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const deathText = new Paint({ textAlign: Align.CENTER, bold: true, color: Color.WHITE });

const DR_PAUSE = 0.45;      // pause sur le bloc de départ
const DR_SLOW_AT = 0.5;     // fraction du saut à partir de laquelle on passe au ralenti
const DR_SLOW = 0.25;       // vitesse du ralenti
const DR_FALL = 1.0;        // durée de la chute montrée après l'impact (au ralenti)

/** Appelé au lancement de chaque saut. */
function snapJump() {
  // (bloc visé : sa phase de mouvement au départ, pour qu'il bouge au même rythme pendant le replay)
  lastJumpSnap = { fromBlock: current, target: next, phase0: next.movePhase, fromX: px, fromZ: pz, alongX, dist: jumpDist, dur: jumpDuration, hgt: jumpHeight, trick: jumpTrick, ratio: lastJumpRatio };
}

/** Appelé quand un saut raté fait tomber : on garde la scène pour le ralenti. */
function snapDeath() {
  if (!lastJumpSnap) { deathSnap = null; return; }
  const j = lastJumpSnap, ax = j.alongX;
  const land = (ax ? j.fromX : j.fromZ) + j.dist;
  const c = ax ? next.cx : next.cz, side = ax ? next.cz : next.cx, me = ax ? pz : px;
  let verdict, gap;
  if (Math.abs(me - side) > next.half) { verdict = 'side'; gap = Math.abs(me - side) - next.half; }
  else if (land < c - next.half) { verdict = 'short'; gap = c - next.half - land; }
  else { verdict = 'long'; gap = land - (c + next.half); }
  deathSnap = {
    ...j, landX: px, landZ: pz, verdict, gap,
    next, nextOffset: next.offset, cur: j.fromBlock || current, curDropY: (j.fromBlock || current).dropY,
    // Force idéale (centre de la cible) et plage qui aurait marché, en part de la jauge
    ideal: clamp((c - (ax ? j.fromX : j.fromZ)) / maxReach, 0, 1),
    okMin: clamp((c - next.half - (ax ? j.fromX : j.fromZ)) / maxReach, 0, 1),
    okMax: clamp((c + next.half - (ax ? j.fromX : j.fromZ)) / maxReach, 0, 1),
  };
}

/** Appelé quand on glisse hors d'un bloc de glace : le saut, puis la glissade jusqu'au bord. */
function snapIceDeath() {
  if (!lastJumpSnap) { deathSnap = null; return; }
  const j = lastJumpSnap, ax = j.alongX, from = ax ? j.fromX : j.fromZ, c = ax ? current.cx : current.cz, h0 = current.half;
  deathSnap = {
    ...j, landX: px, landZ: pz, verdict: 'ice', gap: Math.abs(ice.to - c) - h0,
    next: current, nextOffset: current.offset, cur: j.fromBlock || current, curDropY: (j.fromBlock || current).dropY,
    slideFrom: ice.from, slideTo: ice.to,
    // Sur la glace, il faut se poser assez tôt pour que la glissade reste sur le bloc
    ideal: clamp((c - h0 * ICE_SLIDE / 2 - from) / maxReach, 0, 1),
    okMin: clamp((c - h0 - from) / maxReach, 0, 1),
    okMax: clamp((c + h0 * (1 - ICE_SLIDE) - from) / maxReach, 0, 1),
  };
}

const DR_SLIDE = ICE_SLIDE_TIME / 0.5;   // glissade montrée au ralenti (×0,5)

function openDeathReplay() { if (!deathSnap) return; Object.assign(death, { open: true, t: 0, lastTime: time, paused: false, drag: false }); }

/** Durée totale du replay (pause + saut + ralenti + chute), et début du ralenti. */
function deathTotal() { const d = deathSnap; return DR_PAUSE + d.dur * DR_SLOW_AT + d.dur * (1 - DR_SLOW_AT) / DR_SLOW + (d.slideTo != null ? DR_SLIDE : 0) + DR_FALL / 0.5; }
function deathSlowStart() { return DR_PAUSE + deathSnap.dur * DR_SLOW_AT; }

/** Curseur de temps : toucher ou glisser sur la barre = se placer à ce moment (lecture en pause). */
function deathSeek(x) {
  const b = death.bar; if (!b) return;
  death.t = clamp((x - b.left) / (b.right - b.left), 0, 1) * deathTotal();
}
function deathPointerDown(x, y) {
  if (!death.open || !death.bar) return false;
  const b = death.bar;
  if (x >= b.left - w * 0.04 && x <= b.right + w * 0.04 && y >= b.top - w * 0.05 && y <= b.bottom + w * 0.05) {
    death.drag = true; death.paused = true; deathSeek(x); return true;
  }
  return false;
}
function deathPointerMove(x) { if (death.drag) deathSeek(x); }
function deathPointerUp() { death.drag = false; }
function closeDeathReplay() { death.open = false; }

/** Temps « réel » du replay -> temps du saut (ralenti en fin de saut et pendant la chute). */
function deathTimeline(t) {
  const d = deathSnap, slowStart = DR_PAUSE + d.dur * DR_SLOW_AT;
  if (t < DR_PAUSE) return { phase: 'wait', f: 0 };
  if (t < slowStart) return { phase: 'jump', f: (t - DR_PAUSE) / d.dur, slow: 0 };
  const rest = d.dur * (1 - DR_SLOW_AT) / DR_SLOW;
  if (t < slowStart + rest) return { phase: 'jump', f: DR_SLOW_AT + (t - slowStart) * DR_SLOW / d.dur, slow: 1 };
  let after = t - slowStart - rest;
  if (d.slideTo != null) {
    if (after < DR_SLIDE) return { phase: 'slide', f: 1, s: after / DR_SLIDE, slow: 1 };
    after -= DR_SLIDE;
  }
  const ft = after * 0.5;
  return { phase: ft < DR_FALL ? 'fall' : 'end', f: 1, ft: Math.min(ft, DR_FALL), slow: 1 };
}

/** Temps de jeu correspondant au moment du replay (0 = départ du saut, d.dur = impact). */
function deathGameTime(d, tl) {
  if (tl.phase === 'wait') return death.t - DR_PAUSE;
  if (tl.phase === 'jump') return tl.f * d.dur;
  if (tl.phase === 'slide') return d.dur + tl.s * ICE_SLIDE_TIME;
  return d.dur + (d.slideTo != null ? ICE_SLIDE_TIME : 0) + tl.ft;
}

/** Position du bloc visé à ce moment du replay : un bloc mobile bouge en suivant la barre de temps. */
function deathTargetOffset(d, tl) {
  const pl = d.next;
  if (pl.kind !== Kind.MOVING || d.target !== pl) return d.nextOffset;
  let g = deathGameTime(d, tl);
  // Glace : posé sur le bloc, il s'arrête à l'atterrissage
  if (d.slideTo != null) g = Math.min(g, d.dur);
  return Math.sin(d.phase0 + g * pl.moveSpeed) * pl.moveAmp;
}

const DR_TEXT = {
  short: ['death.short', 'death.short_small', 'death.short_big'],
  long: ['death.long', 'death.long_small', 'death.long_big'],
  side: ['death.side', 'death.side_small', 'death.side_big'],
  ice: ['death.ice', 'death.ice_small', 'death.ice_big'],
};

function drawDeathReplay(canvas) {
  if (!death.open) return;
  if ((state !== State.GAME_OVER && state !== State.QUEST_END) || !deathSnap) { death.open = false; return; }
  const dt = Math.min(0.05, Math.max(0, time - death.lastTime)); death.lastTime = time;
  if (!death.paused) death.t = Math.min(death.t + dt, deathTotal());
  const d = deathSnap, tl = deathTimeline(death.t);
  buttons.length = 0;
  // --- La scène rejouée ---
  const save = { px, py, pz, camX, camY, state, jumpT, jumpDuration, jumpTrick, alongX, fallT, fallAnim, shakeX, shakeY, scareT, nOff: d.next.offset, cDrop: d.cur.dropY, landSquash };
  const from0 = d.alongX ? d.fromX : d.fromZ;
  let pos = from0 + d.dist * tl.f;
  if (tl.phase === 'slide') { const e = 1 - (1 - tl.s) * (1 - tl.s); pos = d.slideFrom + (d.slideTo - d.slideFrom) * e; }
  else if ((tl.phase === 'fall' || tl.phase === 'end') && d.slideTo != null) pos = d.slideTo;
  px = d.alongX ? pos : d.landX; pz = d.alongX ? d.landZ : pos;
  if (tl.phase === 'wait') { px = d.fromX; pz = d.fromZ; }
  py = tl.phase === 'jump' ? 4 * d.hgt * tl.f * (1 - tl.f) : 0;   // (glissade : au sol)
  if (tl.phase === 'fall' || tl.phase === 'end') { const ft = tl.ft; py = -15 * ft * ft; }
  alongX = d.alongX; jumpTrick = d.trick; jumpDuration = d.dur; jumpT = tl.f * d.dur;
  state = tl.phase === 'jump' ? State.JUMPING : (tl.phase === 'wait' || tl.phase === 'slide' ? State.READY : State.FALLING);
  fallAnim = 'panic'; fallT = tl.ft || 0; scareT = 0; landSquash = 0; shakeX = 0; shakeY = 0;
  d.next.offset = deathTargetOffset(d, tl); d.cur.dropY = d.curDropY;
  // Caméra entre le départ et le point d'arrivée, puis zoom pendant le ralenti
  const mx = (d.fromX + d.landX) / 2, mz = (d.fromZ + d.landZ) / 2;
  camX = isoX(mx, mz); camY = isoY(mx, 0, mz) + h * 0.12;
  const zoomQ = tl.phase === 'jump' ? tl.slow * clamp((tl.f - DR_SLOW_AT) / (1 - DR_SLOW_AT), 0, 1) : (tl.phase === 'wait' ? 0 : 1);
  const zoom = 1 + 0.55 * zoomQ * zoomQ * (3 - 2 * zoomQ);
  const zx = sx(d.landX, d.landZ), zy = sy(d.landX, 0, d.landZ);
  const band = insetTop + w * 0.2, bottomBand = ub() - w * 0.74;
  canvas.save();
  canvas.clipRect(0, band, w, bottomBand);
  canvas.scale(zoom, zoom, zx, zy);
  if (!drawChapterBackdrop(canvas) && !drawSpaceBackdrop(canvas) && !drawIslandBackdrop(canvas) && !drawForestBackdrop(canvas) && !drawBaseBackdrop(canvas) && !drawAlienBackdrop(canvas) && !drawUnderwaterBackdrop(canvas) && !drawPolarBackdrop(canvas) && !drawNukeBackdrop(canvas)) drawSky(canvas);
  const order = platforms.slice().sort((a, b) => b.farDepth - a.farDepth);
  let drawn = false;
  for (const p of order) {
    if (!drawn && px + pz > p.farDepth) { drawPlayer(canvas); drawn = true; }
    p.draw(canvas);
  }
  if (!drawn) drawPlayer(canvas);
  // Cible en vert (centre du bloc visé) et croix rouge au point d'impact
  const ringA = tl.phase === 'wait' ? 0 : 1;
  if (ringA > 0) {
    const tx = sx(d.next.cx, d.next.cz), ty = sy(d.next.cx, 0, d.next.cz), r = k * 0.32 * (1 + 0.08 * Math.sin(time * 6));
    deathStroke.color = Color.argb(230, 80, 220, 120); deathStroke.strokeWidth = k * 0.06;
    canvas.drawOval(new RectF(tx - r * 1.22, ty - r * 0.71, tx + r * 1.22, ty + r * 0.71), deathStroke);
  }
  // Glace : point où l'on s'est posé (rond blanc), puis la croix au bout de la glissade
  if (d.slideTo != null && (tl.phase === 'slide' || tl.phase === 'fall' || tl.phase === 'end')) {
    const ux = d.alongX ? d.slideFrom : d.landX, uz = d.alongX ? d.landZ : d.slideFrom;
    deathStroke.color = Color.WHITE; deathStroke.strokeWidth = k * 0.05;
    const tx = sx(ux, uz), ty = sy(ux, 0, uz), r = k * 0.12;
    canvas.drawOval(new RectF(tx - r * 1.22, ty - r * 0.71, tx + r * 1.22, ty + r * 0.71), deathStroke);
  }
  if (tl.phase !== 'wait' && (tl.phase !== 'jump' || tl.f >= DR_SLOW_AT) && (d.slideTo == null || tl.phase !== 'jump')) {
    const cx = sx(d.landX, d.landZ), cy = sy(d.landX, 0, d.landZ), s = k * 0.22;
    deathStroke.color = Color.argb(255, 120, 0, 10); deathStroke.strokeWidth = k * 0.12;
    canvas.drawLine(cx - s, cy - s * 0.58, cx + s, cy + s * 0.58, deathStroke); canvas.drawLine(cx - s, cy + s * 0.58, cx + s, cy - s * 0.58, deathStroke);
    deathStroke.color = Color.parseColor('#FF3B3B'); deathStroke.strokeWidth = k * 0.07;
    canvas.drawLine(cx - s, cy - s * 0.58, cx + s, cy + s * 0.58, deathStroke); canvas.drawLine(cx - s, cy + s * 0.58, cx + s, cy - s * 0.58, deathStroke);
  }
  canvas.restore();
  ({ px, py, pz, camX, camY, state, jumpT, jumpDuration, jumpTrick, alongX, fallT, fallAnim, shakeX, shakeY, scareT, landSquash } = save);
  d.next.offset = save.nOff; d.cur.dropY = save.cDrop;
  // Bandes noires façon cinéma + « RALENTI » qui clignote
  deathPaint.shader = null; deathPaint.color = Color.argb(255, 8, 8, 14);
  canvas.drawRect(0, 0, w, band, deathPaint);
  canvas.drawRect(0, bottomBand, w, h, deathPaint);
  deathText.textSize = w * 0.06; deathText.color = Color.WHITE;
  canvas.drawText(fitText('🎬 ' + tr('death.title'), deathText, w * 0.8), w / 2, insetTop + w * 0.085, deathText);
  if (tl.slow && tl.phase === 'jump' && Math.sin(time * 8) > -0.3) {
    deathText.textSize = w * 0.035; deathText.color = Color.parseColor('#FF5A5A');
    canvas.drawText('● ' + tr('death.slowmo') + ' ×' + DR_SLOW, w / 2, insetTop + w * 0.155, deathText);
  }
  // Verdict après l'impact
  const landed = tl.phase === 'fall' || tl.phase === 'end' || (tl.phase === 'slide' && tl.s > 0.85);
  if (landed) {
    const q = clamp((tl.ft || 0) / 0.25, 0, 1), keys = DR_TEXT[d.verdict];
    const sub = d.gap < 0.15 ? keys[1] : d.gap > 0.6 ? keys[2] : null;
    deathText.textSize = w * 0.1 * (1.3 - 0.3 * q); deathText.color = Color.parseColor('#FF4D4D');
    deathText.setShadowLayer(w * 0.01, 0, w * 0.006, Color.argb(200, 0, 0, 0));
    canvas.drawText(fitText(tr(keys[0]), deathText, w * 0.9), w / 2, band + w * 0.14, deathText);
    deathText.shadow = null;
    if (sub) {
      deathText.textSize = w * 0.045; deathText.color = Color.WHITE;
      deathText.setShadowLayer(w * 0.008, 0, w * 0.004, Color.argb(200, 0, 0, 0));
      canvas.drawText(fitText(tr(sub), deathText, w * 0.9), w / 2, band + w * 0.21, deathText);
      deathText.shadow = null;
    }
  }
  // Vue de profil : le bloc visé à la même position que dans la scène (il suit la barre de temps)
  const liveOff = d.next.offset; d.next.offset = deathTargetOffset(d, tl);
  drawSideView(canvas, new RectF(w * 0.05, bottomBand + w * 0.04, w * 0.95, ub() - w * 0.27), tl);
  d.next.offset = liveOff;
  drawDeathTimeline(canvas, ub() - w * 0.205);
  // Boutons
  const by = ub() - w * 0.15, bh = w * 0.1;
  drawButton(canvas, new RectF(w * 0.06, by, w * 0.48, by + bh), '↻ ' + tr('death.again'), backBtnPaint, w * 0.045, () => { death.t = 0; death.paused = false; });
  drawButton(canvas, new RectF(w * 0.52, by, w * 0.94, by + bh), tr('death.close'), greyBtnPaint, w * 0.045, () => closeDeathReplay());
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}

/** Barre de temps : bouton lecture/pause, zone du ralenti en rouge, impact, curseur à déplacer au doigt. */
function drawDeathTimeline(canvas, cy) {
  const total = deathTotal(), p = deathPaint;
  // Lecture / pause
  const pr = w * 0.042, pcx = w * 0.1;
  const atEnd = death.t >= total - 1e-3;
  p.shader = null; p.color = Color.parseColor('#3F8EFC'); canvas.drawCircle(pcx, cy, pr, p);
  p.color = Color.WHITE;
  if (death.paused || atEnd) {
    tmpPath.reset(); tmpPath.moveTo(pcx - pr * 0.3, cy - pr * 0.45); tmpPath.lineTo(pcx + pr * 0.5, cy); tmpPath.lineTo(pcx - pr * 0.3, cy + pr * 0.45); tmpPath.close();
    canvas.drawPath(tmpPath, p);
  } else {
    canvas.drawRect(pcx - pr * 0.35, cy - pr * 0.4, pcx - pr * 0.1, cy + pr * 0.4, p);
    canvas.drawRect(pcx + pr * 0.1, cy - pr * 0.4, pcx + pr * 0.35, cy + pr * 0.4, p);
  }
  buttons.push({ rect: new RectF(pcx - pr * 1.3, cy - pr * 1.3, pcx + pr * 1.3, cy + pr * 1.3), action: () => {
    if (atEnd) { death.t = 0; death.paused = false; } else death.paused = !death.paused;
  } });
  // Barre
  const l = w * 0.19, r = w * 0.92, bh = w * 0.018;
  death.bar = new RectF(l, cy - bh / 2, r, cy + bh / 2);
  const X = (t) => l + (r - l) * clamp(t / total, 0, 1);
  p.color = Color.argb(90, 255, 255, 255); canvas.drawRoundRect(death.bar, bh / 2, bh / 2, p);
  // Zone du ralenti (de la mi-saut à la fin de la chute) et moment de l'impact
  const slowS = deathSlowStart(), impact = slowS + deathSnap.dur * (1 - DR_SLOW_AT) / DR_SLOW;
  p.color = Color.argb(150, 255, 77, 77); canvas.drawRoundRect(new RectF(X(slowS), cy - bh / 2, r, cy + bh / 2), bh / 2, bh / 2, p);
  p.color = Color.parseColor('#3F8EFC'); canvas.drawRoundRect(new RectF(l, cy - bh / 2, X(death.t), cy + bh / 2), bh / 2, bh / 2, p);
  p.color = Color.WHITE; canvas.drawRect(X(impact) - w * 0.003, cy - bh * 1.4, X(impact) + w * 0.003, cy + bh * 1.4, p);
  deathText.textSize = w * 0.026; deathText.color = Color.argb(200, 255, 255, 255);
  canvas.drawText('💥', X(impact), cy - bh * 1.8, deathText);
  // Curseur
  const kx = X(death.t), kr = w * (death.drag ? 0.03 : 0.024);
  p.color = Color.argb(80, 0, 0, 0); canvas.drawCircle(kx, cy + w * 0.004, kr, p);
  p.color = Color.WHITE; canvas.drawCircle(kx, cy, kr, p);
  p.color = Color.parseColor('#3F8EFC'); canvas.drawCircle(kx, cy, kr * 0.45, p);
}

/** Médaillon en vue de profil : coupe le long du saut, les deux blocs, l'arc, l'impact et la jauge. */
function drawSideView(canvas, r, tl) {
  const d = deathSnap, ax = d.alongX, p = deathPaint, st = deathStroke;
  p.shader = null;
  drawCard(canvas, r.left, r.top, r.right, r.bottom, '', w * 0.04);
  const from = ax ? d.fromX : d.fromZ, touch = from + d.dist, land = d.slideTo != null ? d.slideTo : touch;
  const cC = ax ? d.cur.cx : d.cur.cz, nC = ax ? d.next.cx : d.next.cz;
  let lo = Math.min(cC - d.cur.half, from, land) - 0.5, hi = Math.max(nC + d.next.half, land) + 0.5;
  // Coupe en haut du médaillon, jauge de force en bas
  const rp = new RectF(r.left, r.top, r.right, r.bottom - w * 0.13);
  const ground = rp.bottom - rp.height() * 0.22, pad = w * 0.05;
  const sc = Math.min((rp.width() - 2 * pad) / (hi - lo), (ground - rp.top - w * 0.08) / Math.max(1.2, d.hgt * 1.15));
  const cx0 = rp.centerX() - ((lo + hi) / 2 - lo) * sc;
  const X = (u) => cx0 + (u - lo) * sc, Y = (y) => ground - y * sc;
  canvas.save(); canvas.clipRect(rp.left, rp.top, rp.right, rp.bottom);
  // Vide en dessous
  p.color = Color.argb(120, 8, 12, 30); canvas.drawRect(rp.left + w * 0.006, ground + w * 0.035, rp.right - w * 0.006, rp.bottom, p);
  // Blocs en coupe (le bloc visé est grisé s'il était à côté)
  const block = (c, half, color, alpha) => {
    p.color = Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    canvas.drawRoundRect(new RectF(X(c - half), Y(0), X(c + half), rp.bottom + w * 0.02), w * 0.012, w * 0.012, p);
    p.color = Color.argb(alpha, 255, 255, 255); canvas.drawRect(X(c - half), Y(0), X(c + half), Y(0) + w * 0.008, p);
  };
  block(cC, d.cur.half, shade(d.cur.baseColor, 0.85), 255);
  block(nC, d.next.half, shade(d.next.baseColor, 0.85), d.verdict === 'side' ? 110 : 255);
  // Zone d'atterrissage réussie en vert sur le bloc visé
  if (d.verdict !== 'side') {
    const okR = d.verdict === 'ice' ? nC + d.next.half * (1 - ICE_SLIDE) : nC + d.next.half;
    p.color = Color.argb(150, 80, 220, 120); canvas.drawRect(X(nC - d.next.half), Y(0) - w * 0.01, X(okR), Y(0), p);
  }
  // Glace : la glissade, flèche bleue au ras du bloc
  if (d.slideTo != null) {
    st.color = Color.parseColor('#3FA9F5'); st.strokeWidth = w * 0.008;
    canvas.drawLine(X(touch), Y(0) - w * 0.02, X(land), Y(0) - w * 0.02, st);
    canvas.drawLine(X(land), Y(0) - w * 0.02, X(land) - w * 0.018, Y(0) - w * 0.034, st);
    canvas.drawLine(X(land), Y(0) - w * 0.02, X(land) - w * 0.018, Y(0) - w * 0.006, st);
  }
  // Arc du saut en pointillés, et la position du personnage
  st.color = Color.argb(220, 225, 233, 255); st.strokeWidth = w * 0.006;
  for (let i = 0; i < 40; i += 2) {
    const f0 = i / 40, f1 = (i + 1) / 40;
    canvas.drawLine(X(from + d.dist * f0), Y(4 * d.hgt * f0 * (1 - f0)), X(from + d.dist * f1), Y(4 * d.hgt * f1 * (1 - f1)), st);
  }
  const f = tl.phase === 'wait' ? 0 : tl.f, fallY = tl.ft ? -15 * tl.ft * tl.ft : 0;
  let bu = from + d.dist * f;
  if (tl.phase === 'slide') bu = d.slideFrom + (d.slideTo - d.slideFrom) * (1 - (1 - tl.s) * (1 - tl.s));
  else if ((tl.phase === 'fall' || tl.phase === 'end') && d.slideTo != null) bu = d.slideTo;
  const bx = X(bu), byy = Y(tl.phase === 'jump' ? 4 * d.hgt * f * (1 - f) : fallY);
  p.color = Color.parseColor('#FF7A45'); const s = w * 0.022;
  canvas.drawRoundRect(new RectF(bx - s, byy - 2 * s, bx + s, byy), s * 0.35, s * 0.35, p);
  // Impact : croix rouge et écart jusqu'au bord
  const lx = X(land);
  st.color = Color.parseColor('#FF3B3B'); st.strokeWidth = w * 0.008;
  canvas.drawLine(lx - w * 0.015, Y(0) - w * 0.015, lx + w * 0.015, Y(0) + w * 0.015, st); canvas.drawLine(lx - w * 0.015, Y(0) + w * 0.015, lx + w * 0.015, Y(0) - w * 0.015, st);
  if (d.verdict !== 'side') {
    const edge = d.verdict === 'short' ? X(nC - d.next.half) : X(nC + d.next.half * (land >= nC ? 1 : -1)), yy = Y(0) + w * 0.045;
    st.color = Color.parseColor('#FF3B3B'); st.strokeWidth = w * 0.005;
    canvas.drawLine(lx, yy, edge, yy, st); canvas.drawLine(lx, yy - w * 0.012, lx, yy + w * 0.012, st); canvas.drawLine(edge, yy - w * 0.012, edge, yy + w * 0.012, st);
  }
  canvas.restore();
  // Titre du médaillon et jauge de force : ton appui et la plage qui aurait marché
  darkTextPaint.textAlign = Align.LEFT; darkTextPaint.textSize = w * 0.032;
  canvas.drawText(tr('death.side_view'), r.left + w * 0.035, r.top + w * 0.05, darkTextPaint);
  // Séparation, puis la jauge
  p.color = Color.argb(70, 150, 185, 255); canvas.drawRect(r.left + w * 0.02, rp.bottom, r.right - w * 0.02, rp.bottom + w * 0.004, p);
  const gl = r.left + w * 0.05, gr = r.right - w * 0.05, gy = r.bottom - w * 0.045, gh = w * 0.022;
  p.color = Color.argb(170, 8, 12, 30); canvas.drawRoundRect(new RectF(gl, gy, gr, gy + gh), gh / 2, gh / 2, p);
  if (d.verdict !== 'side') { p.color = Color.parseColor('#5BD07A'); canvas.drawRoundRect(new RectF(gl + (gr - gl) * d.okMin, gy, gl + (gr - gl) * d.okMax, gy + gh), gh / 2, gh / 2, p); }
  const mxp = gl + (gr - gl) * clamp(d.ratio, 0, 1);
  p.color = Color.parseColor('#FF3B3B'); canvas.drawRoundRect(new RectF(mxp - w * 0.006, gy - w * 0.012, mxp + w * 0.006, gy + gh + w * 0.012), w * 0.004, w * 0.004, p);
  greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = w * 0.028;
  canvas.drawText(fitText(tr('death.gauge'), greyTextPaint, (gr - gl) * 0.95), gl, gy - w * 0.025, greyTextPaint);
  darkTextPaint.textAlign = Align.CENTER; greyTextPaint.textAlign = Align.CENTER;
}

/** Bouton de l'écran de fin. */
function drawDeathButton(canvas, cx, cy) {
  if (!deathSnap) return 0;
  progText.textSize = w * 0.036;
  const label = '🎬 ' + tr('death.title'), bw = progText.measureText(label) + w * 0.08, bh = w * 0.075;
  const r = new RectF(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), dn = isPressed(r) ? w * 0.006 : 0;
  progPaint.shader = null; progPaint.color = Color.parseColor('#7A1020');
  canvas.drawRoundRect(new RectF(r.left, r.top + w * 0.008, r.right, r.bottom + w * 0.008), bh / 2, bh / 2, progPaint);
  progPaint.color = Color.parseColor(dn ? '#B81F33' : '#D7263D');
  canvas.drawRoundRect(new RectF(r.left, r.top + dn, r.right, r.bottom + dn), bh / 2, bh / 2, progPaint);
  progText.color = Color.WHITE; canvas.drawText(label, cx, cy + dn + w * 0.012, progText);
  buttons.push({ rect: r, action: () => openDeathReplay() });
  return bh;
}

// ---------- Passer la mort ----------
// Pendant l'animation de mort (chute sans vie de secours, foudre, avion, volcan, satellite), un toucher
// l'écran passe directement à l'écran de fin. Un court délai évite de la passer par un toucher réflexe.
const SKIP_DELAY = 0.35;
const skipText = new Paint({ bold: true, textAlign: Align.CENTER }), skipLine = new Paint({ bold: true, textAlign: Align.CENTER, style: Style.STROKE, strokeJoin: 'round' });

function deathSkippable() {
  if (state === State.FALLING) return !tuto.active && lives <= 0 && fallT > SKIP_DELAY;
  if (state === State.STRUCK) return strikeT > SKIP_DELAY;
  return false;
}

function skipDeath() {
  if (state === State.STRUCK) {
    // On saute à la fin de l'animation (le décor de l'écran de fin est celui d'après l'impact)
    const [end, reason] = doomKind === 1 ? [CRASH_IMPACT + 2, 'reason.plane'] : doomKind === 2 ? [VOLCANO_END, 'reason.volcano']
      : doomKind === 3 ? [SAT_END, 'reason.satellite'] : [2, 'reason.lightning'];
    strikeT = end;
    endGame(tr(reason));
  } else endGame(gameOverReason);
}

/** « Touche l'écran pour passer », en bas pendant une mort que l'on peut passer. */
function drawDeathSkipHint(canvas) {
  if (!deathSkippable()) return;
  const t = state === State.FALLING ? fallT : strikeT;
  const a = clamp((t - SKIP_DELAY) / 0.3, 0, 1) * (0.75 + 0.25 * Math.sin(time * 4));
  const y = ub() - w * 0.1, label = '⏩ ' + tr('death.skip');
  skipLine.textSize = skipText.textSize = w * 0.045;
  skipLine.strokeWidth = w * 0.009; skipLine.color = Color.argb(Math.round(170 * a), 20, 25, 45);
  canvas.drawText(label, w / 2, y, skipLine);
  skipText.color = Color.argb(Math.round(255 * a), 255, 255, 255);
  canvas.drawText(label, w / 2, y, skipText);
}
