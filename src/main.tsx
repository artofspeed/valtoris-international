import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './main.css';

// Vite exposes the base path we configured in vite.config.ts — use it so
// the same build works at `/` (custom domain) and at `/<repo>/` (GH Pages).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// Normalize WordPress-style trailing slashes (e.g. /about-us/) to the
// canonical form (/about-us) BEFORE React Router reads the URL, so we
// don't have to register a second redirect Route per page. Matching in
// react-router-dom v7 treats `/path/` as a distinct, more-specific
// pattern than `/path`, which can cause the wrong Route to win.
(() => {
  const p = window.location.pathname;
  if (p.length > 1 && p.endsWith('/')) {
    const trimmed = p.replace(/\/+$/, '') || '/';
    window.history.replaceState(null, '', trimmed + window.location.search + window.location.hash);
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={BASE || '/'}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
