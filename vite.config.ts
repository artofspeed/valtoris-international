import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The GitHub Pages base path.
//
// When deployed to `https://<user>.github.io/<repo>/`, assets must be served
// from `/<repo>/`. In CI we set VITE_BASE to that value; for `vite dev` and
// for a custom-domain deploy it stays `/`.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    // Each page module is ~30–130KB of HTML-in-a-string; raise the warning
    // threshold so rollup doesn't complain about these on every build.
    chunkSizeWarningLimit: 800,
  },
});
