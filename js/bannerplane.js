'use strict';
/*
 * Avion à banderole (équivalent de BannerPlane.kt) : en mode libre, environ 1 partie sur 5, entre 5 et 45 points,
 * un petit avion traverse le ciel au loin en tirant une banderole d'encouragement avec le pseudo du joueur
 * (« Vas-y Bob ! »). Trois modèles (avion à hélice, biplan, hydravion), couleur et hauteur au hasard.
 * Messages : clés « plane.msgN » ({name} = pseudo) et « plane.anonN » quand le joueur n'a pas de pseudo.
 */
const BANNER_CHANCE = 0.2, BANNER_MSGS = 14, BANNER_ANON = 6, BANNER_NAME_MAX = 14;
const BANNER_COLORS = ['#E53950', '#3F8EFC', '#FFC93C', '#3DBE6E', '#FF7A45', '#8E5CD9', '#F5F5F5'];
/** Score à partir duquel l'avion passe dans cette partie, -1 = pas cette fois. */
let bannerAt = -1;

const bnP = new Paint(), bnS = new Paint({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const bnText = new Paint({ bold: true }), bnPath = new Path(), bnPath2 = new Path();

/** Nouvelle partie : y aura-t-il un avion à banderole, et à partir de quel score ? */
function bannerNewGame() { bannerAt = Math.random() < BANNER_CHANCE ? 5 + Math.floor(Math.random() * 36) : -1; }

/** Mode libre seulement (pas de duel, d'Aventure ni de tuto), pendant qu'on joue. */
function bannerAllowed() {
  return !quest.active && !duel.active && !tuto.active && (state === State.READY || state === State.CHARGING || state === State.JUMPING);
}

/** Lance l'avion quand le score est atteint (sans croiser un autre avion) ; appelé avec les autres passages du ciel. */
function checkBannerPlane() {
  if (bannerAt < 0 || score < bannerAt || score >= 50 || !bannerAllowed()) return;
  if (flyers.some((f) => f.kind === 'plane' || f.kind === 'banner')) return;   // un avion passe déjà : on attend
  bannerAt = -1;
  const raw = (myName() || '').trim();
  let text;
  if (raw) {
    const n = raw.length > BANNER_NAME_MAX ? raw.slice(0, BANNER_NAME_MAX - 1) + '…' : raw;
    text = tr('plane.msg' + (1 + Math.floor(Math.random() * BANNER_MSGS)), { name: n });
  } else text = tr('plane.anon' + (1 + Math.floor(Math.random() * BANNER_ANON)));
  // Assez lent pour lire, entre le haut de l'écran (score, classement) et les blocs
  const f = { kind: 'banner', t: 0, dur: 15 + Math.random() * 3, ltr: Math.random() < 0.5, y: h * (0.3 + Math.random() * 0.12), s: w * 0.055,
    text, model: Math.floor(Math.random() * 3), color: Color.parseColor(BANNER_COLORS[Math.floor(Math.random() * BANNER_COLORS.length)]) };
  flyers.push(f);
  nextPlane = Math.max(nextPlane, f.dur + 5);   // pas d'autre avion pendant sa traversée
}

/** Décalage vertical du tissu à la distance d du bord avant (la vague grandit vers l'arrière). */
function bannerWave(d, s) {
  const amp = s * (0.04 + 0.1 * clamp(d / (s * 10), 0, 1));
  return Math.sin(d / s * 1.6 - time * 7) * amp;
}

/** Avion + câbles + banderole qui ondule, avec le message. p = avancée de 0 à 1. */
function drawBannerPlane(canvas, f, p, night) {
  const s = f.s, dir = f.ltr ? 1 : -1;
  bnText.textSize = s * 0.62;
  const tw = bnText.measureText(f.text), bh = s * 0.95, bl = tw + s * 1.2, gap = s * 1.3;
  const span = w + bl + gap + s * 6;
  // Le nez part juste hors de l'écran, la banderole sort entièrement de l'autre côté
  const x = f.ltr ? -s * 2 + p * span : w + s * 2 - p * span;
  const y = f.y + Math.sin(time * 1.3) * s * 0.15;
  const tail = x - dir * s * 1.1, front = tail - dir * gap, by = y + s * 0.1;
  // Câbles
  bnS.color = Color.argb(150, 60, 60, 70); bnS.strokeWidth = s * 0.04;
  canvas.drawLine(tail, y, front, by - bh / 2 + bannerWave(0, s), bnS);
  canvas.drawLine(tail, y, front, by + bh / 2 + bannerWave(0, s), bnS);
  // Banderole : un tissu lisse dont les deux bords suivent la même vague (épaisseur constante)
  const n = 48, step = bl / n;
  bnP.shader = null;
  bnPath.reset();
  for (let i = 0; i <= n; i++) {
    const d = i * step, px = front - dir * d, py = by - bh / 2 + bannerWave(d, s);
    if (i === 0) bnPath.moveTo(px, py); else bnPath.lineTo(px, py);
  }
  for (let i = n; i >= 0; i--) { const d = i * step; bnPath.lineTo(front - dir * d, by + bh / 2 + bannerWave(d, s)); }
  bnPath.close();
  // Ombre douce sous le tissu (il se détache mieux sur un ciel clair)
  canvas.save(); canvas.translate(0, s * 0.09);
  bnP.color = Color.argb(40, 40, 50, 80); canvas.drawPath(bnPath, bnP);
  canvas.restore();
  bnP.color = Color.parseColor('#FBF7EC'); canvas.drawPath(bnPath, bnP);
  // Plis : ombre douce là où le tissu descend, reflet là où il monte (suit la pente de la vague)
  for (let i = 0; i < n; i++) {
    const d0 = i * step, d1 = d0 + step, w0 = bannerWave(d0, s), w1 = bannerWave(d1, s);
    const a = clamp((w1 - w0) / step * 380, -60, 60);
    bnP.color = a > 0 ? Color.argb(Math.floor(a), 120, 95, 60) : Color.argb(Math.floor(-a * 0.8), 255, 255, 255);
    const x0 = front - dir * d0, x1 = front - dir * (d1 + 0.5);
    bnPath2.reset();
    bnPath2.moveTo(x0, by - bh / 2 + w0); bnPath2.lineTo(x1, by - bh / 2 + w1);
    bnPath2.lineTo(x1, by + bh / 2 + w1); bnPath2.lineTo(x0, by + bh / 2 + w0); bnPath2.close();
    canvas.drawPath(bnPath2, bnP);
  }
  // Contour fin et discret, et la barre où s'accrochent les câbles
  bnS.color = Color.argb(70, 90, 80, 60); bnS.strokeWidth = s * 0.025;
  canvas.drawPath(bnPath, bnS);
  bnS.color = Color.parseColor('#5D4037'); bnS.strokeWidth = s * 0.06;
  const wf = bannerWave(0, s);
  canvas.drawLine(front, by - bh / 2 + wf - s * 0.06, front, by + bh / 2 + wf + s * 0.06, bnS);
  // Texte, lettre par lettre sur la vague ; toujours lisible de gauche à droite
  bnText.color = Color.parseColor('#C62828');
  let cx = f.ltr ? front - bl + s * 0.6 : front + s * 0.6;
  const base = by + bnText.textSize * 0.36;
  for (const ch of f.text) {
    const d = f.ltr ? front - (cx + s * 0.1) : (cx + s * 0.1) - front;
    canvas.drawText(ch, cx, base + bannerWave(d, s), bnText);
    cx += bnText.measureText(ch);
  }
  // L'avion (dessiné tourné vers la droite, retourné s'il va à gauche)
  canvas.save();
  canvas.scale(dir, 1, x, y);
  if (f.model === 1) drawBiplane(canvas, x, y, s, f.color); else drawPropPlane(canvas, x, y, s, f.color, f.model === 2);
  canvas.restore();
  if (night > 0.3 && Math.sin(time * 8) > 0.3) {
    bnP.color = Color.argb(220, 255, 70, 70);
    canvas.drawCircle(x - dir * s * 0.9, y - s * 0.45, s * 0.07, bnP);
  }
}

function bnDark(c, f) { return Color.rgb(Math.floor(Color.red(c) * f), Math.floor(Color.green(c) * f), Math.floor(Color.blue(c) * f)); }

/** Hélice qui tourne (disque flou) au nez, en (x, y). */
function drawProp(canvas, x, y, s) {
  bnP.shader = null;
  bnP.color = Color.argb(90, 230, 230, 230);
  const k = Math.abs(Math.sin(time * 30));
  canvas.drawOval(new RectF(x - s * 0.06, y - s * (0.2 + 0.3 * k), x + s * 0.06, y + s * (0.2 + 0.3 * k)), bnP);
  bnP.color = Color.parseColor('#555A66');
  canvas.drawCircle(x, y, s * 0.08, bnP);
}

/** Petit avion à aile haute (floats = hydravion à flotteurs au lieu des roues). */
function drawPropPlane(canvas, x, y, s, c, floats) {
  bnP.shader = null;
  const d = bnDark(c, 0.75);
  // Dérive
  bnP.color = d;
  bnPath.reset(); bnPath.moveTo(x - s * 1.0, y - s * 0.05); bnPath.lineTo(x - s * 1.15, y - s * 0.5);
  bnPath.lineTo(x - s * 0.9, y - s * 0.5); bnPath.lineTo(x - s * 0.65, y - s * 0.05); bnPath.close();
  canvas.drawPath(bnPath, bnP);
  // Fuselage
  bnP.color = c;
  bnPath.reset();
  bnPath.moveTo(x + s * 0.75, y - s * 0.05);
  bnPath.quadTo(x + s * 0.7, y - s * 0.28, x + s * 0.3, y - s * 0.3);
  bnPath.lineTo(x - s * 0.3, y - s * 0.2); bnPath.lineTo(x - s * 1.1, y - s * 0.08); bnPath.lineTo(x - s * 1.1, y + s * 0.02);
  bnPath.lineTo(x - s * 0.3, y + s * 0.18);
  bnPath.quadTo(x + s * 0.6, y + s * 0.22, x + s * 0.75, y + s * 0.05);
  bnPath.close();
  canvas.drawPath(bnPath, bnP);
  // Vitre de la cabine
  bnP.color = Color.argb(230, 170, 215, 245);
  bnPath.reset(); bnPath.moveTo(x + s * 0.42, y - s * 0.27); bnPath.lineTo(x + s * 0.6, y - s * 0.08);
  bnPath.lineTo(x + s * 0.12, y - s * 0.08); bnPath.lineTo(x + s * 0.12, y - s * 0.27); bnPath.close();
  canvas.drawPath(bnPath, bnP);
  // Aile haute
  bnP.color = d;
  canvas.drawRoundRect(new RectF(x - s * 0.25, y - s * 0.4, x + s * 0.55, y - s * 0.3), s * 0.05, s * 0.05, bnP);
  bnS.color = d; bnS.strokeWidth = s * 0.04;
  canvas.drawLine(x + s * 0.05, y - s * 0.3, x - s * 0.05, y + s * 0.1, bnS);
  if (floats) {
    canvas.drawLine(x + s * 0.3, y + s * 0.18, x + s * 0.3, y + s * 0.42, bnS);
    canvas.drawLine(x - s * 0.25, y + s * 0.16, x - s * 0.25, y + s * 0.42, bnS);
    bnP.color = Color.WHITE;
    bnPath.reset(); bnPath.moveTo(x - s * 0.55, y + s * 0.42); bnPath.lineTo(x + s * 0.55, y + s * 0.42);
    bnPath.quadTo(x + s * 0.75, y + s * 0.42, x + s * 0.7, y + s * 0.55); bnPath.lineTo(x - s * 0.5, y + s * 0.55); bnPath.close();
    canvas.drawPath(bnPath, bnP);
  } else {
    canvas.drawLine(x + s * 0.2, y + s * 0.18, x + s * 0.25, y + s * 0.38, bnS);
    bnP.color = Color.parseColor('#2B2B2B');
    canvas.drawCircle(x + s * 0.25, y + s * 0.4, s * 0.08, bnP);
  }
  drawProp(canvas, x + s * 0.78, y, s);
}

/** Biplan : deux ailes reliées par des mâts, pilote dans le cockpit ouvert. */
function drawBiplane(canvas, x, y, s, c) {
  bnP.shader = null;
  const d = bnDark(c, 0.75);
  bnP.color = d;
  canvas.drawRoundRect(new RectF(x - s * 0.3, y + s * 0.12, x + s * 0.5, y + s * 0.2), s * 0.04, s * 0.04, bnP);
  bnPath.reset(); bnPath.moveTo(x - s * 0.95, y - s * 0.02); bnPath.lineTo(x - s * 1.1, y - s * 0.42);
  bnPath.lineTo(x - s * 0.88, y - s * 0.42); bnPath.lineTo(x - s * 0.65, y - s * 0.02); bnPath.close();
  canvas.drawPath(bnPath, bnP);
  bnP.color = c;
  bnPath.reset(); bnPath.moveTo(x + s * 0.7, y - s * 0.12); bnPath.lineTo(x - s * 1.05, y - s * 0.06);
  bnPath.lineTo(x - s * 1.05, y + s * 0.04); bnPath.lineTo(x + s * 0.7, y + s * 0.14); bnPath.close();
  canvas.drawPath(bnPath, bnP);
  bnP.color = Color.parseColor('#8A8F99');
  canvas.drawRoundRect(new RectF(x + s * 0.5, y - s * 0.16, x + s * 0.78, y + s * 0.17), s * 0.08, s * 0.08, bnP);
  bnP.color = Color.parseColor('#6D4C41'); canvas.drawCircle(x + s * 0.05, y - s * 0.2, s * 0.11, bnP);
  bnP.color = Color.argb(230, 170, 215, 245); canvas.drawCircle(x + s * 0.12, y - s * 0.22, s * 0.04, bnP);
  bnS.color = d; bnS.strokeWidth = s * 0.035;
  canvas.drawLine(x - s * 0.15, y + s * 0.12, x - s * 0.15, y - s * 0.38, bnS);
  canvas.drawLine(x + s * 0.38, y + s * 0.12, x + s * 0.38, y - s * 0.38, bnS);
  bnP.color = d;
  canvas.drawRoundRect(new RectF(x - s * 0.35, y - s * 0.46, x + s * 0.55, y - s * 0.37), s * 0.04, s * 0.04, bnP);
  canvas.drawLine(x + s * 0.2, y + s * 0.14, x + s * 0.25, y + s * 0.36, bnS);
  bnP.color = Color.parseColor('#2B2B2B'); canvas.drawCircle(x + s * 0.25, y + s * 0.38, s * 0.08, bnP);
  drawProp(canvas, x + s * 0.8, y, s);
}
