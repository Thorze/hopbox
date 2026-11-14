'use strict';
// Chapitres 2 à 8 de l'Aventure (équivalent de ChapterThemes.kt) : chacun reprend le décor et les blocs d'un imprévu.
//  2 baleine (fond sous-marin, corail, méduses)   3 ovni (astéroïdes, soucoupes)   4 hélico (base militaire)
//  5 nucléaire (barils qui coulent)   6 pays des rêves (nuages illusoires)   7 blizzard (banquise, glace)   8 lave
// Carte du chapitre, blocs en jeu, objets dorés, arrivée et petits passages dans le ciel.

const ChapterInfo = {
  HEROES: ['', 'aigle', 'baleine', 'zorg', 'sergent', 'toxik', 'morphee', 'yeti', 'pyro',
    'chronos', 'atlas', 'pixel', 'ramses', 'casperon', 'decibel', 'shinobi', 'chocochou', 'barbecube', 'rexy',
    'nautilus', 'astro', 'billy', 'pepite', 'boumboum', 'maitreombres'],
  GOLDS: ['', 'aigleor', 'leviathan', 'zorgor', 'general', 'plutonium', 'sableor', 'yetior', 'solaire',
    'horloger', 'scarabor', 'arcadeking', 'pharaon', 'spectre', 'legende', 'shogun', 'delice', 'corsaire', 'trexsolaire',
    'empereur', 'astroor', 'desperado', 'mineurdor', 'roichapiteau', 'champion'],
  ICONS: ['', '🥚', '🦪', '⭐', '🎖️', '🧪', '🌙', '❄️', '💎', '⚙️', '🍯', '👾', '☥', '🎃', '💿', '✴️', '👑', '🪙', '🐚', '🔱', '☄️', '🌟', '🔶', '🎟️', '🏆'],
  /** Nombre de chapitres par saison (la liste des chapitres en montre une saison à la fois). */
  PER_SEASON: 8,
  hero(c) { return this.HEROES[clamp(c, 1, Quest.SEASONS)]; },
  goldHero(c) { return this.GOLDS[clamp(c, 1, Quest.SEASONS)]; },
  icon(c) { return this.ICONS[clamp(c, 1, Quest.SEASONS)]; },
  pickupIcon(c) { return { 2: '🫧', 3: '🔷', 6: '🐑', 7: '🧊', 9: '🔩', 10: '🌼', 11: '💾', 13: '🍬', 14: '🎸', 15: '📜', 16: '🍭', 17: '💎', 18: '🦴', 19: '💠', 20: '🔋', 21: '💰', 23: '🎈', 24: '🔮' }[c] || '🪙'; },
};

/** Clé de texte propre au chapitre : « quest.<key> » au chapitre 1, « quest.s<n>.<key> » ensuite. */
function qk(key) { return quest.season <= 1 ? `quest.${key}` : `quest.s${quest.season}.${key}`; }

const cp = new Paint(), cs = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const cpath = new Path(), cpath2 = new Path(), crect = new RectF();
const PCc = (s) => Color.parseColor(s);
const argbMul = (a, c) => Color.argb(clamp(Math.floor(Color.alpha(c) * a), 0, 255), Color.red(c), Color.green(c), Color.blue(c));

// ---------- Sauts : plus flottants sous la mer (2), en gravité lunaire (3), au pays des rêves (6) ----------
function chapterJumpFeel() {
  if (quest.season === 2) { jumpDuration *= 1.18; jumpHeight *= 1.22; }
  else if (quest.season === 3) { jumpDuration *= 1.35; jumpHeight *= 1.5; }
  else if (quest.season === 6) { jumpDuration *= 1.12; jumpHeight *= 1.15; }
  else if (quest.season === 19) { jumpDuration *= 1.12; jumpHeight *= 1.15; }   // sous l'eau
  else if (quest.season === 20) { jumpDuration *= 1.3; jumpHeight *= 1.45; }    // apesanteur
}

// ---------- Blocs en jeu ----------
const CH_CORALS = [0xFFE8A27C, 0xFFD98BA0, 0xFFC9B47E, 0xFF9C8FC4];
const CH_ASTEROIDS = [0xFF8E8A9E, 0xFF7A7590, 0xFF9C94AE, 0xFF6F6A85];
const CH_KAKIS = [0xFF6B7A3A, 0xFF7D8B45, 0xFF5E6B33, 0xFF8C8A6A];
const CH_PASTELS = [0xFFF8C8DC, 0xFFD7C6F5, 0xFFC6E6F5, 0xFFFFF0C2, 0xFFC8F0DC];
const CH_OBSIDIANS = [0xFF2B2630, 0xFF3A2F36, 0xFF332A2E, 0xFF40363A];

/** Apparence du bloc b au chapitre en cours (2 à 8) : { round, color, island, material, kind, blink }. */
function chapterBlockLook(b) {
  if (quest.season >= 9) return chapterBlockLook2(b);
  const c = b.color, k0 = b.kind;
  const L = (round, color, island, material, kind = k0, blink = false) => ({ round, color, island, material, kind, blink });
  const std = (color, mat, round = b.round) => L(round, color, 0, mat);
  if (b.finish) {
    switch (quest.season) {
      case 2: return std(0xFFE8D3A0, 'lisse');
      case 3: return std(0xFF4A4F5C, 'metal', false);
      case 4: return std(0xFF9E9E95, 'granit', false);
      case 5: return std(0xFF8A9099, 'metal', false);
      case 6: return std(0xFFF8C8DC, 'lisse');
      case 7: return std(0xFFE6F4FB, 'lisse');
      default: return std(0xFF5A4A44, 'granit', false);
    }
  }
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  switch (quest.season) {
    case 2:
      if (k0 === Kind.TRAMPOLINE) return L(true, 0xFFFF80C8, PL_JELLY, 'lisse');            // méduse
      if (k0 === Kind.MOVING) return std(0xFF8B5A2B, 'bois', false);                          // coffre d'épave
      if (k0 === Kind.NORMAL) return L(false, CH_CORALS[c % 4], PL_CORAL, 'granit');           // rocher de corail
      return std(CH_CORALS[c % 4], 'granit');
    case 3:
      if (k0 === Kind.NORMAL) return L(false, CH_ASTEROIDS[c % 4], PL_ALIEN, 'granit');        // astéroïde
      if (k0 === Kind.MOVING) return std(0xFF9AA4B5, 'metal', true);                           // mini-soucoupe
      if (k0 === Kind.CRUMBLY) return std(0xFFB0B6C2, 'metal', false);                         // débris de satellite
      return std(0xFF26C6DA, 'lisse');
    case 4:
      if (k0 === Kind.CRUMBLY) return std(0xFFC0392B, 'metal', true);                          // bidon d'essence
      if (k0 === Kind.MOVING) return std(0xFF5E6670, 'metal', false);                          // caisse blindée
      if (k0 === Kind.NORMAL) return c % 3 === 0 ? std(0xFFA7A79E, 'granit', false) : std(CH_KAKIS[c % 4], 'bois', false);
      return std(CH_KAKIS[c % 4], 'bois');
    case 5:
      if (k0 === Kind.NORMAL) return L(true, BARREL_YELLOW, PL_BARREL, 'metal');               // baril chimique
      if (k0 === Kind.CRUMBLY) return L(true, 0xFF9C6B30, PL_BARREL, 'metal');                 // fût rouillé qui coule
      if (k0 === Kind.MOVING) return std(0xFF7A8088, 'metal', true);                           // vanne
      return std(0xFF8A9099, 'metal');
    case 6:
      // Nuage illusoire : il ne s'effrite pas, il clignote (on passe au travers quand il s'efface)
      if (k0 === Kind.CRUMBLY) return L(true, 0xFFFFFFFF, 0, 'lisse', Kind.NORMAL, true);
      if (k0 === Kind.MOVING) return std(0xFF8E5A9E, 'bois', false);                          // livre ancien
      return std(CH_PASTELS[c % 5], 'lisse');
    case 7:
      if (k0 === Kind.NORMAL) return L(false, 0xFFDCEFFB, PL_FLOE, 'lisse');                   // plaque de neige
      if (k0 === Kind.ICE) return L(false, ICE_COLOR, PL_FLOE, 'glace');                       // glaçon
      if (k0 === Kind.MOVING) return std(0xFFB5651D, 'bois', false);                           // caisse d'expédition
      if (k0 === Kind.CRUMBLY) return std(0xFF8D6E63, 'bois', true);                           // rondin enneigé
      return std(0xFFCFE8F5, 'lisse');
    default:
      if (k0 === Kind.MOVING) return std(0xFF8C7F78, 'granit', true);                          // pierre ponce
      if (k0 === Kind.TRAMPOLINE) return std(0xFF5A4A44, 'granit', true);                      // geyser
      return std(CH_OBSIDIANS[c % 4], 'granit');                                               // obsidienne
  }
}

/** Petits détails dessinés sur les blocs « classiques » d'un chapitre (repère du bloc, centre du dessus). */
function drawChapterDeco(canvas, pl) {
  if (pl.theme >= 9) { drawChapterDeco2(canvas, pl); return; }
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a;
  const sin = Math.sin, cos = Math.cos;
  cp.shader = null;
  switch (pl.theme) {
    case 2:
      if (pl.kind === Kind.MOVING) {
        cs.color = PCc('#C9A33A'); cs.strokeWidth = k * 0.05;
        canvas.drawLine(-rx * 0.5, -ry * 0.5, rx * 0.5, ry * 0.5, cs);
        canvas.drawLine(-rx * 0.2, -ry * 0.8, rx * 0.8, ry * 0.2, cs);
        cp.color = PCc('#E8C35A'); canvas.drawCircle(rx * 0.15, ry * 0.15, k * 0.06, cp);
      } else if (pl.kind === Kind.CRUMBLY) {
        cs.color = PCc('#FF80AB'); cs.strokeWidth = k * 0.05;
        canvas.drawLine(rx * 0.4, 0, rx * 0.4, -k * 0.3, cs);
        canvas.drawLine(rx * 0.4, -k * 0.15, rx * 0.55, -k * 0.27, cs);
      }
      break;
    case 3:
      if (pl.kind === Kind.MOVING) {
        cp.color = Color.argb(170, 150, 230, 240);
        crect.set(-rx * 0.35, -ry * 0.35 - k * 0.22, rx * 0.35, ry * 0.2 - k * 0.05); canvas.drawArc(crect, 180, 180, true, cp);
        for (let i = 0; i < 6; i++) {
          const an = i * 1.047 + time, on = (Math.floor(time * 3) + i) % 2 === 0;
          cp.color = on ? PCc('#FFEB3B') : PCc('#FF5252');
          canvas.drawCircle(cos(an) * rx * 0.82, sin(an) * ry * 0.82, k * 0.035, cp);
        }
      } else if (pl.kind === Kind.CRUMBLY) {
        cp.color = PCc('#2E5AAC');
        cpath.reset(); cpath.moveTo(-rx * 0.6, 0); cpath.lineTo(0, -ry * 0.6); cpath.lineTo(rx * 0.3, -ry * 0.3); cpath.lineTo(-rx * 0.3, ry * 0.3); cpath.close();
        canvas.drawPath(cpath, cp);
        cs.color = Color.argb(160, 200, 220, 255); cs.strokeWidth = k * 0.012;
        canvas.drawLine(-rx * 0.45, -ry * 0.15, rx * 0.15, -ry * 0.45, cs);
      } else if (pl.kind === Kind.MINI) drawHoloRing(canvas, rx * 0.9, ry * 0.9, 0);
      break;
    case 4:
      if (pl.kind === Kind.CRUMBLY) {
        cs.color = PCc('#FFD54F'); cs.strokeWidth = k * 0.05;
        crect.set(-rx * 0.6, -ry * 0.6, rx * 0.6, ry * 0.6); canvas.drawOval(crect, cs);
        cp.color = PCc('#7A1F15'); canvas.drawCircle(rx * 0.25, -ry * 0.1, k * 0.07, cp);
      } else if (pl.kind === Kind.MOVING) {
        cp.color = PCc('#3A3F46');
        for (const [u, v] of [[-0.7, 0], [0.7, 0], [0, -0.7], [0, 0.7]]) canvas.drawCircle(u * rx, v * ry, k * 0.035, cp);
      } else if (pl.kind === Kind.NORMAL && pl.material === 'granit') drawHelipadH(canvas, rx, ry, 0.55);
      else if (pl.kind === Kind.NORMAL) {
        cs.color = Color.argb(150, 40, 45, 20); cs.strokeWidth = k * 0.04;
        canvas.drawLine(-rx * 0.6, 0, rx * 0.6, 0, cs);
        canvas.drawLine(0, -ry * 0.6, 0, ry * 0.6, cs);
        textPaint.textSize = k * 0.16; textPaint.color = Color.argb(150, 235, 235, 210);
        canvas.drawText('51', -rx * 0.35, -ry * 0.05, textPaint);
        textPaint.color = Color.WHITE;
      }
      break;
    case 5:
      if (pl.kind === Kind.MOVING) {
        cs.color = PCc('#D32F2F'); cs.strokeWidth = k * 0.06;
        crect.set(-rx * 0.5, -ry * 0.5 - k * 0.08, rx * 0.5, ry * 0.5 - k * 0.08); canvas.drawOval(crect, cs);
        canvas.drawLine(-rx * 0.5, -k * 0.08, rx * 0.5, -k * 0.08, cs);
        canvas.drawLine(0, -ry * 0.5 - k * 0.08, 0, ry * 0.5 - k * 0.08, cs);
      }
      break;
    case 6:
      if (pl.kind === Kind.MOVING) {
        cs.color = PCc('#FFF8E1'); cs.strokeWidth = k * 0.025;
        for (let i = 0; i < 3; i++) canvas.drawLine(-rx * 0.6, ry * (0.1 + i * 0.12), rx * 0.1, ry * (0.5 + i * 0.12), cs);
        cp.color = PCc('#FFD54F'); drawStar(canvas, rx * 0.1, -ry * 0.1, k * 0.09, cp);
      } else {
        const n = pl.blink ? 7 : 4;
        for (let i = 0; i < n; i++) {
          const an = i * 6.283 / n + 0.4;
          cp.color = Color.argb(pl.blink ? 245 : 220, 255, 255, 255);
          canvas.drawCircle(cos(an) * rx * 0.95, sin(an) * ry * 0.95 + k * 0.02, k * (0.12 + 0.04 * (i % 2)), cp);
        }
        if (pl.blink) { cp.color = Color.argb(200, 215, 198, 245); canvas.drawCircle(0, 0, k * 0.12, cp); }
      }
      break;
    case 7:
      if (pl.kind === Kind.MOVING || pl.kind === Kind.CRUMBLY) {
        cp.color = Color.argb(235, 255, 255, 255);
        crect.set(-rx * 0.8, -ry * 0.8 - k * 0.03, rx * 0.8, ry * 0.8 - k * 0.03); canvas.drawOval(crect, cp);
      }
      break;
    case 8:
      if (pl.kind === Kind.TRAMPOLINE) {
        for (let i = 0; i < 4; i++) {
          const q = (time * 0.8 + i * 0.25) % 1;
          cp.color = Color.argb(Math.floor(150 * (1 - q)), 235, 225, 220);
          canvas.drawCircle(sin(q * 5 + i) * k * 0.1, -k * (0.2 + q * 0.9), k * (0.1 + q * 0.15), cp);
        }
      } else if (pl.kind === Kind.MOVING) {
        cp.color = Color.argb(110, 40, 30, 28);
        for (const [u, v] of [[-0.4, 0.1], [0.3, -0.3], [0.2, 0.4]]) canvas.drawCircle(u * rx, v * ry, k * 0.05, cp);
      } else {
        const f = pl.crumbleT < 0 ? 0 : clamp(pl.crumbleT / pl.crumbleDur, 0, 1);
        const glow = 0.55 + 0.25 * Math.abs(sin(time * 2.5 + pl.cx)) + 0.2 * f;
        cs.color = Color.argb(Math.floor(255 * glow), 255, 122 + Math.floor(80 * f), 31);
        cs.strokeWidth = k * (0.035 + 0.03 * f);
        cpath.reset();
        cpath.moveTo(-rx * 0.7, -ry * 0.05); cpath.lineTo(-rx * 0.25, ry * 0.15); cpath.lineTo(rx * 0.05, -ry * 0.25); cpath.lineTo(rx * 0.55, ry * 0.1);
        cpath.moveTo(-rx * 0.25, ry * 0.15); cpath.lineTo(-rx * 0.1, ry * 0.6);
        canvas.drawPath(cpath, cs);
      }
      break;
  }
}

/** « H » d'héliport dans un cercle, posé à plat. */
function drawHelipadH(canvas, rx, ry, s) {
  cs.color = Color.argb(220, 255, 214, 0); cs.strokeWidth = k * 0.04;
  crect.set(-rx * s * 1.2, -ry * s * 1.2, rx * s * 1.2, ry * s * 1.2); canvas.drawOval(crect, cs);
  cs.color = Color.WHITE; cs.strokeWidth = k * 0.06;
  const ux = rx * s * 0.5, uy = ry * s * 0.5;
  canvas.drawLine(-ux - uy * 0.9, -uy + ux * 0.25, -ux + uy * 0.9, uy * 0.2 + ux * 0.25 - uy, cs);
  canvas.drawLine(ux - uy * 0.9, uy - ux * 0.25 - uy * 0.4, ux + uy * 0.9, uy * 1.2 - ux * 0.25, cs);
  canvas.drawLine(-ux * 0.55, -uy * 0.1, ux * 0.55, uy * 0.1, cs);
}

/** Anneau holographique turquoise qui tourne (posé à plat, centré en (0, dy)). */
function drawHoloRing(canvas, rx, ry, dy) {
  for (let i = 0; i < 2; i++) {
    const q = (time * 0.6 + i * 0.5) % 1, s = 0.6 + 0.5 * q;
    cs.color = Color.argb(Math.floor(200 * (1 - q)), 80, 240, 230); cs.strokeWidth = k * 0.03;
    crect.set(-rx * s, dy - ry * s, rx * s, dy + ry * s); canvas.drawOval(crect, cs);
  }
}

/** Objet à ramasser à la place de la pièce (bulle, cristal, mouton, glaçon) ; false = pièce classique. */
function drawChapterPickup(canvas, cy, shadow) {
  if (quest.active && quest.season >= 9) return drawChapterPickup2(canvas, cy, shadow);
  if (!quest.active || ![2, 3, 6, 7].includes(quest.season)) return false;
  const r = k * 0.19;
  cp.shader = null;
  if (shadow) { cp.color = Color.argb(45, 0, 0, 0); crect.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(crect, cp); }
  if (quest.season === 2) {
    cp.color = Color.argb(90, 180, 235, 255); canvas.drawCircle(0, cy, r, cp);
    cs.color = Color.argb(230, 230, 250, 255); cs.strokeWidth = k * 0.025; canvas.drawCircle(0, cy, r, cs);
    cp.color = Color.argb(230, 255, 255, 255); canvas.drawCircle(-r * 0.35, cy - r * 0.35, r * 0.2, cp);
    textPaint.textSize = r * 0.75; textPaint.color = Color.argb(220, 30, 90, 150);
    canvas.drawText('O₂', 0, cy + r * 0.28, textPaint); textPaint.color = Color.WHITE;
  } else if (quest.season === 3) {
    const spin = Math.max(0.25, Math.abs(Math.cos(time * 2.5)));
    cp.color = Color.argb(70, 120, 255, 230); canvas.drawCircle(0, cy, r * 1.4, cp);
    cpath.reset(); cpath.moveTo(0, cy - r * 1.2); cpath.lineTo(r * 0.6 * spin, cy); cpath.lineTo(0, cy + r * 1.2); cpath.lineTo(-r * 0.6 * spin, cy); cpath.close();
    cp.color = PCc('#4DF5D8'); canvas.drawPath(cpath, cp);
    cpath.reset(); cpath.moveTo(0, cy - r * 1.2); cpath.lineTo(r * 0.25 * spin, cy - r * 0.1); cpath.lineTo(0, cy + r * 0.2); cpath.close();
    cp.color = Color.argb(200, 220, 255, 250); canvas.drawPath(cpath, cp);
  } else if (quest.season === 6) drawSheep(canvas, 0, cy + r * 0.6, r * 1.1, Math.sin(time * 3) * 0.1);
  else {
    const s = r * 0.8;
    const face = (c, pts) => { cp.color = c; cpath.reset(); cpath.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) cpath.lineTo(pts[i], pts[i + 1]); cpath.close(); canvas.drawPath(cpath, cp); };
    face(Color.argb(200, 200, 235, 250), [0, cy - s, s * 0.87, cy - s * 0.5, 0, cy, -s * 0.87, cy - s * 0.5]);
    face(Color.argb(200, 140, 200, 235), [-s * 0.87, cy - s * 0.5, 0, cy, 0, cy + s, -s * 0.87, cy + s * 0.5]);
    face(Color.argb(200, 110, 175, 220), [s * 0.87, cy - s * 0.5, 0, cy, 0, cy + s, s * 0.87, cy + s * 0.5]);
    cs.color = Color.argb(230, 255, 255, 255); cs.strokeWidth = k * 0.015;
    canvas.drawLine(-s * 0.4, cy - s * 0.55, s * 0.1, cy - s * 0.8, cs);
  }
  return true;
}

/** Petit mouton (pieds en (x, y), taille s) : laine blanche, tête noire. */
function drawSheep(canvas, x, y, s, tilt) {
  cp.shader = null; cp.color = PCc('#3A3A46');
  for (const dx of [-0.35, 0.25]) canvas.drawRect(x + dx * s, y - s * 0.3, x + (dx + 0.1) * s, y, cp);
  cp.color = Color.WHITE;
  for (const [dx, dy, rr] of [[-0.3, -0.5, 0.28], [0.05, -0.6, 0.32], [0.3, -0.48, 0.26], [0, -0.38, 0.3]]) canvas.drawCircle(x + dx * s, y + dy * s, rr * s, cp);
  cp.color = PCc('#3A3A46');
  crect.set(x + s * 0.4, y - s * (0.72 + tilt), x + s * 0.75, y - s * (0.42 + tilt)); canvas.drawOval(crect, cp);
  cp.color = Color.WHITE; canvas.drawCircle(x + s * 0.62, y - s * (0.6 + tilt), s * 0.05, cp);
}

/** Arrivée d'un niveau de chapitre (repère du bloc) ; au niveau 15, le personnage du chapitre attend. */
function drawChapterFinish(canvas, p) {
  const last = quest.level >= Quest.LEVELS && quest.level !== Quest.LEGEND;
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  const rx = 1.2247449 * k * p.half, ry = 0.70710677 * k * p.half, sin = Math.sin;
  cp.shader = null;
  if (quest.season >= 9) drawChapterFinish2(canvas, p);
  else switch (quest.season) {
    case 2: {
      const r = k * 0.5;
      cp.color = PCc('#C98BB0'); crect.set(bx - r, by - r * 0.3, bx + r, by + r * 0.35); canvas.drawOval(crect, cp);
      cp.color = PCc('#4A2246'); crect.set(bx - r * 0.75, by - r * 0.2, bx + r * 0.75, by + r * 0.15); canvas.drawOval(crect, cp);
      drawPearl(canvas, bx, by - r * 0.15, r * 0.28, true);
      const open = 0.3 + 0.1 * sin(time * 2);
      cp.color = PCc('#E0A8C8'); crect.set(bx - r, by - r * (1.1 + open), bx + r, by - r * 0.1); canvas.drawArc(crect, 180, 180, true, cp);
      cs.color = PCc('#B57A9E'); cs.strokeWidth = k * 0.025;
      for (let i = 1; i <= 4; i++) canvas.drawLine(bx, by - r * 0.1, bx - r + i * r * 0.4, by - r * (1.0 + open), cs);
      break;
    }
    case 3:
      drawHoloRing(canvas, rx * 0.8, ry * 0.8, 0);
      cp.color = Color.argb(Math.floor(70 + 40 * Math.abs(sin(time * 3))), 120, 255, 220);
      canvas.drawRect(-rx * 0.35, -k * 1.8, rx * 0.35, 0, cp);
      drawCollectible(canvas, 3, 0, -k * 1.2 + sin(time * 2) * k * 0.08, k * 0.25, true);
      break;
    case 4: {
      drawHelipadH(canvas, rx, ry, 0.6);
      questStroke.color = PCc('#9E9E9E'); questStroke.strokeWidth = k * 0.05;
      canvas.drawLine(bx, by, bx, by - k * 1.4, questStroke);
      const sway = sin(time * 3) * k * 0.08;
      cp.color = PCc('#FF6D00');
      cpath.reset(); cpath.moveTo(bx, by - k * 1.4); cpath.lineTo(bx + k * 0.7, by - k * 1.3 + sway); cpath.lineTo(bx + k * 0.7, by - k * 1.18 + sway); cpath.lineTo(bx, by - k * 1.2); cpath.close();
      canvas.drawPath(cpath, cp);
      cp.color = Color.WHITE;
      cpath.reset(); cpath.moveTo(bx + k * 0.25, by - k * 1.37 + sway * 0.3); cpath.lineTo(bx + k * 0.45, by - k * 1.34 + sway * 0.6);
      cpath.lineTo(bx + k * 0.45, by - k * 1.2 + sway * 0.6); cpath.lineTo(bx + k * 0.25, by - k * 1.21 + sway * 0.3); cpath.close();
      canvas.drawPath(cpath, cp);
      break;
    }
    case 5:
      questStroke.color = PCc('#5D5D5D'); questStroke.strokeWidth = k * 0.05;
      canvas.drawLine(bx, by, bx, by - k * 1.4, questStroke);
      cp.color = PCc('#FFD600'); crect.set(bx - k * 0.35, by - k * 1.75, bx + k * 0.35, by - k * 1.1);
      canvas.drawRoundRect(crect, k * 0.06, k * 0.06, cp);
      drawTrefoilAt(canvas, bx, by - k * 1.42, k * 0.25);
      break;
    case 6:
      cp.color = Color.WHITE; crect.set(bx - k * 0.55, by - k * 0.35, bx + k * 0.55, by + k * 0.12);
      canvas.drawRoundRect(crect, k * 0.2, k * 0.2, cp);
      cs.color = PCc('#D7C6F5'); cs.strokeWidth = k * 0.02; canvas.drawRoundRect(crect, k * 0.2, k * 0.2, cs);
      drawMoon(canvas, bx, by - k * 0.7 + sin(time * 2) * k * 0.05, k * 0.28, true);
      break;
    case 7: {
      const r = k * 0.55;
      cp.color = PCc('#F4FAFF'); crect.set(bx - r, by - r, bx + r, by + r); canvas.drawArc(crect, 180, 180, true, cp);
      cs.color = PCc('#B9D6EA'); cs.strokeWidth = k * 0.02;
      for (let i = 1; i <= 2; i++) canvas.drawLine(bx - r * (1 - i * 0.12), by - r * i * 0.33, bx + r * (1 - i * 0.12), by - r * i * 0.33, cs);
      canvas.drawArc(crect, 180, 180, false, cs);
      cp.color = PCc('#3A5A78'); crect.set(bx + r * 0.1, by - r * 0.45, bx + r * 0.55, by + r * 0.45); canvas.drawArc(crect, 180, 180, true, cp);
      break;
    }
    default:
      cp.color = PCc('#3A2F36'); canvas.drawRect(bx - k * 0.3, by - k * 0.55, bx + k * 0.3, by, cp);
      cp.color = PCc('#5A4A44'); canvas.drawRect(bx - k * 0.4, by - k * 0.65, bx + k * 0.4, by - k * 0.5, cp);
      drawGem(canvas, bx, by - k * 0.95 + sin(time * 2) * k * 0.05, k * 0.25, true);
  }
  if (last) {
    const hop = Math.abs(sin(time * 3)) * k * 0.15;
    const hx = isoX(-p.half * 0.55, p.half * 0.55), hy = isoY(-p.half * 0.55, 0, p.half * 0.55);
    drawHeroAt(canvas, ChapterInfo.hero(quest.season), hx, hy - hop, 0.95, true);
    textPaint.textSize = k * 0.32;
    canvas.drawText('👋', hx + k * 0.5, hy - k * 1.2, textPaint);
  }
}

/** Logo radioactif (trèfle noir sur fond jaune) centré en (x, y). */
function drawTrefoilAt(canvas, x, y, r) {
  cp.shader = null; cp.color = PCc('#1B1B1B');
  canvas.drawCircle(x, y, r * 0.18, cp);
  crect.set(x - r, y - r, x + r, y + r);
  for (let i = 0; i < 3; i++) canvas.drawArc(crect, -90 + i * 120 - 30, 60, true, cp);
  cp.color = PCc('#FFD600'); canvas.drawCircle(x, y, r * 0.3, cp);
  cp.color = PCc('#1B1B1B'); canvas.drawCircle(x, y, r * 0.18, cp);
}

// ---------- Décor derrière les blocs pendant un niveau ----------

/** Fond d'un niveau de chapitre (2 à 8) à la place du ciel ; false au chapitre 1 et hors Aventure. */
function drawChapterBackdrop(canvas) {
  if (!quest.active || quest.season <= 1) return false;
  // Son d'ambiance du chapitre (insectes, vent de sable…) ; au chapitre 7, drawWeather s'en charge
  if (quest.season !== 7) sounds.setAmbient(ambientSound());
  // Fond peint du chapitre (mapart.js), avec ce qui passe au loin ; l'ancien décor tant que l'image se charge.
  // Chapitres 5, 7 et 8 : toujours la scène de l'imprévu (lac radioactif, banquise, volcan au-dessus de la lave)
  if (![5, 7, 8].includes(quest.season) && drawSceneBackground(canvas, quest.season, true)) {
    if (quest.season === 2) drawSeaLife(canvas);
    if (quest.season === 3) drawSpaceLife(canvas);
    if (quest.season >= 4) drawChapterAmbient(canvas);
    if (quest.season <= 4 || quest.season === 10 || [18, 19, 20, 23].includes(quest.season)) drawChapterFlyer(canvas);
    if (quest.season === 7) drawWeather(canvas, Theme.sky(skyScore()));
    return true;
  }
  const d = quest.spec ? quest.spec.difficulty : 0;
  switch (quest.season) {
    case 2: {
      const dt = sea.lastT < 0 ? 0 : Math.min(0.1, time - sea.lastT);
      sea.lastT = time;
      drawSeaScene(canvas, -camX, 1, dt);
      drawSeaLife(canvas);
      drawChapterFlyer(canvas);
      // Plus on est profond (premiers niveaux), moins on y voit
      cp.shader = null; cp.color = Color.argb(Math.floor(120 * (1 - d)), 4, 14, 40); canvas.drawRect(0, 0, w, h, cp);
      break;
    }
    case 3: drawAlienScene(canvas, -camX, 1); drawSpaceLife(canvas); drawChapterFlyer(canvas); break;
    case 4: drawBaseScene(canvas, -camX, 1); drawChapterFlyer(canvas); drawSearchlights(canvas, h * 0.55, 0.6); break;
    case 5: drawNukeScene(canvas, -camX, 1); break;
    case 6: drawDreamScene(canvas, -camX * 0.05, 1); break;
    case 7:
      drawPolarScene(canvas, -camX, 1);
      drawAurora(canvas, h * 0.02, h * 0.22, 0.45 + 0.4 * d);
      drawWeather(canvas, Theme.sky(skyScore()));
      break;
    case 8: drawLavaBackdrop(canvas); drawEmbers(canvas, 1); break;
    // Chapitres 9 à 16 : le décor de la carte du chapitre
    default: drawChapterMapBackground2(canvas, quest.season); if (quest.season === 10) drawChapterFlyer(canvas);
  }
  if (quest.season >= 4) drawChapterAmbient(canvas);
  return true;
}

/** Ce qui passe au loin de temps en temps (minuteur de l'aigle, questtheme.js) : baleine, soucoupe, hélicoptère, abeille. */
function drawChapterFlyer(canvas) {
  if (quest.eagleT < 0) return;
  const f = quest.eagleT / 7, dir = quest.eagleDir;
  const x = dir > 0 ? -w * 0.2 + f * w * 1.4 : w * 1.2 - f * w * 1.4;
  if (quest.season === 2) drawWhale(canvas, x, h * (0.3 + 0.03 * Math.sin(f * 6)), w * 0.05, dir);
  else if (quest.season === 3) drawUfo(canvas, x, h * (0.14 + 0.03 * Math.sin(f * 9)), w * 0.06);
  else if (quest.season === 4) drawHelicopterDir(canvas, x, h * (0.16 + 0.02 * Math.sin(f * 5)), w * 0.045, 8, dir);
  // Jardin géant : une abeille passe en zigzaguant (on est minuscule, elle paraît énorme)
  else if (quest.season === 10) drawBee(canvas, x, h * (0.22 + 0.04 * Math.sin(f * 14) + 0.01 * Math.sin(time * 23)), w * 0.05, dir);
  // Préhistoire : un ptérodactyle plane en battant des ailes
  else if (quest.season === 18) drawPterodactyl(canvas, x, h * (0.18 + 0.03 * Math.sin(f * 5)), w * 0.06, dir);
  else if (quest.season === 19) drawWhale(canvas, x, h * (0.28 + 0.03 * Math.sin(f * 6)), w * 0.05, dir);   // Abysse veille sur toi
  else if (quest.season === 20) drawSkyComet(canvas, x, h * (0.12 + 0.1 * f), w * 0.05, dir);
  else if (quest.season === 23) drawHotAirBalloon(canvas, x, h * (0.2 + 0.02 * Math.sin(f * 4)), w * 0.05);
}

/** Abeille vue de profil, centrée en (x, y), demi-longueur s, tournée vers dir (1 = droite). Ailes qui battent. */
function drawBee(canvas, x, y, s, dir) {
  canvas.save();
  canvas.scale(dir < 0 ? -1 : 1, 1, x, y);
  cp.shader = null;
  // Ailes (derrière), battement rapide
  const flap = Math.abs(Math.sin(time * 38));
  cp.color = Color.argb(140, 225, 240, 255);
  canvas.drawOval(new RectF(x - s * 0.55, y - s * (0.35 + 0.55 * flap) - s * 0.35, x + s * 0.05, y - s * 0.25), cp);
  canvas.drawOval(new RectF(x - s * 0.2, y - s * (0.3 + 0.45 * flap) - s * 0.3, x + s * 0.35, y - s * 0.25), cp);
  // Dard
  cp.color = Color.parseColor('#2B2B2B');
  cpath.reset(); cpath.moveTo(x - s * 0.7, y - s * 0.08); cpath.lineTo(x - s * 0.98, y + s * 0.02); cpath.lineTo(x - s * 0.7, y + s * 0.12); cpath.close();
  canvas.drawPath(cpath, cp);
  // Corps jaune et rayures noires (hauteur des rayures = celle de l'ovale à cet endroit)
  const a = s * 0.75, b = s * 0.42;
  cp.color = Color.parseColor('#FFC93C');
  canvas.drawOval(new RectF(x - a, y - b, x + a, y + b), cp);
  cp.color = Color.parseColor('#2B2B2B');
  for (const u of [-0.45, -0.05, 0.35]) {
    const hh = b * Math.sqrt(1 - u * u) * 0.97;
    canvas.drawRect(new RectF(x + u * a - s * 0.09, y - hh, x + u * a + s * 0.09, y + hh), cp);
  }
  // Tête et œil
  canvas.drawCircle(x + s * 0.82, y - s * 0.05, s * 0.3, cp);
  cp.color = Color.WHITE; canvas.drawCircle(x + s * 0.9, y - s * 0.12, s * 0.1, cp);
  cp.color = Color.parseColor('#2B2B2B'); canvas.drawCircle(x + s * 0.93, y - s * 0.12, s * 0.05, cp);
  // Antenne
  cs.strokeWidth = s * 0.06; cs.color = Color.parseColor('#2B2B2B');
  canvas.drawLine(x + s * 0.85, y - s * 0.3, x + s * 1.05, y - s * 0.6, cs);
  canvas.restore();
}

/** Faisceaux des projecteurs qui balaient l'écran (miradors de la base). */
function drawSearchlights(canvas, baseY, alpha) {
  cp.shader = null;
  for (let i = 0; i < 2; i++) {
    const ox = w * (0.15 + 0.7 * i), a = Math.sin(time * (0.45 + 0.15 * i) + i * 2) * 0.6, len = h * 0.9;
    const tx = ox + Math.sin(a) * len, ty = baseY - Math.cos(a) * len, spread = w * 0.12;
    cpath.reset(); cpath.moveTo(ox, baseY);
    cpath.lineTo(tx - spread * Math.cos(a), ty - spread * Math.sin(a));
    cpath.lineTo(tx + spread * Math.cos(a), ty + spread * Math.sin(a)); cpath.close();
    cp.color = Color.argb(Math.floor(55 * alpha), 255, 255, 230); canvas.drawPath(cpath, cp);
    cp.color = Color.argb(Math.floor(220 * alpha), 255, 255, 220); canvas.drawCircle(ox, baseY, w * 0.012, cp);
  }
}

/** Aurore boréale : rubans verts et turquoise qui ondulent entre top et bottom. */
function drawAurora(canvas, top, bottom, alpha) {
  cp.shader = null;
  for (let band = 0; band < 3; band++) {
    const n = 16, yAt = (i) => top + (bottom - top) * (0.4 + 0.3 * Math.sin(i * 0.7 + time * 0.5 + band * 1.3));
    cpath.reset();
    for (let i = 0; i <= n; i++) { const x = w * i / n; if (i === 0) cpath.moveTo(x, yAt(i)); else cpath.lineTo(x, yAt(i)); }
    for (let i = n; i >= 0; i--) cpath.lineTo(w * i / n, yAt(i) + h * (0.05 + 0.02 * band));
    cpath.close();
    cp.color = argbMul(alpha * (0.35 - band * 0.08), band === 1 ? 0xFF4DD0E1 : 0xFF69F0AE);
    canvas.drawPath(cpath, cp);
  }
}

/** Pluie de braises ardentes. */
function drawEmbers(canvas, alpha) {
  cp.shader = null;
  for (let i = 0; i < 22; i++) {
    const q = (time * (0.08 + 0.04 * (i % 3)) + hash01(i)) % 1;
    const x = w * ((hash01(i * 3 + 1) + Math.sin(time * 0.7 + i) * 0.03 + 1) % 1);
    cp.color = argbMul(alpha * (0.5 + 0.5 * Math.abs(Math.sin(time * 6 + i))), i % 2 === 0 ? 0xFFFF9F1C : 0xFFFFD54F);
    canvas.drawCircle(x, h * q, w * (0.004 + 0.003 * (i % 3)), cp);
  }
}

/** Pays des rêves : ciel pastel étoilé, grand croissant de lune endormi, horloges molles, poussière d'étoiles. */
function drawDreamScene(canvas, scroll, alpha) {
  cp.color = Color.WHITE;
  cp.shader = new LinearGradient(0, 0, 0, h, [0xFF2E2A5A, 0xFF8E7CC3, 0xFFF3B6CF, 0xFFFFE3EC], [0, 0.4, 0.78, 1]);
  canvas.drawRect(0, 0, w, h, cp);
  cp.shader = null;
  for (let i = 0; i < 40; i++) {
    cp.color = argbMul(alpha * (0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i))), 0xFFFFFFFF);
    canvas.drawCircle(w * hash01(i * 7 + 3), h * 0.55 * hash01(i * 13 + 5), w * (0.002 + 0.003 * hash01(i)), cp);
  }
  drawSleepyMoon(canvas, w * 0.78, h * 0.13, w * 0.11);
  const span = w * 1.4;
  for (let i = 0; i < 5; i++) {
    const x = ((w * (i * 0.31) + scroll * (0.5 + i * 0.1) + time * w * 0.01) % span + span) % span - w * 0.2;
    const y = h * (0.5 + 0.08 * (i % 3));
    cp.color = argbMul(alpha * 0.7, i % 2 === 0 ? 0xFFFFFFFF : 0xFFFFD6E8);
    for (let j = 0; j < 4; j++) canvas.drawCircle(x + j * w * 0.06, y - (j % 2 === 1 ? w * 0.025 : 0), w * 0.05, cp);
  }
  for (let i = 0; i < 3; i++) {
    const x = w * (0.15 + 0.33 * i) + Math.sin(time * 0.4 + i) * w * 0.04;
    const y = h * (0.3 + 0.1 * (i % 2)) + Math.cos(time * 0.5 + i) * h * 0.02;
    drawSoftClock(canvas, x, y, w * 0.055, Math.sin(time * 0.3 + i) * 15);
  }
  for (let i = 0; i < 18; i++) {
    const q = (time * 0.05 + hash01(i * 5)) % 1;
    cp.color = argbMul(alpha * (1 - q), 0xFFFFF59D);
    canvas.drawCircle(w * hash01(i * 11 + 2) + Math.sin(time + i) * w * 0.02, h * q, w * 0.004, cp);
  }
}

/** Horloge molle (montre qui fond). */
function drawSoftClock(canvas, x, y, r, angle) {
  canvas.save(); canvas.rotate(angle, x, y);
  cpath.reset();
  cpath.moveTo(x - r, y);
  cpath.cubicTo(x - r, y - r * 1.1, x + r, y - r * 1.1, x + r, y);
  cpath.cubicTo(x + r, y + r * 0.5, x + r * 0.4, y + r * 0.6, x + r * 0.3, y + r * 1.4);
  cpath.cubicTo(x + r * 0.1, y + r * 1.6, x - r * 0.2, y + r * 0.8, x - r * 0.5, y + r * 0.7);
  cpath.cubicTo(x - r, y + r * 0.6, x - r, y + r * 0.3, x - r, y);
  cpath.close();
  cp.shader = null; cp.color = PCc('#FFD54F'); canvas.drawPath(cpath, cp);
  cp.color = PCc('#FFF8E1'); canvas.save(); canvas.scale(0.82, 0.82, x, y); canvas.drawPath(cpath, cp); canvas.restore();
  cs.color = PCc('#5D4037'); cs.strokeWidth = r * 0.08;
  canvas.drawLine(x, y, x, y - r * 0.55, cs);
  canvas.drawLine(x, y, x + r * 0.4, y + r * 0.1, cs);
  canvas.restore();
}

/** Grand croissant de lune endormi avec son bonnet de nuit. */
function drawSleepyMoon(canvas, x, y, r) {
  cp.shader = null; cp.color = Color.argb(60, 255, 245, 200); canvas.drawCircle(x, y, r * 1.5, cp);
  drawMoon(canvas, x, y, r, true, true);
  cs.color = PCc('#8D6E3F'); cs.strokeWidth = r * 0.06;
  crect.set(x - r * 0.62, y - r * 0.2, x - r * 0.32, y + r * 0.05); canvas.drawArc(crect, 0, 180, false, cs);
  cp.color = PCc('#3F6FD8');
  cpath.reset(); cpath.moveTo(x - r * 0.75, y - r * 0.55); cpath.lineTo(x - r * 0.05, y - r * 0.95); cpath.lineTo(x + r * 0.5, y - r * 1.4); cpath.close();
  canvas.drawPath(cpath, cp);
  cp.color = Color.WHITE; canvas.drawCircle(x + r * 0.5, y - r * 1.4, r * 0.12, cp);
  const q = (time * 0.4) % 1;
  textPaint.textSize = r * (0.35 + 0.2 * q); textPaint.alpha = Math.floor(255 * (1 - q));
  canvas.drawText('Z', x - r * 1.1 - q * r * 0.6, y - r * 0.6 - q * r, textPaint);
  textPaint.alpha = 255;
}

// ---------- Objets dorés (carte, fiche du niveau, écran de fin) ----------

/** Objet doré du chapitre c centré en (x, y), demi-hauteur r : doré si gagné, éteint sinon. */
function drawCollectible(canvas, c, x, y, r, got) {
  cp.shader = null;
  switch (c) {
    case 2: drawPearl(canvas, x, y, r * 0.8, got); break;
    case 3:
      if (got) { cp.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, cp); }
      cp.color = got ? PCc('#FFC93C') : PCc('#4A5578'); drawStar(canvas, x, y, r * 1.05, cp);
      cp.color = got ? Color.argb(200, 255, 248, 210) : Color.argb(90, 200, 210, 240); drawStar(canvas, x - r * 0.12, y - r * 0.15, r * 0.45, cp);
      break;
    case 4: {
      cs.color = got ? PCc('#C98A00') : PCc('#7D838C'); cs.strokeWidth = r * 0.08;
      canvas.drawLine(x, y - r * 0.75, x - r * 0.3, y - r * 1.2, cs);
      canvas.drawLine(x, y - r * 0.75, x + r * 0.3, y - r * 1.2, cs);
      cp.color = got ? PCc('#FFC93C') : PCc('#B0B6C0');
      crect.set(x - r * 0.55, y - r * 0.85, x + r * 0.55, y + r * 0.85); canvas.drawRoundRect(crect, r * 0.3, r * 0.3, cp);
      cs.color = got ? PCc('#C98A00') : PCc('#80868F'); cs.strokeWidth = r * 0.07; canvas.drawRoundRect(crect, r * 0.3, r * 0.3, cs);
      cp.color = got ? PCc('#8A5A00') : PCc('#6B717A');
      canvas.drawCircle(x, y - r * 0.6, r * 0.1, cp);
      for (let i = 0; i < 3; i++) canvas.drawRect(x - r * 0.35, y - r * 0.25 + i * r * 0.3, x + r * (0.35 - 0.12 * i), y - r * 0.15 + i * r * 0.3, cp);
      break;
    }
    case 5:
      if (got) { cp.color = Color.argb(70, 255, 230, 90); canvas.drawCircle(x, y + r * 0.25, r * 1.2, cp); }
      cp.color = got ? PCc('#FFD54F') : Color.argb(110, 200, 235, 255);
      canvas.drawCircle(x, y + r * 0.3, r * 0.62, cp);
      canvas.drawRect(x - r * 0.2, y - r * 0.9, x + r * 0.2, y, cp);
      cs.color = got ? PCc('#C98A00') : Color.argb(200, 160, 190, 210); cs.strokeWidth = r * 0.08;
      canvas.drawCircle(x, y + r * 0.3, r * 0.62, cs);
      canvas.drawLine(x - r * 0.2, y - r * 0.9, x - r * 0.2, y - r * 0.22, cs);
      canvas.drawLine(x + r * 0.2, y - r * 0.9, x + r * 0.2, y - r * 0.22, cs);
      cp.color = PCc('#8D6E63'); crect.set(x - r * 0.26, y - r * 1.1, x + r * 0.26, y - r * 0.88); canvas.drawRoundRect(crect, r * 0.05, r * 0.05, cp);
      cp.color = Color.argb(200, 255, 255, 255); canvas.drawCircle(x - r * 0.22, y + r * 0.12, r * 0.12, cp);
      break;
    case 6: drawMoon(canvas, x, y, r * 0.9, got); break;
    case 7:
      cs.color = got ? PCc('#FFC93C') : PCc('#9FD3F0'); cs.strokeWidth = r * 0.16;
      for (let i = 0; i < 6; i++) {
        const an = i * 1.047, mx = x + Math.cos(an) * r * 0.6, my = y + Math.sin(an) * r * 0.6;
        canvas.drawLine(x, y, x + Math.cos(an) * r, y + Math.sin(an) * r, cs);
        canvas.drawLine(mx, my, mx + Math.cos(an + 0.7) * r * 0.3, my + Math.sin(an + 0.7) * r * 0.3, cs);
        canvas.drawLine(mx, my, mx + Math.cos(an - 0.7) * r * 0.3, my + Math.sin(an - 0.7) * r * 0.3, cs);
      }
      if (got) { cp.color = PCc('#FFF3B0'); canvas.drawCircle(x, y, r * 0.18, cp); }
      break;
    case 8: drawGem(canvas, x, y, r, got); break;
    default: if (c >= 9) drawCollectible2(canvas, c, x, y, r, got); else drawMedalEgg(canvas, x, y, r, got);
  }
}

function drawPearl(canvas, x, y, r, got) {
  cp.shader = null;
  if (got) { cp.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.35, cp); }
  cp.color = got ? PCc('#FFC93C') : PCc('#F3EEF5'); canvas.drawCircle(x, y, r, cp);
  cp.color = got ? PCc('#E0A81E') : PCc('#D9CFE0'); canvas.drawCircle(x + r * 0.15, y + r * 0.15, r * 0.8, cp);
  cp.color = got ? PCc('#FFD54F') : PCc('#FBF8FC'); canvas.drawCircle(x - r * 0.05, y - r * 0.05, r * 0.75, cp);
  cp.color = Color.argb(220, 255, 255, 255); canvas.drawCircle(x - r * 0.35, y - r * 0.35, r * 0.22, cp);
}

/** Croissant de lune (argenté, ou doré s'il est gagné) : le disque moins un disque décalé (découpe pair-impair). */
function drawMoon(canvas, x, y, r, got, pale = false) {
  cp.shader = null;
  if (got && !pale) { cp.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x - r * 0.2, y, r * 1.2, cp); }
  canvas.save();
  cpath2.reset(); cpath2.addCircle(x, y, r); canvas.clipPath(cpath2);
  cpath.reset(); cpath.addCircle(x, y, r); cpath.addCircle(x + r * 0.45, y - r * 0.25, r * 0.85); cpath.fillType = 'evenodd';
  cp.color = pale ? PCc('#FFF3C4') : got ? PCc('#FFC93C') : PCc('#C9CED8');
  canvas.drawPath(cpath, cp);
  cs.color = pale ? PCc('#E8CF7A') : got ? PCc('#C98A00') : PCc('#9AA1AE'); cs.strokeWidth = r * 0.08;
  canvas.drawPath(cpath, cs);
  cpath.fillType = 'nonzero';
  canvas.restore();
}

/** Gemme volcanique hexagonale : charbon éteint, ou gemme d'or incandescente. */
function drawGem(canvas, x, y, r, got) {
  cp.shader = null;
  if (got) { cp.color = Color.argb(80, 255, 150, 40); canvas.drawCircle(x, y, r * 1.35, cp); }
  const hex = () => {
    cpath.reset();
    for (let i = 0; i < 6; i++) {
      const an = i * 1.047 - 1.5708, px0 = x + Math.cos(an) * r * 0.85, py0 = y + Math.sin(an) * r;
      if (i === 0) cpath.moveTo(px0, py0); else cpath.lineTo(px0, py0);
    }
    cpath.close();
  };
  hex(); cp.color = got ? PCc('#FFB300') : PCc('#3B3236'); canvas.drawPath(cpath, cp);
  cpath.reset(); cpath.moveTo(x, y - r); cpath.lineTo(x + r * 0.42, y - r * 0.2); cpath.lineTo(x, y + r * 0.2); cpath.lineTo(x - r * 0.42, y - r * 0.2); cpath.close();
  cp.color = got ? PCc('#FFE082') : PCc('#55494E'); canvas.drawPath(cpath, cp);
  hex(); cs.color = got ? PCc('#E65100') : PCc('#241E21'); cs.strokeWidth = r * 0.08; canvas.drawPath(cpath, cs);
}

// ---------- Carte du chapitre ----------

function drawBubblesUp(canvas, n) {
  for (let i = 0; i < n; i++) {
    const q = (time * 0.08 * (0.6 + (i % 4) * 0.2) + i * 0.137) % 1;
    const bx = ((i * 0.618) % 1) * w + Math.sin(time * 2 + i) * w * 0.01;
    cs.strokeWidth = w * 0.003; cs.color = Color.argb(Math.floor(160 * (1 - q * 0.5)), 220, 245, 255);
    canvas.drawCircle(bx, h * (1 - q), w * (0.006 + 0.005 * (i % 3)), cs);
  }
}

/** Fond de la carte du chapitre c (plein écran). */
function drawChapterMapBackground(canvas, c) {
  if (drawSceneBackground(canvas, c, false)) return;
  if (c >= 9) { drawChapterMapBackground2(canvas, c); return; }
  const sin = Math.sin, cos = Math.cos;
  cp.color = Color.WHITE;
  switch (c) {
    case 1:
      questPaint.color = Color.WHITE;
      questPaint.shader = new LinearGradient(0, 0, 0, h, PCc('#9FD3F0'), PCc('#FDE2C8'));
      canvas.drawRect(0, 0, w, h, questPaint); questPaint.shader = null;
      mountainRange(canvas, h * 0.62, h * 0.32, PCc('#B9C7D9'), 1, 0, false);
      mountainRange(canvas, h * 0.86, h * 0.3, PCc('#93A89D'), 4, 0, true);
      break;
    case 2: {
      cp.shader = new LinearGradient(0, 0, 0, h, [0xFF5ED6E8, 0xFF1F7FB8, 0xFF0B2E5C, 0xFF040B22], [0, 0.35, 0.7, 1]);
      canvas.drawRect(0, 0, w, h, cp); cp.shader = null;
      for (let i = 0; i < 5; i++) {
        const x0 = w * (0.05 + 0.22 * i) + sin(time * 0.4 + i) * w * 0.03;
        cpath.reset(); cpath.moveTo(x0, 0); cpath.lineTo(x0 + w * 0.07, 0); cpath.lineTo(x0 + w * 0.2, h * 0.55); cpath.lineTo(x0 + w * 0.06, h * 0.55); cpath.close();
        cp.color = Color.argb(26, 255, 255, 230); canvas.drawPath(cpath, cp);
      }
      cp.color = Color.argb(70, 4, 20, 50);
      const wx = w * 0.5 + sin(time * 0.15) * w * 0.15;
      crect.set(wx - w * 0.45, h * 0.38, wx + w * 0.4, h * 0.52); canvas.drawOval(crect, cp);
      cpath.reset(); cpath.moveTo(wx + w * 0.35, h * 0.45); cpath.lineTo(wx + w * 0.55, h * 0.38 + sin(time) * h * 0.01); cpath.lineTo(wx + w * 0.5, h * 0.5); cpath.close();
      canvas.drawPath(cpath, cp);
      cp.color = Color.argb(200, 22, 30, 40);
      cpath.reset(); cpath.moveTo(w * 0.02, h * 0.95); cpath.lineTo(w * 0.08, h * 0.86); cpath.lineTo(w * 0.4, h * 0.84); cpath.lineTo(w * 0.46, h * 0.93); cpath.close();
      canvas.drawPath(cpath, cp);
      cs.color = Color.argb(200, 22, 30, 40); cs.strokeWidth = w * 0.012; canvas.drawLine(w * 0.22, h * 0.85, w * 0.25, h * 0.72, cs);
      cp.color = PCc('#0A1630'); canvas.drawRect(0, h * 0.93, w, h, cp);
      for (let i = 0; i < 7; i++) {
        const x = w * (0.08 + 0.14 * i), hh = h * (0.12 + 0.06 * (i % 3));
        cs.strokeWidth = w * 0.014; cs.color = Color.argb(200, 40, 200, 160);
        cpath.reset(); cpath.moveTo(x, h);
        cpath.quadTo(x + sin(time * 1.2 + i) * w * 0.04, h - hh * 0.5, x + sin(time * 1.2 + i + 1) * w * 0.05, h - hh);
        canvas.drawPath(cpath, cs);
        cp.color = Color.argb(Math.floor(120 + 100 * Math.abs(sin(time * 2 + i))), 120, 255, 220);
        canvas.drawCircle(x + sin(time * 1.2 + i + 1) * w * 0.05, h - hh, w * 0.01, cp);
      }
      drawBubblesUp(canvas, 18);
      break;
    }
    case 3: {
      cp.shader = new LinearGradient(0, 0, 0, h, 0xFF0A0F2E, 0xFF1B1446); canvas.drawRect(0, 0, w, h, cp);
      cp.shader = new RadialGradient(w * 0.3, h * 0.45, w * 0.7, [Color.argb(120, 150, 70, 200), Color.argb(0, 150, 70, 200)]);
      canvas.drawRect(0, 0, w, h, cp); cp.shader = null;
      for (let i = 0; i < 60; i++) {
        cp.color = argbMul(0.4 + 0.6 * Math.abs(sin(time * 1.3 + i * 1.7)), 0xFFFFFFFF);
        canvas.drawCircle(w * hash01(i * 3 + 1), h * hash01(i * 7 + 2), w * (0.0015 + 0.003 * hash01(i)), cp);
      }
      const px = w * 0.8, py = h * 0.5, pr = w * 0.09;
      cs.color = Color.argb(160, 255, 210, 150); cs.strokeWidth = w * 0.012;
      crect.set(px - pr * 1.9, py - pr * 0.35, px + pr * 1.9, py + pr * 0.35); canvas.drawArc(crect, 180, 180, false, cs);
      cp.shader = new LinearGradient(px, py - pr, px, py + pr, 0xFFFFB74D, 0xFFB5651D); canvas.drawCircle(px, py, pr, cp); cp.shader = null;
      canvas.drawArc(crect, 0, 180, false, cs);
      cp.shader = new LinearGradient(0, h * 0.86, 0, h, 0xFF4FC3F7, 0xFF1565C0);
      canvas.drawCircle(w / 2, h * 0.86 + w * 1.4, w * 1.4, cp); cp.shader = null;
      cp.color = Color.argb(170, 102, 187, 106);
      crect.set(w * 0.15, h * 0.88, w * 0.45, h * 0.93); canvas.drawOval(crect, cp);
      crect.set(w * 0.6, h * 0.9, w * 0.9, h * 0.96); canvas.drawOval(crect, cp);
      cs.color = Color.argb(120, 180, 230, 255); cs.strokeWidth = w * 0.01;
      canvas.drawCircle(w / 2, h * 0.86 + w * 1.4, w * 1.405, cs);
      break;
    }
    case 4: {
      cp.shader = new LinearGradient(0, 0, 0, h, [0xFF1B2347, 0xFF6A3C6E, 0xFFE5683C, 0xFFF2A65A], [0, 0.3, 0.6, 0.72]);
      canvas.drawRect(0, 0, w, h, cp); cp.shader = null;
      cp.color = PCc('#C98E5A'); canvas.drawRect(0, h * 0.72, w, h, cp);
      cp.color = PCc('#B57A48'); crect.set(-w * 0.2, h * 0.7, w * 0.6, h * 0.78); canvas.drawOval(crect, cp);
      cp.color = PCc('#4A4E5A');
      crect.set(w * 0.05, h * 0.62, w * 0.38, h * 0.73); canvas.drawArc(crect, 180, 180, true, cp);
      canvas.drawRect(w * 0.05, h * 0.675, w * 0.38, h * 0.73, cp);
      crect.set(w * 0.55, h * 0.65, w * 0.8, h * 0.73); canvas.drawArc(crect, 180, 180, true, cp);
      canvas.drawRect(w * 0.55, h * 0.69, w * 0.8, h * 0.73, cp);
      cs.color = PCc('#4A4E5A'); cs.strokeWidth = w * 0.008;
      canvas.drawLine(w * 0.47, h * 0.73, w * 0.47, h * 0.6, cs);
      canvas.save(); canvas.rotate(sin(time * 0.6) * 25, w * 0.47, h * 0.6);
      crect.set(w * 0.42, h * 0.56, w * 0.52, h * 0.62); cp.color = PCc('#6B7080'); canvas.drawArc(crect, 0, 180, true, cp);
      canvas.restore();
      for (const tx of [w * 0.12, w * 0.88]) {
        cs.strokeWidth = w * 0.006;
        canvas.drawLine(tx - w * 0.03, h * 0.78, tx - w * 0.015, h * 0.66, cs);
        canvas.drawLine(tx + w * 0.03, h * 0.78, tx + w * 0.015, h * 0.66, cs);
        cp.color = PCc('#3A3E48'); canvas.drawRect(tx - w * 0.035, h * 0.635, tx + w * 0.035, h * 0.665, cp);
      }
      drawSearchlights(canvas, h * 0.65, 0.8);
      cs.color = PCc('#5A5A5A'); cs.strokeWidth = w * 0.006;
      for (let i = 0; i <= 10; i++) canvas.drawLine(w * i / 10, h * 0.9, w * i / 10, h * 0.97, cs);
      cs.strokeWidth = w * 0.003;
      for (const yy of [0.91, 0.935, 0.96]) {
        cpath.reset(); cpath.moveTo(0, h * yy);
        for (let i = 0; i <= 20; i++) cpath.lineTo(w * i / 20, h * yy + (i % 2 === 0 ? -1 : 1) * w * 0.006);
        canvas.drawPath(cpath, cs);
      }
      break;
    }
    case 5: {
      cp.shader = new LinearGradient(0, 0, 0, h, 0xFF1F2A1C, 0xFF4E5B3A); canvas.drawRect(0, 0, w, h, cp); cp.shader = null;
      for (const [cx, s] of [[w * 0.2, 1], [w * 0.78, 0.85]]) {
        cp.color = PCc('#2C3328');
        cpath.reset();
        cpath.moveTo(cx - w * 0.12 * s, h * 0.42); cpath.quadTo(cx - w * 0.06 * s, h * 0.3, cx - w * 0.08 * s, h * 0.2);
        cpath.lineTo(cx + w * 0.08 * s, h * 0.2); cpath.quadTo(cx + w * 0.06 * s, h * 0.3, cx + w * 0.12 * s, h * 0.42); cpath.close();
        canvas.drawPath(cpath, cp);
        for (let i = 0; i < 4; i++) {
          const q = (time * 0.1 + i * 0.25) % 1;
          cp.color = Color.argb(Math.floor(90 * (1 - q)), 160, 255, 120);
          canvas.drawCircle(cx + sin(q * 4 + i) * w * 0.03, h * 0.2 - q * h * 0.12, w * (0.03 + 0.05 * q), cp);
        }
      }
      cs.color = PCc('#14180F'); cs.strokeWidth = w * 0.005;
      canvas.drawLine(w * 0.18, h * 0.25, w * 0.22, h * 0.33, cs); canvas.drawLine(w * 0.22, h * 0.33, w * 0.19, h * 0.38, cs);
      cs.color = PCc('#7A4A2A'); cs.strokeWidth = w * 0.035;
      canvas.drawLine(0, h * 0.5, w * 0.3, h * 0.5, cs); canvas.drawLine(w * 0.3, h * 0.5, w * 0.3, h * 0.62, cs);
      canvas.drawLine(w, h * 0.58, w * 0.75, h * 0.58, cs);
      const n = 24, xr = (i) => w * 0.5 + sin(i * 0.5 + time * 0.3) * w * 0.22, yr = (i) => h - h * 0.65 * i / n;
      cpath.reset();
      for (let i = 0; i <= n; i++) { const xx = xr(i) - w * (0.22 - 0.12 * i / n); if (i === 0) cpath.moveTo(xx, yr(i)); else cpath.lineTo(xx, yr(i)); }
      for (let i = n; i >= 0; i--) cpath.lineTo(xr(i) + w * (0.22 - 0.12 * i / n), yr(i));
      cpath.close();
      cp.shader = new LinearGradient(0, h * 0.35, 0, h, 0xFF9CFF57, 0xFF39E21F); canvas.drawPath(cpath, cp); cp.shader = null;
      for (let i = 0; i < 14; i++) {
        const q = (time * 0.4 + hash01(i)) % 1, yy = h - h * 0.65 * hash01(i * 3 + 1);
        const xx = w * 0.5 + sin(hash01(i * 3 + 1) * 12 + time * 0.3) * w * 0.22 + (hash01(i * 5) - 0.5) * w * 0.2;
        cp.color = Color.argb(Math.floor(200 * (1 - q)), 220, 255, 170);
        canvas.drawCircle(xx, yy - q * w * 0.04, w * 0.008 * (0.5 + q), cp);
      }
      break;
    }
    case 6: drawDreamScene(canvas, 0, 1); break;
    case 7: {
      cp.shader = new LinearGradient(0, 0, 0, h, [0xFF0A1433, 0xFF1E3A6E, 0xFF8EC9E8, 0xFFDDF0FA], [0, 0.3, 0.62, 1]);
      canvas.drawRect(0, 0, w, h, cp); cp.shader = null;
      for (let i = 0; i < 35; i++) {
        cp.color = argbMul(0.4 + 0.6 * Math.abs(sin(time + i)), 0xFFFFFFFF);
        canvas.drawCircle(w * hash01(i * 5 + 1), h * 0.3 * hash01(i * 9 + 4), w * 0.0025, cp);
      }
      drawAurora(canvas, h * 0.04, h * 0.26, 0.9);
      cp.color = PCc('#A9D3EE');
      cpath.reset(); cpath.moveTo(0, h * 0.62);
      for (let i = 0; i <= 8; i++) cpath.lineTo(w * i / 8, h * (0.48 + 0.06 * hash01(i + 40)));
      cpath.lineTo(w, h * 0.62); cpath.close(); canvas.drawPath(cpath, cp);
      cp.color = PCc('#7FB6DC');
      for (let i = 0; i < 8; i++) canvas.drawRect(w * (i / 8 + 0.03), h * (0.52 + 0.04 * hash01(i + 40)), w * (i / 8 + 0.05), h * 0.62, cp);
      cp.shader = new LinearGradient(0, h * 0.62, 0, h, 0xFFE6F4FB, 0xFFB9DDF0); canvas.drawRect(0, h * 0.62, w, h, cp); cp.shader = null;
      cs.color = Color.argb(120, 140, 190, 220); cs.strokeWidth = w * 0.004;
      for (let i = 0; i < 6; i++) canvas.drawLine(w * hash01(i + 60), h * (0.7 + 0.05 * i), w * hash01(i + 60) + w * 0.2, h * (0.71 + 0.05 * i), cs);
      for (let i = 0; i < 40; i++) {
        const q = (time * (0.08 + 0.04 * hash01(i)) + hash01(i * 3)) % 1;
        cp.color = Color.argb(200, 255, 255, 255);
        canvas.drawCircle((hash01(i * 7) * w + q * w * 0.4) % w, q * h, w * (0.003 + 0.003 * hash01(i)), cp);
      }
      break;
    }
    default: {
      cp.shader = new LinearGradient(0, 0, 0, h, 0xFF14090C, 0xFF4A1A12); canvas.drawRect(0, 0, w, h, cp); cp.shader = null;
      if ((time % 5) < 0.15) { cp.color = Color.argb(90, 255, 230, 200); canvas.drawRect(0, 0, w, h * 0.4, cp); }
      cp.color = PCc('#1E1418');
      cpath.reset(); cpath.moveTo(-w * 0.1, h); cpath.lineTo(w * 0.4, h * 0.12); cpath.lineTo(w * 0.6, h * 0.12); cpath.lineTo(w * 1.1, h); cpath.close();
      canvas.drawPath(cpath, cp);
      cp.shader = new RadialGradient(w / 2, h * 0.12, w * 0.25, [Color.argb(220, 255, 120, 30), Color.argb(0, 255, 60, 10)]);
      canvas.drawCircle(w / 2, h * 0.12, w * 0.25, cp); cp.shader = null;
      for (const [x0, dir] of [[0.45, -1], [0.55, 1], [0.5, 0.2]]) {
        cs.color = PCc('#FF6D1F'); cs.strokeWidth = w * 0.02;
        cpath.reset(); cpath.moveTo(w * x0, h * 0.13);
        cpath.cubicTo(w * (x0 + 0.1 * dir), h * 0.35, w * (x0 - 0.05 * dir), h * 0.6, w * (x0 + 0.25 * dir), h);
        canvas.drawPath(cpath, cs);
        cs.color = Color.argb(160, 255, 220, 120); cs.strokeWidth = w * 0.006;
        canvas.drawPath(cpath, cs);
      }
      drawEmbers(canvas, 1);
    }
  }
}

/** Étape de la carte (niveau) du chapitre c avec ses 3 objets dorés (bits 1 = arrivée, 2 et 4 = défis). */
function drawChapterNode(canvas, c, x, y, rx, medals, unlocked, last) {
  if (c >= 9) { drawChapterNode2(canvas, c, x, y, rx, medals, unlocked, last); return; }
  const ry = rx * 0.5, cos = Math.cos, sin = Math.sin;
  const dim = (col) => (unlocked ? col : Theme.lerp(col, PCc('#7C8290'), 0.65));
  const D = (s) => dim(PCc(s));
  const ov = (col, l, t, r, b) => { cp.color = col; crect.set(l, t, r, b); canvas.drawOval(crect, cp); };
  cp.shader = null;
  ov(Color.argb(55, 0, 0, 0), x - rx * 1.1, y + ry * 0.4, x + rx * 1.1, y + ry * 1.6);
  switch (c) {
    case 2:
      ov(D('#8E4F8C'), x - rx * 1.05, y + ry * 0.1, x + rx * 1.05, y + ry * 1.4);
      ov(D('#D98BA0'), x - rx * 1.05, y - ry * 0.2, x + rx * 1.05, y + ry * 1.0);
      cs.color = D('#FF80AB'); cs.strokeWidth = rx * 0.07;
      canvas.drawLine(x - rx * 0.85, y + ry * 0.2, x - rx * 0.95, y - ry * 0.6, cs);
      canvas.drawLine(x - rx * 0.9, y - ry * 0.2, x - rx * 0.7, y - ry * 0.5, cs);
      ov(D('#E0B0D0'), x - rx * 0.75, y - ry * 0.55, x + rx * 0.75, y + ry * 0.6);
      ov(D('#4A2246'), x - rx * 0.6, y - ry * 0.4, x + rx * 0.6, y + ry * 0.4);
      cp.color = D('#F1C7DE'); crect.set(x - rx * 0.75, y - ry * 1.9, x + rx * 0.75, y - ry * 0.1); canvas.drawArc(crect, 190, 160, true, cp);
      cs.color = D('#C88AB0'); cs.strokeWidth = rx * 0.03;
      for (let i = 1; i <= 4; i++) canvas.drawLine(x, y - ry * 0.2, x - rx * 0.7 + i * rx * 0.28, y - ry * 1.6, cs);
      break;
    case 3:
      cs.color = Color.argb(unlocked ? 200 : 90, 80, 240, 230); cs.strokeWidth = rx * 0.05;
      crect.set(x - rx * 1.2, y - ry * 0.35, x + rx * 1.2, y + ry * 0.75); canvas.drawArc(crect, 180, 180, false, cs);
      cp.color = D('#6F6A85'); canvas.drawCircle(x, y + ry * 0.3, rx * 0.78, cp);
      cp.color = D('#8E8A9E'); canvas.drawCircle(x - rx * 0.06, y + ry * 0.2, rx * 0.7, cp);
      cp.color = D('#6A657E');
      for (const [u, v, r] of [[-0.3, 0.6, 0.15], [0.3, 0.9, 0.12], [0.15, 0.1, 0.1]]) canvas.drawCircle(x + rx * u, y + ry * v, rx * r, cp);
      canvas.drawArc(crect, 0, 180, false, cs);
      break;
    case 4:
      cp.color = D('#4E5A2A'); crect.set(x - rx * 0.95, y, x + rx * 0.95, y + ry * 1.5); canvas.drawRoundRect(crect, rx * 0.08, rx * 0.08, cp);
      cp.color = D('#6B7A3A'); crect.set(x - rx * 0.95, y - ry * 0.6, x + rx * 0.95, y + ry * 0.6); canvas.drawRoundRect(crect, rx * 0.12, rx * 0.12, cp);
      cs.color = D('#3C4620'); cs.strokeWidth = rx * 0.04;
      canvas.drawLine(x - rx * 0.7, y + ry * 0.75, x + rx * 0.7, y + ry * 1.3, cs);
      canvas.drawLine(x - rx * 0.7, y + ry * 1.3, x + rx * 0.7, y + ry * 0.75, cs);
      cs.color = Color.argb(unlocked ? 230 : 120, 255, 214, 0);
      crect.set(x - rx * 0.7, y - ry * 0.45, x + rx * 0.7, y + ry * 0.45); canvas.drawOval(crect, cs);
      break;
    case 5:
      ov(Color.argb(150, 120, 255, 80), x - rx * 1.25, y + ry * 0.5, x + rx * 1.25, y + ry * 1.5);
      cp.color = D('#C9A300'); canvas.drawRect(x - rx * 0.85, y, x + rx * 0.85, y + ry * 1.4, cp);
      ov(D('#C9A300'), x - rx * 0.85, y + ry * 0.8, x + rx * 0.85, y + ry * 1.6);
      cp.color = D('#1B1B1B');
      for (let i = 0; i < 4; i++) canvas.drawRect(x - rx * 0.85 + i * rx * 0.45, y + ry * 0.5, x - rx * 0.62 + i * rx * 0.45, y + ry * 1.0, cp);
      ov(D('#FFD600'), x - rx * 0.85, y - ry * 0.6, x + rx * 0.85, y + ry * 0.6);
      ov(D('#B89200'), x - rx * 0.68, y - ry * 0.45, x + rx * 0.68, y + ry * 0.45);
      break;
    case 6:
      for (const [u, v, r, col] of [[-0.6, 0.7, 0.42, '#F8C8DC'], [0.6, 0.7, 0.42, '#F8C8DC'], [0, 0.85, 0.5, '#FFE0EE'], [-0.35, 0.25, 0.45, '#FFFFFF'], [0.35, 0.25, 0.45, '#FFFFFF']]) {
        cp.color = D(col); canvas.drawCircle(x + rx * u, y + ry * v, rx * r, cp);
      }
      cp.color = D('#D7C6F5'); crect.set(x - rx * 0.7, y - ry * 0.55, x + rx * 0.7, y + ry * 0.45); canvas.drawRoundRect(crect, rx * 0.25, rx * 0.25, cp);
      cp.color = D('#E8DDFB'); crect.set(x - rx * 0.6, y - ry * 0.5, x + rx * 0.6, y + ry * 0.2); canvas.drawRoundRect(crect, rx * 0.22, rx * 0.22, cp);
      break;
    case 7:
      ov(Color.argb(120, 60, 120, 170), x - rx * 1.2, y + ry * 0.6, x + rx * 1.2, y + ry * 1.5);
      ov(D('#9FD3F0'), x - rx * 1.05, y, x + rx * 1.05, y + ry * 1.25);
      ov(D('#F4FAFF'), x - rx * 1.05, y - ry * 0.55, x + rx * 1.05, y + ry * 0.75);
      cp.color = D('#FFFFFF'); crect.set(x + rx * 0.35, y - ry * 1.3, x + rx * 0.95, y - ry * 0.1); canvas.drawArc(crect, 180, 180, true, cp);
      cp.color = D('#3A5A78'); crect.set(x + rx * 0.55, y - ry * 0.55, x + rx * 0.75, y); canvas.drawArc(crect, 180, 180, true, cp);
      break;
    default: {
      ov(Color.argb(200, 255, 110, 30), x - rx * 1.25, y + ry * 0.7, x + rx * 1.25, y + ry * 1.6);
      const hexAt = (cy, col) => {
        cpath.reset();
        for (let i = 0; i < 6; i++) { const an = i * 1.047, px0 = x + cos(an) * rx * 0.95, py0 = cy + sin(an) * ry * 0.95; if (i === 0) cpath.moveTo(px0, py0); else cpath.lineTo(px0, py0); }
        cpath.close(); cp.color = col; canvas.drawPath(cpath, cp);
      };
      hexAt(y + ry * 0.9, D('#151014'));
      cp.color = D('#1E1418'); canvas.drawRect(x - rx * 0.95, y, x + rx * 0.95, y + ry * 0.9, cp);
      hexAt(y, D('#3A2F36'));
      cs.color = Color.argb(unlocked ? 220 : 80, 255, 122, 31); cs.strokeWidth = rx * 0.035;
      canvas.drawLine(x - rx * 0.5, y + ry * 0.3, x - rx * 0.35, y + ry * 1.2, cs);
      canvas.drawLine(x + rx * 0.4, y + ry * 0.2, x + rx * 0.55, y + ry * 1.0, cs);
    }
  }
  if (!unlocked) return;
  const er = rx * (c === 4 ? 0.24 : 0.27), lift = c === 2 ? ry * 0.1 : c === 3 ? ry * 0.9 : ry * 0.35;
  drawCollectible(canvas, c, x, y - ry * 0.28 - lift, er, (medals & 2) !== 0);
  drawCollectible(canvas, c, x - rx * 0.38, y - ry * 0.02 - lift * 0.6, er, (medals & 1) !== 0);
  drawCollectible(canvas, c, x + rx * 0.38, y - ry * 0.02 - lift * 0.6, er, (medals & 4) !== 0);
  if (last) drawCrownSmall(canvas, x, y - ry * 1.6 - lift, rx * 0.25);
}

function drawCrownSmall(canvas, x, y, s) {
  cp.shader = null; cp.color = PCc('#FFC93C');
  cpath.reset();
  cpath.moveTo(x - s, y + s * 0.4); cpath.lineTo(x - s, y - s * 0.3); cpath.lineTo(x - s * 0.5, y + s * 0.05); cpath.lineTo(x, y - s * 0.5);
  cpath.lineTo(x + s * 0.5, y + s * 0.05); cpath.lineTo(x + s, y - s * 0.3); cpath.lineTo(x + s, y + s * 0.4); cpath.close();
  canvas.drawPath(cpath, cp);
  cs.color = PCc('#C98A00'); cs.strokeWidth = s * 0.12; canvas.drawPath(cpath, cs);
}

/** Ce qui domine la carte en haut, près du dernier niveau : la baleine, le vaisseau-mère, l'hélico… */
function drawChapterMapBoss(canvas, c, x, y, nestR) {
  if (c >= 9) { drawChapterMapBoss2(canvas, c, x, y, nestR); return; }
  const done = QuestProgress.done(c) >= Quest.LEVELS, sin = Math.sin, cos = Math.cos;
  switch (c) {
    case 2: { const ang = time * 0.4; drawWhale(canvas, x + cos(ang) * w * 0.24, y - nestR * 1.4 + sin(ang) * w * 0.03, w * 0.045, sin(ang) > 0 ? -1 : 1); break; }
    case 3: {
      const ux = x + sin(time * 0.7) * w * 0.05, uy = y - nestR * 2.1;
      cp.shader = null; cp.color = Color.argb(Math.floor(60 + 30 * Math.abs(sin(time * 3))), 120, 255, 120);
      cpath.reset(); cpath.moveTo(ux - w * 0.03, uy); cpath.lineTo(ux + w * 0.03, uy); cpath.lineTo(x + nestR * 0.9, y + nestR * 0.3); cpath.lineTo(x - nestR * 0.9, y + nestR * 0.3); cpath.close();
      canvas.drawPath(cpath, cp);
      drawUfo(canvas, ux, uy, w * 0.1);
      break;
    }
    case 4: drawHelicopter(canvas, x + sin(time * 0.8) * w * 0.04, y - nestR * 1.9 + sin(time * 2) * w * 0.01, w * 0.065, sin(time) * 5); break;
    case 5:
      for (let i = 0; i < 3; i++) {
        if ((Math.floor(time * 6) + i) % 3 === 0) continue;
        cs.color = i % 2 === 0 ? PCc('#FFEB3B') : PCc('#76FF03'); cs.strokeWidth = w * 0.006;
        const a0 = i * 2.1 + time;
        let px0 = x + cos(a0) * nestR * 1.3, py0 = y - nestR * 0.6 + sin(a0) * nestR * 0.5;
        cpath.reset(); cpath.moveTo(px0, py0);
        for (let j = 0; j < 4; j++) { px0 += (hash01(Math.floor(time * 10) + j + i * 7) - 0.5) * nestR * 0.8; py0 -= nestR * 0.3; cpath.lineTo(px0, py0); }
        canvas.drawPath(cpath, cs);
      }
      if (!done) drawHeroAt(canvas, 'toxik', x - nestR * 1.25, y - nestR * 0.75, 1.3);
      break;
    case 6: if (!done) drawHeroAt(canvas, 'morphee', x - nestR * 1.25, y - nestR * 0.95 + sin(time * 1.5) * w * 0.01, 1.3); break;
    case 7: if (!done) drawHeroAt(canvas, 'yeti', x - nestR * 1.25, y - nestR * 0.75, 1.3); break;
    case 8: if (!done) drawHeroAt(canvas, 'pyro', x - nestR * 1.25, y - nestR * 0.75, 1.3); break;
  }
}
