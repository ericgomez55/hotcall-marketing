# HotCall Marketing — redesign-v2 rebuild notes

Redesign executed against the brutal-audit build spec (July 2026). Static site,
no build step: Cloudflare Pages serves these files exactly as committed.

## Files

| File | Role |
|---|---|
| `index.html` | All markup. Icon sprite inlined at the top of `<body>`. |
| `styles.css` | All styles. Brand tokens + motion tokens at the top in `:root`. |
| `main.js` | All behavior. Feature-detects GSAP/ScrollTrigger/Lenis and degrades gracefully. |
| `privacy.html` / `terms.html` | **Drafts.** Each carries an owner-review banner — have them reviewed before removing it. |

Motion libraries load via pinned jsDelivr CDN tags at the bottom of
`index.html` (GSAP 3.15.0, Lenis 1.3.25). If any of them fail to load, the
site falls back to CSS/IntersectionObserver reveals and native scrolling —
nothing breaks. With JavaScript disabled entirely, a `<noscript>` rule keeps
all content visible.

## Degradation matrix

| Condition | Behavior |
|---|---|
| Everything loads | GSAP entrances, scrubbed hero exit + Shift rows, Lenis smoothing, magnetic CTAs, cursor ring, count-ups |
| CDN blocked, JS runs | IntersectionObserver + CSS reveals, instant numbers, native smooth scroll |
| `prefers-reduced-motion` | All animation suppressed (CSS kill-switch + `REDUCED_MOTION` guards in JS); Lenis not initialized |
| JS disabled | `<noscript>` forces `.reveal` visible; accordion/calculators inert but content readable |
| Touch / coarse pointer | No magnetic buttons, no cursor ring |

## How to…

### Add the founder photo
Search `index.html` for `FOUNDER BLOCK`. Replace the `.founder-photo-slot`
div with a real `<img src="/assets/founder.jpg" alt="Eric, founder of HotCall
Marketing">`. Review/edit the bio text and delete the `.founder-draft-chip`
span. **Never use a stock photo or AI-generated face here.**

### Replace a Concept card with a real case study
Search `index.html` for `IMAGE SLOTS` (top of the Work section). Swap the
gradient `.port-img` content for a real project image, update the copy with
real (verifiable) results, and only then remove that card's `Concept` badge
and "Case study in progress" line.

### Add or change social links
Footer `.footer-socials` — Facebook and Instagram are live. Add more only
when the profile exists; never ship `href="#"`.

### Update the motion library versions
The pinned versions appear once each at the bottom of `index.html`. Bump the
version numbers in place; everything else feature-detects.

## Deploy

Cloudflare Pages deploys from GitHub (`ericgomez55/hotcall-marketing`).
This branch (`redesign-v2`) gets an automatic preview URL on push; merge to
`main` to ship production.

## Manual test script (run before merging to main)

1. **Form success:** fill all required fields with real-looking data, wait
   >3 seconds after page load, submit. Expect "Request Sent ✓", disabled
   fields, and an email via FormSubmit to eric@hotcallmarketing.com.
2. **Form error:** with DevTools offline mode on, submit — expect the red
   error line pointing to direct email, and the button re-enabling.
3. **Spam guards:** submitting within 2.5s of load, or with a URL in the
   name/notes, should silently do nothing.
4. **FAQ:** on a phone with system font size raised, open the longest answer
   ("I've been burned…") — it must never clip.
5. **Mobile:** hamburger opens/closes, sticky bottom CTA shows, hero slider
   drags smoothly and the dollar figure counts up.
6. **Reduced motion:** enable it at the OS level — page should be fully
   static but complete.
7. **Lighthouse:** run against the Pages preview URL (mobile). Watch for
   regressions from the two CDN scripts; both are `<script>` tags at the end
   of `<body>` so first paint is unaffected.
