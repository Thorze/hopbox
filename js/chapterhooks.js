'use strict';
// Dessin propre à chaque chapitre (équivalent de ChapterHooks.kt).
// Un chapitre qui a son propre fichier (chapterrome.js…) y déclare ses crochets en bas :
//     const CHAPTER_HOOKS_28 = { blockLook: chapterBlockLook28, … };
// puis une ligne ici dans chapterHooks. Tout crochet absent garde le dessin commun.
//   blockLook(b) · deco(canvas, pl, seed) · pickup(canvas, cy, shadow) → false = pièce classique · finish(canvas, p)
//   collectible(canvas, c, x, y, r, got) · mapBackground(canvas) · overlay(canvas) · perfect(streak)
//   ice(canvas, pl) · iceTopButton (la glace garde le bouton du dessus des blocs normaux)
// Les données (héros, sons, carte, ambiance…) ne sont pas ici : chapitres/chapitres.json.

let chapterHooksAll = null;
/** Crochets du chapitre c, ou null (dessin commun ou ancien chapitre écrit dans chapterthemes*.js). */
function chapterHooks(c) {
  // Liste faite au premier appel : les fichiers des chapitres sont alors tous chargés
  if (!chapterHooksAll) {
    chapterHooksAll = {
      26: CHAPTER_HOOKS_26,
      27: CHAPTER_HOOKS_27,
      28: CHAPTER_HOOKS_28,
      29: CHAPTER_HOOKS_29,
      30: CHAPTER_HOOKS_30,
      31: CHAPTER_HOOKS_31,
      32: CHAPTER_HOOKS_32,
    };
  }
  return chapterHooksAll[c] || null;
}
