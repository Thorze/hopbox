'use strict';
// Cœur du jeu (équivalent de GameView.kt) : état, sauts, atterrissages, boucle de jeu.
// Vue isométrique : écranX = (x - z) * cos30 * k ; écranY = -(x + z) * sin30 * k - y * k.

const State = {
  READY: 'ready', CHARGING: 'charging', JUMPING: 'jumping', FALLING: 'falling', BONUS: 'bonus',
  GAME_OVER: 'gameover', LEADERBOARD: 'leaderboard', CUSTOMIZE: 'customize', SETTINGS: 'settings',
  PAUSED: 'paused', MISSIONS: 'missions', REVIVE: 'revive', AD: 'ad', STRUCK: 'struck',
  CYCLONE: 'cyclone', SKYWARD: 'skyward', ROCKET: 'rocket', SPACEFALL: 'spacefall', STATS: 'stats', EAGLE: 'eagle', FOREST_OUT: 'forest_out', HELI: 'heli', BOOM: 'boom', UFO: 'ufo', UFO_HOME: 'ufo_home', WHALE: 'whale', WHALE_OUT: 'whale_out', BLIZZARD: 'blizzard', SLIDE_OUT: 'slide_out', NUKE: 'nuke', NUKE_OUT: 'nuke_out', DAILY: 'daily',
  QUEST_MAP: 'quest_map', QUEST_INTRO: 'quest_intro', QUEST_END: 'quest_end', QUEST_STORY: 'quest_story',
  DUELS: 'duels', DUEL_END: 'duel_end',
};
const FALL_ANIMS = ['spin', 'panic', 'parachute', 'cartoon'];
const TRICKS = ['frontflip', 'backflip', 'pirouette', 'tuck'];

const cos30 = 0.8660254, sin30 = 0.5;
// Réglages du gameplay (unités du monde)
const maxChargeTime = 1.4, maxReach = 5.6, platformDepth = 1.3, playerHalf = 0.24, playerHeight = 0.55;
const bonusEvery = 10, bonusIntro = 1.2, mashDuration = 3, starsDuration = 6;
const wheelValues = [2, 5, 0, 3, 10, 1, 4, 0];
const scareMargin = 0.12, scareDuration = 1.2;
const lifeEvery = 30, maxLives = 3, reviveDuration = 1.5;
/** Couleur plus saturée (facteur f sur la saturation HSL, luminosité gardée). */
function saturate(c, f) {
  const r = Color.red(c) / 255, g = Color.green(c) / 255, b = Color.blue(c) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return c;
  let s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh /= 6; s = Math.min(1, s * f);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const ch = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
  return Color.argb(Color.alpha(c), Math.round(ch(hh + 1 / 3) * 255), Math.round(ch(hh) * 255), Math.round(ch(hh - 1 / 3) * 255));
}
// Couleurs des blocs, un peu plus saturées (+20 %) pour ressortir à côté du logo
const palette = ['#FF8A65', '#4DB6AC', '#FFD54F', '#9575CD', '#81C784', '#F06292', '#64B5F6', '#ECEFF1'].map((c) => saturate(Color.parseColor(c), 1.2));

// --- Etat ---
let state = State.READY, score = 0, best = profile.best, newBest = false;
let runTime = 0, coinsThisRun = 0, pendingBounce = false, bounceDelay = 0, autoJump = false;
let pausedFrom = State.READY, missionsReturnState = State.READY, boardTab = 0, pseudoConflict = false;
let particles = [], banners = [], ribbon = [], popups = [];
let shakeT = 0, shakeAmp = 0, shakeX = 0, shakeY = 0;
let skyTop = 0, skyBottom = 0, skyName = '';
const skyStars = Array.from({ length: 70 }, () => [rnd(), rnd() * 0.75, rnd() * 6.28]);
let lastWheelIdx = -1, settingsReturnState = State.READY;
const sfxSlider = new RectF(), musicSlider = new RectF();
let dragSlider = 0;
let boardScroll = 0, boardMaxScroll = 0, boardListTop = 0, boardListBottom = 0, boardDragY = -1, boardDragStart = 0, boardScrollToMe = false;
let boardReturnState = State.READY, worldStatus = 'idle', worldEntries = [], worldRank = null, personalRuns = [];
let syncing = false;
let buttons = [];
let platforms = [], current = null, next = null;
// Blocs qui viennent de quitter la partie : ils tombent vers le bas de l'écran puis disparaissent
let leaving = [];

// Personnage
let px = 0, pz = 0, py = 0, alongX = true, charge = 0;
let jumpT = 0, jumpDuration = 0.5, jumpFrom = 0, jumpDist = 0, jumpHeight = 0, jumpTrick = 'none';
let fallVy = 0, fallT = 0, fallAnim = 'spin';
let lookSpecial = 'none', lookShape = 'cube', lookGlasses = 'none', lookHat = 'none', lookShoes = 'none', lookColor = 'orange';
let lookBack = 'none', lookTrail = 'none', lookBlock = 'lisse', trailTimer = 0;
const tintColors = new Map();
let lives = 0, reviveT = 0, reviveFromX = 0, reviveFromY = 0, reviveFromZ = 0, reviveToX = 0, reviveToZ = 0, reviveTarget = null;
let unlockedLabels = [];
let custSlot = Slot.SHAPE, custEnergy = false, custReturnState = State.READY, custMsg = '', custMsgT = 0;
let pendingTier = 0;   // palier atteint, à annoncer dès le retour en jeu
let tierPulse = 0;     // éclat de l'anneau de palier en haut de l'écran (1 → 0)
let inputLockUntil = 0; // touchers ignorés jusqu'à ce moment (retour d'un bonus où l'on tapotait)
let bonusTapAt = -10; // dernier toucher pendant un bonus (ou la rafale qui le prolonge)
let lastJumpRatio = 1;  // force (0..1) du dernier saut lancé
/** Ligne de base du gros score en jeu : plus bas en mode libre, pour laisser la place à la barre de palier. */
// Mode libre : sous la ligne du classement (ranking.js), avec une marge même sur les écrans trapus
// (haut des chiffres ≈ ligne de base − 0,175 largeur)
const scoreY = () => insetTop + (quest.active ? h * 0.17 : duel.active || tuto.active ? h * 0.17 + w * 0.09
  : Math.max(h * 0.17 + w * 0.15, (RANK_CY + RANK_H / 2 + 0.04 + 0.175) * w));
let landSquash = 0, gameOverTime = 0, gameOverReason = null, time = 0, jumps = 0, scareT = 0, crumbleHintShown = false;
// scareKind : 0 = tremblement + « ! », 1 = yeux qui jaillissent ; eyeScale : taille des yeux au dessin
let scareKind = 0, eyeScale = 1;
let perfectStreak = 0, perfectBarAlpha = 0, perfectPulse = 0, lastPerfectPoints = 2, shownStreak = 3;
// Bonus
let bonusCount = 0, bonusT = 0, bonusPos = -1, bonusDir = 1, bonusSpeed = 1.4, bonusResult = 0, bonusResultT = 0;
let bonusType = BONUS_TYPES[0], bonusGain = 0, bonusTaps = 0, bonusPulse = 0;
let energyThisRun = 0; // énergies gagnées pendant la partie en cours (éclairs ramassés, paliers)
let mashFxT = 9; // bonus Tape-tape : temps depuis le dernier anneau rempli (éclat et onde)
let stars = [], sparkles = [], starSpawn = 0, wheelAngle = 0, wheelSpeed = 0, wheelStopping = false;
// Caméra
let camX = 0, camY = 0, camTargetX = 0, camTargetY = 0;
// Dimensions (pixels physiques)
let w = 0, h = 0, k = 1, insetTop = 0, insetBottom = 0;
const ub = () => h - insetBottom;

// --- Peintures ---
const P = (o) => new Paint(o);
const bgPaint = P();
const playerTop = P({ color: Color.parseColor('#FFA270') });
const playerLeft = P({ color: Color.parseColor('#FF7A45') });
const playerRight = P({ color: Color.parseColor('#D95B2B') });
const accPaint = P();
const accStroke = P({ style: Style.STROKE, strokeCap: 'round' });
const lockedPaint = P({ color: Color.parseColor('#46527A') });
const itemPaint = P();
const shopPaint = P({ color: Color.parseColor('#F5C542') });
const bubbleTextPaint = P({ color: Color.parseColor('#2E3A59'), textAlign: Align.CENTER, bold: true });
const bubbleStroke = P({ style: Style.STROKE, color: Color.parseColor('#2E3A59') });
const shadowPaint = P({ color: Color.argb(60, 0, 0, 0) });
const eyeWhitePaint = P({ color: Color.WHITE });
const pupilPaint = P({ color: Color.parseColor('#1B1B1B') });
const barBgPaint = P({ color: Color.argb(90, 0, 0, 0) });
const barOutlinePaint = P({});
const barPaint = P();
const overlayPaint = P({ color: Color.argb(175, 6, 10, 26) });
const scorePaint = P({ color: Color.WHITE, textAlign: Align.CENTER, bold: true });
const textPaint = P({ color: Color.WHITE, textAlign: Align.CENTER, bold: true });
// Code couleur des boutons : vert = action principale, bleu = navigation / retour, rouge = quitter
const primaryBtnPaint = P({ color: Color.parseColor('#4CBB47') });
const backBtnPaint = P({ color: Color.parseColor('#2F8BF7') });
const dangerBtnPaint = P({ color: Color.parseColor('#E5484D') });
/** Orange de la marque (jauges, curseurs) : ce ne sont pas des boutons. */
const accentPaint = P({ color: Color.parseColor('#FF7A45') });
const secondaryBtnPaint = P({ color: Color.argb(60, 255, 255, 255) });
const chipPaint = P({ color: Color.argb(70, 0, 0, 0) });
const panelPaint = P({ color: Color.parseColor('#FAFAFA') });
const tabOnPaint = P({ color: Color.parseColor('#2F8BF7') });
const tabOffPaint = P({ color: Color.parseColor('#3A4872') });
// Bouton secondaire gris ardoise (Annuler, Refuser, Accueil…)
const greyBtnPaint = P({ color: Color.parseColor('#66749A') });
const highlightPaint = P({ color: Color.parseColor('#7A4A22') });
const btnTextPaint = P({ color: Color.WHITE, textAlign: Align.CENTER, bold: true });
// (thème Nuit & Or : les textes des panneaux sont clairs sur fond bleu nuit)
const darkTextPaint = P({ color: Color.WHITE, bold: true });
const greyTextPaint = P({ color: Color.parseColor('#B9C5E6'), textAlign: Align.CENTER });
const greenZonePaint = P({ color: Color.parseColor('#3DBE6E') });
const cursorPaint = P({ color: Color.WHITE });
const cursorStroke = P({ style: Style.STROKE, color: Color.parseColor('#2E3A59') });
const bubblePaint = P({ color: Color.WHITE });
const bangPaint = P({ color: Color.parseColor('#E53950'), textAlign: Align.CENTER, bold: true });
const starPaint = P({ color: Color.parseColor('#FFD54F') });
const wheelText = P({ color: Color.WHITE, textAlign: Align.CENTER, bold: true });
const perfectBarPaint = P();
const perfectBgPaint = P({ color: Color.argb(110, 30, 30, 50) });
const ribbonPaint = P({ style: Style.STROKE, strokeCap: 'round', strokeJoin: 'round' });
const rect = new RectF();
const tmpPath = new Path();

// --- Projection ---
const isoX = (x, z) => (x - z) * cos30 * k;
const isoY = (x, y, z) => -(x + z) * sin30 * k - y * k;
const sx = (x, z) => w * 0.5 - camX + shakeX + isoX(x, z);
const sy = (x, y, z) => h * 0.6 - camY + shakeY + isoY(x, y, z);

function quad(path, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
  path.reset();
  path.moveTo(isoX(x1, z1), isoY(x1, y1, z1));
  path.lineTo(isoX(x2, z2), isoY(x2, y2, z2));
  path.lineTo(isoX(x3, z3), isoY(x3, y3, z3));
  path.lineTo(isoX(x4, z4), isoY(x4, y4, z4));
  path.close();
}

function shade(c, f) {
  return Color.rgb(clamp(Math.floor(Color.red(c) * f), 0, 255), clamp(Math.floor(Color.green(c) * f), 0, 255), clamp(Math.floor(Color.blue(c) * f), 0, 255));
}

function onSizeChanged(width, height) {
  w = width; h = height; k = w / 9.5;
  scorePaint.textSize = w * 0.24;
  scorePaint.setShadowLayer(8, 0, 4, Color.argb(90, 0, 0, 0));
  textPaint.setShadowLayer(6, 0, 3, Color.argb(90, 0, 0, 0));
  skyTop = 0;
  loadLook();
  resetGame();
}

function resetGame() {
  deathSnap = null; death.open = false;
  platforms = []; leaving = [];
  current = new Platform(0, 0, 0.85, false, Color.parseColor('#B0BEC5'));
  platforms.push(current);
  current.riseT = RISE_TIME;
  px = 0; pz = 0; py = 0; score = 0; jumps = 0; gauge.slowShown = false; gauge.fastWarn = false; pendingTier = 0; bonusCount = 0; scareT = 0; crumbleHintShown = false; goldPending = 0; goldShown = 0; goldHintShown = false;
  perfectStreak = 0; perfectBarAlpha = 0; auraPower = 0; ripples = []; comboT = -1; runTime = 0; coinsThisRun = 0; energyThisRun = 0; lives = 0;
  pendingBounce = false; autoJump = false; particles = []; ribbon = []; gameOverReason = null;
  newBest = false; charge = 0; landSquash = 0; popups = [];
  resetIsland();
  resetSpace();
  resetIce();
  resetForest();
  resetBase();
  resetAlien();
  resetSea();
  resetPolar();
  resetNuke();
  spawnNext();
  updateCameraTarget();
  camX = camTargetX; camY = camTargetY;
  state = State.READY;
}

/** Fait apparaître une nouvelle plateforme dans la direction +x ou +z. */
function spawnNext() {
  if (tuto.active) { spawnTuto(); return; }
  if (quest.active) { spawnQuest(); return; }
  if (duel.active) { spawnDuel(); return; }
  if (inIsland()) { spawnIsland(); return; }
  if (inSpace()) { spawnSpace(); return; }
  if (inForest()) { spawnForest(); return; }
  if (inBase()) { spawnBase(); return; }
  if (inAlien()) { spawnAlien(); return; }
  if (inSea()) { spawnSea(); return; }
  if (inPolar()) { spawnPolar(); return; }
  if (inNuke()) { spawnNuke(); return; }
  // Difficulté du bloc n° k (le saut qui y mène) : voir difficulty.js
  const k = jumps + 1;
  alongX = rnd() < 0.5;
  const rest = Difficulty.isRest(k), e = Difficulty.level(k);
  const r = rnd();
  const trampChance = k >= Difficulty.TRAMPOLINE_FROM ? 0.10 : 0;
  // Garde-fou : pas de petit bloc juste après un bloc mobile, tant que le joueur n'est pas expert
  const miniChance = k >= Difficulty.MINI_FROM && !(current.kind === Kind.MOVING && k < 60) ? 0.09 : 0;
  const movingChance = k >= Difficulty.MOVING_FROM ? 0.12 + 0.06 * e : 0;
  // Ni glace ni friable juste avant ou après une pause
  const nearRest = Difficulty.isRest(k - 1) || Difficulty.isRest(k + 1);
  const crumbleChance = nearRest ? 0 : Difficulty.crumbleChance(k);
  // Bloc de glace : préparé un saut à l'avance pour que le bloc d'avant soit fixe et solide
  const iceNow = ice.next;
  ice.next = false;
  const prepareIce = !iceNow && !rest && !Difficulty.isRest(k + 1) && !Difficulty.isRest(k + 2) && rnd() < Difficulty.iceChance(k);
  let kind;
  if (iceNow) kind = Kind.ICE;
  else if (rest || prepareIce) kind = Kind.NORMAL;
  else if (current.kind === Kind.TRAMPOLINE) kind = Kind.NORMAL;
  else if (r < trampChance) kind = Kind.TRAMPOLINE;
  else if (r < trampChance + miniChance) kind = Kind.MINI;
  else if (r < trampChance + miniChance + movingChance) kind = Kind.MOVING;
  else if (rnd() < crumbleChance) kind = Kind.CRUMBLY;
  else kind = Kind.NORMAL;
  if (prepareIce) ice.next = true;
  let half = rest ? Difficulty.restHalf(rnd()) : kind === Kind.MINI ? 0.3 : Difficulty.half(e, rnd());
  // Expert : parfois un petit bloc mobile
  if (kind === Kind.MOVING && e > 0.8 && rnd() < 0.25) half = 0.3;
  if (kind === Kind.ICE) half = Math.max(half, ICE_MIN_HALF);
  const round = kind !== Kind.ICE && rnd() < 0.4;
  const moving = kind === Kind.MOVING;
  const minDist = current.half + half + 0.45 + (moving ? 0.8 : 0);
  let dist;
  if (rest) dist = minDist + rnd() * 0.6;
  // Parfois un bloc très proche : on a tendance à sauter trop loin
  else if (!moving && rnd() < Difficulty.closeChance(e)) dist = minDist + rnd() * 0.25;
  else dist = minDist + rnd() * Difficulty.spread(e, moving);
  // Bloc friable doré : 1 bloc friable sur 5 (jamais celui qui porte un cœur)
  const golden = kind === Kind.CRUMBLY && rnd() < Scoring.GOLD_CHANCE && !((jumps + 1) % lifeEvery === 0 && lives < maxLives);
  const color = golden ? GOLD_BLOCK_COLOR : kind === Kind.MINI ? Color.parseColor('#F5C542') : kind === Kind.ICE ? ICE_COLOR : palette[rndInt(palette.length)];
  next = new Platform(alongX ? current.cx + dist : px, alongX ? pz : current.cz + dist, half, round, color, kind, alongX);
  const c = rnd();
  next.coin = c < 0.02 ? 5 : c < 0.18 ? 1 : 0;
  if (moving) next.moveSpeed = Difficulty.moveSpeed(e);
  if (golden) { next.golden = true; next.material = 'lisse'; next.coin = 0; }
  // Pause : une pièce pour souffler
  if (rest && next.coin === 0) next.coin = 1;
  // Un cœur (vie bonus) sur la plateforme du 30e, 60e, 90e… saut réussi
  if ((jumps + 1) % lifeEvery === 0 && lives < maxLives) { next.heart = true; next.coin = 0; }
  // De temps en temps, un éclair d'énergie à ramasser (si l'énergie n'est pas pleine, 10 par jour au plus)
  else if (canEarnEnergy() && rnd() < BOLT_CHANCE) { next.bolt = true; next.coin = 0; }
  platforms.push(next);
  trimPlatforms();
}

/** Garde les 6 derniers blocs ; les plus anciens tombent vers le bas de l'écran au lieu de disparaître d'un coup. */
function trimPlatforms() {
  while (platforms.length > 6) { const old = platforms.shift(); old.leaveV = 1.5; leaving.push(old); }
}
/** Chute des blocs sortis, jusqu'à ce qu'ils aient quitté l'écran. */
function updateLeaving(dt) {
  if (!leaving.length) return;
  for (const p of leaving) { p.leaveV += 26 * dt; p.leaveY += p.leaveV * dt; }
  leaving = leaving.filter((p) => sy(p.cx, -p.leaveY - platformDepth - 1, p.cz) <= h + k);
}

function updateCameraTarget() {
  const mx = (current.cx + next.cx) / 2, mz = (current.cz + next.cz) / 2;
  camTargetX = isoX(mx, mz);
  camTargetY = isoY(mx, 0, mz);
}

function vibrate(ms) {
  if (profile.vibrationOn && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignoré */ } }
}

/** Fait avancer les missions du jour et crédite les pièces gagnées. */
function missionEvent(type, amount = 1) {
  if (quest.active || tuto.active || duel.active) return;   // ni l'Aventure, ni le tuto, ni les duels ne comptent pour les missions du jour et les stats
  Stats.record(type, amount);
  const r = missions.record(type, amount);
  if (r.coins <= 0) return;
  profile.coins = profile.coins + r.coins;
  for (const m of r.completed) {
    banners.push({ text: tr(m.challenge ? 'banner.challenge_done' : 'banner.mission_done', { n: m.reward }), life: 3 });
  }
  if (r.allDoneBonus) banners.push({ text: tr('banner.missions_all', { n: missions.ALL_DONE_REWARD }), life: 3.2 });
  sounds.play('UNLOCK');
}

function collectCoin(p) {
  const n = p.coin;
  p.coin = 0;
  if (duel.active) return;
  if (quest.active) quest.coins++;
  coinsThisRun += n;
  profile.coins = profile.coins + n;
  const x = sx(p.cx, p.cz) + camX, y = sy(p.cx, 0.55, p.cz) + camY;
  spawnSparkles(x, y, Color.parseColor('#FFC93C'), n > 1 ? 22 : 12);
  popups.push({ text: `+${n} 🪙`, x, y: y - k * 0.4, life: 0.9 });
  sounds.play('COIN');
  missionEvent(MissionType.COINS, n);
}

function collectHeart(p) {
  p.heart = false;
  lives = Math.min(lives + 1, maxLives);
  Stats.add('hearts');
  const x = sx(p.cx, p.cz) + camX, y = sy(p.cx, 0.6, p.cz) + camY;
  spawnSparkles(x, y, Color.parseColor('#FF4D8D'), 18);
  popups.push({ text: tr('popup.life'), x, y: y - k * 0.4, life: 1.1 });
  banners.push({ text: tr('banner.life'), life: 2.6 });
  sounds.play('UNLOCK');
}

function startRevive() {
  deathSnap = null;
  lives--;
  Stats.add('angels');
  reviveFromX = px; reviveFromY = py; reviveFromZ = pz;
  // Toujours retour sur la plateforme de départ : la suivante peut être spéciale (fusée, hélico, soucoupe,
  // baleine, trou de la banquise, glace, bloc mobile…) et ses effets ne se déclenchent qu'à un vrai
  // atterrissage. Si elle s'est effondrée, elle est reconstruite (son compte à rebours repart à l'arrivée).
  reviveTarget = current;
  current.dropY = 0; current.dropV = 0; current.crumbleT = -1;
  current.frozen = true;
  // Point d'arrivée : dans l'alignement de la suivante (placée selon l'endroit où l'on s'était posé, par
  // exemple au bout d'une glissade sur la glace), sans jamais sortir de la plateforme.
  const lim = current.half * 0.8;
  reviveToX = current.cx; reviveToZ = current.cz;
  if (alongX) reviveToZ = clamp(next.cz, current.cz - lim, current.cz + lim);
  else reviveToX = clamp(next.cx, current.cx - lim, current.cx + lim);
  ice.sliding = false; pendingBounce = false; autoJump = false;
  reviveT = 0; perfectStreak = 0; gameOverReason = null;
  banners.push({ text: lives > 0 ? tr('banner.saved', { n: lives }) : tr('banner.saved_last'), life: 2.6 });
  sounds.play('REVIVE');
  state = State.REVIVE;
}

function updateRevive(dt) {
  const target = reviveTarget;
  if (!target) return;
  reviveT += dt;
  const f = clamp(reviveT / reviveDuration, 0, 1);
  const e = f * f * (3 - 2 * f);
  px = reviveFromX + (reviveToX - reviveFromX) * e;
  pz = reviveFromZ + (reviveToZ - reviveFromZ) * e;
  py = reviveFromY * (1 - e) + Math.sin(f * Math.PI) * 1.6;
  if (f >= 1) {
    py = 0; px = reviveToX; pz = reviveToZ; landSquash = 1;
    spawnDust(px, pz);
    // Bloc fragile : il tremble mais ne s'effondre plus (comme à la sortie d'un bonus)
    startCrumble(target);
    if (target.crumbly) target.crumbleSafe = true;
    reviveTarget = null;
    state = State.READY;
  }
}

/**
 * Vitesse de la jauge : 2,5 fois plus lente pendant le tuto, et pour les débutants (moins de 3 parties
 * jouées) sur les 5 premiers sauts de la partie ; normale ensuite.
 */
function chargeSpeed() {
  return tuto.active || beginnerSlow() ? 0.4 : 1;
}

function canPause() {
  if (tuto.active) return false;   // le tuto a son propre bouton « Passer »
  if (state === State.READY) return jumps > 0 || score > 0 || quest.active || duel.active;
  return state === State.JUMPING || state === State.CHARGING || state === State.BONUS;
}

function pauseGame() {
  if (!canPause()) return;
  if (state === State.CHARGING) { state = State.READY; charge = 0; }
  pausedFrom = state;
  state = State.PAUSED;
}

function resumeGame() { state = pausedFrom; lastFrame = 0; }

function startAutoJump() {
  jumpFrom = alongX ? px : pz;
  jumpDist = (alongX ? next.cx : next.cz) - jumpFrom;
  jumpDuration = 0.85; jumpHeight = 2.6; jumpT = 0; jumpTrick = 'doubleflip';
  autoJump = true; current.bounce = 1;
  sounds.play('JUMP', 1, 1.4);
  state = State.JUMPING;
}

function startFall() {
  deathSnap = null;   // remis par land() si la chute vient d'un saut raté
  goldLose();
  fallVy = 0; fallT = 0; fallAnim = FALL_ANIMS[rndInt(FALL_ANIMS.length)];
  if (gameOverReason == null) gameOverReason = islandFallReason() || spaceFallReason() || forestFallReason() || baseFallReason() || alienFallReason() || seaFallReason() || polarFallReason() || nukeFallReason();
  perfectStreak = 0; pendingBounce = false; autoJump = false;
  sounds.play('FALL');
  vibrate(60);
  shake(0.06);
  state = State.FALLING;
}

function endGame(reason) {
  // Aventure : pas de score enregistré, une énergie en moins (rien si on quitte avant le 1er saut)
  if (tuto.active) { finishTuto(); return; }
  // (quitter avant le 1er saut = retour à la carte sans rien perdre ; tomber dès le 1er saut = niveau raté)
  if (quest.active) { if (!quest.started) backToQuestMap(); else failQuest(); return; }
  // Duel : ni classement, ni stats, ni record ; l'essai est envoyé au serveur (duels.js)
  if (duel.active) { endDuelRun(reason); return; }
  state = State.GAME_OVER;
  sessionFalls++;
  gameOverTime = 0;
  gameOverReason = reason;
  const before = profile.totalPoints;
  profile.queueRun(score, runTime, jumps);
  Stats.endGame(score, runTime);
  missionEvent(MissionType.GAMES);
  missionEvent(MissionType.SCORE, score);
  newBest = profile.addRun(score);
  overGoal = null; overGoalItem = null;
  unlockedLabels = Skins.unlockedBetween(before, profile.totalPoints).map((it) => it.label);
  const unlocked = unlockedLabels.length > 0;
  sounds.playGameOver(() => { if (unlocked) sounds.play('UNLOCK'); });
  best = profile.best;
  syncOnline();
  offerPseudoChange();
}

function startCrumble(p) {
  if (!p.crumbly || p.crumbleT >= 0) return;
  p.crumbleDur = quest.active ? questCrumbleDur() : Difficulty.crumbleDur(Difficulty.level(jumps));
  // (blocs dorés : mode libre, ou niveaux de l'Aventure avec le défi « trésor doré »)
  if (p.golden) {
    p.crumbleDur *= Scoring.GOLD_DUR_MUL;
    if (!goldHintShown) {
      goldHintShown = true; crumbleHintShown = true;
      popups.push({ text: tr('popup.golden'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 2.2 });
    }
  }
  p.crumbleT = 0;
  if (!crumbleHintShown) {
    crumbleHintShown = true;
    popups.push({ text: tr('popup.crumble'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 1.4 });
  }
}

function checkScare(p) {
  if (p.edgeMargin(px, pz) >= scareMargin) return false;
  scareT = scareDuration;
  scareKind = rndInt(2);
  sounds.play('SCARE');
  vibrate(40);
  return true;
}

function startJump() {
  goldTakeoff();
  quest.started = true;
  const ratio = charge / maxChargeTime;
  lastJumpRatio = ratio;
  if (!beginnerSlow()) gauge.fastWarn = false;   // première charge à vitesse normale faite
  jumpDist = ratio * maxReach;
  jumpFrom = alongX ? px : pz;
  jumpDuration = 0.35 + 0.3 * ratio;
  jumpHeight = 0.6 + jumpDist * 0.3;
  // Planète de l'ovni : gravité faible, sauts plus lents et plus hauts
  if (inAlien()) { jumpDuration *= ALIEN_JUMP_TIME; jumpHeight *= ALIEN_JUMP_HEIGHT; }
  if (inSea()) { jumpDuration *= SEA_JUMP_TIME; jumpHeight *= SEA_JUMP_HEIGHT; }
  jumpT = 0;
  sounds.play('JUMP', 1, 0.9 + 0.3 * ratio);
  jumpTrick = ratio < 0.3 ? 'none' : TRICKS[rndInt(TRICKS.length)];
  state = State.JUMPING;
  snapJump();   // pour le « Ralenti de la mort »
}

function update(dt) {
  updateLoopSound();
  if (state === State.PAUSED || (state === State.SETTINGS && settingsReturnState === State.PAUSED)) return;
  time += dt;
  if (state === State.QUEST_STORY) quest.storyT += dt;
  updateEffects(dt);
  // Élan du défilement des stats après un glissé rapide
  updateDuelsScroll(dt);
  if (state === State.STATS && statsDragY < 0 && statsVel !== 0) {
    statsScroll += statsVel * dt;
    if (statsScroll <= 0 || statsScroll >= statsMaxScroll) statsVel = 0;
    statsScroll = clamp(statsScroll, 0, statsMaxScroll);
    statsVel *= Math.exp(-3.5 * dt);
    if (Math.abs(statsVel) < w * 0.05) statsVel = 0;
  }
  for (const p of platforms) p.update(dt);
  updateLeaving(dt);
  updateDuel(dt);
  if (!(duel.active && duel.countdown > 0) && (state === State.CHARGING || state === State.JUMPING || state === State.FALLING || state === State.BONUS ||
      state === State.REVIVE || (state === State.READY && (jumps > 0 || duel.active)))) runTime += dt;
  if (state === State.READY && pendingBounce) {
    bounceDelay -= dt;
    if (bounceDelay <= 0) { pendingBounce = false; startAutoJump(); }
  }
  if (landSquash > 0) landSquash = Math.max(0, landSquash - dt * 4);

  const c = Math.min(1, dt * 6);
  camX += (camTargetX - camX) * c;
  camY += (camTargetY - camY) * c;
  if (scareT > 0) scareT = Math.max(0, scareT - dt);
  if (perfectPulse > 0) perfectPulse = Math.max(0, perfectPulse - dt * 3);
  updatePerfectFx(dt);
  if (quest.active) { updateQuestChallenges(dt); updateLegendIntro(dt); }
  if (tierPulse > 0) tierPulse = Math.max(0, tierPulse - dt * 1.2);
  updateGoldBlock();
  const barTarget = perfectStreak >= 3 ? 1 : 0;
  perfectBarAlpha += (barTarget - perfectBarAlpha) * Math.min(1, dt * 8);

  // Plateformes fragiles (en pause pendant le bonus et les écrans)
  if (![State.BONUS, State.GAME_OVER, State.LEADERBOARD, State.CUSTOMIZE, State.SETTINGS, State.MISSIONS, State.STATS, State.DAILY, State.AD, State.QUEST_MAP, State.QUEST_INTRO, State.QUEST_END, State.QUEST_STORY, State.DUELS, State.DUEL_END].includes(state)) {
    for (const p of platforms) {
      if (p.collapsed) { p.dropV += 30 * dt; p.dropY += p.dropV * dt; }
      else if (p.crumbleT >= 0 && p.crumbleSafe) p.crumbleT = Math.min(p.crumbleT + dt, p.crumbleDur * 0.85);
      else if (p.crumbleT >= 0) {
        p.crumbleT += dt;
        if (p.crumbleT >= p.crumbleDur) {
          p.dropY = 0.001; p.dropV = 0;
          sounds.play('CRUMBLE', 0.9);
          spawnDebris(p);
          shake(0.08);
          const standing = (state === State.READY || state === State.CHARGING) && p === current;
          if (standing) { gameOverReason = tr('reason.collapsed'); startFall(); }
        }
      }
    }
  }

  checkLightning();
  checkRocket(dt);
  checkEagle();
  checkHeli(dt);
  checkUfo();
  checkWhale();
  checkBlizzard();
  checkNuke();
  updateIdle(dt);
  updateIceSlide(dt);
  updateOverheat(dt);
  updateQuestSounds();
  updateQuestTheme(dt);
  checkDaily();
  switch (state) {
    case State.CHARGING: charge = Math.min(charge + dt * chargeSpeed(), maxChargeTime); break;
    case State.JUMPING: {
      emitTrail(dt);
      jumpT += dt;
      const f = Math.min(jumpT / jumpDuration, 1);
      const pos = jumpFrom + jumpDist * f;
      if (alongX) px = pos; else pz = pos;
      py = 4 * jumpHeight * f * (1 - f);
      if (f >= 1) land();
      break;
    }
    case State.FALLING: {
      fallT += dt;
      if (fallAnim === 'cartoon') { if (fallT > 0.8) fallVy += 45 * dt; }
      else if (fallAnim === 'parachute') {
        if (fallT > 0.25 && fallT < 1.9) fallVy += (1.4 - fallVy) * Math.min(1, dt * 6); else fallVy += 30 * dt;
      } else if (fallAnim === 'panic') fallVy += 22 * dt;
      else fallVy += 30 * dt;
      py -= fallVy * dt;
      // Tuto : on ne peut pas perdre. Jamais d'écran de fin, même si le personnage sort de l'écran avant 0,7 s
      // (c'était la cause des retours à l'accueil en plein tuto).
      if (tuto.active) { if (fallT > 0.7 || sy(px, py + 1.2, pz) > h) tutoRespawn(); break; }
      if (lives > 0 && fallT > 0.6) startRevive();
      else if (sy(px, py + 1.2, pz) > h) endGame(gameOverReason);
      break;
    }
    case State.BONUS: updateBonus(dt); break;
    case State.REVIVE: updateRevive(dt); break;
    case State.STRUCK: updateStrike(dt); break;
    case State.CYCLONE: updateCyclone(dt); break;
    case State.SKYWARD: updateSkyward(dt); break;
    case State.ROCKET: updateRocket(dt); break;
    case State.SPACEFALL: updateSpaceFall(dt); break;
    case State.EAGLE: updateEagle(dt); break;
    case State.FOREST_OUT: updateForestOut(dt); break;
    case State.HELI: updateHeli(dt); break;
    case State.BOOM: updateBoom(dt); break;
    case State.UFO: updateUfo(dt); break;
    case State.UFO_HOME: updateUfoHome(dt); break;
    case State.WHALE: updateWhale(dt); break;
    case State.WHALE_OUT: updateWhaleOut(dt); break;
    case State.BLIZZARD: updateBlizzard(dt); break;
    case State.SLIDE_OUT: updateSlideOut(dt); break;
    case State.NUKE: updateNuke(dt); break;
    case State.NUKE_OUT: updateNukeOut(dt); break;
    case State.GAME_OVER: case State.DUEL_END: gameOverTime += dt; break;
    case State.AD: updateAd(dt); break;
    case State.CUSTOMIZE: updateProgression(dt); break;
    default: break;
  }

  for (const p of popups) { p.life -= dt; p.y -= w * 0.15 * dt; }
  popups = popups.filter((p) => p.life > 0);
}

function land() {
  py = 0;
  // Saut dans le vide vers la méga pièce de l'espace
  if (next.island === PL_VOID && !current.contains(px, pz)) { startSpaceDive(); return; }
  // Saut vers le tronc de l'arbre géant (méga pièce de la forêt)
  if (next.island === PL_TRUNK && !current.contains(px, pz)) { startTrunkGrab(); return; }
  // Saut dans le trou de la banquise
  if (next.island === PL_HOLE && !current.contains(px, pz)) { startRamp(); return; }
  // Saut dans la tour de refroidissement de la centrale (zone radioactive)
  if (next.island === PL_PLANT && next.contains(px, pz)) { startNukeOut(); return; }
  if (next.contains(px, pz)) {
    const wasAuto = autoJump;
    autoJump = false;
    jumps++;
    beginnerOnJumpCounted();
    // Bloc doré quitté à temps et atterrissage réussi : les pièces en jeu sont acquises
    goldBank();
    // Nouveau palier (mode libre, voir Difficulty) : annoncé au retour en jeu (après le bonus)
    if (!quest.active && !duel.active && Difficulty.tier(jumps) > Difficulty.tier(jumps - 1)) pendingTier = Difficulty.tier(jumps);
    landSquash = 1;
    next.frozen = true;
    const scared = !wasAuto && checkScare(next);
    const perfect = !wasAuto && !scared && Math.abs(px - next.cx) < PERFECT_HALF && Math.abs(pz - next.cz) < PERFECT_HALF;
    if (!wasAuto) perfectStreak = perfect ? perfectStreak + 1 : 0;
    if (perfect && quest.active) quest.perfects++;
    if (quest.active) questOnLand(perfect, scared);
    if (tuto.active) tutoOnLand(perfect);
    let points = perfect ? Scoring.perfectPoints(perfectStreak) : 1;
    if (perfect && perfectStreak >= 3) { perfectPulse = 1; lastPerfectPoints = points; shownStreak = perfectStreak; }
    if (next.kind === Kind.MINI) points += Scoring.MINI_BONUS;
    score += points;
    // Parfait : onde, « ding » qui monte, multiplicateur (perfectfx.js) ; rebond de trampoline : série gardée
    if (perfect) onPerfect(perfectStreak, points);
    else if (wasAuto && perfectStreak >= 2) popups.push({ text: tr('popup.streak_kept', { n: perfectStreak }), x: sx(px, pz) + camX, y: sy(px, playerHeight * 2.2, pz) + camY, life: 0.9 });
    else popups.push({ text: `+${points}`, x: sx(px, pz) + camX, y: sy(px, playerHeight * 2.2, pz) + camY, life: 0.8 });
    spawnDust(px, pz);
    if (perfect) spawnSparkles(sx(px, pz) + camX, sy(px, 0.3, pz) + camY, Color.parseColor('#FFD54F'), 16);
    if (!scared) vibrate(15);
    if (perfect) { /* son joué par onPerfect */ }
    else if (!scared && rndInt(5) === 0 && sounds.has('GREAT')) sounds.play('GREAT');
    else sounds.play('LAND');
    if (next.coin > 0) collectCoin(next);
    if (next.heart) collectHeart(next);
    if (next.bolt) collectBolt(next);
    missionEvent(MissionType.JUMPS);
    if (perfect) { missionEvent(MissionType.PERFECTS); missionEvent(MissionType.STREAK, perfectStreak); }
    if (scared) missionEvent(MissionType.SCARES);
    missionEvent(MissionType.SCORE, score);
    current = next;
    // Aventure : arrivé sur le drapeau, niveau réussi
    if (quest.active && current.finish) { completeQuestLevel(); return; }
    // Trampoline géant au bout de l'île : retour dans les nuages
    if (current.mega) { startSkyward(); return; }
    // Sur la fusée : décollage vers l'espace
    if (current.island === PL_ROCKET) { startRocket(); return; }
    // Hélicoptère, baril de TNT, piste de la soucoupe
    if (current.island === PL_HELI) { startHeli(); return; }
    if (current.island === PL_TNT) { startBoom(); return; }
    if (current.island === PL_PAD) { startUfoHome(); return; }
    if (current.island === PL_WHALE) { startWhaleOut(); return; }
    // Glace : la glissade suit le saut qui vient d'être fait, et la plateforme suivante
    // est alignée sur la position d'arrivée de la glissade
    const onIce = current.kind === Kind.ICE;
    if (onIce) { const end = prepareIceSlide(alongX); if (ice.alongX) px = end; else pz = end; }
    spawnNext();
    updateCameraTarget();
    if (onIce) { if (ice.alongX) px = ice.from; else pz = ice.from; }
    startCrumble(current);
    if (current.kind === Kind.TRAMPOLINE) {
      pendingBounce = true; bounceDelay = 0.3; current.bounce = 1;
      sounds.play('TRAMPOLINE');
      popups.push({ text: tr('popup.boing'), x: sx(px, pz) + camX, y: sy(px, playerHeight * 3.4, pz) + camY, life: 0.9 });
      missionEvent(MissionType.TRAMPOLINES);
    }
    const bonusDue = jumps % bonusEvery === 0 && !inAdventure() && !tuto.active;
    // Glace : on glisse d'abord, le bonus éventuel vient après
    if (current.kind === Kind.ICE) startIceSlide(bonusDue);
    else if (bonusDue) startBonus(); else state = State.READY;
  } else if (current.contains(px, pz)) {
    // Bloc doré : on est toujours dessus, les pièces continuent de compter sur le bloc
    goldPending = 0; goldShown = goldOnBlock();
    // Saut trop court : la série s'arrête, sauf micro-saut involontaire (simple tapotement)
    landSquash = 1; if (lastJumpRatio >= 0.12) { perfectStreak = 0; if (quest.active) quest.stats.faults++; } autoJump = false;
    sounds.play('LAND', 0.8);
    spawnDust(px, pz);
    checkScare(current);
    startCrumble(current);
    if (current.kind === Kind.TRAMPOLINE) { pendingBounce = true; bounceDelay = 0.3; current.bounce = 1; sounds.play('TRAMPOLINE'); }
    state = State.READY;
  } else { startFall(); snapDeath(); }
}

// ---------- Dessin ----------
let lastFrame = 0;

function draw(canvas) {
  if (!drawSpaceBackdrop(canvas) && !drawIslandBackdrop(canvas) && !drawForestBackdrop(canvas) && !drawBaseBackdrop(canvas) && !drawAlienBackdrop(canvas) && !drawUnderwaterBackdrop(canvas) && !drawPolarBackdrop(canvas) && !drawNukeBackdrop(canvas)) drawSky(canvas);
  drawNukeSky(canvas);
  const order = platforms.concat(leaving).sort((a, b) => b.farDepth - a.farDepth);
  const playerDepth = px + pz;
  let playerDrawn = false;
  for (const p of order) {
    if (!playerDrawn && playerDepth > p.farDepth) { drawRipples(canvas); drawAura(canvas); drawPlayer(canvas); playerDrawn = true; }
    p.draw(canvas);
  }
  if (!playerDrawn) { drawRipples(canvas); drawAura(canvas); drawPlayer(canvas); }
  drawParticles(canvas);
  drawGoldGauge(canvas);
  if (quest.active) drawQuestStandTimer(canvas);
  if (state === State.STRUCK) drawStrikeOverlay(canvas);
  if (state === State.CYCLONE || state === State.SKYWARD) drawCycloneOverlay(canvas);
  if (state === State.ROCKET || state === State.SPACEFALL) drawSpaceOverlay(canvas);
  if (state === State.EAGLE || state === State.FOREST_OUT) drawEagleOverlay(canvas);
  if (state === State.HELI || state === State.BOOM) drawHeliOverlay(canvas);
  if (state === State.UFO || state === State.UFO_HOME) drawUfoOverlay(canvas);
  if (state === State.WHALE || state === State.WHALE_OUT) drawWhaleOverlay(canvas);
  if (state === State.BLIZZARD || state === State.SLIDE_OUT) drawPolarOverlay(canvas);
  if (state === State.NUKE || state === State.NUKE_OUT) drawNukeOverlay(canvas);

  // Jauge de charge
  if (state === State.CHARGING && tuto.active) drawTutoGauge(canvas, charge / maxChargeTime);   // jauge du tuto (zone de la bonne force)
  else if (state === State.CHARGING) {
    const ratio = charge / maxChargeTime;
    const bw = w * 0.16, bh = w * 0.022;
    const cx = sx(px, pz), top = sy(px, playerHeight, pz) - w * 0.09;
    // Contour blanc (comme dans « Comment jouer ? ») : la jauge ressort sur tous les décors
    const o = w * 0.006;
    rect.set(cx - bw / 2 - o, top - o, cx + bw / 2 + o, top + bh + o);
    barOutlinePaint.color = Color.argb(235, 255, 255, 255); canvas.drawRoundRect(rect, bh / 2 + o, bh / 2 + o, barOutlinePaint);
    rect.set(cx - bw / 2, top, cx + bw / 2, top + bh);
    canvas.drawRoundRect(rect, bh / 2, bh / 2, barBgPaint);
    barPaint.color = Color.rgb(Math.floor(80 + 175 * ratio), Math.floor(220 - 150 * ratio), 90);
    rect.set(cx - bw / 2, top, cx - bw / 2 + bw * ratio, top + bh);
    canvas.drawRoundRect(rect, bh / 2, bh / 2, barPaint);
    // Débutant : tortue pendant la jauge lente, éclair et contour qui pulse quand elle redevient normale
    drawBeginnerGaugeHint(canvas, new RectF(cx - bw / 2, top, cx + bw / 2, top + bh));
  }

  textPaint.textSize = w * 0.06;
  for (const p of popups) {
    textPaint.textSize = w * 0.06;
    textPaint.alpha = clamp(Math.floor(255 * (p.life / 0.8)), 0, 255);
    // Toujours entièrement dans l'écran (texte long ou personnage près du bord)
    const t = fitText(p.text, textPaint, w * 0.92), half = textPaint.measureText(t) / 2 + w * 0.03;
    canvas.drawText(t, clamp(p.x - camX, half, Math.max(half, w - half)), p.y - camY, textPaint);
  }
  textPaint.alpha = 255;
  drawCombo(canvas);

  const home = score === 0 && ![State.CHARGING, State.JUMPING, State.FALLING, State.BONUS, State.REVIVE, State.GAME_OVER, State.AD, State.STRUCK, State.CYCLONE, State.SKYWARD, State.ROCKET, State.SPACEFALL, State.EAGLE, State.FOREST_OUT, State.HELI, State.BOOM, State.UFO, State.UFO_HOME, State.WHALE, State.WHALE_OUT, State.BLIZZARD, State.SLIDE_OUT, State.NUKE, State.NUKE_OUT, State.DUEL_END].includes(state) && !quest.active && !tuto.active && !duel.active;
  // (accueil : le titre et les records sont dans l'en-tête, voir drawHomeHeader plus bas)
  if (!home && state !== State.GAME_OVER && state !== State.AD && state !== State.QUEST_END && state !== State.DUEL_END) {
    canvas.drawText(String(score), w / 2, scoreY(), scorePaint);
    // Palier du mode libre ou chronomètre du duel, tout en haut
    if (duel.active) drawDuelChrono(canvas);
    else if (!quest.active && !tuto.active && state !== State.BONUS) {
      drawTierHud(canvas, jumps, tierPulse);
      drawLiveRank(canvas);   // place au classement mondial en direct (ranking.js)
    }
    textPaint.textSize = w * 0.045;
    const livesText = lives > 0 ? '   ' + '❤️'.repeat(lives) : '';
    // Mode libre : les pièces gagnées pendant cette partie
    const line = quest.active ? questHudLine() : duel.active ? duelHudLine() : tuto.active ? '' : tr('common.record', { n: best }) + `   🪙 +${coinsThisRun}${livesText}`;
    canvas.drawText(fitText(line, textPaint, w * 0.94), w / 2, scoreY() + w * 0.08, textPaint);
  }
  if (duel.active) drawDuelCountdown(canvas);
  if (pendingTier > 0 && state === State.READY) {
    // Palier atteint : +1 énergie (si elle n'est pas pleine et que le plafond du jour n'est pas atteint)
    banners.push({ text: grantFreeEnergy() ? tr('tier.reached_energy', { n: pendingTier }) : tr('tier.reached', { n: pendingTier }), life: 2.4 });
    tierPulse = 1;
    sounds.play('UNLOCK');
    pendingTier = 0;
  }
  if (quest.active) drawLegendIntro(canvas);
  drawBanners(canvas);

  buttons = [];

  if (canPause() && state !== State.BONUS) {
    const ps = w * 0.11, top = insetTop + w * 0.04;
    drawButton(canvas, new RectF(w * 0.97 - ps, top, w * 0.97, top + ps), '⏸', chipPaint, w * 0.05, () => pauseGame());
  }

  if (state === State.READY && score === 0 && !quest.active && !tuto.active && !duel.active) {
    textPaint.textSize = w * 0.05;
    canvas.drawText(tr('hud.hint1'), w / 2, ub() - w * 0.17, textPaint);
    textPaint.textSize = w * 0.04;
    canvas.drawText(tr('hud.hint2'), w / 2, ub() - w * 0.1, textPaint);
    // Menu ☰ à gauche, logo au centre, pièces à droite ; records dessous
    drawHomeHeader(canvas);
    // Défis reçus et résultats des duels : relevés à l'accueil (au plus toutes les 60 s)
    if (profile.pseudo) refreshDuels();
  }

  if (perfectBarAlpha > 0.02 && state !== State.GAME_OVER) drawPerfectBar(canvas);
  if (state === State.BONUS) drawBonus(canvas);
  if (state === State.GAME_OVER) drawGameOver(canvas);
  drawHomeMenu(canvas);
  if (state === State.LEADERBOARD) drawLeaderboard(canvas);
  if (state === State.CUSTOMIZE) drawCustomize(canvas);
  if (state === State.PAUSED) drawPause(canvas);
  if (state === State.MISSIONS) drawMissions(canvas);
  if (state === State.STATS) drawStats(canvas);
  if (state === State.DAILY) drawDaily(canvas);
  if (state === State.SETTINGS) drawSettings(canvas);
  if (state === State.SETTINGS && langPicker) drawLangPicker(canvas);
  if (state === State.SETTINGS && test.open) drawTestMenu(canvas);
  if (state === State.AD) drawAd(canvas);
  if (state === State.QUEST_MAP || state === State.QUEST_INTRO) drawQuestMap(canvas);
  if (state === State.QUEST_MAP && quest.chapters) drawChapters(canvas);
  if (state === State.QUEST_INTRO) drawQuestIntro(canvas);
  if (state === State.QUEST_END) drawQuestEnd(canvas);
  if (state === State.QUEST_STORY) drawQuestStory(canvas);
  if (state === State.DUELS) drawDuels(canvas);
  if (state === State.DUEL_END) drawDuelEnd(canvas);
  // Confirmation d'achat d'énergie, par-dessus tout le reste
  if (quest.confirmEnergy) drawEnergyConfirm(canvas);
  drawTuto(canvas);
  drawGuide(canvas);
  drawDeathSkipHint(canvas);
  // « Ralenti de la mort », par-dessus l'écran de fin (mode libre ou Aventure)
  drawDeathReplay(canvas);
}

// ---------- Entrées tactiles ----------
function onPointerDown(x, y) {
  sounds.unlock();
  // Curseur de temps du « Ralenti de la mort »
  if (deathPointerDown(x, y)) return;
  // Animation de mort : un toucher la passe
  if (deathSkippable()) { skipDeath(); return; }
  // Grille de l'écran Progression : glisser = défiler, toucher = choisir
  if ((state === State.CUSTOMIZE && !buyItem && !buyTint || state === State.SETTINGS && langPicker) && y >= progGridTop && y <= progGridBottom) {
    progDragY = y; progDownX = x; progDragStart = progScroll; progDragMoved = false; return;
  }
  // Défilement de l'onglet Stats avec le doigt
  if (state === State.STATS && y >= statsTop && y <= statsBottom) { statsDragY = y; statsDragStart = statsScroll; statsVel = 0; statsLastY = y; statsLastT = performance.now(); return; }
  // Défilement du classement avec le doigt
  if (state === State.LEADERBOARD && y >= boardListTop && y <= boardListBottom) { boardDragY = y; boardDragStart = boardScroll; return; }
  // Liste de l'écran Duels : glisser = défiler, toucher = bouton de la ligne
  if (duelsPointerDown(x, y)) return;
  if (state === State.SETTINGS && !langPicker && !test.open && !settingsView.account) {
    const pad = w * 0.06, seen = (r) => r.centerY() >= settingsView.top && r.centerY() <= settingsView.bottom;
    dragSlider = (seen(sfxSlider) && y >= sfxSlider.top - pad && y <= sfxSlider.bottom + pad) ? 1
      : (seen(musicSlider) && y >= musicSlider.top - pad && y <= musicSlider.bottom + pad) ? 2 : 0;
    if (dragSlider !== 0) { dragTo(x); return; }
  }
  // Réglages plus hauts que l'écran : glisser = défiler, toucher = ligne
  if (settingsPointerDown(x, y)) return;
  const hit = buttons.find((b) => b.rect.contains(x, y));
  if (hit) {
    // Zone inerte (ex. le logo de l'accueil) : le toucher est simplement ignoré
    if (hit.silent) return;
    // Le bouton s'enfonce, puis l'action suit un court instant après (double appui ignoré)
    if (pressedRect && time - pressedAt < 0.4) return;
    sounds.play('CLICK', 0.6);
    pressedRect = new RectF(hit.rect.left, hit.rect.top, hit.rect.right, hit.rect.bottom); pressedAt = time;
    setTimeout(() => { pressedRect = null; hit.action(); }, 90);
    return;
  }
  // Au retour d'un bonus, on reprend la main tout de suite : seuls les touchers qui continuent la rafale de
  // tapotements du bonus (moins de 0,25 s entre deux) sont ignorés, pour ne pas lancer un micro-saut involontaire
  if (state === State.READY) {
    if (time - bonusTapAt < 0.25) bonusTapAt = time;
    else if (!pendingBounce && !arrivalBusy() && !ice.sliding && time >= inputLockUntil && !(duel.active && duel.countdown > 0) && !tutoLocked()) { state = State.CHARGING; charge = 0; startHold(); }
  } else if (state === State.BONUS) { bonusTapAt = time; bonusTap(x, y); }
}
function onPointerMove(x, y) {
  deathPointerMove(x);
  if ((state === State.CUSTOMIZE || state === State.SETTINGS && langPicker) && progDragY >= 0) {
    if (Math.abs(y - progDragY) > w * 0.02) progDragMoved = true;
    if (progDragMoved) progScroll = clamp(progDragStart - (y - progDragY), 0, progMaxScroll);
  }
  if (state === State.SETTINGS && dragSlider) dragTo(x);
  if (state === State.LEADERBOARD && boardDragY >= 0) boardScroll = clamp(boardDragStart - (y - boardDragY), 0, boardMaxScroll);
  duelsPointerMove(y);
  settingsPointerMove(y);
  if (state === State.STATS && statsDragY >= 0) {
    statsScroll = clamp(statsDragStart - (y - statsDragY), 0, statsMaxScroll);
    const now = performance.now(), dms = now - statsLastT;
    if (dms > 0) { statsVel = statsVel * 0.3 - (y - statsLastY) * 1000 / dms * 0.7; statsLastY = y; statsLastT = now; }
  }
}
function onPointerUp() {
  deathPointerUp();
  if (progDragY >= 0) {
    if (!progDragMoved) {
      const hit = buttons.find((b) => b.rect.contains(progDownX, progDragY));
      if (hit) { sounds.play('CLICK', 0.6); hit.action(); }
    }
    progDragY = -1;
  }
  boardDragY = -1;
  duelsPointerUp();
  settingsPointerUp();
  // Doigt immobile avant de lâcher : pas d'élan
  if (statsDragY >= 0 && performance.now() - statsLastT > 80) statsVel = 0;
  statsDragY = -1;
  if (dragSlider === 1) sounds.play('GREAT');
  dragSlider = 0;
  if (state === State.CHARGING) startJump();
}
