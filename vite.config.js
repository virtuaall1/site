/**
 * Сборка приложения.
 *
 * root — папка app: в корне репозитория лежит index.html прежнего
 * сайта, и Vite подхватил бы его.
 *
 * Статика (fonts, img, cases, css/fonts.css, sw.js, _headers) не
 * проходит через Vite вовсе — её кладёт рядом scripts/build-app.js.
 * Гонять картинки кейсов через бандлер незачем: они уже пережаты в
 * avif и webp.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  root: 'app',
  plugins: [react(), tailwind()],
  build: {
    outDir: '../.vite',
    /* Серверный бандл нужен сборке по имени, поэтому хеш ему ни к
       чему: его никто не кеширует. */
    ssrEmitAssets: false,
    emptyOutDir: true,
    assetsDir: 'assets',
    /* Имена с хешем — поэтому в _headers им можно поставить вечный
       кеш: поменялся файл, поменялся и адрес. */
    rollupOptions: {
      output: {
        entryFileNames: chunk =>
          (chunk.name === 'entry-server' ? '[name].js' : 'assets/[name]-[hash].js'),
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
