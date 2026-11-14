'use strict';
// Ciel du chapitre 3 (dans l'espace), derrière les plateformes : étoiles filantes, comètes rares,
// galaxie spirale qui apparaît de temps en temps en tournant, satellites qui traversent lentement (équivalent de SpaceLife.kt).

const SK_SHOOTING = 0, SK_COMET = 1, SK_GALAXY = 2, SK_SATELLITE = 3;
const spaceLife = {
  things: [], lastT: -1, nextStar: 0, nextComet: 0, nextGalaxy: 0, nextSat: 0,
  paint: new Paint(), stroke: new Paint({ style: Style.STROKE, strokeCap: 'round' }), path: new Path(), rect: new RectF(),
};

/** Anime et dessine le ciel spatial (appelé après le fond du chapitre 3). */
function drawSpaceLife(canvas) {
  const sp = spaceLife, r = Math.random;
  // Pas affiché depuis un moment : on repart de zéro, avec les premiers passages assez vite
  if (sp.lastT < 0 || time - sp.lastT > 1 || time < sp.lastT) {
    sp.things = [];
    sp.nextStar = time + 0.5 + r() * 1.5;
    sp.nextComet = time + 12 + r() * 18;
    sp.nextGalaxy = time + 4 + r() * 8;
    sp.nextSat = time + 6 + r() * 10;
    sp.lastT = time;
  }
  const dt = Math.min(0.1, Math.max(0, time - sp.lastT));
  sp.lastT = time;
  const add = (type, x, y, vx, vy, size, life) => sp.things.push({ type, x, y, vx, vy, size, life, seed: r() * 6, age: 0 });
  // Étoiles filantes : souvent, parfois par deux
  if (time >= sp.nextStar) {
    const n = r() < 0.2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const ltr = r() < 0.5, sp0 = w * (0.9 + r() * 0.8), ang = 0.35 + r() * 0.5;
      add(SK_SHOOTING, w * (0.1 + r() * 0.8), h * (0.03 + r() * 0.4), (ltr ? 1 : -1) * Math.cos(ang) * sp0, Math.sin(ang) * sp0, w * (0.12 + r() * 0.1), 0.6 + r() * 0.5);
    }
    sp.nextStar = time + 1.5 + r() * 3.5;
  }
  // Comète : rare, lente, longue queue
  if (time >= sp.nextComet) {
    const ltr = r() < 0.5;
    add(SK_COMET, ltr ? -w * 0.2 : w * 1.2, h * (0.08 + r() * 0.3), (ltr ? 1 : -1) * w * 0.16, w * 0.06, w * (0.03 + r() * 0.015), 15);
    sp.nextComet = time + 35 + r() * 40;
  }
  // Galaxie : apparaît, tourne lentement, puis s'efface
  if (time >= sp.nextGalaxy && !sp.things.some((t) => t.type === SK_GALAXY)) {
    add(SK_GALAXY, w * (0.15 + r() * 0.7), h * (0.08 + r() * 0.35), 0, 0, w * (0.14 + r() * 0.1), 14 + r() * 8);
    sp.nextGalaxy = time + 25 + r() * 25;
  }
  // Satellite : traverse lentement en clignotant
  if (time >= sp.nextSat) {
    const ltr = r() < 0.5;
    add(SK_SATELLITE, ltr ? -w * 0.15 : w * 1.15, h * (0.06 + r() * 0.5), (ltr ? 1 : -1) * w * (0.04 + r() * 0.03), h * (r() - 0.5) * 0.01, w * (0.035 + r() * 0.025), 40);
    sp.nextSat = time + 18 + r() * 22;
  }
  sp.things = sp.things.filter((t) => {
    t.age += dt; t.x += t.vx * dt; t.y += t.vy * dt;
    return t.age <= t.life && t.x >= -w * 0.4 && t.x <= w * 1.4;
  });
  // La galaxie au fond, puis le reste
  for (const t of sp.things) if (t.type === SK_GALAXY) drawGalaxy(canvas, t);
  for (const t of sp.things) {
    if (t.type === SK_SHOOTING) drawShootingStar(canvas, t);
    else if (t.type === SK_COMET) drawSkyMeteor(canvas, t);
    else if (t.type === SK_SATELLITE) drawSkySatellite(canvas, t);
  }
}

function drawShootingStar(canvas, t) {
  const sp = spaceLife, q = t.age / t.life;
  const fade = Math.max(0, Math.min(1, Math.sin(q * Math.PI)));
  const len = t.size * (0.4 + 0.6 * Math.min(1, q * 3)), n = Math.hypot(t.vx, t.vy);
  const tx = t.x - t.vx / n * len, ty = t.y - t.vy / n * len;
  sp.stroke.shader = new LinearGradient(t.x, t.y, tx, ty, [Color.argb(Math.floor(230 * fade), 255, 255, 255), Color.argb(0, 160, 200, 255)]);
  sp.stroke.strokeWidth = w * 0.006;
  canvas.drawLine(t.x, t.y, tx, ty, sp.stroke);
  sp.stroke.shader = null;
  sp.paint.color = Color.argb(Math.floor(255 * fade), 255, 255, 240);
  canvas.drawCircle(t.x, t.y, w * 0.005, sp.paint);
}

// Météore : tête rocheuse incandescente, traînée de feu effilée (halo orange, flamme jaune, cœur blanc)
// dans l'axe du mouvement, et étincelles qui s'en détachent.
function drawSkyMeteor(canvas, t) {
  const sp = spaceLife, p = sp.paint, path = sp.path, s = t.size;
  const fade = Math.max(0, Math.min(1, Math.min(1, t.age / 1.5) * Math.min(1, (t.life - t.age) / 1.5)));
  const a = (v) => Math.max(0, Math.min(255, Math.floor(255 * v * fade)));
  canvas.save();
  canvas.translate(t.x, t.y);
  // Repère local : la tête en (0, 0), le mouvement vers +x, la traînée vers -x
  canvas.rotate(Math.atan2(t.vy, t.vx) * 180 / Math.PI);
  const flick = 1 + 0.06 * Math.sin(time * 23 + t.seed) + 0.04 * Math.sin(time * 37);
  // Flamme effilée : large à la tête, pointue au bout ; dégradé de c0 (tête) à transparent
  const flame = (len, half, c0) => {
    const l = len * flick;
    path.reset();
    path.moveTo(s * 0.2, -half);
    path.quadTo(-l * 0.35, -half * 0.85, -l, 0);
    path.quadTo(-l * 0.35, half * 0.85, s * 0.2, half);
    path.quadTo(s * 0.9, 0, s * 0.2, -half);
    path.close();
    p.shader = new LinearGradient(s * 0.3, 0, -l, 0, [c0, (c0 & 0x00FFFFFF) >>> 0]);
    canvas.drawPath(path, p);
    p.shader = null;
  };
  flame(s * 14, s * 1.5, Color.argb(a(0.35), 255, 110, 40));    // halo orangé
  flame(s * 10, s * 0.95, Color.argb(a(0.75), 255, 170, 60));   // flamme
  flame(s * 6.5, s * 0.55, Color.argb(a(0.95), 255, 236, 150)); // cœur jaune
  flame(s * 3.5, s * 0.28, Color.argb(a(1), 255, 255, 240));     // cœur blanc
  // Étincelles qui se détachent et s'éteignent en arrière
  for (let i = 0; i < 9; i++) {
    const q = (time * 1.6 + i * 0.137 + t.seed) % 1;
    const px = -s * (1.5 + q * 11), py = Math.sin(i * 12.9898 + t.seed) * s * (0.4 + q * 1.6);
    p.color = Color.argb(a(0.9 * (1 - q)), 255, Math.floor(220 - 90 * q), Math.max(0, Math.floor(120 - 100 * q)));
    canvas.drawCircle(px, py, s * (0.16 - 0.1 * q), p);
  }
  // Halo de chaleur autour de la tête
  p.shader = new RadialGradient(0, 0, s * 2.2, [Color.argb(a(0.55), 255, 190, 90), Color.argb(0, 255, 120, 40)]);
  canvas.drawCircle(0, 0, s * 2.2, p);
  p.shader = null;
  // Tête : roche irrégulière qui tourne, chauffée à blanc devant
  canvas.save();
  canvas.rotate(time * 90 + t.seed * 40);
  path.reset();
  for (let i = 0; i < 8; i++) {
    const ang = i * 0.785, rr = s * (0.62 + 0.16 * Math.sin(i * 2.7 + t.seed * 3));
    if (i === 0) path.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else path.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  path.close();
  p.shader = new RadialGradient(s * 0.25, -s * 0.1, s * 0.9, [Color.argb(a(1), 255, 248, 220), Color.argb(a(1), 190, 70, 30)]);
  canvas.drawPath(path, p);
  p.shader = null;
  p.color = Color.argb(a(0.45), 110, 40, 20);
  canvas.drawCircle(-s * 0.2, s * 0.15, s * 0.13, p);
  canvas.drawCircle(s * 0.05, -s * 0.3, s * 0.09, p);
  canvas.restore();
  canvas.restore();
}

function drawGalaxy(canvas, t) {
  const sp = spaceLife, p = sp.paint, s = t.size;
  const fade = Math.max(0, Math.min(1, Math.min(1, t.age / 3) * Math.min(1, (t.life - t.age) / 3)));
  canvas.save();
  canvas.translate(t.x, t.y);
  canvas.scale(1, 0.55);
  canvas.rotate(t.seed * 50 + time * 9);
  // Cœur lumineux
  p.shader = new RadialGradient(0, 0, s * 0.42, [Color.argb(Math.floor(230 * fade), 255, 240, 210), Color.argb(0, 190, 150, 255)]);
  canvas.drawCircle(0, 0, s * 0.42, p);
  p.shader = null;
  // Deux bras spiraux : un nuage d'étoiles éparpillées le long de chaque bras, de plus en plus violet vers le bord
  const fr = (v) => v - Math.floor(v);
  for (let arm = 0; arm <= 1; arm++) {
    for (let i = 0; i < 130; i++) {
      const q = i / 130, ang = arm * Math.PI + q * 3.4, rad = s * (0.12 + q * 0.9);
      const jx = (fr(Math.sin(i * 12.9898 + arm * 78.233) * 43758.547) - 0.5) * rad * 0.35;
      const jy = (fr(Math.sin(i * 39.346 + arm * 11.135) * 43758.547) - 0.5) * rad * 0.35;
      const px = Math.cos(ang) * rad + jx, py = Math.sin(ang) * rad + jy;
      p.color = Color.argb(Math.floor(fade * 30 * (1 - q * 0.5)), 190, 150, 255);
      canvas.drawCircle(px, py, s * 0.09, p);
      p.color = Color.argb(Math.floor(fade * 230 * (1 - q * 0.55)), Math.floor(255 - 80 * q), Math.floor(230 - 100 * q), 255);
      canvas.drawCircle(px, py, s * (0.022 - 0.01 * q), p);
    }
  }
  canvas.restore();
}

function drawSkySatellite(canvas, t) {
  const sp = spaceLife, p = sp.paint, st = sp.stroke, rc = sp.rect, s = t.size;
  canvas.save();
  canvas.translate(t.x, t.y);
  canvas.rotate(Math.sin(time * 0.5 + t.seed) * 15 + t.seed * 10);
  // Panneaux solaires
  for (const side of [-1, 1]) {
    p.color = Color.argb(220, 40, 80, 160);
    rc.set(side < 0 ? -s * 1.6 : s * 0.45, -s * 0.28, side < 0 ? -s * 0.45 : s * 1.6, s * 0.28);
    canvas.drawRect(rc.left, rc.top, rc.right, rc.bottom, p);
    st.strokeWidth = s * 0.04; st.color = Color.argb(200, 120, 170, 230);
    for (let k = 1; k <= 3; k++) { const gx = rc.left + rc.width() * k / 4; canvas.drawLine(gx, rc.top, gx, rc.bottom, st); }
    canvas.drawLine(rc.left, 0, rc.right, 0, st);
  }
  // Corps doré et antenne
  p.color = Color.argb(240, 210, 170, 70);
  rc.set(-s * 0.45, -s * 0.4, s * 0.45, s * 0.4);
  canvas.drawRoundRect(rc, s * 0.08, s * 0.08, p);
  st.strokeWidth = s * 0.06; st.color = Color.argb(230, 220, 220, 230);
  canvas.drawLine(0, -s * 0.4, 0, -s * 0.85, st);
  rc.set(-s * 0.25, -s * 1.05, s * 0.25, -s * 0.75);
  canvas.drawArc(rc, 0, 180, false, st);
  // Petite lumière qui clignote
  if (((time + t.seed) % 1.2) < 0.15) { p.color = Color.argb(255, 255, 80, 80); canvas.drawCircle(s * 0.3, s * 0.25, s * 0.1, p); }
  canvas.restore();
}
