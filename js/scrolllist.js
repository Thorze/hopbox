'use strict';
// Liste qui défile au doigt (équivalent de ScrollList.kt et Scrolling.kt), la même pour toutes les fenêtres :
// boutique, classement, stats, réglages, duels, chapitres, choix de la langue, menu de test.
// - le doigt doit bouger d'un petit seuil avant que la liste parte, et elle part de cet endroit, sans à-coup ;
// - la vitesse du lâcher est mesurée sur les dernières 100 ms, puis la liste continue sur son élan et ralentit ;
// - poser le doigt sur une liste lancée l'arrête, sans appuyer sur le bouton dessous ;
// - un toucher sans glisser appuie sur le bouton visé (si clicks) ; la molette glisse en douceur.
//
// Nouvelle fenêtre qui défile : un ScrollList, ajouté à scrollLists() et à scrollTarget() ci-dessous.
// Au dessin : list.content(top, bottom, hauteurDuContenu), les lignes à top + position - list.scroll,
// puis list.drawBar(canvas, paint, bordDroit). Le toucher, l'élan, la molette et le clic sont gérés tout seuls.

const SCROLL_SLOP = 0.02, SCROLL_FRICTION = 3.2, SCROLL_MAX_FLING = 7;

class ScrollList {
  /** clicks : un toucher sans glisser appuie sur le bouton ; always : prend le doigt même si tout tient à l'écran. */
  constructor(clicks = true, always = false) {
    this.clicks = clicks; this.always = always;
    this.scroll = 0; this.maxScroll = 0; this.top = 0; this.bottom = 0;
    this.dragY = -1; this.downX = 0; this.downY = 0; this.moved = false; this.vel = 0; this.wheel = 0;
    this._anchorY = 0; this._anchorScroll = 0; this._blockTap = false; this._unit = 1; this._samples = [];
  }
  get held() { return this.dragY >= 0; }
  get moving() { return this.held || this.vel !== 0 || this.wheel !== 0; }

  /** Au dessin : zone visible et hauteur du contenu. */
  content(top, bottom, height) {
    this.top = top; this.bottom = bottom;
    this.maxScroll = Math.max(0, height - (bottom - top));
    this.scroll = clamp(this.scroll, 0, this.maxScroll);
  }
  reset() { this.scroll = 0; this.stop(); }
  stop() { this.vel = 0; this.wheel = 0; this.dragY = -1; this.moved = false; }

  down(x, y, t, unit) {
    if (y < this.top || y > this.bottom || (!this.always && this.maxScroll <= 0)) return false;
    this._unit = unit;
    this._blockTap = Math.abs(this.vel) > unit * 0.3;
    this.vel = 0; this.wheel = 0;
    this.dragY = y; this.downX = x; this.downY = y; this.moved = false;
    this._samples = [[y, t]];
    return true;
  }
  move(y, t) {
    if (!this.held) return;
    if (!this.moved) {
      if (Math.abs(y - this.downY) <= this._unit * SCROLL_SLOP) return;
      // Départ du glissé à partir d'ici : la liste ne saute pas de la longueur du seuil
      this.moved = true; this._anchorY = y; this._anchorScroll = this.scroll; this._samples = [];
    }
    this.dragY = y;
    this.scroll = clamp(this._anchorScroll - (y - this._anchorY), 0, this.maxScroll);
    this._samples.push([y, t]);
    if (this._samples.length > 8) this._samples.shift();
  }
  /** Doigt levé : true si c'était un toucher (appuyer sur le bouton en downX, downY). */
  up(t, tap = true) {
    if (!this.held) return false;
    const tapped = tap && this.clicks && !this.moved && !this._blockTap;
    this.vel = this.moved ? this._releaseVelocity(t) : 0;
    this.dragY = -1;
    return tapped;
  }
  /** Molette : la liste glisse en douceur vers son but au lieu de sauter. */
  wheelBy(d) {
    this.vel = 0;
    this.wheel = clamp(this.wheel + d, -this.scroll, this.maxScroll - this.scroll);
  }
  update(dt) {
    if (this.held) return;
    if (this.wheel !== 0) {
      const step = this.wheel * Math.min(1, dt * 14);
      this.scroll = clamp(this.scroll + step, 0, this.maxScroll);
      this.wheel -= step;
      if (Math.abs(this.wheel) < 0.5 || this.scroll <= 0 || this.scroll >= this.maxScroll) this.wheel = 0;
    }
    if (this.vel === 0) return;
    this.scroll += this.vel * dt;
    if (this.scroll <= 0 || this.scroll >= this.maxScroll) this.vel = 0;
    this.scroll = clamp(this.scroll, 0, this.maxScroll);
    this.vel *= Math.exp(-SCROLL_FRICTION * dt);
    if (Math.abs(this.vel) < this._unit * 0.05) this.vel = 0;
  }
  /** Barre de défilement fine, bord droit en right. */
  drawBar(canvas, paint, right) {
    if (this.maxScroll <= 0) return;
    const trackH = this.bottom - this.top;
    const thumbH = Math.max(w * 0.06, trackH * trackH / (trackH + this.maxScroll));
    const ty = this.top + (trackH - thumbH) * (this.scroll / this.maxScroll);
    paint.shader = null; paint.color = Color.argb(90, 255, 255, 255);
    canvas.drawRoundRect(new RectF(right - w * 0.01, ty, right, ty + thumbH), w * 0.005, w * 0.005, paint);
  }
  /** Vitesse du doigt sur les dernières 100 ms (0 s'il s'est arrêté avant de lâcher). */
  _releaseVelocity(t) {
    const s = this._samples;
    if (s.length < 2) return 0;
    const last = s[s.length - 1];
    if (t - last[1] > 80) return 0;
    let first = s.length - 1;
    while (first > 0 && last[1] - s[first - 1][1] <= 100) first--;
    const dms = last[1] - s[first][1];
    if (dms <= 0) return 0;
    const v = -(last[0] - s[first][0]) * 1000 / dms;
    return clamp(v, -this._unit * SCROLL_MAX_FLING, this._unit * SCROLL_MAX_FLING);
  }
}

// ---------- Listes de l'écran (classement, stats, boutique et choix de la langue) ----------
const boardList = new ScrollList(false, true);
const statsList = new ScrollList(false, true);
const progList = new ScrollList(true, true);

/** Toutes les listes qui défilent ; une nouvelle fenêtre qui défile s'ajoute ici et dans scrollTarget(). */
function scrollLists() { return [progList, statsList, boardList, duels, chList, settingsView, test]; }

/** Liste qui défile dans l'écran affiché (null : aucune). */
function scrollTarget() {
  switch (state) {
    case State.CUSTOMIZE: return !buyItem && !buyTint ? progList : null;
    case State.SETTINGS:
      if (test.open) return test;
      if (langPicker) return progList;
      return settingsView.account || zoomPick.open ? null : settingsView;
    case State.STATS: return statsList;
    case State.LEADERBOARD: return boardList;
    case State.DUELS: return !duels.challenge && !duels.vs ? duels : null;
    case State.QUEST_MAP: return quest.chapters ? chList : null;
    default: return null;
  }
}

/** Doigt posé : true si la liste de l'écran le prend. Les réglages ont leur propre entrée (curseurs de volume). */
function scrollPointerDown(x, y) {
  const l = scrollTarget();
  if (!l || l === settingsView) return false;
  return l.down(x, y, performance.now(), w);
}
function scrollPointerMove(x, y) {
  const l = scrollTarget();
  if (!l) return;
  if (l === settingsView) settingsPointerMove(x, y); else l.move(y, performance.now());
}
/** Doigt levé : élan, ou toucher sur le bouton visé. */
function scrollPointerUp(x) {
  const target = scrollTarget(), t = performance.now();
  for (const l of scrollLists()) {
    if (!l.held) continue;
    if (l === settingsView) { settingsPointerUp(x); continue; }
    if (l.up(t) && l === target) clickAt(l.downX, l.downY);
  }
}
/** Molette (ordinateur) : true si une liste l'a prise. */
function scrollWheel(d) {
  const l = scrollTarget();
  if (!l) return false;
  l.wheelBy(d);
  return true;
}
/** Élan de la liste affichée ; les autres s'arrêtent. */
function updateScrolls(dt) {
  const target = scrollTarget();
  for (const l of scrollLists()) { if (l === target) l.update(dt); else if (l.moving) l.stop(); }
  if (!chListActive()) chList.shown = -1;
}
/** Appuie sur le bouton sous le point (x, y), sans l'animation d'enfoncement (listes qui défilent). */
function clickAt(x, y) {
  const hit = buttons.find((b) => b.rect.contains(x, y));
  if (hit) { sounds.play('CLICK', 0.6); hit.action(); }
}
