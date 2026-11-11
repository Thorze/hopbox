'use strict';
// Statistiques du joueur (équivalent de Stats.kt), gardées dans le navigateur (clés « st_… »).

const Stats = {
  get(key) { return store.getInt('st_' + key); },
  add(key, n = 1) { store.set('st_' + key, this.get(key) + n); },
  max(key, v) { if (v > this.get(key)) store.set('st_' + key, v); },
  record(type, amount) {
    const key = type.key.replace('mission.', '');
    if (type.max) this.max(key, amount); else this.add(key, amount);
  },
  endGame(score, seconds) { this.add('time', Math.floor(seconds)); this.max('longest', Math.floor(seconds)); this.add('points', score); },
  duration(s) { return s >= 3600 ? tr('stats.dur_h', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) }) : s >= 60 ? tr('stats.dur_m', { m: Math.floor(s / 60), s: s % 60 }) : tr('stats.dur_s', { s }); },
  number(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); },
};

let statsReturnState = 'ready', statsScroll = 0, statsMaxScroll = 0, statsTop = 0, statsBottom = 0, statsDragY = -1, statsDragStart = 0;
// Élan après un glissé rapide (pixels par seconde) et dernier point du doigt
let statsVel = 0, statsLastY = 0, statsLastT = 0;
function openStats() { if (state === State.STATS) return; statsReturnState = state; statsVel = 0; state = State.STATS; }

/** Écran des statistiques : 3 grandes tuiles, une grille de chiffres et les imprévus rencontrés. */
function drawStats(canvas) {
  const g = (k) => Stats.get(k), N = (n) => Stats.number(n);
  const games = Math.max(g('games'), store.getInt('sky_games')), points = g('points'), counted = Math.max(1, g('games'));
  const T = (icon, value, label, color) => ({ icon, value, label: tr(label), color });
  const hero = [
    T('🏆', N(profile.best), 'stats.best', 0xFFFFC93C),
    T('🎮', N(games), 'stats.games', 0xFF3F8EFC),
    T('⏱️', Stats.duration(g('time')), 'stats.time', 0xFF3DBE6E),
  ];
  const grid = [
    T('🦘', N(g('jumps')), 'stats.jumps', 0xFFFF7A45),
    T('🎯', N(g('perfects')), 'stats.perfects', 0xFFE53950),
    T('🔥', N(g('streak')), 'stats.streak', 0xFFFF9800),
    T('🪙', N(g('coins')), 'stats.coins', 0xFFFFB300),
    T('🤸', N(g('trampolines')), 'stats.trampolines', 0xFF8E5CD9),
    T('🎁', N(g('bonus_win')), 'stats.bonus', 0xFFEC6FA0),
    T('📈', points > 0 ? N(Math.floor(points / counted)) : '—', 'stats.average', 0xFF26A69A),
    T('⌛', Stats.duration(g('longest')), 'stats.longest', 0xFF5C6BC0),
    T('😱', N(g('scares')), 'stats.scares', 0xFF78909C),
    T('❤️', N(g('hearts')), 'stats.hearts', 0xFFFF4D8D),
    T('👼', N(g('angels')), 'stats.angels', 0xFF90CAF9),
    T('💰', N(g('mega')), 'stats.mega', 0xFFFFD54F),
  ];
  // Imprévus : « ??? » tant qu'on ne les a pas rencontrés
  const secret = (icon, key, label, color) => g(key) > 0 ? T(icon, N(g(key)), label, color) : T('❔', '???', 'stats.mystery', 0xFFB0BEC5);
  const surprises = [
    secret('🌪️', 'cyclones', 'stats.cyclones', 0xFF90A4AE),
    secret('🏝️', 'islands', 'stats.islands', 0xFF29B6F6),
    secret('🚀', 'space', 'stats.space', 0xFF7E57C2),
    secret('🦅', 'eagles', 'stats.eagles', 0xFF8D6E63),
    secret('🚁', 'helis', 'stats.helis', 0xFF7C8B5A),
    secret('🛸', 'ufos', 'stats.ufos', 0xFF8E6CC9),
    secret('🐋', 'whales', 'stats.whales', 0xFF3D7CC9),
    secret('🐧', 'blizzards', 'stats.blizzards', 0xFF7FB6D9),
    secret('☢️', 'nukes', 'stats.nukes', 0xFF8BC34A),
    secret('⚡', 'struck', 'stats.struck', 0xFFFFD54F),
    secret('✈️', 'planes', 'stats.planes', 0xFFE57373),
    secret('🌋', 'volcano', 'stats.volcano', 0xFFFF7043),
    secret('🛰️', 'satellite', 'stats.satellite', 0xFF5C8DD6),
  ];
  const left = w * 0.04, right = w * 0.96, top = insetTop + w * 0.04, bottom = ub() - w * 0.04;
  panel(canvas, left, top, right, bottom, null, null, true);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.065;
  drawProgressTabs(canvas, top, 1);
  // Grandes tuiles lisibles ; la liste défile entre les onglets et le bouton OK
  const gap = w * 0.025, inL = left + w * 0.04, inR = right - w * 0.04;
  statsTop = top + w * 0.15; statsBottom = bottom - w * 0.17;
  canvas.save();
  canvas.clipRect(left, statsTop, right, statsBottom);
  canvas.translate(0, -statsScroll);
  let y = statsTop + w * 0.01;
  const row = (tiles, cols, rowH, big) => {
    const tw = (inR - inL - gap * (cols - 1)) / cols;
    tiles.forEach((t, i) => {
      const inRow = Math.min(cols, tiles.length - Math.floor(i / cols) * cols);
      const x0 = inL + (i % cols) * (tw + gap) + (cols - inRow) * (tw + gap) / 2, y0 = y + Math.floor(i / cols) * (rowH + gap);
      drawStatTile(canvas, new RectF(x0, y0, x0 + tw, y0 + rowH), t, big);
    });
    y += Math.ceil(tiles.length / cols) * (rowH + gap);
  };
  row(hero, 3, w * 0.27, true);
  row(grid, 3, w * 0.235, false);
  darkTextPaint.textAlign = Align.CENTER; darkTextPaint.textSize = w * 0.048;
  canvas.drawText(tr('stats.surprises'), w / 2, y + w * 0.06, darkTextPaint);
  y += w * 0.09;
  row(surprises, 3, w * 0.235, false);
  canvas.restore();
  statsMaxScroll = Math.max(0, y - statsTop - (statsBottom - statsTop));
  statsScroll = clamp(statsScroll, 0, statsMaxScroll);
  if (statsScroll < statsMaxScroll - 1) {
    progPaint.color = Color.WHITE;
    // Même couleur que le panneau bleu nuit à cette hauteur (dégradé du thème), sans déborder sur le liseré
    const fc = Theme.lerp(UI.PANEL_TOP, UI.PANEL_BOTTOM, clamp((statsBottom - top) / (bottom - top), 0, 1));
    progPaint.shader = new LinearGradient(0, statsBottom - w * 0.12, 0, statsBottom, (fc & 0x00FFFFFF) >>> 0, fc);
    canvas.drawRect(left + w * 0.02, statsBottom - w * 0.12, right - w * 0.02, statsBottom, progPaint);
    progPaint.shader = null;
    greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.05;
    canvas.drawText('⌄', w / 2, statsBottom - w * 0.01 + Math.sin(time * 4) * w * 0.008, greyTextPaint);
  }
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.14, w * 0.7, bottom - w * 0.04), 'OK', backBtnPaint, w * 0.05, () => { state = statsReturnState; });
}

function drawStatTile(canvas, r, t, big) {
  const red = Color.red(t.color), green = Color.green(t.color), blue = Color.blue(t.color), hg = r.height();
  // Verre teinté de la couleur de la statistique, sur le bleu nuit du panneau
  progPaint.shader = null; progPaint.color = Color.argb(150, 14, 22, 48);
  canvas.drawRoundRect(r, w * 0.03, w * 0.03, progPaint);
  progPaint.color = Color.argb(62, red, green, blue);
  canvas.drawRoundRect(r, w * 0.03, w * 0.03, progPaint);
  progStroke.color = Color.argb(170, red, green, blue); progStroke.strokeWidth = w * 0.004;
  canvas.drawRoundRect(r, w * 0.03, w * 0.03, progStroke);
  darkTextPaint.textAlign = Align.CENTER;
  darkTextPaint.textSize = hg * 0.25;
  canvas.drawText(t.icon, r.centerX(), r.top + hg * 0.3, darkTextPaint);
  darkTextPaint.textSize = hg * (big ? 0.21 : 0.23);
  canvas.drawText(fitText(t.value, darkTextPaint, r.width() * 0.9, 0.5), r.centerX(), r.top + hg * 0.6, darkTextPaint);
  greyTextPaint.textAlign = Align.CENTER;
  greyTextPaint.textSize = Math.min(hg * 0.145, w * 0.036);
  canvas.drawText(fitText(t.label, greyTextPaint, r.width() * 0.92, 0.7), r.centerX(), r.top + hg * 0.85, greyTextPaint);
}
