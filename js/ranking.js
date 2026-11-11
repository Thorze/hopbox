'use strict';
// Place au classement mondial en direct pendant une partie en mode libre (équivalent de Ranking.kt) :
// « Classement : 12 » entre la barre de palier et le score, et en petit au-dessus à droite ce qu'il manque pour
// gagner une place (« +1 place dans 20 pts »). L'échelle des meilleurs scores des autres joueurs est relevée au
// plus toutes les 2 minutes (GET /api/ladder) ; la place se calcule ensuite à chaque point, sans réseau.

const liveRankState = { scores: [], total: 0, at: 0, busy: false, loaded: false, shown: 0, last: 0, pulse: 0, gained: 0, gainT: 9, prevTime: 0 };
const LADDER_SIZE = 1000;
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

  const cx = w / 2, cy = insetTop + w * 0.205, pulse = L.pulse, shownRank = Math.round(L.shown);
  const label = tr('hud.rank_label'), value = beyond ? `${L.scores.length}+` : shownRank === 1 ? '1 👑' : String(shownRank);
  const ls = w * 0.036, vs = w * 0.056 * (1 + 0.25 * pulse);
  rankText.textAlign = Align.LEFT;
  rankText.textSize = ls; const lw = rankText.measureText(label);
  rankText.textSize = vs; const vw = rankText.measureText(value);
  const pw = lw + vw + w * 0.09, ph = w * 0.075, rr = new RectF(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2);
  rankFill.shader = null; rankFill.color = Color.argb(110, 3, 6, 18);
  canvas.drawRoundRect(new RectF(rr.left, rr.top + w * 0.008, rr.right, rr.bottom + w * 0.008), ph / 2, ph / 2, rankFill);
  if (pulse > 0) {
    rankFill.color = Color.argb(Math.round(110 * pulse), 255, 213, 79);
    const g = w * 0.012 * pulse;
    canvas.drawRoundRect(new RectF(rr.left - g, rr.top - g, rr.right + g, rr.bottom + g), ph, ph, rankFill);
  }
  rankFill.color = Color.WHITE; rankFill.shader = new LinearGradient(0, rr.top, 0, rr.bottom, Color.argb(225, 40, 56, 108), Color.argb(225, 16, 24, 54));
  canvas.drawRoundRect(rr, ph / 2, ph / 2, rankFill); rankFill.shader = null;
  rankLine.strokeWidth = w * 0.004; rankLine.color = Color.argb(Math.round(150 + 105 * pulse), 247, 222, 156);
  canvas.drawRoundRect(rr, ph / 2, ph / 2, rankLine);
  let x = cx - (lw + vw + w * 0.02) / 2;
  rankText.textSize = ls; rankText.color = UI.SOFT; canvas.drawText(label, x, cy + ls * 0.36, rankText);
  x += lw + w * 0.02;
  rankText.textSize = vs; rankText.color = pulse > 0.3 ? Color.WHITE : UI.GOLD;
  rankText.setShadowLayer(w * 0.008, 0, w * 0.003, Color.argb(160, 0, 0, 0)); canvas.drawText(value, x, cy + vs * 0.36, rankText); rankText.shadow = null;
  // Petite pastille en haut à droite : ce qu'il manque pour la place suivante
  const chip = beyond ? null : rank === 1 ? tr('hud.rank_first') : tr('hud.rank_next', { n: need });
  if (chip) {
    rankText.textSize = w * 0.026;
    const cw = rankText.measureText(chip) + w * 0.035, chH = w * 0.042, bob = Math.sin(time * 3) * w * 0.003;
    const chx = Math.min(rr.right + cw * 0.35, w - cw / 2 - w * 0.02), chy = rr.top + chH * 0.02 + bob;
    const cr = new RectF(chx - cw / 2, chy - chH / 2, chx + cw / 2, chy + chH / 2);
    rankFill.color = Color.argb(90, 0, 0, 0); canvas.drawRoundRect(new RectF(cr.left, cr.top + w * 0.004, cr.right, cr.bottom + w * 0.004), chH / 2, chH / 2, rankFill);
    rankFill.color = Color.WHITE;
    rankFill.shader = new LinearGradient(0, cr.top, 0, cr.bottom, Color.parseColor(rank === 1 ? '#FFE27A' : '#5FD95A'), Color.parseColor(rank === 1 ? '#E09A1C' : '#2FA63A'));
    canvas.drawRoundRect(cr, chH / 2, chH / 2, rankFill); rankFill.shader = null;
    rankText.textAlign = Align.CENTER; rankText.color = rank === 1 ? UI.INK_DARK : Color.WHITE;
    canvas.drawText(chip, chx, chy + rankText.textSize * 0.36, rankText);
  }
  // « ▲ +2 » qui monte quand on gagne des places
  if (L.gainT < 1) {
    const f = L.gainT;
    rankText.textAlign = Align.RIGHT; rankText.textSize = w * 0.034; rankText.color = Color.argb(Math.round(255 * (1 - f)), 98, 224, 140);
    canvas.drawText('▲ +' + L.gained, cx - pw / 2 - w * 0.015, cy - w * 0.04 * f + rankText.textSize * 0.36, rankText);
  }
  rankText.textAlign = Align.LEFT;
}
