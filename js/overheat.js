'use strict';
// Surchauffe (équivalent de Overheat.kt) : quand le doigt reste appuyé trop longtemps, le personnage
// rougit et fume (dès 5 s), explose dans un petit « pouf » à 8 s et réapparaît normal. Le saut est
// annulé : lâcher ne fait pas sauter, il faut réappuyer. Sons facultatifs : « surchauffe » et « pouf ».

const HEAT_START = 5, OVERHEAT_AT = 8;
const oh = { holdT: 0, smokeT: 0, hissed: false, hideT: 0 };

/** 0 → 1 : à quel point le personnage chauffe. */
function heat() { return state === State.CHARGING ? clamp((oh.holdT - HEAT_START) / (OVERHEAT_AT - HEAT_START), 0, 1) : 0; }

function startHold() { oh.holdT = 0; oh.smokeT = 0; oh.hissed = false; }

function updateOverheat(dt) {
  if (oh.hideT > 0) { oh.hideT -= dt; if (oh.hideT <= 0) { landSquash = 1; spawnDust(px, pz); } }
  if (state !== State.CHARGING) return;
  oh.holdT += dt;
  if (oh.holdT < HEAT_START) return;
  oh.smokeT -= dt;
  if (oh.smokeT <= 0) { oh.smokeT = 0.35 - 0.25 * heat(); smokePuffs(2, 0.6); }
  if (oh.holdT >= OVERHEAT_AT) explodeOverheat();
}

function smokePuffs(count, size) {
  const x = sx(px, pz) + camX, y = sy(px, shapeHeight(1), pz) + camY;
  for (let i = 0; i < count; i++) {
    const a = rnd() * 6.283, sp = k * (0.3 + rnd() * 0.6) * size;
    particles.push(mkParticle(x + Math.cos(a) * k * 0.1, y, Math.cos(a) * sp, -k * (0.8 + rnd() * 0.6) * size, 0.6 + rnd() * 0.4, k * (0.08 + rnd() * 0.08) * size, Color.argb(160, 120, 120, 125), 0));
  }
}

/** Pouf ! Le personnage explose, le saut est annulé ; il faudra réappuyer. */
function explodeOverheat() {
  charge = 0; state = State.READY; oh.hideT = 0.45;
  const x = sx(px, pz) + camX, y = sy(px, shapeHeight(1) / 2, pz) + camY;
  for (const c of [0xFFE53935, 0xFFFF7A45, 0xFFFFC93C]) spawnSparkles(x, y, c, 12);
  smokePuffs(14, 1.8);
  if (sounds.has('POP')) sounds.play('POP'); else sounds.play('EXPLOSION', 0.45, 1.5);
  vibrate(120); shake(0.12);
}

/** Tremblement du personnage qui surchauffe. */
function heatShake() { return Math.sin(time * 80) * k * 0.045 * heat(); }
