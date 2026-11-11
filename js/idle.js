'use strict';
// Petites animations quand le joueur attend plus de 5 secondes (équivalent d'Idle.kt) :
// salto avant ou arrière, petits sauts, console de jeu, sieste avec des « Zzz », danse,
// regard à gauche et à droite, bulle de chewing-gum, étirement, impatience.
// Tirées au hasard (jamais deux fois de suite la même) ; toucher l'écran les interrompt.

const IdleAnim = { NONE: -1, FRONTFLIP: 0, BACKFLIP: 1, HOPS: 2, CONSOLE: 3, SLEEP: 4, DANCE: 5, LOOK: 6, GUM: 7, STRETCH: 8, IMPATIENT: 9, SELFIE: 10, BALLOON: 11, YOYO: 12, JUMPROPE: 13 };
const IDLE_DURATION = [1.0, 1.0, 1.5, 5.0, 6.5, 3.2, 2.6, 3.4, 1.9, 2.8, 3.4, 4.6, 3.8, 3.6];
const BALLOON_COLORS = [0xFFE53950, 0xFF3F8EFC, 0xFFFFC93C, 0xFF3DBE6E, 0xFF8E5CD9, 0xFFFF7AB6];
const IDLE_FIRST = 5;
const idle = {
  t: 0, anim: -1, at: 0, next: IDLE_FIRST, last: -1, emit: 0, popped: false,
  lift: 0, dx: 0, rot: 0, flipX: 1, sW: 1, sH: 1, front: false, turn: false, shut: false,
};
let eyesShut = false;

function idleClearPose() {
  Object.assign(idle, { lift: 0, dx: 0, rot: 0, flipX: 1, sW: 1, sH: 1, front: false, turn: false, shut: false });
}
function idleReset() { idle.t = 0; idle.anim = -1; idle.next = IDLE_FIRST; idleClearPose(); }
function idleActive() { return idle.anim !== -1 && state === State.READY; }

function updateIdle(dt) {
  const waiting = state === State.READY && !pendingBounce && !arrivalBusy() && !ice.sliding && py === 0 && scareT <= 0;
  if (!waiting) { if (idle.t > 0 || idle.anim !== -1) idleReset(); return; }
  idle.t += dt;
  if (idle.anim === -1) {
    if (idle.t >= idle.next) {
      let a;
      do a = rndInt(IDLE_DURATION.length); while (a === idle.last);
      Object.assign(idle, { anim: a, last: a, at: 0, emit: 0, popped: false, color: BALLOON_COLORS[rndInt(BALLOON_COLORS.length)] });
    }
  } else {
    idle.at += dt;
    idleEffects(dt);
    if (idle.at >= IDLE_DURATION[idle.anim]) { idle.anim = -1; idle.next = idle.t + 3 + rnd() * 3; }
  }
  computeIdlePose();
}

function idleEffects(dt) {
  const at = idle.at, prev = at - dt, crossed = (x) => prev < x && at >= x;
  const x = sx(px, pz) + camX, top = sy(px, shapeHeight(1) + 0.2, pz) + camY;
  switch (idle.anim) {
    case IdleAnim.FRONTFLIP: case IdleAnim.BACKFLIP:
      if (crossed(0.15)) sounds.play('JUMP', 0.45, 1.2);
      if (crossed(0.85)) { sounds.play('LAND', 0.5); spawnDust(px, pz); }
      break;
    case IdleAnim.HOPS:
      for (let i = 0; i < 3; i++) if (crossed(i * 0.5 + 0.02)) sounds.play('JUMP', 0.3, 1.5 + i * 0.1);
      break;
    case IdleAnim.DANCE:
      idle.emit -= dt;
      if (idle.emit <= 0) {
        idle.emit = 0.35;
        particles.push(mkParticle(x + (rnd() - 0.5) * k * 0.6, top, (rnd() - 0.5) * k * 0.5, -k * 0.9, 1.1, k * 0.1,
          Color.parseColor(['#3F8EFC', '#8E5CD9', '#E53950', '#3DBE6E'][rndInt(4)]), 0, PK.NOTE));
      }
      break;
    case IdleAnim.CONSOLE:
      idle.emit -= dt;
      if (idle.emit <= 0 && at > 0.5 && at < 4.4) { idle.emit = 0.5 + rnd() * 0.5; sounds.play('TAP', 0.15, 1.6 + rnd() * 0.6); }
      break;
    case IdleAnim.GUM:
      if (!idle.popped && at >= 2.6) {
        idle.popped = true;
        sounds.play('TAP', 0.6, 0.7);
        spawnSparkles(x, sy(px, shapeHeight(1) * 0.4, pz) + camY + k * 0.25, Color.parseColor('#FF7AB6'), 14);
      }
      break;
    case IdleAnim.SLEEP:
      if (crossed(6.0)) sounds.play('SCARE', 0.35);
      break;
    case IdleAnim.SELFIE: if (crossed(1.6)) sounds.play('CLICK', 0.7, 1.3); break;
    case IdleAnim.BALLOON:
      for (let i = 0; i < 4; i++) if (crossed(0.45 + i * 0.5)) sounds.play('TAP', 0.15, 0.6 + i * 0.08);
      if (crossed(2.6)) sounds.play('JUMP', 0.3, 1.8);
      break;
    case IdleAnim.JUMPROPE:
      if (Math.floor(prev * 1.7) !== Math.floor(at * 1.7) && at > 0.3) sounds.play('TAP', 0.18, 1.4);
      break;
    default: break;
  }
}

function computeIdlePose(s = idle) {
  Object.assign(s, { lift: 0, dx: 0, rot: 0, flipX: 1, sW: 1, sH: 1, front: false, turn: false, shut: false });
  if (s.anim === -1) return;
  const at = s.at, f = clamp(at / IDLE_DURATION[s.anim], 0, 1), dirSign = alongX ? 1 : -1;
  const ease = (q) => q * q * (3 - 2 * q);
  switch (s.anim) {
    case IdleAnim.FRONTFLIP: case IdleAnim.BACKFLIP:
      if (f < 0.15) { const q = Math.sin(f / 0.15 * Math.PI); s.sH = 1 - 0.3 * q; s.sW = 1 + 0.12 * q; }
      else if (f < 0.85) {
        const q = (f - 0.15) / 0.7;
        s.lift = 4 * 1.1 * q * (1 - q);
        s.rot = 360 * ease(q) * dirSign * (s.anim === IdleAnim.BACKFLIP ? -1 : 1);
        s.sH = 1.08; s.sW = 0.95;
      } else { const q = Math.sin((f - 0.85) / 0.15 * Math.PI); s.sH = 1 - 0.22 * q; s.sW = 1 + 0.1 * q; }
      break;
    case IdleAnim.HOPS: {
      const ph = (at / 0.5) % 1;
      s.lift = 4 * 0.32 * ph * (1 - ph);
      if (ph > 0.9 || ph < 0.05) { s.sH = 0.85; s.sW = 1.07; } else { s.sH = 1.06; s.sW = 0.97; }
      break;
    }
    case IdleAnim.CONSOLE: s.front = true; s.sH = 1 + 0.015 * Math.sin(at * 9); break;
    case IdleAnim.SLEEP:
      s.front = true;
      if (at < 6.0) {
        s.shut = true;
        const b = Math.sin(at * 2.4);
        s.sH = 1 + 0.045 * b; s.sW = 1 - 0.02 * b; s.rot = Math.sin(at * 0.8) * 4;
      } else { const q = (at - 6.0) / 0.5; s.lift = 4 * 0.25 * q * (1 - q); }
      break;
    case IdleAnim.DANCE: {
      const b = Math.sin(at * 7.5);
      s.rot = b * 14; s.dx = b * k * 0.08; s.lift = Math.abs(b) * 0.1; s.turn = (at % 1.6) > 0.8;
      break;
    }
    case IdleAnim.LOOK: s.turn = at >= 0.6 && at <= 1.3; if (at >= 1.9) s.front = true; break;
    case IdleAnim.GUM: s.front = true; break;
    case IdleAnim.STRETCH: {
      const q = Math.sin(f * Math.PI);
      s.sH = 1 + 0.3 * q; s.sW = 1 - 0.13 * q; s.front = f >= 0.2 && f <= 0.8; s.shut = f >= 0.3 && f <= 0.75;
      break;
    }
    case IdleAnim.IMPATIENT: s.front = true; s.lift = Math.abs(Math.sin(at * 13)) * 0.04; break;
    case IdleAnim.SELFIE: {
      s.front = true;
      const tilt = clamp((at - 0.5) / 0.4, 0, 1) * clamp((2.2 - at) / 0.3, 0, 1);
      s.rot = -9 * tilt;
      if (at >= 2.3 && at <= 2.8) { const q = (at - 2.3) / 0.5; s.lift = 4 * 0.2 * q * (1 - q); }
      break;
    }
    case IdleAnim.BALLOON:
      s.front = true;
      if (at < 2.5) { const b = Math.abs(Math.sin(at * Math.PI * 2)); s.sW = 1 + 0.06 * b; s.sH = 1 - 0.03 * b; }
      if (at > 2.6) s.lift = Math.abs(Math.sin((at - 2.6) * 9)) * 0.06 * clamp((4.6 - at) / 2, 0, 1);
      break;
    case IdleAnim.YOYO: s.front = true; break;
    case IdleAnim.JUMPROPE: {
      s.front = true;
      const c = 0.5 + 0.5 * Math.cos(at * 1.7 * 2 * Math.PI);
      s.lift = 0.26 * c * c;
      if (c < 0.1) { s.sH = 0.92; s.sW = 1.04; }
      break;
    }
    default: break;
  }
}

/** Accessoires dessinés devant le personnage : console, « Zzz », chewing-gum, bulles. */
function drawIdleExtras(canvas, ox, oy, bodyH) {
  if (!idleActive()) return;
  const s = idle, at = s.at, y0 = s.lift, headY = oy + isoY(0, y0 + bodyH + 0.5, 0), p = accPaint;
  switch (s.anim) {
    case IdleAnim.CONSOLE: {
      const show = clamp(at / 0.35, 0, 1) * clamp((IDLE_DURATION[IdleAnim.CONSOLE] - at) / 0.35, 0, 1);
      if (show <= 0) return;
      const a = Math.round(255 * show), cw = k * 0.46, ch = k * 0.6, cx = ox;
      const cy = oy + isoY(0, y0 + bodyH * 0.3, 0) + k * 0.16 + (1 - show) * k * 0.3;
      p.color = Color.argb(a, 120, 126, 140);
      rect.set(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2); canvas.drawRoundRect(rect, cw * 0.15, cw * 0.15, p);
      p.color = Color.argb(a, 205, 208, 214);
      rect.set(cx - cw / 2 + k * 0.02, cy - ch / 2 + k * 0.02, cx + cw / 2 - k * 0.02, cy + ch / 2 - k * 0.02); canvas.drawRoundRect(rect, cw * 0.12, cw * 0.12, p);
      const flick = 0.85 + 0.15 * Math.sin(time * 23);
      p.color = Color.argb(a, Math.round(120 * flick), Math.round(190 * flick), Math.round(90 * flick));
      canvas.drawRect(cx - cw * 0.36, cy - ch * 0.4, cx + cw * 0.36, cy - ch * 0.02, p);
      p.color = Color.argb(a, 40, 70, 40);
      const jx = cx - cw * 0.25 + ((time * 0.6) % 1) * cw * 0.5, jy = cy - ch * 0.12 - Math.abs(Math.sin(time * 6)) * ch * 0.18;
      canvas.drawRect(jx - k * 0.02, jy - k * 0.02, jx + k * 0.02, jy + k * 0.02, p);
      canvas.drawRect(cx - cw * 0.36, cy - ch * 0.08, cx + cw * 0.36, cy - ch * 0.04, p);
      p.color = Color.argb(a, 45, 48, 58);
      canvas.drawRect(cx - cw * 0.32, cy + ch * 0.16, cx - cw * 0.12, cy + ch * 0.22, p);
      canvas.drawRect(cx - cw * 0.25, cy + ch * 0.09, cx - cw * 0.19, cy + ch * 0.29, p);
      p.color = Color.argb(a, 200, 40, 90);
      canvas.drawCircle(cx + cw * 0.2, cy + ch * 0.15, k * 0.04 * (Math.sin(time * 11) > 0.6 ? 0.7 : 1), p);
      canvas.drawCircle(cx + cw * 0.3, cy + ch * 0.24, k * 0.04, p);
      break;
    }
    case IdleAnim.SLEEP:
      if (at < 6.0) {
        for (let i = 0; i < 3; i++) {
          const q = (at * 0.45 + i / 3) % 1;
          if (at < 0.8 && q > at / 0.8) continue;
          const x = ox + k * (0.25 + q * 0.45) + Math.sin(q * 7 + i) * k * 0.07, y = headY - k * 0.1 - q * k * 1.1;
          bangPaint.color = Color.parseColor('#3F5BA9');
          bangPaint.alpha = clamp(Math.round(255 * (1 - q) * 1.2), 0, 255);
          bangPaint.textSize = k * (0.26 + 0.36 * q);
          canvas.drawText(i % 2 === 0 ? 'Z' : 'z', x, y, bangPaint);
        }
        bangPaint.color = Color.parseColor('#E53950');
      } else drawBubble(canvas, ox, headY, '!');
      break;
    case IdleAnim.GUM:
      if (at > 0.3 && at < 2.6) {
        const q = clamp((at - 0.3) / 2.3, 0, 1);
        const r = k * (0.05 + 0.33 * q * q) * (1 + 0.04 * Math.sin(time * 12));
        const cy = oy + isoY(0, y0 + bodyH * 0.4, 0) + k * 0.22;
        p.color = Color.argb(225, 255, 122, 182); canvas.drawCircle(ox, cy, r, p);
        p.color = Color.argb(150, 255, 255, 255); canvas.drawCircle(ox - r * 0.35, cy - r * 0.35, r * 0.22, p);
      }
      break;
    case IdleAnim.LOOK: if (at >= 1.9) drawBubble(canvas, ox, headY, '?'); break;
    case IdleAnim.STRETCH: if (at >= 0.4 && at <= 1.6) drawBubble(canvas, ox, headY + k * 0.1, tr('idle.yawn')); break;
    case IdleAnim.IMPATIENT: if (at >= 0.2 && at <= 2.6) drawBubble(canvas, ox, headY, tr('idle.waiting')); break;
    case IdleAnim.SELFIE: drawSelfie(canvas, ox, oy, bodyH); break;
    case IdleAnim.BALLOON: drawBalloon(canvas, ox, oy, bodyH); break;
    case IdleAnim.YOYO: drawYoyo(canvas, ox, oy, bodyH); break;
    case IdleAnim.JUMPROPE: drawJumpRope(canvas, ox, oy, bodyH); break;
    default: break;
  }
}

/** Selfie : téléphone tendu en l'air, flash, puis la photo s'envole. */
function drawSelfie(canvas, ox, oy, bodyH) {
  const at = idle.at, p = accPaint;
  const show = clamp(at / 0.3, 0, 1) * clamp((2.4 - at) / 0.3, 0, 1);
  const headY = oy + isoY(0, idle.lift + bodyH, 0);
  if (show > 0) {
    const a = Math.round(255 * show), pw = k * 0.24, ph = k * 0.42, cx = ox + k * 0.62, cy = headY - k * 0.35 + (1 - show) * k * 0.4;
    canvas.save();
    canvas.rotate(-14, cx, cy);
    p.color = Color.argb(a, 35, 38, 48);
    rect.set(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2); canvas.drawRoundRect(rect, pw * 0.2, pw * 0.2, p);
    p.color = Color.argb(a, 90, 170, 240);
    canvas.drawRect(cx - pw * 0.4, cy - ph * 0.42, cx + pw * 0.4, cy + ph * 0.38, p);
    p.color = Color.argb(a, 255, 150, 80);
    canvas.drawRect(cx - pw * 0.18, cy - ph * 0.05, cx + pw * 0.18, cy + ph * 0.2, p);
    canvas.restore();
    if (at >= 0.7 && at <= 2.2) { textPaint.textSize = k * 0.32; canvas.drawText('✌', ox - k * 0.5, headY - k * 0.05, textPaint); }
  }
  if (at >= 1.6 && at <= 1.95) {
    const q = (at - 1.6) / 0.35;
    p.color = Color.argb(Math.round(230 * (1 - q)), 255, 255, 255);
    canvas.drawCircle(ox + k * 0.62, headY - k * 0.35, k * (0.3 + 0.9 * q), p);
    p.color = Color.argb(Math.round(90 * (1 - q)), 255, 255, 255);
    canvas.drawRect(0, 0, w, h, p);
  }
  if (at > 2.0) {
    const q = clamp((at - 2.0) / 1.4, 0, 1), a = Math.round(255 * (1 - q * q));
    const cx = ox + k * 0.5 + q * k * 0.4, cy = headY - k * 0.6 - q * k * 0.9;
    canvas.save();
    canvas.rotate(10 - 20 * q, cx, cy);
    p.color = Color.argb(a, 255, 255, 255); canvas.drawRect(cx - k * 0.22, cy - k * 0.22, cx + k * 0.22, cy + k * 0.3, p);
    p.color = Color.argb(a, 140, 200, 255); canvas.drawRect(cx - k * 0.17, cy - k * 0.17, cx + k * 0.17, cy + k * 0.17, p);
    p.color = Color.argb(a, 255, 140, 70); canvas.drawRect(cx - k * 0.07, cy - k * 0.04, cx + k * 0.07, cy + k * 0.17, p);
    canvas.restore();
  }
}

/** Ballon gonflé à chaque souffle, noué… puis lâché : il s'envole. */
function drawBalloon(canvas, ox, oy, bodyH) {
  const at = idle.at, p = accPaint;
  const mouthY = oy + isoY(0, idle.lift + bodyH * 0.4, 0) + k * 0.22;
  const puffs = clamp((at - 0.2) / 0.5, 0, 4.4), fr = clamp(puffs % 1, 0, 1);
  const grow = clamp((Math.floor(puffs) + fr * fr * (3 - 2 * fr)) / 4.4, 0, 1);
  const r = k * (0.08 + 0.3 * grow);
  let bx = ox, by;
  if (at > 2.6) {
    const q = at - 2.6;
    bx = ox + k * 0.12 + r * 0.55 + Math.sin(q * 3) * k * 0.25 + q * k * 0.3;
    by = mouthY - r - q * q * k * 1.6 - q * k * 0.6;
    accStroke.color = Color.argb(200, 80, 80, 90); accStroke.strokeWidth = k * 0.015;
    tmpPath.reset();
    tmpPath.moveTo(bx, by + r * 1.15);
    tmpPath.quadTo(bx + Math.sin(time * 9) * k * 0.12, by + r * 1.15 + k * 0.3, bx + Math.sin(time * 7) * k * 0.06, by + r * 1.15 + k * 0.6);
    canvas.drawPath(tmpPath, accStroke);
  } else if (at < 0.2) return;
  else { bx = ox + k * 0.12 + r * 0.55; by = mouthY - r * 1.05 + k * 0.05; }
  p.color = idle.color;
  rect.set(bx - r * 0.88, by - r, bx + r * 0.88, by + r * 1.05); canvas.drawOval(rect, p);
  tmpPath.reset();
  tmpPath.moveTo(bx - r * 0.12, by + r * 1.2); tmpPath.lineTo(bx, by + r * 1.0); tmpPath.lineTo(bx + r * 0.12, by + r * 1.2); tmpPath.close();
  canvas.drawPath(tmpPath, p);
  p.color = Color.argb(140, 255, 255, 255);
  rect.set(bx - r * 0.55, by - r * 0.7, bx - r * 0.2, by - r * 0.15); canvas.drawOval(rect, p);
  if (at > 2.9) drawBubble(canvas, ox, oy + isoY(0, idle.lift + bodyH + 0.5, 0), '👋');
}

/** Yo-yo qui descend et remonte, puis fait « le tour du monde ». */
function drawYoyo(canvas, ox, oy, bodyH) {
  const at = idle.at, hx = ox + k * 0.42, hy = oy + isoY(0, idle.lift + bodyH * 0.55, 0);
  let yx, yy;
  if (at < 2.2 || at > 3.2) { const q = Math.abs(Math.sin(at * Math.PI / 0.55)); yx = hx; yy = hy + k * (0.08 + 0.85 * q); }
  else { const a = (at - 2.2) * 2 * Math.PI; yx = hx + Math.sin(a) * k * 0.8; yy = hy + Math.cos(a) * k * 0.8; }
  accStroke.color = Color.argb(220, 60, 60, 70); accStroke.strokeWidth = k * 0.012;
  canvas.drawLine(hx, hy, yx, yy, accStroke);
  const p = accPaint, r = k * 0.11;
  p.color = idle.color; canvas.drawCircle(yx, yy, r, p);
  p.color = shade(idle.color, 0.7); canvas.drawCircle(yx, yy, r * 0.55, p);
  accStroke.color = Color.argb(220, 255, 255, 255); accStroke.strokeWidth = k * 0.02;
  const spin = time * 25;
  canvas.drawLine(yx - Math.cos(spin) * r * 0.75, yy - Math.sin(spin) * r * 0.75, yx + Math.cos(spin) * r * 0.75, yy + Math.sin(spin) * r * 0.75, accStroke);
  p.color = Color.rgb(255, 220, 190); canvas.drawCircle(hx, hy, k * 0.05, p);
}

/** Corde à sauter qui tourne autour du personnage ; il saute quand elle passe sous ses pieds. */
function drawJumpRope(canvas, ox, oy, bodyH) {
  const th = idle.at * 1.7 * 2 * Math.PI, c = Math.cos(th);
  const handY = oy + isoY(0, idle.lift + bodyH * 0.5, 0), lx = ox - k * 0.42, rx = ox + k * 0.42;
  const behind = Math.sin(th) > 0;
  accStroke.color = behind ? Color.argb(170, 150, 60, 45) : Color.argb(255, 210, 60, 45);
  accStroke.strokeWidth = k * 0.035;
  tmpPath.reset(); tmpPath.moveTo(lx, handY); tmpPath.quadTo(ox, handY + c * k * 1.35, rx, handY);
  canvas.drawPath(tmpPath, accStroke);
  const p = accPaint;
  p.color = 0xFF3F8EFC;
  rect.set(lx - k * 0.04, handY - k * 0.1, lx + k * 0.04, handY + k * 0.04); canvas.drawRoundRect(rect, k * 0.03, k * 0.03, p);
  rect.set(rx - k * 0.04, handY - k * 0.1, rx + k * 0.04, handY + k * 0.04); canvas.drawRoundRect(rect, k * 0.03, k * 0.03, p);
}
