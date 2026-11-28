'use strict';
// Plateformes (équivalent de Platform.kt).

const Kind = { NORMAL: 'normal', CRUMBLY: 'crumbly', TRAMPOLINE: 'trampoline', MINI: 'mini', MOVING: 'moving', ICE: 'ice' };

/**
 * Dessus de bloc clair : une flèche blanche s'y voit mal, on la dessine en gris foncé. Le seuil couvre le blanc,
 * le jaune, le doré, la glace, mais aussi les tons moyens (vert clair, orange, bleu clair) : seuls les blocs
 * franchement soutenus (violet, rose, sarcelle) gardent une flèche blanche.
 */
const lightTop = (c) => Color.red(c) * 0.3 + Color.green(c) * 0.59 + Color.blue(c) * 0.11 > 150;
const ARROW_DARK = Color.argb(215, 62, 68, 82);

/** Durée de l'entrée en scène d'un bloc (s) et distance d'où il arrive (unités, vers le bas). */
const RISE_TIME = 0.5, RISE_DIST = 4.5;

class Platform {
  constructor(baseX, baseZ, half, round, color, kind = Kind.NORMAL, moveAlongX = true, island = 0) {
    this.island = island; this.mega = false;
    this.baseX = baseX; this.baseZ = baseZ; this.half = half; this.round = round;
    this.kind = kind; this.moveAlongX = moveAlongX; this.baseColor = color;
    this.moveAmp = 0.8; this.movePhase = rnd() * 6.283; this.moveSpeed = 1.6; this.offset = 0; this.frozen = false;
    this.coin = 0; this.heart = false; this.bolt = false; this.fest = null; this.bats = null; this.finish = false; this.material = null; this.golden = false;
    this.crumbleT = -1; this.crumbleDur = 2; this.crumbleSafe = false; this.dropY = 0; this.dropV = 0;
    // Entrée en scène (monte d'en bas avec un petit rebond) et sortie (tombe vers le bas) : purement visuel
    this.riseT = 0; this.leaveY = 0; this.leaveV = 0;
    // Bloc retenu hors de l'écran : un imprévu va arriver (surprise.js, holdNextForSurprise)
    this.held = false;
    this.bounce = 0;
    // Chapitre de l'Aventure dont le bloc porte le décor (0 = aucun), nuage illusoire du chapitre 6 (chapterthemes.js)
    this.theme = 0; this.blink = false;
    this.topPaint = P({ color: shade(color, 1.08) });
    this.leftPaint = P({ color: shade(color, 0.82) });
    this.rightPaint = P({ color: shade(color, 0.62) });
    this.markPaint = P({ color: shade(color, 0.9) });
    this.detailPaint = P();
    this.strokePaint = P({ style: Style.STROKE, strokeJoin: 'round', strokeCap: 'round' });
    this.topPath = new Path(); this.leftPath = new Path(); this.rightPath = new Path();
    this.crackPath = new Path(); this.arrowPath = new Path();
    this.topOval = new RectF(); this.sideRect = new RectF(); this.bottomOval = new RectF();
    this.markOval = new RectF(); this.oval = new RectF();
    const d = platformDepth;
    if (round) {
      const rx = 1.2247449 * k * half, ry = 0.70710677 * k * half, dp = d * k;
      this.topOval.set(-rx, -ry, rx, ry);
      this.sideRect.set(-rx, 0, rx, dp);
      this.bottomOval.set(-rx, dp - ry, rx, dp + ry);
      this.leftPaint.shader = new LinearGradient(-rx, 0, rx, 0, shade(color, 0.88), shade(color, 0.55));
    } else {
      const a = half;
      quad(this.topPath, -a, 0, -a, a, 0, -a, a, 0, a, -a, 0, a);
      quad(this.rightPath, -a, 0, -a, a, 0, -a, a, -d, -a, -a, -d, -a);
      quad(this.leftPath, -a, 0, a, -a, 0, -a, -a, -d, -a, -a, -d, a);
    }
    if (kind === Kind.CRUMBLY) {
      for (let i = 0; i < 4; i++) {
        const angle = (i + rnd() * 0.6) * (Math.PI / 2);
        this.crackPath.moveTo(0, 0);
        let r = 0, a2 = angle;
        while (r < half * 0.8) {
          r += half * (0.18 + rnd() * 0.12);
          a2 += (rnd() - 0.5) * 0.9;
          const rr = Math.min(r, half * 0.85);
          const dx = Math.cos(a2) * rr, dz = Math.sin(a2) * rr;
          this.crackPath.lineTo(isoX(dx, dz), isoY(dx, 0, dz));
        }
      }
    }
    if (kind === Kind.MOVING) {
      const l = half * 0.6, hh = half * 0.2;
      const p = (t, side) => { const wx = moveAlongX ? t : side, wz = moveAlongX ? side : t; return [isoX(wx, wz), isoY(wx, 0, wz)]; };
      const [x0, y0] = p(-l, 0), [x1, y1] = p(l, 0);
      const ap = this.arrowPath;
      ap.moveTo(x0, y0); ap.lineTo(x1, y1);
      let [a1x, a1y] = p(l - hh, hh), [a2x, a2y] = p(l - hh, -hh);
      ap.moveTo(a1x, a1y); ap.lineTo(x1, y1); ap.lineTo(a2x, a2y);
      [a1x, a1y] = p(-l + hh, hh); [a2x, a2y] = p(-l + hh, -hh);
      ap.moveTo(a1x, a1y); ap.lineTo(x0, y0); ap.lineTo(a2x, a2y);
    }
    const m = 0.13;
    this.markOval.set(-1.2247449 * k * m, -0.70710677 * k * m, 1.2247449 * k * m, 0.70710677 * k * m);
  }

  get cx() { return this.baseX + (this.kind === Kind.MOVING && this.moveAlongX ? this.offset : 0); }
  get cz() { return this.baseZ + (this.kind === Kind.MOVING && !this.moveAlongX ? this.offset : 0); }
  get crumbly() { return this.kind === Kind.CRUMBLY; }
  get collapsed() { return this.dropY > 0; }
  get farDepth() { return this.round ? this.cx + this.cz + this.half * 1.4142135 : this.cx + this.cz + 2 * this.half; }

  update(dt) {
    if (this.kind === Kind.MOVING && !this.frozen) { this.movePhase += dt * this.moveSpeed; this.offset = Math.sin(this.movePhase) * this.moveAmp; }
    if (this.bounce > 0) this.bounce = Math.max(0, this.bounce - dt * 4);
    if (this.riseT < RISE_TIME && !this.held) this.riseT = Math.min(RISE_TIME, this.riseT + dt);
  }

  /** Décalage vers le bas (unités) pendant l'entrée en scène : arrive d'en bas, dépasse un peu, se pose. */
  get riseOffset() {
    if (this.riseT >= RISE_TIME) return 0;
    const t = clamp(this.riseT / RISE_TIME, 0, 1), c1 = 1.4, u = t - 1;
    return RISE_DIST * (1 - (1 + (c1 + 1) * u * u * u + c1 * u * u));
  }

  /** Opacité d'un nuage illusoire : plein 2 s, s'efface, fantôme 0,4 s, revient (cycle de 3 s), comme Platform.kt. */
  blinkAlpha() {
    if (!this.blink || this.frozen) return 1;
    const u = (((time + this.movePhase) % 3) + 3) % 3;
    if (u < 2) return 1;
    if (u < 2.3) return 1 - (u - 2) / 0.3 * 0.85;
    if (u < 2.7) return 0.15;
    return 0.15 + (u - 2.7) / 0.3 * 0.85;
  }

  contains(x, z) {
    if (this.collapsed || this.island === PL_VOID || this.island === PL_TRUNK || this.island === PL_HOLE) return false;
    if (this.blink && this.blinkAlpha() < 0.5) return false;   // nuage effacé : on passe au travers
    return this.within(x, z);
  }

  /** Le point (x, z) est au-dessus du bloc, qu'il soit visible ou non. */
  within(x, z) {
    const dx = x - this.cx, dz = z - this.cz;
    return this.round ? dx * dx + dz * dz <= this.half * this.half : Math.abs(dx) <= this.half && Math.abs(dz) <= this.half;
  }

  edgeMargin(x, z) {
    const dx = x - this.cx, dz = z - this.cz;
    return this.round ? this.half - Math.sqrt(dx * dx + dz * dz) : this.half - Math.max(Math.abs(dx), Math.abs(dz));
  }

  flatOval(r, dy = 0) {
    this.oval.set(-1.2247449 * k * r, -0.70710677 * k * r + dy, 1.2247449 * k * r, 0.70710677 * k * r + dy);
  }

  draw(canvas) {
    if (this.held) return;
    // Bloc cristal du mode libre : toujours un peu transparent, pour qu'on voie qu'il n'est pas solide comme les autres
    const ghost = this.blinkAlpha() * (this.blink && this.theme === 0 ? 0.82 : 1);
    if (ghost < 1) canvas.setAlphaMul(ghost);
    this.drawSolid(canvas);
    if (ghost < 1) canvas.setAlphaMul(1);
  }

  drawSolid(canvas) {
    canvas.save();
    let sh = 0;
    if (this.crumbleT >= 0 && !this.collapsed) {
      const f = clamp(this.crumbleT / this.crumbleDur, 0, 1);
      sh = Math.sin(time * 55) * k * (0.015 + 0.05 * f);
    }
    canvas.translate(sx(this.cx, this.cz) + sh, sy(this.cx, 0, this.cz) + (this.dropY + this.leaveY + this.riseOffset) * k);
    // Fusée, bloc spatial ou méga pièce dans le vide (voir space.js)
    if (this.island === PL_ROCKET) {
      const [ox, oy] = rocketOffset(this);
      canvas.translate(ox, oy);
      drawRocketPlatform(canvas, this);
      canvas.restore();
      return;
    }
    if (this.island === PL_HELI) {
      canvas.translate(0, heliOffset(this));
      drawHeliPlatform(canvas, this);
      canvas.restore();
      return;
    }
    // Trou noir ou trou blanc (voyage.js) : la méga pièce flotte au-dessus du trou blanc
    if (this.island === PL_BLACKHOLE || this.island === PL_WHITEHOLE) {
      drawVoyageHole(canvas, this);
      if (this.heart) this.drawHeartPickup(canvas); else if (this.coin > 0) this.drawCoin(canvas, false);
      canvas.restore();
      return;
    }
    if (this.island === PL_ROOF || this.island === PL_TNT || this.island === PL_ALIEN || this.island === PL_PAD) {
      if (this.island === PL_ALIEN) drawAlienRock(canvas, this);
      else if (this.island === PL_PAD) drawPad(canvas, this);
      else drawRoof(canvas, this);
      // Rond du centre (zone du parfait) sur toutes les surfaces où l'on atterrit (pas sur le baril de TNT, qui explose)
      if (this.island !== PL_TNT) drawCenterMark(canvas, Color.parseColor(this.island === PL_ALIEN ? '#4A1F73' : this.island === PL_PAD ? '#1E5C46' : '#2E333D'));
      if (this.heart) this.drawHeartPickup(canvas); else if (this.coin > 0) this.drawCoin(canvas, this.island !== PL_TNT);
      canvas.restore();
      return;
    }
    if (this.island === PL_JELLY) { drawJelly(canvas, this); drawCenterMark(canvas, Color.parseColor('#B0126E')); if (this.coin > 0) this.drawCoin(canvas, false); canvas.restore(); return; }
    if (this.island === PL_BARREL || this.island === PL_PLANT) {
      if (this.island === PL_PLANT) drawPlant(canvas, this); else drawBarrel(canvas, this);
      if (this.heart) this.drawHeartPickup(canvas); else if (this.coin > 0) this.drawCoin(canvas, this.island !== PL_PLANT);
      canvas.restore();
      return;
    }
    if (this.island === PL_HOLE) {
      drawHole(canvas, this);
      if (this.coin > 0) this.drawCoin(canvas, false);
      canvas.restore();
      return;
    }
    if (this.island === PL_CORAL || this.island === PL_WHALE || this.island === PL_FLOE) {
      if (this.island === PL_CORAL) drawCoralRock(canvas, this);
      else if (this.island === PL_WHALE) drawWhalePlatform(canvas, this);
      else if (this.kind === Kind.ICE) drawIceBlock(canvas, this);
      else drawSnowFloe(canvas, this);
      if (this.kind === Kind.ICE) drawIceButton(canvas);
      else drawCenterMark(canvas, Color.parseColor(this.island === PL_CORAL ? '#7A3B2E' : this.island === PL_WHALE ? '#22405E' : '#5F8DB0'));
      if (this.heart) this.drawHeartPickup(canvas); else if (this.coin > 0) this.drawCoin(canvas, this.island !== PL_WHALE);
      canvas.restore();
      return;
    }
    if (this.island === PL_TRUNK) {
      drawGiantTree(canvas);
      if (this.coin > 0) this.drawCoin(canvas, false);
      canvas.restore();
      return;
    }
    if (this.island === PL_NEST) {
      drawNest(canvas, this);
      drawCenterMark(canvas, Color.parseColor('#4A2E14'));
      if (this.heart) this.drawHeartPickup(canvas); else if (this.coin > 0) this.drawCoin(canvas);
      canvas.restore();
      return;
    }
    if (this.island === PL_VOID) {
      drawVoidCoin(canvas, this);
      if (this.coin > 0) this.drawCoin(canvas, false);
      canvas.restore();
      return;
    }
    // Chauves-souris sous le bloc : dessinées avant lui, le haut du rocher passe derrière (bats.js)
    if (this.bats) drawBatRoost(canvas, this.bats);
    if (this.nest) drawHornetNest(canvas, this.nest);
    if (this.island === PL_SPACE) drawSpaceBlock(canvas, this);
    else if (this.kind === Kind.ICE) drawIceBlock(canvas, this);
    else if (this.island > 0) drawIslandPillar(canvas, this, sy(this.cx, 0, this.cz));
    else if (this.round) drawTexturedRound(canvas, this, this.material || lookBlock);
    else drawTexturedBox(canvas, this, this.material || lookBlock);
    const dp = this.detailPaint, st = this.strokePaint;
    if (this.kind === Kind.TRAMPOLINE) {
      const sink = this.bounce * k * 0.12;
      this.flatOval(this.half * 0.72); dp.color = Color.parseColor('#E53950'); canvas.drawOval(this.oval, dp);
      this.flatOval(this.half * 0.6, sink); dp.color = Color.parseColor('#2E3A59'); canvas.drawOval(this.oval, dp);
      st.color = Color.argb(90, 255, 255, 255); st.strokeWidth = k * 0.02;
      this.flatOval(this.half * 0.4, sink); canvas.drawOval(this.oval, st);
      // Rond du centre (zone du parfait), qui s'enfonce avec la toile
      drawCenterMark(canvas, Color.parseColor('#8FA3C8'), sink);
    } else if (this.kind === Kind.MINI) {
      drawTopButton(canvas, this);
      // « +2 » juste au-dessus du rond
      textPaint.textSize = k * 0.28;
      canvas.drawText('+' + Scoring.MINI_BONUS, 0, -k * 0.3 - (textPaint.descent() + textPaint.ascent()) / 2, textPaint);
    } else if (this.kind === Kind.MOVING) {
      // Flèche blanche, ou noire sur un bloc clair (blanc, jaune) où le blanc ne se voyait pas
      st.color = lightTop(this.baseColor) ? ARROW_DARK : Color.argb(170, 255, 255, 255); st.strokeWidth = k * 0.04;
      canvas.drawPath(this.arrowPath, st);
      drawTopButton(canvas, this);
    } else if (this.kind === Kind.ICE) { const hk = chapterHooks(this.theme); if (hk && hk.iceTopButton) drawTopButton(canvas, this); else drawIceButton(canvas); }
    else drawTopButton(canvas, this);
    if (this.golden) {
      // Bloc doré : petites étincelles qui scintillent sur le dessus
      for (let i = 0; i < 3; i++) {
        const tw = Math.abs(Math.sin(time * 3 + i * 2.1)), x = (i - 1) * this.half * 0.55 * 1.2247449 * k;
        const y = ((i % 2) - 0.5) * this.half * 0.5 * 0.70710677 * k, r = k * (0.05 + 0.06 * tw);
        st.color = Color.argb(Math.round(220 * tw), 255, 250, 220); st.strokeWidth = k * 0.025;
        canvas.drawLine(x - r, y, x + r, y, st); canvas.drawLine(x, y - r, x, y + r, st);
      }
    }
    if (this.crumbly) {
      const f = this.crumbleT < 0 ? 0 : clamp(this.crumbleT / this.crumbleDur, 0, 1);
      st.color = Color.argb(Math.floor(110 + 145 * f), 60, 45, 40); st.strokeWidth = k * 0.035;
      canvas.drawPath(this.crackPath, st);
    }
    if (this.theme > 0) drawChapterDeco(canvas, this);
    else if (this.blink) drawCrystalDeco(canvas, this);
    if (this.heart) this.drawHeartPickup(canvas); else if (this.bolt) this.drawBoltPickup(canvas); else if (this.fest) drawFestThingPickup(canvas, this); else if (this.coin > 0) this.drawCoin(canvas);
    if (this.finish) drawFinishNest(canvas, this);
    if (this.mega) drawMegaHint(canvas, this);
    canvas.restore();
  }

  drawHeartPickup(canvas) {
    const beat = 1 + 0.12 * Math.abs(Math.sin(time * 5));
    const cy = isoY(0, 0.65, 0) + Math.sin(time * 3) * k * 0.05;
    const dp = this.detailPaint;
    this.flatOval(0.16); dp.color = Color.argb(50, 0, 0, 0); canvas.drawOval(this.oval, dp);
    dp.color = Color.argb(90, 255, 120, 160); canvas.drawCircle(0, cy, k * 0.3 * beat, dp);
    dp.color = Color.parseColor('#FF4D8D'); drawHeart(canvas, 0, cy, k * 0.16 * beat, dp);
  }

  /** Éclair d'énergie qui flotte et pulse au-dessus du centre (mode libre). */
  drawBoltPickup(canvas) {
    const beat = 1 + 0.1 * Math.abs(Math.sin(time * 5));
    const cy = isoY(0, 0.7, 0) + Math.sin(time * 3) * k * 0.05;
    const dp = this.detailPaint;
    this.flatOval(0.16); dp.color = Color.argb(50, 0, 0, 0); canvas.drawOval(this.oval, dp);
    const bw = k * 0.42 * beat, bh = k * 0.62 * beat;
    drawBigBolt(canvas, -bw / 2, cy - bh / 2, bw, bh);
  }

  drawCoin(canvas, shadow = true) {
    const big = this.coin > 1, megaCoin = this.coin >= MEGA_COIN;
    const r = k * (megaCoin ? 0.42 : big ? 0.24 : 0.17);
    const bob = Math.sin(time * 3) * k * 0.05;
    const cy = isoY(0, megaCoin ? 0.85 : 0.55, 0) + bob;
    // Aventure : bulle d'oxygène, cristal alien, mouton, glaçon… à la place de la pièce (chapterthemes.js)
    if (this.coin === 1 && drawChapterPickup(canvas, cy, shadow)) return;
    const spin = Math.max(0.12, Math.abs(Math.cos(time * 3.2)));
    const dp = this.detailPaint, st = this.strokePaint;
    if (shadow) { this.flatOval(0.14); dp.color = Color.argb(50, 0, 0, 0); canvas.drawOval(this.oval, dp); }
    this.oval.set(-r * spin, cy - r, r * spin, cy + r);
    dp.color = Color.parseColor(big ? '#FFB300' : '#FFC93C'); canvas.drawOval(this.oval, dp);
    st.color = Color.parseColor('#C98A00'); st.strokeWidth = k * 0.025; canvas.drawOval(this.oval, st);
    if (megaCoin) {
      // Halo doré qui pulse autour de la méga pièce
      dp.color = Color.argb(Math.round(70 + 50 * Math.abs(Math.sin(time * 4))), 255, 220, 90);
      canvas.drawCircle(0, cy, r * 1.6, dp);
    }
    if (big && spin > 0.5) {
      textPaint.textSize = r * (megaCoin ? 0.8 : 1.1);
      canvas.drawText(megaCoin ? String(this.coin) : '5', 0, cy - (textPaint.descent() + textPaint.ascent()) / 2, textPaint);
    }
  }
}

// ---------- Bloc cristal du mode libre : il apparaît et disparaît (même cycle que les nuages du chapitre 6) ----------
const CRYSTAL_COLOR = Color.parseColor('#9C7FE8');
const crystalStroke = new Paint({ style: Style.STROKE, strokeCap: 'round' });

/**
 * Contour du dessus en tirets lumineux, qui sert de jauge : les tirets s'éteignent un à un pendant que le bloc est
 * plein, rougissent et clignotent juste avant qu'il s'efface, puis se rallument quand il revient. Une fois qu'on est
 * posé dessus, il ne disparaît plus : le contour reste allumé, calme.
 */
function drawCrystalDeco(canvas, pl) {
  const a = pl.half * 0.82, xR = 2 * a * 0.8660254 * k, yF = a * k;
  const u = (((time + pl.movePhase) % 3) + 3) % 3;
  const left = pl.frozen ? 1 : u < 2 ? 1 - u / 2 : u < 2.7 ? 0 : (u - 2.7) / 0.3;
  const warn = !pl.frozen && u >= 1.4 && u < 2;
  const corners = [[-xR, 0], [0, -yF], [xR, 0], [0, yF]];
  const N = 4, total = N * 4, lit = Math.ceil(left * total - 1e-6);
  const pulse = Math.abs(Math.sin(time * 14));
  // Deux passes : un halo large et doux, puis le tiret net par-dessus
  for (let pass = 0; pass < 2; pass++) {
    crystalStroke.strokeWidth = k * (pass === 0 ? 0.16 : 0.07);
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = corners[e], [x1, y1] = corners[(e + 1) % 4];
      for (let i = 0; i < N; i++) {
        const idx = e * N + i, t0 = (i + 0.16) / N, t1 = (i + 0.84) / N;
        const on = idx < lit;
        if (pass === 0) { if (!on) continue; crystalStroke.color = warn ? Color.argb(Math.round(70 + 60 * pulse), 255, 80, 110) : Color.argb(70, 220, 210, 255); }
        else if (warn) crystalStroke.color = on ? Color.argb(Math.round(190 + 65 * pulse), 255, 90, 120) : Color.argb(70, 255, 255, 255);
        else crystalStroke.color = on ? Color.argb(245, 255, 255, 255) : Color.argb(70, 255, 255, 255);
        canvas.drawLine(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, crystalStroke);
      }
    }
  }
  // Petits éclats de cristal qui scintillent sur le dessus
  for (let i = 0; i < 3; i++) {
    const tw = Math.abs(Math.sin(time * 2.5 + i * 2.1 + pl.movePhase)), x = (i - 1) * xR * 0.45, y = ((i % 2) - 0.5) * yF * 0.6, r = k * (0.04 + 0.05 * tw);
    crystalStroke.strokeWidth = k * 0.02; crystalStroke.color = Color.argb(Math.round(200 * tw), 240, 235, 255);
    canvas.drawLine(x - r, y, x + r, y, crystalStroke); canvas.drawLine(x, y - r, x, y + r, crystalStroke);
  }
}
