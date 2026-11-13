'use strict';
/*
 * Panneau du titre sur la carte de l'Aventure, à la matière de chaque chapitre (équivalent de ChapterSigns.kt).
 * Le chapitre 1 garde la planche en bois et ses cordes (drawWoodSign, quest.js). Pour les autres :
 *  2 Abysse      — dalle de corail turquoise, algues, étoile de mer, bernacles et bulles
 *  3 Aliens      — écran holographique dans un cadre de soucoupe, tenu par deux rayons tracteurs
 *  4 Zone 51     — plaque d'acier kaki, étoiles au pochoir, bande de danger, chaînes
 *  5 Fusion      — panneau « danger » jaune et noir, trèfles radioactifs, acide qui coule, câbles rayés
 *  6 Rêves       — nuage moelleux suspendu à des fils d'étoiles, croissant de lune, « z » qui s'envolent
 *  7 Banquise    — bloc de glace, neige dessus, stalactites dessous, cordes gelées
 *  8 Krakatoa    — dalle d'obsidienne fendue de lave, chaînes de fer, braises
 *  9 Horloge     — plaque de laiton rivetée, rouages qui tournent, tuyaux de cuivre qui crachent de la vapeur
 * 10 Jardin      — feuille géante, lianes, coccinelle et goutte de rosée
 * 11 Arcade      — enseigne néon en pixels, ampoules qui clignotent, envahisseurs, chaînes de pixels
 * 12 Pharaon     — tablette de grès, corniche dorée et lapis-lazuli, ankh et œil, colliers de perles
 * 13 Manoir      — dalle de pierre ébréchée, ferronnerie, toile d'araignée, chauve-souris, chaînes rouillées
 * 14 Rock        — panneau laqué noir et chrome qui flambe, éclairs, câbles de guitare en spirale
 * 15 Dojo        — plaque laquée rouge sous un petit toit de temple, cordons de soie, pompons, pétales
 * 16 Gourmandises — tablette de chocolat nappée de glaçage, vermicelles, cerise, cordons en sucre d'orge
 * 17 Pirates     — carte au trésor sur parchemin roulé, tête de mort, croix rouge, cordages
 * 18 Jurassique  — dalle de pierre moussue, ammonite fossile, empreinte de dinosaure, lianes
 */

const sgP = new Paint();
const sgS = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const sgT = new Paint({ textAlign: Align.CENTER, bold: true });
const sgPath = new Path();
const sgC = (s) => Color.parseColor(s);
const sgA = (a, s) => { const c = Color.parseColor(s); return Color.argb(a, Color.red(c), Color.green(c), Color.blue(c)); };
const sgR = (l, t, r, b) => new RectF(l, t, r, b);
const sgLin = (x0, y0, x1, y1, c0, c1) => new LinearGradient(x0, y0, x1, y1, c0, c1);

/** Panneau du chapitre [season] (la planche en bois au chapitre 1). */
function drawChapterSign(canvas, season, cx, top, sw, sh, small, big) {
  const f = SIGN_DRAW[season];
  if (!f) { drawWoodSign(canvas, cx, top, sw, sh, small, big); return; }
  sgP.shader = null;
  canvas.save();
  f(canvas, cx, top, sw, sh, small, big, insetTop + w * 0.085);
  canvas.restore();
  sgP.shader = null;
}

// ---------- Outils ----------

/** Rectangle arrondi dans un chemin (sens horaire, comme addCircle). */
function sgRR(P, l, t, r, b, rad) {
  const k = 0.5523 * rad;
  P.moveTo(l + rad, t); P.lineTo(r - rad, t); P.cubicTo(r - rad + k, t, r, t + rad - k, r, t + rad);
  P.lineTo(r, b - rad); P.cubicTo(r, b - rad + k, r - rad + k, b, r - rad, b);
  P.lineTo(l + rad, b); P.cubicTo(l + rad - k, b, l, b - rad + k, l, b - rad);
  P.lineTo(l, t + rad); P.cubicTo(l, t + rad - k, l + rad - k, t, l + rad, t); P.close();
}

/** Étoile à [n] branches. */
function sgStar(P, x, y, R, ri, n, rot) {
  P.reset();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i * Math.PI / n, rr = i % 2 ? ri : R;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) P.lineTo(px, py); else P.moveTo(px, py);
  }
  P.close();
}

/** Balancement d'un panneau suspendu. */
function sgSway(canvas, cx, amp, speed = 1.3) { canvas.rotate(Math.sin(time * speed) * amp, cx, insetTop); }

/** Chaîne verticale de maillons (un à plat, un de profil…). */
function sgChain(canvas, x, y0, y1, L, cMain, cDark, cLight) {
  const p = sgP, st = sgS;
  let i = 0;
  for (let y = y0; y < y1 - L * 0.3; y += L * 0.72, i++) {
    if (i % 2 === 0) {
      const o = sgR(x - L * 0.32, y, x + L * 0.32, y + L);
      st.color = cDark; st.strokeWidth = L * 0.3; canvas.drawOval(o, st);
      st.color = cMain; st.strokeWidth = L * 0.17; canvas.drawOval(o, st);
      st.color = cLight; st.strokeWidth = L * 0.06; canvas.drawArc(o, 190, 80, false, st);
    } else {
      p.color = cDark; canvas.drawRoundRect(sgR(x - L * 0.11, y - L * 0.04, x + L * 0.11, y + L * 1.04), L * 0.11, L * 0.11, p);
      p.color = cMain; canvas.drawRoundRect(sgR(x - L * 0.06, y + L * 0.02, x + L * 0.06, y + L * 0.98), L * 0.06, L * 0.06, p);
    }
  }
}

/** Corde tressée verticale (version gelée de la corde du chapitre 1). */
function sgRope(canvas, x, y0, y1, rw, cMain, cDark, cLight) {
  const p = sgP, st = sgS;
  p.color = cMain; canvas.drawRect(x - rw / 2, y0, x + rw / 2, y1, p);
  st.color = cDark; st.strokeWidth = w * 0.004;
  for (let y = y0; y < y1 - rw * 0.3; y += rw * 0.9) canvas.drawLine(x - rw / 2, y, x + rw / 2, y + rw * 0.6, st);
  st.color = cLight; st.strokeWidth = w * 0.003; canvas.drawLine(x - rw * 0.25, y0, x - rw * 0.25, y1, st);
}

/** Textes du panneau : chapitre en petit, titre en gros (rempli, au contour épais). */
function sgText(canvas, cx, t, sw, sh, small, big, o) {
  const T = sgT;
  T.textAlign = Align.CENTER; T.style = Style.FILL; T.shader = null;
  T.textSize = sh * 0.24; T.color = o.small;
  canvas.drawText(small, cx, t + sh * (o.sy || 0.36), T);
  T.textSize = sh * 0.36;
  const tt = fitText(big, T, sw * (o.maxW || 0.84), 0.55);
  const y = t + sh * (o.by || 0.78);
  T.style = Style.STROKE; T.strokeWidth = sh * 0.07; T.strokeJoin = 'round'; T.color = o.stroke;
  canvas.drawText(tt, cx, y, T);
  T.style = Style.FILL; T.color = o.fill;
  canvas.drawText(tt, cx, y, T);
  T.textSize = sh * 0.24;
  return T.measureText(small);
}

/** Épaisseur + face en dégradé d'une plaque arrondie. */
function sgSlab(canvas, l, t, r, b, rad, depth, cDepth, c0, c1) {
  const p = sgP;
  p.shader = null; p.color = cDepth; canvas.drawRoundRect(sgR(l, t + depth, r, b + depth), rad, rad, p);
  p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, c0, c1); canvas.drawRoundRect(sgR(l, t, r, b), rad, rad, p); p.shader = null;
}

// ---------- 2 : Abysse ----------
function sgKelp(canvas, x0, y0, y1, ph) {
  const P = sgPath, p = sgP, st = sgS, n = 14, amp = w * 0.008;
  const xs = [], ys = [];
  for (let k = 0; k <= n; k++) {
    const q = k / n;
    xs.push(x0 + Math.sin(q * 7 + time * 2.2 + ph * 1.7) * amp * (1 - q * 0.75)); ys.push(y0 + (y1 - y0) * q);
  }
  // Petites lames de part et d'autre
  p.color = sgC('#2E8A4C');
  for (let k = 2; k < n; k += 2) {
    const x = xs[k], y = ys[k], s = (k % 4 === 0) ? 1 : -1;
    P.reset(); P.moveTo(x, y);
    P.quadTo(x + s * w * 0.03, y - w * 0.006, x + s * w * 0.042, y + w * 0.012);
    P.quadTo(x + s * w * 0.02, y + w * 0.012, x, y + w * 0.012); P.close();
    canvas.drawPath(P, p);
  }
  P.reset();
  for (let k = 0; k <= n; k++) { if (k) P.lineTo(xs[k], ys[k]); else P.moveTo(xs[k], ys[k]); }
  st.color = sgC('#257A40'); st.strokeWidth = w * 0.024; canvas.drawPath(P, st);
  st.color = sgC('#3DB463'); st.strokeWidth = w * 0.016; canvas.drawPath(P, st);
  st.color = sgA(120, '#C8F7D4'); st.strokeWidth = w * 0.004; canvas.drawPath(P, st);
}

function sign2(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 1.0, 1.1);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  sgKelp(canvas, l + sw * 0.15, a0, t + sh * 0.14, 0);
  sgKelp(canvas, r - sw * 0.15, a0, t + sh * 0.14, 1);
  // Bulles qui remontent derrière
  for (let i = 0; i < 4; i++) {
    const q = (time * 0.45 + i * 0.27) % 1;
    const bx = cx + sw * (-0.3 + i * 0.2) + Math.sin(time * 3 + i * 2) * w * 0.006, by = t - q * w * 0.12;
    st.color = sgA((200 * (1 - q)) | 0, '#E0FAFF'); st.strokeWidth = w * 0.0025;
    canvas.drawCircle(bx, by, w * (0.006 + 0.003 * (i % 2)), st);
  }
  // Dalle de corail
  sgSlab(canvas, l, t, r, b, w * 0.04, w * 0.012, sgC('#0F5566'), sgC('#5ED3D1'), sgC('#1D879A'));
  st.color = sgA(110, '#E6FFFF'); st.strokeWidth = w * 0.004;
  canvas.drawLine(l + w * 0.03, t + w * 0.008, r - w * 0.03, t + w * 0.008, st);
  // Reflets ondulants de la surface
  st.color = sgA(45, '#FFFFFF'); st.strokeWidth = w * 0.003;
  for (const q of [0.2, 0.92]) {
    P.reset();
    for (let k = 0; k <= 20; k++) {
      const x = l + sw * (0.06 + 0.88 * k / 20), y = t + sh * q + Math.sin(k * 1.3 + time * 2.5 + q * 5) * sh * 0.025;
      if (k) P.lineTo(x, y); else P.moveTo(x, y);
    }
    canvas.drawPath(P, st);
  }
  // Nœuds d'algue sur la dalle
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    p.color = sgC('#257A40'); canvas.drawOval(sgR(x - w * 0.018, t - sh * 0.02, x + w * 0.018, t + sh * 0.2), p);
    p.color = sgC('#3DB463'); canvas.drawOval(sgR(x - w * 0.012, t + sh * 0.01, x + w * 0.012, t + sh * 0.15), p);
  }
  // Bernacles dans les coins
  for (const [bx, by, br] of [[l + sw * 0.045, t + sh * 0.2, 1], [l + sw * 0.075, t + sh * 0.12, 0.7], [r - sw * 0.035, b - sh * 0.16, 1],
    [r - sw * 0.07, b - sh * 0.1, 0.7]]) {
    const rr = w * 0.011 * br;
    p.color = sgC('#C9B58F'); canvas.drawCircle(bx, by + rr * 0.2, rr * 1.1, p);
    p.color = sgC('#F2E6CC'); canvas.drawCircle(bx, by, rr, p);
    p.color = sgC('#6B5A43'); canvas.drawCircle(bx, by, rr * 0.4, p);
  }
  // Corail rose qui pousse sur le coin bas gauche
  st.color = sgC('#E84E7C'); st.strokeWidth = w * 0.011;
  const kx = l + sw * 0.035, ky = b + w * 0.004;
  canvas.drawLine(kx, ky, kx - w * 0.012, ky - sh * 0.38, st);
  canvas.drawLine(kx - w * 0.006, ky - sh * 0.18, kx - w * 0.03, ky - sh * 0.3, st);
  canvas.drawLine(kx - w * 0.009, ky - sh * 0.28, kx + w * 0.012, ky - sh * 0.45, st);
  st.color = sgC('#FF7FA3'); st.strokeWidth = w * 0.006;
  canvas.drawLine(kx, ky, kx - w * 0.012, ky - sh * 0.38, st);
  canvas.drawLine(kx - w * 0.009, ky - sh * 0.28, kx + w * 0.012, ky - sh * 0.45, st);
  // Étoile de mer sur le coin haut droit
  sgStar(P, r - sw * 0.05, t + sh * 0.12, w * 0.03, w * 0.013, 5, -Math.PI / 2 + 0.3);
  p.color = sgC('#FF8A5C'); canvas.drawPath(P, p);
  st.color = sgC('#D9572E'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  p.color = sgC('#FFD0B5');
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + 0.3 + i * 1.2566;
    canvas.drawCircle(r - sw * 0.05 + Math.cos(a) * w * 0.014, t + sh * 0.12 + Math.sin(a) * w * 0.014, w * 0.0028, p);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#0B4756'), fill: Color.WHITE, stroke: sgC('#0B4756'), maxW: 0.84 });
}

// ---------- 3 : Aliens ----------
function sign3(canvas, cx, top, sw, sh, small, big, a0) {
  canvas.translate(0, Math.sin(time * 2) * w * 0.004);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Rayons tracteurs
  for (const x of [l + sw * 0.2, r - sw * 0.2]) {
    P.reset(); P.moveTo(x - w * 0.012, a0); P.lineTo(x + w * 0.012, a0); P.lineTo(x + w * 0.04, t + sh * 0.1); P.lineTo(x - w * 0.04, t + sh * 0.1); P.close();
    p.color = Color.WHITE; p.shader = sgLin(0, a0, 0, t, sgA(30, '#69F0AE'), sgA(150, '#69F0AE')); canvas.drawPath(P, p); p.shader = null;
    st.color = sgA(150, '#B9F6CA'); st.strokeWidth = w * 0.0025;
    canvas.drawLine(x - w * 0.012, a0, x - w * 0.04, t + sh * 0.1, st);
    canvas.drawLine(x + w * 0.012, a0, x + w * 0.04, t + sh * 0.1, st);
    for (let i = 0; i < 3; i++) {
      const q = (time * 0.7 + i / 3) % 1, y = a0 + (t - a0) * q, hw = w * (0.012 + 0.028 * q);
      st.color = sgA((220 * Math.sin(q * Math.PI)) | 0, '#E8FFF0'); st.strokeWidth = w * 0.003;
      canvas.drawOval(sgR(x - hw, y - w * 0.004, x + hw, y + w * 0.004), st);
    }
    // Petite coupole d'accroche
    p.color = sgC('#90A4AE'); canvas.drawOval(sgR(x - w * 0.03, t - w * 0.012, x + w * 0.03, t + w * 0.012), p);
    p.color = sgC('#69F0AE'); canvas.drawOval(sgR(x - w * 0.016, t - w * 0.016, x + w * 0.016, t + w * 0.004), p);
    p.color = sgA(200, '#FFFFFF'); canvas.drawCircle(x - w * 0.006, t - w * 0.01, w * 0.003, p);
  }
  // Cadre de soucoupe chromé (en gélule)
  const rad = sh * 0.5;
  sgSlab(canvas, l, t, r, b, rad, w * 0.012, sgC('#455A64'), sgC('#F1F5F7'), sgC('#8DA1AB'));
  st.color = sgA(160, '#FFFFFF'); st.strokeWidth = w * 0.003;
  canvas.drawLine(l + rad, t + w * 0.005, r - rad, t + w * 0.005, st);
  // Écran
  const il = l + sh * 0.13, it = t + sh * 0.1, ir = r - sh * 0.13, ib = b - sh * 0.1;
  P.reset(); sgRR(P, il, it, ir, ib, (ib - it) / 2);
  p.color = Color.WHITE; p.shader = sgLin(0, it, 0, ib, sgC('#0F4434'), sgC('#06231A')); canvas.drawPath(P, p); p.shader = null;
  canvas.save(); canvas.clipPath(P);
  st.color = sgA(28, '#69F0AE'); st.strokeWidth = w * 0.002;
  for (let y = it + sh * 0.04; y < ib; y += sh * 0.06) canvas.drawLine(il, y, ir, y, st);
  const sy = it + (ib - it + sh * 0.3) * ((time * 0.35) % 1) - sh * 0.15;
  p.shader = sgLin(0, sy - sh * 0.15, 0, sy + sh * 0.15, sgA(0, '#69F0AE'), sgA(60, '#69F0AE'));
  p.color = Color.WHITE; canvas.drawRect(il, sy - sh * 0.15, ir, sy + sh * 0.15, p); p.shader = null;
  canvas.restore();
  st.color = sgA(220, '#69F0AE'); st.strokeWidth = w * 0.004; canvas.drawPath(P, st);
  // Hublots lumineux qui clignotent sur le cadre
  for (let i = 0; i < 2; i++) {
    const x = i ? r - sh * 0.065 : l + sh * 0.065, on = ((time * 2 + i) | 0) % 2 === 0;
    p.color = sgC(on ? (i ? '#FF5252' : '#69F0AE') : '#546E7A'); canvas.drawCircle(x, t + sh * 0.5, w * 0.008, p);
    p.color = sgA(on ? 210 : 90, '#FFFFFF'); canvas.drawCircle(x - w * 0.003, t + sh * 0.5 - w * 0.003, w * 0.0025, p);
  }
  p.color = sgC('#B0BEC5');
  for (let i = 1; i < 8; i++) if (i !== 2 && i !== 6) canvas.drawCircle(l + sw * i / 8, b - sh * 0.045, w * 0.0035, p);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#69F0AE'), fill: sgC('#F1FFF6'), stroke: sgC('#13734A'), maxW: 0.78 });
}

// ---------- 4 : Zone 51 ----------
function sign4(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.6);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    sgChain(canvas, x, a0, t + sh * 0.1, w * 0.03, sgC('#B4C2C9'), sgC('#56707C'), sgA(200, '#FFFFFF'));
    p.color = sgC('#56707C'); canvas.drawRoundRect(sgR(x - w * 0.016, t - w * 0.004, x + w * 0.016, t + sh * 0.14), w * 0.006, w * 0.006, p);
    p.color = sgC('#90A4AE'); canvas.drawRoundRect(sgR(x - w * 0.012, t, x + w * 0.012, t + sh * 0.11), w * 0.004, w * 0.004, p);
  }
  const rad = w * 0.018;
  sgSlab(canvas, l, t, r, b, rad, w * 0.012, sgC('#2E3717'), sgC('#7F8E47'), sgC('#525E2B'));
  // Bande de danger jaune et noire en bas
  P.reset(); sgRR(P, l, t, r, b, rad);
  canvas.save(); canvas.clipPath(P);
  p.color = sgC('#F2C230'); canvas.drawRect(l, b - sh * 0.12, r, b, p);
  st.color = sgC('#262A14'); st.strokeWidth = sh * 0.06; st.strokeCap = 'butt';
  for (let x = l - sh * 0.2; x < r + sh * 0.2; x += sh * 0.14) canvas.drawLine(x, b + sh * 0.02, x + sh * 0.16, b - sh * 0.14, st);
  st.strokeCap = 'round';
  // Rayures d'usure
  st.color = sgA(40, '#FFFFFF'); st.strokeWidth = w * 0.002;
  canvas.drawLine(l + sw * 0.2, t + sh * 0.2, l + sw * 0.28, t + sh * 0.26, st);
  canvas.drawLine(r - sw * 0.3, t + sh * 0.62, r - sw * 0.22, t + sh * 0.58, st);
  canvas.restore();
  st.color = sgC('#262A14'); st.strokeWidth = w * 0.003; canvas.drawLine(l, b - sh * 0.12, r, b - sh * 0.12, st);
  // Biseau
  st.color = sgA(70, '#FFFFFF'); st.strokeWidth = w * 0.003;
  canvas.drawLine(l + rad, t + w * 0.004, r - rad, t + w * 0.004, st);
  // Étoiles au pochoir
  for (const x of [l + sw * 0.075, r - sw * 0.075]) {
    sgStar(P, x, t + sh * 0.46, sh * 0.19, sh * 0.075, 5, -Math.PI / 2);
    p.color = sgA(225, '#EDE8CC'); canvas.drawPath(P, p);
  }
  // Rivets
  for (const [x, y] of [[l + sw * 0.02, t + sh * 0.1], [r - sw * 0.02, t + sh * 0.1], [l + sw * 0.02, b - sh * 0.22], [r - sw * 0.02, b - sh * 0.22],
    [cx - sw * 0.22, t + sh * 0.08], [cx + sw * 0.22, t + sh * 0.08]]) {
    p.color = sgC('#3C4620'); canvas.drawCircle(x, y + w * 0.0015, w * 0.0065, p);
    p.color = sgC('#A4B067'); canvas.drawCircle(x, y, w * 0.0055, p);
    p.color = sgA(180, '#FFFFFF'); canvas.drawCircle(x - w * 0.002, y - w * 0.002, w * 0.0018, p);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#EFEACF'), fill: Color.WHITE, stroke: sgC('#262E12'), maxW: 0.74, by: 0.75 });
}

// ---------- 5 : Alerte fusion ----------
function sgTrefoil(canvas, x, y, R) {
  const p = sgP;
  p.color = sgC('#1A1A1A'); canvas.drawCircle(x, y, R * 1.12, p);
  p.color = sgC('#FFD93B'); canvas.drawCircle(x, y, R, p);
  p.color = sgC('#1A1A1A');
  const o = sgR(x - R * 0.85, y - R * 0.85, x + R * 0.85, y + R * 0.85);
  for (const s of [240, 0, 120]) canvas.drawArc(o, s, 60, true, p);
  p.color = sgC('#FFD93B'); canvas.drawCircle(x, y, R * 0.28, p);
  p.color = sgC('#1A1A1A'); canvas.drawCircle(x, y, R * 0.18, p);
}

function sign5(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.8);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Câbles à gaine jaune et noire
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    const cw = w * 0.012;
    canvas.save(); canvas.clipRect(x - cw / 2, a0, x + cw / 2, t + sh * 0.1);
    p.color = sgC('#FFD93B'); canvas.drawRect(x - cw / 2, a0, x + cw / 2, t + sh * 0.1, p);
    st.color = sgC('#1A1A1A'); st.strokeWidth = w * 0.007; st.strokeCap = 'butt';
    for (let y = a0 - w * 0.02; y < t + sh * 0.1; y += w * 0.022) canvas.drawLine(x - cw, y + w * 0.012, x + cw, y, st);
    st.strokeCap = 'round';
    canvas.restore();
    // Serre-câble métallique
    p.color = sgC('#5F6B70'); canvas.drawRoundRect(sgR(x - w * 0.016, t - w * 0.008, x + w * 0.016, t + sh * 0.13), w * 0.005, w * 0.005, p);
    p.color = sgC('#A7B4B9'); canvas.drawRoundRect(sgR(x - w * 0.012, t - w * 0.005, x + w * 0.012, t + sh * 0.1), w * 0.004, w * 0.004, p);
  }
  const rad = w * 0.022;
  p.color = sgC('#1A1A1A'); canvas.drawRoundRect(sgR(l, t + w * 0.012, r, b + w * 0.012), rad, rad, p);
  // Cadre à rayures de danger
  P.reset(); sgRR(P, l, t, r, b, rad);
  canvas.save(); canvas.clipPath(P);
  p.color = sgC('#FFD93B'); canvas.drawRect(l, t, r, b, p);
  st.color = sgC('#1A1A1A'); st.strokeWidth = sh * 0.075; st.strokeCap = 'butt';
  for (let x = l - sh; x < r + sh; x += sh * 0.2) canvas.drawLine(x, b, x + sh, t, st);
  st.strokeCap = 'round';
  canvas.restore();
  const m = sh * 0.085;
  P.reset(); sgRR(P, l + m, t + m, r - m, b - m, rad * 0.6);
  p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, sgC('#FFE866'), sgC('#F6B91C')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgC('#1A1A1A'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  // Acide vert : flaque sur le coin haut gauche, gouttes qui coulent du bas
  const g = sgC('#7CFF2E'), gd = sgC('#2E9B00');
  p.color = gd; canvas.drawOval(sgR(l + sw * 0.01, t - w * 0.006, l + sw * 0.13, t + w * 0.016), p);
  p.color = g; canvas.drawOval(sgR(l + sw * 0.015, t - w * 0.008, l + sw * 0.125, t + w * 0.012), p);
  p.color = gd; canvas.drawRoundRect(sgR(l + sw * 0.02, t, l + sw * 0.035, t + sh * 0.3), w * 0.008, w * 0.008, p);
  p.color = g; canvas.drawRoundRect(sgR(l + sw * 0.022, t, l + sw * 0.033, t + sh * 0.28), w * 0.006, w * 0.006, p);
  p.color = gd; canvas.drawRoundRect(sgR(l + sw * 0.16, b - sh * 0.07, l + sw * 0.92, b + sh * 0.05), w * 0.012, w * 0.012, p);
  p.color = g; canvas.drawRoundRect(sgR(l + sw * 0.165, b - sh * 0.065, l + sw * 0.915, b + sh * 0.035), w * 0.01, w * 0.01, p);
  p.color = sgA(150, '#E6FFD0'); canvas.drawRoundRect(sgR(l + sw * 0.2, b - sh * 0.05, l + sw * 0.4, b - sh * 0.03), w * 0.003, w * 0.003, p);
  const drips = [[0.22, 0], [0.47, 2.1], [0.66, 4.2], [0.86, 1.3]];
  for (const [dx, ph] of drips) {
    const x = l + sw * dx, len = sh * (0.08 + 0.14 * (0.5 + 0.5 * Math.sin(time * 1.4 + ph))), dw = w * 0.009;
    p.color = gd; canvas.drawRoundRect(sgR(x - dw - w * 0.002, b, x + dw + w * 0.002, b + len + w * 0.002), dw, dw, p);
    p.color = g; canvas.drawRoundRect(sgR(x - dw, b, x + dw, b + len), dw, dw, p);
    // Goutte qui tombe de temps en temps
    const q = (time * 0.6 + ph * 0.3) % 1;
    if (q < 0.5) {
      const fy = b + len + q * sh * 0.8;
      p.color = sgA((255 * (1 - q * 2)) | 0, '#7CFF2E'); canvas.drawCircle(x, fy, dw * 0.7, p);
    }
  }
  p.color = sgA(150, '#E6FFD0'); canvas.drawCircle(l + sw * 0.05, t + w * 0.001, w * 0.003, p);
  // Trèfles radioactifs de part et d'autre du « Chapitre n »
  sgT.textSize = sh * 0.24;
  const half = sgT.measureText(small) / 2 + sh * 0.2;
  sgTrefoil(canvas, cx - half, t + sh * 0.28, sh * 0.11);
  sgTrefoil(canvas, cx + half, t + sh * 0.28, sh * 0.11);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#2B2100'), fill: sgC('#C6FF3A'), stroke: sgC('#151515'), maxW: 0.8, sy: 0.37 });
}

// ---------- 6 : Pays des rêves ----------
function sgCloudPath(P, l, t, r, b, sh) {
  P.reset();
  sgRR(P, l + sh * 0.1, t + sh * 0.08, r - sh * 0.1, b, sh * 0.42);
  const n = 6, sw = r - l;
  for (let i = 0; i < n; i++) {
    const x = l + sw * (0.14 + 0.72 * i / (n - 1));
    P.addCircle(x, t + sh * (0.12 + 0.04 * (i % 2)), sh * (i % 2 ? 0.2 : 0.26));
  }
  P.addCircle(l + sh * 0.3, t + sh * 0.55, sh * 0.36);
  P.addCircle(r - sh * 0.3, t + sh * 0.52, sh * 0.38);
  for (let i = 0; i < 4; i++) P.addCircle(l + sw * (0.25 + 0.17 * i), b - sh * 0.05, sh * 0.16);
}

function sign6(canvas, cx, top, sw, sh, small, big, a0) {
  canvas.translate(0, Math.sin(time * 1.6) * w * 0.005);
  sgSway(canvas, cx, 0.5, 0.9);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Fils dorés avec des étoiles enfilées
  for (const [i, x] of [[0, l + sw * 0.2], [1, r - sw * 0.2]]) {
    st.color = sgA(220, '#F7D98B'); st.strokeWidth = w * 0.003; canvas.drawLine(x, a0, x, t + sh * 0.1, st);
    for (let k = 0; k < 3; k++) {
      const y = a0 + (t - a0) * (0.25 + k * 0.3), tw = 1 + 0.18 * Math.sin(time * 3 + k * 2 + i * 1.5);
      sgStar(P, x, y, w * 0.016 * tw, w * 0.0075 * tw, 5, -Math.PI / 2 + Math.sin(time * 1.5 + k) * 0.25);
      p.color = sgC('#FFE27A'); canvas.drawPath(P, p);
      st.color = sgC('#E8A92A'); st.strokeWidth = w * 0.0025; canvas.drawPath(P, st);
    }
  }
  // Nuage : épaisseur lavande, puis face en dégradé
  canvas.save(); canvas.translate(0, w * 0.012);
  sgCloudPath(P, l, t, r, b, sh); p.color = sgC('#A895D8'); canvas.drawPath(P, p);
  canvas.restore();
  sgCloudPath(P, l, t, r, b, sh);
  p.color = Color.WHITE; p.shader = sgLin(0, t - sh * 0.15, 0, b, sgC('#FFFFFF'), sgC('#DCCFFF')); canvas.drawPath(P, p); p.shader = null;
  // Reflets roses
  p.color = sgA(90, '#FFB3DA');
  canvas.drawOval(sgR(l + sw * 0.06, t + sh * 0.6, l + sw * 0.16, t + sh * 0.78), p);
  canvas.drawOval(sgR(r - sw * 0.16, t + sh * 0.62, r - sw * 0.06, t + sh * 0.8), p);
  // Croissant de lune posé sur le nuage
  const mx = r - sw * 0.12, my = t - sh * 0.08;
  st.color = sgC('#E8A92A'); st.strokeWidth = w * 0.017; canvas.drawArc(sgR(mx - w * 0.026, my - w * 0.026, mx + w * 0.026, my + w * 0.026), 100, 190, false, st);
  st.color = sgC('#FFE27A'); st.strokeWidth = w * 0.011; canvas.drawArc(sgR(mx - w * 0.026, my - w * 0.026, mx + w * 0.026, my + w * 0.026), 100, 190, false, st);
  // Petits « z » qui s'envolent
  sgT.style = Style.FILL;
  for (let i = 0; i < 3; i++) {
    const q = (time * 0.35 + i / 3) % 1;
    sgT.textSize = sh * (0.14 + 0.12 * q); sgT.color = sgA((230 * Math.sin(q * Math.PI)) | 0, '#9B7FE0');
    canvas.drawText('z', l + sw * 0.1 - q * w * 0.03 + Math.sin(q * 6) * w * 0.008, t + sh * 0.05 - q * w * 0.09, sgT);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#8A69D6'), fill: Color.WHITE, stroke: sgC('#7656C8'), maxW: 0.8, sy: 0.38, by: 0.8 });
}

// ---------- 7 : Banquise ----------
function sign7(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.7);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    sgRope(canvas, x, a0, t + sh * 0.08, w * 0.016, sgC('#CDEBF7'), sgC('#86BCD4'), sgA(200, '#FFFFFF'));
    // Givre en petites pointes
    p.color = sgA(230, '#FFFFFF');
    for (let y = a0 + w * 0.02, i = 0; y < t; y += w * 0.024, i++) {
      const s = i % 2 ? 1 : -1, x0 = x + s * w * 0.008;
      P.reset(); P.moveTo(x0, y); P.lineTo(x0 + s * w * 0.008, y + w * 0.004); P.lineTo(x0, y + w * 0.008); P.close(); canvas.drawPath(P, p);
    }
  }
  const rad = w * 0.02;
  sgSlab(canvas, l, t, r, b, rad, w * 0.012, sgC('#4A9CC2'), sgC('#EAF9FF'), sgC('#98D5F0'));
  // Facettes et fissures
  P.reset(); sgRR(P, l, t, r, b, rad);
  canvas.save(); canvas.clipPath(P);
  p.color = sgA(70, '#FFFFFF');
  for (const [x0, ww] of [[0.12, 0.08], [0.55, 0.05], [0.8, 0.1]]) {
    P.reset(); P.moveTo(l + sw * x0, b); P.lineTo(l + sw * (x0 + ww), b); P.lineTo(l + sw * (x0 + ww + 0.12), t); P.lineTo(l + sw * (x0 + 0.12), t); P.close();
    canvas.drawPath(P, p);
  }
  st.color = sgA(90, '#5FA9CC'); st.strokeWidth = w * 0.0025;
  canvas.drawLine(r - sw * 0.02, t + sh * 0.5, r - sw * 0.07, t + sh * 0.62, st);
  canvas.drawLine(r - sw * 0.07, t + sh * 0.62, r - sw * 0.06, t + sh * 0.8, st);
  canvas.drawLine(l + sw * 0.01, t + sh * 0.7, l + sw * 0.05, t + sh * 0.78, st);
  canvas.restore();
  st.color = sgA(200, '#FFFFFF'); st.strokeWidth = w * 0.004; canvas.drawRoundRect(sgR(l + w * 0.003, t + w * 0.003, r - w * 0.003, b - w * 0.003), rad, rad, st);
  // Stalactites de glace sous le bloc
  const ic = [[0.08, 0.22], [0.14, 0.12], [0.27, 0.3], [0.34, 0.14], [0.52, 0.2], [0.63, 0.34], [0.7, 0.13], [0.84, 0.25], [0.91, 0.15]];
  for (const [dx, len] of ic) {
    const x = l + sw * dx, iw = w * 0.011;
    P.reset(); P.moveTo(x - iw, b + w * 0.008); P.lineTo(x + iw, b + w * 0.008); P.lineTo(x, b + w * 0.012 + sh * len); P.close();
    p.color = Color.WHITE; p.shader = sgLin(0, b, 0, b + sh * len, sgC('#E6F7FF'), sgA(150, '#9FD8F2')); canvas.drawPath(P, p); p.shader = null;
    st.color = sgA(200, '#FFFFFF'); st.strokeWidth = w * 0.002; canvas.drawLine(x - iw * 0.4, b + w * 0.01, x - iw * 0.1, b + sh * len * 0.7, st);
  }
  // Neige sur le dessus
  P.reset(); P.moveTo(l - w * 0.004, t + sh * 0.14);
  for (let i = 0; i <= 12; i++) {
    const x = l + sw * i / 12, y = t - sh * (0.06 + 0.05 * Math.abs(Math.sin(i * 1.9)));
    P.quadTo(x - sw / 24, y - sh * 0.05, x, y);
  }
  P.lineTo(r + w * 0.004, t + sh * 0.14);
  for (let i = 12; i >= 0; i--) P.quadTo(l + sw * (i + 0.5) / 12, t + sh * (0.2 + 0.05 * Math.sin(i * 2.7)), l + sw * i / 12, t + sh * 0.12);
  P.close();
  p.color = sgC('#CFE6F2'); canvas.save(); canvas.translate(0, w * 0.004); canvas.drawPath(P, p); canvas.restore();
  p.color = Color.WHITE; canvas.drawPath(P, p);
  // Nœuds enneigés
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    p.color = sgC('#CFE6F2'); canvas.drawCircle(x, t - sh * 0.05, w * 0.017, p);
    p.color = Color.WHITE; canvas.drawCircle(x - w * 0.002, t - sh * 0.07, w * 0.014, p);
  }
  // Scintillements
  for (let i = 0; i < 3; i++) {
    const q = (time * 0.8 + i * 0.37) % 1;
    if (q > 0.5) continue;
    const s = Math.sin(q * 2 * Math.PI) * w * 0.012, x = l + sw * [0.1, 0.62, 0.9][i], y = t + sh * [0.55, 0.22, 0.7][i];
    sgStar(P, x, y, s, s * 0.25, 4, 0); p.color = Color.WHITE; canvas.drawPath(P, p);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#24698E'), fill: Color.WHITE, stroke: sgC('#1D5C82'), maxW: 0.86, sy: 0.4, by: 0.8 });
}

// ---------- 8 : Krakatoa ----------
function sign8(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.7);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  const pulse = 0.65 + 0.35 * Math.sin(time * 2.6);
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    sgChain(canvas, x, a0, t + sh * 0.1, w * 0.03, sgC('#55555E'), sgC('#232328'), sgA(120, '#FFB37A'));
    // Le dernier maillon rougeoie
    p.color = sgA((120 * pulse) | 0, '#FF6A00'); canvas.drawCircle(x, t - w * 0.006, w * 0.016, p);
    p.color = sgC('#2A2A30'); canvas.drawRoundRect(sgR(x - w * 0.015, t - w * 0.004, x + w * 0.015, t + sh * 0.14), w * 0.005, w * 0.005, p);
  }
  // Dalle d'obsidienne aux bords taillés
  const pts = [[0, 0.12], [0.05, 0.02], [0.2, 0], [0.38, 0.04], [0.55, -0.01], [0.72, 0.03], [0.9, 0], [0.98, 0.08], [1, 0.4], [0.985, 0.75], [1, 0.95],
    [0.85, 1.02], [0.65, 0.97], [0.45, 1.03], [0.25, 0.98], [0.06, 1.0], [0, 0.85], [0.015, 0.5]];
  const rock = (dy) => {
    P.reset();
    pts.forEach(([x, y], i) => { const px = l + sw * x, py = t + sh * y + dy; if (i) P.lineTo(px, py); else P.moveTo(px, py); });
    P.close();
  };
  rock(w * 0.013); p.color = sgC('#0A0A0D'); canvas.drawPath(P, p);
  rock(0); p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, sgC('#3E3E4A'), sgC('#16161B')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgA(60, '#C9C9FF'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  // Éclats brillants de l'obsidienne
  st.color = sgA(40, '#FFFFFF'); st.strokeWidth = w * 0.004;
  for (const x0 of [0.1, 0.16, 0.8]) canvas.drawLine(l + sw * x0, t + sh * 0.12, l + sw * (x0 + 0.05), t + sh * 0.06, st);
  st.color = sgA(55, '#FFFFFF'); st.strokeWidth = w * 0.003;
  canvas.drawLine(l + sw * 0.06, t + sh * 0.06, l + sw * 0.35, t + sh * 0.06, st);
  // Fissures de lave qui palpitent
  const cracks = [[[0.015, 0.5], [0.05, 0.56], [0.07, 0.72], [0.11, 0.78]], [[0.07, 0.72], [0.04, 0.92]],
    [[0.98, 0.08], [0.94, 0.2], [0.955, 0.33], [0.92, 0.42]], [[0.65, 0.97], [0.68, 0.9], [0.74, 0.92]], [[0.25, 0.98], [0.23, 0.9]],
    [[0.38, 0.04], [0.4, 0.11]]];
  for (const pass of [0, 1]) {
    st.color = pass ? sgA((255 * pulse) | 0, '#FFD54F') : sgA((110 * pulse) | 0, '#FF5A00');
    st.strokeWidth = pass ? w * 0.003 : w * 0.011;
    for (const c of cracks) {
      P.reset(); c.forEach(([x, y], i) => { if (i) P.lineTo(l + sw * x, t + sh * y); else P.moveTo(l + sw * x, t + sh * y); });
      canvas.drawPath(P, st);
    }
  }
  // Braises qui montent
  for (let i = 0; i < 5; i++) {
    const q = (time * 0.4 + i * 0.21) % 1;
    const ex = l + sw * (0.12 + i * 0.19) + Math.sin(time * 2 + i * 3) * w * 0.01, ey = b - q * (sh + w * 0.12);
    p.color = sgA((230 * (1 - q)) | 0, i % 2 ? '#FFB300' : '#FF6D00'); canvas.drawCircle(ex, ey, w * 0.004 * (1 - q * 0.5), p);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#FFAB40'), fill: sgC('#FFF3E0'), stroke: sgC('#B3300C'), maxW: 0.84 });
}

// ---------- 9 : Tour de l'horloge ----------
function sgGear(canvas, x, y, R, n, ang, c, cd) {
  const P = sgPath, p = sgP, u = Math.PI * 2 / n, ri = R * 0.78;
  P.reset();
  for (let i = 0; i < n; i++) {
    const a = ang + i * u;
    const q = [[ri, a - 0.5 * u], [R, a - 0.28 * u], [R, a + 0.28 * u], [ri, a + 0.5 * u]];
    q.forEach(([rr, aa], j) => { const px = x + Math.cos(aa) * rr, py = y + Math.sin(aa) * rr; if (i === 0 && j === 0) P.moveTo(px, py); else P.lineTo(px, py); });
  }
  P.close();
  p.color = c; canvas.drawPath(P, p);
  sgS.color = cd; sgS.strokeWidth = w * 0.003; canvas.drawPath(P, sgS);
  p.color = cd; canvas.drawCircle(x, y, R * 0.55, p);
  p.color = c; canvas.drawCircle(x, y, R * 0.45, p);
  p.color = cd; canvas.drawCircle(x, y, R * 0.16, p);
  for (let i = 0; i < 4; i++) { const a = -ang + i * Math.PI / 2; canvas.drawCircle(x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.3, R * 0.07, p); }
}

function sign9(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.5);
  const p = sgP, st = sgS, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Tuyaux de cuivre
  for (const [i, x] of [[0, l + sw * 0.15], [1, r - sw * 0.15]]) {
    const pw = w * 0.017;
    p.color = Color.WHITE; p.shader = sgLin(x - pw / 2, 0, x + pw / 2, 0, sgC('#E9A86A'), sgC('#9A5A28'));
    canvas.drawRect(x - pw / 2, a0, x + pw / 2, t + sh * 0.1, p); p.shader = null;
    st.color = sgA(150, '#FFE3C2'); st.strokeWidth = w * 0.003; canvas.drawLine(x - pw * 0.22, a0, x - pw * 0.22, t + sh * 0.08, st);
    for (const q of [0.45, 0.85]) {
      const y = a0 + (t - a0) * q;
      p.color = sgC('#7A4A1F'); canvas.drawRoundRect(sgR(x - pw * 0.85, y - w * 0.006, x + pw * 0.85, y + w * 0.006), w * 0.003, w * 0.003, p);
      p.color = sgC('#D9A34F'); canvas.drawRoundRect(sgR(x - pw * 0.75, y - w * 0.005, x + pw * 0.75, y + w * 0.002), w * 0.002, w * 0.002, p);
    }
    // Petits jets de vapeur au raccord du haut
    const q = (time * 0.6 + i * 0.5) % 1;
    if (q < 0.6) {
      const k = q / 0.6, y = a0 + (t - a0) * 0.45, s = i ? 1 : -1;
      p.color = sgA((170 * (1 - k)) | 0, '#FFFFFF');
      canvas.drawCircle(x + s * (pw + k * w * 0.05), y - k * w * 0.02, w * (0.006 + 0.012 * k), p);
      canvas.drawCircle(x + s * (pw + k * w * 0.03), y - k * w * 0.008, w * (0.004 + 0.008 * k), p);
    }
  }
  // Rouages derrière la plaque
  sgGear(canvas, l + sw * 0.02, t + sh * 0.62, sh * 0.42, 10, time * 0.8, sgC('#C9963B'), sgC('#7A5418'));
  sgGear(canvas, r - sw * 0.005, t + sh * 0.3, sh * 0.32, 8, -time * 1.05 + 0.2, sgC('#B98A35'), sgC('#6E4B15'));
  sgGear(canvas, r - sw * 0.06, b + sh * 0.02, sh * 0.2, 7, time * 1.7, sgC('#D7A94E'), sgC('#7A5418'));
  // Plaque de laiton
  const rad = w * 0.022;
  sgSlab(canvas, l, t, r, b, rad, w * 0.012, sgC('#6B4C17'), sgC('#F6D88A'), sgC('#B98A33'));
  const m = sh * 0.08;
  st.color = sgC('#8A6420'); st.strokeWidth = w * 0.004; canvas.drawRoundRect(sgR(l + m, t + m, r - m, b - m), rad * 0.6, rad * 0.6, st);
  st.color = sgA(120, '#FFF6D8'); st.strokeWidth = w * 0.002; canvas.drawRoundRect(sgR(l + m + w * 0.003, t + m + w * 0.003, r - m + w * 0.003, b - m + w * 0.003), rad * 0.6, rad * 0.6, st);
  st.color = sgA(130, '#FFF6D8'); st.strokeWidth = w * 0.004; canvas.drawLine(l + rad, t + w * 0.005, r - rad, t + w * 0.005, st);
  // Rivets tout autour
  for (let i = 0; i < 9; i++) {
    for (const y of [t + m * 0.5, b - m * 0.5]) {
      const x = l + sw * (0.06 + 0.88 * i / 8);
      p.color = sgC('#7A5418'); canvas.drawCircle(x, y + w * 0.001, w * 0.0045, p);
      p.color = sgC('#FFE7A6'); canvas.drawCircle(x - w * 0.001, y - w * 0.001, w * 0.0032, p);
    }
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#5A3A0A'), fill: sgC('#FFF7E0'), stroke: sgC('#5A3A0A'), maxW: 0.84 });
}

// ---------- 10 : Jardin géant ----------
function sgLeafShape(P, x, y, len, wid, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const tp = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const [x1, y1] = tp(len, 0), [ax, ay] = tp(len * 0.4, -wid), [bx, by] = tp(len * 0.4, wid);
  P.reset(); P.moveTo(x, y); P.quadTo(ax, ay, x1, y1); P.quadTo(bx, by, x, y); P.close();
}

function sign10(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 1.0, 1.0);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Lianes avec leurs petites feuilles et une fleur
  for (const [i, x] of [[0, l + sw * 0.2], [1, r - sw * 0.2]]) {
    const amp = w * 0.007;
    P.reset();
    for (let k = 0; k <= 12; k++) {
      const q = k / 12, px = x + Math.sin(q * 9 + i * 2 + time * 1.2) * amp, py = a0 + (t + sh * 0.1 - a0) * q;
      if (k) P.lineTo(px, py); else P.moveTo(px, py);
    }
    st.color = sgC('#3B6E1E'); st.strokeWidth = w * 0.011; canvas.drawPath(P, st);
    st.color = sgC('#5E9E32'); st.strokeWidth = w * 0.006; canvas.drawPath(P, st);
    for (let k = 0; k < 3; k++) {
      const q = 0.22 + k * 0.27, py = a0 + (t - a0) * q, px = x + Math.sin(q * 9 + i * 2 + time * 1.2) * amp, s = (k + i) % 2 ? 1 : -1;
      sgLeafShape(P, px, py, w * 0.034, w * 0.012, s > 0 ? -0.5 : Math.PI + 0.5);
      p.color = sgC('#6CC23A'); canvas.drawPath(P, p);
      st.color = sgC('#3B6E1E'); st.strokeWidth = w * 0.002; canvas.drawPath(P, st);
    }
    if (i === 1) {
      const fy = a0 + (t - a0) * 0.62, fx = x + Math.sin(0.62 * 9 + 2 + time * 1.2) * amp;
      p.color = sgC('#FF8FC2');
      for (let j = 0; j < 5; j++) { const a = j * 1.2566 + time * 0.3; canvas.drawCircle(fx + Math.cos(a) * w * 0.009, fy + Math.sin(a) * w * 0.009, w * 0.0075, p); }
      p.color = sgC('#FFE066'); canvas.drawCircle(fx, fy, w * 0.0055, p);
    }
  }
  // Feuille géante : épaisseur, face, nervures
  const leaf = (dy) => {
    P.reset();
    P.moveTo(l - sw * 0.02, t + sh * 0.5 + dy);
    P.cubicTo(l + sw * 0.02, t - sh * 0.2 + dy, r - sw * 0.2, t - sh * 0.22 + dy, r + sw * 0.05, t + sh * 0.45 + dy);
    P.cubicTo(r - sw * 0.2, b + sh * 0.24 + dy, l + sw * 0.02, b + sh * 0.2 + dy, l - sw * 0.02, t + sh * 0.5 + dy);
    P.close();
  };
  // Tige
  st.color = sgC('#4A7D24'); st.strokeWidth = w * 0.01;
  P.reset(); P.moveTo(l - sw * 0.015, t + sh * 0.5); P.quadTo(l - sw * 0.06, t + sh * 0.55, l - sw * 0.07, t + sh * 0.85); canvas.drawPath(P, st);
  leaf(w * 0.012); p.color = sgC('#2F6A1A'); canvas.drawPath(P, p);
  leaf(0); p.color = Color.WHITE; p.shader = sgLin(0, t - sh * 0.1, 0, b + sh * 0.1, sgC('#A6E46A'), sgC('#4C9E2B')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgC('#3E8222'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  canvas.save(); canvas.clipPath(P);
  st.color = sgA(80, '#EFFFD8'); st.strokeWidth = w * 0.004;
  P.reset(); P.moveTo(l - sw * 0.01, t + sh * 0.5); P.quadTo(cx, t + sh * 0.4, r + sw * 0.03, t + sh * 0.45); canvas.drawPath(P, st);
  st.color = sgA(45, '#EFFFD8'); st.strokeWidth = w * 0.003;
  for (let i = 1; i <= 6; i++) {
    const x = l + sw * (0.06 + i * 0.13), y = t + sh * (0.47 - 0.04 * Math.sin(i / 7 * Math.PI));
    canvas.drawLine(x, y, x + sw * 0.07, t + sh * 0.02, st);
    canvas.drawLine(x, y, x + sw * 0.07, b - sh * 0.0, st);
  }
  canvas.restore();
  // Goutte de rosée
  const dx = l + sw * 0.08, dy = b - sh * 0.15;
  p.color = sgA(130, '#D8F4FF'); canvas.drawCircle(dx, dy, w * 0.013, p);
  st.color = sgA(160, '#FFFFFF'); st.strokeWidth = w * 0.002; canvas.drawCircle(dx, dy, w * 0.013, st);
  p.color = sgA(230, '#FFFFFF'); canvas.drawCircle(dx - w * 0.004, dy - w * 0.005, w * 0.0035, p);
  // Coccinelle qui se promène sur le bord haut
  const bx = r - sw * 0.16 + Math.sin(time * 0.7) * sw * 0.03, by = t + sh * 0.02;
  p.color = sgC('#222222'); canvas.drawCircle(bx + w * 0.014, by, w * 0.007, p);
  p.color = sgC('#E53935'); canvas.drawOval(sgR(bx - w * 0.014, by - w * 0.011, bx + w * 0.012, by + w * 0.011), p);
  st.color = sgC('#222222'); st.strokeWidth = w * 0.0018; canvas.drawLine(bx - w * 0.013, by, bx + w * 0.011, by, st);
  p.color = sgC('#222222');
  for (const [ox, oy] of [[-0.006, -0.005], [-0.007, 0.005], [0.004, -0.006], [0.003, 0.006]]) canvas.drawCircle(bx + w * ox, by + w * oy, w * 0.0025, p);
  p.color = sgA(170, '#FFFFFF'); canvas.drawCircle(bx - w * 0.006, by - w * 0.007, w * 0.002, p);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#2C5A14'), fill: Color.WHITE, stroke: sgC('#2C6614'), maxW: 0.8, sy: 0.34 });
}

// ---------- 11 : Court-circuit (arcade) ----------
const SG_INVADER = [['..X..X..', '...XX...', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X'],
  ['..X..X..', 'X..XX..X', 'XXXXXXXX', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X....X.']];

function sgStepPath(P, l, t, r, b, s) {
  P.reset();
  P.moveTo(l + 2 * s, t); P.lineTo(r - 2 * s, t); P.lineTo(r - 2 * s, t + s); P.lineTo(r - s, t + s); P.lineTo(r - s, t + 2 * s); P.lineTo(r, t + 2 * s);
  P.lineTo(r, b - 2 * s); P.lineTo(r - s, b - 2 * s); P.lineTo(r - s, b - s); P.lineTo(r - 2 * s, b - s); P.lineTo(r - 2 * s, b);
  P.lineTo(l + 2 * s, b); P.lineTo(l + 2 * s, b - s); P.lineTo(l + s, b - s); P.lineTo(l + s, b - 2 * s); P.lineTo(l, b - 2 * s);
  P.lineTo(l, t + 2 * s); P.lineTo(l + s, t + 2 * s); P.lineTo(l + s, t + s); P.lineTo(l + 2 * s, t + s); P.close();
}

function sign11(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.4);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  const blink = (time * 6) | 0;
  // Chaînes de pixels
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    const s = w * 0.012;
    let i = 0;
    for (let y = t - s; y > a0 - s; y -= s * 1.25, i++) {
      p.color = sgC((i + blink) % 4 < 2 ? '#00E5FF' : '#FF2E88'); canvas.drawRect(x - s / 2, y, x + s / 2, y + s, p);
      p.color = sgA(120, '#FFFFFF'); canvas.drawRect(x - s / 2, y, x - s * 0.1, y + s * 0.35, p);
    }
  }
  const px = w * 0.011;
  // Halo néon, fond, bordures
  sgStepPath(P, l, t, r, b, px);
  canvas.save(); canvas.translate(0, w * 0.012); p.color = sgC('#05020F'); canvas.drawPath(P, p); canvas.restore();
  st.strokeJoin = 'miter';
  st.color = sgA(70, '#FF2E88'); st.strokeWidth = w * 0.018; canvas.drawPath(P, st);
  p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, sgC('#1E0F48'), sgC('#0D0624')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgC('#FF2E88'); st.strokeWidth = w * 0.006; canvas.drawPath(P, st);
  sgStepPath(P, l + px * 0.9, t + px * 0.9, r - px * 0.9, b - px * 0.9, px);
  st.color = sgA(200, '#00E5FF'); st.strokeWidth = w * 0.0025; canvas.drawPath(P, st);
  st.strokeJoin = 'round';
  // Grille de fond
  st.color = sgA(22, '#00E5FF'); st.strokeWidth = w * 0.002;
  for (let x = l + sw * 0.05; x < r - sw * 0.04; x += sw * 0.05) canvas.drawLine(x, t + sh * 0.12, x, b - sh * 0.12, st);
  // Ampoules qui défilent en haut
  for (let i = 0; i < 15; i++) {
    const x = l + sw * (0.08 + 0.84 * i / 14), on = (i + blink) % 3 === 0;
    p.color = on ? sgC('#FFF59D') : sgC('#5A4B22'); canvas.drawRect(x - w * 0.004, t + sh * 0.07, x + w * 0.004, t + sh * 0.07 + w * 0.008, p);
  }
  // Envahisseurs de pixels de part et d'autre
  const frame = SG_INVADER[((time * 2) | 0) % 2], ps = sh * 0.042;
  for (const [i, ix] of [[0, l + sw * 0.08], [1, r - sw * 0.08]]) {
    p.color = sgC(i ? '#FFB13B' : '#7CFF4F');
    const ox = ix - ps * 4, oy = t + sh * 0.42;
    frame.forEach((row, ry) => { for (let c = 0; c < 8; c++) if (row[c] === 'X') canvas.drawRect(ox + c * ps, oy + ry * ps, ox + (c + 1) * ps + 0.5, oy + (ry + 1) * ps + 0.5, p); });
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#00E5FF'), fill: sgC('#FFF176'), stroke: sgC('#E0186E'), maxW: 0.74, sy: 0.4, by: 0.8 });
}

// ---------- 12 : Pharaon ----------
function sign12(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.6);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Colliers de perles d'or et de lapis-lazuli
  for (const x of [l + sw * 0.18, r - sw * 0.18]) {
    st.color = sgC('#8A6A2A'); st.strokeWidth = w * 0.002; canvas.drawLine(x, a0, x, t, st);
    let i = 0;
    for (let y = t - w * 0.012; y > a0 - w * 0.02; y -= w * 0.019, i++) {
      if (i % 2 === 0) {
        p.color = sgC('#9C7420'); canvas.drawCircle(x, y + w * 0.001, w * 0.0075, p);
        p.color = sgC('#F4C64E'); canvas.drawCircle(x, y, w * 0.0068, p);
        p.color = sgA(200, '#FFF6C8'); canvas.drawCircle(x - w * 0.002, y - w * 0.002, w * 0.002, p);
      } else {
        p.color = sgC(i % 4 === 1 ? '#2A57B0' : '#1FA3A0'); canvas.drawOval(sgR(x - w * 0.005, y - w * 0.009, x + w * 0.005, y + w * 0.009), p);
      }
    }
  }
  // Tablette de grès
  sgSlab(canvas, l + sw * 0.015, t, r - sw * 0.015, b, w * 0.008, w * 0.012, sgC('#8A6430'), sgC('#EED29A'), sgC('#C79F5C'));
  // Grain du grès
  p.color = sgA(40, '#7A5420');
  for (let i = 0; i < 26; i++) canvas.drawCircle(l + sw * (0.04 + ((i * 37) % 92) / 100), t + sh * (0.25 + ((i * 53) % 70) / 100), w * 0.0018, p);
  // Corniche : bande dorée et rayures bleues
  const ct = t - sh * 0.08, cb = t + sh * 0.12;
  P.reset(); P.moveTo(l - sw * 0.01, ct); P.lineTo(r + sw * 0.01, ct); P.lineTo(r - sw * 0.005, cb); P.lineTo(l + sw * 0.005, cb); P.close();
  p.color = sgC('#9C7420'); canvas.save(); canvas.translate(0, w * 0.005); canvas.drawPath(P, p); canvas.restore();
  p.color = Color.WHITE; p.shader = sgLin(0, ct, 0, cb, sgC('#FFE07A'), sgC('#D9A22E')); canvas.drawPath(P, p); p.shader = null;
  canvas.save(); canvas.clipPath(P);
  for (let i = 0; i < 30; i++) {
    const x = l + sw * (i / 29);
    p.color = sgC(i % 3 === 0 ? '#2A57B0' : i % 3 === 1 ? '#F4C64E' : '#1FA3A0');
    canvas.drawRect(x - sw * 0.008, ct + sh * 0.05, x + sw * 0.008, cb - sh * 0.04, p);
  }
  canvas.restore();
  st.color = sgC('#7A5418'); st.strokeWidth = w * 0.0025; canvas.drawPath(P, st);
  // Frise du bas
  p.color = sgC('#D9A22E'); canvas.drawRect(l + sw * 0.015, b - sh * 0.08, r - sw * 0.015, b, p);
  p.color = sgC('#2A57B0');
  for (let i = 0; i < 20; i++) { const x = l + sw * (0.04 + 0.92 * i / 19); canvas.drawRect(x - w * 0.003, b - sh * 0.06, x + w * 0.003, b - sh * 0.02, p); }
  // Ankh à gauche, œil à droite
  const ax = l + sw * 0.075, ay = t + sh * 0.5;
  st.color = sgC('#7A5418'); st.strokeWidth = w * 0.009;
  canvas.drawOval(sgR(ax - w * 0.01, ay - sh * 0.26, ax + w * 0.01, ay - sh * 0.04), st);
  canvas.drawLine(ax - w * 0.019, ay - sh * 0.02, ax + w * 0.019, ay - sh * 0.02, st);
  canvas.drawLine(ax, ay - sh * 0.02, ax, ay + sh * 0.3, st);
  st.color = sgC('#F4C64E'); st.strokeWidth = w * 0.005;
  canvas.drawOval(sgR(ax - w * 0.01, ay - sh * 0.26, ax + w * 0.01, ay - sh * 0.04), st);
  canvas.drawLine(ax - w * 0.019, ay - sh * 0.02, ax + w * 0.019, ay - sh * 0.02, st);
  canvas.drawLine(ax, ay - sh * 0.02, ax, ay + sh * 0.3, st);
  const ex = r - sw * 0.075, ey = t + sh * 0.42;
  st.color = sgC('#1E3F86'); st.strokeWidth = w * 0.004;
  P.reset(); P.moveTo(ex - w * 0.022, ey); P.quadTo(ex, ey - w * 0.016, ex + w * 0.022, ey); P.quadTo(ex, ey + w * 0.012, ex - w * 0.022, ey); canvas.drawPath(P, st);
  p.color = sgC('#1E3F86'); canvas.drawCircle(ex, ey, w * 0.0055, p);
  canvas.drawLine(ex - w * 0.024, ey - w * 0.012, ex + w * 0.02, ey - w * 0.014, st);
  P.reset(); P.moveTo(ex - w * 0.004, ey + w * 0.006); P.lineTo(ex - w * 0.006, ey + w * 0.024); P.quadTo(ex - w * 0.002, ey + w * 0.03, ex + w * 0.004, ey + w * 0.025); canvas.drawPath(P, st);
  canvas.drawLine(ex + w * 0.006, ey + w * 0.006, ex + w * 0.016, ey + w * 0.022, st);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#6B4513'), fill: sgC('#FFD54F'), stroke: sgC('#4A2C08'), maxW: 0.76, sy: 0.4, by: 0.8 });
}

// ---------- 13 : Manoir des ombres ----------
function sign13(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 1.6, 0.9);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    sgChain(canvas, x, a0, t + sh * 0.1, w * 0.028, sgC('#8C5A3C'), sgC('#3E2418'), sgA(120, '#E0A070'));
    p.color = sgC('#2B2230'); canvas.drawRoundRect(sgR(x - w * 0.014, t - w * 0.004, x + w * 0.014, t + sh * 0.13), w * 0.004, w * 0.004, p);
  }
  // Ferronnerie : volutes aux deux bouts, derrière la dalle
  for (const pass of [0, 1]) {
    st.color = sgC(pass ? '#4A4058' : '#0E0A14'); st.strokeWidth = pass ? w * 0.003 : w * 0.008;
    for (const s of [-1, 1]) {
      const ex = cx + s * (sw / 2 + w * 0.006);
      canvas.drawArc(sgR(ex - w * 0.022, t + sh * 0.08, ex + w * 0.022, t + sh * 0.48), s < 0 ? 90 : -90, 180, false, st);
      canvas.drawArc(sgR(ex - w * 0.016, t + sh * 0.52, ex + w * 0.016, t + sh * 0.92), s < 0 ? 90 : -90, 180, false, st);
    }
  }
  for (const s of [-1, 1]) {
    const ex = cx + s * (sw / 2 + w * 0.006);
    p.color = sgC('#0E0A14'); canvas.drawCircle(ex + s * w * 0.008, t + sh * 0.5, w * 0.008, p);
    p.color = sgC('#4A4058'); canvas.drawCircle(ex + s * w * 0.008 - w * 0.002, t + sh * 0.5 - w * 0.002, w * 0.003, p);
  }
  // Dalle de pierre ébréchée en haut à droite
  const slab = (dy) => {
    P.reset();
    P.moveTo(l + w * 0.012, t + dy); P.lineTo(r - sw * 0.12, t + dy); P.lineTo(r - sw * 0.09, t + sh * 0.12 + dy); P.lineTo(r - sw * 0.06, t + sh * 0.06 + dy);
    P.lineTo(r - sw * 0.03, t + sh * 0.2 + dy); P.lineTo(r, t + sh * 0.22 + dy); P.lineTo(r, b - w * 0.012 + dy); P.quadTo(r, b + dy, r - w * 0.012, b + dy);
    P.lineTo(l + w * 0.012, b + dy); P.quadTo(l, b + dy, l, b - w * 0.012 + dy); P.lineTo(l, t + w * 0.012 + dy); P.quadTo(l, t + dy, l + w * 0.012, t + dy); P.close();
  };
  slab(w * 0.012); p.color = sgC('#17111F'); canvas.drawPath(P, p);
  slab(0); p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, sgC('#5E4C78'), sgC('#2C2240')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgA(70, '#D9C8FF'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  // Fissure et mousse
  st.color = sgA(150, '#140E1C'); st.strokeWidth = w * 0.003;
  P.reset(); P.moveTo(l + sw * 0.03, b); P.lineTo(l + sw * 0.05, b - sh * 0.2); P.lineTo(l + sw * 0.04, b - sh * 0.32); P.lineTo(l + sw * 0.065, b - sh * 0.45); canvas.drawPath(P, st);
  // Toile d'araignée dans le coin haut gauche
  const wx = l + w * 0.002, wy = t + w * 0.002, wr = sh * 0.42;
  st.color = sgA(150, '#E8E0F5'); st.strokeWidth = w * 0.0018;
  for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; canvas.drawLine(wx, wy, wx + Math.cos(a) * wr, wy + Math.sin(a) * wr, st); }
  for (const q of [0.35, 0.65, 0.95]) {
    P.reset();
    for (let i = 0; i <= 4; i++) {
      const a = i / 4 * Math.PI / 2, x = wx + Math.cos(a) * wr * q, y = wy + Math.sin(a) * wr * q;
      if (i === 0) P.moveTo(x, y);
      else { const am = (i - 0.5) / 4 * Math.PI / 2; P.quadTo(wx + Math.cos(am) * wr * q * 0.8, wy + Math.sin(am) * wr * q * 0.8, x, y); }
    }
    canvas.drawPath(P, st);
  }
  // Chauve-souris pendue au coin bas droit, la tête en bas
  const bx = r - sw * 0.06, by = b + w * 0.004, sv = Math.sin(time * 1.7) * 6;
  canvas.save(); canvas.rotate(sv, bx, by); canvas.scale(1.5, 1.5, bx, by);
  st.color = sgC('#120D18'); st.strokeWidth = w * 0.002; canvas.drawLine(bx, by, bx, by + w * 0.006, st);
  p.color = sgC('#120C1A');
  P.reset(); P.moveTo(bx, by + w * 0.004); P.quadTo(bx - w * 0.02, by + w * 0.012, bx - w * 0.008, by + w * 0.036); P.lineTo(bx, by + w * 0.03);
  P.lineTo(bx + w * 0.008, by + w * 0.036); P.quadTo(bx + w * 0.02, by + w * 0.012, bx, by + w * 0.004); P.close(); canvas.drawPath(P, p);
  canvas.drawCircle(bx, by + w * 0.03, w * 0.008, p);
  P.reset(); P.moveTo(bx - w * 0.007, by + w * 0.032); P.lineTo(bx - w * 0.006, by + w * 0.045); P.lineTo(bx - w * 0.001, by + w * 0.035);
  P.moveTo(bx + w * 0.007, by + w * 0.032); P.lineTo(bx + w * 0.006, by + w * 0.045); P.lineTo(bx + w * 0.001, by + w * 0.035); canvas.drawPath(P, p);
  if ((time % 4) > 0.15) {
    p.color = sgC('#FFD54F'); canvas.drawCircle(bx - w * 0.003, by + w * 0.03, w * 0.0022, p); canvas.drawCircle(bx + w * 0.003, by + w * 0.03, w * 0.0022, p);
  }
  canvas.restore();
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#CDB8F0'), fill: sgC('#E6FFD9'), stroke: sgC('#1A1224'), maxW: 0.82 });
}

// ---------- 14 : Symphonie rock ----------
function sign14(canvas, cx, top, sw, sh, small, big, a0) {
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  sgSway(canvas, cx, 0.5);
  // Câbles de guitare en spirale
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    const cw = w * 0.011, step = w * 0.0085;
    for (let y = a0; y < t; y += step) {
      st.color = sgC('#7A1010'); st.strokeWidth = w * 0.004; canvas.drawArc(sgR(x - cw, y, x + cw, y + step * 1.4), 180, 180, false, st);
    }
    for (let y = a0; y < t; y += step) {
      st.color = sgC('#E53935'); st.strokeWidth = w * 0.0045; canvas.drawArc(sgR(x - cw, y, x + cw, y + step * 1.4), 0, 180, false, st);
    }
    // Prise jack
    p.color = sgC('#9E9E9E'); canvas.drawRoundRect(sgR(x - w * 0.009, t - w * 0.016, x + w * 0.009, t + sh * 0.08), w * 0.003, w * 0.003, p);
    p.color = sgC('#F5F5F5'); canvas.drawRect(x - w * 0.006, t - w * 0.014, x - w * 0.002, t + sh * 0.06, p);
    p.color = sgC('#FFC94A'); canvas.drawRect(x - w * 0.009, t - w * 0.004, x + w * 0.009, t - w * 0.0005, p);
  }
  // Battement : le panneau cogne au rythme des basses
  const beat = Math.max(0, 1 - (time % 0.6) / 0.18);
  canvas.scale(1 + 0.018 * beat, 1 + 0.018 * beat, cx, t + sh / 2);
  // Flammes derrière le panneau
  const n = 11;
  for (const [c, hk] of [[sgC('#E64A19'), 1], [sgC('#FF9800'), 0.7], [sgC('#FFEB3B'), 0.42]]) {
    p.color = c;
    P.reset(); P.moveTo(l + sw * 0.02, t + sh * 0.4);
    for (let i = 0; i < n; i++) {
      const x0 = l + sw * (0.02 + 0.96 * i / n), x1 = l + sw * (0.02 + 0.96 * (i + 1) / n);
      const hgt = sh * hk * (0.32 + 0.14 * Math.sin(time * 9 + i * 1.7) + 0.08 * (i % 2));
      const tip = (x0 + x1) / 2 + Math.sin(time * 7 + i) * sw * 0.01;
      P.quadTo(x0, t, tip, t - hgt); P.quadTo(x1, t, x1, t + sh * 0.4);
    }
    P.close(); canvas.drawPath(P, p);
  }
  // Panneau laqué noir, cadre chromé
  const rad = w * 0.02;
  sgSlab(canvas, l, t, r, b, rad, w * 0.012, sgC('#000000'), sgC('#34343A'), sgC('#0C0C0E'));
  st.color = Color.WHITE; st.shader = sgLin(0, t, 0, b, sgC('#FFFFFF'), sgC('#8E8E8E')); st.strokeWidth = w * 0.008;
  canvas.drawRoundRect(sgR(l + w * 0.004, t + w * 0.004, r - w * 0.004, b - w * 0.004), rad, rad, st); st.shader = null;
  p.color = sgA(40, '#FFFFFF'); canvas.drawRoundRect(sgR(l + w * 0.012, t + w * 0.01, r - w * 0.012, t + sh * 0.4), rad * 0.6, rad * 0.6, p);
  // Clous chromés
  for (let i = 0; i < 12; i++) {
    for (const y of [t + w * 0.004, b - w * 0.004]) {
      const x = l + sw * (0.05 + 0.9 * i / 11);
      p.color = sgC('#5A5A5A'); canvas.drawCircle(x, y, w * 0.0055, p);
      p.color = sgC('#EDEDED'); canvas.drawCircle(x - w * 0.001, y - w * 0.001, w * 0.004, p);
    }
  }
  // Éclairs
  for (const s of [-1, 1]) {
    const x = cx + s * sw * 0.42, y = t + sh * 0.5, k = sh * 0.36;
    P.reset();
    P.moveTo(x + s * k * 0.15, y - k); P.lineTo(x - s * k * 0.35, y + k * 0.1); P.lineTo(x - s * k * 0.02, y + k * 0.1);
    P.lineTo(x - s * k * 0.2, y + k); P.lineTo(x + s * k * 0.38, y - k * 0.15); P.lineTo(x + s * k * 0.05, y - k * 0.15); P.close();
    p.color = sgC('#FFEB3B'); canvas.drawPath(P, p);
    st.color = sgC('#F57F17'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#FFB300'), fill: Color.WHITE, stroke: sgC('#C62828'), maxW: 0.74 });
}

// ---------- 15 : Dojo des nuages ----------
function sgBlossom(canvas, x, y, R, rot) {
  const p = sgP;
  p.color = sgC('#FFB7CF');
  for (let i = 0; i < 5; i++) { const a = rot + i * 1.2566; canvas.drawCircle(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.5, p); }
  p.color = sgC('#FF7FA8'); canvas.drawCircle(x, y, R * 0.28, p);
}

function sign15(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.6);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  const rt = t - sh * 0.24;
  // Cordons de soie rouge
  for (const x of [l + sw * 0.22, r - sw * 0.22]) {
    st.color = sgC('#8E1414'); st.strokeWidth = w * 0.008; canvas.drawLine(x, a0, x, rt + sh * 0.05, st);
    st.color = sgC('#E53935'); st.strokeWidth = w * 0.005; canvas.drawLine(x, a0, x, rt + sh * 0.05, st);
    st.color = sgA(120, '#FFD0C8'); st.strokeWidth = w * 0.002;
    for (let y = a0; y < rt; y += w * 0.012) canvas.drawLine(x - w * 0.002, y, x + w * 0.002, y + w * 0.005, st);
  }
  // Pompons qui pendent aux coins du bas
  for (const [i, x] of [[0, l + sw * 0.06], [1, r - sw * 0.06]]) {
    const sv = Math.sin(time * 1.8 + i * 1.3) * w * 0.006, y0 = b + w * 0.008;
    st.color = sgC('#B71C1C'); st.strokeWidth = w * 0.003; canvas.drawLine(x, b - sh * 0.02, x + sv, y0 + w * 0.012, st);
    p.color = sgC('#E0B04A'); canvas.drawCircle(x + sv, y0 + w * 0.014, w * 0.006, p);
    st.color = sgC('#D32F2F'); st.strokeWidth = w * 0.0028;
    for (let k = -2; k <= 2; k++) canvas.drawLine(x + sv + k * w * 0.0025, y0 + w * 0.018, x + sv * 1.6 + k * w * 0.0035, y0 + w * 0.05, st);
  }
  // Plaque laquée rouge et papier crème
  const rad = w * 0.012;
  sgSlab(canvas, l, t, r, b, rad, w * 0.012, sgC('#6E1010'), sgC('#E53935'), sgC('#A81919'));
  const m = sh * 0.11;
  p.color = Color.WHITE; p.shader = sgLin(0, t + m, 0, b - m, sgC('#FFF8E8'), sgC('#F2DFBA')); canvas.drawRect(l + m, t + m, r - m, b - m, p); p.shader = null;
  st.color = sgC('#E0B04A'); st.strokeWidth = w * 0.003; canvas.drawRect(l + m, t + m, r - m, b - m, st);
  // Coins dorés
  p.color = sgC('#E0B04A');
  const cs = sh * 0.2, ct = w * 0.007;
  for (const [x, y, sx, sy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]]) {
    canvas.drawRect(Math.min(x, x + sx * cs), Math.min(y, y + sy * ct), Math.max(x, x + sx * cs), Math.max(y, y + sy * ct), p);
    canvas.drawRect(Math.min(x, x + sx * ct), Math.min(y, y + sy * cs), Math.max(x, x + sx * ct), Math.max(y, y + sy * cs), p);
  }
  // Petit toit de temple aux bouts relevés
  const roof = (dy) => {
    P.reset();
    P.moveTo(l - sw * 0.06, rt + sh * 0.02 + dy);
    P.quadTo(l + sw * 0.04, t + sh * 0.06 + dy, l + sw * 0.12, t + sh * 0.04 + dy);
    P.lineTo(r - sw * 0.12, t + sh * 0.04 + dy);
    P.quadTo(r - sw * 0.04, t + sh * 0.06 + dy, r + sw * 0.06, rt + sh * 0.02 + dy);
    P.quadTo(r - sw * 0.08, rt + sh * 0.12 + dy, r - sw * 0.16, rt - sh * 0.02 + dy);
    P.lineTo(l + sw * 0.16, rt - sh * 0.02 + dy);
    P.quadTo(l + sw * 0.08, rt + sh * 0.12 + dy, l - sw * 0.06, rt + sh * 0.02 + dy);
    P.close();
  };
  roof(w * 0.008); p.color = sgC('#15201C'); canvas.drawPath(P, p);
  roof(0); p.color = Color.WHITE; p.shader = sgLin(0, rt, 0, t + sh * 0.05, sgC('#4A5E56'), sgC('#25332D')); canvas.drawPath(P, p); p.shader = null;
  canvas.save(); canvas.clipPath(P);
  st.color = sgA(70, '#0E1512'); st.strokeWidth = w * 0.003;
  for (let x = l - sw * 0.04; x < r + sw * 0.06; x += sw * 0.035) canvas.drawLine(x, rt - sh * 0.05, x, t + sh * 0.1, st);
  canvas.restore();
  p.color = sgC('#1A2622'); canvas.drawRoundRect(sgR(l + sw * 0.15, rt - sh * 0.06, r - sw * 0.15, rt + sh * 0.02), w * 0.004, w * 0.004, p);
  p.color = sgC('#E0B04A'); canvas.drawCircle(l - sw * 0.055, rt + sh * 0.015, w * 0.006, p); canvas.drawCircle(r + sw * 0.055, rt + sh * 0.015, w * 0.006, p);
  // Fleurs de cerisier sur le toit, pétales qui tombent
  sgBlossom(canvas, l + sw * 0.04, rt + sh * 0.12, w * 0.013, 0.3);
  sgBlossom(canvas, r - sw * 0.1, rt + sh * 0.02, w * 0.01, 1.1);
  for (let i = 0; i < 4; i++) {
    const q = (time * 0.22 + i * 0.25) % 1;
    const fx = l + sw * (0.1 + i * 0.26) + Math.sin(time * 1.5 + i * 2) * sw * 0.04, fy = rt + q * (sh * 1.6);
    p.color = sgA((230 * Math.sin(q * Math.PI)) | 0, '#FFB7CF');
    canvas.save(); canvas.rotate(time * 90 + i * 70, fx, fy);
    canvas.drawOval(sgR(fx - w * 0.006, fy - w * 0.0035, fx + w * 0.006, fy + w * 0.0035), p);
    canvas.restore();
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#B71C1C'), fill: sgC('#2A1A12'), stroke: sgC('#FFF6E3'), maxW: 0.8, sy: 0.4, by: 0.8 });
}

// ---------- 16 : Usine de gourmandises ----------
function sign16(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.9);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Cordons en sucre d'orge
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    const cw = w * 0.013;
    canvas.save(); canvas.clipRect(x - cw / 2, a0, x + cw / 2, t + sh * 0.1);
    p.color = sgC('#FFFFFF'); canvas.drawRect(x - cw / 2, a0, x + cw / 2, t + sh * 0.1, p);
    st.color = sgC('#E53950'); st.strokeWidth = w * 0.006; st.strokeCap = 'butt';
    for (let y = a0 - w * 0.02; y < t + sh * 0.1; y += w * 0.02) canvas.drawLine(x - cw, y + w * 0.014, x + cw, y, st);
    st.strokeCap = 'round';
    p.color = sgA(90, '#B0B0C0'); canvas.drawRect(x + cw * 0.2, a0, x + cw / 2, t + sh * 0.1, p);
    canvas.restore();
  }
  // Tablette de chocolat
  const rad = w * 0.022;
  sgSlab(canvas, l, t, r, b, rad, w * 0.013, sgC('#3A1C0B'), sgC('#8A5632'), sgC('#5A3117'));
  const cols = 6, rows = 2, gx = sw * 0.035, gy = sh * 0.09;
  const cwid = (sw - gx * 2) / cols, chei = (sh - gy * 2) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x0 = l + gx + i * cwid + w * 0.004, y0 = t + gy + j * chei + w * 0.004, x1 = x0 + cwid - w * 0.008, y1 = y0 + chei - w * 0.008;
    p.color = sgA(60, '#2A1206'); canvas.drawRoundRect(sgR(x0, y0, x1, y1), w * 0.006, w * 0.006, p);
    p.color = sgA(55, '#E2A57A'); canvas.drawRoundRect(sgR(x0 + w * 0.003, y0 + w * 0.003, x1 - w * 0.002, y1 - w * 0.002), w * 0.005, w * 0.005, p);
  }
  // Glaçage rose qui coule
  P.reset(); sgRR(P, l, t, r, b, rad);
  canvas.save(); canvas.clipPath(P);
  const g0 = t + sh * 0.42;
  const icing = (dy) => {
    P.reset(); P.moveTo(l - 2, t - 2 + dy); P.lineTo(r + 2, t - 2 + dy); P.lineTo(r + 2, g0 + dy);
    const drips = [0.16, 0.05, 0.22, 0.07, 0.14, 0.04, 0.2, 0.06, 0.13];
    const n = drips.length, d = (sw + 4) / n;
    for (let i = 0; i < n; i++) {
      const x0 = r + 2 - i * d, x1 = x0 - d, dep = sh * drips[i];
      P.cubicTo(x0, g0 + dep * 1.35 + dy, x1, g0 + dep * 1.35 + dy, x1, g0 + dy);
    }
    P.close();
  };
  icing(w * 0.005); p.color = sgC('#D8558F'); canvas.drawPath(P, p);
  icing(0); p.color = Color.WHITE; p.shader = sgLin(0, t, 0, g0, sgC('#FFC2DE'), sgC('#FF8CC2')); canvas.drawPath(P, p); p.shader = null;
  p.color = sgA(120, '#FFFFFF'); canvas.drawRoundRect(sgR(l + sw * 0.03, t + sh * 0.05, l + sw * 0.4, t + sh * 0.1), w * 0.005, w * 0.005, p);
  canvas.restore();
  // Vermicelles
  const spr = ['#FFE14D', '#4FC3F7', '#81E07A', '#FFFFFF', '#B388FF'];
  st.strokeWidth = w * 0.004;
  for (let i = 0; i < 16; i++) {
    const x = l + sw * (0.04 + ((i * 41) % 92) / 100), y = t + sh * (0.07 + ((i * 29) % 26) / 100), a = i * 1.9;
    if (Math.abs(x - cx) < sw * 0.17 && y > t + sh * 0.16) continue;
    st.color = sgC(spr[i % spr.length]);
    canvas.drawLine(x - Math.cos(a) * w * 0.005, y - Math.sin(a) * w * 0.005, x + Math.cos(a) * w * 0.005, y + Math.sin(a) * w * 0.005, st);
  }
  // Cerise sur le dessus
  const kx = l + sw * 0.3, ky = t - w * 0.01;
  st.color = sgC('#5D7A2A'); st.strokeWidth = w * 0.003;
  P.reset(); P.moveTo(kx, ky - w * 0.008); P.quadTo(kx + w * 0.004, ky - w * 0.03, kx + w * 0.018, ky - w * 0.036); canvas.drawPath(P, st);
  p.color = sgC('#A8102A'); canvas.drawCircle(kx, ky + w * 0.001, w * 0.013, p);
  p.color = sgC('#E5233D'); canvas.drawCircle(kx - w * 0.001, ky, w * 0.0115, p);
  p.color = sgA(200, '#FFFFFF'); canvas.drawCircle(kx - w * 0.005, ky - w * 0.004, w * 0.0035, p);
  // Bonbons emballés sur les attaches
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    const y = t + w * 0.002;
    p.color = sgC('#FFD54F');
    P.reset(); P.moveTo(x - w * 0.01, y); P.lineTo(x - w * 0.024, y - w * 0.009); P.lineTo(x - w * 0.024, y + w * 0.009); P.close(); canvas.drawPath(P, p);
    P.reset(); P.moveTo(x + w * 0.01, y); P.lineTo(x + w * 0.024, y - w * 0.009); P.lineTo(x + w * 0.024, y + w * 0.009); P.close(); canvas.drawPath(P, p);
    p.color = sgC('#7E57C2'); canvas.drawCircle(x, y, w * 0.011, p);
    p.color = sgA(160, '#FFFFFF'); canvas.drawCircle(x - w * 0.004, y - w * 0.004, w * 0.003, p);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#7A2448'), fill: sgC('#FFF4E6'), stroke: sgC('#3B1A0A'), maxW: 0.86, sy: 0.33 });
}

// ---------- 17 : À l'abordage ! ----------
function sign17(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.8);
  const p = sgP, st = sgS, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Cordages du navire
  for (const x of [l + sw * 0.16, r - sw * 0.16]) sgRope(canvas, x, a0, t + sh * 0.08, w * 0.016, sgC('#C9A46A'), sgC('#8A6A3A'), sgA(110, '#FFF0D0'));
  // Carte au trésor sur parchemin
  sgSlab(canvas, l + sw * 0.03, t, r - sw * 0.03, b, w * 0.01, w * 0.01, sgC('#9A7A4A'), sgC('#F6E7C1'), sgC('#E2C68E'));
  p.color = sgA(60, '#8A5A2A');
  for (let i = 0; i < 24; i++) { const u = 0.06 + 0.88 * hash01(i * 7 + 3), top0 = i % 2 === 0; canvas.drawCircle(l + sw * u, top0 ? t + sh * 0.03 : b - sh * 0.03, w * (0.003 + 0.004 * hash01(i + 40)), p); }
  // Pointillés du trajet le long du bas
  p.color = sgA(170, '#8A3A1A');
  for (let i = 0; i < 12; i++) canvas.drawCircle(l + sw * (0.12 + i * 0.065), b - sh * 0.09 - Math.sin(i * 0.9) * sh * 0.025, w * 0.0032, p);
  // Tête de mort en haut à gauche, croix rouge en haut à droite
  const kx = l + sw * 0.14, ky = t + sh * 0.3;
  st.color = sgA(200, '#5A3A22'); st.strokeWidth = w * 0.004;
  canvas.drawLine(kx - sh * 0.1, ky - sh * 0.06, kx + sh * 0.1, ky + sh * 0.14, st); canvas.drawLine(kx + sh * 0.1, ky - sh * 0.06, kx - sh * 0.1, ky + sh * 0.14, st);
  p.color = sgC('#F6E7C1'); canvas.drawCircle(kx, ky, sh * 0.08, p);
  st.strokeWidth = w * 0.003; canvas.drawCircle(kx, ky, sh * 0.08, st);
  p.color = sgA(220, '#5A3A22'); canvas.drawCircle(kx - sh * 0.03, ky - sh * 0.01, sh * 0.02, p); canvas.drawCircle(kx + sh * 0.03, ky - sh * 0.01, sh * 0.02, p);
  const xx = r - sw * 0.14, xy = t + sh * 0.3;
  st.color = sgC('#C62828'); st.strokeWidth = w * 0.007;
  canvas.drawLine(xx - sh * 0.08, xy - sh * 0.08, xx + sh * 0.08, xy + sh * 0.08, st); canvas.drawLine(xx + sh * 0.08, xy - sh * 0.08, xx - sh * 0.08, xy + sh * 0.08, st);
  // Rouleaux aux deux bouts
  for (const side of [-1, 1]) {
    const x = side < 0 ? l + sw * 0.035 : r - sw * 0.035;
    p.color = sgC('#C9A46A'); canvas.drawRoundRect(sgR(x - sh * 0.09, t - sh * 0.06, x + sh * 0.09, b + sh * 0.06), sh * 0.09, sh * 0.09, p);
    p.color = sgC('#EBD5A4'); canvas.drawRoundRect(sgR(x - sh * 0.055, t - sh * 0.04, x, b + sh * 0.04), sh * 0.05, sh * 0.05, p);
    p.color = sgC('#7A5028');
    canvas.drawOval(sgR(x - sh * 0.07, t - sh * 0.12, x + sh * 0.07, t - sh * 0.04), p);
    canvas.drawOval(sgR(x - sh * 0.07, b + sh * 0.04, x + sh * 0.07, b + sh * 0.12), p);
  }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#7A3A12'), fill: sgC('#FFF6E0'), stroke: sgC('#5A2A10'), maxW: 0.74 });
}

// ---------- 18 : Panique au Jurassique ----------
function sign18(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 1.0, 1.1);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  // Lianes et leurs feuilles
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? l + sw * 0.17 : r - sw * 0.17;
    P.reset();
    for (let k = 0; k <= 12; k++) { const q = k / 12, px = x + Math.sin(q * 8 + i * 2 + time * 1.1) * w * 0.007, py = a0 + (t + sh * 0.1 - a0) * q; if (k) P.lineTo(px, py); else P.moveTo(px, py); }
    st.color = sgC('#3E5A1E'); st.strokeWidth = w * 0.011; canvas.drawPath(P, st);
    st.color = sgC('#6E8A32'); st.strokeWidth = w * 0.006; canvas.drawPath(P, st);
    for (let k = 0; k < 3; k++) {
      const q = 0.25 + k * 0.27, py = a0 + (t - a0) * q, px = x + Math.sin(q * 8 + i * 2 + time * 1.1) * w * 0.007, s = (k + i) % 2 ? 1 : -1;
      p.color = sgC('#6CC24A'); canvas.save(); canvas.rotate(s * 35, px, py); canvas.drawOval(sgR(Math.min(px, px + s * w * 0.036), py - w * 0.008, Math.max(px, px + s * w * 0.036), py + w * 0.008), p); canvas.restore();
    }
  }
  // Dalle de pierre aux bords irréguliers
  const pts = [0, 0.1, 0.06, 0, 0.3, 0.03, 0.5, 0, 0.7, 0.04, 0.94, 0, 1, 0.15, 0.99, 0.6, 1, 0.92, 0.82, 1, 0.55, 0.97, 0.3, 1.02, 0.05, 0.98, 0, 0.7];
  const stone = (dy) => { P.reset(); for (let i = 0; i < pts.length; i += 2) { const px = l + sw * pts[i], py = t + sh * pts[i + 1] + dy; if (i) P.lineTo(px, py); else P.moveTo(px, py); } P.close(); };
  stone(w * 0.012); p.color = sgC('#5A4A36'); canvas.drawPath(P, p);
  stone(0); p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, sgC('#C8B898'), sgC('#8E7E60')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgA(90, '#FFF6E0'); st.strokeWidth = w * 0.003; canvas.drawPath(P, st);
  // Fissures
  st.color = sgA(120, '#4A3A26'); st.strokeWidth = w * 0.0025;
  canvas.drawLine(l + sw * 0.3, b, l + sw * 0.33, b - sh * 0.15, st); canvas.drawLine(r - sw * 0.25, t + sh * 0.03, r - sw * 0.28, t + sh * 0.16, st);
  // Mousse sur le dessus
  p.color = sgC('#6E9A3A');
  for (let i = 0; i < 9; i++) canvas.drawCircle(l + sw * (0.08 + i * 0.105), t + sh * (0.03 + 0.02 * Math.sin(i * 2.1)), w * (0.012 + 0.006 * hash01(i + 300)), p);
  // Ammonite fossile à gauche, empreinte à trois doigts à droite
  const fx = l + sw * 0.1, fy = t + sh * 0.55;
  st.color = sgA(200, '#5A4A36'); st.strokeWidth = w * 0.004;
  P.reset();
  for (let i = 0; i <= 36; i++) { const q = i / 36, an = q * 4 * 3.1416, rr = sh * 0.2 * (1 - q * 0.9), px = fx + Math.cos(an) * rr, py = fy + Math.sin(an) * rr; if (i === 0) P.moveTo(px, py); else P.lineTo(px, py); }
  canvas.drawPath(P, st);
  const ex = r - sw * 0.1, ey = t + sh * 0.6;
  p.color = sgA(170, '#5A4A36');
  canvas.drawOval(sgR(ex - sh * 0.07, ey - sh * 0.02, ex + sh * 0.07, ey + sh * 0.12), p);
  for (const an of [-2.2, -1.57, -0.94]) { canvas.save(); canvas.rotate(an * 57.3 + 90, ex, ey); canvas.drawOval(sgR(ex - sh * 0.025, ey - sh * 0.24, ex + sh * 0.025, ey - sh * 0.04), p); canvas.restore(); }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#3E2E18'), fill: sgC('#FFF6E0'), stroke: sgC('#3E2E18'), maxW: 0.76, sy: 0.38, by: 0.8 });
}

// ---------- 19 : Atlantide ----------
function sign19(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 1.0, 1.0);
  const p = sgP, st = sgS, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  sgKelp(canvas, l + sw * 0.15, a0, t + sh * 0.12, 0); sgKelp(canvas, r - sw * 0.15, a0, t + sh * 0.12, 1);
  sgSlab(canvas, l, t, r, b, w * 0.02, w * 0.012, sgC('#5A8A94'), sgC('#EEF8F8'), sgC('#B8D8DC'));
  st.color = sgC('#E0B04A'); st.strokeWidth = w * 0.005; canvas.drawRoundRect(sgR(l + sh * 0.07, t + sh * 0.07, r - sh * 0.07, b - sh * 0.07), w * 0.012, w * 0.012, st);
  for (const s of [-1, 1]) {
    const x = cx + s * sw * 0.42, y = t + sh * 0.5;
    st.color = sgC('#E0B04A'); st.strokeWidth = w * 0.006; canvas.drawLine(x, y + sh * 0.25, x, y - sh * 0.1, st);
    for (const u of [-0.06, 0, 0.06]) canvas.drawLine(x + u * sh, y - sh * 0.1, x + u * sh * 1.2, y - sh * 0.25, st);
    canvas.drawLine(x - sh * 0.07, y - sh * 0.1, x + sh * 0.07, y - sh * 0.1, st);
  }
  st.color = sgA(160, '#E8FBFF'); st.strokeWidth = w * 0.0025;
  for (let i = 0; i < 3; i++) { const q = (time * 0.4 + i * 0.33) % 1; canvas.drawCircle(cx + sw * (-0.25 + i * 0.25), t - q * w * 0.1, w * 0.006, st); }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#1E5A6A'), fill: Color.WHITE, stroke: sgC('#1E5A6A'), maxW: 0.74 });
}

// ---------- 20 : Gravité zéro ----------
function sign20(canvas, cx, top, sw, sh, small, big, a0) {
  canvas.translate(0, Math.sin(time * 1.4) * w * 0.006); canvas.rotate(Math.sin(time * 0.8) * 1.5, cx, top + sh / 2);
  const p = sgP, st = sgS, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? l + sw * 0.15 : r - sw * 0.15;
    sgPath.reset(); sgPath.moveTo(x, a0); sgPath.quadTo(x + Math.sin(time * 1.2 + i) * w * 0.04, (a0 + t) / 2, x, t + sh * 0.05);
    st.color = sgC('#455A64'); st.strokeWidth = w * 0.008; canvas.drawPath(sgPath, st);
    st.color = sgC('#FFC93C'); st.strokeWidth = w * 0.003; canvas.drawPath(sgPath, st);
  }
  sgSlab(canvas, l, t, r, b, w * 0.02, w * 0.012, sgC('#37474F'), sgC('#ECEFF1'), sgC('#90A4AE'));
  p.color = sgC('#263238'); canvas.drawRoundRect(sgR(l + sh * 0.1, t + sh * 0.12, r - sh * 0.1, b - sh * 0.12), w * 0.012, w * 0.012, p);
  sgPath.reset(); sgRR(sgPath, l + sh * 0.1, t + sh * 0.12, r - sh * 0.1, b - sh * 0.12, w * 0.012);
  canvas.save(); canvas.clipPath(sgPath);
  p.color = sgA(200, '#FFFFFF');
  for (let i = 0; i < 18; i++) canvas.drawCircle(l + sw * hash01(i * 7 + 1), t + sh * (0.15 + 0.7 * hash01(i * 3 + 2)), w * 0.0025 * (1 + hash01(i)), p);
  canvas.restore();
  for (let i = 0; i < 6; i++) { const x = l + sw * (0.08 + i * 0.168); p.color = Math.trunc(time * 3) % 6 === i ? sgC('#69F0AE') : sgC('#546E7A'); canvas.drawCircle(x, b - sh * 0.06, w * 0.005, p); }
  p.color = sgC('#E53935'); canvas.drawRoundRect(sgR(l - w * 0.01, t + sh * 0.3, l + w * 0.012, t + sh * 0.7), w * 0.005, w * 0.005, p);
  canvas.drawRoundRect(sgR(r - w * 0.012, t + sh * 0.3, r + w * 0.01, t + sh * 0.7), w * 0.005, w * 0.005, p);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#7FD8FF'), fill: Color.WHITE, stroke: sgC('#0D47A1'), maxW: 0.78 });
}

// ---------- 21 : Far West ----------
function sign21(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 1.0);
  const p = sgP, st = sgS, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    sgRope(canvas, x, a0, t + sh * 0.08, w * 0.012, sgC('#D8B07A'), sgC('#9A7040'), sgA(110, '#FFF0D0'));
    st.color = sgC('#D8B07A'); st.strokeWidth = w * 0.006; canvas.drawOval(sgR(x - w * 0.03, t - w * 0.035, x + w * 0.03, t + w * 0.005), st);
  }
  sgSlab(canvas, l, t, r, b, w * 0.008, w * 0.012, sgC('#5A2A1A'), sgC('#B85A38'), sgC('#8A3A22'));
  st.color = sgA(120, '#3A1A0A'); st.strokeWidth = w * 0.004;
  canvas.drawLine(l + w * 0.01, t + sh * 0.5, r - w * 0.01, t + sh * 0.5, st);
  p.color = sgC('#3A1A0A');
  for (const [u, v] of [[0.12, 0.2], [0.88, 0.22], [0.15, 0.82], [0.86, 0.8]]) canvas.drawCircle(l + sw * u, t + sh * v, w * 0.005, p);
  p.color = sgA(200, '#2A0E06'); canvas.drawCircle(l + sw * 0.3, t + sh * 0.2, w * 0.006, p); canvas.drawCircle(r - sw * 0.25, t + sh * 0.85, w * 0.005, p);
  for (const s of [-1, 1]) { const x = cx + s * sw * 0.42, y = t + sh * 0.52; st.color = sgC('#B0BEC5'); st.strokeWidth = w * 0.009; canvas.drawArc(sgR(x - sh * 0.13, y - sh * 0.16, x + sh * 0.13, y + sh * 0.16), 200, 320, false, st); }
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#FFE0A0'), fill: sgC('#FFF3D6'), stroke: sgC('#3A1A0A'), maxW: 0.74 });
}

// ---------- 22 : Mine aux cristaux ----------
function sign22(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.6);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) sgChain(canvas, x, a0, t + sh * 0.1, w * 0.028, sgC('#8A7A6A'), sgC('#3A2E26'), sgA(120, '#FFE0B0'));
  sgSlab(canvas, l, t, r, b, w * 0.012, w * 0.012, sgC('#2A2238'), sgC('#7A6A7A'), sgC('#4A3E52'));
  p.color = sgA(90, '#B0683A');
  for (let i = 0; i < 10; i++) canvas.drawCircle(l + sw * hash01(i * 11 + 3), t + sh * hash01(i * 5 + 7), w * (0.006 + 0.008 * hash01(i)), p);
  p.color = sgC('#3A3048');
  for (const [u, v] of [[0.04, 0.15], [0.96, 0.15], [0.04, 0.85], [0.96, 0.85]]) canvas.drawCircle(l + sw * u, t + sh * v, w * 0.007, p);
  [l + sw * 0.08, r - sw * 0.08].forEach((x, i) => {
    const col = i === 0 ? '#8FE0FF' : '#D08FFF';
    p.color = sgA(Math.trunc(90 + 60 * Math.sin(time * 2 + i)), col); canvas.drawCircle(x, b - sh * 0.05, sh * 0.35, p);
    for (let kk = -1; kk <= 1; kk++) {
      const bx = x + kk * sh * 0.1, hh = sh * (0.45 - Math.abs(kk) * 0.12);
      P.reset(); P.moveTo(bx - sh * 0.05, b + sh * 0.02); P.lineTo(bx - sh * 0.05, b - hh); P.lineTo(bx, b - hh - sh * 0.08); P.lineTo(bx + sh * 0.05, b - hh); P.lineTo(bx + sh * 0.05, b + sh * 0.02); P.close();
      p.color = sgC(col); canvas.drawPath(P, p);
      st.color = sgA(200, '#FFFFFF'); st.strokeWidth = w * 0.002; canvas.drawLine(bx - sh * 0.02, b - hh * 0.2, bx - sh * 0.02, b - hh, st);
    }
  });
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#C8E8FF'), fill: Color.WHITE, stroke: sgC('#1A1228'), maxW: 0.72 });
}

// ---------- 23 : Cirque céleste ----------
function sign23(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.8);
  const p = sgP, st = sgS, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) {
    st.color = Color.WHITE; st.strokeWidth = w * 0.003; canvas.drawLine(x, a0, x, t, st);
    let i = 0;
    for (let y = a0 + w * 0.01; y < t - w * 0.01; y += w * 0.026, i++) {
      p.color = sgC(['#FFD54F', '#4FC3F7', '#FF5C9A', '#8CE06A'][i % 4]);
      sgPath.reset(); sgPath.moveTo(x, y); sgPath.lineTo(x + w * 0.022, y + w * 0.01); sgPath.lineTo(x, y + w * 0.02); sgPath.close(); canvas.drawPath(sgPath, p);
    }
  }
  sgPath.reset(); sgRR(sgPath, l, t, r, b, w * 0.03);
  p.color = sgC('#8E1B1B'); canvas.drawRoundRect(sgR(l, t + w * 0.012, r, b + w * 0.012), w * 0.03, w * 0.03, p);
  canvas.save(); canvas.clipPath(sgPath);
  p.color = Color.WHITE; canvas.drawRect(l, t, r, b, p);
  st.color = sgC('#E53935'); st.strokeWidth = sh * 0.1; st.strokeCap = 'butt';
  for (let x0 = l - sh; x0 < r + sh; x0 += sh * 0.24) canvas.drawLine(x0, b, x0 + sh, t, st);
  st.strokeCap = 'round';
  canvas.restore();
  p.color = sgC('#1A237E'); canvas.drawRoundRect(sgR(l + sh * 0.12, t + sh * 0.12, r - sh * 0.12, b - sh * 0.12), w * 0.018, w * 0.018, p);
  const blink = Math.trunc(time * 5);
  for (let i = 0; i < 14; i++) { const x = l + sw * (0.06 + 0.88 * i / 13); for (const y of [t + sh * 0.06, b - sh * 0.06]) { p.color = (i + blink) % 2 === 0 ? sgC('#FFF59D') : sgC('#8A6A2A'); canvas.drawCircle(x, y, w * 0.004, p); } }
  sgStar(sgPath, cx, t - sh * 0.08, sh * 0.16, sh * 0.07, 5, -1.5708); p.color = sgC('#FFD54F'); canvas.drawPath(sgPath, p);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#FFD54F'), fill: Color.WHITE, stroke: sgC('#B71C1C'), maxW: 0.8 });
}

// ---------- 24 : Arène des champions ----------
function sign24(canvas, cx, top, sw, sh, small, big, a0) {
  sgSway(canvas, cx, 0.6);
  const p = sgP, st = sgS, P = sgPath, l = cx - sw / 2, r = cx + sw / 2, t = top, b = top + sh;
  for (const x of [l + sw * 0.15, r - sw * 0.15]) sgChain(canvas, x, a0, t + sh * 0.1, w * 0.028, sgC('#FFC93C'), sgC('#9A6A10'), sgA(220, '#FFFFFF'));
  const banner = (dy) => { P.reset(); P.moveTo(l, t + dy); P.lineTo(r, t + dy); P.lineTo(r, b - sh * 0.1 + dy); P.lineTo(cx, b + sh * 0.18 + dy); P.lineTo(l, b - sh * 0.1 + dy); P.close(); };
  banner(w * 0.012); p.color = sgC('#2A0E3E'); canvas.drawPath(P, p);
  banner(0); p.color = Color.WHITE; p.shader = sgLin(0, t, 0, b, sgC('#7A3A9A'), sgC('#4A1A6A')); canvas.drawPath(P, p); p.shader = null;
  st.color = sgC('#FFC93C'); st.strokeWidth = w * 0.007; canvas.drawPath(P, st);
  for (const s of [-1, 1]) {
    const x = cx + s * sw * 0.41, y = t + sh * 0.55;
    st.color = sgC('#FFC93C'); st.strokeWidth = w * 0.004; canvas.drawArc(sgR(x - sh * 0.18, y - sh * 0.25, x + sh * 0.18, y + sh * 0.25), s < 0 ? 100 : -80, 160, false, st);
    p.color = sgC('#FFC93C');
    for (let kk = 0; kk < 4; kk++) { const an = (s < 0 ? 2.0 : -1.1) + kk * 0.45 * s; canvas.drawOval(sgR(x + Math.cos(an) * sh * 0.18 - sh * 0.04, y + Math.sin(an) * sh * 0.25 - sh * 0.02, x + Math.cos(an) * sh * 0.18 + sh * 0.04, y + Math.sin(an) * sh * 0.25 + sh * 0.02), p); }
  }
  p.color = sgC('#FFC93C'); P.reset(); const ky = t - sh * 0.02;
  P.moveTo(cx - sh * 0.14, ky); P.lineTo(cx - sh * 0.14, ky - sh * 0.12); P.lineTo(cx - sh * 0.07, ky - sh * 0.05); P.lineTo(cx, ky - sh * 0.15); P.lineTo(cx + sh * 0.07, ky - sh * 0.05); P.lineTo(cx + sh * 0.14, ky - sh * 0.12); P.lineTo(cx + sh * 0.14, ky); P.close(); canvas.drawPath(P, p);
  sgText(canvas, cx, t, sw, sh, small, big, { small: sgC('#FFD54F'), fill: Color.WHITE, stroke: sgC('#2A0E3E'), maxW: 0.74 });
}

const SIGN_DRAW = { 2: sign2, 3: sign3, 4: sign4, 5: sign5, 6: sign6, 7: sign7, 8: sign8, 9: sign9, 10: sign10, 11: sign11, 12: sign12, 13: sign13, 14: sign14, 15: sign15, 16: sign16, 17: sign17, 18: sign18, 19: sign19, 20: sign20, 21: sign21, 22: sign22, 23: sign23, 24: sign24 };
