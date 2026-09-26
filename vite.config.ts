import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// En développement, le navigateur appelle /api sur le serveur Vite, qui relaie vers
// le backend. Même origine : pas de CORS à configurer et le cookie httpOnly du
// refresh token (sameSite strict) circule normalement.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cible = env.VITE_API_PROXY_TARGET || 'http://localhost:5001';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: cible,
          changeOrigin: true,
          rewrite: (chemin) => chemin.replace(/^\/api/, ''),
        },
      },
    },
  };
});
