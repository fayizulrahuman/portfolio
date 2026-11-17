import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computePose,
  computeFitHero,
  computeIconParallax,
  computePlaybackRate,
  nextCaseIndex,
  prevCaseIndex,
} from './portfolioCore';
import { PORTFOLIO_ASSETS, PORTFOLIO_CASES, PORTFOLIO_SKILLS, filterSkills } from './portfolioData';
import {
  buildEmailJsPayload,
  getEmailJsConfig,
  hasEmailJsConfig,
  sendContactEmail,
  validateContactForm,
} from './emailService';

test('desktop hero pose covers 1440x900 viewport and top-anchors', () => {
  const p = computePose('hero', 1440, 900);
  assert.equal(p.isMobile, false);
  assert.ok(Math.abs(p.s - 900 / 810) < 1e-6);
  assert.equal(p.y, 0);
  assert.ok(Math.abs(p.x - (1440 - 1440 * p.s) / 2) < 1e-6);
});

test('desktop case pose fits laptop y 79..762 between nav and bottom', () => {
  const p = computePose('case', 1440, 900);
  const laptopTop = p.y + 79 * p.s;
  const laptopBottom = p.y + 762 * p.s;
  assert.ok(laptopTop >= 65.9);
  assert.ok(laptopBottom <= 900 - 27.9);
});

test('mobile hero and case poses trigger at <= 820px', () => {
  const hero = computePose('hero', 390, 844);
  assert.equal(hero.isMobile, true);
  assert.ok(hero.s > 0 && hero.s < 1);

  const c = computePose('case', 390, 844, 150, 90);
  assert.equal(c.isMobile, true);
  assert.ok(c.s >= 0.2);
});

test('fitHero keeps wordmark, badge, and script within visible desktop frame', () => {
  const p = computePose('hero', 1280, 800);
  const f = computeFitHero(1280, 800, p.s, p.x, p.y);
  assert.ok(f.wmLeft > 0);
  assert.ok(f.wmWidth < 1440);
  assert.ok(f.badgeLeft <= 986);
  assert.ok(f.badgeTop <= -165);
  assert.ok(f.scriptLeft > f.wmLeft);
});

test('playbackRate curve starts >= 1.2, peaks ~4.2 mid-clip, and eases down', () => {
  const r0 = computePlaybackRate(0, 5.04);
  const rMid = computePlaybackRate(2.3, 5.04);
  const rEnd = computePlaybackRate(5.04, 5.04);
  assert.ok(Math.abs(r0 - 1.8) < 1e-6);
  assert.ok(rMid > 4.0 && rMid <= 4.2 + 1e-6);
  assert.ok(rEnd >= 1.2 && rEnd < rMid);
});

test('case navigation wraps forward and returns to hero on prev from 0', () => {
  assert.equal(nextCaseIndex(0, 6), 1);
  assert.equal(nextCaseIndex(5, 6), 0);
  assert.equal(prevCaseIndex(0), 'hero');
  assert.equal(prevCaseIndex(3), 2);
});

test('computeIconParallax maps center to zero, clamps edges, and guards zero dimensions', () => {
  const rect = { left: 100, top: 200, width: 300, height: 240 };
  assert.deepEqual(computeIconParallax(250, 320, rect, 6), {
    tx: 0,
    ty: 0,
    imgTx: 0,
    imgTy: 0,
  });
  assert.deepEqual(computeIconParallax(600, 50, rect, 6), {
    tx: 6,
    ty: -6,
    imgTx: 3.6,
    imgTy: -3.6,
  });
  assert.deepEqual(computeIconParallax(150, 200, { left: 0, top: 0, width: 0, height: 100 }), {
    tx: 0,
    ty: 0,
    imgTx: 0,
    imgTy: 0,
  });
});

test('skills filter cleanly groups all 6 uploaded skills', () => {
  assert.equal(PORTFOLIO_SKILLS.length, 6);
  assert.equal(filterSkills(PORTFOLIO_SKILLS, 'all').length, 6);
  const fe = filterSkills(PORTFOLIO_SKILLS, 'frontend');
  const be = filterSkills(PORTFOLIO_SKILLS, 'backend');
  assert.deepEqual(
    fe.map((s) => s.name),
    ['Flutter', 'React', 'Next.js']
  );
  assert.deepEqual(
    be.map((s) => s.name),
    ['Node.js', 'Python', 'SQL']
  );
});

test('EmailJS config ignores empty/placeholder env vars and accepts real ones', () => {
  const placeholderCfg = getEmailJsConfig({
    VITE_EMAILJS_SERVICE_ID: 'your_emailjs_service_id',
    VITE_EMAILJS_TEMPLATE_ID: '',
    VITE_EMAILJS_PUBLIC_KEY: 'your_public_key',
  });
  assert.equal(hasEmailJsConfig(placeholderCfg), false);

  const realCfg = getEmailJsConfig({
    VITE_EMAILJS_SERVICE_ID: 'service_abc123',
    VITE_EMAILJS_TEMPLATE_ID: 'template_xyz789',
    VITE_EMAILJS_PUBLIC_KEY: 'pub_987654',
  });
  assert.equal(hasEmailJsConfig(realCfg), true);
});

test('contact form validation rejects invalid inputs and accepts complete ones', () => {
  const emptyRes = validateContactForm({ name: '', email: '', message: '' });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.name);
  assert.ok(emptyRes.errors.email);
  assert.ok(emptyRes.errors.message);

  const badEmail = validateContactForm({
    name: 'Alex',
    email: 'not-an-email',
    message: 'Hello there, checking out your portfolio!',
  });
  assert.equal(badEmail.valid, false);
  assert.ok(badEmail.errors.email);

  const valid = validateContactForm({
    name: 'Alex Mercer',
    email: 'alex@example.com',
    message: 'Interested in collaborating on a full-stack AI app.',
  });
  assert.equal(valid.valid, true);
});

test('sendContactEmail validates config and sends structured EmailJS REST payload', async () => {
  const input = {
    name: 'Sam Rivera',
    email: 'sam@example.com',
    message: 'Let us build an AI web application together.',
  };

  const missingRes = await sendContactEmail(input, { serviceId: '', templateId: '', publicKey: '' });
  assert.equal(missingRes.ok, false);
  assert.equal(missingRes.code, 'missing_config');

  let calledUrl = '';
  let calledBody = '';
  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calledUrl = String(url);
    calledBody = String(init?.body ?? '');
    return new Response('OK', { status: 200 });
  }) as typeof fetch;

  const cfg = { serviceId: 'svc_1', templateId: 'tpl_1', publicKey: 'pk_1' };
  const sentRes = await sendContactEmail(input, cfg, mockFetch);
  assert.equal(sentRes.ok, true);
  assert.equal(sentRes.code, 'sent');
  assert.equal(calledUrl, 'https://api.emailjs.com/api/v1.0/email/send');
  assert.deepEqual(JSON.parse(calledBody), buildEmailJsPayload(input, cfg));
});

test('index.html and modules contain all required portfolio elements, nav, contact, skills, and credits', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  const requiredHtml = [
    'Fayizul Rahuman S — Software Developer Portfolio',
    'FAYIZUL RAHUMAN S',
    'Software Developer',
    'DEVELOPER<br>CARD',
    'AI &amp; FULL STACK DEV',
    '@FAYIZULRAHUMAN',
    'Home',
    'About',
    'Projects',
    'Skills',
    'Contact',
    "Let's Talk",
    'Your Name',
    'Your Email',
    'Your Message',
    'Send Message',
    '© 2026 Fayizul Rahuman S. All rights reserved.',
    'About Me',
    'I am a Software Developer &amp; AI Enthusiast currently finishing my BTech in CSE (AIML) at KTU.',
    'I specialize in bridging the gap between powerful backend logic and stunning, interactive user interfaces. From building smart academic assistants to personal finance trackers, I love turning complex problems into elegant, full-stack solutions. Always curious, always building.',
    'Download Resume',
    '/Fayizul-Rahuman-S-Resume.pdf',
    'rel="icon"',
    'property="og:image"',
    '/fonts/inter-tight.woff2',
    '/fonts/caveat-brush.woff2',
    '/fonts/anton.woff2',
    '/assets/aistudio/1000827206_8K_594af516.png',
    '/src/portfolioInit.ts',
    '@property --mt',
    'prefers-reduced-motion: reduce',
  ];
  for (const s of requiredHtml) {
    assert.ok(html.includes(s), `Missing required string in index.html: ${s}`);
  }

  const sectionOrder = [
    'id="home"',
    'id="about"',
    'id="projects-showcase"',
    'id="skills"',
    'id="contact"',
    'id="credits"',
  ];
  for (let i = 1; i < sectionOrder.length; i++) {
    const prevIdx = html.indexOf(sectionOrder[i - 1]);
    const currIdx = html.indexOf(sectionOrder[i]);
    assert.ok(prevIdx !== -1 && currIdx !== -1 && prevIdx < currIdx, `Expected ${sectionOrder[i - 1]} before ${sectionOrder[i]}`);
  }

  assert.equal(PORTFOLIO_CASES.length, 7);
  assert.ok(PORTFOLIO_CASES.some((c) => c.title === 'KTU ASSIST'));
  assert.ok(PORTFOLIO_CASES.every((c) => !c.video.includes('r2.dev')));
  const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
  assert.ok(envExample.includes('VITE_EMAILJS_SERVICE_ID'));
  assert.ok(envExample.includes('VITE_EMAILJS_TEMPLATE_ID'));
  assert.ok(envExample.includes('VITE_EMAILJS_PUBLIC_KEY'));
});

test('all local fonts, uploaded images, logo, skill assets, and resume PDF exist on disk under public/', () => {
  const publicFiles = [
    'public/fonts/inter-tight.woff2',
    'public/fonts/caveat-brush.woff2',
    'public/fonts/anton.woff2',
    'public/assets/studio-plate.png',
    'public/assets/case-plate.webp',
    'public/assets/lanyard-badge.webp',
    'public/assets/hero-dive-custom.mp4',
    'public/Fayizul-Rahuman-S-Resume.pdf',
    `public${PORTFOLIO_ASSETS.cut}`,
    `public${PORTFOLIO_ASSETS.logoF}`,
    ...PORTFOLIO_SKILLS.map((s) => `public${s.icon}`),
  ];
  for (const rel of publicFiles) {
    const full = path.resolve(process.cwd(), rel);
    assert.ok(fs.existsSync(full), `Missing local project asset: ${rel}`);
    assert.ok(fs.statSync(full).size > 0, `Empty local project asset: ${rel}`);
  }
  const pdfHead = fs.readFileSync(path.resolve(process.cwd(), 'public/Fayizul-Rahuman-S-Resume.pdf'), 'utf8').slice(0, 8);
  assert.ok(pdfHead.startsWith('%PDF-1.4'));
});
