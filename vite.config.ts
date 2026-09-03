import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Serves /privacy and /terms from public/privacy.html and public/terms.html
 * in dev, which is what `cleanUrls` in vercel.json does in production.
 *
 * Without this the two behave differently: Vite's SPA fallback would answer
 * an extensionless /privacy with index.html, so the link would quietly render
 * the app instead of the policy — and only in dev, which is the worst place
 * for a difference to hide.
 */
const cleanUrls = (): Plugin => ({
  name: 'legal-clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url?.split('?')[0];
      if (path === '/privacy' || path === '/terms') req.url = path + '.html';
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cleanUrls()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * Split the two large dependencies out of the app chunk.
         *
         * They change on a different schedule to the app - React and the
         * Supabase client move when they are upgraded, the app moves every
         * commit - so keeping them separate means a normal deploy only
         * invalidates the small chunk and returning visitors keep the big ones
         * from cache.
         *
         * lucide-react is deliberately not listed: icons are imported one at a
         * time and tree-shaken, so pinning it to a chunk would pull the whole
         * icon set back in.
         */
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    // Valid at runtime; absent from the installed Vite type defs.
    ...({ allowedHosts: true } as Record<string, unknown>),
  },
});
