'use strict';
/*
 * Réglages → « Zoom en partie » : écran d'aperçu (équivalent de ZoomPicker.kt). Le jeu reste visible (personnage
 * et blocs) et le zoom choisi au curseur, en bas, s'y applique aussitôt. Flèche en haut à gauche = retour aux
 * réglages sans changer ; coche à droite du curseur = valider.
 */

/** Zoom en partie : de ZOOM_MIN à ZOOM_MAX %, par pas de ZOOM_STEP. */
const ZOOM_MIN = 100, ZOOM_MAX = 140, ZOOM_STEP = 5;

/** État de l'écran d'aperçu du zoom (dans les réglages). */
const zoomPick = { open: false, value: 100, drag: false, track: new RectF(), hit: new RectF() };

function openZoomPicker() { zoomPick.open = true; zoomPick.value = profile.gameZoom; zoomPick.drag = false; }
function closeZoomPicker(save) {
  if (save) profile.gameZoom = zoomPick.value;
  zoomPick.open = false; zoomPick.drag = false;
}
/** Zoom à afficher en ce moment pendant l'aperçu, ou -1 si l'aperçu est fermé. */
function zoomPreview() { return state === State.SETTINGS && zoomPick.open ? zoomPick.value / 100 : -1; }

/** Doigt posé : sur le curseur → il suit le doigt. */
function zoomPointerDown(x, y) {
  if (!zoomPick.open || !zoomPick.hit.contains(x, y)) return false;
  zoomPick.drag = true;
  zoomPointerMove(x);
  return true;
}
function zoomPointerMove(x) {
  const z = zoomPick;
  if (!z.drag || z.track.width() <= 0) return;
  const f = clamp((x - z.track.left) / z.track.width(), 0, 1);
  const snapped = Math.round((ZOOM_MIN + f * (ZOOM_MAX - ZOOM_MIN)) / ZOOM_STEP) * ZOOM_STEP;
  if (snapped !== z.value) { z.value = snapped; vibrate(5); }
}
function zoomPointerUp() { zoomPick.drag = false; }

const zpFill = new Paint(), zpLine = new Paint({ style: Style.STROKE }), zpPath = new Path();
const zpText = new Paint({ textAlign: Align.CENTER, bold: true }), zpSmall = new Paint({ textAlign: Align.CENTER });

function drawZoomPicker(canvas) {
  const z = zoomPick;
  // Bandeau du haut : léger voile pour lire le titre sur tous les décors
  const barH = insetTop + w * 0.2;
  zpFill.shader = new LinearGradient(0, 0, 0, barH, Color.argb(150, 10, 18, 48), Color.argb(0, 10, 18, 48));
  canvas.drawRect(0, 0, w, barH, zpFill);
  zpFill.shader = null;
  const cy = insetTop + w * 0.09;
  drawBackButton(canvas, w * 0.1, cy, w * 0.055, () => closeZoomPicker(false));
  drawPanelTitle(canvas, '🔍 ' + tr('settings.zoom_label'), w / 2, cy + w * 0.022, w * 0.66);

  // Panneau du bas : valeur, curseur et coche de validation
  const ph = w * 0.36, bottom = ub() - w * 0.05;
  const pnl = new RectF(w * 0.04, bottom - ph, w * 0.96, bottom);
  drawPanel(canvas, pnl);
  const checkR = w * 0.075, checkCx = pnl.right - w * 0.05 - checkR, checkCy = pnl.centerY() + w * 0.025;
  const l = pnl.left + w * 0.08, r = checkCx - checkR - w * 0.08, trackY = checkCy, th = w * 0.03;
  z.track.set(l, trackY - th / 2, r, trackY + th / 2);
  z.hit.set(pnl.left, pnl.top + w * 0.08, checkCx - checkR - w * 0.02, pnl.bottom);

  // Valeur en gros au-dessus du curseur
  zpText.textSize = w * 0.07; zpText.color = UI.GOLD;
  canvas.drawText(z.value + ' %', (l + r) / 2, pnl.top + w * 0.105, zpText);

  // Piste, partie remplie, graduations, poignée
  const f = (z.value - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  zpFill.color = Color.parseColor('#2A3A6A');
  canvas.drawRoundRect(z.track, th / 2, th / 2, zpFill);
  zpFill.shader = new LinearGradient(l, 0, r, 0, Color.parseColor('#FFB347'), Color.parseColor('#FF7A45'));
  canvas.drawRoundRect(new RectF(l, z.track.top, l + (r - l) * f, z.track.bottom), th / 2, th / 2, zpFill);
  zpFill.shader = null;
  const steps = (ZOOM_MAX - ZOOM_MIN) / ZOOM_STEP;
  zpFill.color = Color.argb(150, 255, 255, 255);
  for (let i = 0; i <= steps; i++) canvas.drawCircle(l + (r - l) * i / steps, trackY + th * 1.6, w * 0.005, zpFill);
  zpSmall.textSize = w * 0.032; zpSmall.color = Color.argb(190, 255, 255, 255);
  canvas.drawText(ZOOM_MIN + ' %', l, trackY + th * 1.6 + w * 0.05, zpSmall);
  canvas.drawText(ZOOM_MAX + ' %', r, trackY + th * 1.6 + w * 0.05, zpSmall);
  const kx = l + (r - l) * f, kr = th * (z.drag ? 1.45 : 1.25);
  zpFill.color = Color.argb(70, 0, 0, 0); canvas.drawCircle(kx, trackY + kr * 0.15, kr, zpFill);
  zpFill.color = Color.WHITE; canvas.drawCircle(kx, trackY, kr, zpFill);
  zpLine.strokeWidth = w * 0.006; zpLine.color = Color.parseColor('#FF7A45');
  canvas.drawCircle(kx, trackY, kr, zpLine);

  drawCheckButton(canvas, checkCx, checkCy, checkR, () => closeZoomPicker(true));
  // Le reste du panneau absorbe les appuis (ajouté après la coche : les boutons sont cherchés dans l'ordre)
  buttons.push({ rect: new RectF(pnl.left, pnl.top, pnl.right, pnl.bottom), action: () => {} });
}

/** Bouton rond vert « valider » (coche), même relief que le bouton retour. */
function drawCheckButton(canvas, cx, cy, r, action) {
  const hit = new RectF(cx - r * 1.25, cy - r * 1.25, cx + r * 1.25, cy + r * 1.25);
  buttons.push({ rect: hit, action });
  const down = isPressed(hit) ? r * 0.12 : 0;
  zpFill.shader = null;
  zpFill.color = Color.parseColor('#1E7A2E'); canvas.drawCircle(cx, cy + r * 0.17, r, zpFill);
  zpFill.shader = new LinearGradient(0, cy + down - r, 0, cy + down + r, Color.parseColor('#7BE07A'), Color.parseColor('#2FA845'));
  canvas.drawCircle(cx, cy + down, r, zpFill);
  zpFill.shader = null;
  zpFill.color = Color.argb(70, 255, 255, 255); canvas.drawCircle(cx, cy + down - r * 0.32, r * 0.56, zpFill);
  zpLine.strokeWidth = r * 0.07; zpLine.color = Color.argb(120, 255, 255, 255); canvas.drawCircle(cx, cy + down, r * 0.96, zpLine);
  zpLine.strokeWidth = r * 0.24; zpLine.color = Color.WHITE; zpLine.strokeCap = 'round'; zpLine.strokeJoin = 'round';
  zpPath.reset();
  zpPath.moveTo(cx - r * 0.42, cy + down + r * 0.02); zpPath.lineTo(cx - r * 0.1, cy + down + r * 0.34); zpPath.lineTo(cx + r * 0.44, cy + down - r * 0.3);
  canvas.drawPath(zpPath, zpLine);
  zpLine.strokeCap = 'butt'; zpLine.strokeJoin = 'miter';
}
