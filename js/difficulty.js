'use strict';
// Difficulté du mode libre : même calcul que Difficulty.kt (voir les explications là-bas).
// Elle dépend du numéro du saut k, jamais du score ; courbe en 3 temps sans plafond, vague, pauses, paliers.

const Difficulty = {
  // Début des paliers 1 à 6 (en sauts réussis), puis un palier tous les 150 sauts
  TIER_STARTS: [0, 26, 81, 151, 251, 361], TIER_AFTER: 150, REST_EVERY: 25, REST_LEN: 3,
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
  tierStart(t) { const s = this.TIER_STARTS; return t <= s.length ? s[Math.max(1, t) - 1] : s[s.length - 1] + (t - s.length) * this.TIER_AFTER; },
  tierSize(t) { return this.tierStart(t + 1) - this.tierStart(t); },
  tier(jumps) { let t = 1; while (this.tierStart(t + 1) <= jumps) t++; return t; },
  half(e, r) { return Math.max(0.28, (0.85 - 0.55 * e) * (0.8 + r * 0.35)); },
  restHalf(r) { return 0.85 + r * 0.1; },
  moveSpeed(e) { return 1.6 * (1 + 0.7 * Math.max(0, e - 0.45)); },
  crumbleDur(e) { return 2.2 - 1.1 * clamp((e - 0.3) / 0.6, 0, 1); },
  crumbleChance(k) { return k < this.CRUMBLE_FROM ? 0 : Math.min(0.45 + (k - this.CRUMBLE_FROM) / 40, 0.8); },
  iceChance(k) { return k < this.ICE_FROM ? 0 : k < 100 ? 0.15 : 0.22; },
  closeChance(e) { return 0.15 * e; },
  spread(e, moving) { return (moving ? 1.2 : 2.3) + 0.9 * e; },
};
