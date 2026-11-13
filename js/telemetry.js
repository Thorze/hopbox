'use strict';
// Mesure anonyme (équivalent de Telemetry.kt) : identifiant d'installation tiré au hasard, jamais relié au compte ni au
// pseudo ; quelques événements gardés dans une file (localStorage) et envoyés par lots au serveur (console /admin).
// Rien n'est envoyé si le joueur a coupé « Statistiques anonymes » dans les réglages.

const Telemetry = (() => {
  const KEY_ON = 'hb_stats_on', KEY_ID = 'hb_stats_id', KEY_Q = 'hb_stats_q';
  const MAX_QUEUE = 300, BATCH = 60, FLUSH_AT = 25;
  let queue = [], install = '', sending = false, crashes = 0;
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible : tant pis */ } };
  const save = () => set(KEY_Q, JSON.stringify(queue));
  const enabled = () => get(KEY_ON) !== '0';
  const active = () => !!SCORES_URL && enabled();
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  function device() {
    const ua = navigator.userAgent || '';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows'
      : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '?';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'autre';
    return { model: browser + (/Mobi|Android|iPhone|iPad/.test(ua) ? ' mobile' : ' ordinateur'), os };
  }
  function meta() {
    const d = device();
    return { install, plat: 'web', ver: (typeof WEB_VERSION !== 'undefined' && WEB_VERSION) || 'web', lang: (typeof I18n !== 'undefined' && I18n.lang) || '?', model: d.model, os: d.os };
  }
  function post(path, body, keepalive) {
    const headers = { 'Content-Type': 'application/json' };
    return fetch(SCORES_URL + path, { method: 'POST', headers, body: JSON.stringify(body), keepalive: !!keepalive })
      .then((r) => r.ok || r.status === 400).catch(() => false);
  }

  return {
    get enabled() { return enabled(); },
    set enabled(v) { set(KEY_ON, v ? '1' : '0'); if (!v) { queue = []; save(); } },
    init() {
      const first = !get(KEY_ID);
      install = get(KEY_ID) || uuid();
      set(KEY_ID, install);
      try { queue = JSON.parse(get(KEY_Q) || '[]'); if (!Array.isArray(queue)) queue = []; } catch (e) { queue = []; }
      this.track('open', { first: first ? 1 : 0 });
      this.flush();
      // En quittant la page : envoi de ce qui reste (keepalive : la requête survit à la fermeture)
      window.addEventListener('pagehide', () => this.flush(true));
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(true); });
      // Erreurs JavaScript : envoyées comme plantages (3 au plus par session)
      const crash = (err) => {
        if (!active() || crashes >= 3) return;
        crashes++;
        const text = (err && (err.stack || err.message)) ? String(err.stack || err.message) : String(err);
        post('/api/crash', Object.assign(meta(), { text: text.slice(0, 8000) }));
      };
      window.addEventListener('error', (e) => crash(e.error || e.message));
      window.addEventListener('unhandledrejection', (e) => crash(e.reason));
    },
    track(kind, data) {
      if (!active() || !install) return;
      const d = {};
      for (const [k, v] of Object.entries(data || {})) d[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
      queue.push({ k: kind, t: Date.now() / 1000, d });
      if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
      save();
      if (queue.length >= FLUSH_AT) this.flush();
    },
    flush(leaving) {
      if (!active() || sending || !queue.length) return;
      sending = true;
      const batch = queue.slice(0, BATCH);
      post('/api/events', Object.assign(meta(), { events: batch }), leaving).then((ok) => {
        if (ok) { queue.splice(0, batch.length); save(); }
        sending = false;
        if (ok && queue.length && !leaving) this.flush();
      });
    }
  };
})();
