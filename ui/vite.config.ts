import { defineConfig } from 'vite';

// JSX is compiled by Vite's built-in esbuild; no framework plugin needed.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
