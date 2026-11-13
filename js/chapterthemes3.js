'use strict';
// Saison 3 de l'Aventure, chapitres 17 et suivants (équivalent de ChapterThemes3.kt) :
// 17 À l'abordage ! (pont du navire, tonneaux, caisses, voiles) · 18 Panique au Jurassique (pierres moussues, geysers, œufs, carapaces)
// Appelé par les fonctions de chapterthemes2.js dès le chapitre 17.

const tp3 = new Paint(), ts3 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const tpath3 = new Path(), trect3 = new RectF();
const pc3 = (s) => Color.parseColor(s);

// ---------- Blocs en jeu ----------
const CH3_PLANKS = [0xFF9A6234, 0xFF8B5A2B, 0xFFA8703C, 0xFF7E5028];
const CH3_MOSSY = [0xFF7A8A5A, 0xFF6E7E50, 0xFF8A9466, 0xFF5E6E46];
const CH3_ROCK = 0xFF6E6A70;

function chapterBlockLook3(b) {
  if (quest.season >= 19) return chapterBlockLook4(b);
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) return quest.season === 17 ? std(0xFFE2C58A, 'granit', false) : std(0xFF7A6A52, 'granit', false);
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  if (quest.season === 17) {
    if (k0 === Kind.MOVING) return std(0xFF9A6234, 'bois', true);        // tonneau qui tangue
    if (k0 === Kind.CRUMBLY) return std(0xFFB5814A, 'bois', false);      // caisse qui cède
    if (k0 === Kind.TRAMPOLINE) return std(0xFFF2E3C4, 'lisse', true);   // voile tendue
    return c % 3 === 0 ? std(CH3_ROCK, 'granit') : std(CH3_PLANKS[c % 4], 'bois');   // rocher, pont du navire
  }
  if (k0 === Kind.TRAMPOLINE) return std(0xFF4FA3C7, 'lisse', true);     // geyser
  if (k0 === Kind.CRUMBLY) return std(0xFFEFE6C8, 'lisse', true);        // œuf de dinosaure
  if (k0 === Kind.MOVING) return std(0xFF5E8A3A, 'lisse', true);         // carapace de tortue géante
  return std(CH3_MOSSY[c % 4], 'granit');                                // pierre moussue
}

/** Détails dessinés sur les blocs des chapitres 17 et suivants (repère du bloc, centre du dessus). */
function drawChapterDeco3(canvas, pl) {
  if (pl.theme >= 19) { drawChapterDeco4(canvas, pl); return; }
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, sin = Math.sin, cos = Math.cos;
  tp3.shader = null;
  const seed = Math.abs(Math.trunc(pl.cx * 7 + pl.cz * 13));
  const isoLine = (u0, v0, u1, v1) => canvas.drawLine(isoX(u0 * a, v0 * a), isoY(u0 * a, 0, v0 * a), isoX(u1 * a, v1 * a), isoY(u1 * a, 0, v1 * a), ts3);
  if (pl.theme === 17) {
    if (pl.kind === Kind.MOVING) {
      // Cerclages et bonde du tonneau
      ts3.color = pc3('#4A4A50'); ts3.strokeWidth = k * 0.04;
      for (const q of [0.55, 0.85]) { trect3.set(-rx * q, -ry * q, rx * q, ry * q); canvas.drawOval(trect3, ts3); }
      tp3.color = pc3('#5A3416'); trect3.set(-rx * 0.12, -ry * 0.12, rx * 0.12, ry * 0.12); canvas.drawOval(trect3, tp3);
    } else if (pl.kind === Kind.CRUMBLY) {
      // Planches de la caisse en croix
      ts3.color = pc3('#7A5028'); ts3.strokeWidth = k * 0.035;
      isoLine(-0.8, -0.8, 0.8, 0.8); isoLine(0.8, -0.8, -0.8, 0.8);
    } else if (pl.kind === Kind.TRAMPOLINE) {
      // Rayures rouges de la voile
      ts3.color = Color.argb(170, 200, 40, 40); ts3.strokeWidth = k * 0.06;
      for (let i = -1; i <= 1; i++) isoLine(i * 0.45, -0.8, i * 0.45, 0.8);
    } else if (pl.baseColor === CH3_ROCK) {
      // Rocher : coquillage et algue qui ondule
      tp3.color = pc3('#FFB59A'); canvas.drawCircle(rx * 0.3, ry * 0.1, k * 0.07, tp3);
      ts3.color = pc3('#3E8A4A'); ts3.strokeWidth = k * 0.03;
      canvas.drawLine(-rx * 0.4, 0, -rx * 0.5 + sin(time * 2 + seed) * k * 0.05, -k * 0.25, ts3);
    } else {
      // Lattes du pont et leurs clous
      ts3.color = Color.argb(110, 60, 30, 10); ts3.strokeWidth = k * 0.02;
      for (let i = -2; i <= 2; i++) isoLine(-0.9, i * 0.33, 0.9, i * 0.33);
      tp3.color = Color.argb(160, 40, 30, 20);
      for (let i = -2; i <= 2; i++) canvas.drawCircle(isoX(-a * 0.75, i * 0.33 * a), isoY(-a * 0.75, 0, i * 0.33 * a), k * 0.025, tp3);
    }
    return;
  }
  if (pl.kind === Kind.CRUMBLY) {
    // Taches de l'œuf, et la coquille qui se fissure
    tp3.color = Color.argb(150, 120, 140, 90);
    for (let i = 0; i < 6; i++) {
      const u = hash01(seed + i * 3) - 0.5, v = hash01(seed + i * 5 + 1) - 0.5;
      canvas.drawCircle(isoX(u * a * 1.3, v * a * 1.3), isoY(u * a * 1.3, 0, v * a * 1.3), k * (0.04 + 0.03 * hash01(seed + i)), tp3);
    }
    ts3.color = Color.argb(160, 90, 70, 40); ts3.strokeWidth = k * 0.02;
    canvas.drawLine(-rx * 0.3, -ry * 0.1, -rx * 0.05, ry * 0.15, ts3); canvas.drawLine(-rx * 0.05, ry * 0.15, rx * 0.2, -ry * 0.05, ts3);
  } else if (pl.kind === Kind.TRAMPOLINE) {
    // Source chaude : eau qui bouillonne et vapeur qui monte
    tp3.color = pc3('#9FE0FF'); trect3.set(-rx * 0.6, -ry * 0.6, rx * 0.6, ry * 0.6); canvas.drawOval(trect3, tp3);
    for (let i = 0; i < 3; i++) {
      const q = (time * 0.8 + i * 0.33 + seed * 0.1) % 1;
      tp3.color = Color.argb(Math.floor(150 * (1 - q)), 255, 255, 255);
      canvas.drawCircle((i - 1) * rx * 0.25, -q * k * 0.9, k * (0.08 + 0.12 * q), tp3);
    }
  } else if (pl.kind === Kind.MOVING) {
    // Écailles de la carapace
    ts3.color = pc3('#3E6A26'); ts3.strokeWidth = k * 0.03;
    trect3.set(-rx * 0.35, -ry * 0.35, rx * 0.35, ry * 0.35); canvas.drawOval(trect3, ts3);
    for (let i = 0; i < 6; i++) { const an = i * 1.047; canvas.drawLine(cos(an) * rx * 0.35, sin(an) * ry * 0.35, cos(an) * rx * 0.8, sin(an) * ry * 0.8, ts3); }
  } else {
    // Touffes de mousse, parfois une crosse de fougère
    tp3.color = Color.argb(160, 90, 150, 60);
    for (let i = 0; i < 4; i++) {
      const u = hash01(seed + i * 7) - 0.5, v = hash01(seed + i * 11 + 2) - 0.5;
      const x = isoX(u * a * 1.2, v * a * 1.2), y = isoY(u * a * 1.2, 0, v * a * 1.2);
      trect3.set(x - k * 0.12, y - k * 0.05, x + k * 0.12, y + k * 0.05); canvas.drawOval(trect3, tp3);
    }
    if (seed % 3 === 0) {
      ts3.color = pc3('#4E8A2E'); ts3.strokeWidth = k * 0.025;
      tpath3.reset(); tpath3.moveTo(rx * 0.2, 0); tpath3.quadTo(rx * 0.25, -k * 0.3, rx * 0.05, -k * 0.35); canvas.drawPath(tpath3, ts3);
    }
  }
}

/** Objet à ramasser des chapitres 17 et suivants : pierre précieuse (17), os (18). */
function drawChapterPickup3(canvas, cy, shadow) {
  if (quest.season >= 19) return drawChapterPickup4(canvas, cy, shadow);
  const r = k * 0.18;
  tp3.shader = null;
  if (shadow) { tp3.color = Color.argb(45, 0, 0, 0); trect3.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(trect3, tp3); }
  if (quest.season === 17) {
    // Rubis taillé qui tourne sur lui-même
    const sp = Math.max(0.25, Math.abs(Math.cos(time * 2.5)));
    tpath3.reset(); tpath3.moveTo(0, cy - r); tpath3.lineTo(r * sp, cy - r * 0.3); tpath3.lineTo(0, cy + r); tpath3.lineTo(-r * sp, cy - r * 0.3); tpath3.close();
    tp3.color = pc3('#E53950'); canvas.drawPath(tpath3, tp3);
    ts3.color = pc3('#9A1030'); ts3.strokeWidth = r * 0.08; canvas.drawPath(tpath3, ts3);
    tp3.color = Color.argb(170, 255, 255, 255);
    tpath3.reset(); tpath3.moveTo(0, cy - r); tpath3.lineTo(r * sp * 0.5, cy - r * 0.3); tpath3.lineTo(0, cy - r * 0.1); tpath3.close(); canvas.drawPath(tpath3, tp3);
  } else {
    // Os qui se balance
    canvas.save(); canvas.rotate(Math.sin(time * 2) * 20, 0, cy);
    tp3.color = pc3('#F5ECD6'); trect3.set(-r * 0.75, cy - r * 0.18, r * 0.75, cy + r * 0.18); canvas.drawRect(trect3, tp3);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) canvas.drawCircle(sx * r * 0.8, cy + sy * r * 0.22, r * 0.24, tp3);
    ts3.color = pc3('#C9B98E'); ts3.strokeWidth = r * 0.06; canvas.drawLine(-r * 0.6, cy + r * 0.12, r * 0.6, cy + r * 0.12, ts3);
    canvas.restore();
  }
  return true;
}

/** Arrivée d'un niveau des chapitres 17 et suivants (repère du bloc) : coffre au trésor (17), nid et son œuf (18). */
function drawChapterFinish3(canvas, p) {
  if (quest.season >= 19) { drawChapterFinish4(canvas, p); return; }
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45), sin = Math.sin, cos = Math.cos;
  tp3.shader = null;
  if (quest.season === 17) {
    tp3.color = Color.argb(Math.floor(70 + 30 * sin(time * 3)), 255, 214, 90); canvas.drawCircle(bx, by - k * 0.45, k * 0.75, tp3);
    // Couvercle ouvert (derrière), coffre, trésor qui déborde
    tp3.color = pc3('#5A3416'); trect3.set(bx - k * 0.42, by - k * 0.98, bx + k * 0.42, by - k * 0.46); canvas.drawRoundRect(trect3, k * 0.16, k * 0.16, tp3);
    tp3.color = pc3('#7A4A22'); trect3.set(bx - k * 0.4, by - k * 0.46, bx + k * 0.4, by); canvas.drawRect(trect3, tp3);
    tp3.color = pc3('#C9A13B');
    trect3.set(bx - k * 0.42, by - k * 0.5, bx + k * 0.42, by - k * 0.42); canvas.drawRect(trect3, tp3);
    trect3.set(bx - k * 0.06, by - k * 0.46, bx + k * 0.06, by - k * 0.28); canvas.drawRect(trect3, tp3);
    tp3.color = pc3('#FFD54F'); trect3.set(bx - k * 0.36, by - k * 0.62, bx + k * 0.36, by - k * 0.42); canvas.drawOval(trect3, tp3);
    tp3.color = pc3('#E53950'); canvas.drawCircle(bx + k * 0.12, by - k * 0.56, k * 0.06, tp3);
    tp3.color = pc3('#4FC3F7'); canvas.drawCircle(bx - k * 0.15, by - k * 0.55, k * 0.05, tp3);
    // Éclat qui scintille
    const tw = Math.abs(sin(time * 4));
    ts3.color = Color.WHITE; ts3.strokeWidth = k * 0.02;
    canvas.drawLine(bx + k * 0.25 - k * 0.08 * tw, by - k * 0.75, bx + k * 0.25 + k * 0.08 * tw, by - k * 0.75, ts3);
    canvas.drawLine(bx + k * 0.25, by - k * 0.75 - k * 0.08 * tw, bx + k * 0.25, by - k * 0.75 + k * 0.08 * tw, ts3);
  } else {
    // Nid de brindilles et gros œuf tacheté qui bouge
    tp3.color = pc3('#8A6A3A'); trect3.set(bx - k * 0.5, by - k * 0.18, bx + k * 0.5, by + k * 0.06); canvas.drawOval(trect3, tp3);
    ts3.color = pc3('#5A4020'); ts3.strokeWidth = k * 0.025;
    for (let i = 0; i < 7; i++) { const an = i * 0.9; canvas.drawLine(bx + cos(an) * k * 0.2, by - k * 0.06 + sin(an) * k * 0.05, bx + cos(an) * k * 0.52, by - k * 0.06 + sin(an) * k * 0.12, ts3); }
    canvas.save(); canvas.rotate(sin(time * 3) * 8, bx, by - k * 0.1);
    tp3.color = pc3('#F2EAD0'); trect3.set(bx - k * 0.26, by - k * 0.82, bx + k * 0.26, by - k * 0.08); canvas.drawOval(trect3, tp3);
    tp3.color = Color.argb(160, 120, 140, 90);
    for (const [u, v, rr] of [[-0.1, -0.6, 0.05], [0.1, -0.42, 0.06], [-0.12, -0.28, 0.04], [0.08, -0.7, 0.035]]) canvas.drawCircle(bx + k * u, by + k * v, k * rr, tp3);
    tp3.color = Color.argb(140, 255, 255, 255); canvas.drawCircle(bx - k * 0.1, by - k * 0.66, k * 0.05, tp3);
    canvas.restore();
  }
}

// ---------- Objets dorés : doublons (17), ammonites fossiles (18) ----------
function drawCollectible3(canvas, c, x, y, r, got) {
  if (c >= 19) { drawCollectible4(canvas, c, x, y, r, got); return; }
  tp3.shader = null;
  const gold = pc3('#FFC93C'), goldD = pc3('#C98A00');
  if (got) { tp3.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, tp3); }
  if (c === 17) {
    // Doublon frappé d'une croix
    tp3.color = got ? gold : pc3('#9A9AA2'); canvas.drawCircle(x, y, r, tp3);
    ts3.color = got ? goldD : pc3('#6E6E78'); ts3.strokeWidth = r * 0.1; canvas.drawCircle(x, y, r * 0.78, ts3);
    ts3.strokeWidth = r * 0.16; canvas.drawLine(x, y - r * 0.48, x, y + r * 0.48, ts3); canvas.drawLine(x - r * 0.48, y, x + r * 0.48, y, ts3);
    tp3.color = Color.argb(150, 255, 255, 255); canvas.drawCircle(x - r * 0.38, y - r * 0.42, r * 0.15, tp3);
  } else {
    // Ammonite : coquille en spirale
    tp3.color = got ? gold : pc3('#B8A890'); canvas.drawCircle(x, y, r, tp3);
    ts3.color = got ? goldD : pc3('#7A6A52'); ts3.strokeWidth = r * 0.12;
    tpath3.reset();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, an = t * 4 * Math.PI, rr = r * 0.85 * (1 - t * 0.9);
      const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr;
      if (i === 0) tpath3.moveTo(px, py); else tpath3.lineTo(px, py);
    }
    canvas.drawPath(tpath3, ts3);
    tp3.color = Color.argb(130, 255, 255, 255); canvas.drawCircle(x - r * 0.4, y - r * 0.45, r * 0.13, tp3);
  }
}

// ---------- Décor de secours (si le fond peint manque) et ptérodactyle qui passe ----------
function drawChapterMapBackground3(canvas, c) {
  if (c >= 19) { drawChapterMapBackground4(canvas, c); return; }
  tp3.color = Color.WHITE;
  if (c === 17) {
    tp3.shader = new LinearGradient(0, 0, 0, h * 0.4, [0xFF2B3A78, 0xFFF08A6A, 0xFFFFE2A0], [0, 0.6, 1]); canvas.drawRect(0, 0, w, h * 0.4, tp3);
    tp3.shader = new LinearGradient(0, h * 0.4, 0, h, 0xFF3F7FB0, 0xFF0D2A52); canvas.drawRect(0, h * 0.4, w, h, tp3); tp3.shader = null;
    tp3.color = pc3('#FFF1C4'); canvas.drawCircle(w * 0.5, h * 0.38, w * 0.1, tp3);
  } else {
    tp3.shader = new LinearGradient(0, 0, 0, h, [0xFFF0A868, 0xFFC9D79A, 0xFF5F8A52, 0xFF2A4A2A], [0, 0.4, 0.7, 1]); canvas.drawRect(0, 0, w, h, tp3); tp3.shader = null;
    tp3.color = pc3('#7A5A5A');
    tpath3.reset(); tpath3.moveTo(w * 0.35, h * 0.46); tpath3.lineTo(w * 0.62, h * 0.24); tpath3.lineTo(w * 0.7, h * 0.24); tpath3.lineTo(w, h * 0.44); tpath3.lineTo(w, h * 0.5); tpath3.lineTo(w * 0.35, h * 0.5); tpath3.close();
    canvas.drawPath(tpath3, tp3);
  }
}

/** Ptérodactyle de profil, centré en (x, y), demi-envergure s, tourné vers dir (1 = droite). Ailes qui battent. */
function drawPterodactyl(canvas, x, y, s, dir) {
  const flap = Math.sin(time * 6);
  tp3.shader = null; tp3.color = pc3('#7A4A5A');
  for (const side of [-1, 1]) {
    tpath3.reset();
    tpath3.moveTo(x + side * s * 0.1, y);
    tpath3.quadTo(x + side * s * 0.5, y - s * 0.5 * flap - s * 0.2, x + side * s * 1.1, y - s * 0.1 - s * 0.4 * flap);
    tpath3.quadTo(x + side * s * 0.5, y + s * 0.05, x + side * s * 0.05, y + s * 0.12);
    tpath3.close(); canvas.drawPath(tpath3, tp3);
  }
  tp3.color = pc3('#8A5A6A'); trect3.set(x - s * 0.3, y - s * 0.08, x + s * 0.3, y + s * 0.12); canvas.drawOval(trect3, tp3);
  const hx = x + dir * s * 0.38;
  canvas.drawCircle(hx, y - s * 0.05, s * 0.12, tp3);
  tpath3.reset(); tpath3.moveTo(hx + dir * s * 0.08, y - s * 0.09); tpath3.lineTo(hx + dir * s * 0.45, y - s * 0.01); tpath3.lineTo(hx + dir * s * 0.08, y + s * 0.02); tpath3.close(); canvas.drawPath(tpath3, tp3);
  tpath3.reset(); tpath3.moveTo(hx - dir * s * 0.05, y - s * 0.12); tpath3.lineTo(hx - dir * s * 0.36, y - s * 0.26); tpath3.lineTo(hx - dir * s * 0.02, y - s * 0.02); tpath3.close(); canvas.drawPath(tpath3, tp3);
  tp3.color = pc3('#1B1B1B'); canvas.drawCircle(hx + dir * s * 0.04, y - s * 0.08, s * 0.025, tp3);
}
