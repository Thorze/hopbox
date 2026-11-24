'use strict';
// Décors vivants : ce qui bouge DANS un fond peint (l'eau, les bateaux…). Équivalent de SceneLive.kt.
// Dessiné entre le fond (images/scenes/cN.webp) et son premier plan détouré (cNf.webp, fait par tools/scenes),
// dans les coordonnées de l'image peinte (720 × 1600) : les bateaux passent derrière palmiers, papyrus et obélisque.

const slP = new Paint(), slS = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' }), slPath = new Path();
const slA = (a) => clamp(Math.round(a), 0, 255), slR = new RectF();

// ---------- 25 : le Nil au coucher du soleil ----------
// Repères du fond peint (tools/scenes/scenes4.js) : rive d'en face, bas du fleuve visible, x du soleil.
const SL_NILE_TOP = 905, SL_NILE_BOT = 1205, SL_NILE_SUN = 470;
// Felouques : [ligne d'eau, taille, vitesse (px de l'image / s, + vers la droite), départ, phase]
const SL_FELUCCAS = [[972, 0.32, 6, 150, 0], [1050, 0.5, -10, 520, 1.7], [1145, 0.7, 14, 260, 3.1]];

function slNile(canvas, t) {
  const span = SL_NILE_BOT - SL_NILE_TOP;
  // Vaguelettes sombres qui descendent doucement le courant
  for (let i = 0; i < 46; i++) {
    const h1 = hash01(i * 41 + 3), h2 = hash01(i * 19 + 7), d = h1 ** 1.2, y = SL_NILE_TOP + 10 + d * (span - 16);
    const len = (14 + 50 * h2) * (0.35 + 0.95 * d);
    let x = h2 * 900 - (3 + 7 * d) * t;
    x = ((x % 900) + 900) % 900 - 90;
    slS.color = Color.argb(slA(40 + 50 * d), 16, 40, 90); slS.strokeWidth = 1 + 1.6 * d;
    canvas.drawLine(x, y, x + len, y, slS);
  }
  // Reflets clairs : ils glissent avec le courant et s'allument en passant dans la colonne du soleil
  for (let i = 0; i < 120; i++) {
    const h1 = hash01(i * 31 + 7), h2 = hash01(i * 17 + 3), h3 = hash01(i * 53 + 11);
    const d = h1 ** 1.3, y = SL_NILE_TOP + 4 + d * (span - 10);
    const len = (10 + 46 * h2) * (0.35 + 0.95 * d), sp = (4 + 10 * d) * (0.7 + 0.6 * h3);
    let x = h2 * 900 - sp * t;
    x = ((x % 900) + 900) % 900 - 90;
    const pulse = 0.5 + 0.5 * Math.sin(t * (0.6 + 1.2 * h3) + i * 2.1);
    const sun = Math.max(0, 1 - Math.abs(x + len / 2 - SL_NILE_SUN) / (40 + 110 * d));
    if (sun > 0) slS.color = Color.argb(slA((70 + 170 * sun) * pulse), 255, 230, 170);
    else if (d < 0.3) slS.color = Color.argb(slA(110 * pulse), 255, 214, 176);
    else slS.color = Color.argb(slA((50 + 90 * h3) * pulse), 196, 226, 255);
    slS.strokeWidth = 0.9 + 1.8 * d;
    canvas.drawLine(x, y, x + len, y, slS);
  }
  // Colonne du soleil : des éclats qui dansent sur place, et quelques étincelles
  for (let i = 0; i < 48; i++) {
    const h1 = hash01(i * 23 + 5), h2 = hash01(i * 37 + 1), h3 = hash01(i * 61 + 9);
    const d = h1, y = SL_NILE_TOP + 3 + d * (span - 20), spread = 12 + 70 * d;
    const x = SL_NILE_SUN + (h2 * 2 - 1) * spread + Math.sin(t * (0.8 + h3) + i) * spread * 0.3;
    const len = (6 + 26 * h3) * (0.5 + 0.8 * d) * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.3));
    slS.color = Color.argb(slA(220 * (0.3 + 0.7 * Math.max(0, Math.sin(t * (1 + 2 * h3) + i * 1.9))) * (1 - d * 0.45)), 255, 242, 200);
    slS.strokeWidth = 1.2 + 1.6 * d;
    canvas.drawLine(x - len / 2, y, x + len / 2, y, slS);
  }
  for (let i = 0; i < 12; i++) {
    const h1 = hash01(i * 71 + 13), h2 = hash01(i * 29 + 17), f = Math.max(0, Math.sin(t * (1.1 + h2) + i * 3.3)) ** 10;
    if (f < 0.05) continue;
    const d = h1, y = SL_NILE_TOP + 6 + d * (span * 0.8), x = SL_NILE_SUN + (h2 * 2 - 1) * (16 + 60 * d), r = (3 + 4 * d) * f;
    slS.color = Color.argb(slA(255 * f), 255, 250, 225); slS.strokeWidth = 1.2;
    canvas.drawLine(x - r, y, x + r, y, slS); canvas.drawLine(x, y - r * 0.6, x, y + r * 0.6, slS);
  }
  // Felouques, de la plus lointaine à la plus proche
  for (const [y, s, v, x0, ph] of SL_FELUCCAS) {
    let x = x0 + v * t;
    x = ((x % 1000) + 1000) % 1000 - 150;
    slFelucca(canvas, x, y, s, v > 0 ? 1 : -1, t, ph);
  }
}

/** Felouque qui glisse (ligne d'eau en x, y), tournée vers dir : reflet, sillage, coque qui tangue, voile qui se gonfle. */
function slFelucca(canvas, x, y, s, dir, t, ph) {
  const bob = Math.sin(t * 1.3 + ph) * 1.6 * s, rock = Math.sin(t * 1.05 + ph) * 2.2, belly = 14 + 5 * Math.sin(t * 0.9 + ph * 2);
  // Sillage : traînées derrière la poupe, et un peu d'écume à la proue
  for (let k = 0; k < 4; k++) {
    const yy = y + (2 + k * 3.5) * s, len = (50 + 30 * k + 12 * Math.sin(t * 2 + k + ph)) * s, x0 = x - dir * (56 + k * 10) * s;
    slS.color = Color.argb(slA(110 - k * 22), 230, 240, 255); slS.strokeWidth = (1.8 - k * 0.3) * s;
    canvas.drawLine(x0, yy, x0 - dir * len, yy, slS);
  }
  slS.color = Color.argb(160, 255, 255, 255); slS.strokeWidth = 1.6 * s;
  const fw = (10 + 4 * Math.sin(t * 3 + ph)) * s;
  canvas.drawLine(x + dir * 60 * s, y + 1.5 * s, x + dir * (60 * s + fw), y + 2.5 * s, slS);
  // Reflet : la barque renversée, écrasée et pâle, coupée par des rides qui bougent
  canvas.save(); canvas.translate(x, y + 3 * s); canvas.scale(dir, -0.5);
  slFeluccaShape(canvas, s, belly, 0.26);
  canvas.restore();
  slS.color = Color.argb(120, 30, 70, 130); slS.strokeWidth = 2 * s;
  for (let k = 0; k < 4; k++) {
    const yy = y + (12 + k * 18) * s, sh = Math.sin(t * 1.6 + k * 1.3 + ph) * 18 * s;
    canvas.drawLine(x - 50 * s + sh, yy, x + 30 * s + sh, yy, slS);
  }
  // La barque
  canvas.save(); canvas.translate(x, y + bob); canvas.rotate(rock); canvas.scale(dir, 1);
  slFeluccaShape(canvas, s, belly, 1);
  canvas.restore();
}

/** Felouque tournée vers la droite, ligne d'eau en (0, 0) : grande voile latine sur sa vergue, coque en croissant, batelier. */
function slFeluccaShape(canvas, s, belly, a) {
  const A = (al) => slA(255 * a * al);
  // Voile : entre la vergue (longue, très inclinée), la bordure du bas et la chute gonflée par le vent
  slPath.reset();
  slPath.moveTo(58 * s, -26 * s); slPath.lineTo(-62 * s, -196 * s);
  slPath.quadTo((-56 - belly * 1.3) * s, -108 * s, -50 * s, -30 * s);
  slPath.quadTo(4 * s, -22 * s, 58 * s, -26 * s); slPath.close();
  slP.shader = null; slP.color = Color.argb(A(1), 250, 232, 204); canvas.drawPath(slPath, slP);
  // Creux de la voile, dans l'ombre le long de la chute
  slPath.reset();
  slPath.moveTo(-62 * s, -196 * s); slPath.quadTo((-56 - belly * 1.3) * s, -108 * s, -50 * s, -30 * s);
  slPath.lineTo(-30 * s, -30 * s); slPath.quadTo((-44 - belly * 0.5) * s, -110 * s, -62 * s, -196 * s); slPath.close();
  slP.color = Color.argb(A(0.85), 214, 182, 146); canvas.drawPath(slPath, slP);
  if (a > 0.5) {
    // Coutures des laizes, liseré doré du couchant le long de la vergue
    slS.color = Color.argb(A(0.22), 140, 110, 80); slS.strokeWidth = 1 * s;
    for (let k = 1; k <= 3; k++) {
      const f = k / 4;
      canvas.drawLine((58 - 120 * f) * s, (-26 - 170 * f) * s, (58 - 108 * f) * s, (-26 - 4 * f) * s, slS);
    }
    slS.color = Color.argb(A(0.75), 255, 214, 140); slS.strokeWidth = 1.6 * s;
    canvas.drawLine(56 * s, -28 * s, -60 * s, -192 * s, slS);
  }
  // Mât et vergue
  slS.color = Color.argb(A(1), 58, 32, 16); slS.strokeWidth = 3 * s;
  canvas.drawLine(10 * s, -6 * s, 12 * s, -98 * s, slS);
  slS.color = Color.argb(A(1), 80, 48, 24); slS.strokeWidth = 2.6 * s;
  canvas.drawLine(64 * s, -20 * s, -66 * s, -202 * s, slS);
  // Batelier assis à la poupe
  slS.color = Color.argb(A(1), 42, 26, 16); slS.strokeWidth = 6 * s;
  canvas.drawLine(-40 * s, -14 * s, -40 * s, -28 * s, slS);
  slP.color = Color.argb(A(1), 42, 26, 16); canvas.drawCircle(-40 * s, -33 * s, 4.5 * s, slP);
  slP.color = Color.argb(A(1), 240, 236, 224); canvas.drawCircle(-40 * s, -35.5 * s, 3.4 * s, slP);
  // Coque en croissant, poupe et proue relevées, bande peinte
  slPath.reset();
  slPath.moveTo(-66 * s, -18 * s); slPath.quadTo(0, 16 * s, 68 * s, -24 * s); slPath.quadTo(0, -6 * s, -66 * s, -18 * s); slPath.close();
  slP.color = Color.argb(A(1), 74, 42, 20); canvas.drawPath(slPath, slP);
  slPath.reset(); slPath.moveTo(-66 * s, -18 * s); slPath.quadTo(0, -6 * s, 68 * s, -24 * s);
  slS.color = Color.argb(A(1), 200, 120, 58); slS.strokeWidth = 2.6 * s; canvas.drawPath(slPath, slS);
  slPath.reset(); slPath.moveTo(-58 * s, -10 * s); slPath.quadTo(0, 2 * s, 60 * s, -15 * s);
  slS.color = Color.argb(A(0.8), 60, 110, 170); slS.strokeWidth = 1.8 * s; canvas.drawPath(slPath, slS);
}

// ---------- 26 : Babylone, les jardins suspendus ----------
// Repères du fond peint (tools/scenes/scenes4.js) : rive d'en face, bas de l'Euphrate, x du soleil, cascades [x, haut, bas, largeur].
const SL_BA_TOP = 1150, SL_BA_BOT = 1300, SL_BA_SUN = 566;
const SL_BA_FALLS = [[132, 704, 822, 14], [186, 824, 942, 16], [240, 944, 1062, 18], [298, 1064, 1170, 22]];
// Guffas (barques rondes en vannerie) : [ligne d'eau, taille, vitesse, départ, phase]
const SL_GUFFAS = [[1196, 0.45, 5, 420, 0], [1262, 0.7, -7, 160, 2.3]];

function slBabylon(canvas, t) {
  const span = SL_BA_BOT - SL_BA_TOP;
  // L'Euphrate : vaguelettes et reflets qui glissent lentement, colonne de soleil qui danse
  for (let i = 0; i < 60; i++) {
    const h1 = hash01(i * 43 + 5), h2 = hash01(i * 13 + 9), h3 = hash01(i * 57 + 2), d = h1 ** 1.2, y = SL_BA_TOP + 6 + d * (span - 12);
    const len = (12 + 44 * h2) * (0.4 + 0.9 * d);
    let x = h2 * 900 - (3 + 8 * d) * (0.7 + 0.6 * h3) * t;
    x = ((x % 900) + 900) % 900 - 90;
    const pulse = 0.5 + 0.5 * Math.sin(t * (0.7 + h3) + i * 1.7);
    const sun = Math.max(0, 1 - Math.abs(x + len / 2 - SL_BA_SUN) / (30 + 90 * d));
    if (i % 3 === 0) slS.color = Color.argb(slA(50 + 40 * d), 20, 60, 110);
    else if (sun > 0) slS.color = Color.argb(slA((80 + 170 * sun) * pulse), 255, 246, 214);
    else slS.color = Color.argb(slA((60 + 100 * h3) * pulse), 236, 248, 255);
    slS.strokeWidth = 0.9 + 1.7 * d;
    canvas.drawLine(x, y, x + len, y, slS);
  }
  for (let i = 0; i < 30; i++) {
    const h1 = hash01(i * 23 + 15), h2 = hash01(i * 37 + 11), h3 = hash01(i * 61 + 19), d = h1, y = SL_BA_TOP + 3 + d * (span - 16);
    const x = SL_BA_SUN + (h2 * 2 - 1) * (10 + 60 * d) + Math.sin(t * (0.8 + h3) + i) * 8;
    const len = (6 + 22 * h3) * (0.5 + 0.8 * d) * (0.6 + 0.4 * Math.sin(t * 1.6 + i * 1.3));
    slS.color = Color.argb(slA(230 * (0.3 + 0.7 * Math.max(0, Math.sin(t * (1 + 2 * h3) + i * 1.9))) * (1 - d * 0.4)), 255, 252, 230);
    slS.strokeWidth = 1.2 + 1.4 * d;
    canvas.drawLine(x - len / 2, y, x + len / 2, y, slS);
  }
  // Cascades des jardins : filets d'eau qui tombent, écume et embruns en bas
  for (let f = 0; f < SL_BA_FALLS.length; f++) {
    const [fx, ft, fb, fw] = SL_BA_FALLS[f], top = ft + 18, hh = fb - top;
    for (let i = 0; i < 9; i++) {
      const h1 = hash01(f * 97 + i * 7 + 1), h2 = hash01(f * 31 + i * 11 + 3);
      const xx = fx + (h1 - 0.5) * fw * 0.8, len = 14 + 26 * h2, q = ((t * (70 + 40 * h2) + h1 * hh) % (hh + len));
      const y0 = top + q - len, ya = Math.max(top, y0), yb = Math.min(fb, y0 + len);
      if (yb <= ya) continue;
      slS.color = Color.argb(slA(150 + 90 * h2), 255, 255, 255); slS.strokeWidth = 1.2 + 1.4 * h1;
      canvas.drawLine(xx, ya, xx, yb, slS);
    }
    slS.color = Color.argb(200, 255, 255, 255); slS.strokeWidth = 2;
    canvas.drawLine(fx - fw * 0.38, ft + 5, fx + fw * 0.38, ft + 5, slS);
    for (let i = 0; i < 7; i++) {
      const q = ((t * 0.9 + i / 7 + f * 0.13) % 1), h1 = hash01(f * 13 + i * 5 + 7);
      const r = (2 + 6 * q) * (0.8 + 0.4 * h1);
      slP.color = Color.argb(slA(200 * (1 - q)), 255, 255, 255);
      canvas.drawCircle(fx + (h1 - 0.5) * fw * 1.8 * (0.4 + q), fb - 3 - q * 14 * h1, r * 0.6, slP);
    }
    slS.color = Color.argb(slA(120 + 60 * Math.sin(t * 5 + f)), 255, 255, 255); slS.strokeWidth = 1.4;
    const rw = fw * (0.9 + 0.25 * Math.sin(t * 4 + f * 2));
    canvas.drawLine(fx - rw, fb + 1, fx + rw, fb + 1, slS);
  }
  // Guffas qui dérivent au fil de l'eau
  for (const [y, s, v, x0, ph] of SL_GUFFAS) {
    let x = x0 + v * t;
    x = ((x % 1000) + 1000) % 1000 - 150;
    slGuffa(canvas, x, y, s, t, ph, v > 0 ? 1 : -1);
  }
  // Colombes : deux petits vols qui traversent le ciel
  for (let g = 0; g < 2; g++) {
    const per = 34 + g * 9, q = ((t + g * 17) % per) / per, dir = g ? -1 : 1;
    const bx = dir > 0 ? -120 + q * 960 : 840 - q * 960, by = (g ? 470 : 620) + Math.sin(q * 6.3 + g) * 30;
    for (let i = 0; i < (g ? 4 : 6); i++) {
      const ox = -dir * (i * 26 + (i % 2) * 8), oy = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 14 + hash01(i + g * 9) * 10;
      slDove(canvas, bx + ox, by + oy, g ? 0.8 : 1, t * (9 + i * 0.7) + i * 1.3, dir);
    }
  }
}

/** Guffa : barque ronde en vannerie, batelier qui pagaie, jarres (ligne d'eau en x, y), reflet et rides. */
function slGuffa(canvas, x, y, s, t, ph, dir) {
  const bob = Math.sin(t * 1.4 + ph) * 1.4 * s, rock = Math.sin(t * 1.1 + ph) * 3;
  // Rides en anneaux autour de la barque
  for (let k = 0; k < 3; k++) {
    const q = (t * 0.5 + k / 3 + ph) % 1;
    slS.color = Color.argb(slA(130 * (1 - q)), 235, 248, 255); slS.strokeWidth = 1.4 * s;
    slR.set(x - (52 + 40 * q) * s, y - (6 + 5 * q) * s, x + (52 + 40 * q) * s, y + (8 + 6 * q) * s);
    canvas.drawOval(slR, slS);
  }
  // Reflet sombre écrasé
  slP.color = Color.argb(70, 30, 50, 70); slR.set(x - 46 * s, y + 2 * s, x + 46 * s, y + 18 * s); canvas.drawOval(slR, slP);
  canvas.save(); canvas.translate(x, y + bob); canvas.rotate(rock);
  // Batelier debout à l'arrière, pagaie qui plonge
  const pg = Math.sin(t * 1.8 + ph);
  slS.color = Color.argb(255, 60, 36, 20); slS.strokeWidth = 2.6 * s;
  canvas.drawLine(-dir * 14 * s, -44 * s, dir * (10 + 16 * pg) * s, 8 * s, slS);
  slS.color = Color.argb(255, 230, 220, 196); slS.strokeWidth = 9 * s;
  canvas.drawLine(-dir * 18 * s, -14 * s, -dir * 18 * s, -36 * s, slS);
  slP.color = Color.argb(255, 120, 72, 40); canvas.drawCircle(-dir * 18 * s, -42 * s, 5 * s, slP);
  slP.color = Color.argb(255, 200, 40, 40); canvas.drawCircle(-dir * 18 * s, -45 * s, 4.4 * s, slP);
  // Jarres de la cargaison
  for (const [u, c] of [[8, 0xFFC8642E], [20, 0xFFE08A4A]]) {
    slP.color = c; slR.set(dir * u * s - 6 * s, -24 * s, dir * u * s + 6 * s, -8 * s); canvas.drawOval(slR, slP);
  }
  // Coque ronde : panier tressé, bord épais
  slP.color = Color.argb(255, 120, 82, 42); slR.set(-40 * s, -16 * s, 40 * s, 10 * s); canvas.drawOval(slR, slP);
  slP.color = Color.argb(255, 168, 120, 64); slR.set(-40 * s, -16 * s, 40 * s, -2 * s); canvas.drawOval(slR, slP);
  slS.color = Color.argb(160, 90, 56, 26); slS.strokeWidth = 1.2 * s;
  for (let k = -3; k <= 3; k++) canvas.drawLine(k * 10 * s, -9 * s + Math.abs(k) * 0.6 * s, k * 9 * s, 7 * s - Math.abs(k) * 1.2 * s, slS);
  slS.color = Color.argb(255, 200, 150, 84); slS.strokeWidth = 3 * s;
  slR.set(-40 * s, -17 * s, 40 * s, -3 * s); canvas.drawOval(slR, slS);
  canvas.restore();
}

/** Colombe blanche en vol (centre x, y), ailes qui battent selon la phase fl. */
function slDove(canvas, x, y, s, fl, dir) {
  const up = Math.sin(fl), wy = -up * 9 * s, tip = -up * 3 * s;
  slS.color = Color.argb(230, 255, 255, 255); slS.strokeWidth = 2.4 * s;
  slPath.reset();
  slPath.moveTo(x - 13 * s, y + wy + tip); slPath.quadTo(x - 6 * s, y + wy * 0.6 - 2 * s, x, y);
  slPath.quadTo(x + 6 * s, y + wy * 0.6 - 2 * s, x + 13 * s, y + wy + tip);
  canvas.drawPath(slPath, slS);
  slP.color = Color.argb(240, 255, 255, 255); slR.set(x - 5 * s, y - 2 * s, x + 5 * s, y + 2.4 * s); canvas.drawOval(slR, slP);
  canvas.drawCircle(x + dir * 5 * s, y - 1 * s, 2 * s, slP);
}

// ---------- 27 : l'Olympe ----------
// Repères du fond peint : haut et bas de la mer de nuages, sommet de l'Olympe (sous le nuage d'orage), porte du temple.
const SL_GR_TOP = 1040, SL_GR_BOT = 1330, SL_GR_PEAK_X = 214, SL_GR_PEAK_Y = 560, SL_GR_DOOR_X = 560, SL_GR_DOOR_Y = 1060;

function slOlympus(canvas, t) {
  // Éclairs de Zeus : un toutes les 5 s environ, du nuage d'orage vers le sommet ou dans le ciel, avec un flash
  const per = 5.2, cyc = Math.floor(t / per), u = t - cyc * per;
  if (u < 0.5) {
    const a = u < 0.08 ? 1 : u < 0.16 ? 0.4 : u < 0.24 ? 0.9 : Math.max(0, 1 - (u - 0.24) / 0.26);
    for (let i = 0; i < 5; i++) { slP.color = Color.argb(slA(32 * a), 255, 255, 230); canvas.drawCircle(SL_GR_PEAK_X + 20, SL_GR_PEAK_Y - 70, 160 - i * 28, slP); }
    const x0 = SL_GR_PEAK_X - 60 + hash01(cyc * 7) * 140, y0 = SL_GR_PEAK_Y - 60;
    const toPeak = hash01(cyc * 3 + 1) < 0.5, x1 = toPeak ? SL_GR_PEAK_X : x0 + (hash01(cyc * 5 + 2) - 0.5) * 240, y1 = toPeak ? SL_GR_PEAK_Y - 6 : y0 + 110 + hash01(cyc * 9) * 80;
    slBolt(canvas, x0, y0, x1, y1, cyc, a);
  } else if (u > 2.6 && u < 2.75) {
    for (let i = 0; i < 3; i++) { slP.color = Color.argb(22, 255, 255, 230); canvas.drawCircle(SL_GR_PEAK_X - 30 + hash01(cyc) * 90, SL_GR_PEAK_Y - 76, 70 - i * 20, slP); }
  }
  // Mer de nuages qui dérive lentement (bouffées blanches devant les montagnes, derrière la terrasse)
  for (let i = 0; i < 14; i++) {
    const h1 = hash01(i * 17 + 3), h2 = hash01(i * 29 + 5), d = h1;
    const y = SL_GR_TOP + 20 + d * (SL_GR_BOT - SL_GR_TOP - 60), sp = (4 + 10 * d) * (i % 2 ? 1 : -0.7);
    const x = ((h2 * 1100 + sp * t) % 1100 + 1100) % 1100 - 190, r = 18 + 26 * d;
    for (let j = 0; j < 5; j++) {
      const ox = (j - 2) * r * 0.9, oy = -Math.abs(j - 2) * -r * 0.12 - (j % 2) * r * 0.25;
      slP.color = Color.argb(slA(90 + 70 * d), 255, 255, 255); canvas.drawCircle(x + ox, y + oy, r * (1 - Math.abs(j - 2) * 0.18), slP);
    }
  }
  // Paillettes d'or qui montent de la porte du temple
  for (let i = 0; i < 16; i++) {
    const h1 = hash01(i * 41 + 9), q = (t * (0.18 + 0.12 * h1) + hash01(i * 13)) % 1;
    const x = SL_GR_DOOR_X + (h1 - 0.5) * 50 + Math.sin(t * 1.5 + i) * 8, y = SL_GR_DOOR_Y - q * 220;
    slP.color = Color.argb(slA(230 * Math.sin(q * Math.PI)), 255, 220, 110); canvas.drawCircle(x, y, 1.6 + 1.6 * h1, slP);
  }
  // Pégase traverse le ciel de temps en temps
  const pq = (t % 38) / 14;
  if (pq < 1) slPegasus(canvas, -120 + pq * 960, 430 - Math.sin(pq * Math.PI) * 90, 1.25, t);
}

/** Éclair en zigzag (de x0, y0 à x1, y1), forme tirée du numéro seed, intensité a. */
function slBolt(canvas, x0, y0, x1, y1, seed, a) {
  slPath.reset(); slPath.moveTo(x0, y0);
  const n = 7;
  for (let i = 1; i < n; i++) { const q = i / n; slPath.lineTo(x0 + (x1 - x0) * q + (hash01(seed * 31 + i) - 0.5) * 46, y0 + (y1 - y0) * q); }
  slPath.lineTo(x1, y1);
  slS.color = Color.argb(slA(90 * a), 190, 210, 255); slS.strokeWidth = 9; canvas.drawPath(slPath, slS);
  slS.color = Color.argb(slA(255 * a), 255, 255, 255); slS.strokeWidth = 2.6; canvas.drawPath(slPath, slS);
}

/** Pégase, cheval ailé blanc qui galope dans le ciel vers la droite (centre x, y, échelle s). */
function slPegasus(canvas, x, y, s, t) {
  const fl = Math.sin(t * 7), gal = Math.sin(t * 9);
  const wing = (dx, al) => {
    slPath.reset(); slPath.moveTo(x + dx * s, y - 6 * s);
    slPath.quadTo(x + (dx - 6) * s, y - (34 + 30 * fl) * s, x + (dx - 40) * s, y - (50 + 44 * fl) * s);
    slPath.quadTo(x + (dx - 30) * s, y - (36 + 30 * fl) * s, x + (dx - 34) * s, y - (30 + 24 * fl) * s);
    slPath.quadTo(x + (dx - 14) * s, y - (18 + 10 * fl) * s, x + (dx + 12) * s, y - 4 * s); slPath.close();
    slP.color = Color.argb(al, 255, 255, 255); canvas.drawPath(slPath, slP);
    slS.color = Color.argb(al, 150, 170, 210); slS.strokeWidth = 1.6 * s; canvas.drawPath(slPath, slS);
    for (let i = 1; i <= 3; i++) canvas.drawLine(x + (dx - 4 - i * 6) * s, y - (14 + i * 6 + i * 4 * fl) * s, x + (dx - 10 - i * 8) * s, y - (26 + i * 6 + i * 9 * fl) * s, slS);
  };
  wing(-6, 200);
  slS.color = Color.argb(255, 214, 220, 236); slS.strokeWidth = 5 * s;
  // Pattes qui galopent, sabots d'or
  const legs = [[14, 22 + 6 * gal], [8, 12 - 6 * gal], [-14, -22 - 6 * gal], [-8, -6 + 6 * gal]];
  for (const [a, b] of legs) canvas.drawLine(x + a * s, y + 6 * s, x + b * s, y + 20 * s, slS);
  slP.color = Color.argb(255, 255, 200, 70); for (const [, b] of legs) canvas.drawCircle(x + b * s, y + 21 * s, 2.6 * s, slP);
  // Queue en panache bleu ciel
  slS.color = Color.argb(255, 126, 200, 240); slS.strokeWidth = 5 * s;
  slPath.reset(); slPath.moveTo(x - 22 * s, y - 2 * s); slPath.quadTo(x - 40 * s, y - 8 * s, x - 46 * s, y + 10 * s); canvas.drawPath(slPath, slS);
  // Corps, encolure, tête, contour léger
  slP.color = Color.argb(255, 250, 248, 242); slR.set(x - 24 * s, y - 10 * s, x + 22 * s, y + 9 * s); canvas.drawOval(slR, slP);
  slS.color = Color.argb(255, 250, 248, 242); slS.strokeWidth = 10 * s; canvas.drawLine(x + 14 * s, y - 2 * s, x + 26 * s, y - 18 * s, slS);
  slR.set(x + 22 * s, y - 27 * s, x + 42 * s, y - 15 * s); canvas.drawOval(slR, slP);
  slS.color = Color.argb(150, 150, 170, 210); slS.strokeWidth = 1.4 * s; slR.set(x - 24 * s, y - 10 * s, x + 22 * s, y + 9 * s); canvas.drawOval(slR, slS);
  slS.color = Color.argb(255, 126, 200, 240); slS.strokeWidth = 4 * s; canvas.drawLine(x + 16 * s, y - 8 * s, x + 26 * s, y - 25 * s, slS);
  slP.color = Color.argb(255, 40, 40, 60); canvas.drawCircle(x + 35 * s, y - 22 * s, 1.6 * s, slP);
  wing(4, 255);
}

// ---------- 28 : le Colisée ----------
// Repères du fond peint : piste de sable, gradins pleins (courbés comme roY dans scenes4.js).
const SL_RO_TRACK = [1196, 1262], SL_RO_STANDS = [640, 950];
const slRoY = (y, x) => y - 70 * ((x - 360) / 360) ** 2 * (1 - (y - 520) / 900);

function slColosseum(canvas, t) {
  // La foule agite ses fanions
  const cols = [0xFFC8322A, 0xFFFFD54F, 0xFF3A5AA8, 0xFFFFFFFF, 0xFF7A4A8A];
  for (let i = 0; i < 56; i++) {
    const x = hash01(i * 7 + 1) * 720, yb = SL_RO_STANDS[0] + hash01(i * 13 + 2) * (SL_RO_STANDS[1] - SL_RO_STANDS[0]);
    if (x > 300 && x < 420 && yb > 830) continue;
    const y = slRoY(yb, x), wv = Math.sin(t * (5 + 3 * hash01(i)) + i), up = Math.max(0, Math.sin(t * 1.3 + i * 0.7)) * 4;
    slS.color = 0xFF6A4A2A; slS.strokeWidth = 1.2; canvas.drawLine(x, y, x + wv * 2, y - 12 - up, slS);
    slPath.reset(); slPath.moveTo(x + wv * 2, y - 12 - up); slPath.lineTo(x + wv * 2 + 9, y - 9 - up + wv * 2); slPath.lineTo(x + wv * 2, y - 6 - up); slPath.close();
    slP.color = cols[i % cols.length]; canvas.drawPath(slPath, slP);
  }
  // Pétales de roses lancés depuis les gradins
  for (let i = 0; i < 18; i++) {
    const q = (t * (0.12 + 0.06 * hash01(i * 3)) + hash01(i * 11)) % 1, x = hash01(i * 17 + 5) * 720 + Math.sin(t * 2 + i) * 14, y = 960 + q * 360;
    slP.color = Color.argb(slA(230 * Math.sin(q * Math.PI)), i % 2 ? 255 : 232, i % 2 ? 110 : 56, i % 2 ? 140 : 74);
    slR.set(x - 3.5, y - 2, x + 3.5, y + 2); canvas.drawOval(slR, slP);
  }
  // Deux quadriges font la course sur la piste, dans un nuage de poussière
  for (let c = 0; c < 2; c++) {
    const dir = c ? 1 : -1, v = c ? 150 : 170, per = 1500 / v + 4 + c * 3;
    const q = ((t + c * 5) % per) * v, x = dir > 0 ? -220 + q : 940 - q;
    if (x < -260 || x > 980) continue;
    slChariot(canvas, x, SL_RO_TRACK[c], c ? 0.9 : 0.72, dir, t, c);
  }
}

/** Quadrige : quatre chevaux au galop, char rouge et or, aurige au fouet, poussière (roues au sol en x, y). */
function slChariot(canvas, x, y, s, dir, t, c) {
  // Poussière soulevée derrière
  for (let i = 0; i < 8; i++) {
    const q = (t * 2 + i / 8) % 1;
    slP.color = Color.argb(slA(120 * (1 - q)), 230, 200, 150); canvas.drawCircle(x - dir * (30 + q * 120) * s, y - (4 + q * 24 + 6 * Math.sin(i)) * s, (8 + q * 22) * s, slP);
  }
  canvas.save(); canvas.translate(x, y); canvas.scale(dir * s, s);
  const gal = t * 14;
  // Chevaux (deux rangs : le rang du fond plus sombre)
  for (let r = 0; r < 2; r++) {
    for (let hn = 0; hn < 2; hn++) {
      const hx = 60 + hn * 8 + r * 4, hy = -26 - r * 3, col = r ? Color.argb(255, 120, 80, 50) : (c ? Color.argb(255, 240, 236, 228) : Color.argb(255, 60, 40, 30));
      const ph = gal + hn * 1.5 + r * 0.7;
      slS.color = col; slS.strokeWidth = 5;
      for (const [lx, a] of [[hx - 18, 0], [hx - 12, 1.6], [hx + 14, 3.1], [hx + 20, 4.6]]) canvas.drawLine(lx, hy + 8, lx + Math.sin(ph + a) * 9, hy + 26, slS);
      slP.color = col; slR.set(hx - 26, hy - 8, hx + 24, hy + 10); canvas.drawOval(slR, slP);
      slS.strokeWidth = 9; canvas.drawLine(hx + 18, hy, hx + 30, hy - 18 + Math.sin(ph) * 2, slS);
      slR.set(hx + 26, hy - 26 + Math.sin(ph) * 2, hx + 44, hy - 14 + Math.sin(ph) * 2); canvas.drawOval(slR, slP);
      slS.color = Color.argb(255, 200, 50, 40); slS.strokeWidth = 3; canvas.drawLine(hx + 24, hy - 26, hx + 28, hy - 34, slS);
      slS.color = col; slS.strokeWidth = 4; canvas.drawLine(hx - 24, hy - 2, hx - 36, hy + 6 + Math.sin(ph) * 3, slS);
    }
  }
  // Timon et rênes
  slS.color = Color.argb(255, 110, 70, 30); slS.strokeWidth = 3; canvas.drawLine(10, -16, 50, -24, slS);
  slS.color = Color.argb(200, 60, 40, 20); slS.strokeWidth = 1.2; canvas.drawLine(-2, -44, 74, -42, slS);
  // Char : caisse rouge et or, grande roue
  slP.color = Color.argb(255, 180, 40, 34); slPath.reset(); slPath.moveTo(-26, -6); slPath.lineTo(-22, -34); slPath.quadTo(4, -40, 12, -28); slPath.lineTo(14, -6); slPath.close(); canvas.drawPath(slPath, slP);
  slS.color = Color.argb(255, 255, 210, 80); slS.strokeWidth = 2.5; canvas.drawPath(slPath, slS);
  slS.color = Color.argb(255, 120, 80, 40); slS.strokeWidth = 3; slR.set(-20, -18, 4, 6); canvas.drawOval(slR, slS);
  for (let k2 = 0; k2 < 4; k2++) { const an = t * 18 + k2 * Math.PI / 4; canvas.drawLine(-8 - Math.cos(an) * 11, -6 - Math.sin(an) * 11, -8 + Math.cos(an) * 11, -6 + Math.sin(an) * 11, slS); }
  // Aurige : tunique, casque, fouet qui claque
  slP.color = c ? Color.argb(255, 58, 90, 168) : Color.argb(255, 60, 140, 70); slR.set(-16, -58, 0, -32); canvas.drawRect(slR, slP);
  slP.color = Color.argb(255, 220, 170, 120); canvas.drawCircle(-6, -64, 6, slP);
  slP.color = Color.argb(255, 200, 170, 80); slR.set(-12, -72, 0, -64); canvas.drawOval(slR, slP);
  slS.color = Color.argb(255, 90, 60, 30); slS.strokeWidth = 1.5;
  slPath.reset(); slPath.moveTo(-2, -50); slPath.quadTo(16, -80 + Math.sin(t * 8) * 6, 34, -66 + Math.sin(t * 8) * 10); canvas.drawPath(slPath, slS);
  canvas.restore();
}

// ---------- 29 : la Grande Muraille ----------
// Repères du fond peint : bas du ciel des feux d'artifice, bas des montagnes d'où montent les lanternes célestes.
const SL_CN_SKY_BOT = 760, SL_CN_LANTERN_Y = 1180;

function slGreatWall(canvas, t) {
  // Lanternes célestes qui montent en se balançant, de plus en plus petites
  for (let i = 0; i < 14; i++) {
    const h1 = hash01(i * 19 + 3), sp = 0.035 + 0.03 * hash01(i * 7 + 1), q = (t * sp + h1) % 1;
    const x = 40 + hash01(i * 31 + 5) * 640 + Math.sin(t * 0.7 + i) * 18 * q, y = SL_CN_LANTERN_Y - q * 1050, s = 1 - q * 0.75;
    const a = Math.min(1, q * 8) * (1 - Math.max(0, q - 0.8) * 5), fl = 0.85 + 0.15 * Math.sin(t * 9 + i * 2);
    for (let g2 = 0; g2 < 3; g2++) { slP.color = Color.argb(slA(40 * a * fl), 255, 160, 70); canvas.drawCircle(x, y, (10 + g2 * 7) * s, slP); }
    slP.color = Color.argb(slA(255 * a), 255, 150 + Math.round(40 * fl), 70);
    slPath.reset(); slPath.moveTo(x - 7 * s, y - 9 * s); slPath.lineTo(x + 7 * s, y - 9 * s); slPath.lineTo(x + 5 * s, y + 9 * s); slPath.lineTo(x - 5 * s, y + 9 * s); slPath.close(); canvas.drawPath(slPath, slP);
    slP.color = Color.argb(slA(255 * a), 255, 240, 180); slR.set(x - 3 * s, y + 4 * s, x + 3 * s, y + 9 * s); canvas.drawOval(slR, slP);
  }
  // Feux d'artifice : une gerbe toutes les 1,3 s environ, à des endroits et couleurs tirés au hasard
  const cols = [[255, 90, 90], [255, 214, 80], [120, 220, 255], [200, 120, 255], [120, 255, 160], [255, 160, 220]];
  for (let k2 = 0; k2 < 3; k2++) {
    const per = 3.9, ph = k2 * 1.3, cyc = Math.floor((t + ph) / per), u = (t + ph) - cyc * per;
    const seed = cyc * 3 + k2, x = 90 + hash01(seed * 7) * 540, y = 120 + hash01(seed * 11) * (SL_CN_SKY_BOT - 300), col = cols[Math.floor(hash01(seed * 13) * cols.length)];
    if (u < 0.7) {
      // La fusée monte
      const q = u / 0.7, yy = SL_CN_SKY_BOT + 200 - (SL_CN_SKY_BOT + 200 - y) * (1 - (1 - q) * (1 - q));
      slS.color = Color.argb(slA(200), 255, 230, 180); slS.strokeWidth = 2; canvas.drawLine(x, yy, x, yy + 18, slS);
    } else if (u < 2.6) {
      // La gerbe s'ouvre puis retombe en s'éteignant
      const q = (u - 0.7) / 1.9, r = 30 + 80 * (1 - (1 - q) * (1 - q)), a = 1 - q;
      if (q < 0.08) { slP.color = Color.argb(slA(160 * (1 - q / 0.08)), 255, 255, 230); canvas.drawCircle(x, y, 40, slP); }
      for (let i = 0; i < 24; i++) {
        const an = i / 24 * Math.PI * 2 + seed, px = x + Math.cos(an) * r, py = y + Math.sin(an) * r + q * q * 40;
        slS.color = Color.argb(slA(255 * a), col[0], col[1], col[2]); slS.strokeWidth = 2.4;
        canvas.drawLine(px, py, x + Math.cos(an) * r * 0.82, y + Math.sin(an) * r * 0.82 + q * q * 34, slS);
        if (i % 3 === 0) { slP.color = Color.argb(slA(255 * a * (0.5 + 0.5 * Math.sin(t * 30 + i))), 255, 255, 240); canvas.drawCircle(px, py, 1.8, slP); }
      }
    }
  }
}

// ---------- 30 : Tenochtitlan ----------
// Repères du fond peint : haut et bas du lac, x du soleil, cratère du volcan.
const SL_AZ_TOP = 1120, SL_AZ_BOT = 1300, SL_AZ_SUN = 360, SL_AZ_VX = 560, SL_AZ_VY = 640;

function slAztec(canvas, t) {
  // Fumée du Popocatépetl qui monte et s'étire vers la droite
  for (let i = 0; i < 12; i++) {
    const q = (t * 0.05 + i / 12) % 1, x = SL_AZ_VX + q * q * 160 + Math.sin(t * 0.4 + i) * 8, y = SL_AZ_VY - 10 - q * 260, r = 12 + q * 46;
    slP.color = Color.argb(slA(110 * (1 - q) * Math.min(1, q * 6)), 230, 220, 230); canvas.drawCircle(x, y, r, slP);
  }
  // Reflets dorés qui glissent sur le lac, colonne du soleil
  for (let i = 0; i < 50; i++) {
    const h1 = hash01(i * 29 + 3), h2 = hash01(i * 11 + 7), h3 = hash01(i * 53 + 1), d = h1 ** 1.2, y = SL_AZ_TOP + 6 + d * (SL_AZ_BOT - SL_AZ_TOP - 10);
    const len = (10 + 40 * h2) * (0.4 + 0.9 * d);
    let x = h2 * 900 - (3 + 7 * d) * t; x = ((x % 900) + 900) % 900 - 90;
    const sun = Math.max(0, 1 - Math.abs(x + len / 2 - SL_AZ_SUN) / (30 + 90 * d)), pulse = 0.5 + 0.5 * Math.sin(t * (0.7 + h3) + i);
    slS.color = sun > 0 ? Color.argb(slA((90 + 160 * sun) * pulse), 255, 236, 180) : Color.argb(slA((50 + 90 * h3) * pulse), 255, 220, 200);
    slS.strokeWidth = 1 + 1.6 * d; canvas.drawLine(x, y, x + len, y, slS);
  }
  // Pirogues (acalli) qui traversent le lac, pagayeur qui rame
  for (let c = 0; c < 3; c++) {
    const dir = c % 2 ? -1 : 1, v = 9 + c * 4, y = [1150, 1205, 1270][c], s = [0.5, 0.7, 0.9][c];
    let x = hash01(c * 7) * 1000 + dir * v * t; x = ((x % 1000) + 1000) % 1000 - 150;
    const pg = Math.sin(t * 2 + c);
    slS.color = Color.argb(110, 255, 240, 220); slS.strokeWidth = 1.4 * s; canvas.drawLine(x - dir * 40 * s, y + 3 * s, x - dir * 90 * s, y + 4 * s, slS);
    slP.color = Color.argb(255, 110, 70, 36); slPath.reset(); slPath.moveTo(x - 40 * s, y - 6 * s); slPath.quadTo(x, y + 6 * s, x + 40 * s, y - 6 * s); slPath.lineTo(x + 36 * s, y); slPath.quadTo(x, y + 8 * s, x - 36 * s, y); slPath.close(); canvas.drawPath(slPath, slP);
    for (let k2 = 0; k2 < 2; k2++) {
      const px = x + (k2 ? 14 : -14) * s;
      slP.color = Color.argb(255, 240, 230, 210); slR.set(px - 4 * s, y - 20 * s, px + 4 * s, y - 6 * s); canvas.drawRect(slR, slP);
      slP.color = Color.argb(255, 170, 110, 70); canvas.drawCircle(px, y - 24 * s, 4 * s, slP);
      slS.color = Color.argb(255, 90, 60, 30); slS.strokeWidth = 1.6 * s; canvas.drawLine(px - pg * 6 * s, y - 22 * s, px + pg * 10 * s, y + 6 * s, slS);
    }
  }
  // Quetzals : oiseaux verts à longue queue qui traversent le ciel
  for (let b = 0; b < 3; b++) {
    const per = 22 + b * 7, q = ((t + b * 9) % per) / per, dir = b % 2 ? -1 : 1;
    const x = dir > 0 ? -60 + q * 840 : 780 - q * 840, y = 260 + b * 120 + Math.sin(q * 9 + b) * 18, fl = Math.sin(t * 10 + b);
    slS.color = Color.argb(255, 40, 160, 90); slS.strokeWidth = 2.4;
    slPath.reset(); slPath.moveTo(x - dir * 4, y); slPath.quadTo(x - dir * 24, y + 6, x - dir * 40, y + 14 + fl * 2); canvas.drawPath(slPath, slS);
    slPath.reset(); slPath.moveTo(x - 10, y - fl * 8); slPath.quadTo(x - 4, y - fl * 4 - 2, x, y); slPath.quadTo(x + 4, y - fl * 4 - 2, x + 10, y - fl * 8); canvas.drawPath(slPath, slS);
    slP.color = Color.argb(255, 40, 170, 100); slR.set(x - 5, y - 3, x + 5, y + 3); canvas.drawOval(slR, slP);
    slP.color = Color.argb(255, 220, 40, 40); canvas.drawCircle(x, y + 2, 2, slP);
  }
}

// ---------- 31 : le Machu Picchu ----------
// Repères du fond peint : bande de vallée où dérive la brume, centre de la ronde du condor.
const SL_IN_TOP = 880, SL_IN_BOT = 1230, SL_IN_CX = 470, SL_IN_CY = 380;

function slMachuPicchu(canvas, t) {
  // Bancs de brume qui glissent dans la vallée et voilent les terrasses
  for (let i = 0; i < 10; i++) {
    const h1 = hash01(i * 13 + 2), d = h1, y = SL_IN_TOP + d * (SL_IN_BOT - SL_IN_TOP), sp = (5 + 10 * hash01(i * 7)) * (i % 2 ? 1 : -1);
    const x = ((hash01(i * 31) * 1200 + sp * t) % 1200 + 1200) % 1200 - 240, r = 30 + 30 * hash01(i * 17);
    for (let j = 0; j < 6; j++) { slP.color = Color.argb(slA(50 + 30 * Math.sin(t * 0.3 + i + j)), 255, 255, 255); canvas.drawCircle(x + (j - 2.5) * r * 0.9, y + Math.sin(j * 1.7) * r * 0.2, r * (1 - Math.abs(j - 2.5) * 0.12), slP); }
  }
  // Le condor plane en grands cercles, ailes immenses à peine battantes
  const an = t * 0.18, cx = SL_IN_CX + Math.cos(an) * 220, cy = SL_IN_CY + Math.sin(an) * 70, dir = -Math.sin(an) >= 0 ? 1 : -1, s = 1 + Math.sin(an) * 0.25;
  const fl = Math.sin(t * 1.4) * 4 * s;
  slP.color = Color.argb(255, 30, 28, 30);
  slPath.reset(); slPath.moveTo(cx - 56 * s, cy - 2 + fl); slPath.quadTo(cx - 26 * s, cy - 12 * s + fl * 0.5, cx, cy); slPath.quadTo(cx + 26 * s, cy - 12 * s + fl * 0.5, cx + 56 * s, cy - 2 + fl);
  slPath.lineTo(cx + 50 * s, cy + 4 * s + fl); slPath.quadTo(cx + 24 * s, cy + 2 * s, cx, cy + 6 * s); slPath.quadTo(cx - 24 * s, cy + 2 * s, cx - 50 * s, cy + 4 * s + fl); slPath.close(); canvas.drawPath(slPath, slP);
  slS.color = Color.argb(255, 30, 28, 30); slS.strokeWidth = 1.6 * s;
  for (const sd of [-1, 1]) for (let k2 = 0; k2 < 4; k2++) canvas.drawLine(cx + sd * (50 - k2 * 3) * s, cy + fl, cx + sd * (60 - k2 * 2) * s, cy + (2 + k2 * 2) * s + fl, slS);
  slP.color = Color.argb(255, 240, 236, 228); slR.set(cx - 7 * s, cy - 3 * s, cx + 7 * s, cy + 2 * s); canvas.drawOval(slR, slP);
  slP.color = Color.argb(255, 200, 90, 80); canvas.drawCircle(cx + dir * 9 * s, cy - 1 * s, 3 * s, slP);
}

// ---------- 32 : le fjord et le Bifröst ----------
// Repères du fond peint : haut et bas du fjord, bande des aurores, arc du Bifröst (départ, contrôle, arrivée).
const SL_VK_TOP = 1060, SL_VK_BOT = 1300, SL_VK_AUR = 260, SL_VK_BIF = [-60, 980, 300, 120, 640, 470];

function slFjord(canvas, t) {
  // Aurores boréales : rideaux verts et violets qui ondulent
  for (let b = 0; b < 3; b++) {
    const base = SL_VK_AUR + b * 60, col = b === 1 ? [200, 120, 255] : [90, 255, 160];
    for (let x = -20; x < 740; x += 7) {
      const y = base + Math.sin(x / 80 + t * 0.6 + b * 2) * 34 + Math.sin(x / 33 - t * 1.1 + b) * 10;
      const hh = 70 + 50 * Math.sin(x / 60 + t * 0.8 + b), a = 0.5 * (40 + 30 * Math.sin(x / 45 + t * 1.3 + b * 3));
      slS.color = Color.argb(slA(a), col[0], col[1], col[2]); slS.strokeWidth = 12;
      canvas.drawLine(x, y, x, y + hh, slS);
      slS.color = Color.argb(slA(a * 0.5), 255, 255, 255); slS.strokeWidth = 3; canvas.drawLine(x, y, x, y + hh * 0.3, slS);
    }
  }
  // Étincelles qui courent le long du Bifröst
  const [x0, y0, cx, cy, x1, y1] = SL_VK_BIF;
  for (let i = 0; i < 18; i++) {
    const q = (t * 0.08 + i / 18) % 1, u = 1 - q, x = u * u * x0 + 2 * u * q * cx + q * q * x1, y = u * u * y0 + 2 * u * q * cy + q * q * y1 + (hash01(i) - 0.5) * 50;
    const tw = Math.abs(Math.sin(t * 5 + i * 2)), r = 2 + 5 * tw;
    slS.color = Color.argb(slA(230 * tw), 255, 255, 240); slS.strokeWidth = 1.6; canvas.drawLine(x - r, y, x + r, y, slS); canvas.drawLine(x, y - r, x, y + r, slS);
  }
  // Reflets verts et clairs sur le fjord
  for (let i = 0; i < 40; i++) {
    const h1 = hash01(i * 23 + 5), h2 = hash01(i * 7 + 2), d = h1, y = SL_VK_TOP + 8 + d * (SL_VK_BOT - SL_VK_TOP - 12), len = (12 + 36 * h2) * (0.4 + 0.9 * d);
    let x = h2 * 900 - (2 + 5 * d) * t; x = ((x % 900) + 900) % 900 - 90;
    slS.color = Color.argb(slA((40 + 70 * hash01(i * 3)) * (0.5 + 0.5 * Math.sin(t + i))), i % 3 ? 150 : 220, 255, i % 3 ? 200 : 255); slS.strokeWidth = 1 + 1.4 * d;
    canvas.drawLine(x, y, x + len, y, slS);
  }
  // Drakkars qui glissent sur le fjord à la rame
  for (let c = 0; c < 2; c++) {
    const dir = c ? -1 : 1, v = c ? 10 : 7, y = c ? 1250 : 1150, s = c ? 0.95 : 0.6;
    let x = hash01(c * 11 + 3) * 1000 + dir * v * t; x = ((x % 1000) + 1000) % 1000 - 150;
    slDrakkar(canvas, x, y + Math.sin(t * 1.2 + c) * 2 * s, s, dir, t + c);
  }
}

/** Drakkar : coque élancée, tête de dragon, voile rayée qui se gonfle, boucliers, rames qui battent (ligne d'eau en x, y). */
function slDrakkar(canvas, x, y, s, dir, t) {
  canvas.save(); canvas.translate(x, y); canvas.scale(dir * s, s);
  // Sillage et reflet
  slS.color = Color.argb(110, 200, 255, 230); slS.strokeWidth = 1.6; canvas.drawLine(-70, 4, -140, 6, slS); canvas.drawLine(-60, 8, -120, 11, slS);
  slP.color = Color.argb(60, 10, 30, 40); slR.set(-70, 2, 70, 18); canvas.drawOval(slR, slP);
  // Rames qui battent
  const ro = Math.sin(t * 3);
  slS.color = Color.argb(255, 90, 60, 30); slS.strokeWidth = 2;
  for (let i = 0; i < 6; i++) { const ox = -40 + i * 16; canvas.drawLine(ox, -6, ox + 10 + ro * 8, 10, slS); }
  // Mât et voile rayée rouge et blanc
  slS.color = Color.argb(255, 80, 52, 26); slS.strokeWidth = 3; canvas.drawLine(0, -10, 0, -92, slS);
  const bl = 6 + 4 * Math.sin(t * 0.9);
  for (let i = 0; i < 5; i++) {
    slP.color = i % 2 ? Color.argb(255, 240, 230, 210) : Color.argb(255, 200, 40, 40);
    slPath.reset(); const x0 = -36 + i * 14.4, x1 = x0 + 14.4;
    slPath.moveTo(x0, -86); slPath.lineTo(x1, -86); slPath.quadTo(x1 + bl * 0.4, -54, x1, -24); slPath.lineTo(x0, -24); slPath.quadTo(x0 + bl * 0.4, -54, x0, -86); slPath.close();
    canvas.drawPath(slPath, slP);
  }
  slS.color = Color.argb(255, 80, 52, 26); slS.strokeWidth = 2.4; canvas.drawLine(-40, -88, 40, -88, slS);
  // Coque, boucliers, proue en tête de dragon, poupe enroulée
  slP.color = Color.argb(255, 90, 56, 28);
  slPath.reset(); slPath.moveTo(-70, -16); slPath.quadTo(0, 10, 70, -16); slPath.lineTo(64, -4); slPath.quadTo(0, 14, -64, -4); slPath.close(); canvas.drawPath(slPath, slP);
  slS.color = Color.argb(255, 140, 96, 50); slS.strokeWidth = 1.4; slPath.reset(); slPath.moveTo(-66, -12); slPath.quadTo(0, 8, 66, -12); canvas.drawPath(slPath, slS);
  const sc = [0xFFC8322A, 0xFFFFD24F, 0xFF2A5AA8, 0xFFF2E8D0, 0xFF2E8A4A, 0xFFC8322A];
  for (let i = 0; i < 6; i++) { const ox = -42 + i * 17; slP.color = sc[i]; canvas.drawCircle(ox, -12, 6, slP); slP.color = Color.argb(255, 180, 180, 190); canvas.drawCircle(ox, -12, 1.8, slP); }
  slS.color = Color.argb(255, 90, 56, 28); slS.strokeWidth = 5;
  slPath.reset(); slPath.moveTo(66, -12); slPath.quadTo(80, -30, 74, -48); canvas.drawPath(slPath, slS);
  slP.color = Color.argb(255, 90, 56, 28); slR.set(70, -58, 88, -46); canvas.drawOval(slR, slP);
  slP.color = Color.argb(255, 255, 210, 80); canvas.drawCircle(80, -54, 1.6, slP);
  slPath.reset(); slPath.moveTo(-66, -12); slPath.quadTo(-82, -30, -72, -44); slPath.quadTo(-64, -50, -66, -38); canvas.drawPath(slPath, slS);
  canvas.restore();
}

const SCENE_LIVE = { 25: slNile, 26: slBabylon, 27: slOlympus, 28: slColosseum, 29: slGreatWall, 30: slAztec, 31: slMachuPicchu, 32: slFjord };

/** Ce qui bouge dans le fond peint du chapitre c (img : le fond, posé par drawCover sur tout l'écran). */
function drawSceneLive(canvas, c, img) {
  const fn = SCENE_LIVE[c];
  if (!fn) return;
  const iw = img.width, ih = img.height, s = Math.max(w / iw, h / ih);
  canvas.save(); canvas.clipRect(0, 0, w, h);
  canvas.translate((w - iw * s) / 2, (h - ih * s) * 0.65); canvas.scale(s * iw / 720, s * iw / 720);
  slS.shader = null; slP.shader = null;
  fn(canvas, time);
  canvas.restore();
}
