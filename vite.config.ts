import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
