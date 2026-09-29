/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { politiqueSecurite } from './src/lib/csp.ts';

const csp = (apiUrl?: string): Plugin => ({
  name: 'yobante-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${politiqueSecurite(apiUrl)}" />`
    ),
});

// En développement, le navigateur appelle /api sur le serveur Vite, qui relaie vers
// le backend. Même origine : pas de CORS à configurer et le cookie httpOnly du
// refresh token (sameSite strict) circule normalement.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cible = env.VITE_API_PROXY_TARGET || 'http://localhost:5001';
  const proxy = {
    '/api': {
      target: cible,
      changeOrigin: true,
      rewrite: (chemin: string) => chemin.replace(/^\/api/, ''),
    },
  };

  return {
    plugins: [react(), csp(env.VITE_API_URL)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // Même relais en `vite preview`, pour tester le build de production en local
    server: { port: 5175, proxy },
    preview: { port: 4175, proxy },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      // Un seul processus réutilisé : sous Windows, démarrer plusieurs workers jsdom
      // dépasse le délai de lancement fixé par Vitest (60 s). La suite reste rapide.
      pool: 'forks',
      maxWorkers: 1,
      isolate: false,
      restoreMocks: true,
    },
  };
});
