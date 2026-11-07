'use strict';
// Difficulté du mode libre : même calcul que Difficulty.kt (voir les explications là-bas).
// Elle dépend du numéro du saut k, jamais du score ; courbe en 3 temps sans plafond, vague, pauses, paliers.

const Difficulty = {
  TIER_EVERY: 50, REST_EVERY: 25, REST_LEN: 3,
  TRAMPOLINE_FROM: 5, MINI_FROM: 10, MOVING_FROM: 14, CRUMBLE_FROM: 15, ICE_FROM: 50,
  base(k) {
    if (k <= 30) return 0.40 * k / 30;
    if (k <= 120) return 0.40 + 0.45 * (k - 30) / 90;
    return 0.85 + 0.15 * (1 - Math.exp(-(k - 120) / 150));
  },
  level(k) {
    const b = this.base(k), ramp = Math.min(1, k / 30);
    return clamp(b * (1 + 0.15 * ramp * Math.sin(k * 2 * Math.PI / 11)), 0, 1);
  },
  isRest(k) { return k >= this.REST_EVERY && k % this.REST_EVERY < this.REST_LEN; },
  tier(jumps) { return Math.floor(jumps / this.TIER_EVERY) + 1; },
  half(e, r) { return Math.max(0.28, (0.85 - 0.55 * e) * (0.8 + r * 0.35)); },
  restHalf(r) { return 0.85 + r * 0.1; },
  moveSpeed(e) { return 1.6 * (1 + 0.7 * Math.max(0, e - 0.45)); },
  crumbleDur(e) { return 2.2 - 1.1 * clamp((e - 0.3) / 0.6, 0, 1); },
  crumbleChance(k) { return k < this.CRUMBLE_FROM ? 0 : Math.min(0.45 + (k - this.CRUMBLE_FROM) / 40, 0.8); },
  iceChance(k) { return k < this.ICE_FROM ? 0 : k < 100 ? 0.15 : 0.22; },
  closeChance(e) { return 0.15 * e; },
  spread(e, moving) { return (moving ? 1.2 : 2.3) + 0.9 * e; },
};
