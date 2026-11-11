'use strict';
// Plateformes (équivalent de Platform.kt).

const Kind = { NORMAL: 'normal', CRUMBLY: 'crumbly', TRAMPOLINE: 'trampoline', MINI: 'mini', MOVING: 'moving', ICE: 'ice' };

/** Dessus de bloc clair (blanc, jaune…) : les marques blanches y sont illisibles, on les dessine en sombre. */
const lightTop = (c) => Color.red(c) * 0.3 + Color.green(c) * 0.59 + Color.blue(c) * 0.11 > 195;

class Platform {
  constructor(baseX, baseZ, half, round, color, kind = Kind.NORMAL, moveAlongX = true, island = 0) {
    this.island = island; this.mega = false;
    this.baseX = baseX; this.baseZ = baseZ; this.half = half; this.round = round;
    this.kind = kind; this.moveAlongX = moveAlongX; this.baseColor = color;
    this.moveAmp = 0.8; this.movePhase = rnd() * 6.283; this.moveSpeed = 1.6; this.offset = 0; this.frozen = false;
    this.coin = 0; this.heart = false; this.bolt = false; this.finish = false; this.material = null; this.golden = false;
    this.crumbleT = -1; this.crumbleDur = 2; this.crumbleSafe = false; this.dropY = 0; this.dropV = 0;
    this.bounce = 0;
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
  }

  contains(x, z) {
    if (this.collapsed || this.island === PL_VOID || this.island === PL_TRUNK || this.island === PL_HOLE) return false;
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
    canvas.save();
    let sh = 0;
    if (this.crumbleT >= 0 && !this.collapsed) {
      const f = clamp(this.crumbleT / this.crumbleDur, 0, 1);
      sh = Math.sin(time * 55) * k * (0.015 + 0.05 * f);
    }
    canvas.translate(sx(this.cx, this.cz) + sh, sy(this.cx, 0, this.cz) + this.dropY * k);
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
    if (this.island === PL_JELLY) { drawJelly(canvas, this); drawCenterMark(canvas, Color.parseColor('#B0126E')); canvas.restore(); return; }
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
      st.color = lightTop(this.baseColor) ? Color.argb(215, 20, 24, 38) : Color.argb(150, 255, 255, 255); st.strokeWidth = k * 0.04;
      canvas.drawPath(this.arrowPath, st);
      drawTopButton(canvas, this);
    } else if (this.kind === Kind.ICE) drawIceButton(canvas);
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
    if (this.heart) this.drawHeartPickup(canvas); else if (this.bolt) this.drawBoltPickup(canvas); else if (this.coin > 0) this.drawCoin(canvas);
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
