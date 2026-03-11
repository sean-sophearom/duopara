import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file from the frontend package root.
  // Prefix '' exposes ALL variables (not just VITE_) to this config file.
  const env = loadEnv(mode, process.cwd(), '');

  const devPort = parseInt(env.VITE_PORT || '5173', 10);
  const backendUrl = env.VITE_API_URL || 'http://localhost:3009';

  return {
    plugins: [react()],
    server: {
      port: devPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
