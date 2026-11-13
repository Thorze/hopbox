'use strict';
// Place au classement mondial en direct pendant une partie en mode libre (équivalent de Ranking.kt) :
// une pastille entre la barre de palier et le score, avec le rang (🏆 12) et ce qu'il manque pour la place
// suivante (▲ 11e dans 20 pts). L'échelle des meilleurs scores des autres joueurs est relevée au
// plus toutes les 2 minutes (GET /api/ladder) ; la place se calcule ensuite à chaque point, sans réseau.

const liveRankState = { scores: [], total: 0, at: 0, busy: false, loaded: false, shown: 0, last: 0, pulse: 0, gained: 0, gainT: 9, prevTime: 0 };
const LADDER_SIZE = 1000;
/** Centre et hauteur (en largeurs d'écran, sous insetTop) de la ligne du classement. */
const RANK_CY = 0.183, RANK_H = 0.06;
const rankFill = new Paint(), rankLine = new Paint({ style: Style.STROKE }), rankText = new Paint({ bold: true });

function refreshLadder() {
  const L = liveRankState, now = Date.now();
  if (L.busy || (L.at && now - L.at < 120000)) return;
  L.busy = true; L.at = now;
  online.ladder(LADDER_SIZE).then((l) => {
    L.busy = false;
    if (l) { L.scores = l.scores || []; L.total = l.total || 0; L.loaded = true; }
  });
}

/**
 * Place pour un score : 1 + le nombre de joueurs qui ont fait au moins autant (à égalité, le premier arrivé garde
 * la place), et les points qu'il manque pour passer devant le joueur juste au-dessus (0 = déjà premier).
 */
function liveRank(scores, s) {
  let lo = 0, hi = scores.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (scores[mid] >= s) lo = mid + 1; else hi = mid; }
  return [lo + 1, lo === 0 ? 0 : scores[lo - 1] - s + 1];
}

function drawLiveRank(canvas) {
  const L = liveRankState;
  if (!profile.pseudo) return;
  refreshLadder();
  if (!L.loaded) return;
  const dt = clamp(time - L.prevTime, 0, 0.05); L.prevTime = time;
  const [rank, need] = liveRank(L.scores, score);
  const beyond = rank > L.scores.length && L.total > L.scores.length;
  if (score === 0 || L.shown === 0) { L.shown = rank; L.last = rank; }
  if (rank < L.last) { L.pulse = 1; L.gained = L.last - rank; L.gainT = 0; sounds.play('STAR', 0.45, 1.5); }
  L.last = rank;
  L.shown += (rank - L.shown) * Math.min(1, dt * 7);
  if (Math.abs(L.shown - rank) < 0.02) L.shown = rank;
  L.pulse = Math.max(0, L.pulse - dt * 2.2); L.gainT += dt;

  // Une seule pastille bleu nuit au liseré doré : à gauche le rang dans une étiquette dorée (🏆 17), à droite la
  // place suivante et les points qui manquent (▲ 16e dans 4 pts). Elle brille un instant quand on gagne une place.
  const cy = insetTop + RANK_CY * w, pulse = L.pulse, shownRank = Math.round(L.shown), ph = RANK_H * w;
  const value = '🏆 ' + (beyond ? `${L.scores.length}+` : String(shownRank));
  const next = beyond ? null : rank === 1 ? tr('hud.rank_first') : tr(need === 1 ? 'hud.rank_up1' : 'hud.rank_up', { p: rank - 1, n: need });
  const inset = ph * 0.13, subH = ph - inset * 2, vs = w * 0.037, rs = w * 0.029;
  rankText.textAlign = Align.LEFT;
  rankText.textSize = vs; const subW = rankText.measureText(value) + w * 0.04;
  rankText.textSize = rs; const nw = next ? rankText.measureText(next) : 0;
  const arrow = next && rank > 1 ? rs * 0.75 : 0;
  const pw = inset + subW + (next ? w * 0.02 + arrow + (arrow ? w * 0.01 : 0) + nw + w * 0.03 : inset);
  const left = Math.max(w * 0.03, w / 2 - pw / 2), rr = new RectF(left, cy - ph / 2, left + pw, cy + ph / 2);
  rankFill.shader = null;
  if (pulse > 0) {
    const g = w * 0.012 * pulse;
    rankFill.color = Color.argb(Math.round(110 * pulse), 255, 213, 79);
    canvas.drawRoundRect(new RectF(rr.left - g, rr.top - g, rr.right + g, rr.bottom + g), ph, ph, rankFill);
  }
  // (discrète : fond bleu nuit translucide et liseré doré léger, qui ne s'affirment qu'au gain d'une place)
  rankFill.color = Color.argb(Math.round(105 + 90 * pulse), 18, 28, 60); canvas.drawRoundRect(rr, ph / 2, ph / 2, rankFill);
  rankLine.strokeWidth = w * (0.003 + 0.003 * pulse); rankLine.color = Color.argb(Math.round(85 + 170 * pulse), 226, 188, 110);
  canvas.drawRoundRect(rr, ph / 2, ph / 2, rankLine);
  // Étiquette dorée du rang (le chiffre rebondit quand on monte)
  const sr = new RectF(rr.left + inset, cy - subH / 2, rr.left + inset + subW, cy + subH / 2);
  rankFill.color = ca(Theme.lerp(Color.parseColor('#E8C46A'), Color.parseColor('#FFE9A8'), pulse) & 0xFFFFFF, 190 + 65 * pulse);
  canvas.drawRoundRect(sr, subH / 2, subH / 2, rankFill);
  rankText.textAlign = Align.CENTER; rankText.textSize = vs * (1 + 0.18 * pulse); rankText.color = Color.parseColor('#3B2A08');
  canvas.drawText(value, sr.centerX(), cy + rankText.textSize * 0.36, rankText);
  // Place suivante : petite flèche verte puis le texte (doré quand on est premier)
  if (next) {
    let x = sr.right + w * 0.02;
    if (arrow) {
      const p = new Path(); p.moveTo(x, cy + arrow * 0.4); p.lineTo(x + arrow, cy + arrow * 0.4); p.lineTo(x + arrow / 2, cy - arrow * 0.45); p.close();
      rankFill.color = Color.parseColor('#62E08C'); canvas.drawPath(p, rankFill);
      x += arrow + w * 0.01;
    }
    rankText.textAlign = Align.LEFT; rankText.textSize = rs; rankText.color = rank === 1 ? UI.GOLD : Color.argb(225, 236, 241, 252);
    canvas.drawText(next, x, cy + rs * 0.36, rankText);
  }
  // « ▲ +2 » qui monte quand on gagne des places
  if (L.gainT < 1) {
    const f = L.gainT;
    rankText.textAlign = Align.RIGHT; rankText.textSize = w * 0.028; rankText.color = Color.argb(Math.round(255 * (1 - f)), 98, 224, 140);
    canvas.drawText('▲ +' + L.gained, left - w * 0.012, cy - w * 0.03 * f + rankText.textSize * 0.36, rankText);
  }
  rankText.textAlign = Align.LEFT;
}
