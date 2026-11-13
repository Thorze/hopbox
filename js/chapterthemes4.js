'use strict';
// Saison 3 de l'Aventure, chapitres 19 à 24 (équivalent de ChapterThemes4.kt, appelé par chapterthemes3.js).
// 19 Atlantide · 20 Gravité zéro · 21 Far West · 22 Mine aux cristaux · 23 Cirque céleste · 24 Arène des champions

const qp4 = new Paint(), qs4 = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const qpath4 = new Path(), qrect4 = new RectF();
const pc4 = (s) => Color.parseColor(s);
const starPath4Buf = new Path();
/** Étoile à 5 branches (comme starPath de HeroIsland.kt) : rayons ro / ri, aplatie de sy, tournée de rot. */
function starPath4(cx, cy, ro, ri, sy, rot) {
  const p = starPath4Buf; p.reset();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? ro : ri, px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * sy; if (i === 0) p.moveTo(px, py); else p.lineTo(px, py); }
  p.close(); return p;
}

const CH4_MARBLE = [0xFFE6F2F2, 0xFFCFE6E8, 0xFFB8D8DC], CH4_PANELS = [0xFFB0BEC5, 0xFF90A4AE, 0xFFCFD8DC], CH4_MESA = [0xFFC8683F, 0xFFB85A38, 0xFFD8885A];
const CH4_CAVE = [0xFF5A4E66, 0xFF4E445A, 0xFF665A72], CH4_DRUMS = [0xFFE53935, 0xFF1E88E5, 0xFF8E24AA], CH4_ARENA = [0xFF8A7AA8, 0xFF7A6A98, 0xFF9A8AB8];

function chapterBlockLook4(b) {
  const c = b.color, k0 = b.kind, s = quest.season;
  const std = (color, mat, round = b.round) => ({ round, color, island: 0, material: mat, kind: k0, blink: false });
  if (b.finish) {
    switch (s) {
      case 19: return std(0xFFE0C068, 'metal', false); case 20: return std(0xFFECEFF1, 'metal', false); case 21: return std(0xFF8B5A2B, 'bois', false);
      case 22: return std(0xFF6E6E78, 'metal', false); case 23: return std(0xFFFFD54F, 'lisse', true); default: return std(0xFFE0A82E, 'metal', false);
    }
  }
  if (k0 === Kind.MINI) return std(0xFFF5C542, 'lisse');
  switch (s) {
    case 19: if (k0 === Kind.MOVING) return std(0xFFB8E4F0, 'lisse', true); if (k0 === Kind.CRUMBLY) return std(0xFFD8CBA8, 'granit', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFFFF7FA8, 'lisse', true); return std(CH4_MARBLE[c % 3], 'granit');
    case 20: if (k0 === Kind.MOVING) return std(0xFF3F51B5, 'metal', false); if (k0 === Kind.CRUMBLY) return std(0xFF7A7590, 'granit', true);
      if (k0 === Kind.TRAMPOLINE) return std(0xFFFF8A65, 'lisse', true); return std(CH4_PANELS[c % 3], 'metal');
    case 21: if (k0 === Kind.MOVING) return std(0xFF7A4A22, 'bois', false); if (k0 === Kind.CRUMBLY) return std(0xFFC9A26A, 'bois', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFFE8C547, 'bois', false); return std(CH4_MESA[c % 3], 'granit');
    case 22: if (k0 === Kind.MOVING) return std(0xFF5A5A66, 'metal', false); if (k0 === Kind.CRUMBLY) return std(0xFF8B6A40, 'bois', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFF9C6ADE, 'lisse', true); if (k0 === Kind.ICE) return std(0xFF8FE0FF, 'lisse', false); return std(CH4_CAVE[c % 3], 'granit');
    case 23: if (k0 === Kind.MOVING) return std(0xFFFFC93C, 'metal', false); if (k0 === Kind.CRUMBLY) return std(0xFFFFF0D8, 'lisse', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFF3949AB, 'lisse', true); return std(CH4_DRUMS[c % 3], 'lisse', true);
    default: if (k0 === Kind.MOVING) return std(0xFFE0A82E, 'metal', false); if (k0 === Kind.CRUMBLY) return std(0xFF3A2A5A, 'lisse', false);
      if (k0 === Kind.TRAMPOLINE) return std(0xFF7E57C2, 'lisse', true); return std(CH4_ARENA[c % 3], 'granit');
  }
}

/** Détails dessinés sur les blocs des chapitres 19 à 24 (repère du bloc, centre du dessus). */
function drawChapterDeco4(canvas, pl) {
  const a = pl.half, rx = 1.2247449 * k * a, ry = 0.70710677 * k * a, sin = Math.sin, cos = Math.cos, abs = Math.abs;
  qp4.shader = null;
  const seed = Math.abs(Math.trunc(pl.cx * 7 + pl.cz * 13)), kd = pl.kind;
  const ov = (f) => qrect4.set(-rx * f, -ry * f, rx * f, ry * f);
  const isoLine = (u0, v0, u1, v1) => canvas.drawLine(isoX(u0 * a, v0 * a), isoY(u0 * a, 0, v0 * a), isoX(u1 * a, v1 * a), isoY(u1 * a, 0, v1 * a), qs4);
  switch (pl.theme) {
    case 19:
      if (kd === Kind.MOVING) { qs4.color = Color.argb(140, 60, 120, 150); qs4.strokeWidth = k * 0.025; for (let i = -3; i <= 3; i++) canvas.drawLine(0, ry * 0.6, i * rx * 0.22, -ry * 0.7, qs4); }
      else if (kd === Kind.TRAMPOLINE) { qp4.color = pc4('#FFC0D8'); for (let i = 0; i < 7; i++) { const an = i * 0.9; canvas.drawCircle(cos(an) * rx * 0.45, sin(an) * ry * 0.45 - abs(sin(time * 3 + i)) * k * 0.12, k * 0.06, qp4); } }
      else if (kd === Kind.CRUMBLY) { qs4.color = Color.argb(150, 90, 80, 60); qs4.strokeWidth = k * 0.02; canvas.drawLine(-rx * 0.5, -ry * 0.2, 0, ry * 0.1, qs4); canvas.drawLine(0, ry * 0.1, rx * 0.4, -ry * 0.3, qs4); }
      else {
        qs4.color = Color.argb(90, 80, 130, 140); qs4.strokeWidth = k * 0.02; ov(0.75); canvas.drawOval(qrect4, qs4); ov(0.45); canvas.drawOval(qrect4, qs4);
        const q = (time * 0.5 + seed * 0.17) % 1; qs4.color = Color.argb(Math.floor(180 * (1 - q)), 230, 250, 255); canvas.drawCircle(rx * 0.2, -q * k * 1.4, k * 0.06, qs4);
      }
      break;
    case 20:
      if (kd === Kind.MOVING) { qs4.color = Color.argb(170, 140, 160, 255); qs4.strokeWidth = k * 0.02; for (let i = -2; i <= 2; i++) { isoLine(i * 0.35, -0.85, i * 0.35, 0.85); isoLine(-0.85, i * 0.35, 0.85, i * 0.35); } }
      else if (kd === Kind.CRUMBLY) { qp4.color = Color.argb(110, 40, 30, 60); qrect4.set(-rx * 0.5, -ry * 0.3, -rx * 0.1, ry * 0.05); canvas.drawOval(qrect4, qp4); qrect4.set(rx * 0.15, -ry * 0.05, rx * 0.45, ry * 0.25); canvas.drawOval(qrect4, qp4); }
      else if (kd === Kind.TRAMPOLINE) { qs4.color = 0xFFFFFFFF; qs4.strokeWidth = k * 0.04; ov(0.5); canvas.drawOval(qrect4, qs4); }
      else {
        qs4.color = Color.argb(110, 60, 70, 80); qs4.strokeWidth = k * 0.015; isoLine(0, -0.9, 0, 0.9); isoLine(-0.9, 0, 0.9, 0);
        qp4.color = Math.trunc(time * 2 + seed) % 2 === 0 ? pc4('#FF5252') : pc4('#69F0AE'); canvas.drawCircle(rx * 0.55, 0, k * 0.05, qp4);
      }
      break;
    case 21:
      if (kd === Kind.MOVING) { qp4.color = pc4('#3A2A1A'); for (const u of [-0.5, 0.5]) { qrect4.set(u * rx - k * 0.14, ry * 0.1, u * rx + k * 0.14, ry * 0.5); canvas.drawOval(qrect4, qp4); } }
      else if (kd === Kind.CRUMBLY) { qs4.color = Color.argb(130, 90, 60, 30); qs4.strokeWidth = k * 0.02; for (let i = -2; i <= 2; i++) isoLine(i * 0.35, -0.85, i * 0.35, 0.85); }
      else if (kd === Kind.TRAMPOLINE) { qs4.color = pc4('#C9A13B'); qs4.strokeWidth = k * 0.015; for (let i = 0; i < 8; i++) { const u = hash01(seed + i) - 0.5, v = hash01(seed + i * 3) - 0.5, x = isoX(u * a * 1.4, v * a * 1.4), y = isoY(u * a * 1.4, 0, v * a * 1.4); canvas.drawLine(x, y, x + k * 0.08, y - k * 0.03, qs4); } }
      else if (seed % 3 === 0) {
        // Petit cactus
        qp4.color = pc4('#3E8A3A'); qrect4.set(-k * 0.06, -k * 0.5, k * 0.06, 0); canvas.drawRoundRect(qrect4, k * 0.06, k * 0.06, qp4);
        qrect4.set(k * 0.04, -k * 0.34, k * 0.18, -k * 0.26); canvas.drawRect(qrect4, qp4); qrect4.set(k * 0.12, -k * 0.44, k * 0.18, -k * 0.26); canvas.drawRoundRect(qrect4, k * 0.03, k * 0.03, qp4);
      } else { qs4.color = Color.argb(70, 90, 30, 10); qs4.strokeWidth = k * 0.02; ov(0.7); canvas.drawArc(qrect4, 10, 160, false, qs4); }
      break;
    case 22:
      if (kd === Kind.MOVING) { const cols = [0xFF8FE0FF, 0xFFD08FFF, 0xFF8FFFC8]; for (let i = 0; i < 6; i++) { qp4.color = cols[i % 3]; canvas.drawCircle((i % 3 - 1) * rx * 0.3, Math.floor(i / 3) * ry * 0.3 - ry * 0.15, k * 0.09, qp4); } }
      else if (kd === Kind.CRUMBLY) { qs4.color = Color.argb(130, 60, 40, 20); qs4.strokeWidth = k * 0.02; for (let i = -1; i <= 1; i++) isoLine(-0.85, i * 0.4, 0.85, i * 0.4); }
      else if (kd === Kind.TRAMPOLINE) { qp4.color = Color.argb(Math.max(0, Math.min(255, Math.trunc(160 + 60 * sin(time * 3 + seed)))), 230, 200, 255); for (const [u, v] of [[-0.4, 0], [0.3, -0.3], [0.1, 0.35]]) canvas.drawCircle(u * rx, v * ry, k * 0.08, qp4); }
      else if (kd === Kind.ICE) { qs4.color = Color.argb(200, 255, 255, 255); qs4.strokeWidth = k * 0.02; canvas.drawLine(-rx * 0.5, ry * 0.1, -rx * 0.1, -ry * 0.4, qs4); canvas.drawLine(rx * 0.1, ry * 0.3, rx * 0.45, -ry * 0.2, qs4); }
      else if (seed % 3 === 0) { qp4.color = pc4('#B08FFF'); qpath4.reset(); qpath4.moveTo(-k * 0.08, 0); qpath4.lineTo(-k * 0.04, -k * 0.4); qpath4.lineTo(k * 0.02, -k * 0.5); qpath4.lineTo(k * 0.08, 0); qpath4.close(); canvas.drawPath(qpath4, qp4); }
      break;
    case 23:
      if (kd === Kind.MOVING) { qs4.color = pc4('#FFF6E0'); qs4.strokeWidth = k * 0.025; canvas.drawLine(-rx * 0.6, 0, -rx * 0.6, -k * 2.5, qs4); canvas.drawLine(rx * 0.6, 0, rx * 0.6, -k * 2.5, qs4); }
      else if (kd === Kind.CRUMBLY) { qs4.color = pc4('#E53935'); qs4.strokeWidth = k * 0.06; for (let i = -1; i <= 1; i++) isoLine(i * 0.45, -0.8, i * 0.45, 0.8); }
      else if (kd === Kind.TRAMPOLINE) { qs4.color = pc4('#FFD54F'); qs4.strokeWidth = k * 0.05; ov(0.85); canvas.drawOval(qrect4, qs4); }
      else { qs4.color = pc4('#FFD54F'); qs4.strokeWidth = k * 0.04; ov(0.9); canvas.drawOval(qrect4, qs4); qp4.color = 0xFFFFFFFF; canvas.drawPath(starPath4(0, 0, k * 0.22, k * 0.09, 0.58, 0), qp4); }
      break;
    case 24:
      if (kd === Kind.CRUMBLY) { for (let i = 0; i < 3; i++) { const q = (time * 0.6 + i * 0.33 + seed * 0.1) % 1; qp4.color = Color.argb(Math.floor(120 * (1 - q)), 150, 90, 220); canvas.drawCircle((i - 1) * rx * 0.3, -q * k * 0.8, k * (0.08 + 0.1 * q), qp4); } }
      else if (kd === Kind.MOVING) { qp4.color = Color.argb(Math.floor(90 + 50 * sin(time * 3)), 255, 230, 120); ov(0.7); canvas.drawOval(qrect4, qp4); }
      else if (kd === Kind.TRAMPOLINE) { qp4.color = pc4('#E1BEE7'); canvas.save(); canvas.rotate(time * 40); canvas.drawPath(starPath4(0, 0, k * 0.3, k * 0.12, 0.58, 0), qp4); canvas.restore(); }
      else { qs4.color = pc4('#E0A82E'); qs4.strokeWidth = k * 0.03; ov(0.88); canvas.drawOval(qrect4, qs4); }
      break;
  }
}

/** Objet à ramasser des chapitres 19 à 24 (false : la pièce classique, au chapitre 22). */
function drawChapterPickup4(canvas, cy, shadow) {
  const r = k * 0.18, sin = Math.sin;
  if (quest.season === 22) return false;
  qp4.shader = null;
  if (shadow) { qp4.color = Color.argb(45, 0, 0, 0); qrect4.set(-k * 0.17, -k * 0.1, k * 0.17, k * 0.1); canvas.drawOval(qrect4, qp4); }
  switch (quest.season) {
    case 19: {
      const sp = Math.max(0.25, Math.abs(Math.cos(time * 2.5)));
      qp4.color = Color.argb(80, 120, 240, 255); canvas.drawCircle(0, cy, r * 1.3, qp4);
      qpath4.reset(); qpath4.moveTo(0, cy - r); qpath4.lineTo(r * 0.7 * sp, cy); qpath4.lineTo(0, cy + r); qpath4.lineTo(-r * 0.7 * sp, cy); qpath4.close();
      qp4.color = pc4('#7FF6FF'); canvas.drawPath(qpath4, qp4); qs4.color = pc4('#2AA8C0'); qs4.strokeWidth = r * 0.08; canvas.drawPath(qpath4, qs4);
      break;
    }
    case 20: {
      qp4.color = pc4('#37474F'); qrect4.set(-r * 0.5, cy - r * 0.8, r * 0.5, cy + r * 0.8); canvas.drawRoundRect(qrect4, r * 0.12, r * 0.12, qp4);
      const lvl = 0.3 + 0.7 * ((time * 0.8) % 1); qp4.color = pc4('#69F0AE'); qrect4.set(-r * 0.36, cy + r * 0.66 - r * 1.3 * lvl, r * 0.36, cy + r * 0.66); canvas.drawRect(qrect4, qp4);
      qp4.color = pc4('#B0BEC5'); qrect4.set(-r * 0.2, cy - r * 0.95, r * 0.2, cy - r * 0.8); canvas.drawRect(qrect4, qp4);
      break;
    }
    case 21:
      qp4.color = pc4('#C9A26A'); canvas.drawCircle(0, cy + r * 0.2, r * 0.75, qp4);
      qpath4.reset(); qpath4.moveTo(-r * 0.3, cy - r * 0.5); qpath4.lineTo(r * 0.3, cy - r * 0.5); qpath4.lineTo(r * 0.15, cy - r * 0.9); qpath4.lineTo(-r * 0.15, cy - r * 0.9); qpath4.close(); canvas.drawPath(qpath4, qp4);
      qs4.color = pc4('#7A5028'); qs4.strokeWidth = r * 0.1; canvas.drawLine(-r * 0.3, cy - r * 0.5, r * 0.3, cy - r * 0.5, qs4);
      textPaint.textSize = r * 0.9; textPaint.color = pc4('#5A3A12'); canvas.drawText('$', 0, cy + r * 0.5, textPaint); textPaint.color = Color.WHITE;
      break;
    case 23: {
      const sw = sin(time * 2) * r * 0.15;
      qs4.color = 0xFFFFFFFF; qs4.strokeWidth = r * 0.06; canvas.drawLine(sw, cy + r * 0.8, 0, cy + r * 1.5, qs4);
      qp4.color = pc4('#FF5C9A'); qrect4.set(-r * 0.7 + sw, cy - r, r * 0.7 + sw, cy + r * 0.8); canvas.drawOval(qrect4, qp4);
      qp4.color = Color.argb(150, 255, 255, 255); canvas.drawCircle(-r * 0.25 + sw, cy - r * 0.4, r * 0.18, qp4);
      break;
    }
    default:
      qp4.color = Color.argb(Math.floor(90 + 40 * sin(time * 4)), 180, 120, 255); canvas.drawCircle(0, cy, r * 1.35, qp4);
      qp4.color = pc4('#7E57C2'); canvas.drawCircle(0, cy, r * 0.8, qp4);
      qp4.color = pc4('#E1BEE7'); canvas.drawCircle(-r * 0.25, cy - r * 0.25, r * 0.25, qp4);
  }
  return true;
}

/** Arrivée d'un niveau des chapitres 19 à 24 (repère du bloc). */
function drawChapterFinish4(canvas, p) {
  const bx = isoX(p.half * 0.45, p.half * 0.45), by = isoY(p.half * 0.45, 0, p.half * 0.45), sin = Math.sin;
  qp4.shader = null;
  switch (quest.season) {
    case 19:
      qp4.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(bx, by - k * 0.9, k * 0.6, qp4);
      qs4.color = pc4('#FFC93C'); qs4.strokeWidth = k * 0.07; canvas.drawLine(bx, by, bx, by - k * 1.5, qs4);
      for (const u of [-0.25, 0, 0.25]) canvas.drawLine(bx + u * k, by - k * 1.5, bx + u * k * 1.2, by - k * 1.85, qs4);
      canvas.drawLine(bx - k * 0.27, by - k * 1.5, bx + k * 0.27, by - k * 1.5, qs4);
      break;
    case 20:
      qp4.color = pc4('#ECEFF1'); qrect4.set(bx - k * 0.18, by - k * 1.1, bx + k * 0.18, by); canvas.drawRoundRect(qrect4, k * 0.18, k * 0.18, qp4);
      qp4.color = pc4('#E53935'); qpath4.reset(); qpath4.moveTo(bx - k * 0.18, by - k * 0.9); qpath4.lineTo(bx, by - k * 1.35); qpath4.lineTo(bx + k * 0.18, by - k * 0.9); qpath4.close(); canvas.drawPath(qpath4, qp4);
      qpath4.reset(); qpath4.moveTo(bx - k * 0.18, by - k * 0.3); qpath4.lineTo(bx - k * 0.34, by); qpath4.lineTo(bx - k * 0.18, by); qpath4.close(); canvas.drawPath(qpath4, qp4);
      qpath4.reset(); qpath4.moveTo(bx + k * 0.18, by - k * 0.3); qpath4.lineTo(bx + k * 0.34, by); qpath4.lineTo(bx + k * 0.18, by); qpath4.close(); canvas.drawPath(qpath4, qp4);
      qp4.color = pc4('#4FC3F7'); canvas.drawCircle(bx, by - k * 0.7, k * 0.09, qp4);
      break;
    case 21:
      qs4.color = pc4('#6A4A2A'); qs4.strokeWidth = k * 0.06; canvas.drawLine(bx, by, bx, by - k * 1.2, qs4);
      qp4.color = pc4('#C9A26A'); qrect4.set(bx - k * 0.4, by - k * 1.6, bx + k * 0.4, by - k * 1.1); canvas.drawRect(qrect4, qp4);
      qp4.color = pc4('#FFC93C'); canvas.drawPath(starPath4(bx, by - k * 1.35, k * 0.2, k * 0.1, 1, 0), qp4);
      break;
    case 22:
      qs4.color = pc4('#5A3A1E'); qs4.strokeWidth = k * 0.05; canvas.drawLine(bx, by, bx, by - k * 1.3, qs4); canvas.drawLine(bx, by - k * 1.3, bx + k * 0.3, by - k * 1.3, qs4);
      qp4.color = Color.argb(Math.max(0, Math.min(255, Math.trunc(140 + 60 * sin(time * 7)))), 255, 200, 100); canvas.drawCircle(bx + k * 0.3, by - k * 1.05, k * 0.25, qp4);
      qp4.color = pc4('#FFD890'); qrect4.set(bx + k * 0.2, by - k * 1.2, bx + k * 0.4, by - k * 0.9); canvas.drawRoundRect(qrect4, k * 0.05, k * 0.05, qp4);
      qp4.color = pc4('#8FE0FF'); qpath4.reset(); qpath4.moveTo(bx - k * 0.35, by); qpath4.lineTo(bx - k * 0.28, by - k * 0.5); qpath4.lineTo(bx - k * 0.2, by - k * 0.6); qpath4.lineTo(bx - k * 0.12, by); qpath4.close(); canvas.drawPath(qpath4, qp4);
      break;
    case 23:
      qp4.color = pc4('#1E88E5'); qrect4.set(bx - k * 0.4, by - k * 0.5, bx + k * 0.4, by); canvas.drawRect(qrect4, qp4);
      qp4.color = pc4('#E53935'); qrect4.set(bx - k * 0.45, by - k * 0.62, bx + k * 0.45, by - k * 0.48); canvas.drawRoundRect(qrect4, k * 0.05, k * 0.05, qp4);
      qp4.color = pc4('#FFD54F'); canvas.drawPath(starPath4(bx, by - k * 0.26, k * 0.17, k * 0.07, 1, 0), qp4);
      break;
    default:
      qp4.color = Color.argb(Math.floor(70 + 30 * sin(time * 3)), 255, 220, 90); canvas.drawCircle(bx, by - k * 0.8, k * 0.7, qp4);
      qp4.color = pc4('#5A3A6A'); qrect4.set(bx - k * 0.3, by - k * 0.25, bx + k * 0.3, by); canvas.drawRect(qrect4, qp4);
      drawCollectible4(canvas, 24, bx, by - k * 0.75, k * 0.45, true);
  }
}

// ---------- Objets dorés : tridents, météorites, étoiles de shérif, diamants, tickets, coupes ----------
function drawCollectible4(canvas, c, x, y, r, got) {
  qp4.shader = null;
  const gold = pc4('#FFC93C'), goldD = pc4('#C98A00'), main = got ? gold : pc4('#9A9AA2'), dark = got ? goldD : pc4('#6E6E78'), cos = Math.cos, sin = Math.sin;
  if (got) { qp4.color = Color.argb(70, 255, 220, 90); canvas.drawCircle(x, y, r * 1.3, qp4); }
  switch (c) {
    case 19:
      qs4.color = main; qs4.strokeWidth = r * 0.18;
      canvas.drawLine(x, y + r, x, y - r * 0.3, qs4);
      for (const u of [-0.5, 0, 0.5]) canvas.drawLine(x + u * r, y - r * 0.3, x + u * r * 1.1, y - r, qs4);
      canvas.drawLine(x - r * 0.55, y - r * 0.3, x + r * 0.55, y - r * 0.3, qs4);
      break;
    case 20:
      qp4.color = got ? Color.argb(160, 255, 170, 60) : Color.argb(90, 180, 180, 200);
      qpath4.reset(); qpath4.moveTo(x + r * 0.4, y - r * 0.5); qpath4.lineTo(x + r * 1.1, y - r * 1.1); qpath4.lineTo(x + r * 0.6, y + r * 0.1); qpath4.close(); canvas.drawPath(qpath4, qp4);
      qp4.color = main; canvas.drawCircle(x - r * 0.1, y + r * 0.1, r * 0.7, qp4);
      qp4.color = dark; canvas.drawCircle(x - r * 0.3, y - r * 0.05, r * 0.15, qp4); canvas.drawCircle(x + r * 0.15, y + r * 0.35, r * 0.12, qp4);
      break;
    case 21:
      qp4.color = main; canvas.drawPath(starPath4(x, y, r, r * 0.55, 1, 0), qp4);
      for (let i = 0; i < 5; i++) { const an = -1.5708 + i * 1.2566; canvas.drawCircle(x + cos(an) * r, y + sin(an) * r, r * 0.14, qp4); }
      qp4.color = dark; canvas.drawCircle(x, y, r * 0.25, qp4);
      break;
    case 22:
      qpath4.reset(); qpath4.moveTo(x - r * 0.8, y - r * 0.3); qpath4.lineTo(x - r * 0.4, y - r * 0.75); qpath4.lineTo(x + r * 0.4, y - r * 0.75); qpath4.lineTo(x + r * 0.8, y - r * 0.3); qpath4.lineTo(x, y + r * 0.9); qpath4.close();
      qp4.color = got ? gold : pc4('#B8D8E8'); canvas.drawPath(qpath4, qp4);
      qs4.color = dark; qs4.strokeWidth = r * 0.07; canvas.drawPath(qpath4, qs4);
      canvas.drawLine(x - r * 0.8, y - r * 0.3, x + r * 0.8, y - r * 0.3, qs4); canvas.drawLine(x - r * 0.25, y - r * 0.3, x, y + r * 0.9, qs4); canvas.drawLine(x + r * 0.25, y - r * 0.3, x, y + r * 0.9, qs4);
      break;
    case 23:
      canvas.save(); canvas.rotate(-12, x, y);
      qp4.color = main; qrect4.set(x - r, y - r * 0.55, x + r, y + r * 0.55); canvas.drawRoundRect(qrect4, r * 0.12, r * 0.12, qp4);
      qp4.color = got ? 0xFFFFF8DC : pc4('#C8C8D0'); canvas.drawCircle(x - r, y, r * 0.18, qp4); canvas.drawCircle(x + r, y, r * 0.18, qp4);
      qp4.color = dark; canvas.drawPath(starPath4(x, y, r * 0.32, r * 0.14, 1, 0), qp4);
      canvas.restore();
      break;
    default:
      qp4.color = main;
      qpath4.reset(); qpath4.moveTo(x - r * 0.7, y - r * 0.8); qpath4.lineTo(x + r * 0.7, y - r * 0.8); qpath4.quadTo(x + r * 0.65, y + r * 0.1, x, y + r * 0.2); qpath4.quadTo(x - r * 0.65, y + r * 0.1, x - r * 0.7, y - r * 0.8); qpath4.close(); canvas.drawPath(qpath4, qp4);
      qs4.color = main; qs4.strokeWidth = r * 0.12;
      qrect4.set(x - r * 1.0, y - r * 0.7, x - r * 0.45, y - r * 0.15); canvas.drawArc(qrect4, 90, 180, false, qs4);
      qrect4.set(x + r * 0.45, y - r * 0.7, x + r * 1.0, y - r * 0.15); canvas.drawArc(qrect4, -90, 180, false, qs4);
      qrect4.set(x - r * 0.12, y + r * 0.15, x + r * 0.12, y + r * 0.6); canvas.drawRect(qrect4, qp4);
      qrect4.set(x - r * 0.45, y + r * 0.6, x + r * 0.45, y + r * 0.85); canvas.drawRect(qrect4, qp4);
      qp4.color = Color.argb(140, 255, 255, 255); canvas.drawCircle(x - r * 0.3, y - r * 0.5, r * 0.12, qp4);
  }
}

// ---------- Décor de secours, comète et montgolfière qui passent ----------
function drawChapterMapBackground4(canvas, c) {
  const cols = { 19: [0xFF6FD8E8, 0xFF0D4F86, 0xFF04172E], 20: [0xFF05030F, 0xFF120A2E, 0xFF1E5AA8], 21: [0xFF3A2A6A, 0xFFFFB05A, 0xFFD8885A],
    22: [0xFF120A1E, 0xFF24163A, 0xFF0C0814], 23: [0xFF2A1A5A, 0xFFFF9AC0, 0xFFFFD8E8] }[c] || [0xFF1A0A2E, 0xFFB05AA0, 0xFFFFE0A0];
  qp4.color = Color.WHITE; qp4.shader = new LinearGradient(0, 0, 0, h, cols, [0, 0.5, 1]); canvas.drawRect(0, 0, w, h, qp4); qp4.shader = null;
}

/** Comète qui file, tête en (x, y), taille s, vers dir. */
function drawSkyComet(canvas, x, y, s, dir) {
  qp4.shader = null;
  for (let i = 0; i < 6; i++) { const f = i / 6; qp4.color = Color.argb(Math.floor(140 * (1 - f)), 255, 200 - Math.floor(80 * f), 120); canvas.drawCircle(x - dir * s * (0.6 + f * 3), y - s * f * 0.6, s * (0.5 - f * 0.07), qp4); }
  qp4.color = pc4('#FFF6D0'); canvas.drawCircle(x, y, s * 0.45, qp4);
}

/** Montgolfière rayée qui flotte, centre du ballon en (x, y), rayon s. */
function drawHotAirBalloon(canvas, x, y, s) {
  qp4.shader = null;
  qp4.color = pc4('#FFD54F'); qrect4.set(x - s, y - s * 1.15, x + s, y + s * 1.15); canvas.drawOval(qrect4, qp4);
  qp4.color = pc4('#E53935'); qrect4.set(x - s * 0.35, y - s * 1.15, x + s * 0.35, y + s * 1.15); canvas.drawOval(qrect4, qp4);
  qs4.color = pc4('#6A4A2A'); qs4.strokeWidth = s * 0.05;
  canvas.drawLine(x - s * 0.4, y + s, x - s * 0.25, y + s * 1.6, qs4); canvas.drawLine(x + s * 0.4, y + s, x + s * 0.25, y + s * 1.6, qs4);
  qp4.color = pc4('#8A5A2A'); qrect4.set(x - s * 0.28, y + s * 1.6, x + s * 0.28, y + s * 1.95); canvas.drawRect(qrect4, qp4);
}
