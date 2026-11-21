'use strict';
// Énergie à gagner en mode libre (équivalent de FreeEnergy.kt) :
// - un éclair ⚡ à ramasser sur un bloc, environ 1 fois tous les 40 sauts ;
// - +1 ⚡ à chaque palier atteint (26, 81, 151, 251, 361 sauts, puis tous les 150).
// Seulement quand l'énergie n'est pas pleine, sans limite par jour (free_energy_n compte celles du jour, pour info).

const BOLT_CHANCE = 1 / 40;

function freeEnergyToday() {
  if (store.getInt('free_energy_day', -1) !== DailyReward.today()) return 0;
  return store.getInt('free_energy_n', 0);
}
/** On peut gagner de l'énergie en mode libre (tant qu'elle n'est pas pleine). */
function canEarnEnergy() { return !quest.active && !tuto.active && !duel.active && Energy.get(Energy.now()) < Energy.MAX; }
/** Donne 1 énergie si c'est possible ; renvoie vrai si elle a été donnée. */
function grantFreeEnergy() {
  if (!canEarnEnergy()) return false;
  Energy.add(Energy.now(), 1);
  store.set('free_energy_day', DailyReward.today());
  store.set('free_energy_n', freeEnergyToday() + 1);
  energyThisRun++;   // montrées à la fin de la partie : elles rejoignent la pastille d'énergie en haut à droite
  return true;
}

/** Atterrissage sur un bloc avec un éclair. */
function collectBolt(p) {
  p.bolt = false;
  if (!grantFreeEnergy()) return;
  const x = sx(p.cx, p.cz) + camX, y = sy(p.cx, 0.6, p.cz) + camY;
  spawnSparkles(x, y, Color.parseColor('#FFC93C'), 18);
  popups.push({ text: '+1 ⚡', x, y: y - k * 0.4, life: 1.1 });
  banners.push({ text: tr('banner.energy', { e: Energy.get(Energy.now()), t: Energy.MAX }), life: 2.4 });
  sounds.play('UNLOCK');
}
