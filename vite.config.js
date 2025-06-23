import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://pa11y-backend.wookongmarketing.com',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'healthcheck.railway.app',
      'pa11y.wookongmarketing.com',
      'localhost'
    ]
  },
  base: '/',
  define: {
    'process.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_CLERK_PUBLISHABLE_KEY),
    'process.env.VITE_API_URL': JSON.stringify('https://pa11y-backend.wookongmarketing.com')
  }
});
