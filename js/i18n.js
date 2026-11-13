'use strict';
// Traductions (équivalent de I18n.kt). Un fichier JSON par langue dans lang/ (copie du dossier
// langues/ du dépôt) ; le français sert de secours pour une clé absente.

const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'it', 'ru', 'pl', 'tr', 'id', 'ja', 'ko', 'zh'];
const LANG_AUTO = 'auto';

const I18n = {
  files: {},
  lang: 'fr',
  /** Langue réellement utilisée pour un réglage (« auto » = langue du navigateur, anglais sinon). */
  resolve(pref) {
    if (LANGUAGES.includes(pref)) return pref;
    const nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])
      .map((l) => { const c = String(l).slice(0, 2).toLowerCase(); return c === 'in' ? 'id' : c; });
    return nav.find((l) => LANGUAGES.includes(l)) || 'en';
  },
  async loadAll() {
    await Promise.all(LANGUAGES.map(async (code) => {
      try { this.files[code] = await (await fetch('lang/' + code + '.json', { cache: 'no-cache' })).json(); } catch (e) { this.files[code] = null; }
    }));
  },
  use(pref) {
    this.lang = this.resolve(pref);
    if (!this.files[this.lang]) this.lang = 'fr';
    document.documentElement.lang = this.lang;
    // Textes de la page HTML (fenêtre du pseudo, message d'erreur)
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = tr(el.dataset.i18nPlaceholder);
    for (const el of document.querySelectorAll('[data-i18n-content]')) el.setAttribute('content', tr(el.dataset.i18nContent));
    for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', tr(el.dataset.i18nLabel));
  },
  nameOf(code) { return (this.files[code] && this.files[code]._nom) || code; },
};

/** Texte traduit de la clé [key] ; {n}, {name}… remplacés par les valeurs de [args]. */
function tr(key, args) {
  const cur = I18n.files[I18n.lang], fb = I18n.files.fr;
  let s = (cur && cur[key]) || (fb && fb[key]) || key;
  if (args) for (const k in args) s = s.split('{' + k + '}').join(String(args[k]));
  return s;
}

function yesNo(b) { return tr(b ? 'common.yes' : 'common.no'); }

// Caractère chinois ou japonais (on peut couper la ligne avant ou après, ces langues n'ont pas d'espaces)
function isCjk(cp) { return (cp >= 0x3000 && cp <= 0x30FF) || (cp >= 0x3400 && cp <= 0x4DBF) || (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0xFF00 && cp <= 0xFFEF); }
const NO_LINE_START = '。、，．！？：；」』）】〉》ー…・!?:;,.%)»', NO_LINE_END = '「『（【〈《(«';

/** Morceaux d'un paragraphe pour le retour à la ligne : [texte, espace avant] (équivalent de wrapPieces en Kotlin). */
function wrapPieces(para) {
  const out = [];
  para.split(' ').forEach((word, wi) => {
    let space = wi > 0, cur = '', prev = null;
    for (const ch of word) {
      const cp = ch.codePointAt(0);
      if (cur && (isCjk(cp) || isCjk(prev.codePointAt(0))) && !NO_LINE_START.includes(ch) && !NO_LINE_END.includes(prev)) {
        out.push([cur, space]); cur = ''; space = false;
      }
      cur += ch; prev = ch;
    }
    out.push([cur, space]);
  });
  return out;
}
