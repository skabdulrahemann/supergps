import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_API_PROXY || 'http://13.211.206.24:5000';

  const stripOrigin = (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('Origin', '');
    });
  };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true, configure: stripOrigin },
        '/socket.io': { target: proxyTarget, changeOrigin: true, ws: true, configure: stripOrigin },
      }
    }
  };
})
