'use strict';
// Fêtes de l'année (équivalent de Fest.kt) : Noël, Nouvel An, Nouvel An lunaire, Saint-Valentin, Pâques, Halloween,
// anniversaire du jeu. Le jeu sait faire quatre « briques » (calendrier de cases, chasse aux objets posés sur les
// blocs, défis, objets en boutique pour un temps) et un décor par fête ; le fichier des fêtes dit quand et quoi.
// Ce fichier vient du serveur (GET /api/festivals, modifiable depuis la console admin) ; le dernier reçu est gardé,
// et fetes.json (le même que dans fetes/ à la racine du projet) sert de secours tant qu'on n'a rien reçu.
// Les fêtes ne comptent qu'en mode libre (ni l'Aventure, ni les duels, ni le tuto).

const FEST_ICONS = { noel: '🎄', nouvelan: '🎆', lunaire: '🧧', valentin: '💝', paques: '🐣', halloween: '🎃', anniv: '🎂' };
const FEST_THINGS = { enveloppe: '🧧', coeur: '💗', oeuf: '🥚', bonbon: '🍬' };
/** Défis : « max » = meilleure valeur en une partie, sinon cumul sur toutes les parties. */
const FEST_MAX_TYPES = new Set(['streak', 'score']);
const FEST_REFRESH_MS = 3 * 3600 * 1000;
/** Récompense en pièces quand on regagne un objet déjà à soi (même fête l'année suivante). */
const FEST_OWNED_COINS = 100;

/** Jour (n° depuis 1970) d'une date « AAAA-MM-JJ », ou -1. */
function festDay(s) {
  const m = typeof s === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return -1;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
}

function festReward(o) {
  if (!o || typeof o !== 'object') return null;
  const coins = Math.max(0, Math.floor(Number(o.coins) || 0)), item = typeof o.item === 'string' ? o.item : null;
  return coins > 0 || item ? { coins, item } : null;
}

function festChallenge(o, defFrom) {
  if (!o || typeof o.type !== 'string') return null;
  const target = Math.floor(Number(o.target) || 0);
  if (target <= 0) return null;
  const from = o.from ? festDay(o.from) : defFrom;
  return { type: o.type, target, from, reward: festReward(o.reward) };
}

/** Lit le fichier des fêtes ; les entrées mal formées sont ignorées. */
function festParse(json) {
  const out = [];
  for (const o of (json && Array.isArray(json.list) ? json.list : [])) {
    if (!o || typeof o.id !== 'string' || typeof o.key !== 'string') continue;
    const start = festDay(o.start), end = festDay(o.end);
    if (start < 0 || end < start) continue;
    const until = Math.max(end, o.until ? festDay(o.until) : end);
    const f = {
      id: o.id, key: o.key, start, end, until, theme: typeof o.theme === 'string' ? o.theme : null,
      themeStart: o.themeStart ? festDay(o.themeStart) : start, themeEnd: o.themeEnd ? festDay(o.themeEnd) : end,
      calendar: [], hunt: null, challenges: [], shop: Array.isArray(o.shop) ? o.shop.filter((s) => typeof s === 'string') : [],
    };
    if (Array.isArray(o.calendar)) {
      o.calendar.forEach((c, i) => {
        const reward = festReward(c);
        if (reward) f.calendar.push({ reward, challenge: c.challenge ? festChallenge(c.challenge, start + i) : null });
      });
    }
    const hu = o.hunt;
    if (hu && typeof hu.thing === 'string' && Array.isArray(hu.steps)) {
      const steps = hu.steps.map((s) => ({ n: Math.floor(Number(s && s.n) || 0), reward: festReward(s && s.reward) }))
        .filter((s) => s.n > 0 && s.reward).sort((a, b) => a.n - b.n);
      if (steps.length) f.hunt = { thing: hu.thing, chance: clamp(Number(hu.chance) || 0.25, 0.02, 0.8), steps };
    }
    if (Array.isArray(o.challenges)) for (const c of o.challenges) { const ch = festChallenge(c, start); if (ch && ch.reward) f.challenges.push(ch); }
    out.push(f);
  }
  return out;
}

const Fest = {
  list: [],
  loaded: false,
  busy: false,
  fetchedAt: 0,

  /** Au lancement : dernier fichier reçu, sinon celui livré avec le jeu ; puis le serveur. */
  init() {
    let cached = null;
    try { cached = JSON.parse(store.get('fest_data') || 'null'); } catch (e) { cached = null; }
    if (cached) { this.list = festParse(cached); this.loaded = true; }
    else {
      fetch('fetes.json', { cache: 'no-cache' }).then((r) => r.json()).then((j) => { if (!this.loaded) { this.list = festParse(j); this.loaded = true; } }).catch(() => {});
    }
    this.refresh();
  },
  /** Demande le fichier au serveur (au plus toutes les 3 heures). */
  refresh() {
    if (this.busy || (this.fetchedAt && Date.now() - this.fetchedAt < FEST_REFRESH_MS)) return;
    this.busy = true; this.fetchedAt = Date.now();
    online.request('GET', '/api/festivals', null, false).then(({ code, json }) => {
      this.busy = false;
      if (code !== 200 || !json || !Array.isArray(json.list)) return;
      store.set('fest_data', JSON.stringify({ v: json.v, list: json.list }));
      // Heure du serveur : on la suit quand le téléphone est très en avance ou en retard (pas de triche à l'horloge)
      if (typeof json.now === 'number') {
        const off = json.now - Date.now();
        store.set('fest_offset', Math.abs(off) > 600000 ? off : 0);
      }
      this.list = festParse(json); this.loaded = true;
    }).catch(() => { this.busy = false; });
  },
  /** Jour d'aujourd'hui (heure locale, recalée sur le serveur si l'horloge du téléphone est fausse). */
  today() {
    // Tests : « fest_test_offset » (ms) avance la date des fêtes, comme dans la version debug d'Android
    return Math.floor((Date.now() + store.getFloat('fest_offset', 0) + store.getFloat('fest_test_offset', 0) - new Date().getTimezoneOffset() * 60000) / 86400000);
  },
  /** Fêtes affichées (bouton, fenêtre) : de leur début jusqu'à leur dernier jour de rattrapage. */
  visible(today = this.today()) {
    return this.list.filter((f) => today >= f.start && today <= f.until && (f.calendar.length || f.hunt || f.challenges.length || f.shop.length));
  },
  /** Décors du mode libre et de l'accueil. */
  themes(today = this.today()) {
    return this.list.filter((f) => f.theme && today >= f.themeStart && today <= f.themeEnd).map((f) => f.theme);
  },
  /** La fête la plus récente (icône du bouton de l'accueil). */
  main(today = this.today()) {
    const v = this.visible(today);
    return v.length ? v.reduce((a, b) => (b.start > a.start ? b : a)) : null;
  },

  // ---------- État d'une fête (gardé sur l'appareil) ----------
  K: (f, s) => 'fest_' + f.id + '_' + s,
  opened(f) { return store.getSet(this.K(f, 'open')); },
  seen(f) { return store.getBool(this.K(f, 'seen'), false); },
  markSeen(f) { store.setBool(this.K(f, 'seen'), true); },
  /** État d'une case : open, future, challenge (défi pas encore réussi), ready (aujourd'hui), catch (rattrapable), missed. */
  cellState(f, i, today = this.today()) {
    if (this.opened(f).has(String(i))) return 'open';
    const day = f.start + i, cell = f.calendar[i];
    if (day > today) return 'future';
    if (today > f.until) return 'missed';
    if (cell.challenge) return this.progress(f, 'c' + i) >= cell.challenge.target ? 'ready' : 'challenge';
    if (day === today) return 'ready';
    return store.getInt(this.K(f, 'catch'), -1) !== today ? 'catch' : 'missed';
  },
  /** Ouvre une case ; renvoie la récompense donnée (null si la case n'est pas ouvrable). */
  openCell(f, i) {
    const today = this.today(), st = this.cellState(f, i, today);
    if (st !== 'ready' && st !== 'catch') return null;
    if (st === 'catch') store.set(this.K(f, 'catch'), today);
    const o = this.opened(f); o.add(String(i)); store.setSet(this.K(f, 'open'), o);
    Telemetry.track('fest', { id: f.id, what: 'cell', n: i + 1 });
    return this.grant(f.calendar[i].reward, false, true);
  },
  /** Une case à ouvrir aujourd'hui (pastille rouge, ouverture automatique de la fenêtre). */
  cellWaiting(f, today = this.today(), withCatch = true) {
    for (let i = 0; i < f.calendar.length; i++) {
      const st = this.cellState(f, i, today);
      if (st === 'ready' || (withCatch && st === 'catch' && f.start + i < today)) return true;
    }
    return false;
  },
  badge(today = this.today()) { return this.visible(today).some((f) => !this.seen(f) || this.cellWaiting(f, today)); },

  // ---------- Défis ----------
  progress(f, key) { return store.getInt(this.K(f, 'p' + key), 0); },
  challengeDone(f, i) { return store.getBool(this.K(f, 'x' + i), false); },
  /** Résultat en mode libre (missionEvent) : fait avancer les défis des fêtes en cours. */
  record(type, amount) {
    const today = this.today(), max = FEST_MAX_TYPES.has(type);
    for (const f of this.visible(today)) {
      const bump = (key, ch) => {
        const before = this.progress(f, key), after = max ? Math.max(before, amount) : before + amount;
        if (after === before) return false;
        store.set(this.K(f, 'p' + key), after);
        return before < ch.target && after >= ch.target;
      };
      f.calendar.forEach((c, i) => {
        if (!c.challenge || c.challenge.type !== type || c.challenge.from > today || this.opened(f).has(String(i))) return;
        if (bump('c' + i, c.challenge)) { banners.push({ text: tr('fest.banner.cell_ready'), life: 3 }); sounds.play('FEST_STEP'); }
      });
      f.challenges.forEach((ch, i) => {
        if (ch.type !== type || ch.from > today || this.challengeDone(f, i)) return;
        if (bump('x' + i, ch)) {
          store.setBool(this.K(f, 'x' + i), true);
          Telemetry.track('fest', { id: f.id, what: 'challenge', n: i + 1 });
          banners.push({ text: tr('fest.banner.challenge'), life: 3 });
          this.grant(ch.reward, true);
        }
      });
    }
  },

  // ---------- Chasse ----------
  /** Chasse en cours (mode libre) : la fête et le nombre d'objets ramassés, ou null. */
  hunt(today = this.today()) {
    for (const f of this.list) {
      if (!f.hunt || today < f.start || today > f.end) continue;
      if (this.found(f) < f.hunt.steps[f.hunt.steps.length - 1].n) return f;
    }
    return null;
  },
  found(f) { return store.getInt(this.K(f, 'hunt'), 0); },
  /** Un objet ramassé ; les paliers atteints donnent leur récompense. */
  collect(f) {
    const n = this.found(f) + 1;
    store.set(this.K(f, 'hunt'), n);
    for (const s of f.hunt.steps) {
      if (s.n !== n) continue;
      Telemetry.track('fest', { id: f.id, what: 'step', n });
      banners.push({ text: tr('fest.banner.step', { n }), life: 3 });
      this.grant(s.reward, true);
    }
    return n;
  },

  // ---------- Boutique ----------
  /** Objet en vente pour un temps : seulement pendant une fête qui le propose. */
  onSale(item, today = this.today()) {
    const key = profile.key(item);
    return this.list.some((f) => today >= f.start && today <= f.until && f.shop.includes(key));
  },
  saleEnd(item, today = this.today()) {
    const key = profile.key(item), f = this.list.find((x) => today >= x.start && today <= x.until && x.shop.includes(key));
    return f ? f.until : -1;
  },

  // ---------- Récompenses ----------
  item(key) {
    const [slot, id] = String(key).split(':');
    return Skins.items.find((it) => it.slot.key === slot && it.id === id) || null;
  },
  /** Donne une récompense ; renvoie { coins, item } (ce qui a vraiment été donné). */
  /** Donne une récompense ; [cell] : case du calendrier (son à elle). */
  grant(r, announce = false, cell = false) {
    if (!r) return null;
    let coins = r.coins, item = r.item ? this.item(r.item) : null;
    if (r.item && (!item || profile.available(item))) { coins += FEST_OWNED_COINS; item = null; }
    if (item) {
      profile.grant(item);
      if (announce) banners.push({ text: tr('fest.banner.item', { name: item.label }), life: 3.2 });
    }
    if (coins > 0) { profile.coins = profile.coins + coins; if (announce) banners.push({ text: `+${coins} 🪙`, life: 2.4 }); }
    if (cell) sounds.play('CALENDAR_CELL');
    else if (announce) sounds.play('FEST_STEP');   // palier de chasse, défi réussi
    else { sounds.play('UNLOCK'); if (coins > 0) sounds.play('COIN'); }
    return { coins, item };
  },
};

/** Les fêtes comptent seulement en mode libre (pas l'Aventure, pas les duels, pas le tuto). */
function festFreeMode() { return !quest.active && !duel.active && !tuto.active; }

// ---------- Objets de la chasse sur les blocs ----------
/** À la création d'un bloc du mode libre : un objet de la chasse en cours, de temps en temps. */
function festPlaceThing(p) {
  if (!festFreeMode() || p.heart || p.bolt || p.golden || p.blink) return;
  const f = Fest.hunt();
  if (f && rnd() < f.hunt.chance) { p.fest = f.hunt.thing; p.coin = 0; }
}

function festCollectThing(p) {
  const f = Fest.hunt();
  const thing = p.fest; p.fest = null;
  if (!f || f.hunt.thing !== thing) return;
  const n = Fest.collect(f);
  const x = sx(p.cx, p.cz) + camX, y = sy(p.cx, 0.6, p.cz) + camY;
  spawnSparkles(x, y, Color.parseColor('#FFD54F'), 16);
  popups.push({ text: (FEST_THINGS[thing] || '🎁') + ' ' + n, x, y: y - k * 0.4, life: 1.1 });
  sounds.play('COIN', 0.9, 1.25);
}

/** Fin de la ligne du haut en mode libre : objets de la chasse ramassés (« 🥚 12 »). */
function festHudText() {
  if (!festFreeMode()) return '';
  const f = Fest.hunt();
  return f ? `   ${FEST_THINGS[f.hunt.thing] || '🎁'} ${Fest.found(f)}` : '';
}

/** Objet de la chasse qui flotte au-dessus du centre du bloc (repère de la plateforme). */
function drawFestThingPickup(canvas, p) {
  const beat = 1 + 0.1 * Math.abs(Math.sin(time * 5));
  const cy = isoY(0, 0.65, 0) + Math.sin(time * 3) * k * 0.05;
  const dp = p.detailPaint;
  p.flatOval(0.16); dp.color = Color.argb(50, 0, 0, 0); canvas.drawOval(p.oval, dp);
  dp.color = Color.argb(90, 255, 230, 150); canvas.drawCircle(0, cy, k * 0.38 * beat, dp);
  festEmojiPaint.textSize = k * 0.58 * beat;
  canvas.drawText(FEST_THINGS[p.fest] || '🎁', 0, cy + k * 0.2 * beat, festEmojiPaint);
}
const festEmojiPaint = new Paint({ textAlign: Align.CENTER });

// ---------- Décors ----------
const festDecoPaint = new Paint(), festDecoStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });
/** Hasard fixe (0..1) tiré de deux entiers : les décors se dessinent sans rien garder en mémoire. */
function festHash(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }

/** Décors des fêtes, dans le ciel (derrière les blocs), en mode libre et à l'accueil. */
function drawFestDecor(canvas) {
  if (!festFreeMode()) return;
  for (const th of Fest.themes()) {
    switch (th) {
      case 'hiver': festSnow(canvas); break;
      case 'feux': festFireworks(canvas); festFireworksSound(); break;
      case 'lunaire': festTint(canvas, 150, 30, 20, 34); festLanterns(canvas); break;
      case 'valentin': festHearts(canvas); break;
      case 'paques': festPetals(canvas); break;
      case 'halloween': festTint(canvas, 40, 10, 60, 90); festBats(canvas); festMist(canvas); break;
      case 'anniv': festConfetti(canvas); festBalloons(canvas); break;
      default: break;
    }
  }
}

function festTint(canvas, r, g, b, a) {
  festDecoPaint.color = Color.WHITE;
  festDecoPaint.shader = new LinearGradient(0, 0, 0, h, Color.argb(a, r, g, b), Color.argb(Math.round(a * 0.3), r, g, b));
  canvas.drawRect(0, 0, w, h, festDecoPaint);
  festDecoPaint.shader = null;
}

function festSnow(canvas) {
  festDecoPaint.color = Color.argb(215, 255, 255, 255);
  for (let i = 0; i < 46; i++) {
    const a = festHash(i, 1), b = festHash(i, 2), c = festHash(i, 3);
    const y = (((b + time * (0.05 + 0.05 * c)) % 1.08) - 0.04) * h;
    const x = (((a + time * 0.008 + Math.sin(time * (0.7 + c) + i) * 0.025) % 1 + 1) % 1) * w;
    canvas.drawCircle(x, y, w * (0.004 + 0.006 * c), festDecoPaint);
  }
}

/** Feux d'artifice entendus au loin, toutes les 14 à 24 s (le premier 3 s après l'arrivée du décor ; comme FestUi.kt). */
function festFireworksSound() {
  if (festFireAt === 0 || festFireAt > time + 30) festFireAt = time + 3;
  if (time < festFireAt) return;
  sounds.play('FIREWORKS', 0.6);
  festFireAt = time + 14 + Math.random() * 10;
}

function festFireworks(canvas) {
  const COLS = [0xFFFFD54F, 0xFFFF5A7A, 0xFF6FD3FF, 0xFF9CFF7A, 0xFFE59BFF];
  for (let s = 0; s < 3; s++) {
    const per = 1.9 + s * 0.4, t0 = time + s * 0.7, cyc = Math.floor(t0 / per), t = (t0 % per) / 1.3;
    if (t > 1) continue;
    const cx = (0.15 + 0.7 * festHash(cyc, s)) * w, cy = (0.1 + 0.3 * festHash(cyc, s + 9)) * h;
    const col = COLS[Math.floor(festHash(cyc, s + 4) * COLS.length)], r = w * 0.16 * Math.sqrt(t), al = Math.round(230 * (1 - t));
    festDecoPaint.color = Color.argb(al, Color.red(col), Color.green(col), Color.blue(col));
    for (let i = 0; i < 16; i++) {
      const ang = i * Math.PI / 8 + cyc;
      canvas.drawCircle(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r + t * t * w * 0.04, w * 0.006 * (1.2 - t), festDecoPaint);
    }
  }
}

function festLanterns(canvas) {
  for (let i = 0; i < 9; i++) {
    const a = festHash(i, 5), c = festHash(i, 6), per = 26 + 14 * c;
    const q = ((time / per + a) % 1);
    const x = (0.06 + 0.88 * festHash(i, 7)) * w + Math.sin(time * 0.6 + i) * w * 0.02, y = h * (1.08 - q * 1.2);
    const s = w * (0.028 + 0.018 * c);
    festDecoPaint.color = Color.argb(60, 255, 170, 60); canvas.drawCircle(x, y, s * 1.6, festDecoPaint);
    festDecoPaint.color = Color.parseColor('#E53935');
    rect.set(x - s * 0.8, y - s, x + s * 0.8, y + s); canvas.drawOval(rect, festDecoPaint);
    festDecoPaint.color = Color.parseColor('#FFC93C');
    canvas.drawRect(x - s * 0.45, y - s * 1.08, x + s * 0.45, y - s * 0.86, festDecoPaint);
    canvas.drawRect(x - s * 0.45, y + s * 0.86, x + s * 0.45, y + s * 1.08, festDecoPaint);
    festDecoStroke.color = Color.argb(150, 255, 210, 90); festDecoStroke.strokeWidth = s * 0.08;
    canvas.drawLine(x, y + s * 1.08, x, y + s * 1.5, festDecoStroke);
  }
}

function festHearts(canvas) {
  for (let i = 0; i < 14; i++) {
    const a = festHash(i, 8), c = festHash(i, 9), q = ((time / (18 + 10 * c) + a) % 1);
    const x = (0.05 + 0.9 * festHash(i, 10)) * w + Math.sin(time * 1.1 + i) * w * 0.03, y = h * (1.06 - q * 1.15);
    festDecoPaint.color = Color.argb(Math.round(110 + 70 * c), 255, 92 + Math.round(60 * a), 150);
    drawHeart(canvas, x, y, w * (0.018 + 0.016 * c), festDecoPaint);
  }
}

function festPetals(canvas) {
  const COLS = [0xFFFFB3D1, 0xFFFFF0A0, 0xFFC7F0B0, 0xFFD8C8FF, 0xFFFFFFFF];
  for (let i = 0; i < 26; i++) {
    const a = festHash(i, 11), b = festHash(i, 12), c = festHash(i, 13);
    const y = (((b + time * (0.035 + 0.03 * c)) % 1.08) - 0.04) * h;
    const x = (((a + Math.sin(time * 0.9 + i) * 0.04) % 1 + 1) % 1) * w;
    const col = COLS[i % COLS.length], s = w * (0.008 + 0.007 * c);
    festDecoPaint.color = Color.argb(210, Color.red(col), Color.green(col), Color.blue(col));
    canvas.save(); canvas.rotate((time * 60 * (c - 0.5) + i * 40) % 360, x, y);
    rect.set(x - s, y - s * 0.55, x + s, y + s * 0.55); canvas.drawOval(rect, festDecoPaint);
    canvas.restore();
  }
}

function festBats(canvas) {
  festDecoPaint.color = Color.argb(200, 25, 12, 35);
  for (let i = 0; i < 6; i++) {
    const c = festHash(i, 14), per = 9 + 6 * c, q = ((time / per + festHash(i, 15)) % 1);
    const dir = i % 2 ? 1 : -1, x = dir > 0 ? (q * 1.3 - 0.15) * w : (1.15 - q * 1.3) * w;
    const y = (0.08 + 0.35 * festHash(i, 16)) * h + Math.sin(time * 2 + i) * w * 0.03;
    const s = w * (0.022 + 0.014 * c), flap = Math.sin(time * 14 + i * 2) * s * 0.55;
    tmpPath.reset();
    tmpPath.moveTo(x, y);
    tmpPath.quadTo(x - s * 0.6, y - s * 0.3 - flap, x - s * 1.3, y - flap);
    tmpPath.quadTo(x - s * 0.8, y + s * 0.05, x - s * 0.5, y + s * 0.25);
    tmpPath.quadTo(x - s * 0.2, y + s * 0.05, x, y + s * 0.3);
    tmpPath.quadTo(x + s * 0.2, y + s * 0.05, x + s * 0.5, y + s * 0.25);
    tmpPath.quadTo(x + s * 0.8, y + s * 0.05, x + s * 1.3, y - flap);
    tmpPath.quadTo(x + s * 0.6, y - s * 0.3 - flap, x, y);
    tmpPath.close();
    canvas.drawPath(tmpPath, festDecoPaint);
    canvas.drawCircle(x, y + s * 0.05, s * 0.28, festDecoPaint);
  }
}

function festMist(canvas) {
  festDecoPaint.color = Color.WHITE;
  festDecoPaint.shader = new LinearGradient(0, h * 0.72, 0, h, Color.argb(0, 190, 170, 220), Color.argb(70, 190, 170, 220));
  canvas.drawRect(0, h * 0.72, w, h, festDecoPaint);
  festDecoPaint.shader = null;
}

function festConfetti(canvas) {
  const COLS = [0xFFFF5A7A, 0xFFFFD54F, 0xFF4FC3F7, 0xFF81C784, 0xFFB388FF, 0xFFFF9E40];
  for (let i = 0; i < 34; i++) {
    const a = festHash(i, 17), b = festHash(i, 18), c = festHash(i, 19);
    const y = (((b + time * (0.06 + 0.05 * c)) % 1.08) - 0.04) * h;
    const x = (((a + Math.sin(time * 1.3 + i) * 0.02) % 1 + 1) % 1) * w;
    const col = COLS[i % COLS.length], s = w * (0.007 + 0.005 * c);
    festDecoPaint.color = col;
    canvas.save(); canvas.rotate((time * 200 * (c + 0.3) + i * 33) % 360, x, y);
    canvas.drawRect(x - s, y - s * 0.45, x + s, y + s * 0.45, festDecoPaint);
    canvas.restore();
  }
}

function festBalloons(canvas) {
  const COLS = [0xFFFF5A7A, 0xFFFFD54F, 0xFF4FC3F7, 0xFF81C784, 0xFFB388FF];
  for (let i = 0; i < 5; i++) {
    const c = festHash(i, 20), q = ((time / (22 + 8 * c) + festHash(i, 21)) % 1);
    const x = (0.1 + 0.8 * festHash(i, 22)) * w + Math.sin(time * 0.8 + i) * w * 0.025, y = h * (1.1 - q * 1.25);
    const s = w * (0.03 + 0.012 * c), col = COLS[i];
    festDecoStroke.color = Color.argb(150, 255, 255, 255); festDecoStroke.strokeWidth = w * 0.002;
    canvas.drawLine(x, y + s * 1.2, x + Math.sin(time * 2 + i) * s * 0.3, y + s * 2.6, festDecoStroke);
    festDecoPaint.color = Color.argb(225, Color.red(col), Color.green(col), Color.blue(col));
    rect.set(x - s, y - s * 1.2, x + s, y + s * 1.2); canvas.drawOval(rect, festDecoPaint);
    festDecoPaint.color = Color.argb(90, 255, 255, 255); canvas.drawCircle(x - s * 0.35, y - s * 0.45, s * 0.25, festDecoPaint);
  }
}
