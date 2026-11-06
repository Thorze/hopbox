'use strict';
// Récompense quotidienne (équivalent de Daily.kt) : chaque jour où le joueur ouvre le jeu, des pièces.
// Jours d'affilée = gain qui monte (10, 20, 30, 40, 60, 80, puis 100 au plus). Jour manqué = retour au jour 1.

const DailyReward = {
  REWARDS: [10, 20, 30, 40, 60, 80, 100],
  reward(day) { return this.REWARDS[Math.min(Math.max(day, 1) - 1, this.REWARDS.length - 1)]; },
  today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); },
  canClaim(today) { return store.getInt('daily_last', -1) !== today; },
  streakToday(today) {
    const last = store.getInt('daily_last', -1), streak = store.getInt('daily_streak', 0);
    return last === today ? streak : last === today - 1 ? streak + 1 : 1;
  },
  claim(today) {
    if (!this.canClaim(today)) return 0;
    const day = this.streakToday(today);
    store.set('daily_streak', day); store.set('daily_last', today);
    if (day > store.getInt('st_daily_best', 0)) store.set('st_daily_best', day);
    return this.reward(day);
  },
};
let dailyReturnState = 'ready', dailyCheckedDay = -1, dailyOpenT = 0;

function checkDaily() {
  if (state !== State.READY || jumps !== 0 || score !== 0 || time < 0.8 || quest.active) return;
  const today = DailyReward.today();
  if (dailyCheckedDay === today) return;
  dailyCheckedDay = today;
  if (!DailyReward.canClaim(today)) return;
  dailyReturnState = state; dailyOpenT = time; state = State.DAILY;
}

function claimDaily() {
  const gain = DailyReward.claim(DailyReward.today());
  if (gain > 0) {
    profile.coins = profile.coins + gain;
    missionEvent(MissionType.COINS, gain);
    spawnSparkles(w / 2 + camX, h * 0.55 + camY, Color.parseColor('#FFD54F'), 40);
    popups.push({ text: `+${gain} 🪙`, x: w / 2 + camX, y: h * 0.5 + camY, life: 1.6 });
    sounds.play('COIN'); sounds.play('UNLOCK');
  }
  state = dailyReturnState;
}

function drawDaily(canvas) {
  const today = DailyReward.today(), day = DailyReward.streakToday(today), gain = DailyReward.reward(day);
  const ph = w * 1.12, left = w * 0.05, right = w * 0.95;
  const top = Math.max(insetTop, (insetTop + ub()) / 2 - ph / 2), bottom = top + ph;
  const q = clamp((time - dailyOpenT) / 0.35, 0, 1), sc = 0.85 + 0.15 * (1 - (1 - q) * (1 - q));
  canvas.drawRect(0, 0, w, h, overlayPaint);
  canvas.save(); canvas.scale(sc, sc, w / 2, (top + bottom) / 2);
  rect.set(left, top, right, bottom); canvas.drawRoundRect(rect, w * 0.05, w * 0.05, panelPaint);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.065;
  canvas.drawText('🎁 ' + tr('daily.title'), w / 2, top + w * 0.11, darkTextPaint);
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.04;
  canvas.drawText(tr(day <= 1 ? 'daily.first' : 'daily.streak', { n: day }), w / 2, top + w * 0.18, greyTextPaint);
  const shown = Math.min(day, 7), gap = w * 0.025, cw = (right - left - w * 0.08 - gap * 3) / 4, ch = cw * 1.15;
  for (let i = 0; i < 7; i++) {
    const row = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4, rowW = row === 0 ? 4 : 3;
    const x0 = left + w * 0.04 + (4 - rowW) * (cw + gap) / 2 + col * (cw + gap), y0 = top + w * 0.25 + row * (ch + gap);
    const r = new RectF(x0, y0, x0 + cw, y0 + ch), n = i + 1, done = n < shown, now = n === shown;
    progPaint.shader = null;
    progPaint.color = Color.parseColor(now ? '#FFE0B2' : done ? '#DFF5E3' : '#EEF0F4');
    canvas.drawRoundRect(r, w * 0.03, w * 0.03, progPaint);
    if (now) {
      progStroke.color = Color.parseColor('#FF7A45'); progStroke.strokeWidth = w * (0.008 + 0.004 * Math.abs(Math.sin(time * 4)));
      canvas.drawRoundRect(r, w * 0.03, w * 0.03, progStroke);
    }
    greyTextPaint.textSize = w * 0.03;
    canvas.drawText(tr(n === 7 ? 'daily.day_plus' : 'daily.day', { n }), r.centerX(), r.top + ch * 0.22, greyTextPaint);
    darkTextPaint.textSize = w * 0.06; canvas.drawText(done ? '✅' : '🪙', r.centerX(), r.top + ch * 0.58, darkTextPaint);
    darkTextPaint.textSize = w * 0.042; canvas.drawText('+' + DailyReward.reward(n), r.centerX(), r.top + ch * 0.88, darkTextPaint);
  }
  const infoY = top + w * 0.25 + 2 * (ch + gap) + w * 0.04;
  greyTextPaint.textSize = w * 0.035; canvas.drawText(tr('daily.tomorrow', { n: DailyReward.reward(day + 1) }), w / 2, infoY, greyTextPaint);
  greyTextPaint.textSize = w * 0.03; canvas.drawText(tr('daily.miss'), w / 2, infoY + w * 0.05, greyTextPaint);
  canvas.restore();
  drawButton(canvas, new RectF(w * 0.2, bottom - w * 0.17, w * 0.8, bottom - w * 0.05), tr('daily.claim', { n: gain }), primaryBtnPaint, w * 0.05, () => claimDaily());
}
