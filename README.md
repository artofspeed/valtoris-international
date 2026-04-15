# valtoris-international

A static React clone of [valtorisinternational.com](https://valtorisinternational.com), built so the site can be hosted on GitHub Pages independently of the current Namecheap shared-hosting + WordPress + Elementor setup.

## Why this exists

The live WordPress site has been intermittently down (shared-host overloads — see `docs/audit.md`). This project mirrors the rendered HTML/CSS/assets of every page and serves them as a single-page React app — same look and feel, no PHP, no MySQL, no cPanel.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **react-router-dom v7** with `BrowserRouter` (real URLs, not hash routing)
- **Zustand** for any future global UI state (`src/store.ts`)
- **GitHub Pages** for hosting, with the `spa-github-pages` 404 redirect trick so deep links work
- Routing is **code-based, not folder-based**: every URL → component mapping lives in `src/App.tsx` + `src/pages/index.ts` so it is grep-able in one place.

## Layout

```
valtoris-international/
├── index.html                    # SPA entry, includes the 404→/?/path decoder
├── public/
│   ├── 404.html                  # GH Pages SPA fallback
│   ├── favicon.png
│   └── wp-content/               # Mirrored images, theme CSS/JS, plugin assets
├── scripts/
│   ├── extract.mjs               # Parses mirrored HTML → src/pages/*.generated.ts
│   └── e2e-diff.mjs              # Headless diff: cloned build vs source HTML
├── src/
│   ├── main.tsx                  # Mounts <App> in <BrowserRouter>
│   ├── main.css                  # Almost empty — each page injects its own CSS
│   ├── App.tsx                   # Central route table
│   ├── store.ts                  # Zustand UI state
│   ├── components/
│   │   └── StaticPage.tsx        # Renders a page's bodyHtml + injects head CSS
│   └── pages/
│       ├── index.ts              # routes: { slug, route, page }[]
│       └── *.generated.ts        # One per page; emits { title, headLinks, headStyles, bodyHtml }
└── docs/
    ├── audit.md                  # Technical audit of the live site
    ├── reclaim-checklist.md      # What to demand from the current agency
    └── migration-plan.md         # If we leave Namecheap / WebCraft Tech
```

## How the cloning works

1. `wget --mirror --page-requisites` pulls every page listed in `wp-sitemap.xml` plus every embedded asset to `/tmp/vmirror/`. (See `scripts/extract.mjs` for the wget invocation and retry strategy.)
2. `node scripts/extract.mjs` parses each mirrored `index.html` with cheerio, captures the `<title>`, all `<link rel=stylesheet>` + inline `<style>` from `<head>`, and the `<body>` inner HTML. Absolute `https://valtorisinternational.com/...` URLs are rewritten to root-relative paths.
3. Each page becomes a `src/pages/<slug>.generated.ts` module exporting that data.
4. `<StaticPage>` injects the head CSS into `document.head` on mount and renders the body via `dangerouslySetInnerHTML`. It also intercepts internal anchor clicks so React Router handles navigation without a full reload.

## Running locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # serve dist/ on http://localhost:4173
```

To re-clone (after the live site changes):

```bash
# 1. Mirror — see scripts/extract.mjs header for the wget incantation
# 2. Re-extract:
node scripts/extract.mjs
npm run build
```

## Verifying the clone

```bash
npm run build
node scripts/e2e-diff.mjs
```

The diff launches `vite preview`, navigates to every route in headless Chromium, and compares the rendered text + image references against the original HTML. It writes `e2e-diff-report.json`. Last run: **13/13 pages — 100% text + 100% image coverage.**

## Deployment

Pushes to `main` that touch `valtoris-international/**` trigger `.github/workflows/deploy-valtoris.yml`:

1. `npm ci`
2. `VITE_BASE=/<repo>/valtoris-international/ npm run build`
3. Copies `public/404.html` into `dist/` (the SPA fallback)
4. Uploads the artifact and deploys to GitHub Pages

Once Pages is enabled in the repo settings (Source: GitHub Actions), the site is live at `https://<owner>.github.io/<repo>/valtoris-international/`. To use a custom domain, drop a `CNAME` file into `public/` and set `VITE_BASE=/`.

## Known limitations of the static clone

- **Contact form** (Contact Form 7) is rendered but does not submit — it needs the WordPress backend. Switch it to Formspree, Web3Forms, or similar before going live.
- **WP login page** is a stub — not functional without the backend, by design.
- **Search / dynamic post listings** would need rebuilding if you ever add a real blog.
- **JavaScript widgets** (sliders, lightboxes that depend on Elementor's frontend bundle) render their static markup but will not animate. The visual output is correct; interactions degrade gracefully.

These are tradeoffs of moving to a static site. See `docs/migration-plan.md` for what to do about each.
