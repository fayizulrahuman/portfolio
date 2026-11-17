export interface PoseResult {
  s: number;
  x: number;
  y: number;
  u: number;
  isMobile: boolean;
}

export interface FitHeroResult {
  wmLeft: number;
  wmWidth: number;
  badgeLeft: number;
  badgeTop: number;
  scriptLeft: number;
}

export function computePose(
  mode: 'hero' | 'case',
  W: number,
  H: number,
  ticketHeight = 150,
  descHeight = 90
): PoseResult {
  const isMobile = W <= 820;
  const u = isMobile ? W / 430 : Math.min(W / 1440, H / 900);

  if (!isMobile) {
    const cover = Math.max(W / 1440, H / 810);
    if (mode === 'hero') {
      const s = cover;
      return {
        s,
        x: (W - 1440 * s) / 2,
        y: 0,
        u,
        isMobile,
      };
    }
    const top = 66 * u;
    const fit = (H - top - 28 * u) / (762 - 79);
    let s: number;
    let y: number;
    if (fit >= cover) {
      s = cover;
      y = Math.min(0, Math.max(H - 810 * s, top - 79 * s));
    } else {
      s = fit;
      y = top - 79 * fit;
    }
    return {
      s,
      x: (W - 1440 * s) / 2,
      y,
      u,
      isMobile,
    };
  }

  // Phone/tablet <= 820px
  if (mode === 'hero') {
    const s = Math.min(W / 650, (0.62 * H) / 810);
    return {
      s,
      x: W / 2 - 720 * s,
      y: H - 790 * s,
      u,
      isMobile,
    };
  }

  const navH = 0.022 * H + 42 + 22;
  const uiBottom = 62 + ticketHeight + 18 + Math.max(60, descHeight) + 14;
  const s = Math.min((W - 28) / 905, Math.max(0.2, (H - navH - uiBottom) / (762 - 95)));
  return {
    s,
    x: W / 2 - 720 * s,
    y: H - navH - 762 * s,
    u,
    isMobile,
  };
}

export function computeFitHero(W: number, H: number, s: number, x: number, y: number): FitHeroResult {
  const vl = Math.max(0, -x / s);
  const vr = Math.min(1440, (W - x) / s);
  const pad = 18 / s;
  const vb = Math.min(810, (H - y) / s);

  return {
    wmLeft: vl + 0.6 * pad,
    wmWidth: vr - vl - 1.2 * pad,
    badgeLeft: Math.min(986, vr - pad - 417),
    badgeTop: Math.min(-165, vb - 56 / s - 935),
    scriptLeft: vl + pad + 24,
  };
}

export function computePlaybackRate(currentTime: number, duration: number): number {
  if (!duration || duration <= 0) return 1.8;
  const p = Math.max(0, Math.min(1, currentTime / duration));
  return Math.max(1.2, 1.8 + 2.4 * Math.sin(Math.PI * Math.min(p * 1.08, 1)));
}

export function nextCaseIndex(current: number, total: number): number {
  return (current + 1) % total;
}

export function prevCaseIndex(current: number): number | 'hero' {
  if (current <= 0) return 'hero';
  return current - 1;
}

export interface IconParallaxResult {
  tx: number;
  ty: number;
  imgTx: number;
  imgTy: number;
}

export function computeIconParallax(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  maxOffset = 6
): IconParallaxResult {
  if (rect.width <= 0 || rect.height <= 0) {
    return { tx: 0, ty: 0, imgTx: 0, imgTy: 0 };
  }
  const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2));
  const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.5) * 2));
  const tx = Number((nx * maxOffset).toFixed(2));
  const ty = Number((ny * maxOffset).toFixed(2));
  const imgTx = Number((nx * maxOffset * 0.6).toFixed(2));
  const imgTy = Number((ny * maxOffset * 0.6).toFixed(2));
  return { tx, ty, imgTx, imgTy };
}

