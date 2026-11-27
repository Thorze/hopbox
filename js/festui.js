'use strict';
// Fenêtre des fêtes (équivalent de FestUi.kt) : calendrier de cases, chasse, défis et objets en boutique de chaque
// fête en cours, dans une liste qui défile. Bouton de la fête sous le ☰ de l'accueil (pastille rouge quand une case
// attend), ligne dans le menu ☰, et ouverture automatique une fois par jour (après la récompense quotidienne).

let festReturnState = null, festOpenT = 0, festCheckedDay = -1, festMsg = '', festMsgT = 0, festPop = null;
/** Prochains feux d'artifice entendus (temps du jeu ; 0 = pas encore réglé). */
let festFireAt = 0;
/** Prochaine vérification du décor d'hiver (musiques d'hiver dans la playlist). */
let festWinterAt = 0;
const festList = new ScrollList(true, true);
const festPaint = new Paint(), festText = new Paint({ textAlign: Align.CENTER, color: Color.WHITE, bold: true });
const festStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });

function festTitle(f) { return tr('fest.' + f.key + '.title'); }
function festIcon(f) { return FEST_ICONS[f.key] || '🎉'; }
/** « 24 décembre » dans la langue du jeu. */
function festDateLabel(day) {
  try { return new Date(day * 86400000).toLocaleDateString(I18n.lang, { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) { return ''; }
}
function festGoal(ch) { return tr('fest.goal.' + ch.type, { n: ch.target }); }

/** Son d'ouverture de la fenêtre, selon la fête (comme festOpenSound dans FestUi.kt). */
const FEST_OPEN_SOUNDS = { noel: 'SLEIGH_BELLS', halloween: 'WITCH_LAUGH', lunaire: 'LUNAR_GONG' };

function openFest() {
  if (state === State.FEST) return;
  festReturnState = state === State.GAME_OVER ? State.GAME_OVER : State.READY;
  festList.reset(); festOpenT = time; festMsg = ''; festMsgT = 0; festPop = null;
  state = State.FEST;
  const snd = FEST_OPEN_SOUNDS[(Fest.main() || {}).key];
  if (snd) sounds.play(snd);
  for (const f of Fest.visible()) {
    if (!Fest.seen(f)) { Fest.markSeen(f); Telemetry.track('fest', { id: f.id, what: 'seen' }); }
  }
}
function closeFest() { state = festReturnState; }

/**
 * À l'accueil, une fois par jour : la fenêtre s'ouvre seule si une fête vient de commencer ou si la case du jour
 * attend. Mêmes conditions que la récompense quotidienne, et après elle (checkDaily passe en premier).
 */
function checkFest() {
  Fest.refresh();
  if (time >= festWinterAt) { festWinterAt = time + 5; sounds.winter = Fest.themes().includes('hiver'); }
  if (state !== State.READY || jumps !== 0 || score !== 0 || time < 1.2 || quest.active || duel.active || menu.open) return;
  if (tuto.active || pseudoDialogShown || Stats.get('games') < 1) return;
  const today = Fest.today();
  if (festCheckedDay === today) return;
  festCheckedDay = today;
  if (Fest.visible(today).some((f) => !Fest.seen(f) || Fest.cellWaiting(f, today, false))) openFest();
}

/** Bouton de la fête à l'accueil, sous le ☰ (centre cx, cy, côté s). */
function drawFestButton(canvas, cx, cy, s) {
  const f = Fest.main();
  if (!f) return;
  const face = new RectF(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2);
  drawGlassSquare(canvas, face);
  const down = isPressed(face) ? w * 0.009 : 0, wob = Fest.badge() ? Math.sin(time * 7) * Math.max(0, Math.sin(time * 1.7)) * 8 : 0;
  canvas.save(); canvas.rotate(wob, face.centerX(), face.centerY() + down);
  festEmojiPaint.textSize = s * 0.6;
  canvas.drawText(festIcon(f), face.centerX(), face.centerY() + down + s * 0.21, festEmojiPaint);
  canvas.restore();
  if (Fest.badge()) drawRedDot(canvas, face.right - s * 0.06, face.top + s * 0.06, w * 0.02);
  buttons.push({ rect: new RectF(face.left - w * 0.02, face.top - w * 0.015, face.right + w * 0.02, face.bottom + w * 0.015), action: () => openFest() });
}

/** Récompense (pièces ou objet) centrée en (cx, cy), dans un carré de côté size. */
function drawFestReward(canvas, r, cx, cy, size, dim = false) {
  if (!r) return;
  const item = r.item ? Fest.item(r.item) : null;
  if (item) { drawThumb(canvas, item, cx, cy, size, dim); return; }
  festEmojiPaint.textSize = size * 0.42; festEmojiPaint.alpha = dim ? 120 : 255;
  canvas.drawText('🪙', cx, cy + size * 0.02, festEmojiPaint);
  festEmojiPaint.alpha = 255;
  festText.color = dim ? UI.DIM : UI.GOLD; festText.textSize = size * 0.26;
  canvas.drawText(String(r.coins), cx, cy + size * 0.38, festText);
  festText.color = Color.WHITE;
}

function festToast(text) { festMsg = text; festMsgT = 2.6; }

function festTapCell(f, i) {
  const st = Fest.cellState(f, i), day = f.start + i;
  if (st === 'ready' || st === 'catch') {
    const got = Fest.openCell(f, i);
    festPop = { id: f.id, i, t: time };
    if (got) festToast(got.item ? tr('fest.banner.item', { name: got.item.label }) : `+${got.coins} 🪙`);
    return;
  }
  sounds.play('CLICK', 0.6);
  if (st === 'future') festToast(tr('fest.cell.future', { d: festDateLabel(day) }));
  else if (st === 'challenge') festToast(festGoal(f.calendar[i].challenge));
  else if (st === 'missed') festToast(tr('fest.cell.missed'));
}

function drawFest(canvas) {
  if (festMsgT > 0) festMsgT -= 1 / 60;
  const fests = Fest.visible();
  if (!fests.length) { closeFest(); return; }
  const today = Fest.today();
  const left = w * 0.04, right = w * 0.96, top = insetTop + w * 0.04, bottom = ub() - w * 0.04;
  const q = clamp((time - festOpenT) / 0.3, 0, 1), sc = 0.9 + 0.1 * (1 - (1 - q) * (1 - q));
  canvas.drawRect(0, 0, w, h, overlayPaint);
  canvas.save(); canvas.scale(sc, sc, w / 2, (top + bottom) / 2);
  const main = fests.length === 1 ? fests[0] : null;
  drawPanel(canvas, new RectF(left, top, right, bottom), main ? festIcon(main) + ' ' + festTitle(main) : '🎉 ' + tr('fest.title'));
  const inL = left + w * 0.045, inR = right - w * 0.045, gap = w * 0.022;
  festList.top = top + panelHeaderH() + w * 0.01; festList.bottom = bottom - w * 0.18;
  const sTop = festList.top, scroll = festList.scroll;
  const items = [];
  /** Bouton dans la liste : rectangle en coordonnées du contenu, rogné à la partie visible. */
  const hit = (l, t, r, b, action) => {
    const tt = Math.max(t - scroll, festList.top), bb = Math.min(b - scroll, festList.bottom);
    if (bb > tt) items.push({ rect: new RectF(l, tt, r, bb), action });
  };
  canvas.save();
  canvas.clipRect(left, festList.top, right, festList.bottom);
  canvas.translate(0, -scroll);
  let y = sTop + w * 0.015;
  festText.textAlign = Align.LEFT;
  for (const f of fests) {
    // En-tête de la fête (si plusieurs) et date de fin
    if (!main) {
      festText.textAlign = Align.LEFT; festText.textSize = w * 0.05; festText.color = Color.WHITE;
      canvas.drawText(fitText(festIcon(f) + ' ' + festTitle(f), festText, inR - inL), inL, y + w * 0.05, festText);
      y += w * 0.07;
    }
    greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = w * 0.034;
    const lines = wrapText(tr('fest.' + f.key + '.intro'), greyTextPaint, inR - inL);
    for (const ln of lines) { canvas.drawText(ln, inL, y + w * 0.04, greyTextPaint); y += w * 0.046; }
    greyTextPaint.color = UI.GOLD;
    canvas.drawText(tr('fest.until', { d: festDateLabel(today > f.end ? f.until : f.end) }), inL, y + w * 0.042, greyTextPaint);
    greyTextPaint.color = UI.SOFT;
    y += w * 0.07;
    // Calendrier
    if (f.calendar.length) {
      const n = f.calendar.length, cols = n > 12 ? 6 : Math.min(n, 4), cw = (inR - inL - gap * (cols - 1)) / cols, ch = cw * 1.12;
      for (let i = 0; i < n; i++) {
        const col = i % cols, row = Math.floor(i / cols), rowCount = Math.min(cols, n - row * cols);
        const x0 = inL + col * (cw + gap) + (cols - rowCount) * (cw + gap) / 2, y0 = y + row * (ch + gap);
        const st = Fest.cellState(f, i, today), cell = f.calendar[i], r = new RectF(x0, y0, x0 + cw, y0 + ch);
        const pop = festPop && festPop.id === f.id && festPop.i === i ? clamp((time - festPop.t) / 0.45, 0, 1) : 1;
        const s = 1 + 0.25 * Math.sin(Math.PI * pop) * (1 - pop);
        canvas.save(); canvas.scale(s, s, r.centerX(), r.centerY());
        const ready = st === 'ready' || st === 'catch';
        drawCard(canvas, r.left, r.top, r.right, r.bottom, st === 'open' ? 'done' : st === 'ready' || st === 'challenge' ? 'warm' : st === 'catch' ? '' : 'deep', w * 0.025);
        if (st === 'ready') {
          festStroke.color = Color.parseColor('#FFB04A'); festStroke.strokeWidth = w * (0.006 + 0.004 * Math.abs(Math.sin(time * 4)));
          canvas.drawRoundRect(r, w * 0.025, w * 0.025, festStroke);
        }
        // N° du jour en haut à gauche
        festText.textAlign = Align.LEFT; festText.textSize = cw * 0.24; festText.color = st === 'open' ? UI.GREEN : st === 'future' || st === 'missed' ? UI.DIM : Color.WHITE;
        canvas.drawText(String(new Date((f.start + i) * 86400000).getUTCDate()), r.left + cw * 0.09, r.top + cw * 0.28, festText);
        festText.textAlign = Align.CENTER; festText.color = Color.WHITE;
        const ccx = r.centerX(), ccy = r.top + ch * 0.6;
        if (st === 'open') drawFestReward(canvas, cell.reward, ccx, ccy - cw * 0.04, cw * 0.62);
        else if (cell.reward.item && (st === 'future' || st === 'challenge')) {
          // Gros cadeau visible d'avance
          drawFestReward(canvas, cell.reward, ccx, ccy - cw * 0.02, cw * 0.56, true);
          if (st === 'challenge') {
            festText.textSize = cw * 0.2; festText.color = UI.GOLD;
            canvas.drawText(Math.min(Fest.progress(f, 'c' + i), cell.challenge.target) + '/' + cell.challenge.target, ccx, r.bottom - cw * 0.06, festText);
            festText.color = Color.WHITE;
          }
        } else {
          const wig = ready ? Math.sin(time * 8 + i) * Math.max(0, Math.sin(time * 2 + i * 0.7)) * 9 : 0;
          canvas.save(); canvas.rotate(wig, ccx, ccy);
          festEmojiPaint.textSize = cw * 0.5; festEmojiPaint.alpha = ready ? 255 : st === 'missed' ? 70 : 130;
          canvas.drawText(cell.challenge ? '🎯' : '🎁', ccx, ccy + cw * 0.17, festEmojiPaint);
          festEmojiPaint.alpha = 255;
          canvas.restore();
          if (st === 'catch') { festText.textSize = cw * 0.2; festText.color = UI.BLUE; canvas.drawText('↺', r.right - cw * 0.16, r.top + cw * 0.26, festText); festText.color = Color.WHITE; }
        }
        canvas.restore();
        hit(r.left, r.top, r.right, r.bottom, () => festTapCell(f, i));
      }
      y += Math.ceil(n / cols) * (ch + gap) + w * 0.01;
      // Défis des cases (case du 24…)
      f.calendar.forEach((c, i) => {
        if (!c.challenge || Fest.cellState(f, i, today) === 'open') return;
        y = drawFestChallengeRow(canvas, inL, inR, y, tr('fest.cell_goal', { d: festDateLabel(f.start + i) }), c.challenge,
          Fest.progress(f, 'c' + i), c.reward, false) + gap;
      });
      if (today > f.start) {
        greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.03;
        canvas.drawText(fitText(tr('fest.cell.catch_hint'), greyTextPaint, inR - inL), (inL + inR) / 2, y + w * 0.035, greyTextPaint);
        y += w * 0.06;
      }
    }
    // Chasse
    if (f.hunt) {
      const found = Fest.found(f), steps = f.hunt.steps, last = steps[steps.length - 1].n, live = today <= f.end;
      const nextStep = steps.find((s) => s.n > found), chipW = Math.min((inR - inL - w * 0.04) / steps.length, w * 0.2), cardH = w * 0.2 + chipW * 1.05;
      drawCard(canvas, inL, y, inR, y + cardH, found >= last ? 'done' : '', w * 0.03);
      festEmojiPaint.textSize = w * 0.07;
      canvas.drawText(FEST_THINGS[f.hunt.thing] || '🎁', inL + w * 0.07, y + w * 0.085, festEmojiPaint);
      festText.textAlign = Align.LEFT; festText.textSize = w * 0.042;
      canvas.drawText(fitText(tr('fest.thing.' + f.hunt.thing), festText, inR - inL - w * 0.34), inL + w * 0.13, y + w * 0.065, festText);
      festText.textAlign = Align.RIGHT; festText.color = UI.GOLD;
      canvas.drawText(Math.min(found, last) + ' / ' + last, inR - w * 0.035, y + w * 0.065, festText);
      festText.color = Color.WHITE; festText.textAlign = Align.CENTER;
      greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = w * 0.029;
      canvas.drawText(fitText(found >= last ? tr('fest.done') : live ? tr('fest.hunt.hint') : tr('fest.over'), greyTextPaint, inR - inL - w * 0.2), inL + w * 0.13, y + w * 0.11, greyTextPaint);
      // Barre jusqu'au prochain palier
      const prev = steps.filter((s) => s.n <= found).reduce((m, s) => Math.max(m, s.n), 0);
      const fr = nextStep ? clamp((found - prev) / (nextStep.n - prev), 0, 1) : 1, bl = inL + w * 0.04, br = inR - w * 0.04, by = y + w * 0.145;
      festPaint.shader = null; festPaint.color = Color.argb(170, 8, 12, 30); rect.set(bl, by, br, by + w * 0.022); canvas.drawRoundRect(rect, w * 0.011, w * 0.011, festPaint);
      festPaint.color = UI.GOLD; rect.set(bl, by, bl + (br - bl) * fr, by + w * 0.022); if (fr > 0) canvas.drawRoundRect(rect, w * 0.011, w * 0.011, festPaint);
      // Paliers et leurs récompenses
      const rowW = chipW * steps.length, cx0 = (inL + inR) / 2 - rowW / 2;
      steps.forEach((s, j) => {
        const cx = cx0 + chipW * (j + 0.5), cy = y + w * 0.2 + chipW * 0.38, got = found >= s.n;
        drawFestReward(canvas, s.reward, cx, cy, chipW * 0.7, !got);
        festText.textSize = w * 0.03; festText.color = got ? UI.GREEN : UI.SOFT;
        canvas.drawText((got ? '✓ ' : '') + s.n, cx, y + w * 0.2 + chipW * 0.98, festText);
        festText.color = Color.WHITE;
      });
      y += cardH + gap;
    }
    // Défis
    f.challenges.forEach((ch, i) => {
      const label = ch.from > f.start ? tr('fest.from', { d: festDateLabel(ch.from) }) : tr('fest.challenge');
      y = drawFestChallengeRow(canvas, inL, inR, y, label, ch, Fest.progress(f, 'x' + i), ch.reward, Fest.challengeDone(f, i)) + gap;
    });
    // Objets en boutique pour un temps
    const shop = f.shop.map((key) => Fest.item(key)).filter(Boolean);
    if (shop.length) {
      greyTextPaint.textAlign = Align.LEFT; greyTextPaint.textSize = w * 0.034; greyTextPaint.color = UI.GOLD;
      canvas.drawText('🛍️ ' + tr('fest.shop', { d: festDateLabel(f.until) }), inL, y + w * 0.04, greyTextPaint);
      greyTextPaint.color = UI.SOFT;
      y += w * 0.065;
      const cw = (inR - inL - gap * 2) / 3, chh = cw * 1.1;
      shop.forEach((it, j) => {
        const x0 = inL + (j % 3) * (cw + gap), y0 = y + Math.floor(j / 3) * (chh + gap), owned = profile.available(it);
        drawCard(canvas, x0, y0, x0 + cw, y0 + chh, owned ? 'done' : '', w * 0.025);
        drawThumb(canvas, it, x0 + cw / 2, y0 + chh * 0.4, cw * 0.62, false);
        festText.textSize = w * 0.028; festText.color = owned ? UI.GREEN : UI.GOLD;
        canvas.drawText(owned ? '✓' : '🪙 ' + it.price, x0 + cw / 2, y0 + chh * 0.88, festText);
        festText.color = Color.WHITE;
        hit(x0, y0, x0 + cw, y0 + chh, () => { if (!owned) { closeFest(); openShopAt(it); } });
      });
      y += Math.ceil(shop.length / 3) * (chh + gap);
    }
    y += w * 0.04;
  }
  greyTextPaint.textAlign = Align.CENTER; greyTextPaint.textSize = w * 0.03;
  canvas.drawText(fitText(tr('fest.free_only'), greyTextPaint, inR - inL), (inL + inR) / 2, y + w * 0.02, greyTextPaint);
  y += w * 0.05;
  festText.textAlign = Align.CENTER;
  canvas.restore();
  festList.content(festList.top, festList.bottom, y - sTop);
  festList.drawBar(canvas, festPaint, right - w * 0.015);
  canvas.restore();
  // Message, bouton OK ; les boutons de la liste passent avant le fond
  if (festMsgT > 0 && festMsg) {
    textPaint.textSize = w * 0.04; textPaint.alpha = clamp(Math.floor(255 * festMsgT / 0.4), 0, 255);
    canvas.drawText(fitText(festMsg, textPaint, w * 0.86), w / 2, bottom - w * 0.155, textPaint);
    textPaint.alpha = 255;
  }
  buttons.push(...items);
  drawButton(canvas, new RectF(w * 0.3, bottom - w * 0.14, w * 0.7, bottom - w * 0.04), 'OK', backBtnPaint, w * 0.05, () => closeFest());
}

/** Ligne d'un défi : intitulé, objectif, progression et récompense. Renvoie le bas de la ligne. */
function drawFestChallengeRow(canvas, inL, inR, y, label, ch, progress, reward, done) {
  const rh = w * 0.2;
  drawCard(canvas, inL, y, inR, y + rh, done ? 'done' : '', w * 0.03);
  drawFestReward(canvas, reward, inR - rh * 0.5, y + rh * 0.48, rh * 0.75, !done);
  const tw = inR - inL - rh * 1.15;
  festText.textAlign = Align.LEFT; festText.textSize = w * 0.03; festText.color = UI.GOLD;
  canvas.drawText(fitText('🎯 ' + label, festText, tw), inL + w * 0.035, y + rh * 0.27, festText);
  festText.color = Color.WHITE; festText.textSize = w * 0.038;
  canvas.drawText(fitText(festGoal(ch), festText, tw), inL + w * 0.035, y + rh * 0.53, festText);
  const f = done ? 1 : clamp(progress / ch.target, 0, 1), bl = inL + w * 0.035, br = bl + tw - w * 0.1, by = y + rh * 0.7;
  festPaint.shader = null; festPaint.color = Color.argb(170, 8, 12, 30); rect.set(bl, by, br, by + w * 0.02); canvas.drawRoundRect(rect, w * 0.01, w * 0.01, festPaint);
  festPaint.color = done ? UI.GREEN : UI.GOLD; rect.set(bl, by, bl + (br - bl) * f, by + w * 0.02); if (f > 0) canvas.drawRoundRect(rect, w * 0.01, w * 0.01, festPaint);
  festText.textSize = w * 0.028; festText.color = done ? UI.GREEN : UI.SOFT;
  canvas.drawText(done ? '✓' : Math.min(progress, ch.target) + '/' + ch.target, br + w * 0.015, by + w * 0.02, festText);
  festText.color = Color.WHITE; festText.textAlign = Align.CENTER;
  return y + rh;
}
