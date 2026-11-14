'use strict';
// Imprévus non mortels (fusée, tornade, aigle, hélicoptère, ovni, baleine, blizzard, nucléaire) : UN par tranche
// de 50 parties, à une partie tirée au hasard (comme Surprise.kt ; calendrier dans render.js).
// Un seul imprévu est choisi ; s'il n'a pas le temps d'arriver, il est retenté à la partie suivante.

/** Poids au tirage (proportions des anciennes fréquences). */
const SURPRISE_WEIGHTS = [['rocket', 33], ['heli', 17], ['ufo', 17], ['whale', 17], ['eagle', 15], ['blizzard', 17], ['nuke', 15], ['tornado', 10]];
function pickSurprise(r) {
  const total = SURPRISE_WEIGHTS.reduce((a, [, wgt]) => a + wgt, 0);
  let x = r * total;
  for (const [k, wgt] of SURPRISE_WEIGHTS) { x -= wgt; if (x < 0) return k; }
  return 'tornado';
}
/** L'imprévu prévu pour cette partie peut se déclencher (il n'y en a qu'un de prévu par partie). */
function surpriseAllowed() { return true; }
/** L'imprévu a eu lieu : le suivant sera tiré dans la tranche de 50 parties d'après. */
function markSurprise() { SurpriseCalendar.happened(skyGames()); }
/** Monde spécial, Aventure ou duel : ni imprévu ni mini-jeu bonus. */
function inAdventure() { return inIsland() || inSpace() || inForest() || inBase() || inAlien() || inSea() || inPolar() || inNuke() || quest.active || duel.active; }
function arrivalBusy() { return rocketBusy() || heliBusy(); }

// Bloc suivant retenu avant un imprévu (comme Surprise.kt) : un imprévu qui tombe pendant un saut attend
// l'atterrissage ; le bloc suivant, créé à l'atterrissage, montait alors puis disparaissait aussitôt. Il reste
// caché sous l'écran : l'imprévu le remplace, ou, s'il ne vient pas, le bloc monte au bout de SURPRISE_HOLD_MAX s.
const SURPRISE_SOON = 0.6;
const SURPRISE_HOLD_MAX = 0.8;
let surpriseHeldAt = 0;
/** Un imprévu qui attend que le joueur soit posé va se déclencher (mode libre seulement). */
function surpriseImminent() {
  if (inAdventure() || tuto.active) return false;
  const soon = (at) => at >= 0 && time >= at - SURPRISE_SOON;
  return soon(spc.rocketAt) || soon(bas.heliAt) || soon(aln.ufoAt) || soon(sea.whaleAt) || soon(frs.eagleAt) ||
    soon(pol.blizzardAt) || soon(nuk.nukeAt) || (weather === 3 && soon(isl.cycloneAt));
}
/** Bloc qui vient d'être créé (spawnNext) : retenu si un imprévu arrive. */
function holdNextForSurprise() {
  if (!surpriseImminent()) return;
  next.held = true;
  surpriseHeldAt = time;
}
/** À chaque image : le bloc retenu monte quand le joueur a la main et que l'imprévu n'est pas venu. */
function updateSurpriseHold() {
  if (!next || !next.held || state !== State.READY) return;
  if (!surpriseImminent() || time - surpriseHeldAt > SURPRISE_HOLD_MAX) next.held = false;
}
