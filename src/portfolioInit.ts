import { computeFitHero, computeIconParallax, computePlaybackRate, computePose } from './portfolioCore';
import {
  PORTFOLIO_ASSETS,
  PORTFOLIO_CASES,
  PORTFOLIO_SKILLS,
  filterSkills,
  type SkillCategory,
} from './portfolioData';
import {
  getEmailJsConfig,
  sendContactEmail,
  type ContactFormInput,
} from './emailService';

function byId<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as unknown as T;
}

export function initPortfolio(): void {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = byId<HTMLElement>('stage');
  const frame = byId<HTMLElement>('frame');
  const plate = byId<HTMLImageElement>('plate');
  const wm = byId<SVGSVGElement>('wm');
  const cut = byId<HTMLImageElement>('cut');
  const badge = byId<HTMLElement>('badge');
  const badgeImg = byId<HTMLImageElement>('badgeImg');
  const badgePhoto = byId<HTMLElement>('badgePhoto');
  const badgeHit = byId<HTMLElement>('badgeHit');
  const scriptEl = byId<HTMLElement>('script');
  const trans = byId<HTMLVideoElement>('trans');
  const caseplate = byId<HTMLImageElement>('caseplate');
  const screen = byId<HTMLElement>('screen');
  const flash = byId<HTMLElement>('flash');
  const screenHit = byId<HTMLButtonElement>('screenHit');

  const btnPrev = byId<HTMLButtonElement>('btnPrev');
  const btnNext = byId<HTMLButtonElement>('btnNext');
  const btnExitCase = byId<HTMLButtonElement>('btnExitCase');
  const btnHeroDive = byId<HTMLButtonElement>('btnHeroDive');
  const btnProjectsDive = byId<HTMLButtonElement>('btnProjectsDive');
  const hint = byId<HTMLElement>('hint');

  const mWm = byId<SVGSVGElement>('mWm');
  const mScript = byId<HTMLElement>('mScript');
  const mBadgeWrap = byId<HTMLElement>('mBadgeWrap');

  const ticket = byId<HTMLElement>('ticket');
  const ticketTitle = byId<HTMLElement>('ticketTitle');
  const ticketRows = byId<HTMLElement>('ticketRows');
  const desc = byId<HTMLElement>('desc');
  const descKey = byId<HTMLElement>('descKey');
  const descText = byId<HTMLElement>('descText');
  const descLink = byId<HTMLAnchorElement>('descLink');
  const descNum = byId<HTMLElement>('descNum');

  const screenFallback = byId<HTMLElement>('screenFallback');
  const sfMeta = byId<HTMLElement>('sfMeta');
  const sfIndex = byId<HTMLElement>('sfIndex');
  const sfTitle = byId<HTMLElement>('sfTitle');
  const sfDesc = byId<HTMLElement>('sfDesc');
  const sfHighlights = byId<HTMLElement>('sfHighlights');
  const sfRepo = byId<HTMLElement>('sfRepo');

  const navBrand = byId<HTMLButtonElement>('navBrand');
  const btnLetsTalk = byId<HTMLButtonElement>('btnLetsTalk');
  const navToggle = byId<HTMLButtonElement>('navToggle');
  const mobileDrawer = byId<HTMLElement>('mobileDrawer');
  const navLinks = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-nav-target]'));

  const contactModal = byId<HTMLElement>('contactModal');
  const contactModalClose = byId<HTMLButtonElement>('contactModalClose');

  // Assign local assets
  plate.src = PORTFOLIO_ASSETS.plate;
  cut.src = PORTFOLIO_ASSETS.cut;
  badgeImg.src = PORTFOLIO_ASSETS.badge;
  badgePhoto.style.backgroundImage = `url(${PORTFOLIO_ASSETS.cut}), linear-gradient(180deg, #1b4a34 0%, #7ec9b0 100%)`;
  caseplate.src = PORTFOLIO_ASSETS.casePlate;

  document.querySelectorAll<HTMLImageElement>('[data-brand-logo]').forEach((img) => {
    img.src = PORTFOLIO_ASSETS.logoF;
  });

  // Clone badge for mobile UI
  const mBadge = badge.cloneNode(true) as HTMLElement;
  mBadge.id = 'mBadge';
  mBadge.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  mBadgeWrap.appendChild(mBadge);

  // Build case videos with clean interactive preview fallback when no demo video URL is supplied
  const videoFailed = PORTFOLIO_CASES.map((c) => !c.video);
  const videos: HTMLVideoElement[] = PORTFOLIO_CASES.map((c, idx) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    if (c.video) {
      v.preload = idx === 0 ? 'auto' : 'none';
      v.src = c.video;
      v.addEventListener('error', () => {
        videoFailed[idx] = true;
        v.getAnimations().forEach((a) => a.cancel());
        v.style.opacity = '0';
        if (idx === caseIndex && mode === 'case') {
          screenFallback.classList.add('is-active');
        }
      });
      v.addEventListener('canplay', () => {
        videoFailed[idx] = false;
        if (idx === caseIndex) {
          screenFallback.classList.remove('is-active');
        }
      });
    } else {
      v.preload = 'none';
    }
    screen.insertBefore(v, flash);
    return v;
  });

  let mode: 'hero' | 'case' = 'hero';
  let busy = false;
  let caseIndex = 0;
  let transReady = false;
  let swayAnims: Animation[] = [];
  let heroOutAnims: Animation[] = [];
  let caseAnims: Animation[] = [];
  let lastTriggerTarget: HTMLElement | null = null;
  let pendingCaseTarget = 0;
  let touchStart: { x: number; y: number } | null = null;

  document.body.dataset.mode = 'hero';
  document.body.dataset.case = '0';

  // Fetch transition video as a whole Blob so seeking/rate changes never stall
  (async () => {
    try {
      const res = await fetch(PORTFOLIO_ASSETS.trans);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      trans.src = URL.createObjectURL(blob);
    } catch {
      trans.src = PORTFOLIO_ASSETS.trans;
    }
  })();
  trans.addEventListener(
    'loadeddata',
    () => {
      transReady = true;
    },
    { once: true }
  );

  function setBusy(v: boolean): void {
    busy = v;
    document.body.classList.toggle('busy', v);
  }

  function setActiveNav(target: 'home' | 'about' | 'projects' | 'skills' | 'contact'): void {
    navLinks.forEach((btn) => {
      const match = btn.dataset.navTarget === target;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-current', match ? 'page' : 'false');
    });
  }

  function place(m: 'hero' | 'case') {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const ticketH = ticket.offsetHeight || 150;
    const descH = desc.offsetHeight || 90;
    const p = computePose(m, W, H, ticketH, descH);

    frame.classList.toggle('d-fade', !p.isMobile);
    frame.classList.toggle('m-fade', p.isMobile);
    const isCase = m === 'case';
    frame.classList.toggle('m-case', isCase);
    stage.classList.toggle('m-case', isCase);
    frame.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.s})`;

    if (p.isMobile) {
      const mbw = mBadgeWrap.getBoundingClientRect().width || 0.27 * W;
      document.documentElement.style.setProperty('--mbs', String(mbw / 582));
      document.documentElement.style.setProperty('--th', `${ticket.offsetHeight || 150}px`);
    }
    if (m === 'hero' && !p.isMobile) {
      const f = computeFitHero(W, H, p.s, p.x, p.y);
      wm.style.left = `${f.wmLeft}px`;
      wm.style.width = `${f.wmWidth}px`;
      badge.style.left = `${f.badgeLeft}px`;
      badge.style.top = `${f.badgeTop}px`;
      scriptEl.style.left = `${f.scriptLeft}px`;
    }
    return p;
  }

  function stopSway(): void {
    swayAnims.forEach((a) => a.cancel());
    swayAnims = [];
  }

  function startSway(): void {
    stopSway();
    if (RM) return;
    [badge, mBadge].forEach((b) => {
      swayAnims.push(
        b.animate([{ transform: 'rotate(-1.1deg)' }, { transform: 'rotate(1.1deg)' }], {
          duration: 3200,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        })
      );
    });
  }

  badgeHit.addEventListener('pointerenter', () => {
    if (mode !== 'hero' || busy || RM) return;
    badge.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-6deg)' },
        { transform: 'rotate(4deg)' },
        { transform: 'rotate(-2deg)' },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 1400, easing: 'ease-out', composite: 'add' }
    );
  });

  function clearPre(): void {
    document.querySelectorAll('.pre').forEach((el) => el.classList.remove('pre'));
  }

  function runEntrance(): void {
    if (document.documentElement.dataset.in) return;
    document.documentElement.dataset.in = '1';
    place('hero');

    if (RM) {
      clearPre();
      return;
    }

    const ease = 'cubic-bezier(.2,.8,.2,1)';
    clearPre();

    [wm, mWm].forEach((el) => {
      el.animate(
        [
          { opacity: 0, transform: 'translateY(60px)', clipPath: 'inset(100% 0 0 0)' },
          { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
        ],
        { duration: 1100, delay: 180, easing: ease, fill: 'both' }
      );
    });

    [scriptEl, mScript].forEach((el) => {
      const base = el === mScript ? 'rotate(-7deg)' : 'rotate(-8deg)';
      el.animate(
        [
          { opacity: 0, transform: base, clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, transform: base, clipPath: 'inset(0 0 0 0)' },
        ],
        { duration: 900, delay: 880, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }
      );
    });

    let badgeDone = false;
    [badge, mBadge].forEach((el) => {
      const anim = el.animate(
        [
          { opacity: 0, transform: 'translateY(-120%) rotate(8deg)', offset: 0 },
          { opacity: 1, transform: 'translateY(0) rotate(-3deg)', offset: 0.6 },
          { opacity: 1, transform: 'translateY(0) rotate(1.6deg)', offset: 0.8 },
          { opacity: 1, transform: 'translateY(0) rotate(0deg)', offset: 1 },
        ],
        { duration: 1500, delay: 620, easing: ease, fill: 'both' }
      );
      if (el === badge) {
        anim.finished
          .then(() => {
            if (!badgeDone && mode === 'hero' && !busy) {
              badgeDone = true;
              startSway();
            }
          })
          .catch(() => {});
      }
    });

    hint.animate([{ opacity: 0 }, { opacity: 0.92 }], {
      duration: 600,
      delay: 1450,
      easing: ease,
      fill: 'both',
    });
  }

  const plateReady = new Promise<void>((resolve) => {
    if (plate.complete) return resolve();
    plate.addEventListener('load', () => resolve(), { once: true });
    plate.addEventListener('error', () => resolve(), { once: true });
  });
  const timeout25 = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  Promise.race([Promise.all([document.fonts.ready, plateReady]), timeout25]).then(() => {
    requestAnimationFrame(runEntrance);
  });
  setTimeout(runEntrance, 4000);

  function cancelHeroOutAnims(): void {
    heroOutAnims.forEach((a) => a.cancel());
    heroOutAnims = [];
  }

  function heroOut(): void {
    cancelHeroOutAnims();
    stopSway();
    const dur = RM ? 0 : 380;
    const easeOut = 'cubic-bezier(.5,0,.75,0)';

    [wm, mWm].forEach((el) => {
      heroOutAnims.push(
        el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-40px)' }], {
          duration: dur,
          easing: easeOut,
          fill: 'forwards',
        })
      );
    });
    [scriptEl, mScript].forEach((el) => {
      const base = el === mScript ? 'rotate(-7deg)' : 'rotate(-8deg)';
      heroOutAnims.push(
        el.animate([{ opacity: 1, transform: base }, { opacity: 0, transform: base }], {
          duration: dur,
          easing: easeOut,
          fill: 'forwards',
        })
      );
    });
    [badge, mBadge].forEach((el) => {
      heroOutAnims.push(
        el.animate(
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-110%) rotate(-6deg)' }],
          { duration: dur, easing: easeOut, fill: 'forwards' }
        )
      );
    });
  }

  function fillCase(i: number): void {
    const c = PORTFOLIO_CASES[i];
    caseIndex = i;
    document.body.dataset.case = String(i);
    ticketTitle.textContent = c.title;
    ticketTitle.style.fontSize = '';
    ticketRows.innerHTML = c.rows.map((r) => `<div>${r}</div>`).join('');
    descKey.textContent = c.key;
    descText.textContent = c.text;
    descLink.textContent = '';
    const slashIdx = c.repoLabel.lastIndexOf('/');
    if (slashIdx > 0) {
      descLink.appendChild(document.createTextNode(c.repoLabel.slice(0, slashIdx + 1)));
      descLink.appendChild(document.createElement('wbr'));
      descLink.appendChild(document.createTextNode(c.repoLabel.slice(slashIdx + 1)));
    } else {
      descLink.textContent = c.repoLabel;
    }
    descLink.href = c.repoUrl;
    const numStr = `${String(i + 1).padStart(2, '0')} / ${String(PORTFOLIO_CASES.length).padStart(2, '0')}`;
    descNum.textContent = numStr;
    btnPrev.classList.toggle('dim', i === 0);

    sfMeta.textContent = c.rows.join(' · ');
    sfIndex.textContent = numStr;
    sfTitle.textContent = c.title;
    sfDesc.textContent = c.text;
    sfHighlights.innerHTML = c.highlights.map((h) => `<div class="sf-pill">${h}</div>`).join('');
    sfRepo.textContent = c.repoLabel;
    screenFallback.style.setProperty('--case-accent', c.accent);
    screenFallback.classList.toggle('is-active', Boolean(videoFailed[i]));

    requestAnimationFrame(() => {
      if (ticketTitle.scrollWidth > ticketTitle.clientWidth && ticketTitle.clientWidth > 0) {
        const ratio = ticketTitle.clientWidth / ticketTitle.scrollWidth;
        const currentSize = parseFloat(getComputedStyle(ticketTitle).fontSize);
        ticketTitle.style.fontSize = `${Math.floor(currentSize * ratio * 0.98)}px`;
      }
      if (window.innerWidth <= 820 && mode === 'case') {
        place('case');
      }
    });
  }

  function playOnly(i: number): void {
    videos.forEach((v, idx) => {
      if (idx === i) {
        if (videoFailed[idx] || !PORTFOLIO_CASES[idx]?.video) {
          screenFallback.classList.add('is-active');
          return;
        }
        v.preload = 'auto';
        try {
          v.currentTime = 0;
        } catch {}
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }

  function preloadCase(i: number): void {
    const idx = i % videos.length;
    const target = videos[idx];
    if (target && PORTFOLIO_CASES[idx]?.video && target.preload === 'none') {
      target.preload = 'auto';
      target.load();
    }
  }

  function clearCaseAnims(): void {
    caseAnims.forEach((a) => a.cancel());
    caseAnims = [];
  }

  function caseIn(i: number, first: boolean): void {
    clearCaseAnims();
    fillCase(i);
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    const descKids = Array.from(desc.children) as HTMLElement[];

    if (RM) {
      ticket.style.opacity = '1';
      ticket.style.transform = 'none';
      descKids.forEach((k) => {
        k.style.opacity = '1';
        k.style.transform = 'none';
      });
      return;
    }

    caseAnims.push(
      ticket.animate(
        [
          { opacity: 0, transform: 'translateY(-60px) rotate(-6deg)', offset: 0 },
          { opacity: 1, transform: 'translateY(6px) rotate(1.2deg)', offset: 0.7 },
          { opacity: 1, transform: 'none', offset: 1 },
        ],
        { duration: 800, delay: first ? 150 : 0, easing: ease, fill: 'both' }
      )
    );

    descKids.forEach((el, k) => {
      caseAnims.push(
        el.animate(
          [
            { opacity: 0, transform: 'translateY(14px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 600, delay: (first ? 250 : 80) + k * 70, easing: ease, fill: 'both' }
        )
      );
    });
  }

  function caseOut(): Promise<unknown> {
    const durTicket = RM ? 0 : 380;
    const durDesc = RM ? 0 : 300;
    const easeOut = 'cubic-bezier(.5,0,.75,0)';
    const descKids = Array.from(desc.children) as HTMLElement[];

    const a1 = ticket.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-40px) rotate(4deg)' },
      ],
      { duration: durTicket, easing: easeOut, fill: 'forwards' }
    );
    caseAnims.push(a1);

    const descPromises = descKids.map((el, k) => {
      const a = el.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-10px)' },
        ],
        { duration: durDesc, delay: RM ? 0 : k * 40, easing: easeOut, fill: 'forwards' }
      );
      caseAnims.push(a);
      return a.finished.catch(() => {});
    });

    return Promise.all([a1.finished.catch(() => {}), ...descPromises]);
  }

  function arriveCase(targetIdx: number): void {
    mode = 'case';
    document.body.dataset.mode = 'case';
    document.body.classList.add('is-case');
    setActiveNav('projects');
    screen.getAnimations().forEach((a) => a.cancel());
    cut.getAnimations().forEach((a) => a.cancel());
    screenHit.style.display = 'block';
    plate.style.visibility = 'hidden';
    cut.style.opacity = '0';
    screen.style.opacity = '1';

    if (!RM) {
      flash.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], {
        duration: 600,
        easing: 'ease-out',
      });
      if (!videoFailed[targetIdx]) {
        videos[targetIdx].animate(
          [
            { opacity: 0, transform: 'scale(1.06)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
        );
      } else {
        videos[targetIdx].style.opacity = '0';
      }
    } else {
      videos[targetIdx].style.opacity = videoFailed[targetIdx] ? '0' : '1';
    }

    playOnly(targetIdx);
    caseIn(targetIdx, true);
    preloadCase(targetIdx + 1);

    setTimeout(() => {
      frame.classList.remove('glide');
      setBusy(false);
    }, RM ? 0 : 700);
  }

  function toCase(targetIndex = 0): void {
    pendingCaseTarget = ((targetIndex % PORTFOLIO_CASES.length) + PORTFOLIO_CASES.length) % PORTFOLIO_CASES.length;
    if (window.scrollY > 12) {
      window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    }
    if (busy) return;
    if (mode === 'case') {
      if (pendingCaseTarget !== caseIndex) {
        void swapTo(pendingCaseTarget);
      }
      return;
    }

    setBusy(true);
    setActiveNav('projects');
    heroOut();

    setTimeout(() => {
      if (RM || !transReady) {
        frame.classList.remove('glide');
        place('case');
        caseplate.getAnimations().forEach((a) => a.cancel());
        if (RM) {
          caseplate.style.opacity = '1';
          arriveCase(pendingCaseTarget);
        } else {
          const cpAnim = caseplate.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
            easing: 'ease-out',
            fill: 'forwards',
          });
          cpAnim.finished.then(() => arriveCase(pendingCaseTarget)).catch(() => arriveCase(pendingCaseTarget));
        }
        return;
      }

      trans.currentTime = 0;
      trans.style.opacity = '1';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          plate.style.visibility = 'hidden';
        });
      });

      cut.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 260,
        easing: 'ease-out',
        fill: 'forwards',
      });

      document.documentElement.style.setProperty('--glide', '1.6s');
      frame.classList.add('glide');
      place('case');

      trans.play().catch(() => {
        caseplate.style.opacity = '1';
        trans.style.opacity = '0';
        arriveCase(pendingCaseTarget);
      });

      let finished = false;
      const finishClip = () => {
        if (finished) return;
        finished = true;
        trans.pause();
        caseplate.getAnimations().forEach((a) => a.cancel());
        trans.getAnimations().forEach((a) => a.cancel());
        const cpIn = caseplate.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 240,
          easing: 'ease-out',
          fill: 'forwards',
        });
        cpIn.finished
          .then(() => {
            caseplate.style.opacity = '1';
            cpIn.cancel();
          })
          .catch(() => {
            caseplate.style.opacity = '1';
          });
        const trOut = trans.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 260,
          easing: 'ease-out',
          fill: 'forwards',
        });
        trOut.finished
          .then(() => {
            trans.style.opacity = '0';
            trOut.cancel();
          })
          .catch(() => {
            trans.style.opacity = '0';
          });
        arriveCase(pendingCaseTarget);
      };

      const tick = () => {
        if (finished) return;
        const dur = trans.duration || 5.04;
        const p = trans.currentTime / dur;
        if (trans.ended || p >= 0.995) {
          finishClip();
          return;
        }
        trans.playbackRate = computePlaybackRate(trans.currentTime, dur);
        requestAnimationFrame(tick);
      };

      trans.addEventListener('ended', finishClip, { once: true });
      requestAnimationFrame(tick);
    }, RM ? 0 : 330);
  }

  async function swapTo(n: number): Promise<void> {
    if (busy || mode !== 'case') return;
    setBusy(true);
    const oldIdx = caseIndex;
    const oldVid = videos[oldIdx];
    const newVid = videos[n];

    const fadeOutVid = RM
      ? Promise.resolve((oldVid.style.opacity = '0'))
      : oldVid
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 350,
            easing: 'ease-out',
            fill: 'forwards',
          })
          .finished.catch(() => {});

    await Promise.all([caseOut(), fadeOutVid]);
    oldVid.pause();

    if (!RM) {
      flash.animate([{ opacity: 0 }, { opacity: 0.35, offset: 0.25 }, { opacity: 0 }], {
        duration: 420,
        easing: 'ease-out',
      });
      if (!videoFailed[n]) {
        newVid.animate(
          [
            { opacity: 0, transform: 'scale(1.04)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
        );
      } else {
        newVid.style.opacity = '0';
      }
    } else {
      newVid.style.opacity = videoFailed[n] ? '0' : '1';
    }

    playOnly(n);
    caseIn(n, false);
    preloadCase(n + 1);

    setTimeout(() => {
      setBusy(false);
    }, RM ? 0 : 520);
  }

  function nextCase(): void {
    if (busy || mode !== 'case') return;
    void swapTo((caseIndex + 1) % PORTFOLIO_CASES.length);
  }

  function prevCase(): void {
    if (busy || mode !== 'case') return;
    if (caseIndex === 0) {
      toHero();
    } else {
      void swapTo(caseIndex - 1);
    }
  }

  function heroIn(): void {
    cancelHeroOutAnims();
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    if (RM) {
      [wm, mWm, scriptEl, mScript, badge, mBadge].forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = '';
        el.style.clipPath = '';
      });
      return;
    }

    [wm, mWm].forEach((el) => {
      el.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], {
        duration: 700,
        easing: ease,
        fill: 'both',
      });
    });

    [scriptEl, mScript].forEach((el) => {
      const base = el === mScript ? 'rotate(-7deg)' : 'rotate(-8deg)';
      el.animate(
        [
          { opacity: 0, transform: base, clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, transform: base, clipPath: 'inset(0 0 0 0)' },
        ],
        { duration: 700, delay: 250, easing: ease, fill: 'both' }
      );
    });

    let restarted = false;
    [badge, mBadge].forEach((el) => {
      const a = el.animate(
        [
          { opacity: 0, transform: 'translateY(-110%) rotate(6deg)', offset: 0 },
          { opacity: 1, transform: 'translateY(0) rotate(-2deg)', offset: 0.7 },
          { opacity: 1, transform: 'translateY(0) rotate(0deg)', offset: 1 },
        ],
        { duration: 1100, easing: ease, fill: 'both' }
      );
      if (el === badge) {
        a.finished
          .then(() => {
            if (!restarted && mode === 'hero') {
              restarted = true;
              startSway();
            }
          })
          .catch(() => {});
      }
    });
  }

  function toHero(immediate = false): void {
    if ((busy && !immediate) || mode === 'hero') return;
    setBusy(true);
    mode = 'hero';
    document.body.dataset.mode = 'hero';

    caseOut();
    videos.forEach((v) => {
      v.pause();
      v.getAnimations().forEach((a) => a.cancel());
      v.style.opacity = '0';
    });
    screenHit.style.display = 'none';

    if (!RM && !immediate) {
      screen.getAnimations().forEach((a) => a.cancel());
      const scrAnim = screen.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 300,
        easing: 'ease-out',
        fill: 'forwards',
      });
      scrAnim.finished
        .then(() => {
          screen.style.opacity = '0';
          scrAnim.cancel();
        })
        .catch(() => {});
    } else {
      screen.style.opacity = '0';
    }

    document.body.classList.remove('is-case');
    document.documentElement.style.setProperty('--glide', immediate ? '0s' : '.9s');
    if (!immediate) frame.classList.add('glide');
    else frame.classList.remove('glide');

    place('hero');
    plate.style.visibility = 'visible';

    if (RM || immediate) {
      cut.getAnimations().forEach((a) => a.cancel());
      cut.style.opacity = '1';
      caseplate.getAnimations().forEach((a) => a.cancel());
      caseplate.style.opacity = '0';
      heroIn();
      frame.classList.remove('glide');
      setBusy(false);
      return;
    }

    cut.getAnimations().forEach((a) => a.cancel());
    const cutAnim = cut.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 700,
      delay: 150,
      easing: 'ease-out',
      fill: 'both',
    });
    cutAnim.finished
      .then(() => {
        cut.style.opacity = '1';
        cutAnim.cancel();
      })
      .catch(() => {});

    caseplate.getAnimations().forEach((a) => a.cancel());
    const cpAnim = caseplate.animate(
      [
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: 'blur(12px)' },
      ],
      { duration: 800, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    );
    cpAnim.finished
      .then(() => {
        caseplate.style.opacity = '0';
        cpAnim.cancel();
      })
      .catch(() => {});

    plate.getAnimations().forEach((a) => a.cancel());
    const plAnim = plate.animate(
      [
        { transform: 'scale(1.12)', filter: 'blur(8px)' },
        { transform: 'scale(1)', filter: 'blur(0px)' },
      ],
      { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
    plAnim.finished
      .then(() => {
        plAnim.cancel();
      })
      .catch(() => {});

    setTimeout(() => heroIn(), 250);
    setTimeout(() => {
      frame.classList.remove('glide');
      setBusy(false);
    }, 1000);
  }

  // Contact Modal management
  function isContactModalOpen(): boolean {
    return contactModal.classList.contains('is-open');
  }

  function openContactModal(trigger?: HTMLElement): void {
    lastTriggerTarget = trigger ?? (document.activeElement as HTMLElement | null);
    closeMobileDrawer();
    contactModal.classList.add('is-open');
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setActiveNav('contact');
    requestAnimationFrame(() => {
      const nameInput = contactModal.querySelector<HTMLInputElement>('input[name="name"]');
      nameInput?.focus();
    });
  }

  function closeContactModal(): void {
    if (!isContactModalOpen()) return;
    contactModal.classList.remove('is-open');
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    syncActiveNavByScroll();
    lastTriggerTarget?.focus();
  }

  function openMobileDrawer(): void {
    mobileDrawer.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMobileDrawer(): void {
    mobileDrawer.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  function scrollToSection(sectionId: string): void {
    closeMobileDrawer();
    if (mode === 'case') {
      toHero(true);
    }
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  }

  // Navigation event handlers
  navBrand.addEventListener('click', () => {
    closeMobileDrawer();
    closeContactModal();
    if (mode === 'case') toHero();
    window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    setActiveNav('home');
  });

  navLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.navTarget;
      closeMobileDrawer();
      if (target === 'home') {
        closeContactModal();
        if (mode === 'case') toHero();
        window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
        setActiveNav('home');
      } else if (target === 'projects') {
        closeContactModal();
        scrollToSection('projects-showcase');
        setActiveNav('projects');
      } else if (target === 'about') {
        closeContactModal();
        scrollToSection('about');
        setActiveNav('about');
      } else if (target === 'skills') {
        closeContactModal();
        scrollToSection('skills');
        setActiveNav('skills');
      } else if (target === 'contact') {
        openContactModal(btn);
      }
    });
  });

  btnLetsTalk.addEventListener('click', () => {
    openContactModal(btnLetsTalk);
  });

  navToggle.addEventListener('click', () => {
    const open = mobileDrawer.classList.contains('is-open');
    if (open) closeMobileDrawer();
    else openMobileDrawer();
  });

  contactModalClose.addEventListener('click', closeContactModal);
  contactModal.addEventListener('click', (e) => {
    if (e.target === contactModal) {
      closeContactModal();
    }
  });

  btnPrev.addEventListener('click', prevCase);
  btnNext.addEventListener('click', nextCase);
  btnExitCase.addEventListener('click', () => toHero());
  screenHit.addEventListener('click', nextCase);
  btnHeroDive.addEventListener('click', () => toCase(0));
  btnProjectsDive.addEventListener('click', () => toCase(0));

  document.querySelectorAll<HTMLButtonElement>('[data-launch-case]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.launchCase ?? '0');
      toCase(Number.isFinite(idx) ? idx : 0);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-open-contact]').forEach((btn) => {
    btn.addEventListener('click', () => openContactModal(btn));
  });

  // Render Projects Bento Grid cleanly (2 featured + 3 regular + 2 wide = balanced 12-col rows)
  const projectsGrid = byId<HTMLElement>('projectsGrid');
  projectsGrid.innerHTML = PORTFOLIO_CASES.map((proj, idx) => {
    const isFeatured = idx < 2;
    const isWide = idx >= 5;
    const num = String(idx + 1).padStart(2, '0');
    return `
      <article class="project-card ${isFeatured ? 'is-featured' : ''} ${isWide ? 'is-wide' : ''}" data-spotlight>
        <div class="project-card-top">
          <span class="project-index">${num} / ${proj.rows[0]} · ${proj.rows[1]}</span>
          <span class="project-year">${proj.rows[2]}</span>
        </div>
        <h3 class="project-title">${proj.title}</h3>
        <p class="project-desc">${proj.text.replace(/^—\s*/, '')}</p>
        <div class="project-stack">${proj.stack.join(' · ')}</div>
        <div class="project-actions">
          <button type="button" class="project-btn-dive" data-launch-case="${idx}">
            <span>Preview in Laptop</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <a class="project-link" href="${proj.repoUrl}" target="_blank" rel="noopener noreferrer">
            GitHub Source
          </a>
        </div>
      </article>
    `;
  }).join('');

  projectsGrid.querySelectorAll<HTMLButtonElement>('[data-launch-case]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.launchCase ?? '0');
      toCase(Number.isFinite(idx) ? idx : 0);
    });
  });

  // Render Skills Grid + Filter tabs
  const skillsGrid = byId<HTMLElement>('skillsGrid');
  const skillFilterBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-skill-filter]'));

  function renderSkills(cat: SkillCategory): void {
    const items = filterSkills(PORTFOLIO_SKILLS, cat);
    skillsGrid.innerHTML = items
      .map(
        (s) => `
      <article class="skill-card" data-skill-id="${s.id}" data-spotlight>
        <div class="skill-head">
          <div class="skill-icon-wrap">
            <img src="${s.icon}" alt="${s.name} icon" loading="lazy" />
          </div>
          <span class="skill-cat">${s.categoryLabel}</span>
        </div>
        <h3 class="skill-name">${s.name}</h3>
        <p class="skill-summary">${s.summary}</p>
        <div class="skill-focus">${s.focus}</div>
      </article>
    `
      )
      .join('');
    attachSpotlightHandlers();
  }

  skillFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = (btn.dataset.skillFilter as SkillCategory) || 'all';
      skillFilterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderSkills(cat);
    });
  });

  function attachSpotlightHandlers(): void {
    document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((card) => {
      if (card.dataset.spotlightBound) return;
      card.dataset.spotlightBound = '1';
      const isSkillCard = card.classList.contains('skill-card');

      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);

        if (isSkillCard && !RM && e.pointerType !== 'touch') {
          const { tx, ty, imgTx, imgTy } = computeIconParallax(e.clientX, e.clientY, rect, 6);
          card.style.setProperty('--ix', `${tx}px`);
          card.style.setProperty('--iy', `${ty}px`);
          card.style.setProperty('--img-x', `${imgTx}px`);
          card.style.setProperty('--img-y', `${imgTy}px`);
        }
      });

      if (isSkillCard) {
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--ix', '0px');
          card.style.setProperty('--iy', '0px');
          card.style.setProperty('--img-x', '0px');
          card.style.setProperty('--img-y', '0px');
        });
      }
    });
  }

  renderSkills('all');
  attachSpotlightHandlers();

  // Wire EmailJS Contact Forms (both inline #contact section and #contactModal)
  function wireContactForm(formId: string): void {
    const form = byId<HTMLFormElement>(formId);
    const nameInput = form.querySelector<HTMLInputElement>('input[name="name"]')!;
    const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]')!;
    const messageInput = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]')!;
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const submitLabel = submitBtn.querySelector<HTMLElement>('.btn-label')!;
    const statusBox = form.querySelector<HTMLElement>('.contact-status')!;

    const setStatus = (type: 'idle' | 'error' | 'success' | 'info', msg: string) => {
      statusBox.textContent = msg;
      statusBox.className = `contact-status${type === 'idle' ? '' : ` is-${type}`}`;
    };

    const clearFieldErrors = () => {
      [nameInput, emailInput, messageInput].forEach((el) => {
        el.closest('.field-box')?.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
      });
    };

    [nameInput, emailInput, messageInput].forEach((el) => {
      el.addEventListener('input', () => {
        el.closest('.field-box')?.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
        if (statusBox.classList.contains('is-error')) {
          setStatus('idle', '');
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors();

      const input: ContactFormInput = {
        name: nameInput.value,
        email: emailInput.value,
        message: messageInput.value,
      };

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitLabel.textContent = 'Sending Message...';

      const config = getEmailJsConfig(import.meta.env as Record<string, unknown>);
      const result = await sendContactEmail(input, config);

      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      submitLabel.textContent = 'Send Message';

      if (!result.ok) {
        if (result.fieldErrors) {
          if (result.fieldErrors.name) {
            nameInput.closest('.field-box')?.classList.add('is-invalid');
            nameInput.setAttribute('aria-invalid', 'true');
          }
          if (result.fieldErrors.email) {
            emailInput.closest('.field-box')?.classList.add('is-invalid');
            emailInput.setAttribute('aria-invalid', 'true');
          }
          if (result.fieldErrors.message) {
            messageInput.closest('.field-box')?.classList.add('is-invalid');
            messageInput.setAttribute('aria-invalid', 'true');
          }
        }
        setStatus(result.code === 'missing_config' ? 'info' : 'error', result.message);
        return;
      }

      form.reset();
      setStatus('success', result.message);
    });
  }

  wireContactForm('modalContactForm');
  wireContactForm('inlineContactForm');

  // Swipe inside case mode on touch devices
  stage.addEventListener(
    'touchstart',
    (e) => {
      if (mode !== 'case' || e.touches.length !== 1) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    { passive: true }
  );

  stage.addEventListener(
    'touchend',
    (e) => {
      if (mode !== 'case' || !touchStart || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (busy) return;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) nextCase();
        else prevCase();
      }
    },
    { passive: true }
  );

  // Keyboard support (modal Escape + case prev/next)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isContactModalOpen()) {
        e.preventDefault();
        closeContactModal();
        return;
      }
      if (mobileDrawer.classList.contains('is-open')) {
        e.preventDefault();
        closeMobileDrawer();
        return;
      }
      if (mode === 'case' && !busy) {
        e.preventDefault();
        toHero();
        return;
      }
    }

    if (isContactModalOpen() || busy) return;
    if (mode === 'case') {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCase();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCase();
      }
    }
  });

  // Scroll spy for nav active state + safe auto-exit from case if scrolled down below fold
  function syncActiveNavByScroll(): void {
    if (isContactModalOpen()) {
      setActiveNav('contact');
      return;
    }
    if (mode === 'case') {
      setActiveNav('projects');
      return;
    }
    const y = window.scrollY;
    const docTop = (id: string) => {
      const el = document.getElementById(id);
      return el ? el.getBoundingClientRect().top + y : Number.POSITIVE_INFINITY;
    };
    const triggerY = y + Math.min(220, window.innerHeight * 0.35);
    const atBottom = y + window.innerHeight >= document.documentElement.scrollHeight - 40;

    if (atBottom || triggerY >= docTop('contact')) {
      setActiveNav('contact');
    } else if (triggerY >= docTop('skills')) {
      setActiveNav('skills');
    } else if (triggerY >= docTop('projects-showcase')) {
      setActiveNav('projects');
    } else if (triggerY >= docTop('about')) {
      setActiveNav('about');
    } else {
      setActiveNav('home');
    }
  }

  let scrollRaf = 0;
  window.addEventListener(
    'scroll',
    () => {
      if (mode === 'case' && window.scrollY > window.innerHeight * 0.45 && !busy) {
        toHero(true);
      }
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        syncActiveNavByScroll();
      });
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    frame.classList.remove('glide');
    place(mode);
  });

  place('hero');
  syncActiveNavByScroll();
}

initPortfolio();
