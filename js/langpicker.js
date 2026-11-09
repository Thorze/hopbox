'use strict';
// Choix de la langue : grille défilante de cartes avec le drapeau (dessiné, pour être le même partout)
// et le nom de la langue ; la première carte = « Auto » (langue du navigateur). Équivalent de LangPicker.kt.

let langPicker = false;
const flagPaint = new Paint();
const flagStroke = new Paint({ style: Style.STROKE });
const flagClip = new Path();

function openLangPicker() { langPicker = true; progScroll = 0; }

/** Rectangle aux coins arrondis dans un Path. */
function roundRectPath(p, r, rad) {
  p.reset();
  p.moveTo(r.left + rad, r.top); p.lineTo(r.right - rad, r.top); p.quadTo(r.right, r.top, r.right, r.top + rad);
  p.lineTo(r.right, r.bottom - rad); p.quadTo(r.right, r.bottom, r.right - rad, r.bottom);
  p.lineTo(r.left + rad, r.bottom); p.quadTo(r.left, r.bottom, r.left, r.bottom - rad);
  p.lineTo(r.left, r.top + rad); p.quadTo(r.left, r.top, r.left + rad, r.top); p.close();
}

/** Drapeau du pays de la langue code, dans r (coins arrondis). */
function drawFlag(canvas, code, r) {
  const fw = r.width(), fh = r.height(), L = r.left, T = r.top, R = r.right, B = r.bottom;
  canvas.save();
  roundRectPath(flagClip, r, fh * 0.12);
  canvas.clipPath(flagClip);
  const band = (c, l, t, rr, b) => { flagPaint.color = Color.parseColor(c); canvas.drawRect(l, t, rr, b, flagPaint); };
  if (code === 'fr') { band('#0055A4', L, T, L + fw / 3, B); band('#FFFFFF', L + fw / 3, T, L + fw * 2 / 3, B); band('#EF4135', L + fw * 2 / 3, T, R, B); }
  else if (code === 'it') { band('#009246', L, T, L + fw / 3, B); band('#FFFFFF', L + fw / 3, T, L + fw * 2 / 3, B); band('#CE2B37', L + fw * 2 / 3, T, R, B); }
  else if (code === 'de') { band('#000000', L, T, R, T + fh / 3); band('#DD0000', L, T + fh / 3, R, T + fh * 2 / 3); band('#FFCE00', L, T + fh * 2 / 3, R, B); }
  else if (code === 'es') { band('#AA151B', L, T, R, B); band('#F1BF00', L, T + fh / 4, R, B - fh / 4); }
  else if (code === 'pt') {
    band('#006600', L, T, L + fw * 0.4, B); band('#FF0000', L + fw * 0.4, T, R, B);
    const cx = L + fw * 0.4, cy = r.centerY();
    flagStroke.color = Color.parseColor('#FFE000'); flagStroke.strokeWidth = fh * 0.07;
    canvas.drawCircle(cx, cy, fh * 0.24, flagStroke);
    band('#FFFFFF', cx - fh * 0.12, cy - fh * 0.14, cx + fh * 0.12, cy + fh * 0.12);
    flagStroke.color = Color.parseColor('#FF0000'); flagStroke.strokeWidth = fh * 0.04;
    canvas.drawRect(cx - fh * 0.12, cy - fh * 0.14, cx + fh * 0.12, cy + fh * 0.12, flagStroke);
    band('#003399', cx - fh * 0.04, cy - fh * 0.06, cx + fh * 0.04, cy + fh * 0.04);
  } else if (code === 'en') {
    band('#012169', L, T, R, B);
    flagStroke.color = Color.WHITE; flagStroke.strokeWidth = fh * 0.2;
    canvas.drawLine(L, T, R, B, flagStroke); canvas.drawLine(L, B, R, T, flagStroke);
    flagStroke.color = Color.parseColor('#C8102E'); flagStroke.strokeWidth = fh * 0.07;
    canvas.drawLine(L, T, R, B, flagStroke); canvas.drawLine(L, B, R, T, flagStroke);
    band('#FFFFFF', L, r.centerY() - fh / 6, R, r.centerY() + fh / 6);
    band('#FFFFFF', r.centerX() - fh / 6, T, r.centerX() + fh / 6, B);
    band('#C8102E', L, r.centerY() - fh / 10, R, r.centerY() + fh / 10);
    band('#C8102E', r.centerX() - fh / 10, T, r.centerX() + fh / 10, B);
  } else band('#9AA3B8', L, T, R, B);
  canvas.restore();
  flagStroke.color = Color.argb(50, 0, 0, 0); flagStroke.strokeWidth = w * 0.004;
  canvas.drawRoundRect(r, fh * 0.12, fh * 0.12, flagStroke);
}

/** Grille des langues, par-dessus les réglages : glisser = défiler, toucher = choisir. */
function drawLangPicker(canvas) {
  buttons = [];
  canvas.drawRect(0, 0, w, h, overlayPaint);
  const PC = Color.parseColor, choices = [LANG_AUTO, ...LANGUAGES], cols = 3, gap = w * 0.03;
  const cardW = (w * 0.84 - (cols - 1) * gap) / cols, cardH = cardW;
  const rows = Math.ceil(choices.length / cols), content = rows * (cardH + gap) - gap;
  // Le panneau prend la taille de la grille ; il ne défile que s'il y a trop de langues pour l'écran
  const top0 = insetTop + w * 0.1, maxBottom = ub() - w * 0.06;
  const gridH = Math.min(content, maxBottom - top0 - w * 0.36);
  const top = top0 + (maxBottom - top0 - (gridH + w * 0.36)) / 2, bottom = top + gridH + w * 0.36;
  rect.set(w * 0.04, top, w * 0.96, bottom);
  drawPanel(canvas, rect, '🌐 ' + tr('settings.language_label'), () => { langPicker = false; });
  darkTextPaint.textAlign = Align.CENTER;

  const gridTop = top + w * 0.17, gridBottom = bottom - w * 0.19;
  progGridTop = gridTop; progGridBottom = gridBottom;
  progMaxScroll = Math.max(0, content - (gridBottom - gridTop));
  progScroll = clamp(progScroll, 0, progMaxScroll);
  const pad = w * 0.012;
  canvas.save();
  canvas.clipRect(0, gridTop - pad, w, gridBottom + pad);
  choices.forEach((code, i) => {
    const x0 = w * 0.08 + (i % cols) * (cardW + gap), y0 = gridTop + Math.floor(i / cols) * (cardH + gap) - progScroll;
    if (y0 + cardH < gridTop - pad || y0 > gridBottom + pad) return;
    const r = new RectF(x0, y0, x0 + cardW, y0 + cardH), selected = profile.language === code, rad = w * 0.035;
    flagPaint.color = PC('#D5DAE3');
    rect.set(r.left, r.top + w * 0.01, r.right, r.bottom + w * 0.01); canvas.drawRoundRect(rect, rad, rad, flagPaint);
    flagPaint.color = PC(selected ? '#FFE9DD' : '#EEF1F6'); canvas.drawRoundRect(r, rad, rad, flagPaint);
    if (selected) { flagStroke.color = PC('#FF7A45'); flagStroke.strokeWidth = w * 0.008; canvas.drawRoundRect(r, rad, rad, flagStroke); }
    const fw = cardW * 0.72, fh = fw * 0.66;
    const fr = new RectF(r.centerX() - fw / 2, r.top + cardH * 0.13, r.centerX() + fw / 2, r.top + cardH * 0.13 + fh);
    if (code === LANG_AUTO) {
      flagPaint.color = PC('#CFE6FA'); canvas.drawRoundRect(fr, fh * 0.12, fh * 0.12, flagPaint);
      progText.textSize = fh * 0.72; progText.color = Color.WHITE;
      canvas.drawText('🌐', fr.centerX(), fr.centerY() + fh * 0.26, progText);
    } else drawFlag(canvas, code, fr);
    darkTextPaint.textSize = w * 0.034;
    const name = code === LANG_AUTO ? tr('settings.language_auto', { v: I18n.nameOf(I18n.resolve(LANG_AUTO)) }) : I18n.nameOf(code);
    canvas.drawText(fitText(name, darkTextPaint, cardW - w * 0.03), r.centerX(), r.bottom - cardH * 0.12, darkTextPaint);
    const hit = new RectF(r.left, Math.max(r.top, gridTop), r.right, Math.min(r.bottom, gridBottom));
    if (hit.height() > 0) buttons.push({ rect: hit, action: () => { profile.language = code; I18n.use(code); langPicker = false; } });
  });
  canvas.restore();
  if (progMaxScroll > 0) {
    const trackH = gridBottom - gridTop, thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + progMaxScroll));
    const ty0 = gridTop + (trackH - thumbH) * (progScroll / progMaxScroll);
    rect.set(w * 0.935, ty0, w * 0.945, ty0 + thumbH); canvas.drawRoundRect(rect, w * 0.005, w * 0.005, lockedPaint);
  }
  const bh = w * 0.11;
  drawButton(canvas, new RectF(w * 0.3, bottom - bh - w * 0.05, w * 0.7, bottom - w * 0.05), tr('common.back'), backBtnPaint, w * 0.048, () => { langPicker = false; });
  buttons.push({ rect: new RectF(0, 0, w, h), action: () => {} });
}
