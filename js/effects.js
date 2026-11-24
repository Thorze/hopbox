'use strict';
// Effets visuels, traînées et ciel (équivalent de Effects.kt).

const PK = { CIRCLE: 0, STAR: 1, NOTE: 2, HEART: 3, BUBBLE: 4, FLAKE: 5, BAT: 6, GIFT: 7 };
const GIFT_TRAIL_COLS = ['#D62839', '#1E8C4E', '#E0A526', '#2547A0', '#C2367A'];
const mkParticle = (x, y, vx, vy, life, size, color, gravity, kind = PK.CIRCLE) => ({ x, y, vx, vy, life, maxLife: life, size, color, gravity, kind });

function spawnDust(x, z) {
  const bx = sx(x, z) + camX, by = sy(x, 0, z) + camY;
  for (let i = 0; i < 8; i++) {
    const a = rnd() * 6.283, sp = k * (0.6 + rnd() * 0.8);
    particles.push(mkParticle(bx, by, Math.cos(a) * sp, Math.sin(a) * sp * 0.4 - k * 0.3, 0.45, k * (0.05 + rnd() * 0.05), Color.argb(170, 235, 230, 225), 0));
  }
}

function spawnSparkles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = rnd() * 6.283, sp = k * (1.5 + rnd() * 2);
    particles.push(mkParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - k * 1.2, 0.7, k * (0.06 + rnd() * 0.05), color, k * 4, PK.STAR));
  }
}

function spawnDebris(p) {
  const bx = sx(p.cx, p.cz) + camX, by = sy(p.cx, 0, p.cz) + camY;
  for (let i = 0; i < 14; i++) {
    particles.push(mkParticle(bx + (rnd() - 0.5) * k * p.half * 2.4, by + rnd() * k * 0.8, (rnd() - 0.5) * k * 2, -rnd() * k * 1.5,
      1.1, k * (0.08 + rnd() * 0.1), shade(p.baseColor, 0.7 + rnd() * 0.3), k * 9));
  }
}

function shake(amount) {
  shakeT = 0.35;
  shakeAmp = Math.max(shakeAmp * (shakeT / 0.35), amount * k);
}

const RIBBON_LIFE = 0.35;

function updateEffects(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 1.5 * dt;
  }
  particles = particles.filter((p) => p.life > 0);
  if (shakeT > 0) {
    shakeT = Math.max(0, shakeT - dt);
    const f = shakeT / 0.35;
    shakeX = (rnd() * 2 - 1) * shakeAmp * f; shakeY = (rnd() * 2 - 1) * shakeAmp * f;
  } else { shakeX = 0; shakeY = 0; shakeAmp = 0; }
  for (const r of ribbon) r[2] -= dt;
  ribbon = ribbon.filter((r) => r[2] > 0);
  // Messages : seuls ceux affichés s'usent, les suivants attendent leur tour (voir drawBanners)
  let shown = 0;
  for (const b of banners) { if (!b.notice && shown++ >= MAX_BANNERS) continue; b.life -= dt; }
  banners = banners.filter((b) => b.life > 0);
}

function drawStar(canvas, x, y, r, paint) {
  tmpPath.reset();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const X = x + rr * Math.cos(a), Y = y + rr * Math.sin(a);
    if (i === 0) tmpPath.moveTo(X, Y); else tmpPath.lineTo(X, Y);
  }
  tmpPath.close();
  canvas.drawPath(tmpPath, paint);
}

function drawHeart(canvas, x, y, sz, paint) {
  tmpPath.reset();
  tmpPath.moveTo(x, y + sz * 0.9);
  tmpPath.cubicTo(x - sz * 1.6, y - sz * 0.2, x - sz * 0.6, y - sz * 1.3, x, y - sz * 0.45);
  tmpPath.cubicTo(x + sz * 0.6, y - sz * 1.3, x + sz * 1.6, y - sz * 0.2, x, y + sz * 0.9);
  tmpPath.close();
  canvas.drawPath(tmpPath, paint);
}

function drawParticles(canvas) {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    accPaint.color = p.color;
    accPaint.alpha = Math.floor(Color.alpha(p.color) * a);
    const x = p.x - camX + shakeX, y = p.y - camY + shakeY;
    switch (p.kind) {
      case PK.STAR: drawStar(canvas, x, y, p.size * (0.6 + 0.4 * a), accPaint); break;
      case PK.HEART: drawHeart(canvas, x, y, p.size, accPaint); break;
      case PK.NOTE:
        bangPaint.color = p.color; bangPaint.alpha = accPaint.alpha; bangPaint.textSize = p.size * 3;
        canvas.drawText('♪', x, y, bangPaint);
        bangPaint.color = Color.parseColor('#E53950');
        break;
      case PK.BUBBLE: {
        accStroke.color = p.color; accStroke.alpha = accPaint.alpha; accStroke.strokeWidth = k * 0.03;
        const r = p.size * (1.6 - 0.6 * a);
        accPaint.color = Color.argb(Math.floor(90 * a), 200, 230, 255);
        canvas.drawCircle(x, y, r, accPaint);
        canvas.drawCircle(x, y, r, accStroke);
        accStroke.alpha = 255;
        break;
      }
      case PK.FLAKE: {
        // Flocon : trois traits croisés qui tournent doucement
        accStroke.color = p.color; accStroke.alpha = accPaint.alpha; accStroke.strokeWidth = p.size * 0.28;
        const ang = p.life * 2;
        for (let i = 0; i < 3; i++) {
          const c = Math.cos(ang + i * Math.PI / 3) * p.size, s = Math.sin(ang + i * Math.PI / 3) * p.size;
          canvas.drawLine(x - c, y - s, x + c, y + s, accStroke);
        }
        accStroke.alpha = 255;
        break;
      }
      case PK.BAT: {
        // Petite chauve-souris qui bat des ailes
        const s = p.size, flap = Math.sin(p.life * 30) * s * 0.6;
        tmpPath.reset();
        tmpPath.moveTo(x, y);
        tmpPath.quadTo(x - s * 0.6, y - s * 0.3 - flap, x - s * 1.3, y - flap);
        tmpPath.quadTo(x - s * 0.7, y + s * 0.1, x, y + s * 0.35);
        tmpPath.quadTo(x + s * 0.7, y + s * 0.1, x + s * 1.3, y - flap);
        tmpPath.quadTo(x + s * 0.6, y - s * 0.3 - flap, x, y);
        tmpPath.close();
        canvas.drawPath(tmpPath, accPaint);
        canvas.drawCircle(x, y + s * 0.05, s * 0.3, accPaint);
        break;
      }
      case PK.GIFT: {
        // Paquet cadeau : boîte de couleur, ruban croisé doré et petit nœud, qui tourne doucement
        const s = p.size;
        canvas.save(); canvas.rotate(p.life * 90, x, y);
        canvas.drawRect(x - s, y - s, x + s, y + s, accPaint);
        accPaint.color = Color.parseColor(p.color === Color.parseColor('#E0A526') ? '#D62839' : '#FFD54F'); accPaint.alpha = Math.floor(255 * a);
        canvas.drawRect(x - s * 0.2, y - s, x + s * 0.2, y + s, accPaint);
        canvas.drawRect(x - s, y - s * 0.2, x + s, y + s * 0.2, accPaint);
        canvas.drawCircle(x - s * 0.3, y - s * 1.1, s * 0.3, accPaint);
        canvas.drawCircle(x + s * 0.3, y - s * 1.1, s * 0.3, accPaint);
        canvas.restore();
        break;
      }
      default: canvas.drawCircle(x, y, p.size * (1.5 - 0.5 * a), accPaint);
    }
  }
  accPaint.alpha = 255;
}

/** Messages affichés en même temps (les suivants attendent leur tour). */
const MAX_BANNERS = 3;

/**
 * Messages du jeu (palier atteint, mission réussie, nouveau décor…) : petites cartes bleu nuit translucides, comme les
 * notifications, juste sous la ligne du score : loin du personnage et des blocs, sans gêner la visée. (Comme Effects.kt.)
 */
function drawBanners(canvas) {
  const dp = Math.min(window.devicePixelRatio || 1, 3);
  const ts = Math.min(clamp(w * 0.036, 12 * dp, 18 * dp), w * 0.05);
  const padX = ts * 0.9, bh = ts * 2;
  let y = scoreY() + w * 0.115, shown = 0;
  for (const b of banners) {
    if (b.notice) continue;   // notifications : tout en haut, voir drawNotices
    if (shown++ === MAX_BANNERS) break;
    if (b.full === undefined) b.full = b.life;
    // Arrivée en glissant un peu vers le bas, départ en fondu
    const enter = clamp((b.full - b.life) / 0.25, 0, 1);
    const a = Math.min(enter, clamp(b.life / 0.4, 0, 1));
    noticeText.textSize = ts;   // fitText peut la réduire pour un long message
    const text = fitText(b.text, noticeText, w * 0.9 - 2 * padX);
    const cw = noticeText.measureText(text) + 2 * padX;
    const top = y - (1 - enter) * (1 - enter) * bh * 0.6;
    noticeRect.set(w / 2 - cw / 2, top, w / 2 + cw / 2, top + bh);
    drawNoticeCard(canvas, Math.min(bh / 2, w * 0.035), a, dp);
    noticeText.color = NOTICE_TEXT;
    noticeText.alpha = Math.floor(255 * a);
    canvas.drawText(text, w / 2, noticeRect.centerY() - (noticeText.descent() + noticeText.ascent()) / 2, noticeText);
    y = top + bh + w * 0.015;
  }
  drawNotices(canvas);
}

const noticeFill = new Paint();
const noticeEdge = new Paint({ style: Style.STROKE });
const noticeText = new Paint({ textAlign: Align.CENTER, bold: true });
const noticeRect = new RectF();
const NOTICE_TEXT = Color.parseColor('#EEF2FF');

/**
 * Notifications (duel accepté, ami qui vient de jouer…) : { text, life, notice: true, full: life }. Petite carte
 * bleu nuit semi-transparente tout en haut, sur la ligne de la barre de palier et à gauche du bouton pause, loin du
 * personnage et au-dessus du score. Taille du texte en px CSS, bornée : lisible sur un petit téléphone comme sur
 * une tablette ; deux lignes au plus. (Comme drawNotices dans Effects.kt.)
 */
function drawNotices(canvas) {
  if (!banners.some((b) => b.notice)) return;
  const dp = Math.min(window.devicePixelRatio || 1, 3);
  const ts = Math.min(clamp(w * 0.036, 13 * dp, 19 * dp), w * 0.055);
  noticeText.textSize = ts;
  const left = w * 0.03, right = w * 0.84;   // le bouton pause commence à 0,86 w
  const padX = ts * 0.9, padY = ts * 0.55, lineH = ts * 1.25;
  const maxW = right - left - 2 * padX;
  const rad = Math.min(w * 0.035, ts * 1.1);
  let y = insetTop + w * 0.035, shown = 0;
  for (const b of banners) {
    if (!b.notice) continue;
    if (shown++ === 2) break;   // au plus deux à la fois
    let lines = wrapText(b.text, noticeText, maxW);
    if (lines.length > 2) {
      const rest = b.text.startsWith(lines[0]) ? b.text.substring(lines[0].length).trimStart() : lines.slice(1).join(' ');
      lines = [lines[0], ellipsize(rest, noticeText, maxW)];
    }
    let tw = 0;
    for (const l of lines) tw = Math.max(tw, noticeText.measureText(l));
    const cw = tw + 2 * padX, ch = lines.length * lineH + 2 * padY - (lineH - ts);
    const cx = clamp(w / 2, left + cw / 2, right - cw / 2);
    // Arrivée en glissant depuis le haut, départ en fondu
    const enter = clamp(((b.full || b.life) - b.life) / 0.25, 0, 1);
    const a = Math.min(enter, clamp(b.life / 0.4, 0, 1));
    const top = y - (1 - enter) * (1 - enter) * (ch + w * 0.04);
    noticeRect.set(cx - cw / 2, top, cx + cw / 2, top + ch);
    drawNoticeCard(canvas, rad, a, dp);
    noticeText.color = NOTICE_TEXT;
    noticeText.alpha = Math.floor(255 * a);
    let by = top + padY + ts * 0.8;
    for (const l of lines) { canvas.drawText(l, cx, by, noticeText); by += lineH; }
    y = top + ch + w * 0.02;
  }
}

/** Carte bleu nuit translucide à bord doré dans noticeRect (notifications et messages du jeu). */
function drawNoticeCard(canvas, rad, a, dp) {
  const top = noticeRect.top, bottom = noticeRect.bottom;
  noticeFill.shader = null;
  noticeFill.color = Color.argb(Math.floor(60 * a), 2, 5, 16);
  noticeRect.set(noticeRect.left, top + w * 0.006, noticeRect.right, bottom + w * 0.006);
  canvas.drawRoundRect(noticeRect, rad, rad, noticeFill);
  noticeRect.set(noticeRect.left, top, noticeRect.right, bottom);
  noticeFill.color = Color.WHITE;
  noticeFill.shader = new LinearGradient(0, top, 0, bottom, UI.PANEL_TOP, UI.PANEL_BOTTOM);
  noticeFill.alpha = Math.floor(215 * a);
  canvas.drawRoundRect(noticeRect, rad, rad, noticeFill);
  noticeFill.shader = null;
  noticeEdge.color = UI.GOLD_LO;
  noticeEdge.alpha = Math.floor(130 * a);
  noticeEdge.strokeWidth = Math.max(dp, w * 0.0025);
  canvas.drawRoundRect(noticeRect, rad, rad, noticeEdge);
}

function drawSky(canvas) {
  const sky = Theme.sky(skyScore());
  if (sky.top !== skyTop || sky.bottom !== skyBottom) {
    skyTop = sky.top; skyBottom = sky.bottom;
    bgPaint.shader = new LinearGradient(0, 0, 0, h, sky.top, sky.bottom);
  }
  if (sky.name !== skyName) {
    // Seul le passage dans l'espace est annoncé (la météo et l'heure se voient déjà)
    if (skyName && state !== State.GAME_OVER && score > 0 && sky.name === 'space') banners.push({ text: tr('sky.space'), life: 2.2 });
    skyName = sky.name;
  }
  canvas.drawRect(0, 0, w, h, bgPaint);
  const cx = w * 0.82, cy = h * 0.33, r = w * 0.075;
  const sunVis = 1 - sunHidden();
  if (sky.night < 0.9) {
    accPaint.color = Color.argb(Math.floor(200 * (1 - sky.night) * sunVis), 255, 236, 170); canvas.drawCircle(cx, cy, r * 1.35, accPaint);
    accPaint.color = Color.argb(Math.floor(255 * (1 - sky.night) * sunVis), 255, 214, 102); canvas.drawCircle(cx, cy, r, accPaint);
  }
  if (sky.night > 0.1) {
    accPaint.color = Color.argb(Math.floor(235 * sky.night * sunVis), 245, 243, 225); canvas.drawCircle(cx, cy, r * 0.85, accPaint);
    accPaint.color = Theme.lerp(sky.top, sky.bottom, cy / h); accPaint.alpha = Math.floor(255 * sky.night * sunVis);
    canvas.drawCircle(cx + r * 0.38, cy - r * 0.2, r * 0.72, accPaint);
  }
  if (sky.night > 0.05) {
    for (const s of skyStars) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + s[2]);
      accPaint.color = Color.argb(Math.floor(220 * sky.night * tw), 255, 255, 255);
      canvas.drawCircle(s[0] * w, s[1] * h, w * 0.004 * (1 + s[2] % 1), accPaint);
    }
  }
  accPaint.alpha = 255;
  // Aventure : montagnes de l'aigle derrière les nuages et la météo
  if (quest.active && quest.season === 1) drawMountainScenery(canvas, sky.night);
  drawSkyDecor(canvas, sky);
  // Fêtes de l'année : neige, feux d'artifice, lanternes… (fest.js)
  drawFestDecor(canvas);
  if (quest.active && quest.season === 1) drawLowClouds(canvas);
}

function emitTrail(dt) {
  if (lookTrail === Skins.NONE) return;
  if (lookTrail === 'trait') { ribbon.push([sx(px, pz) + camX, sy(px, py + 0.28, pz) + camY, RIBBON_LIFE]); return; }
  trailTimer -= dt;
  if (trailTimer > 0) return;
  trailTimer = lookTrail === 'arcenciel' ? 0.02 : 0.05;
  const x = sx(px, pz) + camX + (rnd() - 0.5) * k * 0.3, y = sy(px, py + 0.25, pz) + camY + (rnd() - 0.5) * k * 0.3;
  const drift = (rnd() - 0.5) * k * 0.4, PC = Color.parseColor;
  switch (lookTrail) {
    case 'etoiles': particles.push(mkParticle(x, y, drift, k * 0.4, 0.8, k * 0.16, PC('#FFB300'), 0, PK.STAR)); break;
    case 'bulles': particles.push(mkParticle(x, y, drift, -k * 0.6, 0.9, k * 0.11, PC('#3F8EFC'), 0, PK.BUBBLE)); break;
    case 'notes': particles.push(mkParticle(x, y, drift, -k * 0.7, 0.9, k * 0.13, PC(['#3F8EFC', '#8E5CD9', '#2E3A59', '#E53950'][rndInt(4)]), 0, PK.NOTE)); break;
    case 'coeurs': particles.push(mkParticle(x, y, drift, -k * 0.5, 0.9, k * 0.12, PC('#FF4D8D'), 0, PK.HEART)); break;
    case 'arcenciel': particles.push(mkParticle(sx(px, pz) + camX, sy(px, py + 0.25, pz) + camY, 0, 0, 0.7, k * 0.17,
      Color.HSVToColor([(time * 400) % 360, 0.8, 1]), 0)); break;
    // Traînées des fêtes (fest.js)
    case 'flocons': particles.push(mkParticle(x, y, drift, k * 0.35, 1.0, k * 0.11, PC('#E3F4FF'), 0, PK.FLAKE)); break;
    // Map de la semaine de Noël : petits paquets cadeaux qui tombent en tournant
    case 'cadeaux': particles.push(mkParticle(x, y, drift, k * 0.3, 1.0, k * 0.12, PC(GIFT_TRAIL_COLS[rndInt(GIFT_TRAIL_COLS.length)]), 0, PK.GIFT)); break;
    case 'feuartifice': {
      const col = PC(['#FFD54F', '#FF5A7A', '#6FD3FF', '#9CFF7A', '#E59BFF'][rndInt(5)]);
      for (let i = 0; i < 3; i++) {
        const ang = rnd() * Math.PI * 2, sp = k * (1.2 + rnd() * 1.4);
        particles.push(mkParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, 0.55, k * 0.05, col, k * 3, PK.STAR));
      }
      break;
    }
    case 'chauvesouris': particles.push(mkParticle(x, y, drift * 1.6, -k * 0.8, 0.9, k * 0.13, PC('#2B1B3D'), 0, PK.BAT)); break;
    default: break;
  }
}

function drawRibbon(canvas) {
  if (ribbon.length < 2) return;
  ribbonPaint.color = (lookColor === Skins.RAINBOW || lookColor === Skins.GALAXY) ? Color.parseColor('#FFD54F') : playerLeft.color;
  let start = 0;
  while (start < ribbon.length - 1) {
    const end = Math.min(start + 5, ribbon.length - 1);
    tmpPath.reset();
    tmpPath.moveTo(ribbon[start][0] - camX + shakeX, ribbon[start][1] - camY + shakeY);
    for (let i = start + 1; i <= end; i++) tmpPath.lineTo(ribbon[i][0] - camX + shakeX, ribbon[i][1] - camY + shakeY);
    const f = clamp(ribbon[end][2] / RIBBON_LIFE, 0, 1);
    ribbonPaint.alpha = Math.floor(115 * f);
    ribbonPaint.strokeWidth = k * 0.22 * (0.35 + 0.65 * f);
    canvas.drawPath(tmpPath, ribbonPaint);
    start = end;
  }
}
