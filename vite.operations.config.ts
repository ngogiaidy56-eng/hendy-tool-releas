import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(rootDir, '.') } },
  build: { outDir: 'dist-pages/operations', emptyOutDir: true, rollupOptions: { input: { index: path.resolve(rootDir, 'ops.html') } } },
});
