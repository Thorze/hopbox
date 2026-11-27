'use strict';
// Petits éléments discrets en arrière-plan des chapitres 4 à 24 (le 2 et le 3 ont SeaLife / SpaceLife), derrière les
// plateformes : ce qui tombe, monte, traverse, flotte, et quelques éclats. Équivalent de ChapterAmbient.kt.

// AM_GROUND : roule ou marche au sol du fond peint, entre les hauteurs « sol » de la fiche (fractions de l'image)
const AM_FALL = 0, AM_RISE = 1, AM_CROSS = 2, AM_FLOAT = 3, AM_BURST = 4, AM_GROUND = 5;
const K_DOT = 0, K_TWINKLE = 1, K_CRYSTAL = 2, K_FLAKE = 3, K_SMOKE = 4, K_ZZZ = 5, K_SHEEP = 6, K_JET = 7, K_DRONE = 8, K_BIRD = 9,
  K_BAT = 10, K_GHOST = 11, K_NOTE = 12, K_CONFETTI = 13, K_FIREWORK = 14, K_PETAL = 15, K_LANTERN = 16, K_SPRINKLE = 17, K_BUBBLE = 18,
  K_LEAF = 19, K_DRAGONFLY = 20, K_BUTTERFLY = 21, K_SEED = 22, K_GEAR = 23, K_PIXEL = 24, K_INVADER = 25, K_BINARY = 26, K_SCARAB = 27,
  K_TUMBLEWEED = 28, K_BALLOON = 29, K_JET_LOOP = 30,
  K_TROOP = 31, K_TANK = 32, K_JEEP = 33, K_PLANE = 34;

// [dessin, mouvement, nombre par seconde, maximum, taille (× w), vitesse (× w / s), couleurs, opacité, durée de vie]
const em = (kind, mode, rate, max, size, speed, colors, alpha, life = 30) => ({ kind, mode, rate, max, size, speed, colors, alpha, life });
// Ce qui passe en arrière-plan de chaque chapitre : chapitres/chapitres.json (« ambiance »), lu par chapterDef.
const INVADER_A = ['..#..#..', '...##...', '..####..', '.##..##.', '########', '#.#..#.#'];
const INVADER_B = ['..#..#..', '#..##..#', '#.####.#', '###..###', '..####..', '.#....#.'];

const chapterAmbient = {
  bits: [], season: -1, lastT: -1, acc: [0, 0, 0, 0, 0, 0, 0, 0],
  paint: new Paint(), stroke: new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }),
  text: new Paint({ textAlign: Align.CENTER, bold: true }), path: new Path(), rect: new RectF(),
};

/** Dessine les éléments d'arrière-plan du chapitre en cours (appelé après le fond du chapitre). */
function drawChapterAmbient(canvas, season = quest.season) {
  // Chapitres déjà animés ailleurs : sous l'eau et dans l'espace
  if (season === 19) { drawSeaLife(canvas); return; }
  if (season === 20) { drawSpaceLife(canvas); return; }
  const am = chapterAmbient, ems = season >= 1 && season <= CHAPTER_COUNT ? chapterDef(season).ambient : null;
  if (!ems || !ems.length) return;
  // Autre chapitre, ou pas affiché depuis un moment : on repart d'un ciel rempli à moitié
  if (am.season !== season || am.lastT < 0 || time - am.lastT > 1 || time < am.lastT) {
    am.bits = []; am.season = season; am.acc = [0, 0, 0, 0, 0, 0, 0, 0];
    ems.forEach((e, i) => { if (e.mode !== AM_BURST && e.kind !== K_JET_LOOP) { const n = Math.max(e.mode === AM_CROSS ? 0 : 1, Math.floor(e.max / 2)); for (let k = 0; k < n; k++) spawnAmbient(e, i, true); } });
    am.lastT = time;
  }
  const dt = Math.min(0.1, Math.max(0, time - am.lastT));
  am.lastT = time;
  ems.forEach((e, i) => {
    am.acc[i] += dt * e.rate;
    while (am.acc[i] >= 1) {
      am.acc[i] -= 1;
      if (e.kind === K_JET_LOOP) { if (!am.bits.some((b) => b.src === i)) spawnJetPatrol(e, i); }
      else if (am.bits.filter((b) => b.src === i).length < e.max) spawnAmbient(e, i, false);
    }
  });
  am.bits = am.bits.filter((b) => {
    b.age += dt;
    if (b.kind === K_JET_LOOP) { const q = jetPos(b, b.age); b.x = q[0]; b.y = q[1]; } else { b.x += b.vx * dt; b.y += b.vy * dt; }
    const out = b.mode === AM_FALL ? b.y > h + b.size * 3 : b.mode === AM_RISE ? b.y < -b.size * 3 : b.mode === AM_CROSS ? (b.x < -w * 0.25 || b.x > w * 1.25 || (b.kind === K_JET_LOOP && (b.y < -h * 0.3 || b.y > h * 1.2)))
      : b.mode === AM_GROUND ? b.x < -w * 0.35 || b.x > w * 1.35 : false;
    return !out && b.age <= b.life;
  });
  for (const b of am.bits) if (b.mode !== AM_GROUND) drawAmbientBit(canvas, b);
  // Au sol : du plus loin au plus près, pour que ce qui est devant passe devant
  for (const b of am.bits.filter((g) => g.mode === AM_GROUND).sort((a, c) => a.y - c.y)) drawAmbientBit(canvas, b);
}

/** Hauteur à l'écran d'une ligne du fond peint du niveau (fraction de l'image, cadrée comme sceneCoverRect). */
function ambientGroundY(fy) {
  const r = sceneCoverRect(chapterAmbient.season, true);
  return r[1] + fy * r[3];
}

// Figures de la patrouille
const M_LOOP = 0, M_SPREAD = 1, M_SWAP = 2, M_WAVE = 3, M_BURST = 4, M_STRAIGHT = 5;

// Patrouille de 1 à 3 avions de chasse : formation au hasard (V, échelon, file, de front) et, vers le milieu de
// l'écran, une figure au hasard (looping, écartement puis regroupement, échange de place, vague, éclatement, ou rien)
function spawnJetPatrol(e, src, into = chapterAmbient.bits) {
  const r = Math.random, ltr = r() < 0.5, n = 1 + Math.floor(r() * 3);
  const sp = w * e.speed * (0.9 + r() * 0.2), vx = ltr ? sp : -sp, dir = ltr ? 1 : -1;
  let y0 = h * (0.13 + r() * 0.2);
  const x0 = ltr ? -w * 0.15 : w * 1.15;
  // La figure a lieu vers le milieu de l'écran
  const manX = w * (0.3 + r() * 0.35), mt = Math.abs(manX - x0) / sp, q = r();
  const man = q < 0.3 ? M_LOOP : q < 0.5 ? M_SPREAD : q < 0.65 ? (n >= 2 ? M_SWAP : M_WAVE) : q < 0.8 ? M_WAVE : q < 0.9 ? (n >= 2 ? M_BURST : M_LOOP) : M_STRAIGHT;
  const md = man === M_LOOP ? 2.4 : man === M_SPREAD ? 3 : man === M_SWAP ? 2.5 : man === M_WAVE ? 2.6 : 2;
  const radius = w * (0.11 + r() * 0.07), size = w * e.size, formation = Math.floor(r() * 4);
  // Looping : assez bas pour que le haut de la boucle reste à l'écran
  if (man === M_LOOP) y0 = Math.max(y0, radius * 2.2 + h * 0.04);
  for (let i = 0; i < n; i++) {
    // Place dans la formation, par rapport au chef (dx vers l'arrière, dy vers le bas)
    const side = i === 1 ? -1 : 1;
    const [back, dy] = formation === 0 ? [i === 0 ? 0 : size * 2.6, i === 0 ? 0 : side * size * 1.4]   // en V
      : formation === 1 ? [i * size * 2.4, i * size * 1.2]                                             // en échelon
      : formation === 2 ? [i * size * 3, 0]                                                            // à la file
      : [i * size * 0.5, i === 0 ? 0 : side * size * 1.7];                                             // de front
    into.push({ kind: e.kind, mode: AM_CROSS, x: x0, y: y0, vx, vy: 0, size, color: e.colors[0], alpha: e.alpha, life: 60,
      seed: r() * 100, src, age: 0, ox: x0, oy: y0, loopAt: mt, loopR: radius, man, md, idx: i, fdx: -dir * back, fdy: dy });
  }
}

// Patrouille d'avions de chasse dans le ciel du mode libre : rare, de jour et par beau temps
const jetSky = { bits: [], next: 0, lastT: -1 };
const FREE_JETS = em(K_JET_LOOP, AM_CROSS, 0, 3, 0.03, 0.38, [0xFF8E9AA6], 0.75);

/** Ciel du mode libre : de temps en temps (toutes les 1 à 2 min) une patrouille qui fait un looping, si allowed. */
function drawFreeJets(canvas, allowed) {
  const js = jetSky;
  if (js.lastT < 0 || time < js.lastT || time - js.lastT > 5) { js.bits = []; js.next = time + 40 + Math.random() * 50; js.lastT = time; }
  const dt = Math.min(0.1, Math.max(0, time - js.lastT));
  js.lastT = time;
  if (time >= js.next) {
    if (allowed && js.bits.length === 0) spawnJetPatrol(FREE_JETS, 0, js.bits);
    js.next = time + 60 + Math.random() * 60;
  }
  js.bits = js.bits.filter((b) => {
    b.age += dt;
    const q = jetPos(b, b.age); b.x = q[0]; b.y = q[1];
    return !(b.age > b.loopAt + b.md && (b.x < -w * 0.4 || b.x > w * 1.4 || b.y < -h * 0.3 || b.y > h * 1.2));
  });
  for (const b of js.bits) drawLoopJet(canvas, b, b.alpha);
}

// Position d'un avion de la patrouille à l'âge t : trajet du centre de la formation, plus sa place, selon la figure
function jetPos(b, t) {
  const dir = b.vx >= 0 ? 1 : -1, mt = b.loopAt, md = b.md;
  const u = Math.max(0, Math.min(1, (t - mt) / md)), inside = t > mt && t < mt + md, bump = inside ? Math.sin(u * Math.PI) : 0;
  let cx = b.ox + b.vx * t, cy = b.oy, dx = b.fdx, dy = b.fdy;
  if (b.man === M_LOOP) {
    // Looping : le centre de la formation fait un tour complet, puis repart
    if (t >= mt && t < mt + md) {
      const a = u * 6.2832;
      cx = b.ox + b.vx * mt + dir * b.loopR * Math.sin(a) + b.vx * md * 0.35 * u;
      cy = b.oy - b.loopR * (1 - Math.cos(a));
    } else if (t >= mt + md) cx = b.ox + b.vx * mt + b.vx * md * 0.35 + b.vx * (t - mt - md);
  } else if (b.man === M_SPREAD) {
    // Écartement : ils s'éloignent les uns des autres, puis se resserrent
    dx *= 1 + 1.2 * bump; dy *= 1 + 2.2 * bump;
  } else if (b.man === M_SWAP && b.idx > 0) {
    // Échange : les ailiers passent de l'autre côté (l'un devant, l'autre derrière pour ne pas se croiser)
    const s = t <= mt ? 0 : t >= mt + md ? 1 : u * u * (3 - 2 * u);
    dy = b.fdy * Math.cos(s * Math.PI) + (b.fdy === 0 ? b.size * 1.5 * bump : 0);
    dx = b.fdx + dir * b.size * (b.idx === 1 ? 1.4 : -1.4) * bump;
  } else if (b.man === M_WAVE) {
    // Vague : montée puis piqué, tous ensemble
    if (inside) cy -= b.loopR * 0.9 * Math.sin(u * 6.2832);
  } else if (b.man === M_BURST && t > mt) {
    // Éclatement : chacun part de son côté (le chef monte, les ailiers s'écartent vers le haut et vers le bas)
    const e = t - mt, k = b.idx === 0 ? -1 : b.idx === 1 ? -0.45 : 0.55;
    dy += k * b.loopR * 0.45 * e * e;
  }
  return [cx + dx, cy + dy];
}

// Avion de chasse type Rafale, vu de profil, avec sa traînée blanche ; tourné dans le sens de sa trajectoire
function drawLoopJet(canvas, b, al) {
  const am = chapterAmbient, p = am.paint, path = am.path, s = b.size;
  const col = (cv, k = 1) => Color.argb(Math.max(0, Math.min(255, Math.floor(255 * al * k))), Color.red(cv), Color.green(cv), Color.blue(cv));
  const dark = Theme.lerp(b.color, 0xFF000000, 0.2);
  // Traînée : positions passées, de plus en plus pâles et larges
  for (let k = 14; k >= 1; k--) {
    const q = jetPos(b, b.age - k * 0.05);
    p.color = col(0xFFFFFFFF, 0.5 * (1 - k / 15));
    canvas.drawCircle(q[0], q[1], s * (0.12 + k * 0.018), p);
  }
  const q0 = jetPos(b, b.age - 0.02), q1 = jetPos(b, b.age);
  canvas.save();
  canvas.translate(q1[0], q1[1]);
  canvas.rotate(Math.atan2(q1[1] - q0[1], q1[0] - q0[0]) * 180 / Math.PI);
  const tri = (pts) => { path.reset(); path.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]); path.close(); canvas.drawPath(path, p); };
  // Flamme de la postcombustion
  p.color = col(0xFFFFB74D, 0.9);
  tri([-s * 0.95, -s * 0.07, -s * (1.25 + 0.08 * Math.sin(time * 40 + b.seed)), 0, -s * 0.95, s * 0.07]);
  // Aile delta (sous le fuselage) et dérive
  p.color = col(dark);
  tri([s * 0.3, s * 0.04, -s * 0.85, s * 0.04, -s * 0.8, s * 0.36]);
  tri([-s * 0.45, -s * 0.08, -s * 0.82, -s * 0.55, -s * 0.95, -s * 0.55, -s * 0.92, -s * 0.08]);
  // Fuselage effilé
  p.color = col(b.color);
  path.reset();
  path.moveTo(s * 1.15, 0);
  path.quadTo(s * 0.7, -s * 0.16, s * 0.2, -s * 0.13);
  path.lineTo(-s * 0.95, -s * 0.1); path.lineTo(-s * 0.95, s * 0.1); path.lineTo(s * 0.2, s * 0.12);
  path.quadTo(s * 0.7, s * 0.12, s * 1.15, 0);
  path.close(); canvas.drawPath(path, p);
  // Plan canard à l'avant et verrière
  p.color = col(dark);
  tri([s * 0.5, s * 0.02, s * 0.25, s * 0.02, s * 0.22, s * 0.15]);
  p.color = col(0xFF4FC3F7, 0.9);
  am.rect.set(s * 0.38, -s * 0.22, s * 0.75, -s * 0.06); canvas.drawOval(am.rect, p);
  canvas.restore();
}

function spawnAmbient(e, src, prefill) {
  const r = Math.random;
  let size = w * e.size * (0.7 + r() * 0.6);
  const sp = w * e.speed * (0.7 + r() * 0.6);
  const color = e.colors[Math.floor(r() * e.colors.length)], seed = r() * 100;
  let x, y, vx = 0, vy = 0;
  if (e.mode === AM_FALL) { x = w * (-0.05 + r() * 1.1); y = prefill ? h * r() : -size * 2; vx = (r() - 0.5) * sp * 0.4; vy = sp; }
  else if (e.mode === AM_RISE) { x = w * (0.02 + r() * 0.96); y = prefill ? h * (0.2 + r() * 0.8) : h + size * 2; vx = (r() - 0.5) * sp * 0.3; vy = -sp; }
  else if (e.mode === AM_CROSS) {
    const ltr = r() < 0.5;
    x = prefill ? w * r() : ltr ? -w * 0.2 : w * 1.2;
    y = e.kind === K_TUMBLEWEED ? h * (0.6 + r() * 0.12) : h * (0.08 + r() * 0.5);
    vx = ltr ? sp : -sp;
  } else if (e.mode === AM_FLOAT) { x = w * (0.05 + r() * 0.9); y = h * (0.05 + r() * 0.7); vx = (r() - 0.5) * sp; vy = (r() - 0.5) * sp; }
  else if (e.mode === AM_GROUND) {
    // Plus c'est bas (près), plus c'est grand
    const ltr = r() < 0.5, [g0, g1] = e.ground || [0.85, 0.9], q = r();
    x = prefill ? w * (0.1 + r() * 0.8) : ltr ? -w * 0.3 : w * 1.3;
    size *= 0.8 + 0.4 * q;
    // Écran plus large que l'image : le bas du fond est coupé, on reste à l'écran
    y = Math.min(ambientGroundY(g0 + q * (g1 - g0)), h - size * 0.3);
    vx = ltr ? sp : -sp;
  } else { x = w * (0.15 + r() * 0.7); y = h * (0.08 + r() * 0.3); }
  const life = e.mode === AM_GROUND ? w * 1.8 / sp + 2 : (e.mode === AM_FALL || e.mode === AM_CROSS) ? 60 : e.life * (0.8 + r() * 0.4);
  const b = { kind: e.kind, mode: e.mode, x, y, vx, vy, size, color, alpha: e.alpha, life, seed, src, age: 0 };
  if (prefill && e.mode !== AM_CROSS && e.mode !== AM_GROUND) b.age = r() * life * 0.5;
  chapterAmbient.bits.push(b);
}

function drawAmbientBit(canvas, b) {
  const am = chapterAmbient, p = am.paint, st = am.stroke, path = am.path, rc = am.rect;
  // Apparition et disparition en douceur (sauf ce qui sort de l'écran)
  const fade = Math.max(0, Math.min(1, b.mode === AM_FALL || b.mode === AM_CROSS || b.mode === AM_GROUND ? 1
    : b.mode === AM_RISE ? Math.min(1, b.age) * Math.min(1, (b.life - b.age) / 1.5)
    : Math.min(1, b.age) * Math.min(1, b.life - b.age)));
  const al = b.alpha * fade;
  if (al <= 0.01) return;
  if (b.kind === K_JET_LOOP) { drawLoopJet(canvas, b, al); return; }
  const col = (cv, k = 1) => Color.argb(Math.max(0, Math.min(255, Math.floor(255 * al * k))), Color.red(cv), Color.green(cv), Color.blue(cv));
  const s = b.size;
  const x = b.x + (b.mode === AM_FALL || b.mode === AM_RISE ? Math.sin(time * 1.3 + b.seed) * s * 1.2 : 0);
  const y = b.y + (b.mode === AM_CROSS ? Math.sin(time * 2 + b.seed) * s * 0.4 : 0);
  const dir = b.vx >= 0 ? 1 : -1, flap = Math.sin(time * 9 + b.seed), abs = Math.abs, sin = Math.sin, cos = Math.cos;
  const oval = (l, t, r, bt) => { rc.set(l, t, r, bt); canvas.drawOval(rc, p); };
  p.shader = null;
  canvas.save();
  switch (b.kind) {
    case K_DOT:
      p.color = col(b.color, 0.35); canvas.drawCircle(x, y, s * 2.2, p);
      p.color = col(b.color); canvas.drawCircle(x, y, s, p);
      break;
    case K_TWINKLE: {
      const tw = 0.5 + 0.5 * sin(time * 4 + b.seed);
      st.color = col(b.color, tw); st.strokeWidth = s * 0.22;
      canvas.drawLine(x - s, y, x + s, y, st); canvas.drawLine(x, y - s, x, y + s, st);
      st.strokeWidth = s * 0.14;
      canvas.drawLine(x - s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.5, st); canvas.drawLine(x - s * 0.5, y + s * 0.5, x + s * 0.5, y - s * 0.5, st);
      break;
    }
    case K_CRYSTAL: {
      const tw = 0.55 + 0.45 * sin(time * 3 + b.seed);
      st.color = col(b.color, tw); st.strokeWidth = s * 0.16;
      canvas.rotate(time * 15 + b.seed * 10, x, y);
      for (let i = 0; i < 3; i++) { const a = i * 1.047; canvas.drawLine(x - cos(a) * s, y - sin(a) * s, x + cos(a) * s, y + sin(a) * s, st); }
      break;
    }
    case K_FLAKE:
      canvas.rotate(time * 60 + b.seed * 20, x, y);
      p.color = col(b.color); canvas.drawRect(x - s, y - s * 0.55, x + s, y + s * 0.55, p);
      break;
    case K_SMOKE: {
      const g = 1 + b.age / b.life * 1.5;
      p.color = col(b.color); canvas.drawCircle(x, y, s * g, p); canvas.drawCircle(x + s * 0.6 * g, y + s * 0.2, s * 0.7 * g, p);
      break;
    }
    case K_ZZZ:
      am.text.color = col(b.color); am.text.textSize = s;
      canvas.rotate(-12, x, y); canvas.drawText('Z', x, y, am.text);
      break;
    case K_SHEEP: {
      canvas.scale(dir, 1, x, y);
      const hop = abs(sin(time * 4 + b.seed)) * s * 0.4;
      st.color = col(0xFF5D4037); st.strokeWidth = s * 0.15;
      canvas.drawLine(x - s * 0.5, y + s * 0.3 - hop, x - s * 0.5, y + s * 0.9 - hop, st);
      canvas.drawLine(x + s * 0.4, y + s * 0.3 - hop, x + s * 0.4, y + s * 0.9 - hop, st);
      p.color = col(b.color);
      for (let i = -1; i <= 1; i++) canvas.drawCircle(x + i * s * 0.4, y - hop + (i === 0 ? -s * 0.15 : 0), s * 0.5, p);
      p.color = col(0xFF5D4037); canvas.drawCircle(x + s * 0.85, y - s * 0.1 - hop, s * 0.28, p);
      break;
    }
    case K_JET:
      canvas.scale(dir, 1, x, y);
      st.color = col(0xFFFFFFFF, 0.45); st.strokeWidth = s * 0.12;
      canvas.drawLine(x - s * 0.8, y, x - s * 9, y, st);
      p.color = col(b.color);
      path.reset(); path.moveTo(x + s, y); path.lineTo(x - s * 0.8, y - s * 0.12); path.lineTo(x - s * 0.8, y + s * 0.12); path.close(); canvas.drawPath(path, p);
      path.reset(); path.moveTo(x + s * 0.1, y); path.lineTo(x - s * 0.45, y - s * 0.55); path.lineTo(x - s * 0.3, y); path.lineTo(x - s * 0.45, y + s * 0.55); path.close(); canvas.drawPath(path, p);
      break;
    case K_DRONE:
      p.color = col(b.color);
      rc.set(x - s * 0.5, y - s * 0.15, x + s * 0.5, y + s * 0.15); canvas.drawRoundRect(rc, s * 0.1, s * 0.1, p);
      st.color = p.color; st.strokeWidth = s * 0.08; canvas.drawLine(x - s, y - s * 0.3, x + s, y - s * 0.3, st);
      if (((time + b.seed) % 1.4) < 0.15) { p.color = col(0xFFFF1744); canvas.drawCircle(x, y + s * 0.25, s * 0.14, p); }
      break;
    case K_BIRD: {
      // Oiseau vu de loin : un « V » qui bat des ailes
      st.color = col(b.color); st.strokeWidth = s * 0.16;
      const wy = flap * s * 0.45;
      path.reset(); path.moveTo(x - s, y - wy); path.quadTo(x - s * 0.45, y - s * 0.35, x, y); path.quadTo(x + s * 0.45, y - s * 0.35, x + s, y - wy);
      canvas.drawPath(path, st);
      break;
    }
    case K_BAT: {
      p.color = col(b.color);
      const wy = flap * s * 0.5;
      path.reset(); path.moveTo(x, y - s * 0.1);
      path.lineTo(x - s * 0.5, y - s * 0.35 - wy); path.lineTo(x - s, y - wy * 0.6); path.lineTo(x - s * 0.7, y + s * 0.05); path.lineTo(x - s * 0.4, y - s * 0.05);
      path.lineTo(x, y + s * 0.2);
      path.lineTo(x + s * 0.4, y - s * 0.05); path.lineTo(x + s * 0.7, y + s * 0.05); path.lineTo(x + s, y - wy * 0.6); path.lineTo(x + s * 0.5, y - s * 0.35 - wy);
      path.close(); canvas.drawPath(path, p);
      break;
    }
    case K_GHOST:
      p.color = col(b.color);
      rc.set(x - s * 0.5, y - s * 0.7, x + s * 0.5, y + s * 0.3); canvas.drawArc(rc, 180, 180, true, p);
      path.reset(); path.moveTo(x - s * 0.5, y - s * 0.2); path.lineTo(x - s * 0.5, y + s * 0.5);
      for (let i = 0; i < 4; i++) path.lineTo(x - s * 0.5 + (i + 0.5) * s * 0.25, y + s * (i % 2 === 0 ? 0.3 : 0.5) + sin(time * 5 + i) * s * 0.06);
      path.lineTo(x + s * 0.5, y + s * 0.5); path.lineTo(x + s * 0.5, y - s * 0.2); path.close(); canvas.drawPath(path, p);
      p.color = col(0xFF263238); canvas.drawCircle(x - s * 0.17, y - s * 0.25, s * 0.08, p); canvas.drawCircle(x + s * 0.17, y - s * 0.25, s * 0.08, p);
      break;
    case K_NOTE:
      canvas.rotate(sin(time * 2 + b.seed) * 12, x, y);
      p.color = col(b.color); oval(x - s * 0.35, y + s * 0.15, x + s * 0.15, y + s * 0.5);
      st.color = p.color; st.strokeWidth = s * 0.1;
      canvas.drawLine(x + s * 0.12, y + s * 0.3, x + s * 0.12, y - s * 0.5, st);
      canvas.drawLine(x + s * 0.12, y - s * 0.5, x + s * 0.42, y - s * 0.3, st);
      break;
    case K_CONFETTI: {
      canvas.rotate(time * 200 + b.seed * 30, x, y);
      const sq = abs(sin(time * 5 + b.seed));
      p.color = col(b.color); canvas.drawRect(x - s * 0.5, y - s * 0.3 * (0.3 + sq), x + s * 0.5, y + s * 0.3 * (0.3 + sq), p);
      break;
    }
    case K_FIREWORK: {
      const q = Math.max(0, Math.min(1, b.age / b.life)), rad = s * (0.2 + 0.8 * (1 - (1 - q) * (1 - q)));
      p.color = col(b.color, 1 - q * 0.7);
      for (let i = 0; i < 12; i++) { const a = i * 0.5236 + b.seed; canvas.drawCircle(x + cos(a) * rad, y + sin(a) * rad + q * q * s * 0.3, s * 0.05 * (1 - q * 0.5), p); }
      break;
    }
    case K_PETAL: {
      canvas.rotate(time * 70 + b.seed * 30, x, y);
      const sq = 0.35 + 0.65 * abs(sin(time * 2.5 + b.seed));
      p.color = col(b.color); oval(x - s * 0.5 * sq, y - s * 0.5, x + s * 0.5 * sq, y + s * 0.5);
      break;
    }
    case K_LANTERN:
      p.color = col(0xFFFFCC80, 0.35); canvas.drawCircle(x, y, s * 1.6, p);
      p.color = col(b.color); rc.set(x - s * 0.55, y - s * 0.7, x + s * 0.55, y + s * 0.7); canvas.drawRoundRect(rc, s * 0.3, s * 0.3, p);
      p.color = col(0xFFFFE082); rc.set(x - s * 0.25, y - s * 0.4, x + s * 0.25, y + s * 0.4); canvas.drawRoundRect(rc, s * 0.15, s * 0.15, p);
      break;
    case K_SPRINKLE:
      canvas.rotate(time * 90 + b.seed * 40, x, y);
      st.color = col(b.color); st.strokeWidth = s * 0.35; canvas.drawLine(x - s * 0.5, y, x + s * 0.5, y, st);
      break;
    case K_BUBBLE:
      st.color = col(b.color); st.strokeWidth = s * 0.12; canvas.drawCircle(x, y, s, st);
      p.color = col(0xFFFFFFFF, 0.7); canvas.drawCircle(x - s * 0.35, y - s * 0.35, s * 0.18, p);
      break;
    case K_LEAF:
      canvas.rotate(sin(time * 2 + b.seed) * 50 + b.seed * 20, x, y);
      p.color = col(b.color);
      path.reset(); path.moveTo(x, y - s * 0.6); path.quadTo(x + s * 0.45, y, x, y + s * 0.6); path.quadTo(x - s * 0.45, y, x, y - s * 0.6); canvas.drawPath(path, p);
      st.color = col(0xFF33691E); st.strokeWidth = s * 0.06; canvas.drawLine(x, y - s * 0.55, x, y + s * 0.75, st);
      break;
    case K_DRAGONFLY: {
      canvas.scale(dir, 1, x, y);
      const wy = abs(flap) * s * 0.15;
      p.color = col(0xFFFFFFFF, 0.55);
      oval(x - s * 0.15, y - s * 0.55 - wy, x + s * 0.15, y); oval(x + s * 0.05, y - s * 0.5 - wy, x + s * 0.35, y);
      st.color = col(b.color); st.strokeWidth = s * 0.14; canvas.drawLine(x - s * 0.7, y, x + s * 0.4, y, st);
      p.color = col(b.color); canvas.drawCircle(x + s * 0.5, y, s * 0.12, p);
      break;
    }
    case K_BUTTERFLY: {
      const op = 0.25 + 0.75 * abs(sin(time * 8 + b.seed));
      p.color = col(b.color);
      oval(x - s * op, y - s * 0.6, x, y + s * 0.1); oval(x, y - s * 0.6, x + s * op, y + s * 0.1);
      oval(x - s * 0.6 * op, y, x, y + s * 0.45); oval(x, y, x + s * 0.6 * op, y + s * 0.45);
      st.color = col(0xFF3E2723); st.strokeWidth = s * 0.1; canvas.drawLine(x, y - s * 0.4, x, y + s * 0.4, st);
      break;
    }
    case K_SEED:
      st.color = col(b.color); st.strokeWidth = s * 0.06;
      canvas.drawLine(x, y, x, y + s * 0.7, st);
      for (let i = 0; i < 7; i++) { const a = 3.4 + i * 0.45; canvas.drawLine(x, y, x + cos(a) * s * 0.5, y + sin(a) * s * 0.5, st); }
      p.color = col(0xFFA1887F); canvas.drawCircle(x, y + s * 0.75, s * 0.08, p);
      break;
    case K_GEAR:
      canvas.rotate(time * 12 * (b.seed > 50 ? 1 : -1) + b.seed, x, y);
      p.color = col(b.color);
      for (let i = 0; i < 8; i++) { canvas.save(); canvas.rotate(i * 45, x, y); canvas.drawRect(x - s * 0.13, y - s, x + s * 0.13, y - s * 0.7, p); canvas.restore(); }
      st.color = p.color; st.strokeWidth = s * 0.28; canvas.drawCircle(x, y, s * 0.6, st);
      canvas.drawCircle(x, y, s * 0.12, p);
      break;
    case K_PIXEL:
      p.color = col(b.color); canvas.drawRect(x - s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.5, p);
      break;
    case K_INVADER: {
      // Petit envahisseur en pixels (8 × 6), pattes qui bougent
      const rows = sin(time * 6 + b.seed) > 0 ? INVADER_A : INVADER_B, px = s / 4;
      p.color = col(b.color);
      rows.forEach((row, ry) => { for (let cx = 0; cx < 8; cx++) if (row[cx] === '#') canvas.drawRect(x + (cx - 4) * px, y + (ry - 3) * px, x + (cx - 3) * px, y + (ry - 2) * px, p); });
      break;
    }
    case K_BINARY:
      am.text.color = col(b.color); am.text.textSize = s;
      canvas.drawText(b.seed > 50 ? '1' : '0', x, y, am.text);
      break;
    case K_SCARAB: {
      canvas.scale(dir, 1, x, y);
      const wy = abs(flap) * s * 0.4;
      p.color = col(0xFFFFFFFF, 0.4); oval(x - s * 0.5, y - s * 0.4 - wy, x + s * 0.1, y - s * 0.05);
      p.color = col(b.color); oval(x - s * 0.55, y - s * 0.32, x + s * 0.45, y + s * 0.32);
      p.color = col(0xFF1B1B1B); canvas.drawCircle(x + s * 0.5, y, s * 0.18, p);
      break;
    }
    case K_TUMBLEWEED: {
      const hop = abs(sin(time * 3 + b.seed)) * s * 0.6;
      canvas.translate(0, -hop);
      canvas.rotate(time * 220 * dir + b.seed, x, y);
      st.color = col(b.color); st.strokeWidth = s * 0.07;
      canvas.drawCircle(x, y, s, st);
      for (let i = 0; i < 5; i++) { canvas.save(); canvas.rotate((i * 1.26 + b.seed) * 180 / Math.PI, x, y); rc.set(x - s * 0.8, y - s * 0.45, x + s * 0.8, y + s * 0.45); canvas.drawOval(rc, st); canvas.restore(); }
      break;
    }
    case K_TROOP: {
      // Section de soldats au pas : de 3 à 5, l'un derrière l'autre, casque, fusil à l'épaule
      const n = 3 + Math.floor(b.seed) % 3, dark = shadeC(b.color, 0.7);
      for (let i = 0; i < n; i++) {
        const sx0 = x - dir * i * s * 1.15, ph = time * 7 + i * 0.9 + b.seed, step = sin(ph), bob = abs(cos(ph)) * s * 0.06;
        st.color = col(dark); st.strokeWidth = s * 0.16;
        canvas.drawLine(sx0, y - s * 0.85, sx0 + step * s * 0.28, y, st);
        canvas.drawLine(sx0, y - s * 0.85, sx0 - step * s * 0.28, y, st);
        p.color = col(b.color); rc.set(sx0 - s * 0.2, y - s * 1.6 - bob, sx0 + s * 0.2, y - s * 0.8 - bob); canvas.drawRoundRect(rc, s * 0.08, s * 0.08, p);
        st.color = col(0xFF3A3328); st.strokeWidth = s * 0.07;
        canvas.drawLine(sx0 - dir * s * 0.1, y - s * 1.05 - bob, sx0 + dir * s * 0.25, y - s * 2.0 - bob, st);
        p.color = col(0xFFE0B08A); canvas.drawCircle(sx0, y - s * 1.82 - bob, s * 0.19, p);
        p.color = col(dark); rc.set(sx0 - s * 0.25, y - s * 2.1 - bob, sx0 + s * 0.25, y - s * 1.75 - bob); canvas.drawArc(rc, 180, 180, true, p);
      }
      break;
    }
    case K_TANK: {
      // Char : chenille qui défile, caisse, tourelle et canon tournés dans le sens de la marche
      const jig = sin(time * 30 + b.seed) * s * 0.012;
      canvas.translate(0, jig);
      p.color = col(0xFF2B2A26); rc.set(x - s, y - s * 0.36, x + s, y); canvas.drawRoundRect(rc, s * 0.18, s * 0.18, p);
      p.color = col(0xFF55524A);
      for (let i = 0; i < 5; i++) canvas.drawCircle(x - s * 0.72 + i * s * 0.36, y - s * 0.18, s * 0.12, p);
      st.color = col(0xFF14130F); st.strokeWidth = s * 0.04;
      const off = ((time * b.vx / s * 0.5) % 1 + 1) % 1;
      for (let i = 0; i < 8; i++) { const tx = x - s + ((i + off) / 8) * 2 * s; canvas.drawLine(tx, y - s * 0.36, tx, y - s * 0.3, st); }
      p.color = col(b.color);
      path.reset(); path.moveTo(x - s * 0.95, y - s * 0.34); path.lineTo(x - s * 0.85, y - s * 0.62); path.lineTo(x + s * 0.8, y - s * 0.62);
      path.lineTo(x + s * 1.02, y - s * 0.34); path.close(); canvas.drawPath(path, p);
      st.color = col(shadeC(b.color, 0.75)); st.strokeWidth = s * 0.11;
      canvas.drawLine(x + dir * s * 0.2, y - s * 0.78, x + dir * s * 1.25, y - s * 0.8, st);
      p.color = col(shadeC(b.color, 0.88)); rc.set(x - s * 0.45, y - s * 0.98, x + s * 0.4, y - s * 0.58); canvas.drawRoundRect(rc, s * 0.16, s * 0.16, p);
      p.color = col(0xFFFFFFFF, 0.55); canvas.drawCircle(x - dir * s * 0.1, y - s * 0.8, s * 0.07, p);
      break;
    }
    case K_JEEP: {
      // Jeep qui cahote : capot à l'avant, pare-brise, roue de secours à l'arrière, un soldat au volant
      const bump = abs(sin(time * 9 + b.seed)) * s * 0.05;
      p.color = col(0xFFE0B08A); canvas.drawCircle(x - dir * s * 0.1, y - s * 0.95 - bump, s * 0.15, p);
      p.color = col(shadeC(b.color, 0.7)); rc.set(x - dir * s * 0.1 - s * 0.18, y - s * 1.14 - bump, x - dir * s * 0.1 + s * 0.18, y - s * 0.9 - bump); canvas.drawArc(rc, 180, 180, true, p);
      st.color = col(0xFF9EB6C0, 0.9); st.strokeWidth = s * 0.06;
      canvas.drawLine(x + dir * s * 0.25, y - s * 0.55 - bump, x + dir * s * 0.12, y - s * 0.98 - bump, st);
      p.color = col(b.color);
      canvas.save(); if (dir < 0) canvas.scale(-1, 1, x, y);
      path.reset(); path.moveTo(x - s, y - s * 0.22 - bump); path.lineTo(x - s, y - s * 0.62 - bump); path.lineTo(x + s * 0.25, y - s * 0.62 - bump);
      path.lineTo(x + s * 0.3, y - s * 0.48 - bump); path.lineTo(x + s, y - s * 0.46 - bump); path.lineTo(x + s, y - s * 0.22 - bump); path.close();
      canvas.drawPath(path, p); canvas.restore();
      p.color = col(0xFF1E1E1E);
      canvas.drawCircle(x - s * 0.6, y - s * 0.2, s * 0.22, p); canvas.drawCircle(x + s * 0.6, y - s * 0.2, s * 0.22, p);
      canvas.drawCircle(x - dir * s * 1.05, y - s * 0.45 - bump, s * 0.17, p);
      p.color = col(0xFF8A8A80);
      canvas.drawCircle(x - s * 0.6, y - s * 0.2, s * 0.09, p); canvas.drawCircle(x + s * 0.6, y - s * 0.2, s * 0.09, p);
      p.color = col(0xFFFFE08A, 0.9); canvas.drawCircle(x + dir * s * 0.95, y - s * 0.38 - bump, s * 0.06, p);
      break;
    }
    case K_PLANE: {
      // Avion de transport qui roule au sol : fuselage, dérive, aile, hublots, train d'atterrissage, feu qui clignote
      if (dir < 0) canvas.scale(-1, 1, x, y);
      p.color = col(0xFF1E1E1E);
      canvas.drawCircle(x + s * 0.75, y - s * 0.1, s * 0.1, p); canvas.drawCircle(x - s * 0.15, y - s * 0.1, s * 0.12, p); canvas.drawCircle(x + s * 0.05, y - s * 0.1, s * 0.12, p);
      st.color = col(0xFF3A3A3A); st.strokeWidth = s * 0.05;
      canvas.drawLine(x + s * 0.75, y - s * 0.1, x + s * 0.75, y - s * 0.35, st); canvas.drawLine(x - s * 0.05, y - s * 0.1, x - s * 0.05, y - s * 0.35, st);
      p.color = col(shadeC(b.color, 0.85));
      path.reset(); path.moveTo(x - s * 0.85, y - s * 0.6); path.lineTo(x - s * 1.25, y - s * 1.35); path.lineTo(x - s * 1.02, y - s * 1.35); path.lineTo(x - s * 0.5, y - s * 0.62); path.close(); canvas.drawPath(path, p);
      p.color = col(b.color);
      path.reset(); path.moveTo(x + s * 1.2, y - s * 0.5);
      path.quadTo(x + s * 1.18, y - s * 0.78, x + s * 0.85, y - s * 0.8);
      path.lineTo(x - s * 0.7, y - s * 0.78); path.lineTo(x - s * 1.25, y - s * 0.7); path.lineTo(x - s * 1.2, y - s * 0.56);
      path.lineTo(x - s * 0.6, y - s * 0.32); path.lineTo(x + s * 0.9, y - s * 0.32);
      path.quadTo(x + s * 1.18, y - s * 0.34, x + s * 1.2, y - s * 0.5); path.close(); canvas.drawPath(path, p);
      p.color = col(shadeC(b.color, 0.7)); rc.set(x - s * 0.45, y - s * 0.6, x + s * 0.35, y - s * 0.46); canvas.drawOval(rc, p);
      p.color = col(0xFF2E3B46); rc.set(x + s * 0.9, y - s * 0.72, x + s * 1.08, y - s * 0.6); canvas.drawOval(rc, p);
      p.color = col(0xFF2E3B46, 0.8);
      for (let i = 0; i < 5; i++) canvas.drawCircle(x + s * 0.65 - i * s * 0.26, y - s * 0.66, s * 0.035, p);
      p.color = col(sin(time * 5 + b.seed) > 0.6 ? 0xFFFF3B3B : 0xFF7A2020); canvas.drawCircle(x - s * 1.2, y - s * 1.36, s * 0.05, p);
      break;
    }
    case K_BALLOON:
      st.color = col(0xFFECEFF1, 0.7); st.strokeWidth = s * 0.05;
      canvas.drawLine(x, y + s * 0.7, x + sin(time * 2 + b.seed) * s * 0.2, y + s * 1.8, st);
      p.color = col(b.color); oval(x - s * 0.55, y - s * 0.7, x + s * 0.55, y + s * 0.7);
      p.color = col(0xFFFFFFFF, 0.5); canvas.drawCircle(x - s * 0.2, y - s * 0.3, s * 0.13, p);
      break;
  }
  canvas.restore();
}
