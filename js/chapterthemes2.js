'use strict';
// Saison 2 de l'Aventure, chapitres 9 à 16 (équivalent de ChapterThemes2.kt) : décors entièrement nouveaux.
//  9 horloge steampunk · 10 jardin géant · 11 jeu d'arcade · 12 tombeau égyptien
// 13 manoir hanté · 14 festival rock · 15 dojo des nuages · 16 royaume du sucre

const dp2 = new Paint(), ds2 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const dpath2 = new Path(), drect2 = new RectF();
const pc2 = (s) => Color.parseColor(s);

// ---------- Blocs en jeu ----------
const CH2_COPPERS = [0xFFB87333, 0xFFA0522D, 0xFFC9A13B, 0xFF8C6239];
const CH2_MARSH = [0xFFFFD1DC, 0xFFFFF5E1, 0xFFD4F1F9, 0xFFE6D4FF];
const CH2_SANDS = [0xFFD8B26E, 0xFFCFA35E, 0xFFE2C186, 0xFFC89B57];

function chapterBlockLook2(b) {
  if (quest.season >= 17) return chapterBlockLook3(b);
  const c = b.color, k0 = b.kind;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) {
    switch (quest.season) {
      case 9: return std(0xFF8C6239, 'metal', false);
      case 10: return std(0xFF6FBF4A, 'lisse', true);
      case 11: return std(0xFF1E1B3A, 'lisse', false);
      case 12: return std(0xFFD8B26E, 'granit', false);
      case 13: return std(0xFF55505E, 'granit', false);
      case 14: return std(0xFF2A2A30, 'metal', false);
      case 15: return std(0xFFB7A68A, 'granit', false);
      default: return std(0xFFFFD1DC, 'lisse', true);
    }
  }
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  switch (quest.season) {
    case 9:
      if (k0 === Kind.MOVING) return std(0xFFC9A13B, 'metal', true);
      if (k0 === Kind.CRUMBLY) return std(0xFF7B4A2A, 'bois', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFF6D4C41, 'bois');
      return std(CH2_COPPERS[c % 4], 'metal');
    case 10:
      if (k0 === Kind.TRAMPOLINE) return std(0xFFD93A3A, 'lisse', true);
      if (k0 === Kind.CRUMBLY) return std(0xFF4CAF50, 'lisse', true);
      if (k0 === Kind.MOVING) return std(0xFFE8C547, 'bois', false);
      return c % 2 === 0 ? std(0xFFD93A3A, 'lisse', true) : std(0xFFC69C6D, 'bois', false);
    case 11:
      if (k0 === Kind.MOVING) return std(0xFF8A8F99, 'metal', false);
      if (k0 === Kind.CRUMBLY) return std(0xFFE040FB, 'lisse', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFF2979FF, 'lisse', true);
      return std(0xFF2A2A3A, 'lisse', false);
    case 12:
      if (k0 === Kind.CRUMBLY) return std(0xFFC49A55, 'granit', false);
      if (k0 === Kind.MOVING) return std(0xFF2F4F9E, 'lisse', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFFB08850, 'bois', true);
      return std(CH2_SANDS[c % 4], 'granit');
    case 13:
      if (k0 === Kind.CRUMBLY) return std(0xFF6E6A78, 'granit', false);
      if (k0 === Kind.MOVING) return std(0xFF2B2B33, 'metal', true);
      return c % 2 === 0 ? std(0xFFF07C1A, 'lisse', true) : std(0xFF5B3A8E, 'bois', false);
    case 14:
      if (k0 === Kind.TRAMPOLINE) return std(0xFFC62828, 'lisse', true);
      if (k0 === Kind.MOVING) return std(0xFF3A2B20, 'bois', false);
      if (k0 === Kind.CRUMBLY) return std(0xFFF5F5F5, 'lisse', false);
      return std(0xFF1F1F24, 'metal', false);
    case 15:
      if (k0 === Kind.CRUMBLY) return std(0xFFE53935, 'lisse', true);
      if (k0 === Kind.MOVING) return std(0xFF3E4A5A, 'granit', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFFC9A13B, 'metal', true);
      return std(0xFF7CB342, 'bois', true);
    default:
      if (k0 === Kind.CRUMBLY) return std(0xFFE8B96A, 'bois', false);
      if (k0 === Kind.MOVING) return std(0xFF6B3E26, 'lisse', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFFFF9EC4, 'lisse', true);
      return std(CH2_MARSH[c % 4], 'lisse');
  }
}

/** Flamme de torche (base en (cx, by), largeur wd, hauteur ht). */
function chFlame(canvas, cx, by, wd, ht, color) {
  dpath2.reset();
  dpath2.moveTo(cx - wd / 2, by);
  dpath2.quadTo(cx - wd / 2, by - ht * 0.5, cx, by - ht);
  dpath2.quadTo(cx + wd / 2, by - ht * 0.5, cx + wd / 2, by);
  dpath2.close();
  dp2.shader = null; dp2.color = color; canvas.drawPath(dpath2, dp2);
  dp2.color = pc2('#FFE082'); canvas.save(); canvas.scale(0.55, 0.6, cx, by); canvas.drawPath(dpath2, dp2); canvas.restore();
}

function drawGearFlat2(canvas, x, y, rx, ry, angle, color) {
  ds2.color = color; ds2.strokeWidth = k * 0.05;
  for (let i = 0; i < 10; i++) {
    const an = angle + i * 0.628;
    canvas.drawLine(x + Math.cos(an) * rx * 0.75, y + Math.sin(an) * ry * 0.75, x + Math.cos(an) * rx * 1.02, y + Math.sin(an) * ry * 1.02, ds2);
  }
  drect2.set(x - rx * 0.75, y - ry * 0.75, x + rx * 0.75, y + ry * 0.75); canvas.drawOval(drect2, ds2);
  dp2.color = color; drect2.set(x - rx * 0.2, y - ry * 0.2, x + rx * 0.2, y + ry * 0.2); canvas.drawOval(drect2, dp2);
}

/** Engrenage vu de face. */
function drawGear(canvas, x, y, r, angle, color, teeth = 10) {
  dpath2.reset();
  for (let i = 0; i < teeth * 2; i++) {
    const an = angle + i * Math.PI / teeth, rr = i % 2 === 0 ? r : r * 0.8, an2 = an + Math.PI / teeth;
    if (i === 0) dpath2.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); else dpath2.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
    dpath2.lineTo(x + Math.cos(an2) * rr, y + Math.sin(an2) * rr);
  }
  dpath2.close();
  dp2.shader = null; dp2.color = color; canvas.drawPath(dpath2, dp2);
  dp2.color = shadeC(color, 0.7); canvas.drawCircle(x, y, r * 0.35, dp2);
  dp2.color = shadeC(color, 1.15); canvas.drawCircle(x, y, r * 0.15, dp2);
}

function drawChapterDeco2(canvas, pl) {
  if (pl.theme >= 17) { drawChapterDeco3(canvas, pl); return; }
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, sin = Math.sin, cos = Math.cos;
  dp2.shader = null;
  const seed = Math.abs(Math.trunc(pl.cx * 7 + pl.cz * 13));
  const ov = (col, l, t, r, b) => { dp2.color = col; drect2.set(l, t, r, b); canvas.drawOval(drect2, dp2); };
  switch (pl.theme) {
    case 9:
      if (pl.kind === Kind.MOVING) drawGearFlat2(canvas, 0, 0, rx * 0.8, ry * 0.8, time * 1.5, pc2('#8D6E1F'));
      else if (pl.kind === Kind.CRUMBLY) {
        ds2.color = pc2('#C9A13B'); ds2.strokeWidth = k * 0.04;
        canvas.drawLine(rx * 0.3, 0, rx * 0.3, -k * 0.25, ds2);
        const an = time * 4;
        canvas.drawLine(rx * 0.3, -k * 0.25, rx * 0.3 + cos(an) * k * 0.15, -k * 0.25 + sin(an) * k * 0.06, ds2);
      } else {
        ov(pc2('#5D4037'), -rx * 0.25, -ry * 0.25, rx * 0.25, ry * 0.25);
        const q = (time + seed * 0.13) % 1;
        if (q < 0.4) { dp2.color = Color.argb(Math.floor(160 * (1 - q / 0.4)), 255, 255, 255); canvas.drawCircle(rx * 0.1, -k * (0.15 + q), k * (0.08 + q * 0.3), dp2); }
      }
      break;
    case 10:
      if (pl.kind === Kind.MOVING) { dp2.color = pc2('#C62828'); canvas.drawRect(-rx * 0.7, -ry * 0.15, rx * 0.7, ry * 0.15, dp2); }
      else if (pl.kind === Kind.CRUMBLY) {
        ds2.color = pc2('#2E7D32'); ds2.strokeWidth = k * 0.03; canvas.drawLine(0, 0, rx * 0.7, ry * 0.4, ds2);
        const q = (time * 0.7 + seed * 0.21) % 1;
        dp2.color = Color.argb(200, 180, 225, 255); canvas.drawCircle(-rx * 0.2, -k * 1.6 * (1 - q), k * 0.07, dp2);
      } else if (pl.baseColor === 0xFFD93A3A) {
        for (const [u, v, r] of [[-0.4, 0, 0.12], [0.3, -0.3, 0.1], [0.15, 0.4, 0.09], [-0.05, -0.55, 0.07]]) ov(Color.WHITE, u * rx - k * r * 1.2, v * ry - k * r * 0.7, u * rx + k * r * 1.2, v * ry + k * r * 0.7);
      }
      break;
    case 11: {
      if (pl.kind === Kind.NORMAL) {
        const keys = ['W', 'A', 'S', 'D', '↑', '←', '↓', '→'];
        textPaint.textSize = k * 0.35; textPaint.color = seed % 2 === 0 ? pc2('#00E5FF') : pc2('#FF2BD6');
        canvas.drawText(keys[seed % keys.length], 0, k * 0.1, textPaint); textPaint.color = Color.WHITE;
      } else if (pl.kind === Kind.CRUMBLY) {
        dp2.color = Color.argb(140, 255, 255, 255);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j + seed) % 2 === 0) {
          const u = (i - 1) * 0.4, v = (j - 1) * 0.4;
          canvas.drawCircle(isoX(u * a, v * a), isoY(u * a, 0, v * a), k * 0.06, dp2);
        }
      } else if (pl.kind === Kind.MOVING) ov(pc2('#FF5252'), -rx * 0.45, -ry * 0.35, rx * 0.45, ry * 0.35);
      // Glitch : le bloc se dédouble brièvement en rouge / bleu
      const g = (time * 0.6 + seed * 0.37) % 1;
      if (g < 0.08) {
        const off = k * 0.12;
        ov(Color.argb(120, 255, 30, 60), -rx - off, -ry, rx - off, ry);
        ov(Color.argb(120, 30, 200, 255), -rx + off, -ry, rx + off, ry);
      }
      break;
    }
    case 12:
      if (pl.kind === Kind.CRUMBLY) {
        ds2.color = pc2('#3E2A10'); ds2.strokeWidth = k * 0.035;
        drect2.set(-rx * 0.35, -ry * 0.2, rx * 0.35, ry * 0.2); canvas.drawOval(drect2, ds2);
        dp2.color = pc2('#3E2A10'); canvas.drawCircle(0, 0, k * 0.06, dp2);
        canvas.drawLine(0, ry * 0.2, -rx * 0.1, ry * 0.5, ds2);
      } else if (pl.kind === Kind.MOVING) {
        ds2.color = pc2('#FFC93C'); ds2.strokeWidth = k * 0.04;
        drect2.set(-rx * 0.7, -ry * 0.7, rx * 0.7, ry * 0.7); canvas.drawOval(drect2, ds2);
      } else {
        ds2.color = Color.argb(120, 90, 60, 20); ds2.strokeWidth = k * 0.025;
        for (let i = 0; i < 3; i++) { const x0 = -rx * 0.4 + i * rx * 0.35; canvas.drawLine(x0, -ry * 0.2, x0, ry * 0.15, ds2); canvas.drawCircle(x0, -ry * 0.32, k * 0.04, ds2); }
      }
      break;
    case 13:
      if (pl.baseColor === 0xFFF07C1A && pl.kind === Kind.NORMAL) {
        dp2.color = Color.argb(clamp(Math.floor(180 + 60 * sin(time * 5 + seed)), 0, 255), 255, 220, 80);
        dpath2.reset(); dpath2.moveTo(-rx * 0.35, -ry * 0.2); dpath2.lineTo(-rx * 0.15, -ry * 0.2); dpath2.lineTo(-rx * 0.25, -ry * 0.45); dpath2.close(); canvas.drawPath(dpath2, dp2);
        dpath2.reset(); dpath2.moveTo(rx * 0.15, -ry * 0.2); dpath2.lineTo(rx * 0.35, -ry * 0.2); dpath2.lineTo(rx * 0.25, -ry * 0.45); dpath2.close(); canvas.drawPath(dpath2, dp2);
        drect2.set(-rx * 0.35, ry * 0.05, rx * 0.35, ry * 0.35); canvas.drawArc(drect2, 0, 180, true, dp2);
        dp2.color = pc2('#3E7D2A'); canvas.drawRect(-k * 0.05, -ry * 0.1 - k * 0.2, k * 0.05, -ry * 0.1, dp2);
      } else if (pl.kind === Kind.MOVING) {
        ov(pc2('#7CFC00'), -rx * 0.7, -ry * 0.7, rx * 0.7, ry * 0.7);
        for (let i = 0; i < 3; i++) {
          const q = (time * 1.2 + i * 0.33) % 1;
          dp2.color = Color.argb(Math.floor(200 * (1 - q)), 200, 255, 150);
          canvas.drawCircle((i - 1) * rx * 0.3, -q * k * 0.5, k * (0.05 + 0.05 * q), dp2);
        }
      } else if (pl.kind === Kind.NORMAL) {
        ds2.color = pc2('#C9A13B'); ds2.strokeWidth = k * 0.03; canvas.drawLine(-rx * 0.5, ry * 0.1, rx * 0.3, -ry * 0.4, ds2);
      }
      break;
    case 14:
      if (pl.kind === Kind.NORMAL) {
        const beat = 1 + 0.12 * Math.abs(sin(time * 6.28));
        ov(pc2('#3A3A42'), -rx * 0.6 * beat, -ry * 0.6 * beat, rx * 0.6 * beat, ry * 0.6 * beat);
        ov(pc2('#111114'), -rx * 0.25, -ry * 0.25, rx * 0.25, ry * 0.25);
        ds2.color = Color.argb(150, 255, 43, 214); ds2.strokeWidth = k * 0.02;
        drect2.set(-rx * 0.75, -ry * 0.75, rx * 0.75, ry * 0.75); canvas.drawOval(drect2, ds2);
      } else if (pl.kind === Kind.MOVING) {
        ds2.color = Color.argb(160, 230, 200, 150); ds2.strokeWidth = k * 0.02;
        for (let i = 0; i < 4; i++) canvas.drawLine(-rx * 0.6, -ry * 0.3 + i * ry * 0.2, rx * 0.2, ry * 0.2 + i * ry * 0.2 - ry * 0.5, ds2);
      } else if (pl.kind === Kind.CRUMBLY) { dp2.color = pc2('#1B1B1B'); canvas.drawRect(-rx * 0.1, -ry * 0.8, rx * 0.15, ry * 0.1, dp2); }
      break;
    case 15:
      if (pl.kind === Kind.CRUMBLY) {
        ds2.color = Color.argb(150, 120, 20, 20); ds2.strokeWidth = k * 0.02;
        for (let i = 1; i <= 2; i++) { drect2.set(-rx * i * 0.35, -ry * i * 0.35, rx * i * 0.35, ry * i * 0.35); canvas.drawOval(drect2, ds2); }
        dp2.color = Color.argb(140, 255, 220, 120); canvas.drawCircle(0, 0, k * 0.1, dp2);
      } else if (pl.kind === Kind.NORMAL) {
        ds2.color = pc2('#558B2F'); ds2.strokeWidth = k * 0.04; drect2.set(-rx * 0.8, -ry * 0.8, rx * 0.8, ry * 0.8); canvas.drawOval(drect2, ds2);
        ds2.color = pc2('#9CCC65'); ds2.strokeWidth = k * 0.02; drect2.set(-rx * 0.45, -ry * 0.45, rx * 0.45, ry * 0.45); canvas.drawOval(drect2, ds2);
      } else if (pl.kind === Kind.TRAMPOLINE) {
        ds2.color = Color.argb(160, 120, 80, 10); ds2.strokeWidth = k * 0.02; drect2.set(-rx * 0.5, -ry * 0.5, rx * 0.5, ry * 0.5); canvas.drawOval(drect2, ds2);
      }
      break;
    case 16:
      if (pl.kind === Kind.CRUMBLY) {
        ds2.color = Color.argb(140, 150, 100, 40); ds2.strokeWidth = k * 0.02;
        for (let i = -2; i <= 2; i++) {
          const u = i * 0.3;
          canvas.drawLine(isoX(u * a, -a * 0.8), isoY(u * a, 0, -a * 0.8), isoX(u * a, a * 0.8), isoY(u * a, 0, a * 0.8), ds2);
          canvas.drawLine(isoX(-a * 0.8, u * a), isoY(-a * 0.8, 0, u * a), isoX(a * 0.8, u * a), isoY(a * 0.8, 0, u * a), ds2);
        }
      } else if (pl.kind === Kind.MOVING) {
        ds2.color = Color.argb(120, 40, 20, 10); ds2.strokeWidth = k * 0.03;
        canvas.drawLine(isoX(0, -a * 0.9), isoY(0, 0, -a * 0.9), isoX(0, a * 0.9), isoY(0, 0, a * 0.9), ds2);
        canvas.drawLine(isoX(-a * 0.9, 0), isoY(-a * 0.9, 0, 0), isoX(a * 0.9, 0), isoY(a * 0.9, 0, 0), ds2);
      } else if (pl.kind === Kind.NORMAL) {
        const cols = [0xFFE53950, 0xFF3F8EFC, 0xFFFFC93C, 0xFF3DBE6E];
        ds2.strokeWidth = k * 0.03;
        for (let i = 0; i < 6; i++) {
          ds2.color = cols[(i + seed) % 4];
          const u = hash01(seed + i * 3) - 0.5, v = hash01(seed + i * 5 + 1) - 0.5;
          const x = isoX(u * a * 1.4, v * a * 1.4), y = isoY(u * a * 1.4, 0, v * a * 1.4);
          canvas.drawLine(x - k * 0.04, y, x + k * 0.04, y + k * 0.02, ds2);
        }
      }
      break;
  }
}

function drawChapterPickup2(canvas, cy, shadow) {
  if (quest.season >= 17) return drawChapterPickup3(canvas, cy, shadow);
  const r = k * 0.18, sin = Math.sin, cos = Math.cos;
  if (quest.season === 12) return false;   // pièces antiques : la pièce dorée classique
  dp2.shader = null;
  if (shadow) { dp2.color = Color.argb(45, 0, 0, 0); drect2.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(drect2, dp2); }
  switch (quest.season) {
    case 9: drawGear(canvas, 0, cy, r, time * 2, pc2('#B87333'), 6); dp2.color = pc2('#3E2A10'); canvas.drawCircle(0, cy, r * 0.25, dp2); break;
    case 10:
      dp2.color = Color.argb(80, 255, 230, 80); canvas.drawCircle(0, cy, r * 1.4, dp2);
      dp2.color = pc2('#FFD54F');
      for (let i = 0; i < 8; i++) { const an = i * 0.785 + time; canvas.drawCircle(cos(an) * r * 0.6, cy + sin(an) * r * 0.6, r * 0.35, dp2); }
      dp2.color = pc2('#FFB300'); canvas.drawCircle(0, cy, r * 0.5, dp2);
      break;
    case 11:
      dp2.color = pc2('#1B5E20'); drect2.set(-r, cy - r * 0.7, r, cy + r * 0.7); canvas.drawRoundRect(drect2, r * 0.15, r * 0.15, dp2);
      textPaint.textSize = r * 0.9; textPaint.color = pc2('#69F0AE');
      canvas.drawText(Math.floor(time * 2) % 2 === 0 ? '01' : '10', 0, cy + r * 0.3, textPaint); textPaint.color = Color.WHITE;
      break;
    case 13:
      canvas.save(); canvas.rotate(sin(time * 3) * 15, 0, cy);
      dp2.color = pc2('#8E24AA');
      dpath2.reset(); dpath2.moveTo(-r * 0.6, cy); dpath2.lineTo(-r * 1.3, cy - r * 0.5); dpath2.lineTo(-r * 1.3, cy + r * 0.5); dpath2.close(); canvas.drawPath(dpath2, dp2);
      dpath2.reset(); dpath2.moveTo(r * 0.6, cy); dpath2.lineTo(r * 1.3, cy - r * 0.5); dpath2.lineTo(r * 1.3, cy + r * 0.5); dpath2.close(); canvas.drawPath(dpath2, dp2);
      dp2.color = pc2('#FF7043'); canvas.drawCircle(0, cy, r * 0.65, dp2);
      dp2.color = Color.argb(160, 255, 255, 255); canvas.drawCircle(-r * 0.2, cy - r * 0.2, r * 0.18, dp2);
      canvas.restore();
      break;
    case 14: {
      const spin = Math.max(0.3, Math.abs(cos(time * 3)));
      dpath2.reset();
      dpath2.moveTo(-r * spin, cy - r * 0.8); dpath2.quadTo(0, cy - r * 1.1, r * spin, cy - r * 0.8); dpath2.quadTo(r * spin, cy, 0, cy + r); dpath2.quadTo(-r * spin, cy, -r * spin, cy - r * 0.8); dpath2.close();
      dp2.color = pc2('#FF2BD6'); canvas.drawPath(dpath2, dp2);
      ds2.color = Color.WHITE; ds2.strokeWidth = k * 0.015; canvas.drawPath(dpath2, ds2);
      break;
    }
    case 15:
      dp2.color = pc2('#F3E5C0'); canvas.drawRect(-r, cy - r * 0.45, r, cy + r * 0.45, dp2);
      dp2.color = pc2('#8D6E63'); canvas.drawCircle(-r, cy, r * 0.48, dp2); canvas.drawCircle(r, cy, r * 0.48, dp2);
      dp2.color = pc2('#C62828'); canvas.drawRect(-r * 0.12, cy - r * 0.48, r * 0.12, cy + r * 0.48, dp2);
      break;
    default:
      dp2.color = Color.WHITE; canvas.drawCircle(0, cy, r, dp2);
      ds2.strokeWidth = r * 0.3;
      for (let i = 0; i < 3; i++) {
        ds2.color = i % 2 === 0 ? pc2('#FF4081') : pc2('#76FF03');
        drect2.set(-r * 0.7, cy - r * 0.7, r * 0.7, cy + r * 0.7); canvas.drawArc(drect2, (time * 2 + i * 2.09) * 57.3, 60, false, ds2);
      }
  }
  return true;
}

function drawClockFace(canvas, x, y, r) {
  dp2.shader = null;
  dp2.color = pc2('#C9A13B'); canvas.drawCircle(x, y, r, dp2);
  dp2.color = pc2('#FFF8E1'); canvas.drawCircle(x, y, r * 0.86, dp2);
  ds2.color = pc2('#3E2A10');
  for (let i = 0; i < 12; i++) {
    const an = i * 0.5236; ds2.strokeWidth = r * (i % 3 === 0 ? 0.07 : 0.035);
    canvas.drawLine(x + Math.cos(an) * r * 0.7, y + Math.sin(an) * r * 0.7, x + Math.cos(an) * r * 0.82, y + Math.sin(an) * r * 0.82, ds2);
  }
  const m = time * 1.2;
  ds2.strokeWidth = r * 0.07; canvas.drawLine(x, y, x + Math.cos(m - 1.57) * r * 0.65, y + Math.sin(m - 1.57) * r * 0.65, ds2);
  ds2.strokeWidth = r * 0.1; canvas.drawLine(x, y, x + Math.cos(m / 12 - 1.57) * r * 0.45, y + Math.sin(m / 12 - 1.57) * r * 0.45, ds2);
  dp2.color = pc2('#3E2A10'); canvas.drawCircle(x, y, r * 0.07, dp2);
}

function drawChapterFinish2(canvas, p) {
  if (quest.season >= 17) { drawChapterFinish3(canvas, p); return; }
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45);
  dp2.shader = null;
  const R = (col, l, t, r, b) => { dp2.color = col; canvas.drawRect(l, t, r, b, dp2); };
  switch (quest.season) {
    case 9:
      ds2.color = pc2('#5D4037'); ds2.strokeWidth = k * 0.06; canvas.drawLine(bx, by, bx, by - k * 1.1, ds2);
      drawClockFace(canvas, bx, by - k * 1.45, k * 0.4);
      break;
    case 10:
      ds2.color = pc2('#388E3C'); ds2.strokeWidth = k * 0.06; canvas.drawLine(bx, by, bx, by - k * 1.2, ds2);
      dp2.color = pc2('#FF80AB');
      for (let i = 0; i < 6; i++) { const an = i * 1.047 + time * 0.5; canvas.drawCircle(bx + Math.cos(an) * k * 0.25, by - k * 1.45 + Math.sin(an) * k * 0.25, k * 0.18, dp2); }
      dp2.color = pc2('#FFD54F'); canvas.drawCircle(bx, by - k * 1.45, k * 0.16, dp2);
      break;
    case 11:
      R(pc2('#311B92'), bx - k * 0.3, by - k * 1.3, bx + k * 0.3, by);
      R(Math.floor(time * 3) % 2 === 0 ? pc2('#00E5FF') : pc2('#FF2BD6'), bx - k * 0.22, by - k * 1.2, bx + k * 0.22, by - k * 0.85);
      dp2.color = pc2('#FF5252'); canvas.drawCircle(bx - k * 0.1, by - k * 0.65, k * 0.06, dp2);
      dp2.color = pc2('#FFEB3B'); canvas.drawCircle(bx + k * 0.1, by - k * 0.65, k * 0.06, dp2);
      break;
    case 12:
      dp2.color = pc2('#C9A36A');
      dpath2.reset(); dpath2.moveTo(bx - k * 0.22, by); dpath2.lineTo(bx - k * 0.15, by - k * 1.5); dpath2.lineTo(bx, by - k * 1.75);
      dpath2.lineTo(bx + k * 0.15, by - k * 1.5); dpath2.lineTo(bx + k * 0.22, by); dpath2.close(); canvas.drawPath(dpath2, dp2);
      drawCollectible2(canvas, 12, bx, by - k * 0.95, k * 0.2, true);
      break;
    case 13:
      dp2.color = pc2('#7A7684'); drect2.set(bx - k * 0.32, by - k * 1.0, bx + k * 0.32, by); canvas.drawRoundRect(drect2, k * 0.3, k * 0.3, dp2);
      R(pc2('#55505E'), bx - k * 0.32, by - k * 0.2, bx + k * 0.32, by);
      textPaint.textSize = k * 0.25; textPaint.color = pc2('#3A3640'); canvas.drawText('RIP', bx, by - k * 0.5, textPaint); textPaint.color = Color.WHITE;
      dp2.color = Color.argb(clamp(Math.floor(180 + 60 * Math.sin(time * 9)), 0, 255), 255, 200, 80); canvas.drawCircle(bx + k * 0.45, by - k * 0.45, k * 0.07, dp2);
      break;
    case 14:
      ds2.color = pc2('#9E9E9E'); ds2.strokeWidth = k * 0.05; canvas.drawLine(bx, by, bx, by - k * 1.3, ds2);
      canvas.drawLine(bx, by, bx - k * 0.2, by + k * 0.05, ds2); canvas.drawLine(bx, by, bx + k * 0.2, by + k * 0.05, ds2);
      dp2.color = pc2('#424242'); canvas.drawCircle(bx, by - k * 1.42, k * 0.15, dp2);
      dp2.color = Color.argb(120, 255, 255, 255); canvas.drawCircle(bx - k * 0.04, by - k * 1.46, k * 0.05, dp2);
      break;
    case 15:
      R(pc2('#D32F2F'), bx - k * 0.5, by - k * 1.3, bx - k * 0.4, by);
      R(pc2('#D32F2F'), bx + k * 0.4, by - k * 1.3, bx + k * 0.5, by);
      R(pc2('#D32F2F'), bx - k * 0.65, by - k * 1.45, bx + k * 0.65, by - k * 1.32);
      R(pc2('#D32F2F'), bx - k * 0.5, by - k * 1.12, bx + k * 0.5, by - k * 1.04);
      R(pc2('#212121'), bx - k * 0.7, by - k * 1.52, bx + k * 0.7, by - k * 1.45);
      break;
    default:
      R(pc2('#8D5A3B'), bx - k * 0.4, by - k * 0.5, bx + k * 0.4, by);
      dp2.color = pc2('#FFF5E1'); drect2.set(bx - k * 0.42, by - k * 0.62, bx + k * 0.42, by - k * 0.42); canvas.drawRoundRect(drect2, k * 0.1, k * 0.1, dp2);
      dp2.color = pc2('#E53950'); canvas.drawCircle(bx, by - k * 0.78, k * 0.14, dp2);
      ds2.color = pc2('#3E7D2A'); ds2.strokeWidth = k * 0.025; canvas.drawLine(bx, by - k * 0.9, bx + k * 0.1, by - k * 1.1, ds2);
  }
}

/** Devant les blocs : tempête de sable (12), pénombre après l'éclair (13), bombes fumigènes (15). */
function drawChapterOverlay(canvas) {
  if (!quest.active || quest.season < 9) return;
  dp2.shader = null;
  if (quest.season === 12) {
    dp2.color = Color.argb(35, 210, 170, 100); canvas.drawRect(0, 0, w, h, dp2);
    ds2.strokeWidth = w * 0.004;
    for (let i = 0; i < 26; i++) {
      const q = (time * (0.35 + 0.2 * hash01(i)) + hash01(i * 3)) % 1, y = h * hash01(i * 7 + 2);
      ds2.color = Color.argb(110, 230, 200, 140);
      canvas.drawLine(w * (1.1 - q * 1.3), y, w * (1.1 - q * 1.3) + w * 0.06, y - w * 0.01, ds2);
    }
  } else if (quest.season === 13) {
    const u = time % 7;
    if (u < 0.12) { dp2.color = Color.argb(170, 255, 255, 255); canvas.drawRect(0, 0, w, h, dp2); }
    else if (u < 1.8) { dp2.color = Color.argb(Math.floor(175 * (1 - (u - 0.12) / 1.68)), 8, 4, 20); canvas.drawRect(0, 0, w, h, dp2); }
  } else if (quest.season === 15) {
    const u = time % 6;
    if (u >= 3 && u <= 4.3 && state !== State.QUEST_END && next) {
      const f = (u - 3) / 1.3, a = f < 0.2 ? f / 0.2 : 1 - (f - 0.2) / 0.8;
      const x = sx(next.cx, next.cz), y = sy(next.cx, 0.3, next.cz);
      for (let i = 0; i < 7; i++) {
        const an = i * 0.9;
        dp2.color = Color.argb(clamp(Math.floor(210 * a), 0, 255), 235, 235, 240);
        canvas.drawCircle(x + Math.cos(an) * k * (0.5 + f), y + Math.sin(an) * k * 0.35 * (1 + f), k * (0.55 + 0.3 * f), dp2);
      }
    }
  }
}

// ---------- Objets dorés ----------
function drawCollectible2(canvas, c, x, y, r, got) {
  if (c >= 17) { drawCollectible3(canvas, c, x, y, r, got); return; }
  dp2.shader = null;
  const gold = pc2('#FFC93C'), goldD = pc2('#C98A00'), sin = Math.sin, cos = Math.cos;
  if (got) { dp2.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, dp2); }
  switch (c) {
    case 9: drawGear(canvas, x, y, r * 0.9, time * 0.8, got ? gold : pc2('#8B5A3C'), 8); break;
    case 10:
      dpath2.reset(); dpath2.moveTo(x, y - r); dpath2.cubicTo(x + r * 0.9, y, x + r * 0.7, y + r * 0.9, x, y + r * 0.9);
      dpath2.cubicTo(x - r * 0.7, y + r * 0.9, x - r * 0.9, y, x, y - r); dpath2.close();
      dp2.color = got ? pc2('#FFB300') : Color.argb(120, 200, 235, 255); canvas.drawPath(dpath2, dp2);
      ds2.color = got ? goldD : Color.argb(200, 160, 200, 230); ds2.strokeWidth = r * 0.08; canvas.drawPath(dpath2, ds2);
      dp2.color = Color.argb(200, 255, 255, 255); canvas.drawCircle(x - r * 0.25, y + r * 0.2, r * 0.15, dp2);
      break;
    case 11:
      dp2.color = pc2('#9E9E9E'); canvas.drawRect(x - r * 0.35, y + r * 0.3, x - r * 0.2, y + r, dp2); canvas.drawRect(x + r * 0.2, y + r * 0.3, x + r * 0.35, y + r * 0.8, dp2);
      if (got) { dp2.color = Color.argb(90, 255, 230, 80); canvas.drawCircle(x, y - r * 0.1, r * 1.1, dp2); }
      dp2.color = got ? pc2('#FFEB3B') : pc2('#5D5A4A');
      drect2.set(x - r * 0.55, y - r * 0.9, x + r * 0.55, y + r * 0.4); canvas.drawRoundRect(drect2, r * 0.5, r * 0.5, dp2);
      dp2.color = Color.argb(170, 255, 255, 255); canvas.drawCircle(x - r * 0.2, y - r * 0.5, r * 0.15, dp2);
      break;
    case 12:
      ds2.color = got ? gold : pc2('#8C8C8C'); ds2.strokeWidth = r * 0.28;
      drect2.set(x - r * 0.38, y - r, x + r * 0.38, y - r * 0.2); canvas.drawOval(drect2, ds2);
      canvas.drawLine(x, y - r * 0.2, x, y + r, ds2);
      canvas.drawLine(x - r * 0.6, y + r * 0.05, x + r * 0.6, y + r * 0.05, ds2);
      break;
    case 13:
      dp2.color = got ? pc2('#FFB300') : pc2('#8D6E63'); drect2.set(x - r, y - r * 0.7, x + r, y + r * 0.75); canvas.drawOval(drect2, dp2);
      dp2.color = got ? pc2('#FFD54F') : pc2('#A1887F'); drect2.set(x - r * 0.45, y - r * 0.7, x + r * 0.45, y + r * 0.75); canvas.drawOval(drect2, dp2);
      dp2.color = pc2('#3E7D2A'); canvas.drawRect(x - r * 0.1, y - r, x + r * 0.1, y - r * 0.6, dp2);
      if (got) { dp2.color = pc2('#FFF8E1'); canvas.drawCircle(x - r * 0.35, y - r * 0.05, r * 0.12, dp2); canvas.drawCircle(x + r * 0.35, y - r * 0.05, r * 0.12, dp2); }
      break;
    case 14:
      dp2.color = got ? gold : pc2('#1B1B1B'); canvas.drawCircle(x, y, r, dp2);
      ds2.color = got ? goldD : pc2('#3A3A3A'); ds2.strokeWidth = r * 0.05;
      canvas.drawCircle(x, y, r * 0.75, ds2); canvas.drawCircle(x, y, r * 0.55, ds2);
      dp2.color = got ? pc2('#FFF3B0') : pc2('#E53950'); canvas.drawCircle(x, y, r * 0.3, dp2);
      dp2.color = pc2('#111111'); canvas.drawCircle(x, y, r * 0.07, dp2);
      break;
    case 15:
      canvas.save(); canvas.rotate(time * 40, x, y);
      dp2.color = got ? gold : pc2('#90A4AE');
      dpath2.reset();
      for (let i = 0; i < 4; i++) {
        const an = i * 1.5708;
        dpath2.moveTo(x + cos(an) * r * 0.25, y + sin(an) * r * 0.25);
        dpath2.lineTo(x + cos(an + 0.4) * r, y + sin(an + 0.4) * r);
        dpath2.lineTo(x + cos(an + 1.5708) * r * 0.25, y + sin(an + 1.5708) * r * 0.25);
      }
      dpath2.close(); canvas.drawPath(dpath2, dp2);
      dp2.color = got ? goldD : pc2('#546E7A'); canvas.drawCircle(x, y, r * 0.3, dp2);
      dp2.color = pc2('#263238'); canvas.drawCircle(x, y, r * 0.12, dp2);
      canvas.restore();
      break;
    default:
      dp2.color = got ? gold : pc2('#F5F5F5');
      dpath2.reset();
      dpath2.moveTo(x - r, y + r * 0.5); dpath2.lineTo(x - r, y - r * 0.4); dpath2.lineTo(x - r * 0.5, y); dpath2.lineTo(x, y - r * 0.7);
      dpath2.lineTo(x + r * 0.5, y); dpath2.lineTo(x + r, y - r * 0.4); dpath2.lineTo(x + r, y + r * 0.5); dpath2.close();
      canvas.drawPath(dpath2, dp2);
      ds2.color = got ? goldD : pc2('#BDBDBD'); ds2.strokeWidth = r * 0.08; canvas.drawPath(dpath2, ds2);
      dp2.color = pc2('#E53950'); canvas.drawCircle(x, y + r * 0.15, r * 0.13, dp2);
  }
}

// ---------- Cartes ----------
const aa2 = (a, c) => Color.argb(clamp(Math.floor(Color.alpha(c) * a), 0, 255), Color.red(c), Color.green(c), Color.blue(c));

function drawChapterMapBackground2(canvas, c) {
  if (c >= 17) { drawChapterMapBackground3(canvas, c); return; }
  const sin = Math.sin, cos = Math.cos, abs = Math.abs;
  const R = (col, l, t, r, b) => { dp2.color = col; canvas.drawRect(l, t, r, b, dp2); };
  const tri = (col, pts) => { dpath2.reset(); dpath2.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) dpath2.lineTo(pts[i], pts[i + 1]); dpath2.close(); dp2.color = col; canvas.drawPath(dpath2, dp2); };
  dp2.color = Color.WHITE;
  switch (c) {
    case 9: {
      dp2.shader = new LinearGradient(0, 0, 0, h, [0xFF3E2414, 0xFF7A4A24, 0xFFB07A3E, 0xFF4A2C16], [0, 0.4, 0.75, 1]); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      drawGear(canvas, w * 0.1, h * 0.45, w * 0.28, time * 0.15, aa2(0.5, 0xFF6D4321), 14);
      drawGear(canvas, w * 0.85, h * 0.62, w * 0.22, -time * 0.2, aa2(0.5, 0xFF8C5A2B), 12);
      drawGear(canvas, w * 0.6, h * 0.88, w * 0.18, time * 0.25, aa2(0.55, 0xFF6D4321), 10);
      ds2.color = pc2('#8C6239'); ds2.strokeWidth = w * 0.03;
      canvas.drawLine(w * 0.02, h * 0.25, w * 0.3, h * 0.25, ds2); canvas.drawLine(w * 0.3, h * 0.25, w * 0.3, h * 0.33, ds2);
      canvas.drawLine(w, h * 0.75, w * 0.75, h * 0.75, ds2);
      for (const [sx0, sy0] of [[w * 0.3, h * 0.33], [w * 0.75, h * 0.75]]) for (let i = 0; i < 4; i++) {
        const q = (time * 0.4 + i * 0.25) % 1;
        dp2.color = Color.argb(Math.floor(120 * (1 - q)), 255, 255, 255);
        canvas.drawCircle(sx0 + sin(q * 5 + i) * w * 0.02, sy0 + q * h * 0.06, w * (0.02 + 0.04 * q), dp2);
      }
      dp2.color = Color.argb(70, 255, 220, 140); canvas.drawCircle(w * 0.5, h * 0.06, w * 0.32, dp2);
      drawClockFace(canvas, w * 0.5, h * 0.06, w * 0.24);
      break;
    }
    case 10: {
      dp2.shader = new LinearGradient(0, 0, 0, h, [0xFFB9F6CA, 0xFF66BB6A, 0xFF2E7D32, 0xFF1B4D20], [0, 0.35, 0.7, 1]); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      for (let i = 0; i < 4; i++) { const x0 = w * (0.1 + 0.25 * i); tri(Color.argb(30, 255, 255, 200), [x0, 0, x0 + w * 0.08, 0, x0 + w * 0.25, h * 0.7, x0 + w * 0.1, h * 0.7]); }
      dp2.color = Color.argb(90, 60, 100, 140); drect2.set(w * 0.62, h * 0.36, w * 0.86, h * 0.44); canvas.drawRoundRect(drect2, w * 0.02, w * 0.02, dp2);
      ds2.color = Color.argb(90, 60, 100, 140); ds2.strokeWidth = w * 0.015; canvas.drawLine(w * 0.62, h * 0.4, w * 0.52, h * 0.36, ds2);
      for (let i = 0; i < 9; i++) {
        const x = w * (i / 8) + sin(i * 2.3) * w * 0.03, hh = h * (0.4 + 0.25 * hash01(i + 70));
        ds2.color = i % 2 === 0 ? pc2('#33691E') : pc2('#558B2F'); ds2.strokeWidth = w * 0.035;
        dpath2.reset(); dpath2.moveTo(x, h); dpath2.quadTo(x + sin(time * 0.6 + i) * w * 0.04, h - hh * 0.5, x + sin(time * 0.6 + i) * w * 0.07 + w * 0.03, h - hh);
        canvas.drawPath(dpath2, ds2);
      }
      for (const [fx, fy, col] of [[0.15, 0.55, '#FF80AB'], [0.88, 0.3, '#FFD54F'], [0.45, 0.82, '#B388FF']]) {
        dp2.color = pc2(col);
        for (let j = 0; j < 6; j++) { const an = j * 1.047 + time * 0.2; canvas.drawCircle(w * fx + cos(an) * w * 0.06, h * fy + sin(an) * w * 0.06, w * 0.05, dp2); }
        dp2.color = pc2('#FFEB3B'); canvas.drawCircle(w * fx, h * fy, w * 0.04, dp2);
      }
      for (let i = 0; i < 18; i++) {
        dp2.color = Color.argb(Math.floor(120 + 120 * abs(sin(time * 2 + i))), 255, 245, 150);
        canvas.drawCircle(w * hash01(i * 5 + 1) + sin(time * 0.8 + i) * w * 0.03, h * hash01(i * 9 + 2) + cos(time * 0.6 + i) * h * 0.02, w * 0.006, dp2);
      }
      break;
    }
    case 11: {
      dp2.shader = new LinearGradient(0, 0, 0, h, 0xFF05010F, 0xFF1A0533); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      for (let i = 0; i < 5; i++) {
        const x = w * (0.05 + 0.21 * i);
        R(pc2('#120A24'), x, h * 0.15, x + w * 0.12, h * 0.55);
        for (let j = 0; j < 10; j++) {
          const on = (Math.floor(time * 4) + i * 3 + j * 7) % 5 !== 0;
          dp2.color = on ? ((i + j) % 3 === 0 ? pc2('#00E5FF') : pc2('#FF2BD6')) : pc2('#2A1A40');
          canvas.drawCircle(x + w * 0.03, h * (0.18 + j * 0.035), w * 0.006, dp2);
        }
      }
      const hy = h * 0.6;
      ds2.color = Color.argb(200, 255, 43, 214); ds2.strokeWidth = w * 0.004;
      for (let i = -8; i <= 8; i++) canvas.drawLine(w / 2 + i * w * 0.04, hy, w / 2 + i * w * 0.3, h, ds2);
      for (let j = 0; j < 10; j++) { const q = ((j + time * 0.8) % 10) / 10, y = hy + (h - hy) * q * q; canvas.drawLine(0, y, w, y, ds2); }
      for (let i = 0; i < 3; i++) {
        const y = h * (0.08 + 0.04 * i);
        ds2.color = Color.argb(180, 255, 193, 7); ds2.strokeWidth = w * 0.006;
        canvas.drawLine(0, y, w * 0.4, y, ds2); canvas.drawLine(w * 0.4, y, w * 0.48, y + h * 0.04, ds2); canvas.drawLine(w * 0.48, y + h * 0.04, w, y + h * 0.04, ds2);
        const q = (time * 0.3 + i * 0.33) % 1;
        dp2.color = pc2('#FFF59D'); canvas.drawCircle(q * w, y + (q > 0.45 ? h * 0.04 : 0), w * 0.008, dp2);
      }
      break;
    }
    case 12: {
      dp2.shader = new LinearGradient(0, 0, 0, h, [0xFF3A2410, 0xFF8A5A2B, 0xFFC48A45, 0xFFE2B66A], [0, 0.35, 0.75, 1]); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      tri(Color.argb(35, 255, 240, 180), [w * 0.45, 0, w * 0.55, 0, w * 0.8, h, w * 0.2, h]);
      ds2.color = Color.argb(90, 60, 35, 10); ds2.strokeWidth = w * 0.006;
      for (let row = 0; row < 6; row++) for (let i = 0; i < 9; i++) {
        const x = w * (0.05 + i * 0.11), y = h * (0.12 + row * 0.1);
        switch ((row * 3 + i) % 4) {
          case 0: canvas.drawCircle(x, y, w * 0.015, ds2); break;
          case 1: canvas.drawLine(x, y - w * 0.02, x, y + w * 0.02, ds2); canvas.drawLine(x - w * 0.015, y, x + w * 0.015, y, ds2); break;
          case 2: drect2.set(x - w * 0.02, y - w * 0.015, x + w * 0.02, y + w * 0.015); canvas.drawArc(drect2, 180, 180, false, ds2); break;
          default: canvas.drawLine(x - w * 0.02, y + w * 0.015, x, y - w * 0.015, ds2); canvas.drawLine(x, y - w * 0.015, x + w * 0.02, y + w * 0.015, ds2);
        }
      }
      for (const tx of [w * 0.08, w * 0.92]) for (const ty of [h * 0.3, h * 0.6]) {
        R(pc2('#5D4037'), tx - w * 0.01, ty, tx + w * 0.01, ty + h * 0.05);
        chFlame(canvas, tx, ty, w * 0.04, w * (0.07 + 0.015 * sin(time * 9 + ty)), pc2('#FF9800'));
        dp2.color = Color.argb(50, 255, 180, 60); canvas.drawCircle(tx, ty - w * 0.03, w * 0.1, dp2);
      }
      dp2.color = pc2('#E2B66A'); drect2.set(-w * 0.3, h * 0.88, w * 0.7, h * 1.1); canvas.drawOval(drect2, dp2);
      dp2.color = pc2('#D4A55A'); drect2.set(w * 0.3, h * 0.9, w * 1.3, h * 1.12); canvas.drawOval(drect2, dp2);
      for (const jx of [w * 0.12, w * 0.88]) {
        R(pc2('#2B1D10'), jx - w * 0.06, h * 0.8, jx + w * 0.06, h * 0.92);
        tri(pc2('#2B1D10'), [jx - w * 0.04, h * 0.8, jx - w * 0.03, h * 0.72, jx, h * 0.76, jx + w * 0.03, h * 0.72, jx + w * 0.04, h * 0.8]);
      }
      break;
    }
    case 13: {
      dp2.shader = new LinearGradient(0, 0, 0, h, 0xFF120626, 0xFF3A1C5C); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      dp2.color = Color.argb(60, 255, 250, 220); canvas.drawCircle(w * 0.7, h * 0.15, w * 0.3, dp2);
      dp2.color = pc2('#FFF8DC'); canvas.drawCircle(w * 0.7, h * 0.15, w * 0.2, dp2);
      dp2.color = Color.argb(40, 150, 140, 110); canvas.drawCircle(w * 0.65, h * 0.13, w * 0.04, dp2); canvas.drawCircle(w * 0.76, h * 0.18, w * 0.03, dp2);
      R(pc2('#0E0618'), w * 0.2, h * 0.06, w * 0.55, h * 0.2);
      for (const tx of [w * 0.22, w * 0.5]) { tri(pc2('#0E0618'), [tx - w * 0.03, h * 0.08, tx, h * 0.01, tx + w * 0.03, h * 0.08]); R(pc2('#0E0618'), tx - w * 0.03, h * 0.08, tx + w * 0.03, h * 0.2); }
      for (let i = 0; i < 6; i++) R(Color.argb(clamp(Math.floor(180 + 60 * sin(time * 3 + i)), 0, 255), 255, 190, 80), w * (0.27 + (i % 3) * 0.08), h * (0.1 + Math.floor(i / 3) * 0.05), w * (0.3 + (i % 3) * 0.08), h * (0.13 + Math.floor(i / 3) * 0.05));
      for (let i = 0; i < 5; i++) {
        const bx = ((time * 0.05 + i * 0.21) % 1.2) * w - w * 0.1, by = h * (0.25 + 0.06 * sin(time + i * 2)), flap = sin(time * 12 + i) * w * 0.012;
        tri(pc2('#05020A'), [bx, by, bx - w * 0.03, by - flap, bx - w * 0.015, by + w * 0.005, bx, by + w * 0.01, bx + w * 0.015, by + w * 0.005, bx + w * 0.03, by - flap]);
      }
      ds2.color = pc2('#080410');
      for (const tx of [w * 0.08, w * 0.9]) {
        ds2.strokeWidth = w * 0.02; canvas.drawLine(tx, h, tx, h * 0.7, ds2);
        ds2.strokeWidth = w * 0.01; canvas.drawLine(tx, h * 0.78, tx - w * 0.07, h * 0.7, ds2); canvas.drawLine(tx, h * 0.74, tx + w * 0.06, h * 0.66, ds2);
      }
      ds2.strokeWidth = w * 0.006;
      for (let i = 0; i <= 12; i++) { const x = w * i / 12; canvas.drawLine(x, h * 0.98, x + sin(i * 1.7) * w * 0.01, h * 0.88, ds2); }
      canvas.drawLine(0, h * 0.9, w, h * 0.91, ds2);
      for (let i = 0; i < 6; i++) {
        const x = ((w * i * 0.25 + time * w * 0.02) % (w * 1.5)) - w * 0.25;
        dp2.color = Color.argb(60, 200, 190, 230); drect2.set(x - w * 0.25, h * 0.9, x + w * 0.25, h); canvas.drawOval(drect2, dp2);
      }
      break;
    }
    case 14: {
      dp2.shader = new LinearGradient(0, 0, 0, h, 0xFF07040F, 0xFF1C0F33); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      R(pc2('#111111'), w * 0.25, h * 0.02, w * 0.75, h * 0.15);
      dp2.shader = new LinearGradient(0, h * 0.03, w, h * 0.14, [0xFFFF2BD6, 0xFF00E5FF, 0xFFFFEB3B], null); canvas.drawRect(w * 0.27, h * 0.03, w * 0.73, h * 0.14, dp2); dp2.shader = null;
      for (const ax of [w * 0.05, w * 0.8]) for (let j = 0; j < 3; j++) {
        R(pc2('#1F1F24'), ax, h * (0.02 + j * 0.05), ax + w * 0.15, h * (0.065 + j * 0.05));
        dp2.color = pc2('#3A3A42'); canvas.drawCircle(ax + w * 0.075, h * (0.042 + j * 0.05), w * 0.02 * (1 + 0.1 * abs(sin(time * 6.28))), dp2);
      }
      const cols = [0xFFFF2BD6, 0xFF00E5FF, 0xFF76FF03, 0xFFFFEB3B];
      ds2.strokeWidth = w * 0.006;
      for (let i = 0; i < 8; i++) {
        const ox = w * (0.1 + 0.8 * (i % 4) / 3), an = sin(time * (0.8 + i * 0.13) + i) * 0.7;
        ds2.color = aa2(0.6, cols[i % 4]);
        canvas.drawLine(ox, h * 0.18, ox + sin(an) * h, h * 0.18 + cos(an) * h, ds2);
      }
      for (let i = 0; i < 5; i++) { dp2.color = Color.argb(40, 200, 180, 255); canvas.drawCircle(w * (0.1 + 0.2 * i) + sin(time * 0.3 + i) * w * 0.05, h * 0.85, w * 0.2, dp2); }
      for (let i = 0; i < 16; i++) {
        const x = w * (i / 15), jump = abs(sin(time * 6.28 + i * 0.9)) * h * 0.01;
        dp2.color = pc2('#05030A'); canvas.drawCircle(x, h * 0.93 - jump, w * 0.035, dp2);
        drect2.set(x - w * 0.045, h * 0.95 - jump, x + w * 0.045, h * 1.02); canvas.drawRoundRect(drect2, w * 0.03, w * 0.03, dp2);
        if (i % 3 === 0) { dp2.color = Color.argb(200, 255, 255, 220); canvas.drawCircle(x + w * 0.03, h * 0.88 - jump, w * 0.006, dp2); }
      }
      break;
    }
    case 15: {
      dp2.shader = new LinearGradient(0, 0, 0, h, [0xFFFCE4EC, 0xFFF8EEDC, 0xFFDCEDE1, 0xFFB9D8C8], [0, 0.35, 0.7, 1]); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      mountainRange(canvas, h * 0.5, h * 0.25, aa2(0.5, 0xFF9FB8B0), 7, 0, false);
      mountainRange(canvas, h * 0.72, h * 0.25, aa2(0.7, 0xFF7E9C92), 3, 0, false);
      R(Color.argb(160, 230, 245, 255), w * 0.78, h * 0.35, w * 0.83, h * 0.7);
      ds2.color = Color.argb(200, 255, 255, 255); ds2.strokeWidth = w * 0.004;
      for (let i = 0; i < 4; i++) { const q = (time * 0.8 + i * 0.25) % 1; canvas.drawLine(w * 0.79 + i * w * 0.01, h * (0.35 + 0.35 * q), w * 0.79 + i * w * 0.01, h * (0.38 + 0.35 * q), ds2); }
      ds2.color = pc2('#C62828'); ds2.strokeWidth = w * 0.02;
      drect2.set(w * 0.05, h * 0.6, w * 0.5, h * 0.75); canvas.drawArc(drect2, 180, 180, false, ds2);
      ds2.strokeWidth = w * 0.008;
      for (let i = 1; i <= 4; i++) canvas.drawLine(w * (0.05 + i * 0.09), h * 0.675 - sin(i / 5 * Math.PI) * h * 0.075, w * (0.05 + i * 0.09), h * 0.69, ds2);
      for (let j = 0; j < 4; j++) {
        const y = h * (0.04 + j * 0.035), hw = w * (0.08 + j * 0.025);
        dp2.color = pc2('#3E2723');
        dpath2.reset(); dpath2.moveTo(w / 2 - hw - w * 0.03, y + h * 0.02); dpath2.quadTo(w / 2, y - h * 0.01, w / 2 + hw + w * 0.03, y + h * 0.02); dpath2.lineTo(w / 2 + hw, y + h * 0.028); dpath2.lineTo(w / 2 - hw, y + h * 0.028); dpath2.close();
        canvas.drawPath(dpath2, dp2);
        R(pc2('#B71C1C'), w / 2 - hw * 0.8, y + h * 0.028, w / 2 + hw * 0.8, y + h * 0.035);
      }
      ds2.color = pc2('#5D4037'); ds2.strokeWidth = w * 0.015;
      canvas.drawLine(0, h * 0.3, w * 0.25, h * 0.24, ds2); canvas.drawLine(w * 0.15, h * 0.27, w * 0.22, h * 0.33, ds2);
      dp2.color = pc2('#F8BBD0');
      for (let i = 0; i < 12; i++) canvas.drawCircle(w * (0.03 + 0.02 * i) + sin(i * 2) * w * 0.02, h * (0.28 - 0.004 * i) + cos(i * 3) * h * 0.02, w * 0.022, dp2);
      for (let i = 0; i < 22; i++) {
        const q = (time * (0.05 + 0.03 * hash01(i)) + hash01(i * 3)) % 1;
        const x = (w * hash01(i * 7) + q * w * 0.5 + sin(time * 2 + i) * w * 0.02) % w;
        dp2.color = Color.argb(220, 248, 187, 208); drect2.set(x - w * 0.008, h * q - w * 0.005, x + w * 0.008, h * q + w * 0.005); canvas.drawOval(drect2, dp2);
      }
      break;
    }
    default: {
      dp2.shader = new LinearGradient(0, 0, 0, h, [0xFFFFE0F0, 0xFFFFF3E0, 0xFFF8D7B5, 0xFF8D5A3B], [0, 0.4, 0.7, 1]); canvas.drawRect(0, 0, w, h, dp2); dp2.shader = null;
      R(pc2('#A0622D'), w * 0.32, h * 0.05, w * 0.68, h * 0.18);
      for (const tx of [w * 0.32, w * 0.5, w * 0.68]) {
        R(pc2('#A0622D'), tx - w * 0.05, h * 0.03, tx + w * 0.05, h * 0.18);
        tri(pc2('#FF80AB'), [tx - w * 0.06, h * 0.03, tx, h * -0.01, tx + w * 0.06, h * 0.03]);
      }
      ds2.color = Color.WHITE; ds2.strokeWidth = w * 0.006;
      dpath2.reset(); dpath2.moveTo(w * 0.27, h * 0.06); for (let i = 0; i <= 10; i++) dpath2.lineTo(w * (0.27 + i * 0.046), h * (0.06 + (i % 2 === 0 ? 0 : 0.01))); canvas.drawPath(dpath2, ds2);
      dp2.color = pc2('#FFFDF7');
      for (const [x, y, r] of [[0.1, 0.62, 0.25], [0.5, 0.66, 0.3], [0.9, 0.6, 0.25]]) canvas.drawCircle(w * x, h * y, w * r, dp2);
      dp2.shader = new LinearGradient(0, h * 0.7, 0, h, 0xFF8D5A3B, 0xFF5D3A1F); canvas.drawRect(0, h * 0.72, w, h, dp2); dp2.shader = null;
      ds2.color = Color.argb(120, 200, 150, 110); ds2.strokeWidth = w * 0.006;
      for (let i = 0; i < 6; i++) { const y = h * (0.76 + i * 0.04), off = (time * w * 0.05 + i * w * 0.2) % w; canvas.drawLine(off - w * 0.1, y, off + w * 0.05, y, ds2); }
      for (const [x, y, col] of [[0.15, 0.42, '#FF4081'], [0.82, 0.4, '#40C4FF'], [0.55, 0.5, '#B2FF59']]) {
        ds2.color = Color.WHITE; ds2.strokeWidth = w * 0.015; canvas.drawLine(w * x, h * y, w * x, h * (y + 0.18), ds2);
        dp2.color = pc2(col); canvas.drawCircle(w * x, h * y, w * 0.08, dp2);
        ds2.strokeWidth = w * 0.012; drect2.set(w * x - w * 0.05, h * y - w * 0.05, w * x + w * 0.05, h * y + w * 0.05); canvas.drawArc(drect2, time * 60, 200, false, ds2);
      }
      const cols = [0xFFE53950, 0xFF3F8EFC, 0xFFFFC93C, 0xFF3DBE6E, 0xFFAB47BC];
      ds2.strokeWidth = w * 0.008;
      for (let i = 0; i < 26; i++) {
        const q = (time * (0.04 + 0.03 * hash01(i)) + hash01(i * 3)) % 1, x = w * hash01(i * 7 + 1), y = h * q, an = time * 2 + i;
        ds2.color = cols[i % cols.length];
        canvas.drawLine(x, y, x + cos(an) * w * 0.015, y + sin(an) * w * 0.015, ds2);
      }
    }
  }
}

function drawChapterNode2(canvas, c, x, y, rx, medals, unlocked, last) {
  const ry = rx * 0.5, sin = Math.sin, abs = Math.abs;
  const dim = (col) => (unlocked ? col : Theme.lerp(col, pc2('#7C8290'), 0.65)), D = (s) => dim(pc2(s));
  const ov = (col, l, t, r, b) => { dp2.color = col; drect2.set(l, t, r, b); canvas.drawOval(drect2, dp2); };
  dp2.shader = null;
  ov(Color.argb(55, 0, 0, 0), x - rx * 1.1, y + ry * 0.4, x + rx * 1.1, y + ry * 1.6);
  switch (c) {
    case 9:
      ds2.color = D('#6D5A3A'); ds2.strokeWidth = rx * 0.05;
      canvas.drawLine(x - rx * 0.6, y - ry * 3, x - rx * 0.5, y - ry * 0.3, ds2); canvas.drawLine(x + rx * 0.6, y - ry * 3, x + rx * 0.5, y - ry * 0.3, ds2);
      canvas.save(); canvas.scale(1, 0.5, x, y + ry * 0.4);
      drawGear(canvas, x, y + ry * 0.4, rx * 1.05, time * 0.3, D('#8C6A2B'), 14);
      drawGear(canvas, x, y + ry * 0.1, rx, time * 0.3, D('#C9A13B'), 14);
      canvas.restore();
      break;
    case 10:
      dp2.color = D('#F5F0E1'); canvas.drawRect(x - rx * 0.3, y, x + rx * 0.3, y + ry * 1.5, dp2);
      ov(D('#A52A2A'), x - rx * 1.05, y - ry * 0.3, x + rx * 1.05, y + ry);
      ov(D('#D93A3A'), x - rx * 1.05, y - ry * 0.7, x + rx * 1.05, y + ry * 0.7);
      for (const [u, v, r] of [[-0.6, 0, 0.14], [0.55, -0.1, 0.12], [0.1, 0.4, 0.1], [-0.2, -0.45, 0.09]]) ov(D('#FFFFFF'), x + rx * u - rx * r, y + ry * v - rx * r * 0.6, x + rx * u + rx * r, y + ry * v + rx * r * 0.6);
      break;
    case 11:
      ds2.color = D('#B0BEC5'); ds2.strokeWidth = rx * 0.05;
      for (let i = 0; i < 5; i++) {
        const u = -0.7 + i * 0.35;
        canvas.drawLine(x + rx * u, y + ry * 0.6, x + rx * u, y + ry * 1.1, ds2);
        canvas.drawLine(x - rx * 1.1, y + ry * u * 0.5, x - rx * 0.85, y + ry * u * 0.5, ds2);
        canvas.drawLine(x + rx * 0.85, y + ry * u * 0.5, x + rx * 1.1, y + ry * u * 0.5, ds2);
      }
      dp2.color = D('#16131F'); drect2.set(x - rx * 0.9, y - ry * 0.7, x + rx * 0.9, y + ry * 0.8); canvas.drawRoundRect(drect2, rx * 0.08, rx * 0.08, dp2);
      ds2.color = unlocked ? Color.argb(160, 0, 229, 255) : Color.argb(60, 150, 150, 150); ds2.strokeWidth = rx * 0.03;
      canvas.drawRoundRect(drect2, rx * 0.08, rx * 0.08, ds2);
      break;
    case 12:
      dp2.color = D('#B88A4A'); canvas.drawRect(x - rx * 0.8, y, x + rx * 0.8, y + ry * 1.5, dp2);
      ov(D('#E2C186'), x - rx * 0.95, y - ry * 0.5, x + rx * 0.95, y + ry * 0.5);
      ds2.color = D('#2F4F9E'); ds2.strokeWidth = rx * 0.04;
      for (let i = 0; i < 3; i++) { const lx = x - rx * 0.5 + i * rx * 0.5; drect2.set(lx - rx * 0.15, y + ry * 0.6, lx + rx * 0.15, y + ry * 1.2); canvas.drawArc(drect2, 180, 180, false, ds2); }
      break;
    case 13:
      ov(D('#4A4652'), x - rx * 1.05, y - ry * 0.1, x + rx * 1.05, y + ry * 1.2);
      ov(D('#6E6A78'), x - rx * 1.05, y - ry * 0.5, x + rx * 1.05, y + ry * 0.7);
      ov(D('#5C7A3A'), x - rx * 0.9, y + ry * 0.1, x - rx * 0.3, y + ry * 0.6);
      for (const u of [-0.95, 0.95, -0.5, 0.5]) {
        const cx = x + rx * u, cy = y + ry * (abs(u) > 0.7 ? 0.3 : 0.75);
        dp2.color = D('#7E57C2'); canvas.drawRect(cx - rx * 0.07, cy - ry * 0.5, cx + rx * 0.07, cy, dp2);
        if (unlocked) { dp2.color = Color.argb(clamp(Math.floor(200 + 50 * sin(time * 8 + u * 5)), 0, 255), 255, 200, 90); canvas.drawCircle(cx, cy - ry * 0.6, rx * 0.06, dp2); }
      }
      break;
    case 14: {
      dp2.color = D('#16161A'); drect2.set(x - rx * 0.95, y - ry * 0.2, x + rx * 0.95, y + ry * 1.5); canvas.drawRoundRect(drect2, rx * 0.08, rx * 0.08, dp2);
      const beat = unlocked ? 1 + 0.08 * abs(sin(time * 6.28)) : 1;
      dp2.color = D('#2E2E36'); canvas.drawCircle(x, y + ry * 0.75, rx * 0.4 * beat, dp2);
      dp2.color = D('#0A0A0C'); canvas.drawCircle(x, y + ry * 0.75, rx * 0.15, dp2);
      ov(D('#3A3A42'), x - rx, y - ry * 0.7, x + rx, y + ry * 0.3);
      break;
    }
    case 15:
      ov(D('#8FB9A8'), x - rx * 1.15, y + ry * 0.2, x + rx * 1.15, y + ry * 1.4);
      ov(D('#E8E2D0'), x - rx * 1.05, y - ry * 0.3, x + rx * 1.05, y + ry * 0.9);
      ds2.color = D('#C9C0A8'); ds2.strokeWidth = rx * 0.02;
      for (let i = 1; i <= 2; i++) { drect2.set(x - rx * 0.3 * i, y - ry * 0.15 * i + ry * 0.3, x + rx * 0.3 * i, y + ry * 0.15 * i + ry * 0.3); canvas.drawOval(drect2, ds2); }
      dp2.color = D('#9E9E9E'); canvas.drawRect(x + rx * 0.55, y - ry * 1.2, x + rx * 0.75, y + ry * 0.2, dp2);
      dp2.color = D('#757575'); canvas.drawRect(x + rx * 0.45, y - ry * 1.4, x + rx * 0.85, y - ry * 1.15, dp2);
      break;
    default: {
      const glaze = Math.floor(x / w * 10) % 2 === 0 ? '#FF9EC4' : '#9ED8FF';
      dp2.color = D('#C68B59');
      dpath2.reset(); dpath2.moveTo(x - rx * 0.8, y + ry * 0.1); dpath2.lineTo(x + rx * 0.8, y + ry * 0.1); dpath2.lineTo(x + rx * 0.6, y + ry * 1.5); dpath2.lineTo(x - rx * 0.6, y + ry * 1.5); dpath2.close();
      canvas.drawPath(dpath2, dp2);
      ds2.color = D('#A86E3E'); ds2.strokeWidth = rx * 0.03;
      for (let i = 0; i < 5; i++) canvas.drawLine(x - rx * 0.6 + i * rx * 0.3, y + ry * 0.15, x - rx * 0.48 + i * rx * 0.24, y + ry * 1.45, ds2);
      for (const [u, v, r] of [[-0.5, 0, 0.45], [0.5, 0, 0.45], [0, -0.25, 0.55]]) { dp2.color = D(glaze); canvas.drawCircle(x + rx * u, y + ry * v, rx * r, dp2); }
    }
  }
  if (!unlocked) return;
  const er = rx * 0.26, lift = ry * (c === 16 ? 0.9 : 0.35);
  drawCollectible2(canvas, c, x, y - ry * 0.28 - lift, er, (medals & 2) !== 0);
  drawCollectible2(canvas, c, x - rx * 0.38, y - ry * 0.02 - lift * 0.6, er, (medals & 1) !== 0);
  drawCollectible2(canvas, c, x + rx * 0.38, y - ry * 0.02 - lift * 0.6, er, (medals & 4) !== 0);
  if (last) {
    const s = rx * 0.25, cy = y - ry * 1.6 - lift;
    dp2.color = pc2('#FFC93C');
    dpath2.reset(); dpath2.moveTo(x - s, cy + s * 0.4); dpath2.lineTo(x - s, cy - s * 0.3); dpath2.lineTo(x - s * 0.5, cy + s * 0.05); dpath2.lineTo(x, cy - s * 0.5);
    dpath2.lineTo(x + s * 0.5, cy + s * 0.05); dpath2.lineTo(x + s, cy - s * 0.3); dpath2.lineTo(x + s, cy + s * 0.4); dpath2.close(); canvas.drawPath(dpath2, dp2);
  }
}

function drawChapterMapBoss2(canvas, c, x, y, nestR) {
  if (QuestProgress.done(c) >= Quest.LEVELS) return;
  drawHeroAt(canvas, ChapterInfo.hero(c), x - nestR * 1.25, y - nestR * 0.75 + Math.sin(time * 2) * w * 0.006, 1.3);
}
