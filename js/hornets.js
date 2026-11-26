'use strict';
/*
 * Imprévu mortel « frelons asiatiques » (comme Hornets.kt ; même calendrier que les autres mortels) : un gros nid de
 * frelons pend sous un bloc. Quand on s'y pose (score < 15 et sous le record), l'essaim sort du nid, fond sur le
 * joueur et tourne autour en le piquant de partout : de grosses piqûres rouges gonflent sur son corps, puis il
 * bascule et tombe. Sinon, quelques frelons sortent, font un tour et repartent. Sons : « essaim » en boucle pendant
 * l'attaque, « piqure » à chaque piqûre.
 */

/** L'essaim arrive sur le joueur, puis le joueur bascule, puis fin. */
const HORNET_SWARM = 1.2, HORNET_FALL = 3.2, HORNET_END = 4.8;
let hornetDoomAt = -1;
// stings : [position −1..1 en largeur, 0..1 en hauteur, taille, moment]
const hor = { swarm: [], stings: [], nextSting: 0, falling: false, fallVy: 0 };
const horPaint = new Paint();
const horStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });
const horOval = new RectF();
const horPath = new Path();

/** Nid suspendu sous un bloc (mesures en unités du monde, repère du centre du dessus du bloc). */
class HornetNest {
  constructor(half, depth, doom) {
    this.cy = depth + 0.95 * half; this.rx = 0.62 * half; this.ry = 0.98 * half;
    this.ex = 0.12 * half; this.ey = depth + 1.6 * half;
    this.seed = Math.random() * 100; this.doom = doom; this.used = false;
  }
}

/** Mode libre : le bloc en train d'être créé porte-t-il le nid de l'imprévu mortel prévu ? */
function hornetsPick(kind) {
  if (kind !== Kind.NORMAL || hornetDoomAt < 0 || time < hornetDoomAt) return false;
  hornetDoomAt = -1;
  return test.forceDoom || (score < 15 && score < best);
}

/** Menu de test : le prochain bloc est refait jusqu'à porter le nid de frelons. */
function hornetsTest() {
  test.forceDoom = true;
  for (let i = 0; i < 40; i++) {
    const at = platforms.indexOf(next);
    if (at >= 0) platforms.splice(at, 1);
    hornetDoomAt = time;
    spawnNext();
    if (next.nest) break;
  }
  hornetDoomAt = -1;
  if (!next.nest) next.nest = new HornetNest(next.half, platformDepth, true);
  updateCameraTarget();
}

function nestEntrance(p, n) {
  return [sx(p.cx, p.cz) + n.ex * k + camX, sy(p.cx, 0, p.cz) + (p.dropY + p.leaveY + p.riseOffset + n.ey) * k + camY];
}
function playerBodyPos() { return [sx(px, pz) + camX, sy(px, py + playerHeight * 0.55, pz) + camY]; }
function newHornet(x, y, delay, ang0, orbit, spin, ph) { return { x, y, sx0: x, sy0: y, delay, ang0, orbit, spin, ph, vx: 0, free: false, fvx: 0, fvy: 0, t: 0 }; }

/** On vient de se poser (mode libre, état READY) : le nid du bloc libère l'essaim, ou quelques frelons. */
function hornetsOnLand() {
  const nest = current.nest;
  if (!nest || nest.used) return;
  nest.used = true;
  if (nest.doom && state === State.READY && (test.forceDoom || (score < 15 && score < best))) { startHornetDoom(nest); return; }
  // Nid inoffensif : quelques frelons sortent, tournent un peu et s'en vont
  const [x, y] = nestEntrance(current, nest);
  const n = 3 + rndInt(4);
  for (let i = 0; i < n; i++) {
    const hn = newHornet(x, y, i * 0.15, rnd() * 6.28, 0, 0, rnd() * 6);
    hn.free = true;
    const a = -1.2 - rnd() * 0.8 + (rnd() < 0.5 ? 0 : -0.8);
    hn.fvx = Math.cos(a) * w * 0.35 * (rnd() < 0.5 ? 1 : -1); hn.fvy = Math.sin(a) * w * 0.35;
    hor.swarm.push(hn);
  }
  sounds.play('STING', 0.5);
}

function startHornetDoom(nest) {
  test.forceDoom = false;
  state = State.STRUCK; strikeT = 0; struckDead = true; doomKind = 5; doomHappened(); Stats.add('hornets');
  Object.assign(hor, { swarm: [], stings: [], falling: false, fallVy: 0, nextSting: HORNET_SWARM });
  const [x, y] = nestEntrance(current, nest);
  // L'essaim sort du nid à la file, puis chacun tourne autour du joueur sur son orbite
  for (let i = 0; i < 34; i++) {
    hor.swarm.push(newHornet(x, y, i * 0.028, rnd() * 6.2831855, k * (0.55 + rnd() * 0.7), (rnd() < 0.5 ? 1 : -1) * (3.5 + rnd() * 3), rnd() * 6));
  }
  vibrate(30);
}

/** Déroulé de l'imprévu mortel (appelé par updateStrike quand doomKind = 5). */
function updateHornetDoom(before) {
  const t = strikeT;
  scareT = scareDuration;          // le personnage voit l'essaim arriver
  // Piqûres de plus en plus rapprochées, partout sur le corps
  while (t >= hor.nextSting && hor.nextSting < HORNET_FALL + 0.6) {
    hor.stings.push([rnd() * 1.8 - 0.9, 0.08 + rnd() * 1.05, 0.75 + rnd() * 0.6, hor.nextSting]);
    sounds.play('STING', 0.55 + rnd() * 0.35);
    if (hor.stings.length % 3 === 1) vibrate(20);
    shake(0.025);
    hor.nextSting += Math.max(0.09, 0.28 - (hor.nextSting - HORNET_SWARM) * 0.08) * (0.7 + rnd() * 0.6);
  }
  if (before < HORNET_FALL && t >= HORNET_FALL) {
    hor.falling = true; hor.fallVy = -2.6;
    sounds.play('FALL'); vibrate(300);
  }
  if (t >= HORNET_END) endGame(tr('reason.hornets'));
}

/** Fin de l'imprévu passée d'un toucher : le personnage est déjà tombé. */
function hornetDoomSkip() { py = -60; }

/** À chaque image : la chute du joueur et le vol des frelons. */
function updateHornets(dt) {
  if (state === State.STRUCK && doomKind === 5 && hor.falling) { hor.fallVy += 26 * dt; py -= hor.fallVy * dt; }
  if (!hor.swarm.length) return;
  const doom = (state === State.STRUCK || state === State.GAME_OVER) && doomKind === 5;
  const [bx, by] = playerBodyPos();
  const leaving = !doom || strikeT > HORNET_END - 0.9;
  hor.swarm = hor.swarm.filter((hn) => {
    hn.t += dt;
    if (hn.t < hn.delay) return true;
    const ft = hn.t - hn.delay, ox = hn.x;
    if (hn.free || leaving) {
      if (!hn.free) {
        // Fin de l'attaque : l'essaim se disperse
        hn.free = true;
        const a = rnd() * 6.2831855;
        hn.fvx = Math.cos(a) * w * 0.5; hn.fvy = Math.sin(a) * w * 0.5 - hn.fvy;
      }
      hn.x += (hn.fvx + Math.sin(ft * 9 + hn.ph) * w * 0.15) * dt;
      hn.y += (hn.fvy + Math.cos(ft * 11 + hn.ph) * w * 0.12) * dt;
    } else {
      // Orbite autour du joueur (elliptique, qui se resserre), en zigzag
      const ang = hn.ang0 + ft * hn.spin;
      const tight = 1 - 0.35 * clamp((strikeT - HORNET_SWARM) / (HORNET_FALL - HORNET_SWARM), 0, 1);
      const r = hn.orbit * tight * (1 + 0.25 * Math.sin(ft * 7 + hn.ph));
      const tx = bx + Math.cos(ang) * r, ty = by + Math.sin(ang) * r * 0.65 + Math.sin(ft * 13 + hn.ph) * k * 0.05;
      // Sortie du nid : courbe jusqu'à l'orbite
      const q = clamp(ft / 0.75, 0, 1), e = q * q * (3 - 2 * q);
      const mx = (hn.sx0 + tx) / 2 + Math.sin(hn.ph) * w * 0.12, my = Math.min(hn.sy0, ty) - h * 0.06;
      hn.x = (1 - e) * (1 - e) * hn.sx0 + 2 * (1 - e) * e * mx + e * e * tx;
      hn.y = (1 - e) * (1 - e) * hn.sy0 + 2 * (1 - e) * e * my + e * e * ty;
    }
    if (dt > 0) hn.vx = (hn.x - ox) / dt;
    const ex = hn.x - camX, ey = hn.y - camY;
    return !(hn.free && ft > 0.5 && (ex < -w * 0.1 || ex > w * 1.1 || ey < -h * 0.1 || ey > h * 1.1));
  });
}

// ---------- Dessin ----------

/** Nid de frelons sous le bloc (dessiné avant lui : le haut passe derrière). Le canvas est au centre du dessus. */
function drawHornetNest(canvas, n) {
  const p = horPaint, st = horStroke, o = horOval;
  const cy = n.cy * k, rx = n.rx * k, ry = n.ry * k;
  // Corps du nid : papier mâché beige, plus sombre en bas et à droite
  p.shader = new RadialGradient(-rx * 0.35, cy - ry * 0.3, ry * 1.3, [0xFFE3CFA6, 0xFF8C6B45]);
  o.set(-rx, cy - ry, rx, cy + ry); canvas.drawOval(o, p);
  p.shader = null;
  // Bandes ondulées du papier
  st.strokeWidth = k * 0.025;
  for (let i = 1; i <= 6; i++) {
    const v = -1 + i * 0.29, yy = cy + v * ry, half = rx * Math.sqrt(Math.max(0, 1 - v * v));
    st.color = i % 2 === 0 ? 0x88FFF3D6 : 0x887A5A38;
    horPath.reset(); horPath.moveTo(-half, yy);
    for (let s = 1; s <= 6; s++) {
      const x = -half + 2 * half * s / 6, u = x / Math.max(1, half);
      horPath.lineTo(x, yy + (s % 2 === 0 ? -1 : 1) * k * 0.025 + ry * 0.06 * (1 - u * u));
    }
    canvas.drawPath(horPath, st);
  }
  // Entrée sombre en bas
  p.color = 0xFF2A1A0E;
  o.set(n.ex * k - k * 0.09, n.ey * k - k * 0.07, n.ex * k + k * 0.09, n.ey * k + k * 0.07); canvas.drawOval(o, p);
  // Quelques frelons qui marchent autour de l'entrée (tant que le nid n'a pas été dérangé)
  if (!n.used) for (let i = 0; i < 3; i++) {
    const a = time * (1.2 + i * 0.4) + n.seed + i * 2.1;
    drawHornet(canvas, n.ex * k + Math.cos(a) * rx * 0.55, n.ey * k - ry * 0.25 + Math.sin(a) * ry * 0.25, k * 0.11, Math.sin(a) > 0 ? 1 : -1, 1);
  }
}

/** Un frelon asiatique : corps noir, bande orangée au bout de l'abdomen, tête orange, ailes qui battent. */
function drawHornet(canvas, x, y, s, dir, alpha) {
  const p = horPaint, o = horOval, a = clamp(Math.round(255 * alpha), 0, 255);
  p.shader = null;
  // Ailes (battement très rapide)
  const flap = Math.abs(Math.sin(time * 60 + x * 0.1));
  p.color = Color.argb(Math.round(140 * alpha), 230, 240, 255);
  o.set(x - s * 0.55, y - s * (0.5 + 0.5 * flap), x + s * 0.25, y - s * 0.05); canvas.drawOval(o, p);
  o.set(x - s * 0.2, y - s * (0.45 + 0.4 * flap), x + s * 0.5, y - s * 0.05); canvas.drawOval(o, p);
  canvas.save();
  if (dir < 0) canvas.scale(-1, 1, x, y);
  // Abdomen : noir, bande orangée au bout
  p.color = Color.argb(a, 26, 20, 16); o.set(x - s * 0.95, y - s * 0.25, x - s * 0.05, y + s * 0.28); canvas.drawOval(o, p);
  p.color = Color.argb(a, 240, 150, 40); o.set(x - s * 0.95, y - s * 0.18, x - s * 0.62, y + s * 0.2); canvas.drawOval(o, p);
  // Thorax et tête
  p.color = Color.argb(a, 40, 30, 22); canvas.drawCircle(x + s * 0.1, y, s * 0.24, p);
  p.color = Color.argb(a, 245, 170, 50); canvas.drawCircle(x + s * 0.42, y + s * 0.02, s * 0.2, p);
  p.color = Color.argb(a, 20, 14, 10); canvas.drawCircle(x + s * 0.5, y - s * 0.03, s * 0.07, p);
  canvas.restore();
}

/** Les frelons en vol et les piqûres sur le corps du joueur (par-dessus les blocs et le personnage). */
function drawHornets(canvas) {
  const doom = (state === State.STRUCK || state === State.GAME_OVER) && doomKind === 5;
  if (doom && hor.stings.length && py > -8) drawStings(canvas);
  for (const hn of hor.swarm) {
    if (hn.t < hn.delay) continue;
    drawHornet(canvas, hn.x - camX, hn.y - camY, k * 0.15, hn.vx >= 0 ? 1 : -1, 1);
  }
}

/** Grosses piqûres rouges et gonflées, sur les faces visibles du personnage. */
function drawStings(canvas) {
  const p = horPaint, cx = sx(px, pz), feet = sy(px, py, pz), top = sy(px, py + playerHeight, pz), hw = 1.6 * playerHalf * k;
  for (const s of hor.stings) {
    const age = strikeT - s[3];
    if (age < 0) continue;
    const grow = Math.min(1, age / 0.18);
    const r = k * 0.08 * s[2] * (0.4 + 0.6 * grow) * (1 + 0.08 * Math.sin(time * 8 + s[0] * 9));
    const x = cx + s[0] * hw * (1 - 0.25 * s[1]), y = feet + (top - feet) * s[1];
    p.shader = new RadialGradient(x - r * 0.25, y - r * 0.3, r * 1.2, [0xFFFF6B6B, 0xFFB3121F]);
    canvas.drawCircle(x, y, r, p);
    p.shader = null;
    p.color = 0xAAFFFFFF; canvas.drawCircle(x - r * 0.35, y - r * 0.38, r * 0.22, p);
  }
}
