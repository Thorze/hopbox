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
function inAdventure() { return inIsland() || inSpace() || inForest() || inBase() || inAlien() || inSea() || inPolar() || inNuke() || quest.active; }
function arrivalBusy() { return rocketBusy() || heliBusy(); }
