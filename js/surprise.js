'use strict';
// Imprévus non mortels (fusée, cyclone, aigle, hélicoptère, ovni) : au plus UN par jour
// (comme Surprise.kt). Le jour est retenu dès qu'un imprévu se déclenche.

function surpriseToday() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
function surpriseAllowed() { return store.getInt('surprise_day', -1) !== surpriseToday(); }
function markSurprise() { store.set('surprise_day', surpriseToday()); }
function inAdventure() { return inIsland() || inSpace() || inForest() || inBase() || inAlien() || inSea() || inPolar(); }
function arrivalBusy() { return rocketBusy() || heliBusy(); }
