// ── MOTION FOUNDATION (GSAP + ScrollTrigger + Lenis, all optional-CDN)
// Design brief's easing/duration tokens, defined once here and reused by every
// animation below. If any CDN script fails to load, HAS_GSAP/HAS_LENIS go false
// and every section degrades to plain CSS/instant-state — nothing breaks.
const HAS_GSAP = typeof window.gsap !== 'undefined';
const HAS_SCROLLTRIGGER = HAS_GSAP && typeof window.ScrollTrigger !== 'undefined';
const HAS_LENIS = typeof window.Lenis !== 'undefined';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION = {
  EASE_IN: 'cubic-bezier(0.16,1,0.3,1)',      // entrances / reveals
  EASE_BOUNCE: 'cubic-bezier(0.34,1.56,0.64,1)', // hover / press micro-interactions
  EASE_EXIT: 'cubic-bezier(0.7,0,0.84,0)',    // exits
  DUR_SM: 0.38,  // icons, badges, buttons
  DUR_MD: 0.55,  // cards
  DUR_LG: 0.8,   // hero block, section headers
};

if (HAS_GSAP && HAS_SCROLLTRIGGER) {
  gsap.registerPlugin(ScrollTrigger);
}

let lenis = null;
if (HAS_LENIS && !REDUCED_MOTION) {
  lenis = new Lenis({ autoRaf: false, anchors: true });
  if (HAS_SCROLLTRIGGER) lenis.on('scroll', ScrollTrigger.update);
  if (HAS_GSAP) {
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    // no GSAP ticker available — drive Lenis with a plain rAF loop instead
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

// GSAP owns every entrance/scroll animation when fully loaded and motion is allowed;
// .gsap-on switches the CSS-reveal fallback off so nothing double-animates.
const GSAP_ON = HAS_GSAP && HAS_SCROLLTRIGGER && !REDUCED_MOTION;
if (GSAP_ON) document.documentElement.classList.add('gsap-on');

// ── NAV SCROLL SHADOW
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, {passive:true});

// ── MOBILE MENU
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
let menuOpen = false;
hamburger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  hamburger.setAttribute('aria-expanded', menuOpen);
});
document.querySelectorAll('.mob-link').forEach(l => {
  l.addEventListener('click', () => { menuOpen = false; mobileMenu.classList.remove('open'); });
});

// ── SCROLL REVEAL
// GSAP path: per-element ScrollTrigger entrances using the MOTION tokens,
// honoring the rd1–rd6 stagger tiers the markup already declares.
// Fallback path: the original IntersectionObserver + CSS transitions.
if (GSAP_ON) {
  gsap.utils.toArray('.reveal').forEach(el => {
    if (el.closest('#hero')) return; // the hero runs its own entrance timeline below
    const rd = [...el.classList].find(c => /^rd[1-6]$/.test(c));
    const delay = rd ? parseInt(rd[2], 10) * 0.08 : 0;
    const isHeader = el.classList.contains('sec-head');
    // entrance varies by element type — not one effect copy-pasted everywhere
    const from = { opacity: 0, duration: isHeader ? MOTION.DUR_LG : MOTION.DUR_MD, ease: 'expo.out', delay };
    switch (el.dataset.reveal) {
      case 'scale': Object.assign(from, { scale: 0.97, y: 20 }); break;
      case 'slide': Object.assign(from, { x: -36, y: 0 }); break;
      default: Object.assign(from, { y: isHeader ? 34 : 28 });
    }
    gsap.from(el, Object.assign(from, {
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    }));
  });

  // The Shift: each problem row resolves into its fix, scrubbed to scroll position
  gsap.utils.toArray('.shift-pair').forEach(pair => {
    const oldSide = pair.querySelector('.sp-old');
    const newSide = pair.querySelector('.sp-new');
    const arrow = pair.querySelector('.sp-arrow');
    gsap.timeline({
      scrollTrigger: { trigger: pair, start: 'top 80%', end: 'top 48%', scrub: true }
    })
      .fromTo(newSide, { opacity: 0.3, x: 18 }, { opacity: 1, x: 0, ease: 'none' }, 0)
      .fromTo(oldSide, { opacity: 1 }, { opacity: 0.55, ease: 'none' }, 0)
      .fromTo(arrow, { color: '#6B7280' }, { color: '#D91E18', ease: 'none' }, 0);
    // the strike-through draws itself once the row crosses the resolve point
    ScrollTrigger.create({
      trigger: pair, start: 'top 55%',
      onEnter: () => oldSide.classList.add('resolved'),
      onLeaveBack: () => oldSide.classList.remove('resolved')
    });
  });

  // "Why" headline gets the page's second (and last) word-stagger reveal
  const whyH2 = document.getElementById('whyH2');
  if (whyH2) {
    splitWords(whyH2);
    gsap.from('#whyH2 .hw', {
      y: 26, opacity: 0, duration: MOTION.DUR_LG, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: '#whyH2', start: 'top 85%', once: true }
    });
  }
} else {
  const reveals = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // no scrub available — resolve shift rows as they enter view instead
        if (entry.target.classList.contains('shift-pair')) {
          const oldSide = entry.target.querySelector('.sp-old');
          if (oldSide) oldSide.classList.add('resolved');
        }
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => revealObs.observe(el));
}

// splits an element's text into inline-block word spans (.hw) for staggered
// reveals, preserving nested markup like the hero's <em>. Hoisted — used by
// both the hero and the "Why" headline above.
function splitWords(node) {
  [...node.childNodes].forEach(child => {
    if (child.nodeType === 3) {
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'hw';
        s.textContent = part;
        frag.appendChild(s);
      });
      node.replaceChild(frag, child);
    } else if (child.nodeType === 1) {
      splitWords(child);
    }
  });
}

// ── HERO ENTRANCE + SCROLL-SCRUBBED EXIT (GSAP only; fallback is the CSS reveal)
if (GSAP_ON) {
  const heroH1 = document.getElementById('heroH1');
  if (heroH1) splitWords(heroH1);

  const heroTl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  heroTl
    .from('.hero-badge', { y: 14, opacity: 0, duration: MOTION.DUR_SM })
    .from('.hero-h1 .hw', { y: 34, opacity: 0, duration: MOTION.DUR_LG, stagger: 0.055 }, '-=0.15')
    .from('.hero-p', { y: 20, opacity: 0, duration: MOTION.DUR_MD }, '-=0.5')
    .from('.hero-actions', { y: 16, opacity: 0, duration: MOTION.DUR_MD }, '-=0.4')
    .from('.hero-trust', { opacity: 0, duration: MOTION.DUR_SM }, '-=0.3')
    .from('.hero-visual', { y: 44, opacity: 0, scale: 0.97, duration: MOTION.DUR_LG }, 0.3);

  // hero exit is scrubbed to the user's own scrolling, not merely triggered
  gsap.to('.hero-inner', {
    y: -56, opacity: 0.35, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
  });
}

// ── NAV SCROLL-SPY
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const spySections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const spyObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const match = document.querySelector('.nav-links a[href="#' + entry.target.id + '"]');
      if (match) match.classList.add('active');
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
spySections.forEach(s => spyObs.observe(s));

// ── FAQ ACCORDION (dynamically measured height — never clips, any content length or font size)
function closeFaqItem(el) {
  const body = el.querySelector('.faq-body');
  el.classList.remove('open');
  el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
  body.style.maxHeight = '0px';
}
function openFaqItem(el) {
  const body = el.querySelector('.faq-body');
  el.classList.add('open');
  el.querySelector('.faq-q').setAttribute('aria-expanded', 'true');
  body.style.maxHeight = body.scrollHeight + 'px';
}
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(closeFaqItem);
    if (!wasOpen) openFaqItem(item);
  });
});
// re-measure the open item if viewport/font-size changes reflow its content
window.addEventListener('resize', () => {
  const openItem = document.querySelector('.faq-item.open');
  if (openItem) openItem.querySelector('.faq-body').style.maxHeight = openItem.querySelector('.faq-body').scrollHeight + 'px';
});

// ── SELF-AUDIT
const auditCards = document.querySelectorAll('.audit-card');
const auditMsgEl = document.getElementById('auditMsg');
const auditScoreEl = document.getElementById('auditScoreNum');
const auditBarEl = document.getElementById('auditBarFill');
function updateAuditScore(){
  let yes = 0;
  auditCards.forEach(c => { if (c.dataset.state === 'yes') yes++; });
  auditScoreEl.textContent = yes;
  auditBarEl.style.width = (yes / auditCards.length * 100) + '%';
  if (yes === 0) {
    auditMsgEl.textContent = "Click each card above to see where your business stands.";
  } else if (yes <= 2) {
    auditMsgEl.textContent = "That gap is likely costing you real, bookable jobs every month.";
  } else if (yes <= 4) {
    auditMsgEl.textContent = "You've got a foundation — but the remaining gaps are still costing you leads.";
  } else {
    auditMsgEl.textContent = "You're ahead of most local businesses — let's make sure it's fully optimized.";
  }
}
function toggleAuditCard(card){
  card.dataset.state = card.dataset.state === 'yes' ? 'no' : 'yes';
  card.setAttribute('aria-pressed', card.dataset.state === 'yes' ? 'true' : 'false');
  // compact tactile pulse on toggle (CSS keyframe — works with or without GSAP)
  card.classList.remove('pulsing');
  void card.offsetWidth; // restart the animation if re-toggled quickly
  card.classList.add('pulsing');
  updateAuditScore();
}
auditCards.forEach(card => {
  card.addEventListener('click', () => toggleAuditCard(card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAuditCard(card); }
  });
});

// ── ROI CALCULATOR
const calcCalls = document.getElementById('calcCalls');
const calcValue = document.getElementById('calcValue');
const calcRate = document.getElementById('calcRate');
function fmtMoney(n){ return '$' + Math.round(n).toLocaleString('en-US'); }
function updateCalc(){
  const calls = parseFloat(calcCalls.value);
  const value = parseFloat(calcValue.value);
  const rate = parseFloat(calcRate.value) / 100;
  const monthly = calls * value * rate;
  const yearly = monthly * 12;
  document.getElementById('calcCallsOut').textContent = calls;
  document.getElementById('calcValueOut').textContent = fmtMoney(value);
  document.getElementById('calcRateOut').textContent = Math.round(rate * 100) + '%';
  document.getElementById('calcMonthly').textContent = fmtMoney(monthly);
  document.getElementById('calcYearly').textContent = fmtMoney(yearly);
}
[calcCalls, calcValue, calcRate].forEach(el => el.addEventListener('input', updateCalc));
updateCalc();

// ── HERO MINI-CALCULATOR (signature moment — one slider, live count-up figure)
// Uses the same default assumptions as the full calculator ($850 avg job, 60%
// close rate) and keeps the full calculator's slider in sync, so "See your full
// number" lands on a calculator that already reflects what the visitor set here.
const heroCalcSlider = document.getElementById('heroCalcCalls');
if (heroCalcSlider) {
  const heroCalcOut = document.getElementById('heroCalcOut');
  const heroCalcCallsOut = document.getElementById('heroCalcCallsOut');
  const HERO_AVG_JOB = 850;
  const HERO_CLOSE_RATE = 0.6;
  const heroCalcState = { value: parseInt(heroCalcSlider.value, 10) * HERO_AVG_JOB * HERO_CLOSE_RATE };
  heroCalcSlider.addEventListener('input', () => {
    const calls = parseInt(heroCalcSlider.value, 10);
    heroCalcCallsOut.textContent = calls;
    const target = calls * HERO_AVG_JOB * HERO_CLOSE_RATE;
    if (HAS_GSAP && !REDUCED_MOTION) {
      gsap.to(heroCalcState, {
        value: target, duration: 0.5, ease: 'power2.out', overwrite: true,
        onUpdate: () => { heroCalcOut.textContent = fmtMoney(heroCalcState.value); }
      });
    } else {
      heroCalcState.value = target;
      heroCalcOut.textContent = fmtMoney(target);
    }
    if (calcCalls) {
      calcCalls.value = String(calls);
      updateCalc();
    }
  });
}

// ── AUTO-UPDATE COPYRIGHT YEAR
document.getElementById('copyYear').textContent = new Date().getFullYear();

// ── GROWTH AUDIT FORM SUBMISSION (with spam hardening)
const gaForm = document.getElementById('growthAuditForm');
if (gaForm) {
  const gaStatus = document.getElementById('gaStatus');
  const gaSubmitBtn = document.getElementById('gaSubmitBtn');
  const gaNotes = document.getElementById('gaNotes');
  const gaNotesCounter = document.getElementById('gaNotesCounter');
  const gaLoadedAt = Date.now();
  let gaSubmitting = false;

  // live character counter for the optional notes field
  if (gaNotes && gaNotesCounter) {
    gaNotes.addEventListener('input', () => {
      const len = gaNotes.value.length;
      gaNotesCounter.textContent = len + '/200';
      gaNotesCounter.classList.toggle('limit', len >= 200);
    });
  }

  // lightweight heuristic spam check — no backend exists to do this server-side,
  // so this is a best-effort filter, not a security boundary
  function looksLikeSpam(fd) {
    const name = (fd.get('name') || '').toString();
    const notes = (fd.get('notes') || '').toString();
    const combined = `${name} ${notes}`;
    if (/https?:\/\//i.test(combined)) return true; // links in free-text fields
    if (/<[^>]+>/.test(combined)) return true; // raw HTML/script tags
    if (/(.)\1{7,}/.test(combined)) return true; // 8+ repeated chars in a row
    return false;
  }

  gaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (gaSubmitting) return;
    if (gaForm.querySelector('[name="_honey"]').value) return; // honeypot: real users never fill this
    if (Date.now() - gaLoadedAt < 2500) return; // bots submit near-instantly; humans don't
    const fd = new FormData(gaForm);
    if (looksLikeSpam(fd)) return; // fail silently so scripted spam doesn't learn why

    gaSubmitting = true;
    gaSubmitBtn.disabled = true;
    gaSubmitBtn.textContent = 'Sending...';
    gaStatus.textContent = '';
    gaStatus.className = 'cta-form-status';
    try {
      const payload = {};
      fd.forEach((v, k) => { payload[k] = typeof v === 'string' ? v.trim().slice(0, 200) : v; });
      const res = await fetch('https://formsubmit.co/ajax/eric@hotcallmarketing.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      const ok = res.ok && data && (data.success === true || data.success === 'true');
      if (!ok) throw new Error((data && data.message) || 'Request failed');
      gaForm.reset();
      gaForm.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
      gaSubmitBtn.textContent = 'Request Sent ✓';
      gaStatus.textContent = "Thanks — we've got it. We'll reply with your free growth audit within one business day.";
      gaStatus.className = 'cta-form-status success';
    } catch (err) {
      gaStatus.textContent = "Something went wrong sending that. Please email eric@hotcallmarketing.com directly.";
      gaStatus.className = 'cta-form-status error';
      gaSubmitBtn.disabled = false;
      gaSubmitBtn.textContent = "Get Your Free Growth Audit →";
      gaSubmitting = false;
    }
  });
}

// ── SMOOTH SCROLL (offset for fixed nav; routed through Lenis when active so
//    programmatic scrolls and wheel smoothing never fight over scroll position)
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#' ? document.body : document.querySelector(id);
    if (target) {
      e.preventDefault();
      const top = id === '#' ? 0 : target.offsetTop - 78;
      if (lenis) {
        lenis.scrollTo(top);
      } else {
        window.scrollTo({ top, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
      }
      if (menuOpen) { menuOpen = false; mobileMenu.classList.remove('open'); }
    }
  });
});

// (The old hero mousemove parallax was removed with the mocked dashboard it
// animated — the hero visual is now a real interactive tool, and a 3D tilt
// under a slider the user is actively dragging would fight the interaction.)
