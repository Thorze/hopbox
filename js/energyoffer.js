'use strict';
// Plus d'énergie dans l'Aventure : comment en retrouver (équivalent de EnergyOffer.kt).
// - Encadré (fiche du niveau, écran d'échec) : deux cartes côte à côte, « Mode libre » (en gagner en jouant, sans
//   limite jusqu'au plein) et « Boutique » (en acheter avec les pièces).
// - Carte de l'Aventure : deux boutons compacts à la place du total des œufs.

const offerPaint = new Paint(), offerStroke = new Paint({ style: Style.STROKE });
const offerTitle = new Paint({ textAlign: Align.CENTER, bold: true }), offerBody = new Paint({ textAlign: Align.CENTER });
const offerFreePaint = new Paint({ color: Color.parseColor('#3FA83A') });
// « Acheter ⚡ » sur la carte : violet (sur le jaune de la boutique, l'éclair ⚡ jaune ne se voyait plus ; sur l'orange, l'éclair orange de Windows non plus)
const offerBuyPaint = new Paint({ color: Color.parseColor('#7C4DDB') });

/** Hauteur de l'encadré dessiné par drawEnergyOffer. */
function energyOfferHeight() { return w * 0.47; }

/** Va jouer en mode libre (quitte l'Aventure). */
function goEarnEnergy() { closeQuestMap(); }

// « Acheter ⚡ » ouvre directement la fenêtre de recharge (buyEnergy, quest.js) par-dessus l'Aventure :
// on choisit la quantité, on achète, et on reste sur l'écran de l'Aventure.

/** Encadré « Plus d'énergie » à partir de top : une ligne d'en-tête puis les deux cartes. Renvoie le bas. */
function drawEnergyOffer(canvas, top, header) {
  const PC = Color.parseColor;
  offerTitle.textSize = w * 0.036; offerTitle.color = PC('#FFB347');
  canvas.drawText(fitText(header, offerTitle, w * 0.8), w / 2, top + w * 0.035, offerTitle);
  const ct = top + w * 0.065, cb = top + energyOfferHeight();
  // Carte « Mode libre »
  drawOfferCard(canvas, w * 0.1, ct, w * 0.49, cb, '🎮 ' + tr('mode.free'), tr('energy.free_text'),
    tr('energy.free_status'), '#9FE0A0', '▶ ' + tr('quest.play'), offerFreePaint, () => goEarnEnergy());
  // Carte « Boutique »
  drawOfferCard(canvas, w * 0.51, ct, w * 0.9, cb, '🛍️ ' + tr('hud.shop'), tr('energy.shop_text'),
    tr('quest.full_label') + ' ' + fullRefillPrice() + ' 🪙', '#FFE27A', tr('quest.buy') + ' ⚡', shopPaint, () => buyEnergy());
  return cb;
}

function drawOfferCard(canvas, l, t, r, b, title, text, status, statusColor, btn, btnPaint, action) {
  const PC = Color.parseColor, rad = w * 0.035, rc = new RectF(l, t, r, b);
  offerPaint.color = Color.argb(150, 14, 20, 40);
  canvas.drawRoundRect(rc, rad, rad, offerPaint);
  offerStroke.strokeWidth = w * 0.004; offerStroke.color = Color.argb(90, 255, 255, 255);
  canvas.drawRoundRect(rc, rad, rad, offerStroke);
  const cx = (l + r) / 2, cw = r - l - w * 0.04;
  offerTitle.textSize = w * 0.04; offerTitle.color = Color.WHITE;
  canvas.drawText(fitText(title, offerTitle, cw), cx, t + w * 0.06, offerTitle);
  // Texte sur deux ou trois lignes
  offerBody.textSize = w * 0.03; offerBody.color = PC('#D5DDEE');
  wrapText(text, offerBody, cw).slice(0, 3).forEach((line, i) => canvas.drawText(line, cx, t + w * (0.11 + 0.037 * i), offerBody));
  offerTitle.textSize = w * 0.03; offerTitle.color = PC(statusColor);
  canvas.drawText(fitText(status, offerTitle, cw), cx, b - w * 0.13, offerTitle);
  const bh = w * 0.085;
  drawButton(canvas, new RectF(l + w * 0.03, b - bh - w * 0.025, r - w * 0.03, b - w * 0.025), btn, btnPaint, w * 0.04, action);
}

/** Carte de l'Aventure sans énergie : deux boutons « Gagner ⚡ » et « Acheter ⚡ » centrés sur cy. */
function drawEnergyMapButtons(canvas, cy, interactive) {
  // Boutons assez hauts et texte assez gros pour être lus d'un coup d'œil (texte blanc sur vert et sur violet)
  const bh = w * 0.098, c = cy - w * 0.012;
  drawButton(canvas, new RectF(w * 0.05, c - bh / 2, w * 0.49, c + bh / 2), tr('energy.map_free'), offerFreePaint, w * 0.046,
    () => { if (interactive) goEarnEnergy(); });
  drawButton(canvas, new RectF(w * 0.51, c - bh / 2, w * 0.95, c + bh / 2), tr('energy.map_shop'), offerBuyPaint, w * 0.046,
    () => { if (interactive) buyEnergy(); });
}
