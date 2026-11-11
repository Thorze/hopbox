'use strict';
// Place au classement mondial en direct pendant une partie en mode libre (équivalent de Ranking.kt) :
// « Classement : 12 » entre la barre de palier et le score, et en petit au-dessus à droite ce qu'il manque pour
// gagner une place (« +1 place dans 20 pts »). L'échelle des meilleurs scores des autres joueurs est relevée au
// plus toutes les 2 minutes (GET /api/ladder) ; la place se calcule ensuite à chaque point, sans réseau.

const liveRankState = { scores: [], total: 0, at: 0, busy: false, loaded: false, shown: 0, last: 0, pulse: 0, gained: 0, gainT: 9, prevTime: 0 };
const LADDER_SIZE = 1000;
/** Centre et hauteur (en largeurs d'écran, sous insetTop) de la ligne du classement. */
const RANK_CY = 0.178, RANK_H = 0.05;
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

  // Petite ligne discrète sous la barre de palier : « Classement : 12 » dans une pastille translucide, et juste à
  // droite ce qu'il manque pour la place suivante ; l'ensemble est centré, le score garde une marge en dessous.
  const cy = insetTop + RANK_CY * w, pulse = L.pulse, shownRank = Math.round(L.shown);
  const label = tr('hud.rank_label'), value = beyond ? `${L.scores.length}+` : shownRank === 1 ? '1 👑' : String(shownRank);
  const chip = beyond ? null : rank === 1 ? tr('hud.rank_first') : tr('hud.rank_next', { n: need });
  const ls = w * 0.027, vs = w * 0.036 * (1 + 0.15 * pulse), cs = w * 0.022;
  rankText.textAlign = Align.LEFT;
  rankText.textSize = ls; const lw = rankText.measureText(label);
  rankText.textSize = w * 0.036; const vw = rankText.measureText(value);
  rankText.textSize = cs; const cw = chip ? rankText.measureText(chip) + w * 0.03 : 0, gap = chip ? w * 0.012 : 0;
  const pw = lw + vw + w * 0.055, ph = RANK_H * w, left = Math.max(w * 0.03, w / 2 - (pw + gap + cw) / 2);
  const rr = new RectF(left, cy - ph / 2, left + pw, cy + ph / 2);
  rankFill.shader = null;
  if (pulse > 0) {
    const g = w * 0.008 * pulse;
    rankFill.color = Color.argb(Math.round(90 * pulse), 255, 213, 79);
    canvas.drawRoundRect(new RectF(rr.left - g, rr.top - g, rr.right + g, rr.bottom + g), ph, ph, rankFill);
  }
  rankFill.color = Color.argb(120, 10, 16, 40); canvas.drawRoundRect(rr, ph / 2, ph / 2, rankFill);
  rankLine.strokeWidth = w * 0.0025; rankLine.color = Color.argb(Math.round(45 + 170 * pulse), 247, 222, 156);
  canvas.drawRoundRect(rr, ph / 2, ph / 2, rankLine);
  let x = rr.left + w * 0.025;
  rankText.textSize = ls; rankText.color = Color.argb(215, 220, 228, 245); canvas.drawText(label, x, cy + ls * 0.36, rankText);
  x += lw + w * 0.008;
  rankText.textSize = vs; rankText.color = pulse > 0.3 ? Color.WHITE : UI.GOLD; canvas.drawText(value, x, cy + vs * 0.36, rankText);
  // Ce qu'il manque pour la place suivante : petite pastille verte (dorée quand on est premier)
  if (chip) {
    const chH = ph * 0.78, cr = new RectF(left + pw + gap, cy - chH / 2, left + pw + gap + cw, cy + chH / 2);
    rankFill.color = rank === 1 ? Color.argb(200, 224, 154, 28) : Color.argb(185, 47, 166, 58);
    canvas.drawRoundRect(cr, chH / 2, chH / 2, rankFill);
    rankText.textAlign = Align.CENTER; rankText.textSize = cs; rankText.color = Color.WHITE;
    canvas.drawText(chip, cr.centerX(), cy + cs * 0.36, rankText);
  }
  // « ▲ +2 » qui monte quand on gagne des places
  if (L.gainT < 1) {
    const f = L.gainT;
    rankText.textAlign = Align.RIGHT; rankText.textSize = w * 0.028; rankText.color = Color.argb(Math.round(255 * (1 - f)), 98, 224, 140);
    canvas.drawText('▲ +' + L.gained, left - w * 0.012, cy - w * 0.03 * f + rankText.textSize * 0.36, rankText);
  }
  rankText.textAlign = Align.LEFT;
}
