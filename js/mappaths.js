'use strict';
// Tracé de la carte de chaque chapitre (équivalent de MapPaths.kt) : le chapitre 1 garde ses 5 rangées de 3 nids,
// les autres suivent chacun leur propre sentier (vague, spirale, zigzag, cadran d'horloge, pyramide, éclair…).
// Les 15 niveaux sont répartis à distance égale le long du sentier, et la taille des nids s'adapte pour qu'ils ne
// se touchent jamais.

/**
 * Sentier de chaque chapitre, en coordonnées réduites (u : 0 à gauche → 1 à droite, v : 0 en bas → 1 en haut).
 * s = lissé (courbe passant par les points) ; sinon lignes droites. Le dernier point (le boss) est toujours en haut,
 * et pas collé au bord gauche (le héros du chapitre l'attend à sa gauche).
 */
// (pour chaque chapitre : chapitres/chapitres.json, « carte.chemin », lu par chapterDef)

/** Points du sentier (u, v à la suite) d'un chapitre ; les spirales et le cadran sont calculés. */
function mapPathPoints(season) {
  const out = [];
  if (season === 3) {
    // Spirale qui part du centre et s'ouvre jusqu'en haut
    const turns = 2.5, dir = 1;
    for (let i = 0; i <= 90; i++) {
      const t = i / 90, a = Math.PI / 2 - dir * turns * Math.PI * (1 - t), r = 0.1 + 0.9 * t;
      out.push(0.5 + 0.5 * r * Math.cos(a), 0.5 + 0.5 * r * Math.sin(a));
    }
  } else if (season === 9) {
    // Cadran : on part d'une heure, on fait le tour dans le sens des aiguilles, puis on sort vers le haut
    for (let i = 0; i <= 70; i++) {
      const a = (65 - 310 * i / 70) * Math.PI / 180;
      out.push(0.5 + 0.5 * Math.cos(a), 0.42 + 0.42 * Math.sin(a));
    }
    out.push(0.5, 1);
  } else {
    const d = chapterDef(season).path || chapterDef(2).path, p = d.p, n = p.length / 2;
    if (!d.s) return p.slice();
    // Catmull-Rom : la courbe passe par chaque point
    const P = (k) => { const j = clamp(k, 0, n - 1); return [p[j * 2], p[j * 2 + 1]]; };
    for (let k = 0; k < n - 1; k++) {
      const [x0, y0] = P(k - 1), [x1, y1] = P(k), [x2, y2] = P(k + 1), [x3, y3] = P(k + 2);
      for (let s = 0; s < 16; s++) {
        const t = s / 16, t2 = t * t, t3 = t2 * t;
        out.push(0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
          0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3));
      }
    }
    out.push(p[(n - 1) * 2], p[(n - 1) * 2 + 1]);
  }
  return out;
}

let mapLayoutCache = null, mapLayoutKey = '';

/**
 * Place des 15 nids de la carte : { nodes: [x, y]×15 (niveau 1 d'abord), line: points du sentier en pointillés,
 * r: demi-largeur d'un nid }. Le résultat est gardé tant que la saison et la taille de la zone ne changent pas.
 */
function questMapLayout(season, areaTop, areaBot) {
  const key = season + '|' + w + '|' + areaTop + '|' + areaBot;
  if (mapLayoutCache && key === mapLayoutKey) return mapLayoutCache;
  const N = Quest.LEVELS, rows = Math.ceil(N / 3), rowH = (areaBot - areaTop) / rows;
  const maxR = Math.min(w * 0.13, rowH * 0.42), nodes = [];
  let line, r = maxR, nodeS = null;
  if (season <= 1) {
    for (let n = 1; n <= N; n++) {
      const row = Math.floor((n - 1) / 3), idx = (n - 1) % 3, col = row % 2 === 0 ? idx : 2 - idx;
      nodes.push(w * (0.2 + 0.3 * col) + Math.sin(n * 1.7) * w * 0.025, areaBot - rowH * (row + 0.55) - (col === 1 ? rowH * 0.12 : 0));
    }
    line = nodes.slice();
  } else {
    const yb = areaBot - rowH * 0.55, yt = areaBot - rowH * (rows - 0.45);
    const uv = mapPathPoints(season);
    line = [];
    for (let i = 0; i < uv.length; i += 2) line.push(w * (0.16 + 0.64 * uv[i]), yb + (yt - yb) * uv[i + 1]);
    // Longueur cumulée, puis un nid tous les L / 14
    const m = line.length / 2, acc = [0];
    for (let i = 1; i < m; i++) acc.push(acc[i - 1] + Math.hypot(line[i * 2] - line[i * 2 - 2], line[i * 2 + 1] - line[i * 2 - 1]));
    const L = acc[m - 1];
    const at = (s) => {
      let seg = 1;
      while (seg < m - 1 && acc[seg] < s) seg++;
      const a = acc[seg - 1], b = acc[seg], f = b > a ? clamp((s - a) / (b - a), 0, 1) : 0;
      return [line[seg * 2 - 2] + (line[seg * 2] - line[seg * 2 - 2]) * f, line[seg * 2 - 1] + (line[seg * 2 + 1] - line[seg * 2 - 1]) * f];
    };
    // Écart entre deux nids, un nid étant plus large que haut
    const gap = (p, q) => Math.hypot((q[0] - p[0]) / 2.2, (q[1] - p[1]) / 1.45);
    // Départ : un nid tous les L / 14, puis on fait glisser chaque nid le long du sentier tant que ça l'éloigne
    // de son plus proche voisin (le premier et le dernier restent aux deux bouts)
    const S = [], P = [];
    for (let n = 0; n < N; n++) { S.push(L * n / (N - 1)); P.push(at(S[n])); }
    const nearest = (i, p) => { let d = Infinity; for (let j = 0; j < N; j++) if (j !== i) d = Math.min(d, gap(p, P[j])); return d; };
    for (let it = 0; it < 160; it++) {
      const step = L * 0.025 * (1 - it / 160) + L * 0.001;
      for (let i = 1; i < N - 1; i++) {
        let best = nearest(i, P[i]);
        for (const ds of [-step, step]) {
          const s = clamp(S[i] + ds, S[i - 1] + L * 0.01, S[i + 1] - L * 0.01), p = at(s), d = nearest(i, p);
          if (d > best) { best = d; S[i] = s; P[i] = p; }
        }
      }
    }
    let d = Infinity;
    for (let i = 0; i < N; i++) { nodes.push(P[i][0], P[i][1]); d = Math.min(d, nearest(i, P[i])); }
    nodeS = S;   // position de chaque nid le long du sentier (partie déjà parcourue, mapart.js)
    // Nids aussi grands que possible sans se toucher
    r = Math.min(maxR, d * 0.95);
  }
  mapLayoutCache = { nodes, line, r, nodeS }; mapLayoutKey = key;
  return mapLayoutCache;
}

/** Sentier en pointillés (tirets et trous de 3,5 % de l'écran), le long de la ligne brisée pts. */
function drawDashedPath(canvas, pts, paint) {
  const dash = w * 0.035;
  let on = true, left = dash;
  for (let i = 2; i < pts.length; i += 2) {
    let x0 = pts[i - 2], y0 = pts[i - 1];
    const x1 = pts[i], y1 = pts[i + 1];
    let len = Math.hypot(x1 - x0, y1 - y0);
    while (len > 0) {
      const step = Math.min(left, len), f = step / len;
      const xs = x0 + (x1 - x0) * f, ys = y0 + (y1 - y0) * f;
      if (on) canvas.drawLine(x0, y0, xs, ys, paint);
      x0 = xs; y0 = ys; len -= step; left -= step;
      if (left <= 0) { on = !on; left = dash; }
    }
  }
}
