'use strict';
// Chapitre 28, Rome : « Ave, Bulpa ! », le Colisée (équivalent de ChapterRome.kt, appelé par chapterthemes5.js).
// Blocs de travertin à arcades, boucliers de légion rouges aux ailes d'or, marbre gravé SPQR, chars aux roues qui
// tournent (blocs mobiles), vieilles pierres qui s'effritent, boucliers ronds de gladiateur à cimier (trampolines),
// deniers d'argent à ramasser, arc de triomphe à l'arrivée, aigle d'or de la légion. Particularité : la foule
// acclame chaque parfait (clameur et pluie de pétales).

const rp8 = new Paint(), rs8 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const rt8 = new Paint({ textAlign: 'center', bold: true });
const rpath8 = new Path(), rrect8 = new RectF();
const RO8_TRAVERTINE = 0xFFE0C89A, RO8_RED = 0xFFB8322A, RO8_MARBLE = 0xFFF2ECE0;
/** Instant de la dernière acclamation de la foule (un parfait au chapitre 28). */
let romeCheerT28 = -9;

function chapterBlockLook28(b) {
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return std(RO8_MARBLE, 'marbre', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (k0 === Kind.MOVING) return std(0xFFB8322A, 'bois', false);      // char
  if (k0 === Kind.CRUMBLY) return std(0xFFC8B08A, 'granit', false);   // vieille pierre
  if (k0 === Kind.TRAMPOLINE) return std(0xFFC8963A, 'metal', true);  // bouclier rond de gladiateur
  return c % 3 === 0 ? std(RO8_TRAVERTINE, 'granit', false) : c % 3 === 1 ? std(RO8_RED, 'lisse', false) : std(RO8_MARBLE, 'marbre', b.round);
}

/** Faces latérales d'un bloc carré, chacune dans son repère (x sur wd, y sur dh). */
function roWalls8(canvas, pl, seed, face) {
  const a = pl.half, dh = platformDepth * k, h0 = seed * 79 + 13, wd = 2 * a * 0.8660254 * k, yF = a * k;
  canvas.save(); canvas.translate(-wd, 0); canvas.skew(0, 0.57735); face(canvas, h0 + 101, wd, dh, false); canvas.restore();
  canvas.save(); canvas.translate(0, yF); canvas.skew(0, -0.57735); face(canvas, h0 + 202, wd, dh, true); canvas.restore();
}

/** Face de travertin : corniche, deux arcades sombres à clé de voûte, joints de pierre. */
function roArcFace8(canvas, h0, wd, dh, right) {
  const dk = right ? 0.7 : 1;
  rs8.color = Color.argb(Math.round(60 * dk), 110, 80, 50); rs8.strokeWidth = k * 0.012;
  for (let r = 1; r < 5; r++) canvas.drawLine(k * 0.04, r * dh / 5, wd - k * 0.04, r * dh / 5, rs8);
  rp8.color = Color.argb(Math.round(150 * dk), 255, 246, 226); canvas.drawRect(k * 0.03, k * 0.08, wd - k * 0.03, k * 0.16, rp8);
  const n = 2, aw = wd / n * 0.5;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * wd / n, yt = dh * 0.32, yb = dh - k * 0.08;
    rp8.color = right ? 0xFF2A1A12 : 0xFF3A2418;
    rpath8.reset(); rpath8.moveTo(x - aw / 2, yb); rpath8.lineTo(x - aw / 2, yt + aw / 2); rpath8.quadTo(x - aw / 2, yt, x, yt); rpath8.quadTo(x + aw / 2, yt, x + aw / 2, yt + aw / 2); rpath8.lineTo(x + aw / 2, yb); rpath8.close();
    canvas.drawPath(rpath8, rp8);
    rs8.color = Color.argb(Math.round(170 * dk), 255, 240, 210); rs8.strokeWidth = k * 0.025;
    rpath8.reset(); rpath8.moveTo(x - aw / 2 - k * 0.03, yt + aw / 2); rpath8.quadTo(x - aw / 2 - k * 0.03, yt - k * 0.04, x, yt - k * 0.04); rpath8.quadTo(x + aw / 2 + k * 0.03, yt - k * 0.04, x + aw / 2 + k * 0.03, yt + aw / 2); canvas.drawPath(rpath8, rs8);
    rp8.color = Color.argb(Math.round(220 * dk), 240, 220, 180); canvas.drawRect(x - k * 0.03, yt - k * 0.07, x + k * 0.03, yt + k * 0.02, rp8);
  }
}

/** Face de bouclier de légion : liseré d'or, umbo, ailes et éclairs de Jupiter. */
function roShieldFace8(canvas, h0, wd, dh, right) {
  const cx = wd / 2, cy = dh / 2, gold = right ? 0xFFC89A3A : 0xFFFFD54F;
  rs8.color = gold; rs8.strokeWidth = k * 0.03; canvas.drawRect(k * 0.06, k * 0.06, wd - k * 0.06, dh - k * 0.06, rs8);
  rp8.color = right ? 0xFFB8862A : 0xFFE0B040; canvas.drawCircle(cx, cy, Math.min(wd, dh) * 0.12, rp8);
  rp8.color = Color.argb(160, 255, 255, 255); canvas.drawCircle(cx - k * 0.03, cy - k * 0.03, Math.min(wd, dh) * 0.04, rp8);
  rs8.strokeWidth = k * 0.025;
  for (const sd of [-1, 1]) for (const sx of [-1, 1]) {
    rpath8.reset(); rpath8.moveTo(cx + sx * wd * 0.1, cy + sd * dh * 0.06);
    rpath8.quadTo(cx + sx * wd * 0.28, cy + sd * dh * 0.18, cx + sx * wd * 0.38, cy + sd * dh * 0.36); canvas.drawPath(rpath8, rs8);
  }
  if (egHash5(h0) < 0.6) for (const sd of [-1, 1]) {
    rpath8.reset(); rpath8.moveTo(cx - wd * 0.06, cy + sd * dh * 0.18); rpath8.lineTo(cx + wd * 0.03, cy + sd * dh * 0.24); rpath8.lineTo(cx - wd * 0.03, cy + sd * dh * 0.28); rpath8.lineTo(cx + wd * 0.06, cy + sd * dh * 0.38); canvas.drawPath(rpath8, rs8);
  }
}

/** Face de marbre : plaque gravée SPQR (ou une couronne de laurier), filets. */
function roMarbleFace8(canvas, h0, wd, dh, right) {
  const dk = right ? 0.72 : 1;
  rs8.color = Color.argb(Math.round(70 * dk), 140, 130, 120); rs8.strokeWidth = k * 0.012;
  canvas.drawRect(k * 0.08, k * 0.1, wd - k * 0.08, dh - k * 0.1, rs8);
  if (egHash5(h0) < 0.55) {
    rt8.textSize = Math.min(wd * 0.26, dh * 0.3); rt8.color = Color.argb(Math.round(190 * dk), 150, 40, 30);
    canvas.drawText('SPQR', wd / 2, dh * 0.5 + rt8.textSize * 0.35, rt8);
    rs8.color = Color.argb(Math.round(150 * dk), 200, 160, 70); rs8.strokeWidth = k * 0.015;
    canvas.drawLine(wd * 0.2, dh * 0.3, wd * 0.8, dh * 0.3, rs8); canvas.drawLine(wd * 0.2, dh * 0.7, wd * 0.8, dh * 0.7, rs8);
  } else {
    const r = Math.min(wd, dh) * 0.26;
    for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {
      const an = Math.PI / 2 + sd * (0.4 + i * 0.4);
      rp8.color = Color.argb(Math.round(220 * dk), 106, 154, 58); rrect8.set(wd / 2 + Math.cos(an) * r - k * 0.05, dh / 2 + Math.sin(an) * r - k * 0.022, wd / 2 + Math.cos(an) * r + k * 0.05, dh / 2 + Math.sin(an) * r + k * 0.022);
      canvas.drawOval(rrect8, rp8);
    }
  }
}

function drawChapterDeco28(canvas, pl, seed) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, kd = pl.kind, dh = platformDepth * k;
  rp8.shader = null; rs8.shader = null;
  if (kd === Kind.MOVING) {
    // Char : grandes roues qui tournent sur les deux faces, rambarde courbe dorée, poussière
    roWalls8(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      const r = Math.min(wd * 0.3, dh2 * 0.36), cx = wd * 0.5, cy = dh2 - r * 0.7, sp = time * 6 * (right ? -1 : 1);
      rs8.color = right ? 0xFF5A3A1A : 0xFF7A5228; rs8.strokeWidth = k * 0.06; cv.drawCircle(cx, cy, r, rs8);
      rs8.strokeWidth = k * 0.025;
      for (let i = 0; i < 4; i++) { const an = sp + i * Math.PI / 4; cv.drawLine(cx - Math.cos(an) * r, cy - Math.sin(an) * r, cx + Math.cos(an) * r, cy + Math.sin(an) * r, rs8); }
      rp8.color = 0xFFFFD54F; cv.drawCircle(cx, cy, r * 0.18, rp8);
      rs8.color = right ? 0xFFC89A3A : 0xFFFFD54F; rs8.strokeWidth = k * 0.03; cv.drawLine(k * 0.05, k * 0.1, wd - k * 0.05, k * 0.1, rs8);
    });
    rs8.color = 0xFFFFD54F; rs8.strokeWidth = k * 0.04;
    rpath8.reset(); rpath8.moveTo(isoX(-0.9 * a, 0.9 * a), isoY(-0.9 * a, 0, 0.9 * a)); rpath8.quadTo(isoX(0.9 * a, 0.9 * a), isoY(0.9 * a, 0, 0.9 * a) - k * 0.5, isoX(0.9 * a, -0.9 * a), isoY(0.9 * a, 0, -0.9 * a));
    canvas.drawPath(rpath8, rs8);
    for (let i = 0; i < 5; i++) { const q = (time * 1.5 + i / 5) % 1; rp8.color = Color.argb(Math.round(110 * (1 - q)), 230, 200, 150); canvas.drawCircle(-rx * (0.8 + q * 0.6), ry * 0.6 + dh * 0.9 - q * k * 0.4, k * (0.1 + q * 0.2), rp8); }
    return;
  }
  if (kd === Kind.TRAMPOLINE) {
    // Bouclier rond de gladiateur : rivets sur le bord, cimier de crin rouge derrière
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; rp8.color = 0xFFFFE08A; canvas.drawCircle(Math.cos(an) * rx * 0.86, Math.sin(an) * ry * 0.86, k * 0.035, rp8); }
    rs8.color = 0xFF8A5A1A; rs8.strokeWidth = k * 0.03; rrect8.set(-rx * 0.95, -ry * 0.95, rx * 0.95, ry * 0.95); canvas.drawOval(rrect8, rs8);
    const sway = Math.sin(time * 3) * k * 0.03 + pl.bounce * k * 0.1;
    for (let i = 0; i < 17; i++) {
      const u = i / 16 - 0.5, bx = u * rx * 1.3, by = -ry * 0.75 - Math.cos(u * Math.PI) * k * 0.05;
      rs8.color = i % 2 ? 0xFFC8322A : 0xFFE8483A; rs8.strokeWidth = k * 0.05;
      canvas.drawLine(bx, by, bx * 1.08 + sway, by - k * (0.5 + 0.18 * Math.cos(u * Math.PI)), rs8);
    }
    rs8.color = 0xFFFFD54F; rs8.strokeWidth = k * 0.05; canvas.drawLine(-rx * 0.66, -ry * 0.78, rx * 0.66, -ry * 0.78, rs8);
    return;
  }
  if (kd === Kind.CRUMBLY) {
    roWalls8(canvas, pl, seed, (cv, h0, wd, dh2, right) => {
      rs8.color = Color.argb(right ? 70 : 95, 100, 80, 60); rs8.strokeWidth = k * 0.014;
      for (let r = 1; r < 4; r++) cv.drawLine(k * 0.04, r * dh2 / 4, wd - k * 0.04, r * dh2 / 4, rs8);
      cv.drawLine(wd * 0.35, 0, wd * 0.5, dh2 * 0.45, rs8); cv.drawLine(wd * 0.5, dh2 * 0.45, wd * 0.42, dh2, rs8);
    });
    rs8.color = Color.argb(150, 100, 80, 60); rs8.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.5, -ry * 0.25, -rx * 0.05, ry * 0.1, rs8); canvas.drawLine(-rx * 0.05, ry * 0.1, rx * 0.45, -ry * 0.3, rs8);
    for (let i = 0; i < 4; i++) { const q = (time * 0.9 + i * 0.25 + seed * 0.1) % 1; rp8.color = Color.argb(Math.floor(160 * (1 - q)), 200, 180, 140); canvas.drawCircle(rx * (0.1 + 0.08 * i), ry * 0.2 + q * k * 0.5, k * 0.03, rp8); }
    return;
  }
  if (kd === Kind.MINI || pl.finish) return;
  if (pl.round) {
    // Tambour de marbre : filet doré et couronne de laurier gravée sur le devant
    rs8.color = 0xFFE0B040; rs8.strokeWidth = k * 0.025; rrect8.set(-rx * 0.94, -ry * 0.94, rx * 0.94, ry * 0.94); canvas.drawOval(rrect8, rs8);
    canvas.save(); canvas.translate(-k * 0.36, ry - k * 0.02); roMarbleFace8(canvas, seed * 79, k * 0.72, dh, false); canvas.restore();
    return;
  }
  const bc = pl.baseColor;
  roWalls8(canvas, pl, seed, bc === RO8_TRAVERTINE ? roArcFace8 : bc === RO8_RED ? roShieldFace8 : roMarbleFace8);
  if (bc === RO8_RED) {
    rs8.color = Color.argb(150, 255, 213, 79); rs8.strokeWidth = k * 0.025;
    rpath8.reset(); rpath8.moveTo(isoX(-0.85 * a, -0.85 * a), isoY(-0.85 * a, 0, -0.85 * a));
    for (const [u, v] of [[0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]]) rpath8.lineTo(isoX(u * a, v * a), isoY(u * a, 0, v * a));
    rpath8.close(); canvas.drawPath(rpath8, rs8);
  }
}

/** Denier d'argent qui tourne sur lui-même : profil de l'empereur, grènetis (28). */
function drawChapterPickup28(canvas, cy, shadow) {
  const r = k * 0.19, sc = Math.abs(Math.cos(time * 2.4)) * 0.85 + 0.15;
  rp8.shader = null;
  if (shadow) { rp8.color = Color.argb(45, 0, 0, 0); rrect8.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(rrect8, rp8); }
  rp8.color = Color.argb(Math.floor(60 + 40 * Math.sin(time * 4)), 230, 236, 255); canvas.drawCircle(0, cy, r * 1.4, rp8);
  canvas.save(); canvas.scale(sc, 1, 0, cy);
  rp8.color = 0xFF8A8E98; canvas.drawCircle(r * 0.08, cy + r * 0.06, r, rp8);
  rp8.color = 0xFFD8DCE4; canvas.drawCircle(0, cy, r, rp8);
  rs8.color = 0xFF9EA4B0; rs8.strokeWidth = r * 0.06;
  for (let i = 0; i < 20; i++) { const an = i / 20 * Math.PI * 2; rp8.color = 0xFFA8AEBA; canvas.drawCircle(Math.cos(an) * r * 0.84, cy + Math.sin(an) * r * 0.84, r * 0.045, rp8); }
  // Profil : tête, nez, couronne de laurier
  rp8.color = 0xFFAEB4C0; canvas.drawCircle(-r * 0.04, cy - r * 0.05, r * 0.36, rp8);
  rpath8.reset(); rpath8.moveTo(r * 0.28, cy - r * 0.12); rpath8.lineTo(r * 0.44, cy + r * 0.02); rpath8.lineTo(r * 0.3, cy + r * 0.06); rpath8.close(); canvas.drawPath(rpath8, rp8);
  rp8.color = 0xFFAEB4C0; rrect8.set(-r * 0.22, cy + r * 0.2, r * 0.16, cy + r * 0.5); canvas.drawRect(rrect8, rp8);
  rs8.color = 0xFF7A8090; rs8.strokeWidth = r * 0.07;
  for (let i = 0; i < 5; i++) { const an = Math.PI * (1.1 + i * 0.16); canvas.drawLine(Math.cos(an) * r * 0.34 - r * 0.04, cy + Math.sin(an) * r * 0.34 - r * 0.05, Math.cos(an) * r * 0.44 - r * 0.04, cy + Math.sin(an) * r * 0.44 - r * 0.05, rs8); }
  rp8.color = Color.argb(170, 255, 255, 255); canvas.drawCircle(-r * 0.45, cy - r * 0.45, r * 0.12, rp8);
  canvas.restore();
  return true;
}

/** Arc de triomphe à l'arrivée : marbre, arche, attique et quadrige d'or (28). */
function drawChapterFinish28(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  rp8.shader = null;
  rp8.color = Color.argb(Math.floor(70 + 30 * Math.sin(time * 3)), 255, 220, 100); canvas.drawCircle(bx, by - k * 0.9, k * 0.55, rp8);
  rp8.color = 0xFFD8D0C2; canvas.drawRect(bx - k * 0.4, by - k * 0.86, bx, by, rp8);
  rp8.color = 0xFFF6F2EA; canvas.drawRect(bx, by - k * 0.86, bx + k * 0.4, by, rp8);
  rp8.color = 0xFF3A2418; rpath8.reset(); rpath8.moveTo(bx - k * 0.14, by); rpath8.lineTo(bx - k * 0.14, by - k * 0.42); rpath8.quadTo(bx, by - k * 0.6, bx + k * 0.14, by - k * 0.42); rpath8.lineTo(bx + k * 0.14, by); rpath8.close(); canvas.drawPath(rpath8, rp8);
  rp8.color = 0xFFB8322A; canvas.drawRect(bx - k * 0.3, by - k * 0.8, bx + k * 0.3, by - k * 0.68, rp8);
  rp8.color = 0xFFFFD54F; canvas.drawRect(bx - k * 0.44, by - k * 0.92, bx + k * 0.44, by - k * 0.86, rp8);
  for (let i = 0; i < 4; i++) { const hx = bx - k * 0.18 + i * k * 0.1; canvas.drawRect(hx - k * 0.03, by - k * 1.08, hx + k * 0.03, by - k * 0.92, rp8); canvas.drawCircle(hx + k * 0.03, by - k * 1.1, k * 0.035, rp8); }
  canvas.drawCircle(bx, by - k * 1.16, k * 0.05, rp8);
}

/** Objet doré : l'aigle de la légion (28). */
function drawCollectible28(canvas, c, x, y, r, got) {
  rp8.shader = null;
  const main = got ? 0xFFFFC93C : 0xFF9A9AA2, dark = got ? 0xFFC98A00 : 0xFF6E6E78;
  if (got) { rp8.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, rp8); }
  rp8.color = main;
  for (const sd of [-1, 1]) {
    rpath8.reset(); rpath8.moveTo(x, y + r * 0.1); rpath8.quadTo(x + sd * r * 0.7, y - r * 1.0, x + sd * r * 1.05, y - r * 0.7);
    rpath8.lineTo(x + sd * r * 0.85, y - r * 0.45); rpath8.lineTo(x + sd * r * 0.95, y - r * 0.2); rpath8.lineTo(x + sd * r * 0.6, y); rpath8.close(); canvas.drawPath(rpath8, rp8);
  }
  rrect8.set(x - r * 0.22, y - r * 0.5, x + r * 0.22, y + r * 0.45); canvas.drawOval(rrect8, rp8);
  canvas.drawCircle(x + r * 0.08, y - r * 0.6, r * 0.18, rp8);
  rp8.color = dark; rpath8.reset(); rpath8.moveTo(x + r * 0.22, y - r * 0.64); rpath8.lineTo(x + r * 0.4, y - r * 0.56); rpath8.lineTo(x + r * 0.22, y - r * 0.5); rpath8.close(); canvas.drawPath(rpath8, rp8);
  canvas.drawRect(x - r * 0.45, y + r * 0.5, x + r * 0.45, y + r * 0.68, rp8);
  rs8.color = dark; rs8.strokeWidth = r * 0.06; canvas.drawLine(x, y + r * 0.68, x, y + r * 1.0, rs8);
}

/** Décor de secours (si le fond peint manque). */
function drawChapterMapBackground28(canvas) {
  rp8.color = Color.WHITE; rp8.shader = new LinearGradient(0, 0, 0, h, [0xFF3A6AA8, 0xFFF2D0A0, 0xFFE8C48A], [0, 0.4, 1]); canvas.drawRect(0, 0, w, h, rp8); rp8.shader = null;
}

/** La foule acclame un parfait (chapitre 28) : clameur. */
function romeCheer28(streak) {
  romeCheerT28 = time;
  sounds.play('CROWD', Math.min(0.25 + 0.05 * streak, 0.6));
}

/** Devant les blocs : pluie de pétales de roses lancés par la foule après un parfait. */
function drawRomeCheer28(canvas) {
  const u = time - romeCheerT28;
  if (u < 0 || u > 2.2) return;
  rp8.shader = null;
  for (let i = 0; i < 30; i++) {
    const h1 = hash01(i * 7 + 3), q = clamp((u - h1 * 0.4) / 1.8, 0, 1);
    if (q <= 0) continue;
    const x = w * hash01(i * 13 + 1) + Math.sin(u * 3 + i) * w * 0.03, y = -h * 0.05 + q * h * (0.6 + 0.4 * h1);
    rp8.color = Color.argb(Math.round(230 * (1 - q * q)), i % 3 === 0 ? 255 : 232, i % 3 === 0 ? 255 : (i % 2 ? 110 : 56), i % 3 === 0 ? 255 : (i % 2 ? 140 : 74));
    canvas.save(); canvas.rotate(u * 200 + i * 40, x, y); rrect8.set(x - k * 0.06, y - k * 0.03, x + k * 0.06, y + k * 0.03); canvas.drawOval(rrect8, rp8); canvas.restore();
  }
}
