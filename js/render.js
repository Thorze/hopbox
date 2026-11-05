'use strict';
// Rendu « matière » : plateformes texturées (grain, arêtes arrondies, biseaux, ombre portée),
// personnage brillant, nuages et poussières lumineuses dans le ciel.

// ---------- Matières des plateformes : granit, lisse, bois, marbre ----------
// Chaque texture est générée une fois dans une petite image qui se répète, puis « posée » en
// perspective sur chaque face (dessus, face gauche, face droite).
const texPatterns = {};

function texRng(seed) { let x = seed; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; }

/** Dessine une forme 9 fois (décalée d'une taille de tuile) pour que la texture se raccorde sans couture. */
function tiled(size, fn) { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy); }

function makeTexture(kind) {
  const c = document.createElement('canvas');
  const N = kind === 'granit' ? 128 : 256;
  c.width = c.height = N;
  const g = c.getContext('2d');
  if (kind === 'granit') {
    const r = texRng(1234567);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() < 0.45 ? `rgba(255,255,255,${0.08 + r() * 0.14})` : `rgba(40,30,20,${0.07 + r() * 0.13})`;
      const sz = 0.6 + r() * 1.6;
      g.fillRect(r() * N, r() * N, sz, sz);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(30,25,20,${0.18 + r() * 0.2})`;
      g.beginPath(); g.arc(r() * N, r() * N, 0.8 + r() * 1.1, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === 'marbre') {
    const r = texRng(424242);
    // Nuages laiteux
    for (let i = 0; i < 14; i++) {
      const x = r() * N, y = r() * N, rad = 20 + r() * 50;
      tiled(N, (ox, oy) => {
        const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        grd.addColorStop(0, `rgba(255,255,255,${0.12 + r() * 0.1})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      });
    }
    // Veines : marches aléatoires fines, plus des ramifications
    for (let v = 0; v < 6; v++) {
      const pts = [];
      let x = r() * N, y = r() * N, ang = r() * Math.PI * 2;
      for (let i = 0; i < 40; i++) { ang += (r() - 0.5) * 0.7; x += Math.cos(ang) * 7; y += Math.sin(ang) * 7; pts.push([x, y]); }
      const width = 0.5 + r() * 1.1, alpha = 0.12 + r() * 0.16;
      tiled(N, (ox, oy) => {
        g.strokeStyle = `rgba(80,86,104,${alpha})`; g.lineWidth = width; g.lineJoin = g.lineCap = 'round';
        g.beginPath(); pts.forEach(([px2, py2], i) => (i ? g.lineTo(px2 + ox, py2 + oy) : g.moveTo(px2 + ox, py2 + oy))); g.stroke();
        g.strokeStyle = `rgba(80,86,104,${alpha * 0.6})`; g.lineWidth = width * 0.5;
        g.beginPath(); pts.slice(12, 24).forEach(([px2, py2], i) => (i ? g.lineTo(px2 + ox + i * 2, py2 + oy - i * 3) : g.moveTo(px2 + ox, py2 + oy))); g.stroke();
      });
    }
  } else if (kind === 'bois') {
    const r = texRng(777);
    // Fil du bois : lignes ondulées (la période tombe juste pour se raccorder)
    for (let i = 0; i < 46; i++) {
      const y0 = i * N / 46 + r() * 3, amp = 1 + r() * 3, kk = 1 + Math.floor(r() * 3), ph = r() * 6.28;
      g.strokeStyle = `rgba(70,40,15,${0.1 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 1.6;
      for (const oy of [-N, 0, N]) {
        g.beginPath();
        for (let x = 0; x <= N; x += 4) {
          const y = y0 + oy + amp * Math.sin(2 * Math.PI * kk * x / N + ph);
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    // Nœuds
    for (let i = 0; i < 3; i++) {
      const x = r() * N, y = r() * N;
      tiled(N, (ox, oy) => {
        for (let j = 1; j <= 4; j++) {
          g.strokeStyle = `rgba(70,40,15,${0.28 - j * 0.04})`; g.lineWidth = 1.2;
          g.beginPath(); g.ellipse(x + ox, y + oy, 3 + j * 4, 1.5 + j * 1.6, 0, 0, Math.PI * 2); g.stroke();
        }
      });
    }
    // Joints entre les planches
    for (let y = 0; y < N; y += 64) {
      g.fillStyle = 'rgba(50,28,10,0.45)'; g.fillRect(0, y, N, 2);
      g.fillStyle = 'rgba(255,230,200,0.18)'; g.fillRect(0, y + 2, N, 1.5);
    }
  } else if (kind === 'brique') {
    const r = texRng(31337), bh = 32, bw = 64;
    for (let row = 0; row < N / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col <= N / bw; col++) {
        const x = col * bw + off, y = row * bh;
        g.fillStyle = r() < 0.5 ? `rgba(255,220,200,${r() * 0.12})` : `rgba(60,20,10,${r() * 0.18})`;
        g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        // petites taches
        for (let q = 0; q < 6; q++) { g.fillStyle = `rgba(50,20,10,${0.1 + r() * 0.15})`; g.fillRect(x + 4 + r() * (bw - 8), y + 4 + r() * (bh - 8), 1.5, 1.5); }
      }
      g.fillStyle = 'rgba(235,225,212,0.75)'; g.fillRect(0, row * bh, N, 3);
      for (let col = 0; col <= N / bw; col++) g.fillRect(col * bw + off - 1.5, row * bh, 3, bh);
    }
  } else if (kind === 'metal') {
    const r = texRng(9001);
    // Métal brossé : fines lignes horizontales sur toute la largeur (raccord parfait)
    for (let y = 0; y < N; y += 1) {
      const a2 = r() * 0.1;
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a2})` : `rgba(20,25,35,${a2})`;
      g.fillRect(0, y, N, 1);
    }
  } else if (kind === 'glace') {
    const r = texRng(2718);
    for (let i = 0; i < 12; i++) {
      const x = r() * N, y = r() * N, rad = 15 + r() * 40;
      tiled(N, (ox, oy) => {
        const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        grd.addColorStop(0, `rgba(255,255,255,${0.2 + r() * 0.15})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      });
    }
    // Fêlures fines et brillantes
    for (let v = 0; v < 5; v++) {
      const pts = [];
      let x = r() * N, y = r() * N, ang = r() * Math.PI * 2;
      for (let i = 0; i < 10; i++) { ang += (r() - 0.5) * 1.4; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; pts.push([x, y]); }
      tiled(N, (ox, oy) => {
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.9;
        g.beginPath(); pts.forEach(([px2, py2], i) => (i ? g.lineTo(px2 + ox, py2 + oy) : g.moveTo(px2 + ox, py2 + oy))); g.stroke();
      });
    }
  } else if (kind === 'bonbon') {
    // Rayures de sucre d'orge en diagonale (période qui tombe juste)
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (let c0 = -N; c0 < 2 * N; c0 += 64) {
      g.beginPath(); g.moveTo(c0, 0); g.lineTo(c0 + 28, 0); g.lineTo(c0 + 28 - N, N); g.lineTo(c0 - N, N); g.closePath(); g.fill();
    }
    // Petits grains de sucre
    const r = texRng(555);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.4})`; g.fillRect(r() * N, r() * N, 1.5, 1.5); }
  }
  return c;
}

const texShaders = {};
/** Shader de texture orienté selon la face : 'top', 'left', 'right' ou 'flat'. */
function texShader(kind, face) {
  const key = kind + ':' + face;
  if (!texShaders[key]) {
    texShaders[key] = {
      make(ctx) {
        if (!texPatterns[kind]) texPatterns[kind] = ctx.createPattern(makeTexture(kind), 'repeat');
        const pat = texPatterns[kind], sc = k / 80;
        const m = face === 'top' ? [0.866 * sc, 0.5 * sc, -0.866 * sc, 0.5 * sc]
          : face === 'left' ? [0.866 * sc, 0.5 * sc, 0, sc]
            : face === 'right' ? [0.866 * sc, -0.5 * sc, 0, sc] : [sc, 0, 0, sc];
        if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix([m[0], m[1], m[2], m[3], 0, 0]));
        return pat;
      },
    };
  }
  return texShaders[key];
}
const texOver = new Paint();
/** Recouvre la forme courante (tmp/texPath, ovale ou rectangle) avec la texture de la matière. */
function texFill(canvas, kind, face, draw) {
  if (kind === 'lisse') return;
  texOver.color = Color.WHITE;
  texOver.shader = texShader(kind, face);
  draw(texOver);
}

/** Couleur de base selon la matière (le marbre est plus clair, le bois tire vers le brun). */
function mixColor(c1, c2, t) {
  return Color.rgb(Math.round(Color.red(c1) * (1 - t) + Color.red(c2) * t), Math.round(Color.green(c1) * (1 - t) + Color.green(c2) * t),
    Math.round(Color.blue(c1) * (1 - t) + Color.blue(c2) * t));
}
function materialColor(kind, c) {
  if (kind === 'marbre') return mixColor(c, 0xFFF4F4F2, 0.55);
  if (kind === 'bois') return mixColor(c, 0xFFA8743F, 0.55);
  if (kind === 'brique') return mixColor(c, 0xFFB5553C, 0.55);
  if (kind === 'glace') return mixColor(c, 0xFFD2F0FF, 0.7);
  if (kind === 'metal') return mixColor(c, 0xFFB8BEC8, 0.6);
  if (kind === 'bonbon') return mixColor(c, 0xFFFF7EB9, 0.5);
  return c;
}

const texPaint = new Paint();
const texStroke = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });

/** Polygone aux coins arrondis (points écran x,y à la suite). */
function roundPoly(path, pts, r) {
  path.reset();
  const n = pts.length / 2;
  const P = (i) => [pts[((i + n) % n) * 2], pts[((i + n) % n) * 2 + 1]];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1);
    const d1 = Math.hypot(x0 - x1, y0 - y1), d2 = Math.hypot(x2 - x1, y2 - y1);
    const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
    const ax = x1 + (x0 - x1) / d1 * r1, ay = y1 + (y0 - y1) / d1 * r1;
    const bx = x1 + (x2 - x1) / d2 * r2, by = y1 + (y2 - y1) / d2 * r2;
    if (i === 0) path.moveTo(ax, ay); else path.lineTo(ax, ay);
    path.quadTo(x1, y1, bx, by);
  }
  path.close();
}

const texPath = new Path();

/** Sommets écran (repère de la plateforme) d'un pavé de demi-côté a et de profondeur d. */
function boxPoints(a, d) {
  const cxk = 0.8660254 * k, syk = 0.5 * k, D = d * k;
  return {
    F: [0, 2 * a * syk], R: [2 * a * cxk, 0], B: [0, -2 * a * syk], L: [-2 * a * cxk, 0], D,
  };
}

/** Plateforme carrée : faces dégradées, texture de la matière, arêtes arrondies et biseautées. */
function drawTexturedBox(canvas, p, mat = lookBlock, depth = platformDepth) {
  const a = p.half, c = materialColor(mat, p.baseColor);
  const { F, R, B, L, D } = boxPoints(a, depth);
  const rad = k * 0.07, glossy = ['lisse', 'marbre', 'glace', 'metal', 'bonbon'].includes(mat);
  roundPoly(texPath, [L[0], L[1], B[0], B[1], R[0], R[1], R[0], R[1] + D, F[0], F[1] + D, L[0], L[1] + D], rad);
  texPaint.color = shade(c, 0.55); texPaint.shader = null;
  canvas.drawPath(texPath, texPaint);
  // Face gauche (éclairée)
  roundPoly(texPath, [F[0], F[1], L[0], L[1], L[0], L[1] + D, F[0], F[1] + D], rad);
  texPaint.color = Color.WHITE;
  texPaint.shader = new LinearGradient(0, L[1], 0, F[1] + D, shade(c, 0.92), shade(c, 0.66));
  canvas.drawPath(texPath, texPaint);
  texFill(canvas, mat, 'left', (pt) => canvas.drawPath(texPath, pt));
  // Face droite (à l'ombre)
  roundPoly(texPath, [F[0], F[1], R[0], R[1], R[0], R[1] + D, F[0], F[1] + D], rad);
  texPaint.shader = new LinearGradient(0, R[1], 0, F[1] + D, shade(c, 0.72), shade(c, 0.5));
  canvas.drawPath(texPath, texPaint);
  texFill(canvas, mat, 'right', (pt) => canvas.drawPath(texPath, pt));
  // Dessus
  roundPoly(texPath, [F[0], F[1], R[0], R[1], B[0], B[1], L[0], L[1]], rad);
  texPaint.shader = new LinearGradient(B[0], B[1], F[0], F[1], shade(c, 1.16), shade(c, 1.02));
  canvas.drawPath(texPath, texPaint);
  texFill(canvas, mat, 'top', (pt) => canvas.drawPath(texPath, pt));
  if (glossy) {
    // Reflet de surface brillante sur le dessus
    texPaint.shader = new LinearGradient(L[0], B[1], F[0], F[1], Color.argb(90, 255, 255, 255), Color.argb(0, 255, 255, 255));
    canvas.drawPath(texPath, texPaint);
  }
  texPaint.shader = null;
  // Biseaux : arêtes avant du dessus et arête verticale avant éclairées
  texStroke.strokeWidth = k * 0.03;
  texStroke.color = Color.argb(glossy ? 160 : 120, 255, 255, 255);
  const inset = k * 0.025;
  tmpPath.reset();
  tmpPath.moveTo(L[0] + rad * 1.2, L[1] + rad * 0.6 - inset);
  tmpPath.lineTo(F[0], F[1] - inset * 1.4);
  tmpPath.lineTo(R[0] - rad * 1.2, R[1] + rad * 0.6 - inset);
  canvas.drawPath(tmpPath, texStroke);
  texStroke.strokeWidth = k * 0.02;
  texStroke.color = Color.argb(70, 255, 255, 255);
  canvas.drawLine(F[0], F[1] + rad, F[0], F[1] + D - rad, texStroke);
  // Motifs gravés (granit, lisse), clous (bois) ou rivets (métal) dans les coins du dessus
  if (!['granit', 'lisse', 'bois', 'metal'].includes(mat)) return;
  texPaint.color = mat === 'bois' ? shade(c, 0.6) : mat === 'metal' ? shade(c, 0.7) : shade(c, 0.86);
  for (const side of [-1, 1]) {
    for (const [i, j] of [[0, 0], [1, 0], [0, 1]]) {
      const x = side < 0 ? -a + 0.16 + i * 0.12 : a - 0.16 - j * 0.12;
      const z = side < 0 ? a - 0.16 - j * 0.12 : -a + 0.16 + i * 0.12;
      if (mat === 'bois') { if (i + j === 0) canvas.drawCircle(isoX(x, z), isoY(x, 0, z), k * 0.025, texPaint); continue; }
      if (mat === 'metal') {
        if (i + j === 0) {
          canvas.drawCircle(isoX(x, z), isoY(x, 0, z), k * 0.035, texPaint);
          texPaint.color = Color.argb(160, 255, 255, 255);
          canvas.drawCircle(isoX(x, z) - k * 0.01, isoY(x, 0, z) - k * 0.01, k * 0.014, texPaint);
          texPaint.color = shade(c, 0.7);
        }
        continue;
      }
      const s2 = 0.045;
      tmpPath.reset();
      tmpPath.moveTo(isoX(x - s2, z - s2), isoY(x - s2, 0, z - s2)); tmpPath.lineTo(isoX(x + s2, z - s2), isoY(x + s2, 0, z - s2));
      tmpPath.lineTo(isoX(x + s2, z + s2), isoY(x + s2, 0, z + s2)); tmpPath.lineTo(isoX(x - s2, z + s2), isoY(x - s2, 0, z + s2));
      tmpPath.close();
      canvas.drawPath(tmpPath, texPaint);
    }
  }
}

/** Plateforme ronde : côté dégradé + texture, dessus avec reflet. */
function drawTexturedRound(canvas, p, mat = lookBlock) {
  const c = materialColor(mat, p.baseColor);
  texPaint.color = Color.WHITE;
  texPaint.shader = new LinearGradient(-p.topOval.right, 0, p.topOval.right, 0, shade(c, 0.88), shade(c, 0.55));
  canvas.drawOval(p.bottomOval, texPaint);
  canvas.drawRect(p.sideRect, texPaint);
  texFill(canvas, mat, 'flat', (pt) => { canvas.drawOval(p.bottomOval, pt); canvas.drawRect(p.sideRect, pt); });
  texPaint.shader = new LinearGradient(0, p.topOval.top, 0, p.topOval.bottom, shade(c, 1.16), shade(c, 1.0));
  canvas.drawOval(p.topOval, texPaint);
  texPaint.shader = null;
  texFill(canvas, mat, 'top', (pt) => canvas.drawOval(p.topOval, pt));
  texStroke.strokeWidth = k * 0.03; texStroke.color = Color.argb(['lisse', 'marbre', 'glace', 'metal', 'bonbon'].includes(mat) ? 150 : 110, 255, 255, 255);
  canvas.drawArc(p.topOval, 20, 140, false, texStroke);
}

/** Bouton au centre du dessus (cible). */
function drawTopButton(canvas, p) {
  const c = materialColor(lookBlock, p.baseColor), m = 0.14;
  const rx = 1.2247449 * k * m, ry = 0.70710677 * k * m, hgt = k * 0.05;
  texPaint.shader = null;
  texPaint.color = shade(c, 0.7);
  rect.set(-rx, -ry, rx, ry); canvas.drawOval(rect, texPaint);
  canvas.drawRect(-rx, -hgt, rx, 0, texPaint);
  texPaint.color = shade(c, 1.12);
  rect.set(-rx, -ry - hgt, rx, ry - hgt); canvas.drawOval(rect, texPaint);
  texPaint.color = Color.argb(110, 255, 255, 255);
  rect.set(-rx * 0.6, -ry * 0.7 - hgt, rx * 0.1, -ry * 0.1 - hgt); canvas.drawOval(rect, texPaint);
}

// ---------- Personnage brillant ----------

/** Reflets sur le corps cube du personnage (dessinés par-dessus ses faces). */
function glossCube(canvas, a, y0, y1) {
  const P = (x, y, z) => [isoX(x, z), isoY(x, y, z)];
  const [tFx, tFy] = P(-a, y1, -a), [tRx, tRy] = P(a, y1, -a), [tBx, tBy] = P(a, y1, a), [tLx, tLy] = P(-a, y1, a);
  const [bFx, bFy] = P(-a, y0, -a), [bLx, bLy] = P(-a, y0, a);
  // Voile clair sur le dessus (du fond vers l'avant)
  tmpPath.reset(); tmpPath.moveTo(tFx, tFy); tmpPath.lineTo(tRx, tRy); tmpPath.lineTo(tBx, tBy); tmpPath.lineTo(tLx, tLy); tmpPath.close();
  texPaint.color = Color.WHITE;
  texPaint.shader = new LinearGradient(tBx, tBy, tFx, tFy, Color.argb(120, 255, 255, 255), Color.argb(0, 255, 255, 255));
  canvas.drawPath(tmpPath, texPaint);
  // Face gauche : lumière qui tombe du haut
  tmpPath.reset(); tmpPath.moveTo(tFx, tFy); tmpPath.lineTo(tLx, tLy); tmpPath.lineTo(bLx, bLy); tmpPath.lineTo(bFx, bFy); tmpPath.close();
  texPaint.shader = new LinearGradient(0, tLy, 0, bFy, Color.argb(80, 255, 255, 255), Color.argb(0, 255, 255, 255));
  canvas.drawPath(tmpPath, texPaint);
  texPaint.shader = null;
  // Arêtes avant du dessus éclairées
  texStroke.strokeWidth = k * 0.025; texStroke.color = Color.argb(170, 255, 255, 255);
  tmpPath.reset(); tmpPath.moveTo(tLx, tLy); tmpPath.lineTo(tFx, tFy); tmpPath.lineTo(tRx, tRy);
  canvas.drawPath(tmpPath, texStroke);
  texStroke.strokeWidth = k * 0.015; texStroke.color = Color.argb(90, 255, 255, 255);
  canvas.drawLine(tFx, tFy, bFx, bFy, texStroke);
  // Reflet spéculaire sur le dessus
  const [sx0, sy0] = P(a * 0.25, y1, a * 0.35);
  texPaint.color = Color.argb(200, 255, 255, 255);
  rect.set(sx0 - k * a * 0.55, sy0 - k * a * 0.2, sx0 + k * a * 0.55, sy0 + k * a * 0.2);
  canvas.drawOval(rect, texPaint);
  texPaint.color = Color.argb(230, 255, 255, 255);
  canvas.drawCircle(sx0 + k * a * 0.75, sy0 + k * a * 0.05, k * a * 0.09, texPaint);
}

/** Reflet sur une boule / un cylindre. */
function glossRound(canvas, cx, cy, rx) {
  texPaint.shader = null;
  texPaint.color = Color.argb(170, 255, 255, 255);
  rect.set(cx - rx * 0.62, cy - rx * 0.55, cx - rx * 0.05, cy - rx * 0.22);
  canvas.drawOval(rect, texPaint);
  texPaint.color = Color.argb(220, 255, 255, 255);
  canvas.drawCircle(cx + rx * 0.1, cy - rx * 0.45, rx * 0.07, texPaint);
}

// ---------- Ciel : nuages et poussières lumineuses ----------
// [x de départ, y, taille, vitesse] : tous les nuages défilent, dont celui qui passe devant le soleil
const CLOUDS = [[0.05, 0.22, 1.0, 0.004], [0.62, 0.12, 0.7, 0.006], [0.3, 0.45, 0.55, 0.003], [0.8, 0.6, 0.8, 0.005], [0.15, 0.72, 0.6, 0.004], [0.86, 0.36, 0.75, 0.0035]];
const cloudShapes = [];
const MOTES = Array.from({ length: 26 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 1000) / 1000, (i * 0.37) % 1]);

/**
 * Forme de nuage aléatoire : une base plate et 3 à 6 bosses de tailles et positions variées
 * (nuage long et plat, ou petit et bien gonflé…). Unités : la taille du nuage.
 */
function makeCloudShape() {
  const half = 0.75 + Math.random() * 0.85;        // demi-largeur
  const puffy = 0.8 + Math.random() * 0.6;         // hauteur des bosses
  const n = 4 + Math.floor(Math.random() * 4);
  const puffs = [];
  // Rangée du bas : bosses qui se chevauchent
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const dx = -half * 0.8 + t * half * 1.6 + (Math.random() - 0.5) * half * 0.2;
    const centre = Math.max(0, 1 - Math.abs(dx) / (half * 1.1));
    const r = (0.22 + Math.random() * 0.16 + 0.2 * centre) * puffy;
    puffs.push([dx, -r * 0.45, r]);
  }
  // 1 à 3 grosses bosses au-dessus, décalées au hasard
  const tops = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < tops; i++) {
    const dx = (Math.random() - 0.5) * half * 0.9;
    const r = (0.3 + Math.random() * 0.25) * puffy;
    puffs.push([dx, -r * 0.9 - 0.12 * puffy, r]);
  }
  return { half, puffs, baseH: 0.2 + Math.random() * 0.1 };
}

/**
 * Image du nuage (dessinée une fois par forme et par taille) : bosses blanches qui fondent vers un
 * bas légèrement bleuté, bords adoucis. Elle est ensuite affichée en transparence, d'un seul bloc,
 * pour éviter les « boules » plus foncées là où les bosses se chevauchent.
 */
function cloudImage(shape, s) {
  if (shape.img && shape.imgS === s) return shape.img;
  const pad = s * 0.25;
  const W = Math.ceil(2 * (shape.half + 0.75) * s + 2 * pad), H = Math.ceil(1.9 * s + 2 * pad);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const cx = W / 2, cy = pad + 1.35 * s;           // ligne de base du nuage
  if ('filter' in g) g.filter = `blur(${Math.max(1, s * 0.035)}px)`;
  const grd = g.createLinearGradient(0, cy - 1.3 * s, 0, cy + shape.baseH * s);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.65, 'rgba(250,251,255,1)');
  grd.addColorStop(1, 'rgba(214,222,236,1)');
  g.fillStyle = grd;
  g.beginPath();
  for (const [dx, dy, r] of shape.puffs) { g.moveTo(cx + dx * s + r * s, cy + dy * s); g.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); }
  const bh = shape.baseH * s, hw = shape.half * s;
  g.moveTo(cx - hw + bh / 2, cy - 0.02 * s);
  g.lineTo(cx + hw - bh / 2, cy - 0.02 * s); g.arc(cx + hw - bh / 2, cy - 0.02 * s + bh / 2, bh / 2, -Math.PI / 2, Math.PI / 2);
  g.lineTo(cx - hw + bh / 2, cy - 0.02 * s + bh); g.arc(cx - hw + bh / 2, cy - 0.02 * s + bh / 2, bh / 2, Math.PI / 2, Math.PI * 1.5);
  g.fill();
  shape.img = c; shape.imgS = s; shape.ox = cx; shape.oy = cy;
  return c;
}

function drawCloud(canvas, x, y, s, alpha, shape) {
  const img = cloudImage(shape, Math.round(s));
  canvas.drawBitmap(img, x - shape.ox, y - shape.oy, img.width, img.height, alpha / 255);
}

function drawSkyDecor(canvas, sky) {
  const day = 1 - sky.night;
  if (day > 0.05) {
    CLOUDS.forEach(([bx, by, s, sp], i) => {
      const span = w * 1.6, pos = bx * w + time * sp * w;
      const x = (pos % span + span) % span - w * 0.3;
      // Nouvelle forme à chaque fois que le nuage ressort de l'écran et revient
      const lap = Math.floor(pos / span);
      if (!cloudShapes[i] || cloudShapes[i].lap !== lap) cloudShapes[i] = { lap, shape: makeCloudShape() };
      drawCloud(canvas, x, by * h, w * 0.15 * s, 175 * day, cloudShapes[i].shape);
    });
  }
  drawWeather(canvas, sky);
  drawFlyers(canvas, sky);
  // Poussières lumineuses qui montent doucement
  for (const [mx, my, ph] of MOTES) {
    const y = ((my * h - time * h * 0.012 * (0.5 + ph)) % h + h) % h;
    const x = mx * w + Math.sin(time * 0.8 + ph * 6) * w * 0.02;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + ph * 9));
    texPaint.color = sky.night > 0.5 ? Color.argb(Math.round(120 * tw), 200, 220, 255) : Color.argb(Math.round(160 * tw), 255, 236, 180);
    canvas.drawCircle(x, y, w * (0.004 + 0.004 * ph), texPaint);
  }
}

// ---------- Passages dans le ciel : avion, oiseaux, fusée ----------
// Tout reste en arrière-plan (derrière les plateformes), petit et un peu transparent.
let nextBalloon = 25 + Math.random() * 40;
let flyers = [], skyLastT = -1, nextPlane = 20 + Math.random() * 25, nextBirds = 8 + Math.random() * 15, rocketAt = -1;

/** Appelé à chaque nouvelle partie : une fusée toutes les 25 parties. */
function skyNewGame() {
  let n = 0;
  try { n = (parseInt(localStorage.getItem('sautique.sky_games') || '0', 10) || 0) + 1; localStorage.setItem('sautique.sky_games', String(n)); } catch (e) { /* ignoré */ }
  if (n % 25 === 0) rocketAt = time + 4 + Math.random() * 8;
  struckDead = false;
  weatherNewGame();
  // Imprévu mortel (avion en feu ou foudre) : 1er entre la 50e et la 100e partie, puis 1 par tranche de 200
  crashAt = -1;
  if (weather === 2) strikeAt = -1;            // un orage ordinaire ne foudroie pas
  const doom = Doom.due(n);
  if (doom) {
    if (Math.random() < 0.5) crashAt = time + 10 + Math.random() * 10;
    else startWeather(2, 1);                   // orage avec la foudre qui frappera
  }
  // Imprévu non mortel : 1 par tranche de 50 parties, jamais dans la même partie qu'un mortel
  const kind = !doom && SurpriseCalendar.due(n) ? pickSurprise(Math.random()) : null;
  if (kind === 'tornado') startWeather(3, 1);            // la tornade arrive avec un ciel couvert
  else if (kind === 'blizzard') startWeather(5, 1);      // le blizzard vient avec la neige
  else if (kind === 'eagle' && weather !== 0 && weather !== 4) startWeather(4, 0.5); // l'aigle vole par temps calme
  scheduleRocket(kind === 'rocket');
  scheduleEagle(kind === 'eagle');
  scheduleHeli(kind === 'heli');
  scheduleUfo(kind === 'ufo');
  scheduleWhale(kind === 'whale');
  scheduleBlizzard(kind === 'blizzard');
}

// Calendrier d'un type d'imprévu (comme EventCalendar dans Doom.kt) : un seul par tranche de
// parties, à une partie tirée au hasard ; retenté à la partie suivante s'il n'a pas eu lieu.
function doomGet(key) { try { return parseInt(localStorage.getItem('sautique.' + key) || '0', 10) || 0; } catch (e) { return 0; } }
function doomPut(key, v) { try { localStorage.setItem('sautique.' + key, String(v)); } catch (e) { /* ignoré */ } }
function makeCalendar(prefix, windowStart, windowEnd) {
  const kCount = prefix + '_count', kAt = prefix + '_at', kInit = prefix + '_init2';
  return {
    windowStart, windowEnd,
    due(games) {
      if (!doomGet(kInit)) {
        let i = 0;
        while (windowEnd(i) < games) i++;
        doomPut(kCount, i); doomPut(kAt, 0); doomPut(kInit, 1);
      }
      let at = doomGet(kAt);
      if (!at) {
        const i = doomGet(kCount), a = windowStart(i), size = windowEnd(i) - a + 1;
        at = a + Math.min(size - 1, Math.floor(Math.random() * size));
        doomPut(kAt, at);
      }
      return games >= at;
    },
    happened(games) {
      let i = doomGet(kCount) + 1;
      while (windowStart(i) <= games) i++;
      doomPut(kCount, i); doomPut(kAt, 0);
    },
  };
}
// Imprévus mortels : le 1er entre la 50e et la 100e partie, puis 1 par tranche de 200 parties
const Doom = makeCalendar('doom', (i) => (i <= 0 ? 50 : 200 * i - 99), (i) => 200 * i + 100);
// Imprévus non mortels : 1 par tranche de 50 parties (1–50, 51–100…)
const SurpriseCalendar = makeCalendar('surprise', (i) => 50 * i + 1, (i) => 50 * (i + 1));
function skyGames() { return doomGet('sky_games'); }
function doomHappened() { Doom.happened(skyGames()); }

function spawnFlyer(kind, sky) {
  const ltr = Math.random() < 0.5;
  if (kind === 'plane') {
    flyers.push({ kind, t: 0, dur: 16 + Math.random() * 6, ltr, y: h * (0.07 + Math.random() * 0.2), s: w * 0.06, night: sky.night });
  } else if (kind === 'birds') {
    const n = 1 + Math.floor(Math.random() * 4);
    const y = h * (0.15 + Math.random() * 0.3);
    const birds = Array.from({ length: n }, (_, i) => [i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.05, Math.ceil(i / 2) * 0.035, Math.random() * 6]);
    flyers.push({ kind, t: 0, dur: 10 + Math.random() * 5, ltr, y, s: w * 0.022, birds });
  } else if (kind === 'balloon') {
    // Couleurs et motif au hasard, trajectoire qui monte et descend au hasard
    const pal = ['#E53950', '#FFC93C', '#3F8EFC', '#3DBE6E', '#8E5CD9', '#FF7A45', '#26C6DA', '#F06292', '#FFFFFF'];
    const pick = () => Color.parseColor(pal[Math.floor(Math.random() * pal.length)]);
    let c2 = pick(); const c1 = pick(); while (c2 === c1) c2 = pick();
    flyers.push({ kind, t: 0, dur: 32 + Math.random() * 14, ltr, y: h * (0.12 + Math.random() * 0.33), s: w * (0.045 + Math.random() * 0.035),
      c1, c2, c3: pick(), pattern: Math.floor(Math.random() * 3), drift: (Math.random() - 0.5) * h * 0.006,
      amp: h * (0.02 + Math.random() * 0.05), freq: 0.15 + Math.random() * 0.25, ph: Math.random() * 6.28 });
  } else {
    flyers.push({ kind, t: 0, dur: 6, ltr, x0: w * (0.15 + Math.random() * 0.7), s: w * 0.045, smoke: [] });
  }
}

function drawFlyers(canvas, sky) {
  const dt = skyLastT < 0 ? 0 : Math.min(0.1, time - skyLastT);
  skyLastT = time;
  nextPlane -= dt; nextBirds -= dt;
  if (nextPlane <= 0) { spawnFlyer('plane', sky); nextPlane = 35 + Math.random() * 40; }
  if (nextBirds <= 0) { if (sky.night < 0.5 && (weather === 0 || weather === 4)) spawnFlyer('birds', sky); nextBirds = 18 + Math.random() * 25; }
  if (rocketAt > 0 && time >= rocketAt) { spawnFlyer('rocket', sky); rocketAt = -1; }
  nextBalloon -= dt;
  if (nextBalloon <= 0) { if (weather === 0) spawnFlyer('balloon', sky); nextBalloon = 40 + Math.random() * 50; }
  for (const f of flyers) f.t += dt;
  flyers = flyers.filter((f) => f.t < f.dur);
  for (const f of flyers) {
    const p = f.t / f.dur;
    if (f.kind === 'plane') drawPlane(canvas, f, p, sky);
    else if (f.kind === 'birds') drawBirds(canvas, f, p);
    else if (f.kind === 'balloon') drawBalloon(canvas, f);
    else drawRocket(canvas, f, p, dt);
  }
  texPaint.alpha = 255;
}

function drawPlane(canvas, f, p, sky) {
  const x = f.ltr ? -w * 0.2 + p * w * 1.4 : w * 1.2 - p * w * 1.4;
  const dir = f.ltr ? 1 : -1, s = f.s, y = f.y;
  // Traînée blanche qui s'efface
  texStroke.color = Color.argb(70, 255, 255, 255); texStroke.strokeWidth = s * 0.12;
  canvas.drawLine(x - dir * s * 0.6, y, x - dir * s * 4.5, y + s * 0.05, texStroke);
  texStroke.color = Color.argb(35, 255, 255, 255); texStroke.strokeWidth = s * 0.2;
  canvas.drawLine(x - dir * s * 4.5, y + s * 0.05, x - dir * s * 8, y + s * 0.1, texStroke);
  // Avion (silhouette)
  texPaint.shader = null;
  texPaint.color = Color.argb(215, 196, 205, 222);
  rect.set(x - s * 0.6, y - s * 0.09, x + s * 0.6, y + s * 0.09); canvas.drawRoundRect(rect, s * 0.09, s * 0.09, texPaint);
  tmpPath.reset();
  tmpPath.moveTo(x + dir * s * 0.1, y); tmpPath.lineTo(x - dir * s * 0.25, y - s * 0.45); tmpPath.lineTo(x - dir * s * 0.35, y - s * 0.45); tmpPath.lineTo(x - dir * s * 0.15, y);
  tmpPath.close(); canvas.drawPath(tmpPath, texPaint);
  tmpPath.reset();
  tmpPath.moveTo(x - dir * s * 0.45, y); tmpPath.lineTo(x - dir * s * 0.6, y - s * 0.25); tmpPath.lineTo(x - dir * s * 0.66, y - s * 0.25); tmpPath.lineTo(x - dir * s * 0.6, y);
  tmpPath.close(); canvas.drawPath(tmpPath, texPaint);
  // Feux clignotants la nuit
  if (sky.night > 0.3 && Math.sin(time * 8) > 0.3) {
    texPaint.color = Color.argb(220, 255, 70, 70);
    canvas.drawCircle(x - dir * s * 0.25, y - s * 0.42, s * 0.06, texPaint);
  }
}

function drawBirds(canvas, f, p) {
  const span = w * 1.3;
  const x0 = f.ltr ? -w * 0.15 + p * span : w * 1.15 - p * span;
  const dir = f.ltr ? 1 : -1;
  texStroke.color = Color.argb(150, 70, 70, 90); texStroke.strokeWidth = f.s * 0.18;
  for (const [ox, oy, ph] of f.birds) {
    const x = x0 - dir * ox * w, y = f.y + oy * w + Math.sin(time * 1.5 + ph) * f.s * 0.5;
    const flap = Math.sin(time * 9 + ph) * f.s * 0.45;
    tmpPath.reset();
    tmpPath.moveTo(x - f.s, y - flap); tmpPath.quadTo(x - f.s * 0.45, y - f.s * 0.2 - flap * 0.3, x, y + f.s * 0.15);
    tmpPath.quadTo(x + f.s * 0.45, y - f.s * 0.2 - flap * 0.3, x + f.s, y - flap);
    canvas.drawPath(tmpPath, texStroke);
  }
}

function drawRocket(canvas, f, p, dt) {
  // Décolle du bas de l'écran et file en biais vers le haut
  const e = p * p;
  const x = f.x0 + (f.ltr ? 1 : -1) * e * w * 0.35, y = h * 1.05 - e * h * 1.25;
  const s = f.s, ang = (f.ltr ? 1 : -1) * 18;
  if (Math.random() < 0.9) f.smoke.push([x, y + s * 0.9, 1]);
  for (const q of f.smoke) q[2] -= dt * 0.8;
  f.smoke = f.smoke.filter((q) => q[2] > 0);
  for (const [qx, qy, l] of f.smoke) {
    texPaint.color = Color.argb(Math.round(110 * l), 240, 240, 245);
    canvas.drawCircle(qx, qy, s * (0.25 + 0.6 * (1 - l)), texPaint);
  }
  canvas.save();
  canvas.rotate(ang, x, y);
  // Flamme
  texPaint.color = Color.argb(230, 255, 170, 40);
  tmpPath.reset(); tmpPath.moveTo(x - s * 0.18, y + s * 0.55); tmpPath.lineTo(x, y + s * (0.95 + 0.25 * Math.random())); tmpPath.lineTo(x + s * 0.18, y + s * 0.55); tmpPath.close();
  canvas.drawPath(tmpPath, texPaint);
  // Corps, ailerons, hublot
  texPaint.color = Color.argb(235, 240, 242, 248);
  rect.set(x - s * 0.22, y - s * 0.5, x + s * 0.22, y + s * 0.55); canvas.drawRoundRect(rect, s * 0.2, s * 0.2, texPaint);
  texPaint.color = Color.argb(235, 229, 57, 80);
  tmpPath.reset(); tmpPath.moveTo(x - s * 0.22, y - s * 0.3); tmpPath.quadTo(x, y - s * 0.95, x + s * 0.22, y - s * 0.3); tmpPath.close(); canvas.drawPath(tmpPath, texPaint);
  tmpPath.reset(); tmpPath.moveTo(x - s * 0.22, y + s * 0.2); tmpPath.lineTo(x - s * 0.42, y + s * 0.6); tmpPath.lineTo(x - s * 0.22, y + s * 0.5); tmpPath.close(); canvas.drawPath(tmpPath, texPaint);
  tmpPath.reset(); tmpPath.moveTo(x + s * 0.22, y + s * 0.2); tmpPath.lineTo(x + s * 0.42, y + s * 0.6); tmpPath.lineTo(x + s * 0.22, y + s * 0.5); tmpPath.close(); canvas.drawPath(tmpPath, texPaint);
  texPaint.color = Color.argb(235, 63, 142, 252);
  canvas.drawCircle(x, y - s * 0.05, s * 0.1, texPaint);
  canvas.restore();
}

// ---------- Météo : pluie, orage, tornade (environ 1 partie sur 35) ----------
// 0 = beau temps, 1 = pluie, 2 = orage (pluie + éclairs), 3 = tornade au loin.
// strikeAt : moment où la foudre peut frapper le joueur pendant l'orage (-1 = jamais)
let strikeAt = -1, strikeT = 0, struckDead = false;
// Crash d'avion : moment prévu (-1 = jamais), type de fin (0 = foudre, 1 = avion), départ de l'avion, fumée
let crashAt = -1, doomKind = 0, crashFrom = null, crashSmoke = [];
const CRASH_IMPACT = 2.6;
let weather = 0, weatherStart = 0, nextBolt = 0, bolt = null, flashT = 0, thunderAt = -1, weatherLastT = -1;

// Climat tempéré qui évolue d'une partie à l'autre (comme Climate.kt) :
// 0 = soleil, 1 = nuageux, 2 = pluie, 3 = neige ; à long terme 50 / 25 / 20 / 5 %.
const CLIMATE_NEXT = [
  [0.85, 0.15, 0, 0],
  [0.30, 0.42, 0.20, 0.08],
  [0, 0.25, 0.75, 0],
  [0, 0.40, 0, 0.60],
];
let wInt = 1, overcastShader = null, overcastH = 0;

function climateAdvance() {
  let prev = 0, prevI = 0.35;
  try {
    prev = parseInt(localStorage.getItem('sautique.climate') || '0', 10) || 0;
    prevI = (parseInt(localStorage.getItem('sautique.climate_i') || '35', 10) || 35) / 100;
  } catch (e) { /* ignoré */ }
  const row = CLIMATE_NEXT[clamp(prev, 0, 3)];
  const r = Math.random();
  let now = 0, acc = 0;
  for (let i = 0; i < row.length; i++) { acc += row[i]; if (r < acc) { now = i; break; } now = row[i] > 0 ? i : now; }
  const i = now !== prev ? 0.35 : clamp(prevI - 0.1 + Math.random() * 0.4, 0.3, 1);
  try {
    localStorage.setItem('sautique.climate', String(now));
    localStorage.setItem('sautique.climate_i', String(Math.round(i * 100)));
  } catch (e) { /* ignoré */ }
  return [now, i];
}

function weatherNewGame() {
  weather = 0;
  const [c, i] = climateAdvance();
  // Ciel couvert : parfois une tornade ; grosse pluie : parfois de l'orage
  // Ciel couvert (la tornade, elle, est tirée par le calendrier des imprévus)
  const kind = c === 1 ? 4
    : c === 2 ? (i >= 0.7 && Math.random() < 0.25 ? 2 : 1)
    : c === 3 ? 5 : 0;
  if (kind) startWeather(kind, i);
}

function startWeather(kind, intensity = 1) {
  weather = kind; wInt = intensity; weatherStart = time; nextBolt = time + 3 + Math.random() * 3; bolt = null; flashT = 0;
  strikeAt = kind === 2 ? time + 8 + Math.random() * 10 : -1;
  // Tornade : le cyclone finira par foncer sur le joueur (voir island.js)
  if (kind === 3) scheduleCyclone(); else isl.cycloneAt = -1;
}

/** Éclair en zigzag avec quelques branches, du haut de l'écran vers le milieu. */
function makeBolt() {
  const pts = [];
  let x = w * (0.1 + Math.random() * 0.8), y = -h * 0.02;
  const endY = h * (0.35 + Math.random() * 0.2);
  pts.push([x, y]);
  while (y < endY) { y += h * (0.03 + Math.random() * 0.04); x += (Math.random() - 0.5) * w * 0.09; pts.push([x, y]); }
  const branches = [];
  for (let i = 0; i < 2; i++) {
    const from = pts[2 + Math.floor(Math.random() * (pts.length - 3))];
    const br = [from.slice()];
    let bx = from[0], by = from[1];
    const dir = Math.random() < 0.5 ? -1 : 1;
    for (let j = 0; j < 3; j++) { by += h * 0.03; bx += dir * w * (0.02 + Math.random() * 0.04); br.push([bx, by]); }
    branches.push(br);
  }
  return { pts, branches, t: 0 };
}

function drawWeather(canvas, sky) {
  const dtW = weatherLastT < 0 ? 0 : Math.min(0.1, time - weatherLastT);
  weatherLastT = time;
  sounds.setAmbient(weather === 1 || weather === 2 ? 'pluie' : null);
  if (weather === 0) return;
  const f = clamp((time - weatherStart) / 3, 0, 1);      // arrive en douceur
  const storm = weather === 2, snow = weather === 5, wi = wInt;
  // Ciel gris en haut de l'écran, plus ou moins chargé
  if (!overcastShader || overcastH !== h) {
    overcastH = h;
    overcastShader = new LinearGradient(0, 0, 0, h * 0.6, Color.rgb(96, 104, 118), Color.argb(0, 96, 104, 118));
  }
  texPaint.shader = overcastShader;
  texPaint.color = Color.argb(Math.round((weather === 2 ? 200 : weather === 1 ? 110 + 70 * wi : weather === 4 ? 70 + 90 * wi : weather === 5 ? 90 + 60 * wi : 120) * f), 0, 0, 0);
  canvas.drawRect(0, 0, w, h * 0.6, texPaint);
  texPaint.shader = null;
  drawCloudBank(canvas, f, wi);
  // Ciel assombri
  const tint = weather === 2 ? 110 : weather === 1 ? 45 + 35 * wi : weather === 4 ? 15 + 30 * wi : weather === 5 ? 25 + 25 * wi : 70;
  texPaint.color = snow ? Color.argb(Math.round(tint * f), 150, 160, 180) : Color.argb(Math.round(tint * f), 70, 78, 96);
  canvas.drawRect(0, 0, w, h, texPaint);
  if (weather === 3) drawTornado(canvas, f);
  if (storm) {
    if (time >= nextBolt && f >= 1) {
      bolt = makeBolt(); flashT = 0.35; nextBolt = time + 3 + Math.random() * 5;
      thunderAt = time + 0.02;              // le tonnerre suit l'éclair tout de suite
    }
    if (thunderAt > 0 && time >= thunderAt) { sounds.play('THUNDER', 0.8); thunderAt = -1; }
    if (flashT > 0) {
      texPaint.color = Color.argb(Math.round(110 * flashT / 0.35), 255, 255, 255);
      canvas.drawRect(0, 0, w, h, texPaint);
      flashT -= dtW;
    }
    if (bolt) {
      bolt.t += dtW;
      const a = clamp(1 - bolt.t / 0.3, 0, 1);
      if (a <= 0) bolt = null;
      else {
        const draw = (pts, wid) => {
          tmpPath.reset();
          pts.forEach(([x, y], i) => (i ? tmpPath.lineTo(x, y) : tmpPath.moveTo(x, y)));
          texStroke.strokeWidth = wid * 3; texStroke.color = Color.argb(Math.round(70 * a), 200, 210, 255);
          canvas.drawPath(tmpPath, texStroke);
          texStroke.strokeWidth = wid; texStroke.color = Color.argb(Math.round(240 * a), 255, 255, 240);
          canvas.drawPath(tmpPath, texStroke);
        };
        draw(bolt.pts, w * 0.008);
        for (const br of bolt.branches) draw(br, w * 0.004);
      }
    }
  }
  if (weather === 1 || storm) drawRain(canvas, f, storm);
  if (snow) drawSnow(canvas, f);
}

/** Part du soleil cachée par les nuages (0 = bien visible, 1 = caché). */
function sunHidden() {
  if (weather === 0) return 0;
  const f = clamp((time - weatherStart) / 3, 0, 1);
  return f * (weather === 4 ? 0.35 + 0.55 * wInt : weather === 3 ? 0.6 : 0.92);
}

/** Gros nuages gris qui défilent lentement sous le ciel couvert. */
function drawCloudBank(canvas, f, wi) {
  const dark = weather === 2, span = w * 1.6;
  for (let i = 0; i < 7; i++) {
    const seed = (i * 0.6180339) % 1;
    const pos = seed * span + time * w * (0.006 + 0.004 * ((i * 3) % 5) / 4);
    const x = (pos % span) - w * 0.3;
    const y = h * (0.03 + 0.17 * ((i * 7) % 6) / 5);
    const r = w * (0.11 + 0.06 * ((i * 5) % 4) / 3);
    const g = dark ? 92 : 150 + (i % 3) * 12;
    texPaint.color = Color.argb(Math.round((90 + 60 * wi) * f), g, g + 4, g + 14);
    canvas.drawCircle(x, y, r, texPaint);
    canvas.drawCircle(x - r * 0.9, y + r * 0.25, r * 0.7, texPaint);
    canvas.drawCircle(x + r * 0.95, y + r * 0.2, r * 0.75, texPaint);
    canvas.drawCircle(x + r * 0.1, y + r * 0.45, r * 0.8, texPaint);
  }
}

/** Flocons qui tombent doucement en se balançant. */
function drawSnow(canvas, f) {
  const n = Math.floor(45 + 85 * wInt), span = w * 1.1;
  texPaint.color = Color.argb(Math.round(225 * f), 255, 255, 255);
  for (let i = 0; i < n; i++) {
    const sx0 = ((i * 7919) % 1000) / 1000, sy0 = ((i * 104729) % 1000) / 1000, sz = ((i * 31) % 10) / 10;
    const y = ((sy0 * h + time * h * (0.08 + 0.07 * sz)) % (h * 1.06)) - h * 0.03;
    const x = (sx0 * span - w * 0.05) + Math.sin(time * (0.8 + sz) + i) * w * 0.03 + time * w * 0.01;
    canvas.drawCircle(((x % span) + span) % span - w * 0.05, y, w * (0.0035 + 0.006 * sz), texPaint);
  }
}

function drawRain(canvas, f, storm) {
  const n = storm ? 130 : Math.floor(35 + 70 * wInt), slant = storm ? 0.35 : 0.15, len = h * 0.035, speed = h * (storm ? 1.5 : 1.15);
  texStroke.strokeWidth = w * 0.0035;
  texStroke.color = Color.argb(Math.round(110 * f), 200, 215, 235);
  tmpPath.reset();
  for (let i = 0; i < n; i++) {
    const sx0 = ((i * 7919) % 1000) / 1000, sy0 = ((i * 104729) % 1000) / 1000, sp = 0.8 + ((i * 31) % 10) / 25;
    const y = ((sy0 * h + time * speed * sp) % (h * 1.1)) - h * 0.05;
    const x = (((sx0 * w * 1.3 - y * slant) % (w * 1.3)) + w * 1.3) % (w * 1.3) - w * 0.15;
    tmpPath.moveTo(x, y); tmpPath.lineTo(x - len * slant, y + len);
  }
  canvas.drawPath(tmpPath, texStroke);
}

function drawTornado(canvas, f) {
  // Traverse lentement l'horizon en ondulant, avec des débris qui tournent à sa base
  if (state === State.CYCLONE) return;
  const t = time - weatherStart;
  const cx = w * (-0.25 + ((t / 40) % 1) * 1.5);
  const baseY = h * 0.62, topY = h * 0.08;
  const N = 26, center = (q) => cx + Math.sin(t * 2.2 + q * 5) * w * 0.03 * (0.3 + q);
  const half = (q) => w * (0.012 + 0.15 * Math.pow(q, 1.6));
  const Y = (q) => baseY - (baseY - topY) * q;
  // Entonnoir lisse : bord gauche de haut en bas, puis bord droit de bas en haut
  tmpPath.reset();
  for (let i = N; i >= 0; i--) { const q = i / N; const x = center(q) - half(q); if (i === N) tmpPath.moveTo(x, Y(q)); else tmpPath.lineTo(x, Y(q)); }
  for (let i = 0; i <= N; i++) { const q = i / N; tmpPath.lineTo(center(q) + half(q), Y(q)); }
  tmpPath.close();
  texPaint.color = Color.WHITE;
  texPaint.shader = new LinearGradient(0, topY, 0, baseY, Color.argb(Math.round(120 * f), 96, 100, 116), Color.argb(Math.round(175 * f), 78, 80, 92));
  canvas.drawPath(tmpPath, texPaint);
  texPaint.shader = null;
  // Nuage sombre d'où sort l'entonnoir
  for (const [dx, r, al] of [[-0.12, 0.13, 150], [0.05, 0.17, 165], [0.2, 0.12, 150], [-0.02, 0.1, 175]]) {
    texPaint.color = Color.argb(Math.round(al * f), 88, 92, 106);
    rect.set(center(1) + dx * w - r * w, topY - r * w * 0.45, center(1) + dx * w + r * w, topY + r * w * 0.45);
    canvas.drawOval(rect, texPaint);
  }
  // Bandes qui tournent (montent le long de l'entonnoir)
  texStroke.strokeWidth = w * 0.006;
  for (let i = 0; i < 7; i++) {
    const q = (i / 7 + t * 0.22) % 1;
    const hw = half(q), y = Y(q), x = center(q);
    texStroke.color = Color.argb(Math.round(70 * f * Math.sin(q * Math.PI)), 210, 214, 225);
    rect.set(x - hw * 0.95, y - hw * 0.18, x + hw * 0.95, y + hw * 0.18);
    canvas.drawArc(rect, 10, 160, false, texStroke);
  }
  // Débris
  for (let i = 0; i < 14; i++) {
    const a = t * (3 + (i % 3)) + i * 0.9, r = w * (0.03 + (i % 5) * 0.012);
    const y = baseY - h * 0.02 - ((t * 0.12 + i * 0.07) % 1) * h * 0.18;
    texPaint.color = Color.argb(Math.round(150 * f), 80, 70, 60);
    canvas.drawRect(cx + Math.cos(a) * r, y + Math.sin(a) * r * 0.3, cx + Math.cos(a) * r + w * 0.008, y + Math.sin(a) * r * 0.3 + w * 0.008, texPaint);
  }
  // Poussière au sol
  texPaint.color = Color.argb(Math.round(60 * f), 120, 110, 100);
  rect.set(cx - w * 0.09, baseY - w * 0.015, cx + w * 0.09, baseY + w * 0.025);
  canvas.drawOval(rect, texPaint);
}

// ---------- Foudre sur le joueur (orage, score < 15, sans battre son record) ----------
function checkLightning() {
  checkCyclone();
  checkPlaneCrash();
  if (weather !== 2 || strikeAt < 0 || time < strikeAt) return;
  strikeAt = -1;
  if (score >= 15 || score >= best || (state !== State.READY && state !== State.CHARGING)) return;
  state = State.STRUCK; strikeT = 0; flashT = 0.5; struckDead = true; doomKind = 0; doomHappened(); Stats.add('struck');
  sounds.play('STRIKE');
  vibrate(200);
  shake(0.12);
}

function checkPlaneCrash() {
  if (crashAt < 0 || time < crashAt) return;
  crashAt = -1;
  if (score >= 15 || score >= best || (state !== State.READY && state !== State.CHARGING)) return;
  state = State.STRUCK; strikeT = 0; struckDead = true; doomKind = 1; crashSmoke = []; doomHappened(); Stats.add('planes');
  const fromLeft = Math.random() < 0.5;
  crashFrom = [fromLeft ? -w * 0.25 : w * 1.25, -h * 0.05];
  sounds.play('PLANE_FALL');
}

function updateStrike(dt) {
  const before = strikeT;
  strikeT += dt;
  if (doomKind === 1) {
    if (strikeT < CRASH_IMPACT) scareT = scareDuration;          // le personnage voit l'avion arriver
    if (before < CRASH_IMPACT && strikeT >= CRASH_IMPACT) { sounds.play('EXPLOSION'); vibrate(300); shake(0.18); }
    if (strikeT >= CRASH_IMPACT + 2) endGame(tr('reason.plane'));
  } else if (strikeT >= 2) endGame(tr('reason.lightning'));
}

function drawStrikeOverlay(canvas) {
  if (doomKind === 1) { drawPlaneCrash(canvas); return; }
  const t = strikeT;
  texPaint.shader = null;
  if (t < 0.4) { texPaint.color = Color.argb(Math.round(200 * (1 - t / 0.4)), 255, 255, 255); canvas.drawRect(0, 0, w, h, texPaint); }
  if (t < 0.3) {
    const x1 = sx(px, pz), y1 = sy(px, py + 0.3, pz);
    const r = texRng(7);
    tmpPath.reset();
    tmpPath.moveTo(x1 + w * 0.15, -h * 0.02);
    const steps = 9;
    for (let i = 1; i <= steps; i++) {
      const q = i / steps;
      tmpPath.lineTo(x1 + w * 0.15 * (1 - q) + (i < steps ? (r() - 0.5) * w * 0.08 : 0), -h * 0.02 + (y1 + h * 0.02) * q);
    }
    const a = 1 - t / 0.3;
    texStroke.strokeWidth = w * 0.03; texStroke.color = Color.argb(Math.round(90 * a), 200, 210, 255);
    canvas.drawPath(tmpPath, texStroke);
    texStroke.strokeWidth = w * 0.012; texStroke.color = Color.argb(Math.round(255 * a), 255, 255, 235);
    canvas.drawPath(tmpPath, texStroke);
  }
}

function drawStruckPile(canvas) {
  const start = doomKind === 1 ? CRASH_IMPACT : 0.12;
  if (!(state === State.STRUCK || (state === State.GAME_OVER && struckDead)) || strikeT < start) return false;
  const t = strikeT - start + 0.12, ox = sx(px, pz), oy = sy(px, 0, pz);
  texPaint.shader = null;
  const grow = Math.min(1, (t - 0.12) / 0.15), wd = k * 0.45 * grow, ht = k * 0.28 * grow;
  const ov = (c, l, tp, r2, b) => { texPaint.color = c; rect.set(l, tp, r2, b); canvas.drawOval(rect, texPaint); };
  ov(Color.argb(70, 0, 0, 0), ox - wd * 1.2, oy - ht * 0.35, ox + wd * 1.2, oy + ht * 0.35);
  ov(Color.rgb(58, 58, 66), ox - wd, oy - ht * 0.9, ox + wd, oy + ht * 0.25);
  ov(Color.rgb(84, 84, 94), ox - wd * 0.6, oy - ht * 1.5, ox + wd * 0.55, oy - ht * 0.2);
  ov(Color.rgb(104, 104, 114), ox - wd * 0.25, oy - ht * 1.85, ox + wd * 0.25, oy - ht * 1.1);
  for (let i = 0; i < 5; i++) {
    const a = clamp(1 - (t - 0.12) / 1.2, 0, 1) * (0.5 + 0.5 * Math.sin(time * 12 + i));
    texPaint.color = Color.argb(Math.round(220 * a), 255, 140, 40);
    canvas.drawCircle(ox + (i - 2) * wd * 0.35, oy - ht * (0.3 + (i % 2) * 0.6), k * 0.018, texPaint);
  }
  if (t > 0.6) {
    const blink = (time % 1.6) > 1.45;
    for (const sgn of [-1, 1]) {
      const ex = ox + sgn * wd * 0.22, ey = oy - ht;
      if (blink) canvas.drawRect(ex - k * 0.04, ey - k * 0.006, ex + k * 0.04, ey + k * 0.006, pupilPaint);
      else { canvas.drawCircle(ex, ey, k * 0.045, eyeWhitePaint); canvas.drawCircle(ex, ey + k * 0.008, k * 0.02, pupilPaint); }
    }
  }
  for (let i = 0; i < 6; i++) {
    const q = (time * 0.6 + i / 6) % 1;
    texPaint.color = Color.argb(Math.round(120 * (1 - q)), 90, 90, 100);
    canvas.drawCircle(ox + Math.sin(i * 2.1 + t * 2) * k * 0.12, oy - ht - q * k * 1.2, k * (0.06 + 0.1 * q), texPaint);
  }
  return true;
}

/** Avion en feu qui pique sur le joueur, puis explosion. */
function drawPlaneCrash(canvas) {
  const t = strikeT, tx = sx(px, pz), ty = sy(px, 0.3, pz);
  const [x0, y0] = crashFrom;
  const dir = x0 < tx ? 1 : -1;
  if (t < CRASH_IMPACT) {
    const p = t / CRASH_IMPACT;
    const x = x0 + (tx - x0) * p, y = y0 + (ty - y0) * p * p;
    const dx = (tx - x0), dy = (ty - y0) * 2 * p;
    const ang = Math.atan2(dy, dx * dir) * 180 / Math.PI;
    crashSmoke.push([x - dir * w * 0.06, y - w * 0.01, 1]);
    for (const q of crashSmoke) q[2] -= 0.02;
    crashSmoke = crashSmoke.filter((q) => q[2] > 0);
    for (const [qx, qy, l] of crashSmoke) {
      texPaint.color = Color.argb(Math.round(150 * l), 50, 50, 55);
      canvas.drawCircle(qx, qy, w * (0.015 + 0.05 * (1 - l)), texPaint);
    }
    const s = w * 0.11;
    canvas.save();
    canvas.translate(x, y);
    canvas.rotate(ang * dir);
    canvas.scale(dir, 1);
    // Avion
    texPaint.shader = null;
    texPaint.color = Color.rgb(118, 124, 140);
    texStroke.strokeWidth = w * 0.004; texStroke.color = Color.rgb(45, 48, 58);
    rect.set(-s * 0.6, -s * 0.1, s * 0.6, s * 0.1); canvas.drawRoundRect(rect, s * 0.1, s * 0.1, texPaint); canvas.drawRoundRect(rect, s * 0.1, s * 0.1, texStroke);
    tmpPath.reset(); tmpPath.moveTo(s * 0.1, 0); tmpPath.lineTo(-s * 0.25, -s * 0.45); tmpPath.lineTo(-s * 0.35, -s * 0.45); tmpPath.lineTo(-s * 0.15, 0); tmpPath.close();
    canvas.drawPath(tmpPath, texPaint); canvas.drawPath(tmpPath, texStroke);
    tmpPath.reset(); tmpPath.moveTo(-s * 0.45, 0); tmpPath.lineTo(-s * 0.6, -s * 0.28); tmpPath.lineTo(-s * 0.66, -s * 0.28); tmpPath.lineTo(-s * 0.6, 0); tmpPath.close();
    canvas.drawPath(tmpPath, texPaint); canvas.drawPath(tmpPath, texStroke);
    texPaint.color = Color.argb(160, 30, 30, 36);
    canvas.drawCircle(s * 0.15, s * 0.03, s * 0.07, texPaint);
    canvas.drawCircle(-s * 0.3, -s * 0.02, s * 0.06, texPaint);
    texPaint.color = Color.rgb(140, 200, 255);
    for (let i = 0; i < 4; i++) canvas.drawCircle(s * (0.3 - i * 0.14), -s * 0.02, s * 0.03, texPaint);
    // Flammes à l'arrière et sur l'aile
    for (let i = 0; i < 6; i++) {
      const fl = 0.6 + 0.4 * Math.random();
      texPaint.color = i % 2 ? Color.argb(230, 255, 200, 40) : Color.argb(230, 255, 110, 30);
      canvas.drawCircle(-s * (0.55 + i * 0.09) , (Math.random() - 0.5) * s * 0.1, s * 0.09 * fl * (1 - i * 0.1), texPaint);
    }
    texPaint.color = Color.argb(220, 255, 140, 30);
    canvas.drawCircle(-s * 0.25, -s * 0.3, s * 0.08 * (0.7 + 0.3 * Math.random()), texPaint);
    canvas.restore();
  } else {
    // Explosion
    const q = t - CRASH_IMPACT;
    if (q < 0.25) { texPaint.color = Color.argb(Math.round(200 * (1 - q / 0.25)), 255, 220, 160); canvas.drawRect(0, 0, w, h, texPaint); }
    if (q < 0.9) {
      const r = k * (0.3 + 1.2 * Math.min(1, q / 0.35)), a = 1 - q / 0.9;
      for (const [c, f] of [[Color.rgb(255, 80, 30), 1], [Color.rgb(255, 160, 40), 0.75], [Color.rgb(255, 235, 140), 0.45]]) {
        texPaint.color = Color.argb(Math.round(230 * a), Color.red(c), Color.green(c), Color.blue(c));
        canvas.drawCircle(tx, ty - k * 0.2, r * f, texPaint);
      }
    }
    // Débris
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (i - 3.5) * 0.35, sp = w * (0.35 + (i % 3) * 0.12);
      const x = tx + Math.cos(ang) * sp * q, y = ty + Math.sin(ang) * sp * q + 0.5 * h * 1.4 * q * q;
      if (y > h) continue;
      texPaint.color = i % 2 ? Color.rgb(60, 60, 68) : Color.rgb(200, 205, 215);
      canvas.save(); canvas.rotate(q * 400 + i * 40, x, y);
      canvas.drawRect(x - w * 0.012, y - w * 0.006, x + w * 0.012, y + w * 0.006, texPaint);
      canvas.restore();
    }
  }
}

/** Montgolfière : enveloppe colorée (rayures, zigzag ou pois), nacelle, petite flamme. */
function drawBalloon(canvas, f) {
  const p = f.t / f.dur, R = f.s;
  const x = f.ltr ? -w * 0.15 + p * w * 1.3 : w * 1.15 - p * w * 1.3;
  const y = f.y + Math.sin(f.t * f.freq + f.ph) * f.amp + f.drift * f.t;
  const env = new Path();
  env.moveTo(x - R * 0.98, y + R * 0.2);
  env.cubicTo(x - R * 0.9, y + R * 0.75, x - R * 0.35, y + R * 1.1, x - R * 0.22, y + R * 1.35);
  env.lineTo(x + R * 0.22, y + R * 1.35);
  env.cubicTo(x + R * 0.35, y + R * 1.1, x + R * 0.9, y + R * 0.75, x + R * 0.98, y + R * 0.2);
  env.cubicTo(x + R * 0.98, y - R * 0.75, x + R * 0.55, y - R * 1.05, x, y - R * 1.05);
  env.cubicTo(x - R * 0.55, y - R * 1.05, x - R * 0.98, y - R * 0.75, x - R * 0.98, y + R * 0.2);
  env.close();
  // Cordes et nacelle
  texStroke.strokeWidth = w * 0.002; texStroke.color = Color.argb(170, 90, 70, 50);
  canvas.drawLine(x - R * 0.2, y + R * 1.35, x - R * 0.15, y + R * 1.65, texStroke);
  canvas.drawLine(x + R * 0.2, y + R * 1.35, x + R * 0.15, y + R * 1.65, texStroke);
  texPaint.shader = null;
  texPaint.color = Color.rgb(150, 100, 55);
  rect.set(x - R * 0.17, y + R * 1.63, x + R * 0.17, y + R * 1.88); canvas.drawRoundRect(rect, R * 0.04, R * 0.04, texPaint);
  if (Math.sin(f.t * 0.7 + f.ph) > 0.6) {
    texPaint.color = Color.argb(220, 255, 170, 40);
    canvas.drawCircle(x, y + R * 1.5, R * (0.06 + 0.03 * Math.random()), texPaint);
  }
  // Enveloppe
  canvas.save();
  canvas.clipPath(env);
  texPaint.color = f.c1; canvas.drawRect(x - R * 1.1, y - R * 1.1, x + R * 1.1, y + R * 1.4, texPaint);
  texPaint.color = f.c2;
  if (f.pattern === 0) {
    // Fuseaux verticaux
    for (const k2 of [0.62, 0.22]) { rect.set(x - R * k2, y - R * 1.1, x + R * k2, y + R * 1.4); canvas.drawOval(rect, texPaint); texPaint.color = f.c1; }
    texPaint.color = f.c2; rect.set(x - R * 0.08, y - R * 1.1, x + R * 0.08, y + R * 1.4); canvas.drawRect(rect, texPaint);
  } else if (f.pattern === 1) {
    // Bande en zigzag
    tmpPath.reset();
    const n = 8, top = y - R * 0.05, bot = y + R * 0.35;
    tmpPath.moveTo(x - R * 1.1, bot);
    for (let i = 0; i <= n; i++) tmpPath.lineTo(x - R * 1.1 + i * R * 2.2 / n, i % 2 ? top : top + R * 0.15);
    for (let i = n; i >= 0; i--) tmpPath.lineTo(x - R * 1.1 + i * R * 2.2 / n, i % 2 ? bot : bot + R * 0.15);
    tmpPath.close(); canvas.drawPath(tmpPath, texPaint);
    texPaint.color = f.c3; rect.set(x - R * 1.1, y - R * 1.1, x + R * 1.1, y - R * 0.55); canvas.drawRect(rect, texPaint);
  } else {
    // Pois
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 3; j++) canvas.drawCircle(x + i * R * 0.42 + (j % 2) * R * 0.21, y + j * R * 0.38, R * 0.1, texPaint);
  }
  // Volume : ombre à droite, reflet à gauche
  texPaint.color = Color.WHITE;
  texPaint.shader = new LinearGradient(x - R, 0, x + R, 0, Color.argb(70, 255, 255, 255), Color.argb(90, 20, 25, 40));
  canvas.drawRect(x - R * 1.1, y - R * 1.1, x + R * 1.1, y + R * 1.4, texPaint);
  texPaint.shader = null;
  canvas.restore();
}

