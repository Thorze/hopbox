'use strict';
// Sons et musiques avec la Web Audio API (équivalent de Sounds.kt).
// Sur iPhone, le son n'est autorisé qu'après un premier appui : unlock() est appelé à chaque toucher.

const SFX = {
  JUMP: ['saut'], LAND: ['atterrissage'], GREAT: ['great'], PERFECT: ['perfect', 'oh_yeah', 'ifeelgood'],
  SCARE: ['limite', 'limite2', 'limite3'], FALL: ['chute'], CRUMBLE: ['pierre1', 'pierre2', 'pierre3', 'pierre4'],
  BONUS_WIN: ['bonus_gagne'], BONUS_LOSE: ['bonus_rate'], TAP: ['tape'], STAR: ['etoile'], COIN: ['piece'],
  WHEEL_TICK: ['roue'], UNLOCK: ['congratulations', 'deblocage'], REVIVE: ['ange'], CLICK: ['clic'], THUNDER: ['tonnerre1', 'tonnerre2', 'tonnerre3'], PLANE_FALL: ['avion_chute'], EXPLOSION: ['explosion'], STRIKE: ['foudre'], EAGLE: ['aigle', 'aigle2', 'aigle3'], HEAT: ['surchauffe'], POP: ['pouf'], WHALE: ['baleine'], GEYSER: ['geyser'], TORNADO: ['tornade'], BLIZZARD: ['blizzard'], TRAMPOLINE: ['trampoline', 'trampoline2', 'trampoline3'], VOLCANO: ['volcan'], VOLCANO2: ['volcan2'],
  HELI_PASS: ['helico_passe'],   // hélicoptère qui passe au loin (7 s, en fondu)
  DEMON: ['rire_demon'],         // ricanement (fantômes de l'Aventure)
  UFO: ['ovni'],                 // soucoupe qui arrive puis rayon tracteur (12 s)
  UFO_PASS: ['ovni_passe'],      // soucoupe qui passe au loin (7 s en fondu)
  ALARM: ['alarme'],             // sirène d'alerte nucléaire (5,6 s)
  SHEEP: ['mouton'],             // bêlement de mouton (1,3 s, joué plus ou moins aigu)
  SNORE: ['ronflement'],         // deux ronflements (7 s)
  TICK: ['tictac'],              // tic-tac d'horloge (4 s)
  ALARM_CLOCK: ['reveil'],       // sonnerie de réveil (4,5 s)
  INSECT: ['insecte'],           // bourdonnement d'insecte qui passe (5 s, en fondu)
  BEE: ['abeille'],              // abeille qui passe en bourdonnant (5,7 s)
  FLY: ['mouche'],               // mouche qui vole (2,5 s)
  JINGLE_8BIT: ['jingle_8bit'],  // petit jingle 8 bits (8,5 s)
  WHALE_SYNTH: ['baleine_synth'],   // nappe de synthé « baleine » (24 s), de temps en temps en fond
  ALIEN: ['alien'],              // petite voix d'alien (2 s)
  BUBBLE: ['bulle', 'bulle2'],   // bulle qui éclate (deux variantes, jouées plus ou moins aiguës)
  BLOP: ['blop1', 'blop2', 'blop3'],   // « blop » de grosses bulles dans l'acide (jouées plus ou moins graves)
  GOO: ['gluant'],               // « splotch » gluant (0,8 s)
  BELL: ['cloche'],              // deux coups de grosse cloche, « DONG ! DONG ! » (5 s)
  WOLF: ['loup', 'loup2', 'loup3', 'loup4'],   // hurlement de loup (quatre variantes, dont une meute)
  GHOST: ['fantome1', 'fantome2', 'fantome3'],   // fantôme « wouuuh » (trois variantes)
  SPOOKY: ['grognement', 'ton_fantome'],   // grognement surnaturel ou ton fantomatique (manoir hanté)
  GONG: ['gong'],                // coup de gong (6 s de résonance)
  FACTORY: ['usine_fond'],       // machine d'usine pneumatique (aussi en boucle d'ambiance)
  ROCK_HIT: ['rock_accord'],     // accord de rock « à fond » (3 s)
  CROWD: ['foule'],              // foule de concert qui acclame (7 s)
  SMOKE: ['fumigene'],           // « pschitt » de fumigène (1,4 s)
  FLUTE: ['flute', 'flute2'],    // flûte japonaise (deux variantes de 16 s, en fondu), de temps en temps au dojo
  CHIME: ['carillon'],           // carillon à vent en bambou (6 s)
  DOOR_CHIME: ['clochette1', 'clochette2'],   // clochettes de porte (deux variantes), de temps en temps au dojo
  STONE: ['sarcophage'],         // pierre lourde qui frotte (couvercle de sarcophage, mur qui coulisse)
  YETI_GROWL: ['yeti_grogne'], YETI_ROAR: ['yeti_rugit'], YETI: ['yeti_grogne', 'yeti_rugit'],   // yéti
  SCAN: ['bip_scan'],            // bip de scanner (0,3 s)
  // Décomptes « 3, 2, 1… » : la voix grave finit par « zéro », les deux autres par « go » (voir DUEL_VOICES)
  COUNTDOWN1: ['decompte1'], COUNTDOWN2: ['decompte2'], COUNTDOWN3: ['decompte3'],
  WHOOSH: ['whoosh'],   // souffle des parfaits enchaînés (onde de choc et aura)
  CANNON: ['canon', 'canon2'],   // coup de canon (deux variantes) : pirates (ch. 17), canon géant du cirque (ch. 23)
  GULL: ['mouette', 'mouette2'],   // cri de mouette (deux variantes)
  CREW_CHEER: ['hourra_equipage'],   // l'équipage pirate acclame (6 s)
  VORTEX: ['vortex'],            // vortex lumineux qui aspire le navire (2,2 s)
  TREX: ['rugissement_trex'],    // rugissement du T-Rex (6 s)
  PTERODACTYL: ['cri_pterodactyle'],   // cri de ptérodactyle (3,3 s)
  GIANT_STEP: ['pas_geant'],     // trois pas de géant qui font trembler le sol (5,9 s)
};
// Fichiers réellement présents dans web/sons/
const AVAILABLE = new Set(['bonus', 'bonus2', 'bonus3', 'boucle1', 'boucle2', 'boucle3', 'boucle4', 'boucle5', 'boucle6', 'boucle7', 'chute', 'congratulations', 'gameover2',
  'great', 'ifeelgood', 'limite', 'limite2', 'limite3', 'oh_yeah', 'perfect', 'ange', 'tonnerre1', 'tonnerre2', 'avion_chute', 'explosion', 'pluie', 'foudre', 'aigle', 'aigle2', 'aigle3', 'helico', 'baleine', 'geyser', 'tornade', 'roue', 'roue_boucle', 'blizzard', 'piece', 'surchauffe', 'trampoline', 'etoile', 'boucle_mission_last', 'volcan', 'volcan2', 'volcan_loop', 'satellite', 'pierre1', 'pierre2', 'pierre3', 'pierre4', 'saut', 'trampoline2', 'trampoline3', 'rire_demon', 'good_bye', 'helico_passe', 'ovni', 'ovni_passe', 'alarme', 'mouton', 'ronflement', 'boite_musique', 'tictac', 'reveil', 'insecte', 'abeille', 'mouche', 'insectes_fond', 'arcade_8bit', 'jingle_8bit', 'vent_desert', 'baleine_synth', 'alien', 'bulle', 'bulle2', 'bulles_fond', 'blop1', 'blop2', 'blop3', 'gluant', 'tictac_fond', 'cloche', 'loup', 'loup2', 'loup3', 'loup4', 'fantome1', 'fantome2', 'fantome3', 'fantomes_fond', 'grognement', 'ton_fantome', 'gong', 'usine_fond', 'rock', 'rock2', 'rock_accord', 'foule', 'zen', 'fumigene', 'usine_musique', 'flute', 'flute2', 'carillon', 'clochette1', 'clochette2', 'sarcophage', 'yeti_grogne', 'yeti_rugit', 'lave_fond', 'bip_scan', 'halloween', 'orientale',
  'decompte1', 'decompte2', 'decompte3', 'whoosh',
  'canon', 'canon2', 'mouette', 'mouette2', 'hourra_equipage', 'vortex', 'rugissement_trex', 'cri_pterodactyle', 'pas_geant',
  'jungle_fond', 'jungle_fond2', 'vagues_fond', 'vagues_fond2', 'vagues_fond3',
  'jurassique_musique', 'jurassique_musique2', 'atlantide_musique', 'atlantide_musique2', 'espace_musique', 'espace_musique2',
  'farwest_musique', 'farwest_musique2', 'mine_musique', 'mine_musique2', 'cirque_musique', 'cirque_musique2', 'cirque_musique3',
  'arene_musique', 'arene_musique2', 'arene_musique3']);
// Sons de défaite : l'un d'eux au hasard
const GAME_OVER = ['gameover2', 'rire_demon', 'good_bye'];
const LOOPS = ['boucle1', 'boucle2', 'boucle3', 'boucle4', 'boucle5', 'boucle6', 'boucle7'];

const sounds = (() => {
  let ctx = null, sfxGain = null, musicGain = null;
  const buffers = new Map();   // nom -> AudioBuffer
  const loading = new Map();   // nom -> Promise
  let levelName = '';   // musique propre à un niveau (mode « level »)
  let mode = 'playlist', musicSrc = null, loopIndex = -1, repeatsLeft = 0, musicToken = 0, paused = true;
  let soundVolume = store.getFloat('sound_volume', 0.8);
  let musicVolume = store.getFloat('music_volume', 0.5);

  function load(name) {
    if (!AVAILABLE.has(name) || !ctx) return Promise.resolve(null);
    if (buffers.has(name)) return Promise.resolve(buffers.get(name));
    if (!loading.has(name)) {
      loading.set(name, fetch('sons/' + name + '.mp3').then((r) => r.arrayBuffer())
        .then((data) => new Promise((ok, ko) => {
          // Navigateurs récents : decodeAudioData renvoie aussi une promesse, qui serait rejetée sans être rattrapée
          // (écran « Oups ») si un son ne peut pas être décodé. Un son illisible est simplement ignoré.
          const p = ctx.decodeAudioData(data, ok, ko);
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }))
        .then((buf) => { buffers.set(name, buf); return buf; })
        .catch((e) => { console.warn('Son illisible : ' + name, e); return null; }));
    }
    return loading.get(name);
  }

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      sfxGain = ctx.createGain(); sfxGain.gain.value = soundVolume; sfxGain.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = musicVolume; musicGain.connect(ctx.destination);
      // Effets chargés tout de suite (petits fichiers)
      Object.values(SFX).flat().forEach((n) => load(n));
      GAME_OVER.forEach((n) => load(n));
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (paused) { paused = false; startMode(); }
  }

  function playBuffer(buf, gainNode, volume = 1, rate = 1) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = clamp(rate, 0.5, 2);
    const g = ctx.createGain(); g.gain.value = volume;
    src.connect(g); g.connect(gainNode);
    src.start();
    return src;
  }

  // Son d'ambiance en boucle (pluie pendant la météo), au volume des effets
  let ambientSrc = null, ambientName = null;
  function setAmbient(name) {
    if (!ctx || name === ambientName) return;
    ambientName = name;
    if (ambientSrc) { try { ambientSrc.stop(); } catch (e) { /* ignoré */ } ambientSrc = null; }
    if (!name) return;
    load(name).then((buf) => {
      if (!buf || ambientName !== name || ambientSrc) return;
      ambientSrc = playBuffer(buf, sfxGain, 0.6);
      ambientSrc.loop = true;
    });
  }

  // Bruit en boucle lié à un imprévu (rotor de l'hélicoptère…), indépendant de l'ambiance météo
  let loopSrc = null, loopName = null;
  function setLoop(name) {
    if (!ctx || name === loopName) return;
    loopName = name;
    if (loopSrc) { try { loopSrc.stop(); } catch (e) { /* ignoré */ } loopSrc = null; }
    if (!name || soundVolume <= 0) return;
    load(name).then((buf) => {
      if (!buf || loopName !== name || loopSrc) return;
      loopSrc = playBuffer(buf, sfxGain, 0.55);
      loopSrc.loop = true;
    });
  }

  function has(id) { return SFX[id].some((n) => AVAILABLE.has(n)); }

  function play(id, volume = 1, rate = 1) {
    if (!ctx || soundVolume <= 0) return;
    const names = SFX[id].filter((n) => AVAILABLE.has(n));
    if (!names.length) return;
    const name = names[rndInt(names.length)];
    const buf = buffers.get(name);
    if (buf) playBuffer(buf, sfxGain, volume, rate);
    else load(name).then((b) => { if (b) playBuffer(b, sfxGain, volume, rate); });
  }

  function stopMusic() {
    musicToken++;
    if (musicSrc) { try { musicSrc.onended = null; musicSrc.stop(); } catch (e) { /* déjà arrêté */ } }
    musicSrc = null;
  }

  function startMode() {
    if (!ctx || paused || musicSrc) return;
    if (mode === 'playlist') nextLoop();
    else if (mode === 'level') {
      if (musicVolume <= 0) return;
      const token = ++musicToken;
      load(levelName).then((buf) => {
        if (!buf || token !== musicToken || mode !== 'level') return;
        musicSrc = playBuffer(buf, musicGain); musicSrc.loop = true;
      });
    }
    else if (mode === 'bonus') {
      if (musicVolume <= 0) return;
      const token = ++musicToken;
      // Musique du mini-jeu : l'une des trois au hasard
      load(['bonus', 'bonus2', 'bonus3'][rndInt(3)]).then((buf) => {
        if (!buf || token !== musicToken || mode !== 'bonus') return;
        musicSrc = playBuffer(buf, musicGain); musicSrc.loop = true;
      });
    }
  }

  /** Une autre boucle au hasard, répétée 3 ou 4 fois. */
  function nextLoop() {
    if (musicVolume <= 0) return;
    let idx = rndInt(LOOPS.length);
    if (LOOPS.length > 1 && idx === loopIndex) idx = (idx + 1 + rndInt(LOOPS.length - 1)) % LOOPS.length;
    loopIndex = idx;
    repeatsLeft = 3 + rndInt(2);
    const token = ++musicToken;
    load(LOOPS[idx]).then((buf) => {
      if (!buf || token !== musicToken || mode !== 'playlist' || paused) return;
      const playOnce = () => {
        musicSrc = playBuffer(buf, musicGain);
        musicSrc.onended = () => {
          if (token !== musicToken) return;
          musicSrc = null;
          repeatsLeft--;
          if (repeatsLeft > 0) playOnce(); else nextLoop();
        };
      };
      playOnce();
    });
    // Libère la mémoire des boucles qui ne jouent pas
    LOOPS.forEach((n, i) => { if (i !== idx) { buffers.delete(n); loading.delete(n); } });
  }

  return {
    unlock, has, play, setAmbient, setLoop,
    get soundVolume() { return soundVolume; },
    set soundVolume(v) { soundVolume = clamp(v, 0, 1); store.set('sound_volume', soundVolume); if (sfxGain) sfxGain.gain.value = soundVolume; },
    get musicVolume() { return musicVolume; },
    set musicVolume(v) {
      musicVolume = clamp(v, 0, 1); store.set('music_volume', musicVolume);
      if (musicGain) musicGain.gain.value = musicVolume;
      if (musicVolume <= 0) stopMusic(); else startMode();
    },
    playPlaylist() { if (mode === 'playlist' && musicSrc) return; mode = 'playlist'; stopMusic(); startMode(); },
    playBonusMusic() { mode = 'bonus'; stopMusic(); startMode(); },
    /** Musique d'un niveau particulier, en boucle ; rien ne change si elle joue déjà. */
    playLevelMusic(name) {
      if (!AVAILABLE.has(name)) { this.playPlaylist(); return; }
      if (mode === 'level' && levelName === name && musicSrc) return;
      mode = 'level'; levelName = name; stopMusic(); startMode();
    },
    playGameOver(onDone) {
      mode = 'gameover'; stopMusic();
      const buf = buffers.get(GAME_OVER[Math.floor(Math.random() * GAME_OVER.length)]) || buffers.get('gameover2');
      if (!ctx || !buf || soundVolume <= 0) { mode = 'playlist'; onDone(); startMode(); return; }
      const src = playBuffer(buf, sfxGain);
      const token = musicToken;
      src.onended = () => { if (token !== musicToken) return; mode = 'playlist'; onDone(); startMode(); };
    },
    pause() { paused = true; stopMusic(); if (ctx) ctx.suspend(); },
    resume() { if (!ctx) return; ctx.resume(); paused = false; if (mode === 'gameover') mode = 'playlist'; startMode(); },
  };
})();
