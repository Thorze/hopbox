'use strict';
// Imprévus non mortels (fusée, tornade, aigle, hélicoptère, ovni, baleine, blizzard, nucléaire, trou noir) : le 1er entre la
// 3e et la 5e partie, puis UN par tranche de 25 parties (comme Surprise.kt ; calendrier dans render.js).
// Un seul imprévu, tiré sans remise (on les voit tous avant de revoir le même ; le tout premier est la fusée ou
// l'hélicoptère) ; s'il n'a pas le temps d'arriver, le même est retenté à la partie suivante.

/** Imprévus non mortels, dans l'ordre du tirage (comme SurpriseKind). */
const SURPRISE_KINDS = ['rocket', 'heli', 'ufo', 'whale', 'eagle', 'blizzard', 'nuke', 'tornado', 'blackhole'];
const SurpriseBag = makeEventBag('surprise', SURPRISE_KINDS.length);
/** Le tout premier imprévu : un des plus spectaculaires (on part dans un autre décor). */
const FIRST_SURPRISES = [0, 1];
/** L'imprévu prévu pour cette partie peut se déclencher (il n'y en a qu'un de prévu par partie). */
function surpriseAllowed() { return true; }
/** L'imprévu a eu lieu : le suivant sera tiré dans la tranche d'après, parmi ceux pas encore vus. */
function markSurprise() {
  const n = skyGames(); SurpriseCalendar.happened(n);
  const what = SURPRISE_KINDS[SurpriseBag.pending()];
  if (what) Telemetry.track('surprise', { what, deadly: 0 });   // mesure anonyme (console, « Imprévus »)
  SurpriseBag.happened(); eventHappened(n);
}
/** Monde spécial, Aventure ou duel : ni imprévu ni mini-jeu bonus. */
function inAdventure() { return inIsland() || inSpace() || inForest() || inBase() || inVoyage() || inAlien() || inSea() || inPolar() || inNuke() || quest.active || duel.active; }
function arrivalBusy() { return rocketBusy() || heliBusy() || blackholeBusy(); }

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
    soon(pol.blizzardAt) || soon(nuk.nukeAt) || soon(vyg.holeAt) || (weather === 3 && soon(isl.cycloneAt));
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
