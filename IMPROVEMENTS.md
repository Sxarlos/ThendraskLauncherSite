# Site Improvements Log

Reference for the overhaul of the Thendrask Launcher site. Each item is marked
`[ ]` planned / `[x]` done, so if work stops midway you can see exactly where it is.

## 1. Code quality — deduplication & cleanup

Every page previously carried its own full copy of ~500 lines of CSS and ~80 lines
of JS. Changing the nav meant editing five files.

- [x] Extract all shared CSS into `assets/site.css` (theme variables, nav, footer,
      buttons, panels, comparison table, step lists, code blocks, CTA panels,
      reveal animations, media queries). Each page keeps only a small inline
      `<style>` block with page-specific rules.
- [x] Extract all shared JS into `assets/site.js` (mobile nav, scroll reveal,
      particles, release-version fetch, supporters list). Feature code is gated on
      element presence, so one file safely serves every page.
- [x] Remove dead CSS: the entire `.mock*` launcher-mockup ruleset in `index.html`
      was unused (the markup uses `.hero-shot` instead).
- [x] Replace repeated inline `style=""` attributes (code snippets, text links)
      with shared `.inline`, `.link`, and `.arrow-link` classes.
- [x] Unify the three near-identical CTA panels (`.final`, `.page-cta`, `.faq-cta`)
      into one shared `.big-cta` component.
- [x] No-JS resilience: `.reveal` elements are only hidden when `<html class="js">`
      is set, so content is never invisible if JavaScript fails to load.
- [x] Version fetch unified: elements opt in via `data-release-ver`,
      `data-release-raw`, and `data-release-exe` attributes instead of
      per-page copies of the fetch script.

## 2. New features

- [x] **Live GitHub stats strip** on the homepage — total downloads and stars
      fetched from the GitHub API, plus sources/themes counts, all with an
      animated count-up when scrolled into view. Fails silently if the API is
      unreachable.
- [x] **Screenshot lightbox** — click any screenshot (hero or gallery) to view it
      full-size in an overlay; close with click or Esc.
- [x] **FAQ live search** — type to filter questions in real time, with a
      "no results" fallback linking to GitHub issues.
- [x] **Copy buttons on code blocks** (self-host guide) — one click copies the
      command, comment labels stripped automatically.
- [x] **Custom 404 page** (`404.html`) — themed "lost in the void" page;
      Cloudflare Pages serves it automatically for unknown routes.
- [x] **Back-to-top button** — appears after scrolling, smooth-scrolls home.
- [x] **Scroll progress bar** — thin gradient bar along the top of the viewport.

## 3. Animations & interactions (eye-candy)

All motion respects `prefers-reduced-motion` — users who opt out get a fully
static site.

- [x] **Interactive particle field** — the floating End-particle background now
      reacts to the mouse (particles drift away from the cursor), renders at
      device-pixel-ratio for crispness, and mixes in occasional teal sparks.
- [x] **3D tilt** on the hero screenshot — subtle perspective tilt following the
      cursor.
- [x] **Cursor-following glow** on feature cards, panels, and step cards — a soft
      purple radial highlight tracks the pointer.
- [x] **Animated gradient headline** — the accent text in headings shimmers
      through the brand purple → magenta → teal.
- [x] **Staggered scroll reveals** — cards in a grid cascade in one-by-one
      instead of all at once.
- [x] **RAM comparison bars animate** — bars fill from zero when scrolled into
      view (validated: labels + values on every bar, so color is never the only
      encoding).
- [x] **Button shine sweep** — primary buttons get a light sweep on hover.
- [x] **Animated nav underline** — links underline with a gradient slide on
      hover/active.
- [x] **FAQ answers fade in** when a question is expanded.

## 4. Misc

- [x] Security headers added to `_headers` (nosniff, referrer policy,
      frame denial).
- [x] `sitemap.xml` lastmod dates refreshed.

## File map after the change

| File | Role |
|---|---|
| `assets/site.css` | All shared styles + new animation/interaction styles |
| `assets/site.js` | All shared behaviour + new features (gated by element presence) |
| `index.html` … `selfhost.html` | Content + small page-specific style block only |
| `404.html` | New custom not-found page |
| `IMPROVEMENTS.md` | This log |

## Verification (2026-07-02)

All items applied and checked against a local server (`python -m http.server`):

- **HTTP 200** on all six pages, both shared assets, logo, all three
  screenshots, `sitemap.xml`, and `robots.txt`.
- **`node --check assets/site.js`** — syntax OK.
- **Every page** carries the `html.js` no-JS guard, one `site.css` link, and
  one `site.js` script; no leftover duplicated `:root` variable blocks, no
  `.mock*` remnants, no repeated inline `style="font-family:var(--mono)…"`
  code snippets, no old `.final`/`.page-cta`-only CTA markup.
- **HTML well-formed** — tag-balance parse passes on all six pages.
- **Headless Chrome render** of all six pages: zero console errors;
  scroll-progress bar and back-to-top button injected on every page;
  4 copy buttons injected on the self-host guide's 4 code blocks;
  lightbox dialog injected on the homepage; GitHub stats fetch completed
  (count-up animates when the strip scrolls into view).
