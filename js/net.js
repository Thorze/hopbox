'use strict';
// Serveur de jeu (équivalent de GameServer.kt) : compte, classement, amis et duels.
// Même serveur et même classement que l'appli Android. Le navigateur a un compte « par appareil » :
// créé au premier contact à partir de l'identifiant d'installation, puis un jeton de session gardé ici.

// window.SAUTIQUE_SCORES_URL permet de viser un autre serveur (tests)
const SCORES_URL = window.SAUTIQUE_SCORES_URL || 'https://api.hopboxgames.com';

const online = {
  /** Compte connu ({pseudo, code, google, best}), rempli par ensureSession(). */
  account: null,
  _session: null,
  async request(method, path, body, auth = true) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const headers = body ? { 'Content-Type': 'application/json' } : {};
      const token = store.get('token');
      if (auth && token) headers.Authorization = 'Bearer ' + token;
      const r = await fetch(SCORES_URL + path, { method, signal: ctrl.signal, headers, body: body ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { /* réponse vide ou texte */ }
      return { code: r.status, json };
    } finally { clearTimeout(timer); }
  },
  /** Ouvre (ou reprend) la session du navigateur ; renvoie le compte, ou null hors connexion. */
  ensureSession() {
    if (this.account && store.get('token')) return Promise.resolve(this.account);
    if (!this._session) {
      this._session = (async () => {
        try {
          if (store.get('token')) {
            const { code, json } = await this.request('GET', '/api/me');
            if (code === 200) return this.useAccount(json);
            if (code !== 401) return null;
            store.del('token');
          }
          const { code, json } = await this.request('POST', '/api/auth/device', { uuid: profile.playerId }, false);
          if (code !== 200) return null;
          store.set('token', json.token);
          return this.useAccount(json);
        } catch (e) { return null; } finally { this._session = null; }
      })();
    }
    return this._session;
  },
  useAccount(info) {
    this.account = { pseudo: info.pseudo, code: info.code, google: !!info.google, best: info.best || 0 };
    store.set('friend_code', info.code);
    // Le pseudo du serveur fait foi : s'il diffère de celui du navigateur, syncOnline() renverra le nôtre
    if (info.pseudo && !profile.pseudo) profile.pseudo = info.pseudo;
    if (info.pseudo) profile.syncedPseudo = info.pseudo; else store.del('synced_pseudo');
    return this.account;
  },
  /** Appel avec jeton ; une session expirée est rouverte une fois. Renvoie {code, json} (code 0 = hors connexion). */
  async call(method, path, body) {
    try {
      if (!(await this.ensureSession())) return { code: 0, json: null };
      let r = await this.request(method, path, body);
      if (r.code === 401) {
        store.del('token'); this.account = null;
        if (!(await this.ensureSession())) return { code: 0, json: null };
        r = await this.request(method, path, body);
      }
      return r;
    } catch (e) { return { code: 0, json: null }; }
  },
  /** ok, taken, forbidden, invalid ou error */
  async setPseudo(pseudo) {
    const { code, json } = await this.call('POST', '/api/me/pseudo', { pseudo });
    if (code === 200) { if (this.account) this.account.pseudo = json.pseudo; return 'ok'; }
    return code === 409 ? 'taken' : code === 422 ? 'forbidden' : code === 400 ? 'invalid' : 'error';
  },
  /** Envoie le pseudo s'il a changé, puis la partie : ok, taken, forbidden, rejected ou error. */
  async submit(id, pseudo, score, duration, jumps) {
    if (pseudo && pseudo !== profile.syncedPseudo) {
      const p = await this.setPseudo(pseudo);
      if (p === 'taken' || p === 'forbidden') return p;
      if (p !== 'ok') return p === 'invalid' ? 'rejected' : 'error';
      profile.syncedPseudo = pseudo;
    }
    if (score <= 0) return 'ok';
    const { code } = await this.call('POST', '/api/scores', { score, duration, jumps });
    if (code >= 200 && code < 300) return 'ok';
    if (code >= 400 && code < 500) return 'rejected';
    return 'error';
  },
  async fetchBoard(limit, me, period) {
    const { code, json } = await this.call('GET', `/api/top?limit=${limit}&period=${period}`);
    if (code !== 200) return null;
    return { top: json.top.map((e) => ({ pseudo: e.pseudo, best: e.best, me: !!e.me })), myRank: json.me ? json.me.rank : null };
  },
  async checkPseudo(name, me) {
    const { code, json } = await this.call('GET', `/api/pseudo?name=${encodeURIComponent(name)}`);
    return code === 200 ? json.available !== false : null;
  },
  async deleteAccount() {
    const { code } = await this.call('POST', '/api/me/delete', {});
    if (code !== 200) return false;
    this.account = null;
    for (const k of ['token', 'friend_code', 'pseudo', 'synced_pseudo']) store.del(k);
    return true;
  },
  // ---------- Amis ----------
  /** {friends, requests (demandes reçues, à valider), sent (demandes envoyées, en attente)} ou null hors connexion. */
  async friends() {
    // v=2 : dit au serveur que cette version sait valider les demandes d'ami
    const { code, json } = await this.call('GET', '/api/friends?v=2');
    return code === 200 ? { friends: json.friends || [], requests: json.requests || [], sent: json.sent || [] } : null;
  },
  /** {ok, pseudo, pending (vrai = demande envoyée, l'ami doit l'accepter)} ou {error: unknown | self | full | offline} */
  async addFriend(friendCode) {
    const { code, json } = await this.call('POST', '/api/friends', { code: friendCode, v: 2 });
    if (code === 200) return { ok: true, pseudo: json.pseudo, pending: !!json.pending };
    return { error: code === 404 ? 'unknown' : code === 400 ? 'self' : code === 409 ? 'full' : 'offline' };
  },
  /** Répond à une demande d'ami reçue : ok, full (trop d'amis), gone (demande disparue) ou error. */
  async answerFriend(friendCode, accept) {
    const { code } = await this.call('POST', '/api/friends/answer', { code: friendCode, accept });
    return code === 200 ? 'ok' : code === 409 ? 'full' : code === 404 ? 'gone' : 'error';
  },
  async removeFriend(friendCode) { return (await this.call('POST', '/api/friends/remove', { code: friendCode })).code === 200; },
  /** Échelle des scores du classement mondial ({scores, total}) : place en direct pendant une partie. */
  async ladder(limit) {
    const { code, json } = await this.call('GET', `/api/ladder?limit=${limit}`);
    return code === 200 ? json : null;
  },
  // ---------- Duels ----------
  /** Victoires, défaites et égalités, au total et par adversaire ({total, opponents}). */
  async duelStats() {
    const { code, json } = await this.call('GET', '/api/duels/stats');
    return code === 200 ? json : null;
  },
  async duels() {
    const { code, json } = await this.call('GET', '/api/duels');
    return code === 200 ? json.duels : null;
  },
  /** Réponse du serveur : {code, json} (json = le duel à jour quand code = 200). */
  challenge(friendCode, attempts, hours, stake, look) { return this.call('POST', '/api/duels', { code: friendCode, attempts, hours, stake, look }); },
  answer(duelId, accept, look) { return this.call('POST', '/api/duels/answer', { duel: duelId, accept, look }); },
  startTry(duelId, look) { return this.call('POST', '/api/duels/start', { duel: duelId, look }); },
  sendTry(duelId, score, duration, jumps) { return this.call('POST', '/api/duels/score', { duel: duelId, score, duration, jumps }); },
};
