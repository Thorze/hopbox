'use strict';
// Map à numéro des duels : la même suite de blocs pour les deux joueurs (comme Duel.kt).
// Le bloc n° n ne dépend que du numéro de la map, de n et du bloc d'avant : SeededRandom(seed * 7919 + n) neuf,
// toujours le même nombre de tirages, et les mêmes seuils que le mode libre (numéro du saut, pas le score).
// Pendant un duel : ni imprévu, ni mini-jeu bonus, ni cœur, toujours le soleil.

const Duel = {
  // (0.85 arrondi en Float, comme le bloc de départ de Duel.kt)
  START: { kind: Kind.NORMAL, half: Math.fround(0.85), iceNext: false },
  PALETTE_SIZE: 8,
  /** Le bloc n° n (1, 2, 3…) de la map `seed`, après le bloc `prev` ({kind, half, iceNext}). */
  block(seed, n, prev) {
    const f = Math.fround, D = Difficulty;
    const rnd = SeededRandom((seed * 7919 + n) | 0);
    const rAlong = rnd(), rKind = rnd(), rIce = rnd(), rCrumble = rnd(), rHalf = rnd(), rSmall = rnd(), rRound = rnd();
    const rClose = rnd(), rDist = rnd(), rGold = rnd(), rColor = rnd(), rCoin = rnd(), rPhase = rnd();
    const k = n, rest = D.isRest(k), e = D.level(k);
    const trampChance = k >= D.TRAMPOLINE_FROM ? 0.10 : 0;
    const miniChance = k >= D.MINI_FROM && !(prev.kind === Kind.MOVING && k < 60) ? 0.09 : 0;
    const movingChance = k >= D.MOVING_FROM ? 0.12 + 0.06 * e : 0;
    const nearRest = D.isRest(k - 1) || D.isRest(k + 1);
    const crumbleChance = nearRest ? 0 : D.crumbleChance(k);
    const iceNow = prev.iceNext;
    const prepareIce = !iceNow && !rest && !D.isRest(k + 1) && !D.isRest(k + 2) && rIce < D.iceChance(k);
    let kind;
    if (iceNow) kind = Kind.ICE;
    else if (rest || prepareIce) kind = Kind.NORMAL;
    else if (prev.kind === Kind.TRAMPOLINE) kind = Kind.NORMAL;
    else if (rKind < trampChance) kind = Kind.TRAMPOLINE;
    else if (rKind < trampChance + miniChance) kind = Kind.MINI;
    else if (rKind < trampChance + miniChance + movingChance) kind = Kind.MOVING;
    else if (rCrumble < crumbleChance) kind = Kind.CRUMBLY;
    else kind = Kind.NORMAL;
    let half = rest ? D.restHalf(rHalf) : kind === Kind.MINI ? 0.3 : D.half(e, rHalf);
    if (kind === Kind.MOVING && e > 0.8 && rSmall < 0.25) half = 0.3;
    if (kind === Kind.ICE) half = Math.max(half, ICE_MIN_HALF);
    const moving = kind === Kind.MOVING;
    const minDist = prev.half + half + 0.45 + (moving ? 0.8 : 0);
    let dist;
    if (rest) dist = minDist + rDist * 0.6;
    else if (!moving && rClose < D.closeChance(e)) dist = minDist + rDist * 0.25;
    else dist = minDist + rDist * D.spread(e, moving);
    const golden = kind === Kind.CRUMBLY && rGold < Scoring.GOLD_CHANCE;
    let coin = golden ? 0 : rCoin < 0.02 ? 5 : rCoin < 0.18 ? 1 : 0;
    if (rest && coin === 0) coin = 1;
    return {
      kind, half: f(half), dist: f(dist), alongX: rAlong < 0.5, round: kind !== Kind.ICE && rRound < 0.4,
      color: Math.min(this.PALETTE_SIZE - 1, Math.floor(rColor * this.PALETTE_SIZE)), coin, golden,
      phase: f(rPhase * 6.283), speed: f(D.moveSpeed(e)), iceNext: prepareIce,
    };
  },
  /** Les `count` premiers blocs de la map (tests et aperçu). */
  blocks(seed, count) {
    const out = [];
    let prev = this.START;
    for (let n = 1; n <= count; n++) { const b = this.block(seed, n, prev); out.push(b); prev = b; }
    return out;
  },
};

// ---------- Partie d'un duel ----------
// (le numéro de la map reste caché aux joueurs : on ne peut pas s'entraîner dessus avant le duel)
/** Les décomptes sonores et le mot que dit chaque voix à la fin (la voix grave dit « zéro »). */
const DUEL_VOICES = [['COUNTDOWN1', '0'], ['COUNTDOWN2', 'GO !'], ['COUNTDOWN3', 'GO !']];
/** Durée du décompte avant un duel : « 3, 2, 1 », puis le dernier mot. */
const DUEL_COUNT = 3;
// Chrono du duel en temps réel (horloge du navigateur) : départ au « GO » (goAt), arrêt à la chute (stopAt). Il ne
// dépend pas de la vitesse d'affichage et continue pendant une pause ; le serveur recoupe la durée envoyée.
function duelClock() { return duel.goAt ? ((duel.stopAt || performance.now()) - duel.goAt) / 1000 : 0; }
const duel = { goAt: 0, stopAt: 0, voice: false, goLabel: 'GO !', active: false, seed: 0, id: 0, prev: Duel.START, n: 0, info: null, countdown: 0, goT: 0, lastSec: 0 };

function startDuelRun(seed, id, info) {
  Object.assign(duel, { active: true, seed, id, info, prev: Duel.START, n: 0, countdown: DUEL_COUNT, goT: 0, lastSec: DUEL_COUNT, goAt: 0, stopAt: 0 });
  duels.challenge = null; duels.vs = null;
  // Ni météo, ni imprévu, ni catastrophe : toujours le soleil
  weather = 0; strikeAt = -1; crashAt = -1; volcanoAt = -1; satelliteAt = -1; isl.cycloneAt = -1;
  scheduleRocket(false); scheduleEagle(false); scheduleHeli(false); scheduleUfo(false); scheduleWhale(false); scheduleBlizzard(false); scheduleNuke(false);
  resetGame();
  vibrate(35);
  // Une voix au hasard ; l'écran affiche le même dernier mot qu'elle (« 0 » ou « GO ! »)
  const voices = DUEL_VOICES.filter(([id]) => sounds.has(id)), v = voices.length ? voices[rndInt(voices.length)] : null;
  duel.voice = !!v; duel.goLabel = v ? v[1] : 'GO !';
  if (v) sounds.play(v[0], 1); else sounds.play('STAR', 0.7, 0.75);
}

function stopDuelRun() { duel.active = false; duel.id = 0; duel.info = null; duel.countdown = 0; duel.goT = 0; }

function spawnDuel() {
  const b = Duel.block(duel.seed, ++duel.n, duel.prev);
  duel.prev = b;
  alongX = b.alongX;
  const color = b.kind === Kind.MINI ? Color.parseColor('#F5C542') : b.kind === Kind.ICE ? ICE_COLOR : palette[b.color];
  next = new Platform(alongX ? current.cx + b.dist : px, alongX ? pz : current.cz + b.dist, b.half, b.round, color, b.kind, alongX);
  next.movePhase = b.phase;
  next.coin = 0;
  next.golden = false;
  if (b.kind === Kind.MOVING) next.moveSpeed = b.speed;
  platforms.push(next);
  trimPlatforms();
}
